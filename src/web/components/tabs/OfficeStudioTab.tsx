import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowUp,
  Square,
  Download,
  RefreshCw,
  Trash2,
  AlertCircle,
  Check,
  Copy,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';
import SpecularButton from '../../../effects/SpecularButton';
import GlideSelect, { GlideSelectOption } from './GlideSelect';
import WarmTooltip from '../WarmTooltip';
import Threads from './Threads';
import grokkiIcon from '../../assets/grokki_icon.svg';
import grokkiLogo from '../../assets/grokki_logo.png';

interface OfficeStudioTabProps {
  config: JarvisConfig;
}

export type DocFormat =
  | 'pptx'
  | 'docx'
  | 'xlsx'
  | 'pdf'
  | 'csv'
  | 'md'
  | 'tex';

interface GeneratedOfficeItem {
  id: string;
  prompt: string;
  docType: DocFormat;
  theme: string;
  blueprint: string;
  fileName?: string;
  filePath?: string;
  base64Data?: string;
  textPreview?: string;
  structuredData?: any;
  timestamp: string;
  error?: string;
  loading?: boolean;
}

const STORAGE_KEY = 'grokki_office_studio_history_v2';

// Clean monochrome SVG icons for each format
const FormatIconSvg: React.FC<{ format: DocFormat; className?: string }> = ({
  format,
  className = 'w-5 h-5',
}) => {
  switch (format) {
    case 'pptx':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8" />
          <path d="M12 16v4" />
          <path d="m7 11 3-3 2 2 4-4" />
        </svg>
      );
    case 'docx':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      );
    case 'xlsx':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M3 15h18" />
          <path d="M9 4v16" />
          <path d="M15 4v16" />
        </svg>
      );
    case 'pdf':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 15h6" />
          <path d="M9 11h3" />
        </svg>
      );
    case 'csv':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
          <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
        </svg>
      );
    case 'md':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M7 15V9l2.5 3L12 9v6" />
          <path d="M16 9v6" />
          <path d="m14 13 2 2 2-2" />
        </svg>
      );
    case 'tex':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 4H6l6 8-6 8h12" />
        </svg>
      );
  }
};

const FORMAT_ITEMS: Array<{
  id: DocFormat;
  label: string;
  ext: string;
  placeholder: string;
}> = [
  {
    id: 'pptx',
    label: 'Presentation',
    ext: '.pptx',
    placeholder: 'Describe a presentation deck (e.g. Series A AI pitch deck with metrics & roadmap)...',
  },
  {
    id: 'docx',
    label: 'Document',
    ext: '.docx',
    placeholder: 'Describe a Word document (e.g. Enterprise Master Services Agreement or Strategy Brief)...',
  },
  {
    id: 'xlsx',
    label: 'Spreadsheet',
    ext: '.xlsx',
    placeholder: 'Describe an Excel spreadsheet model (e.g. 4-Quarter SaaS P&L forecast with variance)...',
  },
  {
    id: 'pdf',
    label: 'PDF Report',
    ext: '.pdf',
    placeholder: 'Describe a print-ready PDF report (e.g. Executive security & architecture audit)...',
  },
  {
    id: 'csv',
    label: 'CSV Sheet',
    ext: '.csv',
    placeholder: 'Describe a structured CSV dataset (e.g. Enterprise cohort retention & revenue table)...',
  },
  {
    id: 'md',
    label: 'Markdown',
    ext: '.md',
    placeholder: 'Describe a technical Markdown spec or documentation...',
  },
  {
    id: 'tex',
    label: 'LaTeX Paper',
    ext: '.tex',
    placeholder: 'Describe an academic research paper in LaTeX format...',
  },
];

const ThemeSwatchIcon: React.FC<{ color: string }> = ({ color }) => (
  <span
    className="inline-block w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
    style={{ backgroundColor: color }}
  />
);

const BlueprintDotIcon: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0 text-gray-500 dark:text-gray-400">
    <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
    <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
    <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const FORMAT_OPTIONS: GlideSelectOption[] = FORMAT_ITEMS.map((item) => ({
  value: item.id,
  label: `${item.label} (${item.ext})`,
  icon: <FormatIconSvg format={item.id} className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />,
}));

