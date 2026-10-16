export interface JarvisConfig {
  provider: 'gemini' | 'groq' | 'ollama' | 'openrouter';
  geminiApiKey?: string;
  groqApiKey?: string;
  groqModel?: string;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  wakeWord?: string;
  hotkey?: string;
  voiceEnabled?: boolean;
  ttsEnabled?: boolean;
  pillTheme?: 'glass' | 'original';
  wakeWordEnabled?: boolean;
  musicProvider?: string;
  ttsVoice?: string;
  userName?: string;
  userNickname?: string;
  userTone?: 'companion' | 'architect' | 'sarcastic' | 'executive';
  userBio?: string;
  dashboardTheme?: 'light' | 'dark';
  launchOnStartup?: boolean;
  closeAction?: 'tray' | 'quit';
}

export interface GoogleProfile {
  name?: string;
  email?: string;
  picture?: string;
}

export interface GoogleStatusResponse {
  connected: boolean;
  profile?: GoogleProfile | null;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  osRelease?: string;
  totalMemGb: string;
  freeMemGb: string;
  cpus: number;
  cpuModel: string;
  username: string;
  hostname: string;
}

export interface AttachedFileInfo {
  path: string;
  name: string;
  size?: number;
  ext?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionsExecuted?: any[];
  attachedFile?: AttachedFileInfo | string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface JarvisAPI {
  getConfig: () => Promise<JarvisConfig>;
  saveConfig: (cfg: Partial<JarvisConfig>) => Promise<JarvisConfig>;
  connectGoogle: () => Promise<{ success: boolean; message?: string; error?: string }>;
  disconnectGoogle?: () => Promise<{ success: boolean }>;
  getGoogleStatus: () => Promise<GoogleStatusResponse>;
  closeDashboard: () => void;
  minimizeDashboard: () => void;
  maximizeDashboard?: () => void;
  testAiKey: (options: { provider: string; key?: string; model?: string; endpoint?: string }) => Promise<{ success: boolean; latencyMs?: number; reply?: string; error?: string }>;
  getSystemInfo: () => Promise<SystemInfo>;
  speakText: (text: string, voice: string) => Promise<{ success: boolean; base64Audio?: string; error?: string }>;
  executeAI?: (prompt: string, context?: any) => Promise<{ success: boolean; reply?: string; message?: string; actionsExecuted?: any[]; error?: string }>;
  selectFile?: () => Promise<{ canceled: boolean; path?: string; name?: string; filePaths?: string[]; size?: number; ext?: string }>;
  onConfigUpdated?: (callback: (data: JarvisConfig) => void) => void;
}

declare global {
  interface Window {
    jarvisAPI?: JarvisAPI;
  }
}
