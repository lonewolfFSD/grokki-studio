import React from 'react';
import { Home, Mic, Cpu, Sliders, Globe, Palette, Info, User, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { GoogleProfile, Conversation } from '../types/jarvis';

export type TabId = 'chat' | 'overview' | 'voice' | 'ai' | 'profile' | 'google' | 'appearance' | 'about';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  userName: string;
  googleProfile: GoogleProfile | null;
  hotkey: string;
  conversations?: Conversation[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onCreateConversation?: () => void;
  onDeleteConversation?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userName,
  googleProfile,
  hotkey,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
}) => {
  const primaryNavItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4 flex-shrink-0" /> },
    { id: 'overview', label: 'Home', icon: <Home className="w-4 h-4 flex-shrink-0" /> },
    { id: 'voice', label: 'Voices', icon: <Mic className="w-4 h-4 flex-shrink-0" /> },
    { id: 'ai', label: 'AI Brain', icon: <Cpu className="w-4 h-4 flex-shrink-0" /> },
    { id: 'google', label: 'Workspace', icon: <Globe className="w-4 h-4 flex-shrink-0" /> },
  ];

  const pinnedNavItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Personalization', icon: <Sliders className="w-4 h-4 flex-shrink-0" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4 flex-shrink-0" /> },
    { id: 'about', label: 'About', icon: <Info className="w-4 h-4 flex-shrink-0" /> },
  ];

  return (
    <aside className="w-60 h-screen flex flex-col justify-between p-3.5 border-r border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#08090d] select-none flex-shrink-0">
      <div className="flex flex-col gap-4 overflow-y-auto">
        {/* Grokki Studio Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-mono font-bold text-xs tracking-tighter shadow-xs">
              //
            </div>
            <span className="font-bold text-sm tracking-tight text-gray-900 dark:text-gray-100">
              Grokki Studio
            </span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] font-mono">
            v2.5
          </span>
        </div>

        {/* Primary Navigation Menu */}
        <nav className="flex flex-col gap-1">
          {primaryNavItems.map((item) => {
            const isActive = activeTab === item.id;
            const isChatItem = item.id === 'chat';

            return (
              <div key={item.id} className="flex flex-col">
                <div
                  onClick={() => onSelectTab(item.id)}
                  className={`group flex items-center justify-between w-full px-3 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 font-semibold shadow-xs'
                      : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#14161f]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </div>

                  {/* If Chat tab: Quick New Chat "+" button */}
                  {isChatItem && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateConversation?.();
                        onSelectTab('chat');
                      }}
                      title="New Conversation"
                      className="p-1 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#252836] transition-all cursor-pointer border-none bg-transparent"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sub-Navigation for Saved Conversations */}
                {isChatItem && conversations && conversations.length > 0 && (
                  <div className="flex flex-col pl-3 pt-1 pb-1 space-y-0.5 max-h-48 overflow-y-auto">
                    {conversations.map((convo) => {
                      const isConvoActive = activeTab === 'chat' && activeConversationId === convo.id;
                      return (
                        <div
                          key={convo.id}
                          onClick={() => {
                            onSelectConversation?.(convo.id);
                            onSelectTab('chat');
                          }}
                          className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-all cursor-pointer ${
                            isConvoActive
                              ? 'bg-gray-200/80 dark:bg-[#202330] text-gray-900 dark:text-gray-100 font-medium shadow-xs'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-[#14161f]'
                          }`}
                        >
                          <span className="truncate pr-1 flex-1 select-none font-sans">
                            {convo.title || 'New Chat'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation?.(convo.id);
                            }}
                            title="Delete conversation"
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-[#2a2d3d] transition-opacity cursor-pointer border-none bg-transparent flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Pinned Section (Exact ElevenLabs Styling) */}
        <div className="flex flex-col gap-0.5 pt-2 border-t border-gray-100 dark:border-[#1a1c24]">
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 px-3 py-1 tracking-wider uppercase select-none">
            Pinned
          </span>
          {pinnedNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer border-none text-left ${
                  isActive
                    ? 'bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 font-semibold shadow-xs'
                    : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#14161f]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
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
