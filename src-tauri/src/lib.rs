#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod modules;
use modules::helpers::{mask_ip, rigid_sorter};
use modules::networks::collect_networks;
use modules::python_runner::PythonRunner;
use modules::structures::{AnomalyDetection, AppState, Bandwidth, IPInfo, NetworkInfo};

use chrono::Utc;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::Child;
use std::sync::Arc;
use std::time::Duration;
use std::{thread, vec};
use sysinfo::{Networks, ProcessesToUpdate, System};
use tauri::Emitter;
use tauri::Listener;
use tauri::{AppHandle, Manager};

#[tauri::command]
async fn get_networks(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<NetworkInfo>, String> {
    let lock = state
        .networks
        .read()
        .map_err(|_| "Failed to acquire lock".to_string())?;

    Ok(lock.clone())
}

fn get_interfaces(dir: &Path, runner: &PythonRunner) -> HashMap<String, String> {
    let script = dir.join("helper.py");

    let output = match runner.run(script) {
        Some(out) => out,
        None => {
            println!("failed to load interfaces");
            return HashMap::new();
        }
    };

    let list = serde_json::from_str::<Vec<serde_json::Value>>(&output).unwrap_or_default();

    let mut map = HashMap::new();

    for item in list {
        if let (Some(name), Some(ipv4)) = (item["name"].as_str(), item["ipv4"].as_str()) {
            map.insert(ipv4.to_string(), name.to_string());
        }
    }

    map
}

fn spawn_worker(
    app_handle: &AppHandle,
    iface_name: &str,
    dir: &std::path::Path,
    runner: Arc<PythonRunner>,
) -> Option<Child> {
    let script: PathBuf = dir.join("worker.py");

    let mut child = runner.run_args(script, iface_name)?;

    if let Some(stdout) = child.stdout.take() {
        let handle = app_handle.clone();

        tauri::async_runtime::spawn_blocking(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                let _ = handle.emit("get_anomaly", line);
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        tauri::async_runtime::spawn_blocking(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                eprintln!("stderr: {}", line);
            }
        });
    }

    Some(child)
}

pub fn start_monitoring(
    app: AppHandle,
    state: Arc<AppState>,
    dir: PathBuf,
    runner: Arc<PythonRunner>,
) {
    thread::spawn(move || {
        let mut previous: Vec<String> = vec![];

        loop {
            //
            // ---- 1. Collect latest network info ----
            //
            let networks = collect_networks();

            let current_ips: Vec<String> = networks
                .iter()
                .filter_map(|net| net.ip_info.ipv4.clone())
                .collect();

            //
            // ---- 2. Read iface → name map ----
            //
            let iface_map = state.iface_map.lock().unwrap();

            //
            // ---- 3. Start workers for NEW interfaces ----
            //
            for ipv4 in &current_ips {
                if !previous.contains(ipv4) {
                    if let Some(iface_name) = iface_map.get(ipv4) {
                        if let Some(child) = spawn_worker(&app, iface_name, &dir, runner.clone()) {
                            state.workers.lock().unwrap().insert(ipv4.clone(), child);
                        }
                    } else {
                        println!("No interface name found for IPv4 '{}'", ipv4);
                    }
                }
            }

            //
            // ---- 4. Kill workers for REMOVED interfaces ----
            //
            {
                let mut workers = state.workers.lock().unwrap();

                for old_ip in previous.iter() {
                    if !current_ips.contains(old_ip) {
                        if let Some(mut child) = workers.remove(old_ip) {
                            let _ = child.kill();
                            let _ = child.wait();
                            println!("Stopped worker for {}", old_ip);
                        }
                    }
                }
            }

            //
            // ---- 5. Update shared network state ----
            //
            {
                let mut lock = state.networks.write().unwrap();
                *lock = networks.clone();
            }

            //
            // ---- 6. Send frontend event ----
            //
            let _ = app.emit("network_update", networks);

            //
            // ---- 7. update previous list for next loop ----
            //
            previous = current_ips.clone();

            //
            // ---- 8. Sleep for next cycle ----
            //
            thread::sleep(Duration::from_secs(5));
        }
    });
}

pub fn run() {
    // ---- Create global application state ----
    let app_state = Arc::new(AppState::new());

    tauri::Builder::default()
        .manage(app_state.clone())
        .setup(move |app| {
            // ---- Prepare Python directory path ----
            let python_dir = app.path().resource_dir().unwrap().join("embedded-python");

            println!("Python Dir: {:?}", python_dir);

            // ---- Python Runner ----
            let runner = Arc::new(PythonRunner::new(&python_dir));

            // ---- Load interface → NIC name map ----
            let mut iface_map = get_interfaces(&python_dir, &runner);

            // Retry mechanism (5 times)
            let mut retry = 0;
            while iface_map.is_empty() && retry < 5 {
                println!("⚠ iface_map empty, retrying... ({retry})");
                std::thread::sleep(std::time::Duration::from_millis(500));
                iface_map = get_interfaces(&python_dir, &runner);
                retry += 1;
            }

            if iface_map.is_empty() {
                println!("❌ ERROR: Could not load interface map. Workers will not start.");
            } else {
                println!("✅ NFStream interface map loaded:");
                println!("{:#?}", iface_map);
            }

            // ---- Save iface_map into AppState ----
            {
                let mut locked_map = app_state.iface_map.lock().unwrap();
                *locked_map = iface_map;
            }

            // ---- Setup event listener for "get_anomaly" ----\
            let app_handle = app.handle().clone();
            let emit_handle = app_handle.clone();

            let state_clone = Arc::clone(&app_state);

            app_handle.listen("get_anomaly", move |event| {
                let payload = event.payload();

                if payload.is_empty() {
                    return;
                }

                // Parse JSON from Python worker
                let msg: serde_json::Value = match serde_json::from_str(payload) {
                    Ok(v) => v,
                    Err(_) => return,
                };

                let iface_name = match msg.get("iface").and_then(|v| v.as_str()) {
                    Some(x) => x,
                    None => return,
                };

                let is_anomaly = match msg.get("anomaly").and_then(|v| v.as_bool()) {
                    Some(x) => x,
                    None => return,
                };

                {
                    let mut networks = state_clone.networks.write().unwrap();

                    for net in networks.iter_mut() {
                        if net.name == iface_name {
                            net.anomaly.is_anomalous = is_anomaly;
                            net.anomaly.anomaly_type = if is_anomaly {
                                Some("ANOMALY".into())
                            } else {
                                Some("BENIGN".into())
                            };
                            net.last_seen = Utc::now();
                        }
                    }
                }

                // Emit updated networks to frontend
                let nets = state_clone.networks.read().unwrap().clone();
                let _ = emit_handle.emit("network_update", nets);
            });

            // ---- Start continuous monitoring ----
            start_monitoring(
                app_handle,
                Arc::clone(&app_state),
                python_dir,
                runner.clone(),
            );

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_networks])
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}
