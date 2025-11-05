import React from 'react';
import { Clock } from 'lucide-react';

const RecentActivity = ({ networks }) => {
  const activities = [
    { time: '2 min ago', type: 'threat', message: 'Port scan detected on Guest Network', severity: 'high' },
    { time: '5 min ago', type: 'miner', message: 'Mining activity blocked on Office Network', severity: 'medium' },
    { time: '12 min ago', type: 'normal', message: 'New device connected to Home WiFi', severity: 'low' },
    { time: '18 min ago', type: 'normal', message: 'Network scan completed successfully', severity: 'low' },
    { time: '25 min ago', type: 'threat', message: 'Suspicious outbound traffic blocked', severity: 'high' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Clock size={20} />
        Recent Activity
      </h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {activities.map((activity, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className={`w-2 h-2 rounded-full mt-2 ${
              activity.type === 'threat' ? 'bg-red-500' :
              activity.type === 'miner' ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            <div className="flex-1">
              <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
              <p className="text-xs text-gray-500">{activity.time}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              activity.severity === 'high' ? 'bg-red-100 text-red-800' :
              activity.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {activity.severity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;