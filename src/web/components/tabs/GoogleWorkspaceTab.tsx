import React, { useState } from 'react';
import {
  Mail,
  Calendar,
  Folder,
  Table,
  CheckSquare,
  GraduationCap,
  Check,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  Unlink,
  Headphones,
  FileText,
  Search,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import { GoogleProfile, JarvisConfig } from '../../types/jarvis';
import WarmTooltip, { WarmTooltipGroup } from '../WarmTooltip';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface GoogleWorkspaceTabProps {
  connected: boolean;
  profile: GoogleProfile | null;
  onRefreshStatus: () => void;
  config?: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
}

export const GoogleWorkspaceTab: React.FC<GoogleWorkspaceTabProps> = ({
  connected,
  profile,
  onRefreshStatus,
  config,
  onChangeConfig,
}) => {
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  // Notion State
  const [notionKey, setNotionKey] = useState(config?.notionApiKey || '');
  const [notionDbId, setNotionDbId] = useState(config?.notionDatabaseId || '');
  const [showNotionKey, setShowNotionKey] = useState(false);
  const [testingNotion, setTestingNotion] = useState(false);
  const [notionStatusMsg, setNotionStatusMsg] = useState<{ success?: boolean; text: string } | null>(null);

  // GitHub State
  const [githubToken, setGithubToken] = useState(config?.githubToken || '');
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [testingGithub, setTestingGithub] = useState(false);
  const [githubStatusMsg, setGithubStatusMsg] = useState<{ success?: boolean; text: string } | null>(null);

  // Google OAuth Flow
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

  const handleDisconnectGoogle = async () => {
    if (!window.jarvisAPI?.disconnectGoogle) return;
    try {
      await window.jarvisAPI.disconnectGoogle();
      onRefreshStatus();
    } catch (e) {
      console.error(e);
    }
  };

  // Notion Connect & Test Flow
  const handleConnectNotion = async () => {
    const key = notionKey.trim();
    if (!key) {
      setNotionStatusMsg({ success: false, text: 'Please enter your Notion Integration Secret (starts with secret_).' });
      return;
    }

    setTestingNotion(true);
    setNotionStatusMsg(null);

    try {
      let result: any = null;

      // 1. Try Electron main process IPC
      if (window.jarvisAPI?.testNotionKey) {
        try {
          result = await window.jarvisAPI.testNotionKey({ apiKey: key });
        } catch (ipcErr: any) {
          console.warn('IPC testNotionKey failed, trying fallback:', ipcErr);
        }
      }

      // 2. Direct fetch fallback
      if (!result) {
        const res = await fetch('https://api.notion.com/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Notion-Version': '2022-06-28',
          },
        });
        if (res.ok) {
          const data = await res.json();
          result = {
            success: true,
            botName: data.name || data.bot?.owner?.user?.name || 'Grokki Integration',
            workspaceName: data.bot?.workspace_name || 'My Notion Workspace',
          };
        } else {
          const err = await res.json().catch(() => ({}));
          result = { success: false, error: err.message || `Notion returned HTTP ${res.status}` };
        }
      }

      if (result && result.success) {
        const workspaceName = result.workspaceName || 'My Notion Workspace';
        onChangeConfig?.({
          notionApiKey: key,
          notionDatabaseId: notionDbId.trim(),
          notionWorkspaceName: workspaceName,
          notionConnected: true,
        });
        setNotionStatusMsg({
          success: true,
          text: `Connected to "${workspaceName}" (${result.botName || 'Bot'}). Ready to sync notes & tasks!`,
        });
      } else {
        setNotionStatusMsg({
          success: false,
          text: result?.error || 'Invalid Notion Integration Token. Check your key permissions.',
        });
      }
    } catch (err: any) {
      setNotionStatusMsg({
        success: false,
        text: err.message || 'Failed to connect to Notion API. Check your internet connection.',
      });
    } finally {
      setTestingNotion(false);
    }
  };

  const handleDisconnectNotion = () => {
    setNotionKey('');
    setNotionDbId('');
    setNotionStatusMsg(null);
    onChangeConfig?.({
      notionApiKey: '',
      notionDatabaseId: '',
      notionWorkspaceName: '',
      notionConnected: false,
    });
  };

  // GitHub Connect & Test Flow
  const handleConnectGithub = async () => {
    const token = githubToken.trim();
    if (!token) {
      setGithubStatusMsg({ success: false, text: 'Please enter your GitHub Personal Access Token (starts with ghp_).' });
      return;
    }

    setTestingGithub(true);
    setGithubStatusMsg(null);

    try {
      let result: any = null;

      // 1. Try Electron main process IPC
      if (window.jarvisAPI?.testGitHubKey) {
        try {
          result = await window.jarvisAPI.testGitHubKey({ token });
        } catch (ipcErr: any) {
          console.warn('IPC testGitHubKey failed, trying fallback:', ipcErr);
        }
      }

      // 2. Direct fetch fallback
      if (!result) {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Grokki-Assistant',
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          result = {
            success: true,
            login: data.login,
            name: data.name || data.login,
            publicRepos: data.public_repos,
          };
        } else {
          const err = await res.json().catch(() => ({}));
          result = { success: false, error: err.message || `GitHub returned HTTP ${res.status}` };
        }
      }

      if (result && result.success) {
        onChangeConfig?.({
          githubToken: token,
          githubUsername: result.login,
          githubConnected: true,
        });
        setGithubStatusMsg({
          success: true,
          text: `Linked @${result.login} (${result.name || result.login}) with ${result.publicRepos ?? 0} repos.`,
        });
      } else {
        setGithubStatusMsg({
          success: false,
          text: result?.error || 'Invalid GitHub token. Ensure it has repo and read:user scopes.',
        });
      }
    } catch (err: any) {
      setGithubStatusMsg({
        success: false,
        text: err.message || 'Failed to connect to GitHub API.',
      });
    } finally {
      setTestingGithub(false);
    }
  };

  const handleDisconnectGithub = () => {
    setGithubToken('');
    setGithubStatusMsg(null);
    onChangeConfig?.({
      githubToken: '',
      githubUsername: '',
      githubConnected: false,
    });
  };

  const isNotionConnected = config?.notionConnected && !!config?.notionApiKey;
  const isGithubConnected = config?.githubConnected && !!config?.githubToken;

  const googleApps = [
    { label: 'Gmail Automation', icon: <Mail className="w-4 h-4 text-red-500" /> },
    { label: 'Google Calendar', icon: <Calendar className="w-4 h-4 text-blue-500" /> },
    { label: 'Drive & Docs', icon: <Folder className="w-4 h-4 text-amber-500" /> },
    { label: 'Google Sheets', icon: <Table className="w-4 h-4 text-emerald-500" /> },
    { label: 'Google Tasks', icon: <CheckSquare className="w-4 h-4 text-sky-500" /> },
    { label: 'Classroom & Deadlines', icon: <GraduationCap className="w-4 h-4 text-indigo-500" /> },
  ];

  return (
    <WarmTooltipGroup delay={350} warmWindow={250} travel={280} lean={0}>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-20">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Workspace & Student Integrations
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
              Student Hub
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Connect your study notebook, assignment tracker, and cloud workspace to let Grokki autonomously organize notes, sync deadlines, and review coursework.
          </p>
        </div>

        {/* 1. NOTION INTEGRATION CARD (Top Student Favorite) */}
        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#e4e4eb] dark:border-[#1e2029]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 border border-transparent flex items-center justify-center font-bold text-lg shadow-xs select-none">
                N
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Notion Knowledge Base & Study Notes
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Top Student Pick
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isNotionConnected
                    ? `Linked: ${config?.notionWorkspaceName || 'Notion Workspace'} • Ready for lecture notes & assignment sync`
                    : 'Connect Notion to auto-save AI lecture notes, syllabus deadlines, and research.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isNotionConnected && (
                <button
                  type="button"
                  onClick={handleDisconnectNotion}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer border border-transparent"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Unlink</span>
                </button>
              )}
              <button
                type="button"
                disabled={testingNotion}
                onClick={handleConnectNotion}
                className={`inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border transition-all shadow-xs ${
                  isNotionConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent'
                }`}
              >
                {testingNotion ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Notion...</span>
                  </>
                ) : isNotionConnected ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Notion Connected</span>
                  </>
                ) : (
                  'Connect Notion'
                )}
              </button>
            </div>
          </div>

          {/* Notion Status / Error Message */}
          {notionStatusMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2.5 ${
                notionStatusMsg.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-500/30'
              }`}
            >
              {notionStatusMsg.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              )}
              <span className="font-medium flex-1">{notionStatusMsg.text}</span>
            </div>
          )}

          {/* Credentials Inputs (when not connected or editing) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Notion Integration Secret
                </label>
                <button
                  type="button"
                  onClick={() => window.jarvisAPI?.openUrl?.('https://www.notion.so/my-integrations')}
                  className="text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                >
                  <span>Get Notion API Key</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNotionKey ? 'text' : 'password'}
                  placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={notionKey}
                  onChange={(e) => {
                    setNotionKey(e.target.value);
                    onChangeConfig?.({ notionApiKey: e.target.value });
                  }}
                  className="w-full h-9 px-3 pr-9 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNotionKey(!showNotionKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none p-0 cursor-pointer"
                >
                  {showNotionKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Default Database / Page ID <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j (from Notion URL)"
                value={notionDbId}
                onChange={(e) => {
                  setNotionDbId(e.target.value);
                  onChangeConfig?.({ notionDatabaseId: e.target.value });
                }}
                className="w-full h-9 px-3 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 font-mono"
              />
            </div>
          </div>

          {/* Student Notion Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Lecture Notes</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                Save study summaries, formulas & transcripts straight to Notion pages.
              </p>
            </div>

            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
                <ListTodo className="w-3.5 h-3.5 text-emerald-500" />
                <span>Deadlines & Tasks</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                Track homework due dates, lab reports, and syllabus exams in your DB.
              </p>
            </div>

            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Flashcards</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                Turn chat discussions and PDF uploads into structured study cards.
              </p>
            </div>

            <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
                <Search className="w-3.5 h-3.5 text-purple-500" />
                <span>Semantic Search</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                Ask Grokki to search and reference your existing Notion notes anytime.
              </p>
            </div>
          </div>
        </div>

        {/* 2. GOOGLE WORKSPACE CARD */}
        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#e4e4eb] dark:border-[#1e2029]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center text-lg text-gray-900 dark:text-gray-100 font-bold select-none">
                G
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                  Google Workspace & Classroom
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
                  {connected
                    ? `Linked: ${profile?.email || profile?.name || 'Active session'} • Ready for Calendar, Gmail, Drive & Tasks`
                    : '1-click sign-in to link Gmail, Calendar, Docs, Sheets & Classroom.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {connected && (
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer border border-transparent"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
              <button
                type="button"
                disabled={connectingGoogle}
                onClick={handleConnectGoogle}
                className={`inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border transition-all shadow-xs ${
                  connected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
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
                  'Connect Google Account'
                )}
              </button>
            </div>
          </div>

          {/* Integrated Apps Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 w-full pt-1">
            {googleApps.map((app, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-xs font-medium text-gray-800 dark:text-gray-200"
              >
                {app.icon}
                <span className="truncate">{app.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. GITHUB INTEGRATION CARD (CS / Engineering Students) */}
        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#e4e4eb] dark:border-[#1e2029]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center text-gray-900 dark:text-gray-100 select-none">
                <GithubIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    GitHub Coursework & Code Repositories
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Developer Pack
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isGithubConnected
                    ? `Linked: @${config?.githubUsername || 'GitHub User'} • Grokki can inspect assignments, debug errors & track milestones`
                    : 'Connect GitHub to let Grokki review code assignments, fix errors, and sync repos.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isGithubConnected && (
                <button
                  type="button"
                  onClick={handleDisconnectGithub}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer border border-transparent"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Unlink</span>
                </button>
              )}
              <button
                type="button"
                disabled={testingGithub}
                onClick={handleConnectGithub}
                className={`inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border transition-all shadow-xs ${
                  isGithubConnected
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent'
                }`}
              >
                {testingGithub ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying GitHub...</span>
                  </>
                ) : isGithubConnected ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>GitHub Connected</span>
                  </>
                ) : (
                  'Connect GitHub'
                )}
              </button>
            </div>
          </div>

          {/* GitHub Status Message */}
          {githubStatusMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2.5 ${
                githubStatusMsg.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-500/30'
              }`}
            >
              {githubStatusMsg.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              )}
              <span className="font-medium flex-1">{githubStatusMsg.text}</span>
            </div>
          )}

          {/* GitHub Token Input */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                GitHub Personal Access Token (classic or fine-grained)
              </label>
              <button
                type="button"
                onClick={() => window.jarvisAPI?.openUrl?.('https://github.com/settings/tokens')}
                className="text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
              >
                <span>Generate Token on GitHub</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="relative">
              <input
                type={showGithubToken ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={githubToken}
                onChange={(e) => {
                  setGithubToken(e.target.value);
                  onChangeConfig?.({ githubToken: e.target.value });
                }}
                className="w-full h-9 px-3 pr-9 rounded-lg bg-gray-50 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowGithubToken(!showGithubToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none p-0 cursor-pointer"
              >
                {showGithubToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 4. SPOTIFY FOCUS & STUDY AUDIO */}
        <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#e4e4eb] dark:border-[#1e2029]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 select-none">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Spotify Study Beats & Focus Music
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                    1-Click
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Launch curated study sessions or tell Grokki: &quot;Play lofi study beats on Spotify&quot;.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.jarvisAPI?.openUrl?.('https://open.spotify.com/genre/focus')}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Spotify Focus</span>
            </button>
          </div>

          {/* Quick Study Playlists */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => window.jarvisAPI?.openUrl?.('https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM')}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-[#1a1c24] hover:bg-gray-100 dark:hover:bg-[#202330] border border-gray-200 dark:border-[#1e2029] text-left transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                ☕
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-500 transition-colors">
                  Lofi Study Beats
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  Chill instrumental hip hop
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => window.jarvisAPI?.openUrl?.('https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS')}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-[#1a1c24] hover:bg-gray-100 dark:hover:bg-[#202330] border border-gray-200 dark:border-[#1e2029] text-left transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                🌊
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-500 transition-colors">
                  Deep Focus Alpha
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  Binaural waves for studying
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => window.jarvisAPI?.openUrl?.('https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO')}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-[#1a1c24] hover:bg-gray-100 dark:hover:bg-[#202330] border border-gray-200 dark:border-[#1e2029] text-left transition-all cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                🎹
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-500 transition-colors">
                  Peaceful Piano
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  Calm piano for exam prep
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 5. STUDENT VOICE & CHAT SHORTCUTS CHEAT SHEET */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              Student Voice & Chat Commands
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-gray-700 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-white">&quot;Save this answer to my Notion study notes&quot;</span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Auto-formats the current chat response as a Notion page.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-gray-700 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-white">&quot;Add assignment due tomorrow at 11:59 PM&quot;</span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Schedules in Google Calendar & Notion Database.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-gray-700 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-white">&quot;Search my Drive and Notion for Physics formula sheet&quot;</span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Searches both cloud storages simultaneously.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-gray-700 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-white">&quot;Play lofi study beats on Spotify&quot;</span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Launches your study focus playlist instantly.</p>
            </div>
          </div>
        </div>
      </div>
    </WarmTooltipGroup>
  );
};
