import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Code2,
  Eye,
  Copy,
  Check,
  Download,
  RotateCw,
  Maximize2,
  Minimize2,
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Globe,
  FileCode,
  Shapes,
  FileText,
  Terminal,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { marked } from 'marked';
import { highlightCode } from '../utils/syntaxHighlight';

export interface Artifact {
  id: string;
  title: string;
  language: string;
  content: string;
  type?: 'code' | 'html' | 'svg' | 'markdown' | 'react';
}

interface ArtifactCanvasPaneProps {
  artifact: Artifact | null;
  onClose: () => void;
  isDark?: boolean;
}

export const detectArtifactType = (
  language: string,
  content: string
): 'code' | 'html' | 'svg' | 'markdown' | 'react' => {
  const lang = (language || '').toLowerCase().trim();
  const trimmed = content.trim();

  if (lang === 'html' || trimmed.startsWith('<!DOCTYPE') || (trimmed.startsWith('<html') && trimmed.includes('</html>'))) {
    return 'html';
  }
  if (lang === 'svg' || (trimmed.startsWith('<svg') && trimmed.includes('</svg>'))) {
    return 'svg';
  }
  if (lang === 'markdown' || lang === 'md') {
    return 'markdown';
  }
  if (['tsx', 'jsx', 'react'].includes(lang)) {
    return 'react';
  }
  if (trimmed.startsWith('<') && trimmed.endsWith('>') && (trimmed.includes('class=') || trimmed.includes('className='))) {
    return 'html';
  }
  return 'code';
};

