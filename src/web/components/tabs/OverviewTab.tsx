import React from 'react';
import { Mic, Cpu, Link2, ArrowUpRight, Mail, HardDrive, FileText, Newspaper } from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';
import { TabId } from '../Sidebar';

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
  quickAccess?: QuickAccessItem[];
  googleEmail?: string;
  onConnectGoogle?: () => void;
}

// Quick access tiles. Match each `tab` to the matching TabId value in your Sidebar.
const DEFAULT_QUICK_ACCESS: QuickAccessItem[] = [
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
    id: 'accounts',
    label: 'Accounts',
    description: 'Link your Google account',
    icon: <Link2 className="w-4 h-4" />,
    tab: 'integrations',
  },
];

// Things Grokki can already do, shown as prompts to try.
const TRY_SAYING: { prompt: string; hint: string; needsGoogle?: boolean }[] = [
  { prompt: "What's on my screen?", hint: 'Screen vision' },
  { prompt: 'Pause the music', hint: 'Media control' },
  { prompt: 'Open my Downloads folder', hint: 'Files and apps' },
  { prompt: 'Summarize my latest emails', hint: 'Gmail', needsGoogle: true },
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

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md border border-gray-200 dark:border-[#2a2d3a] bg-gray-50 dark:bg-[#1a1c24] text-[11px] font-mono font-semibold text-gray-700 dark:text-gray-300 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
    {children}
  </kbd>
);

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="flex flex-col gap-3">
    <h3 className="m-0 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {title}
    </h3>
    {children}
  </section>
);

const StatusPill: React.FC<{ on: boolean; onLabel: string; offLabel: string }> = ({
  on,
  onLabel,
  offLabel,
}) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">
    <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
    {on ? onLabel : offLabel}
  </span>
);

export const OverviewTab: React.FC<OverviewTabProps> = ({
  config,
  userName,
  onNavigateTab,
  googleConnected,
  updates = [],
  quickAccess = DEFAULT_QUICK_ACCESS,
  googleEmail,
  onConnectGoogle,
}) => {
  const providerLabel =
    {
      gemini: 'Gemini 3.5 Flash',
      groq: 'Groq (openai/gpt-oss-120b)',
      ollama: 'Ollama (Offline Air-Gap)',
      openrouter: 'OpenRouter Multi-Model',
    }[config.provider] || config.provider;

  const hotkeyParts = (config.hotkey || 'Alt+Q').split('+').map((k) => k.trim());
  const wakeWordOn = config.wakeWordEnabled !== false;
  const spokenOn = config.ttsEnabled !== false;

  const runQuickAccess = (item: QuickAccessItem) => {
    if (item.onClick) item.onClick();
    else if (item.tab) onNavigateTab(item.tab as TabId);
  };

  const prompts = TRY_SAYING.filter((p) => !p.needsGoogle || googleConnected);

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full pb-16">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Ready
        </div>
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
              {quickAccess.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => runQuickAccess(item)}
                  className={`group relative flex flex-col items-start gap-3 p-4 rounded-2xl ${SURFACE} text-left cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-[#2c3040] hover:shadow-md`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-700 dark:text-gray-300">
                    {item.icon}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.description}
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 absolute top-4 right-4 text-gray-300 dark:text-gray-600 transition-colors group-hover:text-gray-900 dark:group-hover:text-white" />
                </button>
              ))}
            </div>
          </Panel>

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
          <Panel title="Linked accounts">
            <div className={`${SURFACE} rounded-2xl p-4 flex flex-col gap-4`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-700 dark:text-gray-300 flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <strong className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Google Workspace
                  </strong>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {googleConnected && googleEmail ? googleEmail : 'Gmail, Drive, Docs'}
                  </span>
                </div>
                <StatusPill on={googleConnected} onLabel="Connected" offLabel="Not linked" />
              </div>

              {googleConnected ? (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  {[
                    { icon: <Mail className="w-3 h-3" />, label: 'Gmail' },
                    { icon: <HardDrive className="w-3 h-3" />, label: 'Drive' },
                    { icon: <FileText className="w-3 h-3" />, label: 'Docs' },
                  ].map((service) => (
                    <span
                      key={service.label}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-[11px] font-medium"
                    >
                      {service.icon}
                      {service.label}
                    </span>
                  ))}
                </div>
              ) : onConnectGoogle ? (
                <button
                  type="button"
                  onClick={onConnectGoogle}
                  className="h-9 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold cursor-pointer border-none transition-all hover:opacity-90"
                >
                  Connect Google
                </button>
              ) : (
                <p className="m-0 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Link your account in settings to let Grokki use Gmail, Drive, and Docs.
                </p>
              )}
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
};