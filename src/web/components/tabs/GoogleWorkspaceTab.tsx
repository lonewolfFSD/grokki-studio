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
  ExternalLink,
  Key,
  Globe,
  Lock,
} from 'lucide-react';
import { GoogleProfile, NotionProfile } from '../../types/jarvis';

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

  // Notion State
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionProfile, setNotionProfile] = useState<NotionProfile | null>(null);
  const [connectingNotion, setConnectingNotion] = useState(false);
  const [notionMode, setNotionMode] = useState<'token' | 'oauth'>('token');
  const [showNotionInput, setShowNotionInput] = useState(false);
  const [notionToken, setNotionToken] = useState('');
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthClientSecret, setOauthClientSecret] = useState('');
  const [notionStatusMessage, setNotionStatusMessage] = useState<string | null>(null);
  const [notionError, setNotionError] = useState<string | null>(null);

  useEffect(() => {
    loadNotionStatus();

    let unsub: (() => void) | undefined;
    if (window.jarvisAPI?.onNotionConnected) {
      unsub = window.jarvisAPI.onNotionConnected((newProfile) => {
        setNotionConnected(true);
        setNotionProfile(newProfile);
        setConnectingNotion(false);
        setShowNotionInput(false);
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

  const handleConnectGoogle = async () => {
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

  const handleConnectNotion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!window.jarvisAPI?.connectNotion) return;

    setConnectingNotion(true);
    setNotionError(null);
    setNotionStatusMessage(null);

    try {
      // If in token mode and token provided, verify token
      const tokenToSubmit = notionMode === 'token' ? notionToken.trim() : '';

      // If in oauth mode and credentials typed, save credentials first
      if (notionMode === 'oauth' && oauthClientId.trim() && oauthClientSecret.trim()) {
        await window.jarvisAPI.saveNotionOAuth?.({
          clientId: oauthClientId.trim(),
          clientSecret: oauthClientSecret.trim(),
        });
      }

      const res = await window.jarvisAPI.connectNotion(tokenToSubmit);

      if (res && res.success) {
        if (res.mode === 'oauth') {
          setNotionStatusMessage('Browser opened! Select your Notion workspace and click "Allow access" to finish.');
        } else {
          setNotionConnected(true);
          setNotionProfile(res.profile || null);
          setShowNotionInput(false);
          setNotionToken('');
        }
      } else if (res && res.needsInput) {
        setShowNotionInput(true);
      } else {
        setNotionError(res?.error || res?.message || 'Authentication failed. Please verify credentials.');
        setShowNotionInput(true);
      }
    } catch (err: any) {
      setNotionError(err.message || 'Error connecting to Notion');
      setShowNotionInput(true);
    } finally {
      setConnectingNotion(false);
    }
  };

  const handleDisconnectNotion = async () => {
    if (!window.jarvisAPI?.disconnectNotion) return;
    try {
      await window.jarvisAPI.disconnectNotion();
      setNotionConnected(false);
      setNotionProfile(null);
      setShowNotionInput(false);
      setNotionError(null);
      setNotionStatusMessage(null);
    } catch (e) {
      console.error('Failed to disconnect Notion:', e);
    }
  };

  const handleOpenNotionPortal = () => {
    if (window.jarvisAPI?.openNotionPortal) {
      window.jarvisAPI.openNotionPortal();
    } else if (window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl('https://www.notion.so/profile/integrations');
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Workspace Integrations
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Connect your productivity accounts via OAuth or API to enable autonomous calendar scheduling, email actions, notes, and document management.
        </p>
      </div>

      {/* 1. Google Workspace Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#e4e4eb] dark:border-[#1e2029]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center text-lg text-gray-900 dark:text-gray-100 font-bold">
              G
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                Google Account Status
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
                {connected
                  ? `Linked: ${profile?.email || profile?.name || 'Active session'}`
                  : 'Not connected. Click to link Gmail, Calendar, Docs & Drive via 1-click Google OAuth.'}
              </p>
            </div>
          </div>

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
        </div>

        {/* Integrated Google Apps Grid */}
        <div className="grid grid-cols-3 gap-3 w-full pt-1">
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

      {/* 2. Notion Workspace Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#e4e4eb] dark:border-[#1e2029]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center text-lg text-gray-900 dark:text-gray-100 font-bold">
              N
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                Notion Workspace Status
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
                {notionConnected
                  ? `Linked: ${notionProfile?.workspaceName || 'Active Workspace'}`
                  : 'Not connected. Connect via 1-click Browser OAuth or Integration Token.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                onClick={() => {
                  if (notionToken.trim()) {
                    handleConnectNotion();
                  } else {
                    setShowNotionInput((prev) => !prev);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent transition-all shadow-xs"
              >
                {connectingNotion ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  'Connect Notion'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Expandable Notion Connection Configuration Panel */}
        {showNotionInput && !notionConnected && (
          <form
            onSubmit={handleConnectNotion}
            className="flex flex-col gap-3.5 p-4 rounded-xl bg-gray-50 dark:bg-[#161822] border border-gray-200 dark:border-[#1e2029] animate-in fade-in duration-150"
          >
            {/* Mode Switcher: Token vs OAuth */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#252836]">
              <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-gray-200/70 dark:bg-[#111218]">
                <button
                  type="button"
                  onClick={() => setNotionMode('token')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer border-none ${
                    notionMode === 'token'
                      ? 'bg-white dark:bg-[#1f222e] text-gray-900 dark:text-gray-100 shadow-xs'
                      : 'bg-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    Internal Token
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotionMode('oauth')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer border-none ${
                    notionMode === 'oauth'
                      ? 'bg-white dark:bg-[#1f222e] text-gray-900 dark:text-gray-100 shadow-xs'
                      : 'bg-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    OAuth 2.0 (Browser)
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleOpenNotionPortal}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                <span>Notion Developer Portal</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Mode 1: Direct Internal Integration Token */}
            {notionMode === 'token' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={notionToken}
                    onChange={(e) => setNotionToken(e.target.value)}
                    placeholder="ntn_... or secret_..."
                    autoFocus
                    className="flex-1 h-9 px-3 rounded-lg border border-gray-300 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-900 dark:text-gray-100 text-xs font-mono placeholder:text-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={connectingNotion || !notionToken.trim()}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {connectingNotion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Verify & Link</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 m-0">
                  Direct API connection. Create an internal integration in Notion and paste its secret token.
                </p>
              </div>
            )}

            {/* Mode 2: Interactive Browser OAuth 2.0 */}
            {notionMode === 'oauth' && (
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={oauthClientId}
                    onChange={(e) => setOauthClientId(e.target.value)}
                    placeholder="OAuth Client ID"
                    className="h-9 px-3 rounded-lg border border-gray-300 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-900 dark:text-gray-100 text-xs font-mono placeholder:text-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
                  />
                  <input
                    type="password"
                    value={oauthClientSecret}
                    onChange={(e) => setOauthClientSecret(e.target.value)}
                    placeholder="OAuth Client Secret"
                    className="h-9 px-3 rounded-lg border border-gray-300 dark:border-[#252836] bg-white dark:bg-[#101117] text-gray-900 dark:text-gray-100 text-xs font-mono placeholder:text-gray-400 focus:outline-none focus:border-gray-500 dark:focus:border-gray-400"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                    Redirect URI: http://127.0.0.1:8586/notioncallback
                  </span>
                  <button
                    type="submit"
                    disabled={connectingNotion}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent transition-all shadow-xs"
                  >
                    {connectingNotion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                    <span>Launch Browser OAuth</span>
                  </button>
                </div>
              </div>
            )}

            {notionStatusMessage && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 m-0">
                {notionStatusMessage}
              </p>
            )}

            {notionError && (
              <p className="text-[11px] text-red-500 dark:text-red-400 m-0">
                {notionError}
              </p>
            )}
          </form>
        )}

        {/* Integrated Notion Capabilities Grid */}
        <div className="grid grid-cols-3 gap-3 w-full pt-1">
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
  );
};
