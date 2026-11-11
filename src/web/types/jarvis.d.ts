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
  | 'qwen'
  | 'litellm'
  | 'bifrost'
  | 'portkey'
  | 'helicone'
  | 'routellm'
  | 'newapi'
  | 'higress'
  | 'clawrouter';

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

export interface ActiveModelPull {
  modelName: string;
  status: string;
  percent: number;
  completed?: boolean;
  total?: number;
  error?: string;
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
  litellmApiKey?: string;
  litellmModel?: string;
  litellmEndpoint?: string;
  bifrostApiKey?: string;
  bifrostModel?: string;
  bifrostEndpoint?: string;
  portkeyApiKey?: string;
  portkeyModel?: string;
  portkeyEndpoint?: string;
  heliconeApiKey?: string;
  heliconeModel?: string;
  heliconeEndpoint?: string;
  routellmApiKey?: string;
  routellmModel?: string;
  routellmEndpoint?: string;
  newapiApiKey?: string;
  newapiModel?: string;
  newapiEndpoint?: string;
  higressApiKey?: string;
  higressModel?: string;
  higressEndpoint?: string;
  clawrouterApiKey?: string;
  clawrouterModel?: string;
  clawrouterEndpoint?: string;
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
  shareLocation?: boolean;
  locationCity?: string;
  locationRegion?: string;
  locationCountry?: string;
  locationLat?: number;
  locationLon?: number;
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

export interface GroundingImage {
  title: string;
  image: string;
  thumbnail?: string;
  url?: string;
}

export interface GroundingMetadata {
  query: string;
  sources: GroundingSource[];
  relatedImages?: GroundingImage[];
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

export type ChatLockMethod = 'windows' | 'mobile_passkey' | 'custom';

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  createdAt?: number;
  messages: ChatMessage[];
  isPinned?: boolean;
  isArchived?: boolean;
  isLocked?: boolean;
  lockMethod?: ChatLockMethod;
  lockPasswordHash?: string;
  mode?: 'chat' | 'agent';
  workspaceRoot?: string;
  workspaceName?: string;
  effort?: 'low' | 'medium' | 'high' | 'highest';
  permission?: 'review' | 'default' | 'auto' | 'turbo';
}

export interface GrokkiSkill {
  id: string;
  name: string;
  title?: string;
  description: string;
  category?: 'coding' | 'workflows' | 'debugging' | 'browser' | 'database' | 'security' | 'docs' | 'custom' | string;
  tags?: string[];
  triggers?: string[];
  tools?: string[];
  author?: string;
  version?: string;
  isBuiltIn: boolean;
  isEnabled: boolean;
  instructions: string;
  rawMarkdown?: string;
  updatedAt?: number;
}

export interface GrokkiPlugin {
  id: string;
  name: string;
  badge?: string;
  description: string;
  category: 'official' | 'custom' | 'mcp';
  icon?: string;
  isEnabled: boolean;
  mcpServer?: {
    transport?: 'stdio' | 'streamable-http' | 'sse';
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
  } | null;
  config?: Record<string, any>;
  createdAt?: string;
}

export interface JarvisAPI {
  getSkills?: () => Promise<{ success: boolean; skills: GrokkiSkill[] }>;
  toggleSkill?: (skillId: string, enabled?: boolean) => Promise<{ success: boolean; enabled: boolean; disabledSkills?: string[] }>;
  saveSkill?: (skillData: Partial<GrokkiSkill> | { rawMarkdown: string; id?: string }) => Promise<{ success: boolean; skill?: GrokkiSkill; error?: string }>;
  deleteSkill?: (skillId: string) => Promise<{ success: boolean; error?: string }>;
  importSkillFile?: (opts?: { content?: string; fileName?: string }) => Promise<{ success?: boolean; skill?: GrokkiSkill; canceled?: boolean; error?: string }>;
  openSkillsFolder?: () => Promise<{ success: boolean; path?: string }>;
  exportSkillFile?: (skillId: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  generateSkill?: (userRequirement: string) => Promise<{ success: boolean; markdown?: string; error?: string }>;
  getPlugins?: () => Promise<{ success: boolean; official: GrokkiPlugin[]; custom: GrokkiPlugin[] }>;
  togglePlugin?: (pluginId: string, enabled: boolean) => Promise<{ success: boolean; pluginId?: string; isEnabled?: boolean; error?: string }>;
  savePluginConfig?: (pluginId: string, config: Record<string, any>) => Promise<{ success: boolean; pluginId?: string; config?: Record<string, any>; error?: string }>;
  addCustomPlugin?: (pluginData: Partial<GrokkiPlugin>) => Promise<{ success: boolean; plugin?: GrokkiPlugin; error?: string }>;
  deletePlugin?: (pluginId: string) => Promise<{ success: boolean; pluginId?: string; error?: string }>;
  dismissOllamaPull?: () => Promise<{ success: boolean }>;
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
  getOpenWAQr?: (forceFresh?: boolean | string) => Promise<{ success: boolean; qrDataUrl?: string; rawQr?: string; error?: string }>;
  requestOpenWAPairingCode?: (opts: { phoneNumber: string; sessionId?: string }) => Promise<{ success: boolean; pairingCode?: string; error?: string }>;
  testOpenWASend?: (opts: { to: string; message: string }) => Promise<{ success: boolean; messageId?: string; error?: string }>;
  getOpenWAChats?: (limit?: number) => Promise<{ success: boolean; chats?: any[]; error?: string }>;
  onOpenWAStatusChanged?: (callback: (status: any) => void) => () => void;
  getWorkspaceRoot?: () => Promise<{ workspaceRoot: string; folderName: string }>;
  setWorkspaceRoot?: (folderPath: string) => Promise<{ success: boolean; workspaceRoot?: string; error?: string }>;
  selectWorkspaceFolder?: () => Promise<{ success?: boolean; canceled?: boolean; workspaceRoot?: string; folderName?: string }>;
  scanWorkspaceFiles?: (options?: { query?: string; maxResults?: number }) => Promise<{ success: boolean; workspaceRoot: string; folderName: string; items: WorkspaceMention[]; totalMatches: number; error?: string }>;
  readWorkspaceItem?: (itemPath: string) => Promise<{ success: boolean; type?: 'file' | 'folder'; name?: string; path?: string; fullPath?: string; ext?: string; size?: number; lines?: number; content?: string; tree?: string; error?: string }>;
  openWorkspaceFile?: (filePathOrName: string) => Promise<{ success: boolean; fullPath?: string; error?: string; revealed?: boolean }>;

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
  optimizeOllamaHardware?: (enabled?: boolean) => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
  getOllamaHardwareStatus?: () => Promise<{ flashAttention: boolean; keepAlive: string; optimized: boolean }>;
  detectLocation?: () => Promise<{
    success: boolean;
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    lat?: number;
    lon?: number;
    timezone?: string;
    error?: string;
  }>;
  pullOllamaModel?: (options: { modelName: string; endpoint?: string }) => Promise<{ success: boolean; modelName?: string; error?: string }>;
  deleteOllamaModel?: (options: { modelName: string; endpoint?: string }) => Promise<{ success: boolean; modelName?: string; error?: string }>;
  getActiveOllamaPull?: () => Promise<ActiveModelPull | null>;
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
  revertFileChanges?: (payload: any) => Promise<any[]>;
  cancelTask?: (convoId?: string) => Promise<{ cancelled: boolean }>;
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
  getAppVersion?: () => Promise<string>;
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
    assetId?: number;
    fileName?: string;
    assetSize?: number;
    alreadyDownloaded?: boolean;
    browserDownloadUrl?: string;
  }>;
  downloadUpdate?: (data: { assetId?: number; fileName?: string; assetSize?: number; downloadUrl?: string }) => Promise<{ success: boolean; downloadedPath?: string; error?: string }>;
  onUpdateDownloadProgress?: (callback: (progress: { percent: number; downloaded: number; total: number }) => void) => () => void;
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

