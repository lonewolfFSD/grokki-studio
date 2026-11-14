import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowUp,
  Square,
  Download,
  ExternalLink,
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
  | 'html'
  | 'md'
  | 'tex'
  | 'json';

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

// Custom crisp SVG icons for each format in GlideSelect
const FormatBadgeIcon: React.FC<{ format: DocFormat }> = ({ format }) => {
  const meta: Record<DocFormat, { bg: string; fg: string; label: string }> = {
    pptx: { bg: '#f97316', fg: '#ffffff', label: 'P' },
    docx: { bg: '#3b82f6', fg: '#ffffff', label: 'W' },
    xlsx: { bg: '#10b981', fg: '#ffffff', label: 'X' },
    pdf: { bg: '#ef4444', fg: '#ffffff', label: 'PDF' },
    csv: { bg: '#14b8a6', fg: '#ffffff', label: 'CSV' },
    html: { bg: '#8b5cf6', fg: '#ffffff', label: '</>' },
    md: { bg: '#64748b', fg: '#ffffff', label: 'MD' },
    tex: { bg: '#eab308', fg: '#18181b', label: 'TeX' },
    json: { bg: '#06b6d4', fg: '#ffffff', label: '{}' },
  };
  const m = meta[format] || meta.pptx;
  return (
    <span
      className="inline-flex items-center justify-center rounded-[4px] font-bold tracking-tight select-none shrink-0"
      style={{
        width: 16,
        height: 16,
        backgroundColor: m.bg,
        color: m.fg,
        fontSize: m.label.length > 2 ? '6.5px' : '9px',
      }}
    >
      {m.label}
    </span>
  );
};

const ThemeSwatchIcon: React.FC<{ color: string }> = ({ color }) => (
  <span
    className="inline-block w-3 h-3 rounded-full border border-white/20 shrink-0"
    style={{ backgroundColor: color }}
  />
);

const BlueprintDotIcon: React.FC<{ color?: string }> = ({ color = '#10b981' }) => (
  <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0">
    <rect x="2" y="2" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5" />
    <rect x="9" y="2" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5" opacity="0.6" />
    <rect x="2" y="9" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5" opacity="0.6" />
    <rect x="9" y="9" width="5" height="5" rx="1" stroke={color} strokeWidth="1.5" />
  </svg>
);

const FORMAT_OPTIONS: Array<GlideSelectOption & { ext: string }> = [
  {
    value: 'pptx',
    label: 'PowerPoint Deck (.pptx)',
    ext: '.pptx',
    icon: <FormatBadgeIcon format="pptx" />,
  },
  {
    value: 'docx',
    label: 'Word Document (.docx)',
    ext: '.docx',
    icon: <FormatBadgeIcon format="docx" />,
  },
  {
    value: 'xlsx',
    label: 'Excel Spreadsheet (.xlsx)',
    ext: '.xlsx',
    icon: <FormatBadgeIcon format="xlsx" />,
  },
  {
    value: 'pdf',
    label: 'Executive PDF (.pdf)',
    ext: '.pdf',
    icon: <FormatBadgeIcon format="pdf" />,
  },
  {
    value: 'csv',
    label: 'CSV Dataset (.csv)',
    ext: '.csv',
    icon: <FormatBadgeIcon format="csv" />,
  },
  {
    value: 'html',
    label: 'Interactive Report (.html)',
    ext: '.html',
    icon: <FormatBadgeIcon format="html" />,
  },
  {
    value: 'md',
    label: 'Markdown Spec (.md)',
    ext: '.md',
    icon: <FormatBadgeIcon format="md" />,
  },
  {
    value: 'tex',
    label: 'LaTeX Academic Paper (.tex)',
    ext: '.tex',
    icon: <FormatBadgeIcon format="tex" />,
  },
  {
    value: 'json',
    label: 'Structured Schema (.json)',
    ext: '.json',
    icon: <FormatBadgeIcon format="json" />,
  },
];

