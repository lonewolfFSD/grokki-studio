const { contextBridge, ipcRenderer } = require('electron');

let webUtils = null;
try {
  webUtils = require('electron').webUtils;
} catch (e) {}

try {
  contextBridge.exposeInMainWorld('jarvisAPI', {
    // Window events
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
    executeAIAudio: (data) => ipcRenderer.invoke('jarvis:execute-ai-audio', data),
    speakText: (text, voice) => ipcRenderer.invoke('jarvis:speak', { text, voice }),
    selectFile: () => ipcRenderer.invoke('jarvis:select-file'),
    searchWeb: (query, maxResults) => ipcRenderer.invoke('jarvis:search-web', query, maxResults),

    // Presentation Slide Changer (Gesture + Voice)
    slideControl: (action) => ipcRenderer.invoke('jarvis:slide-control', action),
    onPresentationModeToggled: (callback) => {
      ipcRenderer.on('jarvis:presentation-mode', (event, data) => callback(data));
    },
    togglePresentationMode: (active) => ipcRenderer.send('jarvis:toggle-presentation-mode', active),

    // Configuration & Google & Notion Workspaces
    getConfig: () => ipcRenderer.invoke('jarvis:get-config'),
    saveConfig: (config) => ipcRenderer.invoke('jarvis:save-config', config),
    connectGoogle: () => ipcRenderer.invoke('jarvis:connect-google'),
    disconnectGoogle: () => ipcRenderer.invoke('jarvis:disconnect-google'),
    getGoogleStatus: () => ipcRenderer.invoke('jarvis:get-google-status'),
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
    getSystemInfo: () => ipcRenderer.invoke('dashboard:get-system-info'),
    checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
    restartAndInstallUpdate: (data) => ipcRenderer.send('app:restart-and-install', data),
    openConfigFolder: () => ipcRenderer.invoke('app:open-config-folder'),
    notifySplashFinished: () => ipcRenderer.send('splash:finished'),
    onConfigUpdated: (callback) => {
      ipcRenderer.on('config:updated', (event, data) => callback(data));
    },
  });
  console.log('Preload: jarvisAPI successfully exposed in main world.');
} catch (err) {
  console.error('CRITICAL: Failed to expose jarvisAPI in preload:', err);
}
