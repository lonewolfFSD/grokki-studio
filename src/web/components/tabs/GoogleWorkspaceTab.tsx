import React, { useState } from 'react';
import { Mail, Calendar, Folder, Table, FileText, CheckSquare, GraduationCap, Video, Check, Loader2 } from 'lucide-react';
import { GoogleProfile } from '../../types/jarvis';

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
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!window.jarvisAPI?.connectGoogle) return;
    setConnecting(true);
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
      setConnecting(false);
      onRefreshStatus();
    }
  };

  const apps = [
    { label: 'Gmail Automation', icon: <Mail className="w-4 h-4 text-gray-400" /> },
    { label: 'Google Calendar', icon: <Calendar className="w-4 h-4 text-gray-400" /> },
    { label: 'Drive & Docs', icon: <Folder className="w-4 h-4 text-gray-400" /> },
    { label: 'Google Sheets', icon: <Table className="w-4 h-4 text-gray-400" /> },
    { label: 'Google Tasks', icon: <CheckSquare className="w-4 h-4 text-gray-400" /> },
    { label: 'Classroom & Deadlines', icon: <GraduationCap className="w-4 h-4 text-gray-400" /> },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Google Workspace Integration
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Connect your Google account to enable autonomous calendar scheduling, email actions, and document management.
        </p>
      </div>

      {/* Connection Card */}
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
                  : 'Not connected. Click to link Gmail, Calendar, Docs & Drive.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={connecting}
            onClick={handleConnect}
            className={`inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold cursor-pointer border transition-all shadow-xs ${
              connected
                ? 'bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1c24] dark:hover:bg-[#252836] text-gray-900 dark:text-gray-100 border-gray-300 dark:border-[#1e2029]'
                : 'bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-transparent'
            }`}
          >
            {connecting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : connected ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Account Linked ✓</span>
              </>
            ) : (
              'Connect Account'
            )}
          </button>
        </div>

        {/* Integrated Apps Grid */}
        <div className="grid grid-cols-3 gap-3 w-full pt-1">
          {apps.map((app, idx) => (
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
