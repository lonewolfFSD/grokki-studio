import React, { useState, useEffect, useRef } from 'react';
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

const DEFAULT_CONFIG: JarvisConfig = {
  provider: 'gemini',
  geminiApiKey: '',
  groqApiKey: '',
  groqModel: 'openai/gpt-oss-120b',
  ollamaEndpoint: 'http://127.0.0.1:11434',
  ollamaModel: 'llama3.2',
  openrouterApiKey: '',
  openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
  ttsVoice: 'af_bella',
  ttsEnabled: true,
  wakeWordEnabled: true,
  pillTheme: 'glass',
  hotkey: 'Alt+Q',
  userName: '',
  userNickname: '',
  userTone: 'companion',
  userBio: '',
  dashboardTheme: 'light',
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
  const theme = config.dashboardTheme || 'light';

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

  // Load initial settings and system info from Electron preload
  useEffect(() => {
    const api = window.jarvisAPI;
    if (!api) return;

    api.getConfig().then((cfg) => {
      if (cfg) {
        const merged = { ...DEFAULT_CONFIG, ...cfg };
        setConfig(merged);
        setOriginalConfig(merged);
        const initialTheme = merged.dashboardTheme || 'light';
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
  const handleConfigChange = (patch: Partial<JarvisConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      setHasUnsaved(true);
      return next;
    });
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
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
    setConfig((prev) => ({ ...prev, dashboardTheme: nextTheme }));
    setOriginalConfig((prev) => ({ ...prev, dashboardTheme: nextTheme }));
    if (window.jarvisAPI?.saveConfig) {
      window.jarvisAPI.saveConfig({ ...config, dashboardTheme: nextTheme });
    }
  };

  const handleReset = () => {
    setConfig(originalConfig);
    setHasUnsaved(false);
  };

  const handleSave = async () => {
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
  };

  // Close guard: if dirty, shake the toast; else close
  const handleClose = () => {
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
  };

  const handleMinimize = () => {
    if (window.jarvisAPI?.minimizeDashboard) {
      window.jarvisAPI.minimizeDashboard();
    }
  };

  const handleMaximize = () => {
    if (window.jarvisAPI?.maximizeDashboard) {
      window.jarvisAPI.maximizeDashboard();
    }
  };

  // Voice Sample Preview
  const handlePreviewVoice = async (voiceId: string, customText?: string) => {
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
  };

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
    google: 'Google Workspace',
    appearance: 'Appearance',
    settings: 'Studio Settings',
    about: 'About Grokki Studio',
  };

  return (
    <div className="w-screen h-screen flex flex-row overflow-hidden bg-[#f7f7fa] dark:bg-[#0c0d12] text-gray-900 dark:text-gray-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
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
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f7f7fa] dark:bg-[#0c0d12]">
        <Header
          title={tabTitles[activeTab]}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          isMaximized={isMaximized}
          onClose={handleClose}
          onSearchClick={() => setActiveTab('chat')}
        />

        {/* Tab Panels */}
        <main className={`flex-1 overflow-y-auto ${activeTab === 'chat' ? 'px-6 py-4 flex flex-col' : 'px-8 py-6'}`}>
          {activeTab === 'chat' && (
            <ChatTab
              config={config}
              userName={displayName}
              onNavigateTab={setActiveTab}
              activeConversation={activeConversation}
              onUpdateMessages={updateActiveMessages}
              onNewChat={createConversation}
            />
          )}

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
  );
};
