import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  Download,
  Copy,
  RefreshCw,
  Sliders,
  Image as ImageIcon,
  Check,
  Maximize2,
  X,
  Trash2,
  Wand2,
  Palette,
  ExternalLink,
  Info,
} from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';

interface ImageStudioTabProps {
  config: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type FluxModel = 'flux' | 'flux-anime' | 'flux-realism' | 'flux-3d' | 'turbo';

interface GeneratedImage {
  id: string;
  prompt: string;
  enhancedPrompt?: string;
  url: string;
  model: FluxModel;
  aspectRatio: AspectRatio;
  seed: number;
  enhance: boolean;
  timestamp: number;
}

const STORAGE_KEY = 'grokki_image_studio_history_v1';

const ASPECT_DIMS: Record<AspectRatio, { width: number; height: number; label: string; ratioClass: string }> = {
  '1:1': { width: 1024, height: 1024, label: 'Square (1:1)', ratioClass: 'aspect-square' },
  '16:9': { width: 1344, height: 768, label: 'Landscape (16:9)', ratioClass: 'aspect-video' },
  '9:16': { width: 768, height: 1344, label: 'Portrait (9:16)', ratioClass: 'aspect-[9/16]' },
  '4:3': { width: 1152, height: 864, label: 'Photo (4:3)', ratioClass: 'aspect-[4/3]' },
  '3:4': { width: 864, height: 1152, label: 'Portrait (3:4)', ratioClass: 'aspect-[3/4]' },
};

const MODEL_PRESETS: { id: FluxModel; name: string; tag: string; desc: string; icon: string }[] = [
  { id: 'flux-anime', name: 'FLUX Anime', tag: 'High-End Anime', desc: 'Vibrant, detailed illustration & anime aesthetics', icon: '🌸' },
  { id: 'flux', name: 'FLUX.1 Schnell', tag: 'Balanced', desc: 'Next-gen detail, accurate anatomy & sharp lighting', icon: '⚡' },
  { id: 'flux-realism', name: 'FLUX Realism', tag: 'Photorealistic', desc: 'True-to-life skin tones, natural lighting & DSLR depth', icon: '📸' },
  { id: 'flux-3d', name: 'FLUX 3D', tag: 'CGI / Pixar', desc: 'Octane render, 3D character design & cinematic CGI', icon: '🧊' },
  { id: 'turbo', name: 'SD Turbo', tag: 'Ultra Fast', desc: 'Near-instant 1-second generation for quick concepts', icon: '🚀' },
];

const STYLE_PROMPTS: { label: string; prefix: string; suffix: string }[] = [
  { label: 'Anime Masterpiece', prefix: 'masterpiece anime style of', suffix: 'highly detailed, vibrant colors, Makoto Shinkai lighting, 8k resolution' },
  { label: 'Cinematic Movie', prefix: 'cinematic 35mm film still of', suffix: 'anamorphic lens flare, moody atmosphere, dynamic lighting, photorealistic' },
  { label: 'Cyberpunk Neon', prefix: 'cyberpunk style', suffix: 'neon glow, rain-soaked streets, holographic billboards, volumetric mist, high detail' },
  { label: 'Studio Ghibli', prefix: 'Studio Ghibli animated style of', suffix: 'hand-drawn aesthetic, lush nature, warm whimsical lighting, nostalgic feel' },
  { label: 'Dark Fantasy', prefix: 'dark fantasy illustration of', suffix: 'ethereal glow, intricate armor, gothic architecture, dramatic shadows, Unreal Engine 5' },
  { label: 'Digital Art', prefix: 'trending digital art of', suffix: 'ArtStation award-winning, sharp focus, intricate detailing, concept art' },
];

export const ImageStudioTab: React.FC<ImageStudioTabProps> = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<FluxModel>('flux-anime');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [enhance, setEnhance] = useState(true);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 10000000));
  const [randomSeed, setRandomSeed] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
          if (parsed.length > 0) {
            setCurrentGeneration(parsed[0]);
          }
        }
      }
    } catch (err) {
      console.warn('[ImageStudio] Failed to load history:', err);
    }
  }, []);

  const saveHistory = (items: GeneratedImage[]) => {
    setHistory(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
    } catch (err) {
      console.warn('[ImageStudio] Failed to save history:', err);
    }
  };

  const buildImageUrl = (p: string, m: FluxModel, ar: AspectRatio, enh: boolean, s: number) => {
    const { width, height } = ASPECT_DIMS[ar];
    const encodedPrompt = encodeURIComponent(p.trim());
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${m}&width=${width}&height=${height}&seed=${s}&nologo=true&enhance=${enh}`;
  };

  const handleGenerate = async (customPrompt?: string) => {
    const targetPrompt = (customPrompt || prompt).trim();
    if (!targetPrompt || isGenerating) return;

    const currentSeed = randomSeed ? Math.floor(Math.random() * 10000000) : seed;
    if (randomSeed) setSeed(currentSeed);

    setIsGenerating(true);

    const imageUrl = buildImageUrl(targetPrompt, selectedModel, aspectRatio, enhance, currentSeed);

    const newGen: GeneratedImage = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      prompt: targetPrompt,
      url: imageUrl,
      model: selectedModel,
      aspectRatio,
      seed: currentSeed,
      enhance,
      timestamp: Date.now(),
    };

    setCurrentGeneration(newGen);

    // Pre-cache image to detect completion
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setIsGenerating(false);
      saveHistory([newGen, ...history.filter((h) => h.id !== newGen.id)]);
    };
    img.onerror = () => {
      setIsGenerating(false);
      // Still show in history with fallback
      saveHistory([newGen, ...history.filter((h) => h.id !== newGen.id)]);
    };
  };

  const handleApplyStyle = (style: typeof STYLE_PROMPTS[number]) => {
    if (!prompt.trim()) {
      setPrompt(`${style.prefix} a serene landscape, ${style.suffix}`);
    } else {
      setPrompt(`${style.prefix} ${prompt.trim()}, ${style.suffix}`);
    }
  };

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = async (item: GeneratedImage) => {
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grokki_${item.model}_${item.seed}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.url, '_blank');
    }
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    saveHistory(updated);
    if (currentGeneration?.id === id) {
      setCurrentGeneration(updated[0] || null);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear all generated image history?')) {
      saveHistory([]);
      setCurrentGeneration(null);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#07070a] text-gray-100 overflow-hidden select-none">
      {/* Top Header / Status Bar */}
      <div className="h-14 border-b border-white/[0.08] bg-[#0c0c12]/80 backdrop-blur-md px-6 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-600/30 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">Grokki Image Studio</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                Unlimited Free
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Powered by Pollinations FLUX.1 Engine • Zero API Key Required</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Model Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-gray-300">
            <span>{MODEL_PRESETS.find((m) => m.id === selectedModel)?.icon}</span>
            <span className="font-semibold text-white">{MODEL_PRESETS.find((m) => m.id === selectedModel)?.name}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              showSettingsDrawer
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                : 'bg-white/[0.05] hover:bg-white/[0.09] text-gray-400 hover:text-white border border-white/10'
            }`}
            title="Image Generation Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Body: Left Gallery/Canvas + Right Settings Drawer */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Central Display & History */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Stage Area */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#12121c] via-[#08080d] to-[#040407] overflow-auto">
            {currentGeneration ? (
              <div className="relative max-h-full max-w-full flex flex-col items-center justify-center group">
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40">
                  <img
                    src={currentGeneration.url}
                    alt={currentGeneration.prompt}
                    className="max-h-[58vh] max-w-[70vw] object-contain rounded-2xl transition-all duration-300 group-hover:scale-[1.01]"
                  />

                  {/* Loading overlay when regenerating */}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-pink-500/30 border-t-pink-500 animate-spin" />
                      <span className="text-xs font-mono text-pink-300 tracking-wider uppercase animate-pulse">
                        Dreaming with {selectedModel}...
                      </span>
                    </div>
                  )}

                  {/* Hover Floating Actions Bar */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-medium text-gray-200 truncate max-w-[60%] px-2">
                      {currentGeneration.prompt}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyPrompt(currentGeneration.prompt, currentGeneration.id)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
                        title="Copy Prompt"
                      >
                        {copiedId === currentGeneration.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(currentGeneration)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
                        title="Download PNG"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewImage(currentGeneration)}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
                        title="Full-screen View"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Prompt Metadata pill under image */}
                <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-gray-300">
                    Seed: {currentGeneration.seed}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-300 font-semibold">
                    {currentGeneration.model}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300">
                    {currentGeneration.aspectRatio}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center max-w-md p-8 rounded-3xl border border-white/[0.08] bg-white/[0.02]">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-sky-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-4 shadow-xl">
                  <Wand2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Create Anything in Seconds</h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Type any prompt below to generate ultra high-res FLUX images with instant style tuning, automatic prompt expansion, and zero limits.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {STYLE_PROMPTS.slice(0, 3).map((st) => (
                    <button
                      key={st.label}
                      type="button"
                      onClick={() => handleApplyStyle(st)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[11px] text-gray-300 hover:text-white transition-all cursor-pointer"
                    >
                      ✦ {st.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prompt Inspiration Row */}
          <div className="px-6 py-2 bg-[#0c0c12]/60 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1 flex-shrink-0">
              <Palette className="w-3 h-3 text-pink-400" /> Styles:
            </span>
            {STYLE_PROMPTS.map((style) => (
              <button
                key={style.label}
                type="button"
                onClick={() => handleApplyStyle(style)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-pink-500/15 border border-white/10 hover:border-pink-500/30 text-[11px] text-gray-300 hover:text-pink-200 transition-all cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                {style.label}
              </button>
            ))}
          </div>

          {/* Bottom Chat Prompt Bar */}
          <div className="p-4 bg-[#09090f] border-t border-white/[0.08] flex-shrink-0">
            <div className="max-w-4xl mx-auto flex items-center gap-2 bg-[#12121a] border border-white/15 focus-within:border-pink-500/60 rounded-2xl p-1.5 pl-4 shadow-xl transition-all">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="Describe the image you want to create... (e.g. cybernetic anime priestess in neon rain)"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />

              {/* Magic Enhance Pill */}
              <button
                type="button"
                onClick={() => setEnhance(!enhance)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  enhance
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-xs'
                    : 'bg-white/[0.05] text-gray-400 border border-white/10 hover:text-white'
                }`}
                title="Automatically expand your prompt with an LLM for ultra-detailed outputs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Magic</span>
              </button>

              {/* Generate Button */}
              <button
                type="button"
                disabled={!prompt.trim() || isGenerating}
                onClick={() => handleGenerate()}
                className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  !prompt.trim() || isGenerating
                    ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-lg shadow-pink-500/25 active:scale-95'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dreaming...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Generations Strip */}
          {history.length > 0 && (
            <div className="h-28 bg-[#07070b] border-t border-white/[0.06] p-3 px-6 flex items-center gap-3 overflow-x-auto no-scrollbar flex-shrink-0">
              <div className="flex items-center justify-between gap-2 flex-shrink-0 pr-2 border-r border-white/10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">History</span>
                  <span className="text-[10px] text-gray-500">{history.length} items</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="p-1 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setCurrentGeneration(item)}
                  className={`relative h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer transition-all group ${
                    currentGeneration?.id === item.id
                      ? 'border-pink-500 scale-105 shadow-md shadow-pink-500/20'
                      : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-gray-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete item"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Settings Drawer */}
        <AnimatePresence>
          {showSettingsDrawer && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full border-l border-white/[0.08] bg-[#0c0c14] flex flex-col overflow-y-auto flex-shrink-0 select-none z-10"
            >
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-pink-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Engine Settings</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsDrawer(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 flex flex-col gap-5 text-xs">
                {/* Model Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    AI Model Engine
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {MODEL_PRESETS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModel(m.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          selectedModel === m.id
                            ? 'bg-pink-500/15 border-pink-500/40 text-white shadow-xs'
                            : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:text-gray-200 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className="text-base">{m.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-xs text-white">{m.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono">
                              {m.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 leading-tight">{m.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(ASPECT_DIMS) as AspectRatio[]).map((ar) => (
                      <button
                        key={ar}
                        type="button"
                        onClick={() => setAspectRatio(ar)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          aspectRatio === ar
                            ? 'bg-pink-500/15 border-pink-500/40 text-white font-bold'
                            : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs">{ar}</div>
                        <div className="text-[9px] text-gray-500 font-mono">
                          {ASPECT_DIMS[ar].width}×{ASPECT_DIMS[ar].height}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seed Controls */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Seed
                    </label>
                    <button
                      type="button"
                      onClick={() => setRandomSeed(!randomSeed)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer ${
                        randomSeed ? 'bg-pink-500/20 text-pink-300' : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      {randomSeed ? 'Randomized' : 'Fixed'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      disabled={randomSeed}
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value))}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white font-mono outline-none disabled:opacity-40"
                    />
                    <button
                      type="button"
                      onClick={() => setSeed(Math.floor(Math.random() * 10000000))}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300"
                      title="Roll new seed"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Magic Enhance Info Box */}
                <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-pink-300 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>LLM Prompt Enhancer</span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    Automatically enriches short prompts with cinematic lighting, material details, and artist style cues before sending to FLUX.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fullscreen Preview Lightbox */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
            onClick={() => setPreviewImage(null)}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={previewImage.url}
              alt={previewImage.prompt}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            <div
              className="mt-4 max-w-2xl text-center bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex items-center justify-between gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs text-gray-200 truncate">{previewImage.prompt}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyPrompt(previewImage.prompt, previewImage.id)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-medium flex items-center gap-1.5"
                >
                  {copiedId === previewImage.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(previewImage)}
                  className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-xs text-white font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageStudioTab;