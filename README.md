# 🛡️ SentinelAI — Real-Time Network Intrusion Detection System (NIDS)

![Release](https://img.shields.io/github/v/release/ANSHAM1/SentinelAI?style=for-the-badge&label=Latest%20Release)
![Downloads](https://img.shields.io/github/downloads/ANSHAM1/SentinelAI/total?style=for-the-badge&color=blue)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge)
![License](https://img.shields.io/github/license/ANSHAM1/SentinelAI?style=for-the-badge)

<p align="center">
  <img src="assets/banner.png" alt="SentinelAI Banner" width="700"/>
</p>

**SentinelAI** is a modern, AI-powered Network Intrusion Detection System (NIDS) designed for real-time traffic monitoring and on-device anomaly detection.

Built with **Rust, Tauri, NFStream, and Machine Learning models**, SentinelAI provides powerful, low-latency threat detection without sending any data outside the user's machine.

## 📸 Screenshots

*Replace the image files in the `assets/` folder with your own screenshots.*

| Real-Time Dashboard | Live Traffic Analysis | Anomaly Detected Alert |
| :---: | :---: | :---: |
| ![SentinelAI Dashboard](assets/dashboard.png) | ![SentinelAI Live Traffic](assets/traffic.png) | ![SentinelAI Alert](assets/alert.png) |
| *Main dashboard showing live stats.* | *Detailed view of active network flows.* | *Example of an alert when an anomaly is found.* |

---

## 🚀 Features

* **🔍 Real-Time Network Monitoring**
    * Captures live traffic from all active network interfaces.
    * Displays interface details (name, ID, bandwidth, flow stats, etc.).
    * Built with Npcap + NFStream for high-performance packet capture.
      
* **🧠 AI-Powered Intrusion Detection**
    * Hybrid AI Engine: **XGBoost Multi-Class Classifier** & **LSTM Autoencoder (ONNX)**.
    * Analyzes over **80+ flow-based features** for deep inspection.
    * Hybrid decision system provides high accuracy and extremely low false positives.
      
* **🔐 Full Local Processing
    * **No data ever leaves your system.**
    * All models run completely on the user’s machine.
    * Ideal for personal use, developers, researchers, and secure enterprise setups.
      
* **🖥️ Modern Desktop UI**
    * Lightweight, fast, and responsive native Windows application.
    * Provides real-time charts, alerts, and detailed interface statistics.

---

## 📦 Installation

Follow these steps to get SentinelAI running.

### 1. Prerequisite: Install Npcap (Required)

SentinelAI **requires** Npcap to be installed on your system for packet capturing.

> **Warning:** This is a mandatory step. The application will not function without Npcap.

1.  Go to the official Npcap download page: **[https://npcap.com/#download](https://npcap.com/#download)**
2.  Download and run the latest installer.
3.  During installation, it's recommended to check **"Install Npcap in WinPcap API-compatible Mode"** for maximum compatibility.

### 2. Download SentinelAI

1.  Go to the [**Latest Release Page**](https://github.com/ANSHAM1/SentinelAI/releases/latest).
2.  Download the `.msi` (installer) file from the **Assets** section.

### 3. Run the Application

1.  Run the downloaded installer (`SentinelAI_1.0.0_x64-setup.msi`).
2.  Launch SentinelAI. It will automatically detect your interfaces and be ready to start monitoring.

---

## 🧪 Machine Learning Engine

SentinelAI uses a hybrid decision engine to combine signature-based and anomaly-based detection, ensuring high accuracy while minimizing false positives.

### Models Used
* **XGBoost Classifier:** A multi-class classifier trained on known threat patterns and flow behaviors. Optimized for very low inference latency.
* **LSTM Autoencoder (ONNX):** Detects novel, unseen anomalies. It learns to reconstruct "normal" network flows and flags any significant reconstruction errors as potential threats.

### Data & Features
All analysis is performed locally using over 80+ engineered features extracted in real-time by NFStream, including:
* Flow duration
* Packet/Byte counts
* Source/Destination ports
* TCP flags
* Payload entropy
* Packet & byte rates
* Inter-arrival times
* Protocol metadata

---

### Project Structure
## 🐛 Reporting Issues

If you encounter any bugs or have suggestions for improvements, please [**open an issue**](https://github.com/ANSHAM1/SentinelAI/issues).

## ❤️ Acknowledgements

Special thanks to:
* The **Npcap** team for the packet capture library.
* The **NFStream** team for the high-speed flow extraction.
* The **ONNX Runtime** team.
* All contributors and testers.

## 📜 License

This project is licensed under the **MIT License**. See the `LICENSE.md` file for details.