export const ArtifactCanvasPane: React.FC<ArtifactCanvasPaneProps> = ({
  artifact,
  onClose,
  isDark = true,
}) => {
  if (!artifact) return null;

  const artifactType = useMemo(
    () => artifact.type || detectArtifactType(artifact.language, artifact.content),
    [artifact]
  );

  const canPreview = ['html', 'svg', 'markdown', 'react'].includes(artifactType);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>(canPreview ? 'preview' : 'code');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>(isDark ? 'dark' : 'light');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [svgZoom, setSvgZoom] = useState(1);
  const [wrapCode, setWrapCode] = useState(false);

  // Sync preview theme if parent dark mode prop changes
  useEffect(() => {
    setPreviewTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  // Switch tab when artifact changes
  useEffect(() => {
    setActiveTab(canPreview ? 'preview' : 'code');
    setSvgZoom(1);
  }, [artifact.id, canPreview]);

  // Handle Copy
  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Download
  const handleDownload = () => {
    const extMap: Record<string, string> = {
      html: 'html',
      svg: 'svg',
      markdown: 'md',
      md: 'md',
      react: 'tsx',
      tsx: 'tsx',
      jsx: 'jsx',
      javascript: 'js',
      js: 'js',
      typescript: 'ts',
      ts: 'ts',
      python: 'py',
      py: 'py',
      css: 'css',
      json: 'json',
      sql: 'sql',
    };
    const ext = extMap[artifact.language.toLowerCase()] || 'txt';
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(artifact.title || 'artifact').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build clean, high-contrast HTML srcDoc with Tailwind CSS and typography reset
  const srcDoc = useMemo(() => {
    if (artifactType !== 'html' && artifactType !== 'react') return '';

    const content = artifact.content.trim();
    const isDarkCanvas = previewTheme === 'dark';
    const bg = isDarkCanvas ? '#0f1117' : '#ffffff';
    const fg = isDarkCanvas ? '#f1f5f9' : '#0f172a';
    const cardBg = isDarkCanvas ? '#1a1d28' : '#f8fafc';
    const borderCol = isDarkCanvas ? '#2a2e3f' : '#e2e8f0';

    const baseReset = `
      <script src="https://cdn.tailwindcss.com"></script>
      <style id="grokki-canvas-theme">
        :root {
          color-scheme: ${previewTheme};
        }
        body {
          margin: 0;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: ${bg} !important;
          color: ${fg} !important;
          min-height: 100vh;
          box-sizing: border-box;
          line-height: 1.6;
        }
        h1, h2, h3, h4, h5, h6 {
          color: ${fg} !important;
          font-weight: 700;
          letter-spacing: -0.025em;
          margin-top: 0;
          margin-bottom: 0.65rem;
        }
        h1 { font-size: 1.85rem; }
        h2 { font-size: 1.45rem; }
        h3 { font-size: 1.25rem; }
        p {
          color: ${isDarkCanvas ? '#cbd5e1' : '#334155'} !important;
          margin-top: 0;
          margin-bottom: 1rem;
        }
        a {
          color: #38bdf8;
          text-decoration: underline;
        }
        button {
          font-family: inherit;
        }
        pre, code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .card, [class*="card"] {
          background-color: ${cardBg};
          border: 1px solid ${borderCol};
        }
      </style>
    `;

    if (content.toLowerCase().startsWith('<!doctype') || content.toLowerCase().startsWith('<html')) {
      if (content.includes('<head>')) {
        return content.replace('<head>', `<head>${baseReset}`);
      }
      return `${baseReset}${content}`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${baseReset}
</head>
<body>
  ${content}
</body>
</html>`;
  }, [artifact.content, artifactType, previewTheme]);

  // Viewport width styling for preview window
  const viewportWidth = {
    desktop: 'w-full',
    tablet: 'w-[768px] max-w-full',
    mobile: 'w-[375px] max-w-full',
  }[viewport];

  // Code lines & highlighted syntax
  const codeLines = useMemo(() => artifact.content.split('\n'), [artifact.content]);
  const highlightedCode = useMemo(
    () => highlightCode(artifact.content, artifact.language),
    [artifact.content, artifact.language]
  );

  // Clean artifact icon
  const renderArtifactIcon = () => {
    switch (artifactType) {
      case 'html':
        return <Globe className="w-4 h-4 text-sky-400" />;
      case 'react':
        return <Code2 className="w-4 h-4 text-cyan-400" />;
      case 'svg':
        return <Shapes className="w-4 h-4 text-amber-400" />;
      case 'markdown':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      default:
        return <Terminal className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className={`fixed top-0 right-0 bottom-0 z-40 bg-white dark:bg-[#0d0f17] text-gray-900 dark:text-gray-100 border-l border-gray-200 dark:border-[#1c202c] shadow-2xl flex flex-col transition-all duration-200 select-none ${
        isFullscreen ? 'w-full left-0 z-[60]' : 'w-full md:w-[50vw] lg:w-[48vw] xl:w-[46vw]'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#1c202c] bg-white/95 dark:bg-[#12141f]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center shrink-0">
            {renderArtifactIcon()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate tracking-tight font-mono">
                {artifact.title || 'Canvas'}
              </h2>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-gray-300 font-semibold tracking-wider border border-gray-200/60 dark:border-transparent">
                {artifact.language}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
              {codeLines.length} lines • {artifact.content.length.toLocaleString()} chars
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Preview vs Code) */}
        <div className="flex items-center gap-2">
          {canPreview && (
            <div className="flex items-center p-1 rounded-lg bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-xs font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-xs font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Code</span>
              </button>
            </div>
          )}

          {/* Action Icons */}
          <div className="flex items-center gap-1 ml-1 text-gray-500 dark:text-gray-400">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy Code"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              title="Download Artifact"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              title={isFullscreen ? 'Restore Window' : 'Fullscreen'}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close Canvas"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-white/10 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-gray-100/70 dark:bg-[#0a0b10] flex flex-col">
        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col h-full min-h-0 relative">
            {/* HTML / React Live Sandbox Preview */}
            {(artifactType === 'html' || artifactType === 'react') && (
              <div className="flex-1 flex flex-col h-full min-h-0">
                {/* Browser Stage Chrome Bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50/95 dark:bg-[#12141e] border-b border-gray-200 dark:border-[#1c202c] shrink-0 text-xs">
                  {/* Window traffic lights */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>

                  {/* Simulated URL pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white dark:bg-black/40 border border-gray-200 dark:border-white/[0.08] text-[11px] font-mono text-gray-600 dark:text-gray-400 max-w-[280px] truncate shadow-2xs">
                    <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">localhost:3000/{artifact.title || 'index.html'}</span>
                  </div>

                  {/* Viewport and Canvas controls */}
                  <div className="flex items-center gap-2">
                    {/* Viewport switcher */}
                    <div className="flex items-center p-0.5 rounded-md bg-gray-200/70 dark:bg-black/40 border border-gray-300/60 dark:border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setViewport('desktop')}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          viewport === 'desktop' ? 'bg-white dark:bg-white/15 text-sky-600 dark:text-sky-400 shadow-2xs' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Desktop View (100%)"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewport('tablet')}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          viewport === 'tablet' ? 'bg-white dark:bg-white/15 text-sky-600 dark:text-sky-400 shadow-2xs' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Tablet View (768px)"
                      >
                        <Tablet className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewport('mobile')}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          viewport === 'mobile' ? 'bg-white dark:bg-white/15 text-sky-600 dark:text-sky-400 shadow-2xs' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Mobile View (375px)"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Canvas theme toggle (Light / Dark paper) */}
                    <button
                      type="button"
                      onClick={() => setPreviewTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                      className="p-1.5 rounded-md bg-white dark:bg-black/40 border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors shadow-2xs"
                      title={`Switch to ${previewTheme === 'light' ? 'Dark' : 'Light'} Canvas`}
                    >
                      {previewTheme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />}
                    </button>

                    {/* Reload preview */}
                    <button
                      type="button"
                      onClick={() => setPreviewKey((k) => k + 1)}
                      title="Reload Preview"
                      className="p-1.5 rounded-md bg-white dark:bg-black/40 border border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors shadow-2xs"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sandboxed iframe workspace */}
                <div className="flex-1 w-full h-full flex items-center justify-center p-4 overflow-auto bg-gray-100 dark:bg-[#0a0b10] bg-[radial-gradient(#0000000d_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]">
                  <iframe
                    key={previewKey}
                    title={artifact.title}
                    srcDoc={srcDoc}
                    sandbox="allow-scripts allow-modals allow-forms"
                    className={`h-full rounded-lg shadow-xl dark:shadow-2xl border border-gray-200 dark:border-white/[0.08] transition-all duration-200 ${
                      previewTheme === 'light' ? 'bg-white' : 'bg-[#0f1117]'
                    } ${viewportWidth}`}
                  />
                </div>
              </div>
            )}

            {/* SVG Live Vector Preview */}
            {artifactType === 'svg' && (
              <div className="flex-1 flex flex-col h-full min-h-0 relative">
                {/* SVG Zoom Controls */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-lg bg-white/95 dark:bg-[#141721]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-md">
                  <button
                    type="button"
                    onClick={() => setSvgZoom((z) => Math.max(0.25, z - 0.25))}
                    className="p-1 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono font-semibold px-1 text-gray-700 dark:text-gray-300">
                    {Math.round(svgZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setSvgZoom((z) => Math.min(3, z + 0.25))}
                    className="p-1 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSvgZoom(1)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/15 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-gray-100 dark:bg-[#0a0b10] bg-[radial-gradient(#0000000d_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]">
                  <div
                    style={{ transform: `scale(${svgZoom})`, transformOrigin: 'center center' }}
                    className="transition-transform duration-150 max-w-full max-h-full flex items-center justify-center shadow-xl rounded-xl p-6 bg-white dark:bg-[#13151f] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100"
                    dangerouslySetInnerHTML={{ __html: artifact.content }}
                  />
                </div>
              </div>
            )}

            {/* Markdown Document Preview */}
            {artifactType === 'markdown' && (
              <div className="flex-1 p-8 overflow-y-auto bg-gray-100 dark:bg-[#0a0b10] bg-[radial-gradient(#0000000d_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]">
                <div
                  className="max-w-3xl mx-auto p-8 rounded-xl bg-white dark:bg-[#13151f] border border-gray-200 dark:border-[#1e2230] shadow-md prose dark:prose-invert prose-sm text-gray-800 dark:text-gray-200"
                  dangerouslySetInnerHTML={{ __html: marked.parse(artifact.content) as string }}
                />
              </div>
            )}
          </div>
        )}

        {/* CODE TAB */}
        {activeTab === 'code' && (
          <div className="flex-1 flex flex-col h-full min-h-0 font-mono text-xs">
            {/* Code toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-[#12141c] border-b border-gray-200 dark:border-[#1c202c] select-none shrink-0 text-gray-600 dark:text-gray-400">
              <span className="text-[11px] font-medium font-mono">Syntax: {artifact.language}</span>
              <button
                type="button"
                onClick={() => setWrapCode((w) => !w)}
                className={`text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  wrapCode
                    ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400 font-semibold'
                    : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {wrapCode ? 'Wrap: On' : 'Wrap: Off'}
              </button>
            </div>

            {/* Code Editor Body with Line Numbers & Rich Syntax Highlighting */}
            <div className="flex-1 overflow-auto bg-[#0a0b10] p-4 flex">
              {/* Line Numbers Column */}
              <div className="select-none pr-4 text-right text-gray-500 font-mono text-xs border-r border-[#1c202c] shrink-0">
                {codeLines.map((_, i) => (
                  <div key={i} className="leading-5">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Code Text Content with Rich Prism Syntax Highlighting */}
              <pre
                className={`flex-1 pl-4 m-0 font-mono text-xs text-gray-100 leading-5 outline-none grokki-code-pre ${
                  wrapCode ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                }`}
              >
                <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
              </pre>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ArtifactCanvasPane;
