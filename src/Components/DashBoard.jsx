import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Activity } from 'lucide-react';

// Import all components
import Header from './Header';
import ThreatSummary from './ThreatSummary';
import NetworkCard from './NetworkCard';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import NetworkModal from './NetworkModel';

const Dashboard = () => {
  const [networks, setNetworks] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Initialize with mock data - replace with Tauri API
  useEffect(() => {
    const initializeNetworks = async () => {
      try {
        setNetworks(await invoke('get_network_interfaces'));
      } catch (error) {
        console.error('Failed to initialize networks:', error);
      }
    };

    initializeNetworks();
  }, []);

  // Auto-refresh networks every 5 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // In real app, call Tauri command: invoke('get_networks')
        setNetworks(prev => prev.map(network => ({
          ...network,
          bandwidth: {
            download: Math.max(0, network.bandwidth.download + (Math.random() - 0.5) * 20),
            upload: Math.max(0, network.bandwidth.upload + (Math.random() - 0.5) * 5)
          },
          lastSeen: Math.random() > 0.2 ? new Date() : network.lastSeen,
          signal: Math.max(10, Math.min(100, network.signal + Math.floor((Math.random() - 0.5) * 10)))
        })));
      }, 5000);

      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh, refreshInterval]);

  // Handle network toggle
  const handleToggleNetwork = async (networkId) => {
    try {
      const network = networks.find(n => n.id === networkId);
      if (!network) return;

      const newEnabled = !network.enabled;
      
      // In real app: await tauriApi.toggleNetwork(networkId, newEnabled);
      
      setNetworks(prev => prev.map(net => 
        net.id === networkId 
          ? { ...net, enabled: newEnabled }
          : net
      ));

      // Update modal if it's showing this network
      if (selectedNetwork && selectedNetwork.id === networkId) {
        setSelectedNetwork(prev => ({ ...prev, enabled: newEnabled }));
      }

      console.log(`Network ${network.name} ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle network:', error);
      alert(`Failed to ${network.enabled ? 'disable' : 'enable'} network: ${error.message}`);
    }
  };

  // Handle network quarantine
  const handleQuarantine = async (networkId) => {
    try {
      const network = networks.find(n => n.id === networkId);
      if (!network) return;

      const confirmQuarantine = window.confirm(
        `Are you sure you want to quarantine "${network.name}"? This will disable the network and block all traffic.`
      );

      if (!confirmQuarantine) return;

      // In real app: await tauriApi.quarantineNetwork(networkId);
      
      setNetworks(prev => prev.map(net => 
        net.id === networkId 
          ? { 
              ...net, 
              enabled: false, 
              status: 'quarantined',
              threats: [...net.threats, 'Network Quarantined by User']
            }
          : net
      ));

      console.log(`Network ${network.name} has been quarantined`);
      alert(`Network "${network.name}" has been successfully quarantined.`);
    } catch (error) {
      console.error('Failed to quarantine network:', error);
      alert(`Failed to quarantine network: ${error.message}`);
    }
  };

  // Handle scan all networks
  const handleScanAll = async () => {
    try {
      setIsScanning(true);
      
      // In real app: await tauriApi.scanAllNetworks();
      
      // Simulate scan duration and results
      setTimeout(() => {
        setNetworks(prev => prev.map(net => ({
          ...net,
          lastSeen: new Date(),
          // Randomly update some threat statuses for demo
          threats: Math.random() > 0.8 ? ['New threat detected during scan'] : net.threats,
          minerActivity: Math.random() > 0.9 ? true : net.minerActivity
        })));
        setIsScanning(false);
        
        console.log('Network scan completed');
      }, 3000);
    } catch (error) {
      console.error('Failed to scan networks:', error);
      setIsScanning(false);
      alert(`Failed to scan networks: ${error.message}`);
    }
  };

  // Handle emergency shutdown
  const handleEmergencyShutdown = async () => {
    try {
      const confirmShutdown = window.confirm(
        'EMERGENCY SHUTDOWN: This will immediately disable ALL network connections. This action cannot be undone easily. Continue?'
      );

      if (!confirmShutdown) return;

      // In real app: await tauriApi.emergencyShutdown();
      
      setNetworks(prev => prev.map(net => ({ 
        ...net, 
        enabled: false,
        status: 'shutdown'
      })));

      alert('Emergency shutdown completed. All networks have been disabled.');
      console.log('Emergency shutdown executed');
    } catch (error) {
      console.error('Failed to execute emergency shutdown:', error);
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
        miners: networks.filter(net => net.minerActivity).length,
        quarantined: networks.filter(net => net.status === 'quarantined').length
      };

      console.log('Security report generated:', reportData);
      alert('Security report has been exported successfully!\nReport saved to: /Documents/SentinelAI/reports/');
    } catch (error) {
      console.error('Failed to export security report:', error);
      alert(`Failed to export report: ${error.message}`);
    }
  };

  // Handle network details modal
  const handleNetworkDetails = (networkId) => {
    const network = networks.find(n => n.id === networkId);
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
    return networks.find(n => n.id === selectedNetwork.id) || selectedNetwork;
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 transition-colors`}>
      {/* Header */}
      <Header 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        isScanning={isScanning}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Threat Summary */}
        <ThreatSummary networks={networks} />

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Networks Grid */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Network Connections
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {networks.filter(n => n.enabled).length} of {networks.length} networks active
                </p>
              </div>
              <button
                onClick={handleScanAll}
                disabled={isScanning}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Activity size={18} className={isScanning ? 'animate-spin' : ''} />
                {isScanning ? 'Scanning...' : 'Refresh Scan'}
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
                {networks.map(network => (
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

          {/* Sidebar */}
          <div className="space-y-6">
            <RecentActivity networks={networks} />
            <QuickActions
              onScanAll={handleScanAll}
              onEmergencyShutdown={handleEmergencyShutdown}
              onExportReport={handleExportReport}
              isScanning={isScanning}
            />
          </div>
        </div>
      </main>

      {/* Network Details Modal */}
      <NetworkModal
        network={getModalNetworkData()}
        isOpen={showModal}
        onClose={handleCloseModal}
        onToggle={handleToggleNetwork}
      />
    </div>
  );
};

export default Dashboard;