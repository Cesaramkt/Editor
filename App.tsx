
import React, { useState, useEffect } from 'react';
import { Key, Loader2, Sparkles, Layout, MonitorSmartphone, Clapperboard } from 'lucide-react';
import InfiniteCanvas from './features/InfiniteCanvas';
import EditModal from './features/EditModal';
import BundleSelector from './features/BundleSelector';
import LandingPageEditor from './features/LandingPageEditor';
import VideoEditor from './features/VideoEditor'; // New Import
import { CanvasImage, CanvasZone, AspectRatio, BundleItem } from './types';
import { checkApiKey, promptForApiKey, analyzeImage, outpaintImage } from './services/geminiService';
import { createOutpaintingCanvas } from './utils/canvasUtils';

type EditorMode = 'CANVAS' | 'LANDING' | 'VIDEO';

const App = () => {
  const [hasKey, setHasKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [currentMode, setCurrentMode] = useState<EditorMode>('CANVAS');
  
  // Canvas State
  const [images, setImages] = useState<CanvasImage[]>([]);
  const [zones, setZones] = useState<CanvasZone[]>([]);
  
  // Editing Flow State
  const [pendingEditId, setPendingEditId] = useState<string | null>(null); 
  const [isBundleSelectorOpen, setIsBundleSelectorOpen] = useState(false); 
  
  const [isProcessingOutpaint, setIsProcessingOutpaint] = useState(false); 
  const [processingStatus, setProcessingStatus] = useState("");
  
  const [activeEditingImage, setActiveEditingImage] = useState<{id: string, src: string} | null>(null);

  useEffect(() => {
    verifyKey();
  }, []);

  const verifyKey = async () => {
    setIsCheckingKey(true);
    try {
      const valid = await checkApiKey();
      setHasKey(valid);
    } catch (e) {
      console.error("Key check failed", e);
    } finally {
      setIsCheckingKey(false);
    }
  };

  const handleKeySelection = async () => {
    try {
      await promptForApiKey();
      setHasKey(true);
    } catch (error) {
      console.error("Failed to select key", error);
      alert("Failed to select API Key. Please try again.");
    }
  };

  const handleUpload = (file: File, x: number, y: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
            const newImage: CanvasImage = {
                id: Date.now().toString(),
                src,
                x,
                y,
                width: img.width > 500 ? 500 : img.width, // Limit initial size
                height: (img.width > 500 ? 500 : img.width) * (img.height / img.width),
                rotation: 0
            };
            setImages(prev => [...prev, newImage]);
        };
        img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // --- Editing Flow Handlers ---

  const handleResizeRequest = (id: string) => {
      setPendingEditId(id);
      setIsBundleSelectorOpen(true);
  };

  const handleEditDirectly = (id: string) => {
      const img = images.find(i => i.id === id);
      if (img) {
          setActiveEditingImage({ id: img.id, src: img.src });
      }
  };

  const handleBundleSelection = async (items: BundleItem[]) => {
      setIsBundleSelectorOpen(false);
      const originalImage = images.find(img => img.id === pendingEditId);
      
      if (!originalImage || !pendingEditId) return;

      setIsProcessingOutpaint(true);
      setProcessingStatus("Analysing context for assets...");

      try {
          const analysis = await analyzeImage(originalImage.src);
          let offsetX = originalImage.x + originalImage.width + 50;
          let offsetY = originalImage.y;

          for (const item of items) {
              for (let i = 0; i < item.qty; i++) {
                  setProcessingStatus(`Generating ${item.label} (${i + 1}/${item.qty})...`);
                  
                  let targetW = item.width;
                  let targetH = item.height;

                  if (!targetW || !targetH) {
                      const tempImg = new Image();
                      tempImg.src = originalImage.src;
                      await new Promise(r => { tempImg.onload = r; });
                      const ratioVal = typeof item.ratio === 'number' ? item.ratio : 1; 
                       targetW = 1024;
                       targetH = 1024 / ratioVal;
                  }

                  const compositeImage = await createOutpaintingCanvas(
                      originalImage.src, 
                      item.ratio, 
                      item.width, 
                      item.height
                  );
                  
                  const outpaintedImage = await outpaintImage(
                      compositeImage, 
                      analysis,
                      targetW,
                      targetH
                  );

                  const newId = Date.now().toString() + Math.random();
                  const tempImg = new Image();
                  await new Promise<void>((resolve) => {
                      tempImg.onload = () => {
                          const newImage: CanvasImage = {
                              id: newId,
                              src: outpaintedImage,
                              x: offsetX,
                              y: offsetY,
                              width: 400, // Normalized display width
                              height: 400 * (tempImg.height / tempImg.width),
                              rotation: 0
                          };
                          setImages(prev => [...prev, newImage]);
                          offsetY += newImage.height + 20;
                          if (offsetY > originalImage.y + 1000) {
                              offsetY = originalImage.y;
                              offsetX += 420;
                          }
                          resolve();
                      };
                      tempImg.src = outpaintedImage;
                  });
              }
          }
          
      } catch (error) {
          console.error("Bundle generation failed:", error);
          alert("Failed to generate assets. Check console.");
      } finally {
          setIsProcessingOutpaint(false);
          setPendingEditId(null);
          setProcessingStatus("");
      }
  };

  const handleSaveEditedImage = (newSrc: string, createNew: boolean) => {
    if (activeEditingImage) {
        const tempImg = new Image();
        tempImg.onload = () => {
             const newAspectRatio = tempImg.height / tempImg.width;
             if (createNew) {
                const original = images.find(img => img.id === activeEditingImage.id);
                if (original) {
                    const newImage: CanvasImage = {
                        ...original,
                        id: Date.now().toString(),
                        src: newSrc,
                        x: original.x + 100,
                        y: original.y,
                        width: original.width,
                        height: original.width * newAspectRatio 
                    };
                    setImages(prev => [...prev, newImage]);
                }
            } else {
                setImages(prev => prev.map(img => {
                    if (img.id === activeEditingImage.id) {
                        return { 
                            ...img, 
                            src: newSrc,
                            height: img.width * newAspectRatio 
                        };
                    }
                    return img;
                }));
            }
            setActiveEditingImage(null);
        };
        tempImg.src = newSrc;
    } else {
        setActiveEditingImage(null);
    }
  };

  // Callback for Labs Editor to save to main canvas
  const handleSaveFromLabs = (newSrc: string) => {
     const tempImg = new Image();
     tempImg.onload = () => {
         const newImage: CanvasImage = {
             id: Date.now().toString(),
             src: newSrc,
             x: 100, // Default start position
             y: 100,
             width: 400,
             height: 400 * (tempImg.height / tempImg.width),
             rotation: 0
         };
         setImages(prev => [...prev, newImage]);
         alert("Arte salva no Canvas Studio!");
     };
     tempImg.src = newSrc;
  };

  // Loading / Key Check UI
  if (isCheckingKey) {
    return <div className="h-screen w-screen bg-gray-950 flex items-center justify-center text-white font-sans">
      <Loader2 className="animate-spin text-brand-500 w-8 h-8" />
    </div>;
  }

  if (!hasKey) {
    return (
      <div className="h-screen w-screen bg-[#020202] flex flex-col items-center justify-center text-white p-6 relative overflow-hidden font-sans">
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
              backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
              backgroundSize: '40px 40px'
          }}
        />
        <div className="relative z-10 max-w-md w-full bg-[#0A0A0A] border border-[#27272A] rounded-3xl p-8 shadow-card text-center overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-brand-600"></div>
          <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-500 shadow-glow">
            <Key size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-tight">API Key Required</h1>
          <p className="text-gray-400 mb-8 leading-relaxed font-light">
            Please select a valid paid API key to access <span className="text-white font-medium">Studio AI</span> features.
          </p>
          <button 
            onClick={handleKeySelection} 
            className="w-full bg-gradient-to-br from-brand-500 to-brand-600 hover:brightness-110 text-white font-semibold py-4 rounded-full shadow-cta transition-all mb-5 transform hover:-translate-y-0.5"
          >
            Select API Key
          </button>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-sm text-brand-500 hover:text-brand-400 hover:underline">
            Billing Information
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#020202] text-white overflow-hidden font-sans relative flex flex-col">
      
      {/* Background Grid */}
      <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '50px 50px'
          }}
      />

      {/* Header */}
      <header className="h-20 shrink-0 flex items-center justify-between px-8 z-40 bg-[#020202]/70 backdrop-blur-xl border-b border-[#27272A]">
        <div className="flex items-center gap-3 font-bold text-xl text-white tracking-tight">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-brand-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
            <img 
              src="https://drive.google.com/thumbnail?id=1mmwTJ8wMY6dv3oIZhV95ACiSa9IbLGbx&sz=w200" 
              alt="Logo" 
              className="relative h-10 w-auto rounded shadow-lg"
            />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Agência Nova Inteligência
          </span>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-[#121212] border border-[#27272A] rounded-full p-1">
             <button 
                onClick={() => setCurrentMode('CANVAS')}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${currentMode === 'CANVAS' ? 'bg-[#27272A] text-white shadow' : 'text-gray-400 hover:text-white'}`}
             >
                <Layout size={16} /> Canvas
             </button>
             <button 
                onClick={() => setCurrentMode('LANDING')}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${currentMode === 'LANDING' ? 'bg-[#27272A] text-white shadow' : 'text-gray-400 hover:text-white'}`}
             >
                <MonitorSmartphone size={16} /> Image Lab
             </button>
             <button 
                onClick={() => setCurrentMode('VIDEO')}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${currentMode === 'VIDEO' ? 'bg-[#27272A] text-white shadow' : 'text-gray-400 hover:text-white'}`}
             >
                <Clapperboard size={16} /> Video Lab
             </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-0 flex-1 w-full overflow-hidden">
        {currentMode === 'CANVAS' && (
            <InfiniteCanvas 
                images={images}
                setImages={setImages}
                zones={zones}
                setZones={setZones}
                onEdit={handleEditDirectly}
                onResize={handleResizeRequest}
                onUpload={handleUpload}
            />
        )}
        {currentMode === 'LANDING' && (
            <LandingPageEditor onSaveToCanvas={handleSaveFromLabs} />
        )}
        {currentMode === 'VIDEO' && (
            <VideoEditor />
        )}
      </div>

      {/* Modals & Overlays (Only relevant for Canvas Mode mostly, but kept accessible) */}
      <BundleSelector 
        isOpen={isBundleSelectorOpen}
        onClose={() => { setIsBundleSelectorOpen(false); setPendingEditId(null); }}
        onSelectBundle={handleBundleSelection}
      />

      {isProcessingOutpaint && (
          <div className="fixed inset-0 z-[70] bg-[#020202]/90 backdrop-blur-md flex flex-col items-center justify-center text-center">
              <div className="relative mb-8">
                 <div className="w-24 h-24 border-t-4 border-brand-500 border-solid rounded-full animate-spin shadow-glow"></div>
                 <div className="absolute inset-0 flex items-center justify-center text-brand-500">
                    <Sparkles size={32} />
                 </div>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Generating Assets</h2>
              <p className="text-gray-400 animate-pulse font-light text-lg">{processingStatus}</p>
          </div>
      )}

      {activeEditingImage && (
        <EditModal 
            isOpen={!!activeEditingImage}
            onClose={() => setActiveEditingImage(null)}
            imageSrc={activeEditingImage.src}
            onSave={handleSaveEditedImage}
        />
      )}
    </div>
  );
};

export default App;
