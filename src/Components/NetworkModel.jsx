import React from 'react';

const NetworkModal = ({ network, isOpen, onClose, onToggle }) => {
  if (!isOpen || !network) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Network Details: {network.name}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>SSID:</strong> {network.ssid}</div>
              <div><strong>Type:</strong> {network.type}</div>
              <div><strong>Security:</strong> {network.security}</div>
              <div><strong>Signal:</strong> {network.signal}%</div>
              <div><strong>Devices:</strong> {network.devices}</div>
              <div><strong>Location:</strong> {network.location}</div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Advanced Details</h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>MAC Address:</strong> XX:XX:XX:XX:XX:XX</p>
                <p><strong>IP Range:</strong> 192.168.1.0/24</p>
                <p><strong>Gateway:</strong> 192.168.1.1</p>
                <p><strong>DNS:</strong> 8.8.8.8, 8.8.4.4</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => onToggle(network.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                network.enabled 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {network.enabled ? 'Disable Network' : 'Enable Network'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkModal;