import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Volume1,
  VolumeX,
  Mic,
  Camera,
  Moon,
  Lock,
  Radio,
  XOctagon,
  Settings,
  Folder,
  Code,
  Globe,
  Compass,
  MessageSquare,
  Activity,
  FileText,
  Calculator,
  Terminal,
  Headphones,
  Music,
  RefreshCw,
  FolderOpen,
  Check,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Eye,
  Trash2,
  AlertCircle,
  ChevronDown,
  Pencil,
  Plus,
  Search,
  AppWindow,
  X,
} from 'lucide-react';
import { JarvisConfig, StudioHotkeys, LeftHandGestureItem, InstalledAppItem } from '../../types/jarvis';
import grokkiLogo from '../../assets/grokki_icon.svg';
import {
  FaWhatsapp,
  FaChrome,
  FaEdge,
  FaCode,
  FaFolder,
  FaChartLine,
  FaFileLines,
  FaCalculator,
  FaTerminal,
  FaDiscord,
  FaSpotify,
  FaLock,
  FaCamera,
  FaVolumeXmark,
  FaVolumeHigh,
  FaVolumeLow,
  FaMicrophone,
  FaDesktop,
  FaMoon,
  FaGear,
  FaTrashCan,
  FaPowerOff,
  FaCircleDot,
  FaHand,
  FaPlus,
  FaCheck,
  FaXmark,
  FaChevronDown,
  FaMagnifyingGlass,
  FaWindowMaximize,
  FaSliders,
  FaRotate,
} from 'react-icons/fa6';
import {
  DEFAULT_HOTKEYS,
  HOTKEY_DEFINITIONS,
  getEffectiveHotkeys,
  formatEventToHotkey,
  findHotkeyConflict,
} from '../../utils/hotkeys';
import WarmTooltip, { WarmTooltipGroup } from '../WarmTooltip';
import GlideSelect, { GlideSelectOption } from './GlideSelect';
import { GrainientCustomizerModal } from '../GrainientCustomizerModal';

const GRADIENT_EFFECT_OPTIONS: GlideSelectOption[] = [
  { value: 'grokki-blue', label: 'Grokki Blue', tag: 'ASCII' },
  { value: 'grainient', label: 'Grainient', tag: 'Fluid' },
];

interface StudioSettingsTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
  onClearConversations?: () => void;
}
interface CustomDropdownOption {
  id: string;
  name: string;
  category?: string;
  icon?: React.ReactNode;
  iconUrl?: string;
  hint?: string;
}

interface CustomDropdownGroup {
  label: string;
  options: CustomDropdownOption[];
}

interface CustomActionSelectProps {
  value: string;
  groups: CustomDropdownGroup[];
  onChange: (option: CustomDropdownOption) => void;
  placeholder?: string;
  isLoading?: boolean;
}

