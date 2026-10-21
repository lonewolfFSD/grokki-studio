import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Code,
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
  Sparkles,
  FileCode,
  ExternalLink,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { marked } from 'marked';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [svgZoom, setSvgZoom] = useState(1);
  const [wrapCode, setWrapCode] = useState(false);

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
    a.download = `${artifact.title.replace(/\s+/g, '_').toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build HTML srcDoc with Tailwind CSS support
  const srcDoc = useMemo(() => {
    if (artifactType !== 'html' && artifactType !== 'react') return '';

    const content = artifact.content.trim();
    if (content.toLowerCase().startsWith('<!doctype') || content.toLowerCase().startsWith('<html')) {
      // If already a full document, ensure tailwind CDN is present
      if (!content.includes('tailwindcss')) {
        return content.replace('<head>', '<head><script src="https://cdn.tailwindcss.com"></script>');
      }
      return content;
    }

    // Wrap snippet in a beautiful container with Tailwind
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: ${isDark ? '#0f1117' : '#ffffff'};
      color: ${isDark ? '#e2e8f0' : '#0f172a'};
      min-height: 100vh;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  }, [artifact.content, artifactType, isDark]);

  // Viewport width styling for HTML preview
  const viewportWidth = {
    desktop: 'w-full',
    tablet: 'w-[768px] max-w-full',
    mobile: 'w-[375px] max-w-full',
  }[viewport];

  // Code lines calculation
  const codeLines = useMemo(() => artifact.content.split('\n'), [artifact.content]);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className={`fixed top-0 right-0 bottom-0 z-40 bg-white dark:bg-[#0f1117] border-l border-gray-200 dark:border-[#1e2230] shadow-2xl flex flex-col transition-all duration-200 ${
        isFullscreen ? 'w-full left-0 z-[60]' : 'w-full md:w-[50vw] lg:w-[48vw] xl:w-[45vw]'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#1e2230] bg-gray-50/80 dark:bg-[#141721]/80 backdrop-blur-md select-none shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 border border-sky-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate tracking-tight">
                {artifact.title || 'Artifact Canvas'}
              </h2>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-semibold tracking-wider">
                {artifact.language}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
              {codeLines.length} lines • {artifact.content.length.toLocaleString()} chars
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Preview vs Code) */}
        <div className="flex items-center gap-2">
          {canPreview && (
            <div className="flex items-center p-0.5 rounded-lg bg-gray-200/70 dark:bg-white/5 border border-gray-300/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Code</span>
              </button>
            </div>
          )}

          {/* Action Icons */}
          <div className="flex items-center gap-1 ml-1 text-gray-500 dark:text-gray-400">
            {activeTab === 'preview' && (artifactType === 'html' || artifactType === 'react') && (
              <button
                type="button"
                onClick={() => setPreviewKey((k) => k + 1)}
                title="Reload Preview"
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              title="Copy Code"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              title="Download Artifact"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close Canvas"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-gray-100/50 dark:bg-[#0b0c10] flex flex-col">
        {/* PREVIEW TAB */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col h-full min-h-0 relative">
            {/* HTML / React Live Preview */}
            {(artifactType === 'html' || artifactType === 'react') && (
              <div className="flex-1 flex flex-col h-full min-h-0">
                {/* Viewport bar */}
                <div className="flex items-center justify-center gap-1 py-1.5 px-4 bg-gray-100 dark:bg-[#12141c] border-b border-gray-200 dark:border-[#1e2230] select-none shrink-0">
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-200/80 dark:bg-white/5 border border-gray-300/40 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setViewport('desktop')}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        viewport === 'desktop'
                          ? 'bg-white dark:bg-white/15 text-sky-500'
                          : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                      title="Desktop View (100%)"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewport('tablet')}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        viewport === 'tablet'
                          ? 'bg-white dark:bg-white/15 text-sky-500'
                          : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                      title="Tablet View (768px)"
                    >
                      <Tablet className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewport('mobile')}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        viewport === 'mobile'
                          ? 'bg-white dark:bg-white/15 text-sky-500'
                          : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                      title="Mobile View (375px)"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sandboxed iframe */}
                <div className="flex-1 w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <iframe
                    key={previewKey}
                    title={artifact.title}
                    srcDoc={srcDoc}
                    sandbox="allow-scripts allow-modals allow-forms"
                    className={`h-full bg-white dark:bg-[#0f1117] rounded-xl shadow-lg border border-gray-200 dark:border-[#1e2230] transition-all duration-200 ${viewportWidth}`}
                  />
                </div>
              </div>
            )}

            {/* SVG Live Vector Preview */}
            {artifactType === 'svg' && (
              <div className="flex-1 flex flex-col h-full min-h-0 relative">
                {/* SVG Zoom Controls */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-white/90 dark:bg-[#161822]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-md">
                  <button
                    type="button"
                    onClick={() => setSvgZoom((z) => Math.max(0.25, z - 0.25))}
                    className="p-1 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white cursor-pointer"
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
                    className="p-1 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSvgZoom(1)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-[radial-gradient(#94a3b830_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff12_1px,transparent_1px)] [background-size:16px_16px]">
                  <div
                    style={{ transform: `scale(${svgZoom})`, transformOrigin: 'center center' }}
                    className="transition-transform duration-150 max-w-full max-h-full flex items-center justify-center shadow-xl rounded-2xl p-6 bg-white dark:bg-[#13151f] border border-gray-200 dark:border-white/10"
                    dangerouslySetInnerHTML={{ __html: artifact.content }}
                  />
                </div>
              </div>
            )}

            {/* Markdown Document Preview */}
            {artifactType === 'markdown' && (
              <div className="flex-1 p-8 overflow-y-auto">
                <div
                  className="max-w-3xl mx-auto p-8 rounded-2xl bg-white dark:bg-[#13151f] border border-gray-200 dark:border-[#1e2230] shadow-md prose dark:prose-invert prose-sm"
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
            <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-[#12141c] border-b border-gray-200 dark:border-[#1e2230] select-none shrink-0 text-gray-500 dark:text-gray-400">
              <span className="text-[11px] font-medium">Syntax: {artifact.language}</span>
              <button
                type="button"
                onClick={() => setWrapCode((w) => !w)}
                className={`text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  wrapCode
                    ? 'bg-sky-500/15 text-sky-400 font-semibold'
                    : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {wrapCode ? 'Wrap: On' : 'Wrap: Off'}
              </button>
            </div>

            {/* Code Editor Body with Line Numbers */}
            <div className="flex-1 overflow-auto bg-white dark:bg-[#0c0d12] p-4 flex">
              {/* Line Numbers Column */}
              <div className="select-none pr-4 text-right text-gray-400 dark:text-gray-600 font-mono text-xs border-r border-gray-200 dark:border-[#1c202c] shrink-0">
                {codeLines.map((_, i) => (
                  <div key={i} className="leading-5">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Code Text Content */}
              <pre
                className={`flex-1 pl-4 m-0 font-mono text-xs text-gray-900 dark:text-gray-100 leading-5 outline-none ${
                  wrapCode ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                }`}
              >
                <code>{artifact.content}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ArtifactCanvasPane;
