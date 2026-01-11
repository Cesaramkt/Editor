
import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Plus, Video, Type, MousePointer2, 
  Loader2, Wand2, ChevronDown, ChevronRight, 
  RefreshCw, Clapperboard, Trash2, Film, Move, Scaling,
  Upload, Layers, Clock, Image as ImageIcon, GripVertical,
  ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight, Palette
} from 'lucide-react';
import { generateVideo } from '../services/geminiService';

// --- Types ---

type OverlayType = 'HEADER' | 'DESCRIPTION' | 'CTA';

interface OverlayElement {
    id: string;
    type: OverlayType;
    text: string;
    // Layout
    width: number; // Percentage
    height?: number; // Pixels (for CTA mainly)
    top: number; // Percentage
    left: number; // Percentage
    align: 'left' | 'center' | 'right';
    // Timing
    startTime: number;
    duration: number;
    // Styles
    fontFamily?: string;
    fontSize: number;
    color: string;
    bgColor?: string; // CTA
    textColor?: string; // CTA
    lineHeight?: number;
}

// New Interface for Image Layers
interface OverlayImage {
    id: string;
    url: string;
    name: string;
    width: number; // Percentage
    top: number; // Percentage
    left: number; // Percentage
    aspectRatio: number;
    startTime: number;
    duration: number;
}

const INITIAL_TEXT_OVERLAYS: OverlayElement[] = [
    {
        id: 'header-1',
        type: 'HEADER',
        text: "MERRY CHRISTMAS",
        fontFamily: 'Inter', fontSize: 32, color: "#ffffff", lineHeight: 1.2,
        width: 90, top: 10, left: 5, align: 'center',
        startTime: 0, duration: 5
    },
    {
        id: 'desc-1',
        type: 'DESCRIPTION',
        text: "Create magical moments with our holiday collection.",
        fontSize: 16, color: "#e5e7eb",
        width: 80, top: 80, left: 10, align: 'center',
        startTime: 1, duration: 5
    },
    {
        id: 'cta-1',
        type: 'CTA',
        text: "SHOP NOW",
        bgColor: "#0EA5E9", textColor: "#ffffff", fontSize: 14,
        width: 40, height: 40, top: 90, left: 30, align: 'center',
        startTime: 2, duration: 5,
        color: "#ffffff"
    }
];

interface VideoClip {
    id: string;
    url: string;
    prompt: string;
    timestamp: number;
    type: 'GENERATED' | 'UPLOAD';
    duration?: number; // Simulated duration
}

type TimelineMode = 'NONE' | 'MOVE' | 'RESIZE_L' | 'RESIZE_R';

