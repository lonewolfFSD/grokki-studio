export interface StudioHotkeys {
  newChat: string;
  toggleSidebar: string;
  attachFile: string;
  voiceRecord: string;
  openCamera: string;
  focusInput: string;
  toggleTheme: string;
  openSettings: string;
}

export type AiProvider =
  | 'gemini'
  | 'omniroute'
  | 'groq'
  | 'ollama'
  | 'openrouter'
  | 'omnirouter'
  | 'openai'
  | 'grok'
  | 'deepseek'
  | 'qwen';

export interface GrainientCustomSettings {
  colors?: string[];
  type?: 'linear' | 'radial';
  angle?: number;
  bands?: number;
  speed?: number;
  flow?: number;
  scale?: number;
  softness?: number;
  silk?: number;
  grainAmount?: number;
  grainSize?: number;
  grainAnimated?: boolean;
  contrast?: number;
  saturation?: number;
  variation?: number;
}

export interface LeftHandGestureItem {
  id: string;
  fingers: number;
  type: 'app' | 'os';
  target: string;
  label?: string;
  enabled?: boolean;
}

export interface InstalledAppItem {
  name: string;
  path: string;
  exePath?: string;
  appId?: string;
  icon?: string;
  category?: string;
}

export interface JarvisConfig {
  provider: AiProvider;
  geminiApiKey?: string;
  geminiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  groqVisionModel?: string;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  grokApiKey?: string;
  grokModel?: string;
  deepseekApiKey?: string;
  deepseekModel?: string;
  qwenApiKey?: string;
  qwenModel?: string;
  omnirouteApiKey?: string;
  omnirouteModel?: string;
  omnirouteEndpoint?: string;
  cachedProviderModels?: Record<string, string[]>;
  omnirouterApiKey?: string;
  omnirouterModel?: string;
  omnirouterEndpoint?: string;
  wakeWord?: string;
  hotkey?: string;
  hotkeys?: StudioHotkeys;
  voiceEnabled?: boolean;
  ttsEnabled?: boolean;
  pillTheme?: 'grokki-blue' | 'cream' | 'jungle' | 'sakura' | 'cyber' | 'sunset' | 'arctic' | 'crimson' | 'glass' | 'original' | string;
  wakeWordEnabled?: boolean;
  musicProvider?: string;
  ttsVoice?: string;
  ttsProvider?: 'grokki' | 'grokki_voice' | 'elevenlabs' | 'voicestudio';
  grokkiVoiceId?: string;
  grokkiVoiceName?: string;
  voiceStudioEndpoint?: string;
  voiceStudioModel?: string;
  voiceStudioVoiceId?: string;
  voiceStudioVoiceName?: string;
  voiceStudioApiKey?: string;
  elevenlabsApiKey?: string;
  elevenlabsVoiceId?: string;
  elevenlabsVoiceName?: string;
  elevenlabsModel?: string;
  userName?: string;
  userNickname?: string;
  userTone?: 'companion' | 'architect' | 'sarcastic' | 'executive';
  userBio?: string;
  dashboardTheme?: 'light' | 'dark';
  launchOnStartup?: boolean;
  autoOpenStudioOnStartup?: boolean;
  closeAction?: 'tray' | 'minimize' | 'quit';
  launchMode?: 'windowed' | 'maximized' | 'fullscreen';
  alwaysOnTop?: boolean;
  showSplashScreen?: boolean;
  showIslandOnStartup?: boolean;
  streamingAnimation?: boolean;
  streamingSpeed?: 'fast' | 'normal' | 'relaxed';
  sendOnEnter?: boolean;
  soundEffectsEnabled?: boolean;
  autoCheckUpdates?: boolean;
  hardwareAcceleration?: boolean;
  chatBackgroundGradient?: boolean;
  chatBackgroundEffect?: string;
  grainientSettings?: GrainientCustomSettings;
  chatBackgroundNoise?: boolean;
  glowCursorEnabled?: boolean;
  smoothCursorEnabled?: boolean;
  smoothScroll?: boolean;
  smoothScrollIntensity?: number;
  notionApiKey?: string;
  spatialLeftHand1FingerApp?: string;
  spatialLeftHand2FingersApp?: string;
  spatialLeftHandGestures?: LeftHandGestureItem[];
  openwaUrl?: string;
  openwaApiKey?: string;
  openwaSessionId?: string;
  openwaEngine?: 'whatsapp-web.js' | 'baileys';
  openwaEnabled?: boolean;
  openwaPreferGateway?: boolean;
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

export interface NotionProfile {
  workspaceName?: string;
  workspaceIcon?: string | null;
  botName?: string;
  ownerEmail?: string | null;
}

export interface NotionStatusResponse {
  connected: boolean;
  profile?: NotionProfile | null;
}

export interface ObsidianStatusResponse {
  connected: boolean;
  vaultPath?: string | null;
  vaultName?: string | null;
  notesCount?: number;
}

export interface GitHubProfile {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  bio?: string;
  public_repos?: number;
  total_private_repos?: number;
  followers?: number;
  following?: number;
  email?: string;
  company?: string;
  location?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  private: boolean;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
  pushed_at?: string;
  open_issues_count?: number;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'staged' | 'untracked';
  code?: string;
}

export interface GitCommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitStatusResponse {
  success: boolean;
  gitInstalled?: boolean;
  gitVersion?: string;
  isRepo?: boolean;
  cwd?: string;
  branch?: string;
  remoteUrl?: string;
  remoteBranch?: string | null;
  ahead?: number;
  behind?: number;
  modifiedCount?: number;
  stagedCount?: number;
  untrackedCount?: number;
  files?: GitFileStatus[];
  recentCommits?: GitCommitInfo[];
  error?: string;
}

export interface OpenWAStatusResponse {
  connected: boolean;
  isGateway?: boolean;
  sessionStatus: 'ready' | 'qr_ready' | 'starting' | 'desktop_ready' | string;
  userPhone?: string | null;
  userName?: string | null;
  qrDataUrl?: string | null;
  sessionId?: string;
  gatewayOnline?: boolean;
  error?: string | null;
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
  category?: 'document' | 'photo' | 'video' | 'camera' | 'audio';
  previewUrl?: string;
}

export interface WorkspaceMention {
  name: string;
  path: string;
  fullPath?: string;
  type: 'file' | 'folder' | 'workspace';
  ext?: string;
  size?: number;
}

export interface GroundingSource {
  id: number;
  title: string;
  createdAt?: number;
  url: string;
  snippet: string;
  hostname: string;
  favicon?: string;
}

export interface GroundingMetadata {
  query: string;
  sources: GroundingSource[];
}

export interface DualBattleResult {
  brainA: {
    provider: string;
    model: string;
    reply: string;
    latencyMs?: number;
    grounding?: GroundingMetadata;
  };
  brainB: {
    provider: string;
    model: string;
    reply: string;
    latencyMs?: number;
    grounding?: GroundingMetadata;
  };
  consensus?: {
    content: string;
    winner?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionsExecuted?: any[];
  attachedFile?: AttachedFileInfo | string;
  isAnimated?: boolean;
  grounding?: GroundingMetadata;
  mentions?: WorkspaceMention[];
  dualBattle?: DualBattleResult;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  isPinned?: boolean;
}

export interface JarvisAPI {
  getConfig: () => Promise<JarvisConfig>;
  saveConfig: (cfg: Partial<JarvisConfig>) => Promise<JarvisConfig>;
  connectGoogle: () => Promise<{ success: boolean; message?: string; error?: string; needsCredentials?: boolean }>;
  disconnectGoogle?: () => Promise<{ success: boolean }>;
  getGoogleStatus: () => Promise<GoogleStatusResponse>;
  onGoogleConnected?: (callback: (profile: GoogleProfile | null) => void) => () => void;
  onGoogleDisconnected?: (callback: () => void) => () => void;
  onRefreshWorkspaceStatus?: (callback: () => void) => () => void;
  saveGoogleCredentials?: (clientId: string, clientSecret: string) => Promise<{ success: boolean; error?: string }>;
  hasGoogleCredentials?: () => Promise<{ hasCredentials: boolean }>;
  connectNotion?: (token?: string) => Promise<{ success: boolean; message?: string; profile?: NotionProfile; error?: string; needsInput?: boolean; mode?: 'oauth' | 'token' }>;
  disconnectNotion?: () => Promise<{ success: boolean }>;
  getNotionStatus?: () => Promise<NotionStatusResponse>;
  openNotionPortal?: () => Promise<{ success: boolean }>;
  saveNotionOAuth?: (creds: { clientId: string; clientSecret: string }) => Promise<{ success: boolean; error?: string }>;
  onNotionConnected?: (callback: (profile: NotionProfile) => void) => () => void;
  selectObsidianVault?: () => Promise<{ success?: boolean; canceled?: boolean; vaultPath?: string; vaultName?: string; notesCount?: number }>;
  getObsidianStatus?: () => Promise<ObsidianStatusResponse>;
  disconnectObsidian?: () => Promise<{ success: boolean }>;
  openObsidianVault?: (notePath?: string) => Promise<{ success: boolean }>;
  connectGitHub?: (token?: string) => Promise<{ success: boolean; profile?: GitHubProfile; mode?: 'oauth' | 'token'; needsCredentials?: boolean; message?: string; error?: string }>;
  disconnectGitHub?: () => Promise<{ success: boolean }>;
  getGitHubStatus?: () => Promise<{ connected: boolean; profile?: GitHubProfile; hasCredentials?: boolean; isDefaultToken?: boolean }>;
  openGitHubPortal?: () => Promise<{ success: boolean }>;
  saveGitHubOAuth?: (creds: { clientId: string; clientSecret: string }) => Promise<{ success: boolean; error?: string }>;
  onGitHubConnected?: (callback: (profile: GitHubProfile) => void) => () => void;
  restoreDefaultGitHubOAuth?: () => Promise<{ success: boolean; profile?: GitHubProfile; isDefaultToken?: boolean; error?: string }>;
  getGitHubRepos?: (options?: { perPage?: number; page?: number; sort?: string }) => Promise<{ success: boolean; repos?: GitHubRepo[]; error?: string }>;
  getGitStatus?: (cwd?: string) => Promise<GitStatusResponse>;
  gitFetch?: (cwd?: string) => Promise<{ success: boolean; output?: string; error?: string }>;
  gitPull?: (cwd?: string) => Promise<{ success: boolean; output?: string; error?: string }>;
  gitPush?: (cwd?: string, options?: { branch?: string }) => Promise<{ success: boolean; output?: string; error?: string }>;
  gitCommit?: (cwd?: string, options?: { message: string; stageAll?: boolean }) => Promise<{ success: boolean; output?: string; error?: string }>;
  gitClone?: (cloneUrl: string, targetPath?: string) => Promise<{ success: boolean; targetPath?: string; output?: string; error?: string; canceled?: boolean }>;
  gitSelectDir?: () => Promise<{ success?: boolean; canceled?: boolean; path?: string; status?: GitStatusResponse }>;
  getOpenWAStatus?: (forceRefresh?: boolean) => Promise<OpenWAStatusResponse>;
  saveOpenWAConfig?: (config: {
    baseUrl?: string;
    apiKey?: string;
    sessionId?: string;
    engine?: string;
    enabled?: boolean;
    preferOpenWA?: boolean;
  }) => Promise<{ success: boolean; config?: any; error?: string }>;
  startOpenWASession?: (opts?: { name?: string; engine?: string }) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  logoutOpenWASession?: (sessionId?: string) => Promise<{ success: boolean; error?: string }>;
  getOpenWAQr?: (sessionId?: string) => Promise<{ success: boolean; qrDataUrl?: string; rawQr?: string; error?: string }>;
  requestOpenWAPairingCode?: (opts: { phoneNumber: string; sessionId?: string }) => Promise<{ success: boolean; pairingCode?: string; error?: string }>;
  testOpenWASend?: (opts: { to: string; message: string }) => Promise<{ success: boolean; messageId?: string; error?: string }>;
  getOpenWAChats?: (limit?: number) => Promise<{ success: boolean; chats?: any[]; error?: string }>;
  getWorkspaceRoot?: () => Promise<{ workspaceRoot: string; folderName: string }>;
  setWorkspaceRoot?: (folderPath: string) => Promise<{ success: boolean; workspaceRoot?: string; error?: string }>;
  selectWorkspaceFolder?: () => Promise<{ success?: boolean; canceled?: boolean; workspaceRoot?: string; folderName?: string }>;
  scanWorkspaceFiles?: (options?: { query?: string; maxResults?: number }) => Promise<{ success: boolean; workspaceRoot: string; folderName: string; items: WorkspaceMention[]; totalMatches: number; error?: string }>;
  readWorkspaceItem?: (itemPath: string) => Promise<{ success: boolean; type?: 'file' | 'folder'; name?: string; path?: string; fullPath?: string; ext?: string; size?: number; lines?: number; content?: string; tree?: string; error?: string }>;
  openWorkspaceFile?: (filePathOrName: string) => Promise<{ success: boolean; fullPath?: string; error?: string; revealed?: boolean }>;
  getAcademicStatus?: () => Promise<{ linked: boolean; university?: string; universityName?: string; username?: string; lastSynced?: number; hasData?: boolean; hasPassword?: boolean }>;
  saveAcademicCredentials?: (data: { university: string; username: string; password?: string }) => Promise<any>;
  syncAcademicPortal?: () => Promise<{ success: boolean; lastSynced?: number; studentName?: string; totalSubjects?: number; error?: string; data?: any }>;
  disconnectAcademicPortal?: () => Promise<{ success: boolean; error?: string }>;
  getAcademicData?: () => Promise<any>;
  closeDashboard: () => void;
  minimizeDashboard: () => void;
  maximizeDashboard?: () => void;
  isDashboardMaximized?: () => Promise<boolean>;
  onMaximizedChange?: (callback: (isMaximized: boolean) => void) => () => void;
  testAiKey: (options: { provider: string; key?: string; model?: string; endpoint?: string }) => Promise<{ success: boolean; latencyMs?: number; reply?: string; error?: string }>;
  fetchProviderModels?: (options: { provider: string; key?: string; endpoint?: string }) => Promise<{ success: boolean; models?: string[]; error?: string }>;
  checkOllamaStatus?: (endpoint?: string) => Promise<{
    installed: boolean;
    running: boolean;
    models?: string[];
    detailedModels?: Array<{
      name: string;
      size?: number;
      modifiedAt?: string;
      parameterSize?: string;
      family?: string;
      quantization?: string;
    }>;
    exePath?: string;
    endpoint?: string;
    error?: string;
  }>;
  launchOllama?: () => Promise<{ success: boolean; exePath?: string; error?: string }>;
  pullOllamaModel?: (options: { modelName: string; endpoint?: string }) => Promise<{ success: boolean; modelName?: string; error?: string }>;
  deleteOllamaModel?: (options: { modelName: string; endpoint?: string }) => Promise<{ success: boolean; modelName?: string; error?: string }>;
  onOllamaPullProgress?: (callback: (data: { modelName: string; status: string; percent: number; completed?: number; total?: number }) => void) => () => void;
  getSystemInfo: () => Promise<SystemInfo>;
  speakText: (text: string, voice: string, options?: { provider?: 'grokki' | 'grokki_voice' | 'elevenlabs' | 'voicestudio'; apiKey?: string; model?: string; endpoint?: string; speed?: number }) => Promise<{ success: boolean; base64Audio?: string; mimeType?: string; cleanText?: string; error?: string }>;
  fetchVoiceStudioVoices?: (options?: { endpoint?: string; apiKey?: string }) => Promise<{
    success: boolean;
    connected?: boolean;
    endpoint?: string;
    voices?: Array<{
      id: string;
      name: string;
      style: string;
      tag: string;
      accent: 'us' | 'uk';
      gender: 'female' | 'male';
      category?: string;
      previewUrl?: string;
    }>;
    error?: string;
  }>;
  checkVoiceStudioHealth?: (options?: { endpoint?: string }) => Promise<{
    connected: boolean;
    endpoint?: string;
    message?: string;
  }>;
  fetchElevenLabsVoices?: (options?: { apiKey?: string; search?: string; pageSize?: number }) => Promise<{
    success: boolean;
    voices?: Array<{
      id: string;
      name: string;
      style: string;
      tag: string;
      accent: 'us' | 'uk';
      gender: 'female' | 'male';
      previewUrl?: string;
      category?: string;
    }>;
    authenticated?: boolean;
    totalCount?: number;
    error?: string;
  }>;
  executeAI?: (prompt: string, context?: any) => Promise<{ success: boolean; reply?: string; message?: string; actionsExecuted?: any[]; grounding?: GroundingMetadata; error?: string }>;
  executeDualAI?: (prompt: string, brainA: any, brainB: any, context?: any) => Promise<{ success: boolean; isDual: boolean; brainA: any; brainB: any }>;
  synthesizeConsensus?: (prompt: string, replyA: string, replyB: string, brainAName: string, brainBName: string) => Promise<{ success: boolean; consensus: string }>;
  searchWeb?: (query: string, maxResults?: number) => Promise<GroundingSource[]>;
  executeAIAudio?: (data: { base64Audio: string; mimeType: string }) => Promise<{ success?: boolean; transcript?: string; reply?: string }>;
  selectFile?: (options?: any) => Promise<{ canceled: boolean; path?: string; name?: string; filePaths?: string[]; size?: number; ext?: string }>;
  getPathForFile?: (file: File) => string;
  saveTempFile?: (fileData: { name: string; buffer: ArrayBuffer }) => Promise<{ success: boolean; path?: string; error?: string }>;
  runCommand?: (command: string) => Promise<{ success: boolean; stdout?: string; stderr?: string }>;
  openUrl?: (url: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onConfigUpdated?: (callback: (data: JarvisConfig) => void) => void;
  checkForUpdates?: () => Promise<{
    updateAvailable: boolean;
    currentVersion?: string;
    latestVersion?: string;
    name?: string;
    downloadUrl?: string;
    downloadedPath?: string;
    releaseNotes?: string;
    message?: string;
    error?: string;
  }>;
  restartAndInstallUpdate?: (data?: any) => void;
  openConfigFolder?: () => Promise<{ success: boolean; path?: string }>;
  startCircleToAsk?: () => Promise<{ success: boolean }>;
  submitCircleCrop?: (dataUrl: string, bounds?: any) => void;
  cancelCircleCrop?: () => void;
  onCircleOverlayData?: (callback: (data: { dataUrl: string }) => void) => () => void;
  onCircleToAskReady?: (callback: (data: { dataUrl: string; bounds?: any }) => void) => () => void;
  startVoiceDictation?: () => Promise<{ success: boolean }>;
  finishDictationAudio?: (data: { base64Audio: string; mimeType: string }) => void;
  cancelDictation?: () => void;
  openApp?: (appName: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  getInstalledApps?: () => Promise<InstalledAppItem[]>;
}

declare global {
  interface Window {
    jarvisAPI?: JarvisAPI;
  }
}
