import React, { useState, useEffect } from 'react';
import {
  Mic,
  Cpu,
  Link2,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Pencil,
  GitBranch,
  Newspaper,
} from 'lucide-react';
import {
  JarvisConfig,
  NotionProfile,
  GitHubProfile,
  GitStatusResponse,
} from '../../types/jarvis';
import { TabId } from '../Sidebar';

import googleLogo from '../../assets/logos/google.png';
import whatsappLogo from '../../assets/logos/whatsapp.svg';
import notionLogo from '../../assets/logos/notion.png';
import obsidianLogo from '../../assets/logos/obsidian.png';
import githubLogo from '../../assets/logos/github.png';
import { MUSIC_SERVICES } from './GoogleWorkspaceTab';

export interface UpdateItem {
  id: string;
  title: string;
  date: string;
  summary?: string;
  tag?: string;
}

export interface QuickAccessItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  // Either jump to a settings tab or run a custom action.
  tab?: string;
  onClick?: () => void;
}

interface OverviewTabProps {
  config: JarvisConfig;
  userName: string;
  onNavigateTab: (tab: TabId) => void;
  googleConnected: boolean;
  // Optional extras. Everything below is hidden or shows an empty state until provided.
  updates?: UpdateItem[];
  // Replaces the default quick access tiles when provided.
  quickAccess?: QuickAccessItem[];
  googleEmail?: string;
  onConnectGoogle?: () => void;
}

// Tab id for the Integrations page. Match this to the matching TabId value in your Sidebar.
const INTEGRATIONS_TAB = 'integrations';

// Quick access tiles that are always shown. Match each `tab` to a TabId value in your Sidebar.
const BASE_QUICK_ACCESS: QuickAccessItem[] = [
  {
    id: 'voice',
    label: 'Voice Models',
    description: 'Pick and preview a voice',
    icon: <Mic className="w-4 h-4" />,
    tab: 'voice',
  },
  {
    id: 'model',
    label: 'AI Model',
    description: 'Change provider or model',
    icon: <Cpu className="w-4 h-4" />,
    tab: 'models',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Google, WhatsApp, Music, Notion, Obsidian, GitHub',
    icon: <Link2 className="w-4 h-4" />,
    tab: INTEGRATIONS_TAB,
  },
];

type Requirement = 'google' | 'notion' | 'obsidian' | 'git';

// Things Grokki can already do, shown as prompts to try.
const TRY_SAYING: { prompt: string; hint: string; needs?: Requirement }[] = [
  { prompt: "What's on my screen?", hint: 'Screen vision' },
  { prompt: 'Pause the music', hint: 'Media control' },
  { prompt: 'Send a message on WhatsApp', hint: 'WhatsApp' },
  { prompt: 'Summarize my latest emails', hint: 'Gmail', needs: 'google' },
  { prompt: 'Add a task to Notion', hint: 'Notion', needs: 'notion' },
  { prompt: 'Search my vault for project notes', hint: 'Obsidian', needs: 'obsidian' },
  { prompt: 'Commit and push my changes', hint: 'Git', needs: 'git' },
];

const SURFACE = 'bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029]';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// 'af_bella' -> 'Bella'
const voiceName = (id?: string): string => {
  if (!id) return 'Bella';
  const part = id.split('_')[1] ?? id;
  return part.charAt(0).toUpperCase() + part.slice(1);
};

// 'C:\\Projects\\grokki' -> 'grokki'
const folderName = (path?: string): string => {
  if (!path) return 'Repository';
  return path.split(/[\\/]/).filter(Boolean).pop() || path;
};

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md border border-gray-200 dark:border-[#2a2d3a] bg-gray-50 dark:bg-[#1a1c24] text-[11px] font-mono font-semibold text-gray-700 dark:text-gray-300 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
    {children}
  </kbd>
);

const Panel: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  action,
  children,
}) => (
  <section className="flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <h3 className="m-0 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {title}
      </h3>
      {action}
    </div>
    {children}
  </section>
);

const StatusPill: React.FC<{ on: boolean; onLabel: string; offLabel: string }> = ({
  on,
  onLabel,
  offLabel,
}) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300 flex-shrink-0">
    <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
    {on ? onLabel : offLabel}
  </span>
);