const THEME_OPTIONS: Array<GlideSelectOption & { accent: string; bg: string }> = [
  {
    value: 'midnight',
    label: 'Midnight Dark',
    accent: '#10b981',
    bg: '#0f172a',
    icon: <ThemeSwatchIcon color="#334155" />,
  },
  {
    value: 'emerald',
    label: 'Emerald Growth',
    accent: '#10b981',
    bg: '#064e3b',
    icon: <ThemeSwatchIcon color="#10b981" />,
  },
  {
    value: 'slate',
    label: 'Tech Slate',
    accent: '#3b82f6',
    bg: '#1e293b',
    icon: <ThemeSwatchIcon color="#64748b" />,
  },
  {
    value: 'editorial',
    label: 'Warm Editorial',
    accent: '#e11d48',
    bg: '#881337',
    icon: <ThemeSwatchIcon color="#a1a1aa" />,
  },
  {
    value: 'navy',
    label: 'Executive Navy',
    accent: '#0ea5e9',
    bg: '#0c4a6e',
    icon: <ThemeSwatchIcon color="#475569" />,
  },
  {
    value: 'mono',
    label: 'Minimal Mono',
    accent: '#71717a',
    bg: '#18181b',
    icon: <ThemeSwatchIcon color="#71717a" />,
  },
];

const BLUEPRINT_OPTIONS: GlideSelectOption[] = [
  { value: 'auto', label: 'Auto Blueprint', icon: <BlueprintDotIcon /> },
  { value: 'pitch', label: 'Startup Pitch Deck', icon: <BlueprintDotIcon /> },
  { value: 'financial', label: 'Financial Model & P&L', icon: <BlueprintDotIcon /> },
  { value: 'contract', label: 'Master Legal Contract', icon: <BlueprintDotIcon /> },
  { value: 'invoice', label: 'Commercial Invoice', icon: <BlueprintDotIcon /> },
  { value: 'resume', label: 'Executive Resume / CV', icon: <BlueprintDotIcon /> },
  { value: 'whitepaper', label: 'Technical Whitepaper', icon: <BlueprintDotIcon /> },
  { value: 'research', label: 'Academic Research Paper', icon: <BlueprintDotIcon /> },
];

