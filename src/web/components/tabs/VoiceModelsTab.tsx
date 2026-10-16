import React, { useState } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
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
];

export const VoiceModelsTab: React.FC<VoiceModelsTabProps> = ({
  config,
  onChangeConfig,
  playingVoice,
  onPreviewVoice,
}) => {
  const [filter, setFilter] = useState<'all' | 'us' | 'uk'>('all');
  const [sandboxText, setSandboxText] = useState(
    'Hey! I am Grokki, your Windows companion. How can I assist you today?'
  );

  const filteredVoices = VOICES.filter((v) => {
    if (filter === 'all') return true;
    return v.accent === filter;
  });

  const selectedVoiceId = config.ttsVoice || 'af_bella';

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      {/* Header with ElevenLabs-Style Filters */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Voice Models
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            High-fidelity neural voices rendered on local Kokoro-82M engine.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#13141a] p-1 rounded-xl border border-gray-200 dark:border-[#1e2029]">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer border-none transition-all ${
              filter === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xs'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All (8)
          </button>
          <button
            onClick={() => setFilter('us')}
            className={`text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer border-none transition-all ${
              filter === 'us'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xs'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            American
          </button>
          <button
            onClick={() => setFilter('uk')}
            className={`text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer border-none transition-all ${
              filter === 'uk'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xs'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            British
          </button>
        </div>
      </div>

      {/* Voice Grid */}
      <div className="grid grid-cols-4 gap-4 w-full">
        {filteredVoices.map((voice) => {
          const isSelected = selectedVoiceId === voice.id;
          const isPlaying = playingVoice === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => onChangeConfig({ ttsVoice: voice.id })}
              className={`flex flex-col items-center text-center p-5 rounded-2xl bg-white dark:bg-[#13141a] cursor-pointer hover:-translate-y-0.5 transition-all shadow-xs ${
                isSelected
                  ? 'border-2 border-gray-900 dark:border-white ring-1 ring-gray-900/10 dark:ring-white/20'
                  : 'border border-[#e4e4eb] dark:border-[#1e2029]'
              } ${isPlaying ? 'is-playing' : ''}`}
            >
              {/* Radial Gradient Voice Sphere */}
              <div
                className="w-[74px] h-[74px] rounded-full flex items-center justify-center mb-3 relative shadow-md border-2 border-white/20 transition-transform duration-300 hover:scale-105"
                style={{ background: voice.gradient }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewVoice(voice.id);
                  }}
                  title="Preview Voice"
                  className="w-7 h-7 rounded-full bg-black/45 border border-white/40 text-white flex items-center justify-center text-[10px] cursor-pointer hover:bg-black/70 hover:scale-110 transition-all pl-0.5 shadow-md"
                >
                  {isPlaying ? (
                    <Square className="w-3 h-3 fill-current" />
                  ) : (
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  )}
                </button>
              </div>

              <strong className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                {voice.name}
              </strong>
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                {voice.style}
              </span>

              {/* Dynamic Waveform Bars (Clean Monochrome) */}
              <div className="flex items-center gap-1 my-1.5 h-4">
                <div className={`voice-wave-bar ${isPlaying ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-750'}`} />
                <div className={`voice-wave-bar ${isPlaying ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-750'}`} />
                <div className={`voice-wave-bar ${isPlaying ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-750'}`} />
                <div className={`voice-wave-bar ${isPlaying ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-750'}`} />
                <div className={`voice-wave-bar ${isPlaying ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-750'}`} />
              </div>

              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] mb-3">
                {voice.tag}
              </span>

              <button
                type="button"
                className={`w-full py-1.5 text-xs font-semibold rounded-lg cursor-pointer border-none transition-all ${
                  isSelected
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-[#1a1c24] text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#252836]'
                }`}
              >
                {isSelected ? 'Active ✓' : 'Select'}
              </button>
            </div>
          );
        })}
      </div>

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
              onClick={() => setSandboxText('Hey! I am Grokki, your Windows companion. How can I assist you today?')}
              className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1e2029] text-[11px] font-medium cursor-pointer"
            >
              Greeting
            </button>
            <button
              type="button"
              onClick={() => setSandboxText('I analyzed your codebase and fixed the memory leak in the audio worker.')}
              className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1e2029] text-[11px] font-medium cursor-pointer"
            >
              Coding
            </button>
            <button
              type="button"
              onClick={() => setSandboxText('Good afternoon. You have two scheduled meetings on Google Calendar today.')}
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
