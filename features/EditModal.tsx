
import React, { useState, useRef, useEffect } from 'react';
import { X, Eraser, PenLine, Sparkles, Loader2, ImagePlus, Check, MoveHorizontal, Copy, Save, ZoomIn, ZoomOut, Maximize, Undo2, ArrowUpCircle, Upload, Layers } from 'lucide-react';
import { editImage, upscaleImage } from '../services/geminiService';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (newImageSrc: string, createNew: boolean) => void;
}

const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, imageSrc, onSave }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing with Gemini...');
  
  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  
  // View State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Comparison State
  const [isComparing, setIsComparing] = useState(false);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [editedImageSrc, setEditedImageSrc] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image when modal opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setBeforeImage(null);
        setEditedImageSrc(null);
        setIsComparing(false);
        setPrompt('');
        setReferenceImage(null);
        setPan({ x: 0, y: 0 });

        // Calculate fit-to-screen zoom
        if (containerRef.current) {
            const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
            const availableW = containerW - 64;
            const availableH = containerH - 64;
            const scaleW = availableW / img.width;
            const scaleH = availableH / img.height;
            const initialScale = Math.min(scaleW, scaleH, 1);
            setZoom(initialScale);
        } else {
            setZoom(1);
        }
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Paste Event Listener
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
        if (e.clipboardData && e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    if (blob) handleCompositeImage(blob);
                }
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, image]); // Dependency on image to access current state in handleCompositeImage closure if needed

  // Initialize canvases
  useEffect(() => {
    if (image && !isComparing && canvasRef.current) {
      if (!maskCanvasRef.current) {
        maskCanvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      canvas.width = image.width;
      canvas.height = image.height;
      maskCanvas.width = image.width;
      maskCanvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
      }
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    }
  }, [image, isComparing]);

  const handleCompositeImage = (file: File) => {
    if (!image) return; // Should allow setting base image? For now, assume base exists.
    
    // Check if image is valid
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const newImg = new Image();
      newImg.onload = () => {
        // Create composition
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw Base
        ctx.drawImage(image, 0, 0);

        // Calculate Scale & Position for New Image (Fit within 80% of canvas)
        let drawW = newImg.width;
        let drawH = newImg.height;
        const maxW = image.width * 0.8;
        const maxH = image.height * 0.8;
        const scale = Math.min(maxW / drawW, maxH / drawH, 1);
        
        drawW *= scale;
        drawH *= scale;
        const x = (image.width - drawW) / 2;
        const y = (image.height - drawH) / 2;

        // Draw New Image Centered
        ctx.drawImage(newImg, x, y, drawW, drawH);

        // Update State
        const composedDataUrl = canvas.toDataURL('image/png');
        const finalImg = new Image();
        finalImg.onload = () => {
            // Save current state as "Before" effectively allowing a poor-man's undo if we were to switch mode
            // But main logic: Update Image
            setImage(finalImg);
            // Flash success or something?
        };
        finalImg.src = composedDataUrl;
      };
      newImg.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    setIsDragging(false);
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

  // --- Zoom & Pan Logic ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = 0.1;
    const newZoom = Math.min(Math.max(0.1, zoom + (e.deltaY < 0 ? scaleFactor : -scaleFactor)), 5);
    setZoom(newZoom);
  };

  const startPan = (clientX: number, clientY: number) => {
    setIsPanning(true);
    setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
  };

  const updatePan = (clientX: number, clientY: number) => {
    if (isPanning) {
      setPan({ x: clientX - dragStart.x, y: clientY - dragStart.y });
    }
  };

  const endPan = () => {
    setIsPanning(false);
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  // --- Drawing Logic ---
  const startDrawing = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
        startPan(e.clientX, e.clientY);
        return;
    }
    if (!image || isComparing || isPanning) return;
    setIsDrawing(true);
    const { x, y } = getMousePos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Explicit Red for Gemini to detect
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
    if (isPanning) {
        updatePan(e.clientX, e.clientY);
        return;
    }
    if (!isDrawing || !image || isComparing) return;
    const { x, y } = getMousePos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.lineTo(x, y); ctx.stroke(); }
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (maskCtx) { maskCtx.lineTo(x, y); maskCtx.stroke(); }
  };

  const stopDrawing = () => {
    if (isPanning) { endPan(); return; }
    setIsDrawing(false);
    canvasRef.current?.getContext('2d')?.closePath();
    maskCanvasRef.current?.getContext('2d')?.closePath();
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
    setLoadingText("Processando com Inteligência Artificial...");
    
    // Captura a imagem original para o comparador antes de enviar
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    tempCanvas.getContext('2d')?.drawImage(image, 0, 0);
    const cleanBeforeUrl = tempCanvas.toDataURL('image/png');

    try {
      const imageWithMaskDataUrl = canvasRef.current.toDataURL('image/png');
      
      // Prompt de Engenharia Reversa para remover a marcação vermelha e substituir pelo conteúdo
      let engineeredPrompt = `TASK: IMAGE EDITING AND INPAINTING.
      
IMPORTANT INSTRUCTION: The provided image contains semi-transparent RED brush strokes. 
These RED STROKES are an EDITING MASK and NOT part of the intended image.

YOUR GOAL:
1. Identify the regions covered by the RED brush strokes.
2. COMPLETELY REMOVE the red markings.
3. REGENERATE and REPLACE the content under those red markings with: "${prompt}".
4. Ensure the new content blends perfectly with the rest of the image.
5. DO NOT leave any red artifacts, outlines, or tint in the final result.
6. Keep all parts of the image NOT covered by red strokes EXACTLY as they are.

The output must be a clean, photorealistic image without any trace of the red UI markings.`;

      if (referenceImage) {
        engineeredPrompt += `\n\nSTYLE REFERENCE: Use the SECOND provided image as a visual reference for the style or objects to be generated in the masked area.`;
      }

      const resultBase64 = await editImage(imageWithMaskDataUrl, engineeredPrompt, referenceImage);
      
      // Limpar o canvas local IMEDIATAMENTE após receber o resultado para evitar sobreposição visual
      clearMask();

      const newImage = new Image();
      newImage.onload = () => {
        setBeforeImage(cleanBeforeUrl);
        setImage(newImage);
        setEditedImageSrc(resultBase64);
        setIsComparing(true);
        setSliderPosition(50);
        setReferenceImage(null);
        setZoom(1);
        setPan({x:0, y:0});
        
        // Ajustar zoom para caber na tela
        if (containerRef.current) {
             const { width: cW, height: cH } = containerRef.current.getBoundingClientRect();
             const sW = (cW - 64) / newImage.width;
             const sH = (cH - 64) / newImage.height;
             setZoom(Math.min(sW, sH, 1));
        }
      };
      newImage.src = resultBase64;
      setPrompt('');
    } catch (error) {
      console.error("Editing failed:", error);
      alert("Falha ao editar a imagem. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpscale = async () => {
    if (!image) return;
    setIsLoading(true);
    setLoadingText("Aumentando Resolução (2K)...");
    
    const sourceImage = isComparing && editedImageSrc ? editedImageSrc : image.src;

    try {
        const resultBase64 = await upscaleImage(sourceImage);
        const newImage = new Image();
        newImage.onload = () => {
            setImage(newImage);
            setEditedImageSrc(resultBase64);
            if (containerRef.current) {
                const { width: cW, height: cH } = containerRef.current.getBoundingClientRect();
                const sW = (cW - 64) / newImage.width;
                const sH = (cH - 64) / newImage.height;
                setZoom(Math.min(sW, sH, 1));
                setPan({x:0, y:0});
            }
        };
        newImage.src = resultBase64;
    } catch (error) {
        console.error("Upscale failed:", error);
        alert("Falha ao aumentar a resolução.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (beforeImage) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setBeforeImage(null);
        setEditedImageSrc(null);
        setIsComparing(false);
        setPan({ x: 0, y: 0 });
        if (containerRef.current) {
             const { width: cW, height: cH } = containerRef.current.getBoundingClientRect();
             const sW = (cW - 64) / img.width;
             const sH = (cH - 64) / img.height;
             setZoom(Math.min(sW, sH, 1));
        }
      };
      img.src = beforeImage;
    }
  };

  const handleSliderChange = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, pos)));
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
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleCompositeImage(file);
    } else {
        setIsDragging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#000]/80 backdrop-blur-md flex items-center justify-center p-6">
      <div 
        className="bg-[#0A0A0A] w-full max-w-6xl h-[90vh] rounded-3xl flex flex-col shadow-2xl border border-[#27272A] overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-[60] bg-brand-500/20 backdrop-blur-sm border-4 border-brand-500 border-dashed m-4 rounded-3xl flex items-center justify-center pointer-events-none">
            <div className="bg-[#0A0A0A] p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce border border-[#27272A]">
              <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mb-4">
                 <Layers className="w-8 h-8 text-brand-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Adicionar Imagem</h2>
              <p className="text-gray-400">Solte para compor na tela</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="h-16 border-b border-[#27272A] flex items-center justify-between px-6 bg-[#0A0A0A] shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Sparkles className="text-brand-500 w-5 h-5" />
            Labs Editor Professional
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[#1F2937] rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative group/canvas">
          
          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 bg-[#0A0A0A]/90 backdrop-blur border border-[#27272A] p-2 rounded-2xl shadow-lg">
             <button onClick={() => setZoom(z => Math.min(z + 0.1, 5))} className="p-2 hover:bg-[#1F2937] rounded-xl text-white transition-colors" title="Zoom In"><ZoomIn size={18} /></button>
             <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.1))} className="p-2 hover:bg-[#1F2937] rounded-xl text-white transition-colors" title="Zoom Out"><ZoomOut size={18} /></button>
             <button onClick={() => { if (image && containerRef.current) { const { width, height } = containerRef.current.getBoundingClientRect(); const s = Math.min((width-64)/image.width, (height-64)/image.height, 1); setZoom(s); setPan({x:0, y:0}); }}} className="p-2 hover:bg-[#1F2937] rounded-xl text-white transition-colors" title="Ajustar à Tela"><Maximize size={18} /></button>
          </div>

          <div className="absolute top-4 left-4 z-40 text-xs font-medium text-gray-400 bg-[#000]/60 px-3 py-1.5 rounded-full select-none backdrop-blur-sm border border-[#27272A]">
             Botão Direito para Pan • Cole ou Arraste imagens para adicionar
          </div>

          {/* Canvas Area */}
          <div 
             ref={containerRef}
             className="flex-1 bg-[#020202] relative overflow-hidden flex items-center justify-center"
             onWheel={handleWheel}
             onContextMenu={(e) => e.preventDefault()}
          >
             {/* Background Grid */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{
                    backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            />

             {image && (
               <div 
                 className="relative shadow-card transition-transform duration-75 ease-out"
                 style={{ 
                   width: image.width,
                   height: image.height,
                   transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                   transformOrigin: 'center',
                   cursor: isPanning ? 'grab' : (isComparing ? 'default' : 'crosshair')
                 }}
                 onContextMenu={(e) => e.preventDefault()}
                 onMouseDown={(e) => {
                     if (e.button === 1 || e.button === 2 || e.shiftKey) { startPan(e.clientX, e.clientY); } 
                     else { startDrawing(e); }
                 }}
                 onMouseMove={draw}
                 onMouseUp={stopDrawing}
                 onMouseLeave={stopDrawing}
               >
                 {isComparing && beforeImage ? (
                   // Comparison View
                   <div 
                     className="absolute inset-0 w-full h-full select-none overflow-hidden"
                     ref={sliderRef}
                     onMouseDown={(e) => e.stopPropagation()}
                     onMouseMove={(e) => { e.stopPropagation(); if(e.buttons === 1) handleSliderChange(e); }}
                     onClick={(e) => { e.stopPropagation(); handleSliderChange(e); }}
                     style={{ cursor: 'ew-resize' }}
                   >
                     <img src={beforeImage} alt="Antes" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                     <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-md z-10 border border-white/10">Original</div>
                     
                     <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none" style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}>
                        <img src={image.src} alt="Depois" className="absolute inset-0 w-full h-full object-contain" />
                     </div>
                     <div className="absolute top-4 right-4 bg-brand-600/90 text-white text-xs px-2 py-1 rounded backdrop-blur-md z-10 border border-white/10">Editado</div>
                     
                     <div className="absolute top-0 bottom-0 w-0.5 bg-brand-500 shadow-[0_0_15px_rgba(14,165,233,0.5)] z-20 pointer-events-none" style={{ left: `${sliderPosition}%` }}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-brand-500 rounded-full shadow-lg flex items-center justify-center text-white">
                            <MoveHorizontal size={14} />
                        </div>
                     </div>
                   </div>
                 ) : (
                   <canvas ref={canvasRef} className="w-full h-full block" />
                 )}
               </div>
             )}

             {isLoading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-center p-6">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                    <p className="text-white font-medium text-lg">{loadingText}</p>
                    <p className="text-gray-400 text-sm mt-2">Nossa IA está reconstruindo a área selecionada...</p>
                </div>
             )}
          </div>
        </div>

        {/* Toolbar Footer */}
        <div className="border-t border-[#27272A] bg-[#0A0A0A] p-6 shrink-0 flex flex-col gap-4">
          
          <div className="flex items-center justify-between gap-4">
             {/* Left: Tools */}
             <div className="flex items-center gap-4">
                {!isComparing ? (
                  <>
                    <div className="flex items-center gap-2 bg-[#121212] rounded-xl p-1 border border-[#27272A]">
                      <button onClick={() => setBrushSize(Math.max(5, brushSize - 5))} className="p-2 hover:bg-[#27272A] rounded-lg text-gray-400 transition-colors">-</button>
                      <div className="flex items-center gap-2 px-2">
                        <PenLine size={16} className="text-brand-500" />
                        <span className="text-xs text-gray-300 w-6 text-center">{brushSize}</span>
                      </div>
                      <button onClick={() => setBrushSize(Math.min(100, brushSize + 5))} className="p-2 hover:bg-[#27272A] rounded-lg text-gray-400 transition-colors">+</button>
                    </div>
                    <button onClick={clearMask} className="flex items-center gap-2 text-gray-400 hover:text-white px-3 py-2 rounded-xl hover:bg-[#121212] transition-colors">
                       <Eraser size={16} /> <span className="text-sm">Limpar</span>
                    </button>
                    <button 
                       onClick={handleUpscale} 
                       disabled={isLoading}
                       className="flex items-center gap-2 text-gray-400 hover:text-white px-3 py-2 rounded-xl hover:bg-[#121212] transition-colors"
                       title="Aumentar Resolução (2K)"
                    >
                       <ArrowUpCircle size={16} /> <span className="text-sm">Upscale</span>
                    </button>
                  </>
                ) : (
                  <button onClick={() => setIsComparing(false)} className="flex items-center gap-2 text-brand-500 hover:text-brand-400 px-3 py-2 font-medium">
                    <Check size={16} /> Continuar Editando
                  </button>
                )}
             </div>

             {/* Right: Save Options */}
             {isComparing && (
               <div className="flex items-center gap-3">
                 <button 
                   onClick={handleUndo}
                   className="flex items-center gap-2 bg-[#121212] hover:bg-red-900/20 text-gray-400 hover:text-red-400 px-4 py-2.5 rounded-full font-medium transition-colors border border-[#27272A]"
                 >
                   <Undo2 size={16} /> Desfazer
                 </button>
                 <div className="w-px h-6 bg-[#27272A] mx-2"></div>
                 <button 
                   onClick={handleUpscale}
                   disabled={isLoading}
                   className="flex items-center gap-2 bg-[#121212] hover:bg-[#1F2937] text-white px-5 py-2.5 rounded-full font-medium transition-colors border border-[#27272A]"
                 >
                   <ArrowUpCircle size={16} /> Upscale Final
                 </button>
                 <button 
                   onClick={() => editedImageSrc && onSave(editedImageSrc, true)}
                   className="flex items-center gap-2 bg-[#121212] hover:bg-[#1F2937] text-white px-5 py-2.5 rounded-full font-medium transition-colors border border-[#27272A]"
                 >
                   <Copy size={16} /> Salvar como Nova
                 </button>
                 <button 
                   onClick={() => editedImageSrc && onSave(editedImageSrc, false)}
                   className="flex items-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:brightness-110 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-cta"
                 >
                   <Save size={16} /> Aplicar na Tela
                 </button>
               </div>
             )}
          </div>

          {/* Prompt Row */}
          {!isComparing && (
            <div className="flex gap-4">
               {referenceImage ? (
                    <div className="relative group/preview shrink-0">
                        <img src={referenceImage} alt="Ref" className="h-12 w-12 object-cover rounded-xl border border-brand-500/50 shadow-lg" />
                        <button 
                            onClick={() => setReferenceImage(null)} 
                            className="absolute -top-2 -right-2 bg-[#0A0A0A] text-white rounded-full p-1 border border-gray-700 opacity-0 group-hover/preview:opacity-100 transition-opacity hover:bg-red-900/80 hover:border-red-500"
                        >
                            <X size={12} />
                        </button>
                    </div>
               ) : (
                   <div className="relative">
                        <button 
                        onClick={() => refFileInputRef.current?.click()}
                        className="h-full px-4 bg-[#121212] hover:bg-[#1F2937] border border-[#27272A] rounded-xl text-gray-400 hover:text-brand-500 transition-colors"
                        title="Adicionar imagem de referência"
                        >
                        <ImagePlus size={20} />
                        </button>
                   </div>
               )}
               <input ref={refFileInputRef} type="file" accept="image/*" onChange={handleReferenceUpload} className="hidden" />

               <input
                 type="text"
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                 placeholder="Descreva a alteração (ex: 'Mudar cor do terno para azul' ou 'Adicionar óculos de sol')..."
                 className="flex-1 bg-[#121212] border border-[#27272A] rounded-xl px-5 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
               />
               
               <button
                 onClick={handleGenerate}
                 disabled={!prompt || isLoading}
                 className="bg-gradient-to-r from-brand-500 to-brand-600 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-cta transition-all flex items-center gap-2 min-w-[140px] justify-center"
               >
                 {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                 {isLoading ? 'Gerando...' : 'Gerar'}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditModal;
