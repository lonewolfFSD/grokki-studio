import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import { PinIcon } from '@animateicons/react/lucide/pin-icon';
import { PinOffIcon } from '@animateicons/react/lucide/pin-off-icon';
import { Pin, PinOff, Pencil, Trash2, Lock, Unlock, Archive, ArchiveRestore, MoreHorizontal, Check, ChevronRight, ListFilter, Search, Brain } from 'lucide-react';
import ChatSearchModal from './ChatSearchModal';
import { RefreshCwIcon } from '@animateicons/react/lucide/refresh-cw-icon';
import { LogOutIcon } from '@animateicons/react/lucide/log-out-icon';
import { CheckIcon } from '@animateicons/react/lucide/check-icon';
import { XIcon } from '@animateicons/react/lucide/x-icon';
import { ChevronDownIcon } from '@animateicons/react/lucide/chevron-down-icon';
import { PanelLeftIcon } from '@animateicons/react/lucide/panel-left-icon';
import { PanelLeftCloseIcon } from '@animateicons/react/lucide/panel-left-close-icon';
import { PanelLeftOpenIcon } from '@animateicons/react/lucide/panel-left-open-icon';
import { GoogleProfile, Conversation, StudioHotkeys } from '../types/jarvis';
import { SettingsSection } from './SettingsModal';
import BranchedMenu, { BranchedMenuItem } from './BranchedMenu';
import ShinyText from '../../effects/ShinyText';
import WarmTooltip, { WarmTooltipGroup, type WarmTooltipSide } from './WarmTooltip';
import { DEFAULT_HOTKEYS } from '../utils/hotkeys';
import grokkiLogo from '../assets/grokki_logo.png';
import grokkiWordmarkDark from '../assets/grokki_wordmark.png';
import grokkiWordmarkLight from '../assets/grokki_wordmark_light.png';

export type TabId = 'chat' | 'overview' | 'memory' | 'voice' | 'ai' | 'profile' | 'google' | 'appearance' | 'settings' | 'about';

const MIN_EXPANDED_WIDTH = 180;
const DEFAULT_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 300;
const COLLAPSED_SIDEBAR_WIDTH = 64;

type AnimatedIconComponent = React.ForwardRefExoticComponent<
  { size?: number; className?: string; color?: string; duration?: number; isAnimated?: boolean } & React.RefAttributes<IconHandle>
>;

const MemorySidebarIcon = React.forwardRef<IconHandle, { size?: number; className?: string }>((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    startAnimation: () => {},
    stopAnimation: () => {},
  }));
  return <Brain size={props.size ?? 16} className={props.className} />;
});

const AnimatedSidebarRow: React.FC<{
  Icon: AnimatedIconComponent;
  label: string;
  shortcut?: string;
  isActive: boolean;
  isCollapsed?: boolean;
  onClick: () => void;
  rightSlot?: React.ReactNode;
}> = ({ Icon, label, shortcut, isActive, isCollapsed = false, onClick, rightSlot }) => {
  const iconRef = useRef<IconHandle | null>(null);

  return (
    <WarmTooltip
      content={label}
      shortcut={shortcut}
      side="right"
      disabled={!isCollapsed && !shortcut}
      surfaceColor="#f5f5f5"
      inkColor="#18181b"
      size="md"
      radius={8}
      gap={8}
      arrow
      popDuration={160}
      popScale={0.94}
      popBlur={4}
      showFuse={false}
      className="w-full"
    >
      <div
        onClick={onClick}
        onMouseEnter={() => iconRef.current?.startAnimation()}
        onMouseLeave={() => iconRef.current?.stopAnimation()}
        className={`group flex items-center ${
          isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2'
        } w-full rounded-xl text-[13px] font-medium transition-all cursor-pointer text-left ${
          isActive
            ? 'bg-gray-100 dark:bg-[#1f1f24] text-gray-900 dark:text-gray-100 font-semibold shadow-xs'
            : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#18181c]'
        }`}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
          <Icon ref={iconRef} size={isCollapsed ? 20 : 16} className="flex-shrink-0" />
          {!isCollapsed && <span className="truncate">{label}</span>}
        </div>
        {!isCollapsed && rightSlot}
      </div>
    </WarmTooltip>
  );
};

