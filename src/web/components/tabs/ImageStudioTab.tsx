import React, { useState, useEffect, useRef } from 'react';
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
  Key,
  ExternalLink,
  CheckCircle2,
  Zap,
  Server,
  Cloud,
} from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AiImageIcon } from '@hugeicons/core-free-icons';
import { JarvisConfig } from '../../types/jarvis';
import SpecularButton from '../../../effects/SpecularButton';
import DriftWall from '../../../effects/DriftWall';
import GlideSelect, { GlideSelectOption } from './GlideSelect';
import WarmTooltip from '../WarmTooltip';
import grokkiIcon from '../../assets/grokki_icon.svg';

interface ImageStudioTabProps {
  config: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type EngineProvider = 'bytedance' | 'proxy' | 'google' | 'together' | 'pollinations';

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
const GEMINI_IMAGE_KEY = 'grokki_gemini_image_key';
const TOGETHER_KEY = 'grokki_together_image_key';
const PROXY_ENDPOINT_KEY = 'grokki_image_proxy_endpoint';
const PROXY_KEY_KEY = 'grokki_image_proxy_key';
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

const ENGINE_OPTIONS: GlideSelectOption[] = [
  { value: 'bytedance:seedance-2.5',                           label: 'Seedance 2.5',              group: 'ByteDance' },
  { value: 'bytedance:jimeng-v2',                              label: 'Jimeng / Dreamina',          group: 'ByteDance' },
  { value: 'bytedance:doubao-image',                           label: 'Doubao AI',                  group: 'ByteDance' },
  { value: 'proxy:dall-e-3',                                   label: 'DALL-E 3 (Coze proxy)',      group: 'Reverse proxies' },
  { value: 'proxy:flux-pro',                                   label: 'FLUX Pro (custom proxy)',    group: 'Reverse proxies' },
  { value: 'google:imagen-3.0-generate-002',                   label: 'Imagen 3 Ultra',             group: 'Google' },
  { value: 'google:imagen-3.0-fast-generate-001',              label: 'Imagen 3 Fast',              group: 'Google' },
  { value: 'together:black-forest-labs/FLUX.1-schnell-Free',   label: 'FLUX.1 Schnell',             group: 'Together AI' },
  { value: 'pollinations:turbo',                               label: 'SDXL Turbo — instant',       group: 'Free cloud' },
  { value: 'pollinations:flux',                                label: 'FLUX.1 Standard',            group: 'Free cloud' },
  { value: 'pollinations:flux-anime',                          label: 'FLUX Anime',                 group: 'Free cloud' },
  { value: 'pollinations:flux-realism',                        label: 'FLUX Realism',               group: 'Free cloud' },
];

const ASPECT_OPTIONS: GlideSelectOption[] = [
  { value: '1:1',  label: '1:1 Square'     },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '9:16', label: '9:16 Portrait'  },
  { value: '4:3',  label: '4:3 Standard'   },
  { value: '3:4',  label: '3:4 Portrait'   },
];

