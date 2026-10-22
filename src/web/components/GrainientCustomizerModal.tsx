import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Check, Plus, Minus } from 'lucide-react';
import Grainient from './tabs/Grainient';
import GlideSelect, { GlideSelectOption } from './tabs/GlideSelect';
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

export const PRESET_OPTIONS: { name: string; settings: Partial<GrainientCustomSettings> }[] = [
  {
    name: 'Ember',
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
    },
  },
  {
    name: 'Deep Blue',
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
    },
  },
  {
    name: 'Sunset',
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
    },
  },
  {
    name: 'Aurora',
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
    },
  },
  {
    name: 'Cyber',
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
    },
  },
  {
    name: 'Slate Void',
    settings: {
      colors: ['#090a0f', '#12141c', '#1e212d', '#323749', '#64748b'],
      type: 'linear',
      angle: 45,
      bands: 1,
      speed: 0.7,
      flow: 0.6,
      scale: 1.2,
      softness: 0.9,
      silk: 0.3,
      grainAmount: 0.07,
      grainSize: 1.2,
      grainAnimated: true,
      contrast: 1.0,
      saturation: 0.9,
    },
  },
];

const PRESET_SELECT_OPTIONS: GlideSelectOption[] = PRESET_OPTIONS.map((p) => ({
  value: p.name,
  label: p.name,
}));

const TYPE_SELECT_OPTIONS: GlideSelectOption[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
];

interface ScrubberControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

