import React, { useState, useRef, useEffect } from 'react';
import { type IconHandle } from '@animateicons/react';
import { MessageSquareIcon } from '@animateicons/react/lucide/message-square-icon';
import { HouseIcon } from '@animateicons/react/lucide/house-icon';
import { MicIcon } from '@animateicons/react/lucide/mic-icon';
import { CpuIcon } from '@animateicons/react/lucide/cpu-icon';
import { GlobeIcon } from '@animateicons/react/lucide/globe-icon';
import { SettingsIcon } from '@animateicons/react/lucide/settings-icon';
import { SlidersHorizontalIcon } from '@animateicons/react/lucide/sliders-horizontal-icon';
import { PaletteIcon } from '@animateicons/react/lucide/palette-icon';
import { InfoIcon } from '@animateicons/react/lucide/info-icon';
import { PlusIcon } from '@animateicons/react/lucide/plus-icon';
import { PencilIcon } from '@animateicons/react/lucide/pencil-icon';
import { Trash2Icon } from '@animateicons/react/lucide/trash-2-icon';
import { RefreshCwIcon } from '@animateicons/react/lucide/refresh-cw-icon';
import { LogOutIcon } from '@animateicons/react/lucide/log-out-icon';
import { CheckIcon } from '@animateicons/react/lucide/check-icon';
import { XIcon } from '@animateicons/react/lucide/x-icon';
import { ChevronDownIcon } from '@animateicons/react/lucide/chevron-down-icon';
import { PanelLeftIcon } from '@animateicons/react/lucide/panel-left-icon';
import { PanelLeftCloseIcon } from '@animateicons/react/lucide/panel-left-close-icon';
import { PanelLeftOpenIcon } from '@animateicons/react/lucide/panel-left-open-icon';
import { GoogleProfile, Conversation } from '../types/jarvis';
import BranchedMenu, { BranchedMenuItem } from './BranchedMenu';

export type TabId = 'chat' | 'overview' | 'voice' | 'ai' | 'profile' | 'google' | 'appearance' | 'settings' | 'about';

const MIN_EXPANDED_WIDTH = 180;
const DEFAULT_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 300;
const COLLAPSED_SIDEBAR_WIDTH = 64;

type AnimatedIconComponent = React.ForwardRefExoticComponent<
  { size?: number; className?: string; color?: string; duration?: number; isAnimated?: boolean } & React.RefAttributes<IconHandle>
>;

const AnimatedSidebarRow: React.FC<{
  Icon: AnimatedIconComponent;
  label: string;
  isActive: boolean;
  isCollapsed?: boolean;
  onClick: () => void;
  rightSlot?: React.ReactNode;
}> = ({ Icon, label, isActive, isCollapsed = false, onClick, rightSlot }) => {
  const iconRef = useRef<IconHandle | null>(null);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      title={isCollapsed ? label : undefined}
      className={`group flex items-center ${
        isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2'
      } w-full rounded-xl text-[13px] font-medium transition-all cursor-pointer text-left ${
        isActive
          ? 'bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 font-semibold shadow-xs'
          : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#14161f]'
      }`}
    >
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
        <Icon ref={iconRef} size={16} className="flex-shrink-0" />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </div>
      {!isCollapsed && rightSlot}
    </div>
  );
};

