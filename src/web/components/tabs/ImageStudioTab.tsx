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
  Key,
  X,
} from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';
import SpecularButton from '../../../effects/SpecularButton';
import DriftWall from '../../../effects/DriftWall';
import GlideSelect, { GlideSelectOption } from './GlideSelect';
import { GeminiLogo, OpenAILogo, OllamaLogo } from './AiBrainTab';
import ImageLightboxModal from '../ImageLightboxModal';
import WarmTooltip from '../WarmTooltip';
import grokkiIcon from '../../assets/grokki_icon.svg';
import grokkiLogo from '../../assets/grokki_logo.png';

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
const CF_ACCOUNT_KEY = 'grokki_cf_account_id';
const CF_TOKEN_KEY = 'grokki_cf_api_token';
const OPENAI_IMAGE_KEY = 'grokki_openai_image_key';

const ASPECT_DIMS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  '1:1':  { width: 1024, height: 1024, label: '1:1 Square'     },
  '16:9': { width: 1280, height: 720,  label: '16:9 Landscape' },
  '9:16': { width: 720,  height: 1280, label: '9:16 Portrait'  },
  '4:3':  { width: 1152, height: 864,  label: '4:3 Standard'   },
  '3:4':  { width: 864,  height: 1152, label: '3:4 Portrait'   },
};

const DRIFT_ITEMS = [
  { image: 'https://imgs.search.brave.com/cKxzAG_LLCdguSwW4oI7i-nAXjjMuK5Q76pz_jhfrqI/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4z/LnBpeGVsY3V0LmFw/cC9jbXMvcHJvZC9n/ZW5lcmF0b3ItbW9k/ZS9haS1pbWFnZS1n/ZW5lcmF0b3ItbW9k/ZS1zdHlsZS9zdHls/ZS1yZXN1bHQtYmE5/NWI0ZTc1NS53ZWJw', title: 'Abstract Flow' },
  { image: 'https://piktochart.com/wp-content/uploads/2023/11/elgin-viral-ai-images.png', title: 'Cyber Orb' },
  { image: 'https://lumenor.ai/cdn-cgi/imagedelivery/F5KOmplEz0rStV2qDKhYag/6c96d6cb-00f0-40a8-a795-07119ee76400/tn', title: 'Cosmic Nebula' },
  { image: 'https://lumenor.ai/cdn-cgi/imagedelivery/F5KOmplEz0rStV2qDKhYag/69fea199-ed62-4ecf-7677-6a7c2f056f00/tn', title: 'Geometric 3D' },
  { image: 'https://lumenor.ai/cdn-cgi/imagedelivery/F5KOmplEz0rStV2qDKhYag/e9a7f053-4c6d-403a-c1f5-7ed7eeb4f400/tn', title: 'Surreal Fluid' },
  { image: 'https://lumenor.ai/cdn-cgi/imagedelivery/F5KOmplEz0rStV2qDKhYag/74e87def-d52d-48b4-947b-9905ed327600/tn', title: 'Neon Night' },
  { image: 'https://animegenius-global.live3d.io/vtuber/ai_product/anime_genius/static/imgs/animegenius_27302e6bfddf4458f2d8ee59575ca72e.webp', title: 'Cyber Matrix' },
  { image: 'https://animegenius-global.live3d.io/vtuber/ai_product/anime_genius/static/imgs/animegenius_65346c209b5083274adbe14fe4f3de21.webp', title: 'Futuristic Grid' },
  { image: 'https://cdn.spaceprompts.com/images/2548/full/twilight-sakura-overlook-girl.webp', title: 'Color Wave' },
  { image: 'https://cdn.pixelbin.io/v2/still-base-cfe5b3/original/App_blogs/Best_Gemini_AI_photo_prompts/prompt_images/04-ethereal-fantasy-editorial-portrait.webp', title: 'Digital Canvas' },
  { image: 'https://cdn.pixelbin.io/v2/still-base-cfe5b3/original/App_blogs/Best_Gemini_AI_photo_prompts/prompt_images/02-cyberpunk-techwear-editorial.webp', title: 'Retro Hardware' },
  { image: 'https://images-ng.pixai.art/images/orig/a3bdacd4-66e1-4d1c-aa6b-0398738f86f4', title: 'Cyberpunk Alley' },
  { image: 'https://cdn.openart.ai/cdn-cgi/image/format=auto,width=960,fit=scale-down,dpr=2,quality=80,metadata=none,sharpen=1/openart-ai/production/2026-10/create-image/SH0gUGTsMYHAc7CSlBIF/image_1791516397063_3de23890_1791516397887_b3255c55.png', title: 'Glow Neon' },
  { image: 'https://cdn.openart.ai/cdn-cgi/image/format=auto,width=960,fit=scale-down,dpr=2,quality=80,metadata=none,sharpen=1/openart-ai/production/2026-10/create-image/iAbPaJMzLGCVIPFi1g0O/0217915190470139953a9193bc3926b190298875f636f3e2ed35a_1791519135951_4c886a66.png', title: 'Anime Fantasy' },
  { image: 'https://storage.googleapis.com/gweb-uniblog-publish-prod/images/pixie.width-1600.format-webp.webp', title: 'Esports Cyber' },
  { image: 'https://images-ng.pixai.art/images/orig/1ee389de-9832-4a4d-8272-c08477095b4f', title: 'Arcade Glow' },
];