const THEME_OPTIONS: Array<GlideSelectOption & { accent: string; bg: string }> = [
  {
    value: 'midnight',
    label: 'Midnight Dark',
    accent: '#6366f1',
    bg: '#0f172a',
    icon: <ThemeSwatchIcon color="#6366f1" />,
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
    accent: '#2563eb',
    bg: '#1e293b',
    icon: <ThemeSwatchIcon color="#2563eb" />,
  },
  {
    value: 'editorial',
    label: 'Warm Editorial',
    accent: '#e11d48',
    bg: '#881337',
    icon: <ThemeSwatchIcon color="#e11d48" />,
  },
  {
    value: 'navy',
    label: 'Executive Navy',
    accent: '#0ea5e9',
    bg: '#0c4a6e',
    icon: <ThemeSwatchIcon color="#0ea5e9" />,
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
  { value: 'auto', label: 'Auto Blueprint', icon: <BlueprintDotIcon color="#10b981" /> },
  { value: 'pitch', label: 'Startup Pitch Deck', icon: <BlueprintDotIcon color="#f97316" /> },
  { value: 'financial', label: 'Financial Model & P&L', icon: <BlueprintDotIcon color="#14b8a6" /> },
  { value: 'contract', label: 'Master Legal Contract', icon: <BlueprintDotIcon color="#3b82f6" /> },
  { value: 'invoice', label: 'Commercial Invoice', icon: <BlueprintDotIcon color="#eab308" /> },
  { value: 'resume', label: 'Executive Resume / CV', icon: <BlueprintDotIcon color="#ec4899" /> },
  { value: 'whitepaper', label: 'Technical Whitepaper', icon: <BlueprintDotIcon color="#8b5cf6" /> },
  { value: 'research', label: 'Academic Research Paper', icon: <BlueprintDotIcon color="#06b6d4" /> },
];

const STARTER_PRESETS: Array<{
  tag: string;
  format: DocFormat;
  theme: string;
  blueprint: string;
  prompt: string;
}> = [
  {
    tag: 'Series A AI infrastructure pitch deck with ARR metrics & moat pillars',
    format: 'pptx',
    theme: 'midnight',
    blueprint: 'pitch',
    prompt:
      'Series A investor pitch deck for an autonomous AI infrastructure company showing $4.8M ARR, 145% Net Dollar Retention, 3 core architectural moats, enterprise GTM flywheel, and 18-month roadmap.',
  },
  {
    tag: 'SaaS 4-Quarter P&L financial forecast model with variance & margins',
    format: 'xlsx',
    theme: 'emerald',
    blueprint: 'financial',
    prompt:
      'Comprehensive SaaS financial model tracking Enterprise ARR, Pro Self-Serve ARR, Cloud GPU Compute COGS, R&D Engineering, Sales & Marketing, Q1-Q4 actual vs budget variance, and FY projected totals.',
  },
  {
    tag: 'Executive board security & cloud modernization audit report',
    format: 'pdf',
    theme: 'navy',
    blueprint: 'whitepaper',
    prompt:
      'Executive board briefing on Zero-Trust Cloud Architecture Modernization, SOC2 Type II compliance milestones, multi-region latency benchmarks, and Q3 security engineering directives.',
  },
  {
    tag: 'Enterprise Master Services Agreement (MSA) & SLA contract',
    format: 'docx',
    theme: 'slate',
    blueprint: 'contract',
    prompt:
      'Enterprise Master Software Services Agreement (MSA) covering IP ownership, 99.99% uptime SLA credits, GDPR/SOC2 data processing obligations, indemnification, and payment terms.',
  },
  {
    tag: 'Transformer inference optimization paper in LaTeX format',
    format: 'tex',
    theme: 'mono',
    blueprint: 'research',
    prompt:
      'Academic research paper on Sub-Linear Speculative Decoding and KV-Cache Quantization for Real-Time Edge LLM Inference, including methodology, ablation benchmark table, and conclusions.',
  },
  {
    tag: 'Global enterprise customer cohort & churn telemetry dataset',
    format: 'csv',
    theme: 'emerald',
    blueprint: 'financial',
    prompt:
      'Enterprise customer cohort dataset with columns for Segment, Active Accounts, Contract ACV, Q1 Expansion, Gross Churn, Net Retention Rate, and Projected Annual Value.',
  },
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

  const glideProps = {
    size: 'sm' as const,
    radius: 8,
    surfaceColor: isDark ? '#1a1c24' : '#f3f4f6',
    highlightColor: isDark ? '#272a38' : '#e5e7eb',
    textColor: isDark ? '#f3f4f6' : '#111827',
    accentColor: isDark ? '#e5e7eb' : '#111827',
    placement: 'top' as const,
    align: 'left' as const,
    menuWidth: 225,
  };

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
          {/* 16:9 Slide Stage */}
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
            {/* Top accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: themeMeta.accent }}
            />

            {/* Slide Tag & Counter */}
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

            {/* Slide Body */}
            <div className="my-auto py-2 z-10">
              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug mb-1.5 line-clamp-2">
                {slide.title || data.title}
              </h3>
              {slide.subtitle && (
                <p className="text-[11.5px] text-white/70 leading-relaxed line-clamp-2 mb-3">
                  {slide.subtitle}
                </p>
              )}

              {/* Metrics layout */}
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

              {/* Cards layout */}
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

              {/* Bullets layout */}
              {Array.isArray(slide.bullets) && slide.bullets.length > 0 && (
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

            {/* Slide Navigation Footer */}
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

          {/* Action Bar */}
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
          {/* Header Banner */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.07] flex items-center justify-between gap-2 bg-gray-50/70 dark:bg-white/[0.02]">
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-gray-900 dark:text-white truncate">
                {data.title || 'Financial & Operational Model'}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {data.sheetName || 'Sheet1'} • {rows.length} rows × {headers.length} columns
              </div>
            </div>
            <FormatBadgeIcon format={item.docType} />
          </div>

          {/* Table Grid */}
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

    // 3. LaTeX / JSON Source Code Preview
    if (item.docType === 'tex' || item.docType === 'json') {
      const codeText =
        item.textPreview || JSON.stringify(item.structuredData || {}, null, 2);
      return (
        <div className="w-full max-w-[580px] rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#111217] shadow-lg">
          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-white/[0.07] flex items-center justify-between bg-gray-50/70 dark:bg-white/[0.02]">
            <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 truncate">
              {item.fileName || `${data.title || 'document'}.${item.docType}`}
            </span>
            <FormatBadgeIcon format={item.docType} />
          </div>
          <pre className="p-4 text-[11px] font-mono leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50/40 dark:bg-[#0b0c10] max-h-[240px] overflow-y-auto whitespace-pre-wrap">
            {codeText.slice(0, 1800)}
            {codeText.length > 1800 ? '\n...' : ''}
          </pre>
          {renderActionFooter(item)}
        </div>
      );
    }

    // 4. Document Paper Preview (.docx, .pdf, .html, .md)
    const sections = Array.isArray(data.sections) ? data.sections : [];
    return (
      <div className="w-full max-w-[560px] rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.09] bg-white dark:bg-[#111217] shadow-lg">
        {/* Top Accent Strip */}
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
            <FormatBadgeIcon format={item.docType} />
          </div>

          {data.summary && (
            <div
              className="p-3 rounded-lg text-[11.5px] leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/[0.03] border-l-2"
              style={{ borderLeftColor: themeMeta.accent }}
            >
              {data.summary}
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

  return (
    <div className="relative w-full h-full flex flex-col bg-[#f7f7fa] dark:bg-[#070709] text-gray-900 dark:text-gray-100 overflow-hidden select-none">
      {/* Main Content Stage */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 min-h-0 relative z-20 flex flex-col">
        {generations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
            {/* Big Grokki Studio Logo behind text (identical to ImageStudioTab) */}
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
                className="w-44 h-44 sm:w-60 sm:h-60 md:w-84 md:h-84 object-contain filter brightness-0 dark:invert"
                style={{
                  maskImage:
                    'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.02) 70%)',
                  WebkitMaskImage:
                    'linear-gradient(to bottom, rgba(0, 0, 0, 1) 10%, rgba(0, 0, 0, 0.08) 100%)',
                }}
              />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 text-6xl sm:text-[4em] mb-7 font-normal text-gray-900 dark:text-white tracking-wide text-center"
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
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>
                  {/* Wax-pastel highlighter swipe behind "Office Studio" */}
                  <motion.path
                    d="M 6 54 Q 158 44 314 51"
                    fill="none"
                    stroke="url(#grokki-office-crayon-grad)"
                    strokeWidth="36"
                    strokeLinecap="round"
                    filter="url(#grokki-office-crayon-grain)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: isDark ? 0.24 : 0.18 }}
                    transition={{ duration: 0.65, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  />
                  {/* Primary hand-sketched crayon underline stroke */}
                  <motion.path
                    d="M 4 84 C 98 76, 214 75, 316 82"
                    fill="none"
                    stroke="url(#grokki-office-crayon-grad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#grokki-office-crayon-grain)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.92 }}
                    transition={{ duration: 0.6, delay: 0.52, ease: [0.22, 1, 0.36, 1] }}
                  />
                  {/* Secondary crayon return scribble stroke */}
                  <motion.path
                    d="M 34 91 C 132 85, 226 86, 294 89"
                    fill="none"
                    stroke="url(#grokki-office-crayon-grad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    filter="url(#grokki-office-crayon-grain)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.7 }}
                    transition={{ duration: 0.45, delay: 0.78, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>
                <span className="relative z-10">Office Studio</span>
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl rounded-xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/90 backdrop-blur-md px-5 py-4 text-left shadow-lg"
            >
              <div className="text-[11.5px] font-medium text-gray-400 dark:text-gray-500 pb-2">
                Start from an example
              </div>
              <div className="flex flex-col divide-y divide-gray-200/80 dark:divide-white/[0.07]">
                {STARTER_PRESETS.map((preset) => (
                  <button
                    key={preset.tag}
                    type="button"
                    onClick={() => {
                      setInputValue(preset.prompt);
                      setDocType(preset.format);
                      setTheme(preset.theme);
                      setBlueprint(preset.blueprint);
                      inputRef.current?.focus();
                    }}
                    className="group flex items-center justify-between gap-3 py-2.5 -mx-2 px-2 text-left hover:bg-gray-100/80 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-gray-800 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors truncate">
                        {preset.tag}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 font-mono shrink-0 transition-colors">
                      <FormatBadgeIcon format={preset.format} />
                      <span>.{preset.format}</span>
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Bottom Composer (exact SpecularButton as="div" layout from ImageStudioTab) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className={`flex-shrink-0 px-5 sm:px-8 pt-2 relative z-30 ${
          generations.length === 0 ? 'pb-6 sm:pb-8' : 'pb-4'
        }`}
      >
        <div className="max-w-[680px] mx-auto">
          <SpecularButton
            as="div"
            size="lg"
            radius={14}
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
            className="w-full bg-white dark:bg-[#121217] p-3 flex flex-col gap-2 text-left relative z-20"
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
                rows={Math.min(6, Math.max(2, inputValue.split('\n').length))}
                placeholder={`Describe the .${docType} document, deck, or spreadsheet model to generate...`}
                autoFocus
                className="w-full min-h-[48px] bg-transparent resize-none border-none outline-none text-[13.5px] leading-relaxed text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0 p-0 pr-6"
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
                {/* 1. Format Selector (9 formats) */}
                <GlideSelect
                  options={FORMAT_OPTIONS}
                  value={docType}
                  onChange={(v) => setDocType(v as DocFormat)}
                  {...glideProps}
                  menuWidth={230}
                />

                {/* 2. Style Theme Selector (6 themes) */}
                <GlideSelect
                  options={THEME_OPTIONS}
                  value={theme}
                  onChange={(v) => setTheme(v)}
                  {...glideProps}
                  menuWidth={195}
                />

                {/* 3. Blueprint / Archetype Selector */}
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
        </div>
      </motion.div>
    </div>
  );
};

export default OfficeStudioTab;
