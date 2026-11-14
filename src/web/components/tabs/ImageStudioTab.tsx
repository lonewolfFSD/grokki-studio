import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ArrowUp,
  Download,
  Copy,
  RefreshCw,
  Sliders,
  Check,
  Maximize2,
  Trash2,
  AlertCircle,
  Square,
  Key,
} from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AiImageIcon, Layers01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { JarvisConfig } from '../../types/jarvis';
import SpecularButton from '../../../effects/SpecularButton';
import GlideSelect, { GlideSelectOption } from './GlideSelect';
import WarmTooltip from '../WarmTooltip';
import grokkiIcon from '../../assets/grokki_icon.svg';

interface ImageStudioTabProps {
  config: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type EngineProvider = 'pollinations' | 'huggingface' | 'together';

interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  provider: EngineProvider;
  model: string;
  aspectRatio: AspectRatio;
  seed: number;
  enhance: boolean;
  timestamp: string;
  error?: string;
}

const STORAGE_KEY = 'grokki_image_studio_feed_v2';
const HF_TOKEN_KEY = 'grokki_hf_image_token';
const TOGETHER_KEY = 'grokki_together_image_key';

const ASPECT_DIMS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  '1:1': { width: 1024, height: 1024, label: '1:1 Square' },
  '16:9': { width: 1280, height: 720, label: '16:9 Landscape' },
  '9:16': { width: 720, height: 1280, label: '9:16 Portrait' },
  '4:3': { width: 1152, height: 864, label: '4:3 Standard' },
  '3:4': { width: 864, height: 1152, label: '3:4 Portrait' },
};

const ENGINE_OPTIONS: GlideSelectOption[] = [
  { value: 'pollinations:flux', label: 'Pollinations • FLUX.1 (Free)', group: 'Free Cloud' },
  { value: 'pollinations:turbo', label: 'Pollinations • Turbo (Fast)', group: 'Free Cloud' },
  { value: 'huggingface:black-forest-labs/FLUX.1-schnell', label: 'Hugging Face • FLUX.1 Schnell', group: 'Hugging Face (Pro)' },
  { value: 'huggingface:stabilityai/stable-diffusion-xl-base-1.0', label: 'Hugging Face • SDXL Base', group: 'Hugging Face (Pro)' },
  { value: 'together:black-forest-labs/FLUX.1-schnell-Free', label: 'Together AI • FLUX.1 Free', group: 'Together AI' },
];

const ASPECT_OPTIONS: GlideSelectOption[] = [
  { value: '1:1', label: '1:1 Square' },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '9:16', label: '9:16 Portrait' },
  { value: '4:3', label: '4:3 Standard' },
  { value: '3:4', label: '3:4 Portrait' },
];

