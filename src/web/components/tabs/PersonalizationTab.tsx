import React, { useState, useEffect, useCallback } from 'react';
import { JarvisConfig } from '../../types/jarvis';
import GlideSelect, { GlideSelectOption } from './GlideSelect';
import adbuLogo from '../../assets/logos/adbu.png';

interface PersonalizationTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
}

const UNIVERSITY_OPTIONS: GlideSelectOption[] = [
  {
    value: 'none',
    label: (
      <span className="inline-flex items-center gap-2">
        <span className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
        </span>
        <span className="truncate">None (Unlinked)</span>
      </span>
    ),
    tag: 'Off',
  },
  {
    value: 'adbu',
    label: (
      <span className="inline-flex items-center gap-2">
        <img
          src={adbuLogo}
          alt="ADBU"
          className="w-5 h-5 mt-0.5 rounded-full object-contain shrink-0"
        />
        <span className="truncate font-medium">Assam Don Bosco University</span>
      </span>
    ),
    tag: 'ADBU',
  },
];

export const PersonalizationTab = React.memo<PersonalizationTabProps>(({
  config,
  onChangeConfig,
}) => {
  const [selectedUni, setSelectedUni] = useState<string>('none');
  const [uniUsername, setUniUsername] = useState<string>('');
  const [uniPassword, setUniPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [academicData, setAcademicData] = useState<any>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshAcademicStatus = useCallback(async () => {
    if (!window.jarvisAPI?.getAcademicStatus) return;
    try {
      const status = await window.jarvisAPI.getAcademicStatus();
      setSyncStatus(status);
      if (status?.linked) {
        setSelectedUni(status.university || 'adbu');
        if (status.username) setUniUsername(status.username);
        if (window.jarvisAPI?.getAcademicData) {
          const data = await window.jarvisAPI.getAcademicData();
          setAcademicData(data);
        }
      } else {
        setSelectedUni('none');
        setAcademicData(null);
      }
    } catch (e) {
      console.warn('[PersonalizationTab] Academic status fetch error:', e);
    }
  }, []);

  useEffect(() => {
    refreshAcademicStatus();
  }, [refreshAcademicStatus]);

  const isLinked = Boolean(syncStatus?.linked);
  const hasSavedPassword = Boolean(syncStatus?.hasPassword);
  const isDark =
    config.dashboardTheme === 'dark' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const handleSync = async () => {
    if (selectedUni === 'none') {
      setFeedbackMsg({ type: 'error', text: 'Please select a university from the dropdown.' });
      return;
    }
    if (!uniUsername.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Enter your Student ID / username.' });
      return;
    }
    // Only require password if no saved password exists yet
    if (!hasSavedPassword && !uniPassword.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Enter your ERP password to link.' });
      return;
    }

    setIsSyncing(true);
    setFeedbackMsg(null);
    try {
      const hasCredsChanged = uniPassword.trim() ||
        uniUsername.trim() !== syncStatus?.username ||
        selectedUni !== syncStatus?.university;

      if (hasCredsChanged && window.jarvisAPI?.saveAcademicCredentials) {
        await window.jarvisAPI.saveAcademicCredentials({
          university: selectedUni,
          username: uniUsername.trim(),
          password: uniPassword.trim(),
        });
      }
      if (window.jarvisAPI?.syncAcademicPortal) {
        const res = await window.jarvisAPI.syncAcademicPortal();
        if (res && res.success) {
          setFeedbackMsg({
            type: 'success',
            text: `Successfully synced ${res.totalSubjects} courses for ${res.studentName}!`,
          });
          setUniPassword('');
          await refreshAcademicStatus();
        } else {
          setFeedbackMsg({
            type: 'error',
            text: res?.error || 'Login or sync failed. Check your credentials.',
          });
        }
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Connection error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Unlink this university portal and clear cached attendance records?')) return;
    try {
      if (window.jarvisAPI?.disconnectAcademicPortal) {
        await window.jarvisAPI.disconnectAcademicPortal();
      }
      setSelectedUni('none');
      setUniUsername('');
      setUniPassword('');
      setAcademicData(null);
      setSyncStatus(null);
      setFeedbackMsg({ type: 'success', text: 'University portal unlinked.' });
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message || 'Failed to unlink' });
    }
  };

  const tones = [
    {
      id: 'companion',
      name: 'Warm Companion',
      desc: 'Friendly, empathetic, helpful, and natural everyday conversational tone.',
      badge: 'Default',
    },
    {
      id: 'architect',
      name: 'Concise Architect',
      desc: 'Extremely direct, code-first, minimal filler words, high technical precision.',
      badge: 'Pro Code',
    },
    {
      id: 'sarcastic',
      name: 'Sarcastic Tech Bro',
      desc: 'Witty, dry humor, blunt observations, energetic Hacker News banter.',
      badge: 'Humor',
    },
    {
      id: 'executive',
      name: 'Formal Executive',
      desc: 'Strictly professional, structured, polished business correspondence.',
      badge: 'Business',
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div>
        <h2 className="text-xl font-bold mt-16 tracking-tight text-gray-900 dark:text-gray-100">
          Personalization & Tone
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Customize your identity, academic portal, and the assistant's conversational tone.
        </p>
      </div>

      {/* User Identity Form */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          User Profile
        </h3>
        <div className="grid grid-cols-2 gap-3.5 w-full">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Full Name
            </label>
            <input
              type="text"
              value={config.userName || ''}
              onChange={(e) => onChangeConfig({ userName: e.target.value })}
              placeholder="e.g. Alex"
              className="h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Preferred Nickname
            </label>
            <input
              type="text"
              value={config.userNickname || ''}
              onChange={(e) => onChangeConfig({ userNickname: e.target.value })}
              placeholder="e.g. Alex, Sam"
              className="h-9 px-3 rounded-lg text-xs bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            User Context / Bio
          </label>
          <textarea
            rows={2}
            value={config.userBio || ''}
            onChange={(e) => onChangeConfig({ userBio: e.target.value })}
            placeholder="e.g. Software developer working on fullstack apps and automation."
            className="min-h-[64px] p-2.5 rounded-lg text-xs bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none resize-y leading-normal transition-all"
          />
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Grokki remembers this context to deliver personalized code suggestions and answers.
          </span>
        </div>
      </div>

      {/* University & Academic Portal */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center shrink-0 p-1.5 overflow-hidden shadow-2xs">
              {selectedUni === 'adbu' ? (
                <img src={adbuLogo} alt="ADBU" className="w-full h-auto object-contain" />
              ) : (
                <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                Academic Portal
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Link your university ERP to auto-track attendance, courses, and shortage warnings.
              </p>
            </div>
          </div>

          {isLinked ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Linked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Not Configured
            </span>
          )}
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              University
            </label>
            <GlideSelect
              options={UNIVERSITY_OPTIONS}
              value={selectedUni}
              onChange={(val) => {
                setSelectedUni(val);
                setFeedbackMsg(null);
              }}
              showTags
              size="md"
              radius={8}
              menuWidth={320}
              surfaceColor={isDark ? '#1a1c24' : '#ffffff'}
              highlightColor={isDark ? '#272a38' : '#f1f3f9'}
              textColor={isDark ? '#f3f4f6' : '#111827'}
              accentColor={isDark ? '#ffffff' : '#000000'}
              className="w-full [&>button]:w-full [&>button]:justify-between [&>button]:border [&>button]:border-gray-200 [&>button]:dark:border-[#1e2029] [&>button]:px-3 [&>button]:h-9 [&>button]:rounded-lg [&>button]:shadow-xs text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Student ID / Username
            </label>
            <input
              type="text"
              value={uniUsername}
              onChange={(e) => setUniUsername(e.target.value)}
              placeholder="e.g. DC2025BCA0020"
              disabled={selectedUni === 'none'}
              className="h-9 px-3 rounded-lg text-sm font-mono bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none disabled:opacity-50 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                ERP Password
              </label>
              {hasSavedPassword && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Saved locally
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={uniPassword}
                onChange={(e) => setUniPassword(e.target.value)}
                placeholder={hasSavedPassword ? '•••••••••••• (Saved)' : 'Enter ERP Password'}
                disabled={selectedUni === 'none'}
                className="h-9 pl-3 pr-9 w-full rounded-lg text-sm font-mono bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none disabled:opacity-50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4 fill-none stroke-currentColor stroke-2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 fill-none stroke-currentColor stroke-2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {hasSavedPassword && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                Saved locally. Grokki auto-authenticates whenever your session expires.
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons & Feedback Row */}
        {selectedUni !== 'none' && (
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-[#1e2029] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="h-8 px-3.5 rounded-lg text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50 cursor-pointer transition-all inline-flex items-center gap-1.5"
              >
                {isSyncing ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 fill-none stroke-currentColor stroke-2" viewBox="0 0 24 24">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    {isLinked ? 'Sync Now' : 'Link & Sync'}
                  </>
                )}
              </button>

              {isLinked && (
                <button
                  type="button"
                  onClick={handleUnlink}
                  disabled={isSyncing}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-gray-500 hover:text-red-500 dark:hover:text-red-400 cursor-pointer transition-colors"
                >
                  Unlink
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {feedbackMsg ? (
                <span className={feedbackMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                  {feedbackMsg.text}
                </span>
              ) : academicData?.lastSynced ? (
                `Synced ${new Date(academicData.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              ) : null}
            </div>
          </div>
        )}

        {/* Minimal, Sleek Attendance List (Apple / Linear Aesthetic) */}
        {academicData && academicData.attendance && academicData.attendance.length > 0 && (
          <div className="flex flex-col gap-3 pt-3 border-t border-gray-100 dark:border-[#1e2029]">
            {/* Student metadata header */}
            <div className="flex items-center justify-between text-xs pb-1">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {academicData.profile?.name || academicData.profile?.username}
                </span>
                <span className="text-gray-400">·</span>
                <span className="font-mono text-gray-500 dark:text-gray-400">
                  {academicData.profile?.studentId}
                </span>
                {academicData.profile?.program && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {academicData.profile.program}{academicData.profile.semester ? ` (Sem ${academicData.profile.semester})` : ''}
                    </span>
                  </>
                )}
              </div>
              <div className="text-gray-400">
                {academicData.attendance.filter((c: any) => c.isShort).length > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {academicData.attendance.filter((c: any) => c.isShort).length} courses below 75%
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    All courses safe
                  </span>
                )}
              </div>
            </div>

            {/* Courses Table */}
            <div className="rounded-lg border border-gray-200 dark:border-[#1e2029] overflow-hidden bg-gray-50/50 dark:bg-[#0c0d12]">
              <div className="divide-y divide-gray-200 dark:divide-[#1e2029]">
                {academicData.attendance.map((c: any, idx: number) => {
                  const isShort = c.isShort;
                  return (
                    <div
                      key={idx}
                      className="px-4 py-2.5 flex items-center justify-between gap-4 hover:bg-gray-100/50 dark:hover:bg-[#13141c] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                            {c.course}
                          </span>
                          <span className="font-mono text-[10px] text-gray-400 uppercase">
                            {c.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {c.attended} of {c.held} attended {c.absent ? `· ${c.absent} absent` : ''}
                        </div>
                      </div>

                      {/* Percentage & Status */}
                      <div className="flex items-center gap-3 shrink-0">
                        {isShort && c.neededFor75 > 0 && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            +{c.neededFor75} classes to 75%
                          </span>
                        )}
                        <span
                          className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                            isShort
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {c.percentage}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Companion Tone */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          Tone & Persona
        </h3>
        <div className="grid grid-cols-2 gap-3.5 w-full">
          {tones.map((t) => {
            const isSelected = (config.userTone || 'companion') === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onChangeConfig({ userTone: t.id as any })}
                className={`flex flex-col gap-1.5 p-4 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                    : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {t.name}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] uppercase tracking-wider">
                    {t.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
                  {t.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
