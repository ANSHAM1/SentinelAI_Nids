import React from 'react';
import { ShieldX, Zap, CheckCircle } from 'lucide-react';

const StatusBadge = ({ status, minerActivity, threats }) => {
  const getStatusInfo = () => {
    if (status === 'threat' || threats?.length > 0) {
      return { color: 'bg-red-500', icon: ShieldX, text: 'THREAT DETECTED' };
    }
    if (status === 'miner' || minerActivity) {
      return { color: 'bg-yellow-500', icon: Zap, text: 'MINER DETECTED' };
    }
    return { color: 'bg-green-500', icon: CheckCircle, text: 'SECURE' };
  };

  const { color, icon: Icon, text } = getStatusInfo();
  
  return (
    <div className={`${color} text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
      <Icon size={12} />
      {text}
    </div>
  );
};

export default StatusBadge;