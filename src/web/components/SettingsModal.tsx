import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { SettingsIcon } from '@animateicons/react/lucide/settings-icon';
import { PaletteIcon } from '@animateicons/react/lucide/palette-icon';
import { SlidersHorizontalIcon } from '@animateicons/react/lucide/sliders-horizontal-icon';
import { InfoIcon } from '@animateicons/react/lucide/info-icon';
import { MicIcon } from '@animateicons/react/lucide/mic-icon';
import { CpuIcon } from '@animateicons/react/lucide/cpu-icon';
import { GlobeIcon } from '@animateicons/react/lucide/globe-icon';
import { JarvisConfig, SystemInfo, StudioHotkeys, GoogleProfile } from '../types/jarvis';
import { StudioSettingsTab } from './tabs/StudioSettingsTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { PersonalizationTab } from './tabs/PersonalizationTab';
import { AboutTab } from './tabs/AboutTab';
import { MemoryTab } from './tabs/MemoryTab';
import { Brain } from 'lucide-react';
import { VoiceModelsTab } from './tabs/VoiceModelsTab';
import { AiBrainTab } from './tabs/AiBrainTab';
import { GoogleWorkspaceTab } from './tabs/GoogleWorkspaceTab';
import WarmTooltip from './WarmTooltip';

export type SettingsSection =
  | 'settings'
  | 'memory'
  | 'ai'
  | 'voice'
  | 'google'
  | 'appearance'
  | 'profile'
  | 'about';

interface SectionItem {
  id: SettingsSection;
  label: string;
  desc: string;
  Icon: any;
}

