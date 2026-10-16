import React, { useState } from 'react';
import { Sun, Moon, Minus, X, RefreshCw, RotateCcw, Check } from 'lucide-react';

interface HeaderProps {
  title: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onSearchClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  theme,
  onToggleTheme,
  onMinimize,
  onClose,
}) => {
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'ready' | 'up-to-date'>('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleCheckOrRestart = async (e: React.MouseEvent) => {
    // If update is ready, click triggers restart to update
    if (updateState === 'ready') {
      if (window.jarvisAPI?.restartAndInstallUpdate) {
        window.jarvisAPI.restartAndInstallUpdate(updateInfo);
      } else {
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
    setToastMsg('Checking GitHub releases...');

    try {
      let result: any = null;
      if (window.jarvisAPI?.checkForUpdates) {
        result = await window.jarvisAPI.checkForUpdates();
      } else {
        await new Promise((r) => setTimeout(r, 1200));
        result = { updateAvailable: false, message: 'Up to date (v2.5.0)' };
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
      setUpdateState('idle');
      setToastMsg(err.message || 'Check failed');
      setTimeout(() => setToastMsg(null), 3000);
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
            title={`Latest release ${updateInfo?.latestVersion || ''} is ready. Click to restart and update Grokki Studio.`}
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
            title={toastMsg || (updateState === 'up-to-date' ? 'Up to date (v2.5.0)' : 'Check for updates (GitHub releases)')}
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
