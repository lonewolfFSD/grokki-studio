import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  RichBrandInput,
  renderContentWithBrandLinks,
} from '../../utils/brandLinks';
import {
  getRandomGreetingPhrase,
  sanitizeGreetingName,
} from '../../utils/greetings';
import { HugeiconsIcon } from '@hugeicons/react';
import { Layers01Icon } from '@hugeicons/core-free-icons';
import {
  ArrowUp,
  CornerDownLeft,
  Mic,
  Plus,
  Paperclip,
  Copy,
  Check,
  Pencil,
  Undo2,
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
  Calendar,
  Lock,
  GitMerge,
  Code2,
  Shapes,
  ExternalLink,
  Swords,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Folder,
  FolderPlus,
  Eye,
  Shield,
  ShieldAlert,
  Gauge,
  Info,
} from 'lucide-react';
import { ArtifactCanvasPane, Artifact } from '../ArtifactCanvasPane';
import { PerplexitySourcesBar } from '../PerplexitySourcesBar';
import { RelatedImagesCarousel } from '../RelatedImagesCarousel';
import { WeatherCarousel, parseWeatherForecastFromMarkdown, stripWeatherTableFromMarkdown } from '../WeatherCarousel';
import { WorkspaceMentionMenu } from '../WorkspaceMentionMenu';
import { WorkspaceMentionPill } from '../WorkspaceMentionPill';
import SpecularButton from '../../../effects/SpecularButton';
import GradualBlur from '../../../effects/GradualBlur';
import { GroundingMetadata, GroundingImage, WorkspaceMention } from '../../types/jarvis';
import { highlightCode } from '../../utils/syntaxHighlight';
import { AnimatePresence, motion } from 'motion/react';
import { marked } from 'marked';
import { JarvisConfig, AiProvider, Conversation, ChatMessage, AttachedFileInfo, ActiveModelPull, AgentLiveStep } from '../../types/jarvis';
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
  LiteLLMLogo,
  BifrostLogo,
  PortkeyLogo,
  HeliconeLogo,
  RouteLLMLogo,
  NewApiLogo,
  HigressLogo,
  ClawRouterLogo,
  FreeLLMAPILogo,
} from './AiBrainTab';
import { Sliders } from 'lucide-react';
import Threads from './Threads';
import Grainient from './Grainient';
import Noise from './Noise';
import LatticeLoader from './LatticeLoader';
import WarmTooltip, { WarmTooltipGroup } from '../WarmTooltip';
import { getEffectiveHotkeys, matchesHotkey } from '../../utils/hotkeys';
import { DEFAULT_GRAINIENT_SETTINGS } from '../GrainientCustomizerModal';

import grokkiIcon from '../../assets/grokki_icon.svg';
import grokkiLogo from '../../assets/grokki_logo.png';
import grokkiWordmarkDark from '../../assets/grokki_wordmark.png';
import grokkiWordmarkLight from '../../assets/grokki_wordmark_light.png';
import { ImageLightboxModal } from '../ImageLightboxModal';
import { ChatImageAttachment, isImageAttachment } from '../ChatImageAttachment';
import { ConversationTimeline } from '../ConversationTimeline';

export type AgentEffort = 'low' | 'medium' | 'high' | 'highest';
export type AgentPermission = 'review' | 'default' | 'auto' | 'turbo';

const AGENT_EFFORT_OPTIONS: Array<{ id: AgentEffort; label: string; turns: number; desc: string }> = [
  { id: 'low', label: 'Low', turns: 4, desc: 'Quick edits, minimal reasoning' },
  { id: 'medium', label: 'Medium', turns: 8, desc: 'Balanced reasoning and checks' },
  { id: 'high', label: 'High', turns: 16, desc: 'Deep debugging and verification' },
  { id: 'highest', label: 'Highest', turns: 24, desc: 'Maximum autonomy for big tasks' },
];

const AGENT_PERMISSION_OPTIONS: Array<{
  id: AgentPermission;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  isDefault?: boolean;
}> = [
  { id: 'review', label: 'Request Review', desc: 'Every command requires approval.', icon: Eye },
  { id: 'default', label: 'Default', desc: 'Ask before sensitive operations.', icon: Lock },
  { id: 'auto', label: 'Auto', desc: 'Automatically decide if commands run.', icon: Shield },
  { id: 'turbo', label: 'Turbo', desc: 'Run all commands without restrictions.', icon: ShieldAlert, isDefault: true },
];

const BATTLE_BRAIN_OPTIONS = [
  { id: 'gemini:gemini-flash-latest', label: 'Gemini Flash' },
  { id: 'gemini:gemini-flash-lite-latest', label: 'Gemini Flash-Lite' },
  { id: 'gemini:gemini-3.5-flash', label: 'Gemini 3.5' },
  { id: 'groq:qwen/qwen3.8-27b', label: 'Groq Qwen 27B' },
  { id: 'groq:openai/gpt-oss-120b', label: 'Groq GPT-OSS 120B' },
  { id: 'groq:openai/gpt-oss-20b', label: 'Groq GPT-OSS 20B' },
  { id: 'ollama:llama3.2', label: 'Ollama Local' },
  { id: 'openai:gpt-4o', label: 'OpenAI GPT-4o' },
  { id: 'deepseek:deepseek-chat', label: 'DeepSeek Chat' },
];

const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // Gemini
  'gemini-3.5-flash': 1_000_000,
  'gemini-3.8-flash': 1_000_000,
  'gemini-3.1-flash-lite': 1_000_000,
  'gemini-3.1-pro-preview': 2_000_000,
  'gemini-flash-latest': 1_000_000,
  'gemini-pro-latest': 2_000_000,
  'gemini-2.5-flash': 1_000_000,
  // Groq
  'qwen/qwen3.8-27b': 32_768,
  'llama-3.3-70b-versatile': 128_000,
  'llama-3.1-8b-instant': 128_000,
  'deepseek-r1-distill-llama-70b': 128_000,
  'mixtral-8x7b-32768': 32_768,
  'gemma2-9b-it': 8_192,
  'openai/gpt-oss-120b': 131_072,
  'openai/gpt-oss-20b': 131_072,
  // OpenAI
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'o1': 200_000,
  'o3-mini': 200_000,
  'gpt-4.5-preview': 128_000,
  'gpt-4-turbo': 128_000,
  // DeepSeek
  'deepseek-chat': 64_000,
  'deepseek-reasoner': 64_000,
  // Grok
  'grok-2-1212': 131_072,
  'grok-2-vision-1212': 32_768,
  'grok-beta': 131_072,
  // Qwen
  'qwen-max': 32_768,
  'qwen-plus': 128_000,
  'qwen-turbo': 128_000,
  // Ollama
  'llama3.2': 8_192,
  'llama3.3': 128_000,
  'llama3.1': 128_000,
  'deepseek-r1': 64_000,
  'qwen2.5-coder': 32_768,
  'mistral': 32_768,
  'phi4': 16_384,
  'gemma2': 8_192,
  // Claude
  'claude-3.7-sonnet': 200_000,
  'claude-3.5-sonnet': 200_000,
};

const getModelContextWindow = (model: string): number => {
  if (!model) return 32_768;
  const lower = model.toLowerCase();
  for (const [k, v] of Object.entries(MODEL_CONTEXT_LIMITS)) {
    if (lower === k.toLowerCase() || lower.endsWith('/' + k.toLowerCase()) || lower.includes(k.toLowerCase())) {
      return v;
    }
  }
  if (lower.includes('gemini')) return 1_000_000;
  if (lower.includes('claude')) return 200_000;
  if (lower.includes('120b') || lower.includes('70b') || lower.includes('gpt-4') || lower.includes('128k') || lower.includes('o1') || lower.includes('o3')) return 128_000;
  if (lower.includes('deepseek')) return 64_000;
  if (lower.includes('32k') || lower.includes('32768') || lower.includes('qwen')) return 32_768;
  if (lower.includes('8b') || lower.includes('3b') || lower.includes('8k') || lower.includes('llama3.2')) return 8_192;
  return 32_768;
};

