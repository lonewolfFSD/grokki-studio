import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Folder,
  Sun,
  Moon,
  Download,
  Cloud,
  ChevronDown,
  AtSign,
  RefreshCw,
  ExternalLink,
  Star,
  CheckCircle2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Threads from '../../effects/Threads';
import { JarvisConfig } from '../types/jarvis';

// Authentic Official Logos
import grokkiLogo from '../assets/grokki_logo.png';
import grokkiWordmark from '../assets/grokki_wordmark.png';
import googleLogo from '../assets/logos/google.png';
import githubLogo from '../assets/logos/github.png';
import notionLogo from '../assets/logos/notion.png';
import obsidianLogo from '../assets/logos/obsidian.png';
import whatsappLogo from '../assets/logos/whatsapp.svg';
import ollamaLogo from '../assets/logos/ollama.png';

interface OnboardingModalProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
  onComplete: () => void;
}

const AVATAR_PRESETS = [
  'https://api.dicebear.com/9.x/glass/svg?seed=Felix&backgroundColor=18181b,27272a,3f3f46',
  'https://api.dicebear.com/9.x/glass/svg?seed=Aria&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/9.x/glass/svg?seed=Jasper&backgroundColor=d1d4f9,b6e3f4,c0aede',
  'https://api.dicebear.com/9.x/glass/svg?seed=Orion&backgroundColor=c0aede,d1d4f9,ffd5dc',
  'https://api.dicebear.com/9.x/glass/svg?seed=Luna&backgroundColor=ffd5dc,ffdfbf,ffd5dc',
  'https://api.dicebear.com/9.x/glass/svg?seed=Zenith&backgroundColor=0284c7,38bdf8,7dd3fc',
];

interface WorkspaceAccount {
  id: 'google' | 'notion' | 'github' | 'obsidian' | 'whatsapp';
  name: string;
  desc: string;
  logo: string;
}

const WORKSPACE_ACCOUNTS: WorkspaceAccount[] = [
  {
    id: 'google',
    name: 'Google Workspace',
    desc: 'Docs, Sheets, Drive, Gmail, and Calendar sync',
    logo: googleLogo,
  },
  {
    id: 'notion',
    name: 'Notion Workspace',
    desc: 'Pages, shared team docs, and database sync',
    logo: notionLogo,
  },
  {
    id: 'github',
    name: 'GitHub',
    desc: 'Repositories, pull requests, issues, and commits',
    logo: githubLogo,
  },
  {
    id: 'obsidian',
    name: 'Obsidian Vault',
    desc: 'Local markdown notes with bi-directional wikilinks',
    logo: obsidianLogo,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Gateway',
    desc: 'Messaging dispatch and remote chat triggers',
    logo: whatsappLogo,
  },
];

interface LocalModelOption {
  id: string;
  name: string;
  tag: string;
  size: string;
  desc: string;
}

const LOCAL_MODELS: LocalModelOption[] = [
  {
    id: 'qwen-coder',
    name: 'Qwen 2.5 Coder 7B',
    tag: 'qwen2.5-coder:7b',
    size: '4.7 GB',
    desc: 'Code generation, editing, and terminal tool execution',
  },
  {
    id: 'llama32',
    name: 'Llama 3.2 3B',
    tag: 'llama3.2:3b',
    size: '2.0 GB',
    desc: 'Fast, lightweight everyday assistant for low memory usage',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1 8B',
    tag: 'deepseek-r1:8b',
    size: '4.9 GB',
    desc: 'Chain-of-thought reasoning, logic, and math tasks',
  },
  {
    id: 'mistral',
    name: 'Mistral 7B Instruct',
    tag: 'mistral:7b',
    size: '4.1 GB',
    desc: 'General writing and instruction following',
  },
];

// GitHub-Fetched Verified MCP Plugins
interface GithubMcpPlugin {
  id: string;
  name: string;
  fullName: string;
  author: string;
  description: string;
  stars: number;
  imageUrl: string;
  command: string;
  args: string[];
}

