const { contextBridge, ipcRenderer } = require('electron');

let webUtils = null;
try {
  webUtils = require('electron').webUtils;
} catch (e) {}

try {
  contextBridge.exposeInMainWorld('jarvisAPI', {
    // Window events
    showWindow: () => ipcRenderer.send('jarvis:show-window'),
    hideWindow: () => ipcRenderer.send('jarvis:hide'),
    onWindowStateChanged: (callback) => {
      ipcRenderer.on('window:state-changed', (event, data) => callback(data));
    },
    onDesktopScreenshot: (callback) => {
      ipcRenderer.on('desktop:screenshot-blurred', (event, dataUrl) => callback(dataUrl));
    },
    onOpenSettings: (callback) => {
      ipcRenderer.on('open:settings', () => callback());
    },
    toggleWindow: () => ipcRenderer.invoke('jarvis:toggle-window'),
    cancelTask: () => ipcRenderer.invoke('jarvis:cancel-task'),
    onHotkeyTrigger: (callback) => {
      ipcRenderer.on('hotkey:trigger', (event, data) => callback(data));
    },
    onWakeWordDetected: (callback) => {
      ipcRenderer.on('wake-word-detected', (event, data) => callback(data));
    },
    onReminderFired: (callback) => {
      ipcRenderer.on('jarvis:reminder-fired', (event, data) => callback(data));
    },
    setListeningMode: (mode) => ipcRenderer.send('jarvis:set-mode', mode),
    setRecordingActive: (active) => ipcRenderer.send('jarvis:recording-state', active),

    // File Utilities
    getPathForFile: (file) => {
      try {
        if (webUtils && typeof webUtils.getPathForFile === 'function') {
          const p = webUtils.getPathForFile(file);
          if (p) return p;
        }
      } catch (e) {}
      return (file && file.path) ? file.path : '';
    },

    saveTempFile: (fileData) => ipcRenderer.invoke('jarvis:save-temp-file', fileData),
    readImageDataUrl: (filePath) => ipcRenderer.invoke('jarvis:read-image-data-url', filePath),

    // Desktop Automation & Vision Tools
    openApp: (appName) => ipcRenderer.invoke('jarvis:open-app', appName),
    checkApp: (appName) => ipcRenderer.invoke('jarvis:check-app', appName),
    writeFile: (options) => ipcRenderer.invoke('jarvis:write-file', options),
    openUrl: (url) => ipcRenderer.invoke('jarvis:open-url', url),
    sendEmail: (options) => ipcRenderer.invoke('jarvis:send-email', options),
    systemControl: (action) => ipcRenderer.invoke('jarvis:system-control', action),
    runCommand: (command) => ipcRenderer.invoke('jarvis:run-command', command),
    typeText: (text) => ipcRenderer.invoke('jarvis:type-text', text),
    captureScreen: (options) => ipcRenderer.invoke('jarvis:capture-screen', options),
    mouseClick: (options) => ipcRenderer.invoke('jarvis:mouse-click', options),
    mouseDoubleClick: (options) => ipcRenderer.invoke('jarvis:mouse-double-click', options),
    mouseRightClick: (options) => ipcRenderer.invoke('jarvis:mouse-right-click', options),
    mouseMove: (options) => ipcRenderer.invoke('jarvis:mouse-move', options),
    executeAI: (prompt, context) => ipcRenderer.invoke('jarvis:execute-ai', prompt, context),
    executeDualAI: (prompt, brainA, brainB, context) => ipcRenderer.invoke('jarvis:execute-dual-ai', prompt, brainA, brainB, context),
    synthesizeConsensus: (prompt, replyA, replyB, brainAName, brainBName) => ipcRenderer.invoke('jarvis:synthesize-consensus', prompt, replyA, replyB, brainAName, brainBName),
    executeAIAudio: (data) => ipcRenderer.invoke('jarvis:execute-ai-audio', data),
    speakText: (text, voice, options = {}) => ipcRenderer.invoke('jarvis:speak', { text, voice, ...options }),
    fetchGrokkiVoices: () => ipcRenderer.invoke('jarvis:fetch-grokki-voices'),
    checkGrokkiVoiceHealth: () => ipcRenderer.invoke('jarvis:check-grokki-voice-health'),
    fetchElevenLabsVoices: (options = {}) => ipcRenderer.invoke('jarvis:fetch-elevenlabs-voices', options),
    fetchVoiceStudioVoices: (options = {}) => ipcRenderer.invoke('jarvis:fetch-voicestudio-voices', options),
    checkVoiceStudioHealth: (options = {}) => ipcRenderer.invoke('jarvis:check-voicestudio-health', options),
    selectFile: () => ipcRenderer.invoke('jarvis:select-file'),
    searchWeb: (query, maxResults) => ipcRenderer.invoke('jarvis:search-web', query, maxResults),

    // Hitodama Control Centre APIs
    setTopNotchInteractive: (interactive) => ipcRenderer.send('top-notch:set-interactive', interactive),
    setTopNotchFocusable: (focusable) => ipcRenderer.send('top-notch:set-focusable', focusable),
    onTopNotchTrigger: (callback) => {
      ipcRenderer.on('top-notch:trigger', (event, shouldOpen) => callback(shouldOpen));
    },
    onIslandNotification: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('island:notification', handler);
      return () => ipcRenderer.removeListener('island:notification', handler);
    },
    showIslandNotification: (data) => ipcRenderer.send('island:show-notification', data),
    onIslandActivity: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('island:activity', handler);
      return () => ipcRenderer.removeListener('island:activity', handler);
    },
    setIslandActivity: (data) => ipcRenderer.send('island:set-activity', data),
    onIslandLockMode: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('island:lock-mode', handler);
      return () => ipcRenderer.removeListener('island:lock-mode', handler);
    },
    setIslandLockMode: (data) => ipcRenderer.send('island:set-lock-mode', data),
    getClipboardHistory: () => ipcRenderer.invoke('jarvis:get-clipboard-history'),
    copyClipboardItem: (text) => ipcRenderer.invoke('jarvis:copy-clipboard-item', text),
    pasteClipboardItem: (text) => ipcRenderer.invoke('jarvis:paste-clipboard-item', text),
    pinClipboardItem: (id) => ipcRenderer.invoke('jarvis:pin-clipboard-item', id),
    deleteClipboardItem: (id) => ipcRenderer.invoke('jarvis:delete-clipboard-item', id),
    clearClipboardHistory: () => ipcRenderer.invoke('jarvis:clear-clipboard-history'),
    onClipboardHistoryUpdated: (callback) => {
      ipcRenderer.on('clipboard:history-updated', (event, data) => callback(data));
    },
    getSystemStats: () => ipcRenderer.invoke('jarvis:get-system-stats'),
    osControl: (action, target = '', value = 0) => ipcRenderer.invoke('jarvis:os-control', { action, target, value }),
    getVolume: () => ipcRenderer.invoke('jarvis:get-volume'),
    setVolume: (val) => ipcRenderer.invoke('jarvis:set-volume', val),
    toggleVolumeMute: () => ipcRenderer.invoke('jarvis:toggle-volume-mute'),
    getInstalledApps: () => ipcRenderer.invoke('jarvis:get-installed-apps'),
    launchInstalledApp: (appPath) => ipcRenderer.invoke('jarvis:launch-installed-app', appPath),
    getInstalledGames: (forceRefresh = false) => ipcRenderer.invoke('jarvis:get-installed-games', forceRefresh),
    launchInstalledGame: (game) => ipcRenderer.invoke('jarvis:launch-installed-game', game),
    getLiveMedia: () => ipcRenderer.invoke('jarvis:get-live-media'),
    getTodayData: () => ipcRenderer.invoke('jarvis:get-today-data'),
    openSettingsPage: (page) => ipcRenderer.invoke('jarvis:open-settings-page', page),
    getWallpapers: () => ipcRenderer.invoke('jarvis:get-wallpapers'),
    browseWallpaper: () => ipcRenderer.invoke('jarvis:browse-wallpaper'),
    browseWallpaperFolder: () => ipcRenderer.invoke('jarvis:browse-wallpaper-folder'),
    setWallpaper: (wallpaperPath) => ipcRenderer.invoke('jarvis:set-wallpaper', wallpaperPath),
    mediaKey: (key) => ipcRenderer.invoke('jarvis:media-key', key),

    // Presentation Slide Changer (Gesture + Voice)
    slideControl: (action) => ipcRenderer.invoke('jarvis:slide-control', action),
    onPresentationModeToggled: (callback) => {
      ipcRenderer.on('jarvis:presentation-mode', (event, data) => callback(data));
    },
    onPresentationGesture: (callback) => {
      ipcRenderer.on('jarvis:presentation-gesture', (event, data) => callback(data));
    },
    onLeftHandAction: (callback) => {
      ipcRenderer.on('jarvis:left-hand-action', (event, data) => callback(data));
    },
    togglePresentationMode: (active, mode = 'presentation') => ipcRenderer.send('jarvis:toggle-presentation-mode', active, mode),
    setGestureMode: (mode) => ipcRenderer.send('jarvis:set-gesture-mode', mode),
    killCamera: () => ipcRenderer.invoke('jarvis:kill-camera'),
    setWindowPosition: (x, y) => ipcRenderer.invoke('jarvis:set-window-position', { x, y }),
    getWindowPosition: () => ipcRenderer.invoke('jarvis:get-window-position'),
    resetWindowPosition: () => ipcRenderer.invoke('jarvis:reset-window-position'),

    // Configuration & Google & Notion Workspaces
    getConfig: () => ipcRenderer.invoke('jarvis:get-config'),
    saveConfig: (config) => ipcRenderer.invoke('jarvis:save-config', config),
    connectGoogle: () => ipcRenderer.invoke('jarvis:connect-google'),
    disconnectGoogle: () => ipcRenderer.invoke('jarvis:disconnect-google'),
    getGoogleStatus: () => ipcRenderer.invoke('jarvis:get-google-status'),
    onGoogleConnected: (callback) => {
      const handler = (event, profile) => callback(profile);
      ipcRenderer.on('google:connected', handler);
      return () => ipcRenderer.removeListener('google:connected', handler);
    },
    onGoogleDisconnected: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('google:disconnected', handler);
      return () => ipcRenderer.removeListener('google:disconnected', handler);
    },
    onRefreshWorkspaceStatus: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('jarvis:refresh-workspace-status', handler);
      return () => ipcRenderer.removeListener('jarvis:refresh-workspace-status', handler);
    },
    saveGoogleCredentials: (clientId, clientSecret) => ipcRenderer.invoke('jarvis:save-google-credentials', { clientId, clientSecret }),
    hasGoogleCredentials: () => ipcRenderer.invoke('jarvis:has-google-credentials'),
    connectNotion: (token) => ipcRenderer.invoke('jarvis:connect-notion', token),
    disconnectNotion: () => ipcRenderer.invoke('jarvis:disconnect-notion'),
    getNotionStatus: () => ipcRenderer.invoke('jarvis:get-notion-status'),
    openNotionPortal: () => ipcRenderer.invoke('jarvis:open-notion-portal'),
    saveNotionOAuth: (creds) => ipcRenderer.invoke('jarvis:save-notion-oauth', creds),
    onNotionConnected: (callback) => {
      const handler = (event, profile) => callback(profile);
      ipcRenderer.on('notion:connected', handler);
      return () => ipcRenderer.removeListener('notion:connected', handler);
    },
    selectObsidianVault: () => ipcRenderer.invoke('jarvis:select-obsidian-vault'),
    getObsidianStatus: () => ipcRenderer.invoke('jarvis:get-obsidian-status'),
    disconnectObsidian: () => ipcRenderer.invoke('jarvis:disconnect-obsidian'),
    openObsidianVault: (notePath) => ipcRenderer.invoke('jarvis:open-obsidian-vault', notePath),

    connectGitHub: (token) => ipcRenderer.invoke('jarvis:connect-github', token),
    disconnectGitHub: () => ipcRenderer.invoke('jarvis:disconnect-github'),
    getGitHubStatus: () => ipcRenderer.invoke('jarvis:get-github-status'),
    openGitHubPortal: () => ipcRenderer.invoke('jarvis:open-github-portal'),
    saveGitHubOAuth: (creds) => ipcRenderer.invoke('jarvis:save-github-oauth', creds),
    onGitHubConnected: (callback) => {
      const handler = (event, profile) => callback(profile);
      ipcRenderer.on('github:connected', handler);
      return () => ipcRenderer.removeListener('github:connected', handler);
    },
    getGitHubRepos: (options) => ipcRenderer.invoke('jarvis:get-github-repos', options),
    getGitStatus: (cwd) => ipcRenderer.invoke('jarvis:git-status', cwd),
    gitFetch: (cwd) => ipcRenderer.invoke('jarvis:git-fetch', cwd),
    gitPull: (cwd) => ipcRenderer.invoke('jarvis:git-pull', cwd),
    gitPush: (cwd, options) => ipcRenderer.invoke('jarvis:git-push', cwd, options),
    gitCommit: (cwd, options) => ipcRenderer.invoke('jarvis:git-commit', cwd, options),
    gitClone: (cloneUrl, targetPath) => ipcRenderer.invoke('jarvis:git-clone', cloneUrl, targetPath),
    gitSelectDir: () => ipcRenderer.invoke('jarvis:git-select-dir'),
    restoreDefaultGitHubOAuth: () => ipcRenderer.invoke('jarvis:restore-default-github-oauth'),

    // WhatsApp & OpenWA Integration
    getOpenWAStatus: (forceRefresh) => ipcRenderer.invoke('jarvis:get-openwa-status', forceRefresh),
    getOpenWAQr: (forceFresh) => ipcRenderer.invoke('jarvis:get-openwa-qr', forceFresh),
    disconnectOpenWA: () => ipcRenderer.invoke('jarvis:disconnect-openwa'),
    testOpenWASend: (opts) => ipcRenderer.invoke('jarvis:test-openwa-send', opts),
    grokkiSmartReply: (opts) => ipcRenderer.invoke('jarvis:grokki-smart-reply', opts),
    getOpenWAChats: (limit) => ipcRenderer.invoke('jarvis:get-openwa-chats', limit),
    onOpenWAStatusChanged: (callback) => {
      const handler = (event, status) => callback(status);
      ipcRenderer.on('openwa-status-changed', handler);
      return () => ipcRenderer.removeListener('openwa-status-changed', handler);
    },

    // Project / Local Folder Context (@file & @folder)
    getWorkspaceRoot: () => ipcRenderer.invoke('jarvis:get-workspace-root'),
    setWorkspaceRoot: (folderPath) => ipcRenderer.invoke('jarvis:set-workspace-root', folderPath),
    selectWorkspaceFolder: () => ipcRenderer.invoke('jarvis:select-workspace-folder'),
    scanWorkspaceFiles: (options) => ipcRenderer.invoke('jarvis:scan-workspace-files', options),
    readWorkspaceItem: (path) => ipcRenderer.invoke('jarvis:read-workspace-item', path),
    openWorkspaceFile: (filePathOrName) => ipcRenderer.invoke('jarvis:open-workspace-file', filePathOrName),

    closeDashboard: () => ipcRenderer.send('dashboard:close'),
    minimizeDashboard: () => ipcRenderer.send('dashboard:minimize'),
    maximizeDashboard: () => ipcRenderer.send('dashboard:maximize'),
    isDashboardMaximized: () => ipcRenderer.invoke('dashboard:is-maximized'),
    onMaximizedChange: (callback) => {
      const handler = (event, isMax) => callback(isMax);
      ipcRenderer.on('dashboard:maximized-change', handler);
      return () => ipcRenderer.removeListener('dashboard:maximized-change', handler);
    },
    testAiKey: (options) => ipcRenderer.invoke('dashboard:test-ai-key', options),
    fetchProviderModels: (options) => ipcRenderer.invoke('dashboard:fetch-provider-models', options),
    checkOllamaStatus: (endpoint) => ipcRenderer.invoke('jarvis:check-ollama-status', endpoint),
    launchOllama: () => ipcRenderer.invoke('jarvis:launch-ollama'),
    pullOllamaModel: (options) => ipcRenderer.invoke('jarvis:pull-ollama-model', options),
    deleteOllamaModel: (options) => ipcRenderer.invoke('jarvis:delete-ollama-model', options),
    onOllamaPullProgress: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('ollama:pull-progress', handler);
      return () => ipcRenderer.removeListener('ollama:pull-progress', handler);
    },
    getSystemInfo: () => ipcRenderer.invoke('dashboard:get-system-info'),
    getAppVersion: () => ipcRenderer.invoke('app:get-version'),
    checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
    restartAndInstallUpdate: (data) => ipcRenderer.send('app:restart-and-install', data),
    openConfigFolder: () => ipcRenderer.invoke('app:open-config-folder'),
    notifySplashFinished: () => ipcRenderer.send('splash:finished'),
    onAppReady: (callback) => {
      ipcRenderer.on('app:ready', () => callback());
    },
    onConfigUpdated: (callback) => {
      ipcRenderer.on('config:updated', (event, data) => callback(data));
    },

    // Grokki Persistent Memory System
    getAllMemories: (filters) => ipcRenderer.invoke('jarvis:get-all-memories', filters),
    getMemory: (id) => ipcRenderer.invoke('jarvis:get-memory', id),
    addMemory: (memoryData) => ipcRenderer.invoke('jarvis:add-memory', memoryData),
    updateMemory: (id, updates) => ipcRenderer.invoke('jarvis:update-memory', { id, updates }),
    deleteMemory: (id) => ipcRenderer.invoke('jarvis:delete-memory', id),
    pinMemory: (id, pinned) => ipcRenderer.invoke('jarvis:pin-memory', { id, pinned }),
    getAllProjects: () => ipcRenderer.invoke('jarvis:get-all-projects'),
    saveProject: (projectData) => ipcRenderer.invoke('jarvis:save-project', projectData),
    deleteProject: (projectId) => ipcRenderer.invoke('jarvis:delete-project', projectId),
    getMemoryStats: () => ipcRenderer.invoke('jarvis:get-memory-stats'),
    clearAllMemories: () => ipcRenderer.invoke('jarvis:clear-all-memories'),
    exportMemories: () => ipcRenderer.invoke('jarvis:export-memories'),
    processMemoryNow: (data) => ipcRenderer.invoke('jarvis:process-memory-now', data),

    // Chat Lock Authentication
    verifyWindowsAuth: (options) => ipcRenderer.invoke('jarvis:verify-windows-auth', options),
    triggerBluetoothPasskey: (options) => ipcRenderer.invoke('jarvis:trigger-bluetooth-passkey', options),

    // Pocket Grokki (Zero-Install Mobile LAN Bridge)
    getPocketStatus: () => ipcRenderer.invoke('jarvis:get-pocket-status'),
    togglePocketServer: (enable) => ipcRenderer.invoke('jarvis:toggle-pocket-server', enable),
    onPocketDeviceConnected: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('jarvis:pocket-device-connected', handler);
      return () => ipcRenderer.removeListener('jarvis:pocket-device-connected', handler);
    },
    onPocketDeviceDisconnected: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('jarvis:pocket-device-disconnected', handler);
      return () => ipcRenderer.removeListener('jarvis:pocket-device-disconnected', handler);
    },
    onPocketPhotoReceived: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('jarvis:pocket-photo-received', handler);
      return () => ipcRenderer.removeListener('jarvis:pocket-photo-received', handler);
    },
    onPocketChatSent: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('jarvis:pocket-chat-sent', handler);
      return () => ipcRenderer.removeListener('jarvis:pocket-chat-sent', handler);
    },

    // Tamagotchi Dimension Hop
    hopGrokkiToPhone: () => ipcRenderer.invoke('jarvis:hop-grokki-to-phone'),
    hopGrokkiToPC: () => ipcRenderer.invoke('jarvis:hop-grokki-to-pc'),
    beamFileToPhone: (filePath) => ipcRenderer.invoke('jarvis:beam-file-to-phone', filePath),
    onGrokkiHoppedToPhone: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('jarvis:grokki-hopped-to-phone', handler);
      return () => ipcRenderer.removeListener('jarvis:grokki-hopped-to-phone', handler);
    },
    onGrokkiHoppedToPC: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('jarvis:grokki-hopped-to-pc', handler);
      return () => ipcRenderer.removeListener('jarvis:grokki-hopped-to-pc', handler);
    },
    onPocketTaskCompleted: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('jarvis:pocket-task-completed', handler);
      return () => ipcRenderer.removeListener('jarvis:pocket-task-completed', handler);
    },

    // University / Academic Portal
    getAcademicStatus: () => ipcRenderer.invoke('jarvis:get-academic-status'),
    saveAcademicCredentials: (data) => ipcRenderer.invoke('jarvis:save-academic-credentials', data),
    syncAcademicPortal: () => ipcRenderer.invoke('jarvis:sync-academic-portal'),
    disconnectAcademicPortal: () => ipcRenderer.invoke('jarvis:disconnect-academic-portal'),
    getAcademicData: () => ipcRenderer.invoke('jarvis:get-academic-data'),

    // Hitodama Powerpack: Circle to Ask & Voice Dictation
    startCircleToAsk: () => ipcRenderer.invoke('jarvis:start-circle-to-ask'),
    submitCircleCrop: (dataUrl, bounds) => ipcRenderer.send('jarvis:submit-circle-crop', dataUrl, bounds),
    cancelCircleCrop: () => ipcRenderer.send('jarvis:cancel-circle-crop'),
    onCircleOverlayData: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('circle:overlay-data', handler);
      return () => ipcRenderer.removeListener('circle:overlay-data', handler);
    },
    onCircleToAskReady: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('jarvis:circle-to-ask-ready', handler);
      return () => ipcRenderer.removeListener('jarvis:circle-to-ask-ready', handler);
    },
    startVoiceDictation: () => ipcRenderer.invoke('jarvis:start-voice-dictation'),
    previewDictationAudio: (data) => ipcRenderer.invoke('jarvis:preview-dictation-audio', data),
    finishDictationAudio: (data) => ipcRenderer.send('jarvis:finish-dictation-audio', data),
    typeDictatedText: (text) => ipcRenderer.send('jarvis:type-dictated-text', text),
    cancelDictation: () => ipcRenderer.send('jarvis:cancel-dictation'),
    onDictationCommand: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('dictation:command', handler);
      return () => ipcRenderer.removeListener('dictation:command', handler);
    },

    // Hitodama: Global File Drag & Drop
    notifyDropReceived: () => ipcRenderer.send('jarvis:drop-received'),
    setIslandExpanded: (expanded) => ipcRenderer.send('jarvis:set-island-expanded', expanded),
    onWindowDragActive: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('window:drag-active', handler);
      return () => ipcRenderer.removeListener('window:drag-active', handler);
    },
    getLastDetectedDragFiles: () => ipcRenderer.invoke('jarvis:get-drag-files'),
    getSelectedExplorerFiles: () => ipcRenderer.invoke('jarvis:get-selected-explorer-files'),

    // Model Context Protocol (MCP) Client
    getMcpStatus: () => ipcRenderer.invoke('jarvis:mcp-get-status'),
    startAllMcpServers: () => ipcRenderer.invoke('jarvis:mcp-start-all'),
    connectMcpServer: (serverId, config) => ipcRenderer.invoke('jarvis:mcp-connect-server', { serverId, config }),
    disconnectMcpServer: (serverId) => ipcRenderer.invoke('jarvis:mcp-disconnect-server', serverId),
    getMcpConfig: () => ipcRenderer.invoke('jarvis:mcp-get-config'),
    saveMcpConfig: (config) => ipcRenderer.invoke('jarvis:mcp-save-config', config),

    // LanceDB Embedded Vector Database
    searchLanceDb: (query, limit) => ipcRenderer.invoke('jarvis:lancedb-search', { query, limit }),
    indexFolderLanceDb: (folderPath, maxFiles) => ipcRenderer.invoke('jarvis:lancedb-index-folder', { folderPath, maxFiles }),
    getLanceDbStats: () => ipcRenderer.invoke('jarvis:lancedb-get-stats'),

    // Mem0 Long-Term Personalized Memory
    getAllMem0Memories: () => ipcRenderer.invoke('jarvis:mem0-get-all'),
    searchMem0: (query, limit) => ipcRenderer.invoke('jarvis:mem0-search', { query, limit }),
    addMem0Memory: (fact) => ipcRenderer.invoke('jarvis:mem0-add', { fact }),
    deleteMem0Memory: (id) => ipcRenderer.invoke('jarvis:mem0-delete', id),

    // browser-use Autonomous Browser Agent
    runBrowserAgent: (goal) => ipcRenderer.invoke('jarvis:browser-agent-run', { goal }),
    cancelBrowserAgent: () => ipcRenderer.invoke('jarvis:browser-agent-cancel'),

    // bytedance/UI-TARS Vision Desktop Computer-Use Agent
    runUiTars: (goal) => ipcRenderer.invoke('jarvis:uitars-run', { goal }),
    cancelUiTars: () => ipcRenderer.invoke('jarvis:uitars-cancel'),
  });
  console.log('Preload: jarvisAPI successfully exposed in main world.');
} catch (err) {
  console.error('CRITICAL: Failed to expose jarvisAPI in preload:', err);
}
