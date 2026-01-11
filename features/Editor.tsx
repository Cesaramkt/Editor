import React, { useState, useRef, useEffect } from 'react';
import { Upload, Eraser, PenLine, Sparkles, Loader2, X, ImagePlus, Check, MoveHorizontal } from 'lucide-react';
import { HistoryItem } from '../types';
import { editImage } from '../services/geminiService';

interface EditorProps {
  addToHistory: (item: HistoryItem) => void;
  initialImage?: string | null;
}

const Editor: React.FC<EditorProps> = ({ addToHistory, initialImage }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Comparison State
  const [isComparing, setIsComparing] = useState(false);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Load initial image from history
  useEffect(() => {
    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setReferenceImage(null);
        setIsComparing(false);
        setBeforeImage(null);
      };
      img.src = initialImage;
    }
  }, [initialImage]);

  // Initialize mask canvas and event listeners
  useEffect(() => {
    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
    }

    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) loadImageFile(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Initialize main canvas whenever image changes
  useEffect(() => {
    if (image && !isComparing) {
      initCanvases(image);
    }
  }, [image, isComparing]);

  const loadImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const resultStr = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setReferenceImage(null);
        setIsComparing(false);
        setBeforeImage(null);

        // Add original to history immediately
        addToHistory({
          id: Date.now().toString(),
          thumbnail: resultStr,
          fullImage: resultStr,
          timestamp: Date.now(),
          prompt: "Imagem Original",
        });
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReferenceImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImageFile(file);
    }
  };

  const initCanvases = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (canvas && maskCanvas) {
      // Set intrinsic dimensions
      canvas.width = img.width;
      canvas.height = img.height;
      
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    }
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    if (!image || isComparing) return;
    setIsDrawing(true);
    const { x, y } = getMousePos(e);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; 
      ctx.lineWidth = brushSize;
    }
    
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (maskCtx) {
      maskCtx.beginPath();
      maskCtx.moveTo(x, y);
      maskCtx.lineCap = 'round';
      maskCtx.lineJoin = 'round';
      maskCtx.strokeStyle = 'white';
      maskCtx.lineWidth = brushSize;
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !image || isComparing) return;
    const { x, y } = getMousePos(e);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (maskCtx) {
      maskCtx.lineTo(x, y);
      maskCtx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.closePath();
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    maskCtx?.closePath();
  };

  const clearMask = () => {
    if (!image || !canvasRef.current || !maskCanvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const maskCtx = maskCanvasRef.current.getContext('2d');
    
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(image, 0, 0);
    }
    
    if (maskCtx) {
      maskCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
  };

  const handleGenerate = async () => {
    if (!image || !prompt || !canvasRef.current) return;
    setIsLoading(true);
    
    // Get Clean Before Image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx?.drawImage(image, 0, 0);
    const cleanBeforeUrl = tempCanvas.toDataURL('image/png');

    try {
      const imageWithMaskDataUrl = canvasRef.current.toDataURL('image/png');
      
      let engineeredPrompt = `The red highlighted areas in the FIRST image mark the regions to be edited. Modify ONLY these red highlighted regions to match this description: "${prompt}". 
      
      The rest of the image must remain exactly the same. The final output image should NOT contain the red highlights, it should look natural and photorealistic.`;

      if (referenceImage) {
        engineeredPrompt += ` Use the SECOND image provided as a visual reference for style, structure, or content when modifying the masked area.`;
      }

      const resultBase64 = await editImage(imageWithMaskDataUrl, engineeredPrompt, referenceImage);
      
      const newImage = new Image();
      newImage.onload = () => {
        setBeforeImage(cleanBeforeUrl);
        setImage(newImage);
        setIsComparing(true); // Enable comparison mode
        setSliderPosition(50);
        setReferenceImage(null);
      };
      newImage.src = resultBase64;

      addToHistory({
        id: Date.now().toString(),
        thumbnail: resultBase64,
        fullImage: resultBase64,
        timestamp: Date.now(),
        prompt: prompt,
      });
      
      setPrompt('');

    } catch (error) {
      console.error("Editing failed:", error);
      alert("Failed to edit image. Please check your API key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSliderChange = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, pos)));
  };

  return (
    <div 
      className="flex flex-col h-full bg-gray-950 text-white relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-brand-500/20 backdrop-blur-sm border-4 border-brand-500 border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-gray-900 p-8 rounded-xl shadow-2xl flex flex-col items-center animate-bounce">
            <Upload className="w-16 h-16 text-brand-400 mb-4" />
            <h2 className="text-2xl font-bold text-white">Solte a Imagem Aqui</h2>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900 shrink-0">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
            <Upload size={16} />
            Carregar
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
          
          {image && !isComparing && (
            <div className="flex items-center gap-2 bg-gray-800 rounded-md p-1 border border-gray-700">
              <button onClick={() => setBrushSize(Math.max(5, brushSize - 5))} className="p-1 hover:bg-gray-700 rounded text-gray-400 font-bold w-6">-</button>
              <div className="flex items-center gap-2 px-2">
                 <PenLine size={14} className="text-brand-400" />
                 <span className="text-xs text-gray-300 w-4 text-center">{brushSize}</span>
              </div>
              <button onClick={() => setBrushSize(Math.min(100, brushSize + 5))} className="p-1 hover:bg-gray-700 rounded text-gray-400 font-bold w-6">+</button>
            </div>
          )}

          {image && !isComparing && (
             <button onClick={clearMask} className="flex items-center gap-2 text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-800 transition-colors">
               <Eraser size={14} /> Limpar
             </button>
          )}

          {isComparing && (
            <button 
                onClick={() => setIsComparing(false)} 
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors animate-pulse"
            >
                <Check size={16} />
                Continuar Editando
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 hidden sm:block">
           {isComparing ? "Arraste para comparar" : "Arraste & Solte ou Cole (Ctrl+V)"}
        </div>
      </div>

      {/* Canvas / Editor Area */}
      <div className="flex-1 overflow-hidden bg-black/50 relative flex items-center justify-center p-8" ref={containerRef}>
        {!image ? (
          <div className="text-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl p-12 transition-colors hover:border-gray-700 hover:bg-gray-900/30">
            <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Solte uma imagem aqui ou cole (Ctrl+V)</p>
            <p className="text-sm mt-2">para começar a editar com IA</p>
          </div>
        ) : (
          <div 
             className="relative shadow-2xl shadow-black border border-gray-800"
             style={{ 
                 aspectRatio: `${image.width} / ${image.height}`,
                 maxWidth: '100%',
                 maxHeight: '100%'
             }}
          >
             {isComparing && beforeImage ? (
               // Comparison View
               <div 
                 className="absolute inset-0 w-full h-full cursor-ew-resize select-none overflow-hidden"
                 ref={sliderRef}
                 onMouseMove={(e) => e.buttons === 1 && handleSliderChange(e)}
                 onTouchMove={handleSliderChange}
                 onClick={handleSliderChange}
               >
                 {/* Before Image (Background) */}
                 <img src={beforeImage} alt="Before" className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" />
                 
                 {/* Label Before */}
                 <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10 pointer-events-none">
                    Antes
                 </div>

                 {/* After Image (Foreground - Clipped) */}
                 <div 
                    className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none"
                    style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                 >
                    <img src={image.src} alt="After" className="absolute inset-0 w-full h-full object-contain" />
                 </div>

                 {/* Label After */}
                 <div className="absolute top-4 right-4 bg-brand-600/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-10 pointer-events-none">
                    Depois
                 </div>

                 {/* Slider Handle */}
                 <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
                    style={{ left: `${sliderPosition}%` }}
                 >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-900">
                        <MoveHorizontal size={16} />
                    </div>
                 </div>
               </div>
             ) : (
               // Editing View
               <>
                 <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-full cursor-crosshair block"
                 />
               </>
             )}
          </div>
        )}
        
        {isLoading && (
            <div className="absolute inset-0 bg-gray-950/80 flex flex-col items-center justify-center backdrop-blur-md z-50">
                <Loader2 className="w-16 h-16 text-brand-500 animate-spin mb-4" />
                <h3 className="text-xl font-semibold text-white">Criando sua imagem...</h3>
                <p className="text-gray-400 text-sm mt-2">Isso pode levar alguns segundos.</p>
            </div>
        )}
      </div>

      {/* Prompt Area */}
      {!isComparing && (
        <div className="p-4 bg-gray-900 border-t border-gray-800 shrink-0">
            <div className="max-w-4xl mx-auto flex flex-col gap-2">
                
            {/* Reference Image Preview */}
            {referenceImage && (
                <div className="flex items-center gap-3 bg-gray-800 p-2 rounded-lg w-fit border border-gray-700 animate-in fade-in slide-in-from-bottom-2">
                    <div className="relative">
                        <img src={referenceImage} alt="Reference" className="h-12 w-12 object-cover rounded border border-gray-600" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full border border-gray-900"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-200">Imagem de Referência</span>
                        <span className="text-[10px] text-gray-400">Modelo usará estilo/estrutura</span>
                    </div>
                    <button 
                    onClick={() => setReferenceImage(null)}
                    className="ml-2 p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                    <X size={14} />
                    </button>
                </div>
            )}

            <div className="flex gap-3">
                {/* Reference Upload Button */}
                <div className="relative">
                    <button 
                        onClick={() => refFileInputRef.current?.click()}
                        disabled={!image || isLoading}
                        className="h-full px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400 hover:text-brand-400 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Anexar imagem de referência"
                    >
                        <ImagePlus size={20} />
                    </button>
                    <input 
                        ref={refFileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleReferenceUpload} 
                        className="hidden" 
                    />
                </div>

                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={!image || isLoading}
                    placeholder={!image ? "Carregue uma imagem primeiro..." : "Marque a área e descreva a alteração (ex: 'Mudar para camisa azul')"}
                    className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button
                    onClick={handleGenerate}
                    disabled={!image || !prompt || isLoading}
                    className="bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all flex items-center gap-2 min-w-[120px] justify-center"
                >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                    {isLoading ? 'Criando' : 'Gerar'}
                </button>
            </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Editor;