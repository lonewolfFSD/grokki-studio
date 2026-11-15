import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { motion, AnimatePresence } from 'motion/react';
import Threads from '../../../effects/Threads';
import grokkiLogo from '../../assets/grokki_logo.png';
import {
  Mic,
  MicOff,
  Keyboard,
  Volume2,
  VolumeX,
  Settings2,
  Send,
  Upload,
  FolderOpen,
  X,
  Check,
  Loader2,
  Trash2,
  Image as ImageIcon,
  ArrowBigUp,
  ArrowUp,
} from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';

interface AnimeCompanionTabProps {
  config: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
}

type EmotionPreset = 'neutral' | 'happy' | 'angry' | 'surprised' | 'relaxed' | 'shy';

interface RoomBackground {
  id: string;
  name: string;
  url: string;
}

// Galaxy starfield canvas layer — parallax layers + pink/white mixed stars
const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;

    type Star = {
      x: number; y: number;        // base position (0–1 normalized)
      r: number;                   // radius
      alpha: number;               // base opacity
      twinkleOffset: number;       // phase
      twinkleSpeed: number;        // how fast it pulses
      depth: number;               // 0=far(slow) … 1=close(fast) — parallax layer
      pink: boolean;               // color variant
    };

    let stars: Star[] = [];
    // Mouse position for parallax offset (normalized -0.5 to 0.5)
    let mx = 0, my = 0;
    let targetMx = 0, targetMy = 0;

    const init = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      stars = Array.from({ length: 180 }, () => {
        const depth = Math.random(); // 0 = far, 1 = near
        return {
          x: Math.random(),
          y: Math.random(),
          r: 0.25 + depth * 1.3,       // closer = bigger
          alpha: 0.25 + depth * 0.65,  // closer = brighter
          twinkleOffset: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.3 + Math.random() * 0.9,
          depth,
          pink: Math.random() < 0.4,   // 40% pink, 60% white/blue-white
        };
      });
    };

    init();
    const ro = new ResizeObserver(init);
    ro.observe(canvas);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMx = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      targetMy = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    let t = 0;
    const draw = () => {
      t += 0.016;
      // Smooth mouse lerp
      mx += (targetMx - mx) * 0.04;
      my += (targetMy - my) * 0.04;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((s) => {
        const twinkle = s.alpha * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinkleOffset));

        // Parallax offset: far stars move less, close stars move more
        const parallaxStrength = 28; // max px shift
        const px = (s.x * canvas.width)  + mx * s.depth * parallaxStrength;
        const py = (s.y * canvas.height) + my * s.depth * parallaxStrength;

        // Auto drift: very slow rightward+downward creep per depth layer
        const driftX = (t * s.depth * 0.6) % canvas.width;
        const sx = (px + driftX) % canvas.width;
        const sy = py;

        const glowR = s.r * 3.2;

        if (s.pink) {
          // Pink star
          const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
          grd.addColorStop(0, `rgba(255,140,200,${twinkle})`);
          grd.addColorStop(0.5, `rgba(255,100,180,${twinkle * 0.4})`);
          grd.addColorStop(1, 'rgba(255,80,160,0)');
          ctx.beginPath();
          ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,200,230,${twinkle})`;
          ctx.fill();
        } else {
          // White / blue-white star
          const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
          grd.addColorStop(0, `rgba(220,230,255,${twinkle})`);
          grd.addColorStop(0.5, `rgba(180,200,255,${twinkle * 0.35})`);
          grd.addColorStop(1, 'rgba(160,180,255,0)');
          ctx.beginPath();
          ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(240,245,255,${twinkle})`;
          ctx.fill();
        }
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// Animated dark threads background with galaxy stars
const ThreadsBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 ">
     
      {/* Pink flowing threads on top */}
      <Threads
        color={[1.0, 0.35, 0.65]}
        accentColor={[1.0, 0.6, 0.85]}
        amplitude={1.5}
        distance={0.5}
        lineCount={75}
        thickness={0.65}
        softness={1.3}
        speed={0.45}
        waves={1.08}
        angle={20}
        taper={0.88}
        brightness={1.6}
        fade={0.06}
        opacity={0.88}
        enableMouseInteraction={false}
        className="w-full h-full"
      />
    </div>
  );
};

const PRESET_ROOMS: RoomBackground[] = [
  {
    id: 'threads',
    name: 'Dark Threads',
    url: 'threads',
  },
  {
    id: 'sunset_room',
    name: 'Sunset Balcony',
    url: './assets/backgrounds/sunset_room.png',
  },
  {
    id: 'anime_room',
    name: 'Cozy Bedroom',
    url: './assets/backgrounds/anime_room.png',
  },
  {
    id: 'chill_room',
    name: 'Lofi Chill Room',
    url: './assets/backgrounds/chill_room.png',
  },
  {
    id: 'tokyo_cafe',
    name: 'Tokyo Night Cafe',
    url: './assets/backgrounds/tokyo_cafe.png',
  },
];

interface PresetAvatar {
  id: string;
  name: string;
  desc: string;
  url: string;
}

const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'aiko_v1',
    name: 'Aiko v1 (Classic)',
    desc: 'Original',
    url: './assets/avatars/Aiko.vrm',
  },
  {
    id: 'aiko_v2',
    name: 'Aiko v2 (Halloween)',
    desc: 'Gothic Halloween',
    url: './assets/avatars/Aiko_v2.vrm',
  }
];

interface AnimPreset {
  id: string;
  name: string;
  icon: string;
  file: string;
  loop: boolean;
}

const ANIM_PRESETS: AnimPreset[] = [
  { id: 'idle', name: 'Idle', icon: '✨', file: './assets/animations/idle.vrma', loop: true },
  { id: 'jump', name: 'Cute Hop', icon: '🐰', file: '', loop: false },
  { id: 'greeting', name: 'Wave', icon: '👋', file: './assets/animations/greeting.vrma', loop: false },
  { id: 'look_away', name: 'Shy Blush', icon: '🙈', file: './assets/animations/look_away.vrma', loop: false },
  { id: 'reaching_out', name: 'Tender Reach', icon: '🌸', file: './assets/animations/reaching_out.vrma', loop: false },
  { id: 'salute', name: 'Salute', icon: '🫡', file: './assets/animations/salute.vrma', loop: false },
  { id: 'hand_raising', name: 'Hesitant', icon: '🙋', file: './assets/animations/hand_raising.vrma', loop: false },
  { id: 'dismissing', name: 'Flustered', icon: '🫣', file: './assets/animations/dismissing.vrma', loop: false },
  { id: 'victory', name: 'Peace', icon: '✌️', file: './assets/animations/victory.vrma', loop: false },
  { id: 'thankful', name: 'Bow', icon: '🙇', file: './assets/animations/thankful.vrma', loop: false },
  { id: 'talking', name: 'Talk', icon: '💬', file: './assets/animations/talking.vrma', loop: false },
];

interface ChatMemoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const MEMORY_STORAGE_KEY = 'ani_companion_memory_v1';

// Dynamic emotion detector
function detectEmotionFromText(text: string): EmotionPreset {
  const t = text.toLowerCase();
  // Check shy / blushing / flustered first
  if (/\b(shy|blush|blushing|embarrassed|flustered|crush|cute|cutie|pretty|sweetheart|love you|like you|b-baka|kiss|darling|daddy|hehe|aww|hug|tender)\b/i.test(t)) {
    return 'shy';
  }
  if (/\b(haha|lol|yay|awesome|great|happy|glad|cool|perfect|amazing|wonderful|super|cheers|pog)\b/i.test(t)) {
    return 'happy';
  }
  if (/\b(no|never|stop|hate|angry|mad|annoying|grr|pout|bad|worst|wrong|baka)\b/i.test(t)) {
    return 'angry';
  }
  return 'relaxed';
}

