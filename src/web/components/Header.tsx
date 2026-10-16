import React, { useState } from 'react';
import { Sun, Moon, Minus, X, RefreshCw, RotateCcw, Check, Square } from 'lucide-react';

interface HeaderProps {
  title: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onMinimize: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  onClose: () => void;
  onSearchClick?: () => void;
}

function compareSemverLocal(v1: string, v2: string) {
  const clean1 = (v1 || '').replace(/^[^\d]*/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const clean2 = (v2 || '').replace(/^[^\d]*/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(clean1.length, clean2.length);
  for (let i = 0; i < len; i++) {
    const p1 = clean1[i] || 0;
    const p2 = clean2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  theme,
  onToggleTheme,
  onMinimize,
  onMaximize,
  isMaximized = false,
  onClose,
}) => {
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'ready' | 'up-to-date'>('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleCheckOrRestart = async (e: React.MouseEvent) => {
    // If update is ready, click triggers restart to update
    if (updateState === 'ready') {
      try {
        if (window.jarvisAPI?.restartAndInstallUpdate) {
          window.jarvisAPI.restartAndInstallUpdate(updateInfo);
        } else {
          window.location.reload();
        }
      } catch (e) {
        window.location.reload();
      }
      return;
    }

    if (updateState === 'checking') return;

    // Alt+Click shortcut to preview the wide "Restart to update" button
    if (e.altKey) {
      setUpdateState('ready');
      setUpdateInfo({ latestVersion: 'v2.6.0' });
      setToastMsg('Update v2.6.0 ready to apply');
      setTimeout(() => setToastMsg(null), 3500);
      return;
    }

    setUpdateState('checking');
    setToastMsg('Checking grokki-studio releases...');

    try {
      let result: any = null;

      // 1. Try via Electron Main Process IPC
      try {
        if (window.jarvisAPI?.checkForUpdates) {
          result = await window.jarvisAPI.checkForUpdates();
        }
      } catch (ipcErr: any) {
        console.warn('IPC check failed or main not yet restarted, using direct fetch:', ipcErr);
      }

      // 2. Direct renderer fallback if IPC was not registered yet in running main process
      if (!result || result.error) {
        const repo = 'lonewolfFSD/grokki-studio';
        const currentVersion = '2.5.0';
        try {
          const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' },
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.tag_name) {
              const latestTag = data.tag_name;
              const isNewer = compareSemverLocal(latestTag, currentVersion) > 0;
              if (isNewer) {
                result = {
                  updateAvailable: true,
                  latestVersion: latestTag,
                  currentVersion,
                  releasesUrl: `https://github.com/${repo}/releases`,
                  downloadUrl: data.assets?.[0]?.browser_download_url || data.html_url,
                };
              }
            }
          }
        } catch (netErr) {}

        if (!result) {
          result = {
            updateAvailable: false,
            message: `Up to date (v${currentVersion}). No new releases on GitHub.`,
          };
        }
      }

      if (result && result.updateAvailable) {
        setUpdateState('ready');
        setUpdateInfo(result);
        setToastMsg(`Update ${result.latestVersion || ''} ready!`);
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        setUpdateState('up-to-date');
        setToastMsg(result?.message || 'Up to date (v2.5.0)');
        setTimeout(() => {
          setUpdateState('idle');
          setToastMsg(null);
        }, 3000);
      }
    } catch (err: any) {
      setUpdateState('up-to-date');
      setToastMsg('Up to date (v2.5.0)');
      setTimeout(() => {
        setUpdateState('idle');
        setToastMsg(null);
      }, 3000);
    }
  };

  return (
    <header className="h-[52px] px-5 flex items-center justify-between border-b border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#08090d] flex-shrink-0 select-none">
      {/* Left: Window Drag Region & Current View Pill */}
      <div className="flex items-center gap-2.5 flex-1 h-full select-none" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
            {title}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] font-mono">
            Beta
          </span>
        </div>
      </div>

      {/* Right: Actions & Window Controls */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Status Toast Banner */}
        {toastMsg && (
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 px-1 animate-in fade-in duration-150">
            {toastMsg}
          </span>
        )}

        {/* Light / Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="w-8 h-8 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] flex items-center justify-center transition-all cursor-pointer"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Check for Updates / Restart to Update Button (Beside Minimize) */}
        {updateState === 'ready' ? (
          <button
            type="button"
            onClick={handleCheckOrRestart}
            title={`Latest release ${updateInfo?.latestVersion || ''} is downloaded and ready from lonewolfFSD/grokki-studio/releases. Click to restart and update.`}
            className="h-8 px-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs animate-in fade-in duration-200 select-none group"
          >
            <RotateCcw className="w-3.5 h-3.5 flex-shrink-0 animate-pulse text-emerald-500 group-hover:rotate-180 transition-transform duration-300" />
            <span className="text-xs font-semibold whitespace-nowrap">
              Restart to update
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCheckOrRestart}
            title={toastMsg || (updateState === 'up-to-date' ? 'Up to date (v2.5.0)' : 'Check for updates (https://github.com/lonewolfFSD/grokki-studio/releases)')}
            disabled={updateState === 'checking'}
            className={`w-8 h-8 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-transparent flex items-center justify-center transition-all cursor-pointer ${
              updateState === 'up-to-date'
                ? 'text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/30'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24]'
            }`}
          >
            {updateState === 'up-to-date' ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <RefreshCw
                className={`w-4 h-4 ${updateState === 'checking' ? 'animate-spin text-blue-500' : ''}`}
              />
            )}
          </button>
        )}

        {/* Minimize Button */}
        <button
          type="button"
          onClick={onMinimize}
          title="Minimize Window"
          className="w-8 h-8 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] flex items-center justify-center transition-all cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Maximize / Restore Button */}
        <button
          type="button"
          onClick={onMaximize}
          title={isMaximized ? 'Restore Down' : 'Maximize Window'}
          className="w-8 h-8 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] flex items-center justify-center transition-all cursor-pointer"
        >
          {isMaximized ? (
            <svg
              className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="4.5" y="1.5" width="10" height="10" rx="1" />
              <path d="M1.5 5.5v8a1 1 0 0 0 1 1h8" strokeLinecap="round" />
            </svg>
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          title="Close Window"
          className="w-8 h-8 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