export const ImageStudioTab: React.FC<ImageStudioTabProps> = ({ config }) => {
  const [inputValue, setInputValue] = useState('');
  const [activeEngine, setActiveEngine] = useState<string>('pollinations:flux');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [enhance, setEnhance] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // API Tokens
  const [hfToken, setHfToken] = useState<string>(() => {
    try { return localStorage.getItem(HF_TOKEN_KEY) || ''; } catch { return ''; }
  });
  const [togetherKey, setTogetherKey] = useState<string>(() => {
    try { return localStorage.getItem(TOGETHER_KEY) || ''; } catch { return ''; }
  });
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Chat-style feed of image generations
  const [generations, setGenerations] = useState<GeneratedImage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const isDarkTheme =
    config.dashboardTheme === 'dark' ||
    (typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark')));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [generations.length]);

  const saveGenerations = (items: GeneratedImage[]) => {
    setGenerations(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 40)));
    } catch {}
  };

  const handleSaveTokens = (hf: string, tog: string) => {
    setHfToken(hf);
    setTogetherKey(tog);
    try {
      localStorage.setItem(HF_TOKEN_KEY, hf.trim());
      localStorage.setItem(TOGETHER_KEY, tog.trim());
    } catch {}
    setShowKeyModal(false);
  };

  // Helper to generate image via chosen engine
  const executeGeneration = async (promptText: string, engineKey: string, ar: AspectRatio, enh: boolean) => {
    const [provider, modelName] = engineKey.split(':');
    const { width, height } = ASPECT_DIMS[ar];
    const seed = Math.floor(Math.random() * 9000000) + 1000000;

    let finalImageUrl = '';

    if (provider === 'huggingface') {
      if (!hfToken.trim()) {
        setShowKeyModal(true);
        throw new Error('Please add your free Hugging Face User Access Token (hf_...) to use this model.');
      }
      const response = await fetch(`https://router.huggingface.co/hf-inference/models/${modelName}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: promptText }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Hugging Face error (${response.status}): ${errText.slice(0, 160)}`);
      }

      const blob = await response.blob();
      finalImageUrl = URL.createObjectURL(blob);
    } else if (provider === 'together') {
      if (!togetherKey.trim()) {
        setShowKeyModal(true);
        throw new Error('Please add your Together AI API Key to use this model.');
      }
      const response = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${togetherKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: promptText,
          width,
          height,
          steps: 4,
          n: 1,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Together AI error (${response.status})`);
      }

      const data = await response.json();
      finalImageUrl = data.data?.[0]?.url || '';
    } else {
      // Default: Pollinations Free
      const encPrompt = encodeURIComponent(promptText.trim());
      // Append seed & timestamp cachebuster
      const cacheBust = `${Date.now()}`;
      finalImageUrl = `https://image.pollinations.ai/prompt/${encPrompt}?model=${modelName}&width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=${enh}&cb=${cacheBust}`;

      // Pre-load to verify it returns a valid image and not the 45s cooldown banner
      await new Promise<void>((resolve, reject) => {
        const testImg = new Image();
        testImg.src = finalImageUrl;
        testImg.onload = () => resolve();
        testImg.onerror = () => reject(new Error('Failed to load image. If rate limited, please wait a moment or switch models.'));
      });
    }

    return { finalImageUrl, seed };
  };

  const handleGenerate = async (customPrompt?: string) => {
    const promptText = (customPrompt || inputValue).trim();
    if (!promptText || isGenerating) return;

    setInputValue('');
    setIsGenerating(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const [provider, modelName] = activeEngine.split(':');
    const newEntry: GeneratedImage = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      prompt: promptText,
      url: '',
      provider: provider as EngineProvider,
      model: modelName,
      aspectRatio,
      seed: 0,
      enhance,
      timestamp: timeStr,
    };

    // Add immediate placeholder in feed
    const updatedWithPlaceholder = [...generations, newEntry];
    setGenerations(updatedWithPlaceholder);

    try {
      const { finalImageUrl, seed } = await executeGeneration(promptText, activeEngine, aspectRatio, enhance);
      const finished: GeneratedImage = {
        ...newEntry,
        url: finalImageUrl,
        seed,
      };
      saveGenerations([...generations, finished]);
    } catch (err: any) {
      const failed: GeneratedImage = {
        ...newEntry,
        error: err.message || 'Generation failed. Please try again.',
      };
      saveGenerations([...generations, failed]);
    } finally {
      setIsGenerating(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownload = async (item: GeneratedImage) => {
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grokki_gen_${item.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.url, '_blank');
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear image generation history?')) {
      saveGenerations([]);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#f7f7fa] dark:bg-[#070709] text-gray-900 dark:text-gray-100 overflow-hidden select-none">
      {/* Scrollable Conversation Stream of Generated Images */}
      <div id="grokki-image-scroll" className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 min-h-0">
        <div className="max-w-3xl mx-auto flex flex-col space-y-6">
          {/* Header Description if empty */}
          {generations.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-24 select-none">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#131317] border border-gray-200 dark:border-white/10 shadow-sm flex items-center justify-center mb-3">
                <HugeiconsIcon icon={AiImageIcon} size={22} strokeWidth={1.8} className="text-gray-900 dark:text-white" />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                Grokki Image Studio
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1 leading-relaxed">
                Describe any scene, character, or wallpaper below to generate studio-quality FLUX illustrations.
              </p>
            </div>
          )}

          {/* Messages Flow */}
          {generations.map((item) => (
            <div key={item.id} className="flex flex-col space-y-3 w-full animate-in fade-in duration-200">
              {/* User Prompt Bubble */}
              <div className="flex justify-end w-full">
                <div className="max-w-[80%] bg-gray-100 dark:bg-[#1a1a20] text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-2xl rounded-tr-xs text-[13px] font-medium leading-relaxed border border-gray-300/80 dark:border-[#26262e] shadow-2xs">
                  {item.prompt}
                </div>
              </div>

              {/* Assistant Image Response Bubble */}
              <div className="flex items-start gap-3 w-full">
                <img
                  src={grokkiIcon}
                  alt="Grokki"
                  className="w-6 h-6 rounded-full shadow-xs flex-shrink-0 mt-1 select-none"
                />

                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                      Grokki
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                      {item.timestamp}
                    </span>
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-gray-200/80 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 font-mono border border-gray-300/60 dark:border-white/[0.08]">
                      {item.model}
                    </span>
                  </div>

                  {item.error ? (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 max-w-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold mb-0.5">Generation Failed</p>
                        <p className="text-[11px] leading-relaxed opacity-90">{item.error}</p>
                        <button
                          type="button"
                          onClick={() => handleGenerate(item.prompt)}
                          className="mt-2 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                      </div>
                    </div>
                  ) : item.url ? (
                    <div className="relative inline-block max-w-[560px] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm bg-black/10 group">
                      <img
                        src={item.url}
                        alt={item.prompt}
                        className="w-full h-auto object-cover rounded-2xl transition-transform duration-200 group-hover:scale-[1.005]"
                      />

                      {/* Hover Action Bar */}
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 opacity-0 group-hover:opacity-100 transition-opacity">
                        <WarmTooltip content={copiedId === item.id ? 'Copied prompt' : 'Copy prompt'} side="top">
                          <button
                            type="button"
                            onClick={() => handleCopyPrompt(item.prompt, item.id)}
                            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </WarmTooltip>
                        <WarmTooltip content="Download PNG" side="top">
                          <button
                            type="button"
                            onClick={() => handleDownload(item)}
                            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </WarmTooltip>
                        <WarmTooltip content="Regenerate" side="top">
                          <button
                            type="button"
                            onClick={() => handleGenerate(item.prompt)}
                            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </WarmTooltip>
                      </div>
                    </div>
                  ) : (
                    /* Loading State Skeleton */
                    <div className="w-[380px] h-[380px] rounded-2xl bg-gray-100 dark:bg-[#131317] border border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-2.5 text-gray-400 animate-pulse">
                      <div className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-white/20 border-t-gray-800 dark:border-t-white animate-spin" />
                      <span className="text-[11px] font-mono tracking-wider text-gray-500 dark:text-gray-400">
                        Synthesizing with {item.model}...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Floating Specular Chat Input Box — IDENTICAL TO GROKKI CHATTAB */}
      <div className="w-full flex-shrink-0 px-4 sm:px-8 pb-5 pt-2 relative z-30">
        <div className="max-w-3xl mx-auto w-full">
          <SpecularButton
            as="div"
            size="lg"
            radius={18}
            tint={isDarkTheme ? '#ffffff' : '#000000'}
            tintOpacity={0.04}
            textColor={isDarkTheme ? '#f5f5f5' : '#18181b'}
            lineColor={isDarkTheme ? '#ffffff' : '#18181b'}
            baseColor={isDarkTheme ? '#525252' : '#d4d4d8'}
            intensity={1}
            idleIntensity={0.35}
            shineSize={10}
            shineFade={34}
            thickness={1.2}
            glow={1}
            followMouse={false}
            autoAnimate
            proximity={250}
            className="w-full bg-white dark:bg-[#131317] shadow-sm hover:shadow-md p-3 transition-all flex flex-col gap-2.5 text-left relative z-20"
          >
            {/* Textarea Input */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              rows={Math.min(5, Math.max(1, inputValue.split('\n').length))}
              placeholder="Describe the image you want to generate in detail..."
              autoFocus
              className="w-full bg-transparent resize-none border-none outline-none text-[13px] font-medium leading-relaxed text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 p-0"
            />

            {/* Bottom Controls Row: Engine Selector on Left, Aspect Ratio, Keys & Submit on Right */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Engine Selector Dropdown */}
                <GlideSelect
                  options={ENGINE_OPTIONS}
                  value={activeEngine}
                  onChange={(val) => setActiveEngine(val)}
                  size="sm"
                  radius={8}
                  menuWidth={280}
                  surfaceColor={isDarkTheme ? '#1a1c24' : '#f3f4f6'}
                  highlightColor={isDarkTheme ? '#272a38' : '#e5e7eb'}
                  textColor={isDarkTheme ? '#f3f4f6' : '#111827'}
                  accentColor={isDarkTheme ? '#38bdf8' : '#0284c7'}
                  placement="top"
                  align="left"
                />

                {/* Aspect Ratio Selector */}
                <GlideSelect
                  options={ASPECT_OPTIONS}
                  value={aspectRatio}
                  onChange={(val) => setAspectRatio(val as AspectRatio)}
                  size="sm"
                  radius={8}
                  menuWidth={180}
                  surfaceColor={isDarkTheme ? '#1a1c24' : '#f3f4f6'}
                  highlightColor={isDarkTheme ? '#272a38' : '#e5e7eb'}
                  textColor={isDarkTheme ? '#f3f4f6' : '#111827'}
                  accentColor={isDarkTheme ? '#38bdf8' : '#0284c7'}
                  placement="top"
                  align="left"
                />

                {/* Magic Prompt Enhancer Toggle */}
                <WarmTooltip content={enhance ? 'Magic Prompt: ON' : 'Magic Prompt: OFF'} side="top">
                  <button
                    type="button"
                    onClick={() => setEnhance(!enhance)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      enhance
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25'
                        : 'text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="hidden sm:inline">Magic</span>
                  </button>
                </WarmTooltip>
              </div>

              {/* Right Side: Key config & Submit */}
              <div className="flex items-center gap-1.5 shrink-0">
                <WarmTooltip content="Configure API Keys (Hugging Face / Together)" side="top">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(true)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                </WarmTooltip>

                {generations.length > 0 && (
                  <WarmTooltip content="Clear History" side="top">
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </WarmTooltip>
                )}

                {/* Submit Button (Identical to ChatTab arrow-up) */}
                <button
                  type="button"
                  disabled={!inputValue.trim() || isGenerating}
                  onClick={() => handleGenerate()}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    inputValue.trim() && !isGenerating
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-95 cursor-pointer shadow-xs'
                      : 'bg-gray-200 dark:bg-[#1e2029] text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isGenerating ? (
                    <Square className="w-3 h-3 fill-current" />
                  ) : (
                    <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>
          </SpecularButton>

          <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 mt-2 select-none tracking-normal">
            FLUX Image Studio • Supports Free Cloud, Hugging Face, and Together AI models.
          </p>
        </div>
      </div>

      {/* Pro Keys Modal */}
      {showKeyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowKeyModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#15151a] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-left animate-in fade-in zoom-in-95 duration-150"
          >
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Pro Image API Keys</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Add optional free API tokens to unlock full Hugging Face ZeroGPU and Together AI models.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Hugging Face Access Token (Free)
                </label>
                <input
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_..."
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#1c1c24] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Together AI API Key
                </label>
                <input
                  type="password"
                  value={togetherKey}
                  onChange={(e) => setTogetherKey(e.target.value)}
                  placeholder="api-key..."
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#1c1c24] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveTokens(hfToken, togetherKey)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90 shadow-xs"
              >
                Save Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageStudioTab;