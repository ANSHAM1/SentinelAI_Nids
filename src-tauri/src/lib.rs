#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{DateTime, Utc};
use netstat2::{get_sockets_info, AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo};
use network_interface::{NetworkInterface, NetworkInterfaceConfig};
use serde::Serialize;
use std::cmp::Ordering;
use std::collections::HashMap;
use std::net::IpAddr;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex, RwLock};
use std::thread;
use std::time::Duration;
use sysinfo::{Networks, ProcessesToUpdate, System};
use tauri::Emitter;
use tauri::Listener;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Clone)]
struct Bandwidth {
    download: f64,
    upload: f64,
}

#[derive(Debug, Serialize, Clone)]
struct IPInfo {
    ipv4: Option<String>,
    ipv6: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AnomalyDetection {
    is_anomalous: bool,
    anomaly_type: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct NetworkInfo {
    id: String,
    name: String,
    status: String,
    anomaly: AnomalyDetection,
    ip_info: IPInfo,
    bandwidth: Bandwidth,
    received_bytes: u64,
    transmitted_bytes: u64,
    active_ports: Vec<u16>,
    last_seen: DateTime<Utc>,
    cpu_usage: f32,
}

fn mask_ip(ip: &str) -> String {
    if ip.starts_with("192.") || ip.starts_with("10.") || ip.starts_with("172.") {
        ip.to_string()
    } else {
        let parts: Vec<&str> = ip.split('.').collect();
        if parts.len() == 4 {
            format!("{}.{}.x.x", parts[0], parts[1])
        } else {
            ip.to_string()
        }
    }
}

fn get_nfstream_interfaces(python_dir: &Path) -> HashMap<String, String> {
    let python = python_dir.join("python.exe");
    let script = python_dir.join("helper.py");

    let output = match Command::new(python)
        .arg(script)
        .stderr(Stdio::piped())
        .output()
    {
        Ok(o) => o,
        Err(e) => {
            eprintln!("Failed to run helper.py: {}", e);
            return HashMap::new();
        }
    };

    let json_txt = String::from_utf8_lossy(&output.stdout);

    let list = serde_json::from_str::<Vec<serde_json::Value>>(&json_txt).unwrap_or_default();

    let mut map = HashMap::new();

    for item in list {
        let name = item["name"].as_str().unwrap_or("").to_string();
        let ipv4 = item["ipv4"].as_str().unwrap_or("").to_string();

        if !ipv4.is_empty() {
            // map IPv4 → interface name
            map.insert(ipv4, name);
        }
    }

    map
}

fn collect_networks() -> Vec<NetworkInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let networks = Networks::new_with_refreshed_list();
    let interfaces = NetworkInterface::show().unwrap_or_default();

    let iface_ips: HashMap<IpAddr, String> = interfaces
        .iter()
        .flat_map(|iface| iface.addr.iter().map(|a| (a.ip(), iface.name.clone())))
        .collect();

    let mut iface_pids: HashMap<String, Vec<sysinfo::Pid>> = HashMap::new();

    let sockets = get_sockets_info(
        AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6,
        ProtocolFlags::TCP | ProtocolFlags::UDP,
    )
    .unwrap_or_default();

    for s in &sockets {
        let local_ip = match s.protocol_socket_info {
            ProtocolSocketInfo::Tcp(ref tcp) => tcp.local_addr,
            ProtocolSocketInfo::Udp(ref udp) => udp.local_addr,
        };
        if let Some(iface_name) = iface_ips.get(&local_ip) {
            if let Some(pid) = s.associated_pids.first() {
                iface_pids
                    .entry(iface_name.clone())
                    .or_default()
                    .push(sysinfo::Pid::from(*pid as usize));
            }
        }
    }

    sys.refresh_processes(ProcessesToUpdate::All, true);
    let mut iface_cpu_mem: HashMap<String, f32> = HashMap::new();
    for (iface, pids) in iface_pids {
        let mut total_cpu = 0.0;
        for pid in pids {
            if let Some(proc_) = sys.process(pid) {
                total_cpu += proc_.cpu_usage();
            }
        }
        iface_cpu_mem.insert(iface, total_cpu);
    }

    let mut results = Vec::new();
    for (index, (name, data)) in networks.iter().enumerate() {
        let rx_bytes = data.total_received();
        let tx_bytes = data.total_transmitted();

        let ip_info = if let Some(iface) = interfaces.iter().find(|i| i.name == *name) {
            let ipv4 = iface
                .addr
                .iter()
                .find(|a| matches!(a.ip(), IpAddr::V4(_)))
                .map(|a| a.ip().to_string());
            let ipv6 = iface
                .addr
                .iter()
                .find(|a| matches!(a.ip(), IpAddr::V6(_)))
                .map(|a| a.ip().to_string());
            IPInfo {
                ipv4: ipv4.map(|ip| mask_ip(&ip)),
                ipv6: ipv6,
            }
        } else {
            IPInfo {
                ipv4: None,
                ipv6: None,
            }
        };

        let iface_cpu = iface_cpu_mem.get(name).cloned().unwrap_or(0.0);

        let mut active_ports = Vec::new();
        for s in &sockets {
            match &s.protocol_socket_info {
                ProtocolSocketInfo::Tcp(tcp) => active_ports.push(tcp.local_port),
                ProtocolSocketInfo::Udp(udp) => active_ports.push(udp.local_port),
            }
        }

        let anomaly = AnomalyDetection {
            is_anomalous: false,
            anomaly_type: Some("BEGINE".to_string()),
        };

        results.push(NetworkInfo {
            id: format!("iface_{index}"),
            name: name.to_string(),
            status: if rx_bytes + tx_bytes > 0 {
                "active".into()
            } else {
                "idle".into()
            },
            anomaly,
            ip_info,
            bandwidth: Bandwidth {
                download: (rx_bytes as f64 * 8.0) / 1_000_000.0,
                upload: (tx_bytes as f64 * 8.0) / 1_000_000.0,
            },
            received_bytes: rx_bytes,
            transmitted_bytes: tx_bytes,
            active_ports: vec![],
            last_seen: Utc::now(),
            cpu_usage: iface_cpu,
        });
    }

    results.sort_by(
        |a, b| match (a.anomaly.is_anomalous, b.anomaly.is_anomalous) {
            (true, false) => Ordering::Less,
            (false, true) => Ordering::Greater,
            _ => match (a.status.as_str(), b.status.as_str()) {
                ("active", s) if s != "active" => Ordering::Less,
                (s, "active") if s != "active" => Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            },
        },
    );

    results
}

type WorkerMap = Arc<Mutex<HashMap<String, Child>>>;

fn spawn_worker_for_iface(
    iface_name: &str,
    python_dir: &std::path::Path,
    app_handle: AppHandle,
) -> Option<Child> {
    let python = python_dir.join("python.exe");
    let script = python_dir.join("worker.py");

    let mut cmd = Command::new(python);
    cmd.arg(script)
        .arg("--iface")
        .arg(iface_name)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().ok()?;

    // STDOUT
    if let Some(stdout) = child.stdout.take() {
        let iface = iface_name.to_string();
        let handle = app_handle.clone();
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};

            for line in BufReader::new(stdout).lines().flatten() {
                let _ = handle.emit("nfstream_line", line.clone());
                println!("worker[{}] => {}", iface, line);
            }
        });
    }

    // STDERR
    if let Some(stderr) = child.stderr.take() {
        let iface = iface_name.to_string();
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            for line in BufReader::new(stderr).lines().flatten() {
                eprintln!("worker-stderr[{}]: {}", iface, line);
            }
        });
    }

    Some(child)
}

