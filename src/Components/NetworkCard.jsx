import React from "react";
import {
  Wifi,
  Server,
  Globe,
  Cpu,
  Activity,
  Download,
  Upload,
  Network,
  Gauge,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

const NetworkCard = ({ network }) => {
  if (!network) return null;

  const {
    id,
    name,
    status,
    anomaly,
    ipInfo,
    bandwidth,
    receivedBytes,
    transmittedBytes,
    cpuUsage,
    lastSeen,
    activePorts,
  } = network;

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

  const typeIcon = () => {
    const lname = name.toLowerCase();
    if (lname.includes("wi") || lname.includes("wlan"))
      return <Wifi size={22} />;
    if (lname.includes("eth")) return <Server size={22} />;
    return <Globe size={22} />;
  };

  const getAnomalyStyle = () => {
    if (!anomaly || !anomaly.isAnomalous)
      return {
        color: "bg-green-100 text-green-700 border-green-300",
        text: "Normal Network Behavior",
        icon: <CheckCircle size={18} className="text-green-500" />,
      };

    switch (anomaly.anomalyType?.toLowerCase()) {
      case "suspicious":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-300",
          text: "Suspicious Activity Detected",
          icon: <AlertTriangle size={18} className="text-yellow-600" />,
        };
      default:
        return {
          color: "bg-red-100 text-red-700 border-red-300",
          text: `Anomaly: ${anomaly.anomalyType || "Unknown"}`,
          icon: <ShieldAlert size={18} className="text-red-500" />,
        };
    }
  };

  const anomalyStyle = getAnomalyStyle();

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 overflow-hidden">
      {/* 🧠 Anomaly Banner */}
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b ${anomalyStyle.color}`}
      >
        {anomalyStyle.icon}
        <span className="text-sm font-semibold tracking-wide">
          {anomalyStyle.text}
        </span>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl text-blue-600 dark:text-blue-300">
              {typeIcon()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                {name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ID: {id}
              </p>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize shadow-sm ${
              status === "active"
                ? "bg-green-100 text-green-700"
                : status === "disconnected"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {status}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Network size={16} /> Network Info
          </h3>
          <div className="grid grid-cols-2 gap-y-1 text-sm text-gray-700 dark:text-gray-400">
            <p
              className="overflow-hidden text-ellipsis whitespace-nowrap"
              title={ipInfo?.ipv4 || "N/A"}
            >
              IPv4: {ipInfo?.ipv4 ?? "N/A"}
            </p>
            <p
              className="overflow-hidden text-ellipsis whitespace-nowrap"
              title={ipInfo?.ipv6 || "N/A"}
            >
              IPv6: {ipInfo?.ipv6 ?? "N/A"}
            </p>
            <p>Ports: {activePorts?.length ?? 0}</p>
            <p>Last Seen: {formatTime(lastSeen)}</p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-inner">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Activity size={16} /> Bandwidth Usage
          </h3>
          <div className="grid grid-cols-2 text-sm gap-y-1">
            <p className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
              <Download size={14} /> RX:{" "}
              {bandwidth?.rx_rate_mbps?.toFixed(2) ?? "0.00"} Mbps
            </p>
            <p className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
              <Upload size={14} /> TX:{" "}
              {bandwidth?.tx_rate_mbps?.toFixed(2) ?? "0.00"} Mbps
            </p>
            <p>Received: {formatBytes(receivedBytes)}</p>
            <p>Transmitted: {formatBytes(transmittedBytes)}</p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-inner flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <Cpu size={16} /> System Resource Usage
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Gauge size={14} />
              CPU:{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {cpuUsage?.toFixed(1) ?? "0.0"}%
              </span>
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-md text-xs font-medium ${
              cpuUsage > 70
                ? "bg-red-100 text-red-600"
                : cpuUsage > 40
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {cpuUsage > 70
              ? "High Load"
              : cpuUsage > 40
              ? "Moderate Load"
              : "Low Load"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkCard;