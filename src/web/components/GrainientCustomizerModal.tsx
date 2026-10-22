import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Check, Sliders, Palette, Plus, Trash2, Eye } from 'lucide-react';
import Grainient from './tabs/Grainient';
import { GrainientCustomSettings } from '../types/jarvis';

export const DEFAULT_GRAINIENT_SETTINGS: GrainientCustomSettings = {
  colors: ['#120f17', '#2a0f0a', '#9a3412', '#f97316', '#fed7aa'],
  type: 'linear',
  angle: 55,
  bands: 1,
  speed: 1,
  flow: 0.8,
  scale: 1,
  softness: 0.7,
  silk: 0.35,
  grainAmount: 0.08,
  grainSize: 1.2,
  grainAnimated: true,
  contrast: 1,
  saturation: 1,
  variation: 0,
};

export const GRAINIENT_PRESETS: { name: string; settings: GrainientCustomSettings }[] = [
  {
    name: 'Ember Flame (Default)',
    settings: {
      colors: ['#120f17', '#2a0f0a', '#9a3412', '#f97316', '#fed7aa'],
      type: 'linear',
      angle: 55,
      bands: 1,
      speed: 1,
      flow: 0.8,
      scale: 1,
      softness: 0.7,
      silk: 0.35,
      grainAmount: 0.08,
      grainSize: 1.2,
      grainAnimated: true,
      contrast: 1,
      saturation: 1,
      variation: 0,
    },
  },
  {
    name: 'Deep Royal Blue',
    settings: {
      colors: ['#070d1e', '#0e1c3e', '#1e3a8a', '#2563eb', '#93c5fd'],
      type: 'linear',
      angle: 45,
      bands: 1,
      speed: 0.8,
      flow: 0.7,
      scale: 1.1,
      softness: 0.8,
      silk: 0.4,
      grainAmount: 0.06,
      grainSize: 1.2,
      grainAnimated: true,
      contrast: 1.1,
      saturation: 1.1,
      variation: 1,
    },
  },
  {
    name: 'Sunset Horizon',
    settings: {
      colors: ['#1a0b16', '#3b0d24', '#831843', '#e11d48', '#fb7185'],
      type: 'linear',
      angle: 60,
      bands: 1,
      speed: 0.9,
      flow: 0.85,
      scale: 1,
      softness: 0.75,
      silk: 0.45,
      grainAmount: 0.07,
      grainSize: 1.3,
      grainAnimated: true,
      contrast: 1.05,
      saturation: 1.15,
      variation: 2,
    },
  },
  {
    name: 'Northern Aurora',
    settings: {
      colors: ['#041210', '#064e3b', '#0f766e', '#14b8a6', '#6ee7b7'],
      type: 'linear',
      angle: 50,
      bands: 2,
      speed: 0.75,
      flow: 0.9,
      scale: 1.1,
      softness: 0.85,
      silk: 0.5,
      grainAmount: 0.06,
      grainSize: 1.1,
      grainAnimated: true,
      contrast: 1.1,
      saturation: 1.05,
      variation: 3,
    },
  },
  {
    name: 'Cyber Violet',
    settings: {
      colors: ['#0c0617', '#2e1065', '#6b21a8', '#a855f7', '#ec4899'],
      type: 'linear',
      angle: 70,
      bands: 1,
      speed: 1.1,
      flow: 1.0,
      scale: 1,
      softness: 0.7,
      silk: 0.4,
      grainAmount: 0.09,
      grainSize: 1.2,
      grainAnimated: true,
      contrast: 1.15,
      saturation: 1.2,
      variation: 4,
    },
  },
];

interface GrainientCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings?: GrainientCustomSettings;
  onSave: (settings: GrainientCustomSettings) => void;
  isDark?: boolean;
}

