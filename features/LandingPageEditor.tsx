
import React, { useState, useEffect, useRef } from 'react';
import { generateImage, upscaleImage, remixImage } from '../services/geminiService';
import { 
  Smartphone, 
  Type, 
  MousePointer2, 
  Image as ImageIcon, 
  RefreshCw, 
  Wand2, 
  Upload, 
  ChevronDown, 
  ChevronRight,
  Code2,
  Loader2,
  Monitor,
  LayoutTemplate,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  Save,
  ArrowUpCircle,
  Move,
  Repeat,
  Scaling
} from 'lucide-react';
import { AspectRatio, ImageResolution } from '../types';

interface ElementLayout {
    width: number; // Percentage 0-100
    top: number; // Percentage 0-100 (Y Position)
    left: number; // Percentage 0-100 (X Position)
    align: 'left' | 'center' | 'right';
}

interface PageData {
  background: { url: string; loading: boolean; ratio: number };
  header: { text: string; fontFamily: string; fontSize: number; color: string; lineHeight: number } & ElementLayout;
  description: { text: string; fontSize: number; color: string } & ElementLayout;
  cta: { text: string; bgColor: string; textColor: string; fontSize: number; height: number } & ElementLayout;
}

const INITIAL_DATA: PageData = {
  background: { 
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop', 
      loading: false,
      ratio: 9/16 // Default Mobile
  },
  header: { 
      text: "BUILT TO CONVERT", 
      fontFamily: 'Inter', fontSize: 32, color: "#ffffff", lineHeight: 1.2,
      width: 90, top: 15, left: 5, align: 'center'
  },
  description: { 
      text: "Maximize seu pipeline de vendas com nossa solução de IA generativa de ponta a ponta.", 
      fontSize: 16, color: "#e5e7eb",
      width: 80, top: 30, left: 10, align: 'center'
  },
  cta: { 
      text: "COMEÇAR AGORA", 
      bgColor: "#0EA5E9", textColor: "#ffffff", fontSize: 14,
      width: 60, height: 50, top: 85, left: 20, align: 'center'
  }
};

const FONTS = ['Inter', 'Roboto', 'Playfair Display', 'Montserrat', 'Open Sans'];

const RATIO_OPTIONS = [
    { label: 'Square (1:1)', value: AspectRatio.SQUARE, ratio: 1, icon: <Square size={14} /> },
    { label: 'Portrait (4:5)', value: AspectRatio.VERTICAL, ratio: 4/5, icon: <RectangleVertical size={14} /> },
    { label: 'Stories (9:16)', value: AspectRatio.STORIES, ratio: 9/16, icon: <Smartphone size={14} /> },
    { label: 'Landscape (16:9)', value: AspectRatio.LANDSCAPE, ratio: 16/9, icon: <RectangleHorizontal size={14} /> },
];

interface LandingPageEditorProps {
    onSaveToCanvas?: (imageSrc: string) => void;
}

