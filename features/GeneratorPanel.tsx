import React, { useState } from 'react';
import { Sparkles, Loader2, X, Ratio, Square, RectangleHorizontal, RectangleVertical, Smartphone, Wand2 } from 'lucide-react';
import { AspectRatio, ImageResolution } from '../types';
import { generateImage } from '../services/geminiService';

interface GeneratorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated: (base64: string, width: number, height: number) => void;
}

const GeneratorPanel: React.FC<GeneratorPanelProps> = ({ isOpen, onClose, onImageGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.ONE_K);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);

    try {
      const base64 = await generateImage(prompt, aspectRatio, resolution);
      
      // Calculate approximate dimensions based on ratio for the canvas placement
      let w = 512;
      let h = 512;
      
      if (aspectRatio === AspectRatio.LANDSCAPE) { w = 800; h = 450; }
      if (aspectRatio === AspectRatio.PORTRAIT) { w = 450; h = 600; }
      if (aspectRatio === AspectRatio.STORIES) { w = 400; h = 711; }
      if (aspectRatio === AspectRatio.WIDE) { w = 800; h = 340; }

      // Pass back to App
      onImageGenerated(base64, w, h);
      
    } catch (e) {
      console.error(e);
      alert("Generation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const enhancePrompt = () => {
      if (!prompt) return;
      setPrompt(`Professional photography, highly detailed, cinematic lighting, 8k resolution, photorealistic: ${prompt}`);
  };

  if (!isOpen) return null;

  return (
    <div className="w-[400px] border-l border-[#27272A] bg-[#0A0A0A] flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300 z-30 shrink-0">
      
      {/* Header */}
      <div className="p-6 border-b border-[#27272A] flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wand2 className="text-brand-500" size={20} />
          AI Generator
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to create (e.g., 'A futuristic city with neon lights')..."
            className="w-full h-32 bg-[#121212] border border-[#27272A] rounded-xl p-4 text-sm text-white resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
          />
          <button 
            onClick={enhancePrompt}
            disabled={!prompt}
            className="text-xs text-brand-500 hover:text-brand-400 flex items-center gap-1 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={12} /> Enhance Prompt
          </button>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Aspect Ratio</label>
          <div className="grid grid-cols-4 gap-2">
             <button 
                onClick={() => setAspectRatio(AspectRatio.SQUARE)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${aspectRatio === AspectRatio.SQUARE ? 'bg-brand-900/30 border-brand-500 text-brand-400' : 'bg-[#121212] border-[#27272A] text-gray-500 hover:border-gray-600'}`}
             >
                <Square size={20} className="mb-1" />
                <span className="text-[10px]">1:1</span>
             </button>
             <button 
                onClick={() => setAspectRatio(AspectRatio.LANDSCAPE)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${aspectRatio === AspectRatio.LANDSCAPE ? 'bg-brand-900/30 border-brand-500 text-brand-400' : 'bg-[#121212] border-[#27272A] text-gray-500 hover:border-gray-600'}`}
             >
                <RectangleHorizontal size={20} className="mb-1" />
                <span className="text-[10px]">16:9</span>
             </button>
             <button 
                onClick={() => setAspectRatio(AspectRatio.VERTICAL)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${aspectRatio === AspectRatio.VERTICAL ? 'bg-brand-900/30 border-brand-500 text-brand-400' : 'bg-[#121212] border-[#27272A] text-gray-500 hover:border-gray-600'}`}
             >
                <RectangleVertical size={20} className="mb-1" />
                <span className="text-[10px]">4:5</span>
             </button>
             <button 
                onClick={() => setAspectRatio(AspectRatio.STORIES)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${aspectRatio === AspectRatio.STORIES ? 'bg-brand-900/30 border-brand-500 text-brand-400' : 'bg-[#121212] border-[#27272A] text-gray-500 hover:border-gray-600'}`}
             >
                <Smartphone size={20} className="mb-1" />
                <span className="text-[10px]">9:16</span>
             </button>
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Resolution</label>
          <div className="flex gap-2 p-1 bg-[#121212] rounded-lg border border-[#27272A]">
             {[ImageResolution.ONE_K, ImageResolution.TWO_K].map(res => (
                 <button
                    key={res}
                    onClick={() => setResolution(res)}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${resolution === res ? 'bg-[#27272A] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                 >
                    {res}
                 </button>
             ))}
          </div>
        </div>

      </div>

      {/* Footer / Action */}
      <div className="p-6 border-t border-[#27272A] bg-[#0A0A0A]">
        <button
          onClick={handleGenerate}
          disabled={!prompt || isLoading}
          className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold shadow-cta transition-all flex items-center justify-center gap-2 group"
        >
          {isLoading ? (
             <Loader2 className="animate-spin" />
          ) : (
             <Sparkles className="group-hover:scale-110 transition-transform" />
          )}
          {isLoading ? 'Generating Image...' : 'Generate to Canvas'}
        </button>
        <p className="text-[10px] text-center text-gray-600 mt-3">
            Powered by Google Gemini 3 Pro Vision
        </p>
      </div>
    </div>
  );
};

export default GeneratorPanel;