const CloudflareLogo: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="currentColor">
    <path fill="#F38020" d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
  </svg>
);

const FluxLogo: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none">
    <path d="M12 2.5L21 19H3L12 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 8.5L17.2 19H6.8L12 8.5Z" fill="currentColor" fillOpacity="0.28" />
    <circle cx="12" cy="14.5" r="1.8" fill="currentColor" />
  </svg>
);

const StabilityLogo: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="#A855F7" strokeWidth="2" />
    <path d="M13 6.5L8.5 13H12.5L11 17.5L15.5 11H11.5L13 6.5Z" fill="#C084FC" />
  </svg>
);

const BananaLogo: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none">
    <path
      d="M4.5 15.5C5.8 18.2 8.4 20.2 12.5 20.5C17.5 20.8 20.5 16.5 20.5 11.5C20.5 8.5 19.5 5.5 17.5 3.5C17.2 3.2 16.8 3.5 16.9 3.9C17.6 6.8 16.9 10.2 14.5 12.8C12.2 15.3 8.8 16.2 5.2 14.9C4.7 14.7 4.3 15.1 4.5 15.5Z"
      fill="#FACC15"
      stroke="#CA8A04"
      strokeWidth="1.2"
    />
    <path
      d="M17.5 3.5L18.8 2.2C19.1 1.9 19.6 2.1 19.5 2.5L19.2 4.2"
      stroke="#713F12"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

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
  // Nano Banana Models (Official Google Gemini Image API - 100% Studio Quality, Zero Watermark)
  { value: 'google:nano-banana-pro',                          label: modelLabel(BananaLogo,     'Nano Banana Pro'), tag: 'Google'     },
  { value: 'google:nano-banana-2',                            label: modelLabel(BananaLogo,     'Nano Banana 2'),   tag: 'Google'     },
  { value: 'google:nano-banana',                              label: modelLabel(BananaLogo,     'Nano Banana'),     tag: 'Google'     },
  // Free Community (Clean Zero Watermark FLUX & SDXL)
  { value: 'pollinations:flux',                               label: modelLabel(FluxLogo,       'FLUX.1 Clean'),    tag: 'Free'       },
  { value: 'pollinations:turbo',                              label: modelLabel(StabilityLogo,  'SDXL Turbo'),      tag: 'Free'       },
  { value: 'pollinations:flux-anime',                         label: modelLabel(FluxLogo,       'FLUX Anime'),      tag: 'Free'       },
  // Cloudflare Workers AI (Free FLUX.1 Schnell)
  { value: 'cloudflare:@cf/black-forest-labs/flux-1-schnell', label: modelLabel(CloudflareLogo, 'FLUX Schnell'),    tag: 'Cloudflare' },
  // Local Ollama (Offline / Native)
  { value: 'ollama:x/z-image-turbo',                          label: modelLabel(OllamaLogo,     'Z-Image Turbo'),   tag: 'Local'      },
  // OpenAI DALL·E 3
  { value: 'openai:dall-e-3',                                 label: modelLabel(OpenAILogo,     'DALL·E 3'),        tag: 'OpenAI'     },
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

