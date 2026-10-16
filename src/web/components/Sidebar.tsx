import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Mic,
  Cpu,
  Sliders,
  Globe,
  Palette,
  Info,
  User,
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { GoogleProfile, Conversation } from '../types/jarvis';

export type TabId = 'chat' | 'overview' | 'voice' | 'ai' | 'profile' | 'google' | 'appearance' | 'about';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  userName: string;
  googleProfile: GoogleProfile | null;
  googleConnected?: boolean;
  hotkey?: string;
  conversations?: Conversation[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onCreateConversation?: () => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onSwitchGoogle?: () => Promise<void> | void;
  onDisconnectGoogle?: () => Promise<void> | void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userName,
  googleProfile,
  googleConnected = false,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onRenameConversation,
  onSwitchGoogle,
  onDisconnectGoogle,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleStartRename = (e: React.MouseEvent, convo: { id: string; title: string }) => {
    e.stopPropagation();
    setEditingId(convo.id);
    setEditTitle(convo.title || '');
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation?.(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
  };

  // Fixed random gradient avatar for this account
  const accountKey = (googleProfile?.email || userName || 'local_user').trim().toLowerCase();
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (googleProfile?.picture) {
      setAvatarUrl(googleProfile.picture);
      setImgError(false);
      return;
    }

    const storageKey = `grokki_avatar_${accountKey}`;
    let saved = localStorage.getItem(storageKey);
    if (!saved) {
      const randomSeed = `${accountKey}_${Math.random().toString(36).substring(2, 9)}`;
      saved = `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(randomSeed)}`;
      try {
        localStorage.setItem(storageKey, saved);
      } catch (e) {}
    }
    setAvatarUrl(saved);
    setImgError(false);
  }, [accountKey, googleProfile?.picture]);

  const getGradientClass = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'bg-gradient-to-tr from-violet-600 via-pink-600 to-rose-500',
      'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600',
      'bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-600',
      'bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600',
      'bg-gradient-to-tr from-fuchsia-600 via-purple-600 to-indigo-700',
      'bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500',
    ];
    return gradients[Math.abs(hash) % gradients.length];
  };

  const initial = (userName || 'U').trim().charAt(0).toUpperCase();

  // Close account menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

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

                {/* Sub-Navigation for Saved Conversations with Discord Thread Line */}
                {isChatItem && conversations && conversations.length > 0 && (
                  <div className="relative pl-6 pt-1 pb-1 flex flex-col space-y-0.5 max-h-52 overflow-y-auto">
                    {/* Continuous Vertical Thread Spine Line */}
                    <div className="absolute left-[18px] top-0 bottom-3 w-[1.5px] bg-gray-200 dark:bg-[#202330] pointer-events-none" />

                    {conversations.map((convo) => {
                      const isConvoActive = activeTab === 'chat' && activeConversationId === convo.id;
                      return (
                        <div
                          key={convo.id}
                          onClick={() => {
                            onSelectConversation?.(convo.id);
                            onSelectTab('chat');
                          }}
                          className={`group relative flex items-center justify-between pl-3 pr-2 py-1.5 rounded-lg text-[12px] transition-all cursor-pointer ${
                            isConvoActive
                              ? 'bg-gray-200/80 dark:bg-[#202330] text-gray-900 dark:text-gray-100 font-medium shadow-xs'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-[#14161f]'
                          }`}
                        >
                          {/* Discord Curved Thread Branch Connector */}
                          <div className="absolute -left-[6px] top-1/2 -translate-y-1/2 w-2 h-2.5 border-b-[1.5px] border-l-[1.5px] border-gray-200 dark:border-[#202330] rounded-bl-md pointer-events-none" />

                          {editingId === convo.id ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 w-full min-w-0"
                            >
                              <input
                                type="text"
                                autoFocus
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveRename(convo.id);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelRename();
                                  }
                                }}
                                className="w-full text-[12px] bg-white dark:bg-[#14161f] border border-blue-500/60 rounded px-1.5 py-0.5 text-gray-900 dark:text-gray-100 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(convo.id)}
                                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#2a2d3d] text-emerald-500 hover:text-emerald-400 cursor-pointer border-none bg-transparent flex-shrink-0"
                                title="Save title"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelRename}
                                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#2a2d3d] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer border-none bg-transparent flex-shrink-0"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span
                                onDoubleClick={(e) => handleStartRename(e, convo)}
                                className="truncate pr-1 flex-1 select-none font-sans"
                                title={`${convo.title || 'New Chat'} (Double-click to rename)`}
                              >
                                {convo.title || 'New Chat'}
                              </span>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleStartRename(e, convo)}
                                  title="Rename conversation"
                                  className="p-0.5 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2a2d3d] cursor-pointer border-none bg-transparent"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteConversation?.(convo.id);
                                  }}
                                  title="Delete conversation"
                                  className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-[#2a2d3d] cursor-pointer border-none bg-transparent"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Pinned Section */}
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

      {/* Bottom Profile Card & Account Switcher Popover */}
      <div className="relative" ref={menuRef}>
        {/* Switch Account Popover Menu */}
        {accountMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 p-1.5 bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-2xl shadow-xl z-50 flex flex-col gap-1">
            {/* Account Info Header */}
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#181a22] border border-gray-100 dark:border-[#202330] flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 overflow-hidden shadow-xs relative">
                {avatarUrl && !imgError ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${getGradientClass(accountKey)} font-mono text-xs font-bold text-white rounded-lg`}>
                    {initial}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {userName}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {googleProfile?.email || 'Local Desktop Profile'}
                </div>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="flex flex-col gap-0.5 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setAccountMenuOpen(false);
                  if (onSwitchGoogle) {
                    await onSwitchGoogle();
                  } else {
                    onSelectTab('google');
                  }
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border-none bg-transparent text-left"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                <span>Switch Account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onSelectTab('google');
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border-none bg-transparent text-left"
              >
                <Globe className="w-3.5 h-3.5 text-gray-500" />
                <span>Workspace Settings</span>
              </button>

              {googleConnected && (
                <button
                  type="button"
                  onClick={async () => {
                    setAccountMenuOpen(false);
                    if (onDisconnectGoogle) {
                      await onDisconnectGoogle();
                    }
                  }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer border-none bg-transparent text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span>Disconnect Account</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Profile Card (No Alt+Q, No email address, clickable to switch account) */}
        <div
          onClick={() => setAccountMenuOpen(!accountMenuOpen)}
          title="Click to switch account"
          className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#13141a] hover:bg-gray-100 dark:hover:bg-[#181a22] border border-gray-200 dark:border-[#1e2029] transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 overflow-hidden shadow-xs relative">
              {avatarUrl && !imgError ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${getGradientClass(accountKey)} font-mono text-xs font-bold text-white rounded-lg`}>
                  {initial}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                {userName}
              </div>
            </div>
          </div>

          <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5">
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                accountMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