export const OfficeStudioTab: React.FC<OfficeStudioTabProps> = ({ config }) => {
  const [inputValue, setInputValue] = useState('');
  const [docType, setDocType] = useState<DocFormat>('pptx');
  const [theme, setTheme] = useState<string>('midnight');
  const [blueprint, setBlueprint] = useState<string>('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSlideMap, setActiveSlideMap] = useState<Record<string, number>>({});

  const [generations, setGenerations] = useState<GeneratedOfficeItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const saveGenerations = (items: GeneratedOfficeItem[]) => {
    setGenerations(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-20)));
    } catch {}
  };

  useEffect(() => {
    if (generations.length > 0) {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [generations.length]);

  const handleGenerate = async (
    overridePrompt?: string,
    overrideFormat?: DocFormat,
    overrideTheme?: string,
    overrideBlueprint?: string
  ) => {
    const promptToUse = (overridePrompt ?? inputValue).trim();
    if (!promptToUse || isGenerating) return;

    const formatToUse = overrideFormat ?? docType;
    const themeToUse = overrideTheme ?? theme;
    const blueprintToUse = overrideBlueprint ?? blueprint;

    if (!overridePrompt) setInputValue('');
    setIsGenerating(true);

    const tempId = `office_${Date.now()}`;
    const placeholder: GeneratedOfficeItem = {
      id: tempId,
      prompt: promptToUse,
      docType: formatToUse,
      theme: themeToUse,
      blueprint: blueprintToUse,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      loading: true,
    };

    const updated = [...generations, placeholder];
    saveGenerations(updated);

    try {
      const res = await window.jarvisAPI?.generateOfficeDoc?.({
        prompt: promptToUse,
        docType: formatToUse,
        theme: themeToUse,
        blueprint: blueprintToUse,
      });

      if (!res || !res.success) {
        throw new Error(res?.error || 'Failed to compile document.');
      }

      saveGenerations(
        updated.map((g) =>
          g.id === tempId
            ? {
                ...g,
                loading: false,
                fileName: res.fileName,
                filePath: res.filePath,
                base64Data: res.base64Data,
                textPreview: res.textPreview,
                structuredData: res.structuredData,
              }
            : g
        )
      );
    } catch (err: any) {
      saveGenerations(
        updated.map((g) =>
          g.id === tempId
            ? {
                ...g,
                loading: false,
                error: err?.message || 'Document synthesis failed.',
              }
            : g
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenFile = async (filePath?: string) => {
    if (!filePath) return;
    await window.jarvisAPI?.openOfficeFile?.(filePath);
  };

  const handleSaveAs = async (item: GeneratedOfficeItem) => {
    const defaultName = item.fileName || `grokki_document_${item.id}.${item.docType}`;
    if (window.jarvisAPI?.saveOfficeFile) {
      await window.jarvisAPI.saveOfficeFile({
        base64Data: item.base64Data,
        filePath: item.filePath,
        defaultName,
      });
      return;
    }
    if (item.base64Data) {
      const a = document.createElement('a');
      a.href = `data:application/octet-stream;base64,${item.base64Data}`;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleCopyContent = (item: GeneratedOfficeItem) => {
    const text =
      item.textPreview ||
      (item.structuredData ? JSON.stringify(item.structuredData, null, 2) : item.prompt);
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const activeFormatMeta =
    FORMAT_ITEMS.find((f) => f.id === docType) || FORMAT_ITEMS[0];

  const getGlideProps = (placement: 'top' | 'bottom' = 'bottom') => ({
    size: 'sm' as const,
    radius: 8,
    surfaceColor: isDark ? '#1a1c24' : '#f3f4f6',
    highlightColor: isDark ? '#272a38' : '#e5e7eb',
    textColor: isDark ? '#f3f4f6' : '#111827',
    accentColor: isDark ? '#e5e7eb' : '#111827',
    placement,
    align: 'left' as const,
    menuWidth: 225,
  });

  const renderActionFooter = (item: GeneratedOfficeItem) => (
    <div className="px-4 py-2.5 bg-gray-50/90 dark:bg-[#16171d] border-t border-gray-200/80 dark:border-white/[0.07] flex items-center justify-between gap-2 flex-wrap">
      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-[220px]">
        {item.fileName || `document.${item.docType}`}
      </span>

      <div className="flex items-center gap-1.5">
        {item.filePath && (
          <button
            type="button"
            onClick={() => handleOpenFile(item.filePath)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open File</span>
          </button>
        )}

        <WarmTooltip content="Save As / Download" side="top">
          <button
            type="button"
            onClick={() => handleSaveAs(item)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save As</span>
          </button>
        </WarmTooltip>

        <WarmTooltip content={copiedId === item.id ? 'Copied' : 'Copy structure'} side="top">
          <button
            type="button"
            onClick={() => handleCopyContent(item)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            {copiedId === item.id ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </WarmTooltip>

        <WarmTooltip content="Regenerate" side="top">
          <button
            type="button"
            onClick={() =>
              handleGenerate(item.prompt, item.docType, item.theme, item.blueprint)
            }
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </WarmTooltip>
      </div>
    </div>
  );

  // Interactive preview renderer per document type
  const renderArtifactPreview = (item: GeneratedOfficeItem) => {
    const data = item.structuredData || {};
    const themeMeta = THEME_OPTIONS.find((t) => t.value === item.theme) || THEME_OPTIONS[0];

    // 1. PowerPoint Interactive Slide Deck Preview
    if (item.docType === 'pptx' && Array.isArray(data.slides) && data.slides.length > 0) {
      const slides = data.slides;
      const currentIdx = Math.min(activeSlideMap[item.id] ?? 0, slides.length - 1);
      const slide = slides[currentIdx] || slides[0];

      return (
        <div className="w-full max-w-[560px] rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#111217] shadow-lg">
          <div
            className="relative aspect-[16/9] w-full p-6 flex flex-col justify-between overflow-hidden select-none"
            style={{
              background:
                item.theme === 'midnight'
                  ? 'linear-gradient(135deg, #0b0f19 0%, #151c2e 100%)'
                  : item.theme === 'emerald'
                  ? 'linear-gradient(135deg, #052e24 0%, #064e3b 100%)'
                  : item.theme === 'navy'
                  ? 'linear-gradient(135deg, #082f49 0%, #0c4a6e 100%)'
                  : item.theme === 'editorial'
                  ? 'linear-gradient(135deg, #4c0519 0%, #881337 100%)'
                  : '#18181b',
              color: '#f8fafc',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: themeMeta.accent }}
            />

            <div className="flex items-center justify-between gap-2 z-10">
              <span
                className="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${themeMeta.accent}33`,
                  color: '#ffffff',
                  border: `1px solid ${themeMeta.accent}66`,
                }}
              >
                {slide.tag || data.category || 'SLIDE'}
              </span>
              <span className="text-[10.5px] font-mono text-white/50">
                {currentIdx + 1} / {slides.length}
              </span>
            </div>

            <div className="my-auto py-2 z-10">
              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug mb-1.5 line-clamp-2">
                {slide.title || data.title}
              </h3>
              {slide.subtitle && (
                <p className="text-[11.5px] text-white/70 leading-relaxed line-clamp-2 mb-3">
                  {slide.subtitle}
                </p>
              )}

              {Array.isArray(slide.metrics) && slide.metrics.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 mt-2">
                  {slide.metrics.slice(0, 3).map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg p-2.5 bg-white/[0.06] border border-white/10 backdrop-blur-xs"
                    >
                      <div
                        className="text-base sm:text-lg font-extrabold tracking-tight"
                        style={{ color: themeMeta.accent }}
                      >
                        {m.value}
                      </div>
                      <div className="text-[10px] font-semibold text-white/90 truncate mt-0.5">
                        {m.label}
                      </div>
                      <div className="text-[9px] text-white/55 line-clamp-2 mt-0.5">
                        {m.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Flowchart / Process Diagram Slide */}
              {(slide.type === 'flowchart' || Array.isArray(slide.steps)) &&
                Array.isArray(slide.steps) &&
                slide.steps.length > 0 && (
                  <div className="flex items-stretch gap-1.5 mt-2">
                    {slide.steps.slice(0, 4).map((st: any, idx: number) => (
                      <React.Fragment key={idx}>
                        <div className="flex-1 min-w-0 rounded-lg p-2 bg-white/[0.06] border border-white/10 flex flex-col justify-between">
                          <div>
                            <span
                              className="inline-block text-[8px] font-bold uppercase px-1.5 py-0.5 rounded mb-1 text-white"
                              style={{ backgroundColor: themeMeta.accent }}
                            >
                              Step {idx + 1}
                            </span>
                            <div className="text-[10.5px] font-bold text-white leading-tight line-clamp-1">
                              {st.title || st.label}
                            </div>
                            <div className="text-[9px] text-white/65 line-clamp-2 mt-0.5 leading-snug">
                              {st.description}
                            </div>
                          </div>
                        </div>
                        {idx < Math.min(slide.steps.length, 4) - 1 && (
                          <div className="flex items-center text-white/40 text-xs font-bold shrink-0">
                            →
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

              {/* Bar Chart Slide */}
              {slide.chart &&
                Array.isArray(slide.chart.labels) &&
                Array.isArray(slide.chart.values) && (
                  <div className="grid grid-cols-12 gap-3 mt-2 items-center">
                    <div className="col-span-7 rounded-lg p-2.5 bg-white/[0.05] border border-white/10 space-y-1.5">
                      {(() => {
                        const vals = slide.chart.values.map((v: any) => Number(v) || 0);
                        const maxV = Math.max(...vals, 1);
                        return slide.chart.labels.slice(0, 4).map((lbl: string, idx: number) => {
                          const v = vals[idx] ?? 0;
                          const pct = Math.max(8, Math.round((v / maxV) * 100));
                          return (
                            <div key={idx} className="space-y-0.5">
                              <div className="flex justify-between text-[9.5px] text-white/80 font-medium">
                                <span className="truncate">{lbl}</span>
                                <span className="font-mono">{v.toLocaleString()}</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: themeMeta.accent,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    {!slide.chart && Array.isArray(slide.bullets) && slide.bullets.length > 0 && (
                      <ul className="col-span-5 space-y-1">
                        {slide.bullets.slice(0, 3).map((b: string, idx: number) => (
                          <li
                            key={idx}
                            className="text-[9.5px] text-white/80 leading-snug flex items-start gap-1.5"
                          >
                            <span
                              className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                              style={{ backgroundColor: themeMeta.accent }}
                            />
                            <span className="line-clamp-2">{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

              {Array.isArray(slide.cards) && slide.cards.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {slide.cards.slice(0, 3).map((c: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg p-2.5 bg-white/[0.06] border border-white/10"
                    >
                      <div className="text-[11px] font-bold text-white truncate mb-1">
                        {c.title}
                      </div>
                      <div className="text-[9.5px] text-white/65 line-clamp-3 leading-snug">
                        {c.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!slide.chart && Array.isArray(slide.bullets) && slide.bullets.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {slide.bullets.slice(0, 4).map((b: string, idx: number) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-[11px] text-white/85 leading-snug"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: themeMeta.accent }}
                      />
                      <span className="line-clamp-1">{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 z-10">
              <div className="flex items-center gap-1">
                {slides.map((_: any, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveSlideMap((prev) => ({ ...prev, [item.id]: i }))}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === currentIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() =>
                    setActiveSlideMap((prev) => ({
                      ...prev,
                      [item.id]: Math.max(0, currentIdx - 1),
                    }))
                  }
                  className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentIdx >= slides.length - 1}
                  onClick={() =>
                    setActiveSlideMap((prev) => ({
                      ...prev,
                      [item.id]: Math.min(slides.length - 1, currentIdx + 1),
                    }))
                  }
                  className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {renderActionFooter(item)}
        </div>
      );
    }

    // 2. Excel / CSV Interactive Data Grid Preview
    if (
      (item.docType === 'xlsx' || item.docType === 'csv') &&
      Array.isArray(data.headers) &&
      Array.isArray(data.rows)
    ) {
      const headers: string[] = data.headers;
      const rows: any[][] = data.rows;

      return (
        <div className="w-full max-w-[600px] rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#111217] shadow-lg">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.07] flex items-center justify-between gap-2 bg-gray-50/70 dark:bg-white/[0.02]">
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-gray-900 dark:text-white truncate">
                {data.title || 'Financial & Operational Model'}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {data.sheetName || 'Sheet1'} • {rows.length} rows × {headers.length} columns
              </div>
            </div>
            <FormatIconSvg format={item.docType} className="w-4 h-4 text-gray-400" />
          </div>

          <div className="overflow-x-auto max-h-[260px]">
            <table className="w-full text-left border-collapse text-[11.5px]">
              <thead>
                <tr
                  style={{ backgroundColor: themeMeta.bg, color: '#ffffff' }}
                  className="border-b border-white/10"
                >
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className={`py-2 px-3 font-semibold whitespace-nowrap ${
                        i > 0 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/70 dark:divide-white/[0.06]">
                {rows.slice(0, 8).map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    {row.map((cell, cIdx) => {
                      const isNum = typeof cell === 'number';
                      const isPct =
                        isNum &&
                        Math.abs(cell) <= 1 &&
                        (headers[cIdx] || '').toLowerCase().includes('growth');
                      const formatted = isPct
                        ? `${(cell * 100).toFixed(1)}%`
                        : isNum
                        ? cell.toLocaleString()
                        : String(cell ?? '');
                      return (
                        <td
                          key={cIdx}
                          className={`py-1.5 px-3 whitespace-nowrap ${
                            cIdx === 0
                              ? 'font-medium text-gray-800 dark:text-gray-200'
                              : 'text-right font-mono text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {renderActionFooter(item)}
        </div>
      );
    }

    // 3. LaTeX Source Preview
    if (item.docType === 'tex') {
      const codeText =
        item.textPreview || JSON.stringify(item.structuredData || {}, null, 2);
      return (
        <div className="w-full max-w-[580px] rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#111217] shadow-lg">
          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-white/[0.07] flex items-center justify-between bg-gray-50/70 dark:bg-white/[0.02]">
            <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 truncate">
              {item.fileName || `${data.title || 'document'}.${item.docType}`}
            </span>
            <FormatIconSvg format={item.docType} className="w-4 h-4 text-gray-400" />
          </div>
          <pre className="p-4 text-[11px] font-mono leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50/40 dark:bg-[#0b0c10] max-h-[240px] overflow-y-auto whitespace-pre-wrap">
            {codeText.slice(0, 1800)}
            {codeText.length > 1800 ? '\n...' : ''}
          </pre>
          {renderActionFooter(item)}
        </div>
      );
    }

    // 4. Document Paper Preview (.docx, .pdf, .md)
    const sections = Array.isArray(data.sections) ? data.sections : [];
    return (
      <div className="w-full max-w-[560px] rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#111217] shadow-lg">
        <div className="h-1.5 w-full" style={{ backgroundColor: themeMeta.accent }} />

        <div className="p-5 max-h-[290px] overflow-y-auto space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: themeMeta.accent }}
              >
                {data.category || item.docType.toUpperCase()}
              </span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug mt-0.5">
                {data.title || 'Executive Document'}
              </h3>
              {data.subtitle && (
                <p className="text-[11.5px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {data.subtitle}
                </p>
              )}
            </div>
            <FormatIconSvg format={item.docType} className="w-4 h-4 text-gray-400 shrink-0" />
          </div>

          {data.summary && (
            <div
              className="p-3 rounded-lg text-[11.5px] leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/[0.03] border-l-2"
              style={{ borderLeftColor: themeMeta.accent }}
            >
              {data.summary}
            </div>
          )}

          {/* KPI Scorecard Grid inside Document Preview */}
          {Array.isArray(data.metrics) && data.metrics.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {data.metrics.slice(0, 3).map((m: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200/70 dark:border-white/[0.07]"
                >
                  <div
                    className="text-sm font-extrabold"
                    style={{ color: themeMeta.accent }}
                  >
                    {m.value}
                  </div>
                  <div className="text-[10.5px] font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {m.label}
                  </div>
                  <div className="text-[9.5px] text-gray-500 dark:text-gray-400 line-clamp-1">
                    {m.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Visual Flowchart Diagram inside Document Preview */}
          {Array.isArray(data.flowchart) && data.flowchart.length > 0 && (
            <div className="pt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                Architecture & Process Flow
              </div>
              <div className="flex items-stretch gap-1">
                {data.flowchart.slice(0, 4).map((st: any, idx: number) => (
                  <React.Fragment key={idx}>
                    <div className="flex-1 min-w-0 p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/[0.08]">
                      <div
                        className="text-[9px] font-bold uppercase"
                        style={{ color: themeMeta.accent }}
                      >
                        {idx + 1}. {st.title || st.label}
                      </div>
                      <div className="text-[9.5px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-snug">
                        {st.description}
                      </div>
                    </div>
                    {idx < Math.min(data.flowchart.length, 4) - 1 && (
                      <div className="flex items-center text-gray-400 dark:text-gray-500 text-xs font-bold">
                        →
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {sections.slice(0, 3).map((sec: any, idx: number) => (
            <div key={idx} className="space-y-1 pt-1">
              <h4 className="text-[12.5px] font-bold text-gray-800 dark:text-gray-200">
                {sec.title}
              </h4>
              {sec.content && (
                <p className="text-[11.5px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                  {sec.content}
                </p>
              )}
              {Array.isArray(sec.bullets) && sec.bullets.length > 0 && (
                <ul className="pl-3 space-y-0.5">
                  {sec.bullets.slice(0, 3).map((b: string, bIdx: number) => (
                    <li
                      key={bIdx}
                      className="text-[11px] text-gray-600 dark:text-gray-400 list-disc"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {renderActionFooter(item)}
      </div>
    );
  };

  // Shared Composer Box Component
  const renderComposerBox = (dropdownPlacement: 'top' | 'bottom') => {
    const glideProps = getGlideProps(dropdownPlacement);
    return (
      <SpecularButton
        as="div"
        size="lg"
        radius={16}
        tint={isDark ? '#ffffff' : '#000000'}
        tintOpacity={0.03}
        textColor={isDark ? '#f5f5f5' : '#18181b'}
        lineColor={isDark ? '#ffffff' : '#18181b'}
        baseColor={isDark ? '#525252' : '#d4d4d8'}
        intensity={0.6}
        idleIntensity={0.15}
        shineSize={8}
        shineFade={34}
        thickness={1}
        glow={0}
        followMouse={false}
        autoAnimate={false}
        proximity={200}
        className="w-full bg-white dark:bg-[#121217] p-3.5 flex flex-col gap-2.5 text-left relative z-20 shadow-xl"
      >
        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            rows={Math.min(5, Math.max(2, inputValue.split('\n').length))}
            placeholder={activeFormatMeta.placeholder}
            autoFocus
            className="w-full min-h-[48px] bg-transparent resize-none border-none outline-none text-[14px] leading-relaxed text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 p-0 pr-6"
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                inputRef.current?.focus();
              }}
              title="Clear prompt"
              className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] text-xs transition-colors cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Bottom Controls Bar */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200/70 dark:border-white/[0.07]">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            {/* Format Selector */}
            <GlideSelect
              options={FORMAT_OPTIONS}
              value={docType}
              onChange={(v) => setDocType(v as DocFormat)}
              {...glideProps}
              menuWidth={210}
            />

            {/* Theme Selector */}
            <GlideSelect
              options={THEME_OPTIONS}
              value={theme}
              onChange={(v) => setTheme(v)}
              {...glideProps}
              menuWidth={195}
            />

            {/* Blueprint Selector */}
            <GlideSelect
              options={BLUEPRINT_OPTIONS}
              value={blueprint}
              onChange={(v) => setBlueprint(v)}
              {...glideProps}
              menuWidth={215}
            />
          </div>

          {/* Right: Clear history + Generate button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {generations.length > 0 && (
              <WarmTooltip content="Clear history" side="top">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear document history?')) saveGenerations([]);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </WarmTooltip>
            )}

            <button
              type="button"
              disabled={!inputValue.trim() || isGenerating}
              onClick={() => handleGenerate()}
              className={`h-7 px-3 flex items-center justify-center gap-1.5 rounded-md text-[12px] font-semibold transition-colors ${
                inputValue.trim() && !isGenerating
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-black hover:opacity-90 cursor-pointer'
                  : 'bg-gray-100 dark:bg-white/[0.07] text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              {isGenerating ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>Generating</span>
                </>
              ) : (
                <>
                  <span>Generate</span>
                  <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>
        </div>
      </SpecularButton>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#f7f7fa] dark:bg-[#070709] text-gray-900 dark:text-gray-100 overflow-hidden select-none">
      {/* Green Threads Background */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden z-0"
        style={{ width: '100%', height: '100%', position: 'absolute' }}
      >
        <Threads
          color="#10b981"
          lineCount={90}
          thickness={0.6}
          softness={1.3}
          amplitude={1.7}
          distance={0.4}
          waves={1.05}
          speed={0.6}
          split={0.04}
          fray={0.5}
          angle={25}
          taper={0.85}
          brightness={1.4}
          parting={0}
          enableMouseInteraction={false}
          fade={0}
          opacity={isDark ? 0.85 : 0.45}
          seed={0}
          className="w-full h-full"
        />
      </div>

      {generations.length === 0 ? (
        /* EMPTY STATE: Centered Hero + Middle Input + Clean Monochrome Circular Options Row Below */
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto relative z-20">
          {/* Big Grokki Studio Logo behind text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center -mb-28 sm:-mb-36 md:-mb-54 select-none pointer-events-none z-0"
          >
            <img
              src={grokkiLogo}
              alt="Grokki"
              draggable={false}
              className="w-44 h-44 sm:w-60 sm:h-60 md:w-84 md:h-84 -mt-10 object-contain filter brightness-0 dark:invert"
              style={{
                maskImage:
                  'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.02) 70%)',
                WebkitMaskImage:
                  'linear-gradient(to bottom, rgba(0, 0, 0, 1) 10%, rgba(0, 0, 0, 0.08) 100%)',
              }}
            />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.65, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-6xl sm:text-[4em] mb-8 font-normal text-gray-900 dark:text-white tracking-wide text-center"
            style={{
              fontFamily:
                "'Caveat', 'Dancing Script', 'Great Vibes', 'Brush Script MT', 'Segoe Script', cursive",
            }}
          >
            Grokki{' '}
            <span className="relative inline-block">
              <svg
                viewBox="0 0 320 96"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-2 -bottom-2 top-1 w-[calc(100%+16px)] h-[calc(100%+10px)] overflow-visible z-0"
              >
                <defs>
                  <filter
                    id="grokki-office-crayon-grain"
                    x="-15%"
                    y="-25%"
                    width="130%"
                    height="150%"
                  >
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.75 0.95"
                      numOctaves="4"
                      seed="19"
                      result="noise"
                    />
                    <feDisplacementMap
                      in="SourceGraphic"
                      in2="noise"
                      scale="4.2"
                      xChannelSelector="R"
                      yChannelSelector="G"
                    />
                  </filter>
                  <linearGradient id="grokki-office-crayon-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M 6 54 Q 158 44 314 51"
                  fill="none"
                  stroke="url(#grokki-office-crayon-grad)"
                  strokeWidth="36"
                  strokeLinecap="round"
                  filter="url(#grokki-office-crayon-grain)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: isDark ? 0.24 : 0.18 }}
                  transition={{ duration: 0.65, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.path
                  d="M 4 84 C 98 76, 214 75, 316 82"
                  fill="none"
                  stroke="url(#grokki-office-crayon-grad)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  filter="url(#grokki-office-crayon-grain)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.92 }}
                  transition={{ duration: 0.6, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.path
                  d="M 34 91 C 132 85, 226 86, 294 89"
                  fill="none"
                  stroke="url(#grokki-office-crayon-grad)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  filter="url(#grokki-office-crayon-grain)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.7 }}
                  transition={{ duration: 0.45, delay: 0.72, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
              <span className="relative z-10">Office Studio</span>
            </span>
          </motion.h1>

          {/* MIDDLE INPUT BOX */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[700px] mx-auto relative z-30"
          >
            {renderComposerBox('bottom')}
          </motion.div>

          {/* CLEAN MONOCHROME CIRCULAR OPTIONS ROW BELOW INPUT */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 w-full max-w-[720px] flex items-start justify-center gap-5 sm:gap-7 flex-wrap z-10"
          >
            {FORMAT_ITEMS.map((item) => {
              const isSelected = docType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setDocType(item.id);
                    inputRef.current?.focus();
                  }}
                  className="group flex flex-col items-center gap-2 min-w-[68px] cursor-pointer focus:outline-none"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md border ${
                      isSelected
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-gray-900 dark:border-white shadow-md scale-105'
                        : 'bg-white/80 dark:bg-[#13141a]/90 text-gray-600 dark:text-gray-300 border-gray-200/80 dark:border-white/[0.09] group-hover:border-gray-400 dark:group-hover:border-white/25 group-hover:text-gray-900 dark:group-hover:text-white group-hover:-translate-y-0.5'
                    }`}
                  >
                    <FormatIconSvg format={item.id} className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-center leading-tight">
                    <span
                      className={`text-[12px] transition-colors ${
                        isSelected
                          ? 'text-gray-900 dark:text-white font-semibold'
                          : 'text-gray-600 dark:text-gray-400 font-medium group-hover:text-gray-900 dark:group-hover:text-white'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[10.5px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">
                      {item.ext}
                    </span>
                  </div>
                </button>
              );
            })}
          </motion.div>
        </div>
      ) : (
        /* ACTIVE FEED VIEW WHEN DOCUMENTS ARE GENERATED */
        <>
          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 min-h-0 relative z-20 flex flex-col">
            <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
              {generations.map((item) => (
                <div key={item.id} className="flex flex-col gap-2.5 w-full">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="max-w-[75%] bg-white dark:bg-[#1a1a20] border border-gray-200 dark:border-white/[0.07] text-gray-800 dark:text-gray-100 px-3 py-2 rounded-lg text-[13px] leading-relaxed">
                      {item.prompt}
                    </div>
                  </div>

                  {/* Assistant response */}
                  <div className="flex items-start gap-2.5">
                    <img
                      src={grokkiIcon}
                      alt="Grokki"
                      className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 select-none"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">
                          Grokki
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          {item.timestamp}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase font-mono">
                          .{item.docType}
                        </span>
                      </div>

                      {item.error ? (
                        <div className="flex gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 max-w-sm">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-red-700 dark:text-red-400 mb-0.5">
                              Generation failed
                            </p>
                            <p className="text-[11px] text-red-600/75 dark:text-red-400/60 leading-relaxed">
                              {item.error}
                            </p>
                            <div className="flex gap-1.5 mt-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleGenerate(
                                    item.prompt,
                                    item.docType,
                                    item.theme,
                                    item.blueprint
                                  )
                                }
                                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" /> Retry
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : item.loading ? (
                        <div className="w-72 h-40 rounded-lg bg-gray-100 dark:bg-[#131317] border border-gray-200 dark:border-white/[0.06] flex flex-col items-center justify-center gap-2">
                          <div className="w-5 h-5 rounded-full border-[1.5px] border-gray-300 dark:border-white/20 border-t-emerald-500 animate-spin" />
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            Synthesizing .{item.docType} document…
                          </span>
                        </div>
                      ) : (
                        renderArtifactPreview(item)
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={feedEndRef} />
            </div>
          </div>

          {/* Bottom Composer when feed is active */}
          <div className="flex-shrink-0 px-5 sm:px-8 pt-2 pb-4 relative z-30">
            <div className="max-w-[680px] mx-auto">{renderComposerBox('top')}</div>
          </div>
        </>
      )}
    </div>
  );
};

export default OfficeStudioTab;