const PROMPT_PRESETS: { tag: string; ratio: AspectRatio; prompt: string }[] = [
  {
    tag: 'Cyberpunk Noir',
    ratio: '16:9',
    prompt: 'Porcelain-armored ronin standing in a rain-slicked Neo-Tokyo alley at midnight, neon kanji reflections in puddles, anamorphic 35mm lens, shallow depth of field, cinematic teal and amber lighting',
  },
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

export const ImageStudioTab: React.FC<ImageStudioTabProps> = ({ config, onChangeConfig }) => {
  const [inputValue, setInputValue] = useState('');
  const [activePresetIdx, setActivePresetIdx] = useState(0);

  const [activeEngine, setActiveEngine] = useState<string>(() => {
    try { const s = localStorage.getItem(ACTIVE_ENGINE_KEY); if (s) return s; } catch {}
    return config.geminiApiKey?.trim() ? 'google:imagen-3.0-generate-002' : 'pollinations:turbo';
  });

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [enhance, setEnhance]         = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId]       = useState<string | null>(null);

  const [geminiKey, setGeminiKey]     = useState<string>(() => { try { return localStorage.getItem(GEMINI_IMAGE_KEY) || config.geminiApiKey || ''; } catch { return config.geminiApiKey || ''; } });
  const [togetherKey, setTogetherKey] = useState<string>(() => { try { return localStorage.getItem(TOGETHER_KEY) || ''; } catch { return ''; } });
  const [proxyEndpoint, setProxyEndpoint] = useState<string>(() => { try { return localStorage.getItem(PROXY_ENDPOINT_KEY) || 'http://localhost:8000/v1'; } catch { return 'http://localhost:8000/v1'; } });
  const [proxyKey, setProxyKey]       = useState<string>(() => { try { return localStorage.getItem(PROXY_KEY_KEY) || ''; } catch { return ''; } });

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [modalTab, setModalTab]         = useState<'bytedance' | 'cloud'>('bytedance');
  const [testingProxy, setTestingProxy] = useState(false);
  const [proxyStatus, setProxyStatus]   = useState<{ ok: boolean; msg: string } | null>(null);

  const [generations, setGenerations] = useState<GeneratedImage[]>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) { const p = JSON.parse(s); if (Array.isArray(p)) return p; }
    } catch {}
    return [];
  });

  const isDark =
    config.dashboardTheme === 'dark' ||
    (typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark')));

  const feedEndRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (config.geminiApiKey && !geminiKey) setGeminiKey(config.geminiApiKey); }, [config.geminiApiKey]);
  useEffect(() => { feedEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [generations.length]);

  const saveGenerations = (items: GeneratedImage[]) => {
    setGenerations(items);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 40))); } catch {}
  };

  const handleEngineChange = (val: string) => {
    setActiveEngine(val);
    try { localStorage.setItem(ACTIVE_ENGINE_KEY, val); } catch {}
  };

  const handleSaveTokens = () => {
    try {
      localStorage.setItem(GEMINI_IMAGE_KEY,   geminiKey.trim());
      localStorage.setItem(TOGETHER_KEY,       togetherKey.trim());
      localStorage.setItem(PROXY_ENDPOINT_KEY, proxyEndpoint.trim());
      localStorage.setItem(PROXY_KEY_KEY,      proxyKey.trim());
    } catch {}
    if (geminiKey.trim() && onChangeConfig) onChangeConfig({ geminiApiKey: geminiKey.trim() });
    setShowKeyModal(false);
  };

  const handleCheckProxy = async () => {
    setTestingProxy(true);
    setProxyStatus(null);
    const endpoint = (proxyEndpoint.trim() || 'http://localhost:8000/v1').replace(/\/+$/, '');
    try {
      const headers: Record<string, string> = {};
      if (proxyKey.trim()) headers['Authorization'] = `Bearer ${proxyKey.trim()}`;
      const res = await fetch(`${endpoint}/models`, { headers });
      setProxyStatus(res.ok
        ? { ok: true,  msg: 'Proxy is online and ready.' }
        : { ok: false, msg: `Proxy responded with status ${res.status}.` });
    } catch {
      setProxyStatus({ ok: false, msg: `No response at ${endpoint}. Make sure your container is running.` });
    } finally {
      setTestingProxy(false);
    }
  };

  const executeGeneration = async (
    promptText: string,
    engineKey: string,
    ar: AspectRatio,
    enh: boolean,
  ) => {
    const [provider, modelName] = engineKey.split(':');
    const { width, height }     = ASPECT_DIMS[ar];
    const seed = Math.floor(Math.random() * 9_000_000) + 1_000_000;

    if (provider === 'bytedance' || provider === 'proxy') {
      const endpoint = (proxyEndpoint.trim() || 'http://localhost:8000/v1').replace(/\/+$/, '');
      const url = endpoint.endsWith('/images/generations') ? endpoint : `${endpoint}/images/generations`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (proxyKey.trim()) headers['Authorization'] = `Bearer ${proxyKey.trim()}`;
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST', headers,
          body: JSON.stringify({
            model: modelName,
            prompt: enh ? `${promptText}, 8k resolution, ultra-detailed masterpiece` : promptText,
            n: 1,
            size: `${width}x${height}`,
          }),
        });
      } catch {
        throw new Error(`Proxy not reachable at ${endpoint}. Start your container or switch to a free cloud model.`);
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Proxy returned status ${response.status}.`);
      }
      const data = await response.json();
      if (data.data?.[0]?.b64_json) return { finalImageUrl: `data:image/jpeg;base64,${data.data[0].b64_json}`, seed };
      if (data.data?.[0]?.url)      return { finalImageUrl: data.data[0].url, seed };
      if (data.images?.[0]) {
        const img = data.images[0];
        return { finalImageUrl: img.startsWith('http') || img.startsWith('data:') ? img : `data:image/png;base64,${img}`, seed };
      }
      throw new Error('Proxy responded without image data.');
    }

    if (provider === 'google') {
      const key = (geminiKey || config.geminiApiKey || '').trim();
      if (!key) { setShowKeyModal(true); setModalTab('cloud'); throw new Error('Add your Gemini API key in Engine setup to use Google Imagen 3.'); }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: enh ? `masterpiece, ultra-detailed, 8k, professional lighting, photorealistic: ${promptText}` : promptText }],
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
      if (!b64) throw new Error('Google Imagen returned no image. Try a different prompt.');
      return { finalImageUrl: `data:image/jpeg;base64,${b64}`, seed };
    }

    if (provider === 'together') {
      if (!togetherKey.trim()) { setShowKeyModal(true); setModalTab('cloud'); throw new Error('Add your Together AI key in Engine setup.'); }
      const res = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${togetherKey.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: enh ? `${promptText}, 8k resolution, highly detailed, photorealistic masterpiece` : promptText,
          width, height, steps: 4, n: 1,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Together AI error (${res.status}).`);
      }
      const data = await res.json();
      return { finalImageUrl: data.data?.[0]?.url || '', seed };
    }

    // Pollinations free cloud
    const enc    = encodeURIComponent(promptText.trim());
    const cb     = `${Date.now()}`;
    const imgUrl = `https://image.pollinations.ai/prompt/${enc}?model=${modelName}&width=${width}&height=${height}&seed=${seed}&nologo=true&private=true&enhance=${enh}&cb=${cb}`;
    await new Promise<void>((res, rej) => {
      const img = new Image();
      img.src     = imgUrl;
      img.onload  = () => res();
      img.onerror = () => rej(new Error('Image failed to load. Try SDXL Turbo or another model.'));
    });
    return { finalImageUrl: imgUrl, seed };
  };

  const handleGenerate = async (customPrompt?: string, overrideEngine?: string) => {
    const promptText = (customPrompt ?? inputValue).trim();
    if (!promptText || isGenerating) return;

    const engineToUse = overrideEngine ?? activeEngine;
    setInputValue('');
    setIsGenerating(true);

    const [provider, modelName] = engineToUse.split(':');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const entry: GeneratedImage = {
      id:          `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      prompt:      promptText,
      url:         '',
      provider:    provider as EngineProvider,
      model:       modelName,
      aspectRatio,
      seed:        0,
      enhance,
      timestamp:   timeStr,
    };

    setGenerations(prev => [...prev, entry]);

    try {
      const { finalImageUrl, seed } = await executeGeneration(promptText, engineToUse, aspectRatio, enhance);
      saveGenerations([...generations, { ...entry, url: finalImageUrl, seed }]);
    } catch (err: any) {
      saveGenerations([...generations, { ...entry, error: err.message || 'Generation failed. Please try again.' }]);
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
      const a = Object.assign(document.createElement('a'), { href: item.url, download: `grokki_${item.id}.jpg` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      return;
    }
    try {
      const blob = await (await fetch(item.url)).blob();
      const burl = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: burl, download: `grokki_${item.id}.png` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(burl);
    } catch { window.open(item.url, '_blank'); }
  };

  // ── Shared GlideSelect theme ──────────────────────────────────────────────
  const glideProps = {
    size:          'sm'  as const,
    radius:        8,
    surfaceColor:  isDark ? '#1a1c24' : '#f3f4f6',
    highlightColor: isDark ? '#272a38' : '#e5e7eb',
    textColor:     isDark ? '#f3f4f6' : '#111827',
    accentColor:   isDark ? '#38bdf8' : '#0284c7',
    placement:     'top' as const,
    align:         'left' as const,
    menuWidth:     295,
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#f7f7fa] dark:bg-[#070709] text-gray-900 dark:text-gray-100 overflow-hidden select-none">

      {/* ── DriftWall Background (Full-bleed across sidebar, disappears on prompt) ── */}
      {generations.length === 0 && (
        <div className="absolute -inset-x-36 -inset-y-16 z-0 overflow-hidden pointer-events-none transition-opacity duration-700 animate-in fade-in">
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
            dim={0.48}
            overlayColor={isDark ? '#060010' : '#f7f7fa'}
            radius={18}
            roll={-4}
            pauseOnHover={false}
            grayscale={false}
            className="w-full h-full"
          />
        </div>
      )}

      {/* ── Main Content Stage (Intro Hero when empty, Chat Feed when active) ── */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 min-h-0 relative z-20 flex flex-col">
        {generations.length === 0 ? (
          <div
            className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6 animate-in fade-in zoom-in-95 duration-500"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse 56% 52% at 50% 50%, rgba(6, 0, 16, 0.72) 0%, rgba(6, 0, 16, 0.34) 58%, transparent 100%)'
                : 'radial-gradient(ellipse 56% 52% at 50% 50%, rgba(247, 247, 250, 0.85) 0%, rgba(247, 247, 250, 0.42) 58%, transparent 100%)',
            }}
          >
            {/* Cursive Display Title — zero textShadow */}
            <h1
              className="text-6xl sm:text-7xl md:text-[84px] font-semibold text-gray-900 dark:text-white tracking-tight leading-[1.08]"
              style={{
                fontFamily: "'Dancing Script', 'Great Vibes', 'Caveat', cursive",
              }}
            >
              Grokki Image Studio
            </h1>

            {/* Editorial Subtitle */}
            <p className="mt-3 text-[14px] sm:text-[15.5px] text-gray-600 dark:text-white/75 font-normal max-w-lg mx-auto leading-relaxed tracking-[-0.01em]">
              Transform raw imagination into cinema-grade frames, concept art, and photorealistic renders.
            </p>

            {/* Interactive Example Prompt Showcase */}
            <div className="mt-6 w-full max-w-xl mx-auto flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const preset = PROMPT_PRESETS[activePresetIdx];
                  setInputValue(preset.prompt);
                  setAspectRatio(preset.ratio);
                  inputRef.current?.focus();
                }}
                className="w-full group text-left px-4 py-3 rounded-2xl bg-white/75 dark:bg-[#111116]/80 hover:bg-white/95 dark:hover:bg-[#16161d]/90 backdrop-blur-md border border-gray-200/80 dark:border-white/[0.09] hover:border-gray-300 dark:hover:border-white/[0.18] transition-all duration-200 cursor-pointer shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-sky-600 dark:text-sky-400">
                    Sample Prompt · {PROMPT_PRESETS[activePresetIdx].tag} ({PROMPT_PRESETS[activePresetIdx].ratio})
                  </span>
                  <span className="text-[11px] font-medium text-gray-400 dark:text-white/45 group-hover:text-gray-800 dark:group-hover:text-white/85 transition-colors">
                    Use prompt ↗
                  </span>
                </div>
                <p className="text-[12.5px] sm:text-[13px] text-gray-700 dark:text-white/80 italic leading-relaxed line-clamp-2">
                  &ldquo;{PROMPT_PRESETS[activePresetIdx].prompt}&rdquo;
                </p>
              </button>

              {/* Quick Style Preset Pills */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {PROMPT_PRESETS.map((preset, idx) => {
                  const isSelected = idx === activePresetIdx;
                  return (
                    <button
                      key={preset.tag}
                      type="button"
                      onMouseEnter={() => setActivePresetIdx(idx)}
                      onClick={() => {
                        setActivePresetIdx(idx);
                        setInputValue(preset.prompt);
                        setAspectRatio(preset.ratio);
                        inputRef.current?.focus();
                      }}
                      className={`px-3 py-1 rounded-full text-[11.5px] font-medium backdrop-blur-md transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-gray-900/90 dark:bg-white/15 text-white border border-gray-900 dark:border-white/25'
                          : 'bg-white/60 dark:bg-white/[0.05] text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white/90 border border-gray-200/70 dark:border-white/[0.08]'
                      }`}
                    >
                      {preset.tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
            {/* Messages */}
            {generations.map(item => (
            <div key={item.id} className="flex flex-col gap-2.5 w-full animate-in fade-in duration-200">

              {/* User bubble */}
              <div className="flex justify-end">
                <div className="max-w-[75%] bg-white dark:bg-[#1a1a20] border border-gray-200/80 dark:border-white/[0.07] text-gray-800 dark:text-gray-100 px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-[13px] leading-relaxed shadow-sm">
                  {item.prompt}
                </div>
              </div>

              {/* Assistant row */}
              <div className="flex items-start gap-2.5">
                <img
                  src={grokkiIcon}
                  alt="Grokki"
                  className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 select-none"
                />
                <div className="flex-1 min-w-0">
                  {/* Meta */}
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">Grokki</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{item.timestamp}</span>
                    <span className="text-[10px] font-mono px-1.5 py-px rounded-md bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.07] text-gray-400 dark:text-gray-500">
                      {item.model}
                    </span>
                  </div>

                  {/* Error */}
                  {item.error ? (
                    <div className="flex gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 max-w-sm">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-red-700 dark:text-red-400 mb-0.5">Generation failed</p>
                        <p className="text-[11px] text-red-600/75 dark:text-red-400/60 leading-relaxed">{item.error}</p>
                        <div className="flex gap-1.5 mt-2.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleGenerate(item.prompt)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" /> Retry
                          </button>
                          {item.provider !== 'pollinations' && (
                            <button
                              type="button"
                              onClick={() => { handleEngineChange('pollinations:turbo'); handleGenerate(item.prompt, 'pollinations:turbo'); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                            >
                              <Zap className="w-3 h-3" /> Try free cloud
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  /* Image */
                  ) : item.url ? (
                    <div className="relative inline-block rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.08] group max-w-[420px]">
                      <img
                        src={item.url}
                        alt={item.prompt}
                        className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.004]"
                      />
                      {/* Hover actions */}
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-0.5 bg-black/55 backdrop-blur-md border border-white/10 rounded-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <WarmTooltip content={copiedId === item.id ? 'Copied!' : 'Copy prompt'} side="top">
                          <button
                            type="button"
                            onClick={() => handleCopyPrompt(item.prompt, item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                            className="w-7 h-7 flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </WarmTooltip>
                        <WarmTooltip content="Regenerate" side="top">
                          <button
                            type="button"
                            onClick={() => handleGenerate(item.prompt)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </WarmTooltip>
                      </div>
                    </div>

                  /* Loading skeleton */
                  ) : (
                    <div className="w-56 h-56 rounded-xl bg-gray-100 dark:bg-[#131317] border border-gray-200 dark:border-white/[0.06] flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 rounded-full border-[1.5px] border-gray-300 dark:border-white/20 border-t-gray-700 dark:border-t-white/60 animate-spin" />
                      <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                        {item.model}…
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

      {/* ── Composer ─────────────────────────────────────────────────────────── */}
      <div className={`flex-shrink-0 px-5 sm:px-8 pt-2 relative z-30 transition-all duration-300 ${generations.length === 0 ? 'pb-8 sm:pb-10' : 'pb-5'}`}>
        <div className="max-w-[680px] mx-auto">
          <SpecularButton
            as="div"
            size="lg"
            radius={22}
            tint={isDark ? '#ffffff' : '#000000'}
            tintOpacity={0.04}
            textColor={isDark ? '#f5f5f5' : '#18181b'}
            lineColor={isDark ? '#ffffff' : '#18181b'}
            baseColor={isDark ? '#525252' : '#d4d4d8'}
            intensity={1}
            idleIntensity={0.35}
            shineSize={10}
            shineFade={34}
            thickness={1.2}
            glow={1}
            followMouse={false}
            autoAnimate
            proximity={250}
            className="w-full bg-white/95 dark:bg-[#121217]/95 backdrop-blur-xl shadow-lg hover:shadow-xl p-4 sm:p-4.5 transition-shadow flex flex-col gap-3 text-left relative z-20"
          >
            {/* Textarea */}
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
                }}
                rows={Math.min(7, Math.max(3, inputValue.split('\n').length))}
                placeholder="Describe subject, lighting, camera lens & mood — or pick a sample prompt above to begin…"
                autoFocus
                className="w-full min-h-[82px] sm:min-h-[94px] bg-transparent resize-none border-none outline-none text-[13.5px] sm:text-[14px] leading-relaxed text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 p-0 pr-6"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => { setInputValue(''); inputRef.current?.focus(); }}
                  title="Clear prompt"
                  className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] text-xs transition-colors cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-gray-200/70 dark:border-white/[0.07]">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">

                {/* Engine */}
                <GlideSelect
                  options={ENGINE_OPTIONS}
                  value={activeEngine}
                  onChange={handleEngineChange}
                  {...glideProps}
                />

                {/* Aspect ratio */}
                <GlideSelect
                  options={ASPECT_OPTIONS}
                  value={aspectRatio}
                  onChange={v => setAspectRatio(v as AspectRatio)}
                  {...glideProps}
                  menuWidth={180}
                />

                {/* Magic toggle */}
                <WarmTooltip content={enhance ? 'Magic prompt enhancer: on' : 'Magic prompt enhancer: off'} side="top">
                  <button
                    type="button"
                    onClick={() => setEnhance(e => !e)}
                    className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11.5px] font-medium transition-colors cursor-pointer ${
                      enhance
                        ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/25'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-transparent hover:border-gray-200 dark:hover:border-white/10'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="hidden sm:inline">Magic</span>
                  </button>
                </WarmTooltip>
              </div>

              {/* Right: settings + clear + send */}
              <div className="flex items-center gap-1.5 shrink-0">
                <WarmTooltip content="Configure engines & keys" side="top">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(true)}
                    className="h-7 px-2.5 flex items-center gap-1.5 rounded-lg text-[11.5px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-colors cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Engines</span>
                  </button>
                </WarmTooltip>

                {generations.length > 0 && (
                  <WarmTooltip content="Clear history" side="top">
                    <button
                      type="button"
                      onClick={() => { if (confirm('Clear image history?')) saveGenerations([]); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </WarmTooltip>
                )}

                <button
                  type="button"
                  disabled={!inputValue.trim() || isGenerating}
                  onClick={() => handleGenerate()}
                  className={`h-8 px-3.5 flex items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold transition-all ${
                    inputValue.trim() && !isGenerating
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-95 cursor-pointer shadow-sm'
                      : 'bg-gray-100 dark:bg-white/[0.07] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span>Rendering</span>
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
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {showKeyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowKeyModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-[#15151b] border border-gray-200 dark:border-white/[0.09] rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06] flex-shrink-0">
              <div>
                <h3 className="text-[13.5px] font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-gray-400" />
                  Engine setup
                </h3>
                <p className="text-[11.5px] text-gray-400 dark:text-gray-500 mt-0.5">
                  Configure providers and API credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer -mt-0.5 -mr-0.5"
              >
                ×
              </button>
            </div>

            {/* Modal tabs */}
            <div className="flex border-b border-gray-100 dark:border-white/[0.06] px-5 flex-shrink-0">
              {(['bytedance', 'cloud'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setModalTab(tab)}
                  className={`flex items-center gap-1.5 py-3 mr-5 text-[12px] font-medium border-b-2 transition-colors cursor-pointer -mb-px ${
                    modalTab === tab
                      ? 'border-gray-900 dark:border-white text-gray-900 dark:text-gray-100'
                      : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                  }`}
                >
                  {tab === 'bytedance' ? <Server className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
                  {tab === 'bytedance' ? 'ByteDance / Seedance' : 'Cloud keys'}
                </button>
              ))}
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto px-5 py-5 flex flex-col gap-4 flex-1">

              {/* ── ByteDance tab ── */}
              {modalTab === 'bytedance' && (
                <>
                  <p className="text-[11.5px] text-gray-400 dark:text-gray-500 leading-relaxed">
                    Run a local reverse proxy container, then point the URL below to it. All models under ByteDance and Reverse Proxies route here.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'iptag/jimeng-api',    href: 'https://github.com/iptag/jimeng-api',                   desc: 'Jimeng & Dreamina reverse API'    },
                      { name: 'doubao2api',           href: 'https://github.com/wangchuxiaoji-oss/doubao2api',       desc: 'Doubao OpenAI-compatible proxy'   },
                      { name: 'coze-discord-proxy',  href: 'https://github.com/deanxv/coze-discord-proxy',         desc: 'Free DALL-E 3 via Coze'          },
                      { name: 'Seedance-2.5-API',    href: 'https://github.com/SamurAIGPT/Seedance-2.5-API',       desc: 'Seedance 2.5 client and SDK'     },
                    ].map(r => (
                      <a
                        key={r.name}
                        href={r.href}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] hover:border-gray-200 dark:hover:border-white/[0.12] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[11.5px] font-medium text-gray-800 dark:text-gray-200">{r.name}</span>
                          <ExternalLink className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        </div>
                        <p className="text-[10.5px] text-gray-400 dark:text-gray-500 leading-relaxed">{r.desc}</p>
                      </a>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11.5px] font-medium text-gray-600 dark:text-gray-400">Proxy base URL</label>
                      <button
                        type="button"
                        disabled={testingProxy}
                        onClick={handleCheckProxy}
                        className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {testingProxy && <RefreshCw className="w-3 h-3 animate-spin" />}
                        Check status
                      </button>
                    </div>
                    <input
                      type="text"
                      value={proxyEndpoint}
                      onChange={e => setProxyEndpoint(e.target.value)}
                      placeholder="http://localhost:8000/v1"
                      className="w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-white/[0.03] text-[12px] font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-white/20 transition-colors"
                    />
                    {proxyStatus && (
                      <p className={`flex items-center gap-1.5 text-[11px] mt-1.5 ${proxyStatus.ok ? 'text-green-500' : 'text-amber-500'}`}>
                        {proxyStatus.ok
                          ? <CheckCircle2 className="w-3.5 h-3.5" />
                          : <AlertCircle className="w-3.5 h-3.5" />}
                        {proxyStatus.msg}
                      </p>
                    )}
                    <p className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1">
                      Routes <code className="font-mono">/images/generations</code> to your container.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Proxy auth key <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="password"
                      value={proxyKey}
                      onChange={e => setProxyKey(e.target.value)}
                      placeholder="sk-… or leave empty for local"
                      className="w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-white/[0.09] bg-gray-50 dark:bg-white/[0.03] text-[12px] font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-white/20 transition-colors"
                    />
                  </div>
                </>
              )}

              {/* ── Cloud keys tab ── */}
              {modalTab === 'cloud' && (
                <>
                  {/* Google Imagen */}
                  <div className="p-4 rounded-xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.02] flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-medium text-gray-900 dark:text-gray-100">Google Imagen 3</span>
                        <span className="text-[10px] px-1.5 py-px rounded-md bg-sky-50 dark:bg-sky-500/10 text-sky-500 border border-sky-100 dark:border-sky-500/20">Ultra quality</span>
                      </div>
                      {config.geminiApiKey?.trim()
                        ? <span className="text-[11px] text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Connected</span>
                        : <span className="text-[11px] text-amber-500">Key needed</span>}
                    </div>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      placeholder="AIzaSy… (pre-filled from Grokki settings)"
                      className="w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#131318] text-[12px] font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-white/20 transition-colors"
                    />
                  </div>

                  {/* Together AI */}
                  <div className="p-4 rounded-xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.02] flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-medium text-gray-900 dark:text-gray-100">Together AI</span>
                        <span className="text-[10px] px-1.5 py-px rounded-md bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/[0.08]">FLUX.1 Schnell</span>
                      </div>
                      <a
                        href="https://api.together.ai"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        Get free key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      value={togetherKey}
                      onChange={e => setTogetherKey(e.target.value)}
                      placeholder="Together API key"
                      className="w-full h-8 px-3 rounded-lg border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#131318] text-[12px] font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400 dark:focus:border-white/20 transition-colors"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 dark:border-white/[0.06] flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="h-8 px-4 rounded-lg text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTokens}
                className="h-8 px-4 rounded-lg text-[12px] font-medium bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-85 transition-opacity cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageStudioTab;