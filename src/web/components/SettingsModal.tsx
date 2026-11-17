import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bell, Brain, FlaskConical, Folder, Keyboard, Search } from 'lucide-react';
import { SettingsIcon } from '@animateicons/react/lucide/settings-icon';
import { PaletteIcon } from '@animateicons/react/lucide/palette-icon';
import { SlidersHorizontalIcon } from '@animateicons/react/lucide/sliders-horizontal-icon';
import { InfoIcon } from '@animateicons/react/lucide/info-icon';
import { MicIcon } from '@animateicons/react/lucide/mic-icon';
import { CpuIcon } from '@animateicons/react/lucide/cpu-icon';
import { JarvisConfig, SystemInfo, StudioHotkeys, ActiveModelPull } from '../types/jarvis';
import { StudioSettingsTab } from './tabs/StudioSettingsTab';
import { AppearanceTab } from './tabs/AppearanceTab';
import { PersonalizationTab } from './tabs/PersonalizationTab';
import { AboutTab } from './tabs/AboutTab';
import { MemoryTab } from './tabs/MemoryTab';
import { VoiceModelsTab } from './tabs/VoiceModelsTab';
import { AiBrainTab } from './tabs/AiBrainTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { ProjectsTab } from './tabs/ProjectsTab';
import { ErrorBoundary } from './ErrorBoundary';

export type SettingsSection =
  | 'settings'
  | 'memory'
  | 'ai'
  | 'voice'
  | 'projects'
  | 'appearance'
  | 'notifications'
  | 'shortcuts'
  | 'profile'
  | 'experimental'
  | 'about';

interface SectionItem {
  id: SettingsSection;
  label: string;
  desc: string;
  group: 'core' | 'prefs' | 'meta';
  Icon: any;
}

const SECTIONS: SectionItem[] = [
  {
    id: 'ai',
    label: 'Providers',
    desc: 'Reasoning brains, API providers & routing',
    group: 'core',
    Icon: CpuIcon,
  },
  {
    id: 'memory',
    label: 'Memory',
    desc: 'Profile, projects, episodic & knowledge memory',
    group: 'core',
    Icon: Brain,
  },
  {
    id: 'voice',
    label: 'Voice Models',
    desc: 'VoiceStudio, ElevenLabs & neural voices',
    group: 'core',
    Icon: MicIcon,
  },
  {
    id: 'projects',
    label: 'Projects',
    desc: 'Active & recent agent workspace folders',
    group: 'core',
    Icon: Folder,
  },
  {
    id: 'settings',
    label: 'Preferences',
    desc: 'Window behavior, startup & response engine',
    group: 'prefs',
    Icon: SettingsIcon,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    desc: 'Themes, wallpaper effects & cursor',
    group: 'prefs',
    Icon: PaletteIcon,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    desc: 'Sound effects & desktop completion alerts',
    group: 'prefs',
    Icon: Bell,
  },
  {
    id: 'shortcuts',
    label: 'Shortcuts',
    desc: 'Keyboard shortcuts & global hotkeys',
    group: 'prefs',
    Icon: Keyboard,
  },
  {
    id: 'profile',
    label: 'Personalization',
    desc: 'Persona name, user profile & avatar',
    group: 'prefs',
    Icon: SlidersHorizontalIcon,
  },
  {
    id: 'experimental',
    label: 'Experimental',
    desc: 'Spatial air-cursor & beta features',
    group: 'meta',
    Icon: FlaskConical,
  },
  {
    id: 'about',
    label: 'About',
    desc: 'Version, developer info & updates',
    group: 'meta',
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
  activeModelPull?: ActiveModelPull | null;
  onPullModel?: (tag: string) => Promise<void>;
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
  activeModelPull,
  onPullModel,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    if (!isOpen) setSearchQuery('');
  }, [isOpen]);

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const currentSection = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];
  const coreSections = filteredSections.filter((s) => s.group === 'core');
  const prefSections = filteredSections.filter((s) => s.group === 'prefs');
  const metaSections = filteredSections.filter((s) => s.group === 'meta');

  const renderNavGroup = (items: SectionItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="flex flex-col gap-0.5">
        {items.map((section) => {
          const isActive = activeSection === section.id;
          const IconComponent = section.Icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelectSection(section.id)}
              className={`group flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer border-none ${
                isActive
                  ? 'bg-gray-200/80 dark:bg-white/[0.08] text-gray-900 dark:text-zinc-100 font-medium'
                  : 'bg-transparent text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex-shrink-0 flex items-center justify-center opacity-80">
                <IconComponent size={15} />
              </span>
              <span className="text-[13px] truncate">{section.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 bg-[#fafafa] dark:bg-[#0a0a0c] text-gray-900 dark:text-zinc-100 flex flex-col overflow-hidden animate-in fade-in duration-150 select-none"
    >
      {/* Subtle Top Drag Strip for frameless Electron window */}
      <div
        className="h-8 w-full flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* Centered OpenCode-style Minimalist Fullscreen Layout */}
      <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto px-6 sm:px-10 pb-8 flex flex-row gap-10 overflow-hidden">
        {/* Left Navigation Column */}
        <aside className="w-52 sm:w-56 flex-shrink-0 flex flex-col gap-5 pt-10 select-none">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 w-fit px-1 py-1 text-[13px] text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white bg-transparent border-none cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to app</span>
          </button>

          {/* Minimal Search Input */}
          <div className="relative flex items-center ml-2 border-gray-200 dark:border-white/[0.08] mt-6 pb-1.5">
            <Search className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 mr-1.5 mb-0.5 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent border-none outline-none text-[13px] text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            />
          </div>

          <nav className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
            {renderNavGroup(coreSections)}
            {renderNavGroup(prefSections)}
            {renderNavGroup(metaSections)}
            {filteredSections.length === 0 && (
              <p className="text-[12px] text-gray-400 dark:text-zinc-500 px-2">
                No matching sections
              </p>
            )}
          </nav>
        </aside>

        {/* Right Content Pane */}
        <main className="flex-1 h-full min-w-0 flex flex-col overflow-hidden select-text">
          <div className="flex-shrink-0 mt-10 mb-6 pr-2">
            <h1
              id="settings-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-zinc-100 tracking-tight m-0"
            >
              {currentSection.label}
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-zinc-400 mt-1 mb-0">
              {currentSection.desc}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-12">
            <ErrorBoundary fallbackTabName={activeSection}>
            {activeSection === 'settings' && (
              <StudioSettingsTab
                config={config}
                onChangeConfig={onChangeConfig}
                onClearConversations={onClearConversations}
                mode="general"
              />
            )}

            {activeSection === 'projects' && <ProjectsTab />}

            {activeSection === 'notifications' && (
              <NotificationsTab
                config={config}
                onChangeConfig={onChangeConfig}
              />
            )}

            {activeSection === 'shortcuts' && (
              <StudioSettingsTab
                config={config}
                onChangeConfig={onChangeConfig}
                onClearConversations={onClearConversations}
                mode="shortcuts"
              />
            )}

            {activeSection === 'experimental' && (
              <StudioSettingsTab
                config={config}
                onChangeConfig={onChangeConfig}
                onClearConversations={onClearConversations}
                mode="experimental"
              />
            )}

            {activeSection === 'memory' && <MemoryTab />}

            {activeSection === 'ai' && (
              <AiBrainTab
                config={config}
                onChangeConfig={onChangeConfig}
                activeModelPull={activeModelPull}
                onPullModel={onPullModel}
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
          </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
