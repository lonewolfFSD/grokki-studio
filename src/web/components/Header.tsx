import React from 'react';
import { Sun, Moon, Minus, X } from 'lucide-react';

interface HeaderProps {
  title: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  theme,
  onToggleTheme,
  onMinimize,
  onClose,
}) => {
  return (
    <header className="h-[52px] px-6 flex items-center justify-between border-b border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#08090d] flex-shrink-0 select-none">
      {/* Window Drag Title */}
      <div className="flex items-center gap-2.5 flex-1 h-full select-none cursor-default" style={{ WebkitAppRegion: 'drag' } as any}>
        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </span>
      </div>

      {/* Top Window Actions */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="w-8 h-8 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] flex items-center justify-center transition-all cursor-pointer"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Minimize Button */}
        <button
          onClick={onMinimize}
          title="Minimize Window"
          className="w-8 h-8 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] flex items-center justify-center transition-all cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Close Button */}
        <button
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
