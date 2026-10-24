import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';
import GlideSelect, { GlideSelectOption } from './GlideSelect';
import { GrainientCustomizerModal } from '../GrainientCustomizerModal';

const GRADIENT_EFFECT_OPTIONS: GlideSelectOption[] = [
  { value: 'grokki-blue', label: 'Grokki Blue', tag: 'ASCII' },
  { value: 'grainient', label: 'Grainient', tag: 'Fluid' },
];

interface AppearanceTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
}

export const AppearanceTab = React.memo<AppearanceTabProps>(({ config, onChangeConfig }) => {
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div>
        <h2 className="text-xl font-bold mt-16 tracking-tight text-gray-900 dark:text-gray-100">
          Appearance & Hotkey
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Customize your desktop theme and global hotkey.
        </p>
      </div>

      {/* Studio Theme */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          Studio Theme
        </h3>
        <div className="grid grid-cols-2 gap-3.5 w-full">
          <div
            onClick={() => onChangeConfig({ dashboardTheme: 'light' })}
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
            onClick={() => onChangeConfig({ dashboardTheme: 'dark' })}
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

      {/* Dynamic Island Style */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          Dynamic Island Style
        </h3>
        <div className="grid grid-cols-2 gap-3.5 w-full">
          <div
            onClick={() => onChangeConfig({ pillTheme: 'glass' })}
            className={`flex flex-col gap-1 p-4 rounded-xl cursor-pointer transition-all ${
              (config.pillTheme || 'glass') === 'glass'
                ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
            }`}
          >
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Liquid Glass
            </strong>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
              Specular glass sheen with dynamic backdrop blur.
            </p>
          </div>

          <div
            onClick={() => onChangeConfig({ pillTheme: 'original' })}
            className={`flex flex-col gap-1 p-4 rounded-xl cursor-pointer transition-all ${
              config.pillTheme === 'original'
                ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
            }`}
          >
            <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Obsidian Pitch Black
            </strong>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
              Minimalist pure black Dynamic Island bar.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Background Effect */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-3.5">
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
            aria-checked={config.chatBackgroundGradient !== false}
            onClick={() => onChangeConfig({ chatBackgroundGradient: config.chatBackgroundGradient === false })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
              config.chatBackgroundGradient !== false ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-200 ${
                config.chatBackgroundGradient !== false ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Effect Selector Dropdown - Only appears if gradient background toggle is on */}
        {config.chatBackgroundGradient !== false && (
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
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl px-5 py-4 flex items-center justify-between shadow-xs">
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
          aria-checked={config.chatBackgroundNoise !== false}
          onClick={() => onChangeConfig({ chatBackgroundNoise: config.chatBackgroundNoise === false })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
            config.chatBackgroundNoise !== false ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-200 ${
              config.chatBackgroundNoise !== false ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      
      {/* Smooth Physics Custom Cursor */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl px-5 py-4 flex items-center justify-between shadow-xs">
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
          aria-checked={config.smoothCursorEnabled !== false}
          onClick={() => onChangeConfig({ smoothCursorEnabled: config.smoothCursorEnabled === false })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
            config.smoothCursorEnabled !== false ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-200 ${
              config.smoothCursorEnabled !== false ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Fluid Glow Cursor Trail */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl px-5 py-4 flex items-center justify-between shadow-xs">
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
          aria-checked={config.glowCursorEnabled !== false}
          onClick={() => onChangeConfig({ glowCursorEnabled: config.glowCursorEnabled === false })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
            config.glowCursorEnabled !== false ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-200 ${
              config.glowCursorEnabled !== false ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      
      {/* Smooth Scrolling Toggle & Intensity Slider */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
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
            aria-checked={config.smoothScroll !== false}
            onClick={() => onChangeConfig({ smoothScroll: config.smoothScroll === false })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
              config.smoothScroll !== false ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-black shadow-sm transition-transform duration-200 ${
                config.smoothScroll !== false ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {config.smoothScroll !== false && (
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
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl px-5 py-4 flex items-center justify-between shadow-xs">
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