const VERIFIED_GITHUB_PLUGINS: GithubMcpPlugin[] = [
  {
    id: 'playwright-mcp',
    name: 'Playwright Browser',
    fullName: 'microsoft/playwright-mcp',
    author: 'microsoft',
    description: 'Browser automation: navigate, fill forms, click elements and snapshot web pages.',
    stars: 45000,
    imageUrl: 'https://avatars.githubusercontent.com/u/6154722?v=4',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-playwright'],
  },
  {
    id: 'chrome-devtools-mcp',
    name: 'Chrome DevTools',
    fullName: 'ChromeDevTools/chrome-devtools-mcp',
    author: 'ChromeDevTools',
    description: 'Chrome DevTools protocol integration for agent debugging, network and DOM inspection.',
    stars: 55000,
    imageUrl: 'https://avatars.githubusercontent.com/u/11260967?v=4',
    command: 'npx',
    args: ['-y', 'chrome-devtools-mcp'],
  },
  {
    id: 'github-mcp',
    name: 'GitHub Tools',
    fullName: 'modelcontextprotocol/server-github',
    author: 'modelcontextprotocol',
    description: 'Read and manage GitHub repos, commits, PRs, issues and releases.',
    stars: 92000,
    imageUrl: 'https://avatars.githubusercontent.com/u/182288589?v=4',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
  },
  {
    id: 'postgres-mcp',
    name: 'PostgreSQL Database',
    fullName: 'modelcontextprotocol/server-postgres',
    author: 'modelcontextprotocol',
    description: 'Inspect schemas, execute read-only queries and query relational database records.',
    stars: 18000,
    imageUrl: 'https://avatars.githubusercontent.com/u/182288589?v=4',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
  },
  {
    id: 'sqlite-mcp',
    name: 'SQLite Database',
    fullName: 'modelcontextprotocol/server-sqlite',
    author: 'modelcontextprotocol',
    description: 'Direct SQL execution and table inspection over local SQLite database files.',
    stars: 12000,
    imageUrl: 'https://avatars.githubusercontent.com/u/182288589?v=4',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sqlite'],
  },
  {
    id: 'filesystem-mcp',
    name: 'Secure Filesystem',
    fullName: 'modelcontextprotocol/server-filesystem',
    author: 'modelcontextprotocol',
    description: 'Granular filesystem operations with restricted folder capabilities.',
    stars: 24000,
    imageUrl: 'https://avatars.githubusercontent.com/u/182288589?v=4',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem'],
  },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Reserved words that cannot be claimed as usernames or nicknames
const RESERVED_NAMES: string[] = [
  'ajx',
  'grokki',
  'grokki studio',
  'grokkistudio',
  'grokki_studio',
  'grokki-studio',
  'lonewolffsd',
  'itz_ajx',
  'itzajx',
  'itz-ajx',
  'admin',
  'administrator',
  'system',
  'root',
  'support',
  'official',
  'mod',
  'moderator',
  'bot',
  'ai',
];

// Offensive, racial slurs, and explicit adult terms
const OFFENSIVE_TERMS: string[] = [
  'nigger',
  'nigga',
  'n1gger',
  'n1gga',
  'faggot',
  'fag',
  'chink',
  'kike',
  'spic',
  'gook',
  'wetback',
  'tranny',
  'retard',
  'hitler',
  'nazi',
  'aryan',
  'kkk',
  'porn',
  'xxx',
  'sex',
  'sexy',
  'pussy',
  'dick',
  'cock',
  'cunt',
  'bitch',
  'whore',
  'slut',
  'motherfucker',
  'asshole',
  'bastard',
  'rape',
  'rapist',
  'penis',
  'vagina',
  'dildo',
  'pedophile',
  'pedo',
  'boobs',
  'tits',
  'blowjob',
  'cum',
  'hentai',
  'milf',
  'orgasm',
  'erotic',
  'masturbat',
];

const normalizeLeetspeak = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/\$/g, 's')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z0-9]/g, '');
};

const validateProfileField = (raw: string): string | null => {
  const val = raw.trim();
  if (!val) return null;

  const lower = val.toLowerCase();
  const cleaned = lower.replace(/[^a-z0-9]/g, '');
  const leet = normalizeLeetspeak(val);

  // 1. Reserved words check
  const isReserved = RESERVED_NAMES.some((r) => {
    const cleanR = r.replace(/[^a-z0-9]/g, '');
    return lower === r || cleaned === cleanR || leet === cleanR;
  });
  if (isReserved) {
    return 'This name is reserved.';
  }

  // 2. Offensive, racial slurs, adult terms check
  const isOffensive = OFFENSIVE_TERMS.some((term) => {
    const cleanTerm = term.replace(/[^a-z0-9]/g, '');
    return lower.includes(term) || cleaned.includes(cleanTerm) || leet.includes(cleanTerm);
  });
  if (isOffensive) {
    return 'Contains restricted or offensive language.';
  }

  if (val.length < 2) {
    return 'Must be at least 2 characters.';
  }

  return null;
};

// Tracks whether the list is at the top or bottom limits so blur ONLY displays when needed
const useScrollLimits = (ref: React.RefObject<HTMLDivElement | null>) => {
  const [canScrollUp, setCanScrollUp] = useState<boolean>(false);
  const [canScrollDown, setCanScrollDown] = useState<boolean>(false);

  const checkScroll = useCallback(() => {
    const el = ref.current;
    if (!el) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = el;
    // Upper part: ONLY blur if NOT touching the upper limit (scrolled down > 4px)
    setCanScrollUp(scrollTop > 4);
    // Lower part: ONLY blur if NOT touching the lower limit (more scrollable height > 6px)
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 6);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    const ro = new ResizeObserver(() => checkScroll());
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      ro.disconnect();
    };
  }, [ref, checkScroll]);

  return { canScrollUp, canScrollDown, checkScroll };
};

// Pure, crisp gradual blur without multi-pass bloom, halation, or glowing shine
interface ListEdgeBlurProps {
  position: 'top' | 'bottom';
  visible: boolean;
  height?: string;
}

