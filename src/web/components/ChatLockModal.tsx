import React, { useState, useEffect } from 'react';
import { Lock, Unlock, X, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { ChatLockMethod, Conversation } from '../types/jarvis';

export async function hashPasswordSha256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface ChatLockModalProps {
  isOpen: boolean;
  mode: 'setup' | 'unlock' | 'remove';
  conversation: Conversation | null;
  onClose: () => void;
  onLockConfirmed: (id: string, method: ChatLockMethod, passwordHash?: string) => void;
  onUnlockConfirmed: (id: string) => void;
  onRemoveLockConfirmed: (id: string) => void;
}

export const ChatLockModal: React.FC<ChatLockModalProps> = ({
  isOpen,
  mode,
  conversation,
  onClose,
  onLockConfirmed,
  onUnlockConfirmed,
  onRemoveLockConfirmed,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<ChatLockMethod>('windows');
  const [windowsPassword, setWindowsPassword] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isCustomTheme = false;

  useEffect(() => {
    if (!isOpen || !conversation) return;
    setError(null);
    setWindowsPassword('');
    setCustomPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setIsLoading(false);

    if (mode === 'setup') {
      setSelectedMethod(conversation.lockMethod || 'windows');
    } else {
      setSelectedMethod(conversation.lockMethod || 'custom');
    }
  }, [isOpen, mode, conversation]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !conversation) return null;

  const finishSuccess = (method: ChatLockMethod, hashOrCredId?: string) => {
    if (mode === 'setup') {
      onLockConfirmed(conversation.id, method, hashOrCredId);
    } else if (mode === 'remove') {
      onRemoveLockConfirmed(conversation.id);
    } else {
      onUnlockConfirmed(conversation.id);
    }
    onClose();
  };

  const handleWindowsVerify = async (useSystemDialog = false) => {
    setError(null);
    if (!useSystemDialog && !windowsPassword.trim()) {
      setError('Enter your Windows password or use Windows Hello.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await window.jarvisAPI?.verifyWindowsAuth?.({
        password: windowsPassword,
        useSystemDialog,
        reason: mode === 'setup' ? `Lock "${conversation.title || 'Chat'}"` : `Unlock "${conversation.title || 'Chat'}"`,
      });

      if (res?.success) {
        finishSuccess('windows');
      } else {
        setError(res?.error || 'Verification failed.');
      }
    } catch (e: any) {
      setError(e?.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBluetoothPasskey = async () => {
    setError(null);
    setIsLoading(true);
    try {
      if (window.jarvisAPI?.triggerBluetoothPasskey) {
        const res = await window.jarvisAPI.triggerBluetoothPasskey({
          mode,
          credentialId: conversation.lockPasswordHash || '',
          title: conversation.title || 'Chat',
        });

        if (res?.success) {
          finishSuccess('mobile_passkey', res.credentialId || conversation.lockPasswordHash);
          return;
        } else {
          setError(res?.error || 'Bluetooth passkey verification was canceled.');
          return;
        }
      }
      setError('Bluetooth passkey bridge unavailable.');
    } catch (err: any) {
      setError(err?.message || 'Bluetooth passkey verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customPassword) {
      setError('Enter a password.');
      return;
    }

    if (mode === 'setup') {
      if (customPassword.length < 2) {
        setError('Password is too short.');
        return;
      }
      if (confirmPassword && customPassword !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setIsLoading(true);
      const hash = await hashPasswordSha256(customPassword);
      setIsLoading(false);
      finishSuccess('custom', hash);
    } else {
      setIsLoading(true);
      const hash = await hashPasswordSha256(customPassword);
      setIsLoading(false);
      if (conversation.lockPasswordHash && hash === conversation.lockPasswordHash) {
        finishSuccess('custom', hash);
      } else {
        setError('Incorrect password.');
      }
    }
  };

  const activeMethod = mode === 'setup' ? selectedMethod : conversation.lockMethod || 'custom';

  const primaryBtnStyle: React.CSSProperties | undefined = isCustomTheme
    ? {
        backgroundColor: 'var(--studio-accent)',
        color: 'var(--studio-accent-contrast)',
      }
    : undefined;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-md p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] rounded-xl bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100 animate-in zoom-in-95 duration-150"
      >
        {/* Minimal Typographic Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-[#1e2029]">
          <div className="min-w-0 pr-3">
            <h3 className="text-[14px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {mode === 'setup' ? 'Lock conversation' : mode === 'remove' ? 'Remove lock' : 'Unlock conversation'}
            </h3>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {conversation.title || 'New Chat'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#181a22] border-none bg-transparent cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Segmented Control (Setup Mode) */}
          {mode === 'setup' && (
            <div className="grid grid-cols-3 p-1 rounded-lg bg-gray-100 dark:bg-[#0c0d12] border border-gray-200/80 dark:border-[#1e2029]">
              {(
                [
                  { id: 'windows', label: 'Windows' },
                  { id: 'mobile_passkey', label: 'Mobile Passkey' },
                  { id: 'custom', label: 'Password' },
                ] as { id: ChatLockMethod; label: string }[]
              ).map((tab) => {
                const active = selectedMethod === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(tab.id);
                      setError(null);
                    }}
                    style={
                      active && isCustomTheme
                        ? {
                            backgroundColor: 'var(--studio-item-active)',
                            borderColor: 'var(--studio-border-accent)',
                            color: 'var(--studio-accent)',
                          }
                        : undefined
                    }
                    className={`h-7 rounded-md text-[11.5px] font-medium transition-all cursor-pointer border ${
                      active
                        ? 'bg-white dark:bg-[#1a1c24] text-gray-900 dark:text-white border-gray-200/80 dark:border-[#2a2d3a] shadow-2xs'
                        : 'bg-transparent border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 1. WINDOWS PASSWORD FLOW */}
          {activeMethod === 'windows' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleWindowsVerify(false);
              }}
              className="flex flex-col gap-3.5"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11.5px] font-medium text-gray-700 dark:text-gray-300">
                    Windows account password
                  </label>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleWindowsVerify(true)}
                    className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer p-0 flex items-center gap-1"
                  >
                    <span>Use Windows Hello / PIN</span>
                    <ArrowRight size={11} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={windowsPassword}
                    onChange={(e) => setWindowsPassword(e.target.value)}
                    placeholder="Enter Windows password"
                    autoFocus
                    className="w-full h-9 px-3 pr-8 rounded-lg bg-gray-50 dark:bg-[#0c0d12] border border-gray-200 dark:border-[#1e2029] text-[12.5px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer p-0 flex items-center"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-[11.5px] text-red-500 dark:text-red-400 leading-snug">{error}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-3 rounded-lg text-[12px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#181a22] border-none bg-transparent cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={primaryBtnStyle}
                  className="h-8 px-4 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading && <Loader2 size={13} className="animate-spin" />}
                  <span>{mode === 'setup' ? 'Lock' : mode === 'remove' ? 'Remove lock' : 'Unlock'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. BLUETOOTH FIDO2 MOBILE PASSKEY FLOW */}
          {activeMethod === 'mobile_passkey' && (
            <div className="flex flex-col gap-3.5">
              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-[#0c0d12] border border-gray-200 dark:border-[#1e2029] flex flex-col gap-1">
                <div className="text-[12.5px] font-semibold text-gray-900 dark:text-gray-100">
                  Bluetooth Passkey Biometrics
                </div>
                <p className="text-[11.5px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {mode === 'setup'
                    ? 'Opens the Windows / Google FIDO2 Bluetooth passkey prompt to link your Android or iPhone fingerprint sensor.'
                    : 'Connects to your phone over Bluetooth to verify your fingerprint or Face ID passkey.'}
                </p>
              </div>

              {error && (
                <p className="text-[11.5px] text-red-500 dark:text-red-400 leading-snug">{error}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-3 rounded-lg text-[12px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#181a22] border-none bg-transparent cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleBluetoothPasskey}
                  style={primaryBtnStyle}
                  className="h-8 px-4 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading && <Loader2 size={13} className="animate-spin" />}
                  <span>
                    {isLoading
                      ? 'Waiting for passkey...'
                      : mode === 'setup'
                      ? 'Continue with Passkey'
                      : mode === 'remove'
                      ? 'Verify & Remove'
                      : 'Verify Passkey'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 3. CUSTOM PASSWORD FLOW */}
          {activeMethod === 'custom' && (
            <form onSubmit={handleCustomPasswordSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-medium text-gray-700 dark:text-gray-300">
                  {mode === 'setup' ? 'New password' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder={mode === 'setup' ? 'Enter a password' : 'Enter password'}
                    autoFocus
                    className="w-full h-9 px-3 pr-8 rounded-lg bg-gray-50 dark:bg-[#0c0d12] border border-gray-200 dark:border-[#1e2029] text-[12.5px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer p-0 flex items-center"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {mode === 'setup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-medium text-gray-700 dark:text-gray-300">
                    Confirm password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password (optional)"
                    className="w-full h-9 px-3 rounded-lg bg-gray-50 dark:bg-[#0c0d12] border border-gray-200 dark:border-[#1e2029] text-[12.5px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                  />
                </div>
              )}

              {error && (
                <p className="text-[11.5px] text-red-500 dark:text-red-400 leading-snug">{error}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-3 rounded-lg text-[12px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#181a22] border-none bg-transparent cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={primaryBtnStyle}
                  className="h-8 px-4 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading && <Loader2 size={13} className="animate-spin" />}
                  <span>{mode === 'setup' ? 'Lock' : mode === 'remove' ? 'Remove lock' : 'Unlock'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const LockedChatScreen: React.FC<{
  conversation: Conversation;
  onUnlockClick: () => void;
}> = ({ conversation, onUnlockClick }) => {
  const isCustomTheme = false;

  const methodLabel =
    conversation.lockMethod === 'windows'
      ? 'Windows password'
      : conversation.lockMethod === 'mobile_passkey'
      ? 'Mobile passkey'
      : 'Custom password';

  return (
    <div className="flex-1 h-full w-full flex flex-col items-center justify-center p-6 select-none bg-[#f7f7fa] dark:bg-[#0c0d12]">
      <div className="w-full max-w-[320px] rounded-xl bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] p-5 flex flex-col gap-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Locked · {methodLabel}
          </span>
          <Lock size={13} className="text-gray-400 dark:text-gray-500" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 truncate">
            {conversation.title || 'Locked Chat'}
          </h2>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
            Authenticate to view messages in this conversation.
          </p>
        </div>
        <div className="pt-1">
          <button
            type="button"
            onClick={onUnlockClick}
            style={
              isCustomTheme
                ? {
                    backgroundColor: 'var(--studio-accent)',
                    color: 'var(--studio-accent-contrast)',
                  }
                : undefined
            }
            className="h-8 px-4 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer border-none inline-flex items-center gap-1.5"
          >
            <Unlock size={12} />
            <span>Unlock</span>
          </button>
        </div>
      </div>
    </div>
  );
};
