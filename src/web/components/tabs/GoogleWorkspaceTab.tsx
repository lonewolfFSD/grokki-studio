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
} from 'lucide-react';
import { GoogleProfile, NotionProfile } from '../../types/jarvis';

// Official Authentic Google Brand Logo SVG
const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

// Official Authentic Notion Brand Logo SVG
const NotionLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.83c-.42-.326-.98-.7-2.054-.607L3.107 2.296c-.466.046-.56.28-.373.466l1.725 1.446zm.84 4.012v12.457c0 .7.373 1.026 1.166 1.026.606 0 1.026-.046 2.286-.14l11.44-.653c.84-.047.886-.466.886-1.073V7.473c0-.606-.28-.933-.886-.886l-13.727.84c-.84.046-1.166.326-1.166.793zm12.368.513c.093.42 0 .84-.42.887l-.746.14v8.818c-.466.28-.98.42-1.446.42-.746 0-1.073-.233-1.633-.933l-4.526-7.091v6.858l1.4.326s0 .747-.98.747l-3.033.187s-.233-.28 0-.747l1.073-.28V9.897l-1.353-.14s-.047-.56.466-.607l3.64-.233 4.805 7.324V9.944l-1.26-.14s0-.653.607-.653l2.846-.187c.373 0 .56.327.56.773z" />
  </svg>
);

// Official Authentic Obsidian Brand Logo SVG (Signature Purple Crystal)
const ObsidianLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none">
    <path
      d="M60.1 4.5c-4.2-2.7-9.5-2.7-13.7 0L24.9 19.3c-4.2 2.7-6.8 7.3-6.8 12.3v36.8c0 5 2.6 9.6 6.8 12.3l21.5 14.8c4.2 2.7 9.5 2.7 13.7 0l21.5-14.8c4.2-2.7 6.8-7.3 6.8-12.3V31.6c0-5-2.6-9.6-6.8-12.3L60.1 4.5z"
      fill="#7C3AED"
    />
    <path
      d="M48.2 5.9c.9-.6 2.7-.6 3.6 0l21.5 14.8c1.6 1.1 2.6 2.9 2.6 4.9v36.8c0 2-1 3.8-2.6 4.9L51.8 82.1c-.9.6-2.7.6-3.6 0L26.7 67.3c-1.6-1.1-2.6-2.9-2.6-4.9V25.6c0-2 1-3.8 2.6-4.9L48.2 5.9z"
      fill="#8B5CF6"
    />
    <path
      d="M48.7 10L32.2 25.1l-6.8 32.5 15.6 19.8 14.3-33.1L48.7 10z"
      fill="#6D28D9"
    />
    <path
      d="M48.7 10l6.6 34.3 14.3 33.1 11.2-23.2-5.4-31.1L48.7 10z"
      fill="#A78BFA"
    />
    <path
      d="M55.3 44.3L41 77.4l14.3 9.8 14.3-9.8L55.3 44.3z"
      fill="#C4B5FD"
    />
  </svg>
);

interface GoogleWorkspaceTabProps {
  connected: boolean;
  profile: GoogleProfile | null;
  onRefreshStatus: () => void;
}

export const GoogleWorkspaceTab: React.FC<GoogleWorkspaceTabProps> = ({
  connected,
  profile,
  onRefreshStatus,
}) => {
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [googleExpanded, setGoogleExpanded] = useState(true);

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

  useEffect(() => {
    loadNotionStatus();
    loadObsidianStatus();

    let unsub: (() => void) | undefined;
    if (window.jarvisAPI?.onNotionConnected) {
      unsub = window.jarvisAPI.onNotionConnected((newProfile) => {
        setNotionConnected(true);
        setNotionProfile(newProfile);
        setConnectingNotion(false);
        setShowTokenFallback(false);
        setNotionError(null);
        setNotionStatusMessage(null);
      });
    }

    return () => {
      if (unsub) unsub();
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

  const googleApps = [
    { label: 'Gmail Automation', icon: <Mail className="w-4 h-4 text-gray-400" /> },
    { label: 'Google Calendar', icon: <Calendar className="w-4 h-4 text-gray-400" /> },
    { label: 'Drive & Docs', icon: <Folder className="w-4 h-4 text-gray-400" /> },
    { label: 'Google Sheets', icon: <Table className="w-4 h-4 text-gray-400" /> },
    { label: 'Google Tasks', icon: <CheckSquare className="w-4 h-4 text-gray-400" /> },
    { label: 'Classroom & Deadlines', icon: <GraduationCap className="w-4 h-4 text-gray-400" /> },
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
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Workspace Integrations
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Connect your productivity accounts and offline note vaults to enable autonomous calendar scheduling, email actions, notes, and document management.
        </p>
      </div>

      {/* 1. Google Workspace Accordion Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl shadow-xs overflow-hidden transition-all duration-200">
        <div
          onClick={() => setGoogleExpanded((prev) => !prev)}
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
              onClick={() => setGoogleExpanded((prev) => !prev)}
              aria-label={googleExpanded ? 'Collapse section' : 'Expand section'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1f222e] transition-all cursor-pointer border-none bg-transparent"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  googleExpanded ? 'rotate-180 text-gray-700 dark:text-gray-200' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>

        {googleExpanded && (
          <div className="px-5 pb-5 pt-0 border-t border-[#e4e4eb] dark:border-[#1e2029] animate-in fade-in duration-200">
            <div className="grid grid-cols-3 gap-3 w-full pt-4">
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
        )}
      </div>

      {/* 2. Notion Workspace Accordion Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl shadow-xs overflow-hidden transition-all duration-200">
        <div
          onClick={() => setNotionExpanded((prev) => !prev)}
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
              onClick={() => setNotionExpanded((prev) => !prev)}
              aria-label={notionExpanded ? 'Collapse section' : 'Expand section'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1f222e] transition-all cursor-pointer border-none bg-transparent"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  notionExpanded ? 'rotate-180 text-gray-700 dark:text-gray-200' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>

        {notionStatusMessage && !notionConnected && (
          <div className="mx-5 mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
            <span>{notionStatusMessage}</span>
          </div>
        )}

        {notionError && (
          <div className="mx-5 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
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

        {showTokenFallback && !notionConnected && (
          <form
            onSubmit={handleConnectNotionToken}
            className="mx-5 mb-4 flex flex-col gap-2.5 p-3.5 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029] animate-in fade-in duration-150"
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

        {notionExpanded && (
          <div className="px-5 pb-5 pt-0 border-t border-[#e4e4eb] dark:border-[#1e2029] animate-in fade-in duration-200">
            <div className="grid grid-cols-3 gap-3 w-full pt-4">
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
        )}
      </div>

      {/* 3. Obsidian Vault Accordion Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl shadow-xs overflow-hidden transition-all duration-200">
        <div
          onClick={() => setObsidianExpanded((prev) => !prev)}
          className="p-5 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-[#161822]/50 transition-colors"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Authentic Obsidian Brand Logo */}
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
              onClick={() => setObsidianExpanded((prev) => !prev)}
              aria-label={obsidianExpanded ? 'Collapse section' : 'Expand section'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1f222e] transition-all cursor-pointer border-none bg-transparent"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  obsidianExpanded ? 'rotate-180 text-gray-700 dark:text-gray-200' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>

        {obsidianExpanded && (
          <div className="px-5 pb-5 pt-0 border-t border-[#e4e4eb] dark:border-[#1e2029] animate-in fade-in duration-200">
            <div className="grid grid-cols-3 gap-3 w-full pt-4">
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
        )}
      </div>
    </div>
  );
};