  // Grokki Persistent Memory System
  getAllMemories?: (filters?: { category?: string; projectId?: string; pinned?: boolean; userConfirmed?: boolean; search?: string; tag?: string }) => Promise<MemoryItem[]>;
  getMemory?: (id: string) => Promise<MemoryItem | null>;
  addMemory?: (memoryData: Partial<MemoryItem>) => Promise<MemoryItem>;
  updateMemory?: (id: string, updates: Partial<MemoryItem>) => Promise<MemoryItem | null>;
  deleteMemory?: (id: string) => Promise<boolean>;
  pinMemory?: (id: string, pinned?: boolean) => Promise<MemoryItem | null>;
  getAllProjects?: () => Promise<ProjectItem[]>;
  saveProject?: (projectData: Partial<ProjectItem>) => Promise<ProjectItem>;
  deleteProject?: (projectId: string) => Promise<boolean>;
  getMemoryStats?: () => Promise<MemoryStats>;
  clearAllMemories?: () => Promise<boolean>;
  exportMemories?: () => Promise<any>;
  processMemoryNow?: (data?: { userPrompt?: string; assistantReply?: string; context?: any }) => Promise<MemoryStats>;

  // Chat Lock Authentication
  verifyWindowsAuth?: (options?: { password?: string; useSystemDialog?: boolean; reason?: string }) => Promise<{ success: boolean; error?: string }>;
  triggerBluetoothPasskey?: (options?: { mode?: 'setup' | 'unlock' | 'remove'; credentialId?: string; title?: string }) => Promise<{ success: boolean; credentialId?: string; error?: string }>;