const AccountRow: React.FC<{
  logo: string | React.ReactNode;
  name: string;
  detail: string;
  connected: boolean;
  onClick: () => void;
  logoClassName?: string;
}> = ({ logo, name, detail, connected, onClick, logoClassName = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer border-none bg-transparent hover:bg-gray-50 dark:hover:bg-[#161822] transition-colors"
  >
    <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0">
      {typeof logo === 'string' ? (
        <img src={logo} alt="" className={`w-[18px] h-[18px] object-contain ${logoClassName}`} />
      ) : (
        logo
      )}
    </div>
    <div className="flex-1 min-w-0 flex flex-col">
      <strong className="text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</strong>
      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{detail}</span>
    </div>
    <StatusPill on={connected} onLabel="Connected" offLabel="Not linked" />
  </button>
);

export const OverviewTab = React.memo<OverviewTabProps>(({
  config,
  userName,
  onNavigateTab,
  googleConnected,
  updates = [],
  quickAccess,
  googleEmail,
  onConnectGoogle,
}) => {
  // Integration status (same sources the Integrations page uses).
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionProfile, setNotionProfile] = useState<NotionProfile | null>(null);
  const [obsidianConnected, setObsidianConnected] = useState(false);
  const [obsidianVaultName, setObsidianVaultName] = useState<string | null>(null);
  const [obsidianNotesCount, setObsidianNotesCount] = useState(0);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadNotion = async () => {
      if (!window.jarvisAPI?.getNotionStatus) return;
      try {
        const res = await window.jarvisAPI.getNotionStatus();
        if (cancelled) return;
        setNotionConnected(Boolean(res && res.connected));
        setNotionProfile(res && res.connected ? res.profile || null : null);
      } catch {
        if (!cancelled) setNotionConnected(false);
      }
    };

    const loadObsidian = async () => {
      if (!window.jarvisAPI?.getObsidianStatus) return;
      try {
        const res = await window.jarvisAPI.getObsidianStatus();
        if (cancelled) return;
        setObsidianConnected(Boolean(res && res.connected));
        setObsidianVaultName(res && res.connected ? res.vaultName || null : null);
        setObsidianNotesCount(res && res.connected ? res.notesCount || 0 : 0);
      } catch {
        if (!cancelled) setObsidianConnected(false);
      }
    };

    const loadGitHub = async () => {
      if (!window.jarvisAPI?.getGitHubStatus) return;
      try {
        const res = await window.jarvisAPI.getGitHubStatus();
        if (cancelled) return;
        setGithubConnected(Boolean(res && res.connected));
        setGithubProfile(res && res.connected ? res.profile || null : null);
      } catch {
        if (!cancelled) setGithubConnected(false);
      }
    };

    const loadGit = async () => {
      if (!window.jarvisAPI?.getGitStatus) return;
      try {
        const res = await window.jarvisAPI.getGitStatus();
        if (!cancelled && res && res.success) setGitStatus(res);
      } catch {
        // No local repo available; the Git workspace card stays hidden.
      }
    };

    loadNotion();
    loadObsidian();
    loadGitHub();
    loadGit();

    let unsubNotion: (() => void) | undefined;
    if (window.jarvisAPI?.onNotionConnected) {
      unsubNotion = window.jarvisAPI.onNotionConnected((newProfile: NotionProfile) => {
        setNotionConnected(true);
        setNotionProfile(newProfile);
      });
    }

    let unsubGitHub: (() => void) | undefined;
    if (window.jarvisAPI?.onGitHubConnected) {
      unsubGitHub = window.jarvisAPI.onGitHubConnected((newProfile: GitHubProfile) => {
        setGithubConnected(true);
        setGithubProfile(newProfile);
      });
    }

    return () => {
      cancelled = true;
      if (unsubNotion) unsubNotion();
      if (unsubGitHub) unsubGitHub();
    };
  }, []);

  const providerLabel =
    {
      gemini: `Gemini (${config.geminiModel || '2.5-flash'})`,
      groq: `Groq (${config.groqModel || 'llama-3.3-70b'})`,
      ollama: `Ollama (${config.ollamaModel || 'llama3.2'})`,
      openrouter: `OpenRouter (${config.openrouterModel || 'auto'})`,
      omnirouter: `OmniRouter (${config.omnirouterModel || 'auto'})`,
      openai: `ChatGPT (${config.openaiModel || 'gpt-4o'})`,
      grok: `xAI Grok (${config.grokModel || 'grok-2'})`,
      deepseek: `DeepSeek (${config.deepseekModel || 'chat'})`,
      qwen: `Qwen (${config.qwenModel || 'max'})`,
    }[config.provider] || config.provider;

  const hotkeyParts = (config.hotkey || 'Alt+Q').split('+').map((k) => k.trim());
  const wakeWordOn = config.wakeWordEnabled !== false;
  const spokenOn = config.ttsEnabled !== false;
  const selectedMusic = config.musicProvider || 'spotify';
  const currentMusic =
    (MUSIC_SERVICES && MUSIC_SERVICES[selectedMusic]) ||
    (MUSIC_SERVICES && MUSIC_SERVICES.spotify) || {
      id: 'spotify',
      name: 'Spotify',
      logo: '',
      appUrl: 'spotify://',
      webUrl: 'https://open.spotify.com',
    };

  const connectedCount = [googleConnected, true, true, notionConnected, obsidianConnected, githubConnected].filter(
    Boolean
  ).length;

  const openExternal = (url: string) => {
    if (!url) return;
    if (window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl(url).catch((err) => console.warn('[OverviewTab] openUrl failed:', err));
    } else {
      try {
        window.open(url, '_blank');
      } catch (err) {
        console.warn('[OverviewTab] window.open failed:', err);
      }
    }
  };

  // Default quick access: fixed tiles plus quick launch for anything that is linked.
  const defaultTiles: QuickAccessItem[] = [...BASE_QUICK_ACCESS];
  if (obsidianConnected) {
    defaultTiles.push({
      id: 'open-obsidian',
      label: 'Open vault',
      description: obsidianVaultName ? `Launch ${obsidianVaultName} in Obsidian` : 'Launch Obsidian',
      icon: <img src={obsidianLogo} alt="" className="w-4 h-4 object-contain" />,
      onClick: () => window.jarvisAPI?.openObsidianVault?.(),
    });
  }
  if (githubConnected && githubProfile?.html_url) {
    const profileUrl = githubProfile.html_url;
    defaultTiles.push({
      id: 'open-github',
      label: 'GitHub profile',
      description: `@${githubProfile.login}`,
      icon: <img src={githubLogo} alt="" className="w-4 h-4 object-contain transition-all dark:brightness-0 dark:invert" />,
      onClick: () => openExternal(profileUrl),
    });
  }
  const tiles = quickAccess ?? defaultTiles;

  const runTile = (item: QuickAccessItem) => {
    if (item.onClick) item.onClick();
    else if (item.tab) onNavigateTab(item.tab as TabId);
  };

  const goToIntegrations = () => onNavigateTab(INTEGRATIONS_TAB as TabId);

  const hasGit = Boolean(gitStatus?.isRepo) || githubConnected;
  const satisfied: Record<Requirement, boolean> = {
    google: googleConnected,
    notion: notionConnected,
    obsidian: obsidianConnected,
    git: hasGit,
  };
  const prompts = TRY_SAYING.filter((p) => !p.needs || satisfied[p.needs]);

  const uncommitted = (gitStatus?.modifiedCount || 0) + (gitStatus?.untrackedCount || 0);

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full pb-16">
      {/* Header */}
      <header className="flex flex-col gap-2 mt-16">
        
        <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {getGreeting()}, {userName}
        </h2>
        <p className="m-0 flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <span>Press</span>
          <span className="inline-flex items-center gap-1">
            {hotkeyParts.map((key, i) => (
              <Kbd key={`${key}-${i}`}>{key}</Kbd>
            ))}
          </span>
          <span>anywhere to summon Grokki.</span>
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Quick access */}
          <Panel title="Quick access">
            <div className="grid grid-cols-3 gap-3">
              {tiles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => runTile(item)}
                  className={`group relative flex flex-col items-start gap-3 p-4 rounded-2xl ${SURFACE} text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-[#2c3040] hover:shadow-md`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-700 dark:text-gray-300">
                    {item.icon}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0 w-full">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.description}
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 absolute top-4 right-4 text-gray-300 dark:text-gray-600 transition-colors group-hover:text-gray-900 dark:group-hover:text-white" />
                </button>
              ))}
            </div>
          </Panel>

          {/* Git workspace (only when a local repo is active) */}
          {gitStatus?.isRepo && (
            <Panel title="Git workspace">
              <div className={`${SURFACE} rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-700 dark:text-gray-300 flex-shrink-0">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <strong className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {folderName(gitStatus.cwd)}
                    </strong>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
                      {gitStatus.branch}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-5 text-xs font-medium text-gray-600 dark:text-gray-300">
                  <span className="inline-flex items-center gap-1.5" title="Commits ahead of remote">
                    <ArrowUp className="w-3.5 h-3.5 text-gray-400" />
                    {gitStatus.ahead || 0} ahead
                  </span>
                  <span className="inline-flex items-center gap-1.5" title="Commits behind remote">
                    <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
                    {gitStatus.behind || 0} behind
                  </span>
                  <span className="inline-flex items-center gap-1.5" title="Modified and new files">
                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    {uncommitted} changed
                  </span>
                </div>
              </div>
            </Panel>
          )}

          {/* What's new */}
          <Panel title="What's new">
            {updates.length === 0 ? (
              <div
                className={`${SURFACE} rounded-2xl px-6 py-10 flex flex-col items-center text-center gap-2`}
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <Newspaper className="w-4 h-4" />
                </div>
                <strong className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Nothing new yet
                </strong>
                <span className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                  Release notes and updates will show up here.
                </span>
              </div>
            ) : (
              <div className={`${SURFACE} rounded-2xl flex flex-col divide-y divide-[#e4e4eb] dark:divide-[#1e2029]`}>
                {updates.map((update) => (
                  <article key={update.id} className="flex flex-col gap-1.5 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      {update.tag && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                          {update.tag}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        {update.date}
                      </span>
                    </div>
                    <strong className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {update.title}
                    </strong>
                    {update.summary && (
                      <p className="m-0 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        {update.summary}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-8">
          {/* Linked accounts */}
          <Panel
            title="Linked accounts"
            action={
              <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                {connectedCount} of 6 connected
              </span>
            }
          >
            <div
              className={`${SURFACE} rounded-2xl overflow-hidden flex flex-col divide-y divide-[#e4e4eb] dark:divide-[#1e2029]`}
            >
              <AccountRow
                logo={googleLogo}
                name="Google Workspace"
                detail={
                  googleConnected
                    ? googleEmail || 'Gmail, Calendar, Drive & Docs'
                    : 'Gmail, Calendar, Drive & Docs'
                }
                connected={googleConnected}
                onClick={!googleConnected && onConnectGoogle ? onConnectGoogle : goToIntegrations}
              />
              <AccountRow
                logo={whatsappLogo}
                name="WhatsApp"
                detail="Desktop bridge active (Auto-connected)"
                connected={true}
                onClick={goToIntegrations}
              />
              <AccountRow
                logo={currentMusic.logo}
                name={currentMusic.name}
                detail="Music streaming active (Ready)"
                connected={true}
                onClick={goToIntegrations}
              />
              <AccountRow
                logo={notionLogo}
                name="Notion"
                detail={
                  notionConnected
                    ? notionProfile?.workspaceName || 'Active workspace'
                    : 'Pages, databases, and tasks'
                }
                connected={notionConnected}
                onClick={goToIntegrations}
              />
              <AccountRow
                logo={obsidianLogo}
                name="Obsidian"
                detail={
                  obsidianConnected
                    ? `${obsidianVaultName || 'Vault'} (${obsidianNotesCount} notes)`
                    : 'Local markdown vault'
                }
                connected={obsidianConnected}
                onClick={goToIntegrations}
              />
              <AccountRow
                logo={githubLogo}
                logoClassName="transition-all dark:brightness-0 dark:invert"
                name="GitHub"
                detail={
                  githubConnected && githubProfile
                    ? `@${githubProfile.login}`
                    : 'Repositories and Git workspace'
                }
                connected={githubConnected}
                onClick={goToIntegrations}
              />
            </div>
          </Panel>

          {/* Current setup */}
          <Panel title="Current setup">
            <div className={`${SURFACE} rounded-2xl flex flex-col divide-y divide-[#e4e4eb] dark:divide-[#1e2029]`}>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Model</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {providerLabel}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Voice</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  Kokoro-82M, {voiceName(config.ttsVoice)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Spoken replies</span>
                <StatusPill on={spokenOn} onLabel="On" offLabel="Off" />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">Wake word</span>
                <StatusPill on={wakeWordOn} onLabel="On" offLabel="Off" />
              </div>
            </div>
          </Panel>

          {/* Try saying */}
          <Panel title="Try saying">
            <div className={`${SURFACE} rounded-2xl flex flex-col divide-y divide-[#e4e4eb] dark:divide-[#1e2029]`}>
              {prompts.map((item) => (
                <div
                  key={item.prompt}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    "{item.prompt}"
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {item.hint}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
});