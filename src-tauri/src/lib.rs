#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{DateTime, Utc};
// 'Addr' has been removed from this line as it was unused.
use network_interface::{NetworkInterface, NetworkInterfaceConfig};
use rand::Rng;
use serde::Serialize;

#[derive(Debug, Serialize)]
struct Bandwidth {
    download: f32,
    upload: f32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DetailedNetworkInfo {
    id: String,
    name: String,
    ssid: String,
    #[serde(rename = "type")]
    network_type: String,
    status: String,
    enabled: bool,
    signal: u8,
    security: String,
    devices: u8,
    bandwidth: Bandwidth,
    location: String,
    last_seen: DateTime<Utc>,
    threats: Vec<String>,
    miner_activity: bool,
}

#[tauri::command]
async fn get_network_interfaces() -> Vec<DetailedNetworkInfo> {
    let mut results = Vec::new();
    // `thread_rng` is still the correct function to get the generator.
    let mut rng = rand::rng();

    if let Ok(interfaces) = NetworkInterface::show() {
        for (index, itf) in interfaces.iter().enumerate() {
            // --- Start of Placeholder Data Generation ---
            let is_wifi = itf.name.to_lowercase().contains("wi-fi") || itf.name.to_lowercase().contains("wlan");
            
            // Replaced deprecated `gen_bool(0.8)` with modern `gen_ratio(8, 10)`.
            let is_enabled = rng.random_ratio(8, 10); // 80% chance
            
            let status = if is_enabled { "connected" } else { "disconnected" };
            let threats = if is_enabled && !is_wifi {
                vec![]
            } else {
                vec!["Unsecured Network".to_string()]
            };
            // --- End of Placeholder Data Generation ---

            let network_info = DetailedNetworkInfo {
                id: format!("net_{:03}", index),
                name: itf.name.clone(),
                ssid: if is_wifi { "MyHomeWiFi".to_string() } else { "N/A".to_string() },
                network_type: if is_wifi { "WiFi".to_string() } else { "Ethernet".to_string() },
                status: status.to_string(),
                enabled: is_enabled,
                // `random_range` is correct here; the warning was likely informational.
                signal: if is_wifi { rng.random_range(30..95) } else { 100 },
                security: if is_wifi { "WPA2".to_string() } else { "N/A".to_string() },
                devices: if is_enabled { rng.random_range(1..10) } else { 0 },
                bandwidth: Bandwidth {
                    download: rng.random_range(5.0..100.0),
                    upload: rng.random_range(1.0..50.0),
                },
                location: "Bharthia, IN".to_string(),
                last_seen: Utc::now(),
                threats,
                // Replaced deprecated `gen_bool(0.05)` with `gen_ratio(1, 20)`.
                miner_activity: rng.random_ratio(1, 20), // 5% chance
            };
            results.push(network_info);
        }
    }
    results
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_network_interfaces])
        // The path is now directly under `tauri`, not `tauri::api`
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}