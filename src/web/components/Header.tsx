import React from 'react';
import { Sun, Moon, Minus, X, Search, MessageSquare, ExternalLink, HelpCircle } from 'lucide-react';

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
  onSearchClick,
}) => {
  return (
    <header className="h-[52px] px-5 flex items-center justify-between border-b border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#08090d] flex-shrink-0 select-none">
      {/* Left: Window Drag Region & Current View Pill */}
      <div className="flex items-center gap-2.5 flex-1 h-full select-none" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
            {title}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] font-mono">
            Alpha
          </span>
        </div>
      </div>

      {/* Center: ElevenLabs Search Bar */}
      <div
        onClick={onSearchClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100/80 dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] text-gray-400 dark:text-gray-500 w-64 max-w-xs text-xs cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <Search className="w-3.5 h-3.5 text-gray-400" />
        <span className="flex-1 truncate text-xs text-gray-400">Search everything...</span>
        <kbd className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white dark:bg-[#1f212c] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#2d303e]">
          ⌘ K
        </kbd>
      </div>

      {/* Right: Actions & Window Controls */}
      <div className="flex items-center gap-2 flex-1 justify-end" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Feedback / Docs */}
        <button
          type="button"
          onClick={() => alert('Grokki Studio v2.5 — Local AI Multimodal System')}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer bg-transparent border-none"
        >
          Docs
        </button>

        {/* Light / Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="w-8 h-8 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] flex items-center justify-center transition-all cursor-pointer"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

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