const AnimatedIconButton: React.FC<{
  Icon: AnimatedIconComponent;
  iconSize?: number;
  title?: string;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  label?: string;
  iconClassName?: string;
}> = ({ Icon, iconSize = 14, title, onClick, className = '', label, iconClassName = '' }) => {
  const iconRef = useRef<IconHandle | null>(null);

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      className={className}
    >
      <Icon ref={iconRef} size={iconSize} className={iconClassName} />
      {label ? <span>{label}</span> : null}
    </button>
  );
};

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  theme?: 'light' | 'dark';
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
  theme,
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileChevronRef = useRef<IconHandle | null>(null);

  const handleToggleSidebar = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    } else {
      setIsCollapsed(true);
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = moveEvent.clientX;
      if (newWidth < 130) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
        const clamped = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_EXPANDED_WIDTH, newWidth));
        setSidebarWidth(clamped);
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

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

  const primaryNavItems: { id: TabId; label: string; Icon: AnimatedIconComponent }[] = [
    { id: 'chat', label: 'Chat', Icon: MessageSquareIcon },
    { id: 'overview', label: 'Home', Icon: HouseIcon },
    { id: 'voice', label: 'Voices', Icon: MicIcon },
    { id: 'ai', label: 'AI Brain', Icon: CpuIcon },
    { id: 'google', label: 'Workspace', Icon: GlobeIcon },
  ];

  const pinnedNavItems: { id: TabId; label: string; Icon: AnimatedIconComponent }[] = [
    { id: 'settings', label: 'Studio Settings', Icon: SettingsIcon },
    { id: 'profile', label: 'Personalization', Icon: SlidersHorizontalIcon },
    { id: 'appearance', label: 'Appearance', Icon: PaletteIcon },
    { id: 'about', label: 'About', Icon: InfoIcon },
  ];

  const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const isChatActive = activeTab === 'chat';

  const chatBranchedItems: BranchedMenuItem[] = [
    {
      label: 'Chat',
      icon: <MessageSquareIcon size={16} className="flex-shrink-0" />,
      headerClassName: `group flex items-center justify-between w-full px-3 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer text-left select-none ${
        isChatActive
          ? 'bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 font-semibold shadow-xs'
          : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#14161f]'
      }`,
      onHeaderClick: (isOpen, toggle) => {
        if (activeTab !== 'chat') {
          onSelectTab('chat');
          if (!isOpen) toggle();
        } else {
          toggle();
        }
      },
      rightSlot: (
        <AnimatedIconButton
          Icon={PlusIcon}
          iconSize={14}
          onClick={(e) => {
            e.stopPropagation();
            onCreateConversation?.();
            onSelectTab('chat');
          }}
          title="New Conversation"
          className="p-1 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#252836] transition-all cursor-pointer border-none bg-transparent"
        />
      ),
      children: conversations.length > 0 ? conversations.map((convo) => ({
        value: convo.id,
        label: convo.title || 'New Chat',
        icon: <MessageSquareIcon size={14} className="flex-shrink-0 opacity-80" />,
        onDoubleClick: (e: React.MouseEvent) => handleStartRename(e, convo),
        actions: (
          <>
            <AnimatedIconButton
              Icon={PencilIcon}
              iconSize={12}
              onClick={(e) => {
                e.stopPropagation();
                handleStartRename(e, convo);
              }}
              title="Rename conversation"
              className="p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2a2d3d] cursor-pointer border-none bg-transparent"
            />
            <AnimatedIconButton
              Icon={Trash2Icon}
              iconSize={12}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation?.(convo.id);
              }}
              title="Delete conversation"
              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-[#2a2d3d] cursor-pointer border-none bg-transparent"
            />
          </>
        ),
      })) : [
        {
          value: 'new_chat',
          label: 'New Chat',
          icon: <MessageSquareIcon size={14} className="flex-shrink-0 opacity-80" />
        }
      ],
    },
  ];

  const effectiveWidth = isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth;

  return (
    <aside
      style={{ width: `${effectiveWidth}px` }}
      className={`relative h-screen flex flex-col justify-between ${
        isCollapsed ? 'p-2.5' : 'p-3.5'
      } border-r border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#08090d] select-none flex-shrink-0 ${
        isResizing ? '' : 'transition-[width,padding] duration-200 ease-out'
      }`}
    >
      {/* Drag-to-Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        title="Drag to resize sidebar"
        className={`absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize z-30 transition-colors ${
          isResizing
            ? 'bg-blue-500/40'
            : 'hover:bg-gray-300/60 dark:hover:bg-white/10'
        }`}
      />

      <div className="flex flex-col gap-4 overflow-y-auto overflow-x-hidden">
        {/* Grokki Studio Brand Header + Minimize/Maximize Button */}
        {isCollapsed ? (
          <div className="flex flex-col items-center pt-1 pb-1">
            <AnimatedIconButton
              Icon={PanelLeftOpenIcon}
              iconSize={18}
              onClick={handleToggleSidebar}
              title="Maximize sidebar"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border-none bg-transparent"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between px-1.5 pt-1 pb-1 gap-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-mono font-bold text-xs tracking-tighter shadow-xs flex-shrink-0">
                //
              </div>
              <span className="font-bold text-sm tracking-tight text-gray-900 dark:text-gray-100 truncate">
                Grokki Studio
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <AnimatedIconButton
                Icon={PanelLeftCloseIcon}
                iconSize={17}
                onClick={handleToggleSidebar}
                title="Minimize sidebar"
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border-none bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Primary Navigation Menu */}
        <nav className="flex flex-col gap-1">
          {primaryNavItems.map((item) => {
            const isActive = activeTab === item.id;
            const isChatItem = item.id === 'chat';

            if (isChatItem && !isCollapsed) {
              return (
                <div key={item.id} className="flex flex-col">
                  <BranchedMenu
                    items={chatBranchedItems}
                    defaultOpen={[0]}
                    defaultActive={activeConversationId}
                    onSelect={(value) => {
                      if (value === 'new_chat') {
                        onCreateConversation?.();
                      } else {
                        onSelectConversation?.(value);
                      }
                      onSelectTab('chat');
                    }}
                    color={isDark ? '#f5f5f5' : '#1f2937'}
                    accentColor={isDark ? '#f5f5f5' : '#111827'}
                    lineColor={isDark ? '#3f3f46' : '#d4d4d8'}
                    width={Math.max(150, effectiveWidth - 28)}
                    rowHeight={32}
                    indent={40}
                    trunk={20}
                    radius={8}
                    lineWidth={1.5}
                    fontSize={12}
                    drawDuration={400}
                    foldDuration={300}
                    hideRail
                  />
                  {editingId && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 w-full px-2 py-1 mt-1 bg-gray-100 dark:bg-[#14161f] border border-blue-500/60 rounded-lg shadow-xs"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveRename(editingId);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            handleCancelRename();
                          }
                        }}
                        className="w-full text-[12px] bg-transparent text-gray-900 dark:text-gray-100 outline-none"
                      />
                      <AnimatedIconButton
                        Icon={CheckIcon}
                        iconSize={14}
                        onClick={() => handleSaveRename(editingId)}
                        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#2a2d3d] text-emerald-500 hover:text-emerald-400 cursor-pointer border-none bg-transparent flex-shrink-0"
                        title="Save title"
                      />
                      <AnimatedIconButton
                        Icon={XIcon}
                        iconSize={14}
                        onClick={handleCancelRename}
                        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#2a2d3d] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer border-none bg-transparent flex-shrink-0"
                        title="Cancel"
                      />
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={item.id} className="flex flex-col">
                <AnimatedSidebarRow
                  Icon={item.Icon}
                  label={item.label}
                  isActive={isActive}
                  isCollapsed={isCollapsed}
                  onClick={() => onSelectTab(item.id)}
                />
              </div>
            );
          })}
        </nav>

        {/* Pinned Section */}
        <div className="flex flex-col gap-0.5 pt-2 border-t border-gray-100 dark:border-[#1a1c24]">
          {!isCollapsed && (
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 px-3 py-1 tracking-wider uppercase select-none">
              Pinned
            </span>
          )}
          {pinnedNavItems.map((item) => (
            <AnimatedSidebarRow
              key={item.id}
              Icon={item.Icon}
              label={item.label}
              isActive={activeTab === item.id}
              isCollapsed={isCollapsed}
              onClick={() => onSelectTab(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Bottom Profile Card & Account Switcher Popover */}
      <div className="relative" ref={menuRef}>
        {/* Switch Account Popover Menu */}
        {accountMenuOpen && (
          <div
            className={`absolute bottom-full left-0 ${
              isCollapsed ? 'w-56' : 'right-0'
            } mb-2 p-1.5 bg-white dark:bg-[#13141a] border border-gray-300 dark:border-[#1e2029] rounded-2xl z-50 flex flex-col gap-1 shadow-lg`}
          >
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
              <AnimatedIconButton
                Icon={RefreshCwIcon}
                iconSize={14}
                label="Switch Account"
                iconClassName="text-gray-500"
                onClick={async () => {
                  setAccountMenuOpen(false);
                  if (onSwitchGoogle) {
                    await onSwitchGoogle();
                  } else {
                    onSelectTab('google');
                  }
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border-none bg-transparent text-left"
              />

              <AnimatedIconButton
                Icon={GlobeIcon}
                iconSize={14}
                label="Workspace Settings"
                iconClassName="text-gray-500"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onSelectTab('google');
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border-none bg-transparent text-left"
              />

              {googleConnected && (
                <AnimatedIconButton
                  Icon={LogOutIcon}
                  iconSize={14}
                  label="Disconnect Account"
                  iconClassName="text-red-500"
                  onClick={async () => {
                    setAccountMenuOpen(false);
                    if (onDisconnectGoogle) {
                      await onDisconnectGoogle();
                    }
                  }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer border-none bg-transparent text-left"
                />
              )}
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div
          onClick={() => setAccountMenuOpen(!accountMenuOpen)}
          onMouseEnter={() => profileChevronRef.current?.startAnimation()}
          onMouseLeave={() => profileChevronRef.current?.stopAnimation()}
          title={isCollapsed ? `${userName} — Click to switch account` : 'Click to switch account'}
          className={`flex items-center ${
            isCollapsed
              ? 'justify-center p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#181a22]'
              : 'justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#13141a] hover:bg-gray-100 dark:hover:bg-[#181a22] border border-gray-200 dark:border-[#1e2029] shadow-xs'
          } transition-all cursor-pointer`}
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
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {userName}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5">
              <ChevronDownIcon
                ref={profileChevronRef}
                size={18}
                className={`mr-1 mt-0.5 transition-transform duration-200 ${
                  accountMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
