use crate::{AnomalyDetection, Bandwidth, IPInfo};
use crate::{mask_ip, rigid_sorter};

use netstat2::{
    get_sockets_info, AddressFamilyFlags, ProtocolFlags, ProtocolSocketInfo, SocketInfo,
};
use network_interface::{NetworkInterface, NetworkInterfaceConfig};
use std::collections::HashMap;
use std::net::IpAddr;
use chrono::Utc;
use sysinfo::Pid;
use crate::ProcessesToUpdate;
use crate::NetworkInfo;
use crate::Networks;
use crate::System;

fn load_interfaces() -> (Vec<NetworkInterface>, HashMap<IpAddr, String>) {
    let interfaces = NetworkInterface::show().unwrap_or_default();

    let iface_ips: HashMap<IpAddr, String> = interfaces
        .iter()
        .flat_map(|iface| iface.addr.iter().map(|a| (a.ip(), iface.name.clone())))
        .collect();

    (interfaces, iface_ips)
}

fn load_sockets() -> Vec<SocketInfo> {
    get_sockets_info(
        AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6,
        ProtocolFlags::TCP | ProtocolFlags::UDP,
    )
    .unwrap_or_default()
}

fn extract_ports(sockets: &[SocketInfo]) -> Vec<u16> {
    sockets
        .iter()
        .map(|s| match &s.protocol_socket_info {
            ProtocolSocketInfo::Tcp(tcp) => tcp.local_port,
            ProtocolSocketInfo::Udp(udp) => udp.local_port,
        })
        .collect()
}

fn map_pids_to_interfaces(
    sockets: &[SocketInfo],
    iface_ips: &HashMap<IpAddr, String>,
) -> HashMap<String, Vec<sysinfo::Pid>> {
    let mut map: HashMap<String, Vec<Pid>> = HashMap::new();

    for socket in sockets {
        let ip = match socket.protocol_socket_info {
            ProtocolSocketInfo::Tcp(ref tcp) => tcp.local_addr,
            ProtocolSocketInfo::Udp(ref udp) => udp.local_addr,
        };

        if let Some(iface_name) = iface_ips.get(&ip) {
            if let Some(pid) = socket.associated_pids.first() {
                map.entry(iface_name.clone())
                    .or_default()
                    .push(sysinfo::Pid::from(*pid as usize));
            }
        }
    }

    map
}

fn compute_interface_cpu(
    sys: &System,
    iface_pids: HashMap<String, Vec<sysinfo::Pid>>,
) -> HashMap<String, f32> {
    let mut map = HashMap::new();

    for (iface, pids) in iface_pids {
        let mut total = 0.0;
        for pid in pids {
            if let Some(proc_) = sys.process(pid) {
                total += proc_.cpu_usage();
            }
        }
        map.insert(iface, total);
    }

    map
}

fn build_ip_info(interfaces: &[NetworkInterface], name: &str) -> IPInfo {
    if let Some(iface) = interfaces.iter().find(|i| i.name == name) {
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

        return IPInfo {
            ipv4: ipv4.map(|ip| mask_ip(&ip)),
            ipv6,
        };
    }

    IPInfo {
        ipv4: None,
        ipv6: None,
    }
}

fn build_network_info(
    interfaces: &Vec<NetworkInterface>,
    sockets: &Vec<SocketInfo>,
    iface_cpu: &HashMap<String, f32>,
) -> Vec<NetworkInfo> {
    let networks = Networks::new_with_refreshed_list();
    let mut results = Vec::new();

    for (index, (name, data)) in networks.iter().enumerate() {
        let rx_bytes = data.total_received();
        let tx_bytes = data.total_transmitted();

        let ip_info = build_ip_info(&interfaces, name);
        let ports = extract_ports(&sockets);
        let anomaly = AnomalyDetection::new();

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
            bandwidth: Bandwidth{download : (rx_bytes as f64 * 8.0) / 1_000_000.0, upload : (tx_bytes as f64 * 8.0) / 1_000_000.0},
            received_bytes: rx_bytes,
            transmitted_bytes: tx_bytes,
            active_ports: ports,
            last_seen: Utc::now(),
            cpu_usage: *iface_cpu.get(name).unwrap_or(&0.0),
        });
    }

    results
}

pub fn collect_networks() -> Vec<NetworkInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let (interfaces, iface_ips) = load_interfaces();
    let sockets = load_sockets();
    let iface_pids = map_pids_to_interfaces(&sockets, &iface_ips);
    sys.refresh_processes(ProcessesToUpdate::All, true);
    let iface_cpu = compute_interface_cpu(&sys, iface_pids);
    let results = build_network_info(&interfaces, &sockets, &iface_cpu);

    rigid_sorter(results)
}