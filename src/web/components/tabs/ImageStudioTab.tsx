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
  '1:1': { width: 1024, height: 1024, label: '1:1 Square' },
  '16:9': { width: 1280, height: 720, label: '16:9 Landscape' },
  '9:16': { width: 720, height: 1280, label: '9:16 Portrait' },
  '4:3': { width: 1152, height: 864, label: '4:3 Standard' },
  '3:4': { width: 864, height: 1152, label: '3:4 Portrait' },
};

const ENGINE_OPTIONS: GlideSelectOption[] = [
  // ByteDance Seedance & Jimeng Models (From GitHub Reverse Repos)
  { value: 'bytedance:seedance-2.5', label: 'ByteDance • Seedance 2.5', group: 'ByteDance / Seedance' },
  { value: 'bytedance:jimeng-v2', label: 'ByteDance • Jimeng / Dreamina', group: 'ByteDance / Seedance' },
  { value: 'bytedance:doubao-image', label: 'ByteDance • Doubao AI', group: 'ByteDance / Seedance' },

  // Coze & High-Limit Reverse Proxies
  { value: 'proxy:dall-e-3', label: 'Coze • DALL-E 3 (High Limit)', group: 'Reverse Proxies' },
  { value: 'proxy:flux-pro', label: 'Custom Proxy • FLUX Pro', group: 'Reverse Proxies' },

  // Google Imagen 3 (High Quality Cloud, powered by Gemini)
  { value: 'google:imagen-3.0-generate-002', label: 'Google Imagen 3 (Ultra Quality)', group: 'Google AI' },
  { value: 'google:imagen-3.0-fast-generate-001', label: 'Google Imagen 3 Fast', group: 'Google AI' },

  // Together AI FLUX
  { value: 'together:black-forest-labs/FLUX.1-schnell-Free', label: 'FLUX.1 Schnell (Together AI)', group: 'Together AI (FLUX)' },

  // Free Instant Cloud (Zero Setup)
  { value: 'pollinations:turbo', label: 'SDXL Turbo (Instant • Zero Wait)', group: 'Free Cloud' },
  { value: 'pollinations:flux', label: 'FLUX.1 Standard (Free Cloud)', group: 'Free Cloud' },
  { value: 'pollinations:flux-anime', label: 'Anime Masterpiece (Studio Ghibli)', group: 'Free Cloud' },
  { value: 'pollinations:flux-realism', label: 'Photorealistic Cinema (8K)', group: 'Free Cloud' },
];

const ASPECT_OPTIONS: GlideSelectOption[] = [
  { value: '1:1', label: '1:1 Square' },
  { value: '16:9', label: '16:9 Landscape' },
  { value: '9:16', label: '9:16 Portrait' },
  { value: '4:3', label: '4:3 Standard' },
  { value: '3:4', label: '3:4 Portrait' },
];

