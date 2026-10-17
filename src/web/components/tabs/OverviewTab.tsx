import React from 'react';
import { Eye, Activity, ShieldCheck, Terminal, Mic, Headphones } from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';
import { TabId } from '../Sidebar';

interface OverviewTabProps {
  config: JarvisConfig;
  userName: string;
  onNavigateTab: (tab: TabId) => void;
  googleConnected: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  config,
  userName,
  onNavigateTab,
  googleConnected,
}) => {
  const providerLabel = {
    gemini: 'Gemini 3.5 Flash',
    groq: 'Groq (openai/gpt-oss-120b)',
    ollama: 'Ollama (Offline Air-Gap)',
    openrouter: 'OpenRouter Multi-Model',
  }[config.provider] || config.provider;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      {/* Hero Welcome Banner */}
      <div className="card bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-2xl p-6 shadow-xs flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-500 dark:text-gray-400">
              System Ready
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 m-0">
            Welcome back, {userName}!
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
            Grokki Studio is loaded with native Windows automation and multimodal neural intelligence.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 w-full">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4 flex flex-col gap-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Active Model</span>
            <Activity className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
            {providerLabel}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">Multimodal Core</span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4 flex flex-col gap-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Neural Voice</span>
            <Mic className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Kokoro-82M ({config.ttsVoice || 'Bella'})
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">24kHz Local ONNX</span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4 flex flex-col gap-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Google Workspace</span>
            <ShieldCheck className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {googleConnected ? 'Connected ✓' : 'Not Linked'}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">Gmail, Drive, Docs</span>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4 flex flex-col gap-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Summon Hotkey</span>
            <Terminal className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
            {config.hotkey || 'Alt+Q'}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">Dynamic Island</span>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight uppercase">
          Autonomous Windows Capabilities
        </h3>
        <div className="grid grid-cols-3 gap-4 w-full">
          <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4 flex flex-col gap-2 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 flex items-center justify-center text-sm">
              <Eye className="w-4 h-4" />
            </div>
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Desktop Vision & OCR
            </strong>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
              Analyzes screen captures, documents, and code windows in real time to assist you.
            </p>
          </div>

          <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4 flex flex-col gap-2 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 flex items-center justify-center text-sm">
              <Terminal className="w-4 h-4" />
            </div>
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Native PowerShell Automation
            </strong>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
              Controls media playback, launches apps, and manages files without cloud roundtrips.
            </p>
          </div>

          <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4 flex flex-col gap-2 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 flex items-center justify-center text-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Offline Air-Gap Fallback
            </strong>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
              Routes queries to Ollama and local Kokoro-82M synthesizer if disconnected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
