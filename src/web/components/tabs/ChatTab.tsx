import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowUp,
  Mic,
  Plus,
  Paperclip,
  Copy,
  Check,
  Volume2,
  Square,
  Terminal,
  RefreshCw,
  X,
  FileText,
  FileCode,
  Image as ImageIcon,
  Video,
  Headphones,
  File,
  HelpCircle,
  Target,
  Minimize2,
  Clock,
  Globe,
  ListOrdered,
  MessageSquareText,
  Users,
  Activity,
  Trash2,
  Camera,
  Lock,
  Sparkles,
  Code2,
  Shapes,
  ExternalLink,
} from 'lucide-react';
import { ArtifactCanvasPane, Artifact } from '../ArtifactCanvasPane';
import { PerplexitySourcesBar } from '../PerplexitySourcesBar';
import { GroundingMetadata } from '../../types/jarvis';
import { highlightCode } from '../../utils/syntaxHighlight';
import { AnimatePresence, motion } from 'motion/react';
import { marked } from 'marked';
import { JarvisConfig, AiProvider, Conversation, ChatMessage, AttachedFileInfo } from '../../types/jarvis';
import GlideSelect, { GlideSelectOption } from './GlideSelect';
import {
  CURATED_MODELS,
  GeminiLogo,
  GroqLogo,
  OllamaLogo,
  OpenRouterLogo,
  OmniRouterLogo,
  OpenAILogo,
  GrokLogo,
  DeepSeekLogo,
  QwenLogo,
} from './AiBrainTab';
import { Sliders } from 'lucide-react';
import GradientASCII from './GradientASCII';
import LatticeLoader from './LatticeLoader';
import WarmTooltip, { WarmTooltipGroup } from '../WarmTooltip';
import { getEffectiveHotkeys, matchesHotkey } from '../../utils/hotkeys';

import grokkiIcon from '../../assets/grokki_icon.svg';
import { ImageLightboxModal } from '../ImageLightboxModal';
import { ChatImageAttachment, isImageAttachment } from '../ChatImageAttachment';

const GRADIENT_ASCII_COLORS = ['#23378e', '#f6f8ff', '#a5d8ff', '#38bdf8'];

interface ChatTabProps {
  config: JarvisConfig;
  userName: string;
  onNavigateTab: (tabId: any) => void;
  activeConversation: Conversation;
  onUpdateMessages: (updater: (prevMessages: ChatMessage[]) => ChatMessage[]) => void;
  onNewChat: () => void;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
}

interface SlashCommand {
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  hasArg: boolean;
}

const STUDIO_SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'btw',
    desc: 'Ask a quick question without interrupting the main conversation.',
    icon: HelpCircle,
    hasArg: true,
  },
  {
    name: 'goal',
    desc: 'Run until the specified goal is completely finished.',
    icon: Target,
    hasArg: true,
  },
  {
    name: 'compact',
    desc: 'Compact the conversation now (summarize history to free up the context window).',
    icon: Minimize2,
    hasArg: false,
  },
  {
    name: 'schedule',
    desc: 'Run an instruction on a recurring schedule or as a one-time timer.',
    icon: Clock,
    hasArg: true,
  },
  {
    name: 'browser',
    desc: 'Invoke a browser agent for web tasks.',
    icon: Globe,
    hasArg: true,
  },
  {
    name: 'plan',
    desc: 'Plan carefully before executing a task.',
    icon: ListOrdered,
    hasArg: true,
  },
  {
    name: 'grill-me',
    desc: 'Interview me to align on a plan.',
    icon: MessageSquareText,
    hasArg: true,
  },
  {
    name: 'teamwork-preview',
    desc: 'Invoke a team of agents to autonomously tackle large projects.',
    icon: Users,
    hasArg: true,
  },
  {
    name: 'status',
    desc: 'Check live PC health, CPU load, RTX GPU temp, and memory usage.',
    icon: Activity,
    hasArg: false,
  },
  {
    name: 'clean',
    desc: 'Clear temporary junk cache files and purge recycle bin.',
    icon: Trash2,
    hasArg: false,
  },
  {
    name: 'screenshot',
    desc: 'Capture a clean fullscreen screenshot to Desktop and clipboard.',
    icon: Camera,
    hasArg: false,
  },
  {
    name: 'lock',
    desc: 'Immediately lock Windows workstation.',
    icon: Lock,
    hasArg: false,
  },
  {
    name: 'notes',
    desc: 'Generate study notes or meeting summary document to Desktop.',
    icon: FileText,
    hasArg: true,
  },
];

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function isVideoAttachment(file?: AttachedFileInfo | null): boolean {
  if (!file) return false;
  if (file.category === 'video') return true;
  const e = (file.ext || '').toLowerCase();
  return ['.mp4', '.mkv', '.mov', '.webm', '.avi', '.flv', '.wmv', '.m4v'].includes(e);
}

function getFileIcon(ext?: string) {
  const e = (ext || '').toLowerCase();
  const iconClass = 'w-4 h-4 text-gray-800 dark:text-gray-100';
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp'].includes(e)) {
    return <ImageIcon className={iconClass} />;
  }
  if (['.mp4', '.mkv', '.mov', '.webm', '.avi', '.flv', '.wmv', '.m4v'].includes(e)) {
    return <Video className={iconClass} />;
  }
  if (['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'].includes(e)) {
    return <Headphones className={iconClass} />;
  }
  if (['.js', '.ts', '.tsx', '.jsx', '.py', '.html', '.css', '.json', '.cpp', '.c', '.cs', '.java', '.go', '.rs'].includes(e)) {
    return <FileCode className={iconClass} />;
  }
  if (['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.csv', '.xlsx', '.pptx'].includes(e)) {
    return <FileText className={iconClass} />;
  }
  return <File className={iconClass} />;
}

const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
const CANVAS_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>`;

export function extractArtifactFromMessage(content: string): Artifact | null {
  const match = content.match(/```([a-zA-Z0-9_+-]+)?\n([\s\S]*?)```/);
  if (!match) return null;

  const lang = (match[1] || 'code').toLowerCase().trim();
  const code = match[2].trim();

  if (code.split('\n').length < 4 && !['html', 'svg', 'tsx', 'jsx'].includes(lang)) {
    return null;
  }

  let title = `${lang.toUpperCase()} Component`;
  if (lang === 'html') {
    const titleMatch = code.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = titleMatch ? titleMatch[1].trim() : 'index.html';
  } else if (lang === 'svg') {
    title = 'vector-graphic.svg';
  } else if (['tsx', 'jsx', 'react'].includes(lang)) {
    const compMatch = code.match(/(?:function|const|class)\s+([A-Z][a-zA-Z0-9]+)/);
    title = compMatch ? `${compMatch[1]}.tsx` : 'Component.tsx';
  } else if (lang === 'python' || lang === 'py') {
    title = 'script.py';
  } else if (lang === 'javascript' || lang === 'js') {
    title = 'app.js';
  } else if (lang === 'markdown' || lang === 'md') {
    const h1Match = code.match(/^#\s+(.+)$/m);
    title = h1Match ? `${h1Match[1].trim()}.md` : 'document.md';
  } else {
    title = `snippet.${lang}`;
  }

  return {
    id: `art-${code.length}-${lang}`,
    title,
    language: lang,
    content: code,
  };
}

function getLanguageLogoSvg(lang: string): string {
  const l = (lang || 'code').toLowerCase().trim();

  if (l === 'python' || l === 'py') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.9 2C7.8 2 8.1 3.8 8.1 3.8V5.7H12V6.3H6.5C6.5 6.3 3.8 6 3.8 10.1C3.8 14.2 6.2 14.1 6.2 14.1H7.6V12.1C7.6 12.1 7.5 9.7 10 9.7H14.1C14.1 9.7 16.4 9.7 16.4 7.5V4.1C16.4 4.1 16.7 2 11.9 2ZM9.6 3.3C10 3.3 10.4 3.6 10.4 4.1C10.4 4.5 10 4.9 9.6 4.9C9.1 4.9 8.8 4.5 8.8 4.1C8.8 3.6 9.1 3.3 9.6 3.3Z" fill="#3776AB"/>
      <path d="M12.1 22C16.2 22 15.9 20.2 15.9 20.2V18.3H12V17.7H17.5C17.5 17.7 20.2 18 20.2 13.9C20.2 9.8 17.8 9.9 17.8 9.9H16.4V11.9C16.4 11.9 16.5 14.3 14 14.3H9.9C9.9 14.3 7.6 14.3 7.6 16.5V19.9C7.6 19.9 7.3 22 12.1 22ZM14.4 20.7C14 20.7 13.6 20.4 13.6 19.9C13.6 19.5 14 19.1 14.4 19.1C14.9 19.1 15.2 19.5 15.2 19.9C15.2 20.4 14.9 20.7 14.4 20.7Z" fill="#FFD43B"/>
    </svg>`;
  }

  if (l === 'javascript' || l === 'js' || l === 'mjs' || l === 'cjs') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="3.5" fill="#F7DF1E"/>
      <path d="M12.8 16.9c0 1.4-.8 2.1-2.1 2.1-1.1 0-1.8-.6-2.1-1.3l1.2-.7c.2.4.5.7.9.7.5 0 .8-.2.8-.9v-5.1h1.3v5.2zm4.8 2.1c-1.4 0-2.3-.7-2.7-1.6l1.2-.7c.3.5.7.9 1.5.9.6 0 1-.3 1-.7 0-.5-.4-.7-1.1-1l-.4-.2c-1.1-.5-1.9-1.1-1.9-2.3 0-1.2.9-2.1 2.3-2.1 1 0 1.7.4 2.2 1.3l-1.2.8c-.3-.5-.6-.7-1-.7-.5 0-.8.3-.8.7 0 .5.3.7 1 .9l.4.2c1.3.6 2 1.1 2 2.4 0 1.4-1.1 2.1-2.5 2.1z" fill="#18181b"/>
    </svg>`;
  }

  if (l === 'typescript' || l === 'ts' || l === 'mts' || l === 'cts') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="3.5" fill="#3178C6"/>
      <path d="M13.2 12.6h-2.3v6.2H9.5v-6.2H7.2v-1.2h6v1.2zm4.1 6.3c-1.3 0-2.3-.6-2.7-1.5l1.2-.7c.3.5.8.9 1.5.9.6 0 1-.3 1-.7 0-.5-.3-.7-1.1-1l-.4-.2c-1.1-.5-1.8-1-1.8-2.2 0-1.1.9-2 2.3-2 1 0 1.7.4 2.2 1.2l-1.1.7c-.2-.4-.6-.7-1.1-.7-.5 0-.8.3-.8.7 0 .4.3.6 1 .9l.4.2c1.3.5 2 1.1 2 2.3 0 1.3-1.1 2.1-2.6 2.1z" fill="#ffffff"/>
    </svg>`;
  }

  if (l === 'jsx' || l === 'tsx' || l === 'react') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="2" fill="#61DAFB"/>
      <ellipse cx="12" cy="12" rx="9" ry="3.6" stroke="#61DAFB" stroke-width="1.6"/>
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" stroke="#61DAFB" stroke-width="1.6"/>
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" stroke="#61DAFB" stroke-width="1.6"/>
    </svg>`;
  }

  if (l === 'html' || l === 'htm' || l === 'xml' || l === 'svg') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2l1.5 17L12 22l6.5-3L20 2H4zm13.1 5.5H9.1l.2 2.2h7.6l-.6 6.6-4.3 1.2-4.3-1.2-.3-3.3h2.1l.2 1.7 2.3.6 2.3-.6.2-2.7H7.3L6.8 5.4h10.5l-.2 2.1z" fill="#E34F26"/>
    </svg>`;
  }

  if (l === 'css' || l === 'scss' || l === 'sass' || l === 'less') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2l1.5 17L12 22l6.5-3L20 2H4zm12.7 14.3L12 17.6l-4.7-1.3-.3-3.3h2.1l.2 1.7 2.7.7 2.7-.7.3-2.9H9.3l-.2-2.1h6.1l.2-2.2H7L6.8 5.4h10.5l-.6 10.9z" fill="#2965F1"/>
    </svg>`;
  }

  if (l === 'c' || l === 'cpp' || l === 'c++' || l === 'cc' || l === 'cxx' || l === 'h' || l === 'hpp') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
      <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="#00599C"/>
      <path d="M12 7.5a4.5 4.5 0 1 0 3.9 6.7l-1.7-1a2.5 2.5 0 1 1 0-2.4l1.7-1A4.5 4.5 0 0 0 12 7.5z" fill="#ffffff"/>
    </svg>`;
  }

  if (l === 'csharp' || l === 'cs' || l === 'c#') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
      <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="#68217A"/>
      <path d="M10.5 7.5a4.5 4.5 0 1 0 3.9 6.7l-1.7-1a2.5 2.5 0 1 1 0-2.4l1.7-1a4.5 4.5 0 0 0-3.9-2.3z" fill="#ffffff"/>
    </svg>`;
  }

  if (l === 'java') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.5 17.5c-2.5.7 1.5 2.1 4.6 1.5 1.2-.2 2.8-.8 2.8-.8s-.8.3-1.7.4c-2.4.3-5.3.2-4.3-.6.8-.5 2.8-.4 2.8-.4" stroke="#5382A1" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M13 3c1 2-1.8 3.2-1.2 5 .5 1.3 2.2 2 1.2 4-.5-1.4-2.4-2-1.9-4.1C11.5 6 13.5 4.8 13 3z" fill="#E76F00"/>
      <path d="M7 14c0 1.4 3.5 2 6.8 1.2 1.5-.3 2.7-.9 2.7-1.5" stroke="#5382A1" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;
  }

  if (l === 'rust' || l === 'rs') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="7.5" stroke="#DEA584" stroke-width="2" stroke-dasharray="2.5 1.5"/>
      <path d="M9.5 15V9h3.2c1.2 0 2 .6 2 1.7 0 .8-.5 1.4-1.3 1.6l1.6 2.7h-1.8l-1.4-2.5H11V15H9.5z" fill="#DEA584"/>
    </svg>`;
  }

  if (l === 'go' || l === 'golang') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="20" height="16" rx="4" fill="#00ADD8"/>
      <text x="12" y="15" text-anchor="middle" fill="#ffffff" font-family="monospace" font-weight="bold" font-size="9.5">GO</text>
    </svg>`;
  }

  if (l === 'bash' || l === 'sh' || l === 'shell' || l === 'zsh' || l === 'console' || l === 'terminal' || l === 'powershell' || l === 'ps1' || l === 'pwsh' || l === 'cmd' || l === 'bat') {
    const color = l.startsWith('p') ? '#5391FE' : '#4EAA25';
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="20" height="18" rx="3" stroke="${color}" stroke-width="2"/>
      <path d="M6.5 9l3.5 3-3.5 3M12 15h5" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  if (l === 'json' || l === 'yaml' || l === 'yml' || l === 'toml') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 4H6a2 2 0 0 0-2 2v3.5a2.5 2.5 0 0 1-2 2.5 2.5 2.5 0 0 1 2 2.5V18a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v3.5a2.5 2.5 0 0 0 2 2.5 2.5 2.5 0 0 0-2 2.5V18a2 2 0 0 1-2 2h-2" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  if (l === 'sql' || l === 'mysql' || l === 'postgres' || l === 'postgresql' || l === 'sqlite') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="5" rx="8" ry="3" stroke="#38BDF8" stroke-width="2"/>
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" stroke="#38BDF8" stroke-width="2"/>
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" stroke="#38BDF8" stroke-width="2"/>
    </svg>`;
  }

  return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

