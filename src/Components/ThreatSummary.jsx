import { Server, CheckCircle, ShieldAlert, Zap } from "lucide-react";

const ThreatSummary = ({ networks }) => {
  const totalNetworks = networks.length;
  const secureNetworks = networks.filter((n) => !n.anomaly.isAnomalous).length;
  const threatenedNetworks = networks.filter(
    (n) => n.anomaly.isAnomalous
  ).length;
  const totalCpuUsage = Number(
    networks.reduce((sum, n) => sum + (n.cpuUsage || 0), 0).toFixed(2)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Networks
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalNetworks}
            </p>
          </div>
          <Server className="text-blue-500" size={24} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Secure</p>
            <p className="text-2xl font-bold text-green-600">
              {secureNetworks}
            </p>
          </div>
          <CheckCircle className="text-green-500" size={24} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              vulnerable
            </p>
            <p className="text-2xl font-bold text-red-600">
              {threatenedNetworks}
            </p>
          </div>
          <ShieldAlert className="text-red-500" size={24} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cpu Usage
            </p>
            <p className="text-2xl font-bold text-yellow-600">
              {totalCpuUsage}
            </p>
          </div>
          <Zap className="text-yellow-500" size={24} />
        </div>
      </div>
    </div>
  );
};

export default ThreatSummary;