export const ImageStudioTab: React.FC<ImageStudioTabProps> = ({ config, onChangeConfig }) => {
  const [inputValue, setInputValue] = useState('');
  const [activeEngine, setActiveEngine] = useState<string>(() => {
    try {
      const s = localStorage.getItem(ACTIVE_ENGINE_KEY);
      if (s && !s.includes('pollinations:nano-banana') && ENGINE_OPTIONS.some(o => o.value === s)) return s;
    } catch {}
    return config.geminiApiKey?.trim() ? 'google:nano-banana-pro' : 'google:nano-banana-pro';
  });
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [enhance, setEnhance] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Key configuration modal state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => {
    try {
      return (
        (config.geminiApiKey && config.geminiApiKey.trim()) ||
        localStorage.getItem(GEMINI_IMAGE_KEY) ||
        ''
      );
    } catch {
      return config.geminiApiKey || '';
    }
  });

  useEffect(() => {
    if (config.geminiApiKey?.trim()) {
      setGeminiKeyInput(config.geminiApiKey.trim());
    }
  }, [config.geminiApiKey]);
  const [cfAccountInput, setCfAccountInput] = useState(() => {
    try { return localStorage.getItem(CF_ACCOUNT_KEY) || ''; } catch { return ''; }
  });
  const [cfTokenInput, setCfTokenInput] = useState(() => {
    try { return localStorage.getItem(CF_TOKEN_KEY) || ''; } catch { return ''; }
  });
  const [openaiKeyInput, setOpenaiKeyInput] = useState(() => {
    try { return localStorage.getItem(OPENAI_IMAGE_KEY) || config.openaiApiKey || ''; } catch { return config.openaiApiKey || ''; }
  });

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

  // Big Scale Image Zoom Lightbox Modal State
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    src: string;
    name: string;
    originRect?: { top: number; left: number; width: number; height: number };
  }>({
    isOpen: false,
    src: '',
    name: '',
  });

  const openLightbox = (
    src: string,
    name: string,
    originRect?: { top: number; left: number; width: number; height: number }
  ) => {
    setLightboxState({ isOpen: true, src, name, originRect });
  };

  const closeLightbox = () => {
    setLightboxState(prev => ({ ...prev, isOpen: false }));
  };

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

  const handleSaveKeys = () => {
    try {
      localStorage.setItem(GEMINI_IMAGE_KEY, geminiKeyInput.trim());
      localStorage.setItem(CF_ACCOUNT_KEY, cfAccountInput.trim());
      localStorage.setItem(CF_TOKEN_KEY, cfTokenInput.trim());
      localStorage.setItem(OPENAI_IMAGE_KEY, openaiKeyInput.trim());
    } catch {}
    if (geminiKeyInput.trim() && onChangeConfig) {
      onChangeConfig({ geminiApiKey: geminiKeyInput.trim() });
    }
    if (openaiKeyInput.trim() && onChangeConfig) {
      onChangeConfig({ openaiApiKey: openaiKeyInput.trim() });
    }
    setShowKeyModal(false);
  };

  const executeGeneration = async (
    promptText: string,
    engineKey: string,
    ar: AspectRatio,
    enh: boolean,
  ) => {
    const [provider, modelName] = engineKey.split(':');
    const { width, height } = ASPECT_DIMS[ar];
    const seed = Math.floor(Math.random() * 9_000_000) + 1_000_000;

    // 1. Google Nano Banana (Official Gemini Image Generation API - Pure Studio Quality, Zero Watermarks)
    if (provider === 'google') {
      const key = (
        (geminiKeyInput && geminiKeyInput.trim()) ||
        (config.geminiApiKey && config.geminiApiKey.trim()) ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem(GEMINI_IMAGE_KEY) || '' : '')
      ).trim();

      if (!key) {
        setShowKeyModal(true);
        throw new Error('Please configure your Gemini API Key in Settings to use Nano Banana.');
      }

      // Model priority list based on user selection
      const candidateModels =
        modelName === 'nano-banana-pro'
          ? ['gemini-3-pro-image-preview', 'nano-banana-pro-preview', 'gemini-3-pro-image', 'imagen-3.0-generate-002']
          : modelName === 'nano-banana-2'
          ? ['gemini-3.1-flash-image-preview', 'gemini-nano-banana-2.1', 'gemini-3.1-flash-image']
          : ['gemini-2.5-flash-image', 'gemini-3.1-flash-lite-image'];

      const finalPrompt = enh
        ? `masterpiece, ultra-detailed, 8k, professional cinematic lighting: ${promptText}`
        : promptText;

      const payload = {
        contents: [
          {
            parts: [{ text: finalPrompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: ar,
          },
        },
      };

      let lastErrMessage = '';

      for (const m of candidateModels) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': key,
              },
              body: JSON.stringify(payload),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const parts = data.candidates?.[0]?.content?.parts || [];
            const imgPart = parts.find((p: any) => p.inlineData?.data);

            if (imgPart?.inlineData?.data) {
              const mime = imgPart.inlineData.mimeType || 'image/png';
              return { finalImageUrl: `data:${mime};base64,${imgPart.inlineData.data}`, seed };
            }

            const textPart = parts.find((p: any) => p.text);
            if (textPart?.text) {
              throw new Error(`Nano Banana: ${textPart.text.slice(0, 150)}`);
            }
          } else {
            const err = await res.json().catch(() => ({}));
            const rawMsg = err.error?.message || `Google API status ${res.status}`;
            lastErrMessage = rawMsg;
            if (
              res.status === 429 ||
              rawMsg.toLowerCase().includes('quota') ||
              rawMsg.toLowerCase().includes('free_tier') ||
              rawMsg.toLowerCase().includes('resource_exhausted')
            ) {
              throw new Error(
                'Google returned 429 (limit: 0 image quota). In Google AI Studio, click "Billing" on the left sidebar to attach a Cloud Billing account to your project and activate image generation, or use FLUX.1 Clean below.'
              );
            }
          }
        } catch (e: any) {
          if (e.message.includes('Google AI Studio API reports')) throw e;
          lastErrMessage = e.message;
        }
      }

      // Secondary fallback: OpenAI-compatible endpoint with Bearer auth
      try {
        const oaiRes = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/openai/images/generations',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: candidateModels[0],
              prompt: finalPrompt,
              size: ar === '16:9' ? '1280x720' : ar === '9:16' ? '720x1280' : '1024x1024',
              response_format: 'b64_json',
            }),
          }
        );
        if (oaiRes.ok) {
          const oaiData = await oaiRes.json();
          const b64 = oaiData.data?.[0]?.b64_json;
          if (b64) {
            return { finalImageUrl: `data:image/png;base64,${b64}`, seed };
          }
        }
      } catch {}

      throw new Error(lastErrMessage || 'Nano Banana returned no image data. Try adjusting your prompt.');
    }

    // 2. Cloudflare Workers AI (FLUX.1 Schnell)
    if (provider === 'cloudflare') {
      const accountId = (cfAccountInput || localStorage.getItem(CF_ACCOUNT_KEY) || '').trim();
      const apiToken = (cfTokenInput || localStorage.getItem(CF_TOKEN_KEY) || '').trim();

      if (!accountId || !apiToken) {
        setShowKeyModal(true);
        throw new Error('Please enter your Cloudflare Account ID and API Token in settings.');
      }

      const finalPrompt = enh
        ? `${promptText}, ultra-detailed, sharp focus, 8k resolution`
        : promptText;

      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: finalPrompt,
            num_steps: 6,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.errors?.[0]?.message || `Cloudflare AI error (${res.status}).`);
      }

      const blob = await res.blob();
      const reader = new FileReader();
      const b64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const dataUrl = await b64Promise;
      return { finalImageUrl: dataUrl, seed };
    }

    // 3. Pollinations Free Provider (Clean, No Watermark, Instant)
    if (provider === 'pollinations') {
      const enc = encodeURIComponent(promptText.trim());
      const cb = `${Date.now()}`;
      const validModel = modelName === 'turbo' ? 'turbo' : modelName === 'flux-anime' ? 'flux-anime' : 'flux';
      const imgUrl = `https://image.pollinations.ai/prompt/${enc}?model=${validModel}&width=${width}&height=${height}&seed=${seed}&nologo=true&nofeed=true&private=true&enhance=${enh}&cb=${cb}`;

      // Convert to Data URL so it is stored permanently in memory/disk and downloads natively with zero network issues
      try {
        const fetchRes = await fetch(imgUrl);
        if (fetchRes.ok) {
          const blob = await fetchRes.blob();
          const reader = new FileReader();
          const b64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
          reader.readAsDataURL(blob);
          const dataUrl = await b64Promise;
          return { finalImageUrl: dataUrl, seed };
        }
      } catch {}

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.src = imgUrl;
        img.onload = () => resolve();
        img.onerror = () =>
          reject(new Error('Image failed to load. The free generation service may be briefly rate-limited; retry in a few seconds.'));
      });

      return { finalImageUrl: imgUrl, seed };
    }

    // 4. Local Ollama (Native text-to-image)
    if (provider === 'ollama') {
      const endpoint = (config.ollamaEndpoint || 'http://localhost:11434').replace(/\/+$/, '');
      const finalPrompt = enh ? `masterpiece, ultra-detailed: ${promptText}` : promptText;

      let res: Response;
      try {
        res = await fetch(`${endpoint}/v1/images/generations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelName,
            prompt: finalPrompt,
            response_format: 'b64_json',
          }),
        });
      } catch {
        throw new Error(`Could not connect to Ollama at ${endpoint}. Run "ollama run ${modelName}" in terminal.`);
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Ollama returned status ${res.status}.`);
      }

      const data = await res.json();
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) throw new Error('Ollama returned no image data.');
      return { finalImageUrl: `data:image/png;base64,${b64}`, seed };
    }

    // 5. OpenAI DALL·E 3
    if (provider === 'openai') {
      const key = (
        openaiKeyInput ||
        config.openaiApiKey ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem(OPENAI_IMAGE_KEY) : '') ||
        ''
      ).trim();

      if (!key) {
        setShowKeyModal(true);
        throw new Error('Please configure your OpenAI API Key to use DALL·E 3.');
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
          Authorization: `Bearer ${key}`,
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

  const handleDownload = async (item: GeneratedImage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const filename = `grokki_${item.id}.png`;

    // 1. Native Electron Save Dialog (bypasses Windows blob interception completely)
    if (typeof (window as any).jarvisAPI?.saveImageFile === 'function') {
      try {
        const res = await (window as any).jarvisAPI.saveImageFile({
          url: item.url,
          dataUrl: item.url,
          defaultName: filename,
        });
        if (res?.success || res?.canceled) return;
      } catch (err) {
        console.warn('Native save failed, trying fallback:', err);
      }
    }

    // 2. Data URLs (e.g. Google Imagen, Cloudflare, OpenAI base64)
    if (item.url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = item.url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // 3. Remote URL -> convert to base64 DataURL (NEVER createObjectURL blob to prevent Windows blob handler)
    try {
      const res = await fetch(item.url, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };
        reader.readAsDataURL(blob);
        return;
      }
    } catch {}

    // 4. Fallback: Draw via Canvas to DataURL
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = item.url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
    } catch {}

    // 5. Final fallback
    const a = document.createElement('a');
    a.href = item.url;
    a.target = '_blank';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    menuWidth: 230,
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
            {/* Big Grokki Studio Logo behind text (just like the agent chat tab) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center -mb-28 sm:-mb-36 md:-mb-54 select-none pointer-events-none z-0"
            >
              <img
                src={grokkiLogo}
                alt="Grokki"
                draggable={false}
                className="w-44 h-44 sm:w-60 sm:h-60 md:w-84 md:h-84 object-contain filter brightness-0 dark:invert"
                style={{
                  maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.02) 70%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 10%, rgba(0, 0, 0, 0.08) 100%)',
                }}
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 text-6xl sm:text-[4em] mb-7 font-normal text-gray-900 dark:text-white tracking-wide text-center"
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
                            {item.engine.startsWith('google') && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleEngineChange('pollinations:flux');
                                  handleGenerate(item.prompt, 'pollinations:flux');
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3" />
                                Try Free FLUX.1 Clean
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : item.url ? (
                      <div
                        className="relative inline-block rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.08] group max-w-[420px] cursor-zoom-in"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          openLightbox(item.url, `grokki_${item.id}.png`, {
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            height: rect.height,
                          });
                        }}
                      >
                        <img
                          src={item.url}
                          alt={item.prompt}
                          className="w-full h-auto block select-none"
                        />
                        <div
                          className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/70 rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <WarmTooltip content={copiedId === item.id ? 'Copied' : 'Copy prompt'} side="top">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPrompt(item.prompt, item.id);
                              }}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(item, e);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </WarmTooltip>
                          <WarmTooltip content="Regenerate" side="top">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerate(item.prompt, item.engine);
                              }}
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
                    
                  </button>
                </WarmTooltip>
              </div>

              {/* Right: API Keys + Clear history + Generate button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <WarmTooltip content="API Keys" side="top">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                </WarmTooltip>

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

      {/* Minimal API Keys Modal */}
      {showKeyModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowKeyModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white dark:bg-[#15151b] border border-gray-200 dark:border-white/[0.09] rounded-xl shadow-2xl p-5 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">API Credentials</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Google Gemini Key */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Google Gemini API Key <span className="text-[10px] text-gray-400">(for Imagen 3)</span>
                </label>
                <input
                  type="password"
                  value={geminiKeyInput}
                  onChange={e => setGeminiKeyInput(e.target.value)}
                  placeholder="AIzaSy…"
                  className="w-full h-8 px-2.5 rounded-md border border-gray-200 dark:border-white/10 bg-transparent text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400"
                />
              </div>

              {/* Cloudflare Account ID & Token */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cloudflare Account ID <span className="text-[10px] text-gray-400">(for FLUX.1 Schnell)</span>
                </label>
                <input
                  type="text"
                  value={cfAccountInput}
                  onChange={e => setCfAccountInput(e.target.value)}
                  placeholder="Cloudflare Account ID"
                  className="w-full h-8 px-2.5 rounded-md border border-gray-200 dark:border-white/10 bg-transparent text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cloudflare API Token
                </label>
                <input
                  type="password"
                  value={cfTokenInput}
                  onChange={e => setCfTokenInput(e.target.value)}
                  placeholder="Cloudflare API Token"
                  className="w-full h-8 px-2.5 rounded-md border border-gray-200 dark:border-white/10 bg-transparent text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400"
                />
              </div>

              {/* OpenAI Key */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OpenAI API Key <span className="text-[10px] text-gray-400">(optional, for DALL·E 3)</span>
                </label>
                <input
                  type="password"
                  value={openaiKeyInput}
                  onChange={e => setOpenaiKeyInput(e.target.value)}
                  placeholder="sk-…"
                  className="w-full h-8 px-2.5 rounded-md border border-gray-200 dark:border-white/10 bg-transparent text-xs font-mono text-gray-900 dark:text-gray-100 outline-none focus:border-gray-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="h-7 px-3 rounded text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveKeys}
                className="h-7 px-3.5 rounded text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Big Scale Image Zoom Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxState.isOpen}
        src={lightboxState.src}
        fileName={lightboxState.name}
        originRect={lightboxState.originRect}
        onClose={closeLightbox}
      />
    </div>
  );
};

export default ImageStudioTab;
