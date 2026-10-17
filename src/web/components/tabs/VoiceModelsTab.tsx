import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Square,
  Volume2,
  Mic,
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';

interface VoiceModelsTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
  playingVoice: string | null;
  onPreviewVoice: (voiceId: string, customText?: string) => void;
}

interface SphereStyle {
  base: string;
  light: string;
  mid: string;
  dark: string;
  accent: string;
  seed: number;
}

interface VoiceItem {
  id: string;
  name: string;
  style: string;
  tag: string;
  accent: 'us' | 'uk';
  gender: 'female' | 'male';
  sphere: SphereStyle;
}

// Palette for one voice sphere: a base color plus four soft blobs that drift around.
// `seed` gives every voice its own blob layout, speed, and phase.
const sphere = (
  base: string,
  light: string,
  mid: string,
  dark: string,
  accent: string,
  seed: number
): SphereStyle => ({ base, light, mid, dark, accent, seed });

// Starting positions (in %) for the four blobs inside a sphere.
const BLOB_ANCHORS: [number, number][] = [
  [25, 28],
  [78, 24],
  [72, 80],
  [22, 76],
];

// Builds the inline style for each drifting blob (position, color, drift distance, speed, phase).
const blobStyles = (s: SphereStyle): React.CSSProperties[] => {
  const colors = [s.light, s.mid, s.dark, s.accent];
  return BLOB_ANCHORS.map(([x, y], i) => {
    const ox = ((s.seed * 37 + i * 53) % 31) - 15;
    const oy = ((s.seed * 61 + i * 29) % 31) - 15;
    const dx = ((s.seed * 17 + i * 41) % 61) - 30;
    const dy = ((s.seed * 23 + i * 47) % 61) - 30;
    const dur = 7 + ((s.seed + i * 3) % 5);
    const delay = -((s.seed * 7 + i * 5) % 9);
    return {
      left: `${x + ox}%`,
      top: `${y + oy}%`,
      background: `radial-gradient(circle at center, ${colors[i]} 0%, transparent 65%)`,
      '--dx': `${dx}%`,
      '--dy': `${dy}%`,
      '--dur': `${dur}s`,
      '--delay': `${delay}s`,
    } as React.CSSProperties;
  });
};

// Film grain / noise texture, blended over the gradient with mix-blend-mode.
const GRAIN_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Animations: drifting gradient blobs and equalizer bars.
const VOICE_STYLES = `
@keyframes vm-drift {
  0%, 100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
  33% { transform: translate(-50%, -50%) translate(var(--dx, 20%), var(--dy, -20%)) scale(1.15); }
  66% { transform: translate(-50%, -50%) translate(calc(var(--dy, -20%) * -1), var(--dx, 20%)) scale(0.95); }
}
@keyframes vm-eq {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}

.vm-blob {
  position: absolute;
  width: 95%;
  height: 95%;
  border-radius: 9999px;
  pointer-events: none;
  transform: translate(-50%, -50%);
  will-change: transform;
  animation: vm-drift var(--dur, 9s) ease-in-out var(--delay, 0s) infinite;
}

.vm-eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}
.vm-eq i {
  display: block;
  width: 2px;
  height: 100%;
  border-radius: 1px;
  background: currentColor;
  transform-origin: bottom;
  transform: scaleY(0.3);
}
.vm-eq.on i { animation: vm-eq 0.9s ease-in-out infinite; }
.vm-eq.on i:nth-child(2) { animation-delay: 0.15s; }
.vm-eq.on i:nth-child(3) { animation-delay: 0.3s; }

@media (prefers-reduced-motion: reduce) {
  .vm-blob, .vm-eq i { animation: none !important; }
}
`;

