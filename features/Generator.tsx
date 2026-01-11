import React, { useState } from 'react';
import { Sparkles, Loader2, Download, Image as ImageIcon } from 'lucide-react';
import { AspectRatio, ImageResolution, HistoryItem, AppMode } from '../types';
import { generateImage } from '../services/geminiService';

interface GeneratorProps {
  addToHistory: (item: HistoryItem) => void;
}

const Generator: React.FC<GeneratorProps> = ({ addToHistory }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.ONE_K);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setGeneratedImage(null);

    try {
      const base64 = await generateImage(prompt, aspectRatio, resolution);
      setGeneratedImage(base64);
      
      addToHistory({
        id: Date.now().toString(),
        thumbnail: base64,
        fullImage: base64,
        timestamp: Date.now(),
        prompt: prompt,
        mode: AppMode.GENERATOR
      });
    } catch (e) {
      console.error(e);
      alert("Generation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Controls */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 p-6 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h3 className="text-brand-400 font-semibold mb-4 flex items-center gap-2">
            <ImageIcon size={18} />
            Settings
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(AspectRatio).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2 py-2 text-xs rounded border transition-colors ${
                      aspectRatio === ratio 
                        ? 'bg-brand-900/50 border-brand-500 text-white' 
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Resolution</label>
              <div className="flex gap-2">
                {Object.values(ImageResolution).map((res) => (
                  <button
                    key={res}
                    onClick={() => setResolution(res)}
                    className={`flex-1 px-3 py-2 text-sm rounded border transition-colors ${
                      resolution === res
                        ? 'bg-brand-900/50 border-brand-500 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="w-full h-32 bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white resize-none focus:ring-1 focus:ring-brand-500 focus:outline-none mb-4"
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-500 text-white py-3 rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            Generate
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 bg-gray-950 flex items-center justify-center p-8 overflow-hidden relative">
        {!generatedImage && !isLoading && (
          <div className="text-gray-600 text-center">
             <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
             <p>Enter a prompt and settings to start</p>
          </div>
        )}
        
        {isLoading && (
             <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 animate-pulse">Dreaming up your image...</p>
             </div>
        )}

        {generatedImage && !isLoading && (
          <div className="relative group max-w-full max-h-full">
            <img 
              src={generatedImage} 
              alt="Generated" 
              className="max-w-full max-h-[85vh] rounded shadow-2xl border border-gray-800" 
            />
            <a 
              href={generatedImage} 
              download={`gemini-generated-${Date.now()}.png`}
              className="absolute bottom-4 right-4 bg-black/70 hover:bg-black text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
            >
              <Download size={24} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default Generator;