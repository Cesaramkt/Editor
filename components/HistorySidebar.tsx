import React from 'react';
import { HistoryItem } from '../types';
import { Clock, RotateCcw } from 'lucide-react';

interface HistorySidebarProps {
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onRestore }) => {
  return (
    <div className="w-full h-full flex flex-col bg-gray-900 border-l border-gray-800">
      <div className="p-4 border-b border-gray-800 flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">History</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-10">No history yet.</p>
        )}
        {[...history].reverse().map((item) => (
          <div 
            key={item.id} 
            className="group relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-brand-500 transition-colors cursor-pointer"
            onClick={() => onRestore(item)}
          >
            <div className="aspect-square w-full bg-gray-950">
              <img src={item.thumbnail} alt="History thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="p-3">
              <p className="text-xs text-gray-300 line-clamp-2 mb-2">{item.prompt || "Image Edit"}</p>
              <div className="flex justify-between items-center text-[10px] text-gray-500">
                <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1 rounded-full text-white">
              <RotateCcw size={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistorySidebar;