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

import googleLogo from '../../assets/logos/google.png';
import notionLogo from '../../assets/logos/notion.png';
import obsidianLogo from '../../assets/logos/obsidian.png';

// Official Authentic Google Brand Logo
const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <img src={googleLogo} alt="Google" className={`${className} object-contain`} />
);

// Official Authentic Notion Brand Logo
const NotionLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <img src={notionLogo} alt="Notion" className={`${className} object-contain`} />
);

// Official Authentic Obsidian Brand Logo
const ObsidianLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <img src={obsidianLogo} alt="Obsidian" className={`${className} object-contain`} />
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

      {/* 2. Notion Workspace Accordion Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl shadow-xs overflow-hidden transition-all duration-300">
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
          onClick={() => setObsidianExpanded((prev) => !prev)}
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
              onClick={() => setObsidianExpanded((prev) => !prev)}
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
    </div>
  );
};