const AnimatedIconButton: React.FC<{
  Icon: AnimatedIconComponent;
  iconSize?: number;
  title?: string;
  shortcut?: string;
  tooltipSide?: WarmTooltipSide;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  label?: string;
  iconClassName?: string;
}> = ({ Icon, iconSize = 14, title, shortcut, tooltipSide = 'right', onClick, className = '', label, iconClassName = '' }) => {
  const iconRef = useRef<IconHandle | null>(null);

  const button = (
    <button
      type="button"
      aria-label={title || label}
      onClick={onClick}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      className={className}
    >
      <Icon ref={iconRef} size={iconSize} className={iconClassName} />
      {label ? <span>{label}</span> : null}
    </button>
  );

  if (!title) return button;

  return (
    <WarmTooltip
      content={title}
      shortcut={shortcut}
      side={tooltipSide}
      surfaceColor="#f5f5f5"
      inkColor="#18181b"
      size="md"
      radius={8}
      gap={8}
      arrow
      popDuration={160}
      popScale={0.94}
      popBlur={4}
      showFuse={false}
    >
      {button}
    </WarmTooltip>
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
  hotkeys?: StudioHotkeys;
  conversations?: Conversation[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onCreateConversation?: () => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onTogglePinConversation?: (id: string) => void;
  onToggleArchiveConversation?: (id: string, forceState?: boolean) => void;
  unlockedConvoIds?: Set<string>;
  onOpenLockModal?: (convo: Conversation, mode: 'setup' | 'unlock' | 'remove') => void;
  onRelockConversation?: (id: string) => void;
  onSwitchGoogle?: () => Promise<void> | void;
  onDisconnectGoogle?: () => Promise<void> | void;
  onOpenSettings?: (section?: SettingsSection) => void;
  thinkingConvoIds?: Set<string>;
}

export const Sidebar = React.memo<SidebarProps>(({
  activeTab,
  onSelectTab,
  theme,
  userName,
  googleProfile,
  googleConnected = false,
  hotkeys,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  onToggleArchiveConversation,
  unlockedConvoIds,
  onOpenLockModal,
  onRelockConversation,
  onSwitchGoogle,
  onDisconnectGoogle,
  onOpenSettings,
  thinkingConvoIds,
}) => {
  const effectiveHotkeys: StudioHotkeys = { ...DEFAULT_HOTKEYS, ...(hotkeys || {}) };
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileChevronRef = useRef<IconHandle | null>(null);
  const openLogoIconRef = useRef<IconHandle | null>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleToggleSidebar = () => {
    setIsCollapsed((prev) => {
      if (prev) {
        setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
        return false;
      }
      return true;
    });
  };

  useEffect(() => {
    const onToggleEvent = () => handleToggleSidebar();
    window.addEventListener('grokki:toggle-sidebar', onToggleEvent);
    return () => window.removeEventListener('grokki:toggle-sidebar', onToggleEvent);
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    let rafId: number | null = null;
    let latestClientX = e.clientX;

    const onMouseMove = (moveEvent: MouseEvent) => {
      latestClientX = moveEvent.clientX;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (latestClientX < 130) {
            setIsCollapsed(true);
          } else {
            setIsCollapsed(false);
            const clamped = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_EXPANDED_WIDTH, latestClientX));
            setSidebarWidth(clamped);
          }
        });
      }
    };

    const onMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
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





  const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const isChatActive = activeTab === 'chat';

  type SortByOption = 'activity' | 'created' | 'name';
  type GroupByOption = 'none' | 'date' | 'unread' | 'state' | 'custom';

  const [sortBy, setSortBy] = useState<SortByOption>('activity');
  const [groupBy, setGroupBy] = useState<GroupByOption>('date');
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [archiveToast, setArchiveToast] = useState<{ id: string; title: string } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    if (!archiveToast) return;
    const timer = window.setTimeout(() => {
      setArchiveToast(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [archiveToast]);
  const [activeSubmenu, setActiveSubmenu] = useState<'sort' | 'group' | null>(null);

  const getGroupByLabel = () => {
    switch (groupBy) {
      case 'none': return 'None';
      case 'date': return 'Date';
      case 'unread': return 'Unread';
      case 'state': return 'State';
      case 'custom': return 'Custom groups';
      default: return 'None';
    }
  };

  const getSortByLabel = () => {
    switch (sortBy) {
      case 'activity': return 'Last activity';
      case 'created': return 'Date created';
      case 'name': return 'Name';
      default: return 'Last activity';
    }
  };

  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const filterSubmenuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const [convoMenu, setConvoMenu] = useState<{
    convo: Conversation;
    id: string;
    title: string;
    isPinned: boolean;
    isArchived: boolean;
    isLocked: boolean;
    top: number;
    left: number;
  } | null>(null);
  const convoMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!convoMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (convoMenuRef.current && !convoMenuRef.current.contains(target)) {
        setConvoMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConvoMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [convoMenu]);

  const renderConvoActions = useCallback((convo: Conversation) => {
    const isMenuOpen = convoMenu?.id === convo.id;
    return (
      <button
        type="button"
        data-menu-open={isMenuOpen ? 'true' : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (isMenuOpen) {
            setConvoMenu(null);
          } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setConvoMenu({
              convo,
              id: convo.id,
              title: convo.title || 'New Chat',
              isPinned: !!convo.isPinned,
              isArchived: !!convo.isArchived,
              isLocked: !!convo.isLocked,
              top: Math.min(window.innerHeight - 195, rect.bottom + 4),
              left: Math.max(12, rect.left),
            });
          }
        }}
        title="More options"
        aria-label="More options"
        className={`p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/[0.08] cursor-pointer border-none bg-transparent transition-colors flex items-center justify-center ${
          isMenuOpen ? 'text-gray-900 dark:text-white bg-gray-200 dark:bg-white/[0.08]' : ''
        }`}
      >
        <MoreHorizontal size={14} />
      </button>
    );
  }, [convoMenu?.id]);

  const handleToggleFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFilterOpen) {
      setIsFilterOpen(false);
      setActiveSubmenu(null);
    } else {
      if (filterBtnRef.current) {
        const rect = filterBtnRef.current.getBoundingClientRect();
        setMenuPos({
          top: rect.bottom + 4,
          left: Math.max(12, rect.right - 168),
        });
      }
      setIsFilterOpen(true);
      setActiveSubmenu(null);
    }
  };

  // Close filter popover on outside click or Escape
  useEffect(() => {
    if (!isFilterOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        filterMenuRef.current && !filterMenuRef.current.contains(target) &&
        filterSubmenuRef.current && !filterSubmenuRef.current.contains(target) &&
        filterBtnRef.current && !filterBtnRef.current.contains(target)
      ) {
        setIsFilterOpen(false);
        setActiveSubmenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFilterOpen(false);
        setActiveSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFilterOpen]);

  const sortedConversations = useMemo(() => {
    if (!conversations || conversations.length === 0) return [];

    const list = conversations.filter(
      (c) =>
        Array.isArray(c.messages) &&
        c.messages.length > 0 &&
        Boolean(c.isArchived) === showArchivedOnly
    );

    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === 'name') {
        const titleA = (a.title || 'New Chat').toLowerCase();
        const titleB = (b.title || 'New Chat').toLowerCase();
        return titleA.localeCompare(titleB);
      }

      if (sortBy === 'created') {
        const timeA = (typeof a.createdAt === 'number' && a.createdAt > 0)
          ? a.createdAt
          : (a.id.startsWith('c_') ? parseInt(a.id.split('_')[1], 36) : 0) || a.updatedAt || 0;
        const timeB = (typeof b.createdAt === 'number' && b.createdAt > 0)
          ? b.createdAt
          : (b.id.startsWith('c_') ? parseInt(b.id.split('_')[1], 36) : 0) || b.updatedAt || 0;
        return timeB - timeA;
      }

      // Default: 'activity' (Last activity)
      const timeA = a.updatedAt || ((typeof a.createdAt === 'number' && a.createdAt > 0) ? a.createdAt : 0) || (a.id.startsWith('c_') ? parseInt(a.id.split('_')[1], 36) : 0) || 0;
      const timeB = b.updatedAt || ((typeof b.createdAt === 'number' && b.createdAt > 0) ? b.createdAt : 0) || (b.id.startsWith('c_') ? parseInt(b.id.split('_')[1], 36) : 0) || 0;
      return timeB - timeA;
    });

    return list;
  }, [conversations, sortBy, showArchivedOnly]);

  const activeConvo = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  const isNewChatActive = activeTab === 'chat' && (!activeConvo || !activeConvo.messages || activeConvo.messages.length === 0);

  const renderConvoLabel = useCallback(
    (convo: Conversation) => {
      const isThinking = Boolean(thinkingConvoIds?.has(convo.id));
      const title = convo.title || 'New Chat';
      if (!isThinking) return title;
      return (
        <ShinyText
          text={title}
          color="#b5b5b5"
          shineColor="#ffffff"
          speed={2}
          shineWidth={40}
          softness={0.8}
          trigger="loop"
          delay={0}
          angle={120}
          bands={1}
          glow={0}
          direction="left"
          easing="smooth"
          yoyo={false}
          followPointer={false}
          pauseOnHover={false}
          disabled={false}
          className="font-inherit text-inherit tracking-inherit leading-inherit"
        />
      );
    },
    [thinkingConvoIds]
  );

  const dateBranchedItems: BranchedMenuItem[] = useMemo(() => {
    if (!sortedConversations || sortedConversations.length === 0) {
      return [];
    }

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 86400000;

    // If Group by is None, render flat list
    if (groupBy === 'none') {
      return [
        {
          label: 'Chats',
          headerClassName: 'group flex items-center justify-between w-full px-2.5 py-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors select-none cursor-pointer',
          children: sortedConversations.map((convo) => ({
            value: convo.id,
            label: renderConvoLabel(convo),
            icon: convo.isLocked ? (
              unlockedConvoIds?.has(convo.id) ? (
                <Unlock size={12} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
              ) : (
                <Lock size={12} className="text-gray-700 dark:text-white flex-shrink-0" />
              )
            ) : convo.isPinned ? (
              <Pin
                size={12}
                fill="currentColor"
                className="rotate-45 text-gray-700 dark:text-white flex-shrink-0"
              />
            ) : undefined,
            onDoubleClick: (e: React.MouseEvent) => handleStartRename(e, convo),
            actions: renderConvoActions(convo),
          })),
        },
      ];
    }

    const groupsMap = new Map<string, { label: string; timestamp: number; convos: Conversation[] }>();

    for (const convo of sortedConversations) {
      const createdTs = (typeof convo.createdAt === 'number' && convo.createdAt > 0)
        ? convo.createdAt
        : (convo.id.startsWith('c_') ? parseInt(convo.id.split('_')[1], 36) : 0) || convo.updatedAt || Date.now();

      const convoDate = new Date(createdTs);
      const dayMidnight = new Date(convoDate.getFullYear(), convoDate.getMonth(), convoDate.getDate()).getTime();

      let label: string;
      if (dayMidnight === todayMidnight) {
        label = 'Today';
      } else if (dayMidnight === yesterdayMidnight) {
        label = 'Yesterday';
      } else {
        const isSameYear = convoDate.getFullYear() === now.getFullYear();
        label = convoDate.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          ...(isSameYear ? {} : { year: 'numeric' }),
        });
      }

      const key = `date_${dayMidnight}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, { label, timestamp: dayMidnight, convos: [] });
      }
      groupsMap.get(key)!.convos.push(convo);
    }

    const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => b.timestamp - a.timestamp);

    return sortedGroups.map((group) => ({
      label: group.label,
      headerClassName: 'group flex items-center justify-between w-full px-2.5 py-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors select-none cursor-pointer',
      children: group.convos.map((convo) => ({
        value: convo.id,
        label: renderConvoLabel(convo),
        icon: convo.isLocked ? (
          unlockedConvoIds?.has(convo.id) ? (
            <Unlock size={12} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
          ) : (
            <Lock size={12} className="text-gray-700 dark:text-white flex-shrink-0" />
          )
        ) : convo.isPinned ? (
          <Pin
            size={12}
            fill="currentColor"
            className="rotate-45 text-gray-700 dark:text-white flex-shrink-0"
          />
        ) : undefined,
        onDoubleClick: (e: React.MouseEvent) => handleStartRename(e, convo),
        actions: renderConvoActions(convo),
      })),
    }));
  }, [sortedConversations, groupBy, renderConvoActions, unlockedConvoIds, renderConvoLabel]);

  const defaultOpenIndices = useMemo(
    () => dateBranchedItems.map((_, i) => i),
    [dateBranchedItems.length]
  );

  const effectiveWidth = isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth;

  return (
    <WarmTooltipGroup delay={400} warmWindow={300} travel={320} lean={0}>
      <aside
        style={{ width: `${effectiveWidth}px` }}
        className={`relative h-screen flex flex-col justify-between ${
          isCollapsed ? 'p-2.5' : 'p-3.5'
        } border-r border-[#e4e4eb] dark:border-[#1f1f22] bg-white dark:bg-[#111114] select-none flex-shrink-0 ${
          isResizing ? '' : 'transition-[width,padding] duration-200 ease-out'
        }`}
      >
        {/* Drag-to-Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
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
              <WarmTooltip
                content="Maximize sidebar"
                shortcut={effectiveHotkeys.toggleSidebar}
                side="right"
                surfaceColor="#f5f5f5"
                inkColor="#18181b"
                size="md"
                radius={8}
                gap={8}
                arrow
                popDuration={160}
                popScale={0.94}
                popBlur={4}
                showFuse={false}
              >
                <button
                  type="button"
                  aria-label="Maximize sidebar"
                  onClick={handleToggleSidebar}
                  onMouseEnter={() => openLogoIconRef.current?.startAnimation()}
                  onMouseLeave={() => openLogoIconRef.current?.stopAnimation()}
                  className="group/logo w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#18181c] transition-all cursor-pointer border-none bg-transparent"
                >
                  {/* Default: Grokki Studio Logo */}
                  <img
                    src={grokkiLogo}
                    alt="Grokki Studio"
                    className="group-hover/logo:hidden w-7 h-7 rounded-lg object-contain shadow-xs"
                  />
                  {/* On Hover: Maximize Sidebar Icon */}
                  <div className="hidden group-hover/logo:flex items-center justify-center text-gray-700 dark:text-gray-200">
                    <PanelLeftOpenIcon ref={openLogoIconRef} size={20} />
                  </div>
                </button>
              </WarmTooltip>
            </div>
          ) : (
          <div className="flex items-center justify-between px-1.5 pt-1 pb-1 gap-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={grokkiLogo}
                alt="Grokki Studio"
                className="w-6.5 h-6.5 rounded-lg object-contain shadow-xs flex-shrink-0"
              />
              <div className="flex items-center min-w-0">
                <img
                  src={grokkiWordmarkDark}
                  alt="Grokki Studio"
                  className="hidden dark:block h-9 w-auto max-w-[160px] object-contain select-none"
                />
                <img
                  src={grokkiWordmarkLight}
                  alt="Grokki Studio"
                  className="block dark:hidden h-9 w-auto max-w-[160px] object-contain select-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <AnimatedIconButton
                Icon={PanelLeftCloseIcon}
                iconSize={17}
                onClick={handleToggleSidebar}
                title="Minimize sidebar"
                shortcut={effectiveHotkeys.toggleSidebar}
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#18181c] transition-all cursor-pointer border-none bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Primary Navigation & Recents List */}
        <div className="flex flex-col gap-1 min-h-0 flex-1 overflow-y-auto no-scrollbar">
          {/* Top Actions: New Chat & Overview (Home) */}
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <AnimatedSidebarRow
              Icon={PlusIcon}
              label="New Chat"
              shortcut={effectiveHotkeys.newChat || 'Ctrl+N'}
              isActive={isNewChatActive}
              isCollapsed={isCollapsed}
              onClick={() => {
                onCreateConversation?.();
                onSelectTab('chat');
              }}
            />

            {/* Search Chats Row */}
            <WarmTooltip
              content="Search chats"
              shortcut="Ctrl+K"
              side="right"
              disabled={!isCollapsed}
              surfaceColor="#f5f5f5"
              inkColor="#18181b"
              size="md"
              radius={8}
              gap={8}
              arrow
              popDuration={160}
              popScale={0.94}
              popBlur={4}
              showFuse={false}
              className="w-full"
            >
              <div
                onClick={() => setIsSearchModalOpen(true)}
                className={`group flex items-center ${
                  isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2'
                } w-full rounded-xl text-[13px] font-medium transition-all cursor-pointer text-left ${
                  isSearchModalOpen
                    ? 'bg-gray-100 dark:bg-[#1f1f24] text-gray-900 dark:text-gray-100 font-semibold shadow-xs'
                    : 'bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#18181c]'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
                  <Search size={isCollapsed ? 20 : 16} className="flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">Search chats</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] px-1.5 py-0.5 rounded">
                    Ctrl+K
                  </span>
                )}
              </div>
            </WarmTooltip>

            <AnimatedSidebarRow
              Icon={HouseIcon}
              label="Home"
              isActive={activeTab === 'overview'}
              isCollapsed={isCollapsed}
              onClick={() => onSelectTab('overview')}
            />

            <AnimatedSidebarRow
              Icon={MemorySidebarIcon}
              label="Memory"
              isActive={activeTab === 'memory'}
              isCollapsed={isCollapsed}
              onClick={() => onSelectTab('memory')}
            />
          </div>

          {/* Sleek divider line under the overview button */}
          <div className="my-1.5 mx-1 border-t border-gray-200/80 dark:border-[#1f1f22] flex-shrink-0" />

          {/* Recents Header with Claude-style Sort & Group Filter Button */}
          {!isCollapsed && (
            <div className="flex items-center justify-between px-3 pt-0.5 pb-1 flex-shrink-0">
              <span className="text-[10.5px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase select-none">
                {showArchivedOnly ? 'Archived' : 'Recents'}
              </span>

              <button
                ref={filterBtnRef}
                type="button"
                onClick={handleToggleFilter}
                className={`p-1 rounded transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center ${
                  showArchivedOnly
                    ? 'text-blue-500 dark:text-blue-400 bg-blue-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                }`}
                title="Group, Sort, and Filter"
                aria-label="Group, Sort, and Filter"
              >
                <ListFilter
                  size={13}
                  className={
                    showArchivedOnly
                      ? 'text-blue-500 dark:text-blue-400'
                      : 'text-gray-400 hover:text-white transition-colors'
                  }
                />
              </button>
            </div>
          )}

          {/* Claude-style Context Popover Menus (Fixed to escape any parent overflow) */}
          {isFilterOpen && (
            <>
              {/* Primary Menu */}
              <div
                ref={filterMenuRef}
                style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
                className="fixed z-[9999] w-[176px] rounded-xl bg-[#222225] text-gray-200 border border-white/[0.09] shadow-2xl p-1 flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
              >
                {/* Group by option */}
                <div
                  onMouseEnter={() => setActiveSubmenu('group')}
                  onClick={() => setActiveSubmenu((prev) => (prev === 'group' ? null : 'group'))}
                  className={`h-[28px] px-2.5 rounded-lg text-[12.5px] cursor-pointer flex items-center justify-between transition-colors ${
                    activeSubmenu === 'group'
                      ? 'bg-white/[0.12] text-white font-medium'
                      : 'text-gray-200 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <span>Group by</span>
                  <div className="flex items-center gap-1 text-gray-400 text-[12px]">
                    <span>{getGroupByLabel()}</span>
                    <ChevronRight size={12} className="text-gray-400" />
                  </div>
                </div>

                {/* Sort by option */}
                <div
                  onMouseEnter={() => setActiveSubmenu('sort')}
                  onClick={() => setActiveSubmenu((prev) => (prev === 'sort' ? null : 'sort'))}
                  className={`h-[28px] px-2.5 rounded-lg text-[12.5px] cursor-pointer flex items-center justify-between transition-colors ${
                    activeSubmenu === 'sort'
                      ? 'bg-white/[0.12] text-white font-medium'
                      : 'text-gray-200 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <span>Sort by</span>
                  <div className="flex items-center gap-1 text-gray-400 text-[12px]">
                    <span>{getSortByLabel()}</span>
                    <ChevronRight size={12} className="text-gray-400" />
                  </div>
                </div>

                <div className="my-0.5 border-t border-white/[0.08]" />

                {/* Archived only boolean toggle */}
                <div
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={() => {
                    setShowArchivedOnly((prev) => !prev);
                    setIsFilterOpen(false);
                    setActiveSubmenu(null);
                  }}
                  className="h-[28px] px-2.5 rounded-lg text-[12.5px] text-gray-200 hover:bg-white/[0.08] hover:text-white cursor-pointer flex items-center justify-between transition-colors"
                >
                  <span>Archived only</span>
                  {showArchivedOnly && (
                    <Check size={14} strokeWidth={2.5} className="text-[#3b82f6]" />
                  )}
                </div>
              </div>

              {/* Submenu for Group By */}
              {activeSubmenu === 'group' && (
                <div
                  ref={filterSubmenuRef}
                  style={{
                    top: `${menuPos.top}px`,
                    left: `${menuPos.left + 172}px`,
                  }}
                  className="fixed z-[9999] w-[156px] rounded-xl bg-[#222225] text-gray-200 border border-white/[0.09] shadow-2xl p-1 flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
                >
                  {[
                    { id: 'date', label: 'Date' },
                    { id: 'unread', label: 'Unread' },
                    { id: 'state', label: 'State' },
                    { id: 'custom', label: 'Custom groups' },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setGroupBy(item.id as GroupByOption);
                        setIsFilterOpen(false);
                        setActiveSubmenu(null);
                      }}
                      className="h-[28px] px-2.5 rounded-lg text-[12.5px] text-gray-200 hover:bg-white/[0.08] hover:text-white cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <span>{item.label}</span>
                      {groupBy === item.id && (
                        <Check size={14} strokeWidth={2.5} className="text-[#3b82f6]" />
                      )}
                    </div>
                  ))}

                  <div className="my-1 border-t border-white/[0.08]" />

                  <div
                    onClick={() => {
                      setGroupBy('none');
                      setIsFilterOpen(false);
                      setActiveSubmenu(null);
                    }}
                    className="h-[28px] px-2.5 rounded-lg text-[12.5px] text-gray-200 hover:bg-white/[0.08] hover:text-white cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span>None</span>
                    {groupBy === 'none' && (
                      <Check size={14} strokeWidth={2.5} className="text-[#3b82f6]" />
                    )}
                  </div>
                </div>
              )}

              {/* Submenu for Sort By */}
              {activeSubmenu === 'sort' && (
                <div
                  ref={filterSubmenuRef}
                  style={{
                    top: `${menuPos.top + 28}px`,
                    left: `${menuPos.left + 172}px`,
                  }}
                  className="fixed z-[9999] w-[156px] rounded-xl bg-[#222225] text-gray-200 border border-white/[0.09] shadow-2xl p-1 flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
                >
                  {[
                    { id: 'name', label: 'Name' },
                    { id: 'created', label: 'Date created' },
                    { id: 'activity', label: 'Last activity' },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSortBy(item.id as SortByOption);
                        setIsFilterOpen(false);
                        setActiveSubmenu(null);
                      }}
                      className="h-[28px] px-2.5 rounded-lg text-[12.5px] text-gray-200 hover:bg-white/[0.08] hover:text-white cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <span>{item.label}</span>
                      {sortBy === item.id && (
                        <Check size={14} strokeWidth={2.5} className="text-[#3b82f6]" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Conversation Three-Dots Context Menu */}
          {convoMenu && (
            <div
              ref={convoMenuRef}
              onClick={(e) => e.stopPropagation()}
              style={{ top: `${convoMenu.top}px`, left: `${convoMenu.left}px` }}
              className="fixed z-[9999] w-[148px] rounded-xl bg-white dark:bg-[#222225] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/[0.09] shadow-2xl p-1 flex flex-col gap-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetId = convoMenu.id;
                  setConvoMenu(null);
                  onTogglePinConversation?.(targetId);
                }}
                className="h-[28px] px-2.5 rounded-lg text-[12px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors border-none bg-transparent w-full text-left"
              >
                {convoMenu.isPinned ? (
                  <PinOff size={13} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                ) : (
                  <Pin size={13} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                )}
                <span>{convoMenu.isPinned ? 'Unpin' : 'Pin'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  const target = { id: convoMenu.id, title: convoMenu.title };
                  setConvoMenu(null);
                  handleStartRename(e, target);
                }}
                className="h-[28px] px-2.5 rounded-lg text-[12px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors border-none bg-transparent w-full text-left"
              >
                <Pencil size={13} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span>Rename</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetId = convoMenu.id;
                  const targetTitle = convoMenu.title;
                  const wasArchived = convoMenu.isArchived;
                  setConvoMenu(null);
                  onToggleArchiveConversation?.(targetId, !wasArchived);
                  if (!wasArchived) {
                    setArchiveToast({ id: targetId, title: targetTitle });
                  }
                }}
                className="h-[28px] px-2.5 rounded-lg text-[12px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors border-none bg-transparent w-full text-left"
              >
                {convoMenu.isArchived ? (
                  <ArchiveRestore size={13} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                ) : (
                  <Archive size={13} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                )}
                <span>{convoMenu.isArchived ? 'Unarchive' : 'Archive'}</span>
              </button>

              {!convoMenu.isLocked ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetConvo = convoMenu.convo;
                    setConvoMenu(null);
                    onOpenLockModal?.(targetConvo, 'setup');
                  }}
                  className="h-[28px] px-2.5 rounded-lg text-[12px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors border-none bg-transparent w-full text-left"
                >
                  <Lock size={13} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span>Lock chat</span>
                </button>
              ) : (
                <>
                  {unlockedConvoIds?.has(convoMenu.id) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetId = convoMenu.id;
                        setConvoMenu(null);
                        onRelockConversation?.(targetId);
                      }}
                      className="h-[28px] px-2.5 rounded-lg text-[12px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors border-none bg-transparent w-full text-left"
                    >
                      <Lock size={13} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <span>Lock chat</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetConvo = convoMenu.convo;
                        setConvoMenu(null);
                        onOpenLockModal?.(targetConvo, 'unlock');
                      }}
                      className="h-[28px] px-2.5 rounded-lg text-[12px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors border-none bg-transparent w-full text-left"
                    >
                      <Unlock size={13} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      <span>Unlock chat</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetConvo = convoMenu.convo;
                      setConvoMenu(null);
                      onOpenLockModal?.(targetConvo, 'remove');
                    }}
                    className="h-[28px] px-2.5 rounded-lg text-[12px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors border-none bg-transparent w-full text-left"
                  >
                    <Unlock size={13} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <span>Remove lock</span>
                  </button>
                </>
              )}

              <div className="my-0.5 border-t border-gray-200 dark:border-white/[0.08]" />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const targetId = convoMenu.id;
                  setConvoMenu(null);
                  onDeleteConversation?.(targetId);
                }}
                className="h-[28px] px-2.5 rounded-lg text-[12px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer flex items-center gap-2.5 transition-colors border-none bg-transparent w-full text-left"
              >
                <Trash2 size={13} className="text-red-500 dark:text-red-400 flex-shrink-0" />
                <span>Delete</span>
              </button>
            </div>
          )}

          {/* Creation Date Grouped Chat List with Branch Lines */}
          {!isCollapsed ? (
            <div className="flex flex-col flex-1 min-h-0">
              {sortedConversations.length === 0 ? (
                <div className="px-3 py-6 text-center flex flex-col items-center gap-2">
                  <span className="text-[12px] text-gray-400 dark:text-gray-500">
                    {showArchivedOnly ? 'No archived chats' : 'No recent chats'}
                  </span>
                  {showArchivedOnly && (
                    <button
                      type="button"
                      onClick={() => setShowArchivedOnly(false)}
                      className="text-[11.5px] font-medium text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer p-0"
                    >
                      Show active chats
                    </button>
                  )}
                </div>
              ) : (
                <BranchedMenu
                  items={dateBranchedItems}
                  defaultOpen={defaultOpenIndices}
                  defaultActive={activeConversationId}
                  onSelect={(value) => {
                    if (value === 'new_chat') {
                      onCreateConversation?.();
                    } else {
                      onSelectConversation?.(value);
                    }
                    onSelectTab('chat');
                  }}
                  color={isDark ? '#e4e4e7' : '#1f2937'}
                  accentColor={isDark ? '#ffffff' : '#111827'}
                  lineColor={isDark ? '#3f3f46' : '#d4d4d8'}
                  width={Math.max(150, effectiveWidth - 28)}
                  rowHeight={30}
                  indent={34}
                  trunk={16}
                  radius={8}
                  lineWidth={1.5}
                  fontSize={12}
                  drawDuration={350}
                  foldDuration={250}
                  hideRail
                />
              )}
              {editingId && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 w-full px-2 py-1 mt-1 bg-gray-100 dark:bg-[#16161a] border border-blue-500/60 rounded-lg shadow-xs"
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
          ) : (
            <div className="flex flex-col gap-1 items-center flex-1 min-h-0 overflow-y-auto no-scrollbar">
              {sortedConversations.slice(0, 8).map((convo) => {
                const isConvoActive = activeTab === 'chat' && activeConversationId === convo.id;
                return (
                  <WarmTooltip
                    key={convo.id}
                    content={convo.title || 'Chat'}
                    side="right"
                    surfaceColor="#f5f5f5"
                    inkColor="#18181b"
                    size="md"
                    radius={8}
                    gap={8}
                    arrow
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectConversation?.(convo.id);
                        onSelectTab('chat');
                      }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border-none ${
                        isConvoActive
                          ? 'bg-gray-100 dark:bg-[#1f1f24] text-gray-900 dark:text-gray-100 font-semibold shadow-xs'
                          : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#18181c]'
                      }`}
                    >
                      {convo.isPinned ? (
                        <div className="relative flex items-center justify-center">
                          <Pin size={13} fill="currentColor" className="rotate-45 text-gray-700 dark:text-white" />
                          {thinkingConvoIds?.has(convo.id) && (
                            <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                          )}
                        </div>
                      ) : (
                        <div className="relative flex items-center justify-center">
                          <MessageSquareIcon size={15} />
                          {thinkingConvoIds?.has(convo.id) && (
                            <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                          )}
                        </div>
                      )}
                    </button>
                  </WarmTooltip>
                );
              })}
            </div>
          )}
        </div>


      </div>

      {/* Bottom Profile Card & Account Switcher Popover */}
      <div className="relative" ref={menuRef}>
        {/* Switch Account Popover Menu */}
        {accountMenuOpen && (
          <div
            className={`absolute bottom-full left-0 ${
              isCollapsed ? 'w-56' : 'right-0'
            } mb-2 p-1.5 bg-white dark:bg-[#16161a] border border-gray-300 dark:border-[#26262e] rounded-2xl z-50 flex flex-col gap-1 shadow-lg`}
          >
            {/* Account Info Header */}
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#1c1c22] border border-gray-100 dark:border-[#2a2a32] flex items-center gap-2.5">
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
                    onOpenSettings?.('google');
                  }
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#18181c] transition-all cursor-pointer border-none bg-transparent text-left"
              />

              <AnimatedIconButton
                Icon={SettingsIcon}
                iconSize={14}
                label="Settings"
                shortcut={effectiveHotkeys.openSettings || 'Ctrl+,'}
                iconClassName="text-gray-500"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onOpenSettings?.('settings');
                }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#18181c] transition-all cursor-pointer border-none bg-transparent text-left"
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
        <WarmTooltip
          content={isCollapsed ? `${userName} — Switch account` : 'Click to switch account'}
          side="right"
          disabled={accountMenuOpen}
          surfaceColor="#f5f5f5"
          inkColor="#18181b"
          size="md"
          radius={8}
          gap={8}
          arrow
          popDuration={160}
          popScale={0.94}
          popBlur={4}
          showFuse={false}
          className="w-full"
        >
          <div
            onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            onMouseEnter={() => profileChevronRef.current?.startAnimation()}
            onMouseLeave={() => profileChevronRef.current?.stopAnimation()}
            className={`w-full flex items-center ${
              isCollapsed
                ? 'justify-center p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1c1c22]'
                : 'justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-[#16161a] hover:bg-gray-100 dark:hover:bg-[#1c1c22] border border-gray-200 dark:border-[#222228] shadow-xs'
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
                  className={`mr-1 mt-2 transition-transform duration-200 ${
                    accountMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            )}
          </div>
        </WarmTooltip>
      </div>
    </aside>

    {/* Search Chats Modal */}
    <ChatSearchModal
      isOpen={isSearchModalOpen}
      onClose={() => setIsSearchModalOpen(false)}
      conversations={sortedConversations}
      activeConversationId={activeConversationId}
      onSelectConversation={onSelectConversation}
      onSelectTab={onSelectTab}
    />

    {/* Archive Chat Notification Toast */}
    {archiveToast && (
      <div className="fixed bottom-5 right-5 z-[10000] w-[320px] flex flex-col gap-3 p-3.5 rounded-xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] shadow-2xl text-gray-900 dark:text-gray-100 select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
        <div className="text-[12.5px] leading-relaxed text-gray-700 dark:text-gray-200">
          <span>Chat archived. Find it anytime in the Recents filter under </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-[#232329] border border-gray-200 dark:border-[#32323a] text-[11px] font-medium text-gray-800 dark:text-gray-200 align-baseline">
            <ListFilter size={11} />
            <span>Archived only</span>
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#27272a]">
          <button
            type="button"
            onClick={() => {
              onToggleArchiveConversation?.(archiveToast.id, false);
              setArchiveToast(null);
            }}
            className="h-7 px-3 rounded-lg text-[12px] font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity cursor-pointer border-none"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setArchiveToast(null)}
            className="h-7 px-3 rounded-lg text-[12px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-[#232329] transition-colors cursor-pointer border-none bg-transparent"
          >
            Dismiss
          </button>
        </div>
      </div>
    )}
    </WarmTooltipGroup>
  );
});