  // Dynamic Island Notification
  onIslandNotification?: (callback: (data: { source: string; sender: string; message: string; icon?: string; jid?: string; filePath?: string }) => void) => () => void;
  showIslandNotification?: (data: { source: string; sender: string; message: string; icon?: string }) => void;

  // Model Context Protocol (MCP) Client
  getMcpStatus?: () => Promise<{ activeCount: number; totalTools: number; servers: Array<{ id: string; description: string; command: string; args?: string[]; enabled: boolean; connected: boolean; tools: string[] }> }>;
  startAllMcpServers?: () => Promise<any[]>;
  connectMcpServer?: (serverId: string, config: any) => Promise<{ success: boolean; tools: any[] }>;
  disconnectMcpServer?: (serverId: string) => Promise<{ success: boolean }>;
  getMcpConfig?: () => Promise<{ mcpServers: Record<string, any> }>;
  saveMcpConfig?: (config: any) => Promise<boolean>;

  // LanceDB Embedded Vector Database
  searchLanceDb?: (query: string, limit?: number) => Promise<Array<{ id: string; title: string; text: string; source: string; score?: number }>>;
  indexFolderLanceDb?: (folderPath: string, maxFiles?: number) => Promise<{ success: boolean; filesIndexed?: number; error?: string }>;
  getLanceDbStats?: () => Promise<{ isReady: boolean; count: number; tableName: string; storagePath?: string }>;

  // Mem0 Long-Term Personalized Memory
  getAllMem0Memories?: () => Promise<Array<{ id: string; memory: string; category?: string; created_at?: number }>>;
  searchMem0?: (query: string, limit?: number) => Promise<Array<{ id: string; memory: string; score?: number }>>;
  addMem0Memory?: (fact: string) => Promise<any>;
  deleteMem0Memory?: (id: string) => Promise<boolean>;

  // browser-use Autonomous Browser Agent
  runBrowserAgent?: (goal: string) => Promise<{ success: boolean; steps?: number; summary?: string; history?: string[]; error?: string }>;
  cancelBrowserAgent?: () => Promise<{ success: boolean }>;

  // bytedance/UI-TARS Vision Desktop Computer-Use Agent
  runUiTars?: (goal: string) => Promise<{ success: boolean; steps?: number; summary?: string; history?: string[]; error?: string }>;
  cancelUiTars?: () => Promise<{ success: boolean }>;

  // Grokki Agent Local Permission Interactive Bridge
  onToolPermissionRequest?: (callback: (request: {
    id: string;
    conversationId?: string;
    tool: string;
    command?: string;
    path?: string;
    actionSummary?: string;
    codeSnippet?: string;
    args?: any;
  }) => void) => () => void;
  respondToolPermission?: (response: {
    id: string;
    decision: 'once' | 'conversation' | 'global' | 'reject' | 'skip';
    feedback?: string;
  }) => void;

  // Grokki Agent Live Progress Steps Bridge
  onAgentStep?: (callback: (step: AgentLiveStep) => void) => () => void;
}

export interface AgentLiveStep {
  id: string;
  conversationId?: string;
  status: 'running' | 'completed' | 'idle';
  name: string;
  args?: any;
  result?: any;
  timestamp?: number;
}

export type MemoryCategory = 'profile' | 'project' | 'episodic' | 'knowledge';

export interface MemoryHistoryEntry {
  date: string;
  previousContent: string;
  reason?: string;
}

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  projectId?: string;
  projectName?: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  confidence: number;
  userConfirmed?: boolean;
  pinned?: boolean;
  sourceConversationId?: string;
  createdAt: string;
  updatedAt: string;
  connections?: string[];
  history?: MemoryHistoryEntry[];
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  techStack?: string[];
  status?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface MemoryStats {
  total: number;
  profile: number;
  project: number;
  episodic: number;
  knowledge: number;
  pinned: number;
  userConfirmed: number;
  projectsCount: number;
  lastUpdated: number;
}

declare global {
  interface Window {
    jarvisAPI?: JarvisAPI;
  }
}
