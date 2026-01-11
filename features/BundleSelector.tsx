
import React, { useState } from 'react';
import { AspectRatio, BundleItem } from '../types';
import { X, CheckCircle2, Layers, Settings2 } from 'lucide-react';

interface BundleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBundle: (items: BundleItem[]) => void;
}

type TabType = 'META' | 'GOOGLE' | 'CUSTOM';

interface VisualRatioCardProps {
    label: string;
    ratioLabel: string;
    qty?: number;
    onClick?: () => void;
    selected?: boolean;
    compact?: boolean;
}

const VisualRatioCard: React.FC<VisualRatioCardProps> = ({ label, ratioLabel, qty, onClick, selected, compact = false }) => {
    let w = 'w-8';
    let h = 'h-8';
    
    // Determine Shape based on label or sub-label
    const lowerLabel = (label + ratioLabel).toLowerCase();
    
    if (lowerLabel.includes('square') || lowerLabel.includes('1:1')) { w = 'w-8'; h = 'h-8'; }
    else if (lowerLabel.includes('landscape') || lowerLabel.includes('1.91') || lowerLabel.includes('16:9')) { w = 'w-12'; h = 'h-7'; }
    else if (lowerLabel.includes('stories') || lowerLabel.includes('9:16')) { w = 'w-6'; h = 'h-11'; }
    else if (lowerLabel.includes('portrait') || lowerLabel.includes('4:5') || lowerLabel.includes('3:4')) { w = 'w-7'; h = 'h-9'; }

    return (
        <div 
            onClick={onClick}
            className={`
                flex flex-col items-center justify-center rounded-xl border transition-all select-none relative
                ${onClick ? 'cursor-pointer' : ''}
                ${selected 
                    ? 'bg-brand-900/20 border-brand-500' 
                    : 'bg-[#18181B] border-[#27272A] hover:border-gray-600'}
                ${compact ? 'p-2 min-w-[70px]' : 'p-4'}
            `}
        >
            {/* Visual Shape */}
            <div className={`flex items-center justify-center ${compact ? 'h-12 mb-1' : 'h-16 mb-2'}`}>
                <div 
                    className={`
                        ${w} ${h} rounded-[2px] border-2 transition-colors
                        ${selected ? 'border-brand-400 bg-brand-400/10' : 'border-gray-500 bg-gray-500/10'}
                    `}
                ></div>
            </div>
            
            {/* Ratio Label (e.g. 1:1) */}
            <span className={`font-medium ${selected ? 'text-brand-400' : 'text-gray-300'} ${compact ? 'text-[10px]' : 'text-sm'}`}>
                {ratioLabel}
            </span>

            {/* Quantity Badge (Optional) */}
            {qty !== undefined && (
                 <span className={`
                    text-[10px] font-bold mt-0.5
                    ${selected ? 'text-brand-300' : 'text-gray-500'}
                 `}>
                    {qty}x
                 </span>
            )}
        </div>
    )
}

