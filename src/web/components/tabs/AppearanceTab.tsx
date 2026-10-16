import React from 'react';
import { JarvisConfig } from '../../types/jarvis';

interface AppearanceTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({ config, onChangeConfig }) => {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Appearance & System
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Customize desktop theme, startup behavior, and window close preferences.
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

      {/* Launch on Startup & System Behavior */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          System & Startup Settings
        </h3>

        {/* Launch on Windows Startup Toggle */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#1a1c24]">
          <div>
            <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
              Launch on Startup
            </strong>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Automatically launch Grokki in the background when Windows boots up.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChangeConfig({ launchOnStartup: !config.launchOnStartup })}
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer border-none p-0.5 ${
              config.launchOnStartup ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#252836]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white dark:bg-gray-900 shadow-sm transition-transform ${
                config.launchOnStartup ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Close Button Behavior: Minimize to Tray vs Direct Close */}
        <div className="flex flex-col gap-2.5">
          <div>
            <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
              Window Close Behavior
            </strong>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Choose what happens when you click the window close button (×) on Grokki Studio.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5 w-full pt-1">
            <div
              onClick={() => onChangeConfig({ closeAction: 'tray' })}
              className={`flex flex-col gap-1 p-4 rounded-xl cursor-pointer transition-all ${
                (config.closeAction || 'tray') === 'tray'
                  ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                  : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
              }`}
            >
              <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Minimize to System Tray
              </strong>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
                Keeps Grokki running in the system tray for instant hotkey summon.
              </p>
            </div>

            <div
              onClick={() => onChangeConfig({ closeAction: 'quit' })}
              className={`flex flex-col gap-1 p-4 rounded-xl cursor-pointer transition-all ${
                config.closeAction === 'quit'
                  ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                  : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
              }`}
            >
              <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Direct Application Close
              </strong>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
                Completely closes and exits the application when clicking (×).
              </p>
            </div>
          </div>
        </div>
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
};
