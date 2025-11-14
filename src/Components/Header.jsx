import { Shield } from "lucide-react";

const Header = ({ isScanning }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                SentinelAI
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Network Security Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                isScanning
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isScanning ? "bg-blue-500 animate-pulse" : "bg-green-500"
                }`}
              />
              {isScanning ? "Scanning..." : "Monitoring"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
