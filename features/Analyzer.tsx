import React, { useState } from 'react';
import { Upload, Search, Loader2 } from 'lucide-react';
import { analyzeImage } from '../services/geminiService';
import { HistoryItem, AppMode } from '../types';

interface AnalyzerProps {
    addToHistory: (item: HistoryItem) => void;
}

const Analyzer: React.FC<AnalyzerProps> = ({ addToHistory }) => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setIsLoading(true);
    try {
      const analysis = await analyzeImage(image, prompt || "Describe this image in detail.");
      setResult(analysis);
      addToHistory({
          id: Date.now().toString(),
          thumbnail: image,
          fullImage: image,
          timestamp: Date.now(),
          prompt: prompt || "Analyze Image",
          mode: AppMode.ANALYZER
      });
    } catch (error) {
      setResult("Error analyzing image.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-8">
        
        {/* Left: Input */}
        <div className="flex-1 flex flex-col gap-6">
            <div className={`
                flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center relative overflow-hidden transition-colors
                ${image ? 'border-gray-700 bg-black' : 'border-gray-700 hover:border-brand-500 bg-gray-900'}
            `}>
                {!image ? (
                    <label className="cursor-pointer flex flex-col items-center p-12 text-center w-full h-full justify-center">
                        <Upload className="w-12 h-12 text-gray-500 mb-4" />
                        <span className="text-gray-300 font-medium">Upload Image to Analyze</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                    </label>
                ) : (
                    <>
                        <img src={image} alt="To analyze" className="max-w-full max-h-full object-contain" />
                        <button 
                            onClick={() => setImage(null)} 
                            className="absolute top-4 right-4 bg-black/60 hover:bg-red-900/80 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md"
                        >
                            Remove
                        </button>
                    </>
                )}
            </div>

            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={prompt} 
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Ask something about the image (optional)..."
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-brand-500 outline-none"
                />
                <button 
                    onClick={handleAnalyze}
                    disabled={!image || isLoading}
                    className="bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 text-white px-6 rounded-lg font-semibold flex items-center gap-2"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Search size={18} />}
                    Analyze
                </button>
            </div>
        </div>

        {/* Right: Result */}
        <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-800 p-6 overflow-y-auto shadow-inner">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">Analysis Result</h3>
            {isLoading ? (
                <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-800 rounded w-full"></div>
                    <div className="h-4 bg-gray-800 rounded w-5/6"></div>
                </div>
            ) : result ? (
                <div className="prose prose-invert prose-sm max-w-none text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {result}
                </div>
            ) : (
                <p className="text-gray-600 italic text-sm">Upload an image and click analyze to see insights here.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default Analyzer;