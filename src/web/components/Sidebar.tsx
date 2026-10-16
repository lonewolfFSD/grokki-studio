import React from 'react';
import { Home, Mic, Cpu, Sliders, Globe, Palette, Info, User } from 'lucide-react';
import { GoogleProfile } from '../types/jarvis';

export type TabId = 'overview' | 'voice' | 'ai' | 'profile' | 'google' | 'appearance' | 'about';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  userName: string;
  googleProfile: GoogleProfile | null;
  hotkey: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userName,
  googleProfile,
  hotkey,
}) => {
  const navItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Home className="w-4 h-4 flex-shrink-0" /> },
    { id: 'voice', label: 'Voice Models', icon: <Mic className="w-4 h-4 flex-shrink-0" /> },
    { id: 'ai', label: 'AI Brain & Keys', icon: <Cpu className="w-4 h-4 flex-shrink-0" /> },
    { id: 'profile', label: 'Personalization', icon: <Sliders className="w-4 h-4 flex-shrink-0" /> },
    { id: 'google', label: 'Google Workspace', icon: <Globe className="w-4 h-4 flex-shrink-0" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4 flex-shrink-0" /> },
    { id: 'about', label: 'About', icon: <Info className="w-4 h-4 flex-shrink-0" /> },
  ];

  return (
    <aside className="w-64 h-screen flex flex-col justify-between p-4 border-r border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#08090d] select-none flex-shrink-0">
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-mono font-bold text-xs tracking-tighter shadow-sm">
              [//]
            </div>
            <span className="font-bold text-sm tracking-tight text-gray-900 dark:text-gray-100">
              Grokki Studio
            </span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] font-mono">
            v2.5
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all cursor-pointer border-none text-left ${
                  isActive
                    ? 'bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 font-semibold shadow-xs'
                    : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#14161f]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Card */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 flex items-center justify-center text-xs flex-shrink-0 overflow-hidden">
            {googleProfile?.picture ? (
              <img
                src={googleProfile.picture}
                alt={userName}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
              {userName}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {googleProfile?.email ? googleProfile.email : 'Desktop Companion'}
            </div>
          </div>
        </div>
        <kbd className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-[#1e2029]">
          {hotkey}
        </kbd>
      </div>
    </aside>
  );
};
