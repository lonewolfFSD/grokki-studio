import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar, TabId } from './components/Sidebar';
import { Header } from './components/Header';
import { UnsavedToast } from './components/UnsavedToast';
import { OverviewTab } from './components/tabs/OverviewTab';
import { ChatTab } from './components/tabs/ChatTab';
import { VoiceModelsTab } from './components/tabs/VoiceModelsTab';
import { AiBrainTab } from './components/tabs/AiBrainTab';
import { PersonalizationTab } from './components/tabs/PersonalizationTab';
import { GoogleWorkspaceTab } from './components/tabs/GoogleWorkspaceTab';
import { AppearanceTab } from './components/tabs/AppearanceTab';
import { StudioSettingsTab } from './components/tabs/StudioSettingsTab';
import { AboutTab } from './components/tabs/AboutTab';
import { JarvisConfig, GoogleProfile, SystemInfo } from './types/jarvis';
import { useConversations } from './hooks/useConversations';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { DEFAULT_HOTKEYS, getEffectiveHotkeys, matchesHotkey } from './utils/hotkeys';
import { ErrorBoundary } from './components/ErrorBoundary';
import GlowCursor from './components/GlowCursor';

const DEFAULT_CONFIG: JarvisConfig = {
  provider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  groqApiKey: '',
  groqModel: 'openai/gpt-oss-120b',
  ollamaEndpoint: 'http://127.0.0.1:11434',
  ollamaModel: 'llama3.2',
  openrouterApiKey: '',
  openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  grokApiKey: '',
  grokModel: 'grok-2-1212',
  deepseekApiKey: '',
  deepseekModel: 'deepseek-chat',
  qwenApiKey: '',
  qwenModel: 'qwen-max',
  omnirouterApiKey: '',
  omnirouterModel: 'omnirouter/auto',
  omnirouterEndpoint: 'https://api.omnirouter.ai/v1',
  ttsVoice: 'af_bella',
  ttsEnabled: true,
  wakeWordEnabled: true,
  pillTheme: 'glass',
  musicProvider: 'spotify',
  hotkey: 'Alt+Q',
  hotkeys: DEFAULT_HOTKEYS,
  userName: '',
  userNickname: '',
  userTone: 'companion',
  userBio: '',
  dashboardTheme: 'dark',
  launchOnStartup: false,
  autoOpenStudioOnStartup: false,
  closeAction: 'tray',
  launchMode: 'windowed',
  alwaysOnTop: false,
  showSplashScreen: true,
  showIslandOnStartup: false,
  streamingAnimation: true,
  streamingSpeed: 'fast',
  sendOnEnter: true,
  soundEffectsEnabled: true,
  autoCheckUpdates: true,
  hardwareAcceleration: true,
  chatBackgroundGradient: true,
  glowCursorEnabled: true,
  smoothScroll: true,
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [config, setConfig] = useState<JarvisConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<JarvisConfig>(DEFAULT_CONFIG);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [saving, setSaving] = useState(false);

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useSmoothScroll(config.smoothScroll !== false);

  const {
    conversations,
    activeConversation,
    activeConversationId,
    selectConversation,
    createConversation,
    deleteConversation,
    renameConversation,
    updateActiveMessages,
  } = useConversations();

  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize theme from config
  const theme = config.dashboardTheme || 'dark';

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Global capture listener: open any <a> link in the user's external system browser
  useEffect(() => {
    const handleGlobalLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a') as HTMLAnchorElement | null;
      if (!anchor) return;
      const url = anchor.getAttribute('data-external-href') || anchor.getAttribute('href') || '';
      if (url && (url !== '#' || anchor.hasAttribute('data-external-href'))) {
        if (url.startsWith('#') && !anchor.hasAttribute('data-external-href')) return;
        if (url.startsWith('javascript:')) return;
        e.preventDefault();
        e.stopPropagation();
        anchor.removeAttribute('target');
        window.jarvisAPI?.openUrl(url).catch((err) => console.warn('[App] openUrl failed:', err));
      }
    };

    document.addEventListener('click', handleGlobalLinkClick, true);
    document.addEventListener('auxclick', handleGlobalLinkClick, true);
    return () => {
      document.removeEventListener('click', handleGlobalLinkClick, true);
      document.removeEventListener('auxclick', handleGlobalLinkClick, true);
    };
  }, []);

  // Load initial settings and system info from Electron preload
  useEffect(() => {
    const api = window.jarvisAPI;
    if (!api) return;

    api.getConfig().then((cfg) => {
      if (cfg) {
        const merged = { ...DEFAULT_CONFIG, ...cfg };
        setConfig(merged);
        setOriginalConfig(merged);
        const initialTheme = merged.dashboardTheme || 'dark';
        if (initialTheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
          document.body.classList.add('dark');
          document.body.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
          document.body.classList.add('light');
          document.body.classList.remove('dark');
        }
      }
    });

    loadGoogleStatus();

    if (api.getSystemInfo) {
      api.getSystemInfo().then((info) => {
        if (info) setSystemInfo(info);
      });
    }

    if (api.isDashboardMaximized) {
      api.isDashboardMaximized().then((max) => {
        setIsMaximized(!!max);
      });
    }

    let unsubMax: (() => void) | undefined;
    if (api.onMaximizedChange) {
      unsubMax = api.onMaximizedChange((max) => {
        setIsMaximized(max);
      });
    }

    if (api.onConfigUpdated) {
      api.onConfigUpdated((updated) => {
        const merged = { ...DEFAULT_CONFIG, ...updated };
        setConfig(merged);
        setOriginalConfig(merged);
        setHasUnsaved(false);
      });
    }

    return () => {
      if (unsubMax) unsubMax();
    };
  }, []);

  const loadGoogleStatus = async () => {
    const api = window.jarvisAPI;
    if (!api?.getGoogleStatus) return;
    try {
      const res = await api.getGoogleStatus();
      if (res && res.connected) {
        setGoogleConnected(true);
        setGoogleProfile(res.profile || null);
      } else {
        setGoogleConnected(false);
        setGoogleProfile(null);
      }
    } catch (e) {
      setGoogleConnected(false);
      setGoogleProfile(null);
    }
  };

  const handleSwitchGoogle = async () => {
    try {
      if (window.jarvisAPI?.disconnectGoogle) {
        await window.jarvisAPI.disconnectGoogle();
      }
      if (window.jarvisAPI?.connectGoogle) {
        await window.jarvisAPI.connectGoogle();
        await loadGoogleStatus();
      }
    } catch (e) {
      console.error('Failed to switch Google account:', e);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      if (window.jarvisAPI?.disconnectGoogle) {
        await window.jarvisAPI.disconnectGoogle();
        await loadGoogleStatus();
      }
    } catch (e) {
      console.error('Failed to disconnect Google:', e);
    }
  };

  // Track unsaved changes
  const handleConfigChange = useCallback((patch: Partial<JarvisConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      setHasUnsaved(true);
      return next;
    });
  }, []);

  const handleToggleTheme = useCallback(() => {
    setConfig((prev) => {
      const nextTheme = (prev.dashboardTheme || 'dark') === 'dark' ? 'light' : 'dark';
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.body.classList.add('dark');
        document.body.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.body.classList.add('light');
        document.body.classList.remove('dark');
      }
      setOriginalConfig((orig) => ({ ...orig, dashboardTheme: nextTheme }));
      if (window.jarvisAPI?.saveConfig) {
        window.jarvisAPI.saveConfig({ dashboardTheme: nextTheme });
      }
      return { ...prev, dashboardTheme: nextTheme };
    });
  }, []);

  const handleReset = useCallback(() => {
    setConfig(originalConfig);
    setHasUnsaved(false);
  }, [originalConfig]);

  const handleSave = useCallback(async () => {
    const api = window.jarvisAPI;
    if (!api?.saveConfig) return;
    setSaving(true);
    try {
      const saved = await api.saveConfig(config);
      const merged = { ...DEFAULT_CONFIG, ...saved };
      setConfig(merged);
      setOriginalConfig(merged);
      setHasUnsaved(false);
    } catch (err: any) {
      alert('Failed to save changes: ' + err.message);
    } finally {
      setSaving(false);
    }
  }, [config]);

  // Close guard: if dirty, shake the toast; else close
  const handleClose = useCallback(() => {
    if (hasUnsaved) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 450);
      return;
    }
    if (window.jarvisAPI?.closeDashboard) {
      window.jarvisAPI.closeDashboard();
    } else {
      window.close();
    }
  }, [hasUnsaved]);

  const handleMinimize = useCallback(() => {
    if (window.jarvisAPI?.minimizeDashboard) {
      window.jarvisAPI.minimizeDashboard();
    }
  }, []);

  const handleMaximize = useCallback(() => {
    if (window.jarvisAPI?.maximizeDashboard) {
      window.jarvisAPI.maximizeDashboard();
    }
  }, []);

  // Voice Sample Preview
  const handlePreviewVoice = useCallback(async (voiceId: string, customText?: string) => {
    if (playingVoice === voiceId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoice(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const textToSpeak = customText || `Hello! I am ready to assist you on Windows.`;
    setPlayingVoice(voiceId);

    try {
      if (window.jarvisAPI?.speakText) {
        const res = await window.jarvisAPI.speakText(textToSpeak, voiceId);
        if (res && res.success && res.base64Audio) {
          const audio = new Audio(`data:audio/wav;base64,${res.base64Audio}`);
          audioRef.current = audio;
          audio.onended = () => {
            setPlayingVoice(null);
            audioRef.current = null;
          };
          audio.play();
        } else {
          setPlayingVoice(null);
        }
      } else {
        setPlayingVoice(null);
      }
    } catch (err) {
      console.error('TTS error:', err);
      setPlayingVoice(null);
    }
  }, [playingVoice]);

  const effectiveHotkeys = getEffectiveHotkeys(config);

  // Global Studio Keyboard Shortcuts Listener
  useEffect(() => {
    const handleGlobalHotkeys = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      if (matchesHotkey(e, effectiveHotkeys.newChat)) {
        e.preventDefault();
        createConversation();
        setActiveTab('chat');
      } else if (matchesHotkey(e, effectiveHotkeys.toggleSidebar)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('grokki:toggle-sidebar'));
      } else if (matchesHotkey(e, effectiveHotkeys.toggleTheme)) {
        e.preventDefault();
        handleToggleTheme();
      } else if (matchesHotkey(e, effectiveHotkeys.openSettings)) {
        e.preventDefault();
        setActiveTab('settings');
      } else if (activeTab !== 'chat') {
        // Allow chat-specific hotkeys from other tabs to jump into Chat and trigger the action
        let chatAction: string | null = null;
        if (matchesHotkey(e, effectiveHotkeys.attachFile)) chatAction = 'attachFile';
        else if (matchesHotkey(e, effectiveHotkeys.voiceRecord)) chatAction = 'voiceRecord';
        else if (matchesHotkey(e, effectiveHotkeys.openCamera)) chatAction = 'openCamera';
        else if (matchesHotkey(e, effectiveHotkeys.focusInput)) chatAction = 'focusInput';

        if (chatAction) {
          e.preventDefault();
          setActiveTab('chat');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('grokki:chat-hotkey', { detail: chatAction }));
          }, 60);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalHotkeys);
    return () => window.removeEventListener('keydown', handleGlobalHotkeys);
  }, [effectiveHotkeys, activeTab, theme, config, createConversation]);

  // Derive Display Name: Google Name > userNickname > userName > 'Friend'
  const displayName =
    (googleConnected && googleProfile?.name) ||
    config.userNickname ||
    config.userName ||
    'Friend';

  const tabTitles: Record<TabId, string> = {
    chat: 'Chat',
    overview: 'Home',
    voice: 'Voice Models',
    ai: 'AI Brain & Keys',
    profile: 'Personalization',
    google: 'Workspace Integrations',
    appearance: 'Appearance',
    settings: 'Studio Settings',
    about: 'About Grokki Studio',
  };

  return (
    <GlowCursor
      color="#5f8bff"
      intensity={1.3}
      trailWidth={3}
      linger={1.4}
      glow={1.2}
      clickBurst
      theme={theme === 'dark' ? 'dark' : 'light'}
      enabled={config.glowCursorEnabled !== false}
      className="w-screen h-screen"
    >
      <div className="w-full h-full flex flex-row overflow-hidden bg-[#f7f7fa] dark:bg-[#0c0d12] text-gray-900 dark:text-gray-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        theme={theme}
        userName={displayName}
        googleProfile={googleProfile}
        googleConnected={googleConnected}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onCreateConversation={createConversation}
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
        onSwitchGoogle={handleSwitchGoogle}
        onDisconnectGoogle={handleDisconnectGoogle}
        hotkeys={effectiveHotkeys}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f7f7fa] dark:bg-[#0c0d12]">
        <Header
          title={tabTitles[activeTab]}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          toggleThemeShortcut={effectiveHotkeys.toggleTheme}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          isMaximized={isMaximized}
          onClose={handleClose}
          onSearchClick={() => setActiveTab('chat')}
        />

        {/* Tab Panels */}
        <main className={`flex-1 min-h-0 overflow-y-auto ${activeTab === 'chat' ? 'h-full flex flex-col relative bg-[#f7f7fa] dark:bg-[#0b0c10] overflow-hidden' : 'px-8 py-6'}`}>
          <div className={activeTab === 'chat' ? 'h-full flex flex-col relative w-full overflow-hidden' : 'hidden'}>
            <ChatTab
              config={config}
              userName={displayName}
              onNavigateTab={setActiveTab}
              activeConversation={activeConversation}
              onUpdateMessages={updateActiveMessages}
              onNewChat={createConversation}
            />
          </div>

          <ErrorBoundary fallbackTabName={activeTab} onReset={() => setActiveTab('chat')}>
            {activeTab === 'overview' && (
              <OverviewTab
                config={config}
                userName={displayName}
                onNavigateTab={setActiveTab}
                googleConnected={googleConnected}
              />
            )}

            {activeTab === 'voice' && (
              <VoiceModelsTab
                config={config}
                onChangeConfig={handleConfigChange}
                playingVoice={playingVoice}
                onPreviewVoice={handlePreviewVoice}
              />
            )}

            {activeTab === 'ai' && (
              <AiBrainTab
                config={config}
                onChangeConfig={handleConfigChange}
              />
            )}

            {activeTab === 'profile' && (
              <PersonalizationTab
                config={config}
                onChangeConfig={handleConfigChange}
              />
            )}

            {activeTab === 'google' && (
              <GoogleWorkspaceTab
                config={config}
                onChangeConfig={handleConfigChange}
                connected={googleConnected}
                profile={googleProfile}
                onRefreshStatus={loadGoogleStatus}
              />
            )}

            {activeTab === 'appearance' && (
              <AppearanceTab
                config={config}
                onChangeConfig={handleConfigChange}
              />
            )}

            {activeTab === 'settings' && (
              <StudioSettingsTab
                config={config}
                onChangeConfig={handleConfigChange}
                onClearConversations={() => {
                  conversations.forEach((c) => deleteConversation(c.id));
                }}
              />
            )}

            {activeTab === 'about' && (
              <AboutTab
                systemInfo={systemInfo}
                hotkey={config.hotkey || 'Alt+Q'}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Discord-Style Full-Width Bottom Unsaved Changes Banner */}
      <UnsavedToast
        visible={hasUnsaved}
        shaking={isShaking}
        saving={saving}
        onReset={handleReset}
        onSave={handleSave}
      />
      </div>
    </GlowCursor>
  );
};
