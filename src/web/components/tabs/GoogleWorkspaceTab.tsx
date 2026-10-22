import React, { useState, useEffect } from 'react';
import {
  Mail,
  Calendar,
  Folder,
  Table,
  FileText,
  CheckSquare,
  GraduationCap,
  Check,
  Loader2,
  Search,
  BookOpen,
  Key,
  ChevronDown,
  Network,
  Layers,
  ExternalLink,
  GitBranch,
  GitCommit,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  FolderGit2,
  Star,
  GitFork,
  Lock,
  Globe,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  MessageSquare,
  Send,
  Share2,
  Mic,
  Play,
  Music,
  ListMusic,
  Radio,
} from 'lucide-react';
import {
  JarvisConfig,
  GoogleProfile,
  NotionProfile,
  GitHubProfile,
  GitHubRepo,
  GitStatusResponse,
} from '../../types/jarvis';

import googleLogo from '../../assets/logos/google.png';
import whatsappLogo from '../../assets/logos/whatsapp.svg';
import spotifyLogo from '../../assets/logos/spotify.svg';
import applemusicLogo from '../../assets/logos/applemusic.svg';
import ytmusicLogo from '../../assets/logos/ytmusic.svg';
import amazonmusicLogo from '../../assets/logos/amazonmusic.svg';
import soundcloudLogo from '../../assets/logos/soundcloud.svg';
import notionLogo from '../../assets/logos/notion.png';
import obsidianLogo from '../../assets/logos/obsidian.png';
import githubLogo from '../../assets/logos/github.png';

import GlideSelect, { GlideSelectOption } from '../../../effects/GlideSelect';

export interface MusicService {
  id: string;
  name: string;
  logo: string;
  appUrl: string;
  webUrl: string;
}

export const MUSIC_SERVICES: Record<string, MusicService> = {
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    logo: spotifyLogo,
    appUrl: 'spotify://',
    webUrl: 'https://open.spotify.com',
  },
  applemusic: {
    id: 'applemusic',
    name: 'Apple Music',
    logo: applemusicLogo,
    appUrl: 'music://',
    webUrl: 'https://music.apple.com',
  },
  ytmusic: {
    id: 'ytmusic',
    name: 'YouTube Music',
    logo: ytmusicLogo,
    appUrl: 'https://music.youtube.com',
    webUrl: 'https://music.youtube.com',
  },
  amazonmusic: {
    id: 'amazonmusic',
    name: 'Amazon Music',
    logo: amazonmusicLogo,
    appUrl: 'https://music.amazon.com',
    webUrl: 'https://music.amazon.com',
  },
  soundcloud: {
    id: 'soundcloud',
    name: 'SoundCloud',
    logo: soundcloudLogo,
    appUrl: 'https://soundcloud.com',
    webUrl: 'https://soundcloud.com',
  },
};

// Official Authentic Google Brand Logo
const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <img src={googleLogo} alt="Google" className={`${className} object-contain`} />
);

// Official Authentic WhatsApp Brand Logo
export const WhatsAppLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <img src={whatsappLogo} alt="WhatsApp" className={`${className} object-contain`} />
);

// Official Authentic Notion Brand Logo
const NotionLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <img src={notionLogo} alt="Notion" className={`${className} object-contain`} />
);

// Official Authentic Obsidian Brand Logo
const ObsidianLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <img src={obsidianLogo} alt="Obsidian" className={`${className} object-contain`} />
);

// Official Authentic GitHub Brand Logo
const GitHubLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <img
    src={githubLogo}
    alt="GitHub"
    className={`${className} object-contain transition-all dark:brightness-0 dark:invert`}
  />
);

interface GoogleWorkspaceTabProps {
  connected: boolean;
  profile: GoogleProfile | null;
  onRefreshStatus: () => void;
  config?: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
}