const ScrubberControl: React.FC<ScrubberControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  format,
  onChange,
}) => {
  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const displayVal = format ? format(value) : `${value}${unit}`;

  return (
    <div className="group relative flex items-center justify-between px-3 h-10 rounded-xl bg-[#161720] border border-[#232532] hover:border-[#2f3242] transition-colors select-none overflow-hidden">
      <span className="text-[11.5px] font-medium text-gray-400 shrink-0 z-10 pointer-events-none select-none">
        {label}
      </span>

      {/* Track with faint tick marks */}
      <div className="relative flex-1 mx-2.5 h-5 flex items-center">
        {/* Faint tick marks */}
        <div className="absolute inset-x-1 flex justify-between pointer-events-none opacity-15">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="w-[1px] h-2 bg-white rounded-full" />
          ))}
        </div>

        {/* Scrubber thumb bar */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-4 bg-white/70 group-hover:bg-white rounded-full shadow-xs pointer-events-none transition-transform active:scale-110"
          style={{ left: `${percent}%` }}
        />

        {/* Invisible Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={(e) => (e.target as HTMLElement).blur()}
          className="w-full h-full opacity-0 cursor-ew-resize relative z-20 m-0 p-0"
        />
      </div>

      <span className="font-mono text-xs font-bold text-white text-right shrink-0 z-10 pointer-events-none min-w-[32px]">
        {displayVal}
      </span>
    </div>
  );
};

interface ToggleControlProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleControl: React.FC<ToggleControlProps> = ({ label, checked, onChange }) => {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between px-3 h-10 rounded-xl bg-[#161720] border border-[#232532] hover:border-[#2f3242] transition-colors cursor-pointer select-none"
    >
      <span className="text-[11.5px] font-medium text-gray-400 select-none">{label}</span>
      <div
        className={`relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full transition-colors duration-200 p-0.5 ${
          checked ? 'bg-[#d1d5db]' : 'bg-[#252837]'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${
            checked ? 'translate-x-3.5 bg-[#161720]' : 'translate-x-0 bg-[#6b7280]'
          }`}
        />
      </div>
    </div>
  );
};

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

  const [activePreset, setActivePreset] = useState<string>('Ember');

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

  const handleRemoveColor = () => {
    const list = [...(draft.colors || DEFAULT_GRAINIENT_SETTINGS.colors!)];
    if (list.length <= 2) return;
    list.pop();
    updateField('colors', list);
  };

  const handleApplyPreset = (presetName: string) => {
    setActivePreset(presetName);
    const found = PRESET_OPTIONS.find((p) => p.name === presetName);
    if (found) {
      setDraft((prev) => ({ ...prev, ...found.settings }));
    }
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_GRAINIENT_SETTINGS });
    setActivePreset('Ember');
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const currentColors = draft.colors || DEFAULT_GRAINIENT_SETTINGS.colors!;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-6xl h-[90vh] max-h-[820px] flex flex-col bg-[#0e0f14] border border-[#1f212c] rounded-2xl shadow-2xl overflow-hidden text-gray-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#1f212c] shrink-0 bg-[#12131a]">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Customize</h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: ALWAYS Side-by-Side: Left Side Big Preview, Right Side Settings in Image 2 Design */}
          <div className="flex-1 flex flex-row min-h-0 overflow-hidden p-4 md:p-5 gap-4 md:gap-5">
            {/* Left Side: Big Live Preview Window */}
            <div className="flex-1 min-w-0 h-full flex flex-col rounded-2xl overflow-hidden border border-[#232534] bg-black shadow-2xl relative">
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
            </div>

            {/* Right Side: Exact Settings in the Design of Second Image */}
            <div className="w-[430px] shrink-0 h-full min-h-0 flex flex-col overflow-y-auto overflow-x-hidden pr-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/25">
              <div className="grid grid-cols-2 gap-2 pb-6">
                {/* Colors Card (Full Width) */}
                <div className="flex flex-col justify-between px-3.5 py-2.5 rounded-xl bg-[#161720] border border-[#232532] col-span-2 gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-medium text-gray-400">Colors</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleRemoveColor}
                        disabled={currentColors.length <= 2}
                        className="w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer border-none bg-transparent"
                        title="Remove last color"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleAddColor}
                        disabled={currentColors.length >= 8}
                        className="w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-white disabled:opacity-30 transition-colors cursor-pointer border-none bg-transparent"
                        title="Add color"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 overflow-x-auto py-0.5">
                    {currentColors.map((col, idx) => (
                      <label
                        key={idx}
                        className="relative w-8 h-8 rounded-lg cursor-pointer shrink-0 transition-transform hover:scale-105 active:scale-95 shadow-sm border border-white/10 overflow-hidden"
                      >
                        <input
                          type="color"
                          value={col}
                          onChange={(e) => handleColorChange(idx, e.target.value)}
                          className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                        />
                        <div className="w-full h-full" style={{ backgroundColor: col }} />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preset Dropdown Card */}
                <div className="relative z-30 flex items-center justify-between px-3 h-10 rounded-xl bg-[#161720] border border-[#232532] hover:border-[#2f3242] transition-colors select-none">
                  <span className="text-[11.5px] font-medium text-gray-400 select-none shrink-0 pointer-events-none">
                    Preset
                  </span>
                  <GlideSelect
                    options={PRESET_SELECT_OPTIONS}
                    value={activePreset}
                    onChange={(val) => handleApplyPreset(val)}
                    size="sm"
                    radius={10}
                    menuWidth={160}
                    placement="bottom"
                    align="right"
                    surfaceColor="#161720"
                    highlightColor="#232532"
                    textColor="#ffffff"
                    accentColor="#ffffff"
                    className="[&>button]:bg-transparent [&>button]:hover:bg-white/5 [&>button]:border-none [&>button]:px-1.5 [&>button]:h-7 text-xs font-medium"
                  />
                </div>

                {/* Type Dropdown Card */}
                <div className="relative z-30 flex items-center justify-between px-3 h-10 rounded-xl bg-[#161720] border border-[#232532] hover:border-[#2f3242] transition-colors select-none">
                  <span className="text-[11.5px] font-medium text-gray-400 select-none shrink-0 pointer-events-none">
                    Type
                  </span>
                  <GlideSelect
                    options={TYPE_SELECT_OPTIONS}
                    value={draft.type || 'linear'}
                    onChange={(val) => updateField('type', val as 'linear' | 'radial')}
                    size="sm"
                    radius={10}
                    menuWidth={140}
                    placement="bottom"
                    align="right"
                    surfaceColor="#161720"
                    highlightColor="#232532"
                    textColor="#ffffff"
                    accentColor="#ffffff"
                    className="[&>button]:bg-transparent [&>button]:hover:bg-white/5 [&>button]:border-none [&>button]:px-1.5 [&>button]:h-7 text-xs font-medium"
                  />
                </div>

                {/* Angle Slider */}
                <ScrubberControl
                  label="Angle"
                  value={draft.angle ?? 55}
                  min={0}
                  max={360}
                  step={5}
                  unit="°"
                  onChange={(v) => updateField('angle', v)}
                />

                {/* Bands Slider */}
                <ScrubberControl
                  label="Bands"
                  value={draft.bands ?? 1}
                  min={1}
                  max={8}
                  step={1}
                  onChange={(v) => updateField('bands', v)}
                />

                {/* Softness Slider */}
                <ScrubberControl
                  label="Softness"
                  value={draft.softness ?? 0.7}
                  min={0}
                  max={1}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => updateField('softness', v)}
                />

                {/* Flow Slider */}
                <ScrubberControl
                  label="Flow"
                  value={draft.flow ?? 0.8}
                  min={0}
                  max={2.5}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => updateField('flow', v)}
                />

                {/* Scale Slider */}
                <ScrubberControl
                  label="Scale"
                  value={draft.scale ?? 1}
                  min={0.25}
                  max={2.5}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => updateField('scale', v)}
                />

                {/* Speed Slider */}
                <ScrubberControl
                  label="Speed"
                  value={draft.speed ?? 1}
                  min={0}
                  max={2.5}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => updateField('speed', v)}
                />

                {/* Silk Slider */}
                <ScrubberControl
                  label="Silk"
                  value={draft.silk ?? 0.35}
                  min={0}
                  max={1}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => updateField('silk', v)}
                />

                {/* Grain Amount Slider */}
                <ScrubberControl
                  label="Grain Amount"
                  value={draft.grainAmount ?? 0.08}
                  min={0}
                  max={0.35}
                  step={0.01}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => updateField('grainAmount', v)}
                />

                {/* Grain Size Slider */}
                <ScrubberControl
                  label="Grain Size"
                  value={draft.grainSize ?? 1.2}
                  min={0.5}
                  max={3.5}
                  step={0.1}
                  unit="px"
                  format={(v) => `${v.toFixed(1)}px`}
                  onChange={(v) => updateField('grainSize', v)}
                />

                {/* Contrast Slider */}
                <ScrubberControl
                  label="Contrast"
                  value={draft.contrast ?? 1}
                  min={0.4}
                  max={1.8}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => updateField('contrast', v)}
                />

                {/* Saturation Slider */}
                <ScrubberControl
                  label="Saturation"
                  value={draft.saturation ?? 1}
                  min={0}
                  max={2}
                  step={0.05}
                  format={(v) => v.toFixed(2)}
                  onChange={(v) => updateField('saturation', v)}
                />

                {/* Variation Slider */}
                <ScrubberControl
                  label="Variation"
                  value={draft.variation ?? 0}
                  min={0}
                  max={8}
                  step={1}
                  onChange={(v) => updateField('variation', v)}
                />

                {/* Animated Grain Toggle */}
                <ToggleControl
                  label="Animated Grain"
                  checked={draft.grainAnimated !== false}
                  onChange={(v) => updateField('grainAnimated', v)}
                />
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#1f212c] bg-[#12131a] shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold text-black bg-white hover:bg-gray-100 active:scale-[0.98] transition-all cursor-pointer border-none shadow-sm"
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
