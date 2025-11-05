import React from 'react';
import { 
  Wifi, Globe, Server, Activity, Shield, Cpu, MapPin,
  Download, Upload, AlertTriangle, Zap, Eye, EyeOff, Settings
} from 'lucide-react';
import StatusBadge from './StatusBadge';

const NetworkCard = ({ network, onToggle, onQuarantine, onDetails }) => {
  const isOnline = network.enabled && network.lastSeen > new Date(Date.now() - 60000);
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border-l-4 p-6 transition-all duration-300 hover:shadow-xl ${
      network.status === 'threat' ? 'border-red-500' : 
      network.status === 'miner' ? 'border-yellow-500' : 'border-green-500'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isOnline ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
            {network.type === 'WiFi' ? <Wifi size={20} /> : 
             network.type === 'Ethernet' ? <Server size={20} /> : <Globe size={20} />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{network.name}</h3>
            <p className="text-sm text-gray-500">{network.ssid}</p>
          </div>
        </div>
        <StatusBadge status={network.status} minerActivity={network.minerActivity} threats={network.threats} />
      </div>

      {/* Network Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Activity size={16} className="text-gray-400" />
          <span className="text-gray-600 dark:text-gray-300">Signal: {network.signal}%</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Shield size={16} className="text-gray-400" />
          <span className="text-gray-600 dark:text-gray-300">{network.security}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Cpu size={16} className="text-gray-400" />
          <span className="text-gray-600 dark:text-gray-300">{network.devices} devices</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin size={16} className="text-gray-400" />
          <span className="text-gray-600 dark:text-gray-300">{network.location}</span>
        </div>
      </div>

      {/* Bandwidth */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bandwidth</span>
          <span className="text-xs text-gray-500">{isOnline ? 'Live' : 'Offline'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1 text-green-600">
            <Download size={14} />
            {network.bandwidth.download.toFixed(1)} Mbps
          </div>
          <div className="flex items-center gap-1 text-blue-600">
            <Upload size={14} />
            {network.bandwidth.upload.toFixed(1)} Mbps
          </div>
        </div>
      </div>

      {/* Threats Display */}
      {network.threats.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-sm font-medium text-red-700">Active Threats</span>
          </div>
          {network.threats.map((threat, idx) => (
            <div key={idx} className="text-xs text-red-600 mb-1">• {threat}</div>
          ))}
        </div>
      )}

      {/* Miner Activity */}
      {network.minerActivity && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-yellow-500" />
            <span className="text-sm font-medium text-yellow-700">Cryptocurrency Mining Detected</span>
          </div>
          <p className="text-xs text-yellow-600 mt-1">Unusual CPU patterns and network requests detected</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => onToggle(network.id)}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
            network.enabled 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {network.enabled ? (
            <>
              <EyeOff size={16} className="inline mr-1" />
              Disable
            </>
          ) : (
            <>
              <Eye size={16} className="inline mr-1" />
              Enable
            </>
          )}
        </button>
        
        {(network.status === 'threat' || network.minerActivity) && (
          <button
            onClick={() => onQuarantine(network.id)}
            className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium text-sm hover:bg-orange-200 transition-colors"
          >
            Quarantine
          </button>
        )}
        
        <button
          onClick={() => onDetails(network.id)}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-200 transition-colors"
        >
          <Settings size={16} className="inline" />
        </button>
      </div>
    </div>
  );
};

export default NetworkCard;