export const ImageStudioTab: React.FC<ImageStudioTabProps> = ({ config, onChangeConfig }) => {
  const [inputValue, setInputValue] = useState('');

  // Default to Seedance if chosen, or Google Imagen 3, or SDXL Turbo
  const [activeEngine, setActiveEngine] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_ENGINE_KEY);
      if (saved) return saved;
    } catch {}
    if (config.geminiApiKey?.trim()) return 'google:imagen-3.0-generate-002';
    return 'pollinations:turbo';
  });

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [enhance, setEnhance] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // API Tokens & Endpoints
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    try { return localStorage.getItem(GEMINI_IMAGE_KEY) || config.geminiApiKey || ''; } catch { return config.geminiApiKey || ''; }
  });
  const [togetherKey, setTogetherKey] = useState<string>(() => {
    try { return localStorage.getItem(TOGETHER_KEY) || ''; } catch { return ''; }
  });
  const [proxyEndpoint, setProxyEndpoint] = useState<string>(() => {
    try { return localStorage.getItem(PROXY_ENDPOINT_KEY) || 'http://localhost:8000/v1'; } catch { return 'http://localhost:8000/v1'; }
  });
  const [proxyKey, setProxyKey] = useState<string>(() => {
    try { return localStorage.getItem(PROXY_KEY_KEY) || ''; } catch { return ''; }
  });

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [modalTab, setModalTab] = useState<'bytedance' | 'cloud'>('bytedance');
  const [testingProxy, setTestingProxy] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (config.geminiApiKey && !geminiKey) {
      setGeminiKey(config.geminiApiKey);
    }
  }, [config.geminiApiKey]);

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

  const handleEngineChange = (val: string) => {
    setActiveEngine(val);
    try {
      localStorage.setItem(ACTIVE_ENGINE_KEY, val);
    } catch {}
  };

  const handleSaveTokens = () => {
    try {
      localStorage.setItem(GEMINI_IMAGE_KEY, geminiKey.trim());
      localStorage.setItem(TOGETHER_KEY, togetherKey.trim());
      localStorage.setItem(PROXY_ENDPOINT_KEY, proxyEndpoint.trim());
      localStorage.setItem(PROXY_KEY_KEY, proxyKey.trim());
    } catch {}
    if (geminiKey.trim() && onChangeConfig) {
      onChangeConfig({ geminiApiKey: geminiKey.trim() });
    }
    setShowKeyModal(false);
  };

  const handleQuickCheckProxy = async () => {
    setTestingProxy(true);
    setProxyStatus(null);
    const endpoint = (proxyEndpoint.trim() || 'http://localhost:8000/v1').replace(/\/+$/, '');
    try {
      const headers: Record<string, string> = {};
      if (proxyKey.trim()) headers['Authorization'] = `Bearer ${proxyKey.trim()}`;
      const res = await fetch(`${endpoint}/models`, { headers });
      if (res.ok) {
        setProxyStatus({ ok: true, msg: 'ByteDance Proxy is Online & Ready!' });
      } else {
        setProxyStatus({ ok: false, msg: `Proxy responded with status ${res.status}` });
      }
    } catch {
      setProxyStatus({
        ok: false,
        msg: 'Proxy not running yet at http://localhost:8000. Start your jimeng-api / doubao2api container.',
      });
    } finally {
      setTestingProxy(false);
    }
  };

  // Helper to generate image via chosen engine
  const executeGeneration = async (
    promptText: string,
    engineKey: string,
    ar: AspectRatio,
    enh: boolean
  ) => {
    const [provider, modelName] = engineKey.split(':');
    const { width, height } = ASPECT_DIMS[ar];
    const seed = Math.floor(Math.random() * 9000000) + 1000000;

    let finalImageUrl = '';

    if (provider === 'bytedance' || provider === 'proxy') {
      const endpoint = (proxyEndpoint.trim() || 'http://localhost:8000/v1').replace(/\/+$/, '');
      const targetUrl = endpoint.endsWith('/images/generations')
        ? endpoint
        : `${endpoint}/images/generations`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (proxyKey.trim()) {
        headers['Authorization'] = `Bearer ${proxyKey.trim()}`;
      }

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: modelName,
            prompt: enh ? `${promptText}, 8k resolution, ultra-detailed masterpiece` : promptText,
            n: 1,
            size: `${width}x${height}`,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Proxy server returned status ${response.status}`);
        }

        const data = await response.json();
        if (data.data?.[0]?.b64_json) {
          finalImageUrl = `data:image/jpeg;base64,${data.data[0].b64_json}`;
        } else if (data.data?.[0]?.url) {
          finalImageUrl = data.data[0].url;
        } else if (data.images?.[0]) {
          const img = data.images[0];
          finalImageUrl = img.startsWith('http') || img.startsWith('data:') ? img : `data:image/png;base64,${img}`;
        } else {
          throw new Error('Proxy responded without image data.');
        }
      } catch (err: any) {
        if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
          throw new Error(
            `ByteDance Proxy is not active at ${endpoint}. Please launch your jimeng-api / doubao2api container, or switch to Google Imagen 3 for 1-click cloud generation.`
          );
        }
        throw err;
      }
    } else if (provider === 'google') {
      const activeKey = (geminiKey || config.geminiApiKey || '').trim();
      if (!activeKey) {
        setShowKeyModal(true);
        setModalTab('cloud');
        throw new Error('Please configure your Gemini API Key in Settings to use Google Imagen 3.');
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${activeKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [
              {
                prompt: enh
                  ? `masterpiece, ultra-detailed, 8k resolution, professional lighting, photorealistic: ${promptText}`
                  : promptText,
              },
            ],
            parameters: {
              sampleCount: 1,
              aspectRatio: ar,
              outputMimeType: 'image/jpeg',
            },
          }),
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const rawMsg = errJson.error?.message || `Google Imagen error (${response.status})`;
        throw new Error(rawMsg);
      }

      const data = await response.json();
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) {
        throw new Error('Google Imagen returned no image. Check prompt safety or try another prompt.');
      }
      finalImageUrl = `data:image/jpeg;base64,${b64}`;
    } else if (provider === 'together') {
      if (!togetherKey.trim()) {
        setShowKeyModal(true);
        setModalTab('cloud');
        throw new Error('Please add your free Together AI key in Settings to use high-speed FLUX.1.');
      }
      const response = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${togetherKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: enh ? `${promptText}, 8k resolution, highly detailed, photorealistic masterpiece` : promptText,
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
      // Free Cloud (Pollinations)
      const encPrompt = encodeURIComponent(promptText.trim());
      const cacheBust = `${Date.now()}`;
      finalImageUrl = `https://image.pollinations.ai/prompt/${encPrompt}?model=${modelName}&width=${width}&height=${height}&seed=${seed}&nologo=true&private=true&enhance=${enh}&cb=${cacheBust}`;

      // Pre-load to verify it returns a valid image
      await new Promise<void>((resolve, reject) => {
        const testImg = new Image();
        testImg.src = finalImageUrl;
        testImg.onload = () => resolve();
        testImg.onerror = () =>
          reject(new Error('Failed to load image. Try switching to Google Imagen 3 or SDXL Turbo.'));
      });
    }

    return { finalImageUrl, seed };
  };

  const handleGenerate = async (customPrompt?: string, overrideEngine?: string) => {
    const promptText = (customPrompt || inputValue).trim();
    if (!promptText || isGenerating) return;

    const engineToUse = overrideEngine || activeEngine;

    setInputValue('');
    setIsGenerating(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const [provider, modelName] = engineToUse.split(':');
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
      const { finalImageUrl, seed } = await executeGeneration(
        promptText,
        engineToUse,
        aspectRatio,
        enhance
      );
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
      if (item.url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = item.url;
        a.download = `grokki_gen_${item.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
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
                Generate studio-quality illustrations with ByteDance Seedance, Google Imagen 3, and FLUX.
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
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
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
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleGenerate(item.prompt)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" /> Retry
                          </button>
                          {item.provider !== 'google' && (
                            <button
                              type="button"
                              onClick={() => {
                                handleEngineChange('google:imagen-3.0-generate-002');
                                handleGenerate(item.prompt, 'google:imagen-3.0-generate-002');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Sparkles className="w-3 h-3" /> Try Google Imagen 3
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              handleEngineChange('pollinations:turbo');
                              handleGenerate(item.prompt, 'pollinations:turbo');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Zap className="w-3 h-3" /> Try Instant Turbo
                          </button>
                        </div>
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
                        <WarmTooltip content="Download Image" side="top">
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

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Engine Selector Dropdown */}
                <GlideSelect
                  options={ENGINE_OPTIONS}
                  value={activeEngine}
                  onChange={handleEngineChange}
                  size="sm"
                  radius={8}
                  menuWidth={295}
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
                <WarmTooltip content="Configure ByteDance Seedance & Cloud Keys" side="top">
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

                {/* Submit Button */}
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
            Grokki Image Studio • ByteDance Seedance • Google Imagen 3 • FLUX.1
          </p>
        </div>
      </div>

      {/* Engine & Key Configuration Hub Modal */}
      {showKeyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowKeyModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-[#15151a] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 text-left animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-500" />
                Image Engine & Repositories Setup
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Connect ByteDance (Seedance / Jimeng / Doubao) reverse proxies or use cloud models.
              </p>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 dark:border-white/10 gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalTab('bytedance')}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  modalTab === 'bytedance'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                ByteDance / Seedance Repos
              </button>
              <button
                type="button"
                onClick={() => setModalTab('cloud')}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  modalTab === 'cloud'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Cloud className="w-3.5 h-3.5" />
                Cloud API Keys
              </button>
            </div>

            {/* Tab 1: ByteDance / Seedance Repos */}
            {modalTab === 'bytedance' && (
              <div className="flex flex-col gap-3.5 animate-in fade-in duration-100">
                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs">
                  <span className="font-semibold text-purple-600 dark:text-purple-400 block mb-1">
                    ByteDance & High-Limit Repositories:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <a
                      href="https://github.com/iptag/jimeng-api"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg bg-white dark:bg-[#1b1c24] border border-gray-200 dark:border-white/10 flex flex-col hover:border-purple-500 transition-colors"
                    >
                      <span className="font-bold text-[11px] text-gray-900 dark:text-white flex items-center justify-between">
                        iptag/jimeng-api <ExternalLink className="w-3 h-3 text-gray-400" />
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        ByteDance Jimeng & Dreamina web reverse API.
                      </span>
                    </a>

                    <a
                      href="https://github.com/wangchuxiaoji-oss/doubao2api"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg bg-white dark:bg-[#1b1c24] border border-gray-200 dark:border-white/10 flex flex-col hover:border-purple-500 transition-colors"
                    >
                      <span className="font-bold text-[11px] text-gray-900 dark:text-white flex items-center justify-between">
                        doubao2api <ExternalLink className="w-3 h-3 text-gray-400" />
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        ByteDance Doubao OpenAI-compatible proxy.
                      </span>
                    </a>

                    <a
                      href="https://github.com/deanxv/coze-discord-proxy"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg bg-white dark:bg-[#1b1c24] border border-gray-200 dark:border-white/10 flex flex-col hover:border-purple-500 transition-colors"
                    >
                      <span className="font-bold text-[11px] text-gray-900 dark:text-white flex items-center justify-between">
                        coze-discord-proxy <ExternalLink className="w-3 h-3 text-gray-400" />
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Free unlimited DALL-E 3 via ByteDance Coze.
                      </span>
                    </a>

                    <a
                      href="https://github.com/SamurAIGPT/Seedance-2.5-API"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg bg-white dark:bg-[#1b1c24] border border-gray-200 dark:border-white/10 flex flex-col hover:border-purple-500 transition-colors"
                    >
                      <span className="font-bold text-[11px] text-gray-900 dark:text-white flex items-center justify-between">
                        Seedance-2.5-API <ExternalLink className="w-3 h-3 text-gray-400" />
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        ByteDance Seedance 2.5 client & SDK.
                      </span>
                    </a>
                  </div>
                </div>

                {/* Proxy URL configuration */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                      Reverse Proxy Base URL (OpenAI-compatible)
                    </label>
                    <button
                      type="button"
                      disabled={testingProxy}
                      onClick={handleQuickCheckProxy}
                      className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {testingProxy ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : 'Check Status'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={proxyEndpoint}
                    onChange={(e) => setProxyEndpoint(e.target.value)}
                    placeholder="http://localhost:8000/v1"
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#1c1c24] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-purple-500"
                  />
                  {proxyStatus && (
                    <p
                      className={`text-[10px] mt-1 flex items-center gap-1 font-medium ${
                        proxyStatus.ok ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      {proxyStatus.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {proxyStatus.msg}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    Routes <code>/images/generations</code> directly to your jimeng-api, doubao2api, or Coze container.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Proxy Auth Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={proxyKey}
                    onChange={(e) => setProxyKey(e.target.value)}
                    placeholder="sk-... or leave empty for local"
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#1c1c24] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Cloud API Keys */}
            {modalTab === 'cloud' && (
              <div className="flex flex-col gap-3.5 animate-in fade-in duration-100">
                {/* Google Imagen 3 */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">Google Imagen 3</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold">
                        Ultra Quality
                      </span>
                    </div>
                    {config.geminiApiKey?.trim() ? (
                      <span className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Connected
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-500">Key Needed</span>
                    )}
                  </div>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy... (Pre-filled from Grokki settings)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121318] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Together AI */}
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">Together AI (FLUX.1)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-semibold">
                        Fast
                      </span>
                    </div>
                    <a
                      href="https://api.together.ai"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-purple-500 hover:underline flex items-center gap-0.5"
                    >
                      Get Free Key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={togetherKey}
                    onChange={(e) => setTogetherKey(e.target.value)}
                    placeholder="Together API Key"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#121318] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveTokens}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90 shadow-xs cursor-pointer"
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