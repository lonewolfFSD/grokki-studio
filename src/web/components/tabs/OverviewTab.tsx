import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Mic,
  Globe,
  Terminal,
  ArrowRight,
  MessageSquare,
  Sparkles,
  Command,
  FileText,
  Clock,
  Layers,
  Search,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { JarvisConfig, Conversation } from '../../types/jarvis';
import { TabId } from '../Sidebar';

interface OverviewTabProps {
  config: JarvisConfig;
  userName: string;
  onNavigateTab: (tab: TabId) => void;
  googleConnected: boolean;
  conversations?: Conversation[];
  onSelectConversation?: (id: string) => void;
  onCreateConversation?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  config,
  userName,
  onNavigateTab,
  googleConnected,
  conversations = [],
  onSelectConversation,
  onCreateConversation,
}) => {
  const [notionConnected, setNotionConnected] = useState(false);
  const [obsidianConnected, setObsidianConnected] = useState(false);
  const [obsidianVault, setObsidianVault] = useState<string | null>(null);

  useEffect(() => {
    if (window.jarvisAPI?.getNotionStatus) {
      window.jarvisAPI.getNotionStatus().then((res) => {
        if (res && res.connected) setNotionConnected(true);
      }).catch(() => {});
    }
    if (window.jarvisAPI?.getObsidianStatus) {
      window.jarvisAPI.getObsidianStatus().then((res) => {
        if (res && res.connected) {
          setObsidianConnected(true);
          setObsidianVault(res.vaultName || null);
        }
      }).catch(() => {});
    }
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const getActiveModelDisplay = () => {
    if (config.provider === 'gemini') {
      return {
        provider: 'Google Gemini',
        model: config.geminiModel || 'gemini-2.5-flash',
        mode: 'Multimodal Neural',
      };
    }
    if (config.provider === 'groq') {
      return {
        provider: 'Groq Cloud',
        model: config.groqModel || 'llama-3.3-70b-versatile',
        mode: 'LPU Ultra-Fast',
      };
    }
    if (config.provider === 'ollama') {
      return {
        provider: 'Ollama Local',
        model: config.ollamaModel || 'llama3.2',
        mode: '100% Offline Air-Gap',
      };
    }
    return {
      provider: 'OpenRouter',
      model: config.openrouterModel || 'openrouter/auto',
      mode: 'Multi-Model Pool',
    };
  };

  const engineInfo = getActiveModelDisplay();

  const handleStartChatWithPrompt = (prompt?: string) => {
    onCreateConversation?.();
    onNavigateTab('chat');
  };

  const handleSelectRecentChat = (id: string) => {
    onSelectConversation?.(id);
    onNavigateTab('chat');
  };

  const connectedWorkspacesCount =
    (googleConnected ? 1 : 0) + (notionConnected ? 1 : 0) + (obsidianConnected ? 1 : 0);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      {/* Top Welcome & Quick Action Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400 font-mono">
              System Standing By • {formattedDate}
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 m-0">
            {getGreeting()}, {userName || 'User'}
          </h2>

          <p className="text-xs text-gray-500 dark:text-gray-400 m-0 max-w-xl leading-relaxed">
            Grokki Studio is connected with native desktop automation, neural speech synthesis, and live multi-provider reasoning.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleStartChatWithPrompt()}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 transition-all cursor-pointer border-none shadow-xs flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('ai')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1c24] dark:hover:bg-[#252836] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#1e2029] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Engine</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Core Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
        {/* Metric 1: Intelligence Engine */}
        <div
          onClick={() => onNavigateTab('ai')}
          className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] hover:border-gray-400 dark:hover:border-gray-600 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Intelligence
            </span>
            <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-700 dark:text-gray-300">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {engineInfo.provider}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
              {engineInfo.model}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-[#1a1c24]">
            <span className="font-mono">{engineInfo.mode}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Metric 2: Neural Speech */}
        <div
          onClick={() => onNavigateTab('voice')}
          className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] hover:border-gray-400 dark:hover:border-gray-600 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Voice Synthesizer
            </span>
            <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-700 dark:text-gray-300">
              <Mic className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Kokoro-82M ONNX
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Voice: {config.ttsVoice || 'af_bella'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-[#1a1c24]">
            <span className="font-mono">24kHz Local Audio</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Metric 3: Workspace Integrations */}
        <div
          onClick={() => onNavigateTab('google')}
          className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] hover:border-gray-400 dark:hover:border-gray-600 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Workspaces
            </span>
            <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-700 dark:text-gray-300">
              <Globe className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {connectedWorkspacesCount > 0 ? `${connectedWorkspacesCount} Active` : 'Disconnected'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {googleConnected ? 'Google' : ''}
              {notionConnected ? (googleConnected ? ' • Notion' : 'Notion') : ''}
              {obsidianConnected ? (googleConnected || notionConnected ? ' • Obsidian' : 'Obsidian') : ''}
              {!googleConnected && !notionConnected && !obsidianConnected ? 'Gmail, Notion & Obsidian' : ''}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-[#1a1c24]">
            <span className="font-mono">Live Document Sync</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Metric 4: Summon Hotkey */}
        <div
          onClick={() => onNavigateTab('settings')}
          className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] hover:border-gray-400 dark:hover:border-gray-600 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Summon Hotkey
            </span>
            <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-700 dark:text-gray-300">
              <Command className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {config.hotkey || 'Alt+Q'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Pill Theme: {config.pillTheme || 'glass'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-[#1a1c24]">
            <span className="font-mono">Global Hotkey Guard</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Two-Column Section: Recent Conversations & Action Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full">
        {/* Left Column: Recent Chats (2 cols width) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider m-0">
                Recent Conversations
              </h3>
            </div>
            {conversations.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab('chat')}
                className="text-[11px] text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-colors"
              >
                <span>View all ({conversations.length})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-200 dark:border-[#1e2029] rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-400 mb-2.5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 m-0 mb-1">
                No active conversations yet
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 m-0 mb-3">
                Ask Grokki to automate desktop tasks, search documents, or draft emails.
              </p>
              <button
                type="button"
                onClick={() => handleStartChatWithPrompt()}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 cursor-pointer border-none transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start First Conversation</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {conversations.slice(0, 4).map((convo) => {
                const messageCount = convo.messages?.length || 0;
                const lastUpdated = convo.updatedAt
                  ? new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    }).format(new Date(convo.updatedAt))
                  : 'Recent';

                return (
                  <div
                    key={convo.id}
                    onClick={() => handleSelectRecentChat(convo.id)}
                    className="p-3 rounded-xl border border-gray-100 dark:border-[#1a1c24] hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/60 dark:bg-[#0c0d12]/60 hover:bg-white dark:hover:bg-[#14161f] transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {convo.title || 'Untitled Conversation'}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                          {messageCount} {messageCount === 1 ? 'turn' : 'turns'} • {lastUpdated}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Studio Shortcuts Cheatsheet */}
        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Command className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider m-0">
                Key Shortcuts
              </h3>
            </div>

            <div className="flex flex-col gap-2 pt-1 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#1a1c24]">
                <span className="text-gray-600 dark:text-gray-400">Summon Grokki</span>
                <kbd className="font-mono text-[10px] bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#202330] px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                  {config.hotkey || 'Alt + Q'}
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#1a1c24]">
                <span className="text-gray-600 dark:text-gray-400">New Conversation</span>
                <kbd className="font-mono text-[10px] bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#202330] px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                  Ctrl + N
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#1a1c24]">
                <span className="text-gray-600 dark:text-gray-400">Toggle Sidebar</span>
                <kbd className="font-mono text-[10px] bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#202330] px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                  Ctrl + B
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-[#1a1c24]">
                <span className="text-gray-600 dark:text-gray-400">Attach Document</span>
                <kbd className="font-mono text-[10px] bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#202330] px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                  Ctrl + K
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-gray-600 dark:text-gray-400">Toggle Light / Dark</span>
                <kbd className="font-mono text-[10px] bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#202330] px-2 py-0.5 rounded text-gray-800 dark:text-gray-200">
                  Ctrl + Shift + T
                </kbd>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#0c0d12] border border-gray-200/80 dark:border-[#1a1c24] flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gray-200 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 flex items-center justify-center font-mono text-xs flex-shrink-0">
              /
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
              Type <strong className="text-gray-900 dark:text-gray-100">/</strong> in the chat input to invoke autonomous slash commands.
            </div>
          </div>
        </div>
      </div>

      {/* Autonomous System Capabilities */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight uppercase m-0">
          Integrated Windows Capabilities
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full">
          <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4 flex flex-col gap-2 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              PowerShell OS Automation
            </strong>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
              Launch applications, manage local directory trees, inspect running processes, and automate repetitive tasks natively.
            </p>
          </div>

          <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4 flex flex-col gap-2 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Cross-App Knowledge Hub
            </strong>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
              Connect Google Drive, Gmail, Notion pages, and local Obsidian markdown vaults into a single unified context window.
            </p>
          </div>

          <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4 flex flex-col gap-2 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Air-Gap Local Fallback
            </strong>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
              Switch immediately to local Ollama inference and local Kokoro-82M ONNX voice when working completely offline or air-gapped.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