const ListEdgeBlur: React.FC<ListEdgeBlurProps> = ({
  position,
  visible,
  height = '2.75rem',
}) => {
  const isTop = position === 'top';
  const mask = isTop
    ? 'linear-gradient(to top, transparent 0%, rgba(0, 0, 0, 0.4) 35%, rgba(0, 0, 0, 0.85) 75%, black 100%)'
    : 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.4) 35%, rgba(0, 0, 0, 0.85) 75%, black 100%)';

  return (
    <div
      aria-hidden="true"
      className={`absolute left-0 right-0 z-20 pointer-events-none transition-opacity duration-200 ${
        isTop ? 'top-0' : 'bottom-0'
      } ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        height,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
    </div>
  );
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  config,
  onChangeConfig,
  onComplete,
}) => {
  // Steps: 0 = Profile, 1 = Theme, 2 = Workspace Accounts, 3 = Models, 4 = GitHub Plugins, 5 = Enjoy
  const [step, setStep] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);

  // Step 0: User Profile - strictly empty by default (never prefilled)
  const [name, setName] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    const accountKey = (config.userName || 'local_user').trim().toLowerCase();
    return localStorage.getItem(`grokki_avatar_${accountKey}`) || AVATAR_PRESETS[0];
  });
  const [showAvatarPicker, setShowAvatarPicker] = useState<boolean>(false);

  // Profile validation
  const nameError = name.trim() ? validateProfileField(name) : null;
  const nicknameError = nickname.trim() ? validateProfileField(nickname) : null;
  const isProfileValid = Boolean(
    name.trim() &&
    nickname.trim() &&
    !nameError &&
    !nicknameError
  );

  // Step 1: Appearance
  const [theme, setTheme] = useState<'dark' | 'light'>(
    config.dashboardTheme === 'light' ? 'light' : 'dark'
  );

  // Step 2: Workspace Accounts Connection Status
  const [workspaceStatuses, setWorkspaceStatuses] = useState<Record<string, boolean>>({
    google: false,
    notion: false,
    github: false,
    obsidian: false,
    whatsapp: false,
  });
  const [connectingAccount, setConnectingAccount] = useState<string | null>(null);

  // Step 3: AI Models (Cloud vs Local)
  const [modelMode, setModelMode] = useState<'cloud' | 'local'>(
    config.provider === 'ollama' ? 'local' : 'cloud'
  );
  const [selectedLocalModel, setSelectedLocalModel] = useState<string>(
    config.ollamaModel || 'qwen2.5-coder:7b'
  );
  const [downloadingTag, setDownloadingTag] = useState<string | null>(null);
  const [downloadedTags, setDownloadedTags] = useState<Record<string, boolean>>({});

  // Step 4: GitHub MCP Plugins
  const [githubPlugins, setGithubPlugins] = useState<GithubMcpPlugin[]>(VERIFIED_GITHUB_PLUGINS);
  const [installedPlugins, setInstalledPlugins] = useState<Record<string, boolean>>({});
  const [installingPluginId, setInstallingPluginId] = useState<string | null>(null);

  const workspaceListRef = useRef<HTMLDivElement>(null);
  const pluginListRef = useRef<HTMLDivElement>(null);
  const localModelListRef = useRef<HTMLDivElement>(null);

  const workspaceScroll = useScrollLimits(workspaceListRef);
  const localModelScroll = useScrollLimits(localModelListRef);
  const pluginScroll = useScrollLimits(pluginListRef);

  // Rosie Neural Voice Guidance
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const speakRosie = useCallback(async (phrase: string) => {
    if (isMuted || !phrase) return;

    // Immediately stop previous speech so audio never clashes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(true);

    try {
      if (window.jarvisAPI?.speakText) {
        const res = await window.jarvisAPI.speakText(phrase, 'rosie', {
          provider: 'grokki_voice',
        });
        if (res && res.success && res.base64Audio) {
          const mime = res.mimeType || 'audio/mpeg';
          const audio = new Audio(`data:${mime};base64,${res.base64Audio}`);
          audioRef.current = audio;
          audio.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            audioRef.current = null;
          };
          await audio.play();
          return;
        }
      }

      // Web Speech API fallback with natural female voice
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.rate = 1.05;
        utterance.pitch = 1.1;
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find((v) =>
          (v.name.includes('Ava') || v.name.includes('Jenny') || v.name.includes('Natural') || v.name.includes('Zira')) &&
          v.lang.startsWith('en')
        ) || voices.find((v) => v.lang.startsWith('en'));
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    } catch (err) {
      console.warn('Rosie voice error:', err);
      setIsSpeaking(false);
    }
  }, [isMuted]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Section introductions
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentNick = nickname.trim() || name.trim() || 'there';
      switch (step) {
        case 0:
          speakRosie("Welcome to Grokki Studio! Let's get to know you. What should I call you?");
          break;
        case 1:
          speakRosie(`Nice to meet you, ${currentNick}! Do you prefer a sleek dark mode or crisp light mode?`);
          break;
        case 2:
          speakRosie("Let's connect your workspace accounts to sync docs, notes, and tasks. You can also skip ahead.");
          break;
        case 3:
          speakRosie("Time for your AI engine! Would you like cloud intelligence, or offline local models with Ollama?");
          break;
        case 4:
          speakRosie("Superpower Grokki with GitHub MCP plugins, or skip straight into the studio.");
          break;
        case 5:
          speakRosie(`All set, ${currentNick}! Grokki Studio is customized and ready for action.`);
          break;
        default:
          break;
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [step]);

  // Re-check scroll limits when step changes or content updates
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => workspaceScroll.checkScroll(), 60);
    } else if (step === 3) {
      setTimeout(() => localModelScroll.checkScroll(), 60);
    } else if (step === 4) {
      setTimeout(() => pluginScroll.checkScroll(), 60);
    }
  }, [step, modelMode, githubPlugins.length, Object.keys(workspaceStatuses).length]);

  // Live check on installed local Ollama models
  const checkInstalledOllamaModels = async () => {
    try {
      const endpoint = config.ollamaEndpoint || 'http://127.0.0.1:11434';
      let installedModelNames: string[] = [];

      // 1. Check via jarvisAPI.checkOllamaStatus
      if (window.jarvisAPI?.checkOllamaStatus) {
        try {
          const res = await window.jarvisAPI.checkOllamaStatus(endpoint);
          if (res && res.models && Array.isArray(res.models)) {
            installedModelNames = res.models.map((m: any) =>
              typeof m === 'string' ? m : m.name || ''
            );
          } else if (res && res.detailedModels && Array.isArray(res.detailedModels)) {
            installedModelNames = res.detailedModels.map((m) => m.name);
          }
        } catch (e) {
          console.warn('checkOllamaStatus error:', e);
        }
      }

      // 2. Direct Ollama API call if running locally
      if (installedModelNames.length === 0) {
        try {
          const cleanEndpoint = endpoint.replace(/\/+$/, '');
          const resp = await fetch(`${cleanEndpoint}/api/tags`);
          if (resp.ok) {
            const data = await resp.json();
            if (data && Array.isArray(data.models)) {
              installedModelNames = data.models.map((m: any) => m.name || m.model || '');
            }
          }
        } catch {}
      }

      // 3. Fallback to cachedProviderModels in config
      if (installedModelNames.length === 0 && config.cachedProviderModels?.ollama) {
        installedModelNames = config.cachedProviderModels.ollama;
      }

      if (installedModelNames.length > 0) {
        const installedMap: Record<string, boolean> = {};
        LOCAL_MODELS.forEach((m) => {
          const mTag = m.tag.toLowerCase();
          const mBase = mTag.split(':')[0];
          const isFound = installedModelNames.some((installed) => {
            const inTag = (installed || '').toLowerCase();
            const inBase = inTag.split(':')[0];
            return (
              inTag === mTag ||
              inTag === `${mBase}:latest` ||
              inBase === mBase ||
              inTag.startsWith(mBase)
            );
          });
          if (isFound) {
            installedMap[m.tag] = true;
          }
        });
        setDownloadedTags((prev) => ({ ...prev, ...installedMap }));
      }
    } catch (err) {
      console.warn('Failed to query installed Ollama models:', err);
    }
  };

  useEffect(() => {
    checkInstalledOllamaModels();
  }, []);

  useEffect(() => {
    if (step === 3 || modelMode === 'local') {
      checkInstalledOllamaModels();
    }
  }, [step, modelMode]);

  useEffect(() => {
    if (window.jarvisAPI?.onModelPullProgress) {
      const cleanup = window.jarvisAPI.onModelPullProgress((data: any) => {
        if (data && (data.status === 'success' || data.completed)) {
          checkInstalledOllamaModels();
          setDownloadingTag(null);
        }
      });
      return () => {
        if (typeof cleanup === 'function') cleanup();
      };
    }
  }, []);

  // Query live workspace connection statuses
  const checkLiveWorkspaceStatuses = async () => {
    try {
      const results: Record<string, boolean> = {
        google: false,
        notion: false,
        github: false,
        obsidian: false,
        whatsapp: false,
      };

      if (window.jarvisAPI?.getGoogleStatus) {
        const res = await window.jarvisAPI.getGoogleStatus();
        results.google = Boolean(res?.connected);
      }
      if (window.jarvisAPI?.getNotionStatus) {
        const res = await window.jarvisAPI.getNotionStatus();
        results.notion = Boolean(res?.connected);
      }
      if (window.jarvisAPI?.getGitHubStatus) {
        const res = await window.jarvisAPI.getGitHubStatus();
        results.github = Boolean(res?.connected);
      }
      if (window.jarvisAPI?.getObsidianStatus) {
        const res = await window.jarvisAPI.getObsidianStatus();
        results.obsidian = Boolean(res?.connected);
      }
      if (window.jarvisAPI?.getOpenWAStatus) {
        const res = await window.jarvisAPI.getOpenWAStatus();
        results.whatsapp = Boolean(res?.connected);
      }

      setWorkspaceStatuses(results);
    } catch {}
  };

  useEffect(() => {
    checkLiveWorkspaceStatuses();
  }, []);

  // Fetch live GitHub plugins if available
  useEffect(() => {
    if (window.jarvisAPI?.fetchMcpRegistry) {
      window.jarvisAPI.fetchMcpRegistry('').then((res) => {
        if (res && res.success && Array.isArray(res.servers) && res.servers.length > 0) {
          const mapped: GithubMcpPlugin[] = res.servers.slice(0, 15).map((s: any) => ({
            id: s.id,
            name: s.name,
            fullName: s.fullName || s.name,
            author: s.author || 'community',
            description: s.description || 'Model Context Protocol community server',
            stars: s.stars || 1000,
            imageUrl: s.imageUrl || 'https://avatars.githubusercontent.com/u/182288589?v=4',
            command: s.command || 'npx',
            args: s.args || ['-y', s.name],
          }));
          setGithubPlugins(mapped);
        }
      });
    }

    if (window.jarvisAPI?.getPlugins) {
      window.jarvisAPI.getPlugins().then((res) => {
        if (res && res.custom) {
          const map: Record<string, boolean> = {};
          res.custom.forEach((p: any) => {
            map[p.id] = true;
          });
          setInstalledPlugins(map);
        }
      });
    }
  }, []);

  // Account Connect Triggers
  const handleConnectAccount = async (id: WorkspaceAccount['id']) => {
    const acc = WORKSPACE_ACCOUNTS.find((a) => a.id === id);
    speakRosie(`Connecting ${acc?.name || id}.`);
    setConnectingAccount(id);
    try {
      if (id === 'google' && window.jarvisAPI?.connectGoogle) {
        await window.jarvisAPI.connectGoogle();
      } else if (id === 'notion' && window.jarvisAPI?.connectNotion) {
        await window.jarvisAPI.connectNotion();
      } else if (id === 'github' && window.jarvisAPI?.connectGitHub) {
        await window.jarvisAPI.connectGitHub();
      } else if (id === 'obsidian' && window.jarvisAPI?.selectWorkspaceFolder) {
        const res = await window.jarvisAPI.selectWorkspaceFolder();
        if (res?.success) {
          setWorkspaceStatuses((prev) => ({ ...prev, obsidian: true }));
        }
      } else if (id === 'whatsapp' && window.jarvisAPI?.startOpenWA) {
        await window.jarvisAPI.startOpenWA();
      }
      setTimeout(checkLiveWorkspaceStatuses, 2000);
    } catch (e) {
      console.warn('Account connect failed:', e);
    } finally {
      setConnectingAccount(null);
    }
  };

  // GitHub Plugin 1-Click Install
  const handleInstallPlugin = async (plugin: GithubMcpPlugin, e: React.MouseEvent) => {
    e.stopPropagation();
    speakRosie(`Installing ${plugin.name} plugin.`);
    setInstallingPluginId(plugin.id);
    try {
      if (window.jarvisAPI?.addCustomPlugin) {
        const res = await window.jarvisAPI.addCustomPlugin({
          id: plugin.id,
          name: plugin.name,
          description: plugin.description,
          category: 'mcp',
          icon: 'mcp',
          imageUrl: plugin.imageUrl,
          mcpServer: {
            transport: 'stdio',
            command: plugin.command,
            args: plugin.args,
          },
        });
        if (res?.success) {
          setInstalledPlugins((prev) => ({ ...prev, [plugin.id]: true }));
        }
      }
    } catch (err) {
      console.warn('Plugin install failed:', err);
    } finally {
      setInstallingPluginId(null);
    }
  };

  const handleSelectTheme = (nextTheme: 'dark' | 'light') => {
    setTheme(nextTheme);
    speakRosie(nextTheme === 'dark' ? 'Dark mode activated.' : 'Light mode activated.');
    onChangeConfig({ dashboardTheme: nextTheme });
    const isDark = nextTheme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
    if (window.jarvisAPI?.saveConfig) {
      window.jarvisAPI.saveConfig({ dashboardTheme: nextTheme });
    }
  };

  const handleDownloadModel = async (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const m = LOCAL_MODELS.find((item) => item.tag === tag);
    speakRosie(`Downloading ${m?.name || tag} to your device.`);
    setSelectedLocalModel(tag);
    setDownloadingTag(tag);
    try {
      if (window.jarvisAPI?.pullOllamaModel) {
        await window.jarvisAPI.pullOllamaModel({ modelTag: tag });
      }
      setDownloadedTags((prev) => ({ ...prev, [tag]: true }));
      await checkInstalledOllamaModels();
    } catch (err) {
      console.warn('Model pull failed:', err);
    } finally {
      setDownloadingTag(null);
    }
  };

  const goNext = () => {
    if (step === 0 && !isProfileValid) {
      return;
    }
    setDirection(1);
    if (step === 0) {
      const finalName = name.trim() || 'User';
      const finalNick = nickname.trim() || finalName;
      // speakRosie(`Got it, ${finalNick}! Moving to appearance.`);
      onChangeConfig({ userName: finalName, userNickname: finalNick });
      const accountKey = finalName.toLowerCase();
      try {
        localStorage.setItem(`grokki_avatar_${accountKey}`, selectedAvatar);
      } catch {}
      if (window.jarvisAPI?.saveConfig) {
        window.jarvisAPI.saveConfig({ userName: finalName, userNickname: finalNick });
      }
    } else if (step === 3) {
      if (modelMode === 'local') {
        onChangeConfig({ provider: 'ollama', ollamaModel: selectedLocalModel });
      } else {
        onChangeConfig({ provider: config.provider === 'ollama' ? 'gemini' : config.provider });
      }
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const goPrev = () => {
    setDirection(-1);
    speakRosie('Going back.');
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSkip = () => {
    setDirection(1);
    speakRosie('Skipping this step.');
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleFinish = async () => {
    const finalName = name.trim() || 'User';
    const finalNick = nickname.trim() || finalName;
    speakRosie(`Welcome aboard, ${finalNick}! Enjoy Grokki Studio.`);
    const patch: Partial<JarvisConfig> = {
      userName: finalName,
      userNickname: finalNick,
      dashboardTheme: theme,
      provider: modelMode === 'local' ? 'ollama' : (config.provider === 'ollama' ? 'gemini' : config.provider),
      ollamaModel: modelMode === 'local' ? selectedLocalModel : (config.ollamaModel || 'llama3.2'),
    };

    onChangeConfig(patch);
    if (window.jarvisAPI?.saveConfig) {
      window.jarvisAPI.saveConfig(patch);
    }

    try {
      const accountKey = finalName.toLowerCase();
      localStorage.setItem(`grokki_avatar_${accountKey}`, selectedAvatar);
      localStorage.setItem('grokki_onboarding_completed', 'true');
    } catch {}

    onComplete();
  };

  const stepVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      y: dir > 0 ? 14 : -14,
      filter: 'blur(6px)',
    }),
    center: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.42, ease: EASE },
    },
    exit: (dir: number) => ({
      opacity: 0,
      y: dir > 0 ? -14 : 14,
      filter: 'blur(6px)',
      transition: { duration: 0.26, ease: EASE },
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="fixed inset-0 z-[120] w-screen h-screen bg-[#07080b] text-white flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      

      {/* Full-Screen Crisp Threads Shader Background (Grokki Blue) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <Threads
          color="#3b82f6"
          accentColor="#60a5fa"
          amplitude={1.4}
          distance={0}
          enableMouseInteraction={true}
          lineCount={75}
          thickness={0.6}
          softness={1.3}
          speed={0.22}
          waves={3}
          taper={0.85}
          opacity={0.4}
        />
      </div>

      {/* Subtle Vignette Gradient */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(7,8,11,0.55) 0%, rgba(7,8,11,0.88) 75%, #07080b 100%)',
        }}
      />

      {/* Center Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto px-6">
        {/* Top Centered Brand Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <img
            src={grokkiLogo}
            alt="Grokki"
            className="w-16 h-16 -mb-3 object-contain"
            draggable={false}
          />
          {/* <img
            src={grokkiWordmark}
            alt="Grokki Studio"
            className="h-5 w-auto object-contain"
            draggable={false}
          /> */}
        </div>

        {/* Dynamic Step Content */}
        <div className="w-full">
          <AnimatePresence mode="wait" custom={direction}>
            {/* STEP 0: Welcome & Profile */}
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col items-center w-full"
              >
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white text-center">
                  Welcome to Grokki Studio
                </h1>
                <p className="text-sm text-neutral-400 text-center mt-2 mb-8 max-w-md">
                  Set your name, preferred nickname, and profile icon.
                </p>

                <div className="w-full flex flex-col gap-3">
                  {/* Row 1: Icon Option Button + Full Name */}
                  <div
                    className={`flex flex-col px-4 py-3 rounded-2xl bg-white/[0.03] border transition-colors ${
                      nameError
                        ? 'border-rose-500/60 focus-within:border-rose-400'
                        : 'border-white/[0.1] focus-within:border-white/40'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setShowAvatarPicker((v) => !v)}
                        title="Choose profile icon"
                        className="relative w-11 h-11 rounded-xl backdrop-blur-md overflow-hidden border border-white/20 hover:border-white transition-all shrink-0 cursor-pointer group"
                      >
                        <img
                          src={selectedAvatar}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[11px] font-medium text-white">
                          Edit
                        </div>
                      </button>

                      <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-neutral-400">
                            Your Name <span className="text-red-500 font-semibold">*</span>
                          </span>
                          {!name.trim() && (
                            <span className="text-[10px] text-neutral-500 font-medium tracking-wide">
                              Required
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && isProfileValid) goNext();
                          }}
                          placeholder="Enter your name"
                          autoFocus
                          required
                          className="w-full bg-transparent text-sm font-medium text-white placeholder-neutral-600 focus:outline-none mt-0.5"
                        />
                      </div>

                      
                    </div>

                    {nameError && (
                      <div className="text-[11px] text-rose-400 font-medium mt-1.5 pl-[60px]">
                        {nameError}
                      </div>
                    )}
                  </div>

                  {/* Expandable Icon / Avatar Picker Row */}
                  <AnimatePresence>
                    {showAvatarPicker && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                          <span className="text-xs text-neutral-400">Select icon</span>
                          <div className="flex items-center gap-2">
                            {AVATAR_PRESETS.map((url, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setSelectedAvatar(url);
                                  setShowAvatarPicker(false);
                                }}
                                className={`w-9 h-9 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                                  selectedAvatar === url
                                    ? 'border-white scale-105'
                                    : 'border-white/10 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <img
                                  src={url}
                                  alt={`Icon ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Row 2: Preferred Nickname */}
                  <div
                    className={`flex flex-col px-4 py-3 rounded-2xl bg-white/[0.03] border transition-colors ${
                      nicknameError
                        ? 'border-rose-500/60 focus-within:border-rose-400'
                        : 'border-white/[0.1] focus-within:border-white/40'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-neutral-300">
                        <AtSign className="w-5 h-5" />
                      </div>

                      <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-neutral-400">
                            Preferred Nickname <span className="text-red-500 font-semibold">*</span>
                          </span>
                          {!nickname.trim() && (
                            <span className="text-[10px] text-neutral-500 font-medium tracking-wide">
                              Required
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && isProfileValid) goNext();
                          }}
                          placeholder="How Grokki should address you"
                          required
                          className="w-full bg-transparent text-sm font-medium text-white placeholder-neutral-600 focus:outline-none mt-0.5"
                        />
                      </div>
                    </div>

                    {nicknameError && (
                      <div className="text-[11px] text-rose-400 font-medium mt-1.5 pl-[60px]">
                        {nicknameError}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 1: Appearance (Light vs Dark) */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col items-center w-full"
              >
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white text-center">
                  Choose your appearance
                </h1>
                <p className="text-sm text-neutral-400 text-center mt-2 mb-8 max-w-md">
                  Select your preferred interface mode for Grokki Studio.
                </p>

                <div className="w-full flex flex-col gap-3">
                  {/* Dark Mode Row */}
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('dark')}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-white/[0.08] border-white'
                        : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shrink-0 text-white">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">Dark Mode</div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        Low-glare dark surface built for focused sessions
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        theme === 'dark'
                          ? 'bg-white border-white text-black'
                          : 'border-white/20'
                      }`}
                    >
                      {theme === 'dark' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>

                  {/* Light Mode Row */}
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('light')}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-white/[0.08] border-white'
                        : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shrink-0 text-white">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">Light Mode</div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        Clean high-contrast daylight interface
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        theme === 'light'
                          ? 'bg-white border-white text-black'
                          : 'border-white/20'
                      }`}
                    >
                      {theme === 'light' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Workspace Accounts (Google, Notion, GitHub, Obsidian, WhatsApp) */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col items-center w-full"
              >
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white text-center">
                  Add your workspace
                </h1>
                <p className="text-sm text-neutral-400 text-center mt-2 mb-7 max-w-md">
                  Connect your workspace accounts to sync documents, schedule, and notes.
                </p>

                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full overflow-hidden rounded-2xl">
                    <ListEdgeBlur
                      position="top"
                      visible={workspaceScroll.canScrollUp}
                      height="2.5rem"
                    />

                    <div
                      ref={workspaceListRef}
                      className="w-full max-h-[268px] overflow-y-auto flex flex-col gap-2.5 pr-1 scroll-smooth"
                    >
                      {WORKSPACE_ACCOUNTS.map((acc) => {
                      const isConnected = Boolean(workspaceStatuses[acc.id]);
                      const isConnecting = connectingAccount === acc.id;

                      return (
                        <div
                          key={acc.id}
                          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-all shrink-0"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center p-2 shrink-0">
                            <img
                              src={acc.logo}
                              alt={acc.name}
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white flex items-center gap-2">
                              <span>{acc.name}</span>
                              {isConnected && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.1] text-white border border-white/20">
                                  Connected
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-400 truncate mt-0.5">
                              {acc.desc}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isConnecting}
                            onClick={() => handleConnectAccount(acc.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                              isConnected
                                ? 'bg-white/[0.08] text-white border border-white/20 hover:bg-white/[0.14]'
                                : 'bg-white text-black hover:bg-neutral-200'
                            }`}
                          >
                            {isConnecting
                              ? 'Connecting...'
                              : isConnected
                              ? 'Reconnect'
                              : 'Connect'}
                          </button>
                        </div>
                      );
                    })}
                    </div>

                    <ListEdgeBlur
                      position="bottom"
                      visible={workspaceScroll.canScrollDown}
                      height="2.8rem"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      workspaceListRef.current?.scrollBy({ top: 90, behavior: 'smooth' })
                    }
                    className="mt-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                    aria-label="Scroll more workspace accounts"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Cloud vs Local Models */}
            {step === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col items-center w-full"
              >
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white text-center">
                  Choose your AI models
                </h1>
                <p className="text-sm text-neutral-400 text-center mt-2 mb-7 max-w-md">
                  Use cloud-integrated providers or run local models offline on your device.
                </p>

                <div className="w-full flex flex-col gap-3">
                  {/* Cloud Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setModelMode('cloud');
                      speakRosie('Cloud models selected. Fast and versatile.');
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      modelMode === 'cloud'
                        ? 'bg-white/[0.08] border-white'
                        : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shrink-0 text-white">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">
                        Cloud Integrated Models
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        Gemini, OpenAI, Claude, Groq, DeepSeek, and OpenRouter
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        modelMode === 'cloud'
                          ? 'bg-white border-white text-black'
                          : 'border-white/20'
                      }`}
                    >
                      {modelMode === 'cloud' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>

                  {/* Local Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setModelMode('local');
                      checkInstalledOllamaModels();
                      speakRosie('Local models selected. Offline and completely private.');
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      modelMode === 'local'
                        ? 'bg-white/[0.08] border-white'
                        : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shrink-0 p-2">
                      <img
                        src={ollamaLogo}
                        alt="Ollama"
                        className="w-full h-full object-contain invert dark:invert-0"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">
                        Local Models (Ollama)
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        Run open-weight models privately on your own hardware
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        modelMode === 'local'
                          ? 'bg-white border-white text-black'
                          : 'border-white/20'
                      }`}
                    >
                      {modelMode === 'local' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>

                  {/* Expandable Local Models to Download */}
                  <AnimatePresence>
                    {modelMode === 'local' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="overflow-hidden pt-1 flex flex-col items-center w-full"
                      >
                        <div className="relative w-full overflow-hidden rounded-2xl">
                          <ListEdgeBlur
                            position="top"
                            visible={localModelScroll.canScrollUp}
                            height="2rem"
                          />

                          <div
                            ref={localModelListRef}
                            className="w-full max-h-[190px] overflow-y-auto flex flex-col gap-2 pr-1 scroll-smooth"
                          >
                            {LOCAL_MODELS.map((m) => {
                              const isSelected = selectedLocalModel === m.tag;
                              const isDownloaded = downloadedTags[m.tag];
                              const isPulling = downloadingTag === m.tag;

                              return (
                                <div
                                  key={m.id}
                                  onClick={() => {
                                    setSelectedLocalModel(m.tag);
                                    checkInstalledOllamaModels();
                                  }}
                                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-white/[0.07] border-white/60'
                                      : 'bg-white/[0.02] border-white/[0.07] hover:border-white/20'
                                  }`}
                                >
                                  <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center p-2 shrink-0">
                                    <img
                                      src={ollamaLogo}
                                      alt="Ollama"
                                      className="w-full h-full object-contain"
                                    />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-white">
                                        {m.name}
                                      </span>
                                      <span className="text-[11px] font-mono text-neutral-500">
                                        {m.size}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                                      {m.desc}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={isPulling || isDownloaded}
                                    onClick={(e) => handleDownloadModel(m.tag, e)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                                      isDownloaded
                                        ? 'bg-white text-black'
                                        : 'bg-white/[0.08] hover:bg-white hover:text-black text-white border border-white/10'
                                    }`}
                                  >
                                    {isDownloaded ? (
                                      <>
                                        <Check className="w-3 h-3 stroke-[2.5]" />
                                        <span>Installed</span>
                                      </>
                                    ) : isPulling ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        <span>Pulling</span>
                                      </>
                                    ) : (
                                      <>
                                        <Download className="w-3 h-3" />
                                        <span>Download</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          <ListEdgeBlur
                            position="bottom"
                            visible={localModelScroll.canScrollDown}
                            height="2.5rem"
                          />
                        </div>

                          <button
                            type="button"
                            onClick={() =>
                              localModelListRef.current?.scrollBy({ top: 80, behavior: 'smooth' })
                            }
                            className="mt-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                            aria-label="Scroll more models"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* STEP 4: GitHub-Fetched Plugins */}
            {step === 4 && (
              <motion.div
                key="step-4"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col items-center w-full"
              >
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white text-center">
                  Integrate plugins
                </h1>
                <p className="text-sm text-neutral-400 text-center mt-2 mb-7 max-w-md">
                  Browse and install Model Context Protocol (MCP) plugins from GitHub.
                </p>

                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full overflow-hidden rounded-2xl">
                    <ListEdgeBlur
                      position="top"
                      visible={pluginScroll.canScrollUp}
                      height="2.5rem"
                    />

                    <div
                      ref={pluginListRef}
                      className="w-full max-h-[268px] overflow-y-auto flex flex-col gap-2.5 pr-1 scroll-smooth"
                    >
                    {githubPlugins.map((p) => {
                      const isInstalled = Boolean(installedPlugins[p.id]);
                      const isInstalling = installingPluginId === p.id;

                      return (
                        <div
                          key={p.id}
                          className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-all shrink-0"
                        >
                          <img
                            src={p.imageUrl}
                            alt={p.author}
                            className="w-10 h-10 rounded-xl object-cover border border-white/[0.1] shrink-0 bg-neutral-900"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">
                                {p.name}
                              </span>
                              <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
                                <Star className="w-3 h-3 text-neutral-400 fill-neutral-400" />
                                {p.stars >= 1000 ? `${(p.stars / 1000).toFixed(0)}k` : p.stars}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-400 truncate mt-0.5">
                              {p.description}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isInstalling || isInstalled}
                            onClick={(e) => handleInstallPlugin(p, e)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                              isInstalled
                                ? 'bg-white/[0.08] text-white border border-white/20'
                                : 'bg-white text-black hover:bg-neutral-200'
                            }`}
                          >
                            {isInstalling ? (
                              'Installing...'
                            ) : isInstalled ? (
                              <span className="flex items-center gap-1.5">
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                <span>Installed</span>
                              </span>
                            ) : (
                              'Install'
                            )}
                          </button>
                        </div>
                      );
                    })}
                    </div>

                    <ListEdgeBlur
                      position="bottom"
                      visible={pluginScroll.canScrollDown}
                      height="2.8rem"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      pluginListRef.current?.scrollBy({ top: 90, behavior: 'smooth' })
                    }
                    className="mt-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                    aria-label="Scroll more plugins"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Final Customized Screen */}
            {step === 5 && (
              <motion.div
                key="step-5"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col items-center w-full"
              >
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white text-center">
                  Enjoy Grokki Studio
                </h1>
                <p className="text-sm text-neutral-400 text-center mt-2 mb-8 max-w-md">
                  Grokki Studio has been customized to your preferences.
                </p>

                <div className="w-full flex flex-col gap-3">
                  <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <img
                      src={selectedAvatar}
                      alt="Profile"
                      className="w-11 h-11 rounded-xl object-cover border border-white/15 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {name.trim() || 'User'}{' '}
                        {nickname.trim() ? `(${nickname.trim()})` : ''}
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5 capitalize">
                        {theme} mode •{' '}
                        {modelMode === 'local'
                          ? `Local (${selectedLocalModel})`
                          : 'Cloud models'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center shrink-0 text-white">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">
                        Connected Integrations
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {Object.values(workspaceStatuses).filter(Boolean).length} workspace accounts linked
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Edge Navigation Buttons */}
      <div className="relative z-10 w-full pb-10 pt-4 flex items-center justify-center gap-3 px-6">
        {step > 0 && (
          <button
            type="button"
            onClick={goPrev}
            className="h-10 px-5 rounded-xl text-xs font-medium text-neutral-300 bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.1] transition-colors cursor-pointer"
          >
            Previous
          </button>
        )}

        {(step === 2 || step === 3 || step === 4) && (
          <button
            type="button"
            onClick={handleSkip}
            className="h-10 px-5 rounded-xl text-xs font-medium text-neutral-400 bg-white/[0.02] hover:bg-white/[0.07] hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
          >
            Skip
          </button>
        )}

        {step < 5 ? (
          <button
            type="button"
            disabled={step === 0 && !isProfileValid}
            onClick={goNext}
            className={`h-10 px-6 rounded-xl text-xs font-semibold transition-all ${
              step === 0 && !isProfileValid
                ? 'bg-white/20 text-neutral-500 cursor-not-allowed opacity-40'
                : 'bg-white text-black hover:bg-neutral-200 active:scale-[0.98] cursor-pointer'
            }`}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="h-10 px-7 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer"
          >
            Continue
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default OnboardingModal;
