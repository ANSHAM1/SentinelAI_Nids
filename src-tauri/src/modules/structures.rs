use chrono::{DateTime, Utc};
use serde::Serialize;
use std::collections::HashMap;
use std::process::Child;
use std::sync::{Mutex, RwLock};

use crate::{DefaultStruct, GlobalStruct};

GlobalStruct! {
    pub struct AppState {
        networks: RwLock<Vec<NetworkInfo>>,
        workers: Mutex<HashMap<String, Child>>,
        iface_map: Mutex<HashMap<String, String>>,
    }
}

DefaultStruct! {
    pub struct Bandwidth {
        download: f64,
        upload: f64,
    }
}

DefaultStruct! {
    pub struct IPInfo {
        ipv4: Option<String>,
        ipv6: Option<String>,
    }
}

DefaultStruct! {
    pub struct AnomalyDetection {
        is_anomalous: bool,
        anomaly_type: Option<String>,
    }
}

impl AnomalyDetection {
    pub fn new() -> Self {
        Self {
            is_anomalous: false,
            anomaly_type: Some("BENIGN".into()),
        }
    }
}

DefaultStruct! {
    pub struct NetworkInfo {
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
}
