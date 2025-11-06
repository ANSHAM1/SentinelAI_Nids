#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{DateTime, Utc};
use sysinfo::{System, Networks};
use network_interface::{NetworkInterface, NetworkInterfaceConfig};
use netstat2::{get_sockets_info, AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo};
use serde::Serialize;
use std::collections::HashMap;
use std::net::IpAddr;

#[derive(Debug, Serialize)]
struct Bandwidth {
    download: f64, // Mbps
    upload: f64,   // Mbps
}

#[derive(Debug, Serialize)]
struct IPInfo {
    ipv4: Option<String>,
    ipv6: Option<String>,
    mac: Option<String>,
}

#[derive(Debug, Serialize)]
struct SocketInfo {
    local_addr: String,
    remote_addr: Option<String>,
    protocol: String,
    pid: Option<u32>,
    state: Option<String>,
}

#[derive(Debug, Serialize)]
struct NetworkInfo {
    id: String,
    name: String,
    status: String,
    ip_info: IPInfo,
    received_bytes: u64,
    transmitted_bytes: u64,
    bandwidth: Bandwidth,
    sockets: Vec<SocketInfo>,
    last_seen: DateTime<Utc>,
    cpu_usage: f32,
    total_memory: u64,
    used_memory: u64,
}

#[tauri::command]
async fn get_networks() -> Vec<NetworkInfo> {
    // Initialize system info
    let mut sys = System::new_all();
    sys.refresh_all();

    // Fetch network and socket info
    let networks = Networks::new_with_refreshed_list();
    let interfaces = NetworkInterface::show().unwrap_or_default();

    let iface_map: HashMap<String, NetworkInterface> = interfaces
        .into_iter()
        .map(|iface| (iface.name.clone(), iface))
        .collect();

    let sockets = get_sockets_info(
        AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6,
        ProtocolFlags::TCP | ProtocolFlags::UDP,
    )
    .unwrap_or_default();

    let cpu_usage = sys.global_cpu_usage();
    let total_mem = sys.total_memory();
    let used_mem = sys.used_memory();

    let mut results = Vec::new();

    for (index, (name, data)) in networks.iter().enumerate() {
        let rx_bytes = data.total_received();
        let tx_bytes = data.total_transmitted();

        // Map IP and MAC info
        let ip_info = if let Some(iface) = iface_map.get(name) {
            let ipv4 = iface
                .addr
                .iter()
                .find(|addr| matches!(addr.ip(), IpAddr::V4(_)))
                .map(|addr| addr.ip().to_string());

            let ipv6 = iface
                .addr
                .iter()
                .find(|addr| matches!(addr.ip(), IpAddr::V6(_)))
                .map(|addr| addr.ip().to_string());

            IPInfo {
                ipv4,
                ipv6,
                mac: iface.mac_addr.clone(), // ✅ clone to avoid move
            }
        } else {
            IPInfo {
                ipv4: None,
                ipv6: None,
                mac: None,
            }
        };

        // Collect socket info
        let related_sockets: Vec<SocketInfo> = sockets
            .iter()
            .filter_map(|s| match &s.protocol_socket_info {
                ProtocolSocketInfo::Tcp(tcp) => Some(SocketInfo {
                    local_addr: tcp.local_addr.to_string(),
                    remote_addr: Some(tcp.remote_addr.to_string()),
                    protocol: "TCP".into(),
                    pid: s.associated_pids.first().copied(),
                    state: Some(format!("{:?}", tcp.state)),
                }),
                ProtocolSocketInfo::Udp(udp) => Some(SocketInfo {
                    local_addr: udp.local_addr.to_string(),
                    remote_addr: None,
                    protocol: "UDP".into(),
                    pid: s.associated_pids.first().copied(),
                    state: None,
                }),
            })
            .collect();

        results.push(NetworkInfo {
            id: format!("iface_{index}"),
            name: name.to_string(),
            status: if rx_bytes + tx_bytes > 0 {
                "active".into()
            } else {
                "idle".into()
            },
            ip_info,
            received_bytes: rx_bytes,
            transmitted_bytes: tx_bytes,
            bandwidth: Bandwidth {
                download: (rx_bytes as f64 * 8.0) / 1_000_000.0, // bits → Mbps
                upload: (tx_bytes as f64 * 8.0) / 1_000_000.0,
            },
            sockets: related_sockets,
            last_seen: Utc::now(),
            cpu_usage,
            total_memory: total_mem,
            used_memory: used_mem,
        });
    }

    results
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_networks])
        .run(tauri::generate_context!())
        .expect("❌ Error running SentinelAI backend");
}