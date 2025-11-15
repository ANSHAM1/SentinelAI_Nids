use crate::modules::structures::NetworkInfo;
use std::cmp::Ordering;

pub fn rigid_sorter(mut interfaces: Vec<NetworkInfo>) -> Vec<NetworkInfo> {
    interfaces.sort_by(
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

    interfaces
}

pub fn mask_ip(ip: &str) -> String {
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