export const GoogleWorkspaceTab = React.memo<GoogleWorkspaceTabProps>(({
  connected,
  profile,
  onRefreshStatus,
  config,
  onChangeConfig,
}) => {
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [googleExpanded, setGoogleExpanded] = useState(true);

  // WhatsApp State (Auto-connected)
  const [whatsappExpanded, setWhatsappExpanded] = useState(false);

  const handleOpenWhatsApp = () => {
    if (window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl('whatsapp://').catch(() => {
        window.jarvisAPI?.openUrl('https://web.whatsapp.com');
      });
    } else {
      try {
        window.open('https://web.whatsapp.com', '_blank');
      } catch (e) {
        console.warn('[GoogleWorkspaceTab] Failed to open WhatsApp:', e);
      }
    }
  };

  // Music Streaming State - synced with central Grokki config
  const selectedMusic = config?.musicProvider || 'spotify';
  const [musicExpanded, setMusicExpanded] = useState(false);

  const currentMusic =
    (MUSIC_SERVICES && MUSIC_SERVICES[selectedMusic]) ||
    (MUSIC_SERVICES && MUSIC_SERVICES.spotify) || {
      id: 'spotify',
      name: 'Spotify',
      logo: '',
      appUrl: 'spotify://',
      webUrl: 'https://open.spotify.com',
    };

  const handleMusicChange = (val: string) => {
    if (onChangeConfig) {
      onChangeConfig({ musicProvider: val });
    }
    if (window.jarvisAPI?.saveConfig) {
      window.jarvisAPI.saveConfig({ musicProvider: val });
    }
  };

  const handleOpenMusic = () => {
    const target = currentMusic.appUrl || currentMusic.webUrl;
    if (window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl(target).catch(() => {
        if (currentMusic.webUrl && currentMusic.webUrl !== target) {
          window.jarvisAPI?.openUrl(currentMusic.webUrl);
        }
      });
    } else {
      try {
        window.open(currentMusic.webUrl, '_blank');
      } catch (e) {
        console.warn('[GoogleWorkspaceTab] Failed to open Music:', e);
      }
    }
  };

  // Notion State
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionProfile, setNotionProfile] = useState<NotionProfile | null>(null);
  const [connectingNotion, setConnectingNotion] = useState(false);
  const [notionExpanded, setNotionExpanded] = useState(false);
  const [showTokenFallback, setShowTokenFallback] = useState(false);
  const [notionToken, setNotionToken] = useState('');
  const [notionStatusMessage, setNotionStatusMessage] = useState<string | null>(null);
  const [notionError, setNotionError] = useState<string | null>(null);

  // Obsidian State
  const [obsidianConnected, setObsidianConnected] = useState(false);
  const [obsidianVaultName, setObsidianVaultName] = useState<string | null>(null);
  const [obsidianVaultPath, setObsidianVaultPath] = useState<string | null>(null);
  const [obsidianNotesCount, setObsidianNotesCount] = useState<number>(0);
  const [obsidianExpanded, setObsidianExpanded] = useState(false);
  const [selectingVault, setSelectingVault] = useState(false);

  // GitHub & Git CLI State
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [githubExpanded, setGithubExpanded] = useState(false);
  const [connectingGitHub, setConnectingGitHub] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [showGitHubTokenInput, setShowGitHubTokenInput] = useState(false);
  const [showTokenSecret, setShowTokenSecret] = useState(false);
  const [githubStatusMessage, setGithubStatusMessage] = useState<string | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [showGitHubOAuthModal, setShowGitHubOAuthModal] = useState(false);
  const [githubClientId, setGithubClientId] = useState('');
  const [githubClientSecret, setGithubClientSecret] = useState('');
  const [savingOAuthCreds, setSavingOAuthCreds] = useState(false);
  const [githubAuthMode, setGithubAuthMode] = useState<'oauth' | 'pat'>('oauth');
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [githubSubTab, setGithubSubTab] = useState<'local' | 'cloud'>('local');
  const [isDefaultOAuth, setIsDefaultOAuth] = useState(true);

  // Local Git Workspace State
  const [gitStatus, setGitStatus] = useState<GitStatusResponse | null>(null);
  const [loadingGitStatus, setLoadingGitStatus] = useState(false);
  const [gitActionLoading, setGitActionLoading] = useState<'fetch' | 'pull' | 'push' | 'commit' | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [gitActionResult, setGitActionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Cloud Repos State
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [repoFilter, setRepoFilter] = useState<'all' | 'public' | 'private'>('all');
  const [cloningRepoId, setCloningRepoId] = useState<number | null>(null);

  const notifyAccordionToggled = () => {
    requestAnimationFrame(() => {
      if ((window as any).__lenis) {
        (window as any).__lenis.resize();
      }
    });
  };

  const filteredRepos = useMemo(() => {
    return repos.filter((r) => {
      const matchesType =
        repoFilter === 'all' ? true :
        repoFilter === 'public' ? !r.private :
        r.private;
      if (!matchesType) return false;
      if (!repoSearch.trim()) return true;
      const q = repoSearch.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.language && r.language.toLowerCase().includes(q))
      );
    });
  }, [repos, repoFilter, repoSearch]);

  const publicReposCount = useMemo(() => repos.filter((r) => !r.private).length, [repos]);
  const privateReposCount = useMemo(() => repos.filter((r) => r.private).length, [repos]);

  useEffect(() => {
    loadNotionStatus();
    loadObsidianStatus();
    loadGitHubStatus();
    loadGitStatus();

    let unsubNotion: (() => void) | undefined;
    if (window.jarvisAPI?.onNotionConnected) {
      unsubNotion = window.jarvisAPI.onNotionConnected((newProfile) => {
        setNotionConnected(true);
        setNotionProfile(newProfile);
        setConnectingNotion(false);
        setShowTokenFallback(false);
        setNotionError(null);
        setNotionStatusMessage(null);
      });
    }

    let unsubGitHub: (() => void) | undefined;
    if (window.jarvisAPI?.onGitHubConnected) {
      unsubGitHub = window.jarvisAPI.onGitHubConnected((newProfile) => {
        setGithubConnected(true);
        setGithubProfile(newProfile);
        setConnectingGitHub(false);
        setShowGitHubOAuthModal(false);
        setShowGitHubTokenInput(false);
        setGithubStatusMessage(null);
        setGithubError(null);
        loadGitHubRepos();
      });
    }

    return () => {
      if (unsubNotion) unsubNotion();
      if (unsubGitHub) unsubGitHub();
    };
  }, []);

  const loadNotionStatus = async () => {
    if (!window.jarvisAPI?.getNotionStatus) return;
    try {
      const res = await window.jarvisAPI.getNotionStatus();
      if (res && res.connected) {
        setNotionConnected(true);
        setNotionProfile(res.profile || null);
      } else {
        setNotionConnected(false);
        setNotionProfile(null);
      }
    } catch (e) {
      setNotionConnected(false);
      setNotionProfile(null);
    }
  };

  const loadObsidianStatus = async () => {
    if (!window.jarvisAPI?.getObsidianStatus) return;
    try {
      const res = await window.jarvisAPI.getObsidianStatus();
      if (res && res.connected) {
        setObsidianConnected(true);
        setObsidianVaultName(res.vaultName || null);
        setObsidianVaultPath(res.vaultPath || null);
        setObsidianNotesCount(res.notesCount || 0);
      } else {
        setObsidianConnected(false);
        setObsidianVaultName(null);
        setObsidianVaultPath(null);
        setObsidianNotesCount(0);
      }
    } catch (e) {
      setObsidianConnected(false);
    }
  };

  const handleConnectGoogle = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.connectGoogle) return;
    setConnectingGoogle(true);
    try {
      const res = await window.jarvisAPI.connectGoogle();
      if (res && res.success) {
        onRefreshStatus();
      } else {
        alert('Google Auth: ' + (res?.message || res?.error || 'Authorization incomplete'));
      }
    } catch (err: any) {
      alert('Google Auth Error: ' + err.message);
    } finally {
      setConnectingGoogle(false);
      onRefreshStatus();
    }
  };

  const handleConnectNotionOAuth = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.connectNotion) return;
    setConnectingNotion(true);
    setNotionError(null);
    setNotionStatusMessage('Opening Notion in your browser...');

    try {
      const res = await window.jarvisAPI.connectNotion();
      if (res && res.success) {
        setNotionStatusMessage('Browser opened! Select your Notion workspace and click "Allow access" to connect.');
      } else if (res && res.needsInput) {
        setShowTokenFallback(true);
      } else {
        setNotionError(res?.error || res?.message || 'Failed to start Notion OAuth flow.');
        setConnectingNotion(false);
      }
    } catch (err: any) {
      setNotionError(err.message || 'Error connecting to Notion');
      setConnectingNotion(false);
    }
  };

  const handleConnectNotionToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.jarvisAPI?.connectNotion || !notionToken.trim()) return;

    setConnectingNotion(true);
    setNotionError(null);

    try {
      const res = await window.jarvisAPI.connectNotion(notionToken.trim());
      if (res && res.success) {
        setNotionConnected(true);
        setNotionProfile(res.profile || null);
        setShowTokenFallback(false);
        setNotionToken('');
      } else {
        setNotionError(res?.error || res?.message || 'Token verification failed.');
      }
    } catch (err: any) {
      setNotionError(err.message || 'Error verifying token');
    } finally {
      setConnectingNotion(false);
    }
  };

  const handleDisconnectNotion = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.disconnectNotion) return;
    try {
      await window.jarvisAPI.disconnectNotion();
      setNotionConnected(false);
      setNotionProfile(null);
      setShowTokenFallback(false);
      setNotionError(null);
      setNotionStatusMessage(null);
    } catch (e) {
      console.error('Failed to disconnect Notion:', e);
    }
  };

  const handleSelectObsidianVault = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.selectObsidianVault) return;
    setSelectingVault(true);
    try {
      const res = await window.jarvisAPI.selectObsidianVault();
      if (res && res.success) {
        setObsidianConnected(true);
        setObsidianVaultName(res.vaultName || null);
        setObsidianVaultPath(res.vaultPath || null);
        setObsidianNotesCount(res.notesCount || 0);
      }
    } catch (err: any) {
      alert('Failed to select Obsidian vault: ' + err.message);
    } finally {
      setSelectingVault(false);
    }
  };

  const handleDisconnectObsidian = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.disconnectObsidian) return;
    try {
      await window.jarvisAPI.disconnectObsidian();
      setObsidianConnected(false);
      setObsidianVaultName(null);
      setObsidianVaultPath(null);
      setObsidianNotesCount(0);
    } catch (e) {
      console.error('Failed to disconnect Obsidian:', e);
    }
  };

  const handleOpenInObsidian = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.jarvisAPI?.openObsidianVault) {
      window.jarvisAPI.openObsidianVault();
    }
  };

  const loadGitHubStatus = async () => {
    if (!window.jarvisAPI?.getGitHubStatus) return;
    try {
      const res = await window.jarvisAPI.getGitHubStatus();
      if (res && res.connected) {
        setGithubConnected(true);
        setGithubProfile(res.profile || null);
        setIsDefaultOAuth(Boolean(res.isDefaultToken));
        loadGitHubRepos();
      } else {
        setGithubConnected(false);
        setGithubProfile(null);
      }
    } catch {
      setGithubConnected(false);
      setGithubProfile(null);
    }
  };

  const loadGitHubRepos = async () => {
    if (!window.jarvisAPI?.getGitHubRepos) return;
    setLoadingRepos(true);
    try {
      const res = await window.jarvisAPI.getGitHubRepos({ maxRepos: 300, sort: 'updated' });
      if (res && res.success && res.repos) {
        setRepos(res.repos);
      }
    } catch (e) {
      console.warn('Failed to load GitHub repos:', e);
    } finally {
      setLoadingRepos(false);
    }
  };

  const loadGitStatus = async (cwd?: string) => {
    if (!window.jarvisAPI?.getGitStatus) return;
    setLoadingGitStatus(true);
    try {
      const res = await window.jarvisAPI.getGitStatus(cwd);
      if (res && res.success) {
        setGitStatus(res);
      }
    } catch (e) {
      console.warn('Failed to load Git status:', e);
    } finally {
      setLoadingGitStatus(false);
    }
  };

  const handleConnectGitHubOAuth = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.connectGitHub) return;
    setConnectingGitHub(true);
    setGithubError(null);
    setGithubStatusMessage('Opening GitHub authorization in your browser...');
    try {
      const res = await window.jarvisAPI.connectGitHub();
      if (res && res.success) {
        if (res.mode === 'oauth') {
          setGithubStatusMessage('Browser opened! Authorize Grokki in GitHub to complete connection.');
        } else {
          setGithubConnected(true);
          setGithubProfile(res.profile || null);
          setIsDefaultOAuth(true);
          setShowGitHubTokenInput(false);
          setShowGitHubOAuthModal(false);
          setGithubStatusMessage(null);
          loadGitHubRepos();
        }
      } else if (res && res.needsCredentials) {
        setShowGitHubOAuthModal(true);
        setGithubExpanded(true);
        setGithubStatusMessage(null);
        setConnectingGitHub(false);
      } else {
        setGithubError(res?.error || res?.message || 'Failed to start GitHub OAuth flow.');
        setGithubStatusMessage(null);
        setConnectingGitHub(false);
      }
    } catch (err: any) {
      setGithubError(err.message || 'Failed to connect with GitHub OAuth');
      setGithubStatusMessage(null);
      setConnectingGitHub(false);
    }
  };

  const handleSaveGitHubCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubClientId.trim() || !githubClientSecret.trim()) return;
    if (!window.jarvisAPI?.saveGitHubOAuth) return;
    setSavingOAuthCreds(true);
    setGithubError(null);
    try {
      const res = await window.jarvisAPI.saveGitHubOAuth({
        clientId: githubClientId.trim(),
        clientSecret: githubClientSecret.trim(),
      });
      if (res && res.success) {
        setShowGitHubOAuthModal(false);
        setSavingOAuthCreds(false);
        handleConnectGitHubOAuth();
      } else {
        setGithubError(res?.error || 'Failed to save GitHub credentials.');
        setSavingOAuthCreds(false);
      }
    } catch (err: any) {
      setGithubError(err.message || 'Failed to save credentials.');
      setSavingOAuthCreds(false);
    }
  };

  const handleOpenGitHubPortal = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.jarvisAPI?.openGitHubPortal) {
      await window.jarvisAPI.openGitHubPortal();
    }
  };

  const handleConnectCustomGitHubToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim() || !window.jarvisAPI?.connectGitHub) return;
    setConnectingGitHub(true);
    setGithubError(null);
    try {
      const res = await window.jarvisAPI.connectGitHub(githubToken.trim());
      if (res && res.success) {
        setGithubConnected(true);
        setGithubProfile(res.profile || null);
        setIsDefaultOAuth(false);
        setShowGitHubTokenInput(false);
        setShowGitHubOAuthModal(false);
        setGithubToken('');
        setGithubStatusMessage(null);
        loadGitHubRepos();
      } else {
        setGithubError(res?.error || 'Verification failed. Please check your Personal Access Token.');
      }
    } catch (err: any) {
      setGithubError(err.message || 'Failed to connect to GitHub');
    } finally {
      setConnectingGitHub(false);
    }
  };

  const handleRestoreDefaultOAuth = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleConnectGitHubOAuth();
  };

  const handleDisconnectGitHub = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.disconnectGitHub) return;
    try {
      await window.jarvisAPI.disconnectGitHub();
      setGithubConnected(false);
      setGithubProfile(null);
      setRepos([]);
      setShowGitHubTokenInput(false);
      setShowGitHubOAuthModal(false);
      setGithubStatusMessage(null);
      setGithubError(null);
    } catch (e) {
      console.error('Failed to disconnect GitHub:', e);
    }
  };

  const handleGitFetch = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.gitFetch) return;
    setGitActionLoading('fetch');
    setGitActionResult(null);
    try {
      const res = await window.jarvisAPI.gitFetch(gitStatus?.cwd);
      setGitActionResult({
        success: res.success,
        message: res.output || (res.success ? 'Git Fetch completed successfully' : res.error || 'Fetch failed'),
      });
      await loadGitStatus(gitStatus?.cwd);
    } catch (err: any) {
      setGitActionResult({ success: false, message: err.message });
    } finally {
      setGitActionLoading(null);
    }
  };

  const handleGitPull = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.gitPull) return;
    setGitActionLoading('pull');
    setGitActionResult(null);
    try {
      const res = await window.jarvisAPI.gitPull(gitStatus?.cwd);
      setGitActionResult({
        success: res.success,
        message: res.output || (res.success ? 'Git Pull completed successfully' : res.error || 'Pull failed'),
      });
      await loadGitStatus(gitStatus?.cwd);
    } catch (err: any) {
      setGitActionResult({ success: false, message: err.message });
    } finally {
      setGitActionLoading(null);
    }
  };

  const handleGitPush = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.gitPush) return;
    setGitActionLoading('push');
    setGitActionResult(null);
    try {
      const res = await window.jarvisAPI.gitPush(gitStatus?.cwd, { branch: gitStatus?.branch });
      setGitActionResult({
        success: res.success,
        message: res.output || (res.success ? 'Git Push completed successfully' : res.error || 'Push failed'),
      });
      await loadGitStatus(gitStatus?.cwd);
    } catch (err: any) {
      setGitActionResult({ success: false, message: err.message });
    } finally {
      setGitActionLoading(null);
    }
  };

  const handleGitCommitAndPush = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commitMessage.trim() || !window.jarvisAPI?.gitCommit) return;
    setGitActionLoading('commit');
    setGitActionResult(null);
    try {
      const commitRes = await window.jarvisAPI.gitCommit(gitStatus?.cwd, {
        message: commitMessage.trim(),
        stageAll: true,
      });
      if (!commitRes.success) {
        setGitActionResult({
          success: false,
          message: commitRes.error || 'Commit failed',
        });
        setGitActionLoading(null);
        return;
      }
      if (window.jarvisAPI?.gitPush) {
        const pushRes = await window.jarvisAPI.gitPush(gitStatus?.cwd, { branch: gitStatus?.branch });
        setGitActionResult({
          success: pushRes.success,
          message: pushRes.success
            ? `Successfully committed & pushed: "${commitMessage.trim()}"`
            : `Committed, but push failed: ${pushRes.error || pushRes.output}`,
        });
      } else {
        setGitActionResult({
          success: true,
          message: `Successfully committed: "${commitMessage.trim()}"`,
        });
      }
      setCommitMessage('');
      await loadGitStatus(gitStatus?.cwd);
    } catch (err: any) {
      setGitActionResult({ success: false, message: err.message });
    } finally {
      setGitActionLoading(null);
    }
  };

  const handleSelectRepoDir = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.gitSelectDir) return;
    try {
      const res = await window.jarvisAPI.gitSelectDir();
      if (res && res.success && res.path) {
        if (res.status) {
          setGitStatus(res.status);
        } else {
          loadGitStatus(res.path);
        }
      }
    } catch (err: any) {
      console.warn('Failed to select repo dir:', err);
    }
  };

  const handleCloneRepo = async (repo: GitHubRepo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.jarvisAPI?.gitClone) return;
    setCloningRepoId(repo.id);
    setGitActionResult(null);
    try {
      const res = await window.jarvisAPI.gitClone(repo.clone_url);
      if (res && res.success && res.targetPath) {
        setGitActionResult({
          success: true,
          message: `Cloned ${repo.full_name} to ${res.targetPath}`,
        });
        await loadGitStatus(res.targetPath);
        setGithubSubTab('local');
      } else if (res && !res.canceled) {
        setGitActionResult({
          success: false,
          message: res.error || 'Failed to clone repository',
        });
      }
    } catch (err: any) {
      setGitActionResult({ success: false, message: err.message });
    } finally {
      setCloningRepoId(null);
    }
  };

  const handleOpenExternal = (url: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const googleApps = [
    { label: 'Gmail Automation', icon: <Mail className="w-4 h-4 text-gray-400" /> },
    { label: 'Google Calendar', icon: <Calendar className="w-4 h-4 text-gray-400" /> },
    { label: 'Drive & Docs', icon: <Folder className="w-4 h-4 text-gray-400" /> },
    { label: 'Google Sheets', icon: <Table className="w-4 h-4 text-gray-400" /> },
    { label: 'Google Tasks', icon: <CheckSquare className="w-4 h-4 text-gray-400" /> },
    { label: 'Classroom & Deadlines', icon: <GraduationCap className="w-4 h-4 text-gray-400" /> },
  ];

  const whatsappApps = [
    { label: 'Chat & Direct Messaging', icon: <MessageSquare className="w-4 h-4 text-gray-400" /> },
    { label: 'Fast File & Media Share', icon: <Share2 className="w-4 h-4 text-gray-400" /> },
    { label: 'Voice Notes & Audio', icon: <Mic className="w-4 h-4 text-gray-400" /> },
    { label: 'Contact List & Groups', icon: <Globe className="w-4 h-4 text-gray-400" /> },
    { label: 'Desktop & Web Bridge', icon: <ExternalLink className="w-4 h-4 text-gray-400" /> },
    { label: 'Notification Sync', icon: <CheckCircle2 className="w-4 h-4 text-gray-400" /> },
  ];

  const musicApps = [
    { label: 'Now Playing & Playback', icon: <Play className="w-4 h-4 text-gray-400" /> },
    { label: 'Voice Command Controls', icon: <Mic className="w-4 h-4 text-gray-400" /> },
    { label: 'Playlist & Queue Sync', icon: <ListMusic className="w-4 h-4 text-gray-400" /> },
    { label: 'Desktop & Web Protocol', icon: <ExternalLink className="w-4 h-4 text-gray-400" /> },
    { label: 'Smart Focus Audio', icon: <Radio className="w-4 h-4 text-gray-400" /> },
    { label: 'Background Mode', icon: <Music className="w-4 h-4 text-gray-400" /> },
  ];

  const musicSelectOptions: GlideSelectOption[] = [
    {
      value: 'spotify',
      label: (
        <span className="flex items-center gap-2">
          <img src={spotifyLogo} alt="" className="w-3.5 h-3.5 object-contain" />
          <span>Spotify</span>
        </span>
      ),
    },
    {
      value: 'applemusic',
      label: (
        <span className="flex items-center gap-2">
          <img src={applemusicLogo} alt="" className="w-3.5 h-3.5 object-contain" />
          <span>Apple Music</span>
        </span>
      ),
    },
    {
      value: 'ytmusic',
      label: (
        <span className="flex items-center gap-2">
          <img src={ytmusicLogo} alt="" className="w-3.5 h-3.5 object-contain" />
          <span>YouTube Music</span>
        </span>
      ),
    },
    {
      value: 'amazonmusic',
      label: (
        <span className="flex items-center gap-2">
          <img src={amazonmusicLogo} alt="" className="w-3.5 h-3.5 object-contain" />
          <span>Amazon Music</span>
        </span>
      ),
    },
    {
      value: 'soundcloud',
      label: (
        <span className="flex items-center gap-2">
          <img src={soundcloudLogo} alt="" className="w-3.5 h-3.5 object-contain" />
          <span>SoundCloud</span>
        </span>
      ),
    },
  ];

  const notionApps = [
    { label: 'Pages & Sub-pages', icon: <FileText className="w-4 h-4 text-gray-400" /> },
    { label: 'Databases & Tables', icon: <Table className="w-4 h-4 text-gray-400" /> },
    { label: 'To-Do & Task Boards', icon: <CheckSquare className="w-4 h-4 text-gray-400" /> },
    { label: 'Quick Notes & Journal', icon: <BookOpen className="w-4 h-4 text-gray-400" /> },
    { label: 'Projects & Documents', icon: <Folder className="w-4 h-4 text-gray-400" /> },
    { label: 'Workspace Search', icon: <Search className="w-4 h-4 text-gray-400" /> },
  ];

  const obsidianApps = [
    { label: 'Local Markdown Vault', icon: <FileText className="w-4 h-4 text-gray-400" /> },
    { label: 'Daily Notes & Journal', icon: <Calendar className="w-4 h-4 text-gray-400" /> },
    { label: 'Bi-directional Backlinks', icon: <Network className="w-4 h-4 text-gray-400" /> },
    { label: 'Flashcards & Canvas', icon: <Layers className="w-4 h-4 text-gray-400" /> },
    { label: 'Tag & Folder Indexing', icon: <Folder className="w-4 h-4 text-gray-400" /> },
    { label: 'Fast Offline Vault Search', icon: <Search className="w-4 h-4 text-gray-400" /> },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div>
        <h2 className="text-xl mt-16 font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Workspace Integrations
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Connect your productivity accounts and offline note vaults to enable autonomous calendar scheduling, email actions, notes, and document management.
        </p>
      </div>

      {/* 1. Google Workspace Accordion Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl shadow-xs overflow-hidden transition-all duration-200">
        <div
          onClick={() => { setGoogleExpanded((prev) => !prev); notifyAccordionToggled(); }}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-[#161822]/50 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 shadow-xs">
              <GoogleLogo className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                Google Account Status
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0 truncate">
                {connected
                  ? `Linked: ${profile?.email || profile?.name || 'Active session'}`
                  : 'Not connected. Click to link Gmail, Calendar, Docs & Drive via 1-click Google OAuth.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={connectingGoogle}
              onClick={handleConnectGoogle}
              className={`inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border transition-all shadow-xs ${
                connected
                  ? 'bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1c24] dark:hover:bg-[#252836] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-[#1e2029]'
                  : 'bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent'
              }`}
            >
              {connectingGoogle ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : connected ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span className="font-bold">Account Linked</span>
                </>
              ) : (
                'Connect Account'
              )}
            </button>

            <button
              type="button"
              onClick={() => { setGoogleExpanded((prev) => !prev); notifyAccordionToggled(); }}
              aria-label={googleExpanded ? 'Collapse section' : 'Expand section'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1f222e] transition-all cursor-pointer border-none bg-transparent"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  googleExpanded ? 'rotate-180 text-gray-700 dark:text-gray-200' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Smooth Accordion Content: Integrated Google Apps Grid */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            googleExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-5 pb-5 pt-4 border-t border-[#e4e4eb] dark:border-[#1e2029]">
              <div className="grid grid-cols-3 gap-3 w-full">
                {googleApps.map((app, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-xs font-medium text-gray-800 dark:text-gray-200"
                  >
                    {app.icon}
                    <span>{app.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. WhatsApp Accordion Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl shadow-xs overflow-hidden transition-all duration-300">
        <div
          onClick={() => { setWhatsappExpanded((prev) => !prev); notifyAccordionToggled(); }}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-[#161822]/50 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 shadow-xs">
              <WhatsAppLogo className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                WhatsApp Status
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0 truncate">
                Auto-connected. Desktop session active for chat messaging, contacts, and media sharing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              title="Open WhatsApp desktop app"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all"
            >
              <span>Open App</span>
              
            </button>

            <div className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold border bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-[#1e2029] shadow-xs select-none">
              <Check className="w-3.5 h-3.5" />
              <span className="font-bold">Auto-Connected</span>
            </div>

            <button
              type="button"
              onClick={() => { setWhatsappExpanded((prev) => !prev); notifyAccordionToggled(); }}
              aria-label={whatsappExpanded ? 'Collapse section' : 'Expand section'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1f222e] transition-all cursor-pointer border-none bg-transparent"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  whatsappExpanded ? 'rotate-180 text-gray-700 dark:text-gray-200' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Smooth Accordion Content: Integrated WhatsApp Apps Grid */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            whatsappExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-5 pb-5 pt-4 border-t border-[#e4e4eb] dark:border-[#1e2029]">
              <div className="grid grid-cols-3 gap-3 w-full">
                {whatsappApps.map((app, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-xs font-medium text-gray-800 dark:text-gray-200"
                  >
                    {app.icon}
                    <span>{app.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Music Streaming Accordion Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl shadow-xs transition-all duration-300">
        <div
          onClick={() => { setMusicExpanded((prev) => !prev); notifyAccordionToggled(); }}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-[#161822]/50 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 shadow-xs">
              <img
                src={currentMusic.logo}
                alt={currentMusic.name}
                className="w-5 h-5 object-contain transition-all"
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                Music Streaming
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0 truncate">
                Active: {currentMusic.name}. Seamless playback integration for Grokki to launch tracks, playlists, and audio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleOpenMusic}
              title={`Open ${currentMusic.name}`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all"
            >
              <span>Open App</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>

            {/* Dropdown to select streaming app using GlideSelect */}
            <div className="[--music-select-bg:#f3f4f6] dark:[--music-select-bg:#1a1c24] [--music-select-hover:#e5e7eb] dark:[--music-select-hover:#252836] [--music-select-text:#111827] dark:[--music-select-text:#f3f4f6] border border-gray-200 dark:border-[#1e2029] rounded-lg shadow-xs flex items-center h-9">
              <GlideSelect
                options={musicSelectOptions}
                value={selectedMusic}
                onChange={handleMusicChange}
                size="md"
                radius={8}
                menuWidth={180}
                align="right"
                placement="bottom"
                surfaceColor="var(--music-select-bg)"
                highlightColor="var(--music-select-hover)"
                textColor="var(--music-select-text)"
              />
            </div>

            <button
              type="button"
              onClick={() => { setMusicExpanded((prev) => !prev); notifyAccordionToggled(); }}
              aria-label={musicExpanded ? 'Collapse section' : 'Expand section'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1f222e] transition-all cursor-pointer border-none bg-transparent"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  musicExpanded ? 'rotate-180 text-gray-700 dark:text-gray-200' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Smooth Accordion Content: Integrated Music Apps Grid */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            musicExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-5 pb-5 pt-4 border-t border-[#e4e4eb] dark:border-[#1e2029]">
              <div className="grid grid-cols-3 gap-3 w-full">
                {musicApps.map((app, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-xs font-medium text-gray-800 dark:text-gray-200"
                  >
                    {app.icon}
                    <span>{app.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Notion Workspace Accordion Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl shadow-xs overflow-hidden transition-all duration-300">
        <div
          onClick={() => { setNotionExpanded((prev) => !prev); notifyAccordionToggled(); }}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-[#161822]/50 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center text-gray-900 dark:text-white flex-shrink-0 shadow-xs">
              <NotionLogo className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                Notion Workspace Status
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0 truncate">
                {notionConnected
                  ? `Linked: ${notionProfile?.workspaceName || 'Active Workspace'}`
                  : 'Not connected. Click to link Notion pages, databases & notes via 1-click Notion OAuth.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
            {notionConnected ? (
              <>
                <button
                  type="button"
                  onClick={handleDisconnectNotion}
                  className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all"
                >
                  Disconnect
                </button>
                <div className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold border bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-[#1e2029] shadow-xs select-none">
                  <Check className="w-3.5 h-3.5" />
                  <span className="font-bold">Workspace Linked</span>
                </div>
              </>
            ) : (
              <button
                type="button"
                disabled={connectingNotion}
                onClick={handleConnectNotionOAuth}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent transition-all shadow-xs"
              >
                {connectingNotion ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  'Connect Notion'
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => { setNotionExpanded((prev) => !prev); notifyAccordionToggled(); }}
              aria-label={notionExpanded ? 'Collapse section' : 'Expand section'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1f222e] transition-all cursor-pointer border-none bg-transparent"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  notionExpanded ? 'rotate-180 text-gray-700 dark:text-gray-200' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Smooth Accordion Content: Integrated Notion Capabilities Grid & Forms */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            notionExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-5 pb-5 pt-4 border-t border-[#e4e4eb] dark:border-[#1e2029] flex flex-col gap-3.5">
              {/* Live Status Message / Error Banner */}
              {notionStatusMessage && !notionConnected && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
                  <span>{notionStatusMessage}</span>
                </div>
              )}

              {notionError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
                  <span>{notionError}</span>
                  <button
                    type="button"
                    onClick={() => setShowTokenFallback(true)}
                    className="underline text-[11px] font-semibold cursor-pointer border-none bg-transparent text-red-600 dark:text-red-400"
                  >
                    Enter token manually
                  </button>
                </div>
              )}

              {/* Manual Token Fallback */}
              {showTokenFallback && !notionConnected && (
                <form
                  onSubmit={handleConnectNotionToken}
                  className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029] animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-gray-400" />
                      Manual Internal Integration Token
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTokenFallback(false)}
                      className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer border-none bg-transparent"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={notionToken}
                      onChange={(e) => setNotionToken(e.target.value)}
                      placeholder="ntn_... or secret_..."
                      className="flex-1 h-8 px-3 rounded-lg border border-gray-300 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-900 dark:text-gray-100 text-xs font-mono placeholder:text-gray-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={connectingNotion || !notionToken.trim()}
                      className="h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 text-white dark:bg-white dark:text-gray-900 disabled:opacity-40"
                    >
                      Link
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-3 gap-3 w-full">
                {notionApps.map((app, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-xs font-medium text-gray-800 dark:text-gray-200"
                  >
                    {app.icon}
                    <span>{app.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Obsidian Vault Accordion Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl shadow-xs overflow-hidden transition-all duration-300">
        <div
          onClick={() => { setObsidianExpanded((prev) => !prev); notifyAccordionToggled(); }}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-[#161822]/50 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 shadow-xs">
              <ObsidianLogo className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                Obsidian Vault Status
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0 truncate">
                {obsidianConnected
                  ? `Linked Vault: ${obsidianVaultName || 'Vault'} (${obsidianNotesCount} notes)`
                  : 'Not connected. Select your local Obsidian Vault directory for 100% offline note sync.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
            {obsidianConnected ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenInObsidian}
                  title="Open vault in Obsidian desktop app"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all"
                >
                  <span>Open App</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </button>
                <button
                  type="button"
                  onClick={handleSelectObsidianVault}
                  className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all"
                >
                  Switch
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectObsidian}
                  className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all"
                >
                  Disconnect
                </button>
                <div className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold border bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-[#1e2029] shadow-xs select-none">
                  <Check className="w-3.5 h-3.5" />
                  <span className="font-bold">Vault Linked</span>
                </div>
              </>
            ) : (
              <button
                type="button"
                disabled={selectingVault}
                onClick={handleSelectObsidianVault}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent transition-all shadow-xs"
              >
                {selectingVault ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Selecting...</span>
                  </>
                ) : (
                  'Connect Vault'
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => { setObsidianExpanded((prev) => !prev); notifyAccordionToggled(); }}
              aria-label={obsidianExpanded ? 'Collapse section' : 'Expand section'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1f222e] transition-all cursor-pointer border-none bg-transparent"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  obsidianExpanded ? 'rotate-180 text-gray-700 dark:text-gray-200' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Smooth Accordion Content: Integrated Obsidian Capabilities Grid */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            obsidianExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-5 pb-5 pt-4 border-t border-[#e4e4eb] dark:border-[#1e2029]">
              <div className="grid grid-cols-3 gap-3 w-full">
                {obsidianApps.map((app, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-xs font-medium text-gray-800 dark:text-gray-200"
                  >
                    {app.icon}
                    <span>{app.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. GitHub & Git CLI Workspace Accordion Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl shadow-xs overflow-hidden transition-all duration-300">
        <div
          onClick={() => { setGithubExpanded((prev) => !prev); notifyAccordionToggled(); }}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-[#161822]/50 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 shadow-xs">
              <GitHubLogo className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                GitHub & Git Integration
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0 truncate">
                {githubConnected && githubProfile
                  ? `Connected as @${githubProfile.login} (${githubProfile.public_repos || 0} repos) • Branch: ${gitStatus?.branch || 'main'}`
                  : gitStatus?.isRepo
                  ? `Local Git repo active (${gitStatus.branch}) • Connect GitHub to sync & manage cloud repos.`
                  : 'Connect GitHub and local Git workspaces to fetch, pull, commit, and push.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
            {githubConnected ? (
              <>
                {githubProfile?.avatar_url && (
                  <img
                    src={githubProfile.avatar_url}
                    alt={githubProfile.login}
                    className="w-7 h-7 rounded-full border border-gray-300 dark:border-[#2a2d3d]"
                  />
                )}
                <button
                  type="button"
                  onClick={handleDisconnectGitHub}
                  className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all"
                >
                  Disconnect
                </button>
                <div className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold border bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-[#1e2029] shadow-xs select-none">
                  <Check className="w-3.5 h-3.5" />
                  <span className="font-bold">Connected</span>
                </div>
              </>
            ) : (
              <button
                type="button"
                disabled={connectingGitHub}
                onClick={handleConnectGitHubOAuth}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent transition-all shadow-xs"
              >
                {connectingGitHub ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  'Connect GitHub'
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => { setGithubExpanded((prev) => !prev); notifyAccordionToggled(); }}
              aria-label={githubExpanded ? 'Collapse section' : 'Expand section'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1f222e] transition-all cursor-pointer border-none bg-transparent"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  githubExpanded ? 'rotate-180 text-gray-700 dark:text-gray-200' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Smooth Accordion Content */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            githubExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-5 pb-5 pt-4 border-t border-[#e4e4eb] dark:border-[#1e2029] flex flex-col gap-4">
              {/* Live Status Message Banner */}
              {githubStatusMessage && !githubConnected && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>{githubStatusMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConnectingGitHub(false);
                      setGithubStatusMessage(null);
                    }}
                    className="text-[11px] underline opacity-70 hover:opacity-100 bg-transparent border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Error Banner */}
              {githubError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{githubError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGithubError(null)}
                    className="text-[11px] underline opacity-70 hover:opacity-100 bg-transparent border-none cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* GitHub OAuth 2.0 Credentials Setup Form */}
              {showGitHubOAuthModal && !githubConnected && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#161822] border border-blue-500/30 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        GitHub OAuth 2.0 Application Setup
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGitHubOAuthModal(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
                    Register a GitHub OAuth App to authorize Grokki directly from your web browser. Set the Authorization callback URL in your GitHub app settings to:
                  </p>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#101117] border border-gray-200 dark:border-[#252836]">
                    <code className="text-xs font-mono text-gray-800 dark:text-gray-200 selection:bg-blue-500/20">
                      http://localhost:8587/githubcallback
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('http://localhost:8587/githubcallback');
                        setCopiedCallback(true);
                        setTimeout(() => setCopiedCallback(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer ml-2 flex-shrink-0"
                    >
                      {copiedCallback ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCallback ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenGitHubPortal}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer"
                    >
                      <span>Register New OAuth App on GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveGitHubCredentials} className="flex flex-col gap-2.5 mt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                          Client ID
                        </label>
                        <input
                          type="text"
                          value={githubClientId}
                          onChange={(e) => setGithubClientId(e.target.value)}
                          placeholder="e.g. Ov23li..."
                          className="w-full h-8 px-2.5 rounded-lg border border-gray-300 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-900 dark:text-gray-100 text-xs font-mono placeholder:text-gray-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                          Client Secret
                        </label>
                        <input
                          type="password"
                          value={githubClientSecret}
                          onChange={(e) => setGithubClientSecret(e.target.value)}
                          placeholder="e.g. 78f..."
                          className="w-full h-8 px-2.5 rounded-lg border border-gray-300 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-900 dark:text-gray-100 text-xs font-mono placeholder:text-gray-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowGitHubOAuthModal(false);
                          setGithubAuthMode('pat');
                        }}
                        className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer underline"
                      >
                        Or connect with Personal Access Token
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowGitHubOAuthModal(false)}
                          className="h-8 px-3 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#252836] bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1a1c24]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingOAuthCreds || !githubClientId.trim() || !githubClientSecret.trim()}
                          className="h-8 px-3.5 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent transition-all disabled:opacity-40 flex items-center gap-1.5"
                        >
                          {savingOAuthCreds ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          <span>Save & Authorize</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Not Connected Auth Card */}
              {!githubConnected && !showGitHubOAuthModal && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-gray-200/60 dark:bg-[#101117] border border-gray-200 dark:border-[#252836]">
                      <button
                        type="button"
                        onClick={() => setGithubAuthMode('oauth')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all border-none ${
                          githubAuthMode === 'oauth'
                            ? 'bg-white dark:bg-[#1f222e] text-gray-900 dark:text-white shadow-xs font-semibold'
                            : 'bg-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        1-Click Browser OAuth
                      </button>
                      <button
                        type="button"
                        onClick={() => setGithubAuthMode('pat')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all border-none ${
                          githubAuthMode === 'pat'
                            ? 'bg-white dark:bg-[#1f222e] text-gray-900 dark:text-white shadow-xs font-semibold'
                            : 'bg-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        Personal Access Token (PAT)
                      </button>
                    </div>

                    {githubAuthMode === 'oauth' && (
                      <button
                        type="button"
                        onClick={() => setShowGitHubOAuthModal(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer"
                      >
                        <span>App Credentials</span>
                        <Key className="w-3 h-3" />
                      </button>
                    )}

                    {githubAuthMode === 'pat' && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenExternal('https://github.com/settings/tokens', e)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer"
                      >
                        <span>Get Token on GitHub</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {githubAuthMode === 'oauth' && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 m-0">
                          Authorize in Web Browser
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 mt-0.5 max-w-md">
                          Click below to open GitHub in your default browser, grant permissions, and return seamlessly via local callback (<code className="font-mono text-[10px]">localhost:8587</code>).
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={connectingGitHub}
                        onClick={handleConnectGitHubOAuth}
                        className="h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent transition-all disabled:opacity-40 flex items-center justify-center gap-2 flex-shrink-0 shadow-xs"
                      >
                        {connectingGitHub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitHubLogo className="w-3.5 h-3.5" />}
                        <span>{connectingGitHub ? 'Authorizing...' : 'Authorize GitHub in Browser'}</span>
                      </button>
                    </div>
                  )}

                  {githubAuthMode === 'pat' && (
                    <form onSubmit={handleConnectCustomGitHubToken} className="flex flex-col gap-2 pt-1">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0">
                        Provide your Personal Access Token (<code className="font-mono text-[10px] bg-gray-200 dark:bg-[#202330] px-1 py-0.5 rounded">ghp_...</code> or fine-grained <code className="font-mono text-[10px] bg-gray-200 dark:bg-[#202330] px-1 py-0.5 rounded">github_pat_...</code>) with <code className="font-mono text-[10px] bg-gray-200 dark:bg-[#202330] px-1 py-0.5 rounded">repo</code> and <code className="font-mono text-[10px] bg-gray-200 dark:bg-[#202330] px-1 py-0.5 rounded">read:user</code> scopes.
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showTokenSecret ? 'text' : 'password'}
                            value={githubToken}
                            onChange={(e) => setGithubToken(e.target.value)}
                            placeholder="ghp_... or github_pat_..."
                            className="w-full h-9 pl-3 pr-9 rounded-lg border border-gray-300 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-900 dark:text-gray-100 text-xs font-mono placeholder:text-gray-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTokenSecret(!showTokenSecret)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer p-0"
                          >
                            {showTokenSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={connectingGitHub || !githubToken.trim()}
                          className="h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent transition-all disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
                        >
                          {connectingGitHub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Verify & Link</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Connected GitHub Profile Header */}
              {githubConnected && githubProfile && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029]">
                  <div className="flex items-center gap-3">
                    <img
                      src={githubProfile.avatar_url}
                      alt={githubProfile.login}
                      className="w-10 h-10 rounded-full border border-gray-300 dark:border-[#2a2d3d]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                          {githubProfile.name || githubProfile.login}
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono">
                          @{githubProfile.login}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          isDefaultOAuth
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {isDefaultOAuth ? 'OAuth Connected' : 'Verified PAT Token'}
                        </span>
                      </div>
                      {githubProfile.bio && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 line-clamp-1">
                          {githubProfile.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 font-medium px-3 py-1.5 rounded-lg bg-white dark:bg-[#101117] border border-gray-200 dark:border-[#252836]">
                      <span>
                        <strong className="text-gray-800 dark:text-gray-200 font-semibold">{githubProfile.public_repos || 0}</strong> public repos
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-gray-800 dark:text-gray-200 font-semibold">{githubProfile.followers || 0}</strong> followers
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowGitHubTokenInput((prev) => !prev)}
                      title="Switch token or connect custom repository token"
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#1e2029] bg-white dark:bg-[#101117] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
                    >
                      <Key className="w-3 h-3" />
                      <span>Switch Token</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleOpenExternal(githubProfile.html_url, e)}
                      title="View profile on GitHub"
                      className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#1e2029] bg-white dark:bg-[#101117] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
                    >
                      <span>Profile</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </button>
                  </div>
                </div>
              )}

              {/* Token Switch Form when already connected */}
              {githubConnected && showGitHubTokenInput && (
                <form onSubmit={handleConnectCustomGitHubToken} className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Connect Personal Access Token (PAT)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowGitHubTokenInput(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showTokenSecret ? 'text' : 'password'}
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_... or github_pat_..."
                        className="w-full h-8 pl-3 pr-9 rounded-lg border border-gray-300 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-900 dark:text-gray-100 text-xs font-mono placeholder:text-gray-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTokenSecret(!showTokenSecret)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer p-0"
                      >
                        {showTokenSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={connectingGitHub || !githubToken.trim()}
                      className="h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent transition-all disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {connectingGitHub ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      <span>Verify & Link</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-tab Navigation */}
              <div className="flex items-center justify-between border-b border-[#e4e4eb] dark:border-[#1e2029] pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGithubSubTab('local')}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      githubSubTab === 'local'
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent shadow-xs'
                        : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1c24] border-transparent'
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Active Git Workspace</span>
                    {gitStatus?.branch && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        githubSubTab === 'local' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-gray-900' : 'bg-gray-200 dark:bg-[#252836] text-gray-600 dark:text-gray-300'
                      }`}>
                        {gitStatus.branch}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setGithubSubTab('cloud')}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      githubSubTab === 'cloud'
                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent shadow-xs'
                        : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1c24] border-transparent'
                    }`}
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>Cloud Repositories</span>
                    {repos.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        githubSubTab === 'cloud' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-gray-900' : 'bg-gray-200 dark:bg-[#252836] text-gray-600 dark:text-gray-300'
                      }`}>
                        {repos.length}
                      </span>
                    )}
                  </button>
                </div>

                {githubSubTab === 'local' && (
                  <button
                    type="button"
                    onClick={() => loadGitStatus(gitStatus?.cwd)}
                    title="Refresh Git status"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent border-none cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingGitStatus ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                )}

                {githubSubTab === 'cloud' && (
                  <button
                    type="button"
                    onClick={loadGitHubRepos}
                    title="Refresh repositories"
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent border-none cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingRepos ? 'animate-spin' : ''}`} />
                    <span>Refresh Repos</span>
                  </button>
                )}
              </div>

              {/* Feedback Alert Banner */}
              {gitActionResult && (
                <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                  gitActionResult.success
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    {gitActionResult.success ? (
                      <Check className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <span className="font-mono truncate">{gitActionResult.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGitActionResult(null)}
                    className="text-[11px] font-semibold underline cursor-pointer bg-transparent border-none ml-2 flex-shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Sub-tab 1: Active Local Git Workspace */}
              {githubSubTab === 'local' && (
                <div className="flex flex-col gap-4">
                  {/* Repo Directory & Switch Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029]">
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                          Current Git Directory
                        </span>
                        <span className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate block">
                          {gitStatus?.cwd || 'e:/Assistant AI'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSelectRepoDir}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all shadow-xs"
                    >
                      <Folder className="w-3.5 h-3.5 text-gray-400" />
                      <span>Switch Repo</span>
                    </button>
                  </div>

                  {gitStatus?.isRepo ? (
                    <>
                      {/* Live Sync Status Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Branch */}
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029]">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Current Branch
                          </span>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-gray-100 font-mono">
                            <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                            <span className="truncate">{gitStatus.branch}</span>
                          </div>
                        </div>

                        {/* Ahead / Behind Sync */}
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029]">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Remote Sync
                          </span>
                          <div className="flex items-center gap-3 text-xs font-semibold">
                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400" title="Commits ahead of remote (ready to push)">
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>{gitStatus.ahead || 0} ahead</span>
                            </div>
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400" title="Commits behind remote (need pull)">
                              <DownloadCloud className="w-3.5 h-3.5" />
                              <span>{gitStatus.behind || 0} behind</span>
                            </div>
                          </div>
                        </div>

                        {/* Changes Working Tree */}
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029]">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Uncommitted Changes
                          </span>
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="text-amber-600 dark:text-amber-400">{gitStatus.modifiedCount || 0} modified</span>
                            <span>•</span>
                            <span className="text-gray-500">{gitStatus.untrackedCount || 0} new</span>
                          </div>
                        </div>

                        {/* Staged Changes */}
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029]">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Staged for Commit
                          </span>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>{gitStatus.stagedCount || 0} staged</span>
                          </div>
                        </div>
                      </div>

                      {/* Fast Action Buttons Bar */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={Boolean(gitActionLoading)}
                          onClick={handleGitFetch}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold cursor-pointer border border-gray-200 dark:border-[#252836] bg-white dark:bg-[#161822] text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${gitActionLoading === 'fetch' ? 'animate-spin' : ''}`} />
                          <span>Fetch (Origin)</span>
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(gitActionLoading)}
                          onClick={handleGitPull}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold cursor-pointer border border-gray-200 dark:border-[#252836] bg-white dark:bg-[#161822] text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all disabled:opacity-50"
                        >
                          <DownloadCloud className={`w-3.5 h-3.5 ${gitActionLoading === 'pull' ? 'animate-bounce' : ''}`} />
                          <span>Pull (Origin/{gitStatus.branch || 'main'})</span>
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(gitActionLoading)}
                          onClick={handleGitPush}
                          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold cursor-pointer border border-gray-200 dark:border-[#252836] bg-white dark:bg-[#161822] text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all disabled:opacity-50"
                        >
                          <UploadCloud className={`w-3.5 h-3.5 ${gitActionLoading === 'push' ? 'animate-pulse' : ''}`} />
                          <span>Push (Origin/{gitStatus.branch || 'main'})</span>
                          {(gitStatus.ahead || 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white font-mono">
                              +{gitStatus.ahead}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Quick Commit & Push Form */}
                      <form
                        onSubmit={handleGitCommitAndPush}
                        className="flex flex-col gap-2 p-3.5 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                            <GitCommit className="w-3.5 h-3.5 text-gray-400" />
                            Live Commit & Push
                          </span>
                          <span className="text-[11px] text-gray-500">
                            Stages all modified & untracked files automatically
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            placeholder="Enter commit message (e.g., feat: update components)..."
                            className="flex-1 h-9 px-3 rounded-lg border border-gray-300 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-900 dark:text-gray-100 text-xs placeholder:text-gray-400 focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={gitActionLoading === 'commit' || !commitMessage.trim()}
                            className="h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent transition-all disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
                          >
                            {gitActionLoading === 'commit' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Committing...</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Commit & Push</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>

                      {/* Changed Files Summary */}
                      {gitStatus.files && gitStatus.files.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            Working Tree Files ({gitStatus.files.length})
                          </span>
                          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-[#1e2029] bg-white dark:bg-[#101117] divide-y divide-gray-100 dark:divide-[#1a1c24]">
                            {gitStatus.files.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-xs font-mono">
                                <span className="text-gray-700 dark:text-gray-300 truncate">{file.path}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase flex-shrink-0 ml-2 ${
                                  file.status === 'staged'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : file.status === 'modified'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                                }`}>
                                  {file.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Commits Log */}
                      {gitStatus.recentCommits && gitStatus.recentCommits.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            Recent Commits
                          </span>
                          <div className="rounded-lg border border-gray-200 dark:border-[#1e2029] bg-white dark:bg-[#101117] divide-y divide-gray-100 dark:divide-[#1a1c24]">
                            {gitStatus.recentCommits.map((c, idx) => (
                              <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                                    {c.hash}
                                  </span>
                                  <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                    {c.message}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-400 flex-shrink-0 ml-3">
                                  <span>{c.author}</span>
                                  <span>•</span>
                                  <span>{c.date}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between">
                      <span>Selected directory is not an initialized Git repository.</span>
                      <button
                        type="button"
                        onClick={handleSelectRepoDir}
                        className="font-semibold underline cursor-pointer bg-transparent border-none text-amber-700 dark:text-amber-400"
                      >
                        Choose Git Repository
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 2: Cloud Repositories Browser */}
              {githubSubTab === 'cloud' && (
                <div className="flex flex-col gap-3">
                  {!githubConnected ? (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029] text-center flex flex-col items-center gap-2">
                      <FolderGit2 className="w-8 h-8 text-gray-400" />
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        GitHub Account Not Connected
                      </span>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 max-w-sm">
                        Connect your GitHub Personal Access Token above to browse, search, and clone all your private and public repositories.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowGitHubTokenInput(true)}
                        className="mt-1 h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs"
                      >
                        Enter Token
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Search & Filter Bar */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={repoSearch}
                            onChange={(e) => setRepoSearch(e.target.value)}
                            placeholder="Search repositories by name, language or description..."
                            className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-300 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-900 dark:text-gray-100 text-xs placeholder:text-gray-400 focus:outline-none"
                          />
                        </div>

                        {/* Filter Pills: All | Public | Private */}
                        <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-[#161822] border border-gray-200 dark:border-[#202330] self-start sm:self-auto flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setRepoFilter('all')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                              repoFilter === 'all'
                                ? 'bg-white dark:bg-[#202330] text-gray-900 dark:text-gray-100 shadow-2xs'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                          >
                            All <span className="opacity-60 ml-0.5 font-mono">({repos.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRepoFilter('public')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                              repoFilter === 'public'
                                ? 'bg-white dark:bg-[#202330] text-gray-900 dark:text-gray-100 shadow-2xs'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                          >
                            <Globe className="w-3 h-3 text-blue-500" />
                            Public <span className="opacity-60 ml-0.5 font-mono">({publicReposCount})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRepoFilter('private')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                              repoFilter === 'private'
                                ? 'bg-white dark:bg-[#202330] text-gray-900 dark:text-gray-100 shadow-2xs'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                          >
                            <Lock className="w-3 h-3 text-amber-500" />
                            Private <span className="opacity-60 ml-0.5 font-mono">({privateReposCount})</span>
                          </button>
                        </div>
                      </div>

                      {/* Repositories Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                        {filteredRepos.map((repo) => (
                            <div
                              key={repo.id}
                              className="p-3 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029] flex flex-col justify-between gap-2.5 hover:border-gray-300 dark:hover:border-[#2a2d3d] transition-all"
                            >
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {repo.private ? (
                                      <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                    ) : (
                                      <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                    )}
                                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                                      {repo.name}
                                    </span>
                                  </div>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase bg-gray-200 dark:bg-[#202330] text-gray-600 dark:text-gray-400 flex-shrink-0">
                                    {repo.private ? 'Private' : 'Public'}
                                  </span>
                                </div>
                                {repo.description && (
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 line-clamp-2">
                                    {repo.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-gray-200/50 dark:border-[#1e2029]/50">
                                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                  {repo.language && (
                                    <span className="font-semibold text-gray-600 dark:text-gray-300">
                                      {repo.language}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    {repo.stargazers_count}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <GitFork className="w-3 h-3" />
                                    {repo.forks_count}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={cloningRepoId === repo.id}
                                    onClick={(e) => handleCloneRepo(repo, e)}
                                    className="h-7 px-2 rounded-md text-[11px] font-semibold cursor-pointer border border-gray-200 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {cloningRepoId === repo.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <DownloadCloud className="w-3 h-3" />
                                    )}
                                    <span>Clone</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenExternal(repo.html_url, e)}
                                    title="Open repo on GitHub"
                                    className="h-7 w-7 rounded-md flex items-center justify-center cursor-pointer border border-gray-200 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
