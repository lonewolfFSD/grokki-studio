import React from 'react';
import { JarvisConfig } from '../../types/jarvis';

interface AppearanceTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
}

export const AppearanceTab = React.memo<AppearanceTabProps>(({ config, onChangeConfig }) => {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Appearance & Hotkey
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Customize your desktop theme and global hotkey.
        </p>
      </div>

      {/* Studio Theme */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          Studio Theme
        </h3>
        <div className="grid grid-cols-2 gap-3.5 w-full">
          <div
            onClick={() => onChangeConfig({ dashboardTheme: 'light' })}
            className={`flex flex-col gap-1 p-4 rounded-xl cursor-pointer transition-all ${
              (config.dashboardTheme || 'light') === 'light'
                ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
            }`}
          >
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Clean Light (Default)
            </strong>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
              High-contrast studio paper aesthetic.
            </p>
          </div>

          <div
            onClick={() => onChangeConfig({ dashboardTheme: 'dark' })}
            className={`flex flex-col gap-1 p-4 rounded-xl cursor-pointer transition-all ${
              config.dashboardTheme === 'dark'
                ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
            }`}
          >
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Midnight Obsidian
            </strong>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
              Pure dark mode for night workflows.
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Island Style */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          Dynamic Island Style
        </h3>
        <div className="grid grid-cols-2 gap-3.5 w-full">
          <div
            onClick={() => onChangeConfig({ pillTheme: 'glass' })}
            className={`flex flex-col gap-1 p-4 rounded-xl cursor-pointer transition-all ${
              (config.pillTheme || 'glass') === 'glass'
                ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
            }`}
          >
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Liquid Glass
            </strong>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
              Specular glass sheen with dynamic backdrop blur.
            </p>
          </div>

          <div
            onClick={() => onChangeConfig({ pillTheme: 'original' })}
            className={`flex flex-col gap-1 p-4 rounded-xl cursor-pointer transition-all ${
              config.pillTheme === 'original'
                ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
            }`}
          >
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Obsidian Pitch Black
            </strong>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
              Minimalist pure black Dynamic Island bar.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Background Effect */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl px-5 py-4 flex items-center justify-between shadow-xs">
        <div>
          <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
            Chat Background Gradient
          </strong>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Ambient WebGL wave gradient animation in the Chat canvas. Turn off for a clean, flat surface.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={config.chatBackgroundGradient !== false}
          onClick={() => onChangeConfig({ chatBackgroundGradient: config.chatBackgroundGradient === false })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
            config.chatBackgroundGradient !== false ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-200 ${
              config.chatBackgroundGradient !== false ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Hotkey Configuration */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl px-5 py-4 flex items-center justify-between shadow-xs">
        <div>
          <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
            Global Summon Hotkey
          </strong>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Toggles Grokki Dynamic Island from anywhere in Windows.
          </span>
        </div>
        <input
          type="text"
          value={config.hotkey || 'Alt+Q'}
          onChange={(e) => onChangeConfig({ hotkey: e.target.value })}
          className="w-28 text-center font-mono font-semibold h-9 px-3 rounded-lg text-xs bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
        />
      </div>
    </div>
  );
});
