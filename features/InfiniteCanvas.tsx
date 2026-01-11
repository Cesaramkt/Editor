
import React, { useRef, useState, useEffect } from 'react';
import { Upload, Edit, Download, Trash2, ZoomIn, ZoomOut, Maximize, X, Copy, Scaling } from 'lucide-react';
import { CanvasImage, CanvasZone } from '../types';

interface InfiniteCanvasProps {
  images: CanvasImage[];
  setImages: React.Dispatch<React.SetStateAction<CanvasImage[]>>;
  zones: CanvasZone[];
  setZones: React.Dispatch<React.SetStateAction<CanvasZone[]>>;
  onEdit: (id: string) => void;
  onResize: (id: string) => void;
  onUpload: (file: File, x: number, y: number) => void;
}

const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({ images, setImages, zones, setZones, onEdit, onResize, onUpload }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Selection State
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  // Center view on mount
  useEffect(() => {
    if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setOffset({ x: width / 2, y: height / 2 });
    }
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomSensitivity), 5);
    setScale(newScale);
  };

  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
        x: (clientX - rect.left - offset.x) / scale,
        y: (clientY - rect.top - offset.y) / scale
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Right click (2) or Middle click (1) -> Pan
    if (e.button === 2 || e.button === 1) {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Left click (0) -> Start Selection if on background
    if (e.button === 0) {
        // Deselect image if clicking on background
        setSelectedImageId(null);

        const coords = getCanvasCoords(e.clientX, e.clientY);
        setIsSelecting(true);
        setSelectionStart(coords);
        setSelectionBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDraggingImage) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      
      setImages(prev => prev.map(img => 
        img.id === isDraggingImage 
          ? { ...img, x: img.x + dx, y: img.y + dy } 
          : img
      ));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isSelecting && selectionBox) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        const w = coords.x - selectionStart.x;
        const h = coords.y - selectionStart.y;
        
        setSelectionBox({
            x: w < 0 ? coords.x : selectionStart.x,
            y: h < 0 ? coords.y : selectionStart.y,
            w: Math.abs(w),
            h: Math.abs(h)
        });
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && selectionBox) {
        // Create Zone if box is big enough (>50px)
        if (selectionBox.w > 50 && selectionBox.h > 50) {
            const newZone: CanvasZone = {
                id: Date.now().toString(),
                x: selectionBox.x,
                y: selectionBox.y,
                width: selectionBox.w,
                height: selectionBox.h,
                label: 'Nova Área'
            };
            setZones(prev => [...prev, newZone]);
        }
    }

    setIsPanning(false);
    setIsDraggingImage(null);
    setIsSelecting(false);
    setSelectionBox(null);
  };

  const handleImageMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button === 0) { // Left click
        e.stopPropagation();
        setIsDraggingImage(id);
        setDragStart({ x: e.clientX, y: e.clientY });
        setSelectedImageId(id); // Select image on click
    }
  };

  const handleDelete = (id: string) => {
     setImages(prev => prev.filter(img => img.id !== id));
     if (selectedImageId === id) setSelectedImageId(null);
  };

  const handleDuplicate = (id: string) => {
      const imgToCopy = images.find(img => img.id === id);
      if (imgToCopy) {
          const newImg: CanvasImage = {
              ...imgToCopy,
              id: Date.now().toString(),
              x: imgToCopy.x + 50,
              y: imgToCopy.y + 50
          };
          setImages(prev => [...prev, newImg]);
      }
  };
  
  const handleDeleteZone = (id: string) => {
      setZones(prev => prev.filter(z => z.id !== id));
  };

  const handleUpdateZoneLabel = (id: string, label: string) => {
      setZones(prev => prev.map(z => z.id === id ? { ...z, label } : z));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate drop position in canvas coordinates
    const dropX = (e.clientX - rect.left - offset.x) / scale;
    const dropY = (e.clientY - rect.top - offset.y) / scale;

    const files = Array.from(e.dataTransfer.files);
    files.forEach((file: File) => {
        if (file.type.startsWith('image/')) {
            onUpload(file, dropX, dropY);
        }
    });
  };

  const handleGlobalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        onUpload(file, 0, 0); // Add to center
    }
  };

  return (
    <div 
        ref={containerRef}
        className="w-full h-full bg-[#020202] relative overflow-hidden cursor-default select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={e => e.preventDefault()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
    >
      {/* Background Dots */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
            backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
            backgroundSize: `${30 * scale}px ${30 * scale}px`,
            backgroundPosition: `${offset.x}px ${offset.y}px`
        }}
      />

      {/* Canvas Content Container */}
      <div 
        className="absolute w-0 h-0"
        style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0'
        }}
      >
        {/* Render Zones (Behind Images) */}
        {zones.map(zone => (
            <div
                key={zone.id}
                className="absolute border border-gray-700 rounded-3xl bg-gray-900/40 backdrop-blur-sm group transition-colors hover:border-brand-500/50"
                style={{
                    left: zone.x,
                    top: zone.y,
                    width: zone.width,
                    height: zone.height,
                }}
                onMouseDown={(e) => e.stopPropagation()} 
            >
                <div className="absolute -top-10 left-0 bg-transparent">
                    <input 
                        type="text"
                        value={zone.label}
                        onChange={(e) => handleUpdateZoneLabel(zone.id, e.target.value)}
                        className="bg-transparent text-gray-500 font-bold text-lg focus:text-white outline-none w-64 transition-colors"
                    />
                </div>
                <button 
                    onClick={() => handleDeleteZone(zone.id)}
                    className="absolute -top-3 -right-3 bg-gray-800 border border-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-200 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                >
                    <X size={14} />
                </button>
            </div>
        ))}

        {/* Render Images */}
        {images.map(img => {
            const isSelected = selectedImageId === img.id;
            const isHovered = hoveredImage === img.id;
            const showControls = isSelected || isHovered;

            return (
            <div
                key={img.id}
                className="absolute group"
                style={{
                    left: img.x,
                    top: img.y,
                    width: img.width,
                    height: img.height,
                    transform: `translate(-50%, -50%)`, // Center anchor
                }}
                onMouseEnter={() => setHoveredImage(img.id)}
                onMouseLeave={() => setHoveredImage(null)}
                onMouseDown={(e) => handleImageMouseDown(e, img.id)}
            >
                {/* Image */}
                <img 
                    src={img.src} 
                    alt="canvas-item" 
                    className="w-full h-full object-contain pointer-events-none shadow-card rounded-lg transition-transform"
                />

                {/* Hover/Selection Overlay Menu */}
                <div className={`
                    absolute -top-16 left-1/2 -translate-x-1/2 flex gap-1 bg-gray-900/90 backdrop-blur-md border border-gray-700 p-1.5 rounded-2xl shadow-xl transition-all duration-200 z-50
                    ${showControls ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}
                `}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(img.id); }}
                        className="p-2 hover:bg-brand-600 rounded-xl text-white transition-colors"
                        title="Edit with AI"
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onResize(img.id); }}
                        className="p-2 hover:bg-brand-600 rounded-xl text-white transition-colors"
                        title="Resize / Bundles"
                    >
                        <Scaling size={16} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(img.id); }}
                        className="p-2 hover:bg-brand-600 rounded-xl text-white transition-colors"
                        title="Duplicate"
                    >
                        <Copy size={16} />
                    </button>
                    <a 
                        href={img.src} 
                        download={`studio-ai-${img.id}.png`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-gray-700 rounded-xl text-gray-300 hover:text-white transition-colors"
                        title="Download"
                    >
                        <Download size={16} />
                    </a>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                        className="p-2 hover:bg-red-900/50 rounded-xl text-red-400 hover:text-red-200 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Selection Border */}
                <div className={`absolute -inset-1 border-2 border-brand-500/50 rounded-xl pointer-events-none transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`} />
            </div>
            );
        })}

        {/* Selection Box Overlay */}
        {isSelecting && selectionBox && (
            <div 
                className="absolute border border-brand-500 bg-brand-500/10 pointer-events-none z-50 rounded-xl backdrop-blur-[1px]"
                style={{
                    left: selectionBox.x,
                    top: selectionBox.y,
                    width: selectionBox.w,
                    height: selectionBox.h,
                }}
            />
        )}
      </div>

      {/* Floating UI: Controls */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-10">
         <button onClick={() => setScale(s => Math.min(s + 0.1, 5))} className="bg-gray-900/80 backdrop-blur hover:bg-gray-800 text-white p-3 rounded-2xl shadow-card border border-gray-800 transition-transform active:scale-95">
             <ZoomIn size={20} />
         </button>
         <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="bg-gray-900/80 backdrop-blur hover:bg-gray-800 text-white p-3 rounded-2xl shadow-card border border-gray-800 transition-transform active:scale-95">
             <ZoomOut size={20} />
         </button>
         <button onClick={() => { setOffset({x: containerRef.current!.clientWidth/2, y: containerRef.current!.clientHeight/2}); setScale(1); }} className="bg-gray-900/80 backdrop-blur hover:bg-gray-800 text-white p-3 rounded-2xl shadow-card border border-gray-800 transition-transform active:scale-95">
             <Maximize size={20} />
         </button>
      </div>

      {/* Floating UI: Upload (Centered Bottom) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
        <label className="flex items-center gap-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:brightness-110 text-white px-8 py-4 rounded-full shadow-cta cursor-pointer transition-all hover:scale-105 active:scale-95 font-semibold group">
            <Upload size={20} className="group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-base tracking-wide">Add Image</span>
            <input type="file" accept="image/*" onChange={handleGlobalUpload} className="hidden" />
        </label>
      </div>

      {/* Info Toast */}
      <div className="absolute top-24 left-8 text-xs font-medium text-gray-500 bg-gray-900/50 border border-gray-800 px-4 py-2 rounded-full backdrop-blur pointer-events-none select-none z-0">
          Right-click to pan • Scroll to zoom
      </div>
    </div>
  );
};

export default InfiniteCanvas;
