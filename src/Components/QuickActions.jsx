import React from 'react';
import { Activity, ShieldX, BarChart3 } from 'lucide-react';

const QuickActions = ({ onScanAll, onEmergencyShutdown, onExportReport }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
      <div className="space-y-3">
        <button
          onClick={onScanAll}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Activity size={18} />
          Full Network Scan
        </button>
        
        <button
          onClick={onEmergencyShutdown}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ShieldX size={18} />
          Emergency Shutdown
        </button>
        
        <button
          onClick={onExportReport}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <BarChart3 size={18} />
          Export Security Report
        </button>
      </div>
    </div>
  );
};

export default QuickActions;