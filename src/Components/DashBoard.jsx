import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Activity } from "lucide-react";

import Header from "./Header";
import ThreatSummary from "./ThreatSummary";
import NetworkCard from "./NetworkCard";
import RecentActivity from "./RecentActivity";
import QuickActions from "./QuickActions";
import NetworkModel from "./NetworkModel";

const Dashboard = () => {
  const [networks, setNetworks] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isScanning, setIsScanning] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const initializeNetworks = async () => {
    try {
      setNetworks(await invoke("get_networks"));
    } catch (error) {
      console.error("Failed to initialize networks:", error);
    }
  };

  const handleRefresh = async () => {
    setIsScanning(true);
    setTimeout(() => {
      initializeNetworks();
      setIsScanning(false);
    }, 2000);
  };

  useEffect(() => {
    setIsScanning(true);
    initializeNetworks();
    setIsScanning(false);
  }, []);

  useEffect(() => {
    let intervalId = null;
    let isFetching = false;

    async function fetchNetworks() {
      if (isFetching) return;
      isFetching = true;
      try {
        const updatedNetworks = await invoke("get_networks");
        setNetworks(updatedNetworks);
      } catch (error) {
        console.error("Failed to fetch networks:", error);
      } finally {
        isFetching = false;
      }
    }

    if (autoRefresh) {
      fetchNetworks();
      intervalId = setInterval(fetchNetworks, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  const handleToggleNetwork = async (networkId) => {
    try {
      const network = networks.find((n) => n.id === networkId);
      if (!network) return;

      const newEnabled = !network.enabled;

      // In real app: await tauriApi.toggleNetwork(networkId, newEnabled);

      setNetworks((prev) =>
        prev.map((net) =>
          net.id === networkId ? { ...net, enabled: newEnabled } : net
        )
      );

      // Update modal if it's showing this network
      if (selectedNetwork && selectedNetwork.id === networkId) {
        setSelectedNetwork((prev) => ({ ...prev, enabled: newEnabled }));
      }

      console.log(
        `Network ${network.name} ${newEnabled ? "enabled" : "disabled"}`
      );
    } catch (error) {
      console.error("Failed to toggle network:", error);
      alert(
        `Failed to ${network.enabled ? "disable" : "enable"} network: ${
          error.message
        }`
      );
    }
  };

  // // Handle network quarantine
  const handleQuarantine = async (networkId) => {
    try {
      const network = networks.find((n) => n.id === networkId);
      if (!network) return;

      const confirmQuarantine = window.confirm(
        `Are you sure you want to quarantine "${network.name}"? This will disable the network and block all traffic.`
      );

      if (!confirmQuarantine) return;

      // In real app: await tauriApi.quarantineNetwork(networkId);

      setNetworks((prev) =>
        prev.map((net) =>
          net.id === networkId
            ? {
                ...net,
                enabled: false,
                status: "quarantined",
                threats: [...net.threats, "Network Quarantined by User"],
              }
            : net
        )
      );

      console.log(`Network ${network.name} has been quarantined`);
      alert(`Network "${network.name}" has been successfully quarantined.`);
    } catch (error) {
      console.error("Failed to quarantine network:", error);
      alert(`Failed to quarantine network: ${error.message}`);
    }
  };

  // Handle emergency shutdown
  const handleEmergencyShutdown = async () => {
    try {
      const confirmShutdown = window.confirm(
        "EMERGENCY SHUTDOWN: This will immediately disable ALL network connections. This action cannot be undone easily. Continue?"
      );

      if (!confirmShutdown) return;

      // In real app: await tauriApi.emergencyShutdown();

      setNetworks((prev) =>
        prev.map((net) => ({
          ...net,
          enabled: false,
          status: "shutdown",
        }))
      );

      alert("Emergency shutdown completed. All networks have been disabled.");
      console.log("Emergency shutdown executed");
    } catch (error) {
      console.error("Failed to execute emergency shutdown:", error);
      alert(`Emergency shutdown failed: ${error.message}`);
    }
  };

  // Handle export report
  const handleExportReport = async () => {
    try {
      // In real app: const reportPath = await tauriApi.exportSecurityReport();

      // Simulate report generation
      const reportData = {
        timestamp: new Date().toISOString(),
        networks: networks.length,
        threats: networks.reduce((acc, net) => acc + net.threats.length, 0),
        miners: networks.filter((net) => net.minerActivity).length,
        quarantined: networks.filter((net) => net.status === "quarantined")
          .length,
      };

      console.log("Security report generated:", reportData);
      alert(
        "Security report has been exported successfully!\nReport saved to: /Documents/SentinelAI/reports/"
      );
    } catch (error) {
      console.error("Failed to export security report:", error);
      alert(`Failed to export report: ${error.message}`);
    }
  };

  // Handle network details modal
  const handleNetworkDetails = (networkId) => {
    const network = networks.find((n) => n.id === networkId);
    if (network) {
      setSelectedNetwork(network);
      setShowModal(true);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedNetwork(null);
  };

  // Get updated network data for modal
  const getModalNetworkData = () => {
    if (!selectedNetwork) return null;
    return networks.find((n) => n.id === selectedNetwork.id) || selectedNetwork;
  };

  return (
    <div className={"min-h-screen bg-gray-900"}>
      <Header
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        isScanning={isScanning}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <ThreatSummary networks={networks} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Network Connections
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {networks.filter((n) => n.enabled).length} of{" "}
                  {networks.length} networks active
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isScanning}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Activity
                  size={18}
                  className={isScanning ? "animate-spin" : ""}
                />
                {isScanning ? "Scanning..." : "Refresh Scan"}
              </button>
            </div>

            {networks.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <Activity size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Networks Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Click "Refresh Scan" to discover available networks
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {networks.map((network) => (
                  <NetworkCard
                    key={network.id}
                    network={network}
                    onToggle={handleToggleNetwork}
                    onQuarantine={handleQuarantine}
                    onDetails={handleNetworkDetails}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* <RecentActivity networks={networks} /> */}
            {/* <QuickActions
              onScanAll={handleScanAll}
              onEmergencyShutdown={handleEmergencyShutdown}
              onExportReport={handleExportReport}
              isScanning={isScanning}
            /> */}
          </div>
        </div>
      </main>

      {/* <NetworkModel
        network={getModalNetworkData()}
        isOpen={showModal}
        onClose={handleCloseModal}
        onToggle={handleToggleNetwork}
      /> */}
    </div>
  );
};

export default Dashboard;
