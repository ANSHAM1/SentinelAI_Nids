import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { Activity } from "lucide-react";

import Header from "./Header";
import ThreatSummary from "./ThreatSummary";
import NetworkCard from "./NetworkCard";
import RecentActivity from "./RecentActivity";
import QuickActions from "./QuickActions";
import NetworkModel from "./NetworkModel";

const Dashboard = () => {
  const [networks, setNetworks] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
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
    initializeNetworks();

    const unlistenPromise = listen("network_update", (event) => {
      console.log("🔁 Full network update:", event.payload);
      setNetworks(event.payload);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // useEffect(() => {
  //   let intervalId = null;
  //   let isFetching = false;

  //   async function fetchNetworks() {
  //     if (isFetching) return;
  //     isFetching = true;
  //     try {
  //       const updatedNetworks = await invoke("get_networks");
  //       setNetworks(updatedNetworks);
  //     } catch (error) {
  //       console.error("Failed to fetch networks:", error);
  //     } finally {
  //       isFetching = false;
  //     }
  //   }

  //   if (autoRefresh) {
  //     fetchNetworks();
  //     intervalId = setInterval(fetchNetworks, 5000);
  //   }

  //   return () => {
  //     if (intervalId) clearInterval(intervalId);
  //   };
  // }, [autoRefresh]);

  return (
    <div className={"min-h-screen bg-gray-900"}>
      <Header isScanning={isScanning} />

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
                  {networks.filter((n) => n.status == "active").length} of{" "}
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
                    // onDetails={handleNetworkDetails}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* <RecentActivity networks={networks} />
            <QuickActions
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
