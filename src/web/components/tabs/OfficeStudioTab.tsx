import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Presentation,
  FileText,
  Table,
  Sparkles,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  FileSpreadsheet,
  FileCheck2,
  FolderOpen,
} from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';
import SpecularButton from '../../../effects/SpecularButton';
import grokkiLogo from '../../assets/grokki_logo.png';

export type DocType = 'pptx' | 'docx' | 'xlsx';
export type ThemeKey = 'midnight' | 'slate' | 'editorial' | 'emerald';

interface OfficeStudioTabProps {
  config: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
}

interface GeneratedDocResult {
  fileName: string;
  filePath: string;
  fileType: DocType;
  theme: ThemeKey;
  base64Data?: string;
  structuredData: any;
  timestamp: string;
}

const THEMES_LIST: { id: ThemeKey; name: string; color: string; desc: string }[] = [
  { id: 'midnight',  name: 'Midnight Dark', color: '#6366F1', desc: 'Obsidian & Indigo' },
  { id: 'slate',     name: 'Tech Slate',    color: '#2563EB', desc: 'Clean Minimalist'  },
  { id: 'editorial', name: 'Warm Editorial', color: '#BE123C', desc: 'Stone & Crimson'   },
  { id: 'emerald',   name: 'Emerald Growth', color: '#10B981', desc: 'Forest & Mint'      },
];

const PRESETS: Record<DocType, { tag: string; prompt: string }[]> = {
  pptx: [
    {
      tag: 'Seed Pitch Deck',
      prompt: 'Series A investor pitch deck for an autonomous multi-agent developer platform with market traction and unit economics',
    },
    {
      tag: 'Architecture Review',
      prompt: 'Technical system architecture and microservices security review with key performance metrics and scaling milestones',
    },
    {
      tag: 'Quarterly Roadmap',
      prompt: 'Q1 product vision, strategic execution roadmap, and core engineering delivery pillars',
    },
  ],
  docx: [
    {
      tag: 'Master Services Agreement',
      prompt: 'Executive freelance master services agreement with IP assignment, payment milestones, and confidential liability clauses',
    },
    {
      tag: 'Architecture Whitepaper',
      prompt: 'Enterprise zero-trust security architecture whitepaper with benchmark milestone table and risk governance',
    },
    {
      tag: 'Post-Mortem Brief',
      prompt: 'System reliability incident post-mortem report with root cause analysis and preventative action items table',
    },
  ],
  xlsx: [
    {
      tag: 'SaaS Runway Model',
      prompt: '12-month SaaS financial model tracking enterprise ARR, gross margin, server compute OpEx, and runway forecast',
    },
    {
      tag: 'Channel ROI Tracker',
      prompt: 'Marketing growth channel acquisition model with CAC, conversion rate, monthly spend, and customer lifetime value',
    },
    {
      tag: 'Department Budget',
      prompt: 'Engineering and product department operational budget with headcount, software tooling costs, and quarterly variance',
    },
  ],
};