const htmlRenderCache = new Map<string, string>();
const MAX_CACHE_SIZE = 400;

function formatRichMarkdownHtml(rawContent: string, grounding?: GroundingMetadata): string {
  if (!rawContent) return '';
  const cacheKey = grounding && grounding.sources ? `${rawContent}__g_${grounding.sources.length}` : rawContent;
  if (htmlRenderCache.has(cacheKey)) {
    return htmlRenderCache.get(cacheKey)!;
  }

  // Normalize inline or line-leading Unicode bullets (•) into numbered list items (1. 2. 3.)
  let normalized = rawContent
    .replace(/\s+•\s+(\*\*\[)/g, '\n• $1')
    .replace(/\s+•\s+(\*\.\.\.)/g, '\n\n$1');

  const lines = normalized.split('\n');
  let bulletCounter = 0;
  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (/^•\s+\*\.\.\./.test(trimmed)) {
      bulletCounter = 0;
      return trimmed.replace(/^•\s+/, '');
    }
    if (/^•\s+/.test(trimmed)) {
      bulletCounter++;
      return line.replace(/^(\s*)•\s+/, `$1${bulletCounter}. `);
    }
    if (trimmed === '' || /^#{1,6}\s/.test(trimmed)) {
      bulletCounter = 0;
    }
    return line;
  });
  normalized = processedLines.join('\n');

  const rawHtml = marked.parse(normalized, { breaks: true, gfm: true }) as string;
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // 1. Enhance <pre><code> blocks into Code Windows with Header & Copy Button
  doc.querySelectorAll('pre').forEach((pre) => {
    const codeEl = pre.querySelector('code');
    const className = codeEl?.className || '';
    const langMatch = className.match(/language-([a-zA-Z0-9_+-]+)/);
    const lang = langMatch ? langMatch[1].toLowerCase() : 'code';
    const langLogoSvg = getLanguageLogoSvg(lang);

    if (codeEl) {
      const rawCode = codeEl.textContent || '';
      codeEl.innerHTML = highlightCode(rawCode, lang);
    }

    const wrapper = doc.createElement('div');
    wrapper.className = 'grokki-code-window';

    const header = doc.createElement('div');
    header.className = 'grokki-code-header';
    header.innerHTML = `
      <div class="grokki-code-header-left">
        <span class="grokki-code-lang-icon">${langLogoSvg}</span>
        <span class="grokki-code-lang">${lang}</span>
      </div>
      <div class="grokki-code-header-actions">
        <button type="button" class="grokki-canvas-open-btn" aria-label="Open in Canvas">
          ${CANVAS_ICON_SVG}
          <span>Canvas</span>
        </button>
        <button type="button" class="grokki-code-copy-btn" aria-label="Copy code">
          ${COPY_ICON_SVG}
          <span>Copy</span>
        </button>
      </div>
    `;

    pre.classList.add('grokki-code-pre');
    pre.parentNode?.replaceChild(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });

  // 2. Wrap <table> in a scrollable styled container
  doc.querySelectorAll('table').forEach((table) => {
    if (table.parentElement?.classList.contains('grokki-table-wrapper')) return;
    const wrapper = doc.createElement('div');
    wrapper.className = 'grokki-table-wrapper';
    table.parentNode?.replaceChild(wrapper, table);
    wrapper.appendChild(table);
  });

  // 3. Style <a> links as distinct colored links / link pills & prevent native Electron popup windows
  doc.querySelectorAll('a').forEach((a) => {
    const rawHref = a.getAttribute('href') || '';
    if (rawHref && !rawHref.startsWith('#')) {
      a.setAttribute('data-external-href', rawHref);
      a.setAttribute('href', '#');
      a.setAttribute('title', rawHref);
    }
    a.removeAttribute('target');
    a.setAttribute('rel', 'noopener noreferrer');
    const text = (a.textContent || '').trim();
    if (text.includes('↗') || /^(open|view)\b/i.test(text)) {
      a.classList.add('grokki-link-pill');
    } else {
      a.classList.add('grokki-link');
    }
  });

  let finalHtml = doc.body.innerHTML;

  // Transform [1], [2], [1, 2] citations into interactive Perplexity citation badges
  finalHtml = finalHtml.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (match, digits) => {
    const ids = digits.split(',').map((s: string) => s.trim());
    let titleAttr = `Source ${digits}`;
    if (grounding && grounding.sources) {
      const matchedTitles = ids
        .map((id: string) => grounding.sources.find((s) => s.id === parseInt(id, 10))?.title)
        .filter(Boolean);
      if (matchedTitles.length > 0) {
        titleAttr = matchedTitles.join(' • ');
      }
    }
    return `<button type="button" class="grokki-citation-pill" data-citation="${digits.replace(/\s+/g, '')}" title="${titleAttr}">[${digits}]</button>`;
  });

  if (htmlRenderCache.size >= MAX_CACHE_SIZE) {
    const firstKey = htmlRenderCache.keys().next().value;
    if (firstKey !== undefined) htmlRenderCache.delete(firstKey);
  }
  htmlRenderCache.set(cacheKey, finalHtml);
  return finalHtml;
}

