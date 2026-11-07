import React, { useState } from 'react';
import { Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';
import GlideSelect, { GlideSelectOption } from './GlideSelect';
import { GrainientCustomizerModal } from '../GrainientCustomizerModal';

const GRADIENT_EFFECT_OPTIONS: GlideSelectOption[] = [
  { value: 'grokki-blue', label: 'Grokki Blue', tag: 'ASCII' },
  { value: 'grainient', label: 'Grainient', tag: 'Fluid' },
];

export const THEMES_CATALOG = [
  {
    id: 'none',
    name: 'None',
    accent: '#a1a1aa',
    deep: '#27272a',
    desc: 'Default Studio mode (enables Clean Light & Midnight Obsidian)',
    isNone: true,
  },
  { id: 'grokki-blue', name: 'Grokki Blue', accent: '#5b9bf8', deep: '#2563eb', desc: 'Signature electric sky blue' },
  { id: 'cream', name: 'Cream', accent: '#efeac6', deep: '#cbbd82', desc: 'Warm vintage ivory accent' },
  { id: 'jungle', name: 'Jungle', accent: '#34d399', deep: '#059669', desc: 'Deep forest & emerald mint' },
  { id: 'sakura', name: 'Sakura', accent: '#f472b6', deep: '#db2777', desc: 'Soft cherry blossom rose' },
  { id: 'cyber', name: 'Cyber', accent: '#a855f7', deep: '#7e22ce', desc: 'Neon amethyst & deep violet' },
  { id: 'sunset', name: 'Sunset', accent: '#fb923c', deep: '#ea580c', desc: 'Warm solar amber glow' },
  { id: 'arctic', name: 'Arctic', accent: '#22d3ee', deep: '#0891b2', desc: 'Crisp glacier cyan ice' },
  { id: 'crimson', name: 'Crimson', accent: '#f87171', deep: '#dc2626', desc: 'Bold scarlet blood moon' },
];

export const THEME_NAMES: Record<string, string> = {
  none: 'None (Default)',
  'grokki-blue': 'Grokki Blue',
  cream: 'Cream',
  jungle: 'Jungle',
  sakura: 'Sakura',
  cyber: 'Cyber',
  sunset: 'Sunset',
  arctic: 'Arctic',
  crimson: 'Crimson',
};

interface AppearanceTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
}

