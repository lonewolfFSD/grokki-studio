import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  ArrowUp,
  Download,
  Copy,
  RefreshCw,
  Check,
  Trash2,
  AlertCircle,
  Square,
} from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';
import SpecularButton from '../../../effects/SpecularButton';
import DriftWall from '../../../effects/DriftWall';
import GlideSelect, { GlideSelectOption } from './GlideSelect';
import { GeminiLogo, OpenAILogo } from './AiBrainTab';
import WarmTooltip from '../WarmTooltip';
import grokkiIcon from '../../assets/grokki_icon.svg';

interface ImageStudioTabProps {
  config: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  engine: string;
  aspectRatio: AspectRatio;
  seed: number;
  enhance: boolean;
  timestamp: string;
  error?: string;
}

const STORAGE_KEY = 'grokki_image_studio_feed_v2';
const GEMINI_IMAGE_KEY = 'grokki_gemini_image_key';
const ACTIVE_ENGINE_KEY = 'grokki_image_active_engine';

const ASPECT_DIMS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  '1:1':  { width: 1024, height: 1024, label: '1:1 Square'     },
  '16:9': { width: 1280, height: 720,  label: '16:9 Landscape' },
  '9:16': { width: 720,  height: 1280, label: '9:16 Portrait'  },
  '4:3':  { width: 1152, height: 864,  label: '4:3 Standard'   },
  '3:4':  { width: 864,  height: 1152, label: '3:4 Portrait'   },
};

