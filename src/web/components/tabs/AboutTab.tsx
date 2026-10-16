import React from 'react';
import { Cpu, ShieldCheck, Headphones } from 'lucide-react';
import { SystemInfo } from '../../types/jarvis';

interface AboutTabProps {
  systemInfo: SystemInfo | null;
  hotkey: string;
}

export const AboutTab: React.FC<AboutTabProps> = ({ systemInfo, hotkey }) => {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            About Grokki Studio
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            System architecture, version telemetry, and runtime engine specifications.
          </p>
        </div>
        <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#1e2029] font-mono">
          v2.5.0
        </span>
      </div>

      {/* Hero Identity Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-2xl p-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-mono font-bold text-2xl shadow-xs">
            //
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 m-0">
              Grokki Studio Desktop
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-1.5">
              Autonomous Multimodal Operating System Assistant
            </p>
            
          </div>
        </div>

        <div className="text-right flex flex-col items-end gap-1">
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            Release 2026.10
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
            Build 2026.10.16
          </span>
        </div>
      </div>

      {/* Architecture & Specs Grid */}
      <div className="grid grid-cols-3 gap-4 w-full">
        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4.5 shadow-xs flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Core Runtime</span>
          </div>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-none p-0 m-0 font-mono">
            <li>Electron: <span className="text-gray-900 dark:text-gray-200">v44.7.2</span></li>
            <li>Chromium: <span className="text-gray-900 dark:text-gray-200">v132.0.6834</span></li>
            <li>Node.js: <span className="text-gray-900 dark:text-gray-200">v20.18.0</span></li>
          </ul>
        </div>

        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4.5 shadow-xs flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Headphones className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Audio Synthesis</span>
          </div>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-none p-0 m-0 font-mono">
            <li>Model: <span className="text-gray-900 dark:text-gray-200">Kokoro-82M ONNX</span></li>
            <li>Sample Rate: <span className="text-gray-900 dark:text-gray-200">24,000 Hz</span></li>
            <li>Latency: <span className="text-gray-900 dark:text-gray-200">Zero Cloud (Local)</span></li>
          </ul>
        </div>

        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-4.5 shadow-xs flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Privacy & Security</span>
          </div>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-none p-0 m-0 font-mono">
            <li>Telemetry: <span className="text-gray-900 dark:text-gray-200">Disabled (0%)</span></li>
            <li>Storage: <span className="text-gray-900 dark:text-gray-200">100% Local Disk</span></li>
            <li>Air-Gap: <span className="text-gray-900 dark:text-gray-200">Ollama Fallback</span></li>
          </ul>
        </div>
      </div>

      {/* Diagnostics & System Info */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-3">
        <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight uppercase">
          Host Machine Diagnostics
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 dark:text-gray-500 text-[11px]">Operating System</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
              {systemInfo ? `${systemInfo.platform === 'win32' ? 'Windows' : systemInfo.platform} (${systemInfo.arch})` : 'Windows x64'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 dark:text-gray-500 text-[11px]">Processor Model</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono truncate">
              {systemInfo?.cpuModel || 'CPU'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 dark:text-gray-500 text-[11px]">System Memory</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
              {systemInfo ? `${systemInfo.freeMemGb} GB free / ${systemInfo.totalMemGb} GB` : '8.0 GB RAM'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 dark:text-gray-500 text-[11px]">Summon Hotkey</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
              {hotkey} Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
