import React, { useMemo } from "react";
import { Clock } from "lucide-react";

// Utility: convert timestamp to "x min ago"
function timeAgo(timestamp) {
  const now = Date.now();
  const diff = Math.floor((now - new Date(timestamp).getTime()) / 60000); // minutes

  if (diff <= 0) return "just now";
  if (diff === 1) return "1 min ago";
  return `${diff} min ago`;
}

// Utility: map anomaly → display category
function classifyEvent(net) {
  if (net.anomaly.isAnomalous) {
    return {
      type: "threat",
      severity: "high",
      message: `Anomaly detected on ${net.name}`,
    };
  }

  return {
    type: "normal",
    severity: "low",
    message: `${net.name} checked — no anomaly`,
  };
}

const RecentActivity = ({ networks }) => {
  // Build activity list from networks
  const activities = useMemo(() => {
    if (!networks || networks.length === 0) return [];

    return networks
      .map((net) => {
        const event = classifyEvent(net);

        return {
          time: timeAgo(net.last_seen),
          message: event.message,
          severity: event.severity,
          type: event.type,
          last_seen: net.last_seen, // keep for sorting
        };
      })
      .sort(
        (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
      )
      .slice(0, 20); // Limit to 20 latest
  }, [networks]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Clock size={20} />
        Recent Activity
      </h3>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {activities.length === 0 && (
          <p className="text-gray-500 text-sm">No recent activity</p>
        )}

        {activities.map((activity, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            {/* LEFT Colored dot */}
            <div
              className={`w-2 h-2 rounded-full mt-2 ${
                activity.type === "threat"
                  ? "bg-red-500"
                  : activity.type === "miner"
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
            />

            {/* TEXT */}
            <div className="flex-1">
              <p className="text-sm text-gray-900 dark:text-white">
                {activity.message}
              </p>
              <p className="text-xs text-gray-500">{activity.time}</p>
            </div>

            {/* BADGE */}
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                activity.severity === "high"
                  ? "bg-red-100 text-red-800"
                  : activity.severity === "medium"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {activity.severity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;