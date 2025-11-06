import React from "react";
import {
  Globe,
  Server,
  Wifi,
  Cpu,
  Activity,
  Download,
  Upload,
  MemoryStick,
  Clock,
  Network,
  Settings,
  Zap,
  List,
} from "lucide-react";

const NetworkCard = ({ network, onDetails }) => {
  if (!network) return null;

  const {
    id,
    name,
    status,
    ip_info,
    received_bytes,
    transmitted_bytes,
    bandwidth,
    sockets,
    last_seen,
    cpu_usage,
    total_memory,
    used_memory,
  } = network;

  // Helpers
  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const formatTime = (time) =>
    new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const memoryUsagePercent = total_memory
    ? ((used_memory / total_memory) * 100).toFixed(1)
    : "N/A";

  const typeIcon = () => {
    const lname = name.toLowerCase();
    if (lname.includes("wi") || lname.includes("wlan")) return <Wifi size={20} />;
    if (lname.includes("eth")) return <Server size={20} />;
    return <Globe size={20} />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
            {typeIcon()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">ID: {id}</p>
          </div>
        </div>
        <div
          className={`px-3 py-1 text-sm rounded-full ${
            status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {status}
        </div>
      </div>

      {/* IP Info */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
          <Network size={16} /> Network Info
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
          <p>IPv4: {ip_info?.ipv4 ?? "N/A"}</p>
          <p>IPv6: {ip_info?.ipv6 ?? "N/A"}</p>
          <p>MAC: {ip_info?.mac ?? "N/A"}</p>
          <p>Interface: {ip_info?.interface ?? "N/A"}</p>
        </div>
      </div>

      {/* Bandwidth */}
      <div className="mb-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
          <Activity size={16} /> Bandwidth
        </h3>
        <div className="grid grid-cols-2 text-sm">
          <p className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Download size={14} /> {bandwidth?.download.toFixed(2)} Mbps
          </p>
          <p className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Upload size={14} /> {bandwidth?.upload.toFixed(2)} Mbps
          </p>
          <p>Received: {formatBytes(received_bytes)}</p>
          <p>Transmitted: {formatBytes(transmitted_bytes)}</p>
        </div>
      </div>

      {/* CPU / Memory */}
      <div className="mb-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
          <Cpu size={16} /> System Stats
        </h3>
        <div className="grid grid-cols-2 text-sm text-gray-600 dark:text-gray-400">
          <p>CPU Usage: {cpu_usage.toFixed(1)}%</p>
          <p>
            Memory: {formatBytes(used_memory)} / {formatBytes(total_memory)} (
            {memoryUsagePercent}%)
          </p>
          <p className="col-span-2 text-xs text-gray-500 mt-1">
            Last seen: {formatTime(last_seen)}
          </p>
        </div>
      </div>

      {/* Sockets */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <List size={16} /> Active Sockets ({sockets?.length || 0})
        </h3>
        {sockets && sockets.length > 0 ? (
          <div className="max-h-32 overflow-y-auto border-t border-gray-200 dark:border-gray-600 pt-2">
            {sockets.map((sock, i) => (
              <div
                key={i}
                className="text-xs flex justify-between text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-600 py-1"
              >
                <span>{sock.protocol}</span>
                <span>{sock.local_addr}</span>
                <span>{sock.remote_addr}</span>
                <span>{sock.state ?? "N/A"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No active sockets</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end">
        <button
          onClick={() => onDetails(network.id)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg flex items-center gap-2 transition"
        >
          <Settings size={16} />
          Details
        </button>
      </div>
    </div>
  );
};

export default NetworkCard;