const StaticMessageContent = React.memo<{
  content: string;
  grounding?: GroundingMetadata;
  onOpenArtifact?: (artifact: Artifact) => void;
}>(({ content, grounding, onOpenArtifact }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rawHtml = useMemo(() => formatRichMarkdownHtml(content, grounding), [content, grounding]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;

    // 0. Handle Citation pill click
    const citationBtn = target?.closest('.grokki-citation-pill') as HTMLElement | null;
    if (citationBtn) {
      e.preventDefault();
      e.stopPropagation();
      const citationIds = (citationBtn.getAttribute('data-citation') || '').split(',');
      const firstId = parseInt(citationIds[0], 10);
      const matchedSource = grounding?.sources?.find((s) => s.id === firstId);
      if (matchedSource && matchedSource.url) {
        if (window.jarvisAPI?.openUrl) {
          window.jarvisAPI.openUrl(matchedSource.url);
        } else {
          window.open(matchedSource.url, '_blank');
        }
      }
      return;
    }

    // 1. Open links externally in the user's system browser
    const anchor = target?.closest('a') as HTMLAnchorElement | null;
    if (anchor) {
      e.preventDefault();
      e.stopPropagation();
      const externalUrl = anchor.getAttribute('data-external-href') || anchor.getAttribute('href') || '';
      if (externalUrl && externalUrl !== '#') {
        window.jarvisAPI?.openUrl(externalUrl);
      }
      return;
    }

    // 2. Open code block in Canvas
    const canvasBtn = target?.closest('.grokki-canvas-open-btn') as HTMLButtonElement | null;
    if (canvasBtn) {
      e.stopPropagation();
      const codeWindow = canvasBtn.closest('.grokki-code-window');
      const codeEl = codeWindow?.querySelector('pre code, pre');
      const rawCode = codeEl?.textContent || '';
      const langEl = codeWindow?.querySelector('.grokki-code-lang');
      const language = (langEl?.textContent || 'code').toLowerCase().trim();
      onOpenArtifact?.({
        id: 'art-' + Date.now(),
        title: `${language.toUpperCase()} Snippet`,
        language,
        content: rawCode,
      });
      return;
    }

    // 3. Copy code block content
    const copyBtn = target?.closest('.grokki-code-copy-btn') as HTMLButtonElement | null;
    if (!copyBtn) return;
    e.stopPropagation();
    const codeWindow = copyBtn.closest('.grokki-code-window');
    const codeEl = codeWindow?.querySelector('pre code, pre');
    const rawCode = codeEl?.textContent || '';
    navigator.clipboard.writeText(rawCode);
    copyBtn.classList.add('copied');
    copyBtn.innerHTML = `${CHECK_ICON_SVG}<span>Copied!</span>`;
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.innerHTML = `${COPY_ICON_SVG}<span>Copy</span>`;
    }, 2000);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed select-text"
      dangerouslySetInnerHTML={{ __html: rawHtml }}
    />
  );
});

const MARKDOWN_RENDER_REV = 3;

const AnimatedMessageContent: React.FC<{
  content: string;
  grounding?: GroundingMetadata;
  isAnimated?: boolean;
  speed?: 'fast' | 'normal' | 'relaxed';
  onScroll?: () => void;
  onFinished?: () => void;
  onOpenArtifact?: (artifact: Artifact) => void;
}> = ({ content, grounding, isAnimated, speed = 'fast', onScroll, onFinished, onOpenArtifact }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;

    // 0. Handle Citation pill click
    const citationBtn = target?.closest('.grokki-citation-pill') as HTMLElement | null;
    if (citationBtn) {
      e.preventDefault();
      e.stopPropagation();
      const citationIds = (citationBtn.getAttribute('data-citation') || '').split(',');
      const firstId = parseInt(citationIds[0], 10);
      const matchedSource = grounding?.sources?.find((s) => s.id === firstId);
      if (matchedSource && matchedSource.url) {
        if (window.jarvisAPI?.openUrl) {
          window.jarvisAPI.openUrl(matchedSource.url);
        } else {
          window.open(matchedSource.url, '_blank');
        }
      }
      return;
    }

    // 1. Open links externally in the user's system browser
    const anchor = target?.closest('a') as HTMLAnchorElement | null;
    if (anchor) {
      e.preventDefault();
      e.stopPropagation();
      const externalUrl = anchor.getAttribute('data-external-href') || anchor.getAttribute('href') || '';
      if (externalUrl && externalUrl !== '#') {
        window.jarvisAPI?.openUrl(externalUrl);
      }
      return;
    }

    // 2. Open code block in Canvas
    const canvasBtn = target?.closest('.grokki-canvas-open-btn') as HTMLButtonElement | null;
    if (canvasBtn) {
      e.stopPropagation();
      const codeWindow = canvasBtn.closest('.grokki-code-window');
      const codeEl = codeWindow?.querySelector('pre code, pre');
      const rawCode = codeEl?.textContent || '';
      const langEl = codeWindow?.querySelector('.grokki-code-lang');
      const language = (langEl?.textContent || 'code').toLowerCase().trim();
      onOpenArtifact?.({
        id: 'art-' + Date.now(),
        title: `${language.toUpperCase()} Snippet`,
        language,
        content: rawCode,
      });
      return;
    }

    // 3. Copy code block content
    const copyBtn = target?.closest('.grokki-code-copy-btn') as HTMLButtonElement | null;
    if (!copyBtn) return;
    e.stopPropagation();
    const codeWindow = copyBtn.closest('.grokki-code-window');
    const codeEl = codeWindow?.querySelector('pre code, pre');
    const rawCode = codeEl?.textContent || '';
    navigator.clipboard.writeText(rawCode);
    copyBtn.classList.add('copied');
    copyBtn.innerHTML = `${CHECK_ICON_SVG}<span>Copied!</span>`;
    setTimeout(() => {
      copyBtn.classList.remove('copied');
      copyBtn.innerHTML = `${COPY_ICON_SVG}<span>Copy</span>`;
    }, 2000);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rawHtml = formatRichMarkdownHtml(content);

    if (!isAnimated) {
      container.innerHTML = rawHtml;
      return;
    }

    // Parse HTML and wrap non-whitespace words in animated spans
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    let totalWords = 0;

    function walk(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text || !text.trim()) return;

        const frag = doc.createDocumentFragment();
        const tokens = text.split(/(\s+)/);
        for (const tok of tokens) {
          if (!tok) continue;
          if (/^\s+$/.test(tok)) {
            frag.appendChild(doc.createTextNode(tok));
          } else {
            const span = doc.createElement('span');
            span.className = 'grokki-typing-word grokki-word-hidden';
            span.textContent = tok;
            frag.appendChild(span);
            totalWords++;
          }
        }
        node.parentNode?.replaceChild(frag, node);
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (['SCRIPT', 'STYLE', 'SVG'].includes(el.tagName)) return;
        if (el.classList.contains('grokki-code-header')) return;
        Array.from(node.childNodes).forEach(walk);
      }
    }

    Array.from(doc.body.childNodes).forEach(walk);

    if (totalWords === 0) {
      container.innerHTML = rawHtml;
      onFinished?.();
      return;
    }

    container.innerHTML = doc.body.innerHTML;
    container.classList.add('grokki-typing-active');

    const wordNodes = Array.from(container.querySelectorAll<HTMLElement>('.grokki-word-hidden'));
    const cursor = document.createElement('span');
    cursor.className = 'grokki-typing-cursor';

    let currentIndex = 0;
    const msPerWord = speed === 'relaxed' ? 36 : speed === 'normal' ? 22 : 12;
    const targetTotalTime = Math.min(3200, Math.max(350, totalWords * msPerWord));
    const tickInterval = 18;
    const totalTicks = targetTotalTime / tickInterval;
    const wordsPerTick = Math.max(1, Math.ceil(totalWords / totalTicks));

    let timer: any = null;
    let finished = false;

    const finishTyping = () => {
      if (finished) return;
      finished = true;
      if (timer) clearInterval(timer);
      timer = null;
      wordNodes.forEach((s) => {
        s.classList.remove('grokki-word-hidden');
        s.classList.add('grokki-word-fade');
      });
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      container.classList.remove('grokki-typing-active');
      onFinished?.();
    };

    const revealBatch = () => {
      const end = Math.min(currentIndex + wordsPerTick, totalWords);
      for (let i = currentIndex; i < end; i++) {
        const s = wordNodes[i];
        s.classList.remove('grokki-word-hidden');
        s.classList.add('grokki-word-fade');
      }
      if (end > 0 && end <= totalWords) {
        wordNodes[end - 1].after(cursor);
      }
      currentIndex = end;
      onScroll?.();

      if (currentIndex >= totalWords) {
        finishTyping();
      }
    };

    container.addEventListener('click', finishTyping, { once: true });
    timer = setInterval(revealBatch, tickInterval);
    revealBatch();

    return () => {
      if (timer) clearInterval(timer);
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
    };
  }, [content, isAnimated, MARKDOWN_RENDER_REV]);

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="grokki-markdown max-w-none text-gray-800 dark:text-gray-200 text-[13.5px] leading-relaxed font-sans"
    />
  );
};

