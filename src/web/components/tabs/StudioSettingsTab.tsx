import React, { useState } from 'react';
import {
  Monitor,
  Layout,
  Maximize2,
  Pin,
  Power,
  Sparkles,
  Zap,
  Keyboard,
  Volume2,
  RefreshCw,
  FolderOpen,
  Check,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Eye,
  Trash2,
} from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';

interface StudioSettingsTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
  onClearConversations?: () => void;
}

export const StudioSettingsTab: React.FC<StudioSettingsTabProps> = ({
  config,
  onChangeConfig,
  onClearConversations,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [clearedConfirm, setClearedConfirm] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenFolder = async () => {
    if (window.jarvisAPI?.openConfigFolder) {
      const res = await window.jarvisAPI.openConfigFolder();
      if (res?.success) {
        showToast('Opened Grokki data folder in Explorer');
      }
    } else {
      showToast('Config folder: %APPDATA%/grokki');
    }
  };

  const handleClearHistory = () => {
    if (!clearedConfirm) {
      setClearedConfirm(true);
      setTimeout(() => setClearedConfirm(false), 4000);
      return;
    }
    onClearConversations?.();
    setClearedConfirm(false);
    showToast('All local chat conversations cleared');
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-20 select-none">
      {/* Header Banner */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Grokki Studio Settings
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Configure window behavior, startup actions, close actions, and response engine options.
          </p>
        </div>
        {toastMsg && (
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-in fade-in duration-200">
            {toastMsg}
          </span>
        )}
      </div>

      {/* 1. Window Sizing & Display Mode */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
         
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Launch Window Mode
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Choose the default window state when Grokki Studio opens.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full">
          {/* Windowed */}
          <div
            onClick={() => onChangeConfig({ launchMode: 'windowed' })}
            className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border ${
              (config.launchMode || 'windowed') === 'windowed'
                ? 'border-gray-900 dark:border-white bg-gray-50/70 dark:bg-[#1b1e28] shadow-xs'
                : 'border-gray-200 dark:border-[#1e2029] bg-transparent hover:border-gray-400 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                
                Windowed
              </span>
              {(config.launchMode || 'windowed') === 'windowed' && (
                <Check className="w-3.5 h-3.5 text-black hidden" />
              )}
            </div>
            <p className="text-[10.5px] text-gray-500 dark:text-gray-400 m-0 leading-snug">
              Standard 980x700 floating studio layout.
            </p>
          </div>

          {/* Maximized */}
          <div
            onClick={() => onChangeConfig({ launchMode: 'maximized' })}
            className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border ${
              config.launchMode === 'maximized'
                ? 'border-gray-900 dark:border-white bg-gray-50/70 dark:bg-[#1b1e28] shadow-xs'
                : 'border-gray-200 dark:border-[#1e2029] bg-transparent hover:border-gray-400 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                
                Start Maximized
              </span>
              {config.launchMode === 'maximized' && (
                <Check className="w-3.5 h-3.5 text-black hidden" />
              )}
            </div>
            <p className="text-[10.5px] text-gray-500 dark:text-gray-400 m-0 leading-snug">
              Opens full screen with Windows taskbar visible.
            </p>
          </div>

          {/* Fullscreen */}
          <div
            onClick={() => onChangeConfig({ launchMode: 'fullscreen' })}
            className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border ${
              config.launchMode === 'fullscreen'
                ? 'border-gray-900 dark:border-white bg-gray-50/70 dark:bg-[#1b1e28] shadow-xs'
                : 'border-gray-200 dark:border-[#1e2029] bg-transparent hover:border-gray-400 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                
                Launch Fullscreen
              </span>
              {config.launchMode === 'fullscreen' && (
                <Check className="w-3.5 h-3.5 text-black hidden" />
              )}
            </div>
            <p className="text-[10.5px] text-gray-500 dark:text-gray-400 m-0 leading-snug">
              Immersive borderless fullscreen workstation mode.
            </p>
          </div>
        </div>

        {/* Always On Top Toggle */}
        <div className="pt-2 border-t border-gray-100 dark:border-[#1e2029]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Always on Top
              </strong>
              <span className="text-[10.5px] text-gray-500 dark:text-gray-400">
                Keep Grokki Studio pinned above other active windows while working.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChangeConfig({ alwaysOnTop: !config.alwaysOnTop })}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
              config.alwaysOnTop ? 'bg-black' : 'bg-gray-300 dark:bg-[#252836]'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                config.alwaysOnTop ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Window Close & Background Behavior */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Window Close Action (X Button)
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Control what happens when you click the Close button in the top right.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full">
          {/* Close to Tray */}
          <div
            onClick={() => onChangeConfig({ closeAction: 'tray' })}
            className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border ${
              (config.closeAction || 'tray') === 'tray'
                ? 'border-black bg-gray-100/20 dark:bg-gray-800/10 shadow-xs'
                : 'border-gray-200 dark:border-[#1e2029] bg-transparent hover:border-gray-400 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
               
                Close to Tray
              </span>
              {(config.closeAction || 'tray') === 'tray' && (
                <Check className="w-3.5 h-3.5 text-emerald-500 hidden" />
              )}
            </div>
            <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
              Recommended. Hides Studio into the system tray. Dynamic Island and Alt+Q stay instant.
            </p>
          </div>

          {/* Minimize to Taskbar */}
          <div
            onClick={() => onChangeConfig({ closeAction: 'minimize' })}
            className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border ${
              config.closeAction === 'minimize'
                ? 'border-gray-900 dark:border-white bg-gray-50/70 dark:bg-[#1b1e28] shadow-xs'
                : 'border-gray-200 dark:border-[#1e2029] bg-transparent hover:border-gray-400 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                Minimize to Taskbar
              </span>
              {config.closeAction === 'minimize' && (
                <Check className="w-3.5 h-3.5 text-blue-500 hidden" />
              )}
            </div>
            <p className="text-[10.5px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
              Minimizes Studio down to the Windows taskbar.
            </p>
          </div>

          {/* Quit Application */}
          <div
            onClick={() => onChangeConfig({ closeAction: 'quit' })}
            className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border ${
              config.closeAction === 'quit'
                ? 'border-red-500/80 bg-red-50/30 dark:bg-red-950/20 shadow-xs'
                : 'border-gray-200 dark:border-[#1e2029] bg-transparent hover:border-gray-400 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                Quit Entirely
              </span>
              {config.closeAction === 'quit' && (
                <Check className="w-3.5 h-3.5 text-red-500 hidden" />
              )}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
              Completely exits Grokki Studio and shuts down background services.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Startup & Boot Automation */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Windows Startup & Launcher Behavior
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Customize how Grokki initializes on computer start and app launch.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 pt-1">
          {/* Launch on Windows Startup */}
          <div className="flex items-center justify-between">
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Launch on Windows Startup
              </strong>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Automatically start Grokki in the background when logging into Windows.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ launchOnStartup: !config.launchOnStartup })}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
                config.launchOnStartup ? 'bg-black' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.launchOnStartup ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto-Open Studio on Startup */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Auto-Open Studio Window on Startup
              </strong>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Open the full Grokki Studio window on Windows login instead of remaining in tray.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ autoOpenStudioOnStartup: !config.autoOpenStudioOnStartup })}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
                config.autoOpenStudioOnStartup ? 'bg-black' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.autoOpenStudioOnStartup ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Splash Screen */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Show Technical Splash Launcher
              </strong>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Show the small neural calibration startup screen with diagnostics on launch.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ showSplashScreen: config.showSplashScreen === false ? true : false })}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
                config.showSplashScreen !== false ? 'bg-black' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.showSplashScreen !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Dynamic Island on Boot */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Show Dynamic Island on Launch
              </strong>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Display the floating Dynamic Island immediately on launch (if disabled, only summons via Alt+Q or voice).
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ showIslandOnStartup: !config.showIslandOnStartup })}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
                config.showIslandOnStartup ? 'bg-black' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.showIslandOnStartup ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Chat & Streaming Experience */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Chat & Text Streaming Experience
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Configure per-word typing animations, key bindings, and audio feedback.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 pt-1">
          {/* Animated Fade In */}
          <div className="flex items-center justify-between">
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Word-by-Word Fade-in Animation
              </strong>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Animate Grokki's responses word-by-word with smooth opacity streaming.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ streamingAnimation: config.streamingAnimation === false ? true : false })}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
                config.streamingAnimation !== false ? 'bg-black' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.streamingAnimation !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Streaming Speed */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Typing Streaming Speed
              </strong>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Adjust how quickly words render on screen during AI generation.
              </span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 bg-gray-100 dark:bg-[#1a1c24] rounded-lg border border-gray-200 dark:border-[#1e2029]">
              {(['fast', 'normal', 'relaxed'] as const).map((spd) => {
                const isSelected = (config.streamingSpeed || 'fast') === spd;
                return (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => onChangeConfig({ streamingSpeed: spd })}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md capitalize cursor-pointer transition-all border-none ${
                      isSelected
                        ? 'bg-white dark:bg-[#252836] text-gray-900 dark:text-white shadow-xs font-bold'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent'
                    }`}
                  >
                    {spd}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Send on Enter */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
            <div className="flex items-center gap-4">
              <Keyboard className="w-5 h-5 text-gray-400" />
              <div>
                <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                  Send on Enter Key
                </strong>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Pressing Enter sends immediately (Shift+Enter inserts a new line).
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ sendOnEnter: config.sendOnEnter === false ? true : false })}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
                config.sendOnEnter !== false ? 'bg-black' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.sendOnEnter !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sound Effects */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-gray-400 ml-1" />
              <div>
                <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                  UI Sound Effects (SFX)
                </strong>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Subtle audio cues when commands finish, messages send, and tools execute.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ soundEffectsEnabled: config.soundEffectsEnabled === false ? true : false })}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
                config.soundEffectsEnabled !== false ? 'bg-black' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.soundEffectsEnabled !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Updates & Storage Utilities */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Updates & Local Storage
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Manage automatic update checks and local application data.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 pt-1">
          {/* Auto Check Updates */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              
              <div>
                <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                  Auto-Check for GitHub Releases
                </strong>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Periodically poll lonewolfFSD/grokki-studio releases for new versions.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ autoCheckUpdates: config.autoCheckUpdates === false ? true : false })}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
                config.autoCheckUpdates !== false ? 'bg-black' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.autoCheckUpdates !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Open App Directory & Clear Data */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Application Data Folder
              </strong>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Access configuration files, local logs, and cached model checkpoints.
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenFolder}
              className="h-8 px-3 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-gray-50 dark:bg-[#1a1c24] hover:bg-gray-100 dark:hover:bg-[#222530] text-gray-700 dark:text-gray-300 text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Open File Explorer
            </button>
          </div>

          {/* Clear Conversations History */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Reset Chat Conversations
              </strong>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Delete all conversation history threads from local storage.
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearHistory}
              className={`h-8 px-3 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                clearedConfirm
                  ? 'border-red-500 bg-red-500 text-white animate-pulse'
                  : 'border-red-200 dark:border-red-950/60 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearedConfirm ? 'Confirm Clear All?' : 'Clear Chat History'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