export const AppearanceTab = React.memo<AppearanceTabProps>(({ config, onChangeConfig }) => {
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const activeThemeId = (config.pillTheme === 'none' || config.pillTheme === 'default')
    ? 'none'
    : (config.pillTheme || 'none');
  const activeThemeIdx = Math.max(0, THEMES_CATALOG.findIndex((t) => t.id === activeThemeId));
  const currentThemeObj = THEMES_CATALOG[activeThemeIdx] || THEMES_CATALOG[0];
  const isCustomThemeActive = Boolean(config.pillTheme && config.pillTheme !== 'none' && config.pillTheme !== 'default');

  const handlePrevTheme = () => {
    const nextIdx = (activeThemeIdx - 1 + THEMES_CATALOG.length) % THEMES_CATALOG.length;
    onChangeConfig({ pillTheme: THEMES_CATALOG[nextIdx].id as any });
  };

  const handleNextTheme = () => {
    const nextIdx = (activeThemeIdx + 1) % THEMES_CATALOG.length;
    onChangeConfig({ pillTheme: THEMES_CATALOG[nextIdx].id as any });
  };

  // Horizontal mouse / pointer drag handling (Zero vertical wheel scroll hijacking!)
  const dragStartX = React.useRef<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    setIsDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || dragStartX.current === null) return;
    const diff = e.clientX - dragStartX.current;
    if (diff > 45) {
      handlePrevTheme();
      dragStartX.current = e.clientX;
    } else if (diff < -45) {
      handleNextTheme();
      dragStartX.current = e.clientX;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragStartX.current = null;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div>
        <h2 className="text-xl font-bold mt-16 tracking-tight text-gray-900 dark:text-gray-100">
          Appearance &amp; Hotkey
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Customize your desktop theme, Grokki Studio palette, and global hotkey.
        </p>
      </div>

      {/* Studio Theme Light / Dark Selection */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
              Studio Theme Mode
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Standard light and dark mode selection.
            </p>
          </div>
          {isCustomThemeActive ? (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/25 flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Controlled by Active Theme ({currentThemeObj.name})
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Standard Mode Active
            </span>
          )}
        </div>
        <div className={`grid grid-cols-2 gap-3.5 w-full ${isCustomThemeActive ? 'opacity-40 pointer-events-none' : ''}`}>
          <div
            onClick={() => !isCustomThemeActive && onChangeConfig({ dashboardTheme: 'light' })}
            className={`flex flex-col gap-1 p-4 rounded-xl cursor-pointer transition-all ${
              (config.dashboardTheme || 'light') === 'light'
                ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
            }`}
          >
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Clean Light (Default)
            </strong>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
              High-contrast studio paper aesthetic.
            </p>
          </div>

          <div
            onClick={() => !isCustomThemeActive && onChangeConfig({ dashboardTheme: 'dark' })}
            className={`flex flex-col gap-1 p-4 rounded-xl cursor-pointer transition-all ${
              config.dashboardTheme === 'dark'
                ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
            }`}
          >
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Midnight Obsidian
            </strong>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
              Pure dark mode for night workflows.
            </p>
          </div>
        </div>
      </div>

      {/* Unified Grokki Studio, Island & Control Panel Theme Carousel */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
              Studio, Island &amp; Control Panel Theme
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Shared color palette applied across Grokki Studio, Grokki Island, and the Top Notch Control Centre.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 select-none">
              9 THEMES
            </span>
            <button
              type="button"
              onClick={handlePrevTheme}
              className="w-7 h-7 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-gray-50 dark:bg-[#181a22] hover:bg-gray-100 dark:hover:bg-[#202330] text-gray-600 dark:text-gray-300 flex items-center justify-center transition-all cursor-pointer"
              title="Previous Theme"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextTheme}
              className="w-7 h-7 rounded-lg border border-gray-200 dark:border-[#1e2029] bg-gray-50 dark:bg-[#181a22] hover:bg-gray-100 dark:hover:bg-[#202330] text-gray-600 dark:text-gray-300 flex items-center justify-center transition-all cursor-pointer"
              title="Next Theme"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Skewed Parallelogram Theme Carousel (Horizontal drag or buttons, no wheel hijacking) */}
        <div
          className="studio-carousel-stage cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {THEMES_CATALOG.map((theme, idx) => {
            const diff = idx - activeThemeIdx;
            const slot = (diff >= -2 && diff <= 2) ? String(diff) : 'hidden';
            return (
              <div
                key={theme.id}
                className="studio-theme-slot"
                data-slot={slot}
                onClick={() => onChangeConfig({ pillTheme: theme.id as any })}
                title={`Apply ${theme.name} Theme`}
              >
                <div
                  className="studio-theme-square"
                  style={{
                    background: theme.isNone
                      ? 'linear-gradient(135deg, #27272a 0%, #18181b 50%, #3f3f46 100%)'
                      : `linear-gradient(145deg, ${theme.accent} 0%, ${theme.deep} 100%)`,
                  }}
                >
                  {theme.isNone && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-zinc-300 transform skew-x-[9deg]">
                      <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                        <span>Light</span>
                        <span className="text-zinc-500">/</span>
                        <span>Dark</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium">Standard</span>
                    </div>
                  )}
                  <div className="studio-theme-sheen" />
                  <div className="studio-theme-grain" />
                </div>
                <div className="studio-theme-name">{theme.name}</div>
              </div>
            );
          })}
        </div>

        {/* Active Theme Description Footer */}
        <div className="pt-3 border-t border-gray-100 dark:border-[#1e2029] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/20"
              style={{ backgroundColor: currentThemeObj.accent }}
            />
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Active: {currentThemeObj.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              — {currentThemeObj.desc}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono select-none">
            Drag horizontally or use arrow buttons to navigate
          </span>
        </div>
      </div>

      {/* Chat Background Effect */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-5 shadow-xs flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div>
            <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
              Chat Background Gradient
            </strong>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Ambient WebGL wave gradient animation in the Chat canvas. Turn off for a clean, flat surface.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!config.chatBackgroundGradient}
            onClick={() => onChangeConfig({ chatBackgroundGradient: !config.chatBackgroundGradient })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
              config.chatBackgroundGradient ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-200 ${
                config.chatBackgroundGradient ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Effect Selector Dropdown - Only appears if gradient background toggle is on */}
        {!!config.chatBackgroundGradient && (
          <div className="pt-3 border-t border-gray-100 dark:border-[#1e2029] flex items-center justify-between gap-4">
            <div>
              <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                Gradient Style Effect
              </strong>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Choose the ambient background visual: Grokki Blue ASCII wave or Grainient fluid mesh.
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
                surfaceColor={config.dashboardTheme === 'dark' ? '#1a1c24' : '#f5f5f7'}
                highlightColor={config.dashboardTheme === 'dark' ? '#272a38' : '#e5e7eb'}
                textColor={config.dashboardTheme === 'dark' ? '#f3f4f6' : '#111827'}
                accentColor={config.dashboardTheme === 'dark' ? '#ffffff' : '#000000'}
                className="[&>button]:border [&>button]:border-gray-200 [&>button]:dark:border-[#1e2029] [&>button]:shadow-xs font-mono text-xs"
              />

              {/* Customize Pencil Button - Only appears when Grainient is selected */}
              {(config.chatBackgroundEffect || 'grokki-blue') === 'grainient' && (
                <button
                  type="button"
                  onClick={() => setIsCustomizerOpen(true)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1d28] dark:hover:bg-[#252836] border border-gray-200 dark:border-[#252836] text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-all cursor-pointer shadow-xs shrink-0"
                  title="Customize Grainient Effect"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat Background Noise Effect */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl px-5 py-4 flex items-center justify-between shadow-xs">
        <div>
          <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
            Chat Background Noise & Scanlines
          </strong>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Analog film grain and subtle CRT scanlines overlay above the chat background. Turn off for zero grain.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!config.chatBackgroundNoise}
          onClick={() => onChangeConfig({ chatBackgroundNoise: !config.chatBackgroundNoise })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
            config.chatBackgroundNoise ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-200 ${
              config.chatBackgroundNoise ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      
      {/* Smooth Physics Custom Cursor */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl px-5 py-4 flex items-center justify-between shadow-xs">
        <div>
          <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
            Smooth Animated Cursor
          </strong>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Physics-based custom cursor with directional rotation and spring inertia. Turn off for default OS pointer.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!config.smoothCursorEnabled}
          onClick={() => onChangeConfig({ smoothCursorEnabled: !config.smoothCursorEnabled })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
            config.smoothCursorEnabled ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-200 ${
              config.smoothCursorEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Fluid Glow Cursor Trail */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl px-5 py-4 flex items-center justify-between shadow-xs">
        <div>
          <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
            Fluid Glow Cursor Trail
          </strong>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Interactive WebGL fluid neon cursor trail with click bursts. Turn off for standard desktop pointer.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!config.glowCursorEnabled}
          onClick={() => onChangeConfig({ glowCursorEnabled: !config.glowCursorEnabled })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
            config.glowCursorEnabled ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-200 ${
              config.glowCursorEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      
      {/* Smooth Scrolling Toggle & Intensity Slider */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
              Smooth Scrolling
            </strong>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Fluid inertia scrolling across all panels and chat. Turn off for normal, instant stepped scrolling.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!config.smoothScroll}
            onClick={() => onChangeConfig({ smoothScroll: !config.smoothScroll })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
              config.smoothScroll ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-200 ${
                config.smoothScroll ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {!!config.smoothScroll && (
          <div className="pt-3 border-t border-gray-100 dark:border-[#1e2029] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Smoothness Intensity
              </span>
              <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">
                {config.smoothScrollIntensity ?? 5} / 10 {((config.smoothScrollIntensity ?? 5) <= 3) ? '• Standard' : ((config.smoothScrollIntensity ?? 5) >= 8) ? '• Turbo Fast' : '• Swift (Balanced)'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-400 font-medium">Standard</span>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={config.smoothScrollIntensity ?? 5}
                onChange={(e) => onChangeConfig({ smoothScrollIntensity: Number(e.target.value) })}
                className="flex-1 h-1.5 bg-gray-200 dark:bg-[#252836] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
              />
              <span className="text-[11px] text-gray-400 font-medium">Turbo Fast</span>
            </div>
          </div>
        )}
      </div>

      {/* Hotkey Configuration */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl px-5 py-4 flex items-center justify-between shadow-xs">
        <div>
          <strong className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
            Global Summon Hotkey
          </strong>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Toggles Grokki Dynamic Island from anywhere in Windows.
          </span>
        </div>
        <input
          type="text"
          value={config.hotkey || 'Alt+Q'}
          onChange={(e) => onChangeConfig({ hotkey: e.target.value })}
          className="w-28 text-center font-mono font-semibold h-9 px-3 rounded-lg text-xs bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
        />
      </div>

      {/* Grainient Customizer Modal */}
      <GrainientCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        currentSettings={config.grainientSettings}
        onSave={(settings) => onChangeConfig({ grainientSettings: settings })}
        isDark={config.dashboardTheme === 'dark'}
      />
    </div>
  );
});