const VideoEditor = () => {
    // --- State ---
    const [clips, setClips] = useState<VideoClip[]>([]);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    
    // Elements State
    const [textOverlays, setTextOverlays] = useState<OverlayElement[]>(INITIAL_TEXT_OVERLAYS);
    const [overlayImages, setOverlayImages] = useState<OverlayImage[]>([]);
    
    // Playback State
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(10); // Default duration if no video
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Timeline Zoom State
    const [timelineZoom, setTimelineZoom] = useState(1);

    // Generation State
    const [genPrompt, setGenPrompt] = useState('');
    const [genRatio, setGenRatio] = useState<'9:16' | '16:9'>('9:16');
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // Editor UI State
    // activeSection will now hold the ID of the selected element (Text, Image, or 'video')
    const [activeSection, setActiveSection] = useState<string | null>(null);
    
    // Interaction State (Visual Canvas)
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [resizingId, setResizingId] = useState<string | null>(null);

    // Interaction State (Timeline)
    const [timelineAction, setTimelineAction] = useState<{
        mode: TimelineMode,
        targetId: string,
        startX: number,
        initialStartTime: number,
        initialDuration: number
    } | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineContainerRef = useRef<HTMLDivElement>(null); 
    
    // Ref for resize calculations
    const resizeStartRef = useRef<{ 
        x: number, y: number, 
        initialFontSize?: number, 
        initialWidth: number, 
        initialHeight?: number 
    } | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // --- Time Formatting Helper ---
    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Add New Elements Logic ---
    const handleAddTextElement = (type: OverlayType) => {
        const id = Date.now().toString();
        const newEl: OverlayElement = {
            id,
            type,
            text: type === 'HEADER' ? "NEW HEADER" : type === 'DESCRIPTION' ? "New Description Text" : "CLICK ME",
            startTime: 0,
            duration: 3,
            width: type === 'CTA' ? 40 : 80,
            height: type === 'CTA' ? 45 : undefined,
            top: 50,
            left: 10,
            align: 'center',
            fontSize: type === 'HEADER' ? 32 : type === 'DESCRIPTION' ? 16 : 14,
            color: '#ffffff',
            fontFamily: 'Inter',
            bgColor: type === 'CTA' ? '#0EA5E9' : undefined,
            textColor: type === 'CTA' ? '#ffffff' : undefined,
            lineHeight: 1.2
        };

        setTextOverlays(prev => [...prev, newEl]);
        setActiveSection(id); // Select the new element
    };

    // --- Video Logic ---
    const handleGenerateVideo = async () => {
        if (!genPrompt) return;
        setIsGenerating(true);
        setStatusMessage('Initializing Veo (AI Video Model)...');
        try {
            const videoUrl = await generateVideo(genPrompt, genRatio);
            
            const newClip: VideoClip = {
                id: Date.now().toString(),
                url: videoUrl,
                prompt: genPrompt,
                timestamp: Date.now(),
                type: 'GENERATED',
                duration: 5 
            };

            setClips(prev => [...prev, newClip]);
            setSelectedClipId(newClip.id); 
        } catch (error) {
            console.error(error);
            alert("Video generation failed. Please try again.");
        } finally {
            setIsGenerating(false);
            setStatusMessage('');
        }
    };

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const newClip: VideoClip = {
                id: Date.now().toString(),
                url: url,
                prompt: file.name,
                timestamp: Date.now(),
                type: 'UPLOAD',
                duration: 10 // This will be updated when metadata loads
            };
            setClips(prev => [...prev, newClip]);
            setSelectedClipId(newClip.id);
        }
    };

    const handleImageLayerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const id = Date.now().toString();
                const newOverlay: OverlayImage = {
                    id,
                    url: url,
                    name: file.name,
                    width: 30, 
                    top: 50, 
                    left: 50, 
                    aspectRatio: img.width / img.height,
                    startTime: 0,
                    duration: 5
                };
                setOverlayImages(prev => [...prev, newOverlay]);
                setActiveSection(id);
            };
            img.src = url;
        }
    };

    const handleDeleteClip = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setClips(prev => prev.filter(c => c.id !== id));
        if (selectedClipId === id) setSelectedClipId(null);
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const d = videoRef.current.duration;
            setDuration(d);
        }
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
        if (videoRef.current) videoRef.current.currentTime = 0; 
    };
    
    // Zoom Handler
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setTimelineZoom(z => Math.max(1, Math.min(10, z * delta)));
        }
    };

    const handleTimelineSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (timelineAction) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const labelWidth = 128; 
        const x = e.clientX - rect.left - labelWidth;
        const width = rect.width - labelWidth;
        
        if (width > 0) {
            const percentage = Math.max(0, Math.min(1, x / width));
            if (videoRef.current && duration > 0) {
                const newTime = percentage * duration;
                videoRef.current.currentTime = newTime;
                setCurrentTime(newTime);
            }
        }
    };

    // --- Overlay Editor Logic ---
    const updateTextOverlay = (id: string, field: keyof OverlayElement, value: any) => {
        setTextOverlays(prev => prev.map(el => el.id === id ? { ...el, [field]: value } : el));
    };

    const deleteTextOverlay = (id: string) => {
        setTextOverlays(prev => prev.filter(el => el.id !== id));
        if (activeSection === id) setActiveSection(null);
    };

    const deleteImageOverlay = (id: string) => {
        setOverlayImages(prev => prev.filter(img => img.id !== id));
        if (activeSection === id) setActiveSection(null);
    };

    // --- Timeline Interaction Logic ---
    const handleTimelineMouseDown = (e: React.MouseEvent, id: string, mode: TimelineMode) => {
        e.stopPropagation();
        e.preventDefault();
        
        let currentStart = 0;
        let currentDuration = 0;

        const textEl = textOverlays.find(t => t.id === id);
        const imgEl = overlayImages.find(i => i.id === id);

        if (textEl) {
            currentStart = textEl.startTime;
            currentDuration = textEl.duration;
        } else if (imgEl) {
            currentStart = imgEl.startTime;
            currentDuration = imgEl.duration;
        }

        setActiveSection(id);
        setTimelineAction({
            mode,
            targetId: id,
            startX: e.clientX,
            initialStartTime: currentStart,
            initialDuration: currentDuration
        });
    };

    // --- Drag & Resize Logic (Visual Canvas) ---
    const handleCanvasMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); e.preventDefault();
        setDraggingId(id); 
        setActiveSection(id);
    };

    const handleResizeStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); e.preventDefault();
        setResizingId(id); 
        setActiveSection(id);
        
        const textEl = textOverlays.find(t => t.id === id);
        const imgEl = overlayImages.find(i => i.id === id);

        if (textEl) {
            resizeStartRef.current = { 
                x: e.clientX, y: e.clientY, 
                initialFontSize: textEl.fontSize, 
                initialWidth: textEl.width, 
                initialHeight: textEl.height 
            };
        } else if (imgEl) {
            resizeStartRef.current = { 
                x: e.clientX, y: e.clientY, 
                initialWidth: imgEl.width 
            };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        
        // --- 1. Timeline Logic ---
        if (timelineAction && timelineContainerRef.current) {
            const viewportWidth = timelineContainerRef.current.clientWidth;
            const totalTrackWidth = (viewportWidth * timelineZoom) - 128; // 128 is label width
            const deltaX = e.clientX - timelineAction.startX;
            const timeDelta = (deltaX / totalTrackWidth) * duration;

            let newStart = timelineAction.initialStartTime;
            let newDuration = timelineAction.initialDuration;

            if (timelineAction.mode === 'MOVE') {
                newStart = Math.max(0, Math.min(duration - newDuration, timelineAction.initialStartTime + timeDelta));
            } else if (timelineAction.mode === 'RESIZE_L') {
                const potentialStart = timelineAction.initialStartTime + timeDelta;
                const originalEnd = timelineAction.initialStartTime + timelineAction.initialDuration;
                newStart = Math.max(0, Math.min(originalEnd - 0.5, potentialStart)); 
                newDuration = originalEnd - newStart;
            } else if (timelineAction.mode === 'RESIZE_R') {
                const potentialDuration = timelineAction.initialDuration + timeDelta;
                newDuration = Math.max(0.5, Math.min(duration - timelineAction.initialStartTime, potentialDuration));
            }

            // Apply updates
            const isText = textOverlays.some(t => t.id === timelineAction.targetId);
            if (isText) {
                setTextOverlays(prev => prev.map(el => el.id === timelineAction.targetId ? { ...el, startTime: newStart, duration: newDuration } : el));
            } else {
                setOverlayImages(prev => prev.map(img => img.id === timelineAction.targetId ? { ...img, startTime: newStart, duration: newDuration } : img));
            }
            return;
        }

        // --- 2. Canvas Visual Logic ---
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        // Drag
        if (draggingId) {
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const leftPerc = Math.min(100, Math.max(0, (x / rect.width) * 100));
            const topPerc = Math.min(100, Math.max(0, (y / rect.height) * 100));

            const isText = textOverlays.some(t => t.id === draggingId);
            if (isText) {
                setTextOverlays(prev => prev.map(el => el.id === draggingId ? { ...el, top: topPerc, left: leftPerc } : el));
            } else {
                setOverlayImages(prev => prev.map(img => img.id === draggingId ? { ...img, top: topPerc, left: leftPerc } : img));
            }
            return;
        }

        // Resize
        if (resizingId && resizeStartRef.current) {
            const deltaX = e.clientX - resizeStartRef.current.x;
            const deltaY = e.clientY - resizeStartRef.current.y;
            const widthDeltaPerc = (deltaX / rect.width) * 100;

            const isText = textOverlays.some(t => t.id === resizingId);

            if (isText) {
                setTextOverlays(prev => prev.map(el => {
                    if (el.id !== resizingId) return el;
                    const startFontSize = resizeStartRef.current?.initialFontSize || 16;
                    const startWidth = resizeStartRef.current?.initialWidth || 50;
                    
                    const newFontSize = Math.max(8, Math.min(200, startFontSize + (deltaY * 0.5)));
                    const newWidth = Math.max(10, Math.min(100, startWidth + widthDeltaPerc));
                    
                    let extra = {};
                    if (el.type === 'CTA' && resizeStartRef.current?.initialHeight) {
                         const startHeight = resizeStartRef.current.initialHeight;
                         extra = { height: Math.max(20, Math.min(200, startHeight + (deltaY * 0.5))) };
                    }

                    return { ...el, fontSize: newFontSize, width: newWidth, ...extra };
                }));
            } else {
                setOverlayImages(prev => prev.map(img => {
                    if (img.id !== resizingId) return img;
                    const startWidth = resizeStartRef.current?.initialWidth || 30;
                    return { ...img, width: Math.max(5, Math.min(100, startWidth + widthDeltaPerc)) };
                }));
            }
        }
    };

    const handleMouseUp = () => {
        setDraggingId(null);
        setResizingId(null);
        setTimelineAction(null);
        resizeStartRef.current = null;
    };

    const activeClip = clips.find(c => c.id === selectedClipId);
    
    // Determine active Element for Sidebar
    const activeElement = textOverlays.find(t => t.id === activeSection) || overlayImages.find(i => i.id === activeSection);

    // Helpers for Rendering
    const isVisible = (startTime: number, dur: number) => {
        return currentTime >= startTime && currentTime <= (startTime + dur);
    };

    return (
        <div 
            className="flex flex-col h-[calc(100vh-80px)] bg-[#020202] overflow-hidden font-sans"
            onMouseUp={handleMouseUp} 
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove} 
        >
            
            <div className="flex flex-1 overflow-hidden">
                {/* --- LEFT SIDEBAR (Controls) --- */}
                <div className="w-[450px] border-r border-[#27272A] flex flex-col bg-[#0A0A0A] overflow-y-auto shrink-0 z-20">
                    <div className="p-6 border-b border-[#27272A]">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clapperboard className="text-brand-500" />
                            Video Lab
                        </h2>
                    </div>

                    <div className="p-4 space-y-4">
                        
                        {/* 1. Video Source Section (Always Visible) */}
                         <div className="bg-[#18181B] p-4 rounded-xl border border-[#27272A]">
                            <label className="text-xs text-brand-400 font-bold mb-3 block flex items-center gap-1">
                                <Film size={12} /> Video Source
                            </label>
                            {/* Upload & Gen Controls */}
                            <div className="flex gap-2 mb-2">
                                <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs py-2 rounded flex items-center justify-center gap-2 border border-[#3F3F46]">
                                    <Upload size={12} /> Upload
                                </button>
                                <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                            </div>
                            <div className="flex gap-2">
                                <input value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} placeholder="AI Prompt..." className="flex-1 bg-[#0A0A0A] border border-[#27272A] rounded p-2 text-xs text-white" />
                                <button onClick={handleGenerateVideo} disabled={isGenerating} className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded">
                                    {isGenerating ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14}/>}
                                </button>
                            </div>
                        </div>

                        {/* 2. Context Aware Properties Panel */}
                        {activeElement ? (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-200">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                                        {'type' in activeElement ? <Type size={14} className="text-brand-500"/> : <ImageIcon size={14} className="text-orange-500"/>}
                                        Properties
                                    </h3>
                                    <button 
                                        onClick={() => 'type' in activeElement ? deleteTextOverlay(activeElement.id) : deleteImageOverlay(activeElement.id)}
                                        className="text-red-500 hover:text-red-400 text-xs flex items-center gap-1"
                                    >
                                        <Trash2 size={12} /> Delete
                                    </button>
                                </div>

                                <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 space-y-4">
                                    {/* Text Content */}
                                    {'text' in activeElement && (
                                        <div>
                                            <label className="text-[10px] text-gray-500 mb-1 block">Content</label>
                                            <textarea 
                                                value={activeElement.text} 
                                                onChange={(e) => updateTextOverlay(activeElement.id, 'text', e.target.value)}
                                                className="w-full bg-[#0A0A0A] border border-[#27272A] rounded p-2 text-sm text-white resize-none"
                                                rows={2}
                                            />
                                        </div>
                                    )}

                                    {/* Style Controls */}
                                    {'type' in activeElement && (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-gray-500 mb-1 block">Font Size</label>
                                                    <input type="range" min="8" max="120" value={activeElement.fontSize} onChange={(e) => updateTextOverlay(activeElement.id, 'fontSize', Number(e.target.value))} className="w-full accent-brand-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-500 mb-1 block">Width</label>
                                                    <input type="range" min="10" max="100" value={activeElement.width} onChange={(e) => updateTextOverlay(activeElement.id, 'width', Number(e.target.value))} className="w-full accent-brand-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                 <div className="flex-1 bg-[#0A0A0A] border border-[#27272A] rounded p-1 flex items-center justify-center gap-2">
                                                     <Palette size={12} className="text-gray-500" />
                                                     <input type="color" value={activeElement.color} onChange={(e) => updateTextOverlay(activeElement.id, 'color', e.target.value)} className="bg-transparent w-full h-6 cursor-pointer" />
                                                 </div>
                                                 {activeElement.type === 'CTA' && (
                                                     <div className="flex-1 bg-[#0A0A0A] border border-[#27272A] rounded p-1 flex items-center justify-center gap-2">
                                                         <span className="text-[10px] text-gray-500">BG</span>
                                                         <input type="color" value={activeElement.bgColor} onChange={(e) => updateTextOverlay(activeElement.id, 'bgColor', e.target.value)} className="bg-transparent w-full h-6 cursor-pointer" />
                                                     </div>
                                                 )}
                                            </div>

                                            <div className="flex gap-1 bg-[#0A0A0A] p-1 rounded border border-[#27272A]">
                                                {['left', 'center', 'right'].map((align: any) => (
                                                    <button 
                                                        key={align}
                                                        onClick={() => updateTextOverlay(activeElement.id, 'align', align)}
                                                        className={`flex-1 p-1 rounded hover:bg-[#27272A] flex justify-center ${activeElement.align === align ? 'bg-[#27272A] text-white' : 'text-gray-500'}`}
                                                    >
                                                        {align === 'left' ? <AlignLeft size={14} /> : align === 'center' ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Timing Readout */}
                                    <div className="pt-2 border-t border-[#27272A] flex justify-between text-[10px] text-gray-500">
                                        <span>Start: {activeElement.startTime.toFixed(1)}s</span>
                                        <span>Duration: {activeElement.duration.toFixed(1)}s</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-600 border-2 border-dashed border-[#27272A] rounded-xl">
                                <MousePointer2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Select an element on the canvas or timeline to edit properties.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- CENTER PREVIEW --- */}
                <div className="flex-1 bg-[#121212] flex items-center justify-center relative overflow-hidden">
                    
                    {/* Status Overlay */}
                    {isGenerating && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                            <p className="text-white font-semibold animate-pulse">{statusMessage}</p>
                        </div>
                    )}

                    {/* Video Player Container */}
                    <div ref={containerRef} className="relative shadow-2xl transition-all duration-300 group bg-black ring-4 ring-black/50"
                        style={{ 
                            aspectRatio: genRatio === '9:16' ? '9/16' : '16/9',
                            height: genRatio === '9:16' ? '85%' : 'auto',
                            width: genRatio === '16:9' ? '85%' : 'auto',
                            borderRadius: '16px',
                            overflow: 'hidden'
                        }}
                    >
                        {activeClip ? (
                            <>
                                <video 
                                    ref={videoRef}
                                    src={activeClip.url} 
                                    className="w-full h-full object-cover" 
                                    playsInline
                                    onClick={togglePlay}
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    onEnded={handleVideoEnded}
                                />
                                {!isPlaying && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm"><Play fill="white" size={32} /></div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 bg-[#0A0A0A]">
                                <Film size={48} className="mb-4 opacity-20" />
                                <p className="text-sm">Generate or Select a Video Clip</p>
                            </div>
                        )}

                        {/* Overlays Layer */}
                        <div className="absolute inset-0 z-20 pointer-events-none">
                             
                             {/* Images */}
                             {overlayImages.map(img => isVisible(img.startTime, img.duration) && (
                                 <div
                                     key={img.id}
                                     className={`group absolute pointer-events-auto cursor-move border-2 ${activeSection === img.id ? 'border-brand-500' : 'border-transparent hover:border-brand-500/50'} transition-colors rounded`}
                                     onMouseDown={(e) => handleCanvasMouseDown(e, img.id)}
                                     style={{ 
                                         top: `${img.top}%`, 
                                         left: `${img.left}%`, 
                                         width: `${img.width}%`,
                                         aspectRatio: img.aspectRatio,
                                         transform: 'translate(-50%, -50%)' 
                                     }}
                                 >
                                     <img src={img.url} alt="overlay" className="w-full h-full object-contain" />
                                     <ResizeHandle onMouseDown={(e) => handleResizeStart(e, img.id)} />
                                 </div>
                             ))}

                             {/* Text Elements (Header, Desc, CTA) */}
                             {textOverlays.map(el => isVisible(el.startTime, el.duration) && (
                                <div
                                    key={el.id}
                                    className={`group absolute flex flex-col pointer-events-auto cursor-move border-2 ${activeSection === el.id ? 'border-brand-500' : 'border-transparent hover:border-brand-500/50'} transition-colors rounded`}
                                    onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
                                    style={{ 
                                        top: `${el.top}%`, 
                                        left: `${el.left}%`, 
                                        width: `${el.width}%`, 
                                        textAlign: el.align 
                                    }}
                                >
                                    {el.type === 'CTA' ? (
                                         <button style={{ backgroundColor: el.bgColor, color: el.textColor, fontSize: `${el.fontSize}px`, height: `${el.height}px` }} className="w-full rounded-xl font-bold shadow-lg flex items-center justify-center whitespace-nowrap">{el.text}</button>
                                    ) : (
                                        <p style={{ fontFamily: el.fontFamily, fontSize: `${el.fontSize * (containerRef.current?.offsetWidth || 1) / 400}px`, color: el.color, lineHeight: el.lineHeight }} className={`${el.type === 'HEADER' ? 'font-bold' : 'font-light'} drop-shadow-lg break-words`}>{el.text}</p>
                                    )}
                                    <ResizeHandle onMouseDown={(e) => handleResizeStart(e, el.id)} />
                                </div>
                             ))}

                        </div>
                    </div>
                </div>
            </div>

            {/* --- BOTTOM TIMELINE (MULTI-TRACK) --- */}
            <div className="h-64 bg-[#0A0A0A] border-t border-[#27272A] flex flex-col shrink-0">
                {/* Timeline Header */}
                <div className="h-8 bg-[#121212] border-b border-[#27272A] flex items-center px-4 justify-between shrink-0 z-20">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-brand-500 font-mono text-xs">
                             <Clock size={12} />
                             <span>{formatTime(currentTime)}</span>
                        </div>
                        <div className="h-3 w-px bg-[#27272A]"></div>
                        <span className="text-xs text-gray-500 font-mono">{formatTime(duration || 0)}</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                         <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[#27272A] rounded px-2 py-0.5">
                             <button onClick={() => setTimelineZoom(z => Math.max(1, z - 0.5))} className="text-gray-400 hover:text-white"><ZoomOut size={12} /></button>
                             <span className="text-[10px] text-gray-400 w-8 text-center">{(timelineZoom * 100).toFixed(0)}%</span>
                             <button onClick={() => setTimelineZoom(z => Math.min(10, z + 0.5))} className="text-gray-400 hover:text-white"><ZoomIn size={12} /></button>
                         </div>
                         <div className="h-3 w-px bg-[#27272A]"></div>
                         <span className="text-[10px] text-gray-500">Ctrl+Scroll to Zoom</span>
                    </div>
                </div>
                
                {/* Tracks Container */}
                <div 
                    ref={timelineContainerRef}
                    className="flex-1 overflow-y-auto overflow-x-auto p-2 flex flex-col gap-1 relative group/timeline select-none" 
                    onWheel={handleWheel}
                >
                    <div className="relative min-h-full" style={{ width: `${timelineZoom * 100}%`, minWidth: '100%' }}>
                        
                        {/* GLOBAL PLAYHEAD */}
                        <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none transition-all duration-75"
                            style={{ left: `calc(128px + ${(currentTime / (duration || 1)) * 100 * ((100 * timelineZoom - 12.8) / (100 * timelineZoom))}%)` }} 
                        >
                            <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
                        </div>

                        {/* Click to Seek */}
                        <div className="absolute inset-0 z-0" onClick={handleTimelineSeek} />

                        {/* Track 1: Header */}
                        <TimelineTrack 
                            label="Header" 
                            icon={<Type size={12} />} 
                            color="#A855F7"
                            onAdd={() => handleAddTextElement('HEADER')}
                        >
                            {textOverlays.filter(t => t.type === 'HEADER').map(el => (
                                <TimelineClip 
                                    key={el.id}
                                    label={el.text}
                                    startTime={el.startTime}
                                    duration={el.duration}
                                    totalDuration={duration}
                                    color="purple"
                                    onMouseDown={(e, mode) => handleTimelineMouseDown(e, el.id, mode)}
                                    isActive={activeSection === el.id}
                                />
                            ))}
                        </TimelineTrack>

                        {/* Track 2: Description */}
                        <TimelineTrack 
                            label="Description" 
                            icon={<Type size={12} />} 
                            color="#3B82F6"
                            onAdd={() => handleAddTextElement('DESCRIPTION')}
                        >
                            {textOverlays.filter(t => t.type === 'DESCRIPTION').map(el => (
                                <TimelineClip 
                                    key={el.id}
                                    label={el.text}
                                    startTime={el.startTime}
                                    duration={el.duration}
                                    totalDuration={duration}
                                    color="blue"
                                    onMouseDown={(e, mode) => handleTimelineMouseDown(e, el.id, mode)}
                                    isActive={activeSection === el.id}
                                />
                            ))}
                        </TimelineTrack>

                        {/* Track 3: CTA */}
                        <TimelineTrack 
                            label="CTA Button" 
                            icon={<MousePointer2 size={12} />} 
                            color="#22C55E"
                            onAdd={() => handleAddTextElement('CTA')}
                        >
                             {textOverlays.filter(t => t.type === 'CTA').map(el => (
                                <TimelineClip 
                                    key={el.id}
                                    label={el.text}
                                    startTime={el.startTime}
                                    duration={el.duration}
                                    totalDuration={duration}
                                    color="green"
                                    onMouseDown={(e, mode) => handleTimelineMouseDown(e, el.id, mode)}
                                    isActive={activeSection === el.id}
                                />
                            ))}
                        </TimelineTrack>

                        {/* Track 4: IMAGES */}
                        <TimelineTrack 
                            label="Images & Logos" 
                            icon={<ImageIcon size={12} />} 
                            color="#F97316"
                            onAdd={() => imageInputRef.current?.click()}
                        >
                            <div className="relative w-full h-full">
                                {overlayImages.map(img => (
                                    <TimelineClip 
                                        key={img.id}
                                        label={img.name}
                                        startTime={img.startTime}
                                        duration={img.duration}
                                        totalDuration={duration}
                                        color="orange"
                                        onMouseDown={(e, mode) => handleTimelineMouseDown(e, img.id, mode)}
                                        isActive={activeSection === img.id}
                                        isImage={true}
                                    />
                                ))}
                                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageLayerUpload} className="hidden" />
                            </div>
                        </TimelineTrack>

                        {/* Track 5: VIDEO (Main) */}
                        <TimelineTrack 
                            label="Video Track" 
                            icon={<Film size={12} />} 
                            color="#EAB308"
                            onAdd={() => fileInputRef.current?.click()}
                        >
                            <div className="flex gap-1 h-full items-center w-full overflow-x-auto no-scrollbar">
                                {clips.length === 0 && <span className="text-[10px] text-gray-600 pl-2">Drag videos here or generate...</span>}
                                {clips.map((clip, index) => (
                                    <div 
                                        key={clip.id}
                                        onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id); setIsPlaying(false); }}
                                        className={`
                                            relative h-full min-w-[100px] rounded overflow-hidden cursor-pointer border transition-all group shrink-0
                                            ${selectedClipId === clip.id ? 'border-brand-500 ring-1 ring-brand-500' : 'border-[#27272A] hover:border-gray-500'}
                                        `}
                                        style={{ width: '120px' }}
                                    >
                                        <video src={clip.url} className="w-full h-full object-cover pointer-events-none opacity-50 group-hover:opacity-80" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[9px] font-bold text-white drop-shadow-md truncate max-w-[90%]">{clip.prompt}</span>
                                        </div>
                                        <div className="absolute top-0 left-0 bg-black/50 text-[8px] text-gray-300 px-1">{index+1}</div>
                                        <button 
                                            onClick={(e) => handleDeleteClip(clip.id, e)}
                                            className="absolute top-0 right-0 p-1 text-white hover:text-red-500 opacity-0 group-hover:opacity-100 bg-black/50"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </TimelineTrack>
                    </div>
                </div>
            </div>

        </div>
    );
};

// --- Sub-Components ---

const TimelineClip = ({ label, startTime, duration, totalDuration, color, onMouseDown, isActive, isImage }: any) => {
    const leftPerc = (startTime / (totalDuration || 1)) * 100;
    const widthPerc = (duration / (totalDuration || 1)) * 100;

    const colors: any = {
        purple: 'bg-purple-900/50 border-purple-500/50 text-purple-200',
        blue: 'bg-blue-900/50 border-blue-500/50 text-blue-200',
        green: 'bg-green-900/50 border-green-500/50 text-green-200',
        orange: 'bg-orange-900/50 border-orange-500/50 text-orange-200'
    };

    return (
        <div 
            className={`
                absolute h-6 rounded text-[10px] flex items-center justify-center px-2 truncate cursor-grab border select-none group z-10
                ${colors[color]}
                ${isActive ? 'ring-2 ring-white z-20' : ''}
            `}
            style={{ 
                left: `${leftPerc}%`, 
                width: `${widthPerc}%`,
                minWidth: '20px' 
            }}
            onMouseDown={(e) => onMouseDown(e, 'MOVE')}
        >
            <div 
                className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onMouseDown={(e) => onMouseDown(e, 'RESIZE_L')}
            >
                <div className="w-0.5 h-3 bg-white/50 rounded-full"></div>
            </div>

            <span className="truncate">{label}</span>

            <div 
                className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onMouseDown={(e) => onMouseDown(e, 'RESIZE_R')}
            >
                <div className="w-0.5 h-3 bg-white/50 rounded-full"></div>
            </div>
        </div>
    );
};

const TimelineTrack = ({ label, icon, color, children, onAdd }: any) => (
    <div className="flex h-10 mb-1 shrink-0 w-full">
        <div className="w-32 bg-[#121212] border-r border-[#27272A] flex items-center justify-between px-2 gap-1 shrink-0 sticky left-0 z-20 group/track shadow-[4px_0_10px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-2 overflow-hidden">
                <span className={`text-[${color}]`}>{icon}</span>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide truncate">{label}</span>
            </div>
            {onAdd && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onAdd(); }}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-[#27272A] rounded transition-colors"
                >
                    <Plus size={10} />
                </button>
            )}
        </div>
        <div className="flex-1 bg-[#0E0E0E] relative flex items-center px-2 border-b border-[#27272A]/30 z-0">
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 100%' }}></div>
            {children}
        </div>
    </div>
);

const ResizeHandle = ({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) => (
    <div onMouseDown={onMouseDown} className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-brand-500 rounded-sm cursor-nwse-resize shadow-lg z-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Scaling size={10} className="text-brand-500" />
    </div>
);

export default VideoEditor;
