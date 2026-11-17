import React, { useState } from 'react';
import { Bell, Volume2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';

interface NotificationsTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
}

const ToggleSwitch: React.FC<{ checked: boolean; onToggle: () => void; label: string }> = ({
  checked,
  onToggle,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onToggle}
    className={`w-10 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 border-none flex-shrink-0 ${
      checked ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#252836]'
    }`}
  >
    <div
      className={`w-4 h-4 rounded-full shadow-xs transform transition-transform duration-200 ${
        checked ? 'bg-white dark:bg-black translate-x-4.5' : 'bg-white translate-x-0'
      }`}
    />
  </button>
);

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ config, onChangeConfig }) => {
  const [agentAlerts, setAgentAlerts] = useState<boolean>(() => {
    try {
      return localStorage.getItem('grokki_notify_agent_done') !== 'false';
    } catch {
      return true;
    }
  });
  const [errorAlerts, setErrorAlerts] = useState<boolean>(() => {
    try {
      return localStorage.getItem('grokki_notify_errors') !== 'false';
    } catch {
      return true;
    }
  });
  const [testSent, setTestSent] = useState(false);

  const toggleAgentAlerts = () => {
    const next = !agentAlerts;
    setAgentAlerts(next);
    try {
      localStorage.setItem('grokki_notify_agent_done', String(next));
    } catch {}
  };

  const toggleErrorAlerts = () => {
    const next = !errorAlerts;
    setErrorAlerts(next);
    try {
      localStorage.setItem('grokki_notify_errors', String(next));
    } catch {}
  };

  const handleTestNotification = () => {
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        new Notification('Grokki Studio', {
          body: 'Notifications are active and ready.',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification('Grokki Studio', {
              body: 'Notifications are active and ready.',
            });
          }
        });
      }
    }
    setTestSent(true);
    setTimeout(() => setTestSent(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-2xl divide-y divide-[#e4e4eb] dark:divide-[#1f1f22]">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Volume2 className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100">
                UI Sound Effects (SFX)
              </div>
              <div className="text-[12px] text-gray-500 dark:text-zinc-400 mt-0.5">
                Subtle audio cues when messages send, commands finish, and tools execute.
              </div>
            </div>
          </div>
          <ToggleSwitch
            checked={config.soundEffectsEnabled !== false}
            onToggle={() =>
              onChangeConfig({ soundEffectsEnabled: config.soundEffectsEnabled === false })
            }
            label="Toggle UI sound effects"
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100">
                Agent Task Completion Alerts
              </div>
              <div className="text-[12px] text-gray-500 dark:text-zinc-400 mt-0.5">
                Show a desktop notification when an autonomous Agent task finishes in the background.
              </div>
            </div>
          </div>
          <ToggleSwitch
            checked={agentAlerts}
            onToggle={toggleAgentAlerts}
            label="Toggle agent task completion alerts"
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100">
                Error &amp; Rate-Limit Alerts
              </div>
              <div className="text-[12px] text-gray-500 dark:text-zinc-400 mt-0.5">
                Notify when a provider key fails or an execution step needs attention.
              </div>
            </div>
          </div>
          <ToggleSwitch
            checked={errorAlerts}
            onToggle={toggleErrorAlerts}
            label="Toggle error alerts"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-[12px] text-gray-500 dark:text-zinc-400">
          Desktop notifications follow your Windows notification settings.
        </span>
        <button
          type="button"
          onClick={handleTestNotification}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-medium bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10 cursor-pointer transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{testSent ? 'Notification sent' : 'Test notification'}</span>
        </button>
      </div>
    </div>
  );
};