const VOICES: VoiceItem[] = [
  // American Female Voices
  {
    id: 'af_heart',
    name: 'Heart',
    style: 'Warm & Expressive',
    tag: 'US • Conversational',
    accent: 'us',
    gender: 'female',
    sphere: sphere('#ff416c', '#ffd1c1', '#ff758c', '#990033', '#ff9a5a', 1),
  },
  {
    id: 'af_bella',
    name: 'Bella',
    style: 'Crisp & Playful',
    tag: 'US • High Energy',
    accent: 'us',
    gender: 'female',
    sphere: sphere('#0072ff', '#9fe0ff', '#4facfe', '#003399', '#7a5cff', 2),
  },
  {
    id: 'af_nicole',
    name: 'Nicole',
    style: 'Clear & Formal',
    tag: 'US • Studio Pro',
    accent: 'us',
    gender: 'female',
    sphere: sphere('#8ec5fc', '#f3e1ff', '#e0c3fc', '#6a11cb', '#b3f0ff', 3),
  },
  {
    id: 'af_sky',
    name: 'Sky',
    style: 'Soft & Calm',
    tag: 'US • Narrative',
    accent: 'us',
    gender: 'female',
    sphere: sphere('#8fd3f4', '#d4ffe6', '#84fab0', '#209cff', '#c2f0ff', 4),
  },
  {
    id: 'af_sarah',
    name: 'Sarah',
    style: 'Gentle & Natural',
    tag: 'US • Storyteller',
    accent: 'us',
    gender: 'female',
    sphere: sphere('#fecfef', '#fff0f5', '#ff9a9e', '#f093fb', '#ffd6a5', 5),
  },
  {
    id: 'af_alloy',
    name: 'Alloy',
    style: 'Crisp & Balanced',
    tag: 'US • Assistant',
    accent: 'us',
    gender: 'female',
    sphere: sphere('#c2e9fb', '#f0faff', '#a1c4fd', '#4a90e2', '#d9e4ff', 6),
  },
  {
    id: 'af_aoede',
    name: 'Aoede',
    style: 'Melodic & Warm',
    tag: 'US • Expressive',
    accent: 'us',
    gender: 'female',
    sphere: sphere('#a18cd1', '#ffd9f3', '#fbc2eb', '#6b117b', '#8fb3ff', 7),
  },
  {
    id: 'af_kore',
    name: 'Kore',
    style: 'Bright & Radiant',
    tag: 'US • Dynamic',
    accent: 'us',
    gender: 'female',
    sphere: sphere('#fcb69f', '#fff3da', '#ffecd2', '#ff5722', '#ffd27a', 8),
  },
  {
    id: 'af_jessica',
    name: 'Jessica',
    style: 'Confident & Friendly',
    tag: 'US • Casual Companion',
    accent: 'us',
    gender: 'female',
    sphere: sphere('#96e6a1', '#f0ffb0', '#d4fc79', '#2e7d32', '#7fe0c8', 9),
  },

  // American Male Voices
  {
    id: 'am_adam',
    name: 'Adam',
    style: 'Deep Baritone',
    tag: 'US • Confident',
    accent: 'us',
    gender: 'male',
    sphere: sphere('#f7971e', '#fff09a', '#ffd200', '#b85d19', '#ff7a3d', 10),
  },
  {
    id: 'am_michael',
    name: 'Michael',
    style: 'Classic Anchor',
    tag: 'US • Broadcast',
    accent: 'us',
    gender: 'male',
    sphere: sphere('#11998e', '#9dffc4', '#38ef7d', '#0c615a', '#4fd1d9', 11),
  },
  {
    id: 'am_echo',
    name: 'Echo',
    style: 'Modern & Resonant',
    tag: 'US • Smooth Cadence',
    accent: 'us',
    gender: 'male',
    sphere: sphere('#330867', '#5ef0ee', '#30cfd0', '#1a0338', '#6a4cff', 12),
  },
  {
    id: 'am_eric',
    name: 'Eric',
    style: 'Warm & Grounded',
    tag: 'US • Tech Professional',
    accent: 'us',
    gender: 'male',
    sphere: sphere('#764ba2', '#a8b6ff', '#667eea', '#301b52', '#c18bff', 13),
  },
  {
    id: 'am_fenrir',
    name: 'Fenrir',
    style: 'Deep Cinematic',
    tag: 'US • Authoritative',
    accent: 'us',
    gender: 'male',
    sphere: sphere('#262626', '#6b6b6b', '#434343', '#000000', '#4d4d57', 14),
  },
  {
    id: 'am_liam',
    name: 'Liam',
    style: 'Youthful & Clear',
    tag: 'US • Conversational',
    accent: 'us',
    gender: 'male',
    sphere: sphere('#fee140', '#fff3a8', '#fa709a', '#d84315', '#ffb36b', 15),
  },
  {
    id: 'am_onyx',
    name: 'Onyx',
    style: 'Low Velvet Bass',
    tag: 'US • Dramatic',
    accent: 'us',
    gender: 'male',
    sphere: sphere('#313536', '#7b858a', '#596164', '#111213', '#475055', 16),
  },

  // British Female Voices
  {
    id: 'bf_emma',
    name: 'Emma',
    style: 'British RP Accent',
    tag: 'UK • Gentle RP',
    accent: 'uk',
    gender: 'female',
    sphere: sphere('#a6c1ee', '#ffe0f6', '#fbc2eb', '#764ba2', '#c3d9ff', 17),
  },
  {
    id: 'bf_isabella',
    name: 'Isabella',
    style: 'British Aristocratic',
    tag: 'UK • Oxford RP',
    accent: 'uk',
    gender: 'female',
    sphere: sphere('#fda085', '#fff0b8', '#f6d365', '#d46b4f', '#ffb199', 18),
  },
  {
    id: 'bf_alice',
    name: 'Alice',
    style: 'Clear British BBC',
    tag: 'UK • Broadcaster',
    accent: 'uk',
    gender: 'female',
    sphere: sphere('#fed6e3', '#d4fffb', '#a8edea', '#9c27b0', '#ffe9f1', 19),
  },
  {
    id: 'bf_lily',
    name: 'Lily',
    style: 'Sweet & Poetic',
    tag: 'UK • Storyteller',
    accent: 'uk',
    gender: 'female',
    sphere: sphere('#cfc7f8', '#ffe3d6', '#ebbba7', '#5d48b6', '#e0d8ff', 20),
  },

  // British Male Voices
  {
    id: 'bm_george',
    name: 'George',
    style: 'Warm British Gentleman',
    tag: 'UK • Classic RP',
    accent: 'uk',
    gender: 'male',
    sphere: sphere('#2c3e50', '#d5dbe0', '#bdc3c7', '#1a252f', '#6b8196', 21),
  },
  {
    id: 'bm_fable',
    name: 'Fable',
    style: 'British Narrator',
    tag: 'UK • Dramatic Tale',
    accent: 'uk',
    gender: 'male',
    sphere: sphere('#eacda3', '#fff0d6', '#e6b980', '#8d6e63', '#f3d9b1', 22),
  },
  {
    id: 'bm_lewis',
    name: 'Lewis',
    style: 'Executive British',
    tag: 'UK • Professional',
    accent: 'uk',
    gender: 'male',
    sphere: sphere('#0072ff', '#a8f0ff', '#00c6ff', '#0d47a1', '#5aa0ff', 23),
  },
  {
    id: 'bm_daniel',
    name: 'Daniel',
    style: 'Deep British Newsreader',
    tag: 'UK • Baritone',
    accent: 'uk',
    gender: 'male',
    sphere: sphere('#753a88', '#ff8fb8', '#cc2b5e', '#3e1b4c', '#a266c4', 24),
  },
];

