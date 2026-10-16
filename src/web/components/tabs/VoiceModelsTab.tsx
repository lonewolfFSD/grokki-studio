import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Volume2, Search, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';

interface VoiceModelsTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
  playingVoice: string | null;
  onPreviewVoice: (voiceId: string, customText?: string) => void;
}

interface VoiceItem {
  id: string;
  name: string;
  style: string;
  tag: string;
  accent: 'us' | 'uk';
  gender: 'female' | 'male';
  gradient: string;
}

const VOICES: VoiceItem[] = [
  // American Female Voices
  {
    id: 'af_heart',
    name: 'Heart',
    style: 'Warm & Expressive',
    tag: 'US • Conversational',
    accent: 'us',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #ff758c 0%, #ff416c 60%, #990033 100%)',
  },
  {
    id: 'af_bella',
    name: 'Bella',
    style: 'Crisp & Playful',
    tag: 'US • High Energy',
    accent: 'us',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #4facfe 0%, #0072ff 60%, #003399 100%)',
  },
  {
    id: 'af_nicole',
    name: 'Nicole',
    style: 'Clear & Formal',
    tag: 'US • Studio Pro',
    accent: 'us',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #e0c3fc 0%, #8ec5fc 60%, #6a11cb 100%)',
  },
  {
    id: 'af_sky',
    name: 'Sky',
    style: 'Soft & Calm',
    tag: 'US • Narrative',
    accent: 'us',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #84fab0 0%, #8fd3f4 60%, #209cff 100%)',
  },
  {
    id: 'af_sarah',
    name: 'Sarah',
    style: 'Gentle & Natural',
    tag: 'US • Storyteller',
    accent: 'us',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #ff9a9e 0%, #fecfef 60%, #f093fb 100%)',
  },
  {
    id: 'af_alloy',
    name: 'Alloy',
    style: 'Crisp & Balanced',
    tag: 'US • Assistant',
    accent: 'us',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #a1c4fd 0%, #c2e9fb 60%, #4a90e2 100%)',
  },
  {
    id: 'af_aoede',
    name: 'Aoede',
    style: 'Melodic & Warm',
    tag: 'US • Expressive',
    accent: 'us',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #fbc2eb 0%, #a18cd1 60%, #6b117b 100%)',
  },
  {
    id: 'af_kore',
    name: 'Kore',
    style: 'Bright & Radiant',
    tag: 'US • Dynamic',
    accent: 'us',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #ffecd2 0%, #fcb69f 60%, #ff5722 100%)',
  },
  {
    id: 'af_jessica',
    name: 'Jessica',
    style: 'Confident & Friendly',
    tag: 'US • Casual Companion',
    accent: 'us',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #d4fc79 0%, #96e6a1 60%, #2e7d32 100%)',
  },

  // American Male Voices
  {
    id: 'am_adam',
    name: 'Adam',
    style: 'Deep Baritone',
    tag: 'US • Confident',
    accent: 'us',
    gender: 'male',
    gradient: 'radial-gradient(circle at 35% 35%, #ffd200 0%, #f7971e 60%, #b85d19 100%)',
  },
  {
    id: 'am_michael',
    name: 'Michael',
    style: 'Classic Anchor',
    tag: 'US • Broadcast',
    accent: 'us',
    gender: 'male',
    gradient: 'radial-gradient(circle at 35% 35%, #38ef7d 0%, #11998e 60%, #0c615a 100%)',
  },
  {
    id: 'am_echo',
    name: 'Echo',
    style: 'Modern & Resonant',
    tag: 'US • Smooth Cadence',
    accent: 'us',
    gender: 'male',
    gradient: 'radial-gradient(circle at 35% 35%, #30cfd0 0%, #330867 60%, #1a0338 100%)',
  },
  {
    id: 'am_eric',
    name: 'Eric',
    style: 'Warm & Grounded',
    tag: 'US • Tech Professional',
    accent: 'us',
    gender: 'male',
    gradient: 'radial-gradient(circle at 35% 35%, #667eea 0%, #764ba2 60%, #301b52 100%)',
  },
  {
    id: 'am_fenrir',
    name: 'Fenrir',
    style: 'Deep Cinematic',
    tag: 'US • Authoritative',
    accent: 'us',
    gender: 'male',
    gradient: 'radial-gradient(circle at 35% 35%, #434343 0%, #262626 60%, #000000 100%)',
  },
  {
    id: 'am_liam',
    name: 'Liam',
    style: 'Youthful & Clear',
    tag: 'US • Conversational',
    accent: 'us',
    gender: 'male',
    gradient: 'radial-gradient(circle at 35% 35%, #fa709a 0%, #fee140 60%, #d84315 100%)',
  },
  {
    id: 'am_onyx',
    name: 'Onyx',
    style: 'Low Velvet Bass',
    tag: 'US • Dramatic',
    accent: 'us',
    gender: 'male',
    gradient: 'radial-gradient(circle at 35% 35%, #596164 0%, #313536 60%, #111213 100%)',
  },

  // British Female Voices
  {
    id: 'bf_emma',
    name: 'Emma',
    style: 'British RP Accent',
    tag: 'UK • Gentle RP',
    accent: 'uk',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #fbc2eb 0%, #a6c1ee 60%, #764ba2 100%)',
  },
  {
    id: 'bf_isabella',
    name: 'Isabella',
    style: 'British Aristocratic',
    tag: 'UK • Oxford RP',
    accent: 'uk',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #f6d365 0%, #fda085 60%, #d46b4f 100%)',
  },
  {
    id: 'bf_alice',
    name: 'Alice',
    style: 'Clear British BBC',
    tag: 'UK • Broadcaster',
    accent: 'uk',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #a8edea 0%, #fed6e3 60%, #9c27b0 100%)',
  },
  {
    id: 'bf_lily',
    name: 'Lily',
    style: 'Sweet & Poetic',
    tag: 'UK • Storyteller',
    accent: 'uk',
    gender: 'female',
    gradient: 'radial-gradient(circle at 35% 35%, #ebbba7 0%, #cfc7f8 60%, #5d48b6 100%)',
  },

  // British Male Voices
  {
    id: 'bm_george',
    name: 'George',
    style: 'Warm British Gentleman',
    tag: 'UK • Classic RP',
    accent: 'uk',
    gender: 'male',
    gradient: 'radial-gradient(circle at 35% 35%, #bdc3c7 0%, #2c3e50 60%, #1a252f 100%)',
  },
  {
    id: 'bm_fable',
    name: 'Fable',
    style: 'British Narrator',
    tag: 'UK • Dramatic Tale',
    accent: 'uk',
    gender: 'male',
    gradient: 'radial-gradient(circle at 35% 35%, #e6b980 0%, #eacda3 60%, #8d6e63 100%)',
  },
  {
    id: 'bm_lewis',
    name: 'Lewis',
    style: 'Executive British',
    tag: 'UK • Professional',
    accent: 'uk',
    gender: 'male',
    gradient: 'radial-gradient(circle at 35% 35%, #00c6ff 0%, #0072ff 60%, #0d47a1 100%)',
  },
  {
    id: 'bm_daniel',
    name: 'Daniel',
    style: 'Deep British Newsreader',
    tag: 'UK • Baritone',
    accent: 'uk',
    gender: 'male',
    gradient: 'radial-gradient(circle at 35% 35%, #cc2b5e 0%, #753a88 60%, #3e1b4c 100%)',
  },
];

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

  const selectedVoiceId = config.ttsVoice || 'af_bella';

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Voice Models
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            High-fidelity neural voices rendered on local Kokoro-82M engine ({VOICES.length} available).
          </p>
        </div>

        {/* Quick Accent Pill Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#13141a] p-1 rounded-xl border border-gray-200 dark:border-[#1e2029] self-start md:self-auto">
          <button
            type="button"
            onClick={() => setAccentFilter('all')}
            className={`text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer border-none transition-all ${
              accentFilter === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xs'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All ({VOICES.length})
          </button>
          <button
            type="button"
            onClick={() => setAccentFilter('us')}
            className={`text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer border-none transition-all ${
              accentFilter === 'us'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xs'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            American
          </button>
          <button
            type="button"
            onClick={() => setAccentFilter('uk')}
            className={`text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer border-none transition-all ${
              accentFilter === 'uk'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xs'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            British
          </button>
        </div>
      </div>

      {/* Search Bar with Filter Button to the right side */}
      <div className="flex items-center gap-2.5 w-full">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search voices by name, style, accent, or gender..."
            className="w-full h-10 pl-10 pr-9 rounded-xl bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all shadow-xs"
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

        {/* Filter Button right next to Search Bar */}
        <div className="relative" ref={filterMenuRef}>
          <button
            type="button"
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all shadow-xs ${
              isFilterActive
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                : 'bg-white dark:bg-[#13141a] text-gray-700 dark:text-gray-300 border-[#e4e4eb] dark:border-[#1e2029] hover:bg-gray-50 dark:hover:bg-[#181a22]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
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

          {/* Filter Popover Dropdown */}
          {filterMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-2xl shadow-xl z-50 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#1e2029]">
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
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

              {/* Accent Filter */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Accent
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(['all', 'us', 'uk'] as const).map((acc) => (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => setAccentFilter(acc)}
                      className={`py-1 text-xs font-medium rounded-lg cursor-pointer border transition-all ${
                        accentFilter === acc
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent font-semibold shadow-xs'
                          : 'bg-gray-50 dark:bg-[#181a22] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#222533] hover:border-gray-400'
                      }`}
                    >
                      {acc === 'all' ? 'All' : acc === 'us' ? 'US' : 'UK'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender Filter */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Gender
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(['all', 'female', 'male'] as const).map((gen) => (
                    <button
                      key={gen}
                      type="button"
                      onClick={() => setGenderFilter(gen)}
                      className={`py-1 text-xs font-medium rounded-lg cursor-pointer border transition-all ${
                        genderFilter === gen
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent font-semibold shadow-xs'
                          : 'bg-gray-50 dark:bg-[#181a22] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#222533] hover:border-gray-400'
                      }`}
                    >
                      {gen === 'all' ? 'All' : gen === 'female' ? 'Female' : 'Male'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-[#1e2029] flex items-center justify-between text-[11px] text-gray-500">
                <span>Showing {filteredVoices.length} voices</span>
                <button
                  type="button"
                  onClick={() => setFilterMenuOpen(false)}
                  className="px-2.5 py-1 rounded-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold cursor-pointer border-none"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Grid - Preserving exact user style changes */}
      {filteredVoices.length === 0 ? (
        <div className="w-full p-8 rounded-3xl bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] text-center flex flex-col items-center justify-center gap-3 shadow-xs">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 m-0">
            No voices found matching "{searchQuery}"
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 m-0 max-w-sm">
            Try adjusting your search query or reset your accent and gender filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 cursor-pointer border-none mt-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 w-full">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoiceId === voice.id;
            const isPlaying = playingVoice === voice.id;

            return (
              <div
                key={voice.id}
                onClick={() => onChangeConfig({ ttsVoice: voice.id })}
                className={`flex flex-col items-center text-center p-5 rounded-3xl bg-white dark:bg-[#13141a] cursor-pointer hover:-translate-y-0.5 transition-all shadow-xs ${
                  isSelected
                    ? 'border-2 border-gray-900 dark:border-white ring-1 ring-gray-900/10 dark:ring-white/20'
                    : 'border border-[#e4e4eb] dark:border-[#1e2029]'
                } ${isPlaying ? 'is-playing' : ''}`}
              >
                {/* Radial Gradient Voice Sphere */}
                <div
                  className="w-[9em] h-[9em] rounded-full flex items-center justify-center mb-3 relative shadow-md border-2 border-white/20 transition-transform duration-300 hover:scale-105"
                  style={{ background: voice.gradient }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewVoice(voice.id);
                    }}
                    title="Preview Voice"
                    className="w-12 h-12 rounded-full bg-black/45 border border-white/40 text-white flex items-center justify-center text-[10px] cursor-pointer hover:bg-black/70 hover:scale-110 transition-all pl-0.5 shadow-md"
                  >
                    {isPlaying ? (
                      <Square className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>
                </div>

                <strong className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                  {voice.name}
                </strong>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">
                  {voice.style} <br /> <b>{voice.tag}</b>
                </span>

                <button
                  type="button"
                  className={`w-full py-3 text-xs font-semibold rounded-xl mt-2 cursor-pointer border-none transition-all ${
                    isSelected
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-[#1a1c24] text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#252836]'
                  }`}
                >
                  {isSelected ? 'Active' : 'Select'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Voice Sandbox */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4 flex flex-col gap-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
            Live Voice Sandbox
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 dark:text-gray-500 text-[11px] mr-1">Presets:</span>
            <button
              type="button"
              onClick={() =>
                setSandboxText('Hey! I am Grokki, your Windows companion. How can I assist you today?')
              }
              className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1e2029] text-[11px] font-medium cursor-pointer"
            >
              Greeting
            </button>
            <button
              type="button"
              onClick={() =>
                setSandboxText('I analyzed your codebase and fixed the memory leak in the audio worker.')
              }
              className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1e2029] text-[11px] font-medium cursor-pointer"
            >
              Coding
            </button>
            <button
              type="button"
              onClick={() =>
                setSandboxText('Good afternoon. You have two scheduled meetings on Google Calendar today.')
              }
              className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1e2029] text-[11px] font-medium cursor-pointer"
            >
              Briefing
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={sandboxText}
            onChange={(e) => setSandboxText(e.target.value)}
            className="flex-1 h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => onPreviewVoice(selectedVoiceId, sandboxText)}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 transition-all cursor-pointer flex-shrink-0 border-none"
          >
            {playingVoice === selectedVoiceId ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Voice</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audio Engine Toggles */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl px-5 py-2 flex flex-col shadow-xs">
        <div className="flex items-center justify-between py-3.5">
          <div>
            <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
              Spoken Audio Response
            </strong>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Read answers out loud using your chosen Kokoro neural voice.
            </span>
          </div>
          <input
            type="checkbox"
            checked={config.ttsEnabled !== false}
            onChange={(e) => onChangeConfig({ ttsEnabled: e.target.checked })}
            className="w-4 h-4 cursor-pointer accent-gray-900 dark:accent-white"
          />
        </div>

        <div className="flex items-center justify-between py-3.5 border-t border-[#e4e4eb] dark:border-[#1e2029]">
          <div>
            <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
              Wake Word Activation ("Hey Grokki")
            </strong>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Listens continuously in the background for hands-free queries.
            </span>
          </div>
          <input
            type="checkbox"
            checked={config.wakeWordEnabled !== false}
            onChange={(e) => onChangeConfig({ wakeWordEnabled: e.target.checked })}
            className="w-4 h-4 cursor-pointer accent-gray-900 dark:accent-white"
          />
        </div>
      </div>
    </div>
  );
};