const DRIFT_ITEMS = [
  { image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', title: 'Abstract Flow' },
  { image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80', title: 'Cyber Orb' },
  { image: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=600&q=80', title: 'Cosmic Nebula' },
  { image: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?auto=format&fit=crop&w=600&q=80', title: 'Geometric 3D' },
  { image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=600&q=80', title: 'Surreal Fluid' },
  { image: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80', title: 'Neon Night' },
  { image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', title: 'Cyber Matrix' },
  { image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80', title: 'Futuristic Grid' },
  { image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80', title: 'Color Wave' },
  { image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80', title: 'Digital Canvas' },
  { image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80', title: 'Retro Hardware' },
  { image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80', title: 'Cyberpunk Alley' },
  { image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80', title: 'Glow Neon' },
  { image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80', title: 'Anime Fantasy' },
  { image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80', title: 'Esports Cyber' },
  { image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80', title: 'Arcade Glow' },
];

const RatioBoxIcon: React.FC<{ ratio: AspectRatio; className?: string }> = ({ ratio, className = 'w-3.5 h-3.5' }) => {
  const frames: Record<AspectRatio, { x: number; y: number; w: number; h: number }> = {
    '1:1':  { x: 3,    y: 3,    w: 10,  h: 10  },
    '16:9': { x: 1.5,  y: 4.25, w: 13,  h: 7.5 },
    '9:16': { x: 4.25, y: 1.5,  w: 7.5, h: 13  },
    '4:3':  { x: 2,    y: 3.5,  w: 12,  h: 9   },
    '3:4':  { x: 3.5,  y: 2,    w: 9,   h: 12  },
  };
  const f = frames[ratio];
  return (
    <svg viewBox="0 0 16 16" className={`${className} shrink-0 opacity-75`} fill="none">
      <rect
        x={f.x}
        y={f.y}
        width={f.w}
        height={f.h}
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
};

const modelLabel = (Icon: React.FC<{ className?: string }>, text: string) => (
  <span className="inline-flex items-center gap-2 truncate">
    <Icon className="w-3.5 h-3.5 shrink-0" />
    <span className="truncate">{text}</span>
  </span>
);

const ratioLabel = (ratio: AspectRatio, text: string) => (
  <span className="inline-flex items-center gap-2 truncate">
    <RatioBoxIcon ratio={ratio} className="w-3.5 h-3.5 shrink-0" />
    <span className="truncate">{text}</span>
  </span>
);

const ENGINE_OPTIONS: GlideSelectOption[] = [
  { value: 'google:imagen-3.0-generate-002',      label: modelLabel(GeminiLogo, 'Imagen 3 Ultra'), tag: 'Google' },
  { value: 'google:imagen-3.0-fast-generate-001', label: modelLabel(GeminiLogo, 'Imagen 3 Fast'),  tag: 'Google' },
  { value: 'openai:dall-e-3',                     label: modelLabel(OpenAILogo, 'DALL·E 3'),       tag: 'OpenAI' },
  { value: 'openai:dall-e-2',                     label: modelLabel(OpenAILogo, 'DALL·E 2'),       tag: 'OpenAI' },
];

const ASPECT_OPTIONS: GlideSelectOption[] = [
  { value: '1:1',  label: ratioLabel('1:1',  '1:1 Square'),    tag: '1024×1024' },
  { value: '16:9', label: ratioLabel('16:9', '16:9 Wide'),     tag: '1280×720'  },
  { value: '9:16', label: ratioLabel('9:16', '9:16 Tall'),     tag: '720×1280'  },
  { value: '4:3',  label: ratioLabel('4:3',  '4:3 Standard'),  tag: '1152×864'  },
  { value: '3:4',  label: ratioLabel('3:4',  '3:4 Portrait'),  tag: '864×1152'  },
];

const PROMPT_PRESETS: { tag: string; ratio: AspectRatio; prompt: string }[] = [
  {
    tag: 'Ghibli Sky Isles',
    ratio: '16:9',
    prompt: 'Sunlit floating clockwork sanctuary drifting through towering cumulus clouds at golden hour, lush overgrown moss and brass windmills, hand-painted Studio Ghibli cel animation aesthetic',
  },
  {
    tag: '70mm Sci-Fi Monolith',
    ratio: '16:9',
    prompt: 'Lone astronaut standing before a colossal levitating obsidian monolith on a black sand volcanic plain, rolling atmospheric fog, IMAX 70mm film grain, Denis Villeneuve brutalist scale',
  },
  {
    tag: 'Macro Glass Flora',
    ratio: '1:1',
    prompt: 'Translucent bioluminescent orchid sculpted from blown Venetian glass, glowing ultraviolet veins and morning dew droplets, dark velvet backdrop, 100mm macro lens, subsurface scattering',
  },
  {
    tag: 'Dark Gothic Sanctuary',
    ratio: '3:4',
    prompt: 'Ancient sunken cathedral library illuminated by floating candelabras and silver moonlight pouring through shattered rose windows, dust motes in volumetric god rays, dark fantasy oil painting',
  },
];

export const ImageStudioTab: React.FC<ImageStudioTabProps> = ({ config }) => {
  const [inputValue, setInputValue] = useState('');
  const [activeEngine, setActiveEngine] = useState<string>(() => {
    try {
      const s = localStorage.getItem(ACTIVE_ENGINE_KEY);
      if (s && ENGINE_OPTIONS.some(o => o.value === s)) return s;
    } catch {}
    return 'google:imagen-3.0-generate-002';
  });
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [enhance, setEnhance] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [generations, setGenerations] = useState<GeneratedImage[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (Array.isArray(p)) return p;
      }
    } catch {}
    return [];
  });

  const isDark =
    config.dashboardTheme === 'dark' ||
    (typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark')));

  const feedEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [generations.length]);

  const saveGenerations = (items: GeneratedImage[]) => {
    setGenerations(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 40)));
    } catch {}
  };

  const handleEngineChange = (val: string) => {
    setActiveEngine(val);
    try {
      localStorage.setItem(ACTIVE_ENGINE_KEY, val);
    } catch {}
  };

  const executeGeneration = async (
    promptText: string,
    engineKey: string,
    ar: AspectRatio,
    enh: boolean,
  ) => {
    const [provider, modelName] = engineKey.split(':');
    const seed = Math.floor(Math.random() * 9_000_000) + 1_000_000;

    if (provider === 'google') {
      const key = (
        config.geminiApiKey ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem(GEMINI_IMAGE_KEY) : '') ||
        ''
      ).trim();

      if (!key) {
        throw new Error('Gemini API key is missing. Please configure your key in Settings.');
      }

      const finalPrompt = enh
        ? `masterpiece, ultra-detailed, 8k, professional lighting, photorealistic: ${promptText}`
        : promptText;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: finalPrompt }],
            parameters: { sampleCount: 1, aspectRatio: ar, outputMimeType: 'image/jpeg' },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Google Imagen error (${res.status}).`);
      }

      const data = await res.json();
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) throw new Error('Google Imagen returned no image. Try adjusting your prompt.');
      return { finalImageUrl: `data:image/jpeg;base64,${b64}`, seed };
    }

    if (provider === 'openai') {
      const key = (config.openaiApiKey || '').trim();
      if (!key) {
        throw new Error('OpenAI API key is missing. Please configure your key in Settings.');
      }

      const finalPrompt = enh
        ? `${promptText}, ultra-detailed, photorealistic, 8k resolution`
        : promptText;

      const size =
        ar === '16:9' ? '1792x1024' :
        ar === '9:16' ? '1024x1792' :
        '1024x1024';

      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: modelName,
          prompt: finalPrompt,
          n: 1,
          size,
          response_format: 'b64_json',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenAI error (${res.status}).`);
      }

      const data = await res.json();
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) throw new Error('OpenAI returned no image.');
      return { finalImageUrl: `data:image/png;base64,${b64}`, seed };
    }

    throw new Error('Unsupported engine.');
  };

  const handleGenerate = async (customPrompt?: string, overrideEngine?: string) => {
    const promptText = (customPrompt ?? inputValue).trim();
    if (!promptText || isGenerating) return;

    const engineToUse = overrideEngine ?? activeEngine;
    setInputValue('');
    setIsGenerating(true);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const entry: GeneratedImage = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      prompt: promptText,
      url: '',
      engine: engineToUse,
      aspectRatio,
      seed: 0,
      enhance,
      timestamp: timeStr,
    };

    setGenerations(prev => [...prev, entry]);

    try {
      const { finalImageUrl, seed } = await executeGeneration(promptText, engineToUse, aspectRatio, enhance);
      saveGenerations([...generations, { ...entry, url: finalImageUrl, seed }]);
    } catch (err: any) {
      saveGenerations([...generations, { ...entry, error: err.message || 'Generation failed.' }]);
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
    if (item.url.startsWith('data:')) {
      const a = Object.assign(document.createElement('a'), {
        href: item.url,
        download: `grokki_${item.id}.jpg`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    try {
      const blob = await (await fetch(item.url)).blob();
      const burl = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: burl,
        download: `grokki_${item.id}.png`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(burl);
    } catch {
      window.open(item.url, '_blank');
    }
  };

  // Shared GlideSelect styling
  const glideProps = {
    size: 'sm' as const,
    radius: 8,
    surfaceColor: isDark ? '#1a1c24' : '#f3f4f6',
    highlightColor: isDark ? '#272a38' : '#e5e7eb',
    textColor: isDark ? '#f3f4f6' : '#111827',
    accentColor: isDark ? '#e5e7eb' : '#111827',
    placement: 'top' as const,
    align: 'left' as const,
    menuWidth: 220,
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#f7f7fa] dark:bg-[#070709] text-gray-900 dark:text-gray-100 overflow-hidden select-none">
      {/* DriftWall Background (visible on empty state) */}
      {generations.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -inset-x-36 -inset-y-16 z-0 overflow-hidden pointer-events-none"
        >
          <DriftWall
            items={DRIFT_ITEMS}
            columns={8}
            tileWidth={300}
            tileHeight={195}
            gap={24}
            tilt={22}
            turn={-20}
            perspective={1200}
            depth={160}
            speed={38}
            direction="up"
            variance={0.45}
            parallax={0.65}
            lift={68}
            fade={0.15}
            dim={0.55}
            overlayColor={isDark ? '#060010' : '#f7f7fa'}
            radius={10}
            roll={-4}
            pauseOnHover={false}
            grayscale={false}
            className="w-full h-full"
          />
        </motion.div>
      )}

      {/* Main Content Stage */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 min-h-0 relative z-20 flex flex-col">
        {generations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
            <motion.h1
              initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl sm:text-[4em] mb-7 font-normal text-gray-900 dark:text-white tracking-wide"
              style={{
                fontFamily: "'Caveat', 'Dancing Script', 'Great Vibes', 'Brush Script MT', 'Segoe Script', cursive",
              }}
            >
              Grokki{' '}
              <span className="relative inline-block">
                <svg
                  viewBox="0 0 320 96"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-x-2 -bottom-2 top-1 w-[calc(100%+16px)] h-[calc(100%+10px)] overflow-visible z-0"
                >
                  <defs>
                    <filter id="grokki-crayon-grain" x="-15%" y="-25%" width="130%" height="150%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.75 0.95" numOctaves="4" seed="19" result="noise" />
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.2" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                    <linearGradient id="grokki-crayon-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="50%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                  {/* Wax-pastel highlighter swipe behind "Image Studio" */}
                  <motion.path
                    d="M 6 54 Q 158 44 314 51"
                    fill="none"
                    stroke="url(#grokki-crayon-grad)"
                    strokeWidth="36"
                    strokeLinecap="round"
                    filter="url(#grokki-crayon-grain)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: isDark ? 0.24 : 0.18 }}
                    transition={{ duration: 0.65, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  />
                  {/* Primary hand-sketched crayon underline stroke */}
                  <motion.path
                    d="M 4 84 C 98 76, 214 75, 316 82"
                    fill="none"
                    stroke="url(#grokki-crayon-grad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#grokki-crayon-grain)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.92 }}
                    transition={{ duration: 0.6, delay: 0.52, ease: [0.22, 1, 0.36, 1] }}
                  />
                  {/* Secondary crayon return scribble stroke */}
                  <motion.path
                    d="M 34 91 C 132 85, 226 86, 294 89"
                    fill="none"
                    stroke="url(#grokki-crayon-grad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    filter="url(#grokki-crayon-grain)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.7 }}
                    transition={{ duration: 0.45, delay: 0.78, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>
                <span className="relative z-10">Image Studio</span>
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl rounded-xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/90 backdrop-blur-md px-5 py-4 text-left shadow-lg"
            >
              <div className="text-[11.5px] font-medium text-gray-400 dark:text-gray-500 pb-2">
                Start from an example
              </div>
              <div className="flex flex-col divide-y divide-gray-200/80 dark:divide-white/[0.07]">
                {PROMPT_PRESETS.map(preset => (
                  <button
                    key={preset.tag}
                    type="button"
                    onClick={() => {
                      setInputValue(preset.prompt);
                      setAspectRatio(preset.ratio);
                      inputRef.current?.focus();
                    }}
                    className="group flex items-center justify-between gap-3 py-2.5 -mx-2 px-2 text-left hover:bg-gray-100/80 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-gray-800 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                        {preset.tag}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 tabular-nums shrink-0 transition-colors">
                      <RatioBoxIcon ratio={preset.ratio} className="w-3.5 h-3.5" />
                      <span>{preset.ratio}</span>
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
            {generations.map(item => (
              <div key={item.id} className="flex flex-col gap-2.5 w-full">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-white dark:bg-[#1a1a20] border border-gray-200 dark:border-white/[0.07] text-gray-800 dark:text-gray-100 px-3 py-2 rounded-lg text-[13px] leading-relaxed">
                    {item.prompt}
                  </div>
                </div>

                {/* Assistant response */}
                <div className="flex items-start gap-2.5">
                  <img
                    src={grokkiIcon}
                    alt="Grokki"
                    className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 select-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">Grokki</span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{item.timestamp}</span>
                      {item.engine && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          {ENGINE_OPTIONS.find(o => o.value === item.engine)?.tag || item.engine}
                        </span>
                      )}
                    </div>

                    {item.error ? (
                      <div className="flex gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 max-w-sm">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-red-700 dark:text-red-400 mb-0.5">Generation failed</p>
                          <p className="text-[11px] text-red-600/75 dark:text-red-400/60 leading-relaxed">{item.error}</p>
                          <div className="flex gap-1.5 mt-2.5">
                            <button
                              type="button"
                              onClick={() => handleGenerate(item.prompt, item.engine)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : item.url ? (
                      <div className="relative inline-block rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.08] group max-w-[420px]">
                        <img
                          src={item.url}
                          alt={item.prompt}
                          className="w-full h-auto block"
                        />
                        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/70 rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <WarmTooltip content={copiedId === item.id ? 'Copied' : 'Copy prompt'} side="top">
                            <button
                              type="button"
                              onClick={() => handleCopyPrompt(item.prompt, item.id)}
                              className="w-7 h-7 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              {copiedId === item.id
                                ? <Check className="w-3.5 h-3.5 text-green-400" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </WarmTooltip>
                          <WarmTooltip content="Download" side="top">
                            <button
                              type="button"
                              onClick={() => handleDownload(item)}
                              className="w-7 h-7 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </WarmTooltip>
                          <WarmTooltip content="Regenerate" side="top">
                            <button
                              type="button"
                              onClick={() => handleGenerate(item.prompt, item.engine)}
                              className="w-7 h-7 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </WarmTooltip>
                        </div>
                      </div>
                    ) : (
                      <div className="w-56 h-56 rounded-lg bg-gray-100 dark:bg-[#131317] border border-gray-200 dark:border-white/[0.06] flex flex-col items-center justify-center gap-2">
                        <div className="w-5 h-5 rounded-full border-[1.5px] border-gray-300 dark:border-white/20 border-t-gray-700 dark:border-t-white/60 animate-spin" />
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          Generating image…
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={feedEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className={`flex-shrink-0 px-5 sm:px-8 pt-2 relative z-30 ${generations.length === 0 ? 'pb-6 sm:pb-8' : 'pb-4'}`}
      >
        <div className="max-w-[680px] mx-auto">
          <SpecularButton
            as="div"
            size="lg"
            radius={14}
            tint={isDark ? '#ffffff' : '#000000'}
            tintOpacity={0.03}
            textColor={isDark ? '#f5f5f5' : '#18181b'}
            lineColor={isDark ? '#ffffff' : '#18181b'}
            baseColor={isDark ? '#525252' : '#d4d4d8'}
            intensity={0.6}
            idleIntensity={0.15}
            shineSize={8}
            shineFade={34}
            thickness={1}
            glow={0}
            followMouse={false}
            autoAnimate={false}
            proximity={200}
            className="w-full bg-white dark:bg-[#121217] p-3 flex flex-col gap-2 text-left relative z-20"
          >
            {/* Textarea */}
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                rows={Math.min(6, Math.max(2, inputValue.split('\n').length))}
                placeholder="Describe an image"
                autoFocus
                className="w-full min-h-[48px] bg-transparent resize-none border-none outline-none text-[13.5px] leading-relaxed text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 p-0 pr-6"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => { setInputValue(''); inputRef.current?.focus(); }}
                  title="Clear prompt"
                  className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] text-xs transition-colors cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/70 dark:border-white/[0.07]">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                {/* Model dropdown */}
                <GlideSelect
                  options={ENGINE_OPTIONS}
                  value={activeEngine}
                  onChange={handleEngineChange}
                  {...glideProps}
                  menuWidth={230}
                />

                {/* Aspect ratio */}
                <GlideSelect
                  options={ASPECT_OPTIONS}
                  value={aspectRatio}
                  onChange={v => setAspectRatio(v as AspectRatio)}
                  {...glideProps}
                  menuWidth={210}
                />

                {/* Enhance toggle */}
                <WarmTooltip content={enhance ? 'Prompt enhancer: on' : 'Prompt enhancer: off'} side="top">
                  <button
                    type="button"
                    onClick={() => setEnhance(e => !e)}
                    className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-medium transition-colors cursor-pointer border ${
                      enhance
                        ? 'bg-gray-900/[0.06] dark:bg-white/10 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-white/20'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-transparent hover:border-gray-200 dark:hover:border-white/10'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="hidden sm:inline">Enhance</span>
                  </button>
                </WarmTooltip>
              </div>

              {/* Right: clear history + generate button */}
              <div className="flex items-center gap-1.5 shrink-0">
                {generations.length > 0 && (
                  <WarmTooltip content="Clear history" side="top">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear image history?')) saveGenerations([]);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </WarmTooltip>
                )}

                <button
                  type="button"
                  disabled={!inputValue.trim() || isGenerating}
                  onClick={() => handleGenerate()}
                  className={`h-7 px-3 flex items-center justify-center gap-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                    inputValue.trim() && !isGenerating
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90 cursor-pointer'
                      : 'bg-gray-100 dark:bg-white/[0.07] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span>Generating</span>
                    </>
                  ) : (
                    <>
                      <span>Generate</span>
                      <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </SpecularButton>
        </div>
      </motion.div>
    </div>
  );
};

export default ImageStudioTab;