const LandingPageEditor: React.FC<LandingPageEditorProps> = ({ onSaveToCanvas }) => {
  // State: Draft (Sidebar) vs Applied (Preview)
  const [appliedData, setAppliedData] = useState<PageData>(INITIAL_DATA);
  const [draftData, setDraftData] = useState<PageData>(INITIAL_DATA);
  
  // UI State
  const [activeSection, setActiveSection] = useState<string | null>('header');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [genRatio, setGenRatio] = useState<AspectRatio>(AspectRatio.STORIES);
  const [statusMessage, setStatusMessage] = useState('');

  // Interaction State
  const [draggingEl, setDraggingEl] = useState<keyof PageData | null>(null);
  const [resizingEl, setResizingEl] = useState<keyof PageData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize Start Values
  const resizeStartRef = useRef<{ 
      x: number, y: number, 
      initialFontSize: number, 
      initialWidth: number, 
      initialHeight?: number 
  } | null>(null);

  // Handle Draft Updates
  const updateDraft = (section: keyof PageData, field: string, value: any) => {
    setDraftData(prev => ({
      ...prev,
      [section]: { ...prev[section as any], [field]: value }
    }));
  };

  // Handle Apply Changes
  const applyChanges = (section: keyof PageData) => {
    setAppliedData(prev => ({
      ...prev,
      [section]: draftData[section as any]
    }));
  };

  // Sync interactions back to draft when drag/resize ends
  const syncInteractionToDraft = (section: keyof PageData) => {
      setDraftData(prev => ({
          ...prev,
          [section]: { ...prev[section as any], ...appliedData[section] }
      }));
  };

  // AI Background Generation
  const handleAiGeneration = async () => {
    if (!genPrompt) return;
    setIsGenerating(true);
    setStatusMessage('Criando nova imagem...');
    try {
        const url = await generateImage(genPrompt, genRatio, ImageResolution.TWO_K);
        
        // Calculate numeric ratio from enum for preview
        let numRatio = 9/16;
        if (genRatio === AspectRatio.SQUARE) numRatio = 1;
        if (genRatio === AspectRatio.VERTICAL) numRatio = 4/5;
        if (genRatio === AspectRatio.LANDSCAPE) numRatio = 16/9;

        updateDraft('background', 'url', url);
        updateDraft('background', 'ratio', numRatio);
        
        setAppliedData(prev => ({
            ...prev,
            background: { ...prev.background, url: url, ratio: numRatio }
        }));
    } catch (error) {
        alert("Falha ao gerar imagem. Tente novamente.");
    } finally {
        setIsGenerating(false);
        setStatusMessage('');
    }
  };

  // AI Remix / Regenerate
  const handleAiRemix = async () => {
      if (!appliedData.background.url || !genPrompt) {
          alert("Digite um prompt para guiar a regeneração da imagem atual.");
          return;
      }
      
      setIsGenerating(true);
      setStatusMessage('Regenerando (mantendo estrutura)...');
      
      try {
          const url = await remixImage(appliedData.background.url, genPrompt);
          
          updateDraft('background', 'url', url);
          // Keep current ratio
          
          setAppliedData(prev => ({
              ...prev,
              background: { ...prev.background, url: url }
          }));
      } catch (error) {
          console.error(error);
          alert("Falha ao regenerar imagem.");
      } finally {
          setIsGenerating(false);
          setStatusMessage('');
      }
  };

  // Image Upload / Drop
  const handleImageFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const result = e.target?.result as string;
          const img = new Image();
          img.onload = () => {
              const ratio = img.width / img.height;
              
              updateDraft('background', 'url', result);
              updateDraft('background', 'ratio', ratio);
              
              setAppliedData(prev => ({
                  ...prev,
                  background: { ...prev.background, url: result, ratio: ratio }
              }));
          };
          img.src = result;
      };
      reader.readAsDataURL(file);
  };

  // Paste Event
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        if (e.clipboardData && e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    if (blob) handleImageFile(blob);
                }
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // --- DRAG LOGIC ---
  const handleMouseDown = (e: React.MouseEvent, section: keyof PageData) => {
      e.stopPropagation();
      e.preventDefault(); // Prevent text selection
      setDraggingEl(section);
      setActiveSection(section as string);
  };

  // --- RESIZE LOGIC ---
  const handleResizeStart = (e: React.MouseEvent, section: keyof PageData) => {
      e.stopPropagation();
      e.preventDefault();
      setResizingEl(section);
      setActiveSection(section as string);

      const el = appliedData[section] as any;
      resizeStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          initialFontSize: el.fontSize,
          initialWidth: el.width,
          initialHeight: el.height
      };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // 1. RESIZING LOGIC
      if (resizingEl && resizeStartRef.current) {
          const deltaX = e.clientX - resizeStartRef.current.x;
          const deltaY = e.clientY - resizeStartRef.current.y;

          // Capture ref values synchronously to avoid null access in async state update
          const startFontSize = resizeStartRef.current.initialFontSize;
          const startWidth = resizeStartRef.current.initialWidth;
          const startHeight = resizeStartRef.current.initialHeight;

          setAppliedData(prev => {
              const currentEl = prev[resizingEl] as any;
              const newData: any = { ...currentEl };

              // Adjust Font Size based on Y-axis drag (approx 1px per pixel moved)
              // Scaling factor 0.5 to make it less sensitive
              const newFontSize = Math.max(8, Math.min(200, startFontSize + (deltaY * 0.5)));
              newData.fontSize = newFontSize;

              // Adjust Width % based on X-axis drag
              // Convert pixel delta to percentage of container
              const widthDeltaPerc = (deltaX / rect.width) * 100;
              const newWidth = Math.max(10, Math.min(100, startWidth + widthDeltaPerc));
              newData.width = newWidth;

              // Specific for CTA: Adjust Height too
              if (resizingEl === 'cta' && startHeight) {
                  const newHeight = Math.max(20, Math.min(200, startHeight + (deltaY * 0.5)));
                  newData.height = newHeight;
              }

              return {
                  ...prev,
                  [resizingEl]: newData
              };
          });
          return;
      }

      // 2. DRAGGING LOGIC
      if (draggingEl) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          // Calculate percentages
          const leftPerc = Math.min(100, Math.max(0, (x / rect.width) * 100));
          const topPerc = Math.min(100, Math.max(0, (y / rect.height) * 100));

          setAppliedData(prev => ({
              ...prev,
              [draggingEl]: { ...prev[draggingEl as any], top: topPerc, left: leftPerc }
          }));
      }
  };

  const handleMouseUp = () => {
      if (resizingEl) {
          syncInteractionToDraft(resizingEl);
          setResizingEl(null);
          resizeStartRef.current = null;
      }
      if (draggingEl) {
          syncInteractionToDraft(draggingEl);
          setDraggingEl(null);
      }
  };

  // --- COMPOSITION & SAVING LOGIC ---
  const generateCompositeImage = async (): Promise<string> => {
      return new Promise((resolve, reject) => {
          const bgImg = new Image();
          bgImg.crossOrigin = "anonymous";
          bgImg.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) return reject('No context');

              // Set canvas to match background image resolution (high quality)
              canvas.width = bgImg.width;
              canvas.height = bgImg.height;

              // 1. Draw Background
              ctx.drawImage(bgImg, 0, 0);

              // Helper to draw text
              const drawText = (section: 'header' | 'description') => {
                  const data = appliedData[section];
                  const fontSize = (data.fontSize / 390) * canvas.width; // Scale font relative to width (assuming preview is ~390px wide visually, this is an approx)
                  const x = (data.left / 100) * canvas.width;
                  const y = (data.top / 100) * canvas.height;
                  const maxWidth = (data.width / 100) * canvas.width;

                  ctx.font = `bold ${fontSize}px ${data.fontFamily}`; // Simply bold for now
                  if (section === 'description') ctx.font = `${fontSize}px ${INITIAL_DATA.header.fontFamily}`; // Fallback font

                  ctx.fillStyle = data.color;
                  ctx.textAlign = data.align;
                  ctx.textBaseline = 'top';

                  // Basic Word Wrap
                  const words = data.text.split(' ');
                  let line = '';
                  let lineY = y;
                  const lineHeight = fontSize * (section === 'header' ? appliedData.header.lineHeight : 1.4);

                  for(let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    const testWidth = metrics.width;
                    if (testWidth > maxWidth && n > 0) {
                        ctx.fillText(line, x + (data.align === 'center' ? maxWidth/2 : 0), lineY);
                        line = words[n] + ' ';
                        lineY += lineHeight;
                    } else {
                        line = testLine;
                    }
                  }
                  ctx.fillText(line, x + (data.align === 'center' ? maxWidth/2 : 0), lineY);
              };

              // 2. Draw Elements
              drawText('header');
              drawText('description');

              // 3. Draw CTA
              const cta = appliedData.cta;
              const ctaX = (cta.left / 100) * canvas.width;
              const ctaY = (cta.top / 100) * canvas.height;
              const ctaW = (cta.width / 100) * canvas.width;
              const ctaH = (cta.height / 844) * canvas.height; // Scale height relative to reference height

              // Button Rect
              ctx.fillStyle = cta.bgColor;
              // Simple rounded rect
              ctx.beginPath();
              ctx.roundRect(ctaX, ctaY, ctaW, ctaH, ctaH/2);
              ctx.fill();

              // Button Text
              ctx.fillStyle = cta.textColor;
              const ctaFontSize = (cta.fontSize / 390) * canvas.width;
              ctx.font = `bold ${ctaFontSize}px Inter`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(cta.text, ctaX + ctaW/2, ctaY + ctaH/2);

              resolve(canvas.toDataURL('image/png'));
          };
          bgImg.src = appliedData.background.url;
      });
  };

  const handleSaveToWorkflow = async () => {
      setIsGenerating(true);
      setStatusMessage('Compositing image...');
      try {
          const composite = await generateCompositeImage();
          if (onSaveToCanvas) {
              onSaveToCanvas(composite);
          }
      } catch (e) {
          console.error(e);
          alert("Erro ao salvar imagem.");
      } finally {
          setIsGenerating(false);
          setStatusMessage('');
      }
  };

  const handleUpscale = async () => {
      setIsGenerating(true);
      setStatusMessage('Generating Composite & Upscaling (this takes a moment)...');
      try {
          const composite = await generateCompositeImage();
          const upscaled = await upscaleImage(composite);
          if (onSaveToCanvas) {
              onSaveToCanvas(upscaled);
          }
      } catch (e) {
          console.error(e);
          alert("Erro ao fazer upscale.");
      } finally {
          setIsGenerating(false);
          setStatusMessage('');
      }
  };

  // Common styles for resize handle
  const ResizeHandle = ({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) => (
      <div 
        onMouseDown={onMouseDown}
        className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-brand-500 rounded-sm cursor-nwse-resize shadow-lg z-50 flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity"
        title="Resize Text/Box"
      >
        <Scaling size={10} className="text-brand-500" />
      </div>
  );

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#020202] overflow-hidden font-sans">
      {/* --- SIDEBAR EDITOR (INCREASED WIDTH) --- */}
      <div className="w-[600px] border-r border-[#27272A] flex flex-col bg-[#0A0A0A] overflow-y-auto shrink-0 transition-all duration-300">
        <div className="p-6 border-b border-[#27272A]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Code2 className="text-brand-500" />
            Editor Low-Code
          </h2>
          <p className="text-xs text-gray-500 mt-1">v4.7 • Mouse Resizing Enabled</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* BACKGROUND SECTION */}
          <SectionAccordion 
            title="Background & Ratio" 
            icon={<ImageIcon size={18} />} 
            isOpen={activeSection === 'bg'}
            onToggle={() => setActiveSection(activeSection === 'bg' ? null : 'bg')}
            onApply={() => applyChanges('background')}
            isChanged={draftData.background.url !== appliedData.background.url || draftData.background.ratio !== appliedData.background.ratio}
          >
             <div className="space-y-4">
                <div 
                    className="w-full bg-[#121212] rounded-lg overflow-hidden relative border border-[#27272A] group"
                    style={{ aspectRatio: draftData.background.ratio > 1 ? '16/9' : '9/16', maxHeight: '250px' }}
                >
                    <img src={draftData.background.url} alt="bg" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                         <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                             <Upload size={14} /> Upload Art
                             <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
                         </label>
                         <p className="text-[10px] text-gray-300 mt-2">auto-detects ratio</p>
                    </div>
                </div>

                <div className="bg-[#18181B] p-4 rounded-lg border border-[#27272A]">
                    <label className="text-xs text-brand-400 font-bold mb-2 block flex items-center gap-1">
                        <Wand2 size={12} /> AI Generator & Remix
                    </label>
                    <textarea 
                        value={genPrompt}
                        onChange={(e) => setGenPrompt(e.target.value)}
                        placeholder="Describe background (e.g., 'Minimalist dark gradient') OR Describe change (e.g., 'Change to sunset')..."
                        className="w-full bg-[#0A0A0A] border border-[#27272A] rounded-lg p-3 text-sm text-white mb-3 resize-none focus:border-brand-500 outline-none"
                        rows={3}
                    />
                    
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {RATIO_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setGenRatio(opt.value)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-[10px] gap-1 transition-colors
                                    ${genRatio === opt.value 
                                        ? 'bg-brand-900/50 border-brand-500 text-white' 
                                        : 'bg-[#121212] border-[#27272A] text-gray-500 hover:border-gray-500'}
                                `}
                                title={opt.label}
                            >
                                {opt.icon}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={handleAiGeneration}
                            disabled={isGenerating || !genPrompt}
                            className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                            Criar Novo
                        </button>
                        
                        <button 
                            onClick={handleAiRemix}
                            disabled={isGenerating || !genPrompt || !appliedData.background.url}
                            className="flex-1 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] disabled:opacity-50 text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                            title="Regenera a imagem atual mantendo a estrutura"
                        >
                            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Repeat size={14} />}
                            Regenerar (Manter Essência)
                        </button>
                    </div>
                </div>
             </div>
          </SectionAccordion>

          {/* HEADER SECTION */}
          <SectionAccordion 
            title="Header" 
            icon={<Type size={18} />} 
            isOpen={activeSection === 'header'}
            onToggle={() => setActiveSection(activeSection === 'header' ? null : 'header')}
            onApply={() => applyChanges('header')}
            isChanged={JSON.stringify(draftData.header) !== JSON.stringify(appliedData.header)}
          >
             <div className="space-y-4">
                <input 
                    type="text" 
                    value={draftData.header.text}
                    onChange={(e) => updateDraft('header', 'text', e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded p-2 text-sm text-white focus:border-brand-500 outline-none"
                    placeholder="Headline"
                />
                
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] text-gray-400 mb-1 block">Width: {draftData.header.width}%</label>
                        <input type="range" min="10" max="100" value={draftData.header.width} onChange={(e) => updateDraft('header', 'width', Number(e.target.value))} className="w-full accent-brand-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                     {/* Position is primarily handled by Drag/Drop now, but keeping sliders for fine tuning if needed or hiding them */}
                    <div>
                        <label className="text-[10px] text-gray-400 mb-1 block">Font Size</label>
                        <input 
                            type="range" min="12" max="96" 
                            value={draftData.header.fontSize}
                            onChange={(e) => updateDraft('header', 'fontSize', Number(e.target.value))}
                            className="w-full accent-brand-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <select 
                        value={draftData.header.fontFamily}
                        onChange={(e) => updateDraft('header', 'fontFamily', e.target.value)}
                        className="flex-1 bg-[#18181B] border border-[#27272A] rounded p-2 text-xs text-white outline-none"
                    >
                        {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <input 
                        type="color" 
                        value={draftData.header.color}
                        onChange={(e) => updateDraft('header', 'color', e.target.value)}
                        className="w-8 h-8 rounded bg-transparent border border-[#27272A] cursor-pointer"
                    />
                </div>
             </div>
          </SectionAccordion>

          {/* DESCRIPTION SECTION */}
          <SectionAccordion 
            title="Description" 
            icon={<Type size={18} />} 
            isOpen={activeSection === 'desc'}
            onToggle={() => setActiveSection(activeSection === 'desc' ? null : 'desc')}
            onApply={() => applyChanges('description')}
            isChanged={JSON.stringify(draftData.description) !== JSON.stringify(appliedData.description)}
          >
             <div className="space-y-4">
                <textarea 
                    rows={3}
                    value={draftData.description.text}
                    onChange={(e) => updateDraft('description', 'text', e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded p-2 text-sm text-white focus:border-brand-500 outline-none resize-none"
                    placeholder="Body text"
                />

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] text-gray-400 mb-1 block">Width: {draftData.description.width}%</label>
                        <input type="range" min="10" max="100" value={draftData.description.width} onChange={(e) => updateDraft('description', 'width', Number(e.target.value))} className="w-full accent-brand-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                     <div>
                        <label className="text-[10px] text-gray-400 mb-1 block">Font Size</label>
                         <input 
                            type="range" min="10" max="48" 
                            value={draftData.description.fontSize}
                            onChange={(e) => updateDraft('description', 'fontSize', Number(e.target.value))}
                            className="w-full accent-brand-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="flex-1">
                    </div>
                    <input 
                        type="color" 
                        value={draftData.description.color}
                        onChange={(e) => updateDraft('description', 'color', e.target.value)}
                        className="w-8 h-8 rounded bg-transparent border border-[#27272A] cursor-pointer"
                    />
                </div>
             </div>
          </SectionAccordion>

          {/* CTA SECTION */}
          <SectionAccordion 
            title="Call To Action" 
            icon={<MousePointer2 size={18} />} 
            isOpen={activeSection === 'cta'}
            onToggle={() => setActiveSection(activeSection === 'cta' ? null : 'cta')}
            onApply={() => applyChanges('cta')}
            isChanged={JSON.stringify(draftData.cta) !== JSON.stringify(appliedData.cta)}
          >
             <div className="space-y-4">
                <input 
                    type="text" 
                    value={draftData.cta.text}
                    onChange={(e) => updateDraft('cta', 'text', e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded p-2 text-sm text-white focus:border-brand-500 outline-none"
                    placeholder="Button Label"
                />
                
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] text-gray-400 mb-1 block">Width: {draftData.cta.width}%</label>
                        <input type="range" min="10" max="100" value={draftData.cta.width} onChange={(e) => updateDraft('cta', 'width', Number(e.target.value))} className="w-full accent-brand-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-400 mb-1 block">Height: {draftData.cta.height}px</label>
                        <input type="range" min="30" max="100" value={draftData.cta.height} onChange={(e) => updateDraft('cta', 'height', Number(e.target.value))} className="w-full accent-brand-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="text-[10px] text-gray-400 mb-1 block">Background</label>
                         <div className="flex items-center gap-2 bg-[#18181B] border border-[#27272A] rounded p-2">
                             <input 
                                type="color" 
                                value={draftData.cta.bgColor}
                                onChange={(e) => updateDraft('cta', 'bgColor', e.target.value)}
                                className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
                             />
                             <span className="text-[10px] text-gray-400 uppercase truncate">{draftData.cta.bgColor}</span>
                         </div>
                     </div>
                     <div>
                         <label className="text-[10px] text-gray-400 mb-1 block">Text Color</label>
                         <div className="flex items-center gap-2 bg-[#18181B] border border-[#27272A] rounded p-2">
                             <input 
                                type="color" 
                                value={draftData.cta.textColor}
                                onChange={(e) => updateDraft('cta', 'textColor', e.target.value)}
                                className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
                             />
                         </div>
                     </div>
                </div>
             </div>
          </SectionAccordion>

        </div>
      </div>

      {/* --- PREVIEW CANVAS --- */}
      <div className="flex-1 bg-[#121212] flex flex-col relative overflow-hidden">
        
        {/* Main Canvas Area */}
        <div 
            className="flex-1 flex items-center justify-center relative p-8"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Background Grid */}
            <div 
            className="absolute inset-0 pointer-events-none opacity-[0.05]"
            style={{
                backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                backgroundSize: '30px 30px'
            }}
            />

            {/* Info Toast */}
            <div className="absolute top-4 text-center z-10 pointer-events-none">
                <div className="bg-[#18181B] border border-[#27272A] px-4 py-1.5 rounded-full text-xs text-gray-400 font-medium shadow-lg flex items-center gap-2">
                    {appliedData.background.ratio < 0.6 ? <Smartphone size={14} /> : (appliedData.background.ratio === 1 ? <Square size={14} /> : <Monitor size={14} />)}
                    <span>
                        Drag elements to move • Drag bottom-right corner to resize
                    </span>
                </div>
            </div>

            {/* DYNAMIC FRAME CONTAINER */}
            <div 
                ref={containerRef}
                className="relative shadow-2xl transition-all duration-300 group ring-4 ring-black/50 bg-black flex flex-col overflow-hidden select-none"
                style={{ 
                    aspectRatio: `${appliedData.background.ratio}`,
                    height: appliedData.background.ratio > 1 ? 'auto' : '90%',
                    width: appliedData.background.ratio > 1 ? '90%' : 'auto',
                    maxWidth: '100%',
                    maxHeight: '90%',
                    borderRadius: appliedData.background.ratio < 0.6 ? '40px' : '12px' // Rounder for phone
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleImageFile(file);
                }}
            >
                {/* Notch (Only for phone ratio < 0.6) */}
                {appliedData.background.ratio < 0.6 && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-[#27272A] rounded-b-2xl z-50 pointer-events-none"></div>
                )}

                {/* Content Layer */}
                <div className="relative w-full h-full z-10">
                    {/* Background Layer */}
                    <div className="absolute inset-0 z-[-1]">
                        <img src={appliedData.background.url} alt="bg" className="w-full h-full object-cover brightness-[0.7]" />
                    </div>

                    {/* Absolute Positioned Elements - DRAGGABLE & RESIZABLE */}
                    
                    {/* HEADER */}
                    <div 
                        className={`group/header absolute flex flex-col cursor-move border-2 ${draggingEl === 'header' || activeSection === 'header' ? 'border-brand-500' : 'border-transparent hover:border-brand-500/50'} transition-colors rounded`}
                        onMouseDown={(e) => handleMouseDown(e, 'header')}
                        style={{ 
                            top: `${appliedData.header.top}%`,
                            left: `${appliedData.header.left}%`,
                            width: `${appliedData.header.width}%`,
                            textAlign: appliedData.header.align
                        }}
                    >
                        {draggingEl === 'header' && <div className="absolute -top-6 left-0 bg-brand-500 text-white text-[10px] px-1 rounded"><Move size={10} /></div>}
                        <h1 style={{ 
                            fontFamily: appliedData.header.fontFamily,
                            fontSize: `${appliedData.header.fontSize}px`, 
                            color: appliedData.header.color,
                            lineHeight: appliedData.header.lineHeight
                        }} className="font-bold drop-shadow-lg tracking-tight break-words pointer-events-none">
                            {appliedData.header.text}
                        </h1>
                        <ResizeHandle onMouseDown={(e) => handleResizeStart(e, 'header')} />
                    </div>

                    {/* DESCRIPTION */}
                    <div 
                        className={`group/desc absolute flex flex-col cursor-move border-2 ${draggingEl === 'description' || activeSection === 'description' ? 'border-brand-500' : 'border-transparent hover:border-brand-500/50'} transition-colors rounded`}
                        onMouseDown={(e) => handleMouseDown(e, 'description')}
                        style={{ 
                            top: `${appliedData.description.top}%`,
                            left: `${appliedData.description.left}%`,
                            width: `${appliedData.description.width}%`,
                            textAlign: appliedData.description.align
                        }}
                    >
                        {draggingEl === 'description' && <div className="absolute -top-6 left-0 bg-brand-500 text-white text-[10px] px-1 rounded"><Move size={10} /></div>}
                        <p style={{
                            fontSize: `${appliedData.description.fontSize}px`,
                            color: appliedData.description.color
                        }} className="font-light leading-relaxed drop-shadow-md break-words pointer-events-none">
                            {appliedData.description.text}
                        </p>
                        <ResizeHandle onMouseDown={(e) => handleResizeStart(e, 'description')} />
                    </div>

                    {/* CTA */}
                    <div 
                        className={`group/cta absolute flex flex-col cursor-move border-2 ${draggingEl === 'cta' || activeSection === 'cta' ? 'border-brand-500' : 'border-transparent hover:border-brand-500/50'} transition-colors rounded`}
                        onMouseDown={(e) => handleMouseDown(e, 'cta')}
                        style={{ 
                            top: `${appliedData.cta.top}%`,
                            left: `${appliedData.cta.left}%`,
                            width: `${appliedData.cta.width}%`,
                            textAlign: appliedData.cta.align
                        }}
                    >
                         {draggingEl === 'cta' && <div className="absolute -top-6 left-0 bg-brand-500 text-white text-[10px] px-1 rounded"><Move size={10} /></div>}
                        <button 
                            style={{
                                backgroundColor: appliedData.cta.bgColor,
                                color: appliedData.cta.textColor,
                                fontSize: `${appliedData.cta.fontSize}px`,
                                height: `${appliedData.cta.height}px`
                            }}
                            className="w-full rounded-xl font-bold tracking-wide shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center whitespace-nowrap pointer-events-none"
                        >
                            {appliedData.cta.text}
                        </button>
                        <ResizeHandle onMouseDown={(e) => handleResizeStart(e, 'cta')} />
                    </div>

                    {/* Watermark */}
                    <div className="absolute bottom-4 w-full text-center pointer-events-none">
                        <p className="text-white/30 text-[10px] uppercase tracking-widest">Powered by Studio AI</p>
                    </div>
                </div>

                {/* Drop Overlay */}
                <div className="absolute inset-0 bg-brand-500/20 backdrop-blur-sm border-4 border-brand-500 border-dashed m-4 rounded-3xl z-40 flex items-center justify-center opacity-0 group-hover:opacity-0 group-[.drag-over]:opacity-100 pointer-events-none transition-opacity">
                    <span className="bg-black text-white px-4 py-2 rounded-lg font-bold">Drop Image Here</span>
                </div>
            </div>

            {/* Loading Overlay */}
            {isGenerating && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                     <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                     <p className="text-white font-semibold animate-pulse">{statusMessage || "Processing..."}</p>
                 </div>
            )}
        </div>

        {/* BOTTOM TOOLBAR */}
        <div className="bg-[#0A0A0A] border-t border-[#27272A] p-4 flex items-center justify-between shrink-0">
            <div className="text-xs text-gray-500">
                Labs Editor • Click elements to drag
            </div>
            <div className="flex gap-4">
                 <button 
                    onClick={handleSaveToWorkflow}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-3 bg-[#18181B] hover:bg-[#27272A] text-white rounded-xl font-medium transition-colors border border-[#27272A]"
                 >
                     <Save size={18} /> Salvar no Workflow
                 </button>
                 <button 
                    onClick={handleUpscale}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:brightness-110 text-white rounded-xl font-bold transition-all shadow-cta"
                 >
                     <ArrowUpCircle size={18} /> Upscale & Save
                 </button>
            </div>
        </div>

      </div>
    </div>
  );
};

// Sub-component for Sidebar Sections
const SectionAccordion = ({ title, icon, children, isOpen, onToggle, onApply, isChanged }: any) => {
    return (
        <div className={`bg-[#0A0A0A] border rounded-xl transition-all ${isOpen ? 'border-brand-500/50 shadow-glow' : 'border-[#27272A]'}`}>
            <button 
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-[#121212] rounded-t-xl transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className={`p-2 rounded-lg ${isOpen ? 'bg-brand-500/10 text-brand-500' : 'bg-[#18181B] text-gray-400'}`}>
                        {icon}
                    </span>
                    <span className={`font-medium ${isOpen ? 'text-white' : 'text-gray-400'}`}>{title}</span>
                </div>
                {isOpen ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
            </button>
            
            {isOpen && (
                <div className="p-4 border-t border-[#27272A] bg-[#0E0E0E] rounded-b-xl animate-in fade-in slide-in-from-top-1">
                    {children}
                    <div className="mt-4 pt-4 border-t border-[#27272A] flex justify-end">
                        <button 
                            onClick={onApply}
                            disabled={!isChanged}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all
                                ${isChanged 
                                    ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-cta hover:scale-105' 
                                    : 'bg-[#18181B] text-gray-500 cursor-not-allowed'}
                            `}
                        >
                            <RefreshCw size={12} className={isChanged ? "" : ""} />
                            {isChanged ? 'Apply Changes' : 'Synced'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LandingPageEditor;