const SECTIONS: SectionItem[] = [
  {
    id: 'settings',
    label: 'Studio Settings',
    desc: 'System preferences, shortcuts & memory',
    Icon: SettingsIcon,
  },
  {
    id: 'memory',
    label: 'Persistent Memory',
    desc: 'Profile, projects, episodic & knowledge memory',
    Icon: Brain,
  },
  {
    id: 'ai',
    label: 'AI Models',
    desc: 'Reasoning brains, API providers & routing',
    Icon: CpuIcon,
  },
  {
    id: 'voice',
    label: 'Voice Models',
    desc: 'VoiceStudio, ElevenLabs & neural voices',
    Icon: MicIcon,
  },
  {
    id: 'google',
    label: 'Workspace',
    desc: 'Google Workspace integrations & calendar',
    Icon: GlobeIcon,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    desc: 'Themes, wallpaper effects & cursor',
    Icon: PaletteIcon,
  },
  {
    id: 'profile',
    label: 'Personalization',
    desc: 'Persona name, user profile & avatar',
    Icon: SlidersHorizontalIcon,
  },
  {
    id: 'about',
    label: 'About Grokki',
    desc: 'Version, developer info & updates',
    Icon: InfoIcon,
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: SettingsSection;
  onSelectSection: (section: SettingsSection) => void;
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
  systemInfo: SystemInfo | null;
  effectiveHotkeys?: StudioHotkeys;
  onClearConversations?: () => void;
  playingVoice?: string | null;
  onPreviewVoice?: (
    voiceId: string,
    customText?: string,
    options?: {
      provider?: 'grokki_voice' | 'voicestudio' | 'elevenlabs';
      apiKey?: string;
      previewUrl?: string;
      language?: string;
      langCode?: string;
      gender?: 'female' | 'male';
    }
  ) => void;
  googleConnected?: boolean;
  googleProfile?: GoogleProfile | null;
  onRefreshGoogleStatus?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  activeSection,
  onSelectSection,
  config,
  onChangeConfig,
  systemInfo,
  effectiveHotkeys,
  onClearConversations,
  playingVoice,
  onPreviewVoice,
  googleConnected,
  googleProfile,
  onRefreshGoogleStatus,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentSection = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-8 animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative w-full max-w-6xl h-[70vh] max-h-[850px] bg-white dark:bg-[#0e0f14] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Top Header Bar */}
        <div className="h-14 px-6 border-b border-[#e4e4eb] dark:border-[#1f1f22] bg-gray-50/50 dark:bg-[#111114] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              id="settings-modal-title"
              className="text-base font-bold text-gray-900 dark:text-gray-100 font-sans tracking-tight"
            >
              Settings
            </span>
            <span className="text-gray-400 dark:text-gray-600 text-xs">/</span>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-200/80 dark:bg-[#1f1f24] text-gray-700 dark:text-gray-300 border border-gray-300/60 dark:border-[#272832]">
              {currentSection.label}
            </span>
          </div>

          <WarmTooltip
            content="Close (Esc)"
            side="left"
            surfaceColor="#f5f5f5"
            inkColor="#18181b"
            size="md"
            radius={8}
            gap={8}
            arrow
            popDuration={160}
            popScale={0.94}
            popBlur={4}
            showFuse={false}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Settings"
              className="w-8 h-8 rounded-xl border border-gray-200 dark:border-[#1f1f22] bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#18181c] flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </WarmTooltip>
        </div>

        {/* Modal Main Area: Left Navigation Tabs + Right Settings Content */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <aside className="w-64 bg-gray-50/70 dark:bg-[#111114] border-r border-[#e4e4eb] dark:border-[#1f1f22] p-3 flex flex-col justify-between flex-shrink-0 select-none">
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-semibold text-gray-400 dark:text-gray-500 px-3 py-1 tracking-wider uppercase">
                Categories
              </span>
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                const IconComponent = section.Icon;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onSelectSection(section.id)}
                    className={`group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer border-none ${
                      isActive
                        ? 'bg-gray-200 dark:bg-[#1f1f24] text-gray-900 dark:text-gray-100 font-semibold shadow-xs'
                        : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#18181c]'
                    }`}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center">
                      <IconComponent size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] truncate">{section.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Keyboard Shortcut Hint */}
            <div className="px-3 py-2.5 rounded-xl bg-gray-100/60 dark:bg-[#16161a] border border-gray-200/60 dark:border-[#1f1f22] flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>Quick close</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1f1f24] border border-gray-300 dark:border-[#272832] font-mono text-[9.5px]">
                Esc
              </kbd>
            </div>
          </aside>

          {/* Right Content Pane */}
          <main className="flex-1 h-full min-w-0 overflow-y-auto px-8 py-6 bg-white dark:bg-[#070709] select-text">
            {activeSection === 'settings' && (
              <StudioSettingsTab
                config={config}
                onChangeConfig={onChangeConfig}
                onClearConversations={onClearConversations}
              />
            )}

            {activeSection === 'memory' && (
              <MemoryTab />
            )}

            {activeSection === 'ai' && (
              <AiBrainTab
                config={config}
                onChangeConfig={onChangeConfig}
              />
            )}

            {activeSection === 'voice' && (
              <VoiceModelsTab
                config={config}
                onChangeConfig={onChangeConfig}
                playingVoice={playingVoice || null}
                onPreviewVoice={onPreviewVoice || (() => {})}
              />
            )}

            {activeSection === 'google' && (
              <GoogleWorkspaceTab
                config={config}
                onChangeConfig={onChangeConfig}
                connected={Boolean(googleConnected)}
                profile={googleProfile || null}
                onRefreshStatus={onRefreshGoogleStatus || (() => {})}
              />
            )}

            {activeSection === 'appearance' && (
              <AppearanceTab
                config={config}
                onChangeConfig={onChangeConfig}
              />
            )}

            {activeSection === 'profile' && (
              <PersonalizationTab
                config={config}
                onChangeConfig={onChangeConfig}
              />
            )}

            {activeSection === 'about' && (
              <AboutTab
                systemInfo={systemInfo}
                hotkey={config.hotkey || 'Alt+Q'}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