const formatTokenNumber = (num: number): string => {
  if (num >= 1_000_000) {
    const m = num / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (num % 1024 === 0 && num >= 1024) {
    return `${num / 1024}k`;
  }
  if (num >= 10_000) {
    return `${Math.round(num / 1_000)}k`;
  }
  if (num >= 1_000) {
    const k = num / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return num.toString();
};

const GRADIENT_ASCII_COLORS = ['#23378e', '#f6f8ff', '#a5d8ff', '#38bdf8'];

interface ChatTabProps {
  config: JarvisConfig;
  userName: string;
  onNavigateTab: (tabId: any) => void;
  activeConversation: Conversation;
  onUpdateMessages: (updater: (prevMessages: ChatMessage[]) => ChatMessage[]) => void;
  onUpdateConvoMessages?: (convoId: string, updater: (prevMessages: ChatMessage[]) => ChatMessage[]) => void;
  thinkingConvoIds?: Set<string>;
  onSetConvoThinking?: (convoId: string, isThinking: boolean) => void;
  onNewChat: () => void;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
  activeModelPull?: ActiveModelPull | null;
  /** Grokki Agent mode: same chat UI + project / effort / permission controls under the input */
  agentMode?: boolean;
  activeWorkspaceRoot?: string;
  activeWorkspaceName?: string;
  conversations?: Conversation[];
  onSelectWorkspaceFolder?: () => void;
  onUpdateConversationMeta?: (convoId: string, meta: Partial<Conversation>) => void;
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
    desc: 'Search the web or open an online resource in your browser.',
    icon: Globe,
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
    desc: 'Generate study notes or lecture summary document to Desktop.',
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

export function extractImagesFromMarkdown(text: string): GroundingImage[] {
  if (!text) return [];
  const regex = /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/g;
  const imgs: GroundingImage[] = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    imgs.push({
      title: m[1] || 'Discovered Photo',
      image: m[2],
      thumbnail: m[2],
      url: m[2],
    });
  }
  return imgs;
}

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

  if (l === 'markdown' || l === 'md' || l === 'mdx') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="20" height="16" rx="3" stroke="#38BDF8" stroke-width="1.8"/>
      <path d="M6 15V9l2.5 3L11 9v6M15 12l2.5 3 2.5-3M17.5 9v6" stroke="#38BDF8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  if (l === 'docker' || l === 'dockerfile') {
    return `<svg viewBox="0 0 24 24" width="14" height="14" fill="#0db7ed" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.98 10.03h2.36v2.36h-2.36zm-3.13 0h2.36v2.36h-2.36zm-3.13 0h2.36v2.36H7.72zm6.26-3.13h2.36v2.36h-2.36zm-3.13 0h2.36v2.36h-2.36zm-3.13 0h2.36v2.36H7.72zm6.26-3.13h2.36v2.36h-2.36zm-3.13 0h2.36v2.36h-2.36zm-3.13 0h2.36v2.36H7.72zM21.9 12.1c-.38-.28-1.42-.47-2.12-.4-.14-.72-.6-1.39-1.29-1.84l-.62-.4-.4.62c-.42.66-.56 1.44-.45 2.21-.49.25-1.14.33-1.68.33H1.47c-.28 0-.5.22-.5.5 0 2.22.8 4.27 2.27 5.79 1.63 1.69 3.86 2.65 6.27 2.65 6.07 0 11.23-4.14 12.39-9.87.53-.1.97-.33 1.25-.56l.48-.38-.73-.51z"/>
    </svg>`;
  }

  return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="14 2 14 8 20 8" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

const KNOWN_FILE_EXTENSIONS: Record<string, string> = {
  tsx: 'tsx',
  ts: 'ts',
  mts: 'ts',
  cts: 'ts',
  jsx: 'jsx',
  js: 'js',
  mjs: 'js',
  cjs: 'js',
  py: 'py',
  pyw: 'py',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sql: 'sql',
  prisma: 'sql',
  rs: 'rs',
  go: 'go',
  c: 'c',
  cpp: 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'cs',
  java: 'java',
  kt: 'java',
  kts: 'java',
  scala: 'java',
  dart: 'js',
  swift: 'cs',
  rb: 'py',
  php: 'js',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  ps1: 'powershell',
  bat: 'cmd',
  cmd: 'cmd',
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',
  txt: 'code',
  log: 'code',
  pdf: 'code',
  csv: 'code',
  env: 'json',
  dockerfile: 'dockerfile',
  gitignore: 'code',
  lock: 'json',
};

function extractFileInfo(text: string): { fileName: string; ext: string; cleanName: string } | null {
  if (!text) return null;
  const trimmed = text.trim();
  // Strip optional leading @
  const raw = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  // Dotfiles like .gitignore or .env
  if (/^\.[a-zA-Z0-9_-]+$/.test(raw)) {
    const ext = raw.slice(1).toLowerCase();
    if (KNOWN_FILE_EXTENSIONS[ext]) {
      return { fileName: trimmed, ext, cleanName: raw };
    }
  }
  // Standard filename with extension (e.g. main.tsx, src/web/App.tsx, package.json)
  const match = raw.match(/^([a-zA-Z0-9_\-\.\/\\]+\.([a-zA-Z0-9_-]{1,10}))$/);
  if (!match) return null;
  const cleanName = match[1];
  const ext = match[2].toLowerCase();
  if (KNOWN_FILE_EXTENSIONS[ext]) {
    if (ext.length === 1 && !/^[a-zA-Z0-9_]{2,}/.test(cleanName)) return null;
    return { fileName: trimmed, ext, cleanName };
  }
  return null;
}

const htmlRenderCache = new Map<string, string>();
const MAX_CACHE_SIZE = 400;

function formatRichMarkdownHtml(rawContent: string, grounding?: GroundingMetadata): string {
  if (!rawContent) return '';
  const cacheKey = grounding && grounding.sources ? `${rawContent}__g_${grounding.sources.length}` : rawContent;
  if (htmlRenderCache.has(cacheKey)) {
    return htmlRenderCache.get(cacheKey)!;
  }

  // Intercept and format DeepSeek R1 / V3 Reasoning <think> blocks
  let thinkHtml = '';
  let contentToRender = rawContent;
  const thinkMatch = rawContent.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    const rawThought = thinkMatch[1].trim();
    if (rawThought) {
      const parsedThought = marked.parse(rawThought, { breaks: true, gfm: true }) as string;
      thinkHtml = `<details class="grokki-think-accordion"><summary class="grokki-think-summary"><svg class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3 2 5.5 5 7v3h6v-3c3-1.5 5-4 5-7a8 8 0 0 0-8-8z"></path><path d="M9 22h6"></path></svg><span>DeepSeek Reasoning &amp; Thought Process</span><span class="grokki-think-badge">Thinking</span></summary><div class="grokki-think-body">${parsedThought}</div></details>`;
    }
    contentToRender = rawContent.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
  }

  // Normalize inline or line-leading Unicode bullets (•) into numbered list items (1. 2. 3.)
  let normalized = contentToRender
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

  // 3. Style <a> links as clean blue links with dotted underline & prevent native Electron popup windows
  doc.querySelectorAll('a').forEach((a) => {
    const rawHref = a.getAttribute('href') || '';
    if (rawHref && !rawHref.startsWith('#')) {
      a.setAttribute('data-external-href', rawHref);
      a.setAttribute('href', '#');
      a.setAttribute('title', rawHref);
    }
    a.removeAttribute('target');
    a.setAttribute('rel', 'noopener noreferrer');
    a.classList.add('grokki-link');
  });

  // 3b. Style <img> tags into responsive entity cards with hover zoom and lightbox support (no shadows)
  doc.querySelectorAll('img').forEach((img) => {
    img.classList.add('grokki-markdown-image');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('referrerpolicy', 'no-referrer');
    img.setAttribute('onerror', 'this.style.display="none"');
    img.setAttribute('title', 'Click to zoom');
    img.setAttribute('role', 'button');
    img.setAttribute('tabindex', '0');

    if (!img.parentElement?.classList.contains('grokki-image-wrapper')) {
      const wrapper = doc.createElement('div');
      wrapper.className = 'grokki-image-wrapper';
      wrapper.setAttribute('title', 'Click to zoom');
      img.parentNode?.replaceChild(wrapper, img);
      wrapper.appendChild(img);
      const altText = (img.getAttribute('alt') || '').trim();
      if (altText && !['image', 'img', 'photo'].includes(altText.toLowerCase())) {
        const caption = doc.createElement('div');
        caption.className = 'grokki-image-caption';
        caption.textContent = altText;
        wrapper.appendChild(caption);
      }
    }
  });

  // 4. Enhance inline <code> matching filenames into interactive Grokki File Chips
  doc.querySelectorAll('code').forEach((codeEl) => {
    if (codeEl.closest('pre')) return; // skip code windows
    const rawText = (codeEl.textContent || '').trim();
    const info = extractFileInfo(rawText);
    if (info) {
      const chip = doc.createElement('span');
      chip.className = 'grokki-file-chip';
      chip.setAttribute('data-grokki-file-chip', 'true');
      chip.setAttribute('data-file-name', info.cleanName);
      chip.setAttribute('title', `Ctrl + Click to open ${info.cleanName} in desktop`);
      const logoSvg = getLanguageLogoSvg(info.ext);
      chip.innerHTML = `<span class="grokki-file-chip-icon">${logoSvg}</span><span class="grokki-file-chip-name">${rawText}</span>`;
      codeEl.parentNode?.replaceChild(chip, codeEl);
    }
  });

  // 5. Scan text nodes for standalone file mentions (e.g. main.tsx, @main.tsx, App.tsx, package.json)
  const FILE_IN_TEXT_REGEX = /(?:^|[\s(\[<{"'`])(@?[a-zA-Z0-9_\-\.\/\\]+\.(?:tsx|ts|mts|cts|jsx|js|mjs|cjs|py|pyw|html|htm|css|scss|sass|less|json|jsonc|ya?ml|toml|sql|prisma|rs|go|c|cpp|cxx|cc|h|hpp|cs|java|kt|scala|dart|swift|rb|php|sh|bash|zsh|ps1|bat|cmd|md|markdown|mdx|txt|pdf|csv|lock))\b/gi;

  const textNodes: Text[] = [];
  const collectTextNodes = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const val = node.textContent || '';
      if (val.trim() && FILE_IN_TEXT_REGEX.test(val)) {
        textNodes.push(node as Text);
      }
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (['PRE', 'CODE', 'A', 'BUTTON', 'SCRIPT', 'STYLE', 'SVG'].includes(el.tagName)) return;
      if (el.classList.contains('grokki-file-chip') || el.classList.contains('grokki-code-window')) return;
      Array.from(node.childNodes).forEach(collectTextNodes);
    }
  };
  collectTextNodes(doc.body);

  for (const tNode of textNodes) {
    const parent = tNode.parentNode;
    if (!parent) continue;
    const text = tNode.textContent || '';
    const parts = text.split(/(?:^|(?<=[\s(\[<{"'`]))(@?[a-zA-Z0-9_\-\.\/\\]+\.(?:tsx|ts|mts|cts|jsx|js|mjs|cjs|py|pyw|html|htm|css|scss|sass|less|json|jsonc|ya?ml|toml|sql|prisma|rs|go|c|cpp|cxx|cc|h|hpp|cs|java|kt|scala|dart|swift|rb|php|sh|bash|zsh|ps1|bat|cmd|md|markdown|mdx|txt|pdf|csv|lock))\b/gi);
    if (parts.length <= 1) continue;

    const frag = doc.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      const info = extractFileInfo(part);
      const isExcludedBrand = !part.startsWith('@') && !part.includes('/') && !part.includes('\\') && ['node.js', 'vue.js', 'next.js', 'react.js'].includes(part.toLowerCase());
      if (info && !isExcludedBrand) {
        const chip = doc.createElement('span');
        chip.className = 'grokki-file-chip';
        chip.setAttribute('data-grokki-file-chip', 'true');
        chip.setAttribute('data-file-name', info.cleanName);
        chip.setAttribute('title', `Ctrl + Click to open ${info.cleanName} in desktop`);
        const logoSvg = getLanguageLogoSvg(info.ext);
        chip.innerHTML = `<span class="grokki-file-chip-icon">${logoSvg}</span><span class="grokki-file-chip-name">${part}</span>`;
        frag.appendChild(chip);
      } else {
        frag.appendChild(doc.createTextNode(part));
      }
    }
    parent.replaceChild(frag, tNode);
  }

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

  if (thinkHtml) {
    finalHtml = `${thinkHtml}${finalHtml}`;
  }

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
  onOpenImage?: (src: string, alt: string, originRect?: { top: number; left: number; width: number; height: number }) => void;
}>(({ content, grounding, onOpenArtifact, onOpenImage }) => {
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

    // 0c. Handle any image click (open in lightbox zoom)
    const imgEl = (target?.closest('img') || target?.closest('.grokki-image-wrapper')?.querySelector('img')) as HTMLImageElement | null;
    if (imgEl && imgEl.src) {
      e.preventDefault();
      e.stopPropagation();
      const rect = imgEl.getBoundingClientRect();
      onOpenImage?.(imgEl.src, imgEl.alt || 'Image zoom', {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      return;
    }

    // 0b. Handle Grokki file chip click (Ctrl+Click or normal click)
    const fileChip = target?.closest('[data-grokki-file-chip]') as HTMLElement | null;
    if (fileChip) {
      const fileName = fileChip.getAttribute('data-file-name') || fileChip.textContent || '';
      const hasSelection = !!window.getSelection()?.toString();
      if (e.ctrlKey || e.metaKey || !hasSelection) {
        e.preventDefault();
        e.stopPropagation();
        fileChip.classList.add('grokki-file-chip-opening');
        setTimeout(() => fileChip.classList.remove('grokki-file-chip-opening'), 500);
        window.jarvisAPI?.openWorkspaceFile?.(fileName).catch(console.error);
        return;
      }
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
      className="grokki-markdown max-w-none text-gray-800 dark:text-gray-200 text-[13.5px] leading-relaxed select-text font-sans"
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
  onOpenImage?: (src: string, alt: string, originRect?: { top: number; left: number; width: number; height: number }) => void;
}> = ({ content, grounding, isAnimated, speed = 'fast', onScroll, onFinished, onOpenArtifact, onOpenImage }) => {
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

    // 0c. Handle any image click (open in lightbox zoom)
    const imgEl = (target?.closest('img') || target?.closest('.grokki-image-wrapper')?.querySelector('img')) as HTMLImageElement | null;
    if (imgEl && imgEl.src) {
      e.preventDefault();
      e.stopPropagation();
      const rect = imgEl.getBoundingClientRect();
      onOpenImage?.(imgEl.src, imgEl.alt || 'Image zoom', {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      return;
    }

    // 0b. Handle Grokki file chip click (Ctrl+Click or normal click)
    const fileChip = target?.closest('[data-grokki-file-chip]') as HTMLElement | null;
    if (fileChip) {
      const fileName = fileChip.getAttribute('data-file-name') || fileChip.textContent || '';
      const hasSelection = !!window.getSelection()?.toString();
      if (e.ctrlKey || e.metaKey || !hasSelection) {
        e.preventDefault();
        e.stopPropagation();
        fileChip.classList.add('grokki-file-chip-opening');
        setTimeout(() => fileChip.classList.remove('grokki-file-chip-opening'), 500);
        window.jarvisAPI?.openWorkspaceFile?.(fileName).catch(console.error);
        return;
      }
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
        if (el.classList.contains('grokki-code-header') || el.classList.contains('grokki-file-chip')) return;
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

function getFileBadge(filePath: string) {
  if (!filePath) return <span className="text-neutral-400 text-[12px] select-none">📄</span>;
  const clean = filePath.split('?')[0].split('#')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  if (ext === 'ts' || ext === 'tsx') {
    return <span className="text-[#3b82f6] font-mono font-bold text-[11px] leading-none select-none">ts</span>;
  }
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
    return <span className="text-[#f59e0b] font-mono font-bold text-[11px] leading-none select-none">js</span>;
  }
  if (ext === 'jsx') {
    return <span className="text-[#38bdf8] font-mono font-bold text-[11px] leading-none select-none">jsx</span>;
  }
  if (ext === 'py') {
    return <span className="text-[#14b8a6] font-mono font-bold text-[11px] leading-none select-none">py</span>;
  }
  if (ext === 'json') {
    return <span className="text-[#eab308] font-mono font-bold text-[11px] leading-none select-none">json</span>;
  }
  if (ext === 'css' || ext === 'scss' || ext === 'less') {
    return <span className="text-[#ec4899] font-mono font-bold text-[11px] leading-none select-none">css</span>;
  }
  if (ext === 'html') {
    return <span className="text-orange-400 font-mono font-bold text-[11px] leading-none select-none">&lt;&gt;</span>;
  }
  if (ext === 'md' || ext === 'txt') {
    return <span className="text-neutral-400 font-mono text-[11px] leading-none select-none">txt</span>;
  }
  return <span className="text-neutral-400 font-mono text-[11px] leading-none select-none">{ext || 'file'}</span>;
}

function getBaseFileName(p?: string): string {
  if (!p) return 'file';
  const clean = p.trim().replace(/^@+/, '');
  const norm = clean.replace(/\\/g, '/');
  const parts = norm.split('/').filter(Boolean);
  return parts[parts.length - 1] || clean;
}

function formatCommandSummary(cmd?: string, summary?: string): string {
  if (summary && summary.trim()) return summary.trim();
  if (!cmd || typeof cmd !== 'string') return 'command';
  const trimmed = cmd.trim();

  if (/^Get-ChildItem/i.test(trimmed)) {
    return 'list directory files';
  }

  const selectPattern = /Select-String\s+-Path\s+["']?([^"'\r\n]+?)["']?\s+-Pattern\s+["']?([^"'\r\n]+?)["']?(?:\s+-|$)/i.exec(trimmed);
  if (selectPattern) {
    const fName = getBaseFileName(selectPattern[1]);
    const pattern = selectPattern[2].replace(/^["']|["']$/g, '').slice(0, 36);
    return `find ${pattern} in ${fName}`;
  }

  const getContent = /Get-Content\s+-Path\s+["']?([^"'\r\n]+?)["']?/i.exec(trimmed);
  if (getContent) {
    return `inspect ${getBaseFileName(getContent[1])}`;
  }

  if (/^(?:npm\s+run\s+build|npm\s+build)/i.test(trimmed)) return 'build project bundle';
  if (/^(?:npm\s+test|npx\s+vitest|npx\s+jest)/i.test(trimmed)) return 'run project tests';
  if (/^(?:git\s+status)/i.test(trimmed)) return 'check git status';
  if (/^(?:git\s+diff)/i.test(trimmed)) return 'review git diff';

  const cleanCmd = trimmed.replace(/^powershell(?:\.exe)?\s+-Command\s+/i, '');
  if (cleanCmd.length > 55) {
    return cleanCmd.slice(0, 52) + '...';
  }
  return cleanCmd;
}

const AgentStepRow: React.FC<{
  step: AgentLiveStep | any;
  isLive?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}> = ({ step, isLive = false, isExpanded, onToggleExpand }) => {
  const name = step.name || step.tool || '';
  const args = step.args || {};
  const result = step.result || {};
  const isRunning = step.status === 'running' || (isLive && !step.result && step.status !== 'completed' && step.status !== 'failed');
  const isFailed = step.status === 'failed' || Boolean(result && (result.success === false || result.error));

  // 1. READ FILE
  if (name === 'read_file') {
    const filePath = args.path || result.relativePath || result.path || 'file';
    const baseName = getBaseFileName(filePath);
    const badge = getFileBadge(filePath);
    const startLine = result.startLine || args.start_line;
    const endLine = result.endLine || args.end_line;
    const rangeText = (startLine !== undefined && endLine !== undefined) ? `#L${startLine}-${endLine}` : '';

    return (
      <div className="flex flex-col py-0.5 font-sans">
        <div
          className="flex items-center gap-1.5 text-[13px] leading-relaxed select-none cursor-pointer group"
          onClick={isFailed && result.error ? onToggleExpand : undefined}
        >
          <span className={isFailed ? 'text-rose-400 font-medium' : 'text-neutral-400 dark:text-neutral-400'}>
            {isRunning ? 'Analyzing' : (isFailed ? 'Failed to read' : 'Analyzed')}
          </span>
          <span className="inline-flex items-center">{badge}</span>
          <span className="text-neutral-200 dark:text-neutral-200 font-mono text-[12px]">
            {baseName}
          </span>
          {rangeText && (
            <span className="text-neutral-500 font-mono text-[12px]">
              {rangeText}
            </span>
          )}
          {isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping ml-1" />
          )}
          {isFailed && result.error && (
            <span className={`text-neutral-500 group-hover:text-neutral-300 font-mono text-[12px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              &gt;
            </span>
          )}
        </div>
        {isExpanded && isFailed && (result.error || result.message) && (
          <div className="mt-1 mb-2 p-2 rounded bg-rose-950/30 backdrop-blur-md border border-rose-500/20 font-mono text-[11px] text-rose-300">
            {result.error || result.message}
          </div>
        )}
      </div>
    );
  }

  // 2. RUN COMMAND
  if (name === 'run_command') {
    const cmd = args.command || '';
    const summary = args.toolSummary || args.summary || '';
    const label = formatCommandSummary(cmd, summary);

    return (
      <div className="flex flex-col py-0.5 font-sans">
        <div
          className="flex items-center gap-1.5 text-[13px] leading-relaxed select-none cursor-pointer group"
          onClick={onToggleExpand}
        >
          <span className={isFailed ? 'text-rose-400 font-medium' : 'text-neutral-400 dark:text-neutral-400'}>
            {isRunning ? 'Running' : (isFailed ? 'Command failed' : 'Ran')}
          </span>
          <span className="text-neutral-200 dark:text-neutral-200 text-[12px] font-normal group-hover:text-white transition-colors">
            {label}
          </span>
          <span className={`text-neutral-500 group-hover:text-neutral-300 font-mono text-[12px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            &gt;
          </span>
          {isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping ml-1" />
          )}
        </div>
        {isExpanded && (
          <div className="mt-1 mb-2 p-2 rounded bg-black/40 backdrop-blur-md border border-white/10 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-48 scrollbar-thin">
            <div className="text-neutral-500 select-none mb-1">$ {cmd}</div>
            {result.stdout && <pre className="whitespace-pre-wrap">{result.stdout}</pre>}
            {result.stderr && <pre className="whitespace-pre-wrap text-rose-400 mt-1">{result.stderr}</pre>}
            {!result.stdout && !result.stderr && <div className="text-neutral-500 italic">(No output)</div>}
          </div>
        )}
      </div>
    );
  }

  // 3. EDIT FILE
  if (name === 'edit_file') {
    const filePath = args.path || result.relativePath || result.path || 'file';
    const baseName = getBaseFileName(filePath);
    const badge = getFileBadge(filePath);
    let added = result.addedLines || 0;
    let removed = result.removedLines || 0;
    if (!added && !removed && result.diff) {
      for (const line of result.diff.split(/\r?\n/)) {
        if (line.startsWith('+ ') || (line.startsWith('+') && !line.startsWith('+++'))) added++;
        else if (line.startsWith('- ') || (line.startsWith('-') && !line.startsWith('---'))) removed++;
      }
    }

    return (
      <div className="flex flex-col py-0.5 font-sans">
        <div
          className="flex items-center gap-1.5 text-[13px] leading-relaxed select-none cursor-pointer group"
          onClick={(result.diff || (isFailed && (result.error || result.message))) ? onToggleExpand : undefined}
        >
          <span className={isFailed ? 'text-rose-400 font-medium' : 'text-neutral-400 dark:text-neutral-400'}>
            {isRunning ? 'Editing' : (isFailed ? 'Failed to edit' : 'Edited')}
          </span>
          <span className="inline-flex items-center">{badge}</span>
          <span className="text-neutral-200 dark:text-neutral-200 font-mono text-[12px]">
            {baseName}
          </span>
          {!isRunning && !isFailed && (added > 0 || removed > 0) && (
            <span className="inline-flex items-center gap-1.5 ml-0.5">
              {added > 0 && (
                <span className="text-emerald-400 font-mono text-[12px] font-medium">
                  +{added}
                </span>
              )}
              {removed > 0 && (
                <span className="text-rose-400 font-mono text-[12px] font-medium">
                  -{removed}
                </span>
              )}
            </span>
          )}
          {(result.diff || (isFailed && (result.error || result.message))) && (
            <span className={`text-neutral-500 group-hover:text-neutral-300 font-mono text-[12px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              &gt;
            </span>
          )}
          {isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping ml-1" />
          )}
        </div>
        {isExpanded && isFailed && (result.error || result.message) && (
          <div className="mt-1 mb-2 p-2 rounded bg-rose-950/30 backdrop-blur-md border border-rose-500/20 font-mono text-[11px] text-rose-300">
            {result.error || result.message}
          </div>
        )}
        {isExpanded && result.diff && (
          <div className="mt-1 mb-2 p-2 rounded bg-black/40 backdrop-blur-md border border-white/10 font-mono text-[11px] overflow-x-auto max-h-48 scrollbar-thin">
            <pre className="whitespace-pre-wrap text-neutral-300">
              {result.diff.split('\n').map((l: string, idx: number) => (
                <span
                  key={idx}
                  className={
                    l.startsWith('+') && !l.startsWith('+++')
                      ? 'text-emerald-400 block'
                      : l.startsWith('-') && !l.startsWith('---')
                      ? 'text-rose-400 block'
                      : 'text-neutral-400 block'
                  }
                >
                  {l}
                </span>
              ))}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // 4. WRITE FILE
  if (name === 'write_file') {
    const filePath = args.path || result.relativePath || result.path || 'file';
    const baseName = getBaseFileName(filePath);
    const badge = getFileBadge(filePath);
    const added = result.addedLines || result.linesCount || 0;

    return (
      <div className="flex flex-col py-0.5 font-sans">
        <div
          className="flex items-center gap-1.5 text-[13px] leading-relaxed select-none cursor-pointer group"
          onClick={isFailed && result.error ? onToggleExpand : undefined}
        >
          <span className={isFailed ? 'text-rose-400 font-medium' : 'text-neutral-400 dark:text-neutral-400'}>
            {isRunning ? 'Creating' : (isFailed ? 'Failed to create' : 'Created')}
          </span>
          <span className="inline-flex items-center">{badge}</span>
          <span className="text-neutral-200 dark:text-neutral-200 font-mono text-[12px]">
            {baseName}
          </span>
          {!isRunning && !isFailed && added > 0 && (
            <span className="text-emerald-400 font-mono text-[12px] font-medium">
              +{added}
            </span>
          )}
          {isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-1" />
          )}
          {isFailed && result.error && (
            <span className={`text-neutral-500 group-hover:text-neutral-300 font-mono text-[12px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              &gt;
            </span>
          )}
        </div>
        {isExpanded && isFailed && result.error && (
          <div className="mt-1 mb-2 p-2 rounded bg-rose-950/30 border border-rose-500/20 font-mono text-[11px] text-rose-300">
            {result.error}
          </div>
        )}
      </div>
    );
  }

  // 5. SEARCH CODE
  if (name === 'search_code') {
    const query = args.query || '';
    const rawPath = args.path || '';
    const p = rawPath === '.' || rawPath === './' || !rawPath ? '' : getBaseFileName(rawPath);
    return (
      <div className="flex items-center gap-1.5 text-[13px] leading-relaxed py-0.5 select-none font-sans">
        <span className={isFailed ? 'text-rose-400 font-medium' : 'text-neutral-400 dark:text-neutral-400'}>
          {isRunning ? 'Searching' : (isFailed ? 'Search failed' : 'Searched')}
        </span>
        <span className="text-neutral-200 font-mono text-[12px]">"{query}"</span>
        {p && <span className="text-neutral-500 font-mono text-[12px]">in {p}</span>}
        {isRunning && (
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping ml-1" />
        )}
      </div>
    );
  }

  // 6. LIST DIRECTORY
  if (name === 'list_directory') {
    const rawDir = args.path || result.relativePath || result.root || '';
    const dir = rawDir === '.' || rawDir === './' || !rawDir ? 'project files' : getBaseFileName(rawDir);
    return (
      <div className="flex items-center gap-1.5 text-[13px] leading-relaxed py-0.5 select-none font-sans">
        <span className={isFailed ? 'text-rose-400 font-medium' : 'text-neutral-400 dark:text-neutral-400'}>
          {isRunning ? 'Listing' : (isFailed ? 'Failed to list' : 'Listed')}
        </span>
        <span className="text-neutral-200 font-mono text-[12px]">{dir}</span>
        {isRunning && (
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping ml-1" />
        )}
      </div>
    );
  }

  // 7. MEMORY RECALL & SEARCH (search_memory, recall_memory)
  if (name === 'search_memory' || name === 'recall_memory') {
    const q = args.query || args.topic || 'memory';
    return (
      <div className="flex flex-col py-0.5 font-sans">
        <div
          className="flex items-center gap-1.5 text-[13px] leading-relaxed select-none cursor-pointer group"
          onClick={result.message ? onToggleExpand : undefined}
        >
          <span className="text-neutral-400 dark:text-neutral-400">
            {isRunning ? 'Recalling' : 'Recalled'}
          </span>
          <span className="inline-flex items-center text-[13px] select-none">🧠</span>
          <span className="text-neutral-200 dark:text-neutral-200 text-[12px] font-medium group-hover:text-white transition-colors">
            memory "{q}"
          </span>
          {result.message && (
            <span className={`text-neutral-500 group-hover:text-neutral-300 font-mono text-[12px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
              &gt;
            </span>
          )}
          {isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping ml-1" />
          )}
        </div>
        {isExpanded && result.message && (
          <div className="mt-1 mb-2 p-2 rounded bg-black/40 backdrop-blur-md border border-white/10 font-sans text-[11.5px] text-neutral-300 overflow-x-auto max-h-48 scrollbar-thin">
            <div className="whitespace-pre-wrap">{result.message}</div>
          </div>
        )}
      </div>
    );
  }

  // 8. WRITE MEMORY
  if (name === 'write_memory') {
    const title = args.title || 'note';
    return (
      <div className="flex items-center gap-1.5 text-[13px] leading-relaxed py-0.5 select-none font-sans">
        <span className="text-neutral-400 dark:text-neutral-400">
          {isRunning ? 'Saving to' : 'Saved to'}
        </span>
        <span className="inline-flex items-center text-[13px] select-none">🧠</span>
        <span className="text-neutral-200 dark:text-neutral-200 text-[12px] font-medium">
          memory "{title}"
        </span>
        {isRunning && (
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping ml-1" />
        )}
      </div>
    );
  }

  // Fallback for any other tools
  return (
    <div className="flex items-center gap-1.5 text-[13px] leading-relaxed py-0.5 select-none font-sans">
      <span className="text-neutral-400 dark:text-neutral-400">
        {isRunning ? 'Running' : 'Executed'}
      </span>
      <span className="text-neutral-200 font-mono text-[12px]">
        {name.replace(/_/g, ' ')}
      </span>
      {isRunning && (
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping ml-1" />
      )}
    </div>
  );
};

function getStepsSummary(steps: any[], isLive: boolean = false): string {
  if (!steps || steps.length === 0) return isLive ? 'Working on task...' : 'Working on task';

  const hasRead = steps.some((s) => s.name === 'read_file' || s.name === 'list_directory' || s.name === 'search_code');
  const hasCommand = steps.some((s) => s.name === 'run_command' || s.name === 'git_operations');
  const hasEdit = steps.some((s) => s.name === 'edit_file' || s.name === 'write_file');
  const hasMemory = steps.some((s) => s.name === 'search_memory' || s.name === 'recall_memory' || s.name === 'write_memory');

  const hasFailedEdit = steps.some((s) => (s.name === 'edit_file' || s.name === 'write_file') && (s.status === 'failed' || (s.result && s.result.success === false)));
  const hasSuccessEdit = steps.some((s) => (s.name === 'edit_file' || s.name === 'write_file') && (!s.result || s.result.success !== false) && s.status !== 'failed');

  const parts: string[] = [];
  if (hasRead) parts.push(isLive ? 'exploring files' : 'Explored files');
  if (hasCommand) parts.push(isLive ? 'running commands' : 'ran commands');
  if (hasEdit) {
    if (isLive) {
      parts.push('editing files');
    } else if (hasSuccessEdit) {
      parts.push('edited files');
    } else {
      parts.push('failed to edit files');
    }
  }
  if (hasMemory) parts.push(isLive ? 'recalling memory' : 'recalled memory');

  if (parts.length === 0) {
    const firstTool = steps[0]?.name ? steps[0].name.replace(/_/g, ' ') : 'tool';
    return isLive ? `Running ${firstTool}...` : `Executed ${steps.length} ${firstTool} step${steps.length > 1 ? 's' : ''}`;
  }

  const joined = parts.join(', ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

function formatWorkedDuration(ms?: number): string {
  if (!ms || ms < 1000) return '';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `Worked for ${totalSec}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (secs === 0) return `Worked for ${mins}m`;
  return `Worked for ${mins}m ${secs}s`;
}

export const AgentStepsAccordion: React.FC<{
  steps: AgentLiveStep[] | any[];
  isLive?: boolean;
  defaultExpanded?: boolean;
  expandedStepIds: Set<string>;
  onToggleStepExpand: (stepId: string) => void;
  messageId?: string;
}> = ({
  steps,
  isLive = false,
  defaultExpanded = true,
  expandedStepIds,
  onToggleStepExpand,
  messageId = 'live',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultExpanded);

  if (!steps || steps.length === 0) return null;

  const summary = getStepsSummary(steps, isLive);

  let durationText = '';
  if (steps.length > 0) {
    const firstTs = steps[0].timestamp;
    const lastTs = steps[steps.length - 1].timestamp;
    if (firstTs && lastTs && lastTs > firstTs) {
      durationText = formatWorkedDuration(lastTs - firstTs);
    }
  }

  return (
    <div className="flex flex-col my-1.5 select-none font-sans max-w-full">
      {/* Optional "Worked for Xm" Header if duration is meaningful */}
      {durationText && (
        <div className="text-[12px] text-neutral-400 dark:text-neutral-400 font-medium mb-1.5 flex items-center gap-1.5">
          <span>{durationText}</span>
          <ChevronDown className="w-3 h-3 text-neutral-500" />
        </div>
      )}

      {/* Accordion Toggle Pill / Box */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-fit max-w-full bg-[#13151c]/90 hover:bg-[#1a1c26] border border-white/[0.08] hover:border-white/[0.15] text-neutral-300 dark:text-neutral-300 rounded-lg px-2.5 py-1 text-[12px] font-sans inline-flex items-center gap-2 cursor-pointer transition-all shadow-xs text-left group"
      >
        <span className="truncate group-hover:text-white transition-colors">
          {summary}
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-200 transition-colors flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-200 transition-colors flex-shrink-0" />
        )}
      </button>

      {/* Collapsible Steps Body with clean indentation */}
      {isOpen && (
        <div className="flex flex-col gap-0.5 mt-2 pl-2 animate-in fade-in duration-150">
          {steps.map((step, idx) => {
            const stepId = step.id || `step_${messageId}_${idx}`;
            const stepIsLive = isLive && (idx === steps.length - 1 || step.status === 'running');
            return (
              <AgentStepRow
                key={stepId}
                step={step}
                isLive={stepIsLive}
                isExpanded={expandedStepIds.has(stepId)}
                onToggleExpand={() => onToggleStepExpand(stepId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ChatTab = React.memo<ChatTabProps>(({
  config,
  userName,
  onNavigateTab,
  activeConversation,
  onUpdateMessages,
  onUpdateConvoMessages,
  thinkingConvoIds,
  onSetConvoThinking,
  onNewChat,
  onChangeConfig,
  activeModelPull,
  agentMode = false,
  activeWorkspaceRoot,
  activeWorkspaceName,
  conversations,
  onSelectWorkspaceFolder,
  onUpdateConversationMeta,
}) => {
  const messages = activeConversation.messages;
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  // User name or nickname for personalized greeting
  const effectiveName = useMemo(() => {
    return (
      sanitizeGreetingName(config.userNickname) ||
      sanitizeGreetingName(config.userName) ||
      sanitizeGreetingName(userName)
    );
  }, [config.userNickname, config.userName, userName]);

  // Dynamic random greeting phrase (distinct for agentMode vs chatMode, time-of-day aware, personalized)
  const [greetingShuffleNonce, setGreetingShuffleNonce] = useState(0);
  const greetingPhrase = useMemo(() => {
    return getRandomGreetingPhrase(agentMode, effectiveName);
  }, [activeConversation.id, agentMode, effectiveName, greetingShuffleNonce]);

  const isDarkTheme =
    config.dashboardTheme === 'dark' ||
    (typeof document !== 'undefined' &&
      (document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark')));

  // ---- Grokki Agent controls (effort / permission / project) ----
  const [selectedEffort, setSelectedEffort] = useState<AgentEffort>(() => activeConversation.effort || 'high');
  const [selectedPermission, setSelectedPermission] = useState<AgentPermission>(() => activeConversation.permission || 'turbo');
  const [agentMenu, setAgentMenu] = useState<null | 'effort' | 'permission' | 'project'>(null);
  const agentControlsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedEffort(activeConversation.effort || 'high');
    setSelectedPermission(activeConversation.permission || 'turbo');
  }, [activeConversation.id, activeConversation.effort, activeConversation.permission]);

  const agentRoot = activeConversation.workspaceRoot || '';
  const agentRootName = activeConversation.workspaceName || (agentRoot ? agentRoot.replace(/[/\\]+$/, '').split(/[/\\]/).pop() : '') || '';
  const isProjectLocked = agentMode && messages.length > 0 && Boolean(agentRoot);

  const knownProjects = useMemo(() => {
    const map = new Map<string, { root: string; name: string }>();
    if (activeWorkspaceRoot) {
      map.set(activeWorkspaceRoot, {
        root: activeWorkspaceRoot,
        name: activeWorkspaceName || activeWorkspaceRoot.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || 'Project',
      });
    }
    if (conversations && Array.isArray(conversations)) {
      for (const c of conversations) {
        if (c.workspaceRoot) {
          const name = c.workspaceName || c.workspaceRoot.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || 'Project';
          map.set(c.workspaceRoot, { root: c.workspaceRoot, name });
        }
      }
    }
    return Array.from(map.values());
  }, [conversations, activeWorkspaceRoot, activeWorkspaceName]);

  const handleSetEffort = useCallback((eff: AgentEffort) => {
    setSelectedEffort(eff);
    setAgentMenu(null);
    onUpdateConversationMeta?.(activeConversation.id, { effort: eff });
  }, [activeConversation.id, onUpdateConversationMeta]);

  const handleSetPermission = useCallback((perm: AgentPermission) => {
    setSelectedPermission(perm);
    setAgentMenu(null);
    onUpdateConversationMeta?.(activeConversation.id, { permission: perm });
  }, [activeConversation.id, onUpdateConversationMeta]);

  useEffect(() => {
    if (!agentMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (agentControlsRef.current && target && !agentControlsRef.current.contains(target)) {
        setAgentMenu(null);
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleOutsideClick);
    }, 20);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [agentMenu]);

  const renderAgentControlsBar = () => {
    const currentPermissionMeta = AGENT_PERMISSION_OPTIONS.find((p) => p.id === selectedPermission) || AGENT_PERMISSION_OPTIONS[3];
    const PermIcon = currentPermissionMeta.icon;

    return (
      <div
        ref={agentControlsRef}
        className="flex items-center justify-between gap-2 px-1 pt-2 w-full select-none text-xs relative z-50 overflow-visible"
      >
        {/* Left: Project Selector (Locked after first message sent under root) */}
        <div className="relative flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isProjectLocked) return;
              setAgentMenu(agentMenu === 'project' ? null : 'project');
            }}
            disabled={isProjectLocked}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-medium bg-gray-100 hover:bg-gray-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-white/[0.08] transition-all max-w-[260px] truncate select-none ${
              isProjectLocked ? 'cursor-default opacity-85' : 'cursor-pointer shadow-xs'
            }`}
            title={
              isProjectLocked
                ? `Project root is locked for this session (${agentRootName})`
                : agentRoot
                ? `Project Root: ${agentRoot} (Click to change or select folder)`
                : 'Click to select project folder'
            }
          >
            <Folder className="w-3.5 h-3.5 text-gray-400 dark:text-gray-300 shrink-0" />
            <span className="truncate uppercase tracking-wider text-[11px] font-semibold">
              {agentRoot ? agentRootName : 'No project selected'}
            </span>
            {isProjectLocked ? (
              <Lock className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0 ml-0.5" />
            ) : (
              <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            )}
          </button>

          {/* Root Project Dropdown: ALWAYS ABOVE with frosted glass blur */}
          {agentMenu === 'project' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 bottom-full mb-2 w-72 rounded-2xl border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-2 z-[9999] text-left transition-all duration-150 ease-out"
              style={{
                backdropFilter: 'blur(40px) saturate(190%)',
                WebkitBackdropFilter: 'blur(40px) saturate(190%)',
                backgroundColor: isDarkTheme ? 'rgba(15, 17, 23, 0.94)' : 'rgba(255, 255, 255, 0.94)',
              }}
            >
              <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Root Project
              </div>

              <div className="flex flex-col gap-0.5 mt-1 max-h-56 overflow-y-auto no-scrollbar">
                {knownProjects.map((p) => {
                  const isSelected = agentRoot === p.root;
                  return (
                    <button
                      key={p.root}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onUpdateConversationMeta?.(activeConversation.id, {
                          workspaceRoot: p.root,
                          workspaceName: p.name,
                        });
                        setAgentMenu(null);
                      }}
                      className={`flex items-start gap-2.5 w-full p-2 rounded-xl text-left transition-colors cursor-pointer border-none ${
                        isSelected ? 'bg-white/[0.12] text-white' : 'hover:bg-white/[0.06] text-gray-300'
                      }`}
                    >
                      <Folder className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[12px] font-medium text-white truncate">{p.name}</span>
                        <span className="text-[10px] text-gray-400 truncate leading-tight mt-0.5 font-mono">{p.root}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />}
                    </button>
                  );
                })}

                {/* Browse folder from disk option */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAgentMenu(null);
                    onSelectWorkspaceFolder?.();
                  }}
                  className="flex items-center gap-2.5 w-full p-2 rounded-xl text-left transition-colors cursor-pointer border-none hover:bg-white/[0.06] text-gray-300 border-t border-white/5 mt-1 pt-1.5"
                >
                  <FolderPlus className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-[12px] font-medium text-gray-200">Browse folder on disk...</span>
                </button>

                {agentRoot && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onUpdateConversationMeta?.(activeConversation.id, {
                        workspaceRoot: undefined,
                        workspaceName: undefined,
                      });
                      setAgentMenu(null);
                    }}
                    className="flex items-center gap-2.5 w-full p-1.5 rounded-lg text-left transition-colors cursor-pointer border-none hover:bg-red-500/10 text-red-400 text-[11px]"
                  >
                    <span>Deselect project root</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Effort & Permissions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Effort Level Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAgentMenu(agentMenu === 'effort' ? null : 'effort');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-medium bg-gray-100 hover:bg-gray-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-white/[0.08] transition-all cursor-pointer shadow-xs"
            >
              <Gauge className="w-3.5 h-3.5 text-gray-400 dark:text-gray-300 shrink-0" />
              <span>
                Effort: <span className="capitalize font-semibold text-gray-900 dark:text-white">{selectedEffort}</span>
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            </button>

            {agentMenu === 'effort' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-full mb-2 w-64 rounded-2xl border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-2 z-[9999] text-left transition-all duration-150 ease-out"
                style={{
                  backdropFilter: 'blur(40px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(190%)',
                  backgroundColor: isDarkTheme ? 'rgba(15, 17, 23, 0.94)' : 'rgba(255, 255, 255, 0.94)',
                }}
              >
                <div className="px-2.5 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Effort Level
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  {AGENT_EFFORT_OPTIONS.map((opt) => {
                    const isSelected = selectedEffort === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSetEffort(opt.id);
                        }}
                        className={`flex items-start justify-between w-full p-2 rounded-xl text-left transition-colors cursor-pointer border-none ${
                          isSelected ? 'bg-white/[0.12] text-white' : 'hover:bg-white/[0.06] text-gray-300'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[12px] font-medium text-white">{opt.label} ({opt.turns} steps)</span>
                          <span className="text-[10.5px] text-gray-400 leading-tight mt-0.5">{opt.desc}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Local Permissions Dropdown (Blurred glass background & monochrome icons) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAgentMenu(agentMenu === 'permission' ? null : 'permission');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-medium bg-gray-100 hover:bg-gray-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-white/[0.08] transition-all cursor-pointer shadow-xs"
            >
              <PermIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-300 shrink-0" />
              <span className="font-semibold text-gray-900 dark:text-white">
                {selectedPermission === 'turbo' ? 'Turbo' : currentPermissionMeta.label}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            </button>

            {agentMenu === 'permission' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-2.5 z-[9999] text-left transition-all duration-150 ease-out"
                style={{
                  backdropFilter: 'blur(40px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(190%)',
                  backgroundColor: isDarkTheme ? 'rgba(15, 17, 23, 0.94)' : 'rgba(255, 255, 255, 0.94)',
                }}
              >
                <div className="px-2 py-1 mb-1 text-[12.5px] font-medium text-gray-300">
                  Local Permissions
                </div>
                <div className="flex flex-col gap-1">
                  {AGENT_PERMISSION_OPTIONS.map((opt) => {
                    const IconComponent = opt.icon;
                    const isSelected = selectedPermission === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSetPermission(opt.id);
                        }}
                        className={`flex items-start gap-3 w-full p-2 rounded-xl text-left transition-colors cursor-pointer border-none ${
                          isSelected ? 'bg-white/[0.12]' : 'hover:bg-white/[0.06]'
                        }`}
                      >
                        <IconComponent className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-medium text-white">{opt.label}</span>
                            {opt.isDefault && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-normal bg-white/10 text-gray-300 border border-white/10">
                                Default <Info className="w-2.5 h-2.5 ml-0.5 inline opacity-70" />
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 leading-tight mt-0.5">{opt.desc}</span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Agent Skills Button */}
          {/* <button
            type="button"
            onClick={() => onNavigateTab('skills')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-medium bg-gray-100 hover:bg-gray-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-gray-700 dark:text-gray-300 border border-gray-200/70 dark:border-white/[0.08] transition-all cursor-pointer shadow-xs"
            title="Configure Agent Skills & Execution Playbooks"
          >
            <HugeiconsIcon icon={Layers01Icon} size={13} strokeWidth={1.8} className="text-zinc-500 dark:text-zinc-400 shrink-0" />
            <span className="font-semibold text-gray-900 dark:text-white">Skills</span>
          </button> */}
        </div>
      </div>
    );
  };
  const isChatThinking = Boolean(thinkingConvoIds ? thinkingConvoIds.has(activeConversation.id) : loading);

  useEffect(() => {
    setLoading(false);
    setEditingMessageId(null);
    setEditingContent('');
  }, [activeConversation.id]);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('grokki_canvas_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 380 && parsed <= (typeof window !== 'undefined' ? window.innerWidth - 100 : 2000)) {
          return parsed;
        }
      }
    } catch (_) {}
    return typeof window !== 'undefined' ? Math.min(960, Math.max(520, Math.round(window.innerWidth * 0.48))) : 640;
  });
  const [isCanvasResizing, setIsCanvasResizing] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFileInfo | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [dualBattleEnabled, setDualBattleEnabled] = useState(false);
  const [brainASelection, setBrainASelection] = useState<string>('gemini:gemini-flash-latest');
  const [brainBSelection, setBrainBSelection] = useState<string>('groq:qwen/qwen3.8-27b');
  const [synthesizingId, setSynthesizingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [canScrollDown, setCanScrollDown] = useState<boolean>(false);
  const [localModelPull, setLocalModelPull] = useState<ActiveModelPull | null>(null);
  const [revertModalTarget, setRevertModalTarget] = useState<ChatMessage | null>(null);
  const [revertFiles, setRevertFiles] = useState<Array<{
    path: string;
    fileName: string;
    relativePath: string;
    addedLines: number;
    removedLines: number;
    isNew: boolean;
    diff?: string;
    backup?: {
      path: string;
      originalContent?: string | null;
      existedBefore?: boolean;
      relativePath?: string;
    };
  }>>([]);
  const [revertFileChangesChecked, setRevertFileChangesChecked] = useState<boolean>(true);
  const [viewingDiffFile, setViewingDiffFile] = useState<string | null>(null);

  useEffect(() => {
    if (activeModelPull) return;
    if (window.jarvisAPI?.getActiveOllamaPull) {
      window.jarvisAPI.getActiveOllamaPull().then((pull) => {
        if (pull && !pull.completed) {
          const installed = config.cachedProviderModels?.ollama || [];
          if (pull.percent === 0 && installed.some((m: string) => m === pull.modelName || m.startsWith(pull.modelName))) {
            window.jarvisAPI?.dismissOllamaPull?.().catch(() => {});
            return;
          }
          setLocalModelPull(pull);
        }
      }).catch(() => {});
    }
    if (window.jarvisAPI?.onOllamaPullProgress) {
      const unsub = window.jarvisAPI.onOllamaPullProgress((data: any) => {
        if (!data) {
          setLocalModelPull(null);
          return;
        }
        if (data.status === 'success' || data.percent >= 100 || data.completed === true) {
          setLocalModelPull({
            modelName: data.modelName,
            status: 'success',
            percent: 100,
            completed: true,
          });
          setTimeout(() => {
            setLocalModelPull(null);
          }, 2500);
        } else if (data.status === 'error' || data.error) {
          setLocalModelPull({
            modelName: data.modelName,
            status: 'error',
            percent: 0,
            error: data.error || 'Failed to download model',
          });
          setTimeout(() => {
            setLocalModelPull(null);
          }, 3500);
        } else {
          setLocalModelPull({
            modelName: data.modelName,
            status: data.status,
            percent: data.percent,
            completed: false,
            total: data.total,
          });
        }
      });
      return () => unsub();
    }
  }, [activeModelPull, config.cachedProviderModels?.ollama]);

  const effectiveModelPull = activeModelPull || localModelPull;
  const isInstalledInConfig = useMemo(() => {
    if (!effectiveModelPull) return false;
    const installed = config.cachedProviderModels?.ollama || [];
    return installed.some((m: string) => m === effectiveModelPull.modelName || m.startsWith(effectiveModelPull.modelName));
  }, [effectiveModelPull, config.cachedProviderModels?.ollama]);

  const shouldShowPullToast = Boolean(effectiveModelPull && !(isInstalledInConfig && (effectiveModelPull.percent === 0 || effectiveModelPull.status === 'Downloading...')));

  // Monitor scroll distance to bottom to conditionally reveal down chevron button above input
  useEffect(() => {
    const container = document.getElementById('grokki-chat-scroll');
    if (!container) return;

    const checkScroll = () => {
      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setCanScrollDown(distanceToBottom > 45);
    };

    container.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(container);
    checkScroll();

    return () => {
      container.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [messages.length]);

  // Slash Commands state
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);

  // Workspace Mentions state (@file and @folder)
  const [workspaceRoot, setWorkspaceRoot] = useState<string>('');
  const [workspaceFolderName, setWorkspaceFolderName] = useState<string>('');
  const [scannedFiles, setScannedFiles] = useState<WorkspaceMention[]>([]);
  const [totalWorkspaceMatches, setTotalWorkspaceMatches] = useState<number>(0);
  const [stagedMentions, setStagedMentions] = useState<WorkspaceMention[]>([]);
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const [mentionDismissed, setMentionDismissed] = useState<boolean>(false);

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
    ollama: { name: 'Ollama', modelField: 'ollamaModel', defaultModel: '', Logo: OllamaLogo },
    openrouter: { name: 'OpenRouter', modelField: 'openrouterModel', defaultModel: 'openrouter/auto', Logo: OpenRouterLogo },
    omniroute: { name: 'OmniRoute', modelField: 'omnirouteModel', defaultModel: 'auto', Logo: OmniRouterLogo },
    omnirouter: { name: 'OmniRoute', modelField: 'omnirouteModel', defaultModel: 'auto', Logo: OmniRouterLogo },
    openai: { name: 'OpenAI', modelField: 'openaiModel', defaultModel: 'gpt-4o', Logo: OpenAILogo },
    grok: { name: 'Grok', modelField: 'grokModel', defaultModel: 'grok-2-1212', Logo: GrokLogo },
    deepseek: { name: 'DeepSeek', modelField: 'deepseekModel', defaultModel: 'deepseek-chat', Logo: DeepSeekLogo },
    qwen: { name: 'Qwen', modelField: 'qwenModel', defaultModel: 'qwen-max', Logo: QwenLogo },
    litellm: { name: 'LiteLLM', modelField: 'litellmModel', defaultModel: 'gpt-4o', Logo: LiteLLMLogo },
    bifrost: { name: 'Bifrost', modelField: 'bifrostModel', defaultModel: 'auto', Logo: BifrostLogo },
    portkey: { name: 'Portkey', modelField: 'portkeyModel', defaultModel: 'auto', Logo: PortkeyLogo },
    helicone: { name: 'Helicone', modelField: 'heliconeModel', defaultModel: 'gpt-4o', Logo: HeliconeLogo },
    routellm: { name: 'RouteLLM', modelField: 'routellmModel', defaultModel: 'router-mf', Logo: RouteLLMLogo },
    newapi: { name: 'New API', modelField: 'newapiModel', defaultModel: 'auto', Logo: NewApiLogo },
    higress: { name: 'Higress', modelField: 'higressModel', defaultModel: 'auto', Logo: HigressLogo },
    clawrouter: { name: 'ClawRouter', modelField: 'clawrouterModel', defaultModel: 'auto', Logo: ClawRouterLogo },
    freellmapi: { name: 'FreeLLMAPI', modelField: 'freellmapiModel', defaultModel: 'auto', Logo: FreeLLMAPILogo },
  }), []);

  const currentBrainInfo = brainMeta[activeBrain] || brainMeta.gemini;
  const currentModelValue = useMemo(() => {
    if (activeBrain === 'ollama') {
      const ollamaModels = (config.cachedProviderModels?.ollama || []).filter(Boolean);
      if (ollamaModels.length === 0) {
        return 'no_models';
      }
      if (config.ollamaModel && ollamaModels.includes(config.ollamaModel)) {
        return config.ollamaModel;
      }
      return (ollamaModels[0] as string) || 'no_models';
    }
    return (config[currentBrainInfo.modelField] as string) || currentBrainInfo.defaultModel;
  }, [activeBrain, config, currentBrainInfo]);

  const applyAgentContext = useCallback((context: any) => {
    context.provider = activeBrain;
    context.model = currentModelValue;
    if (agentMode) {
      context.mode = 'agent';
      context.conversationId = activeConversation.id;
      context.workspaceRoot = agentRoot;
      context.workspaceName = agentRootName;
      context.effort = selectedEffort;
      context.permission = selectedPermission;
      const matched = AGENT_EFFORT_OPTIONS.find((o) => o.id === selectedEffort);
      if (matched) {
        context.maxTurns = matched.turns;
        context.maxAgentSteps = matched.turns;
      }
    } else {
      context.mode = 'chat';
    }
  }, [activeBrain, currentModelValue, activeConversation.id, agentMode, agentRoot, agentRootName, selectedEffort, selectedPermission]);

  // Auto-fetch provider models for ChatTab if not cached yet (guarded to never re-trigger infinite loop)
  useEffect(() => {
    const dynamicProviders = [
      'omniroute', 'omnirouter', 'litellm', 'bifrost', 'portkey', 'helicone',
      'routellm', 'newapi', 'higress', 'clawrouter', 'ollama', 'openrouter', 'groq'
    ];
    if (!dynamicProviders.includes(activeBrain)) return;

    // Check if already cached in config
    const alreadyCached = config.cachedProviderModels?.[activeBrain];
    if (Array.isArray(alreadyCached)) return;

    if (activeBrain === 'ollama') {
      if (window.jarvisAPI?.checkOllamaStatus) {
        window.jarvisAPI.checkOllamaStatus(config.ollamaEndpoint || 'http://127.0.0.1:11434')
          .then((res) => {
            const models = Array.isArray(res?.models) ? res.models : [];
            const prev = config.cachedProviderModels?.ollama;
            const isSame = Array.isArray(prev) &&
              prev.length === models.length &&
              prev.every((v, i) => v === models[i]);
            if (!isSame) {
              onChangeConfig?.({
                cachedProviderModels: {
                  ...(config.cachedProviderModels || {}),
                  ollama: models,
                },
              });
            }
          })
          .catch(() => {});
      }
      return;
    }

    if (window.jarvisAPI?.fetchProviderModels) {
      let ep: string | undefined = undefined;
      let key: string | undefined = undefined;

      if (activeBrain === 'omniroute' || activeBrain === 'omnirouter') {
        ep = config.omnirouteEndpoint || 'http://localhost:20128/v1';
        key = config.omnirouteApiKey || config.omnirouterApiKey;
      } else if (activeBrain === 'litellm') {
        ep = config.litellmEndpoint || 'http://localhost:4000/v1';
        key = config.litellmApiKey;
      } else if (activeBrain === 'bifrost') {
        ep = config.bifrostEndpoint || 'http://localhost:8080/v1';
        key = config.bifrostApiKey;
      } else if (activeBrain === 'portkey') {
        ep = config.portkeyEndpoint || 'https://api.portkey.ai/v1';
        key = config.portkeyApiKey;
      } else if (activeBrain === 'helicone') {
        ep = config.heliconeEndpoint || 'https://oai.helicone.ai/v1';
        key = config.heliconeApiKey;
      } else if (activeBrain === 'routellm') {
        ep = config.routellmEndpoint || 'http://localhost:6060/v1';
        key = config.routellmApiKey;
      } else if (activeBrain === 'newapi') {
        ep = config.newapiEndpoint || 'http://localhost:3000/v1';
        key = config.newapiApiKey;
      } else if (activeBrain === 'higress') {
        ep = config.higressEndpoint || 'http://localhost:8080/v1';
        key = config.higressApiKey;
      } else if (activeBrain === 'clawrouter') {
        ep = config.clawrouterEndpoint || 'http://localhost:8000/v1';
        key = config.clawrouterApiKey;
      } else if (activeBrain === 'freellmapi') {
        ep = config.freellmapiEndpoint || 'http://localhost:3001/v1';
        key = config.freellmapiApiKey;
      } else if (activeBrain === 'groq') {
        key = config.groqApiKey;
      } else if (activeBrain === 'openrouter') {
        key = config.openrouterApiKey;
      }

      window.jarvisAPI.fetchProviderModels({ provider: activeBrain, endpoint: ep, key })
        .then(async (res) => {
          let models = (res?.success && Array.isArray(res.models)) ? res.models : null;
          if (!models && ep) {
            try {
              const headers: Record<string, string> = {};
              if (key) headers['Authorization'] = `Bearer ${key}`;
              if (activeBrain === 'portkey') {
                if (key) headers['x-portkey-api-key'] = key;
                headers['x-portkey-provider'] = 'openai';
              } else if (activeBrain === 'helicone') {
                if (key) headers['Helicone-Auth'] = `Bearer ${key}`;
              }
              const r = await fetch(`${ep.replace(/\/+$/, '')}/models`, { headers });
              if (r.ok) {
                const d = await r.json();
                const list = Array.isArray(d.data) ? d.data : Array.isArray(d.models) ? d.models : Array.isArray(d) ? d : [];
                models = list.map((m: any) => typeof m === 'string' ? m : (m.id || m.name || m.model)).filter(Boolean);
              }
            } catch (_) {}
          }
          if (Array.isArray(models) && models.length > 0) {
            onChangeConfig?.({
              cachedProviderModels: {
                ...(config.cachedProviderModels || {}),
                [activeBrain]: models,
              },
            });
          }
        })
        .catch(() => {});
    }
  }, [activeBrain, config.ollamaEndpoint, config.omnirouteEndpoint, config.omnirouteApiKey]);

  const handleSelectModel = useCallback((selectedVal: string) => {
    if (selectedVal === '__switch_brain__' || selectedVal === 'no_models') {
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
    const BrainLogo = currentBrainInfo.Logo;
    const map = new Map<string, GlideSelectOption>();

    if (activeBrain === 'ollama') {
      const ollamaModels = (config.cachedProviderModels?.ollama || []).filter(Boolean);
      if (ollamaModels.length === 0) {
        return [
          {
            value: 'no_models',
            label: (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                <Sliders className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>No models installed (Install in AI Models)</span>
              </span>
            ),
            tag: 'Install',
          },
        ];
      }

      ollamaModels.forEach((m) => {
        const modelId = typeof m === 'string' ? m : (m as any).value || (m as any).name || (m as any).id;
        if (!modelId) return;
        map.set(modelId, {
          value: modelId,
          label: (
            <span className="flex items-center gap-1.5 truncate max-w-[260px] text-[11px]">
              <BrainLogo className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{modelId}</span>
            </span>
          ),
          tag: 'Installed',
        });
      });

      const opts = Array.from(map.values());
      opts.push({
        value: '__switch_brain__',
        label: (
          <span className="flex items-center gap-1.5 text-sky-400 font-semibold text-[11px]">
            <Sliders className="w-3.5 h-3.5 shrink-0 text-sky-400" />
            <span>+ Install more in AI Models...</span>
          </span>
        ),
        tag: 'Settings',
      });
      return opts;
    }

    const rawList = CURATED_MODELS[activeBrain] || [];
    const cachedList =
      config.cachedProviderModels?.[activeBrain] ||
      (activeBrain === 'omniroute' || activeBrain === 'omnirouter'
        ? config.cachedProviderModels?.['omniroute'] || config.cachedProviderModels?.['omnirouter']
        : []) ||
      [];

    // 1. Curated list
    rawList.forEach((m) => {
      const displayLabel = m.label.replace(/^openrouter\/|^omniroute\/|^omnirouter\//, '');
      map.set(m.value, {
        value: m.value,
        label: (
          <span className="flex items-center gap-1.5 truncate max-w-[260px] text-[11px]">
            <BrainLogo className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </span>
        ),
        tag: m.tag,
      });
    });

    // 2. All 480+ cached models from provider gateway
    cachedList.forEach((m) => {
      const modelId = typeof m === 'string' ? m : (m as any).value || (m as any).id;
      if (!modelId || map.has(modelId)) return;
      const displayLabel = modelId.replace(/^openrouter\/|^omniroute\/|^omnirouter\//, '');
      let tag = 'Gateway';
      const lower = modelId.toLowerCase();
      if (lower.includes(':free') || lower.includes('free')) tag = 'Free';
      else if (lower.includes('claude')) tag = 'Anthropic';
      else if (lower.includes('gpt') || lower.includes('o1') || lower.includes('o3') || lower.includes('chatgpt')) tag = 'OpenAI';
      else if (lower.includes('deepseek')) tag = 'DeepSeek';
      else if (lower.includes('llama')) tag = 'Meta';
      else if (lower.includes('qwen')) tag = 'Qwen';
      else if (lower.includes('gemini')) tag = 'Google';
      else if (lower.includes('mistral') || lower.includes('codestral')) tag = 'Mistral';
      else if (lower.includes('grok')) tag = 'xAI';
      else if (lower.includes('command') || lower.includes('cohere')) tag = 'Cohere';

      map.set(modelId, {
        value: modelId,
        label: (
          <span className="flex items-center gap-1.5 truncate max-w-[260px] text-[11px]">
            <BrainLogo className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </span>
        ),
        tag,
      });
    });

    // 3. Current active value if not in list
    if (currentModelValue && !map.has(currentModelValue)) {
      const displayLabel = currentModelValue.replace(/^openrouter\/|^omniroute\/|^omnirouter\//, '');
      map.set(currentModelValue, {
        value: currentModelValue,
        label: (
          <span className="flex items-center gap-1.5 truncate max-w-[260px] text-[11px]">
            <BrainLogo className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </span>
        ),
        tag: 'Active',
      });
    }

    const opts: GlideSelectOption[] = Array.from(map.values());

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
  }, [activeBrain, config.cachedProviderModels, currentBrainInfo.Logo, currentModelValue]);

  const renderModelSelector = (placement: 'top' | 'bottom' = 'top', align: 'left' | 'right' = 'left') => {
    const isDark =
      config.dashboardTheme === 'dark' ||
      (typeof document !== 'undefined' &&
        (document.documentElement.classList.contains('dark') ||
          document.body.classList.contains('dark')));

    return (
      <div
        className="flex items-center shrink-0 relative z-30"
        title={`Active Brain: ${currentBrainInfo.name} • Model: ${currentModelValue}`}
      >
        <GlideSelect
          options={modelOptions}
          value={currentModelValue}
          onChange={(val) => handleSelectModel(val)}
          placeholder="Model"
          size="sm"
          radius={8}
          menuWidth={360}
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

  const battleBrainOptions: GlideSelectOption[] = useMemo(() => {
    return BATTLE_BRAIN_OPTIONS.map((opt) => {
      let Logo = GeminiLogo;
      let tag = 'Gemini';
      if (opt.id.startsWith('groq:')) {
        Logo = GroqLogo;
        tag = 'Groq';
      } else if (opt.id.startsWith('ollama:')) {
        Logo = OllamaLogo;
        tag = 'Ollama';
      } else if (opt.id.startsWith('openai:')) {
        Logo = OpenAILogo;
        tag = 'OpenAI';
      } else if (opt.id.startsWith('deepseek:')) {
        Logo = DeepSeekLogo;
        tag = 'DeepSeek';
      }

      return {
        value: opt.id,
        label: (
          <span className="flex items-center gap-1.5 truncate max-w-[170px] text-[11px]">
            <Logo className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{opt.label}</span>
          </span>
        ),
        tag,
      };
    });
  }, []);

  const renderBattleStageBar = (placement: 'top' | 'bottom' = 'top') => {
    const isDark =
      config.dashboardTheme === 'dark' ||
      (typeof document !== 'undefined' &&
        (document.documentElement.classList.contains('dark') ||
          document.body.classList.contains('dark')));

    return (
      <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-1.5 rounded-xl bg-gray-50/80 dark:bg-[#161821]/80 border border-gray-200/60 dark:border-white/[0.08] backdrop-blur-md mb-1.5 transition-all">
        <div className="flex items-center gap-1.5 shrink-0">
          <Swords className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="text-[11px] font-medium tracking-tight text-gray-700 dark:text-gray-300">
            Dual Battle
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Brain A */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sky-500 dark:text-sky-400">
              A:
            </span>
            <GlideSelect
              options={battleBrainOptions}
              value={brainASelection}
              onChange={(val) => setBrainASelection(val)}
              placeholder="Brain A"
              size="sm"
              radius={8}
              menuWidth={240}
              surfaceColor={isDark ? '#1a1c24' : '#f3f4f6'}
              highlightColor={isDark ? '#272a38' : '#e5e7eb'}
              textColor={isDark ? '#f3f4f6' : '#111827'}
              accentColor={isDark ? '#38bdf8' : '#0284c7'}
              placement={placement}
              align="left"
              popDuration={180}
              glideDuration={200}
              ariaLabel="Select Brain A"
            />
          </div>

          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 font-medium px-0.5 select-none shrink-0">
            vs
          </span>

          {/* Brain B */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-purple-500 dark:text-purple-400">
              B:
            </span>
            <GlideSelect
              options={battleBrainOptions}
              value={brainBSelection}
              onChange={(val) => setBrainBSelection(val)}
              placeholder="Brain B"
              size="sm"
              radius={8}
              menuWidth={240}
              surfaceColor={isDark ? '#1a1c24' : '#f3f4f6'}
              highlightColor={isDark ? '#272a38' : '#e5e7eb'}
              textColor={isDark ? '#f3f4f6' : '#111827'}
              accentColor={isDark ? '#c084fc' : '#9333ea'}
              placement={placement}
              align="left"
              popDuration={180}
              glideDuration={200}
              ariaLabel="Select Brain B"
            />
          </div>
        </div>
      </div>
    );
  };

  // Token Usage Tracking
  const usedTokens = useMemo(() => {
    const estimate = (text?: string) => {
      if (!text) return 0;
      return Math.ceil(text.length / 3.8);
    };

    let count = 0;
    for (const m of messages) {
      count += estimate(m.content);
      if (m.dualBattle) {
        count += estimate(m.dualBattle.brainA.reply);
        count += estimate(m.dualBattle.brainB.reply);
        if (m.dualBattle.consensus?.content) {
          count += estimate(m.dualBattle.consensus.content);
        }
      }
    }

    if (inputValue) {
      count += estimate(inputValue);
    }

    for (const mention of stagedMentions) {
      if (mention.size) {
        count += Math.ceil(mention.size / 4);
      } else {
        count += 50;
      }
    }

    return count;
  }, [messages, inputValue, stagedMentions]);

  const activeContextLimit = useMemo(() => {
    if (dualBattleEnabled) {
      const limitA = getModelContextWindow(brainASelection);
      const limitB = getModelContextWindow(brainBSelection);
      return Math.min(limitA, limitB);
    }
    return getModelContextWindow(currentModelValue);
  }, [dualBattleEnabled, brainASelection, brainBSelection, currentModelValue]);

  const renderTokenUsageCircle = () => {
    return null;
  };

  const isSlashMode = inputValue.startsWith('/') && !inputValue.includes(' ') && !slashDismissed;
  const slashQuery = isSlashMode ? inputValue.slice(1).toLowerCase().trim() : '';
  const filteredSlashCommands = isSlashMode
    ? STUDIO_SLASH_COMMANDS.filter(
        (c) => c.name.toLowerCase().includes(slashQuery) || c.desc.toLowerCase().includes(slashQuery)
      )
    : [];

  // Workspace @mention detection
  const lastAtIdx = inputValue.lastIndexOf('@');
  const isMentionMode =
    lastAtIdx !== -1 &&
    (lastAtIdx === 0 || /\s/.test(inputValue[lastAtIdx - 1])) &&
    !mentionDismissed;

  const mentionQuery = isMentionMode
    ? inputValue.slice(lastAtIdx + 1).split(/\s/)[0]
    : '';

  useEffect(() => {
    if (window.jarvisAPI?.getWorkspaceRoot) {
      window.jarvisAPI.getWorkspaceRoot().then((res) => {
        if (res && res.workspaceRoot) {
          setWorkspaceRoot(res.workspaceRoot);
          setWorkspaceFolderName(res.folderName || 'Workspace');
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!isMentionMode) return;
    let isCancelled = false;
    if (window.jarvisAPI?.scanWorkspaceFiles) {
      window.jarvisAPI.scanWorkspaceFiles({ query: mentionQuery, maxResults: 30 }).then((res) => {
        if (!isCancelled && res && res.success) {
          setScannedFiles(res.items || []);
          setTotalWorkspaceMatches(res.totalMatches || 0);
          if (res.workspaceRoot) setWorkspaceRoot(res.workspaceRoot);
          if (res.folderName) setWorkspaceFolderName(res.folderName);
        }
      }).catch(() => {});
    }
    return () => {
      isCancelled = true;
    };
  }, [isMentionMode, mentionQuery]);

  useEffect(() => {
    if (lastAtIdx === -1) {
      setMentionDismissed(false);
      setMentionIndex(0);
    }
  }, [lastAtIdx]);

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
  const inputRef = useRef<HTMLElement | null>(null);

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
  }, [messages, isChatThinking, scrollToBottom]);

  // Big-Scale Image Lightbox Zoom Modal State
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    src: string;
    name: string;
    size?: number;
    path?: string;
    originRect?: { top: number; left: number; width: number; height: number };
    fallbackSrc?: string;
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
    originRect?: { top: number; left: number; width: number; height: number },
    fallbackSrc?: string
  ) => {
    setLightboxState({ isOpen: true, src, name, size, path, originRect, fallbackSrc });
  };

  const closeLightbox = () => {
    setLightboxState((prev) => ({ ...prev, isOpen: false }));
  };

  // Grokki Agent Local Permission Interactive Bridge
  interface ToolPermissionRequestData {
    id: string;
    conversationId?: string;
    tool: string;
    command?: string;
    path?: string;
    actionSummary?: string;
    codeSnippet?: string;
    args?: any;
  }

  const [pendingPermission, setPendingPermission] = useState<ToolPermissionRequestData | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
  const [permissionFeedback, setPermissionFeedback] = useState<string>('');

  useEffect(() => {
    if (!window.jarvisAPI?.onToolPermissionRequest) return;
    const unsub = window.jarvisAPI.onToolPermissionRequest((req) => {
      if (req && (!req.conversationId || req.conversationId === activeConversation.id || req.conversationId === 'default')) {
        setPendingPermission(req);
        setSelectedOptionIndex(0);
        setPermissionFeedback('');
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [activeConversation.id]);

  const [liveStepsByConvo, setLiveStepsByConvo] = useState<Record<string, AgentLiveStep[]>>({});
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());

  const toggleStepExpand = useCallback((stepId: string) => {
    setExpandedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }, []);

  const currentLiveSteps = useMemo(() => {
    return liveStepsByConvo[activeConversation.id] || [];
  }, [liveStepsByConvo, activeConversation.id]);

  useEffect(() => {
    const api = window.jarvisAPI || (window as any).jarvis;
    if (!api?.onAgentStep) return;
    const unsub = api.onAgentStep((step: AgentLiveStep) => {
      const targetId = step.conversationId || activeConversation.id;
      if (step.status === 'idle') {
        setLiveStepsByConvo((prev) => {
          const next = { ...prev };
          delete next[targetId];
          return next;
        });
        return;
      }
      setLiveStepsByConvo((prev) => {
        const list = prev[targetId] ? [...prev[targetId]] : [];
        const idx = list.findIndex((s) => s.id === step.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...step };
        } else {
          list.push(step);
        }
        return { ...prev, [targetId]: list };
      });
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [activeConversation.id]);

  const handlePermissionSubmit = useCallback(() => {
    if (!pendingPermission) return;
    const decisions: Array<'once' | 'conversation' | 'global' | 'reject'> = ['once', 'conversation', 'global', 'reject'];
    const decision = decisions[selectedOptionIndex] || 'once';

    if (window.jarvisAPI?.respondToolPermission) {
      window.jarvisAPI.respondToolPermission({
        id: pendingPermission.id,
        decision,
        feedback: decision === 'reject' ? permissionFeedback : undefined,
      });
    }
    setPendingPermission(null);
    setPermissionFeedback('');
    setSelectedOptionIndex(0);
  }, [pendingPermission, selectedOptionIndex, permissionFeedback]);

  const handlePermissionSkip = useCallback(() => {
    if (!pendingPermission) return;
    if (window.jarvisAPI?.respondToolPermission) {
      window.jarvisAPI.respondToolPermission({
        id: pendingPermission.id,
        decision: 'skip',
      });
    }
    setPendingPermission(null);
    setPermissionFeedback('');
    setSelectedOptionIndex(0);
  }, [pendingPermission]);

  useEffect(() => {
    if (!pendingPermission) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      if (!isInput) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedOptionIndex((prev) => (prev <= 0 ? 3 : prev - 1));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedOptionIndex((prev) => (prev >= 3 ? 0 : prev + 1));
        } else if (e.key === '1') {
          e.preventDefault();
          setSelectedOptionIndex(0);
        } else if (e.key === '2') {
          e.preventDefault();
          setSelectedOptionIndex(1);
        } else if (e.key === '3') {
          e.preventDefault();
          setSelectedOptionIndex(2);
        } else if (e.key === '4') {
          e.preventDefault();
          setSelectedOptionIndex(3);
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handlePermissionSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handlePermissionSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingPermission, handlePermissionSubmit, handlePermissionSkip]);

  const renderHighlightedCommand = (code: string) => {
    if (!code) return null;
    const tokens = code.match(/("[^"]*"|'[^']*'|-[A-Za-z0-9_]+|\b\d+\b|[^\s"'-]+|\s+)/g) || [code];
    let isFirstWord = true;

    return tokens.map((token, idx) => {
      if (token.startsWith('"') || token.startsWith("'")) {
        return <span key={idx} className="text-[#98c379]">{token}</span>;
      }
      if (token.startsWith('-')) {
        return <span key={idx} className="text-[#56b6c2]">{token}</span>;
      }
      if (/^\d+$/.test(token)) {
        return <span key={idx} className="text-[#d19a66]">{token}</span>;
      }
      if (/^\s+$/.test(token)) {
        return token;
      }
      if (isFirstWord) {
        isFirstWord = false;
        return <span key={idx} className="text-[#e5c07b] font-semibold">{token}</span>;
      }
      return <span key={idx} className="text-gray-200">{token}</span>;
    });
  };

  const renderPermissionCard = () => {
    if (!pendingPermission || !agentMode) return null;

    const rawAction = pendingPermission.command || pendingPermission.codeSnippet || pendingPermission.path || pendingPermission.actionSummary || 'this action';
    const summaryTitle = pendingPermission.actionSummary || (pendingPermission.command ? `search or run: ${pendingPermission.command.slice(0, 45)}` : 'action');

    const options = [
      { id: 'once', label: 'Yes, allow this time' },
      { id: 'conversation', label: `Yes, and always allow '${rawAction}' in this conversation` },
      { id: 'global', label: `Yes, and always allow '${rawAction}'` },
      { id: 'reject', label: 'No (tell the agent what to do instead)' },
    ];

    const displayCode = pendingPermission.codeSnippet || pendingPermission.command || pendingPermission.path || '';

    return (
      <div className="w-full mb-2.5 rounded-2xl bg-[#0e1017]/98 border border-white/[0.08] p-3 shadow-2xl backdrop-blur-2xl text-left select-none animate-in fade-in duration-150">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex items-center justify-center w-4 h-4 text-gray-400 shrink-0">
            <svg className="w-3.5 h-3.5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-[#0e1017]" />
          </div>
          <span className="text-[13px] font-semibold text-white tracking-tight">
            Allow {summaryTitle}?
          </span>
        </div>

        {displayCode && (
          <div className="bg-[#07080b]/80 backdrop-blur-md border border-white/[0.06] rounded-lg px-3 py-1.5 font-mono text-[11.5px] leading-relaxed max-h-24 overflow-y-auto mb-2 select-text shadow-inner">
            {renderHighlightedCommand(displayCode)}
          </div>
        )}

        <div className="flex flex-col gap-1 mb-2">
          {options.map((opt, idx) => {
            const isSelected = selectedOptionIndex === idx;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOptionIndex(idx)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-white/[0.08] border-white/10 text-white'
                    : 'bg-transparent border-transparent text-gray-300 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <span className={`w-4.5 h-4.5 rounded flex items-center justify-center text-[10.5px] font-mono font-semibold shrink-0 transition-colors ${
                  isSelected ? 'bg-white/15 text-white' : 'bg-white/[0.05] text-gray-400'
                }`}>
                  {idx + 1}
                </span>
                <span className="text-[11.5px] leading-snug break-words flex-1 font-normal">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {selectedOptionIndex === 3 && (
          <div className="mb-2">
            <input
              type="text"
              placeholder="Tell the agent what to do instead (optional)..."
              value={permissionFeedback}
              onChange={(e) => setPermissionFeedback(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06]">
          <button
            type="button"
            title="Dictate with voice"
            onClick={() => {
              if (!isRecording) startVoiceRecording();
            }}
            className="p-1 text-gray-400 hover:text-white rounded-md transition-colors cursor-pointer bg-transparent border-none"
          >
            <Mic className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePermissionSkip}
              className="px-2.5 py-1 text-[11.5px] font-medium text-gray-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handlePermissionSubmit}
              className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11.5px] font-medium rounded-full flex items-center gap-1.5 shadow-xs active:scale-[0.98] transition-all cursor-pointer border-none"
            >
              <span>Submit</span>
              <svg className="w-3.5 h-3.5 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 10 4 15 9 20" />
                <path d="M20 4v7a4 4 0 0 1-4 4H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
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

  const stageFile = async (file: File) => {
    if (!file) return;
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop()!.toLowerCase() : '';
    let localPath = '';
    if (window.jarvisAPI?.getPathForFile) {
      try {
        localPath = window.jarvisAPI.getPathForFile(file) || '';
      } catch (_) {}
    }
    if (!localPath && (file as any).path) {
      localPath = (file as any).path;
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

  const handleNativeFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await stageFile(file);
  };

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFile(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await stageFile(files[0]);
    }
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

  const handleSelectMention = (item: WorkspaceMention | 'select_folder') => {
    if (item === 'select_folder') {
      handleSelectWorkspaceFolder();
      return;
    }

    const prefix = inputValue.slice(0, lastAtIdx);
    const suffix = inputValue.slice(lastAtIdx + 1 + mentionQuery.length);
    setInputValue(`${prefix}@${item.name} ${suffix}`.trimStart());
    setStagedMentions((prev) =>
      prev.some((m) => m.path === item.path) ? prev : [...prev, item]
    );
    setMentionDismissed(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  const handleSelectWorkspaceFolder = async () => {
    if (!window.jarvisAPI?.selectWorkspaceFolder) return;
    try {
      const res = await window.jarvisAPI.selectWorkspaceFolder();
      if (res && res.success && res.workspaceRoot) {
        setWorkspaceRoot(res.workspaceRoot);
        setWorkspaceFolderName(res.folderName || 'Workspace');
        const prefix = inputValue.slice(0, lastAtIdx);
        setInputValue(prefix.trimEnd());
        setMentionDismissed(true);
        if (window.jarvisAPI.scanWorkspaceFiles) {
          const scan = await window.jarvisAPI.scanWorkspaceFiles({ query: '', maxResults: 30 });
          if (scan.success) {
            setScannedFiles(scan.items || []);
            setTotalWorkspaceMatches(scan.totalMatches || 0);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to switch workspace folder:', e);
    }
  };

  const cancelledConvosRef = useRef<Set<string>>(new Set());

  const handleStopGeneration = useCallback(() => {
    const targetId = activeConversation.id;
    cancelledConvosRef.current.add(targetId);
    onSetConvoThinking?.(targetId, false);
    setLiveStepsByConvo((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });

    // If a tool permission review card is active, immediately reject it, dismiss the card, and terminate
    if (pendingPermission) {
      try {
        if (window.jarvisAPI?.respondToolPermission) {
          window.jarvisAPI.respondToolPermission({
            id: pendingPermission.id,
            decision: 'reject',
            feedback: 'Terminated by user',
          });
        }
      } catch (e) {
        console.warn('Failed to respond permission on cancel:', e);
      }
      setPendingPermission(null);
      setPermissionFeedback('');
      setSelectedOptionIndex(0);
    }

    try {
      if (window.jarvisAPI?.cancelTask) {
        window.jarvisAPI.cancelTask(targetId);
      }
      if (window.jarvisAPI?.cancelBrowserAgent) {
        window.jarvisAPI.cancelBrowserAgent();
      }
      if (window.jarvisAPI?.cancelUiTars) {
        window.jarvisAPI.cancelUiTars();
      }
    } catch (e) {
      console.warn('Failed to invoke cancel:', e);
    }
    setLoading(false);
    const cancelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '🛑 *Cancelled. Interrupted by the user.*',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAnimated: false,
    };
    if (onUpdateConvoMessages) {
      onUpdateConvoMessages(targetId, (prev) => [...prev, cancelMsg]);
    } else {
      onUpdateMessages((prev) => [...prev, cancelMsg]);
    }
  }, [activeConversation.id, onSetConvoThinking, onUpdateConvoMessages, onUpdateMessages, pendingPermission]);

  const handleSendMessage = async (textToSend?: string) => {
    if (isRecording) {
      stopVoiceRecording();
    }
    let text = (textToSend || inputValue).trim();
    if (!text && !attachedFile) return;

    if (agentMode && !agentRoot) {
      onSelectWorkspaceFolder?.();
      return;
    }

    const targetConvoId = activeConversation.id;
    setLiveStepsByConvo((prev) => {
      const next = { ...prev };
      delete next[targetConvoId];
      return next;
    });
    const updateTargetMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      if (onUpdateConvoMessages) {
        onUpdateConvoMessages(targetConvoId, updater);
      } else {
        onUpdateMessages(updater);
      }
    };

    const currentAttachment = attachedFile;
    const isVideo = isVideoAttachment(currentAttachment);

    if (!text && currentAttachment) {
      text = isVideo
        ? `Attached video: ${currentAttachment.name}`
        : `Analyze and summarize this file: ${currentAttachment.name}`;
    }

    const currentMentions = [...stagedMentions];
    if (text.includes('@')) {
      const inlineMatches = text.match(/@([a-zA-Z0-9_.\-/\\]+)/g) || [];
      for (const rawToken of inlineMatches) {
        const cleanToken = rawToken.slice(1).replace(/[.,;:!?)]+$/, '');
        if (!cleanToken) continue;
        if (cleanToken.toLowerCase() === 'workspace' || cleanToken.toLowerCase() === 'codebase') {
          if (!currentMentions.some((m) => m.path === '@workspace')) {
            currentMentions.push({ name: 'workspace', path: '@workspace', type: 'workspace' });
          }
          continue;
        }
        const matchedScan = scannedFiles.find(
          (f) =>
            f.name.toLowerCase() === cleanToken.toLowerCase() ||
            f.path.toLowerCase() === cleanToken.toLowerCase()
        );
        if (matchedScan && !currentMentions.some((m) => m.path === matchedScan.path)) {
          currentMentions.push(matchedScan);
        } else if (!currentMentions.some((m) => m.name.toLowerCase() === cleanToken.toLowerCase() || m.path.toLowerCase() === cleanToken.toLowerCase())) {
          currentMentions.push({
            name: cleanToken.split(/[/\\]/).pop() || cleanToken,
            path: cleanToken,
            type: 'file',
          });
        }
      }
    }
    if (activeBrain === 'ollama') {
      const ollamaModels = (config.cachedProviderModels?.ollama || []).filter(Boolean);
      if (ollamaModels.length === 0) {
        const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          attachedFile: currentAttachment || undefined,
          mentions: currentMentions.length > 0 ? currentMentions : undefined,
        };
        const noModelMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ **No Ollama models are installed on your PC yet.**\n\nTo chat with Ollama offline, please download a local model:\n1. Open **Settings** (or press `Ctrl+,`) and select **AI Models**.\n2. Scroll to the **Ollama** section to install top models like **Llama 3.2**, **DeepSeek R1**, or **Qwen 2.5 Coder** with one click.\n\n*Alternatively, you can switch to Gemini or Groq from the brain switcher above.*',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        updateTargetMessages((prev) => [...prev, userMsg, noModelMsg]);
        setInputValue('');
        setAttachedFile(null);
        setStagedMentions([]);
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFile: currentAttachment || undefined,
      mentions: currentMentions.length > 0 ? currentMentions : undefined,
    };

    updateTargetMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setAttachedFile(null);
    setStagedMentions([]);
    setSlashDismissed(false);
    setMentionDismissed(false);
    onSetConvoThinking?.(targetConvoId, true);
    setLoading(true);
    cancelledConvosRef.current.delete(targetConvoId);

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
        updateTargetMessages((prev) => [...prev, videoGuardMsg]);
        onSetConvoThinking?.(targetConvoId, false);
        setLoading(false);
        return;
      }

      // Phase 4: Multi-Brain Dual-Battle Execution
      if (dualBattleEnabled && window.jarvisAPI?.executeDualAI) {
        const [providerA, ...modelAParts] = brainASelection.split(':');
        const [providerB, ...modelBParts] = brainBSelection.split(':');
        const modelA = modelAParts.join(':');
        const modelB = modelBParts.join(':');

        const context: any = {
          conversationId: targetConvoId,
          conversationTitle: activeConversation.title,
        };
        if (currentAttachment) {
          context.filePath = currentAttachment.path;
          context.attachedFile = currentAttachment;
        }
        if (currentMentions.length > 0) {
          context.projectMentions = currentMentions;
        }
        if (webSearchEnabled) {
          context.webSearch = true;
          context.webSearchEnabled = true;
        }

        const dualRes = await window.jarvisAPI.executeDualAI(
          text,
          { provider: providerA, model: modelA },
          { provider: providerB, model: modelB },
          context
        );

        if (cancelledConvosRef.current.has(targetConvoId)) return;

        const dualMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `**Dual-Battle**: ${modelA || providerA} vs ${modelB || providerB}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dualBattle: {
            brainA: dualRes.brainA,
            brainB: dualRes.brainB,
          },
        };

        updateTargetMessages((prev) => [...prev, dualMsg]);
        onSetConvoThinking?.(targetConvoId, false);
        setLoading(false);
        return;
      }

      if (window.jarvisAPI?.executeAI) {
        const context: any = {
          conversationId: targetConvoId,
          conversationTitle: activeConversation.title,
        };
        if (currentAttachment) {
          context.filePath = currentAttachment.path;
          context.attachedFile = currentAttachment;
        }
        if (currentMentions.length > 0) {
          context.projectMentions = currentMentions;
        }
        if (webSearchEnabled) {
          context.webSearch = true;
          context.webSearchEnabled = true;
        }
        context.conversationHistory = Array.isArray(messages)
          ? messages.slice(-16).map((m) => ({
              role: m.role,
              content: m.content,
              attachedFile: m.attachedFile,
              mentions: m.mentions,
              actionsExecuted: m.actionsExecuted,
            }))
          : [];
        applyAgentContext(context);
        if (onUpdateConversationMeta) {
          if (agentMode) {
            onUpdateConversationMeta(targetConvoId, {
              mode: 'agent',
              workspaceRoot: agentRoot,
              workspaceName: agentRootName,
              effort: selectedEffort,
              permission: selectedPermission,
            });
          } else {
            onUpdateConversationMeta(targetConvoId, {
              mode: 'chat',
            });
          }
        }
        const res = await window.jarvisAPI.executeAI(text, context);
        if (cancelledConvosRef.current.has(targetConvoId)) return;
        let replyContent = res.reply || res.message;
        if (res.cancelled || replyContent === 'Cancelled.') {
          if (!cancelledConvosRef.current.has(targetConvoId)) {
            replyContent = '⚠️ **The provider request timed out or was interrupted.** Please try sending again, or switch to Groq or Gemini in the brain switcher for faster responses.';
          } else {
            return;
          }
        }
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
        updateTargetMessages((prev) => [...prev, assistantMsg]);
      } else {
        setTimeout(() => {
          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I received your command: **"${text}"**${currentAttachment ? ` with attachment \`${currentAttachment.name}\`` : ''}.\n\nGrokki Studio is connected and ready to automate Windows, manage your workspace, and synthesize voices.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isAnimated: true,
          };
          updateTargetMessages((prev) => [...prev, assistantMsg]);
          onSetConvoThinking?.(targetConvoId, false);
          setLoading(false);
        }, 500);
        return;
      }
    } catch (err: any) {
      if (cancelledConvosRef.current.has(targetConvoId)) return;
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Execution Error**: ${err.message || 'Failed to communicate with Agent Brain.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAnimated: true,
      };
      updateTargetMessages((prev) => [...prev, errorMsg]);
    } finally {
      onSetConvoThinking?.(targetConvoId, false);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (isChatThinking && e.key === 'Escape') {
      e.preventDefault();
      handleStopGeneration();
      return;
    }
    if (isMentionMode && scannedFiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % scannedFiles.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + scannedFiles.length) % scannedFiles.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const selected = scannedFiles[mentionIndex] || scannedFiles[0];
        if (selected) {
          handleSelectMention(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionDismissed(true);
        return;
      }
    }

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
        if (agentMode && !agentRoot) {
          onSelectWorkspaceFolder?.();
          return;
        }
        handleSendMessage();
      } else if (!sendOnEnter && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (agentMode && !agentRoot) {
          onSelectWorkspaceFolder?.();
          return;
        }
        handleSendMessage();
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleSaveEditedMessage = async (targetMsgId: string) => {
    const trimmed = editingContent.trim();
    if (!trimmed) return;

    const msgIndex = messages.findIndex((m) => m.id === targetMsgId);
    if (msgIndex === -1) return;

    const oldMsg = messages[msgIndex];
    // Remove the old user message and any subsequent messages from the conversation history
    const historyBefore = messages.slice(0, msgIndex);

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFile: oldMsg.attachedFile,
      mentions: oldMsg.mentions,
    };

    const targetConvoId = activeConversation.id;
    setLiveStepsByConvo((prev) => {
      const next = { ...prev };
      delete next[targetConvoId];
      return next;
    });
    const updateTargetMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      if (onUpdateConvoMessages) {
        onUpdateConvoMessages(targetConvoId, updater);
      } else {
        onUpdateMessages(updater);
      }
    };

    updateTargetMessages(() => [...historyBefore, newUserMsg]);
    setEditingMessageId(null);
    setEditingContent('');
    onSetConvoThinking?.(targetConvoId, true);
    setLoading(true);
    cancelledConvosRef.current.delete(targetConvoId);

    try {
      if (dualBattleEnabled && window.jarvisAPI?.executeDualAI) {
        const [providerA, ...modelAParts] = brainASelection.split(':');
        const [providerB, ...modelBParts] = brainBSelection.split(':');
        const modelA = modelAParts.join(':');
        const modelB = modelBParts.join(':');

        const context: any = {};
        if (oldMsg.attachedFile) {
          context.filePath = oldMsg.attachedFile.path;
          context.attachedFile = oldMsg.attachedFile;
        }
        if (oldMsg.mentions && oldMsg.mentions.length > 0) {
          context.projectMentions = oldMsg.mentions;
        }
        if (webSearchEnabled) {
          context.webSearch = true;
          context.webSearchEnabled = true;
        }

        const dualRes = await window.jarvisAPI.executeDualAI(
          trimmed,
          { provider: providerA, model: modelA },
          { provider: providerB, model: modelB },
          { ...context, conversationId: targetConvoId }
        );

        if (cancelledConvosRef.current.has(targetConvoId)) return;

        const dualMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `**Dual-Battle**: ${modelA || providerA} vs ${modelB || providerB}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dualBattle: {
            brainA: dualRes.brainA,
            brainB: dualRes.brainB,
          },
        };

        updateTargetMessages((prev) => [...prev, dualMsg]);
        onSetConvoThinking?.(targetConvoId, false);
        setLoading(false);
        return;
      }

      if (window.jarvisAPI?.executeAI) {
        const context: any = {
          conversationId: targetConvoId,
          conversationTitle: activeConversation.title,
        };
        if (oldMsg.attachedFile) {
          context.filePath = oldMsg.attachedFile.path;
          context.attachedFile = oldMsg.attachedFile;
        }
        if (oldMsg.mentions && oldMsg.mentions.length > 0) {
          context.projectMentions = oldMsg.mentions;
        }
        if (webSearchEnabled) {
          context.webSearch = true;
          context.webSearchEnabled = true;
        }
        context.conversationHistory = Array.isArray(historyBefore)
          ? historyBefore.slice(-16).map((m) => ({
              role: m.role,
              content: m.content,
              attachedFile: m.attachedFile,
              mentions: m.mentions,
              actionsExecuted: m.actionsExecuted,
            }))
          : [];

        applyAgentContext(context);
        if (onUpdateConversationMeta) {
          if (agentMode) {
            onUpdateConversationMeta(targetConvoId, {
              mode: 'agent',
              workspaceRoot: agentRoot,
              workspaceName: agentRootName,
              effort: selectedEffort,
              permission: selectedPermission,
            });
          } else {
            onUpdateConversationMeta(targetConvoId, {
              mode: 'chat',
            });
          }
        }

        const res = await window.jarvisAPI.executeAI(trimmed, context);
        if (cancelledConvosRef.current.has(targetConvoId)) return;
        let replyContent = res.reply || res.message;
        if (!replyContent) {
          if (res.error) {
            replyContent = `⚠️ **Could not generate response**: ${res.error}\n\nTip: You can switch model/provider in the dropdown below or check API keys in **AI Brain**.`;
          } else {
            replyContent = 'I processed your request, but received an empty response. Please try again.';
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
        updateTargetMessages((prev) => [...prev, assistantMsg]);
        onSetConvoThinking?.(targetConvoId, false);
        setLoading(false);
      } else {
        setTimeout(() => {
          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I received your command: **"${trimmed}"**.\n\nGrokki Studio is connected and ready.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isAnimated: true,
          };
          updateTargetMessages((prev) => [...prev, assistantMsg]);
          onSetConvoThinking?.(targetConvoId, false);
          setLoading(false);
        }, 500);
      }
    } catch (err: any) {
      if (cancelledConvosRef.current.has(targetConvoId)) return;
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Edit Re-query Error**: ${err.message || 'Failed to update response.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAnimated: true,
      };
      updateTargetMessages((prev) => [...prev, errorMsg]);
    } finally {
      onSetConvoThinking?.(targetConvoId, false);
      setLoading(false);
    }
  };

  const handleOpenRevertModal = (msg: ChatMessage) => {
    const msgIndex = messages.findIndex((m) => m.id === msg.id);
    if (msgIndex === -1) return;

    const subsequentMessages = messages.slice(msgIndex + 1);
    const fileMap = new Map<string, {
      path: string;
      fileName: string;
      relativePath: string;
      addedLines: number;
      removedLines: number;
      isNew: boolean;
      diff?: string;
      backup?: {
        path: string;
        originalContent?: string | null;
        existedBefore?: boolean;
        relativePath?: string;
      };
    }>();

    for (const sm of subsequentMessages) {
      if (Array.isArray(sm.actionsExecuted)) {
        for (const act of sm.actionsExecuted) {
          const name = act.name || act.tool || '';
          if (name === 'edit_file' || name === 'write_file') {
            const p = act.result?.backup?.path || act.args?.path || act.args?.filePath;
            if (!p) continue;
            const normalizedPath = p.replace(/\\/g, '/').toLowerCase();
            const fileName = getBaseFileName(p);
            const relativePath = act.result?.backup?.relativePath || fileName;
            const isNew = act.result?.backup
              ? act.result.backup.existedBefore === false
              : (name === 'write_file' && act.result?.action === 'written');
            const added = Number(act.result?.addedLines) || 0;
            const removed = Number(act.result?.removedLines) || 0;
            const diff = act.result?.diff || '';

            if (fileMap.has(normalizedPath)) {
              const existing = fileMap.get(normalizedPath)!;
              existing.addedLines += added;
              existing.removedLines += removed;
              if (diff) {
                existing.diff = (existing.diff ? existing.diff + '\n' : '') + diff;
              }
              // Preserve earliest backup original content
              if (!existing.backup?.originalContent && act.result?.backup?.originalContent) {
                existing.backup.originalContent = act.result.backup.originalContent;
              }
            } else {
              fileMap.set(normalizedPath, {
                path: p,
                fileName,
                relativePath,
                addedLines: added,
                removedLines: removed,
                isNew,
                diff,
                backup: act.result?.backup ? { ...act.result.backup } : {
                  path: p,
                  originalContent: null,
                  existedBefore: !isNew,
                  relativePath,
                },
              });
            }
          }
        }
      }
    }

    setRevertModalTarget(msg);
    setRevertFiles(Array.from(fileMap.values()));
    setRevertFileChangesChecked(true);
    setViewingDiffFile(null);
  };

  const handleConfirmRevert = async () => {
    if (!revertModalTarget) return;
    const targetMsg = revertModalTarget;
    const msgIndex = messages.findIndex((m) => m.id === targetMsg.id);
    if (msgIndex === -1) {
      setRevertModalTarget(null);
      return;
    }

    // 1. If revertFileChangesChecked is true and backups exist, restore files on disk
    if (revertFileChangesChecked && revertFiles.length > 0) {
      const effectiveRoot = activeConversation.workspaceRoot || activeWorkspaceRoot || workspaceRoot || '';
      const backups = revertFiles
        .map((f) => ({
          path: f.backup?.path || f.path,
          relativePath: f.backup?.relativePath || f.relativePath,
          originalContent: f.backup?.originalContent ?? null,
          existedBefore: f.backup?.existedBefore ?? !f.isNew,
          diff: f.diff,
        }))
        .filter((b) => Boolean(b && b.path));

      if (backups.length > 0 && window.jarvisAPI?.revertFileChanges) {
        try {
          await window.jarvisAPI.revertFileChanges({
            backups,
            workspaceRoot: effectiveRoot,
          });
        } catch (err) {
          console.error('[Revert] Failed to revert file changes on disk:', err);
        }
      }
    }

    // 2. Remove that message and any subsequent messages from the conversation history
    const historyBefore = messages.slice(0, msgIndex);
    const targetConvoId = activeConversation.id;

    // Cancel active agent task for this conversation
    if (window.jarvisAPI?.cancelTask) {
      window.jarvisAPI.cancelTask(targetConvoId).catch(() => {});
    }
    cancelledConvosRef.current.add(targetConvoId);
    setLiveStepsByConvo((prev) => {
      const next = { ...prev };
      delete next[targetConvoId];
      return next;
    });
    onSetConvoThinking?.(targetConvoId, false);
    setLoading(false);

    if (onUpdateConvoMessages) {
      onUpdateConvoMessages(targetConvoId, () => historyBefore);
    } else {
      onUpdateMessages(() => historyBefore);
    }

    // 3. Put that user message with the image/attachment into the input itself
    const oldContent = targetMsg.content || '';
    setInputValue(oldContent);

    if (targetMsg.attachedFile) {
      if (typeof targetMsg.attachedFile === 'string') {
        const p = targetMsg.attachedFile;
        const fName = getBaseFileName(p);
        const ext = (p.split('.').pop() || '').toLowerCase();
        const isImg = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext);
        const previewUrl = isImg
          ? (p.startsWith('data:') || p.startsWith('http') || p.startsWith('blob:') || p.startsWith('file:')
              ? p
              : `file:///${p.replace(/\\/g, '/')}`)
          : undefined;
        setAttachedFile({
          path: p,
          name: fName,
          ext: '.' + ext,
          category: isImg ? 'photo' : 'document',
          previewUrl,
        });
      } else {
        const att = { ...targetMsg.attachedFile };
        if (isImageAttachment(att) && att.path && !att.previewUrl) {
          att.previewUrl = att.path.startsWith('file:') || att.path.startsWith('http') || att.path.startsWith('data:')
            ? att.path
            : `file:///${att.path.replace(/\\/g, '/')}`;
        }
        setAttachedFile(att);
      }
    } else {
      setAttachedFile(null);
    }

    if (Array.isArray(targetMsg.mentions)) {
      setStagedMentions(targetMsg.mentions);
    } else {
      setStagedMentions([]);
    }

    // Direct DOM sync to ensure contenteditable receives value across mounting/docking view transitions
    const syncInputDom = () => {
      if (inputRef.current) {
        inputRef.current.innerText = oldContent;
        inputRef.current.focus();
        try {
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(inputRef.current);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch (_) {}
      }
    };

    syncInputDom();
    setTimeout(syncInputDom, 30);
    setTimeout(syncInputDom, 100);
    setTimeout(syncInputDom, 250);

    // 4. Close modal
    setRevertModalTarget(null);
    setRevertFiles([]);
    setViewingDiffFile(null);
  };

  useEffect(() => {
    if (!revertModalTarget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRevertModalTarget(null);
      } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleConfirmRevert();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revertModalTarget, revertFileChangesChecked, revertFiles, messages, activeConversation.id]);

  const handleSynthesizeConsensus = async (msgId: string) => {
    const msgIndex = messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;
    const targetMsg = messages[msgIndex];
    if (!targetMsg || !targetMsg.dualBattle || !window.jarvisAPI?.synthesizeConsensus) return;

    const prevMsg = messages.slice(0, msgIndex).reverse().find((m) => m.role === 'user');
    const userPrompt = prevMsg?.content || 'User Prompt';

    setSynthesizingId(msgId);
    try {
      const res = await window.jarvisAPI.synthesizeConsensus(
        userPrompt,
        targetMsg.dualBattle.brainA.reply,
        targetMsg.dualBattle.brainB.reply,
        targetMsg.dualBattle.brainA.model,
        targetMsg.dualBattle.brainB.model
      );

      if (res && res.consensus) {
        onUpdateMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId && m.dualBattle) {
              return {
                ...m,
                dualBattle: {
                  ...m.dualBattle,
                  consensus: {
                    content: res.consensus,
                  },
                },
              };
            }
            return m;
          })
        );
      }
    } catch (err) {
      console.error('[DualBattle] Consensus error:', err);
    } finally {
      setSynthesizingId(null);
    }
  };

  const handlePickWinner = (msgId: string, winnerKey: 'brainA' | 'brainB') => {
    onUpdateMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.dualBattle) {
          const winnerData = winnerKey === 'brainA' ? m.dualBattle.brainA : m.dualBattle.brainB;
          return {
            ...m,
            dualBattle: {
              ...m.dualBattle,
              consensus: {
                content: `### 🏆 Selected Winner: ${winnerData.model}\n\n${winnerData.reply}`,
                winner: winnerData.model,
              },
            },
          };
        }
        return m;
      })
    );
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
      const cleanText = text.replace(/[*#`_~\[\]]/g, '').trim().slice(0, 500);
      const isElevenLabs = config.ttsProvider === 'elevenlabs';
      const elKey = (config.elevenlabsApiKey || '').trim();

      // Direct ElevenLabs v3 / Flash synthesis in ChatTab so it always works immediately
      if (isElevenLabs && elKey && cleanText) {
        const rawVoiceId = String(config.elevenlabsVoiceId || 'JBFqnCBsd6RMkjVDRZzb').split('__')[0];
        const targetVoice =
          rawVoiceId &&
          !rawVoiceId.startsWith('af_') &&
          !rawVoiceId.startsWith('am_') &&
          !rawVoiceId.startsWith('bf_') &&
          !rawVoiceId.startsWith('bm_')
            ? rawVoiceId
            : 'JBFqnCBsd6RMkjVDRZzb';
        const prefModel = config.elevenlabsModel || 'eleven_v3';
        const modelsToTry =
          prefModel === 'eleven_v3'
            ? ['eleven_v3', 'eleven_flash_v2_5', 'eleven_multilingual_v2']
            : [prefModel, 'eleven_flash_v2_5'];

        for (const m of modelsToTry) {
          try {
            const q = m === 'eleven_v3' ? 'output_format=mp3_44100_128' : 'optimize_streaming_latency=3&output_format=mp3_44100_128';
            const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(targetVoice)}?${q}`, {
              method: 'POST',
              headers: {
                'xi-api-key': elKey,
                'Content-Type': 'application/json',
                Accept: 'audio/mpeg',
              },
              body: JSON.stringify({
                text: cleanText,
                model_id: m,
                voice_settings: { stability: 0.5, similarity_boost: 0.78, style: 0.15, use_speaker_boost: true },
              }),
            });
            if (r.ok) {
              const blob = await r.blob();
              const blobUrl = URL.createObjectURL(blob);
              const audio = new Audio(blobUrl);
              audioRef.current = audio;
              audio.onended = () => {
                URL.revokeObjectURL(blobUrl);
                setSpeakingId(null);
                audioRef.current = null;
              };
              audio.onerror = () => {
                URL.revokeObjectURL(blobUrl);
                setSpeakingId(null);
                audioRef.current = null;
              };
              await audio.play();
              return;
            }
            if (r.status === 401) break;
          } catch (e) {}
        }
      }

      if (window.jarvisAPI?.speakText) {
        const voiceToUse = isElevenLabs
          ? (config.elevenlabsVoiceId || 'JBFqnCBsd6RMkjVDRZzb')
          : (config.ttsVoice || 'af_bella');
        const res = await window.jarvisAPI.speakText(cleanText, voiceToUse, {
          provider: isElevenLabs ? 'elevenlabs' : 'grokki',
          apiKey: config.elevenlabsApiKey,
          model: config.elevenlabsModel || 'eleven_v3',
        });
        if (res && res.success && res.base64Audio) {
          const mime = res.mimeType || 'audio/wav';
          const audio = new Audio(`data:${mime};base64,${res.base64Audio}`);
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
      icon: Activity,
      badge: '/status',
    },
    {
      title: 'System Storage & Cleanup',
      desc: 'Clear temporary cache and check drive free space.',
      prompt: '/clean',
      icon: Trash2,
      badge: '/clean',
    },
    {
      title: 'Google Calendar & Agenda',
      desc: "Retrieve today's schedule and pending deadlines.",
      prompt: 'What meetings and events do I have on Google Calendar today?',
      icon: Calendar,
      badge: 'Agenda',
    },
    {
      title: 'Clean Fullscreen Screenshot',
      desc: 'Capture screen directly to Desktop and Clipboard.',
      prompt: '/screenshot',
      icon: Camera,
      badge: '/screenshot',
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

  const renderMentionMenu = (placement: 'top' | 'bottom' = 'bottom') => {
    if (!isMentionMode) return null;
    return (
      <WorkspaceMentionMenu
        items={scannedFiles}
        selectedIndex={mentionIndex}
        workspaceRoot={workspaceRoot}
        folderName={workspaceFolderName}
        totalMatches={totalWorkspaceMatches}
        placement={placement}
        onSelect={handleSelectMention}
        onSelectFolder={handleSelectWorkspaceFolder}
        onHoverIndex={setMentionIndex}
      />
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

  // Render clean monochrome attachment popover menu (Zero color, zero decorative dots, zero glow/shadow)
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
        icon: (
          <svg className="w-4 h-4 text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M10 13h4" />
            <path d="M10 17h4" />
          </svg>
        ),
        accept: '.pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.pptx,.json,.py,.js,.ts,.tsx,.jsx,.c,.cpp,.java,.html,.css,.sql,.xml,.yaml,.yml',
      },
      {
        id: 'photo',
        label: 'Photos',
        icon: (
          <svg className="w-4 h-4 text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="14" height="14" rx="2" />
            <path d="M7 7h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2" />
          </svg>
        ),
        accept: 'image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp',
      },
      {
        id: 'video',
        label: 'Videos',
        badge: 'Send / Drive',
        icon: (
          <svg className="w-4 h-4 text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <polygon points="10 9 15 12 10 15 10 9" fill="currentColor" stroke="none" />
          </svg>
        ),
        accept: 'video/*,.mp4,.mkv,.mov,.webm,.avi,.m4v',
      },
      {
        id: 'camera',
        label: 'Camera',
        badge: hotkeys.openCamera || 'Ctrl+Shift+C',
        icon: (
          <svg className="w-4 h-4 text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        ),
        accept: '',
      },
      {
        id: 'audio',
        label: 'Audio',
        icon: (
          <svg className="w-4 h-4 text-gray-500 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M4 10v4" />
            <path d="M8 7v10" />
            <path d="M12 4v16" />
            <path d="M14 7v10" />
            <path d="M18 10v4" />
          </svg>
        ),
        accept: 'audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm',
      },
    ];

    const isTop = placement === 'top';
    const visibleItems = agentMode
      ? items.filter((item) => item.id !== 'video' && item.id !== 'audio')
      : items;

    return (
      <AnimatePresence>
        {attachMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: isTop ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: isTop ? 4 : -4 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ transformOrigin: isTop ? 'bottom left' : 'top left' }}
            className={`absolute left-0 ${
              isTop ? 'bottom-full mb-2.5' : 'top-full mt-2.5'
            } w-52 bg-white dark:bg-[#141417] border border-gray-200 dark:border-white/[0.08] rounded-xl p-1.5 z-50 select-none shadow-xl shadow-black/10 dark:shadow-2xl`}
          >
            <div className="flex flex-col gap-0.5">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePickCategory(item.id, item.accept)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer border-none bg-transparent text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-[13px] font-medium text-gray-700 dark:text-zinc-300 group-hover:text-gray-950 dark:group-hover:text-white transition-colors">
                      {item.label}
                    </span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-mono text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-400 transition-colors">
                      {item.badge}
                    </span>
                  )}
                </button>
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

  const renderRevertModal = () => {
    if (!revertModalTarget) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        onClick={() => setRevertModalTarget(null)}
      >
        <div
          className="relative w-full max-w-[480px] bg-[#131317] border border-white/10 rounded-2xl shadow-2xl p-6 text-neutral-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-[17px] font-semibold text-white tracking-tight">Confirm Undo</h3>
            <button
              type="button"
              onClick={() => setRevertModalTarget(null)}
              className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subtitle */}
          <p className="text-[13px] text-neutral-400 mt-2 mb-4 leading-normal">
            Confirming this undo action will make the following changes:
          </p>

          {/* Checkbox: Revert file changes */}
          {revertFiles.length > 0 ? (
            <label
              onClick={() => setRevertFileChangesChecked((prev) => !prev)}
              className="flex items-center gap-2.5 cursor-pointer select-none mb-3.5 group"
            >
              <div
                className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-colors ${
                  revertFileChangesChecked
                    ? 'bg-[#2f71e3] text-white'
                    : 'border border-neutral-600 bg-neutral-800/80 group-hover:border-neutral-500'
                }`}
              >
                {revertFileChangesChecked && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="text-[13.5px] font-medium text-neutral-200">Revert file changes</span>
            </label>
          ) : null}

          {/* File List */}
          {revertFiles.length > 0 ? (
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1 my-2 custom-scrollbar">
              {revertFiles.map((file) => (
                <div key={file.path} className="flex flex-col">
                  <div className="flex items-center justify-between py-1 px-1 rounded-lg hover:bg-white/[0.03] transition-colors group">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="shrink-0 flex items-center justify-start w-5">
                        {getFileBadge(file.path)}
                      </span>
                      <span className="text-[13px] text-neutral-200 font-mono truncate" title={file.path}>
                        {file.fileName}
                      </span>
                      {file.isNew ? (
                        <span className="text-[#ef4444] text-[12px] font-mono font-medium ml-2">
                          Delete
                        </span>
                      ) : (
                        <span className="font-mono text-[12px] flex items-center gap-1.5 ml-2">
                          {file.addedLines > 0 && (
                            <span className="text-[#22c55e]">+{file.addedLines}</span>
                          )}
                          {file.removedLines > 0 && (
                            <span className="text-[#ef4444]">-{file.removedLines}</span>
                          )}
                        </span>
                      )}
                    </div>

                    {(file.diff || file.addedLines > 0 || file.removedLines > 0) && (
                      <button
                        type="button"
                        onClick={() => setViewingDiffFile(viewingDiffFile === file.path ? null : file.path)}
                        className="px-3 py-1 text-[11.5px] font-medium rounded-lg bg-[#252528] hover:bg-[#303035] text-neutral-200 hover:text-white border border-white/5 transition-colors cursor-pointer shrink-0 ml-auto"
                      >
                        {viewingDiffFile === file.path ? 'Hide Diff' : 'View Diff'}
                      </button>
                    )}
                  </div>

                  {viewingDiffFile === file.path && (
                    <div className="my-1.5 p-2.5 rounded-lg bg-[#0d0f17] border border-white/10 font-mono text-[11px] max-h-[160px] overflow-y-auto leading-relaxed custom-scrollbar select-text">
                      {file.diff ? (
                        file.diff.split('\n').map((line, lIdx) => (
                          <div
                            key={lIdx}
                            className={
                              line.startsWith('+') && !line.startsWith('+++')
                                ? 'text-[#22c55e] bg-emerald-950/20 px-1 rounded-xs'
                                : line.startsWith('-') && !line.startsWith('---')
                                ? 'text-[#ef4444] bg-rose-950/20 px-1 rounded-xs'
                                : 'text-neutral-400 px-1'
                            }
                          >
                            {line}
                          </div>
                        ))
                      ) : (
                        <div className="text-neutral-500 italic px-1">No diff preview available for this file.</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 px-3 rounded-lg bg-neutral-900/50 border border-white/5 text-[13px] text-neutral-400">
              No files were modified by the assistant after this message. Reverting will roll the conversation back to this point and restore your draft in the input.
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 mt-3">
            <button
              type="button"
              onClick={() => setRevertModalTarget(null)}
              className="px-4 py-2 text-[13.5px] font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRevert}
              className="px-5 py-2.5 text-[13.5px] font-medium text-white bg-[#2f71e3] hover:bg-[#2563eb] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm border-none"
            >
              <span>Confirm</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <WarmTooltipGroup delay={400} warmWindow={300} travel={320} lean={false}>
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        paddingRight: activeArtifact ? `${canvasWidth}px` : undefined,
      }}
      className={`relative flex flex-col h-full w-full justify-between pb-3 px-6 pt-0 ${
        isCanvasResizing ? 'transition-none select-none' : 'transition-all duration-200'
      }`}
    >
      {/* Drag & Drop Visual Dropzone Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-2 z-50 flex flex-col items-center justify-center bg-blue-500/10 dark:bg-blue-600/15 backdrop-blur-md border-2 border-dashed border-blue-500/70 dark:border-blue-400/70 rounded-3xl pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-150">
          <div className="p-6 rounded-2xl bg-white/95 dark:bg-[#151720]/95 shadow-2xl flex flex-col items-center gap-3 border border-blue-500/30 text-center max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <div className="text-base font-semibold text-gray-900 dark:text-white">
                Drop file to attach
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Release anywhere to ask Grokki, send on WhatsApp, or upload to Drive
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Hidden Native File Picker Input for Category Filtering */}
      <input
        ref={fileInputRef}
        type="file"
        accept={fileAcceptFilter}
        onChange={handleNativeFileInputChange}
        className="hidden"
      />
      {renderCameraModal()}
      {renderRevertModal()}

      {/* Background Gradient Effect (Grokki Threads or Grainient Fluid Mesh) */}
      {!!config.chatBackgroundGradient && (
        <AnimatePresence mode="sync">
          <motion.div
            key={`chat-bg-${config.chatBackgroundEffect === 'grainient' ? 'grainient' : 'grokki-threads'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="absolute inset-0 pointer-events-none overflow-hidden z-0"
            style={{ width: '100%', height: '100%', position: 'absolute' }}
          >
          {config.chatBackgroundEffect === 'grainient' ? (
            (() => {
              const gSettings = {
                ...DEFAULT_GRAINIENT_SETTINGS,
                ...(config.grainientSettings || {}),
              };
              return (
                <Grainient
                  key={JSON.stringify(gSettings)}
                  colors={gSettings.colors}
                  type={gSettings.type}
                  angle={gSettings.angle}
                  bands={gSettings.bands}
                  speed={gSettings.speed}
                  flow={gSettings.flow}
                  scale={gSettings.scale}
                  softness={gSettings.softness}
                  silk={gSettings.silk}
                  grainAmount={gSettings.grainAmount}
                  grainSize={gSettings.grainSize}
                  grainAnimated={gSettings.grainAnimated}
                  contrast={gSettings.contrast}
                  saturation={gSettings.saturation}
                  variation={gSettings.variation}
                  interactive={false}
                  intro={false}
                  lightMode={!isDarkTheme}
                  className="w-full h-full"
                />
              );
            })()
          ) : (
            <div className="w-full h-full relative" style={{ width: '100%', height: '100%', position: 'relative' }}>
              <Threads
                color={agentMode ? '#8b5cf6' : '#4769c8'}
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
                opacity={1}
                seed={0}
                className="w-full h-full"
              />
            </div>
          )}
        </motion.div>
        </AnimatePresence>
      )}

      {/* Background Noise & Scanlines Overlay Above Gradient */}
      {!!config.chatBackgroundNoise && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-0"
          style={{ width: '100%', height: '100%', position: 'absolute' }}
        >
          <Noise
            opacity={0.05}
            size={1}
            fps={18}
            blendMode="overlay"
            contrast={0.6}
            colored={false}
            dust={0}
            scratches={0}
            scanlines={0.03}
            flicker={0}
          />
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex flex-col h-full w-full max-w-3xl mx-auto justify-between relative z-10 min-h-0">
      {/* Messages / Hero View */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-6 pb-4">
          <AnimatePresence mode="wait" initial={false}>
            {agentMode ? (
              /* Single Grokki White Square Logo in Agent mode with subtle bottom fade - NO text */
              <motion.div
                key="agent-studio-single-white-logo"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center mb-5 select-none pointer-events-none"
              >
                <img
                  src={grokkiLogo}
                  alt="Grokki"
                  draggable={false}
                  className="w-12 h-12 md:w-64 md:h-64 -mb-42 object-contain filter brightness-0 invert"
                  style={{
                    maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 5%, rgba(0, 0, 0, 0.02) 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 10%, rgba(0, 0, 0, 0.08) 100%)',
                  }}
                />
              </motion.div>
            ) : (
              /* Grokki Studio Wordmark Brand Pill in Chat mode */
              <motion.div
                key="chat-brand-pill"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center justify-center mb-1 select-none"
              >
                <img
                  src={grokkiWordmarkDark}
                  alt="Grokki Studio"
                  className="hidden dark:block h-18 mt-4 w-auto object-contain select-none"
                />
                <img
                  src={grokkiWordmarkLight}
                  alt="Grokki Studio"
                  className="block dark:hidden h-18 mt-4 w-auto object-contain select-none"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Persona Heading */}
          <div className="min-h-[32px] md:min-h-[36px] flex items-center justify-center mb-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={greetingPhrase}
                initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="text-[22px] md:text-[24px] font-semibold tracking-[-0.03em] text-gray-950 dark:text-white font-sans text-center cursor-pointer select-none"
                onClick={() => setGreetingShuffleNonce((n) => n + 1)}
                title="Click to shuffle phrase"
              >
                {greetingPhrase}
              </motion.h1>
            </AnimatePresence>
          </div>

          {/* Staged File Preview Card */}
          {attachedFile && (
            <div className="w-full max-w-xl mx-auto mb-3 p-2.5 bg-white/95 dark:bg-[#131317]/95 backdrop-blur-md border border-gray-200/90 dark:border-white/10 rounded-2xl shadow-xs flex items-center justify-between text-left transition-all">
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

          {/* Centered Floating Input Pill with Slash Command Palette & Mention Palette */}
          <div className="w-full max-w-xl mx-auto relative z-30 transition-all duration-200">
            {renderSlashMenu()}
            {renderMentionMenu('bottom')}
            {renderSynthesizerVisualizer()}

            {stagedMentions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2 px-1">
                <span className="text-[10px] text-gray-400 font-medium">Context:</span>
                {stagedMentions.map((m, idx) => (
                  <WorkspaceMentionPill
                    key={`${m.path}-${idx}`}
                    mention={m}
                    onRemove={() => setStagedMentions((prev) => prev.filter((_, i) => i !== idx))}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setStagedMentions([])}
                  className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline cursor-pointer border-none bg-transparent ml-1"
                >
                  Clear
                </button>
              </div>
            )}

            {renderPermissionCard()}

            <SpecularButton
              as="div"
              size="lg"
              radius={18}
              tint={isDarkTheme ? '#ffffff' : '#000000'}
              tintOpacity={0.04}
              textColor={isDarkTheme ? '#f5f5f5' : '#18181b'}
              lineColor={isDarkTheme ? '#ffffff' : '#18181b'}
              baseColor={isDarkTheme ? '#525252' : '#d4d4d8'}
              intensity={1}
              idleIntensity={0.35}
              shineSize={10}
              shineFade={34}
              thickness={1.2}
              glow={1}
              followMouse={false}
              autoAnimate
              proximity={250}
              className="w-full bg-white dark:bg-[#0f0f13] shadow-sm hover:shadow-md p-3 transition-all flex flex-col gap-2.5 text-left relative z-20"
            >
              {/* Battle Stage Selector when Dual-Battle Mode is active (Only in Grokki Chat) */}
              {dualBattleEnabled && !agentMode && renderBattleStageBar('top')}

              {/* Input Field on Top with Inline Brand Icon & Grokki Blue URL Highlighting */}
              <RichBrandInput
                inputRef={inputRef}
                value={inputValue}
                onChange={setInputValue}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRecording
                    ? "Listening... speaking your prompt"
                    : agentMode && !agentRoot
                    ? "Select a project folder below before sending tasks..."
                    : agentMode
                    ? `Ask Grokki Agent to inspect, edit, or run commands in ${agentRootName}...`
                    : attachedFile
                    ? isVideoAttachment(attachedFile)
                    ? `Send ${attachedFile.name} on WhatsApp or upload to Drive...`
                    : `Ask Grokki about ${attachedFile.name}...`
                    : dualBattleEnabled
                    ? "Ask Grokki to compare both AI Brains side-by-side..."
                    : "Type / for slash commands, or ask Grokki anything..."
                }
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

                  {/* Deep Search Button & Dual-Battle Button (Hidden in Grokki Agent Mode) */}
                  <AnimatePresence initial={false}>
                    {!agentMode && (
                      <motion.div
                        key="chat-mode-extras-hero"
                        initial={{ opacity: 0, width: 0, scale: 0.9 }}
                        animate={{ opacity: 1, width: 'auto', scale: 1 }}
                        exit={{ opacity: 0, width: 0, scale: 0.9 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-1.5 overflow-hidden"
                      >
                        <WarmTooltip
                          content={webSearchEnabled ? 'Deep Search: ON (Live grounding)' : 'Deep Search: OFF'}
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
                            className={`group flex items-center h-7 px-2 rounded-lg text-[11px] font-mono transition-all duration-300 cursor-pointer border select-none overflow-hidden ${
                              webSearchEnabled
                                ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 shadow-xs font-semibold'
                                : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <Globe className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${webSearchEnabled ? 'text-sky-400' : 'text-gray-400'}`} />
                            <span className="max-w-0 opacity-0 group-hover:max-w-[90px] group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 ease-out whitespace-nowrap overflow-hidden">
                              Deep Search
                            </span>
                          </button>
                        </WarmTooltip>

                        <WarmTooltip
                          content={dualBattleEnabled ? 'Dual-Battle: ON (Concurrent comparison)' : 'Dual-Battle: OFF'}
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
                            aria-label="Toggle Dual-Battle Mode"
                            onClick={() => setDualBattleEnabled((prev) => !prev)}
                            className={`group flex items-center h-7 px-2 rounded-lg text-[11px] font-mono transition-all duration-300 cursor-pointer border select-none overflow-hidden ${
                              dualBattleEnabled
                                ? 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/40 shadow-xs font-semibold'
                                : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <Swords className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${dualBattleEnabled ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                            <span className="max-w-0 opacity-0 group-hover:max-w-[90px] group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 ease-out whitespace-nowrap overflow-hidden">
                              Dual Battle
                            </span>
                          </button>
                        </WarmTooltip>
                      </motion.div>
                    )}
                  </AnimatePresence>
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

                  {/* Send / Stop Button */}
                  <WarmTooltip
                    content={
                      isChatThinking
                        ? 'Stop task / generation'
                        : agentMode && !agentRoot
                        ? 'Please select a project folder below first'
                        : 'Send message'
                    }
                    shortcut={isChatThinking ? 'ESC' : '↵'}
                    side="top"
                    surfaceColor="#f5f5f5"
                    inkColor="#18181b"
                    size="md"
                    radius={8}
                    gap={8}
                    popDuration={160}
                    popScale={0.94}
                    popBlur={4}
                    showFuse={true}
                  >
                    <button
                      type="button"
                      aria-label={isChatThinking || Boolean(pendingPermission) ? 'Stop / Terminate' : 'Send message'}
                      onClick={() => {
                        if (isChatThinking || Boolean(pendingPermission)) {
                          handleStopGeneration();
                        } else {
                          handleSendMessage();
                        }
                      }}
                      disabled={
                        !isChatThinking && !pendingPermission && (
                          agentMode
                            ? (!inputValue.trim() || !agentRoot)
                            : (!inputValue.trim() && !attachedFile)
                        )
                      }
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none shadow-xs flex-shrink-0 ${
                        isChatThinking || Boolean(pendingPermission)
                          ? 'bg-red-500 hover:bg-red-600 text-white dark:bg-red-500 dark:hover:bg-red-600 shadow-md ring-2 ring-red-500/20'
                          : (!agentMode && (inputValue.trim() || attachedFile)) || (agentMode && inputValue.trim() && agentRoot)
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                          : 'bg-gray-200 dark:bg-[#1e2029] text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isChatThinking || Boolean(pendingPermission) ? (
                        <Square className="w-3 h-3 fill-current" />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </button>
                  </WarmTooltip>
                </div>
              </div>
            </SpecularButton>
            <AnimatePresence initial={false}>
              {agentMode && (
                <motion.div
                  key="agent-controls-bar-hero"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full relative z-40 overflow-visible"
                >
                  {renderAgentControlsBar()}
                </motion.div>
              )}
            </AnimatePresence>
            {!agentMode && (
              <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 mt-2 select-none tracking-normal">
                Grokki can make mistakes. Verify important info.
              </p>
            )}
          </div>

          {/* Suggestions & Quick Commands Vertical List (Hidden in Grokki Agent Mode) */}
          <AnimatePresence initial={false}>
            {!agentMode && (
              <motion.div
                key="chat-suggestions-list"
                initial={{ opacity: 0, height: 0, y: 16 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: 16 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-xl mt-6 text-left relative z-10 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
                    Suggestions & Commands
                  </span>
                  <span className="text-[9.5px] font-mono text-gray-400 dark:text-gray-600">
                    Click to execute
                  </span>
                </div>

                <div className="w-full rounded-xl border border-gray-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#0e0f14]/85 backdrop-blur-md overflow-hidden divide-y divide-gray-100 dark:divide-white/[0.04] shadow-xs">
                  {suggestions.map((item, idx) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(item.prompt)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-gray-100/80 dark:hover:bg-white/[0.04] group cursor-pointer border-none bg-transparent"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-7 h-7 rounded-md bg-gray-100/90 dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/[0.06] flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-gray-950 dark:group-hover:text-white group-hover:border-gray-300 dark:group-hover:border-white/20 transition-all shrink-0">
                            <IconComponent className="w-3.5 h-3.5 stroke-[2.2]" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-medium text-gray-800 dark:text-gray-200 group-hover:text-gray-950 dark:group-hover:text-white tracking-[-0.01em] truncate transition-colors">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 truncate transition-colors">
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[9px] text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 px-1.5 py-0.5 rounded border border-gray-200/70 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.02] group-hover:border-gray-300 dark:group-hover:border-white/15 transition-colors">
                            {item.badge}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Active Conversation Thread with Gradual Blur Top & Bottom */
        <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
          <div
            id="grokki-chat-scroll"
            className="flex-1 flex flex-col overflow-y-auto no-scrollbar px-1 pt-2 pb-4 space-y-5"
          >
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pb-2.5 pt-2.5 border-b border-gray-200 dark:border-[#1e2029]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate max-w-xs">
                {activeConversation.title || 'Conversation'}
              </span>
              <span className="text-[9.5px] font-mono px-2 py-1 rounded-md bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029]">
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
                  id={`chat-msg-${msg.id}`}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full transition-colors`}
                >
                  {isUser ? (
                    editingMessageId === msg.id ? (
                      /* Inline Edit UI */
                      <div className="w-full max-w-[75%] flex flex-col items-end gap-2 animate-in fade-in duration-200">
                        <div className="w-full bg-white dark:bg-[#131317] text-gray-900 dark:text-gray-100 p-3.5 rounded-2xl border border-gray-300 dark:border-[#24242c] shadow-[0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_0_rgba(255,255,255,0.1)] focus-within:border-gray-400 dark:focus-within:border-white/40 focus-within:ring-1 focus-within:ring-white/20 transition-all">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEditedMessage(msg.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            autoFocus
                            rows={Math.min(8, Math.max(2, editingContent.split('\n').length))}
                            className="w-full bg-transparent resize-none border-none outline-none text-[13px] font-medium leading-relaxed text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-0 p-0"
                            placeholder="Edit your message..."
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-white/10 transition-all cursor-pointer font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditedMessage(msg.id)}
                            disabled={!editingContent.trim() || isChatThinking}
                            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-100 active:scale-95 text-gray-900 font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs border border-gray-200/90 flex items-center gap-1.5"
                          >
                            <span>Send</span>
                            <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-800 text-[10px] font-mono font-bold border border-gray-300 shadow-2xs">
                              <CornerDownLeft className="w-2.5 h-2.5 stroke-[2.5]" />
                            </kbd>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* User Message: Clean Modern Rounded Bubble with Action Options */
                      <div className="flex flex-col items-end max-w-[75%] group/user-msg">
                        <div className="w-full bg-gray-100 dark:bg-[#1a1a20] text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-2xl rounded-tr-xs text-sm font-medium leading-relaxed border border-gray-300/80 dark:border-[#26262e]">
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
                          <p className="whitespace-pre-wrap m-0 leading-relaxed text-[13.5px]">
                            {renderContentWithBrandLinks(msg.content)}
                          </p>
                        </div>

                        {/* Under User Message: Sent timestamp + Copy & Edit buttons (Hidden by default, reveals on hover) */}
                        <div className="flex items-center gap-1.5 mt-1 mr-1 text-gray-400 dark:text-zinc-500 opacity-0 group-hover/user-msg:opacity-100 pointer-events-none group-hover/user-msg:pointer-events-auto transition-opacity duration-150">
                          {/* Timestamp of user message when sent (first) */}
                          {msg.timestamp && (
                            <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 tabular-nums select-none leading-none">
                              {msg.timestamp}
                            </span>
                          )}

                          {/* Options: Copy & Edit */}
                          <div className="flex items-center gap-0.5">
                            <WarmTooltip
                              content={copiedId === msg.id ? 'Copied!' : 'Copy'}
                              side="bottom"
                              surfaceColor="#f5f5f5"
                              inkColor="#18181b"
                              size="sm"
                              radius={6}
                              arrow
                            >
                              <button
                                type="button"
                                aria-label="Copy message"
                                onClick={() => handleCopy(msg.id, msg.content)}
                                className="p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-colors cursor-pointer border-none bg-transparent"
                              >
                                {copiedId === msg.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </WarmTooltip>

                            <WarmTooltip
                              content="Edit message"
                              side="bottom"
                              surfaceColor="#f5f5f5"
                              inkColor="#18181b"
                              size="sm"
                              radius={6}
                              arrow
                            >
                              <button
                                type="button"
                                aria-label="Edit message"
                                onClick={() => handleStartEdit(msg)}
                                className="p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-colors cursor-pointer border-none bg-transparent"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </WarmTooltip>

                            {agentMode && (
                              <WarmTooltip
                                content="Revert to this message"
                                side="bottom"
                                surfaceColor="#f5f5f5"
                                inkColor="#18181b"
                                size="sm"
                                radius={6}
                                arrow
                              >
                                <button
                                  type="button"
                                  aria-label="Revert to this message"
                                  onClick={() => handleOpenRevertModal(msg)}
                                  className="p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-colors cursor-pointer border-none bg-transparent"
                                >
                                  <Undo2 className="w-3 h-3" />
                                </button>
                              </WarmTooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    )
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

                        {/* Executed Tools Actions (Antigravity Accordion Style) */}
                        {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                          <AgentStepsAccordion
                            steps={msg.actionsExecuted}
                            defaultExpanded={true}
                            expandedStepIds={expandedStepIds}
                            onToggleStepExpand={toggleStepExpand}
                            messageId={msg.id}
                          />
                        )}

                        {/* Perplexity-Style Sources Bar */}
                        {msg.role === 'assistant' && msg.grounding && !msg.dualBattle && (
                          <PerplexitySourcesBar grounding={msg.grounding} />
                        )}

                        {/* Related Discovered Images Horizontal Carousel */}
                        {msg.role === 'assistant' && !msg.dualBattle && (() => {
                          const carouselImages = (msg.grounding?.relatedImages && msg.grounding.relatedImages.length > 0)
                            ? msg.grounding.relatedImages
                            : extractImagesFromMarkdown(msg.content);
                          if (!carouselImages || carouselImages.length === 0) return null;
                          return (
                            <RelatedImagesCarousel
                              images={carouselImages}
                              onOpenImage={(src, alt, originRect, fallbackSrc) => openLightbox(src, alt, undefined, undefined, originRect, fallbackSrc)}
                            />
                          );
                        })()}

                        {/* Weather Forecast Horizontal Carousel */}
                        {msg.role === 'assistant' && !msg.dualBattle && (() => {
                          const weatherData = parseWeatherForecastFromMarkdown(msg.content);
                          if (!weatherData || !weatherData.items || weatherData.items.length === 0) return null;
                          return <WeatherCarousel data={weatherData} />;
                        })()}

                        {/* Phase 4: Multi-Brain Dual-Battle Comparative Render */}
                        {msg.role === 'assistant' && msg.dualBattle && (
                          <div className="w-full my-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Brain A Card */}
                              <div className="p-3.5 rounded-xl bg-white dark:bg-[#0b0d14] border border-slate-200 dark:border-[#1a1d2c] hover:border-sky-400 dark:hover:border-sky-500/50 transition-all flex flex-col justify-between shadow-xs">
                                <div>
                                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-[#181b28]">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400 shrink-0 shadow-xs" />
                                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono truncate">
                                        Brain A: {msg.dualBattle.brainA.model}
                                      </span>
                                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-500/30">
                                        {msg.dualBattle.brainA.provider}
                                      </span>
                                    </div>
                                    {msg.dualBattle.brainA.latencyMs !== undefined && (
                                      <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#131622] border border-slate-200 dark:border-[#202538] shrink-0 font-semibold">
                                        {msg.dualBattle.brainA.latencyMs}ms
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs leading-relaxed select-text overflow-x-auto text-slate-900 dark:text-slate-100">
                                    <StaticMessageContent
                                      content={msg.dualBattle.brainA.reply}
                                      onOpenImage={(src, alt, originRect) => openLightbox(src, alt, undefined, undefined, originRect)}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between pt-2.5 mt-3 border-t border-slate-100 dark:border-[#181b28]">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(`${msg.id}-a`, msg.dualBattle!.brainA.reply)}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-[#1e2029]"
                                  >
                                    {copiedId === `${msg.id}-a` ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedId === `${msg.id}-a` ? 'Copied' : 'Copy'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePickWinner(msg.id, 'brainA')}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono text-sky-800 dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 border border-sky-300/80 dark:border-sky-500/40 transition-all cursor-pointer font-bold shadow-2xs"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Pick Brain A</span>
                                  </button>
                                </div>
                              </div>

                              {/* Brain B Card */}
                              <div className="p-3.5 rounded-xl bg-white dark:bg-[#0b0d14] border border-slate-200 dark:border-[#1a1d2c] hover:border-purple-400 dark:hover:border-purple-500/50 transition-all flex flex-col justify-between shadow-xs">
                                <div>
                                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-[#181b28]">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400 shrink-0 shadow-xs" />
                                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono truncate">
                                        Brain B: {msg.dualBattle.brainB.model}
                                      </span>
                                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-500/30">
                                        {msg.dualBattle.brainB.provider}
                                      </span>
                                    </div>
                                    {msg.dualBattle.brainB.latencyMs !== undefined && (
                                      <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#131622] border border-slate-200 dark:border-[#202538] shrink-0 font-semibold">
                                        {msg.dualBattle.brainB.latencyMs}ms
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs leading-relaxed select-text overflow-x-auto text-slate-900 dark:text-slate-100">
                                    <StaticMessageContent
                                      content={msg.dualBattle.brainB.reply}
                                      onOpenImage={(src, alt, originRect) => openLightbox(src, alt, undefined, undefined, originRect)}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between pt-2.5 mt-3 border-t border-slate-100 dark:border-[#181b28]">
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(`${msg.id}-b`, msg.dualBattle!.brainB.reply)}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-[#1e2029]"
                                  >
                                    {copiedId === `${msg.id}-b` ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedId === `${msg.id}-b` ? 'Copied' : 'Copy'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePickWinner(msg.id, 'brainB')}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono text-purple-800 dark:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 border border-purple-300/80 dark:border-purple-500/40 transition-all cursor-pointer font-bold shadow-2xs"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Pick Brain B</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Consensus Synthesizer Section */}
                            {msg.dualBattle.consensus ? (
                              <div className="mt-3 p-4 rounded-xl bg-[#faf5ff] dark:bg-[#0e0c18] border border-purple-200/90 dark:border-purple-500/30 shadow-xs animate-in fade-in duration-300">
                                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-purple-200/70 dark:border-purple-500/20">
                                  <div className="flex items-center gap-2">
                                    <GitMerge className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                                    <span className="text-xs font-bold text-purple-950 dark:text-purple-200 tracking-wide font-mono">
                                      Synthesized Consensus & Comparative Verdict
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(`${msg.id}-cons`, msg.dualBattle!.consensus!.content)}
                                    className="flex items-center gap-1.5 text-[11px] font-mono text-purple-900 dark:text-purple-200 hover:text-black dark:hover:text-white px-2.5 py-1 rounded-md bg-white hover:bg-purple-100/80 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 border border-purple-300/80 dark:border-purple-600/40 transition-colors cursor-pointer font-semibold shadow-2xs"
                                  >
                                    {copiedId === `${msg.id}-cons` ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedId === `${msg.id}-cons` ? 'Copied' : 'Copy Consensus'}</span>
                                  </button>
                                </div>
                                <div className="text-xs leading-relaxed select-text text-slate-900 dark:text-slate-100">
                                  <StaticMessageContent
                                    content={msg.dualBattle.consensus.content}
                                    onOpenImage={(src, alt, originRect) => openLightbox(src, alt, undefined, undefined, originRect)}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-3">
                                <button
                                  type="button"
                                  onClick={() => handleSynthesizeConsensus(msg.id)}
                                  disabled={synthesizingId === msg.id}
                                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-700/40 text-purple-900 dark:text-purple-300 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                  <GitMerge className={`w-3.5 h-3.5 text-purple-600 dark:text-purple-400 ${synthesizingId === msg.id ? 'animate-spin' : ''}`} />
                                  <span>{synthesizingId === msg.id ? 'Synthesizing consensus...' : 'Merge & Synthesize Consensus'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Rendered Markdown Body: Animated if streaming, else Fast Cached Static (for single-brain messages) */}
                        {!msg.dualBattle && (() => {
                          const hasCarousel = (msg.grounding?.relatedImages && msg.grounding.relatedImages.length > 0) ||
                            extractImagesFromMarkdown(msg.content).length > 0;
                          const weatherData = parseWeatherForecastFromMarkdown(msg.content);
                          let cleanBodyContent = msg.content;
                          if (hasCarousel && cleanBodyContent) {
                            cleanBodyContent = cleanBodyContent.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/g, '').replace(/\n{3,}/g, '\n\n').trim();
                          }
                          if (weatherData && cleanBodyContent) {
                            cleanBodyContent = stripWeatherTableFromMarkdown(cleanBodyContent, weatherData);
                          }

                          return config.streamingAnimation !== false && msg.isAnimated ? (
                            <AnimatedMessageContent
                              content={cleanBodyContent}
                              grounding={msg.grounding}
                              isAnimated={true}
                              speed={config.streamingSpeed}
                              onScroll={scrollToBottom}
                              onFinished={() => handleMessageFinished(msg.id)}
                              onOpenArtifact={setActiveArtifact}
                              onOpenImage={(src, alt, originRect) => openLightbox(src, alt, undefined, undefined, originRect)}
                            />
                          ) : (
                            <StaticMessageContent
                              content={cleanBodyContent}
                              grounding={msg.grounding}
                              onOpenArtifact={setActiveArtifact}
                              onOpenImage={(src, alt, originRect) => openLightbox(src, alt, undefined, undefined, originRect)}
                            />
                          );
                        })()}

                        {/* Claude-Style Artifact Card */}
                        {msg.role === 'assistant' && !msg.dualBattle && (() => {
                          const artifact = extractArtifactFromMessage(msg.content);
                          if (!artifact) return null;
                          const lineCount = artifact.content.split('\n').length;
                          return (
                            <div
                              onClick={() => setActiveArtifact(artifact)}
                              className="mt-3.5 p-3 rounded-xl bg-white hover:bg-slate-50 dark:bg-[#0c0e16] dark:hover:bg-[#111420] border border-slate-200 dark:border-[#1c2030] hover:border-sky-500/60 dark:hover:border-sky-500/50 flex items-center justify-between transition-all cursor-pointer group shadow-xs select-none"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-[#131724] text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0 border border-sky-100 dark:border-[#20263c] group-hover:border-sky-400 transition-colors">
                                  {artifact.language === 'html' ? (
                                    <Globe className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                                  ) : artifact.language === 'svg' ? (
                                    <Shapes className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                                  ) : ['tsx', 'jsx', 'react'].includes(artifact.language) ? (
                                    <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                  ) : (
                                    <FileCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
                                    <span className="font-mono tracking-tight">{artifact.title}</span>
                                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#181d2c] text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-[#242b40]">
                                      {artifact.language}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
                                    {lineCount} lines • Click to open in Canvas
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-sky-500/20 text-white dark:text-sky-200 border border-transparent dark:border-sky-500/40 group-hover:bg-sky-600 dark:group-hover:bg-sky-500/30 text-xs font-semibold transition-all shrink-0 ml-3 shadow-2xs">
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
            {isChatThinking && (
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
                  {currentLiveSteps.length > 0 ? (
                    <AgentStepsAccordion
                      steps={currentLiveSteps}
                      isLive
                      defaultExpanded={true}
                      expandedStepIds={expandedStepIds}
                      onToggleStepExpand={toggleStepExpand}
                      messageId="live"
                    />
                  ) : (
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
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Gradual Blur: Top of Scrolling Chat */}
        <GradualBlur
          position="top"
          height="4.5rem"
          strength={2}
          layers={8}
          curve="linear"
          exponential
          tint="transparent"
          autoHide
          target="parent"
          container="#grokki-chat-scroll"
          zIndex={10}
          opacity={1}
          saturation={1}
          hoverIntensity={1}
        />

        {/* Gradual Blur: Bottom of Scrolling Chat */}
        <GradualBlur
          position="bottom"
          height="6rem"
          strength={2}
          layers={8}
          curve="linear"
          exponential
          tint="transparent"
          autoHide
          target="parent"
          container="#grokki-chat-scroll"
          zIndex={10}
          opacity={1}
          saturation={1}
          hoverIntensity={1}
        />
      </div>
    )}

      {/* Pinned Bottom Input Bar */}
      {messages.length > 0 && (
        <div className="w-full pt-2.5 bg-transparent">
          {/* Staged File Preview Card */}
          {attachedFile && (
            <div className="w-full max-w-xl mx-auto mb-2 p-2.5 bg-white/95 dark:bg-[#131317]/95 backdrop-blur-md border border-gray-200/90 dark:border-white/10 rounded-2xl shadow-xs flex items-center justify-between text-left transition-all">
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

          {/* Floating Slash Command Menu, Mention Menu & Synthesizer Visualizer for Bottom Bar */}
          <div className="w-full max-w-xl mx-auto relative mb-6 z-30 transition-all duration-200">
            {/* Scroll-to-bottom Down Chevron Button (above input to the right side, only if there is space to scroll down) */}
            {canScrollDown && (
              <div className="absolute right-0 -top-9 z-30 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  className="w-7 h-7 rounded-full bg-[#18181b]/95 hover:bg-[#25252a] text-gray-400 hover:text-white border border-white/[0.1] flex items-center justify-center transition-all cursor-pointer select-none"
                  title="Scroll to latest messages"
                  aria-label="Scroll to bottom"
                >
                  <ChevronDown size={14} strokeWidth={2.4} />
                </button>
              </div>
            )}

            {renderSlashMenu('top')}
            {renderMentionMenu('top')}
            {renderSynthesizerVisualizer()}

            {stagedMentions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2 px-1">
                <span className="text-[10px] text-gray-400 font-medium">Context:</span>
                {stagedMentions.map((m, idx) => (
                  <WorkspaceMentionPill
                    key={`${m.path}-${idx}`}
                    mention={m}
                    onRemove={() => setStagedMentions((prev) => prev.filter((_, i) => i !== idx))}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setStagedMentions([])}
                  className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline cursor-pointer border-none bg-transparent ml-1"
                >
                  Clear
                </button>
              </div>
            )}

            {renderPermissionCard()}

            <SpecularButton
              as="div"
              size="lg"
              radius={18}
              tint={isDarkTheme ? '#ffffff' : '#000000'}
              tintOpacity={0.04}
              textColor={isDarkTheme ? '#f5f5f5' : '#18181b'}
              lineColor={isDarkTheme ? '#ffffff' : '#18181b'}
              baseColor={isDarkTheme ? '#525252' : '#d4d4d8'}
              intensity={1}
              idleIntensity={0.35}
              shineSize={10}
              shineFade={34}
              thickness={1.2}
              glow={1}
              followMouse={false}
              autoAnimate
              proximity={250}
              className="w-full bg-white dark:bg-[#131317] shadow-sm hover:shadow-md mb-1.5 p-3 transition-all flex flex-col gap-2.5 text-left relative z-20"
            >
              {/* Battle Stage Selector when Dual-Battle Mode is active (Only in Grokki Chat) */}
              {dualBattleEnabled && !agentMode && renderBattleStageBar('top')}

              {/* Input Field on Top with Inline Brand Icon & Grokki Blue URL Highlighting */}
              <RichBrandInput
                inputRef={inputRef}
                value={inputValue}
                onChange={setInputValue}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRecording
                    ? "Listening... speaking your prompt"
                    : agentMode && !agentRoot
                    ? "Select a project folder below before sending tasks..."
                    : agentMode
                    ? `Ask Grokki Agent to inspect, edit, or run commands in ${agentRootName}...`
                    : attachedFile
                    ? isVideoAttachment(attachedFile)
                    ? `Send ${attachedFile.name} on WhatsApp or upload to Drive...`
                    : `Ask Grokki about ${attachedFile.name}...`
                    : dualBattleEnabled
                    ? "Ask Grokki to compare both AI Brains side-by-side..."
                    : "Type / for direct slash commands, or ask anything..."
                }
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

                  {/* Deep Search Button & Dual-Battle Button (Hidden in Grokki Agent Mode) */}
                  <AnimatePresence initial={false}>
                    {!agentMode && (
                      <motion.div
                        key="chat-mode-extras-hero"
                        initial={{ opacity: 0, width: 0, scale: 0.9 }}
                        animate={{ opacity: 1, width: 'auto', scale: 1 }}
                        exit={{ opacity: 0, width: 0, scale: 0.9 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-1.5 overflow-hidden"
                      >
                        <WarmTooltip
                          content={webSearchEnabled ? 'Deep Search: ON (Live grounding)' : 'Deep Search: OFF'}
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
                            className={`group flex items-center h-7 px-2 rounded-lg text-[11px] font-mono transition-all duration-300 cursor-pointer border select-none overflow-hidden ${
                              webSearchEnabled
                                ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 shadow-xs font-semibold'
                                : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <Globe className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${webSearchEnabled ? 'text-sky-400' : 'text-gray-400'}`} />
                            <span className="max-w-0 opacity-0 group-hover:max-w-[90px] group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 ease-out whitespace-nowrap overflow-hidden">
                              Deep Search
                            </span>
                          </button>
                        </WarmTooltip>

                        <WarmTooltip
                          content={dualBattleEnabled ? 'Dual-Battle: ON (Concurrent comparison)' : 'Dual-Battle: OFF'}
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
                            aria-label="Toggle Dual-Battle Mode"
                            onClick={() => setDualBattleEnabled((prev) => !prev)}
                            className={`group flex items-center h-7 px-2 rounded-lg text-[11px] font-mono transition-all duration-300 cursor-pointer border select-none overflow-hidden ${
                              dualBattleEnabled
                                ? 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/40 shadow-xs font-semibold'
                                : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-transparent hover:border-gray-300 dark:hover:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <Swords className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${dualBattleEnabled ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                            <span className="max-w-0 opacity-0 group-hover:max-w-[90px] group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 ease-out whitespace-nowrap overflow-hidden">
                              Dual Battle
                            </span>
                          </button>
                        </WarmTooltip>
                      </motion.div>
                    )}
                  </AnimatePresence>
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

                  {/* Send / Stop Button */}
                  <WarmTooltip
                    content={
                      isChatThinking
                        ? 'Stop task / generation'
                        : agentMode && !agentRoot
                        ? 'Please select a project folder below first'
                        : 'Send message'
                    }
                    shortcut={isChatThinking ? 'ESC' : '↵'}
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
                      aria-label={isChatThinking || Boolean(pendingPermission) ? 'Stop / Terminate' : 'Send message'}
                      onClick={() => {
                        if (isChatThinking || Boolean(pendingPermission)) {
                          handleStopGeneration();
                        } else {
                          handleSendMessage();
                        }
                      }}
                      disabled={
                        !isChatThinking && !pendingPermission && (
                          agentMode
                            ? (!inputValue.trim() || !agentRoot)
                            : (!inputValue.trim() && !attachedFile)
                        )
                      }
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none shadow-xs flex-shrink-0 ${
                        isChatThinking || Boolean(pendingPermission)
                          ? 'bg-red-500 hover:bg-red-600 text-white dark:bg-red-500 dark:hover:bg-red-600 shadow-md ring-2 ring-red-500/20'
                          : (!agentMode && (inputValue.trim() || attachedFile)) || (agentMode && inputValue.trim() && agentRoot)
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                          : 'bg-gray-200 dark:bg-[#1e2029] text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isChatThinking || Boolean(pendingPermission) ? (
                        <Square className="w-3 h-3 fill-current" />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </button>
                  </WarmTooltip>
                </div>
              </div>
            </SpecularButton>
            <AnimatePresence initial={false}>
              {agentMode && (
                <motion.div
                  key="agent-controls-bar-bottom"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full relative z-40 overflow-visible"
                >
                  {renderAgentControlsBar()}
                </motion.div>
              )}
            </AnimatePresence>
            {!agentMode && (
              <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 mt-2 select-none tracking-normal">
                Grokki can make mistakes. Verify important info.
              </p>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Conversation Timeline on the FULL RIGHT of screen (Matte, Dots Only, No Lines, No Glow, No Shadows) */}
      {messages.length > 1 && !activeArtifact && (
        <ConversationTimeline
          messages={messages}
          conversationTitle={activeConversation.title || 'Conversation'}
          scrollContainerId="grokki-chat-scroll"
        />
      )}
    </div>
      {/* Interactive Artifacts / Canvas Split Pane */}
      <AnimatePresence>
        {activeArtifact && (
          <ArtifactCanvasPane
            artifact={activeArtifact}
            onClose={() => setActiveArtifact(null)}
            isDark={isDarkTheme}
            width={canvasWidth}
            onWidthChange={setCanvasWidth}
            isResizing={isCanvasResizing}
            onResizingChange={setIsCanvasResizing}
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
        fallbackSrc={lightboxState.fallbackSrc}
        onClose={closeLightbox}
      />

      {/* Floating Bottom-Right Toast for Local Model Downloads */}
      <AnimatePresence>
        {shouldShowPullToast && effectiveModelPull && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-40 flex flex-col gap-2.5 p-3.5 w-[360px] max-w-[calc(100vw-3rem)] rounded-xl bg-white dark:bg-[#121318] border border-gray-200 dark:border-[#22232b] shadow-md select-none pointer-events-auto"
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {effectiveModelPull.status === 'success' || effectiveModelPull.percent >= 100 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                ) : effectiveModelPull.status === 'error' ? (
                  <X className="w-3.5 h-3.5 text-red-500 shrink-0 stroke-[2.5]" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500 dark:text-gray-400 shrink-0" />
                )}
                <span className="text-[12.5px] font-medium text-gray-900 dark:text-gray-100 truncate">
                  {effectiveModelPull.status === 'success' || effectiveModelPull.percent >= 100
                    ? `Installed ${effectiveModelPull.modelName}`
                    : effectiveModelPull.status === 'error'
                    ? `Failed: ${effectiveModelPull.modelName}`
                    : `Downloading ${effectiveModelPull.modelName}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLocalModelPull(null);
                  window.jarvisAPI?.dismissOllamaPull?.().catch(() => {});
                }}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {effectiveModelPull.status !== 'success' && effectiveModelPull.status !== 'error' && effectiveModelPull.percent < 100 && (
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-[#20222b] overflow-hidden">
                  <div
                    className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-150"
                    style={{ width: `${Math.min(100, Math.max(0, effectiveModelPull.percent || 0))}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono font-medium text-gray-700 dark:text-gray-300 shrink-0">
                  {effectiveModelPull.percent || 0}%
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </WarmTooltipGroup>
  );
});