export const GrainientCustomizerModal: React.FC<GrainientCustomizerModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  isDark = true,
}) => {
  const [draft, setDraft] = useState<GrainientCustomSettings>(() => ({
    ...DEFAULT_GRAINIENT_SETTINGS,
    ...(currentSettings || {}),
  }));

  useEffect(() => {
    if (isOpen) {
      setDraft({
        ...DEFAULT_GRAINIENT_SETTINGS,
        ...(currentSettings || {}),
      });
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const updateField = <K extends keyof GrainientCustomSettings>(key: K, value: GrainientCustomSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleColorChange = (index: number, newColor: string) => {
    const list = [...(draft.colors || DEFAULT_GRAINIENT_SETTINGS.colors!)];
    list[index] = newColor;
    updateField('colors', list);
  };

  const handleAddColor = () => {
    const list = [...(draft.colors || DEFAULT_GRAINIENT_SETTINGS.colors!)];
    if (list.length >= 8) return;
    list.push('#38bdf8');
    updateField('colors', list);
  };

  const handleRemoveColor = (index: number) => {
    const list = [...(draft.colors || DEFAULT_GRAINIENT_SETTINGS.colors!)];
    if (list.length <= 2) return;
    list.splice(index, 1);
    updateField('colors', list);
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_GRAINIENT_SETTINGS });
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const currentColors = draft.colors || DEFAULT_GRAINIENT_SETTINGS.colors!;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#111319] border border-gray-200 dark:border-[#1e2029] rounded-2xl shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#1e2029] shrink-0 bg-gray-50/60 dark:bg-[#141620]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1d28] border border-gray-200 dark:border-[#252836] flex items-center justify-center text-gray-700 dark:text-gray-300">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Customize Grainient Effect</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fine-tune colors, flow physics, smoothness, and analog grain texture.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: Split View (Preview on Top/Left, Controls on Right/Bottom) */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
            {/* Live Preview Panel */}
            <div className="lg:w-2/5 flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Live Preview
                </span>
                <span className="text-[11px] font-mono text-gray-400 capitalize">
                  {draft.type} • {draft.angle}°
                </span>
              </div>

              <div className="relative w-full aspect-video lg:h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-[#1e2029] shadow-inner bg-black">
                <Grainient
                  colors={draft.colors}
                  type={draft.type}
                  angle={draft.angle}
                  bands={draft.bands}
                  speed={draft.speed}
                  flow={draft.flow}
                  scale={draft.scale}
                  softness={draft.softness}
                  silk={draft.silk}
                  grainAmount={draft.grainAmount}
                  grainSize={draft.grainSize}
                  grainAnimated={draft.grainAnimated}
                  contrast={draft.contrast}
                  saturation={draft.saturation}
                  variation={draft.variation}
                  interactive={true}
                  intro={false}
                  lightMode={!isDark}
                  className="w-full h-full"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md text-[10px] font-mono text-white/80 border border-white/10 select-none pointer-events-none">
                  Interactive Canvas
                </div>
              </div>

              {/* Quick Presets */}
              <div className="mt-1">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 block mb-1.5">
                  Curated Presets
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {GRAINIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setDraft({ ...preset.settings })}
                      className="px-2.5 py-1.5 rounded-lg text-left text-xs bg-gray-50 dark:bg-[#141620] hover:bg-gray-100 dark:hover:bg-[#1c202d] border border-gray-200 dark:border-[#1e2029] transition-all cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{preset.name}</span>
                      <div className="flex items-center -space-x-1 shrink-0 ml-1.5">
                        {preset.settings.colors?.slice(0, 3).map((c, i) => (
                          <div
                            key={i}
                            className="w-2.5 h-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Controls Settings Panel */}
            <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
              {/* Palette Section */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-gray-50/70 dark:bg-[#141620] border border-gray-200/80 dark:border-[#1e2029]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" /> Color Palette ({currentColors.length}/8)
                  </span>
                  {currentColors.length < 8 && (
                    <button
                      type="button"
                      onClick={handleAddColor}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white bg-white dark:bg-[#1b1e2b] border border-gray-200 dark:border-[#252836] cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Color
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {currentColors.map((col, idx) => (
                    <div
                      key={idx}
                      className="group relative flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-white dark:bg-[#191c28] border border-gray-200 dark:border-[#252836] shadow-xs"
                    >
                      <label className="relative w-5 h-5 rounded-md overflow-hidden cursor-pointer shrink-0 border border-black/10">
                        <input
                          type="color"
                          value={col}
                          onChange={(e) => handleColorChange(idx, e.target.value)}
                          className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                        />
                        <div className="w-full h-full" style={{ backgroundColor: col }} />
                      </label>
                      <span className="font-mono text-[11px] uppercase text-gray-700 dark:text-gray-300">
                        {col}
                      </span>
                      {currentColors.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveColor(idx)}
                          className="ml-0.5 text-gray-400 hover:text-red-500 cursor-pointer border-none bg-transparent p-0"
                          title="Remove color"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Geometry & Wave Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Gradient Geometry
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-gray-100 dark:bg-[#141620] border border-gray-200 dark:border-[#1e2029]">
                    <button
                      type="button"
                      onClick={() => updateField('type', 'linear')}
                      className={`py-1 text-xs font-medium rounded-md transition-all cursor-pointer border-none ${
                        draft.type === 'linear'
                          ? 'bg-white dark:bg-[#252836] text-gray-900 dark:text-white shadow-xs font-semibold'
                          : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 bg-transparent'
                      }`}
                    >
                      Linear Waves
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('type', 'radial')}
                      className={`py-1 text-xs font-medium rounded-md transition-all cursor-pointer border-none ${
                        draft.type === 'radial'
                          ? 'bg-white dark:bg-[#252836] text-gray-900 dark:text-white shadow-xs font-semibold'
                          : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 bg-transparent'
                      }`}
                    >
                      Radial Ripple
                    </button>
                  </div>
                </div>

                {/* Angle Slider */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Wave Angle
                    </label>
                    <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">
                      {draft.angle}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={draft.angle ?? 55}
                    onChange={(e) => updateField('angle', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-[#252836] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                  />
                </div>
              </div>

              {/* Sliders Grid: Flow, Speed, Smoothness, Silk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Smoothness / Softness */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Smoothness (Softness)
                    </label>
                    <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">
                      {Math.round((draft.softness ?? 0.7) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={draft.softness ?? 0.7}
                    onChange={(e) => updateField('softness', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-[#252836] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                  />
                </div>

                {/* Flow Distortion */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Flow Distortion
                    </label>
                    <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">
                      {(draft.flow ?? 0.8).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.05"
                    value={draft.flow ?? 0.8}
                    onChange={(e) => updateField('flow', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-[#252836] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                  />
                </div>

                {/* Animation Speed */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Animation Speed
                    </label>
                    <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">
                      {(draft.speed ?? 1).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.05"
                    value={draft.speed ?? 1}
                    onChange={(e) => updateField('speed', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-[#252836] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                  />
                </div>

                {/* Silk Sheen */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Specular Silk Sheen
                    </label>
                    <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">
                      {Math.round((draft.silk ?? 0.35) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={draft.silk ?? 0.35}
                    onChange={(e) => updateField('silk', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-[#252836] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                  />
                </div>
              </div>

              {/* Grain & Texture */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100 dark:border-[#1e2029]/80">
                {/* Grain Amount */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Grain Amount
                    </label>
                    <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">
                      {Math.round((draft.grainAmount ?? 0.08) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.4"
                    step="0.01"
                    value={draft.grainAmount ?? 0.08}
                    onChange={(e) => updateField('grainAmount', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-[#252836] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                  />
                </div>

                {/* Grain Size */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Grain Size
                    </label>
                    <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">
                      {(draft.grainSize ?? 1.2).toFixed(1)}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.5"
                    step="0.1"
                    value={draft.grainSize ?? 1.2}
                    onChange={(e) => updateField('grainSize', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-[#252836] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                  />
                </div>

                {/* Animated Grain Toggle */}
                <div className="flex items-center justify-between pt-3">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer" onClick={() => updateField('grainAnimated', !draft.grainAnimated)}>
                    Animate Grain
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.grainAnimated !== false}
                    onClick={() => updateField('grainAnimated', draft.grainAnimated === false)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0.5 transition-colors duration-200 ${
                      draft.grainAnimated !== false ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black shadow-xs transition-transform duration-200 ${
                        draft.grainAnimated !== false ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Color Grading: Contrast & Saturation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-[#1e2029]/80">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Contrast
                    </label>
                    <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">
                      {(draft.contrast ?? 1).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="1.8"
                    step="0.05"
                    value={draft.contrast ?? 1}
                    onChange={(e) => updateField('contrast', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-[#252836] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Saturation
                    </label>
                    <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">
                      {(draft.saturation ?? 1).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={draft.saturation ?? 1}
                    onChange={(e) => updateField('saturation', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-[#252836] rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bar: Reset, Cancel, Save */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 dark:border-[#1e2029] bg-gray-50/70 dark:bg-[#141620]/70 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-black hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer border-none shadow-sm"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Save & Apply
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GrainientCustomizerModal;
