import { JarvisConfig, StudioHotkeys } from '../types/jarvis';

export const DEFAULT_HOTKEYS: StudioHotkeys = {
  newChat: 'Ctrl+N',
  toggleSidebar: 'Ctrl+B',
  attachFile: 'Ctrl+U',
  voiceRecord: 'Ctrl+M',
  openCamera: 'Ctrl+Shift+C',
  focusInput: 'Ctrl+/',
  toggleTheme: 'Ctrl+Shift+L',
  openSettings: 'Ctrl+,',
};

export interface HotkeyActionDefinition {
  id: keyof StudioHotkeys | 'globalSummon';
  label: string;
  description: string;
  category: 'Chat & Input' | 'Navigation & Window';
  defaultKey: string;
}

export const HOTKEY_DEFINITIONS: HotkeyActionDefinition[] = [
  {
    id: 'globalSummon',
    label: 'Summon Dynamic Island (Global)',
    description: 'System-wide shortcut to summon Grokki voice & Dynamic Island anywhere on Windows.',
    category: 'Navigation & Window',
    defaultKey: 'Alt+Q',
  },
  {
    id: 'newChat',
    label: 'New Conversation',
    description: 'Start a fresh chat thread immediately.',
    category: 'Chat & Input',
    defaultKey: DEFAULT_HOTKEYS.newChat,
  },
  {
    id: 'attachFile',
    label: 'Attach Files Menu (+)',
    description: 'Toggle the Document, Photos, Videos, Camera, and Audio attachment menu.',
    category: 'Chat & Input',
    defaultKey: DEFAULT_HOTKEYS.attachFile,
  },
  {
    id: 'voiceRecord',
    label: 'Voice to Text (Mic)',
    description: 'Start or stop voice-to-text recording in the chat prompt.',
    category: 'Chat & Input',
    defaultKey: DEFAULT_HOTKEYS.voiceRecord,
  },
  {
    id: 'openCamera',
    label: 'Live Camera Capture',
    description: 'Open the live webcam capture modal to snap and attach a photo.',
    category: 'Chat & Input',
    defaultKey: DEFAULT_HOTKEYS.openCamera,
  },
  {
    id: 'focusInput',
    label: 'Focus Chat Input',
    description: 'Jump focus directly into the Grokki chat prompt bar.',
    category: 'Chat & Input',
    defaultKey: DEFAULT_HOTKEYS.focusInput,
  },
  {
    id: 'toggleSidebar',
    label: 'Minimize / Maximize Sidebar',
    description: 'Collapse or expand the left navigation sidebar.',
    category: 'Navigation & Window',
    defaultKey: DEFAULT_HOTKEYS.toggleSidebar,
  },
  {
    id: 'toggleTheme',
    label: 'Switch Light / Dark Mode',
    description: 'Toggle Grokki Studio between Light and Dark appearance.',
    category: 'Navigation & Window',
    defaultKey: DEFAULT_HOTKEYS.toggleTheme,
  },
  {
    id: 'openSettings',
    label: 'Open Studio Settings',
    description: 'Switch directly to the Studio Settings & Hotkeys tab.',
    category: 'Navigation & Window',
    defaultKey: DEFAULT_HOTKEYS.openSettings,
  },
];

export function getEffectiveHotkeys(config?: JarvisConfig | null): StudioHotkeys {
  return {
    ...DEFAULT_HOTKEYS,
    ...(config?.hotkeys || {}),
  };
}

export function normalizeHotkeyString(hotkey: string): string {
  return (hotkey || '')
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'control' || lower === 'ctrl' || lower === 'cmd' || lower === 'meta') return 'Ctrl';
      if (lower === 'alt' || lower === 'option') return 'Alt';
      if (lower === 'shift') return 'Shift';
      if (lower === ' ') return 'Space';
      if (part.length === 1) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('+');
}

/**
 * Converts a keyboard event into a normalized shortcut string like "Ctrl+Shift+K" or "Alt+Q".
 * Returns null if only modifier keys are pressed.
 */
export function formatEventToHotkey(e: KeyboardEvent | React.KeyboardEvent): string | null {
  const ignoredKeys = new Set(['Control', 'Shift', 'Alt', 'Meta', 'OS', 'Dead', 'Unidentified']);
  if (ignoredKeys.has(e.key)) {
    return null;
  }

  const mods: string[] = [];
  if (e.ctrlKey || e.metaKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');

  let keyName = e.key;
  if (keyName === ' ') {
    keyName = 'Space';
  } else if (keyName.length === 1) {
    keyName = keyName.toUpperCase();
  } else {
    const map: Record<string, string> = {
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      Escape: 'Esc',
    };
    keyName = map[keyName] || keyName;
  }

  // Require at least one modifier key (Ctrl or Alt) unless it's a Function key (F1-F12)
  const isFunctionKey = /^F([1-9]|1[0-2])$/i.test(keyName);
  if (mods.length === 0 && !isFunctionKey) {
    return null;
  }

  return [...mods, keyName].join('+');
}

/**
 * Checks if a KeyboardEvent matches a configured hotkey string.
 */
export function matchesHotkey(e: KeyboardEvent, hotkeyStr?: string): boolean {
  if (!hotkeyStr) return false;
  const pressed = formatEventToHotkey(e);
  if (!pressed) return false;
  return pressed.toLowerCase() === normalizeHotkeyString(hotkeyStr).toLowerCase();
}

/**
 * Checks if candidateKey is already assigned to any other action.
 * Returns the conflicting action's label if a conflict exists, or null if free.
 */
export function findHotkeyConflict(
  candidateKey: string,
  currentActionId: keyof StudioHotkeys | 'globalSummon',
  hotkeys: StudioHotkeys,
  globalHotkey = 'Alt+Q'
): string | null {
  const normCandidate = normalizeHotkeyString(candidateKey).toLowerCase();
  if (!normCandidate) return null;

  for (const def of HOTKEY_DEFINITIONS) {
    if (def.id === currentActionId) continue;
    const assigned =
      def.id === 'globalSummon'
        ? globalHotkey || 'Alt+Q'
        : hotkeys[def.id] || def.defaultKey;
    if (normalizeHotkeyString(assigned).toLowerCase() === normCandidate) {
      return def.label;
    }
  }
  return null;
}
