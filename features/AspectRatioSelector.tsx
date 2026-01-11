import React from 'react';
import { AspectRatio } from '../types';
import { LayoutTemplate, X, Square, RectangleHorizontal, RectangleVertical, Smartphone } from 'lucide-react';

interface AspectRatioSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ratio: AspectRatio | 'ORIGINAL') => void;
}

const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  const ratios = [
    { label: 'Original', value: 'ORIGINAL', icon: <LayoutTemplate size={24} /> },
    { label: 'Square (1:1)', value: AspectRatio.SQUARE, icon: <Square size={24} /> },
    { label: 'Stories (9:16)', value: AspectRatio.STORIES, icon: <Smartphone size={24} /> },
    { label: 'Landscape (16:9)', value: AspectRatio.LANDSCAPE, icon: <RectangleHorizontal size={24} /> },
    { label: 'Portrait (3:4)', value: AspectRatio.VERTICAL, icon: <RectangleVertical size={24} /> },
    { label: 'Wide (21:9)', value: AspectRatio.WIDE, icon: <RectangleHorizontal size={24} /> },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-[#020202]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] w-full max-w-lg rounded-3xl border border-[#27272A] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-[#27272A] flex justify-between items-center bg-[#0A0A0A]">
          <h2 className="text-xl font-bold text-white tracking-tight">Select Format</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors bg-[#121212] hover:bg-[#27272A] p-2 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 grid grid-cols-2 gap-4 bg-[#0A0A0A]">
          {ratios.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value as AspectRatio | 'ORIGINAL')}
              className="flex flex-col items-center justify-center gap-4 p-6 bg-[#121212] hover:bg-[#18181B] border border-[#27272A] hover:border-brand-500/50 rounded-2xl transition-all duration-200 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 to-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="text-gray-400 group-hover:text-brand-500 transition-colors relative z-10">
                {option.icon}
              </div>
              <span className="text-sm font-medium text-gray-400 group-hover:text-white relative z-10">
                {option.label}
              </span>
            </button>
          ))}
        </div>
        
        <div className="p-5 bg-[#121212]/50 border-t border-[#27272A] text-center">
            <p className="text-xs text-gray-500 font-medium">
                AI will automatically expand (outpaint) your image borders if you choose a new ratio.
            </p>
        </div>
      </div>
    </div>
  );
};

export default AspectRatioSelector;