export const ChatTab = React.memo<ChatTabProps>(({
  config,
  userName,
  onNavigateTab,
  activeConversation,
  onUpdateMessages,
  onNewChat,
  onChangeConfig,
}) => {
  const messages = activeConversation.messages;
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFileInfo | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Slash Commands state
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);

  // AI Brain Detection & Model Selection
  const activeBrain = (config.provider || 'gemini') as AiProvider;

  const brainMeta: Record<AiProvider, {
    name: string;
    modelField: keyof JarvisConfig;
    defaultModel: string;
    Logo: React.FC<{ className?: string }>;
  }> = useMemo(() => ({
    gemini: { name: 'Gemini', modelField: 'geminiModel', defaultModel: 'gemini-2.5-flash', Logo: GeminiLogo },
    groq: { name: 'Groq', modelField: 'groqModel', defaultModel: 'llama-3.3-70b-versatile', Logo: GroqLogo },
    ollama: { name: 'Ollama', modelField: 'ollamaModel', defaultModel: 'llama3.2', Logo: OllamaLogo },
    openrouter: { name: 'OpenRouter', modelField: 'openrouterModel', defaultModel: 'openrouter/auto', Logo: OpenRouterLogo },
    omnirouter: { name: 'OmniRouter', modelField: 'omnirouterModel', defaultModel: 'omnirouter/auto', Logo: OmniRouterLogo },
    openai: { name: 'OpenAI', modelField: 'openaiModel', defaultModel: 'gpt-4o', Logo: OpenAILogo },
    grok: { name: 'Grok', modelField: 'grokModel', defaultModel: 'grok-2-1212', Logo: GrokLogo },
    deepseek: { name: 'DeepSeek', modelField: 'deepseekModel', defaultModel: 'deepseek-chat', Logo: DeepSeekLogo },
    qwen: { name: 'Qwen', modelField: 'qwenModel', defaultModel: 'qwen-max', Logo: QwenLogo },
  }), []);

  const currentBrainInfo = brainMeta[activeBrain] || brainMeta.gemini;
  const currentModelValue = (config[currentBrainInfo.modelField] as string) || currentBrainInfo.defaultModel;

  const handleSelectModel = useCallback((selectedVal: string) => {
    if (selectedVal === '__switch_brain__') {
      onNavigateTab('ai');
      return;
    }
    const patch: Partial<JarvisConfig> = {
      [currentBrainInfo.modelField]: selectedVal,
    };
    onChangeConfig?.(patch);
    if (window.jarvisAPI?.saveConfig) {
      window.jarvisAPI.saveConfig(patch);
    }
  }, [currentBrainInfo.modelField, onChangeConfig, onNavigateTab]);

  const modelOptions: GlideSelectOption[] = useMemo(() => {
    const rawList = CURATED_MODELS[activeBrain] || [];
    const BrainLogo = currentBrainInfo.Logo;

    const opts: GlideSelectOption[] = rawList.map((m) => {
      const displayLabel = m.label.replace(/^openrouter\/|^omnirouter\//, '');
      return {
        value: m.value,
        label: (
          <span className="flex items-center gap-1.5 truncate max-w-[210px] text-[11px]">
            <BrainLogo className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </span>
        ),
        tag: m.tag,
      };
    });

    if (currentModelValue && !opts.some((o) => o.value === currentModelValue)) {
      const displayLabel = currentModelValue.replace(/^openrouter\/|^omnirouter\//, '');
      opts.unshift({
        value: currentModelValue,
        label: (
          <span className="flex items-center gap-1.5 truncate max-w-[210px] text-[11px]">
            <BrainLogo className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </span>
        ),
        tag: 'Active',
      });
    }

    opts.push({
      value: '__switch_brain__',
      label: (
        <span className="flex items-center gap-1.5 text-sky-400 font-semibold text-[11px]">
          <Sliders className="w-3.5 h-3.5 shrink-0 text-sky-400" />
          <span>Configure AI Brains...</span>
        </span>
      ),
      tag: 'Settings',
    });

    return opts;
  }, [activeBrain, currentBrainInfo.Logo, currentModelValue]);

  const renderModelSelector = (placement: 'top' | 'bottom' = 'top', align: 'left' | 'right' = 'left') => {
    const isDark =
      config.dashboardTheme === 'dark' ||
      (typeof document !== 'undefined' &&
        (document.documentElement.classList.contains('dark') ||
          document.body.classList.contains('dark')));

    return (
      <div
        className="flex items-center shrink-0"
        title={`Active Brain: ${currentBrainInfo.name} • Model: ${currentModelValue}`}
      >
        <GlideSelect
          options={modelOptions}
          value={currentModelValue}
          onChange={(val) => handleSelectModel(val)}
          placeholder="Model"
          size="sm"
          radius={8}
          menuWidth={290}
          surfaceColor={isDark ? '#1a1c24' : '#f3f4f6'}
          highlightColor={isDark ? '#272a38' : '#e5e7eb'}
          textColor={isDark ? '#f3f4f6' : '#111827'}
          accentColor={isDark ? '#38bdf8' : '#0284c7'}
          placement={placement}
          align={align}
          popDuration={180}
          glideDuration={200}
          ariaLabel={`AI Brain: ${currentBrainInfo.name} Model Selector`}
        />
      </div>
    );
  };

  const isSlashMode = inputValue.startsWith('/') && !inputValue.includes(' ') && !slashDismissed;
  const slashQuery = isSlashMode ? inputValue.slice(1).toLowerCase().trim() : '';
  const filteredSlashCommands = isSlashMode
    ? STUDIO_SLASH_COMMANDS.filter(
        (c) => c.name.toLowerCase().includes(slashQuery) || c.desc.toLowerCase().includes(slashQuery)
      )
    : [];

  useEffect(() => {
    if (!inputValue.startsWith('/')) {
      setSlashDismissed(false);
      setSlashIndex(0);
    }
  }, [inputValue]);

  useEffect(() => {
    if (slashIndex >= filteredSlashCommands.length) {
      setSlashIndex(0);
    }
  }, [filteredSlashCommands.length]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Voice Synthesizer & Speech-to-Text State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecRef = useRef<any | null>(null);
  const timerRef = useRef<any | null>(null);

  const playSynthSound = (type: 'start' | 'stop') => {
    if (config.soundEffectsEnabled === false) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch (err) {
      console.warn('Audio feedback error:', err);
    }
  };

  const startVoiceRecording = async () => {
    playSynthSound('start');
    setIsRecording(true);
    setRecordingDuration(0);
    setInterimTranscript('');
    audioChunksRef.current = [];

    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufferLength);
      const numBars = 48;
      const barWidth = 4;
      const spacing = 4;
      const smoothedHeights = new Float32Array(numBars).fill(4);

      const drawBars = () => {
        animationFrameRef.current = requestAnimationFrame(drawBars);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyser.getByteFrequencyData(freqData);

        // Detect light vs dark theme: solid black bars on light mode, white on dark mode
        const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
        const barColor = isDark ? '#f3f4f6' : '#111827';

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = barColor;

        const totalWidth = numBars * barWidth + (numBars - 1) * spacing;
        const startX = (canvas.width - totalWidth) / 2;
        const centerY = canvas.height / 2;

        for (let i = 0; i < numBars; i++) {
          // Symmetric distribution for aesthetic vocal waveform curve
          const normIdx = i < numBars / 2 ? i / (numBars / 2) : (numBars - 1 - i) / (numBars / 2);
          const binIndex = Math.min(freqData.length - 1, Math.floor(normIdx * 34));
          const val = freqData[binIndex] || 0;

          // Target height between 4px (idle pill dot) and 34px (active speech)
          const targetH = 4 + (val / 255) * 30;

          // Smooth spring damping for ultra-fluid motion
          smoothedHeights[i] = smoothedHeights[i] * 0.72 + targetH * 0.28;
          const h = Math.max(4, Math.min(34, smoothedHeights[i]));

          const x = startX + i * (barWidth + spacing);
          const y = centerY - h / 2;

          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, barWidth, h, barWidth / 2);
          } else {
            ctx.rect(x, y, barWidth, h);
          }
          ctx.fill();
        }
      };

      drawBars();

      // Native Web Speech Recognition for Realtime Voice-to-Text
      const SpeechRecClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecClass) {
        try {
          const recognition = new SpeechRecClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                final += event.results[i][0].transcript;
              } else {
                interim += event.results[i][0].transcript;
              }
            }
            if (final.trim()) {
              setInputValue((prev) => (prev ? `${prev} ${final.trim()}` : final.trim()));
            }
            setInterimTranscript(interim.trim() || final.trim());
          };

          recognition.onerror = (err: any) => {
            console.warn('[SpeechRec] Recognition notice:', err?.error);
          };

          recognition.start();
          speechRecRef.current = recognition;
        } catch (e) {
          console.warn('SpeechRecognition initialization notice:', e);
        }
      }

      // MediaRecorder fallback / multi-modal audio chunk collection
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      console.error('Failed to access microphone for synthesizer recording:', err);
      stopVoiceRecording();
    }
  };

  const stopVoiceRecording = async () => {
    playSynthSound('stop');
    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch (e) {}
      speechRecRef.current = null;
    }

    let recordedBlob: Blob | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        if (audioChunksRef.current.length > 0) {
          recordedBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType || 'audio/webm' });
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // Multimodal Gemini Audio Fallback if speech recognition returned empty
    if ((!inputValue.trim() || interimTranscript) && recordedBlob && window.jarvisAPI?.executeAIAudio) {
      try {
        const arrayBuffer = await recordedBlob.arrayBuffer();
        const base64Audio = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const res = await window.jarvisAPI.executeAIAudio({
          base64Audio,
          mimeType: recordedBlob.type || 'audio/webm',
        });
        if (res && res.transcript && res.transcript !== 'Voice command') {
          setInputValue((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
        }
      } catch (e) {
        console.warn('AI audio transcription fallback notice:', e);
      }
    }

    setInterimTranscript('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (speechRecRef.current) {
        try { speechRecRef.current.stop(); } catch (e) {}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  const scrollRafRef = useRef<number | null>(null);
  const scrollToBottom = useCallback((smooth = false) => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (messagesEndRef.current) {
        const useSmooth = config?.smoothScroll !== false && smooth;
        messagesEndRef.current.scrollIntoView({ behavior: useSmooth ? 'smooth' : 'auto', block: 'end' });
      }
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
    }
  }, [messages, loading, scrollToBottom]);

  // Big-Scale Image Lightbox Zoom Modal State
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    src: string;
    name: string;
    size?: number;
    path?: string;
    originRect?: { top: number; left: number; width: number; height: number };
  }>({
    isOpen: false,
    src: '',
    name: '',
  });

  const openLightbox = (
    src: string,
    name: string,
    size?: number,
    path?: string,
    originRect?: { top: number; left: number; width: number; height: number }
  ) => {
    setLightboxState({ isOpen: true, src, name, size, path, originRect });
  };

  const closeLightbox = () => {
    setLightboxState((prev) => ({ ...prev, isOpen: false }));
  };

  // WhatsApp-style Attachment Menu & Camera Capture State
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [activeAttachCategory, setActiveAttachCategory] = useState<'document' | 'photo' | 'video' | 'audio'>('document');
  const [fileAcceptFilter, setFileAcceptFilter] = useState<string>('*/*');
  const attachMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Camera Modal State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraPreviewUrl, setCameraPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!attachMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (attachMenuRef.current && target && !attachMenuRef.current.contains(target)) {
        setAttachMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [attachMenuOpen]);

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
  };

  const openCameraModal = async () => {
    setAttachMenuOpen(false);
    setCameraError(null);
    setCameraPreviewUrl(null);
    setCameraModalOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch (err: any) {
      setCameraError(err?.message || 'Unable to access camera. Check camera permissions.');
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setCameraModalOpen(false);
    setCameraPreviewUrl(null);
    setCameraError(null);
  };

  const handleCaptureCameraPhoto = () => {
    const video = cameraVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCameraPreviewUrl(dataUrl);
  };

  const handleRetakeCameraPhoto = async () => {
    setCameraPreviewUrl(null);
    if (cameraVideoRef.current && cameraStreamRef.current) {
      cameraVideoRef.current.srcObject = cameraStreamRef.current;
      cameraVideoRef.current.play().catch(() => {});
    }
  };

  const handleConfirmCameraPhoto = async () => {
    if (!cameraPreviewUrl) return;
    try {
      const res = await fetch(cameraPreviewUrl);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const fileName = `Camera_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.jpg`;

      if (window.jarvisAPI?.saveTempFile) {
        const saved = await window.jarvisAPI.saveTempFile({ name: fileName, buffer: arrayBuffer });
        if (saved?.success && saved.path) {
          setAttachedFile({
            path: saved.path,
            name: fileName,
            size: blob.size,
            ext: '.jpg',
            category: 'camera',
          });
        }
      }
    } catch (err) {
      console.error('Failed to save camera photo:', err);
    } finally {
      closeCameraModal();
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  };

  const handlePickCategory = (
    category: 'document' | 'photo' | 'video' | 'camera' | 'audio',
    accept: string
  ) => {
    setAttachMenuOpen(false);
    if (category === 'camera') {
      openCameraModal();
      return;
    }
    setActiveAttachCategory(category);
    setFileAcceptFilter(accept);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    }, 20);
  };


  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const fileName = `Pasted_Image_${Date.now()}.png`;
          const previewUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });

          let localPath = '';
          if (window.jarvisAPI?.saveTempFile) {
            try {
              const buf = await file.arrayBuffer();
              const saved = await window.jarvisAPI.saveTempFile({ name: fileName, buffer: buf });
              if (saved?.success && saved.path) {
                localPath = saved.path;
              }
            } catch (err) {}
          }

          setAttachedFile({
            path: localPath || fileName,
            name: fileName,
            size: file.size,
            ext: '.png',
            category: 'photo',
            previewUrl,
          });
          return;
        }
      }
    }
  };

  const handleNativeFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop()!.toLowerCase() : '';
    let localPath = '';
    if (window.jarvisAPI?.getPathForFile) {
      localPath = window.jarvisAPI.getPathForFile(file) || '';
    }
    if (!localPath && window.jarvisAPI?.saveTempFile) {
      try {
        const buf = await file.arrayBuffer();
        const saved = await window.jarvisAPI.saveTempFile({ name: file.name, buffer: buf });
        if (saved?.success && saved.path) {
          localPath = saved.path;
        }
      } catch (err) {}
    }

    const isVid = ['.mp4', '.mkv', '.mov', '.webm', '.avi', '.flv', '.wmv', '.m4v'].includes(ext);
    const isAud = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'].includes(ext);
    const isImg = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(ext);

    const detectedCategory: 'document' | 'photo' | 'video' | 'audio' = isVid
      ? 'video'
      : isAud
      ? 'audio'
      : isImg
      ? 'photo'
      : activeAttachCategory;

    let previewUrl: string | undefined = undefined;
    if (isImg) {
      try {
        previewUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      } catch (e) {}
    }

    setAttachedFile({
      path: localPath || file.name,
      name: file.name,
      size: file.size,
      ext,
      category: detectedCategory,
      previewUrl,
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelectSlashCommand = (cmd: SlashCommand) => {
    if (cmd.hasArg) {
      setInputValue(`/${cmd.name} `);
      setSlashDismissed(true);
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setInputValue('');
      setSlashDismissed(true);
      handleSendMessage(`/${cmd.name}`);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    if (isRecording) {
      stopVoiceRecording();
    }
    let text = (textToSend || inputValue).trim();
    if (!text && !attachedFile) return;

    const currentAttachment = attachedFile;
    const isVideo = isVideoAttachment(currentAttachment);

    if (!text && currentAttachment) {
      text = isVideo
        ? `Attached video: ${currentAttachment.name}`
        : `Analyze and summarize this file: ${currentAttachment.name}`;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFile: currentAttachment || undefined,
    };

    onUpdateMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setAttachedFile(null);
    setSlashDismissed(false);
    setLoading(true);

    try {
      // Strict Video Token Guard: Videos cannot be watched/analyzed (saves tokens), only sent on WhatsApp or uploaded to Drive
      const isShareOrUploadIntent = /\b(whatsapp|google\s+drive|drive|upload|send|share)\b/i.test(text);
      if (isVideo && currentAttachment && !isShareOrUploadIntent) {
        const videoGuardMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `🎬 **Video watching & analysis is disabled** to prevent high token consumption.\n\nYou can still use **\`${currentAttachment.name}\`** to:\n1. **Send on WhatsApp** — e.g. *"Send this video to Rohan on WhatsApp"*\n2. **Upload to Google Drive** — e.g. *"Upload this video to my Google Drive"*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAnimated: true,
        };
        onUpdateMessages((prev) => [...prev, videoGuardMsg]);
        setLoading(false);
        return;
      }

      if (window.jarvisAPI?.executeAI) {
        const context: any = {};
        if (currentAttachment) {
          context.filePath = currentAttachment.path;
          context.attachedFile = currentAttachment;
        }
        if (webSearchEnabled) {
          context.webSearch = true;
          context.webSearchEnabled = true;
        }
        const res = await window.jarvisAPI.executeAI(text, context);
        let replyContent = res.reply || res.message;
        if (!replyContent) {
          if (res.error) {
            replyContent = `⚠️ **Could not generate response**: ${res.error}\n\nTip: You can switch model/provider in the dropdown below or check API keys in **AI Brain**.`;
          } else {
            replyContent = 'I processed your request, but received an empty response. Please try again.';
          }
        }

        // Live HMR Vision fallback if the main process hasn't restarted and returned the legacy placeholder
        const attachExt = (currentAttachment?.ext || '').toLowerCase();
        const isImageAttachment = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(attachExt);
        if (
          currentAttachment?.path &&
          isImageAttachment &&
          replyContent.includes('ready for sending on WhatsApp or uploading to Google Drive') &&
          window.jarvisAPI?.runCommand
        ) {
          try {
            const safePath = currentAttachment.path.replace(/'/g, "''");
            const b64Res = await window.jarvisAPI.runCommand(
              `powershell -NoProfile -Command "[Convert]::ToBase64String([IO.File]::ReadAllBytes('${safePath}'))"`
            );
            const base64Image = (b64Res?.stdout || '').replace(/\s+/g, '');
            if (base64Image) {
              const mimeMap: Record<string, string> = {
                '.png': 'image/png',
                '.webp': 'image/webp',
                '.gif': 'image/gif',
                '.bmp': 'image/bmp',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
              };
              const mimeType = mimeMap[attachExt] || 'image/jpeg';
              const visionPrompt = `User asked about this attached image ("${currentAttachment.name}"): "${text}".\nAnalyze the image and answer directly, accurately, and concisely using clean Markdown.`;
              const groqKey = (config.groqApiKey || '').trim();
              const geminiKey = (config.geminiApiKey || '').trim();

              if (groqKey) {
                const vResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${groqKey}`,
                  },
                  body: JSON.stringify({
                    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                    messages: [
                      {
                        role: 'user',
                        content: [
                          { type: 'text', text: visionPrompt },
                          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
                        ],
                      },
                    ],
                    temperature: 0.2,
                  }),
                });
                if (vResp.ok) {
                  const vJson = await vResp.json();
                  const visionReply = vJson?.choices?.[0]?.message?.content;
                  if (visionReply && visionReply.trim()) {
                    replyContent = visionReply.trim();
                  }
                }
              } else if (geminiKey) {
                const gResp = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [
                        {
                          role: 'user',
                          parts: [
                            { text: visionPrompt },
                            { inlineData: { mimeType, data: base64Image } },
                          ],
                        },
                      ],
                    }),
                  }
                );
                if (gResp.ok) {
                  const gJson = await gResp.json();
                  const gemReply = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (gemReply && gemReply.trim()) {
                    replyContent = gemReply.trim();
                  }
                }
              }
            }
          } catch (visionErr) {
            console.warn('Vision fallback notice:', visionErr);
          }
        }

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: replyContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionsExecuted: res.actionsExecuted,
          grounding: res.grounding,
          isAnimated: true,
        };
        onUpdateMessages((prev) => [...prev, assistantMsg]);
      } else {
        setTimeout(() => {
          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I received your command: **"${text}"**${currentAttachment ? ` with attachment \`${currentAttachment.name}\`` : ''}.\n\nGrokki Studio is connected and ready to automate Windows, manage your workspace, and synthesize voices.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isAnimated: true,
          };
          onUpdateMessages((prev) => [...prev, assistantMsg]);
          setLoading(false);
        }, 500);
        return;
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Execution Error**: ${err.message || 'Failed to communicate with Agent Brain.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAnimated: true,
      };
      onUpdateMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSlashMode && filteredSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredSlashCommands[slashIndex] || filteredSlashCommands[0];
        if (selected) {
          handleSelectSlashCommand(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashDismissed(true);
        return;
      }
    }

    const sendOnEnter = config.sendOnEnter !== false;
    if (e.key === 'Enter') {
      if (sendOnEnter && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      } else if (!sendOnEnter && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = async (id: string, text: string) => {
    if (speakingId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeakingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setSpeakingId(id);
    try {
      if (window.jarvisAPI?.speakText) {
        const cleanText = text.replace(/[*#`_~\[\]]/g, '').slice(0, 350);
        const res = await window.jarvisAPI.speakText(cleanText, config.ttsVoice || 'af_bella');
        if (res && res.success && res.base64Audio) {
          const audio = new Audio(`data:audio/wav;base64,${res.base64Audio}`);
          audioRef.current = audio;
          audio.onended = () => {
            setSpeakingId(null);
            audioRef.current = null;
          };
          audio.play();
        } else {
          setSpeakingId(null);
        }
      }
    } catch (e) {
      setSpeakingId(null);
    }
  };

  const suggestions = [
    {
      title: 'Windows Health & Diagnostics',
      desc: 'Check CPU load, NVIDIA GPU temp, and system memory.',
      prompt: '/status',
    },
    {
      title: 'System Storage & Cleanup',
      desc: 'Clear temporary cache and check drive free space.',
      prompt: '/clean',
    },
    {
      title: 'Google Calendar & Agenda',
      desc: "Retrieve today's schedule and pending deadlines.",
      prompt: 'What meetings and events do I have on Google Calendar today?',
    },
    {
      title: 'Clean Fullscreen Screenshot',
      desc: 'Capture screen directly to Desktop and Clipboard.',
      prompt: '/screenshot',
    },
  ];

  const renderMarkdown = (content: string) => {
    return { __html: marked.parse(content) as string };
  };

  const handleMessageFinished = (id: string) => {
    onUpdateMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isAnimated: false } : m))
    );
  };

  const renderSlashMenu = (placement: 'top' | 'bottom' = 'bottom') => {
    if (!isSlashMode || filteredSlashCommands.length === 0) return null;

    const positionClasses =
      placement === 'top'
        ? 'bottom-full mb-3 shadow-2xl shadow-black/20 slide-in-from-bottom-2'
        : 'top-full mt-3 shadow-xl shadow-black/10 slide-in-from-top-2';

    return (
      <div
        className={`absolute left-0 right-0 p-1.5 bg-white/95 dark:bg-[#12131a]/95 backdrop-blur-xl border border-gray-200 dark:border-[#202330] rounded-2xl z-50 max-h-72 overflow-y-auto flex flex-col gap-0.5 animate-in fade-in duration-150 ${positionClasses}`}
      >
        <div className="flex items-center justify-between px-2.5 py-1.5 text-[10.5px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-[#1e2029]">
          <span className='text-[10px]'>Direct Actions & Slash Commands</span>
          <span className="font-mono text-[9px] lowercase bg-gray-100 dark:bg-[#1a1c24] px-1.5 py-0.5 rounded text-gray-500">
            ↑↓ navigate • enter select
          </span>
        </div>
        <div className="flex flex-col gap-0.5 pt-1">
          {filteredSlashCommands.map((cmd, idx) => {
            const Icon = cmd.icon;
            const isSelected = idx === slashIndex;
            return (
              <div
                key={cmd.name}
                onClick={() => handleSelectSlashCommand(cmd)}
                onMouseEnter={() => setSlashIndex(idx)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-[#1f212d] text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#161822]'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-[#1a1c24] text-gray-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  <span className="font-mono font-bold text-xs text-gray-900 dark:text-white flex-shrink-0">
                    /{cmd.name}
                  </span>
                  <span className="text-[11.5px] text-gray-500 dark:text-gray-400 truncate">
                    {cmd.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSynthesizerVisualizer = () => {
    if (!isRecording) return null;

    return (
      <div className="w-full max-w-xl mx-auto mb-2 p-3 rounded-2xl bg-white/95 dark:bg-[#13141a]/95 backdrop-blur-md border border-gray-200 dark:border-[#202330] shadow-md shadow-black/5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[11px] font-bold tracking-wider text-gray-900 dark:text-gray-100 uppercase font-mono">
              REC {formatRecordingTime(recordingDuration)}
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
              • Listening
            </span>
          </div>

          <span className="text-[10.5px] font-mono text-gray-400 dark:text-gray-500 select-none">
            Click ■ to finish
          </span>
        </div>

        {/* Smooth Vertical Bars Waveform */}
        <div className="w-full h-11 rounded-xl bg-gray-50 dark:bg-[#0c0d12] border border-gray-200/60 dark:border-[#1e2029] flex items-center justify-center overflow-hidden px-2 relative">
          <canvas
            ref={canvasRef}
            width={480}
            height={44}
            className="w-full h-full block"
          />
        </div>

        {/* Interim Transcript Live Stream */}
        <div className="mt-2 text-[10px] text-gray-700 dark:text-gray-300 italic truncate font-sans">
          {interimTranscript ? (
            <span>"{interimTranscript}"</span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 not-italic">
              Speak into your microphone... speech-to-text is live.
            </span>
          )}
        </div>
      </div>
    );
  };

  const hotkeys = getEffectiveHotkeys(config);

  // Listen for chat-specific hotkeys (Attach files, Voice to text, Camera, Focus input)
  useEffect(() => {
    const handleChatKeyDown = (e: KeyboardEvent) => {
      if (matchesHotkey(e, hotkeys.attachFile)) {
        e.preventDefault();
        setAttachMenuOpen((prev) => !prev);
      } else if (matchesHotkey(e, hotkeys.voiceRecord)) {
        e.preventDefault();
        toggleVoiceRecording();
      } else if (matchesHotkey(e, hotkeys.openCamera)) {
        e.preventDefault();
        if (cameraModalOpen) {
          closeCameraModal();
        } else {
          openCameraModal();
        }
      } else if (matchesHotkey(e, hotkeys.focusInput)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    const handleCustomChatHotkey = (e: Event) => {
      const action = (e as CustomEvent<string>).detail;
      if (action === 'attachFile') {
        setAttachMenuOpen((prev) => !prev);
      } else if (action === 'voiceRecord') {
        toggleVoiceRecording();
      } else if (action === 'openCamera') {
        openCameraModal();
      } else if (action === 'focusInput') {
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleChatKeyDown);
    window.addEventListener('grokki:chat-hotkey', handleCustomChatHotkey);
    return () => {
      window.removeEventListener('keydown', handleChatKeyDown);
      window.removeEventListener('grokki:chat-hotkey', handleCustomChatHotkey);
    };
  }, [hotkeys.attachFile, hotkeys.voiceRecord, hotkeys.openCamera, hotkeys.focusInput, cameraModalOpen, isRecording]);

  // Render smooth Attachment Popover Menu (Monochrome High-Contrast Light/Dark)
  const renderAttachMenu = (placement: 'top' | 'bottom' = 'top') => {
    const items: Array<{
      id: 'document' | 'photo' | 'video' | 'camera' | 'audio';
      label: string;
      badge?: string;
      icon: React.ReactNode;
      accept: string;
    }> = [
      {
        id: 'document',
        label: 'Document',
        icon: <FileText className="w-4.5 h-4.5" />,
        accept: '.pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx,.json,.py,.js,.ts,.tsx,.jsx,.c,.cpp,.java,.html,.css,.sql,.xml,.yaml,.yml',
      },
      {
        id: 'photo',
        label: 'Photos',
        icon: <ImageIcon className="w-4.5 h-4.5" />,
        accept: 'image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp',
      },
      {
        id: 'video',
        label: 'Videos',
        badge: 'Send / Drive',
        icon: <Video className="w-4.5 h-4.5" />,
        accept: 'video/*,.mp4,.mkv,.mov,.webm,.avi,.m4v',
      },
      {
        id: 'camera',
        label: 'Camera',
        badge: hotkeys.openCamera,
        icon: <Camera className="w-4.5 h-4.5" />,
        accept: '',
      },
      {
        id: 'audio',
        label: 'Audio',
        icon: <Headphones className="w-4.5 h-4.5" />,
        accept: 'audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm',
      },
    ];

    const isTop = placement === 'top';

    return (
      <AnimatePresence>
        {attachMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: isTop ? 12 : -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: isTop ? 10 : -10 }}
            transition={{ type: 'spring', stiffness: 460, damping: 28, mass: 0.7 }}
            style={{ transformOrigin: isTop ? 'bottom left' : 'top left' }}
            className={`absolute left-0 ${
              isTop ? 'bottom-full mb-3' : 'top-full mt-3'
            } w-52 bg-white/95 dark:bg-[#14161e]/95 backdrop-blur-xl border border-gray-200/90 dark:border-white/10 rounded-2xl shadow-lg dark:shadow-black/50 p-1.5 z-50 select-none`}
          >
            <div className="flex flex-col gap-0.5">
              {items.map((item, idx) => (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.16, ease: 'easeOut' }}
                  onClick={() => handlePickCategory(item.id, item.accept)}
                  className="w-full flex items-center justify-between px-1.5 py-1 rounded-xl hover:bg-gray-900/[0.045] dark:hover:bg-white/[0.05] transition-colors cursor-pointer border-none bg-transparent text-left group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0 bg-gray-900/[0.03] dark:bg-white/[0.035] text-gray-800 dark:text-gray-200 group-hover:bg-gray-900/[0.06] dark:group-hover:bg-white/[0.07] group-hover:text-gray-950 dark:group-hover:text-white">
                      {item.icon}
                    </div>
                    <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 group-hover:text-gray-950 dark:group-hover:text-white tracking-tight transition-colors">
                      {item.label}
                    </span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-gray-900/[0.035] dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 border border-gray-900/[0.06] dark:border-white/[0.06]">
                      {item.badge}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Render Live Camera Capture Modal
  const renderCameraModal = () => (
    <AnimatePresence>
      {cameraModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 460, damping: 30 }}
            className="w-full max-w-lg bg-white dark:bg-[#12141c] border border-gray-200/80 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Camera size={20} />
                <span className="text-base font-bold text-gray-900 dark:text-gray-100 ml-1">
                  Live Camera Feed
                </span>
              </div>
              <button
                type="button"
                onClick={closeCameraModal}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview */}
            <div className="relative bg-black aspect-video w-full overflow-hidden">
              {cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center px-8">
                  <p className="text-xs text-red-400 text-center">{cameraError}</p>
                </div>
              ) : cameraPreviewUrl ? (
                <img
                  src={cameraPreviewUrl}
                  alt="Captured preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {/* Subtle vignette so the edges don't feel flat */}
              {!cameraPreviewUrl && !cameraError && (
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-black/10" />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 dark:bg-[#0e1016] border-t border-gray-100 dark:border-white/5">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {cameraPreviewUrl ? "Looks good?" : "Position yourself in frame"}
              </span>

              <div className="flex items-center gap-2">
                {cameraPreviewUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRetakeCameraPhoto}
                      className="px-6 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-white/5 transition-colors hover:cursor-pointer"
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCameraPhoto}
                      className="px-6 py-2 rounded-lg text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-black hover:opacity-90 active:scale-[0.98] transition-all hover:cursor-pointer"
                    >
                      Attach
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={!!cameraError}
                    onClick={handleCaptureCameraPhoto}
                    className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-gray-900 dark:bg-white dark:text-black hover:opacity-90 active:scale-[0.98] disabled:opacity-40 transition-all hover:cursor-pointer"
                  >
                    Capture
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const isDarkTheme = config.dashboardTheme === 'dark';

  return (
    <WarmTooltipGroup delay={400} warmWindow={300} travel={320} lean={false}>
    <div className={`relative flex flex-col h-full w-full justify-between pb-3 px-6 pt-4 transition-all duration-300 ${
      activeArtifact ? 'lg:pr-[50vw]' : ''
    }`}>
      {/* Hidden Native File Picker Input for Category Filtering */}
      <input
        ref={fileInputRef}
        type="file"
        accept={fileAcceptFilter}
        onChange={handleNativeFileInputChange}
        className="hidden"
      />
      {renderCameraModal()}

      {/* Background GradientASCII Effect */}
      {config.chatBackgroundGradient !== false && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-0"
          style={{ width: '100%', height: '100%', position: 'absolute' }}
        >
          <GradientASCII
            colors={GRADIENT_ASCII_COLORS}
            shape="horizon"
            characters=" =GROKKIBYITZAJX@#"
            cellSize={18}
            density={0.56}
            glyphOpacity={0.3}
            glow={0.2}
            depthOfField={0.8}
            flicker={0.2}
            softness={0.5}
            scale={1}
            flow={0.5}
            speed={1}
            gradientOpacity={0.9}
            grain={0.08}
            variation={0}
            mouseInteraction
            scrambleRadius={0.1}
            clickEffect="wave"
            intro
            lightMode={!isDarkTheme}
          />
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex flex-col h-full w-full max-w-3xl mx-auto justify-between relative z-10 min-h-0">
      {/* Messages / Hero View */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-6 pb-4">
          {/* Grokki Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-[11px] font-semibold text-gray-800 dark:text-gray-200 mb-3 select-none">
            <img src={grokkiIcon} alt="Grokki" className="w-3.5 h-3.5 rounded-full" />
            <span>Grokki</span>
          </div>

          {/* Persona Heading */}
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-6 font-sans">
            Ready when you are. What are we executing today?
          </h1>

          {/* Staged File Preview Card */}
          {attachedFile && (
            <div className="w-full max-w-xl mx-auto mb-3 p-2.5 bg-white/95 dark:bg-[#14161e]/95 backdrop-blur-md border border-gray-200/90 dark:border-white/10 rounded-2xl shadow-xs flex items-center justify-between text-left transition-all">
              <div className="flex items-center gap-3 min-w-0">
                {isImageAttachment(attachedFile) ? (
                  <ChatImageAttachment
                    file={attachedFile}
                    compact
                    onZoom={(src, name, size, path, originRect) => openLightbox(src, name, size, path, originRect)}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-900/[0.03] dark:bg-white/[0.035] flex items-center justify-center flex-shrink-0 border border-gray-900/[0.05] dark:border-white/[0.05]">
                    {getFileIcon(attachedFile.ext)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {attachedFile.name}
                  </div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400 font-mono">
                    {formatFileSize(attachedFile.size) ? `${formatFileSize(attachedFile.size)} • ` : ''}
                    {isVideoAttachment(attachedFile)
                      ? 'Send on WhatsApp or Drive only • Video watching disabled (saves tokens)'
                      : 'Ready to share with Grokki'}
                  </div>
                </div>
              </div>
              <WarmTooltip
                content="Remove attachment"
                side="top"
                surfaceColor="#f5f5f5"
                inkColor="#18181b"
                size="md"
                radius={8}
                gap={8}
                arrow
                popDuration={160}
                popScale={0.94}
                popBlur={4}
                showFuse={false}
              >
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => setAttachedFile(null)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-900/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer border-none bg-transparent"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </WarmTooltip>
            </div>
          )}

          {/* Centered Floating Input Pill with Slash Command Palette */}
          <div className="w-full max-w-xl mx-auto relative">
            {renderSlashMenu()}
            {renderSynthesizerVisualizer()}

            <div className="w-full bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-2xl md:rounded-3xl p-3 shadow-sm hover:shadow-md transition-all flex flex-col gap-2.5">
              {/* Input Field on Top */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRecording
                    ? "Listening... speaking your prompt"
                    : attachedFile
                    ? isVideoAttachment(attachedFile)
                      ? `Send ${attachedFile.name} on WhatsApp or upload to Drive...`
                      : `Ask Grokki about ${attachedFile.name}...`
                    : "Type / for slash commands, or ask Grokki anything..."
                }
                className="w-full bg-transparent border-none outline-none text-xs md:text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-sans px-1 pt-0.5 pb-0.5"
                autoFocus
              />

              {/* Bottom Row Below Input: Plus & Model Selector on Left, Mic & Send on Right */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* Attach Tool Button + WhatsApp-style Popover */}
                  <div ref={attachMenuRef} className="relative flex items-center">
                    {renderAttachMenu('top')}
                    <WarmTooltip
                      content="Attach files"
                      shortcut={hotkeys.attachFile}
                      side="top"
                      disabled={attachMenuOpen}
                      surfaceColor="#f5f5f5"
                      inkColor="#18181b"
                      size="md"
                      radius={8}
                      gap={8}
                      arrow
                      popDuration={160}
                      popScale={0.94}
                      popBlur={4}
                      showFuse={false}
                    >
                      <button
                        type="button"
                        aria-label="Attach files"
                        onClick={() => setAttachMenuOpen((prev) => !prev)}
                        className={`transition-all duration-200 cursor-pointer border-none p-1.5 rounded-full flex items-center justify-center ${
                          attachMenuOpen
                            ? 'bg-gray-200 dark:bg-[#252836] text-gray-900 dark:text-white rotate-45'
                            : 'bg-transparent text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </WarmTooltip>
                  </div>

                  {/* AI Brain Model Selector Dropdown below the input next to plus */}
                  {renderModelSelector('top', 'left')}

                  {/* Perplexity-Style Web Grounding Search Toggle */}
                  <WarmTooltip
                    content={webSearchEnabled ? 'Live Web Search: ON' : 'Live Web Search: OFF (Click to enable)'}
                    side="top"
                    surfaceColor="#f5f5f5"
                    inkColor="#18181b"
                    size="md"
                    radius={8}
                    gap={8}
                    arrow
                    popDuration={160}
                    popScale={0.94}
                    popBlur={4}
                    showFuse={false}
                  >
                    <button
                      type="button"
                      aria-label="Toggle Deep Search"
                      onClick={() => setWebSearchEnabled((prev) => !prev)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer border select-none ${
                        webSearchEnabled
                          ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 shadow-xs font-semibold'
                          : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <Globe className={`w-3.5 h-3.5 shrink-0 ${webSearchEnabled ? 'text-sky-400' : 'text-gray-400'}`} />
                      <span>Deep Search</span>
                    </button>
                  </WarmTooltip>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Voice-to-Text Button: Mic when idle, Square Stop when recording */}
                  <WarmTooltip
                    content={isRecording ? 'Stop voice recording' : 'Voice to text'}
                    shortcut={hotkeys.voiceRecord}
                    side="top"
                    surfaceColor="#f5f5f5"
                    inkColor="#18181b"
                    size="md"
                    radius={8}
                    gap={8}
                    arrow
                    popDuration={160}
                    popScale={0.94}
                    popBlur={4}
                    showFuse={false}
                  >
                    <button
                      type="button"
                      aria-label={isRecording ? 'Stop voice recording' : 'Voice to text'}
                      onClick={toggleVoiceRecording}
                      className={`transition-all cursor-pointer border-none flex items-center justify-center rounded-full ${
                        isRecording
                          ? 'w-7 h-7 bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30 animate-pulse flex-shrink-0'
                          : 'p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-transparent'
                      }`}
                    >
                      {isRecording ? (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>
                  </WarmTooltip>

                  {/* Send Arrow Button */}
                  <WarmTooltip
                    content="Send message"
                    shortcut="↵"
                    side="top"
                    surfaceColor="#f5f5f5"
                    inkColor="#18181b"
                    size="md"
                    radius={8}
                    gap={8}
                    arrow
                    popDuration={160}
                    popScale={0.94}
                    popBlur={4}
                    showFuse={false}
                  >
                    <button
                      type="button"
                      aria-label="Send message"
                      onClick={() => handleSendMessage()}
                      disabled={!inputValue.trim() && !attachedFile}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none shadow-xs flex-shrink-0 ${
                        inputValue.trim() || attachedFile
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                          : 'bg-gray-200 dark:bg-[#1e2029] text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </WarmTooltip>
                </div>
              </div>
            </div>
          </div>

          {/* Suggestions Grid */}
          <div className="w-full max-w-xl mt-8 text-left">
            <span className="text-[11px] font-semibold text-gray-300 dark:text-gray-400 tracking-wider uppercase block mb-2.5">
              Suggestions & Commands
            </span>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="p-5 rounded-xl bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer transition-all flex flex-col gap-0.5 shadow-xs hover:shadow-sm"
                >
                  <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                    {item.title}
                  </strong>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active Conversation Thread (Clean, Modern Chat Bubbles) */
        <div id="grokki-chat-scroll" className="flex-1 flex flex-col overflow-y-auto no-scrollbar px-1 py-3 space-y-5">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 dark:border-[#1e2029]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate max-w-xs">
                {activeConversation.title || 'Conversation'}
              </span>
              <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029]">
                {messages.length} messages • saved locally
              </span>
            </div>
          </div>

          {/* Messages Flow */}
          <div className="flex flex-col space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}
                >
                  {isUser ? (
                    /* User Message: Clean Modern Rounded Bubble */
                    <div className="max-w-[75%] bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-2xl rounded-tr-xs text-sm font-medium leading-relaxed border border-gray-300/80 dark:border-[#1e2029]">
                      {msg.attachedFile && (
                        isImageAttachment(msg.attachedFile) ? (
                          <ChatImageAttachment
                            file={msg.attachedFile}
                            onZoom={(src, name, size, path, originRect) => openLightbox(src, name, size, path, originRect)}
                          />
                        ) : (
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#12141c] border border-gray-200/90 dark:border-white/10 mb-2 text-xs font-mono shadow-2xs">
                            <div className="w-6 h-6 rounded-md bg-gray-900/[0.03] dark:bg-white/[0.035] border border-gray-900/[0.05] dark:border-white/[0.05] flex items-center justify-center flex-shrink-0">
                              {getFileIcon(typeof msg.attachedFile === 'string' ? msg.attachedFile : msg.attachedFile.ext)}
                            </div>
                            <span className="truncate max-w-[200px] font-semibold text-gray-900 dark:text-gray-100">
                              {typeof msg.attachedFile === 'string' ? msg.attachedFile.split('\\').pop() : msg.attachedFile.name}
                            </span>
                            {typeof msg.attachedFile !== 'string' && msg.attachedFile.size ? (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                ({formatFileSize(msg.attachedFile.size)})
                              </span>
                            ) : null}
                          </div>
                        )
                      )}
                      <p className="whitespace-pre-wrap m-0 leading-relaxed text-[13px]">
                        {msg.content}
                      </p>
                    </div>
                  ) : (
                    /* Grokki Assistant Message: Natural Flow */
                    <div className="flex items-start gap-3 max-w-[92%] w-full">
                      {/* Real Grokki Orb Avatar */}
                      <img
                        src={grokkiIcon}
                        alt="Grokki"
                        className="w-6 h-6 rounded-full shadow-xs flex-shrink-0 mt-1 select-none"
                      />

                      {/* Content Area */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                            Grokki
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                            {msg.timestamp}
                          </span>
                        </div>

                        {/* Executed Tools Actions Pills */}
                        {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 my-1.5">
                            {msg.actionsExecuted.map((act, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#1e2029]"
                              >
                                <Terminal className="w-3 h-3 text-gray-500" />
                                <span>{act.name}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Perplexity-Style Sources Bar */}
                        {msg.role === 'assistant' && msg.grounding && (
                          <PerplexitySourcesBar grounding={msg.grounding} />
                        )}

                        {/* Rendered Markdown Body: Animated if streaming, else Fast Cached Static */}
                        {config.streamingAnimation !== false && msg.isAnimated ? (
                          <AnimatedMessageContent
                            content={msg.content}
                            grounding={msg.grounding}
                            isAnimated={true}
                            speed={config.streamingSpeed}
                            onScroll={scrollToBottom}
                            onFinished={() => handleMessageFinished(msg.id)}
                            onOpenArtifact={setActiveArtifact}
                          />
                        ) : (
                          <StaticMessageContent
                            content={msg.content}
                            grounding={msg.grounding}
                            onOpenArtifact={setActiveArtifact}
                          />
                        )}

                        {/* Claude-Style Artifact Card */}
                        {msg.role === 'assistant' && (() => {
                          const artifact = extractArtifactFromMessage(msg.content);
                          if (!artifact) return null;
                          const lineCount = artifact.content.split('\n').length;
                          return (
                            <div
                              onClick={() => setActiveArtifact(artifact)}
                              className="mt-3.5 p-3 rounded-xl bg-black/40 hover:bg-black/60 border border-white/[0.08] hover:border-white/[0.16] flex items-center justify-between transition-all cursor-pointer group shadow-sm select-none"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-white/[0.05] text-gray-200 flex items-center justify-center shrink-0 border border-white/[0.08] group-hover:border-sky-500/40 transition-colors">
                                  {artifact.language === 'html' ? (
                                    <Globe className="w-6 h-6 text-white" />
                                  ) : artifact.language === 'svg' ? (
                                    <Shapes className="w-6 h-6 text-amber-400" />
                                  ) : ['tsx', 'jsx', 'react'].includes(artifact.language) ? (
                                    <Code2 className="w-6 h-6 text-indigo-400" />
                                  ) : (
                                    <FileCode className="w-4 h-4 text-emerald-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-gray-100 truncate flex items-center gap-2">
                                    <span className="font-mono tracking-tight">{artifact.title}</span>
                                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-medium">
                                      {artifact.language}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                                    {lineCount} lines • Click to open in Canvas
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] group-hover:bg-sky-500/10 group-hover:border-sky-500/30 text-xs font-medium text-gray-300 group-hover:text-sky-400 transition-all shrink-0 ml-3">
                                <span>Canvas</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Pure Icon-Only Actions */}
                        <div className="flex items-center gap-1 mt-2">
                          <WarmTooltip
                            content={copiedId === msg.id ? 'Copied!' : 'Copy message'}
                            side="top"
                            surfaceColor="#f5f5f5"
                            inkColor="#18181b"
                            size="md"
                            radius={8}
                            gap={8}
                            arrow
                            popDuration={160}
                            popScale={0.94}
                            popBlur={4}
                            showFuse={false}
                          >
                            <button
                              type="button"
                              aria-label="Copy message"
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-colors cursor-pointer border-none bg-transparent"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-gray-900 dark:text-white" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </WarmTooltip>

                          <WarmTooltip
                            content={speakingId === msg.id ? 'Stop reading' : 'Read aloud'}
                            side="top"
                            surfaceColor="#f5f5f5"
                            inkColor="#18181b"
                            size="md"
                            radius={8}
                            gap={8}
                            arrow
                            popDuration={160}
                            popScale={0.94}
                            popBlur={4}
                            showFuse={false}
                          >
                            <button
                              type="button"
                              aria-label="Read aloud"
                              onClick={() => handleSpeak(msg.id, msg.content)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-colors cursor-pointer border-none bg-transparent"
                            >
                              {speakingId === msg.id ? (
                                <Square className="w-3.5 h-3.5 fill-current text-gray-900 dark:text-white" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </WarmTooltip>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking / Running Indicator */}
            {loading && (
              <div className="flex items-start gap-3 max-w-[92%] w-full animate-in fade-in duration-200">
                <img
                  src={grokkiIcon}
                  alt="Grokki"
                  className="w-6 h-6 rounded-full shadow-xs flex-shrink-0 mt-0.5 select-none"
                />
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                      Grokki
                    </span>
                  </div>
                  <div className="inline-flex items-center py-1">
                    <LatticeLoader
                      status="working"
                      label="Thinking"
                      doneLabel="Done in"
                      errorLabel="Failed after"
                      pattern="orbit"
                      grid={3}
                      shape="round"
                      doneColor="#22c55e"
                      errorColor="#ef4444"
                      cellSize={3.2}
                      gap={1.5}
                      fontSize={12}
                      step={90}
                      idleOpacity={0.15}
                      glow={false}
                      glowColor=""
                      showTimer
                      color={isDarkTheme ? '#f5f5f5' : '#18181b'}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Pinned Bottom Input Bar */}
      {messages.length > 0 && (
        <div className="w-full pt-2.5 bg-gradient-to-t from-[#f7f7fa] dark:from-[#0c0d12] to-transparent">
          {/* Staged File Preview Card */}
          {attachedFile && (
            <div className="w-full max-w-xl mx-auto mb-2 p-2.5 bg-white/95 dark:bg-[#14161e]/95 backdrop-blur-md border border-gray-200/90 dark:border-white/10 rounded-2xl shadow-xs flex items-center justify-between text-left transition-all">
              <div className="flex items-center gap-3 min-w-0">
                {isImageAttachment(attachedFile) ? (
                  <ChatImageAttachment
                    file={attachedFile}
                    compact
                    onZoom={(src, name, size, path, originRect) => openLightbox(src, name, size, path, originRect)}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-900/[0.03] dark:bg-white/[0.035] flex items-center justify-center flex-shrink-0 border border-gray-900/[0.05] dark:border-white/[0.05]">
                    {getFileIcon(attachedFile.ext)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {attachedFile.name}
                  </div>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400 font-mono">
                    {formatFileSize(attachedFile.size) ? `${formatFileSize(attachedFile.size)} • ` : ''}
                    {isVideoAttachment(attachedFile)
                      ? 'Send on WhatsApp or Drive only • Video watching disabled (saves tokens)'
                      : 'Ready to share with Grokki'}
                  </div>
                </div>
              </div>
              <WarmTooltip
                content="Remove attachment"
                side="top"
                surfaceColor="#f5f5f5"
                inkColor="#18181b"
                size="md"
                radius={8}
                gap={8}
                arrow
                popDuration={160}
                popScale={0.94}
                popBlur={4}
                showFuse={false}
              >
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => setAttachedFile(null)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-900/[0.06] dark:hover:bg-white/[0.08] transition-colors cursor-pointer border-none bg-transparent"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </WarmTooltip>
            </div>
          )}

          {/* Floating Slash Command Menu & Synthesizer Visualizer for Bottom Bar */}
          <div className="w-full max-w-xl mx-auto relative">
            {renderSlashMenu('top')}
            {renderSynthesizerVisualizer()}

            <div className="w-full bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-2xl md:rounded-3xl mb-8 p-3 transition-all flex flex-col gap-2.5 shadow-sm hover:shadow-md">
              {/* Input Field on Top */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRecording
                    ? "Listening... speaking your prompt"
                    : attachedFile
                    ? isVideoAttachment(attachedFile)
                      ? `Send ${attachedFile.name} on WhatsApp or upload to Drive...`
                      : `Ask Grokki about ${attachedFile.name}...`
                    : "Type / for direct slash commands, or ask anything..."
                }
                className="w-full bg-transparent border-none outline-none text-xs md:text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-sans px-1 pt-0.5 pb-0.5"
              />

              {/* Bottom Row Below Input: Plus & Model Selector on Left, Mic & Send on Right */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* Attach Tool Button + WhatsApp-style Popover */}
                  <div ref={attachMenuRef} className="relative flex items-center">
                    {renderAttachMenu('top')}
                    <WarmTooltip
                      content="Attach files"
                      shortcut={hotkeys.attachFile}
                      side="top"
                      disabled={attachMenuOpen}
                      surfaceColor="#f5f5f5"
                      inkColor="#18181b"
                      size="md"
                      radius={8}
                      gap={8}
                      arrow
                      popDuration={160}
                      popScale={0.94}
                      popBlur={4}
                      showFuse={false}
                    >
                      <button
                        type="button"
                        aria-label="Attach files"
                        onClick={() => setAttachMenuOpen((prev) => !prev)}
                        className={`transition-all duration-200 cursor-pointer border-none p-1.5 rounded-full flex items-center justify-center ${
                          attachMenuOpen
                            ? 'bg-gray-200 dark:bg-[#252836] text-gray-900 dark:text-white rotate-45'
                            : 'bg-transparent text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </WarmTooltip>
                  </div>

                  {/* AI Brain Model Selector Dropdown below the input next to plus */}
                  {renderModelSelector('top', 'left')}

                  {/* Deep Search Button in Bottom Floating Bar */}
                  <WarmTooltip
                    content={webSearchEnabled ? 'Deep Search: ON (Live grounding)' : 'Deep Search: OFF (Click to enable live web search)'}
                    side="top"
                    surfaceColor="#f5f5f5"
                    inkColor="#18181b"
                    size="md"
                    radius={8}
                    gap={8}
                    arrow
                    popDuration={160}
                    popScale={0.94}
                    popBlur={4}
                    showFuse={false}
                  >
                    <button
                      type="button"
                      aria-label="Toggle Deep Search"
                      onClick={() => setWebSearchEnabled((prev) => !prev)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11px] font-mono transition-all cursor-pointer border select-none ${
                        webSearchEnabled
                          ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 shadow-xs font-semibold'
                          : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <Globe className={`w-3.5 h-3.5 shrink-0 ${webSearchEnabled ? 'text-sky-400' : 'text-gray-400'}`} />
                      <span>Deep Search</span>
                    </button>
                  </WarmTooltip>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Voice-to-Text Button: Mic when idle, Square Stop when recording */}
                  <WarmTooltip
                    content={isRecording ? 'Stop voice recording' : 'Voice to text'}
                    shortcut={hotkeys.voiceRecord}
                    side="top"
                    surfaceColor="#f5f5f5"
                    inkColor="#18181b"
                    size="md"
                    radius={8}
                    gap={8}
                    arrow
                    popDuration={160}
                    popScale={0.94}
                    popBlur={4}
                    showFuse={false}
                  >
                    <button
                      type="button"
                      aria-label={isRecording ? 'Stop voice recording' : 'Voice to text'}
                      onClick={toggleVoiceRecording}
                      className={`transition-all cursor-pointer border-none flex items-center justify-center rounded-full ${
                        isRecording
                          ? 'w-7 h-7 bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30 animate-pulse flex-shrink-0'
                          : 'p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-transparent'
                      }`}
                    >
                      {isRecording ? (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>
                  </WarmTooltip>

                  {/* Send Arrow Button */}
                  <WarmTooltip
                    content="Send message"
                    shortcut="↵"
                    side="top"
                    surfaceColor="#f5f5f5"
                    inkColor="#18181b"
                    size="md"
                    radius={8}
                    gap={8}
                    arrow
                    popDuration={160}
                    popScale={0.94}
                    popBlur={4}
                    showFuse={false}
                  >
                    <button
                      type="button"
                      aria-label="Send message"
                      onClick={() => handleSendMessage()}
                      disabled={!inputValue.trim() && !attachedFile}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none shadow-xs flex-shrink-0 ${
                        inputValue.trim() || attachedFile
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                          : 'bg-gray-200 dark:bg-[#1e2029] text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </WarmTooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
      {/* Interactive Artifacts / Canvas Split Pane */}
      <AnimatePresence>
        {activeArtifact && (
          <ArtifactCanvasPane
            artifact={activeArtifact}
            onClose={() => setActiveArtifact(null)}
            isDark={isDarkTheme}
          />
        )}
      </AnimatePresence>

      {/* Big Scale Image Zoom Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightboxState.isOpen}
        src={lightboxState.src}
        fileName={lightboxState.name}
        fileSize={lightboxState.size}
        filePath={lightboxState.path}
        originRect={lightboxState.originRect}
        onClose={closeLightbox}
      />
    </WarmTooltipGroup>
  );
});