type SharedState = Arc<RwLock<Vec<NetworkInfo>>>;

#[tauri::command]
async fn get_networks(state: tauri::State<'_, SharedState>) -> Result<Vec<NetworkInfo>, String> {
    let networks = state
        .read()
        .map_err(|_| "Failed to acquire lock".to_string())?
        .clone();
    Ok(networks)
}

fn start_monitoring(
    app: AppHandle,
    shared: SharedState,
    workers: WorkerMap,
    python_dir: std::path::PathBuf,
    iface_map_state: Arc<Mutex<HashMap<String, String>>>,
) {
    thread::spawn(move || {
        let mut previous_ifaces: Vec<String> = vec![];

        loop {
            let networks = collect_networks();

            // Extract ipv4s from collected networks
            let current_ips: Vec<String> = networks
                .iter()
                .filter_map(|net| net.ip_info.ipv4.clone())
                .collect();

            let iface_map = iface_map_state.lock().unwrap();

            for ipv4 in &current_ips {
                if !previous_ifaces.contains(ipv4) {
                    if let Some(iface_name) = iface_map.get(ipv4) {
                        if let Some(child) =
                            spawn_worker_for_iface(iface_name, &python_dir, app.clone())
                        {
                            workers.lock().unwrap().insert(ipv4.clone(), child);
                        }
                    } else {
                        println!("No interface name found for IPv4 '{}'", ipv4);
                    }
                }
            }

            {
                let mut map = workers.lock().unwrap();
                for old_ip in previous_ifaces.iter() {
                    if !current_ips.contains(old_ip) {
                        if let Some(mut child) = map.remove(old_ip) {
                            let _ = child.kill();
                            let _ = child.wait();
                            println!("Stopped worker for {}", old_ip);
                        }
                    }
                }
            }

            previous_ifaces = current_ips.clone();

            if let Ok(mut w) = shared.write() {
                *w = networks.clone();
            }
            let _ = app.emit("network_update", networks);

            thread::sleep(Duration::from_secs(5));
        }
    });
}