// Carousel layout, indexed by distance from the focused voice (0 = center).
const OFFSET_X = [0, 270, 445, 565, 650];
const OFFSET_SCALE = [1, 0.8, 0.6, 0.44, 0.34];
const OFFSET_OPACITY = [1, 1, 0.55, 0.2, 0];
const LABEL_OPACITY = [1, 0.5, 0, 0, 0];
const MAX_VISIBLE_OFFSET = 4;
const CAROUSEL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Shared surface style for cards and panels.
const SURFACE =
  'bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029]';

// Small section label used above each block of the page.
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="m-0 mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
    {children}
  </h3>
);

// Clean on/off switch.
const Toggle: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0 transition-colors duration-200 ${
      checked ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-[18px] bg-white dark:bg-gray-900' : 'translate-x-0.5 bg-white'
      }`}
    />
  </button>
);

// One voice sphere: drifting mesh gradient with grain. The featured (center) sphere shows the play button.
const VoiceSphere: React.FC<{
  voice: VoiceItem;
  size: number;
  featured: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}> = ({ voice, size, featured, isPlaying, onPlay }) => (
  <div
    className="relative rounded-full overflow-hidden flex items-center justify-center"
    style={{
      width: size,
      height: size,
      background: voice.sphere.base,
      isolation: 'isolate',
      boxShadow: featured
        ? `0 0 0 6px ${voice.sphere.mid}22, 0 28px 50px -18px ${voice.sphere.mid}aa`
        : `0 0 0 0 ${voice.sphere.mid}00, 0 14px 28px -14px ${voice.sphere.mid}66`,
      transition: `box-shadow 600ms ${CAROUSEL_EASE}`,
    }}
  >
    {blobStyles(voice.sphere).map((style, i) => (
      <span key={i} className="vm-blob" style={style} />
    ))}

    {/* Noise grain overlay */}
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: GRAIN_TEXTURE,
        backgroundSize: '200px 200px',
        mixBlendMode: 'overlay',
        opacity: 0.65,
        filter: 'contrast(1.4)',
      }}
    />

    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPlay();
      }}
      title={isPlaying ? 'Stop Preview' : 'Preview Voice'}
      tabIndex={featured ? 0 : -1}
      className="relative z-10 w-14 h-14 rounded-full bg-white text-gray-900 flex items-center justify-center cursor-pointer border-none shadow-lg hover:scale-105 active:scale-95"
      style={{
        opacity: featured ? 1 : 0,
        pointerEvents: featured ? 'auto' : 'none',
        transition: `opacity 400ms ease, transform 200ms ease`,
      }}
    >
      {isPlaying ? (
        <Square className="w-5 h-5 fill-current" />
      ) : (
        <Play className="w-5 h-5 fill-current ml-0.5" />
      )}
    </button>
  </div>
);

export const VoiceModelsTab: React.FC<VoiceModelsTabProps> = ({
  config,
  onChangeConfig,
  playingVoice,
  onPreviewVoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [accentFilter, setAccentFilter] = useState<'all' | 'us' | 'uk'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const [sandboxText, setSandboxText] = useState(
    'Hey! I am Grokki, your Windows companion. How can I assist you today?'
  );

  // Carousel state: which voice is in the center, and how wide the track is.
  const [focusId, setFocusId] = useState<string>(config.ttsVoice || 'af_bella');
  const [trackWidth, setTrackWidth] = useState(900);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartX = useRef(0);
  const dragMoved = useRef(false);
  const lastWheel = useRef(0);

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    if (filterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filterMenuOpen]);

  const activeFilterCount = (accentFilter !== 'all' ? 1 : 0) + (genderFilter !== 'all' ? 1 : 0);
  const isFilterActive = activeFilterCount > 0;

  const handleResetFilters = () => {
    setAccentFilter('all');
    setGenderFilter('all');
    setSearchQuery('');
  };

  const filteredVoices = VOICES.filter((v) => {
    // Accent filter
    if (accentFilter !== 'all' && v.accent !== accentFilter) return false;
    // Gender filter
    if (genderFilter !== 'all' && v.gender !== genderFilter) return false;
    // Text search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = v.name.toLowerCase().includes(q);
      const matchStyle = v.style.toLowerCase().includes(q);
      const matchTag = v.tag.toLowerCase().includes(q);
      const matchAccent = (v.accent === 'us' ? 'american us usa' : 'british uk english').includes(q);
      const matchGender = v.gender.toLowerCase().includes(q);
      return matchName || matchStyle || matchTag || matchAccent || matchGender;
    }
    return true;
  });

  const hasVoices = filteredVoices.length > 0;

  // Keep the carousel scaled to the width it is given.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setTrackWidth(el.getBoundingClientRect().width || 900);
    const observer = new ResizeObserver((entries) => {
      setTrackWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasVoices]);

  const selectedVoiceId = config.ttsVoice || 'af_bella';
  const activeVoice = VOICES.find((v) => v.id === selectedVoiceId);
  const isAnyPlaying = playingVoice !== null;

  const focusIndex = Math.max(
    0,
    filteredVoices.findIndex((v) => v.id === focusId)
  );
  const focusedVoice = filteredVoices[focusIndex];
  const unit = Math.min(1, Math.max(0.6, trackWidth / 900));
  const sphereSize = Math.round(210 * unit);
  const trackHeight = sphereSize + 96;

  const go = (delta: number) => {
    if (!hasVoices) return;
    const next = Math.min(filteredVoices.length - 1, Math.max(0, focusIndex + delta));
    setFocusId(filteredVoices[next].id);
  };

  const handleCarouselKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  };

  const handleCarouselWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 20) return;
    const now = Date.now();
    if (now - lastWheel.current < 350) return;
    lastWheel.current = now;
    go(e.deltaX > 0 ? 1 : -1);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragMoved.current = false;
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    if (Math.abs(e.clientX - dragStartX.current) > 8) dragMoved.current = true;
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    const dx = e.clientX - dragStartX.current;
    if (dragMoved.current && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  const accentTabClass = (value: 'all' | 'us' | 'uk') =>
    `text-xs font-semibold px-4 py-2 rounded-full cursor-pointer border-none transition-all ${
      accentFilter === value
        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
        : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    }`;

  const atStart = focusIndex <= 0;
  const atEnd = focusIndex >= filteredVoices.length - 1;
  const arrowClass =
    'absolute w-8 h-8 rounded-full flex items-center justify-center bg-transparent border-none text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-all disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent';

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full pb-16">
      <style>{VOICE_STYLES}</style>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Voice Models
            </h2>
            {activeVoice && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: activeVoice.sphere.mid }}
                />
                {activeVoice.name}
              </span>
            )}
          </div>
          <p className="m-0 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            High-fidelity neural voices rendered on local Kokoro-82M engine ({VOICES.length} available).
          </p>
        </div>

        {/* Accent segmented control */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#13141a] p-1 rounded-full border border-gray-200 dark:border-[#1e2029] self-start md:self-auto">
          <button type="button" onClick={() => setAccentFilter('all')} className={accentTabClass('all')}>
            All <span className="opacity-60 ml-0.5">{VOICES.length}</span>
          </button>
          <button type="button" onClick={() => setAccentFilter('us')} className={accentTabClass('us')}>
            American
          </button>
          <button type="button" onClick={() => setAccentFilter('uk')} className={accentTabClass('uk')}>
            British
          </button>
        </div>
      </header>

      {/* Voices */}
      <section>
        {/* Search + filters */}
        <div className="flex items-center gap-2.5 w-full mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voices by name, style, accent, or gender..."
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-0.5 border-none bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter button */}
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              className={`inline-flex items-center gap-2 h-11 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                isFilterActive
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                  : 'bg-white dark:bg-[#13141a] text-gray-700 dark:text-gray-300 border-[#e4e4eb] dark:border-[#1e2029] hover:bg-gray-50 dark:hover:bg-[#181a22]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />

              {activeFilterCount > 0 && (
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isFilterActive
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                      : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  }`}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter popover */}
            {filterMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 p-5 bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-2xl shadow-xl z-50 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#1e2029]">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Voice Filters
                  </span>
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer border-none bg-transparent"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Accent filter */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Accent
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['all', 'us', 'uk'] as const).map((acc) => (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => setAccentFilter(acc)}
                        className={`py-2 text-xs font-medium rounded-lg cursor-pointer border transition-all ${
                          accentFilter === acc
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent font-semibold'
                            : 'bg-gray-50 dark:bg-[#181a22] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#222533] hover:border-gray-400'
                        }`}
                      >
                        {acc === 'all' ? 'All' : acc === 'us' ? 'US' : 'UK'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gender filter */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Gender
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['all', 'female', 'male'] as const).map((gen) => (
                      <button
                        key={gen}
                        type="button"
                        onClick={() => setGenderFilter(gen)}
                        className={`py-2 text-xs font-medium rounded-lg cursor-pointer border transition-all ${
                          genderFilter === gen
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent font-semibold'
                            : 'bg-gray-50 dark:bg-[#181a22] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#222533] hover:border-gray-400'
                        }`}
                      >
                        {gen === 'all' ? 'All' : gen === 'female' ? 'Female' : 'Male'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-[#1e2029] flex items-center justify-between text-[11px] text-gray-500">
                  <span>Showing {filteredVoices.length} voices</span>
                  {/* <button
                    type="button"
                    onClick={() => setFilterMenuOpen(false)}
                    className="px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold cursor-pointer border-none"
                  >
                    Apply
                  </button> */}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Voice carousel */}
        {!hasVoices ? (
          <div
            className={`w-full p-10 rounded-3xl ${SURFACE} text-center flex flex-col items-center justify-center gap-3`}
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 m-0">
              No voices found matching "{searchQuery}"
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0 max-w-sm">
              Try adjusting your search query or reset your accent and gender filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 cursor-pointer border-none mt-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
          <div
            tabIndex={0}
            onKeyDown={handleCarouselKey}
            onWheel={handleCarouselWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative rounded-3xl overflow-hidden py-8 bg-gray-50 dark:bg-[#0f1015] border border-[#e4e4eb] dark:border-[#1e2029] outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:focus-visible:ring-white/20 select-none"
          >
            {/* Sliding track */}
            <div
              ref={trackRef}
              className="relative w-full"
              style={{
                height: trackHeight,
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)',
                maskImage:
                  'linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)',
              }}
            >
              {filteredVoices.map((voice, index) => {
                const offset = index - focusIndex;
                const dist = Math.abs(offset);
                if (dist > MAX_VISIBLE_OFFSET) return null;

                const isFocused = offset === 0;
                const isPlaying = playingVoice === voice.id;
                const isActive = selectedVoiceId === voice.id;
                const x = Math.sign(offset) * OFFSET_X[dist] * unit;

                return (
                  <div
                    key={voice.id}
                    onClick={() => {
                      if (dragMoved.current) {
                        dragMoved.current = false;
                        return;
                      }
                      if (!isFocused) setFocusId(voice.id);
                    }}
                    className={isFocused ? '' : 'cursor-pointer'}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      width: sphereSize,
                      marginLeft: -sphereSize / 2,
                      transform: `translateX(${x}px)`,
                      opacity: OFFSET_OPACITY[dist],
                      zIndex: 10 - dist,
                      pointerEvents: OFFSET_OPACITY[dist] === 0 ? 'none' : 'auto',
                      transition: `transform 700ms ${CAROUSEL_EASE}, opacity 500ms ease`,
                    }}
                  >
                    {/* Sphere (scales with distance from center) */}
                    <div
                      style={{
                        transform: `scale(${OFFSET_SCALE[dist]})`,
                        transition: `transform 700ms ${CAROUSEL_EASE}`,
                      }}
                    >
                      <VoiceSphere
                        voice={voice}
                        size={sphereSize}
                        featured={isFocused}
                        isPlaying={isPlaying}
                        onPlay={() => onPreviewVoice(voice.id)}
                      />
                    </div>

                    {/* Label */}
                    <div
                      className="text-center flex flex-col items-center"
                      style={{
                        marginTop: 18,
                        opacity: LABEL_OPACITY[dist],
                        transition: 'opacity 500ms ease',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {/* {isActive && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: voice.sphere.mid }}
                            title="Active voice"
                          />
                        )} */}
                        <strong
                          className={`text-lg font-extrabold ${
                            isFocused
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {voice.name}
                        </strong>
                        {isPlaying && (
                          <span className="vm-eq on text-gray-400 dark:text-gray-500">
                            <i />
                            <i />
                            <i />
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {voice.style}
                      </span>
                      <span className="mt-1 text-[10px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
                        {voice.tag}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Arrows */}
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={atStart}
              aria-label="Previous voice"
              className={arrowClass}
              style={{ top: sphereSize + 58, left: `calc(50% - ${Math.round(sphereSize * 0.72) + 16}px)` }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={atEnd}
              aria-label="Next voice"
              className={arrowClass}
              style={{ top: sphereSize + 58, left: `calc(50% + ${Math.round(sphereSize * 0.72) - 16}px)` }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Select button + position */}
            <div className="flex flex-col items-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => focusedVoice && onChangeConfig({ ttsVoice: focusedVoice.id })}
                className={`h-9 px-7 text-xs font-semibold rounded-full cursor-pointer border-none transition-all ${
                  focusedVoice && selectedVoiceId === focusedVoice.id
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-white dark:bg-[#1a1c24] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2a2d3a] hover:bg-gray-100 dark:hover:bg-[#252836]'
                }`}
              >
                {focusedVoice && selectedVoiceId === focusedVoice.id ? 'Active' : 'Use this voice'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Preview */}
      <section>
        <SectionLabel>Preview</SectionLabel>
        <div className={`${SURFACE} rounded-2xl p-5 flex flex-col gap-4`}>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {activeVoice && (
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: activeVoice.sphere.mid }}
              />
            )}
            <span>
              Testing with{' '}
              <strong className="font-semibold text-gray-900 dark:text-gray-100">
                {activeVoice ? activeVoice.name : 'selected voice'}
              </strong>
            </span>
            <span className={`vm-eq ${isAnyPlaying ? 'on' : ''}`}>
              <i />
              <i />
              <i />
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={sandboxText}
              onChange={(e) => setSandboxText(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl text-xs bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => onPreviewVoice(selectedVoiceId, sandboxText)}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 transition-all cursor-pointer flex-shrink-0 border-none"
            >
              {playingVoice === selectedVoiceId ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Test Voice</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-gray-400 dark:text-gray-500 text-[11px] mr-1">Presets</span>
            <button
              type="button"
              onClick={() =>
                setSandboxText('Hey! I am Grokki, your Windows companion. How can I assist you today?')
              }
              className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1e2029] text-[11px] font-medium cursor-pointer transition-colors"
            >
              Greeting
            </button>
            <button
              type="button"
              onClick={() =>
                setSandboxText('I analyzed your codebase and fixed the memory leak in the audio worker.')
              }
              className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1e2029] text-[11px] font-medium cursor-pointer transition-colors"
            >
              Coding
            </button>
            <button
              type="button"
              onClick={() =>
                setSandboxText('Good afternoon. You have two scheduled meetings on Google Calendar today.')
              }
              className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1e2029] text-[11px] font-medium cursor-pointer transition-colors"
            >
              Briefing
            </button>
          </div>
        </div>
      </section>

      {/* Behavior */}
      <section>
        <SectionLabel>Behavior</SectionLabel>
        <div className={`${SURFACE} rounded-2xl flex flex-col divide-y divide-[#e4e4eb] dark:divide-[#1e2029]`}>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                  Spoken Audio Response
                </strong>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Read answers out loud using your chosen Kokoro neural voice.
                </span>
              </div>
            </div>
            <Toggle
              checked={config.ttsEnabled !== false}
              onChange={(value) => onChangeConfig({ ttsEnabled: value })}
              label="Spoken Audio Response"
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                  Wake Word Activation ("Hey Grokki")
                </strong>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Listens continuously in the background for hands-free queries.
                </span>
              </div>
            </div>
            <Toggle
              checked={config.wakeWordEnabled !== false}
              onChange={(value) => onChangeConfig({ wakeWordEnabled: value })}
              label="Wake Word Activation"
            />
          </div>
        </div>
      </section>
    </div>
  );
};