const BundleSelector: React.FC<BundleSelectorProps> = ({ isOpen, onClose, onSelectBundle }) => {
  const [activeTab, setActiveTab] = useState<TabType>('META');
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);
  const [customQty, setCustomQty] = useState(1);

  if (!isOpen) return null;

  const handleCustomSubmit = () => {
    onSelectBundle([{
      ratio: customWidth / customHeight,
      label: `Custom ${customWidth}x${customHeight}`,
      qty: customQty,
      width: customWidth,
      height: customHeight
    }]);
  };

  const setPreset = (w: number, h: number) => {
      setCustomWidth(w);
      setCustomHeight(h);
  };

  const Bundles = {
    META: [
      {
        id: 'meta_full',
        title: 'Meta Ads Full Suite',
        description: 'Ideal for Facebook & Instagram placements.',
        items: [
          { ratio: AspectRatio.SQUARE, label: 'Square', sub: '1:1', qty: 1, width: 1080, height: 1080 },
          { ratio: AspectRatio.LANDSCAPE, label: 'Landscape', sub: '16:9', qty: 1, width: 1920, height: 1080 },
          { ratio: AspectRatio.STORIES, label: 'Stories', sub: '9:16', qty: 1, width: 1080, height: 1920 }
        ]
      }
    ],
    GOOGLE: [
      {
        id: 'demand_gen',
        title: 'Demand Gen',
        description: 'YouTube Shorts, Discover, Gmail.',
        items: [
          { ratio: AspectRatio.SQUARE, label: 'Square', sub: '1:1', qty: 3, width: 1080, height: 1080 },
          { ratio: AspectRatio.LANDSCAPE, label: 'Landscape', sub: '16:9', qty: 3, width: 1920, height: 1080 },
          { ratio: AspectRatio.VERTICAL, label: 'Portrait', sub: '4:5', qty: 3, width: 1080, height: 1350 }
        ]
      },
      {
        id: 'display',
        title: 'Display Ads',
        description: 'Standard banner formats for GDN.',
        items: [
          { ratio: AspectRatio.SQUARE, label: 'Square', sub: '1:1', qty: 5, width: 1080, height: 1080 },
          { ratio: AspectRatio.LANDSCAPE, label: 'Landscape', sub: '16:9', qty: 5, width: 1920, height: 1080 }
        ]
      },
      {
        id: 'pmax',
        title: 'Performance Max',
        description: 'Maximum reach across all Google inventory.',
        items: [
          { ratio: AspectRatio.SQUARE, label: 'Square', sub: '1:1', qty: 4, width: 1080, height: 1080 },
          { ratio: AspectRatio.LANDSCAPE, label: 'Landscape', sub: '16:9', qty: 4, width: 1920, height: 1080 },
          { ratio: AspectRatio.VERTICAL, label: 'Portrait', sub: '4:5', qty: 2, width: 1080, height: 1350 }
        ]
      },
      {
        id: 'search',
        title: 'Search Ads',
        description: 'Image extensions for text ads.',
        items: [
          { ratio: AspectRatio.SQUARE, label: 'Square', sub: '1:1', qty: 1, width: 1080, height: 1080 },
          { ratio: AspectRatio.LANDSCAPE, label: 'Landscape', sub: '16:9', qty: 1, width: 1920, height: 1080 }
        ]
      }
    ]
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#020202]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] w-full max-w-2xl rounded-3xl border border-[#27272A] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#27272A] flex justify-between items-center bg-[#0A0A0A] shrink-0">
          <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Layers className="text-brand-500" size={24} />
                Generate Assets (Enxovais)
              </h2>
              <p className="text-gray-400 text-sm mt-1">Select a bundle to auto-resize and generate multiple formats.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors bg-[#121212] hover:bg-[#27272A] p-2 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#27272A] bg-[#121212] shrink-0">
           {(['META', 'GOOGLE', 'CUSTOM'] as TabType[]).map(tab => (
               <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab ? 'border-brand-500 text-brand-500 bg-brand-500/5' : 'border-transparent text-gray-400 hover:text-white hover:bg-[#18181B]'}`}
               >
                   {tab === 'META' ? 'Meta Ads' : tab === 'GOOGLE' ? 'Google Ads' : 'Custom / Presets'}
               </button>
           ))}
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto bg-[#0A0A0A] flex-1">
           {activeTab === 'CUSTOM' ? (
               <div className="flex flex-col gap-8 max-w-sm mx-auto py-2">
                   
                   {/* Presets Grid */}
                   <div>
                       <label className="block text-xs font-medium text-gray-400 mb-4 uppercase flex items-center gap-2">
                           <Settings2 size={12} /> Quick Presets
                       </label>
                       <div className="grid grid-cols-4 gap-3">
                           <VisualRatioCard 
                               label="Square" ratioLabel="1:1" 
                               onClick={() => setPreset(1080, 1080)} 
                               selected={customWidth === 1080 && customHeight === 1080}
                           />
                           <VisualRatioCard 
                               label="Landscape" ratioLabel="16:9" 
                               onClick={() => setPreset(1920, 1080)} 
                               selected={customWidth === 1920 && customHeight === 1080}
                           />
                           <VisualRatioCard 
                               label="Stories" ratioLabel="9:16" 
                               onClick={() => setPreset(1080, 1920)} 
                               selected={customWidth === 1080 && customHeight === 1920}
                           />
                           <VisualRatioCard 
                               label="Portrait" ratioLabel="4:5" 
                               onClick={() => setPreset(1080, 1350)} 
                               selected={customWidth === 1080 && customHeight === 1350}
                           />
                       </div>
                   </div>

                   <hr className="border-[#27272A]" />

                   {/* Manual Inputs */}
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Width (px)</label>
                           <input 
                              type="number" 
                              value={customWidth} 
                              onChange={(e) => setCustomWidth(Number(e.target.value))}
                              className="w-full bg-[#121212] border border-[#27272A] rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Height (px)</label>
                           <input 
                              type="number" 
                              value={customHeight} 
                              onChange={(e) => setCustomHeight(Number(e.target.value))}
                              className="w-full bg-[#121212] border border-[#27272A] rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                           />
                       </div>
                   </div>
                   
                   <div>
                       <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Quantity</label>
                       <div className="flex items-center gap-4 bg-[#121212] p-2 rounded-xl border border-[#27272A]">
                           <button onClick={() => setCustomQty(Math.max(1, customQty - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-[#27272A] rounded-lg text-gray-400 font-bold transition-colors">-</button>
                           <span className="flex-1 text-center font-bold text-white text-lg">{customQty}</span>
                           <button onClick={() => setCustomQty(Math.min(10, customQty + 1))} className="w-10 h-10 flex items-center justify-center hover:bg-[#27272A] rounded-lg text-gray-400 font-bold transition-colors">+</button>
                       </div>
                   </div>

                   <button 
                      onClick={handleCustomSubmit}
                      className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:brightness-110 text-white font-bold py-4 rounded-xl shadow-cta transition-transform active:scale-95 mt-2"
                   >
                       Generate Custom Size
                   </button>
               </div>
           ) : (
               <div className="grid gap-4">
                   {(Bundles[activeTab] as any[]).map((bundle) => (
                       <div key={bundle.id} className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 hover:border-brand-500/50 transition-colors group cursor-pointer" onClick={() => onSelectBundle(bundle.items)}>
                           <div className="flex justify-between items-start mb-4">
                               <div>
                                   <h3 className="text-lg font-bold text-white group-hover:text-brand-500 transition-colors">{bundle.title}</h3>
                                   <p className="text-sm text-gray-400">{bundle.description}</p>
                               </div>
                               <button 
                                  className="bg-[#27272A] group-hover:bg-brand-600 text-white p-2 rounded-xl transition-colors"
                               >
                                   <CheckCircle2 size={20} />
                               </button>
                           </div>
                           
                           {/* Simplified Visual Grid for Items */}
                           <div className="flex flex-wrap gap-2">
                               {bundle.items.map((item: any, idx: number) => (
                                   <VisualRatioCard 
                                       key={idx}
                                       label={item.label}
                                       ratioLabel={item.sub}
                                       qty={item.qty}
                                       compact={true}
                                   />
                               ))}
                           </div>
                       </div>
                   ))}
               </div>
           )}
        </div>
        
        <div className="p-4 bg-[#121212] border-t border-[#27272A] text-center shrink-0">
            <p className="text-xs text-gray-500">
                Studio AI uses exact industry standard dimensions (e.g., 1080x1920) for optimal ad performance.
            </p>
        </div>
      </div>
    </div>
  );
};

export default BundleSelector;