export const OfficeStudioTab: React.FC<OfficeStudioTabProps> = ({ config }) => {
  const [docType, setDocType] = useState<DocType>('pptx');
  const [theme, setTheme] = useState<ThemeKey>('midnight');
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active / Last generated document
  const [currentDoc, setCurrentDoc] = useState<GeneratedDocResult | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isDark =
    config.dashboardTheme === 'dark' ||
    (typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark')));

  const handleGenerate = async (customPrompt?: string) => {
    const promptText = (customPrompt ?? inputValue).trim();
    if (!promptText || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      if (typeof window.jarvisAPI?.generateOfficeDoc !== 'function') {
        throw new Error('Office Studio engine IPC is not available. Please restart the app.');
      }

      const res = await window.jarvisAPI.generateOfficeDoc({
        prompt: promptText,
        docType,
        theme,
      });

      if (!res.success || !res.structuredData) {
        throw new Error(res.error || 'Document generation failed.');
      }

      setCurrentDoc({
        fileName: res.fileName || `document.${res.fileType}`,
        filePath: res.filePath || '',
        fileType: (res.fileType as DocType) || docType,
        theme: (res.theme as ThemeKey) || theme,
        base64Data: res.base64Data,
        structuredData: res.structuredData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setActiveSlideIdx(0);
    } catch (err: any) {
      console.error('Office generation failed:', err);
      setErrorMessage(err.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!currentDoc) return;
    try {
      if (typeof window.jarvisAPI?.saveOfficeFile === 'function') {
        const res = await window.jarvisAPI.saveOfficeFile({
          base64Data: currentDoc.base64Data,
          filePath: currentDoc.filePath,
          defaultName: currentDoc.fileName,
        });
        if (res.success) {
          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 2000);
          return;
        }
      }

      // Browser fallback
      if (currentDoc.base64Data) {
        const mime =
          currentDoc.fileType === 'pptx'
            ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            : currentDoc.fileType === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        const a = document.createElement('a');
        a.href = `data:${mime};base64,${currentDoc.base64Data}`;
        a.download = currentDoc.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 2000);
      }
    } catch (err) {
      console.warn('Download error:', err);
    }
  };

  const handleOpenFile = async () => {
    if (!currentDoc?.filePath) return;
    if (typeof window.jarvisAPI?.openOfficeFile === 'function') {
      await window.jarvisAPI.openOfficeFile(currentDoc.filePath);
    }
  };

  const handleCopyJSON = () => {
    if (!currentDoc?.structuredData) return;
    navigator.clipboard?.writeText(JSON.stringify(currentDoc.structuredData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const slides = currentDoc?.structuredData?.slides || [];
  const currentSlide = slides[activeSlideIdx] || slides[0];

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#07070a] text-gray-900 dark:text-gray-100 overflow-y-auto select-text font-sans">
      {/* Background Watermark */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.02] dark:opacity-[0.03] overflow-hidden z-0">
        <img src={grokkiLogo} alt="" className="w-[600px] h-[600px] object-contain filter brightness-0 dark:invert" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col flex-1 gap-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Grokki Office Studio</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-normal text-gray-900 dark:text-white tracking-tight"
            style={{ fontFamily: "'Caveat', 'Dancing Script', 'Great Vibes', cursive" }}
          >
            Document & Presentation Forge
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
            Generate executive-ready PowerPoint decks, Word reports, and Excel models with formulas using 100% open-source local engines.
          </p>
        </div>

        {/* Format Selector Bar */}
        <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-gray-100 dark:bg-[#121217] border border-gray-200 dark:border-white/[0.08] w-fit mx-auto shadow-xs">
          <button
            type="button"
            onClick={() => setDocType('pptx')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              docType === 'pptx'
                ? 'bg-white dark:bg-[#1e1e24] text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/30'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span>Presentation (.pptx)</span>
          </button>

          <button
            type="button"
            onClick={() => setDocType('docx')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              docType === 'docx'
                ? 'bg-white dark:bg-[#1e1e24] text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/30'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Document (.docx)</span>
          </button>

          <button
            type="button"
            onClick={() => setDocType('xlsx')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              docType === 'xlsx'
                ? 'bg-white dark:bg-[#1e1e24] text-teal-600 dark:text-teal-400 shadow-sm border border-teal-500/30'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Spreadsheet (.xlsx)</span>
          </button>
        </div>

        {/* Theme Picker & Presets */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mr-1">Style Theme:</span>
            {THEMES_LIST.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                  theme === t.id
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent shadow-xs'
                    : 'bg-gray-100/80 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/[0.06] hover:bg-gray-200/60 dark:hover:bg-white/[0.08]'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                <span>{t.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mr-1">Presets:</span>
            {PRESETS[docType].map((preset) => (
              <button
                key={preset.tag}
                type="button"
                onClick={() => {
                  setInputValue(preset.prompt);
                  handleGenerate(preset.prompt);
                }}
                className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-gray-100 dark:bg-white/[0.05] text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-gray-200/60 dark:border-white/[0.06] transition-colors cursor-pointer"
              >
                {preset.tag}
              </button>
            ))}
          </div>
        </div>

        {/* Composer Prompt Box */}
        <div className="w-full">
          <SpecularButton
            variant="card"
            className="w-full p-3.5 bg-white dark:bg-[#121217] rounded-2xl border border-gray-200 dark:border-white/[0.09] shadow-lg flex flex-col gap-3"
          >
            <textarea
              ref={inputRef}
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder={`Describe the ${
                docType === 'pptx' ? 'presentation deck' : docType === 'docx' ? 'report or contract' : 'financial spreadsheet model'
              } you need generated...`}
              className="w-full bg-transparent text-xs text-gray-900 dark:text-gray-100 outline-none resize-none placeholder-gray-400 dark:placeholder-gray-600"
            />

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/[0.06]">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                Uses active AI provider to architect structure • Compiles into authentic binary {docType.toUpperCase()}
              </span>

              <button
                type="button"
                disabled={!inputValue.trim() || isGenerating}
                onClick={() => handleGenerate()}
                className={`h-8 px-4 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  inputValue.trim() && !isGenerating
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-white/[0.07] text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Compiling {docType.toUpperCase()}...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate File</span>
                  </>
                )}
              </button>
            </div>
          </SpecularButton>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* In-App Live Interactive Document Previews */}
        {currentDoc && currentDoc.structuredData && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* Header bar of generated doc */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-[#121217] border border-gray-200 dark:border-white/[0.08] flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs uppercase">
                  {currentDoc.fileType}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {currentDoc.structuredData.title || currentDoc.fileName}
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    Generated at {currentDoc.timestamp} • {currentDoc.fileName}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenFile}
                  className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Office</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 h-7 px-3.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer shadow-xs"
                >
                  {downloadSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{downloadSuccess ? 'Saved' : 'Download File'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyJSON}
                  title="Copy JSON Schema"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* PREVIEW: Presentation Slides Preview */}
            {currentDoc.fileType === 'pptx' && slides.length > 0 && (
              <div className="flex flex-col gap-3">
                {/* Main Slide Stage */}
                <div
                  className={`w-full aspect-[16/9] rounded-2xl p-6 sm:p-10 border transition-all duration-150 relative overflow-hidden flex flex-col justify-between shadow-2xl ${
                    theme === 'midnight'
                      ? 'bg-[#0F172A] text-slate-100 border-slate-700/60'
                      : theme === 'emerald'
                      ? 'bg-[#064E3B] text-emerald-50 border-emerald-700/60'
                      : theme === 'editorial'
                      ? 'bg-[#FAFAF9] text-stone-900 border-stone-300'
                      : 'bg-white text-slate-900 border-slate-200'
                  }`}
                >
                  {/* Accent Top Bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{
                      backgroundColor:
                        theme === 'midnight'
                          ? '#6366F1'
                          : theme === 'emerald'
                          ? '#10B981'
                          : theme === 'editorial'
                          ? '#BE123C'
                          : '#2563EB',
                    }}
                  />

                  {/* Slide Content Dynamic View */}
                  <div className="flex-1 flex flex-col justify-center">
                    {/* Hero Title Slide */}
                    {currentSlide.type === 'title' || activeSlideIdx === 0 ? (
                      <div className="flex flex-col gap-3 max-w-2xl">
                        {currentSlide.tag && (
                          <span
                            className="w-fit px-3 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase"
                            style={{
                              backgroundColor: theme === 'midnight' || theme === 'emerald' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                              color: theme === 'midnight' ? '#38BDF8' : theme === 'emerald' ? '#34D399' : '#BE123C',
                            }}
                          >
                            {currentSlide.tag}
                          </span>
                        )}
                        <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight">
                          {currentSlide.title}
                        </h2>
                        {currentSlide.subtitle && (
                          <p className="text-xs sm:text-base opacity-75 leading-relaxed">
                            {currentSlide.subtitle}
                          </p>
                        )}
                      </div>
                    ) : currentSlide.type === 'metrics' && currentSlide.metrics ? (
                      /* KPI Stat Slide */
                      <div className="flex flex-col gap-4">
                        <div>
                          {currentSlide.tag && <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">{currentSlide.tag}</span>}
                          <h2 className="text-xl sm:text-2xl font-bold">{currentSlide.title}</h2>
                          {currentSlide.subtitle && <p className="text-xs opacity-75">{currentSlide.subtitle}</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          {currentSlide.metrics.map((m: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-4 rounded-xl border flex flex-col gap-1 shadow-xs"
                              style={{
                                backgroundColor: theme === 'midnight' ? '#1E293B' : theme === 'emerald' ? '#065F46' : '#F8FAFC',
                                borderColor: theme === 'midnight' ? '#334155' : theme === 'emerald' ? '#047857' : '#E2E8F0',
                              }}
                            >
                              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                                {m.value}
                              </span>
                              <span className="text-xs font-bold">{m.label}</span>
                              <p className="text-[11px] opacity-70 leading-relaxed">{m.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : currentSlide.cards ? (
                      /* Feature Grid Slide */
                      <div className="flex flex-col gap-4">
                        <div>
                          {currentSlide.tag && <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">{currentSlide.tag}</span>}
                          <h2 className="text-xl sm:text-2xl font-bold">{currentSlide.title}</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {currentSlide.cards.map((c: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl border flex flex-col gap-1.5"
                              style={{
                                backgroundColor: theme === 'midnight' ? '#1E293B' : theme === 'emerald' ? '#065F46' : '#F8FAFC',
                                borderColor: theme === 'midnight' ? '#334155' : theme === 'emerald' ? '#047857' : '#E2E8F0',
                              }}
                            >
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <h4 className="text-xs font-bold">{c.title}</h4>
                              <p className="text-[11px] opacity-75 leading-relaxed">{c.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Bullet / Key Takeaways Slide */
                      <div className="flex flex-col gap-4">
                        <h2 className="text-xl sm:text-2xl font-bold">{currentSlide.title}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                          <div className="sm:col-span-8 flex flex-col gap-2">
                            {currentSlide.bullets?.map((b: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed">
                                <span className="text-emerald-400 font-bold">•</span>
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                          {currentSlide.takeaway && (
                            <div
                              className="sm:col-span-4 p-4 rounded-xl border"
                              style={{
                                backgroundColor: theme === 'midnight' ? '#1E293B' : theme === 'emerald' ? '#065F46' : '#F8FAFC',
                                borderColor: theme === 'midnight' ? '#334155' : theme === 'emerald' ? '#047857' : '#E2E8F0',
                              }}
                            >
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                                Core Takeaway
                              </span>
                              <p className="text-xs leading-relaxed opacity-85">{currentSlide.takeaway}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Slide Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10 text-[10px] opacity-60">
                    <span>Grokki Office Studio  •  Executive Deck</span>
                    <span>Slide {activeSlideIdx + 1} of {slides.length}</span>
                  </div>
                </div>

                {/* Slide Carousel Thumbnails & Navigation */}
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {slides.map((s: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSlideIdx(idx)}
                        className={`h-7 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                          activeSlideIdx === idx
                            ? 'bg-emerald-600 text-white border-transparent shadow-xs'
                            : 'bg-gray-100 dark:bg-white/[0.05] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 border-gray-200 dark:border-white/[0.06]'
                        }`}
                      >
                        Slide {idx + 1}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={activeSlideIdx === 0}
                      onClick={() => setActiveSlideIdx((i) => Math.max(i - 1, 0))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={activeSlideIdx === slides.length - 1}
                      onClick={() => setActiveSlideIdx((i) => Math.min(i + 1, slides.length - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW: Excel Spreadsheet Grid Preview */}
            {currentDoc.fileType === 'xlsx' && (
              <div className="w-full rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121217] overflow-hidden shadow-lg">
                <div className="p-3 bg-gray-50 dark:bg-[#18181f] border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-teal-500" />
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {currentDoc.structuredData.sheetName || 'Financial Forecast'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-gray-400">
                    {currentDoc.structuredData.rows?.length || 0} rows  •  Auto-calculated formulas
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-semibold">
                        <th className="py-2.5 px-3 border-r border-slate-700 w-12 text-center text-slate-400">#</th>
                        {currentDoc.structuredData.headers?.map((h: string, idx: number) => (
                          <th key={idx} className="py-2.5 px-3 border-r border-slate-700 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentDoc.structuredData.rows?.map((row: any[], rowIdx: number) => (
                        <tr
                          key={rowIdx}
                          className={`border-b border-gray-100 dark:border-white/[0.05] ${
                            rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/50 dark:bg-white/[0.02]'
                          }`}
                        >
                          <td className="py-2 px-3 border-r border-gray-200 dark:border-white/[0.06] text-center text-gray-400 font-mono text-[11px]">
                            {rowIdx + 1}
                          </td>
                          {row.map((cell: any, cellIdx: number) => (
                            <td
                              key={cellIdx}
                              className={`py-2 px-3 border-r border-gray-100 dark:border-white/[0.05] font-mono text-xs ${
                                typeof cell === 'number' ? 'text-right' : 'text-left'
                              }`}
                            >
                              {typeof cell === 'number'
                                ? cell > 1000 || cell < -1000
                                  ? `$${cell.toLocaleString()}`
                                  : cell >= 0 && cell <= 1 && cellIdx > 1
                                  ? `${(cell * 100).toFixed(1)}%`
                                  : cell.toLocaleString()
                                : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PREVIEW: Word Document Formatted Page Preview */}
            {currentDoc.fileType === 'docx' && (
              <div className="w-full max-w-3xl mx-auto rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#121217] p-8 sm:p-12 shadow-2xl flex flex-col gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {currentDoc.structuredData.category || 'EXECUTIVE BRIEFING'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
                    {currentDoc.structuredData.title}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                    {currentDoc.structuredData.subtitle}
                  </p>
                </div>

                {/* Summary callout box */}
                {currentDoc.structuredData.summary && (
                  <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border-l-4 border-blue-600 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    <strong className="block text-blue-700 dark:text-blue-400 mb-1 uppercase font-bold text-[10px]">
                      Executive Summary
                    </strong>
                    {currentDoc.structuredData.summary}
                  </div>
                )}

                {/* Sections */}
                {currentDoc.structuredData.sections?.map((sec: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-2">
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-white/[0.06] pb-1">
                      {sec.title}
                    </h3>
                    {sec.content && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {sec.content}
                      </p>
                    )}
                    {sec.bullets && (
                      <ul className="list-disc pl-5 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                        {sec.bullets.map((b: string, bIdx: number) => (
                          <li key={bIdx}>{b}</li>
                        ))}
                      </ul>
                    )}
                    {sec.table && (
                      <div className="mt-2 rounded-lg border border-gray-200 dark:border-white/[0.08] overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-800 text-white font-semibold">
                            <tr>
                              {sec.table.headers?.map((h: string, hIdx: number) => (
                                <th key={hIdx} className="p-2 border-r border-slate-700">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sec.table.rows?.map((row: any[], rIdx: number) => (
                              <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-transparent' : 'bg-gray-50 dark:bg-white/[0.02]'}>
                                {row.map((cell: any, cIdx: number) => (
                                  <td key={cIdx} className="p-2 border-t border-gray-100 dark:border-white/[0.05]">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficeStudioTab;