pub fn run() {
    let shared_state: SharedState = Arc::new(RwLock::new(Vec::new()));
    let workers: WorkerMap = Arc::new(Mutex::new(HashMap::new()));
    let iface_map_state: Arc<Mutex<HashMap<String, String>>> = Arc::new(Mutex::new(HashMap::new()));

    tauri::Builder::default()
        .manage(shared_state.clone())
        .manage(workers.clone())
        .manage(iface_map_state.clone())
        .setup(move |app| {
            let python_dir = app.path().resource_dir().unwrap().join("embedded-python");

            println!("{:?}", python_dir);

            // -------------------------------
            // 1️⃣  Load interface map from Python
            // -------------------------------
            let mut iface_map = get_nfstream_interfaces(&python_dir);

            // Retry until Python provides data (max 3 retries)
            let mut retry = 0;
            while iface_map.is_empty() && retry < 10 {
                println!("⚠ iface_map empty, retrying Python interface scan... ({retry})");
                std::thread::sleep(std::time::Duration::from_millis(500));
                iface_map = get_nfstream_interfaces(&python_dir);
                retry += 1;
            }

            if iface_map.is_empty() {
                println!(
                    "❌ ERROR: Could not load NFStreamer interface map. Workers will not start."
                );
            } else {
                println!("✅ Loaded NFStreamer interface map:");
                println!("{:#?}", iface_map);
            }

            {
                let mut locked_map = iface_map_state.lock().unwrap();
                *locked_map = iface_map;
            }

            // Clone AppHandle safely
            let app_handle = app.handle().clone();

            // ---- Tauri v2 event listener ----
            let app_handle_clone = app.handle().clone();
            let shared_state_clone = shared_state.clone();

            // ✔ Create a separate clone for emitting events
            let emit_handle = app_handle_clone.clone();

            app_handle_clone.listen("nfstream_line", move |event| {
                let payload: &str = event.payload();
                if payload.is_empty() {
                    return;
                }

                // Parse JSON
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

                // Update shared state
                {
                    if let Ok(mut nets) = shared_state_clone.write() {
                        for net in nets.iter_mut() {
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
                }

                // ✔ Use the pre-captured clone (NO move error)
                if let Ok(nets) = shared_state_clone.read() {
                    let _ = emit_handle.emit("network_update", nets.clone());
                }
            });

            // -------------------------------
            // 2️⃣  Start monitor AFTER interface map is ready
            // -------------------------------
            start_monitoring(
                app_handle,
                shared_state.clone(),
                workers.clone(),
                python_dir,
                iface_map_state.clone(),
            );

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_networks])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