const CustomActionSelect: React.FC<CustomActionSelectProps> = ({
  value,
  groups,
  onChange,
  placeholder = 'Select action...',
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allOptions = useMemo(() => groups.flatMap((g) => g.options), [groups]);
  const currentOption = useMemo(
    () => allOptions.find((o) => o.id === value),
    [allOptions, value]
  );

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            (o.hint && o.hint.toLowerCase().includes(q)) ||
            (o.category && o.category.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.options.length > 0);
  }, [groups, query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('mousedown', handleOutsideClick, true);
    return () => window.removeEventListener('mousedown', handleOutsideClick, true);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-9 px-3 rounded-lg text-xs font-medium border flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
          isOpen ? 'border-zinc-800 dark:border-zinc-200 ring-2 ring-zinc-500/10 bg-white dark:bg-[#161822] text-zinc-900 dark:text-zinc-100 shadow-sm' : 'border-zinc-200 dark:border-[#252836] bg-white dark:bg-[#13141a] text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {currentOption?.iconUrl ? (
            <img
              src={currentOption.iconUrl}
              alt=""
              className="w-4 h-4 rounded-sm object-contain shrink-0"
            />
          ) : currentOption?.icon ? (
            <span className="shrink-0">{currentOption.icon}</span>
          ) : (
            <FaWindowMaximize className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          )}
          <span className="truncate">{currentOption?.name || placeholder}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isLoading && <FaRotate className="w-3 h-3 text-zinc-500 animate-spin" />}
          {currentOption?.hint && (
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 hidden sm:inline">
              {currentOption.hint}
            </span>
          )}
          <FaChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-zinc-800 dark:text-zinc-200' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 left-0 right-0 top-full mt-1.5 rounded-xl border border-zinc-200 dark:border-[#252836] bg-white/98 dark:bg-[#14161f]/98 backdrop-blur-xl shadow-2xl p-1.5 flex flex-col gap-1 max-h-72 overflow-hidden"
          >
            <div className="px-1.5 pt-1 pb-1.5 border-b border-zinc-100 dark:border-[#1e2029]">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-[#1a1c26] border border-zinc-200/80 dark:border-[#252836]">
                <FaMagnifyingGlass className="w-3 h-3 text-zinc-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search application or setting..."
                  className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <FaXmark className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div data-lenis-prevent="true" onWheel={(e) => e.stopPropagation()} className="overflow-y-auto max-h-56 py-1 flex flex-col gap-2 overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full">
              {filteredGroups.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-zinc-400">
                  No matching options found.
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.label} className="flex flex-col gap-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none">
                      {group.label}
                    </div>
                    {group.options.map((opt) => {
                      const isSelected = opt.id === value;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            onChange(opt);
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer text-left ${
                            isSelected ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-semibold' : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-[#1c1e28]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {opt.iconUrl ? (
                              <img
                                src={opt.iconUrl}
                                alt=""
                                className="w-4 h-4 rounded-sm object-contain shrink-0"
                              />
                            ) : opt.icon ? (
                              <span className="shrink-0">{opt.icon}</span>
                            ) : (
                              <FaWindowMaximize className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            )}
                            <span className="truncate">{opt.name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {opt.hint && (
                              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                                {opt.hint}
                              </span>
                            )}
                            {isSelected && (<FaCheck className="w-3 h-3 text-zinc-900 dark:text-zinc-100 shrink-0" />)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PRESET_APP_OPTIONS: CustomDropdownOption[] = [
  { id: 'grokki', name: 'Grokki Island', icon: <img src={grokkiLogo} alt="" className="w-4 h-4 rounded-sm object-contain shrink-0" />, hint: 'Island' },
  { id: 'whatsapp', name: 'WhatsApp', icon: <FaWhatsapp className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Chat' },
  { id: 'chrome', name: 'Google Chrome', icon: <FaChrome className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Browser' },
  { id: 'msedge', name: 'Microsoft Edge', icon: <FaEdge className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Browser' },
  { id: 'code', name: 'Visual Studio Code', icon: <FaCode className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Editor' },
  { id: 'explorer', name: 'File Explorer', icon: <FaFolder className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Files' },
  { id: 'taskmgr', name: 'Task Manager', icon: <FaChartLine className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'System' },
  { id: 'notepad', name: 'Notepad', icon: <FaFileLines className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Notes' },
  { id: 'calc', name: 'Calculator', icon: <FaCalculator className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Tool' },
  { id: 'wt', name: 'Windows Terminal', icon: <FaTerminal className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Dev' },
  { id: 'discord', name: 'Discord', icon: <FaDiscord className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Social' },
  { id: 'spotify', name: 'Spotify', icon: <FaSpotify className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Audio' },
];

const OS_SETTINGS_OPTIONS: CustomDropdownOption[] = [
  { id: 'lock_pc', name: 'Lock Workstation', icon: <FaLock className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Win+L' },
  { id: 'screenshot', name: 'Fullscreen Screenshot', icon: <FaCamera className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Save to Desktop' },
  { id: 'volume_mute', name: 'Mute / Unmute Volume', icon: <FaVolumeXmark className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Toggle Sound' },
  { id: 'volume_up', name: 'Volume Up (+10%)', icon: <FaVolumeHigh className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Audio +' },
  { id: 'volume_down', name: 'Volume Down (-10%)', icon: <FaVolumeLow className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Audio -' },
  { id: 'toggle_mic', name: 'Toggle Microphone Mute', icon: <FaMicrophone className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Win+Alt+K' },
  { id: 'show_desktop', name: 'Show Desktop (Minimize All)', icon: <FaDesktop className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Win+D' },
  { id: 'toggle_theme', name: 'Toggle Dark / Light Theme', icon: <FaMoon className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'System Theme' },
  { id: 'open_settings', name: 'Open Windows Settings', icon: <FaGear className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'ms-settings:' },
  { id: 'empty_recycle_bin', name: 'Empty Recycle Bin', icon: <FaTrashCan className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Clean Trash' },
  { id: 'sleep_pc', name: 'Sleep Computer', icon: <FaPowerOff className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Low Power' },
  { id: 'open_island', name: 'Summon Grokki Island', icon: <img src={grokkiLogo} alt="" className="w-4 h-4 rounded-sm object-contain shrink-0" />, hint: 'Top Island' },
  { id: 'toggle_recording', name: 'Start/Stop Recording', icon: <FaCircleDot className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Game Bar' },
  { id: 'stop_air_cursor', name: 'Turn Off Air Cursor', icon: <FaHand className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />, hint: 'Stop Tracking' },
];

export const StudioSettingsTab = React.memo<StudioSettingsTabProps>(({
  config,
  onChangeConfig,
  onClearConversations,
}) => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [clearedConfirm, setClearedConfirm] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [recordingActionId, setRecordingActionId] = useState<keyof StudioHotkeys | 'globalSummon' | null>(null);
  const [hotkeyConflictError, setHotkeyConflictError] = useState<{
    actionId: keyof StudioHotkeys | 'globalSummon';
    message: string;
  } | null>(null);

  const [installedApps, setInstalledApps] = useState<InstalledAppItem[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  useEffect(() => {
    let active = true;
    if (window.jarvisAPI?.getInstalledApps) {
      setIsLoadingApps(true);
      window.jarvisAPI.getInstalledApps()
        .then((apps) => {
          if (active && Array.isArray(apps)) {
            setInstalledApps(apps);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setIsLoadingApps(false);
        });
    }
    return () => { active = false; };
  }, []);

  const defaultGestures: LeftHandGestureItem[] = [
    { id: 'left-finger-1', fingers: 1, type: 'app', target: config.spatialLeftHand1FingerApp || 'grokki', label: 'Grokki Island', enabled: true },
    { id: 'left-finger-2', fingers: 2, type: 'app', target: config.spatialLeftHand2FingersApp || 'whatsapp', label: 'WhatsApp', enabled: true },
  ];

  const currentGestures: LeftHandGestureItem[] = Array.isArray(config.spatialLeftHandGestures) && config.spatialLeftHandGestures.length > 0
    ? config.spatialLeftHandGestures
    : defaultGestures;

  const saveGestures = (newGestures: LeftHandGestureItem[]) => {
    const patch: Partial<JarvisConfig> = { spatialLeftHandGestures: newGestures };
    const g1 = newGestures.find((g) => Number(g.fingers) === 1);
    if (g1) patch.spatialLeftHand1FingerApp = g1.target;
    const g2 = newGestures.find((g) => Number(g.fingers) === 2);
    if (g2) patch.spatialLeftHand2FingersApp = g2.target;
    onChangeConfig(patch);
  };

  const handleAddFingerTask = () => {
    if (currentGestures.length >= 5) return;
    const usedFingers = new Set(currentGestures.map((g) => Number(g.fingers)));
    let nextFinger = 1;
    for (let i = 1; i <= 5; i++) {
      if (!usedFingers.has(i)) {
        nextFinger = i;
        break;
      }
    }
    const defaultTarget = nextFinger === 5 ? 'stop_air_cursor' : (nextFinger === 3 ? 'screenshot' : (nextFinger === 4 ? 'lock_pc' : 'chrome'));
    const defaultType: 'app' | 'os' = (nextFinger === 3 || nextFinger === 4 || nextFinger === 5) ? 'os' : 'app';
    const defaultLabel = defaultType === 'os'
      ? (OS_SETTINGS_ACTIONS.find((a) => a.id === defaultTarget)?.name || 'System Action')
      : 'Google Chrome';

    const newItem: LeftHandGestureItem = {
      id: `left-finger-${nextFinger}-${Date.now()}`,
      fingers: nextFinger,
      type: defaultType,
      target: defaultTarget,
      label: defaultLabel,
      enabled: true,
    };
    const updated = [...currentGestures, newItem].sort((a, b) => a.fingers - b.fingers);
    saveGestures(updated);
  };

  const handleRemoveFingerTask = (id: string) => {
    if (currentGestures.length <= 1) return;
    const updated = currentGestures.filter((g) => g.id !== id);
    saveGestures(updated);
  };

  const handleUpdateFingerItem = (id: string, patch: Partial<LeftHandGestureItem>) => {
    const updated = currentGestures.map((g) => {
      if (g.id !== id) return g;
      return { ...g, ...patch };
    });
    saveGestures(updated);
  };

  const effectiveHotkeys = getEffectiveHotkeys(config);
  const globalHotkey = config.hotkey || 'Alt+Q';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Capture key combination while recording a hotkey in Settings
  useEffect(() => {
    if (!recordingActionId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingActionId(null);
        return;
      }

      const combo = formatEventToHotkey(e);
      if (!combo) {
        return;
      }

      const conflictingLabel = findHotkeyConflict(
        combo,
        recordingActionId,
        effectiveHotkeys,
        globalHotkey
      );

      if (conflictingLabel) {
        setHotkeyConflictError({
          actionId: recordingActionId,
          message: `"${combo}" is already assigned to "${conflictingLabel}"`,
        });
        setTimeout(() => {
          setHotkeyConflictError((prev) =>
            prev?.actionId === recordingActionId ? null : prev
          );
        }, 3800);
        return;
      }

      setHotkeyConflictError(null);

      if (recordingActionId === 'globalSummon') {
        onChangeConfig({ hotkey: combo });
      } else {
        onChangeConfig({
          hotkeys: {
            ...effectiveHotkeys,
            [recordingActionId]: combo,
          },
        });
      }

      setRecordingActionId(null);
      showToast(`Bound shortcut to ${combo}`);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [recordingActionId, effectiveHotkeys, globalHotkey, onChangeConfig]);

  const handleResetSingleHotkey = (actionId: keyof StudioHotkeys | 'globalSummon', defaultKey: string) => {
    const conflictingLabel = findHotkeyConflict(
      defaultKey,
      actionId,
      effectiveHotkeys,
      globalHotkey
    );
    if (conflictingLabel) {
      setHotkeyConflictError({
        actionId,
        message: `Default "${defaultKey}" is currently used by "${conflictingLabel}"`,
      });
      setTimeout(() => setHotkeyConflictError(null), 3500);
      return;
    }

    setHotkeyConflictError(null);
    if (actionId === 'globalSummon') {
      onChangeConfig({ hotkey: defaultKey });
    } else {
      onChangeConfig({
        hotkeys: {
          ...effectiveHotkeys,
          [actionId]: defaultKey,
        },
      });
    }
  };

  const handleResetAllHotkeys = () => {
    setRecordingActionId(null);
    setHotkeyConflictError(null);
    onChangeConfig({
      hotkey: 'Alt+Q',
      hotkeys: { ...DEFAULT_HOTKEYS },
    });
    showToast('All keyboard shortcuts restored to defaults');
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
    <WarmTooltipGroup delay={400} warmWindow={300} travel={320} lean={false}>
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-20 select-none">
      {/* Header Banner */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold mt-16 tracking-tight text-gray-900 dark:text-gray-100">
            Grokki Studio Settings
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Configure keyboard hotkeys, window behavior, startup actions, and response engine options.
          </p>
        </div>
        {toastMsg && (
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-in fade-in duration-200">
            {toastMsg}
          </span>
        )}
      </div>

      {/* Spatial Multi-Hand Controls (Air Cursor) */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Spatial Multi-Hand Controls
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                {currentGestures.length}/5 Gestures Active
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Right Hand moves cursor and pinches to drag files. Left Hand gestures trigger applications or system settings without dropping items.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {currentGestures.length < 5 ? (
              <button
                type="button"
                onClick={handleAddFingerTask}
                className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1a1c24] hover:bg-zinc-50 dark:hover:bg-[#222530] text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <FaPlus className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
                <span>Add Finger Task ({currentGestures.length}/5)</span>
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-[#1a1c24] border border-zinc-200 dark:border-[#222530]">
                All 5 Fingers Configured
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {currentGestures.map((item) => {
            const isAppMode = (item.type || 'app') === 'app';

            // Groups for custom app dropdown
            const appGroups: CustomDropdownGroup[] = [
              {
                label: 'Presets',
                options: PRESET_APP_OPTIONS,
              },
            ];

            if (installedApps.length > 0) {
              appGroups.push({
                label: `Installed Applications (${installedApps.length})`,
                options: installedApps.map((app) => ({
                  id: app.path || app.appId || app.name,
                  name: app.name,
                  iconUrl: app.icon || undefined,
                  hint: app.category || 'App',
                })),
              });
            }

            // Groups for custom OS settings dropdown
            const osGroups: CustomDropdownGroup[] = [
              {
                label: 'System & Hardware Controls',
                options: OS_SETTINGS_OPTIONS,
              },
            ];

            return (
              <div
                key={item.id}
                className="flex flex-col gap-3.5 p-4 rounded-xl border border-zinc-200/90 dark:border-[#1e2029] bg-zinc-50/80 dark:bg-[#181922] transition-all hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs"
              >
                {/* Header: Finger identification and finger assignment pills */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div>
                      <strong className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Finger {item.fingers}
                      </strong>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                        {isAppMode ? 'Launch Application' : 'System Action'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Finger Number Switcher Pills [1] [2] [3] [4] [5] */}
                    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-zinc-200/70 dark:bg-[#121319] border border-zinc-200 dark:border-[#222530]">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isCur = item.fingers === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              if (isCur) return;
                              const existing = currentGestures.find(
                                (g) => g.id !== item.id && g.fingers === num
                              );
                              if (existing) {
                                const updated = currentGestures
                                  .map((g) => {
                                    if (g.id === item.id) return { ...g, fingers: num };
                                    if (g.id === existing.id) return { ...g, fingers: item.fingers };
                                    return g;
                                  })
                                  .sort((a, b) => a.fingers - b.fingers);
                                saveGestures(updated);
                              } else {
                                handleUpdateFingerItem(item.id, { fingers: num });
                              }
                            }}
                            className={`w-5 h-5 rounded-sm text-[8px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                              isCur ? 'bg-white dark:bg-[#20222e] text-zinc-900 dark:text-zinc-100 font-bold shadow-xs border border-zinc-300 dark:border-zinc-700' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                            }`}
                            title={`Switch to Finger ${num}`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>

                    {/* Delete button (if more than 1 gesture) */}
                    {currentGestures.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFingerTask(item.id)}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer" title="Delete task"><FaTrashCan className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mode Selector Segmented Pills */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-zinc-200/70 dark:bg-[#121319] border border-zinc-200/80 dark:border-[#222530]">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAppMode) {
                        handleUpdateFingerItem(item.id, {
                          type: 'app',
                          target: 'grokki',
                          label: 'Grokki Island',
                        });
                      }
                    }}
                    className={`py-2.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isAppMode
                        ? 'bg-white dark:bg-[#1a1c24] text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/60 dark:border-zinc-700/60 font-semibold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <FaWindowMaximize className="w-3 h-3" />
                    <span>Launch Application</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isAppMode) {
                        handleUpdateFingerItem(item.id, {
                          type: 'os',
                          target: 'screenshot',
                          label: 'Fullscreen Screenshot',
                        });
                      }
                    }}
                    className={`py-2.5 px-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !isAppMode
                        ? 'bg-white dark:bg-[#1a1c24] text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/60 dark:border-zinc-700/60 font-semibold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <FaSliders className="w-3 h-3" />
                    <span>System Setting</span>
                  </button>
                </div>

                {/* Custom Animated Dropdown Selection */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {isAppMode ? 'Target Application' : 'Target System Action'}
                  </span>
                  {isAppMode ? (
                    <CustomActionSelect
                      value={item.target || 'grokki'}
                      groups={appGroups}
                      isLoading={isLoadingApps}
                      placeholder="Select application..."
                      onChange={(opt) => {
                        handleUpdateFingerItem(item.id, {
                          target: opt.id,
                          label: opt.name,
                        });
                      }}
                    />
                  ) : (
                    <CustomActionSelect
                      value={item.target || 'screenshot'}
                      groups={osGroups}
                      placeholder="Select system setting..."
                      onChange={(opt) => {
                        handleUpdateFingerItem(item.id, {
                          target: opt.id,
                          label: opt.name,
                        });
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Clickable dashed card to add another finger */}
          {currentGestures.length < 5 && (
            <button
              type="button"
              onClick={handleAddFingerTask}
              className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-zinc-200 dark:border-[#222530] hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/40 dark:bg-[#15161f]/40 hover:bg-zinc-100/40 dark:hover:bg-[#181a24]/60 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer min-h-[175px]"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
                <FaPlus className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold">
                Add Finger {currentGestures.length + 1} Custom Task
              </span>
              <span className="text-[10.5px] text-zinc-400 dark:text-zinc-500 font-mono">
                Left hand combinations (up to 5 fingers)
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts & Hotkeys Section */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Keyboard Shortcuts & Hotkeys
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Click any shortcut badge and press a key combination (e.g. Ctrl+M, Alt+Q) to rebind. Duplicate keys are automatically blocked.
            </p>
          </div>
          <WarmTooltip
            content="Reset all hotkeys to defaults"
            side="top"
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
              onClick={handleResetAllHotkeys}
              className="h-8 px-3 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-gray-50 dark:bg-[#1a1c24] hover:bg-gray-100 dark:hover:bg-[#222530] text-gray-700 dark:text-gray-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
          </WarmTooltip>
        </div>

        {hotkeyConflictError && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{hotkeyConflictError.message} — two actions cannot share the same shortcut.</span>
          </div>
        )}

        <div className="flex flex-col divide-y divide-gray-100 dark:divide-[#1e2029]/60">
          {HOTKEY_DEFINITIONS.map((def) => {
            const currentVal =
              def.id === 'globalSummon'
                ? globalHotkey
                : effectiveHotkeys[def.id] || def.defaultKey;
            const isRecording = recordingActionId === def.id;
            const isModified = currentVal.toLowerCase() !== def.defaultKey.toLowerCase();
            const hasConflict = hotkeyConflictError?.actionId === def.id;

            return (
              <div
                key={def.id}
                className="flex items-center justify-between py-3 first:pt-1 last:pb-0 gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      {def.label}
                    </strong>
                    <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-gray-900/[0.04] dark:bg-white/[0.05] text-gray-500 dark:text-gray-400">
                      {def.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                    {def.description}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isModified && !isRecording && (
                    <WarmTooltip
                      content={`Reset to ${def.defaultKey}`}
                      side="top"
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
                        aria-label={`Reset to ${def.defaultKey}`}
                        onClick={() => handleResetSingleHotkey(def.id, def.defaultKey)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-colors cursor-pointer border-none bg-transparent"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </WarmTooltip>
                  )}

                  <WarmTooltip
                    content={isRecording ? 'Press Esc to cancel' : 'Click to record new shortcut'}
                    side="top"
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
                      onClick={() => {
                        setHotkeyConflictError(null);
                        setRecordingActionId(isRecording ? null : def.id);
                      }}
                      className={`h-8 min-w-[110px] px-3 rounded-lg font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        hasConflict
                          ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                          : isRecording
                          ? 'border-gray-900 dark:border-white bg-gray-900 text-white dark:bg-white dark:text-gray-950 shadow-sm animate-pulse'
                          : 'border-gray-200 dark:border-[#252836] bg-gray-50 dark:bg-[#1a1c24] hover:border-gray-400 dark:hover:border-gray-600 text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {isRecording ? (
                        <span>Press keys...</span>
                      ) : (
                        currentVal.split('+').map((part, idx, arr) => (
                          <React.Fragment key={idx}>
                            <span>{part}</span>
                            {idx < arr.length - 1 && (
                              <span className="text-gray-400 dark:text-gray-500 font-normal">+</span>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </button>
                  </WarmTooltip>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1. Window Sizing & Display Mode */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-5 shadow-xs flex flex-col gap-4">
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
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-5 shadow-xs flex flex-col gap-4">
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
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-5 shadow-xs flex flex-col gap-4">
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

          {/* Hands-Free Voice Activation (Wake Word) */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Hands-Free Voice Activation (Wake Word)
              </strong>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Summon Grokki Island by speaking "Hey Grokki" in the background without touching the keyboard.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ wakeWordEnabled: config.wakeWordEnabled === false ? true : false })}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
                config.wakeWordEnabled !== false ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.wakeWordEnabled !== false ? 'bg-white dark:bg-black translate-x-5' : 'bg-white translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Wake Phrase Customization */}
          {config.wakeWordEnabled !== false && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
              <div>
                <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                  Custom Wake Phrase
                </strong>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  The phrase you speak to activate Grokki (default: Hey Grokki).
                </span>
              </div>
              <input
                type="text"
                value={config.wakeWord || 'Hey Grokki'}
                onChange={(e) => onChangeConfig({ wakeWord: e.target.value })}
                className="w-36 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#252836] bg-gray-50 dark:bg-[#161822] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                placeholder="Hey Grokki"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Chat & Streaming Experience */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-5 shadow-xs flex flex-col gap-4">
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
                config.streamingAnimation !== false ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.streamingAnimation !== false ? 'bg-white dark:bg-black translate-x-5' : 'bg-white translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Chat Background Gradient Effect */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Chat Background Gradient
              </strong>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Display animated WebGL ambient wave shader on the Chat tab canvas. Turn off for pure flat canvas.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ chatBackgroundGradient: !config.chatBackgroundGradient })}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
                config.chatBackgroundGradient ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.chatBackgroundGradient ? 'bg-white dark:bg-black translate-x-5' : 'bg-white translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Gradient Style Effect Dropdown - Only appears if gradient background toggle is on */}
          {!!config.chatBackgroundGradient && (
            <div className="flex items-center justify-between pl-3 pr-2 py-2 rounded-lg bg-gray-50/80 dark:bg-[#12141c] border border-gray-200/70 dark:border-[#1e2029] gap-4">
              <div>
                <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100">
                  Gradient Style Effect
                </strong>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Select between Grokki Blue ASCII wave and Grainient fluid shader.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <GlideSelect
                  options={GRADIENT_EFFECT_OPTIONS}
                  value={config.chatBackgroundEffect || 'grokki-blue'}
                  onChange={(val) => onChangeConfig({ chatBackgroundEffect: val })}
                  showTags
                  size="md"
                  radius={10}
                  menuWidth={180}
                  align="right"
                  placement="bottom"
                  surfaceColor={config.dashboardTheme === 'dark' ? '#1a1c24' : '#ffffff'}
                  highlightColor={config.dashboardTheme === 'dark' ? '#272a38' : '#f1f3f9'}
                  textColor={config.dashboardTheme === 'dark' ? '#f3f4f6' : '#111827'}
                  accentColor={config.dashboardTheme === 'dark' ? '#ffffff' : '#000000'}
                  className="[&>button]:border [&>button]:border-gray-200 [&>button]:dark:border-[#2a2d3a] [&>button]:shadow-xs font-mono text-xs"
                />

                {/* Customize Pencil Button - Only appears when Grainient is selected */}
                {(config.chatBackgroundEffect || 'grokki-blue') === 'grainient' && (
                  <button
                    type="button"
                    onClick={() => setIsCustomizerOpen(true)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white hover:bg-gray-100 dark:bg-[#1a1d28] dark:hover:bg-[#252836] border border-gray-200 dark:border-[#2a2d3a] text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-all cursor-pointer shadow-xs shrink-0"
                    title="Customize Grainient Effect"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Chat Background Noise & Scanlines */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1e2029]/60">
            <div>
              <strong className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                Chat Background Noise & Scanlines
              </strong>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Overlay textured analog film grain and CRT scanlines above the chat background. Turn off for smooth surface.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChangeConfig({ chatBackgroundNoise: !config.chatBackgroundNoise })}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out border-none ${
                config.chatBackgroundNoise ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-[#252836]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  config.chatBackgroundNoise ? 'bg-white dark:bg-black translate-x-5' : 'bg-white translate-x-0'
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
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-5 shadow-xs flex flex-col gap-4">
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

    {/* Grainient Customizer Modal */}
    <GrainientCustomizerModal
      isOpen={isCustomizerOpen}
      onClose={() => setIsCustomizerOpen(false)}
      currentSettings={config.grainientSettings}
      onSave={(settings) => onChangeConfig({ grainientSettings: settings })}
      isDark={config.dashboardTheme === 'dark'}
    />
    </WarmTooltipGroup>
  );
});