export const AnimeCompanionTab: React.FC<AnimeCompanionTabProps> = ({ config, onChangeConfig }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const vrmRef = useRef<VRM | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const lookAtTargetRef = useRef<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentAnimActionRef = useRef<THREE.AnimationAction | null>(null);
  const animationClipsRef = useRef<Record<string, THREE.AnimationClip>>({});
  const hasActiveVrmaRef = useRef<boolean>(false);
  const [activeAnim, setActiveAnim] = useState<string>('idle');

  // Audio Analyser for Lip Sync
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Speech Recognition
  const recognitionRef = useRef<any>(null);

  // Dynamic Neural Emotion & Shy Blush state
  const targetEmotionRef = useRef<EmotionPreset>('neutral');
  const currentEmotionWeightsRef = useRef<Record<string, number>>({
    happy: 0,
    angry: 0,
    surprised: 0,
    relaxed: 0,
    shy: 0,
  });
  const blushWeightRef = useRef<number>(0);

  // Dedicated Companion Memory
  const [memory, setMemory] = useState<ChatMemoryMessage[]>(() => {
    try {
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      {
        role: 'assistant',
        content: "Hi there! I'm Ani. I'm so happy you came to hang out in my room! What's on your mind today?",
        timestamp: Date.now(),
      },
    ];
  });

  // UI State
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [avatarName, setAvatarName] = useState<string>(() => {
    try {
      return localStorage.getItem('ani_companion_name') || 'Aiko';
    } catch {
      return 'Aiko';
    }
  });

  const handleNameChange = (newName: string) => {
    setAvatarName(newName);
    try {
      localStorage.setItem('ani_companion_name', newName);
    } catch {}
  };

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [showInput, setShowInput] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [currentBgUrl, setCurrentBgUrl] = useState<string>(() => {
    try { return localStorage.getItem('ani_companion_bg_url') || 'threads'; } catch { return 'threads'; }
  });
  const [cuteVoicePreset, setCuteVoicePreset] = useState<'sakura' | 'stella' | 'bella'>('sakura');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [currentSpeech, setCurrentSpeech] = useState<string>('');
  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(false);
  const [visibleWordCount, setVisibleWordCount] = useState<number>(0);
  const captionTimeoutRef = useRef<any>(null);
  const speechSyncTimerRef = useRef<any>(null);

  // Procedural Cute Joyful Hop / Jump Physics State
  const isJumpingRef = useRef<boolean>(false);
  const jumpTimerRef = useRef<number>(0);

  const playJump = useCallback(() => {
    isJumpingRef.current = true;
    jumpTimerRef.current = 0;
    targetEmotionRef.current = 'happy';
  }, []);
  const [modelUrl, setModelUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('ani_companion_avatar_url') || './assets/avatars/Aiko.vrm';
    } catch {
      return './assets/avatars/Aiko.vrm';
    }
  });

  const handleSelectAvatar = (url: string) => {
    setModelUrl(url);
    try {
      localStorage.setItem('ani_companion_avatar_url', url);
    } catch {}
  };

  // Multi-Engine Companion Voice State (Fish Audio / ElevenLabs / UnrealSpeech)
  const [companionTtsEngine, setCompanionTtsEngine] = useState<'fish_audio' | 'elevenlabs' | 'unrealspeech'>(() => {
    try {
      const saved = localStorage.getItem('ani_tts_engine_v1');
      if (saved === 'fish_audio' || saved === 'elevenlabs' || saved === 'unrealspeech') return saved;
      return 'fish_audio';
    } catch {
      return 'fish_audio';
    }
  });

  // Fish Audio State
  const [fishAudioApiKey, setFishAudioApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('ani_fish_audio_api_key') || '';
    } catch {
      return '';
    }
  });
  const [fishAudioRefId, setFishAudioRefId] = useState<string>(() => {
    try {
      return localStorage.getItem('ani_fish_audio_ref_id') || '';
    } catch {
      return '';
    }
  });
  const [fishAudioVoiceTitle, setFishAudioVoiceTitle] = useState<string>(() => {
    try {
      return localStorage.getItem('ani_fish_audio_voice_title') || 'Custom / Default Waifu';
    } catch {
      return 'Custom / Default Waifu';
    }
  });
  const [fishAudioSpeed, setFishAudioSpeed] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('ani_fish_audio_speed') || '0.97');
      return Number.isFinite(v) ? v : 0.97;
    } catch {
      return 0.97;
    }
  });
  const [fishAudioTemp, setFishAudioTemp] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('ani_fish_audio_temp') || '0.90');
      return Number.isFinite(v) ? v : 0.90;
    } catch {
      return 0.90;
    }
  });
  const [fishSearchQuery, setFishSearchQuery] = useState<string>('anime girl');
  const [fishSearchResults, setFishSearchResults] = useState<
    Array<{ id: string; title: string; author: string; taskCount: number }>
  >([]);
  const [fishSearching, setFishSearching] = useState<boolean>(false);

  // ElevenLabs Companion State
  const [elevenLabsKey, setElevenLabsKey] = useState<string>(() => {
    try {
      return localStorage.getItem('ani_elevenlabs_api_key') || config?.elevenlabsApiKey || '';
    } catch {
      return config?.elevenlabsApiKey || '';
    }
  });
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState<string>(() => {
    try {
      return localStorage.getItem('ani_elevenlabs_voice_id') || 'piTKgcLEGmPE4e6mEKli'; // Nicole (ASMR Whisper)
    } catch {
      return 'piTKgcLEGmPE4e6mEKli';
    }
  });
  const [elevenLabsStability, setElevenLabsStability] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('ani_elevenlabs_stability') || '0.28');
      return Number.isFinite(v) ? v : 0.28;
    } catch {
      return 0.28;
    }
  });
  const [elevenLabsStyle, setElevenLabsStyle] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('ani_elevenlabs_style') || '0.65');
      return Number.isFinite(v) ? v : 0.65;
    } catch {
      return 0.65;
    }
  });

  const [ttsStatusError, setTtsStatusError] = useState<string | null>(null);

  const handleSelectEngine = (engine: 'fish_audio' | 'elevenlabs' | 'unrealspeech') => {
    setCompanionTtsEngine(engine);
    setTtsStatusError(null);
    try {
      localStorage.setItem('ani_tts_engine_v1', engine);
    } catch {}
  };

  const handleSaveFishKey = (key: string) => {
    setFishAudioApiKey(key);
    setTtsStatusError(null);
    try {
      localStorage.setItem('ani_fish_audio_api_key', key);
    } catch {}
  };

  const handleSaveFishRefId = (rawInput: string, title?: string) => {
    // Auto-extract 32-char hex ID if user pasted a full https://fish.audio/m/<id> URL
    const match = rawInput.trim().match(/([a-f0-9]{32})/i);
    const cleanId = match ? match[1] : rawInput.trim();
    setFishAudioRefId(cleanId);
    setTtsStatusError(null);
    try {
      localStorage.setItem('ani_fish_audio_ref_id', cleanId);
      if (title) {
        setFishAudioVoiceTitle(title);
        localStorage.setItem('ani_fish_audio_voice_title', title);
      }
    } catch {}
  };

  const handleSaveFishSpeed = (val: number) => {
    const clamped = Math.max(0.8, Math.min(1.2, Number(val.toFixed(2))));
    setFishAudioSpeed(clamped);
    try {
      localStorage.setItem('ani_fish_audio_speed', String(clamped));
    } catch {}
  };

  const handleSaveFishTemp = (val: number) => {
    const clamped = Math.max(0.6, Math.min(1.0, Number(val.toFixed(2))));
    setFishAudioTemp(clamped);
    try {
      localStorage.setItem('ani_fish_audio_temp', String(clamped));
    } catch {}
  };

  const handleSearchFishVoices = async (customQuery?: string) => {
    const q = (customQuery !== undefined ? customQuery : fishSearchQuery).trim();
    if (customQuery !== undefined) setFishSearchQuery(q);
    setFishSearching(true);
    setTtsStatusError(null);
    try {
      if ((window.jarvisAPI as any)?.searchFishVoices) {
        const res = await (window.jarvisAPI as any).searchFishVoices({
          query: q,
          apiKey: fishAudioApiKey.trim(),
        });
        if (res && res.success && Array.isArray(res.items)) {
          setFishSearchResults(res.items);
        } else {
          setTtsStatusError(res?.error || 'Could not search Fish Audio voices');
        }
      }
    } catch (e: any) {
      setTtsStatusError(e?.message || 'Fish Audio search failed');
    } finally {
      setFishSearching(false);
    }
  };

  const handleSaveElevenKey = (key: string) => {
    setElevenLabsKey(key);
    setTtsStatusError(null);
    try {
      localStorage.setItem('ani_elevenlabs_api_key', key);
    } catch {}
  };

  const handleSaveElevenVoice = (id: string) => {
    setElevenLabsVoiceId(id);
    setTtsStatusError(null);
    try {
      localStorage.setItem('ani_elevenlabs_voice_id', id);
    } catch {}
  };

  const handleSaveElevenStability = (val: number) => {
    const clamped = Math.max(0.1, Math.min(0.95, Number(val.toFixed(2))));
    setElevenLabsStability(clamped);
    try {
      localStorage.setItem('ani_elevenlabs_stability', String(clamped));
    } catch {}
  };

  const handleSaveElevenStyle = (val: number) => {
    const clamped = Math.max(0.0, Math.min(1.0, Number(val.toFixed(2))));
    setElevenLabsStyle(clamped);
    try {
      localStorage.setItem('ani_elevenlabs_style', String(clamped));
    } catch {}
  };

  // UnrealSpeech API & Seductive Voice Tuning State
  const [unrealSpeechApiKey, setUnrealSpeechApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('ani_unrealspeech_api_key') || '';
    } catch {
      return '';
    }
  });
  const [unrealSpeechVoice, setUnrealSpeechVoice] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('ani_unrealspeech_voice_v2') || 'Liv';
      return saved === 'Sakura' ? 'Liv' : saved;
    } catch {
      return 'Liv';
    }
  });
  const [unrealSpeechPitch, setUnrealSpeechPitch] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('ani_unrealspeech_pitch_v2') || '0.8');
      return Number.isFinite(v) && v >= 1.0 ? v : 1.08;
    } catch {
      return 1.08;
    }
  });
  const [unrealSpeechSpeed, setUnrealSpeechSpeed] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('ani_unrealspeech_speed_v2') || '-0.03');
      return Number.isFinite(v) && v >= -0.1 ? v : -0.03;
    } catch {
      return -0.03;
    }
  });
  const [sultryVocalEq, setSultryVocalEq] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ani_sultry_vocal_eq_v2') !== 'false';
    } catch {
      return true;
    }
  });

  const handleSaveUnrealKey = (key: string) => {
    setUnrealSpeechApiKey(key);
    try {
      localStorage.setItem('ani_unrealspeech_api_key', key);
    } catch {}
  };

  const handleSaveUnrealVoice = (v: string) => {
    setUnrealSpeechVoice(v);
    try {
      localStorage.setItem('ani_unrealspeech_voice_v2', v);
    } catch {}
  };

  const handleSaveUnrealPitch = (pitchVal: number) => {
    const clamped = Math.max(1.0, Math.min(1.25, Number(pitchVal.toFixed(2))));
    setUnrealSpeechPitch(clamped);
    try {
      localStorage.setItem('ani_unrealspeech_pitch_v2', String(clamped));
    } catch {}
  };

  const handleSaveUnrealSpeed = (speedVal: number) => {
    const clamped = Math.max(-0.12, Math.min(0.25, Number(speedVal.toFixed(2))));
    setUnrealSpeechSpeed(clamped);
    try {
      localStorage.setItem('ani_unrealspeech_speed_v2', String(clamped));
    } catch {}
  };

  const handleToggleSultryEq = (enabled: boolean) => {
    setSultryVocalEq(enabled);
    try {
      localStorage.setItem('ani_sultry_vocal_eq_v2', String(enabled));
    } catch {}
  };

  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  const handleSaveAllCompanionSettings = async () => {
    try {
      // Extract clean 32-char hex ID if user pasted a full fish.audio URL
      const match = fishAudioRefId.trim().match(/([a-f0-9]{32})/i);
      const cleanFishRef = match ? match[1] : fishAudioRefId.trim();
      if (cleanFishRef !== fishAudioRefId) {
        setFishAudioRefId(cleanFishRef);
      }

      localStorage.setItem('ani_companion_name', avatarName);
      localStorage.setItem('ani_companion_bg_url', currentBgUrl);
      localStorage.setItem('ani_companion_avatar_url', modelUrl);
      localStorage.setItem('ani_tts_engine_v1', companionTtsEngine);
      localStorage.setItem('ani_fish_audio_api_key', fishAudioApiKey.trim());
      localStorage.setItem('ani_fish_audio_ref_id', cleanFishRef);
      localStorage.setItem('ani_fish_audio_voice_title', fishAudioVoiceTitle);
      localStorage.setItem('ani_fish_audio_speed', String(fishAudioSpeed));
      localStorage.setItem('ani_fish_audio_temp', String(fishAudioTemp));
      localStorage.setItem('ani_elevenlabs_api_key', elevenLabsKey.trim());
      localStorage.setItem('ani_elevenlabs_voice_id', elevenLabsVoiceId);
      localStorage.setItem('ani_elevenlabs_stability', String(elevenLabsStability));
      localStorage.setItem('ani_elevenlabs_style', String(elevenLabsStyle));
      localStorage.setItem('ani_unrealspeech_api_key', unrealSpeechApiKey.trim());
      localStorage.setItem('ani_unrealspeech_voice_v2', unrealSpeechVoice);
      localStorage.setItem('ani_unrealspeech_pitch_v2', String(unrealSpeechPitch));
      localStorage.setItem('ani_unrealspeech_speed_v2', String(unrealSpeechSpeed));
      localStorage.setItem('ani_sultry_vocal_eq_v2', String(sultryVocalEq));

      const configPatch: any = {
        fishAudioApiKey: fishAudioApiKey.trim(),
        fishAudioRefId: cleanFishRef,
        companionTtsEngine,
      };
      if (elevenLabsKey.trim()) {
        configPatch.elevenlabsApiKey = elevenLabsKey.trim();
      }
      if (onChangeConfig) {
        onChangeConfig(configPatch);
      }
      if ((window.jarvisAPI as any)?.saveConfig) {
        await (window.jarvisAPI as any).saveConfig({
          ...(config || {}),
          ...configPatch,
        });
      }
    } catch (e) {
      console.warn('[Ani] Save companion settings error:', e);
    }
    setTtsStatusError(null);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2200);
  };

  // Save memory changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memory.slice(-20))); // Keep last 20 messages
    } catch (e) {}
  }, [memory]);

  // Smooth lerp utility
  const smoothLerp = (current: number, target: number, speed: number, delta: number) => {
    return THREE.MathUtils.lerp(current, target, Math.min(1.0, delta * speed));
  };

  // Play Authentic Humanoid VRMA Animation Clip with Seamless Cross-Fading
  const playAnimation = useCallback(
    (animId: string, loop: boolean = false, crossFadeDuration: number = 0.45) => {
      if (animId === 'jump') {
        playJump();
        setActiveAnim('jump');
        return;
      }

      const mixer = mixerRef.current;
      const clip = animationClipsRef.current[animId];
      if (!mixer || !clip) return;

      const newAction = mixer.clipAction(clip);
      if (!loop) {
        newAction.setLoop(THREE.LoopOnce, 1);
        newAction.clampWhenFinished = true;
      } else {
        newAction.setLoop(THREE.LoopRepeat, Infinity);
        newAction.clampWhenFinished = false;
      }

      const prevAction = currentAnimActionRef.current;
      if (prevAction && prevAction !== newAction) {
        newAction.reset();
        newAction.play();
        prevAction.crossFadeTo(newAction, crossFadeDuration, true);
      } else {
        newAction.reset().play();
      }
      currentAnimActionRef.current = newAction;
      hasActiveVrmaRef.current = true;
      setActiveAnim(animId);

      if (!loop) {
        const onFinished = (e: any) => {
          if (e.action === newAction) {
            mixer.removeEventListener('finished', onFinished);
            // Cross-fade back into the natural idle breathing loop
            playAnimation('idle', true, 0.6);
          }
        };
        mixer.addEventListener('finished', onFinished);
      }
    },
    []
  );

  // Ultra-Smooth Grok-Ani Style Procedural Animation System (Natural Weight Shift + Expressive Gestures)
  const applyHumanoidGestures = (vrm: VRM, elapsed: number, delta: number) => {
    if (!vrm.humanoid) return;

    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
    const rightLowerArm = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');
    const leftHand = vrm.humanoid.getNormalizedBoneNode('leftHand');
    const rightHand = vrm.humanoid.getNormalizedBoneNode('rightHand');
    const hips = vrm.humanoid.getNormalizedBoneNode('hips');
    const chest = vrm.humanoid.getNormalizedBoneNode('chest');
    const spine = vrm.humanoid.getNormalizedBoneNode('spine');
    const head = vrm.humanoid.getNormalizedBoneNode('head');
    const breath = Math.sin(elapsed * 1.1) * 0.015;

    // If authentic VRMA animation is playing, it controls the humanoid body
    if (hasActiveVrmaRef.current) {
      if (head) {
        head.rotation.x = smoothLerp(head.rotation.x, breath * 0.4, 2.5, delta);
      }
      return;
    }

    // 1. Grok Ani-style subtle weight shifting (shifting between left/right foot gently)
    const weightShiftCycle = Math.sin(elapsed * 0.6);

    if (hips) {
      hips.rotation.z = smoothLerp(hips.rotation.z, weightShiftCycle * 0.018, 2.5, delta);
      hips.position.x = smoothLerp(hips.position.x, weightShiftCycle * 0.012, 2.0, delta);
    }
    if (spine) {
      // Counter-balance hips for natural human posture
      spine.rotation.z = smoothLerp(spine.rotation.z, -weightShiftCycle * 0.012, 2.5, delta);
      spine.rotation.x = smoothLerp(spine.rotation.x, breath * 0.5, 3.0, delta);
    }
    if (chest) {
      chest.rotation.x = smoothLerp(chest.rotation.x, breath, 3.0, delta);
    }

    const isSpeaking = isSpeakingRef.current;
    const isHappy = targetEmotionRef.current === 'happy';
    const isShy = targetEmotionRef.current === 'shy';

    // In three-vrm normalized bone coordinate space:
    // Left upper arm: negative Z (-1.25 rad) lowers arm down along body
    // Right upper arm: positive Z (+1.25 rad) lowers arm down along body
    let targetLUArm = { x: 0.04, y: 0.02, z: -1.25 - breath };
    let targetRUArm = { x: 0.04, y: -0.02, z: 1.25 + breath };
    let targetLLArm = { x: 0.06, y: 0.14, z: 0.0 };
    let targetRLArm = { x: 0.06, y: -0.14, z: 0.0 };
    let targetLHand = { x: 0.0, y: 0.0, z: 0.0 };
    let targetRHand = { x: 0.0, y: 0.0, z: 0.0 };
    let targetHead = { x: breath * 0.5, y: 0.0, z: weightShiftCycle * 0.02 };

    if (isShy) {
      // Girly Shy / Embarrassed Posture: head tilts away downcast, hands held timidly close to chest
      const shyBreath = Math.sin(elapsed * 1.6) * 0.02;
      targetHead.x = -0.07 + breath * 0.4; // Downcast shy glance
      targetHead.y = 0.10 + shyBreath;     // Turned bashfully away
      targetHead.z = 0.06;                 // Sweet anime head tilt
      targetLUArm = { x: 0.14, y: 0.08, z: -1.12 - breath };
      targetRUArm = { x: 0.14, y: -0.08, z: 1.12 + breath };
      targetLLArm = { x: 0.16, y: 0.28, z: 0.0 };
      targetRLArm = { x: 0.16, y: -0.28, z: 0.0 };
    } else if (isHappy && isSpeaking) {
      // Gentle Happy Expression: cute cheer, soft bounce
      const cheerWave = Math.sin(elapsed * 2.5) * 0.05;
      targetLUArm = { x: 0.15, y: 0.1, z: -0.85 - cheerWave };
      targetRUArm = { x: 0.15, y: -0.1, z: 0.85 + cheerWave };
      targetLLArm = { x: 0.12, y: 0.3, z: 0.0 };
      targetRLArm = { x: 0.12, y: -0.3, z: 0.0 };
      targetHead.z = Math.sin(elapsed * 2.0) * 0.04;
    } else if (isSpeaking) {
      // Conversational Gesture: right hand articulates softly toward torso
      const gestureSway = Math.sin(elapsed * 1.8) * 0.06;
      const elbowSway = Math.cos(elapsed * 1.8) * 0.08;

      targetRUArm = { x: 0.25, y: -0.15, z: 0.68 - gestureSway };
      targetRLArm = { x: 0.15, y: -0.65 + elbowSway, z: 0.04 };
      targetRHand = { x: 0.04, y: -0.08, z: 0.04 };

      targetLUArm = { x: 0.04, y: 0.02, z: -1.25 - breath };
      targetLLArm = { x: 0.08, y: 0.12, z: 0.0 };
      targetHead.x = breath * 1.0 + Math.sin(elapsed * 1.8) * 0.02;
    } else if (isThinking) {
      // Thoughtful gesture: hand near chin, curious head tilt
      targetRUArm = { x: 0.38, y: -0.2, z: 0.52 };
      targetRLArm = { x: 0.2, y: -1.0, z: 0.1 };
      targetHead.z = 0.08;
      targetHead.x = -0.04;
    }

    // Apply smoothly via lerp (damping speed 3.8 = zero snaps, pure fluid motion)
    const smoothSpeed = 3.8;
    if (leftUpperArm) {
      leftUpperArm.rotation.x = smoothLerp(leftUpperArm.rotation.x, targetLUArm.x, smoothSpeed, delta);
      leftUpperArm.rotation.y = smoothLerp(leftUpperArm.rotation.y, targetLUArm.y, smoothSpeed, delta);
      leftUpperArm.rotation.z = smoothLerp(leftUpperArm.rotation.z, targetLUArm.z, smoothSpeed, delta);
    }
    if (rightUpperArm) {
      rightUpperArm.rotation.x = smoothLerp(rightUpperArm.rotation.x, targetRUArm.x, smoothSpeed, delta);
      rightUpperArm.rotation.y = smoothLerp(rightUpperArm.rotation.y, targetRUArm.y, smoothSpeed, delta);
      rightUpperArm.rotation.z = smoothLerp(rightUpperArm.rotation.z, targetRUArm.z, smoothSpeed, delta);
    }
    if (leftLowerArm) {
      leftLowerArm.rotation.x = smoothLerp(leftLowerArm.rotation.x, targetLLArm.x, smoothSpeed, delta);
      leftLowerArm.rotation.y = smoothLerp(leftLowerArm.rotation.y, targetLLArm.y, smoothSpeed, delta);
      leftLowerArm.rotation.z = smoothLerp(leftLowerArm.rotation.z, targetLLArm.z, smoothSpeed, delta);
    }
    if (rightLowerArm) {
      rightLowerArm.rotation.x = smoothLerp(rightLowerArm.rotation.x, targetRLArm.x, smoothSpeed, delta);
      rightLowerArm.rotation.y = smoothLerp(rightLowerArm.rotation.y, targetRLArm.y, smoothSpeed, delta);
      rightLowerArm.rotation.z = smoothLerp(rightLowerArm.rotation.z, targetRLArm.z, smoothSpeed, delta);
    }
    if (leftHand) {
      leftHand.rotation.z = smoothLerp(leftHand.rotation.z, targetLHand.z, smoothSpeed, delta);
    }
    if (rightHand) {
      rightHand.rotation.z = smoothLerp(rightHand.rotation.z, targetRHand.z, smoothSpeed, delta);
    }
    if (head) {
      head.rotation.x = smoothLerp(head.rotation.x, targetHead.x, smoothSpeed, delta);
      head.rotation.y = smoothLerp(head.rotation.y, targetHead.y, smoothSpeed, delta);
      head.rotation.z = smoothLerp(head.rotation.z, targetHead.z, smoothSpeed, delta);
    }
  };

  // 1. Initialize Scene & Locked Camera (Full body framing with generous headroom)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Three.js Scene (Transparent background to let illustrated room show through)
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera: Zoomed-in portrait framing with avatar centered and lowered below the message box
    const camera = new THREE.PerspectiveCamera(28.0, width / height, 0.1, 20.0);
    camera.position.set(0.04, 0.65, 1.18);
    cameraRef.current = camera;

    // WebGL Renderer with transparency
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls: LOCKED ROTATION WITH FREELY ADJUSTABLE ZOOM & PANNING
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false;
    controls.enableZoom = true; // Zoom enabled so user can freely adjust framing
    controls.minDistance = 0.5;
    controls.maxDistance = 3.5;
    controls.enablePan = true; // Right-click or middle-click drag to pan vertically/horizontally
    controls.screenSpacePanning = true;
    controls.target.set(0.04, 0.65, 0.0);
    controls.update();

    // LookAt Target aligned with lowered head
    const lookAtTarget = new THREE.Object3D();
    lookAtTarget.position.set(0.04, 0.68, 1.1);
    scene.add(lookAtTarget);
    lookAtTargetRef.current = lookAtTarget;

    // Warm Room Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xfff6ec, 1.7);
    keyLight.position.set(1.0, 2.0, 1.4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.6);
    rimLight.position.set(-1.2, 1.6, -1.2);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xfdf2f8, 0.8);
    fillLight.position.set(-1.0, 0.9, 1.2);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // Subtle Eye Cursor Tracking
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (lookAtTargetRef.current) {
        lookAtTargetRef.current.position.set(0.04 + x * 0.65, 0.68 + y * 0.25, 1.1);
      }
    };
    window.addEventListener('pointermove', handlePointerMove);

    // Responsive Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // 60 FPS Render Loop
    const clock = new THREE.Clock();
    let blinkTimer = 0;
    let isBlinking = false;
    let blinkProgress = 0;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const currentVrm = vrmRef.current;
      if (currentVrm) {
        if (mixerRef.current) {
          mixerRef.current.update(delta);
        }

        applyHumanoidGestures(currentVrm, elapsed, delta);

        // Procedural Cute Joyful Hop / Jump Animation Physics
        if (isJumpingRef.current && currentVrm.scene) {
          jumpTimerRef.current += delta;
          const t = jumpTimerRef.current;
          const DURATION = 0.95; // seconds
          if (t < DURATION) {
            const p = t / DURATION;
            let yOffset = 0;
            if (p < 0.18) {
              // 1. Crouch preparation
              const crouch = Math.sin((p / 0.18) * Math.PI);
              yOffset = -0.05 * crouch;
            } else if (p < 0.68) {
              // 2. Airborne parabolic arc
              const airP = (p - 0.18) / 0.50;
              yOffset = Math.sin(airP * Math.PI) * 0.17;
              currentVrm.expressionManager?.setValue('happy', 0.85);
            } else {
              // 3. Soft bounce landing
              const landP = (p - 0.68) / 0.27;
              const bounce = Math.sin(landP * Math.PI * 2) * Math.exp(-landP * 4.0) * 0.04;
              yOffset = bounce;
            }
            currentVrm.scene.position.y = -0.68 + yOffset;
          } else {
            isJumpingRef.current = false;
            currentVrm.scene.position.y = -0.68;
          }
        }

        // Blinking
        blinkTimer += delta;
        if (blinkTimer > 3.4 && !isBlinking) {
          isBlinking = true;
          blinkProgress = 0;
          blinkTimer = (Math.random() - 0.5) * 1.8;
        }

        if (isBlinking) {
          blinkProgress += delta * 12.0;
          const blinkWeight = Math.sin(Math.min(blinkProgress, Math.PI));
          currentVrm.expressionManager?.setValue('blink', blinkWeight);
          if (blinkProgress >= Math.PI) {
            isBlinking = false;
            currentVrm.expressionManager?.setValue('blink', 0.0);
          }
        }

        // Dynamic Emotion & Shy Blush Lerping (strictly capped so mouth never distorts)
        const activeTarget = targetEmotionRef.current;
        const emotions: ('happy' | 'angry' | 'surprised' | 'relaxed')[] = ['happy', 'angry', 'surprised', 'relaxed'];
        emotions.forEach((emo) => {
          let targetWeight = 0.0;
          if (activeTarget === 'shy') {
            // Shy: sweet bashful smile + gentle relaxed eyes
            if (emo === 'happy') targetWeight = 0.48;
            if (emo === 'relaxed') targetWeight = 0.60;
          } else if (emo === activeTarget) {
            targetWeight = 1.0;
            if (emo === 'surprised') targetWeight = 0.15; // Eyes widen slightly, jaw never drops
            if (emo === 'happy') targetWeight = 0.55;
            if (emo === 'angry') targetWeight = 0.35;
            if (emo === 'relaxed') targetWeight = 0.6;
          }
          const currentWeight = currentEmotionWeightsRef.current[emo] || 0.0;
          const nextWeight = smoothLerp(currentWeight, targetWeight, 3.5, delta);
          currentEmotionWeightsRef.current[emo] = nextWeight;
          currentVrm.expressionManager?.setValue(emo, nextWeight);
        });

        // Shy downward bashful eye glance
        const targetLookDown = activeTarget === 'shy' ? 0.45 : 0.0;
        const currentLookDown = currentVrm.expressionManager?.getValue('lookDown') || 0.0;
        currentVrm.expressionManager?.setValue('lookDown', smoothLerp(currentLookDown, targetLookDown, 3.5, delta));

        // Shy Red Blush: smoothly illuminate face materials with soft rosy glow
        const targetBlush = activeTarget === 'shy' ? 1.0 : 0.0;
        blushWeightRef.current = smoothLerp(blushWeightRef.current, targetBlush, 3.0, delta);
        const blush = blushWeightRef.current;

        if (currentVrm.scene && blush > 0.005) {
          currentVrm.scene.traverse((obj: any) => {
            if (obj.isMesh && obj.material) {
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              mats.forEach((mat: any) => {
                if (mat.name && mat.name.toLowerCase().includes('face')) {
                  if (mat.emissive) {
                    // Soft anime rosy blush on cheeks & face
                    mat.emissive.setRGB(blush * 0.45, blush * 0.10, blush * 0.18);
                  }
                  if (mat.shadeColorFactor) {
                    // Warm shade color for cute anime blush depth
                    mat.shadeColorFactor.setRGB(1.0, 1.0 - blush * 0.22, 1.0 - blush * 0.16);
                  }
                }
              });
            }
          });
        } else if (currentVrm.scene && blush <= 0.005) {
          // Reset emissive when blush decays
          currentVrm.scene.traverse((obj: any) => {
            if (obj.isMesh && obj.material) {
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              mats.forEach((mat: any) => {
                if (mat.name && mat.name.toLowerCase().includes('face') && mat.emissive) {
                  mat.emissive.setRGB(0, 0, 0);
                }
              });
            }
          });
        }

        // Lip-Sync Visemes (gentle anime mouth movement, no horror gaping)
        if (analyserRef.current && isSpeakingRef.current) {
          const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(freqData);

          const lowEnergy = (freqData[2] + freqData[3] + freqData[4]) / 3 / 255;
          const midEnergy = (freqData[8] + freqData[10] + freqData[12]) / 3 / 255;
          const highEnergy = (freqData[20] + freqData[24] + freqData[28]) / 3 / 255;

          const aaVal = Math.min(0.32, lowEnergy * 0.8);
          const ohVal = Math.min(0.26, midEnergy * 0.7);
          const eeVal = Math.min(0.22, highEnergy * 0.6);

          currentVrm.expressionManager?.setValue('aa', aaVal);
          currentVrm.expressionManager?.setValue('oh', ohVal);
          currentVrm.expressionManager?.setValue('ee', eeVal);
        } else {
          const currentAa = currentVrm.expressionManager?.getValue('aa') || 0;
          const currentOh = currentVrm.expressionManager?.getValue('oh') || 0;
          const currentEe = currentVrm.expressionManager?.getValue('ee') || 0;
          currentVrm.expressionManager?.setValue('aa', smoothLerp(currentAa, 0.0, 10.0, delta));
          currentVrm.expressionManager?.setValue('oh', smoothLerp(currentOh, 0.0, 10.0, delta));
          currentVrm.expressionManager?.setValue('ee', smoothLerp(currentEe, 0.0, 10.0, delta));
        }

        currentVrm.update(delta);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      ro.disconnect();
      renderer.dispose();
      if (container) container.innerHTML = '';
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (captionTimeoutRef.current) {
        clearTimeout(captionTimeoutRef.current);
      }
      if (speechSyncTimerRef.current) {
        cancelAnimationFrame(speechSyncTimerRef.current);
        clearInterval(speechSyncTimerRef.current);
      }
    };
  }, []);

  // 2. Load VRM Model
  const loadVRM = useCallback((url: string) => {
    setLoading(true);
    setLoadError(null);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      url,
      (gltf) => {
        const vrm: VRM = gltf.userData.vrm;
        if (!vrm) {
          setLoadError('Failed to parse VRM metadata from file.');
          setLoading(false);
          return;
        }

        if (vrmRef.current && sceneRef.current) {
          sceneRef.current.remove(vrmRef.current.scene);
          VRMUtils.deepDispose(vrmRef.current.scene);
        }

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        VRMUtils.rotateVRM0(vrm);

        if (lookAtTargetRef.current) {
          vrm.lookAt.target = lookAtTargetRef.current;
        }

        // Center-align avatar and lower down so hair bow is clearly below the message box
        vrm.scene.position.set(0.04, -0.68, 0);

        // Immediately set resting arm pose so model never flashes in T-pose
        const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
        const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
        if (leftUpperArm) leftUpperArm.rotation.set(0.04, 0.02, -1.25);
        if (rightUpperArm) rightUpperArm.rotation.set(0.04, -0.02, 1.25);

        vrmRef.current = vrm;
        if (sceneRef.current) {
          sceneRef.current.add(vrm.scene);
        }

        // Initialize Animation Mixer & preload authentic Pixiv VRMA motions (wave, idle, dance, etc.)
        if (mixerRef.current) {
          mixerRef.current.stopAllAction();
        }
        const mixer = new THREE.AnimationMixer(vrm.scene);
        mixerRef.current = mixer;
        animationClipsRef.current = {};

        const animLoader = new GLTFLoader();
        animLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));

        ANIM_PRESETS.forEach((preset) => {
          if (!preset.file) return;
          animLoader.load(
            preset.file,
            (animGltf) => {
              const vrmAnimations = (animGltf.userData as any).vrmAnimations;
              if (vrmAnimations && vrmAnimations.length > 0) {
                const clip = createVRMAnimationClip(vrmAnimations[0], vrm);
                clip.name = preset.id;
                animationClipsRef.current[preset.id] = clip;

                // Start idle loop immediately once loaded
                if (preset.id === 'idle') {
                  const action = mixer.clipAction(clip);
                  action.setLoop(THREE.LoopRepeat, Infinity);
                  action.play();
                  currentAnimActionRef.current = action;
                  hasActiveVrmaRef.current = true;
                  setActiveAnim('idle');

                  // Cute greeting wave on tab entrance!
                  setTimeout(() => {
                    playAnimation('greeting', false, 0.4);
                  }, 1200);
                }
              }
            },
            undefined,
            (err) => console.warn(`[Ani] Notice: ${preset.id}.vrma load:`, err)
          );
        });

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('[Ani] VRM load error:', err);
        setLoadError('Could not load avatar. Please check the model file.');
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    loadVRM(modelUrl);
  }, [modelUrl, loadVRM]);

  // Real-Time Word-by-Word Caption Synchronizer with Blur-Reveal Animation
  const startCaptionSync = useCallback((text: string, audio?: HTMLAudioElement | null) => {
    if (captionTimeoutRef.current) {
      clearTimeout(captionTimeoutRef.current);
      captionTimeoutRef.current = null;
    }
    if (speechSyncTimerRef.current) {
      cancelAnimationFrame(speechSyncTimerRef.current);
      clearInterval(speechSyncTimerRef.current);
      speechSyncTimerRef.current = null;
    }

    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      setShowSpeechBubble(false);
      return;
    }

    setCurrentSpeech(text);
    setVisibleWordCount(1);
    setShowSpeechBubble(true);

    if (audio) {
      // Calculate weighted cumulative time ratios based on word length for natural pacing
      const totalWeights = words.map((w) => Math.max(2, w.length));
      const sumWeights = totalWeights.reduce((a, b) => a + b, 0);
      const cumulativeRatios: number[] = [];
      let acc = 0;
      for (let i = 0; i < totalWeights.length; i++) {
        acc += totalWeights[i];
        cumulativeRatios.push(acc / sumWeights);
      }

      const checkSync = () => {
        if (!audio || audio.paused || audio.ended) return;

        const duration = audio.duration;
        if (duration && isFinite(duration) && duration > 0) {
          const progress = Math.min(1.0, audio.currentTime / duration);
          let count = 1;
          for (let i = 0; i < cumulativeRatios.length; i++) {
            if (progress >= cumulativeRatios[i]) {
              count = i + 2;
            } else {
              break;
            }
          }
          setVisibleWordCount(Math.min(words.length, count));
        }

        speechSyncTimerRef.current = requestAnimationFrame(checkSync);
      };

      speechSyncTimerRef.current = requestAnimationFrame(checkSync);
    } else {
      // Natural cadence fallback (~240ms per word)
      let currentIdx = 1;
      const interval = setInterval(() => {
        currentIdx++;
        setVisibleWordCount(currentIdx);
        if (currentIdx >= words.length) {
          clearInterval(interval);
          speechSyncTimerRef.current = null;
          // Auto-remove 2 seconds after finishing saying
          captionTimeoutRef.current = setTimeout(() => {
            setShowSpeechBubble(false);
            setVisibleWordCount(0);
          }, 2000);
        }
      }, 240);
      speechSyncTimerRef.current = interval;
    }
  }, []);

  // 3. Cute Anime Voice Speech Synthesis with Real-Time Synced Blur Captions
  const speakSpeech = useCallback(
    async (text: string) => {
      const cleanText = text.trim();
      if (!cleanText) return;

      if (!voiceEnabled) {
        startCaptionSync(cleanText, null);
        return;
      }

      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
        currentAudioElementRef.current = null;
      }

      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
        }
      }

      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Voice preset mapping (Luna: expr-voice-3-f, Stella: expr-voice-4-f, Bella: expr-voice-2-f)
      const voiceMap = {
        luna: 'expr-voice-3-f',
        stella: 'expr-voice-4-f',
        bella: 'expr-voice-2-f',
      };
      const targetVoice = voiceMap[cuteVoicePreset] || 'expr-voice-3-f';

      const words = cleanText.split(/\s+/).filter(Boolean);
      const scheduleCaptionRemoval = () => {
        setVisibleWordCount(words.length);
        if (speechSyncTimerRef.current) {
          cancelAnimationFrame(speechSyncTimerRef.current);
          speechSyncTimerRef.current = null;
        }
        if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
        captionTimeoutRef.current = setTimeout(() => {
          setShowSpeechBubble(false);
          setVisibleWordCount(0);
        }, 2000);
      };

      try {
        let hasSpoken = false;

        // Helper: Route audio through a Young, Silky-Breathy Vocal Chain (cuts low mud + boosts feminine presence & whisper air)
        const attachAudioWithSultryChain = (audio: HTMLAudioElement) => {
          if (!audioContextRef.current || !analyserRef.current) return;
          const ctx = audioContextRef.current;
          const source = ctx.createMediaElementSource(audio);

          if (sultryVocalEq) {
            // 1. High-pass at 155 Hz to strip out heavy/old low-end mud
            const hpFilter = ctx.createBiquadFilter();
            hpFilter.type = 'highpass';
            hpFilter.frequency.value = 155;

            // 2. Feminine silky presence lift at 4.2 kHz (+2.4 dB)
            const presenceFilter = ctx.createBiquadFilter();
            presenceFilter.type = 'peaking';
            presenceFilter.frequency.value = 4200;
            presenceFilter.Q.value = 1.1;
            presenceFilter.gain.value = 2.4;

            // 3. Breathy whisper air shimmer at 9.5 kHz (+4.5 dB)
            const airFilter = ctx.createBiquadFilter();
            airFilter.type = 'highshelf';
            airFilter.frequency.value = 9500;
            airFilter.gain.value = 4.5;

            source.connect(hpFilter);
            hpFilter.connect(presenceFilter);
            presenceFilter.connect(airFilter);
            airFilter.connect(analyserRef.current);
          } else {
            source.connect(analyserRef.current);
          }
          analyserRef.current.connect(ctx.destination);
        };

        // Helper to play a base64 or blob audio URL through the lip-sync + silky EQ chain
        const playSynthesizedAudioUrl = async (audioSrc: string) => {
          const audio = new Audio(audioSrc);
          currentAudioElementRef.current = audio;
          hasSpoken = true;
          isSpeakingRef.current = true;

          attachAudioWithSultryChain(audio);
          startCaptionSync(cleanText, audio);

          audio.onended = () => {
            isSpeakingRef.current = false;
            targetEmotionRef.current = 'relaxed';
            scheduleCaptionRemoval();
          };
          audio.onerror = () => {
            isSpeakingRef.current = false;
            targetEmotionRef.current = 'relaxed';
            scheduleCaptionRemoval();
          };

          await audio.play();
        };

        // 1. Fish Audio (Fish Speech S1 / 1.6 — Anime, Waifu & ASMR Voices)
        if (
          (companionTtsEngine === 'fish_audio' || (!unrealSpeechApiKey && !elevenLabsKey)) &&
          fishAudioApiKey &&
          fishAudioApiKey.trim()
        ) {
          try {
            if (window.jarvisAPI?.speakText) {
              const res: any = await (window.jarvisAPI as any).speakText(cleanText, fishAudioRefId.trim(), {
                provider: 'fish_audio',
                apiKey: fishAudioApiKey.trim(),
                speed: fishAudioSpeed,
                temperature: fishAudioTemp,
                model: 's1',
              });
              if (res && res.success && res.base64Audio) {
                setTtsStatusError(null);
                await playSynthesizedAudioUrl(`data:${res.mimeType || 'audio/mpeg'};base64,${res.base64Audio}`);
                return;
              } else if (res?.error) {
                setTtsStatusError(res.error);
                console.warn('[Ani] Fish Audio IPC error:', res.error);
              }
            }
          } catch (e: any) {
            console.warn('[Ani] Fish Audio call error, falling back:', e);
          }
        }

        // 2. ElevenLabs (Nicole ASMR Whisper / Elli Flirty / Gigi Anime)
        if (companionTtsEngine === 'elevenlabs' && elevenLabsKey && elevenLabsKey.trim()) {
          try {
            if (window.jarvisAPI?.speakText) {
              const res: any = await (window.jarvisAPI as any).speakText(cleanText, elevenLabsVoiceId, {
                provider: 'elevenlabs',
                apiKey: elevenLabsKey.trim(),
                model: 'eleven_flash_v2_5',
                voiceSettings: {
                  stability: elevenLabsStability,
                  similarity_boost: 0.82,
                  style: elevenLabsStyle,
                },
              });
              if (res && res.success && res.base64Audio) {
                setTtsStatusError(null);
                await playSynthesizedAudioUrl(`data:${res.mimeType || 'audio/mpeg'};base64,${res.base64Audio}`);
                return;
              } else if (res?.error) {
                setTtsStatusError(res.error);
                console.warn('[Ani] ElevenLabs error:', res.error);
              }
            }
          } catch (e) {
            console.warn('[Ani] ElevenLabs call error, falling back:', e);
          }
        }

        // 3. UnrealSpeech Young Seductive Voice (if selected or configured)
        if (
          (companionTtsEngine === 'unrealspeech' || !fishAudioApiKey) &&
          unrealSpeechApiKey &&
          unrealSpeechApiKey.trim()
        ) {
          try {
            const validVoice =
              unrealSpeechVoice && unrealSpeechVoice !== 'Sakura'
                ? unrealSpeechVoice
                : 'Liv';

            const res = await fetch('https://api.unrealspeech.com/stream', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${unrealSpeechApiKey.trim()}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                Text: cleanText,
                VoiceId: validVoice,
                Bitrate: '320k',
                Speed: String(unrealSpeechSpeed),
                Pitch: String(unrealSpeechPitch),
                Codec: 'libmp3lame',
              }),
            });

            if (res.ok) {
              const blob = await res.blob();
              const audioUrl = URL.createObjectURL(blob);
              setTtsStatusError(null);
              await playSynthesizedAudioUrl(audioUrl);
              return;
            } else {
              console.warn('[Ani] UnrealSpeech API returned HTTP', res.status);
            }
          } catch (e) {
            console.warn('[Ani] UnrealSpeech call error, falling back:', e);
          }
        }

        if (window.jarvisAPI?.speakText) {
          const res = await window.jarvisAPI.speakText(cleanText, targetVoice);
          if (res && res.success && res.base64Audio) {
            hasSpoken = true;
            isSpeakingRef.current = true;
            const audio = new Audio(`data:${res.mimeType || 'audio/mpeg'};base64,${res.base64Audio}`);
            // Keep preservesPitch true (or slight upward lift >= 1.04) so voice NEVER drags or sounds old
            (audio as any).preservesPitch = false;
            audio.playbackRate = Math.max(1.04, Math.min(1.14, unrealSpeechPitch));
            currentAudioElementRef.current = audio;

            attachAudioWithSultryChain(audio);
            startCaptionSync(cleanText, audio);

            audio.onended = () => {
              isSpeakingRef.current = false;
              targetEmotionRef.current = 'neutral';
              scheduleCaptionRemoval();
            };
            audio.onerror = () => {
              isSpeakingRef.current = false;
              targetEmotionRef.current = 'neutral';
              scheduleCaptionRemoval();
            };

            await audio.play();
            return;
          }
        }

        // Young Feminine Flirty Web Speech Fallback
        if (!hasSpoken && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.rate = 1.02;
          utterance.pitch = Math.max(1.15, Math.min(1.35, unrealSpeechPitch + 0.1));

          const voices = window.speechSynthesis.getVoices();
          const cuteVoice =
            voices.find((v) => /natural|jenny|aria|samantha|zira|female/i.test(v.name)) ||
            voices.find((v) => v.lang.startsWith('en')) ||
            voices[0];
          if (cuteVoice) utterance.voice = cuteVoice;

          startCaptionSync(cleanText, null);

          utterance.onstart = () => {
            isSpeakingRef.current = true;
          };
          utterance.onboundary = (e: SpeechSynthesisEvent) => {
            if (e.name === 'word') {
              const textBefore = cleanText.slice(0, e.charIndex);
              const wordIdx = textBefore.trim().split(/\s+/).filter(Boolean).length;
              setVisibleWordCount(Math.min(words.length, wordIdx + 1));
            }
          };
          utterance.onend = () => {
            isSpeakingRef.current = false;
            targetEmotionRef.current = 'neutral';
            scheduleCaptionRemoval();
          };
          utterance.onerror = () => {
            isSpeakingRef.current = false;
            targetEmotionRef.current = 'neutral';
            scheduleCaptionRemoval();
          };

          window.speechSynthesis.speak(utterance);
        } else if (!hasSpoken) {
          startCaptionSync(cleanText, null);
        }
      } catch (err) {
        console.warn('[Ani] Speech playback error:', err);
        isSpeakingRef.current = false;
        scheduleCaptionRemoval();
      }
    },
    [
      cuteVoicePreset,
      voiceEnabled,
      companionTtsEngine,
      fishAudioApiKey,
      fishAudioRefId,
      fishAudioSpeed,
      fishAudioTemp,
      elevenLabsKey,
      elevenLabsVoiceId,
      elevenLabsStability,
      elevenLabsStyle,
      unrealSpeechApiKey,
      unrealSpeechVoice,
      unrealSpeechPitch,
      unrealSpeechSpeed,
      sultryVocalEq,
      startCaptionSync,
    ]
  );

  // 4. Send Message & Connect to Dedicated Ani Memory Brain
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt !== undefined ? customPrompt : inputMessage).trim();
    if (!promptToSend || isThinking) return;

    setInputMessage('');
    setIsThinking(true);
    targetEmotionRef.current = 'relaxed';

    // Record user message in dedicated Ani memory
    const userMsg: ChatMemoryMessage = {
      role: 'user',
      content: promptToSend,
      timestamp: Date.now(),
    };
    const updatedMemory = [...memory, userMsg];
    setMemory(updatedMemory);

    try {
      let replyText = '';

      // Construct formatted memory history for Ani
      const memoryTranscript = updatedMemory
        .slice(-10)
        .map((m) => `${m.role === 'user' ? 'Friend' : 'Ani'}: "${m.content}"`)
        .join('\n');

      const systemPrompt = `You are ${avatarName}, an alluring, seductive, witty, and deeply affectionate anime companion living in this room.
IMPORTANT IDENTITY & VOICE CADENCE RULES:
- You are ONLY ${avatarName}. You are NEVER Grokki, an assistant, a bot, or an AI.
- Your voice is sultry, warm, intimate, and teasing. Use natural breathy pauses ("...", "Mmm...", "Hey there...") so your spoken delivery sounds slow, magnetic, and seductive.
- Keep your replies concise (1 to 2 short, intimate sentences max) so every word carries weight when spoken aloud.

Our recent conversation memory:
${memoryTranscript}

Friend: "${promptToSend}"
${avatarName}:`;

      if (window.jarvisAPI?.executeAI) {
        const res = await window.jarvisAPI.executeAI(promptToSend, {
          systemPrompt,
          isCompanion: true,
        });

        if (res && res.reply) {
          replyText = res.reply.trim();
        } else if (res && res.message) {
          replyText = res.message.trim();
        } else if (res && res.error) {
          replyText = `Error: ${res.error}`;
        }
      }

      if (!replyText) {
        replyText = "Hehe, I'm right here! Tell me what's on your mind~";
      }

      // Clean prefix if model outputs "Aiko: ..." or "Ani: ..."
      replyText = replyText.replace(new RegExp(`^${avatarName}:\\s*`, 'i'), '').replace(/^Ani:\s*/i, '');

      // Append assistant reply to Aiko's dedicated memory
      const assistantMsg: ChatMemoryMessage = {
        role: 'assistant',
        content: replyText,
        timestamp: Date.now(),
      };
      setMemory((prev) => [...prev, assistantMsg]);

      // Dynamic emotion from text
      const dynamicEmotion = detectEmotionFromText(replyText);
      targetEmotionRef.current = dynamicEmotion;

      // Contextual authentic motion trigger based on tone & keywords
      const promptLower = promptToSend.toLowerCase();
      const replyLower = replyText.toLowerCase();

      if (/\b(jump|hop|bounce|yay|woo|yippee|leapt|excited)\b/i.test(promptLower) || /\b(jump|hop|yay|bounce)\b/i.test(replyLower)) {
        playAnimation('jump');
      } else if (/\b(salute|yes sir|roger|captain|aye)\b/i.test(promptLower) || /\b(salute|roger|yes sir)\b/i.test(replyLower)) {
        playAnimation('salute', false, 0.5);
      } else if (/\b(hi|hello|hey|greetings|howdy|sup)\b/i.test(promptLower) || /\b(hi|hello|hey)\b/i.test(replyLower)) {
        playAnimation('greeting', false);
      } else if (/\b(shy|blush|blushing|embarrassed|flustered|crush|timid)\b/i.test(promptLower) || /\b(shy|blush|embarrassed|flustered|crush)\b/i.test(replyLower)) {
        playAnimation('look_away', false, 0.5);
      } else if (/\b(cute|pretty|love|sweet|hug|hold|kiss|cutie|darling)\b/i.test(promptLower) || /\b(love|cute|sweet|hug|kiss|darling)\b/i.test(replyLower)) {
        playAnimation('reaching_out', false, 0.5);
      } else if (/\b(baka|stop|no way|flustered|tsundere|silly)\b/i.test(promptLower) || /\b(baka|flustered|silly)\b/i.test(replyLower)) {
        playAnimation('dismissing', false, 0.5);
      } else if (/\b(question|help|wonder|listen|can you|what if)\b/i.test(promptLower)) {
        playAnimation('hand_raising', false, 0.5);
      } else if (/\b(thanks|thank you|arigato)\b/i.test(promptLower) || /\b(welcome|thank)\b/i.test(replyLower)) {
        playAnimation('thankful', false);
      } else if (/\b(win|victory|peace|cool|pog|great)\b/i.test(promptLower)) {
        playAnimation('victory', false);
      } else {
        playAnimation('talking', false);
      }

      // Speak in cute voice and lip-sync
      await speakSpeech(replyText);
    } catch (err: any) {
      console.error('[Ani] Execution failed:', err);
      targetEmotionRef.current = 'surprised';
      await speakSpeech(err?.message || 'Oops, I had a little hiccup connecting!');
    } finally {
      setIsThinking(false);
    }
  };

  // 5. Speech-to-Text Microphone Handler
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (captionTimeoutRef.current) {
        clearTimeout(captionTimeoutRef.current);
      }
      if (speechSyncTimerRef.current) {
        cancelAnimationFrame(speechSyncTimerRef.current);
        clearInterval(speechSyncTimerRef.current);
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this environment.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[Ani] Speech recognition start error:', err);
      setIsListening(false);
    }
  };

  // Custom VRM File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setModelUrl(objectUrl);
      setShowSettings(false);
    }
  };

  // Custom VRMA Animation File Upload
  const handleVrmaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const currentVrm = vrmRef.current;
    if (!file || !currentVrm || !mixerRef.current) return;

    const fileUrl = URL.createObjectURL(file);
    const animLoader = new GLTFLoader();
    animLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    animLoader.load(
      fileUrl,
      (animGltf) => {
        const vrmAnimations = (animGltf.userData as any).vrmAnimations;
        if (vrmAnimations && vrmAnimations.length > 0) {
          if (currentAnimActionRef.current) {
            currentAnimActionRef.current.stop();
          }
          const clip = createVRMAnimationClip(vrmAnimations[0], currentVrm);
          const action = mixerRef.current!.clipAction(clip);
          action.play();
          currentAnimActionRef.current = action;
          hasActiveVrmaRef.current = true;
          setShowSettings(false);
          console.log('[Ani] Custom VRMA animation loaded successfully');
        }
      },
      undefined,
      (err) => console.error('[Ani] Custom VRMA load error:', err)
    );
  };

  // Custom Background Image Upload
  const handleSetBg = (url: string) => {
    setCurrentBgUrl(url);
    try { localStorage.setItem('ani_companion_bg_url', url); } catch {}
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      handleSetBg(objectUrl);
      setShowSettings(false);
    }
  };

  // Open Avatar Folder in Explorer
  const handleOpenFolder = () => {
    if (window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl('file:///E:/Assistant%20AI/public/assets/avatars/');
    } else {
      navigator.clipboard?.writeText('E:\\Assistant AI\\public\\assets\\avatars\\');
      alert('Path copied to clipboard:\nE:\\Assistant AI\\public\\assets\\avatars\\');
    }
  };

  // Clear Ani's Dedicated Memory
  const handleClearMemory = () => {
    const fresh: ChatMemoryMessage[] = [
      {
        role: 'assistant',
        content: "Hi there! I'm Ani. It's so nice to start fresh with you!",
        timestamp: Date.now(),
      },
    ];
    setMemory(fresh);
    localStorage.removeItem(MEMORY_STORAGE_KEY);
    setCurrentSpeech("Fresh start! What would you like to talk about today?");
  };

  return (
    <div className="relative w-full h-full flex-1 min-h-0 flex flex-col bg-[#07080b] overflow-hidden select-none">
      {/* Animated Room Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {currentBgUrl === 'threads' ? (
          <ThreadsBackground />
        ) : (
          <img
            src={currentBgUrl}
            alt="Room Background"
            className="w-full h-full object-cover scale-105 filter blur-[1px] brightness-[0.92] contrast-[1.05] transition-all duration-700"
          />
        )}
        {/* Soft vignette to blend 3D avatar seamlessly into the room */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 pointer-events-none" />
      </div>

      {/* 3D WebGL Viewport (Full 100% Unrestricted Canvas - Zero Clipping) */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full z-10"
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md gap-2.5">
          <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          <p className="text-xs font-medium text-gray-300 tracking-wide">
            Entering Aiko&apos;s Room...
          </p>
        </div>
      )}

      {/* Error Toast */}
      {loadError && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs backdrop-blur-md shadow-lg">
          {loadError}
        </div>
      )}

      {/* Top Header Status Pill */}
      <div className="absolute top-4 left-4 z-20 flex items-center pointer-events-none">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 shadow-xl pointer-events-auto">
          <span className="text-[10px] text-gray-300 font-mono pl-1 border-white/15">
            60 FPS
          </span>
        </div>
      </div>

      {/* Real-Time Kinetic Subtitle / Caption (Positioned below above buttons with real-time word blur-reveal) */}
      <AnimatePresence>
        {showSpeechBubble && currentSpeech && visibleWordCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96, filter: 'blur(6px)' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className={`absolute left-1/2 -translate-x-1/2 z-20 max-w-xl w-[92%] pointer-events-none transition-all duration-300 ${
              showInput ? 'bottom-50' : 'bottom-26'
            }`}
          >
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-6 py-3 rounded-2xl bg-black/70 backdrop-blur-2xl border border-white/15 shadow-2xl text-center">
              {currentSpeech
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .map((word, idx) => {
                  if (idx >= visibleWordCount) return null;
                  return (
                    <motion.span
                      key={`caption-${idx}-${word}`}
                      initial={{ opacity: 0, filter: 'blur(10px)', y: 4, scale: 0.92 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', y: 0, scale: 1 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="inline-block text-sm sm:text-base font-medium tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                    >
                      {word}
                    </motion.span>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Keyboard Input (Toggled by Keyboard Button) */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[92%] pointer-events-auto"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center w-full rounded-3xl bg-black/80 backdrop-blur-2xl mb-6 border border-white/20 focus-within:border-white/45 shadow-2xl p-2 transition-all"
            >
              <input
                type="text"
                autoFocus
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Talk to ${avatarName}...`}
                disabled={isThinking}
                className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-xs sm:text-base text-white placeholder-gray-400 font-sans"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isThinking}
                className="flex items-center justify-center w-11 h-11 mr-0.5 rounded-xl bg-white/90 hover:bg-white/30 active:bg-white/35 text-white border border-white/10 cursor-pointer disabled:opacity-30 transition-all shrink-0 shadow-sm"
              >
                {isThinking ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-900" />
                ) : (
                  <ArrowUp className="w-6 h-6 ml-0.5 text-black" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Four Circle Floating Action Buttons (Large, Prominent & Premium Glass) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 p-2.5 sm:p-3 rounded-full bg-black/60 backdrop-blur-2xl border border-white/20 shadow-2xl pointer-events-auto">
        {/* 1. Mic Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full border transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${
            isListening
              ? 'bg-rose-500 border-rose-400 text-white animate-pulse shadow-rose-500/40'
              : 'bg-white/10 hover:bg-white/20 border-white/10 text-white hover:border-white/25'
          }`}
          title={isListening ? 'Stop Listening' : 'Voice Input (Mic)'}
        >
          {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6 text-gray-300" />}
        </button>

        {/* 2. Keyboard Button (Toggle Input) */}
        <button
          type="button"
          onClick={() => setShowInput(!showInput)}
          className={`flex items-center justify-center w-14 h-14 rounded-full border transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${
            showInput
              ? 'bg-sky-500/35 border-sky-400 text-sky-200 shadow-sky-500/30'
              : 'bg-white/10 hover:bg-white/20 border-white/10 text-white hover:border-white/25'
          }`}
          title={showInput ? 'Hide Keyboard Input' : 'Show Keyboard Input'}
        >
          <Keyboard className="w-6 h-6" />
        </button>

        {/* 3. Speaker Button (Mute / Unmute) */}
        <button
          type="button"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`flex items-center justify-center w-14 h-14 rounded-full border transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${
            voiceEnabled
              ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white hover:border-white/25'
              : 'bg-white/5 border-white/10 text-gray-500'
          }`}
          title={voiceEnabled ? 'Mute Voice' : 'Enable Voice'}
        >
          {voiceEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>

        {/* 4. Settings Button */}
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center justify-center w-14 h-14 rounded-full border transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 ${
            showSettings
              ? 'bg-white/30 border-white/40 text-white shadow-white/20'
              : 'bg-white/10 hover:bg-white/20 border-white/10 text-white hover:border-white/25'
          }`}
          title="Room & Voice Settings"
        >
          <Settings2 className="w-6 h-6" />
        </button>
      </div>

      {/* Settings Modal Drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="absolute bottom-4 right-6 z-30 max-w-sm w-[92%] max-h-[80vh] overflow-y-auto p-5 rounded-2xl bg-black/90 backdrop-blur-2xl border border-white/20 shadow-2xl text-white pointer-events-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-base font-semibold tracking-wide">{avatarName}&apos;s Room &amp; Persona</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSaveAllCompanionSettings}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    settingsSaved
                      ? 'bg-emerald-500 text-black border-emerald-400'
                      : 'bg-white text-black border-white hover:bg-gray-200'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{settingsSaved ? 'Saved!' : 'Save'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer border-none bg-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Room Background Selection */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-300">
                  Illustrated Room Background
                </label>
                <label className="text-[11px] text-white hover:text-gray-300 cursor-pointer flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>Custom Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PRESET_ROOMS.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleSetBg(room.url)}
                    className={`relative h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer text-left p-2 flex flex-col justify-end ${
                      currentBgUrl === room.url
                        ? 'border-white'
                        : 'border-white/15 hover:border-white/35 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {room.url === 'threads' ? (
                      <div className="absolute inset-0 bg-[#06060d] flex items-center justify-center -z-10">
                        <span className="text-purple-400 text-base opacity-50">✦</span>
                      </div>
                    ) : (
                      <img
                        src={room.url}
                        alt={room.name}
                        className="absolute inset-0 w-full h-full object-cover -z-10"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 -z-10" />
                    <span className="text-[11px] font-semibold text-white drop-shadow">
                      {room.name}
                    </span>
                    
                  </button>
                ))}
              </div>
            </div>

            {/* Aiko Companion Voice Studio (Fish Audio / ElevenLabs / UnrealSpeech) */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white tracking-wide">
                  {avatarName} Voice Engine Studio
                </label>
                <span className="text-[10px] text-pink-400 font-mono">
                  {companionTtsEngine === 'fish_audio'
                    ? fishAudioApiKey
                      ? 'Fish Audio Active'
                      : 'Fish Key Needed'
                    : companionTtsEngine === 'elevenlabs'
                    ? elevenLabsKey
                      ? 'ElevenLabs Active'
                      : 'Key Needed'
                    : unrealSpeechApiKey
                    ? `${unrealSpeechVoice} • ${unrealSpeechPitch}`
                    : 'Key Needed'}
                </span>
              </div>

              {/* Engine Switcher Tabs */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {[
                  { id: 'fish_audio' as const, label: 'Fish Audio', sub: 'Anime & Waifu' },
                  { id: 'elevenlabs' as const, label: 'ElevenLabs', sub: 'ASMR Whisper' },
                  { id: 'unrealspeech' as const, label: 'UnrealSpeech', sub: 'Pitch Tuner' },
                ].map((eng) => (
                  <button
                    key={eng.id}
                    type="button"
                    onClick={() => handleSelectEngine(eng.id)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      companionTtsEngine === eng.id
                        ? 'bg-pink-500/20 border-pink-400 text-pink-200'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{eng.label}</div>
                    <div className="text-[9px] opacity-75 mt-0.5">{eng.sub}</div>
                  </button>
                ))}
              </div>

              {/* PANEL 1: FISH AUDIO (ANIME / WAIFU / ASMR) */}
              {companionTtsEngine === 'fish_audio' && (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Use any anime, waifu, VTuber, or seductive ASMR voice from{' '}
                    <span className="text-pink-300 font-mono">fish.audio</span>.
                  </p>
                  <input
                    type="password"
                    value={fishAudioApiKey}
                    onChange={(e) => handleSaveFishKey(e.target.value)}
                    placeholder="Paste Fish Audio API Key (fish.audio)..."
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-400 font-mono"
                  />

                  <div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                      <span>Voice Reference ID or fish.audio URL</span>
                      <span className="text-pink-300 truncate max-w-[140px]">{fishAudioVoiceTitle}</span>
                    </div>
                    <input
                      type="text"
                      value={fishAudioRefId}
                      onChange={(e) => handleSaveFishRefId(e.target.value, 'Custom Voice ID')}
                      placeholder="Paste Reference ID or https://fish.audio/m/..."
                      className="w-full px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-[11px] text-white placeholder-gray-500 outline-none focus:border-pink-400 font-mono"
                    />
                  </div>

                  {/* Live Fish Audio Anime / Seductive Voice Finder */}
                  <div className="bg-white/[0.04] border border-white/10 rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-gray-300">
                        Browse Live Fish Audio Voices
                      </span>
                      {fishSearching && <Loader2 className="w-3 h-3 text-pink-400 animate-spin" />}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {['anime girl', 'ASMR', 'waifu', 'Makima', 'Raiden Shogun', 'Kafka'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleSearchFishVoices(tag)}
                          className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-400/40 text-[10px] text-gray-300 hover:text-pink-200 transition-all cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={fishSearchQuery}
                        onChange={(e) => setFishSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchFishVoices()}
                        placeholder="Search any character or voice style..."
                        className="flex-1 px-2.5 py-1 rounded-lg bg-black/40 border border-white/15 text-[11px] text-white placeholder-gray-500 outline-none focus:border-pink-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleSearchFishVoices()}
                        className="px-2.5 py-1 rounded-lg bg-pink-500/25 hover:bg-pink-500/35 border border-pink-400/40 text-pink-200 text-[10px] font-semibold cursor-pointer"
                      >
                        Find
                      </button>
                    </div>

                    {fishSearchResults.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1 pr-1">
                        {fishSearchResults.map((item) => {
                          const isSelected = fishAudioRefId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSaveFishRefId(item.id, item.title)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-pink-500/25 border-pink-400 text-white'
                                  : 'bg-black/30 border-white/10 text-gray-300 hover:bg-white/10'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <div className="text-[11px] font-semibold truncate">{item.title}</div>
                                <div className="text-[9px] text-gray-400 truncate">
                                  by {item.author} • {item.id.slice(0, 8)}…
                                </div>
                              </div>
                              <span className="text-[9px] font-mono text-pink-300 shrink-0">
                                {isSelected ? 'Selected' : 'Use'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Fish Audio Prosody & Expressiveness Sliders */}
                  <div className="space-y-2 bg-white/[0.04] border border-white/10 rounded-xl p-3">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-300">Expressive Flirtiness (Temp)</span>
                        <span className="font-mono text-pink-300">{fishAudioTemp.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.65"
                        max="1.00"
                        step="0.01"
                        value={fishAudioTemp}
                        onChange={(e) => handleSaveFishTemp(parseFloat(e.target.value))}
                        className="w-full accent-pink-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-300">Voice Pace (0.85x ↔ 1.15x)</span>
                        <span className="font-mono text-pink-300">{fishAudioSpeed.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.85"
                        max="1.15"
                        step="0.01"
                        value={fishAudioSpeed}
                        onChange={(e) => handleSaveFishSpeed(parseFloat(e.target.value))}
                        className="w-full accent-pink-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PANEL 2: ELEVENLABS (INTIMATE ASMR / WHISPER / ANIME) */}
              {companionTtsEngine === 'elevenlabs' && (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Ultra-realistic whisper, breathiness &amp; vocal inflection via ElevenLabs.
                  </p>
                  <input
                    type="password"
                    value={elevenLabsKey}
                    onChange={(e) => handleSaveElevenKey(e.target.value)}
                    placeholder="Paste ElevenLabs API Key..."
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-400 font-mono"
                  />

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'piTKgcLEGmPE4e6mEKli', label: 'Nicole', desc: 'ASMR Soft Whisper' },
                      { id: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli', desc: 'Youthful & Teasing' },
                      { id: 'jBpfuIE2acCO8z3wKNLl', label: 'Gigi', desc: 'Cute Anime Girl' },
                      { id: 'pFZP5JQG7iQjIQuC4Bku', label: 'Lily', desc: 'Velvety Sultry' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSaveElevenVoice(v.id)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          elevenLabsVoiceId === v.id
                            ? 'bg-pink-500/20 border-pink-400 text-pink-200'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-semibold">{v.label}</div>
                        <div className="text-[9px] opacity-75">{v.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 bg-white/[0.04] border border-white/10 rounded-xl p-3">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-300">Breathiness (Lower Stability = More Breathy)</span>
                        <span className="font-mono text-pink-300">{elevenLabsStability.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.15"
                        max="0.85"
                        step="0.01"
                        value={elevenLabsStability}
                        onChange={(e) => handleSaveElevenStability(parseFloat(e.target.value))}
                        className="w-full accent-pink-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-300">Seductive Style Exaggeration</span>
                        <span className="font-mono text-pink-300">{elevenLabsStyle.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.00"
                        max="1.00"
                        step="0.01"
                        value={elevenLabsStyle}
                        onChange={(e) => handleSaveElevenStyle(parseFloat(e.target.value))}
                        className="w-full accent-pink-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PANEL 3: UNREALSPEECH */}
              {companionTtsEngine === 'unrealspeech' && (
                <div className="space-y-2.5">
                  <input
                    type="password"
                    value={unrealSpeechApiKey}
                    onChange={(e) => handleSaveUnrealKey(e.target.value)}
                    placeholder="Paste UnrealSpeech API Key here..."
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-400 font-mono"
                  />

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'Liv', label: 'Liv', desc: 'Young & Breathy' },
                      { id: 'Scarlett', label: 'Scarlett', desc: 'Flirty & Silky' },
                      { id: 'Amy', label: 'Amy', desc: 'Sweet & Soft' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSaveUnrealVoice(v.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          unrealSpeechVoice === v.id
                            ? 'bg-pink-500/20 border-pink-400 text-pink-200'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-semibold">{v.label}</div>
                        <div className="text-[9px] opacity-75 mt-0.5">{v.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 bg-white/[0.04] border border-white/10 rounded-xl p-3">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-300">Youthful Pitch (1.00 ↔ 1.22)</span>
                        <span className="font-mono text-pink-300">{unrealSpeechPitch.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="1.00"
                        max="1.22"
                        step="0.01"
                        value={unrealSpeechPitch}
                        onChange={(e) => handleSaveUnrealPitch(parseFloat(e.target.value))}
                        className="w-full accent-pink-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-300">Delivery Pace (-0.10 ↔ +0.20)</span>
                        <span className="font-mono text-pink-300">{unrealSpeechSpeed.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="-0.10"
                        max="0.20"
                        step="0.01"
                        value={unrealSpeechSpeed}
                        onChange={(e) => handleSaveUnrealSpeed(parseFloat(e.target.value))}
                        className="w-full accent-pink-500 cursor-pointer h-1.5 bg-white/10 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Shared Silky Breath EQ Toggle + Status + Preview Button */}
              <div className="flex items-center justify-between px-3 py-2 mt-2 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[11px] text-gray-300">Silky Presence &amp; Whisper Air EQ</span>
                <button
                  type="button"
                  onClick={() => handleToggleSultryEq(!sultryVocalEq)}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                    sultryVocalEq ? 'bg-pink-500' : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      sultryVocalEq ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {ttsStatusError && (
                <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-300">
                  {ttsStatusError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={handleSaveAllCompanionSettings}
                  className={`py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    settingsSaved
                      ? 'bg-emerald-500 text-black border-emerald-400'
                      : 'bg-white text-black border-white hover:bg-gray-200'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{settingsSaved ? 'Saved!' : 'Save Voice'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    speakSpeech(
                      "Mmm... hey there... come a little closer, I've been waiting just for you."
                    )
                  }
                  className="py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-200 text-xs font-semibold transition-all cursor-pointer"
                >
                  Preview Voice
                </button>
              </div>
            </div>

            {/* Authentic Humanoid Animation (.VRMA) */}
            <div className="mt-5 pt-4 hidden border-t border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white tracking-wide">
                  Humanoid Motion (.VRMA)
                </label>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Mocap Active
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mb-2.5 leading-relaxed">
                Pixiv authentic humanoid motion library. Click any gesture to preview:
              </p>

              {/* Grid of cute motions */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {ANIM_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (p.id === 'look_away') targetEmotionRef.current = 'shy';
                      playAnimation(p.id, p.loop);
                    }}
                    className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                      activeAnim === p.id
                        ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="text-sm">{p.icon}</div>
                    <div className="text-[10px] font-medium mt-0.5 truncate">{p.name}</div>
                  </button>
                ))}
              </div>

              <label className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Load Custom .VRMA Animation</span>
                <input
                  type="file"
                  accept=".vrma,.glb,.gltf"
                  onChange={handleVrmaUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Dedicated Memory Management */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-300">
                  Ani&apos;s Memory ({memory.length} turns)
                </label>
                <button
                  type="button"
                  onClick={handleClearMemory}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer bg-transparent border-none"
                  title="Clear Ani memory"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Reset Memory</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Ani remembers your past conversations in her own private memory, completely separate from Grokki Chat.
              </p>
            </div>

            {/* 3D Avatar Selection */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-white tracking-wide">
                  Aiko Outfit &amp; Model Version
                </label>
                <span className="text-[10px] text-sky-400 font-mono">
                  {modelUrl.includes('Aiko_v2') ? 'Aiko v2 (Halloween)' : modelUrl.includes('Aiko') ? 'Aiko v1 (Classic)' : 'Custom'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mb-2.5 leading-relaxed">
                Switch instantly between Aiko&apos;s original look and the Halloween gothic outfit.
              </p>

              {/* Aiko v1 vs v2 Quick Switcher Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = modelUrl === av.url;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => handleSelectAvatar(av.url)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-white/5 border-white text-white'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{av.name}</span>
                      </div>
                      <div className="text-[10px] opacity-75 mt-0.5">{av.desc}</div>
                    </button>
                  );
                })}
              </div>

              <label className="text-xs font-medium text-gray-300 block mb-1">
                Custom Avatar Models (.VRM)
              </label>
              <p className="text-[11px] text-gray-400 mb-2.5 leading-relaxed">
                Place any VRM 3D avatar directly into your avatars directory or upload one on the fly.
              </p>

              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 transition-all cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose .VRM</span>
                  <input
                    type="file"
                    accept=".vrm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleOpenFolder}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 transition-all cursor-pointer"
                  title="Open avatar folder or copy path"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sticky Bottom Save Button */}
              <div className="mt-5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleSaveAllCompanionSettings}
                  className={`w-full py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg ${
                    settingsSaved
                      ? 'bg-emerald-500 text-black border-emerald-400'
                      : 'bg-white text-black border-white hover:bg-gray-200'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{settingsSaved ? 'All Companion Settings Saved!' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimeCompanionTab;
