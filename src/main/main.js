// Immediate environment & credential resolution before any modules are loaded
try {
  require('./env_loader').loadEnv();
} catch (_) {}

const { app, BrowserWindow, globalShortcut, ipcMain, shell, Tray, Menu, screen, nativeImage, desktopCapturer, session, clipboard, ClipboardItem } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, spawn } = require('child_process');
const { getPythonPath, resolveScriptPath } = require('./python_finder');

process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught Exception:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[Main] Unhandled Rejection:', reason);
});
const { GoogleGenAI } = require('@google/genai');
const agentBrain = require('./agent_brain');
const { searchWeb } = require('./web_search');
const { transcribeWithGroqWhisper } = require('./ai_providers');
const voicestudioTTS = require('./voicestudio_tts');
const grokkiVoiceTTS = require('./grokki_voice_tts');
const elevenlabsTTS = require('./elevenlabs_tts');
const PocketGrokkiServer = require('./pocket_grokki_server');
app.setName('Grokki Studio');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.grokki.studio');
}

// Register grokki:// custom protocol for OAuth redirects & desktop deep links
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('grokki', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('grokki');
}

const { getDataDir } = require('./data_dir');
const grokkiDataDir = getDataDir();
if (!app.isPackaged) {
  try { app.setPath('userData', grokkiDataDir); } catch (e) {}
}

// Config file in userData
const configPath = path.join(grokkiDataDir, 'jarvis-config.json');
let cachedConfig = null;

app.commandLine.appendSwitch('disable-gpu-cache');

const initialConfig = loadConfig();
if (initialConfig.hardwareAcceleration === false) {
  app.disableHardwareAcceleration();
}

// Enforce single instance so Alt+Q hotkey is never hijacked by duplicate processes
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main] Another instance of Grokki is already running. Exiting duplicate process.');
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    if (dashboardWindow.isMinimized()) dashboardWindow.restore();
    dashboardWindow.show();
    dashboardWindow.focus();
    if (dashboardWindow.webContents) {
      dashboardWindow.webContents.send('jarvis:refresh-workspace-status');
    }
  } else {
    openDashboardWindow(true);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    showWindow();
    if (mainWindow.webContents) {
      mainWindow.webContents.send('jarvis:refresh-workspace-status');
    }
  }
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    if (dashboardWindow.isMinimized()) dashboardWindow.restore();
    dashboardWindow.show();
    dashboardWindow.focus();
    if (dashboardWindow.webContents) {
      dashboardWindow.webContents.send('jarvis:refresh-workspace-status');
    }
  }
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send('jarvis:refresh-workspace-status');
  }
});

const { WakeWordService } = require('./wake_word');

let mainWindow = null;
let dashboardWindow = null;
let splashWindow = null;
let isDashboardReady = false;
let tray = null;
let isQuitting = false;
let isVisible = true;
let hideTimeout = null;
let wakeWordService = null;
let pocketGrokkiServer = null;

function loadConfig() {
  if (cachedConfig) return cachedConfig;
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  const envGroqKey = (process.env.GROQ_API_KEY || '').trim();
  const envOpenRouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  const envOpenAiKey = (process.env.OPENAI_API_KEY || '').trim();
  const envGrokKey = (process.env.XAI_API_KEY || '').trim();
  const envDeepSeekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  const envQwenKey = (process.env.DASHSCOPE_API_KEY || '').trim();
  const envOmniRouterKey = (process.env.OMNIROUTE_API_KEY || process.env.OMNIROUTER_API_KEY || '').trim();

  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!data.provider) data.provider = 'gemini';
      if (!data.geminiApiKey && envKey) data.geminiApiKey = envKey;
      if (!data.geminiModel || data.geminiModel === 'gemini-2.0-flash' || data.geminiModel === 'gemini-2.5-flash') data.geminiModel = 'gemini-flash-latest';
      if (!data.groqApiKey && envGroqKey) data.groqApiKey = envGroqKey;
      if (!data.groqModel || data.groqModel.includes('llama')) data.groqModel = 'qwen/qwen3.8-27b';
      if (!data.groqVisionModel) data.groqVisionModel = 'qwen/qwen3.8-27b';
      if (!data.ollamaEndpoint) data.ollamaEndpoint = 'http://127.0.0.1:11434';
      if (!data.ollamaModel) data.ollamaModel = 'llama3.2';
      if (!data.ollamaVisionModel) data.ollamaVisionModel = 'moondream';
      if (!data.openrouterApiKey && envOpenRouterKey) data.openrouterApiKey = envOpenRouterKey;
      if (!data.openrouterModel) data.openrouterModel = 'openrouter/auto';
      if (!data.openaiApiKey && envOpenAiKey) data.openaiApiKey = envOpenAiKey;
      if (!data.openaiModel) data.openaiModel = 'gpt-4o';
      if (!data.grokApiKey && envGrokKey) data.grokApiKey = envGrokKey;
      if (!data.grokModel) data.grokModel = 'grok-2-1212';
      if (!data.deepseekApiKey && envDeepSeekKey) data.deepseekApiKey = envDeepSeekKey;
      if (!data.deepseekModel) data.deepseekModel = 'deepseek-chat';
      if (!data.qwenApiKey && envQwenKey) data.qwenApiKey = envQwenKey;
      if (!data.qwenModel) data.qwenModel = 'qwen-max';
      if (data.provider === 'omnirouter') data.provider = 'omniroute';
      if (!data.omnirouteApiKey && (data.omnirouterApiKey || envOmniRouterKey)) data.omnirouteApiKey = data.omnirouterApiKey || envOmniRouterKey;
      if (!data.omnirouteModel || data.omnirouteModel === 'omnirouter/auto') data.omnirouteModel = 'auto';
      if (!data.cachedProviderModels) data.cachedProviderModels = {};
      if (!data.omnirouteEndpoint || data.omnirouteEndpoint.includes('omnirouter.ai')) data.omnirouteEndpoint = 'http://localhost:20128/v1';
      if (!data.omnirouterApiKey && envOmniRouterKey) data.omnirouterApiKey = envOmniRouterKey;
      if (!data.omnirouterModel) data.omnirouterModel = data.omnirouteModel || 'auto';
      data.omnirouterEndpoint = data.omnirouteEndpoint;
      if (data.pillTheme === 'original' || data.pillTheme === 'glass') data.pillTheme = 'grokki-blue';
      if (data.pillTheme === undefined) data.pillTheme = 'grokki-blue';
      if (!data.wakeWord) data.wakeWord = 'Hey Grokki';
      if (data.wakeWordEnabled === undefined) data.wakeWordEnabled = true;
      if (!data.musicProvider) data.musicProvider = 'ytmusic';
      if (!data.ttsVoice) data.ttsVoice = 'expr-voice-2-f';
      if (!data.ttsProvider || data.ttsProvider === 'grokki' || data.ttsProvider === 'voicestudio') data.ttsProvider = 'grokki_voice';
      if (!data.grokkiVoiceId) data.grokkiVoiceId = 'expr-voice-2-f';
      if (!data.grokkiVoiceName) data.grokkiVoiceName = 'Bella';
      if (!data.voiceStudioEndpoint) data.voiceStudioEndpoint = 'http://localhost:3900';
      if (!data.voiceStudioModel) data.voiceStudioModel = 'tts-1';
      if (!data.voiceStudioVoiceId) data.voiceStudioVoiceId = 'default';
      if (!data.voiceStudioVoiceName) data.voiceStudioVoiceName = 'VoiceStudio Default';
      if (data.voiceStudioApiKey === undefined) data.voiceStudioApiKey = '';
      if (data.elevenlabsApiKey === undefined) data.elevenlabsApiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
      if (!data.elevenlabsVoiceId) data.elevenlabsVoiceId = 'JBFqnCBsd6RMkjVDRZzb';
      if (!data.elevenlabsVoiceName) data.elevenlabsVoiceName = 'George';
      if (!data.elevenlabsModel) data.elevenlabsModel = 'eleven_v3';
      if (!data.userName) data.userName = '';
      if (!data.userNickname) data.userNickname = '';
      if (!data.userTone) data.userTone = 'companion';
      if (!data.userBio) data.userBio = '';
      if (!data.dashboardTheme) data.dashboardTheme = 'light';
      if (data.launchOnStartup === undefined) data.launchOnStartup = false;
      if (data.autoOpenStudioOnStartup === undefined) data.autoOpenStudioOnStartup = false;
      if (!data.closeAction) data.closeAction = 'tray';
      if (!data.launchMode) data.launchMode = 'windowed';
      if (data.alwaysOnTop === undefined) data.alwaysOnTop = false;
      if (data.showSplashScreen === undefined) data.showSplashScreen = true;
      if (data.showIslandOnStartup === undefined) data.showIslandOnStartup = false;
      if (data.streamingAnimation === undefined) data.streamingAnimation = true;
      if (!data.streamingSpeed) data.streamingSpeed = 'fast';
      if (data.sendOnEnter === undefined) data.sendOnEnter = true;
      if (data.soundEffectsEnabled === undefined) data.soundEffectsEnabled = true;
      if (data.autoCheckUpdates === undefined) data.autoCheckUpdates = true;
      if (data.hardwareAcceleration === undefined) data.hardwareAcceleration = true;
      if (data.chatBackgroundGradient === undefined) data.chatBackgroundGradient = false;
      if (!data.chatBackgroundEffect) data.chatBackgroundEffect = 'grokki-blue';
      if (data.grainientSettings === undefined) data.grainientSettings = null;
      if (data.chatBackgroundNoise === undefined) data.chatBackgroundNoise = false;
      if (data.glowCursorEnabled === undefined) data.glowCursorEnabled = false;
      if (data.smoothCursorEnabled === undefined) data.smoothCursorEnabled = false;
      if (data.smoothScroll === undefined) data.smoothScroll = false;
      if (!data.spatialLeftHand1FingerApp) data.spatialLeftHand1FingerApp = 'grokki';
      if (!data.spatialLeftHand2FingersApp) data.spatialLeftHand2FingersApp = 'whatsapp';
      if (!Array.isArray(data.spatialLeftHandGestures) || data.spatialLeftHandGestures.length === 0) {
        data.spatialLeftHandGestures = [
          { id: 'left-finger-1', fingers: 1, type: 'app', target: data.spatialLeftHand1FingerApp || 'grokki', label: 'Grokki Island', enabled: true },
          { id: 'left-finger-2', fingers: 2, type: 'app', target: data.spatialLeftHand2FingersApp || 'whatsapp', label: 'WhatsApp', enabled: true },
        ];
      }
      if (!data.openwaUrl) data.openwaUrl = 'http://localhost:2785';
      if (data.openwaApiKey === undefined) data.openwaApiKey = '';
      if (!data.openwaSessionId) data.openwaSessionId = 'default';
      if (!data.openwaEngine) data.openwaEngine = 'whatsapp-web.js';
      if (data.openwaEnabled === undefined) data.openwaEnabled = true;
      if (data.openwaPreferGateway === undefined) data.openwaPreferGateway = true;
      cachedConfig = data;
      return cachedConfig;
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
  cachedConfig = {
    provider: 'gemini',
    geminiApiKey: envKey,
    geminiModel: 'gemini-2.5-flash',
    groqApiKey: envGroqKey,
    groqModel: 'llama-3.3-70b-versatile',
    groqVisionModel: 'qwen/qwen3.8-27b',
    ollamaEndpoint: 'http://127.0.0.1:11434',
    ollamaModel: 'llama3.2',
    ollamaVisionModel: 'moondream',
    openrouterApiKey: envOpenRouterKey,
    openrouterModel: 'openrouter/auto',
    openaiApiKey: envOpenAiKey,
    openaiModel: 'gpt-4o',
    grokApiKey: envGrokKey,
    grokModel: 'grok-2-1212',
    deepseekApiKey: envDeepSeekKey,
    deepseekModel: 'deepseek-chat',
    qwenApiKey: envQwenKey,
    qwenModel: 'qwen-max',
    omnirouteApiKey: envOmniRouterKey,
    omnirouteModel: 'auto',
    omnirouteEndpoint: 'http://localhost:20128/v1',
    cachedProviderModels: {},
    omnirouterApiKey: envOmniRouterKey,
    omnirouterModel: 'auto',
    omnirouterEndpoint: 'http://localhost:20128/v1',
    wakeWord: 'Hey Grokki',
    hotkey: 'Alt+Q',
    voiceEnabled: true,
    ttsEnabled: true,
    ttsVoice: 'expr-voice-2-f',
    ttsProvider: 'grokki_voice',
    grokkiVoiceId: 'expr-voice-2-f',
    grokkiVoiceName: 'Bella',
    voiceStudioEndpoint: 'http://localhost:3900',
    voiceStudioModel: 'tts-1',
    voiceStudioVoiceId: 'default',
    voiceStudioVoiceName: 'VoiceStudio Default',
    voiceStudioApiKey: '',
    elevenlabsApiKey: (process.env.ELEVENLABS_API_KEY || '').trim(),
    elevenlabsVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
    elevenlabsVoiceName: 'George',
    elevenlabsModel: 'eleven_v3',
    pillTheme: 'grokki-blue',
    wakeWordEnabled: true,
    musicProvider: 'ytmusic',
    userName: '',
    userNickname: '',
    userTone: 'companion',
    userBio: '',
    dashboardTheme: 'light',
    launchOnStartup: false,
    autoOpenStudioOnStartup: false,
    closeAction: 'tray',
    launchMode: 'windowed',
    alwaysOnTop: false,
    showSplashScreen: true,
    showIslandOnStartup: false,
    streamingAnimation: true,
    streamingSpeed: 'fast',
    sendOnEnter: true,
    soundEffectsEnabled: true,
    autoCheckUpdates: true,
    hardwareAcceleration: true,
    chatBackgroundGradient: false,
    chatBackgroundEffect: 'grokki-blue',
    chatBackgroundNoise: false,
    glowCursorEnabled: false,
    smoothCursorEnabled: false,
    smoothScroll: false,
    openwaUrl: 'http://localhost:2785',
    openwaApiKey: '',
    openwaSessionId: 'default',
    openwaEngine: 'whatsapp-web.js',
    openwaEnabled: true,
    openwaPreferGateway: true,
  };
  return cachedConfig;
}

function saveConfig(newConfig) {
  try {
    const current = loadConfig();
    const updated = { ...current, ...newConfig };
    cachedConfig = updated;
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');

    if (newConfig.launchOnStartup !== undefined) {
      try {
        app.setLoginItemSettings({
          openAtLogin: !!newConfig.launchOnStartup,
          path: process.execPath,
          args: ['--autostart'],
        });
      } catch (err) {
        console.warn('[Main] Failed to update login item settings:', err.message);
      }
    }

    if (newConfig.openwaUrl !== undefined || newConfig.openwaApiKey !== undefined || newConfig.openwaSessionId !== undefined || newConfig.openwaEngine !== undefined || newConfig.openwaEnabled !== undefined || newConfig.openwaPreferGateway !== undefined) {
      try {
        const openwaWorkspace = require('./openwa_workspace');
        openwaWorkspace.saveConfig({
          baseUrl: updated.openwaUrl,
          apiKey: updated.openwaApiKey,
          sessionId: updated.openwaSessionId,
          engine: updated.openwaEngine,
          enabled: updated.openwaEnabled,
          preferOpenWA: updated.openwaPreferGateway,
        });
      } catch (err) {
        console.warn('[Main] Failed to sync OpenWA config:', err.message);
      }
    }

    // Dynamic live window adjustments - only apply if user explicitly changed the setting
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      if (newConfig.alwaysOnTop !== undefined && newConfig.alwaysOnTop !== current.alwaysOnTop) {
        dashboardWindow.setAlwaysOnTop(!!newConfig.alwaysOnTop);
      }
      if (newConfig.launchMode !== undefined && newConfig.launchMode !== current.launchMode) {
        if (newConfig.launchMode === 'fullscreen') {
          dashboardWindow.setFullScreen(true);
        } else if (newConfig.launchMode === 'maximized') {
          if (dashboardWindow.isFullScreen()) dashboardWindow.setFullScreen(false);
          dashboardWindow.maximize();
        } else if (newConfig.launchMode === 'windowed') {
          if (dashboardWindow.isFullScreen()) dashboardWindow.setFullScreen(false);
          if (dashboardWindow.isMaximized()) dashboardWindow.unmaximize();
        }
      }
    }

    return updated;
  } catch (err) {
    console.error('Failed to save config:', err);
    return null;
  }
}

// Helpers for robust app icon resolution across development, unpacked ASAR, and packaged builds
function getAppIconPath(preferredName = 'grokki_studio_icon.ico') {
  const candidates = [
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'assets', preferredName),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'build', 'icon.ico'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'assets', 'icon.ico'),
    path.join(process.resourcesPath || '', 'build', 'icon.ico'),
    path.join(process.resourcesPath || '', 'assets', preferredName),
    path.join(process.resourcesPath || '', 'assets', 'icon.ico'),
    path.join(__dirname, '../../build/icon.ico'),
    path.join(__dirname, '../../assets', preferredName),
    path.join(__dirname, '../../assets/icon.ico'),
    path.join(process.cwd(), 'build/icon.ico'),
    path.join(process.cwd(), 'assets', preferredName),
    path.join(process.cwd(), 'assets/icon.ico'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, '../../assets', preferredName);
}

function getAppIconImage(iconPath) {
  try {
    if (fs.existsSync(iconPath)) {
      const img = nativeImage.createFromPath(iconPath);
      if (!img.isEmpty()) return img;
    }
  } catch (e) {}
  return null;
}

function createWindow(showOnReady = false) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const winWidth = 716;
  const winHeight = 100;
  const x = Math.round((screenWidth - winWidth) / 2);
  const y = 0;

  const appIconPath = getAppIconPath('grokki_studio_icon.ico');
  const appNativeImg = getAppIconImage(appIconPath);

  mainWindow = new BrowserWindow({
    icon: fs.existsSync(appIconPath) ? appIconPath : (appNativeImg || undefined),
    width: winWidth,
    height: winHeight,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    alwaysOnTop: true,
    skipTaskbar: true, // Never shows in taskbar, stays in tray as background service
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false,
    },
  });

  if (fs.existsSync(appIconPath)) {
    try {
      mainWindow.setIcon(appIconPath);
    } catch (e) {}
  } else if (appNativeImg) {
    try {
      mainWindow.setIcon(appNativeImg);
    } catch (e) {}
  }

  mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('*** PRELOAD ERROR ***', preloadPath, error);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:)/i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (/^(https?:|mailto:)/i.test(url) && !url.startsWith('http://127.0.0.1:5173')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const indexHtmlPath = path.join(__dirname, '../renderer/index.html');
  const appJsPath = path.join(__dirname, '../renderer/app.js');
  mainWindow.loadFile(indexHtmlPath);
  try {
    const reloadMainWin = () => {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        mainWindow.loadFile(indexHtmlPath);
      }
    };
    fs.watchFile(indexHtmlPath, { interval: 1000 }, reloadMainWin);
    fs.watchFile(appJsPath, { interval: 1000 }, reloadMainWin);
  } catch (_) {}

  // Window dismiss is handled intentionally via Escape key or Alt+Q toggle.
  // We do not auto-hide on blur so the user can freely interact with File Explorer,
  // drag and drop files onto Grokki, and use native file dialogs without Grokki vanishing.

  // Prevent closing, hide instead
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      hideWindow();
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (pocketGrokkiServer) {
      pocketGrokkiServer.mainWindow = mainWindow;
      pocketGrokkiServer.checkLanForPairedDevices();
    }
    // Keep dynamic island hidden on initial launch.
    // It will only be summoned on Alt+Q (or custom hotkey), tray click,
    // or voice wake word if enabled in settings.
    if (showOnReady) {
      showWindow();
    } else {
      isVisible = false;
    }
  });
}

let isIslandExpanded = false;
let islandCollapseTimeout = null;

function resizeMainWindowToState(expanded) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const winWidth = 716;
    const targetHeight = expanded ? 580 : 100;
    const x = Math.round((screenWidth - winWidth) / 2);
    mainWindow.setBounds({ x, y: 0, width: winWidth, height: targetHeight });
  } catch (e) {}
}

ipcMain.on('jarvis:set-island-expanded', (event, expanded) => {
  isIslandExpanded = !!expanded;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (islandCollapseTimeout) {
    clearTimeout(islandCollapseTimeout);
    islandCollapseTimeout = null;
  }
  if (isIslandExpanded) {
    resizeMainWindowToState(true);
  } else {
    // Delay shrinking slightly so CSS closing transition completes smoothly
    islandCollapseTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed() && !isIslandExpanded) {
        resizeMainWindowToState(false);
      }
      islandCollapseTimeout = null;
    }, 320);
  }
});

function showWindow() {
  if (!mainWindow) return;
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  isVisible = true;
  if (topNotchWindow && !topNotchWindow.isDestroyed()) {
    topNotchIsInteractive = false;
    topNotchWindow.setIgnoreMouseEvents(true, { forward: true });
    topNotchWindow.webContents.send('top-notch:trigger', false);
  }
  resizeMainWindowToState(isIslandExpanded);
  mainWindow.setAlwaysOnTop(true);
  mainWindow.show();
  mainWindow.restore();
  mainWindow.focus();
  mainWindow.webContents.send('window:state-changed', { visible: true });
}

function hideWindow() {
  if (!mainWindow) return;
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
  isVisible = false;
  isIslandExpanded = false;
  if (islandCollapseTimeout) {
    clearTimeout(islandCollapseTimeout);
    islandCollapseTimeout = null;
  }
  if (wakeWordService) {
    wakeWordService.resume();
  }
  mainWindow.webContents.send('window:state-changed', { visible: false });
  // Allow slide-up animation to play in renderer before hiding
  hideTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !isVisible) {
      mainWindow.hide();
      resizeMainWindowToState(false);
    }
    hideTimeout = null;
  }, 280);
}

function handleGlobalHotkey() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow(true);
    return;
  }

  resizeMainWindowToState(isIslandExpanded);

  // If window is currently hidden, ALWAYS show it and summon in typing mode
  if (!isVisible || !mainWindow.isVisible()) {
    showWindow();
    if (mainWindow.webContents) {
      mainWindow.webContents.send('hotkey:trigger', { action: 'show' });
    }
    return;
  }

  // Window is already visible -> send toggle to renderer (acts as killer if busy, or dismisses if idle)
  if (mainWindow.webContents) {
    mainWindow.webContents.send('hotkey:trigger', { action: 'toggle' });
  }
}

function toggleWindow() {
  handleGlobalHotkey();
}

// --- HITODAMA: GLOBAL FILE DRAG & DROP DETECTION ---
const dragWatcherScript = path.join(__dirname, 'drag_watcher.ps1').replace('app.asar', 'app.asar.unpacked');
let dragWatcherProcess = null;
let autoSpawnedByDrag = false;
let dragHideTimer = null;
let lastDetectedDragFiles = [];

function startDragWatcher() {
  if (dragWatcherProcess && !dragWatcherProcess.killed) return;
  try {
    dragWatcherProcess = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', dragWatcherScript
    ], {
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
    });

    let buffer = '';
    dragWatcherProcess.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'READY') continue;

        if (trimmed.startsWith('DRAG_START')) {
          const filesStr = trimmed.substring('DRAG_START'.length).trim();
          lastDetectedDragFiles = filesStr ? filesStr.split('|||').filter(Boolean) : [];
          if (lastDetectedDragFiles.length > 0) {
            handleGlobalDragStart(lastDetectedDragFiles);
          }
        } else if (trimmed === 'DRAG_END') {
          handleGlobalDragEnd();
        }
      }
    });

    dragWatcherProcess.on('exit', () => {
      dragWatcherProcess = null;
      setTimeout(() => startDragWatcher(), 2000);
    });

    dragWatcherProcess.on('error', () => {
      dragWatcherProcess = null;
    });
  } catch (_) {
    dragWatcherProcess = null;
  }
}

function stopDragWatcher() {
  if (dragWatcherProcess) {
    try { dragWatcherProcess.kill(); } catch (_) {}
    dragWatcherProcess = null;
  }
}

function handleGlobalDragStart(files = []) {
  // STRICT: Only auto-spawn Grokki Island if actual files are detected!
  // Prevents text selection, line highlights, or empty drags from triggering the island.
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  if (dragHideTimer) {
    clearTimeout(dragHideTimer);
    dragHideTimer = null;
  }

  // If island is currently hidden, spawn it to catch the file!
  if (!isVisible) {
    autoSpawnedByDrag = true;
    showWindow();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('window:drag-active', { active: true, files });
  }
}

function handleGlobalDragEnd() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('window:drag-active', { active: false });
  }

  // If island was auto-spawned by drag and user dropped elsewhere:
  if (autoSpawnedByDrag) {
    if (dragHideTimer) clearTimeout(dragHideTimer);
    dragHideTimer = setTimeout(() => {
      if (autoSpawnedByDrag && isVisible) {
        autoSpawnedByDrag = false;
        hideWindow();
      }
      dragHideTimer = null;
    }, 240);
  }
}

ipcMain.on('jarvis:drop-received', () => {
  autoSpawnedByDrag = false;
  if (dragHideTimer) {
    clearTimeout(dragHideTimer);
    dragHideTimer = null;
  }
});

ipcMain.handle('jarvis:get-drag-files', () => {
  return lastDetectedDragFiles;
});

const { getSelectedExplorerFiles } = require('./explorer_selection');
ipcMain.handle('jarvis:get-selected-explorer-files', () => {
  try {
    return getSelectedExplorerFiles();
  } catch (_) {
    return [];
  }
});

// Auto-start drag watcher after app initialization
setTimeout(() => startDragWatcher(), 1600);

function createSplashWindow(onFinish) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.focus();
    return;
  }

  // Pre-warm dashboard window off-screen while splash screen plays so it shows instantly
  openDashboardWindow(false);

  const studioIco = getAppIconPath('grokki_studio_icon.ico');
  const studioImg = getAppIconImage(studioIco);

  splashWindow = new BrowserWindow({
    width: 420,
    height: 380,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    show: false,
    skipTaskbar: true,
    icon: fs.existsSync(studioIco) ? studioIco : (studioImg || undefined),
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (fs.existsSync(studioIco)) {
    try {
      splashWindow.setIcon(studioIco);
    } catch (e) {}
  } else if (studioImg) {
    try {
      splashWindow.setIcon(studioImg);
    } catch (e) {}
  }

  splashWindow.loadFile(path.join(__dirname, '../renderer/splash.html'));

  splashWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
      if (isDashboardReady && splashWindow.webContents) {
        splashWindow.webContents.send('app:ready');
      }
    }
  });

  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed() && !splashWindow.isVisible()) {
      splashWindow.show();
    }
  }, 200);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    if (onFinish) onFinish();
  };

  ipcMain.once('splash:finished', finish);

  splashWindow.on('closed', () => {
    splashWindow = null;
    finish();
  });
}

function openDashboardWindow(showImmediately = true) {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    if (showImmediately) {
      const config = loadConfig();
      const launchMode = config.launchMode || 'windowed';
      if (launchMode === 'fullscreen') {
        dashboardWindow.setFullScreen(true);
      } else if (launchMode === 'maximized') {
        dashboardWindow.maximize();
      }
      dashboardWindow.show();
      dashboardWindow.focus();
    }
    return;
  }

  const studioIco = getAppIconPath('grokki_studio_icon.ico');
  const studioImg = getAppIconImage(studioIco);

  const config = loadConfig();
  const isLight = config.dashboardTheme !== 'dark';
  const launchMode = config.launchMode || 'windowed';

  dashboardWindow = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 860,
    minHeight: 600,
    frame: false,
    transparent: false,
    alwaysOnTop: !!config.alwaysOnTop,
    backgroundColor: '#111111',
    icon: fs.existsSync(studioIco) ? studioIco : (studioImg || undefined),
    show: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  if (fs.existsSync(studioIco)) {
    try {
      dashboardWindow.setIcon(studioIco);
    } catch (e) {
      console.warn('[main] Failed to set dashboardWindow icon:', e?.message);
    }
  } else if (studioImg) {
    try {
      dashboardWindow.setIcon(studioImg);
    } catch (e) {}
  }

  dashboardWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:|spotify:|whatsapp:|music:)/i.test(url)) {
      shell.openExternal(url).catch((err) => {
        console.warn('[main] openExternal failed in setWindowOpenHandler:', err?.message);
      });
    }
    return { action: 'deny' };
  });

  dashboardWindow.webContents.on('will-navigate', (event, url) => {
    if (/^(https?:|mailto:)/i.test(url) && !url.startsWith('http://127.0.0.1:5173')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const distDashboard = path.join(__dirname, '../../dist/dashboard.html');
  if (process.env.VITE_DEV === 'true') {
    dashboardWindow.loadURL('http://127.0.0.1:5173/dashboard.html');
  } else {
    dashboardWindow.loadFile(distDashboard);
  }

  dashboardWindow.once('ready-to-show', () => {
    isDashboardReady = true;
    if (splashWindow && !splashWindow.isDestroyed() && splashWindow.webContents) {
      splashWindow.webContents.send('app:ready');
    }
    if (showImmediately) {
      if (launchMode === 'fullscreen') {
        dashboardWindow.setFullScreen(true);
      } else if (launchMode === 'maximized') {
        dashboardWindow.maximize();
      }
      dashboardWindow.show();
      dashboardWindow.focus();
    }
  });

  dashboardWindow.on('maximize', () => {
    if (dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.webContents) {
      dashboardWindow.webContents.send('dashboard:maximized-change', true);
    }
  });

  dashboardWindow.on('unmaximize', () => {
    if (dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.webContents) {
      dashboardWindow.webContents.send('dashboard:maximized-change', false);
    }
  });

  dashboardWindow.on('closed', () => {
    dashboardWindow = null;
    isDashboardReady = false;
  });
}

function createTray() {
  const candidateTrayPaths = [
    getAppIconPath('grokki_studio_tray.png'),
    getAppIconPath('grokki_studio_icon.ico'),
    getAppIconPath('grokki_tray.png'),
    getAppIconPath('grokki_icon.ico'),
  ];
  let icon = null;
  for (const p of candidateTrayPaths) {
    if (fs.existsSync(p)) {
      try {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) {
          icon = img;
          break;
        }
      } catch (e) {}
    }
  }
  if (!icon) {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Grokki - Your AI Companion (Alt+Q)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Grokki Studio & Dashboard',
      click: () => openDashboardWindow(),
    },
    { type: 'separator' },
    { label: 'Toggle Dynamic Island (Alt+Q)', click: () => handleGlobalHotkey() },
    {
      label: 'Quick Island Settings',
      click: () => {
        showWindow();
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('open:settings');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Grokki',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => handleGlobalHotkey());
  tray.on('double-click', () => openDashboardWindow());
}

// Register Global Shortcut
function registerShortcuts() {
  const config = loadConfig();
  const shortcut = (config.hotkey || 'Alt+Q').trim();

  globalShortcut.unregisterAll();

  let registered = false;
  try {
    registered = globalShortcut.register(shortcut, () => {
      console.log(`[Main] Hotkey ${shortcut} triggered`);
      handleGlobalHotkey();
    });
  } catch (err) {
    console.warn(`[Main] Error registering hotkey ${shortcut}:`, err.message);
  }

  if (!registered && shortcut.toLowerCase() !== 'alt+q') {
    try {
      registered = globalShortcut.register('Alt+Q', () => {
        console.log('[Main] Hotkey Alt+Q fallback triggered');
        handleGlobalHotkey();
      });
    } catch (e) {}
  }

  // Hitodama Powerpack: Circle to Ask shortcut (Default: Ctrl+Shift+S)
  try {
    globalShortcut.register('CommandOrControl+Shift+S', () => {
      console.log('[Main] Circle to Ask shortcut (Ctrl+Shift+S) triggered');
      openCircleOverlay();
    });
  } catch (e) {
    console.warn('[Main] Failed to register Circle to Ask shortcut:', e.message);
  }

  // Hitodama Powerpack: System-wide Voice Dictation shortcut (Ctrl+Space only)
  try {
    globalShortcut.register('CommandOrControl+Space', () => {
      console.log('[Main] Voice Dictation shortcut (Ctrl+Space) triggered');
      startVoiceDictation();
    });
  } catch (e) {
    console.warn('[Main] Failed to register Voice Dictation shortcut (Ctrl+Space):', e.message);
  }

  console.log(`[Main] Global hotkey [${shortcut}] active: ${registered}`);
}

async function executeOsAction(action) {
  const act = (action || '').toLowerCase().trim();
  switch (act) {
    case 'lock_pc':
    case 'lock': {
      const { exec } = require('child_process');
      exec('rundll32.exe user32.dll,LockWorkStation');
      return { success: true, message: 'Workstation locked' };
    }
    case 'screenshot': {
      return await agentBrain.executeTool('screen_capture_and_recorder', { action: 'screenshot' });
    }
    case 'volume_mute':
    case 'mute': {
      return await agentBrain.executeTool('system_volume', { action: 'mute' });
    }
    case 'volume_unmute':
    case 'unmute': {
      return await agentBrain.executeTool('system_volume', { action: 'unmute' });
    }
    case 'volume_up': {
      return await agentBrain.executeTool('system_volume', { action: 'up' });
    }
    case 'volume_down': {
      return await agentBrain.executeTool('system_volume', { action: 'down' });
    }
    case 'toggle_mic': {
      return await agentBrain.executeTool('screen_capture_and_recorder', { action: 'toggle_mic' });
    }
    case 'show_desktop': {
      return await agentBrain.executeTool('window_manager', { action: 'show_desktop' });
    }
    case 'toggle_theme': {
      return await agentBrain.executeTool('power_and_theme_control', { action: 'toggle_theme' });
    }
    case 'dark_mode': {
      return await agentBrain.executeTool('power_and_theme_control', { action: 'dark_mode' });
    }
    case 'light_mode': {
      return await agentBrain.executeTool('power_and_theme_control', { action: 'light_mode' });
    }
    case 'open_settings': {
      shell.openExternal('ms-settings:');
      return { success: true, message: 'Opened Windows Settings' };
    }
    case 'empty_recycle_bin': {
      return await agentBrain.executeTool('storage_and_cleanup', { action: 'empty_recycle_bin' });
    }
    case 'sleep_pc':
    case 'sleep': {
      return await agentBrain.executeTool('system_power', { action: 'sleep' });
    }
    case 'open_island': {
      showWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('hotkey:trigger', { action: 'show' });
      }
      return { success: true, message: 'Opened Grokki Island' };
    }
    case 'toggle_recording': {
      return await agentBrain.executeTool('screen_capture_and_recorder', { action: 'start_recording' });
    }
    case 'stop_air_cursor': {
      stopHandGestureDaemon();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('jarvis:presentation-mode', { active: false, mode: 'air_cursor' });
      }
      return { success: true, message: 'Turned off Air Cursor' };
    }
    default:
      console.warn(`[executeOsAction] Unknown OS action: ${act}`);
      return { success: false, error: `Unknown OS action: ${act}` };
  }
}

async function handleLeftHandGesture(fingers, payload = {}) {
  const config = loadConfig();
  let gestureItem = null;

  if (Array.isArray(config.spatialLeftHandGestures)) {
    gestureItem = config.spatialLeftHandGestures.find((g) => Number(g.fingers) === Number(fingers));
  }

  // Fallback defaults if not found in array
  if (!gestureItem) {
    if (fingers === 1) {
      gestureItem = {
        fingers: 1,
        type: 'app',
        target: config.spatialLeftHand1FingerApp || 'grokki',
        label: 'Grokki Island',
        enabled: true,
      };
    } else if (fingers === 2) {
      gestureItem = {
        fingers: 2,
        type: 'app',
        target: config.spatialLeftHand2FingersApp || 'whatsapp',
        label: 'WhatsApp',
        enabled: true,
      };
    }
  }

  if (!gestureItem || gestureItem.enabled === false) {
    console.log(`[Spatial Multi-Hand] Left Hand ${fingers} Fingers -> (No active action configured)`);
    return;
  }

  const { type, target, label } = gestureItem;
  console.log(`[Spatial Multi-Hand] Left Hand Gesture (${fingers} fingers) -> Action Type: ${type}, Target: ${target}`);

  if (type === 'os') {
    executeOsAction(target).catch((err) => console.warn('[Spatial OS Action Error]', err));
  } else {
    if (target === 'grokki' || target === 'island' || target === 'open_island') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          const primaryDisplay = screen.getPrimaryDisplay();
          const { width: screenWidth } = primaryDisplay.workAreaSize;
          const winWidth = 660;
          const x = Math.round((screenWidth - winWidth) / 2);
          mainWindow.setBounds({ x, y: 0, width: winWidth, height: 580 });
        } catch (e) {}
      }
      showWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('hotkey:trigger', { action: 'show' });
      }
    } else {
      openApp(target).catch((err) => console.warn('[Spatial App Launch Error]', err));
    }
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('jarvis:left-hand-action', {
      fingers,
      type: type || 'app',
      target: target,
      app: type === 'app' ? target : undefined,
      osAction: type === 'os' ? target : undefined,
      label: label || target,
      action: payload.action,
    });
  }
}

function openApp(appName) {
  const raw = (appName || '').trim();
  const lower = raw.toLowerCase();
  
  if (!lower || lower.length < 2 || ['hi', 'hello', 'hey', 'grokki', 'grokbot', 'jarvis', 'what', 'who', 'how', 'why', 'ok', 'yes', 'no'].includes(lower)) {
    return Promise.resolve({ success: false, error: `"${appName}" is not an application.` });
  }

  // Reject task / session / timer phrases so Windows doesn't try to execute them as apps
  const isTaskPhrase = /^(a|an|my|the|some|this)\s+/i.test(lower) ||
    /\b(session|lock[- ]?in|timer|pomodoro|countdown|alarm|reminder|minute|minutes|min|mins|second|seconds|hour|hours|study|recording|lecture|meeting|mode|quiz|viva)\b/i.test(lower);
  if (isTaskPhrase) {
    return Promise.resolve({ success: false, error: `"${appName}" is a task or timer instruction, not an application.` });
  }

  // Island summon
  if (lower === 'grokki' || lower === 'island' || lower === 'open_island') {
    if (mainWindow && !mainWindow.isDestroyed()) {
      showWindow();
      mainWindow.webContents.send('hotkey:trigger', { action: 'show' });
    }
    return Promise.resolve({ success: true, message: 'Opened Grokki Island' });
  }

  // If path exists on disk (.lnk or .exe)
  if (fs.existsSync(raw)) {
    return shell.openPath(raw).then((err) => {
      if (err) return { success: false, error: err };
      return { success: true, message: `Opened ${path.basename(raw, path.extname(raw))}` };
    });
  }

  // If it's a Windows Shell AppID (from Get-StartApps, e.g. Microsoft.WindowsCalculator_8wekyb3d8bbwe!App or {GUID}\cmd.exe)
  if (raw.includes('!') || raw.startsWith('{')) {
    return new Promise((resolve) => {
      exec(`powershell -NoProfile -Command "Start-Process 'shell:AppsFolder\\${raw.replace(/'/g, "''")}'"`, (err) => {
        if (!err) return resolve({ success: true, message: `Opened ${raw}` });
        exec(`explorer.exe "shell:AppsFolder\\${raw}"`, (err2) => {
          if (!err2) resolve({ success: true, message: `Opened ${raw}` });
          else resolve({ success: false, error: err2.message });
        });
      });
    });
  }
  
  // App mapping dictionary for Windows
  const appMap = {
    'whatsapp': 'whatsapp:',
    'spotify': 'spotify:',
    'notepad': 'notepad.exe',
    'code': 'code',
    'vs code': 'code',
    'vscode': 'code',
    'visual studio code': 'code',
    'chrome': 'chrome',
    'google chrome': 'chrome',
    'edge': 'msedge',
    'browser': 'msedge',
    'calculator': 'calc.exe',
    'calc': 'calc.exe',
    'paint': 'mspaint.exe',
    'mspaint': 'mspaint.exe',
    'terminal': 'wt.exe',
    'cmd': 'cmd.exe',
    'powershell': 'powershell.exe',
    'task manager': 'taskmgr.exe',
    'taskmgr': 'taskmgr.exe',
    'file explorer': 'explorer.exe',
    'explorer': 'explorer.exe',
    'settings': 'ms-settings:',
    'discord': 'discord:',
    'slack': 'slack:',
    'telegram': 'tg:',
  };

  const target = appMap[lower] || lower;

  return new Promise((resolve) => {
    // If it's a protocol (ends with :)
    if (target.endsWith(':')) {
      shell.openExternal(target).then(() => {
        resolve({ success: true, message: `Opened ${appName}` });
      }).catch((err) => {
        // Fallback to start
        exec(`start ${target}`, (error) => {
          if (error) resolve({ success: false, error: error.message });
          else resolve({ success: true, message: `Opened ${appName}` });
        });
      });
      return;
    }

    // Try opening via powershell Start-Process
    const psCmd = `powershell -NoProfile -Command "Start-Process '${target.replace(/'/g, "''")}' -ErrorAction Stop"`;
    exec(psCmd, (err) => {
      if (err) {
        // Only fallback to cmd start if target is a single-token executable (.exe, .bat, etc.) or URI protocol
        // This strictly prevents Windows modal error dialogs on arbitrary phrases or missing tasks
        if ((!/\s/.test(target) && (target.endsWith('.exe') || target.endsWith('.bat') || target.endsWith('.cmd') || !target.includes('.'))) || target.endsWith(':')) {
          exec(`cmd.exe /c start "" "${target}"`, (err2) => {
            if (err2) {
              resolve({ success: false, error: `Could not launch ${appName}: ${err2.message}` });
            } else {
              resolve({ success: true, message: `Opened ${appName}` });
            }
          });
        } else {
          resolve({ success: false, error: `Could not launch ${appName}: application not found.` });
        }
      } else {
        resolve({ success: true, message: `Opened ${appName}` });
      }
    });
  });
}

// Desktop Automation Tool Handlers
ipcMain.handle('jarvis:open-app', async (event, appName) => {
  return await openApp(appName);
});

ipcMain.handle('jarvis:write-file', async (event, { filename, content, openInEditor = true, directory }) => {
  try {
    const targetDir = directory || path.join(os.homedir(), 'Desktop');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const fullPath = path.join(targetDir, filename);
    fs.writeFileSync(fullPath, content, 'utf8');

    if (openInEditor) {
      // Try to open in VS Code if installed, otherwise Notepad
      exec(`code "${fullPath}"`, (err) => {
        if (err) {
          exec(`notepad.exe "${fullPath}"`);
        }
      });
    }

    return {
      success: true,
      path: fullPath,
      message: `File saved successfully at ${fullPath}${openInEditor ? ' and opened in editor' : ''}.`
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:read-image-data-url', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') return null;
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) return null;
    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
    };
    const mime = mimeMap[ext] || 'image/jpeg';
    const buffer = fs.readFileSync(resolvedPath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn('[main] Failed to read image data URL:', err.message);
    return null;
  }
});

ipcMain.handle('jarvis:open-url', async (event, url) => {
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'Invalid URL parameter' };
  }
  let targetUrl = url.trim();
  if (!targetUrl || targetUrl === '#' || targetUrl.startsWith('javascript:')) {
    return { success: false, error: 'Cannot open non-actionable URL' };
  }

  // Prepend https:// only if NO scheme is present (e.g. "google.com")
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  try {
    // If it is http or https, validate structure with URL constructor safely
    if (/^https?:/i.test(targetUrl)) {
      new URL(targetUrl);
    }
    await shell.openExternal(targetUrl);
    return { success: true, message: `Opened ${targetUrl}` };
  } catch (err) {
    console.warn('[main] jarvis:open-url failed for', targetUrl, err?.message);
    return { success: false, error: err?.message || 'Failed to open URL' };
  }
});

const osInputScript = path.join(__dirname, 'os_input.ps1').replace('app.asar', 'app.asar.unpacked');

ipcMain.handle('jarvis:type-text', async (event, text) => {
  return new Promise((resolve) => {
    const safeText = String(text || '').replace(/'/g, "''");
    exec(`powershell.exe -NoProfile -File "${osInputScript}" -action type -text '${safeText}'`, (err, stdout, stderr) => {
      resolve({ success: !err, message: (stdout || stderr || '').trim() });
    });
  });
});

ipcMain.handle('jarvis:capture-screen', async (event, { width = 640, height = 360 } = {}) => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
    });
    if (sources && sources.length > 0) {
      return { success: true, image: sources[0].thumbnail.toDataURL() };
    }
    return { success: false, error: 'No screen found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:mouse-click', async (event, { x, y }) => {
  return new Promise((resolve) => {
    exec(`powershell.exe -NoProfile -File "${osInputScript}" -action click -x ${Math.round(x)} -y ${Math.round(y)}`, (err, stdout, stderr) => {
      resolve({ success: !err, message: (stdout || stderr || '').trim() });
    });
  });
});

ipcMain.handle('jarvis:mouse-double-click', async (event, { x, y }) => {
  return new Promise((resolve) => {
    exec(`powershell.exe -NoProfile -File "${osInputScript}" -action doubleclick -x ${Math.round(x)} -y ${Math.round(y)}`, (err, stdout, stderr) => {
      resolve({ success: !err, message: (stdout || stderr || '').trim() });
    });
  });
});

ipcMain.handle('jarvis:mouse-right-click', async (event, { x, y }) => {
  return new Promise((resolve) => {
    exec(`powershell.exe -NoProfile -File "${osInputScript}" -action rightclick -x ${Math.round(x)} -y ${Math.round(y)}`, (err, stdout, stderr) => {
      resolve({ success: !err, message: (stdout || stderr || '').trim() });
    });
  });
});

ipcMain.handle('jarvis:mouse-move', async (event, { x, y }) => {
  return new Promise((resolve) => {
    exec(`powershell.exe -NoProfile -File "${osInputScript}" -action move -x ${Math.round(x)} -y ${Math.round(y)}`, (err, stdout, stderr) => {
      resolve({ success: !err, message: (stdout || stderr || '').trim() });
    });
  });
});

ipcMain.handle('jarvis:check-app', async (event, appName) => {
  const lower = (appName || '').trim().toLowerCase();
  return new Promise((resolve) => {
    const checkCmd = `powershell -Command "(Get-Process -Name '*${lower}*' -ErrorAction SilentlyContinue).Count -gt 0 -or (Get-Command '${lower}' -ErrorAction SilentlyContinue) -ne $null"`;
    exec(checkCmd, (err, stdout) => {
      const exists = (stdout || '').trim().toLowerCase() === 'true';
      resolve({ exists });
    });
  });
});

// --- HITODAMA POWERPACK: CIRCLE TO ASK ---
let circleOverlayWindow = null;

async function openCircleOverlay() {
  if (circleOverlayWindow && !circleOverlayWindow.isDestroyed()) {
    circleOverlayWindow.focus();
    return;
  }
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const bounds = primaryDisplay.bounds;

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: bounds.width, height: bounds.height },
    });
    const screenshotDataUrl = sources && sources.length > 0 ? sources[0].thumbnail.toDataURL() : null;

    circleOverlayWindow = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      fullscreen: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    circleOverlayWindow.loadFile(path.join(__dirname, '../renderer/circle_overlay.html'));

    circleOverlayWindow.webContents.once('did-finish-load', () => {
      if (circleOverlayWindow && !circleOverlayWindow.isDestroyed() && screenshotDataUrl) {
        const config = loadConfig();
        const activeTheme = config.pillTheme || 'grokki-blue';
        circleOverlayWindow.webContents.send('circle:overlay-data', {
          dataUrl: screenshotDataUrl,
          theme: activeTheme,
        });
      }
    });

    circleOverlayWindow.on('closed', () => {
      circleOverlayWindow = null;
    });
  } catch (err) {
    console.warn('[Main] Failed to open circle overlay:', err.message);
  }
}

ipcMain.handle('jarvis:start-circle-to-ask', async () => {
  await openCircleOverlay();
  return { success: true };
});

ipcMain.on('jarvis:submit-circle-crop', (event, dataUrl, bounds) => {
  if (circleOverlayWindow && !circleOverlayWindow.isDestroyed()) {
    circleOverlayWindow.close();
    circleOverlayWindow = null;
  }
  showWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('jarvis:circle-to-ask-ready', { dataUrl, bounds });
  }
});

ipcMain.on('jarvis:cancel-circle-crop', () => {
  if (circleOverlayWindow && !circleOverlayWindow.isDestroyed()) {
    circleOverlayWindow.close();
    circleOverlayWindow = null;
  }
});

// --- HITODAMA POWERPACK: SYSTEM-WIDE VOICE DICTATION (FLOATING MIDDLE-OF-SCREEN UI) ---
let dictationWindow = null;
let fastPasteDaemon = null;

function ensureFastPasteDaemon() {
  if (fastPasteDaemon && !fastPasteDaemon.killed && fastPasteDaemon.stdin && !fastPasteDaemon.stdin.destroyed) {
    return fastPasteDaemon;
  }
  try {
    const selfPid = process.pid;
    const psScript = [
      'Add-Type -TypeDefinition @"',
      'using System;',
      'using System.Diagnostics;',
      'using System.Runtime.InteropServices;',
      'using System.Threading;',
      'public class FastPasteEngine {',
      '    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);',
      '    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
      '    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);',
      '    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);',
      '    public static IntPtr lastTargetHwnd = IntPtr.Zero;',
      `    public static uint selfPid = ${selfPid};`,
      '    public static bool IsExternalWindow(IntPtr hWnd) {',
      '        if (hWnd == IntPtr.Zero) return false;',
      '        uint pid = 0;',
      '        GetWindowThreadProcessId(hWnd, out pid);',
      '        if (pid == 0 || pid == selfPid) return false;',
      '        try {',
      '            string pname = Process.GetProcessById((int)pid).ProcessName.ToLower();',
      '            if (pname == "electron" || pname.Contains("grokki")) return false;',
      '        } catch {}',
      '        return true;',
      '    }',
      '    public static void TrackTarget() {',
      '        IntPtr fg = GetForegroundWindow();',
      '        if (IsExternalWindow(fg)) {',
      '            lastTargetHwnd = fg;',
      '        }',
      '    }',
      '    public static void PasteNow() {',
      '        IntPtr fg = GetForegroundWindow();',
      '        if (!IsExternalWindow(fg) && lastTargetHwnd != IntPtr.Zero) {',
      '            SetForegroundWindow(lastTargetHwnd);',
      '            Thread.Sleep(35);',
      '        }',
      '        // Release any held modifiers (Win, Alt, Shift, Space)',
      '        keybd_event(0x5B, 0, 2, UIntPtr.Zero);',
      '        keybd_event(0x12, 0, 2, UIntPtr.Zero);',
      '        keybd_event(0x10, 0, 2, UIntPtr.Zero);',
      '        keybd_event(0x20, 0, 2, UIntPtr.Zero);',
      '        Thread.Sleep(12);',
      '        // Hardware Ctrl+V',
      '        keybd_event(0x11, 0, 0, UIntPtr.Zero);',
      '        Thread.Sleep(16);',
      '        keybd_event(0x56, 0, 0, UIntPtr.Zero);',
      '        Thread.Sleep(20);',
      '        keybd_event(0x56, 0, 2, UIntPtr.Zero);',
      '        Thread.Sleep(12);',
      '        keybd_event(0x11, 0, 2, UIntPtr.Zero);',
      '    }',
      '}',
      '"@',
      'while ($true) {',
      '    $line = [Console]::In.ReadLine()',
      '    if ($null -eq $line) { break }',
      '    $cmd = $line.Trim().ToUpper()',
      '    if ($cmd -eq "TRACK") { [FastPasteEngine]::TrackTarget() }',
      '    elseif ($cmd -eq "PASTE") { [FastPasteEngine]::PasteNow() }',
      '}',
    ].join('\n');

    fastPasteDaemon = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
      stdio: ['pipe', 'ignore', 'ignore'],
      windowsHide: true,
    });
    fastPasteDaemon.on('exit', () => { fastPasteDaemon = null; });
    fastPasteDaemon.on('error', () => { fastPasteDaemon = null; });
  } catch (e) {
    fastPasteDaemon = null;
  }
  return fastPasteDaemon;
}

function trackExternalWindow() {
  const daemon = ensureFastPasteDaemon();
  if (daemon && daemon.stdin && !daemon.stdin.destroyed) {
    try {
      daemon.stdin.write('TRACK\n');
    } catch (_) {}
  }
}

function triggerFastPaste(fallbackText = '') {
  const daemon = ensureFastPasteDaemon();
  if (daemon && daemon.stdin && !daemon.stdin.destroyed) {
    try {
      daemon.stdin.write('PASTE\n');
      return;
    } catch (_) {}
  }
  exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${osInputScript}" -action paste`, (err) => {
    if (err && fallbackText) {
      const safeText = fallbackText.replace(/'/g, "''");
      exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${osInputScript}" -action type-fast -text '${safeText}'`);
    }
  });
}

// Pre-warm fast paste daemon and track active external window periodically
setTimeout(() => ensureFastPasteDaemon(), 800);
setInterval(() => trackExternalWindow(), 700);

function pasteTextIntoActiveApp(text) {
  const clean = (text || '').trim();
  if (!clean) return;
  try {
    lastClipText = clean;
    clipboard.writeText(clean);

    if (dictationWindow && !dictationWindow.isDestroyed()) {
      try {
        dictationWindow.close();
      } catch (_) {}
      dictationWindow = null;
    }

    if (topNotchWindow && !topNotchWindow.isDestroyed()) {
      topNotchIsInteractive = false;
      topNotchWindow.setFocusable(false);
      topNotchWindow.setIgnoreMouseEvents(true, { forward: true });
      topNotchWindow.webContents.send('top-notch:trigger', false);
    }

    setTimeout(() => {
      triggerFastPaste(clean);
    }, 45);
  } catch (e) {
    console.warn('[Main] Failed to paste dictated text:', e.message);
  }
}

function cleanTranscriptionOutput(raw) {
  const t = (raw || '').trim();
  if (!t) return '';
  if (/^(\.+|thank you\.?|thanks for watching\.?|subtitles by.*|you\.?)$/i.test(t)) {
    return '';
  }
  return t;
}

async function transcribeAudioBuffer({ base64Audio, mimeType }) {
  if (!base64Audio) return '';
  try {
    const config = loadConfig();
    const groqKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
    const geminiKey = (config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();

    if (groqKey) {
      const text = await transcribeWithGroqWhisper({
        apiKey: groqKey,
        base64Audio,
        mimeType: mimeType || 'audio/webm',
      });
      const cleaned = cleanTranscriptionOutput(text);
      if (cleaned) return cleaned;
    }
    if (geminiKey) {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'audio/webm',
                  data: base64Audio,
                },
              },
              {
                text: 'Transcribe this spoken speech accurately. Output ONLY the clean transcribed words with proper punctuation and capitalization. If there is only silence or background noise, output an empty string. Do not include quotes, timestamps, explanations, or any other text.',
              },
            ],
          },
        ],
      });
      return cleanTranscriptionOutput(response && response.text);
    }
  } catch (err) {
    console.warn('[Main] Audio transcription error:', err.message);
  }
  return '';
}

async function startVoiceDictation() {
  if (dictationWindow && !dictationWindow.isDestroyed()) {
    try {
      dictationWindow.webContents.send('dictation:command', { action: 'finish' });
    } catch (e) {
      try {
        dictationWindow.close();
      } catch (_) {}
      dictationWindow = null;
    }
    return;
  }

  trackExternalWindow();

  // Collapse Top Notch without disturbing the user's focused input field
  if (topNotchWindow && !topNotchWindow.isDestroyed()) {
    topNotchIsInteractive = false;
    topNotchWindow.setFocusable(false);
    topNotchWindow.setIgnoreMouseEvents(true, { forward: true });
    topNotchWindow.webContents.send('top-notch:trigger', false);
  }

  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const bounds = primaryDisplay.bounds;
    const width = 680;
    const height = 320;
    const x = Math.round(bounds.x + (bounds.width - width) / 2);
    const y = Math.round(bounds.y + (bounds.height - height) / 2);

    dictationWindow = new BrowserWindow({
      x,
      y,
      width,
      height,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    dictationWindow.setAlwaysOnTop(true, 'screen-saver');
    dictationWindow.loadFile(path.join(__dirname, '../renderer/dictation_pill.html'));

    dictationWindow.on('closed', () => {
      dictationWindow = null;
    });
  } catch (err) {
    console.warn('[Main] Failed to start voice dictation:', err.message);
  }
}

ipcMain.handle('jarvis:start-voice-dictation', async () => {
  await startVoiceDictation();
  return { success: true };
});

ipcMain.on('jarvis:cancel-dictation', () => {
  if (dictationWindow && !dictationWindow.isDestroyed()) {
    dictationWindow.close();
    dictationWindow = null;
  }
});

ipcMain.handle('jarvis:preview-dictation-audio', async (event, { base64Audio, mimeType }) => {
  const text = await transcribeAudioBuffer({ base64Audio, mimeType });
  return { success: true, text };
});

ipcMain.on('jarvis:type-dictated-text', (event, text) => {
  if (dictationWindow && !dictationWindow.isDestroyed()) {
    dictationWindow.close();
    dictationWindow = null;
  }
  if (text && text.trim()) {
    setTimeout(() => {
      pasteTextIntoActiveApp(text.trim());
    }, 100);
  }
});

ipcMain.on('jarvis:finish-dictation-audio', async (event, { base64Audio, mimeType, fallbackText }) => {
  let transcribedText = '';
  if (base64Audio) {
    transcribedText = await transcribeAudioBuffer({ base64Audio, mimeType });
  }
  if (!transcribedText && fallbackText) {
    transcribedText = fallbackText.trim();
  }

  if (dictationWindow && !dictationWindow.isDestroyed()) {
    try {
      dictationWindow.close();
    } catch (_) {}
    dictationWindow = null;
  }

  if (transcribedText) {
    console.log(`[Main] Voice dictation transcribed: "${transcribedText}"`);
    pasteTextIntoActiveApp(transcribedText);
  }
});


ipcMain.handle('jarvis:send-email', async (event, { to = '', subject = '', body = '' }) => {
  try {
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    await shell.openExternal(mailto);
    return { success: true, message: `Opened email client for ${to || 'draft'}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:system-control', async (event, payload) => {
  return new Promise((resolve) => {
    const action = typeof payload === 'string' ? payload : (payload?.action || '');
    const level = typeof payload === 'object' ? payload.level : undefined;
    const normalized = action.toLowerCase();

    let psArgs = '';
    if (normalized === 'volume_up' || normalized === 'volumeup' || normalized === 'up') {
      psArgs = '-action volume-up';
    } else if (normalized === 'volume_down' || normalized === 'volumedown' || normalized === 'down') {
      psArgs = '-action volume-down';
    } else if (normalized === 'volume_mute' || normalized === 'mute') {
      psArgs = '-action volume-mute';
    } else if (normalized === 'volume_unmute' || normalized === 'unmute') {
      psArgs = '-action volume-unmute';
    } else if (normalized === 'volume_set' || normalized === 'set') {
      psArgs = `-action volume-set -volume ${Math.max(0, Math.min(100, Math.round(Number(level) || 0)))}`;
    } else if (normalized === 'volume_get' || normalized === 'get') {
      psArgs = '-action volume-get';
    } else if (normalized === 'close_active' || normalized === 'close_window' || normalized === 'close_app' || normalized === 'close') {
      psArgs = '-action close-active';
    } else if (normalized === 'screenshot' || normalized === 'snipping') {
      shell.openExternal('ms-screenclip:').then(() => {
        resolve({ success: true, message: 'Opened Snipping Tool' });
      }).catch((err) => {
        resolve({ success: false, error: err.message });
      });
      return;
    } else if (normalized === 'lock') {
      psArgs = '-action system-power -keys lock';
    } else if (normalized === 'sleep') {
      psArgs = '-action system-power -keys sleep';
    } else if (normalized === 'shutdown') {
      psArgs = '-action system-power -keys shutdown';
    } else if (normalized === 'restart' || normalized === 'reboot') {
      psArgs = '-action system-power -keys restart';
    } else if (normalized === 'cancel_shutdown' || normalized === 'cancel') {
      psArgs = '-action system-power -keys cancel';
    } else {
      resolve({ success: false, error: `Unknown system action: ${action}` });
      return;
    }

    exec(`powershell.exe -NoProfile -File "${osInputScript}" ${psArgs}`, (err, stdout, stderr) => {
      const output = (stdout || stderr || '').trim();
      if (output.startsWith('MUTED:')) {
        const isMuted = output.includes('True');
        resolve({ success: !err, message: `Volume: ${isMuted ? 'Muted' : 'Unmuted'}` });
      } else {
        resolve({ success: !err, message: output ? `Volume: ${output}` : 'System command executed' });
      }
    });
  });
});

// --- STANDALONE TOP BEZEL CONTROL CENTRE WINDOW & HANDLERS ---
let topNotchWindow = null;
let topNotchIsInteractive = false;

function createTopNotchWindow() {
  if (topNotchWindow && !topNotchWindow.isDestroyed()) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const winW = 900;
  const winH = 680;
  const winX = Math.round((screenWidth - winW) / 2);

  topNotchWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: winX,
    y: 0,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows loading local file:/// wallpaper images smoothly
      backgroundThrottling: false,
    },
  });

  topNotchWindow.setAlwaysOnTop(true, 'screen-saver');
  topNotchWindow.setIgnoreMouseEvents(true, { forward: true });
  const topNotchHtmlPath = path.join(__dirname, '../renderer/top_notch.html');
  topNotchWindow.loadFile(topNotchHtmlPath);
  try {
    fs.watchFile(topNotchHtmlPath, { interval: 1000 }, () => {
      if (topNotchWindow && !topNotchWindow.isDestroyed() && topNotchWindow.webContents) {
        topNotchWindow.loadFile(topNotchHtmlPath);
      }
    });
  } catch (_) {}

  // Monitor cursor touching top edge center of screen even when Grokki Island (Alt+Q) is closed
  setInterval(() => {
    if (!topNotchWindow || topNotchWindow.isDestroyed()) return;
    if (isVisible && mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) return;
    try {
      const pt = screen.getCursorScreenPoint();
      const centerX = Math.round(screenWidth / 2);
      const isOverMiniIsland = (pt.y <= 36 && Math.abs(pt.x - centerX) <= 195) || (pt.y <= 4 && Math.abs(pt.x - centerX) <= 240);
      if (isOverMiniIsland) {
        if (!topNotchIsInteractive) {
          trackExternalWindow();
          topNotchIsInteractive = true;
          topNotchWindow.setIgnoreMouseEvents(false);
          topNotchWindow.setAlwaysOnTop(true, 'screen-saver');
          topNotchWindow.webContents.send('top-notch:trigger', true);
        }
      } else if (topNotchIsInteractive && !topNotchIsFocusable && (pt.y > 520 || Math.abs(pt.x - centerX) > 450)) {
        topNotchIsInteractive = false;
        topNotchWindow.setFocusable(false);
        topNotchWindow.setIgnoreMouseEvents(true, { forward: true });
        topNotchWindow.webContents.send('top-notch:trigger', false);
      }
    } catch (e) {}
  }, 65);
}

let topNotchIsFocusable = false;

ipcMain.on('top-notch:set-interactive', (event, interactive) => {
  topNotchIsInteractive = !!interactive;
  if (!topNotchIsInteractive) topNotchIsFocusable = false;
  if (topNotchWindow && !topNotchWindow.isDestroyed()) {
    if (topNotchIsInteractive) {
      topNotchWindow.setIgnoreMouseEvents(false);
      topNotchWindow.setAlwaysOnTop(true, 'screen-saver');
    } else {
      topNotchWindow.setFocusable(false);
      topNotchWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  }
});

ipcMain.on('top-notch:set-focusable', (event, focusable) => {
  topNotchIsFocusable = !!focusable;
  if (topNotchWindow && !topNotchWindow.isDestroyed()) {
    try {
      topNotchWindow.setFocusable(!!focusable);
      if (focusable) {
        topNotchWindow.focus();
      }
    } catch (_) {}
  }
});

// Dynamic Island Notification & Live Activity Broadcast Handlers & Google Workspace Notifier
ipcMain.on('island:show-notification', (event, data) => {
  try {
    const electron = require('electron');
    const BrowserWindow = electron.BrowserWindow;
    if (BrowserWindow) {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send('island:notification', data);
        }
      });
    }
  } catch (_) {}
});

ipcMain.on('island:set-activity', (event, data) => {
  try {
    const electron = require('electron');
    const BrowserWindow = electron.BrowserWindow;
    if (BrowserWindow) {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send('island:activity', data);
        }
      });
    }
  } catch (_) {}
});

ipcMain.on('island:set-lock-mode', (event, data) => {
  try {
    const electron = require('electron');
    const BrowserWindow = electron.BrowserWindow;
    if (BrowserWindow) {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send('island:lock-mode', data);
        }
      });
    }
  } catch (_) {}
});

const seenGoogleNotificationIds = new Set();
setInterval(async () => {
  try {
    const googleWorkspace = require('./google_workspace');
    if (!googleWorkspace || !googleWorkspace.isConnected()) return;

    // 1. Check Unread Emails (Primary inbox)
    try {
      const emailRes = await googleWorkspace.listUnreadEmails(2);
      if (emailRes && emailRes.success && Array.isArray(emailRes.emails) && emailRes.emails.length > 0) {
        for (const email of emailRes.emails) {
          if (!seenGoogleNotificationIds.has(`email-${email.id}`)) {
            seenGoogleNotificationIds.add(`email-${email.id}`);
            let sender = (email.from || 'Google Mail').replace(/<.*?>/, '').trim();
            if (sender.startsWith('"') && sender.endsWith('"')) sender = sender.slice(1, -1);
            const electron = require('electron');
            electron.BrowserWindow.getAllWindows().forEach((win) => {
              if (!win.isDestroyed() && win.webContents) {
                win.webContents.send('island:notification', {
                  source: 'email',
                  sender: sender || 'Gmail',
                  message: email.subject || 'New message in primary inbox',
                  icon: 'email',
                  timestamp: Date.now(),
                });
              }
            });
            break;
          }
        }
      }
    } catch (_) {}

    // 2. Check Upcoming Calendar Events (within next 30 minutes)
    try {
      const calRes = await googleWorkspace.getUpcomingEvents(2);
      if (calRes && calRes.success && Array.isArray(calRes.events) && calRes.events.length > 0) {
        const now = Date.now();
        for (const ev of calRes.events) {
          const eventTime = ev.start ? new Date(ev.start).getTime() : 0;
          const diffMinutes = (eventTime - now) / (1000 * 60);
          const evKey = `cal-${ev.title}-${ev.start}`;
          if (diffMinutes > 0 && diffMinutes <= 30 && !seenGoogleNotificationIds.has(evKey)) {
            seenGoogleNotificationIds.add(evKey);
            const timeStr = Math.round(diffMinutes) === 0 ? 'starting now' : `in ${Math.round(diffMinutes)} mins`;
            const electron = require('electron');
            electron.BrowserWindow.getAllWindows().forEach((win) => {
              if (!win.isDestroyed() && win.webContents) {
                win.webContents.send('island:notification', {
                  source: 'calendar',
                  sender: 'Google Calendar',
                  message: `${ev.title} (${timeStr})`,
                  icon: 'calendar',
                  timestamp: Date.now(),
                });
              }
            });
            break;
          }
        }
      }
    } catch (_) {}

    if (seenGoogleNotificationIds.size > 200) {
      const arr = Array.from(seenGoogleNotificationIds);
      arr.slice(0, 100).forEach((id) => seenGoogleNotificationIds.delete(id));
    }
  } catch (_) {}
}, 45000);

// --- HITODAMA REAL CLIPBOARD MONITOR & SYSTEM STATS (Electron 44 Async Clipboard API) ---
const clipboardFilePath = path.join(grokkiDataDir, 'clipboard_history.json');
const clipboardHistory = [];
let lastClipText = '';
let lastClipImageHash = '';
let isCheckingClipboard = false;

function loadClipboardHistory() {
  try {
    if (fs.existsSync(clipboardFilePath)) {
      const data = fs.readFileSync(clipboardFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        clipboardHistory.length = 0;
        clipboardHistory.push(...parsed);
      }
    }
  } catch (e) {
    console.warn('[Clipboard] Failed to load history:', e.message);
  }
}
loadClipboardHistory();

function saveClipboardHistory() {
  try {
    const toSave = clipboardHistory.slice(0, 60);
    fs.writeFileSync(clipboardFilePath, JSON.stringify(toSave), 'utf8');
  } catch (e) {
    console.warn('[Clipboard] Failed to save history:', e.message);
  }
}

function detectClipboardItemType(rawText) {
  const trimmed = (rawText || '').trim();
  if (/^https?:\/\//i.test(trimmed)) return 'link';
  if (/(function|const|let|var|class|import|def|return|=>|\{|\}|;\s*$)/.test(trimmed)) return 'code';
  return 'text';
}

function broadcastClipboardHistory() {
  try {
    const allWindows = BrowserWindow.getAllWindows();
    for (const win of allWindows) {
      if (win && !win.isDestroyed() && win.webContents) {
        win.webContents.send('clipboard:history-updated', clipboardHistory);
      }
    }
  } catch (_) {}
}

async function pasteImageIntoActiveApp(dataUrl) {
  try {
    const nativeImg = nativeImage.createFromDataURL(dataUrl);
    if (nativeImg.isEmpty()) return;
    const buf = nativeImg.toPNG();
    lastClipImageHash = `${buf.length}_${buf.slice(0, 32).toString('hex')}`;

    if (typeof clipboard.write === 'function' && typeof ClipboardItem !== 'undefined') {
      const blob = new Blob([buf], { type: 'image/png' });
      await clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } else if (typeof clipboard.writeImage === 'function') {
      clipboard.writeImage(nativeImg);
    }

    if (topNotchWindow && !topNotchWindow.isDestroyed()) {
      topNotchIsInteractive = false;
      topNotchWindow.setFocusable(false);
      topNotchWindow.setIgnoreMouseEvents(true, { forward: true });
      topNotchWindow.webContents.send('top-notch:trigger', false);
    }

    setTimeout(() => {
      triggerFastPaste();
    }, 45);
  } catch (e) {
    console.warn('[Main] Failed to paste image into active app:', e.message);
  }
}

async function checkSystemClipboard() {
  if (isCheckingClipboard) return;
  isCheckingClipboard = true;
  try {
    // 1. Check for Image (Electron 44 async ClipboardItem array)
    if (typeof clipboard.read === 'function') {
      try {
        const items = await clipboard.read();
        if (Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            if (item && item.types && item.types.some((t) => t.startsWith('image/'))) {
              const imgType = item.types.find((t) => t.startsWith('image/'));
              const blob = await item.getType(imgType);
              const ab = await blob.arrayBuffer();
              const buf = Buffer.from(ab);
              const img = nativeImage.createFromBuffer(buf);
              if (!img.isEmpty()) {
                const size = img.getSize();
                if (size.width > 0 && size.height > 0) {
                  const hash = `img_${size.width}x${size.height}_${buf.length}_${buf.slice(0, 32).toString('hex')}`;
                  if (hash !== lastClipImageHash) {
                    lastClipImageHash = hash;
                    lastClipText = ''; // Reset text signature so identical text copied next is captured

                    let thumbImg = img;
                    if (size.width > 900 || size.height > 900) {
                      const scale = Math.min(900 / size.width, 900 / size.height);
                      thumbImg = img.resize({
                        width: Math.max(1, Math.round(size.width * scale)),
                        height: Math.max(1, Math.round(size.height * scale)),
                        quality: 'good',
                      });
                    }
                    const dataUrl = thumbImg.toDataURL();

                    const existingIdx = clipboardHistory.findIndex((it) => it.imageHash === hash);
                    let wasPinned = false;
                    if (existingIdx !== -1) {
                      wasPinned = !!clipboardHistory[existingIdx].pinned;
                      clipboardHistory.splice(existingIdx, 1);
                    }

                    clipboardHistory.unshift({
                      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      type: 'image',
                      imageHash: hash,
                      imageData: dataUrl,
                      imageWidth: size.width,
                      imageHeight: size.height,
                      text: `Image (${size.width}x${size.height})`,
                      time: Date.now(),
                      pinned: wasPinned,
                    });

                    clipboardHistory.sort((a, b) => {
                      if (b.pinned !== a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
                      return (b.time || 0) - (a.time || 0);
                    });

                    if (clipboardHistory.length > 60) clipboardHistory.pop();
                    saveClipboardHistory();
                    broadcastClipboardHistory();
                    return;
                  }
                  return;
                }
              }
            }
          }
        }
      } catch (imgErr) {}
    }

    // 2. Check for Text (Electron 44 returns a Promise<string>)
    try {
      const raw = clipboard.readText();
      const text = raw instanceof Promise ? await raw : raw;
      if (typeof text === 'string' && text.trim()) {
        const clean = text.trim();
        if (clean !== lastClipText) {
          lastClipText = clean;
          lastClipImageHash = ''; // Reset image signature so identical image copied next is captured

          const type = detectClipboardItemType(clean);
          const existingIdx = clipboardHistory.findIndex((it) => it.text === clean && it.type !== 'image');
          let wasPinned = false;
          if (existingIdx !== -1) {
            wasPinned = !!clipboardHistory[existingIdx].pinned;
            clipboardHistory.splice(existingIdx, 1);
          }

          clipboardHistory.unshift({
            id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            type,
            text: clean,
            time: Date.now(),
            pinned: wasPinned,
          });

          clipboardHistory.sort((a, b) => {
            if (b.pinned !== a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
            return (b.time || 0) - (a.time || 0);
          });

          if (clipboardHistory.length > 60) clipboardHistory.pop();
          saveClipboardHistory();
          broadcastClipboardHistory();
        }
      }
    } catch (textErr) {}
  } catch (e) {
    // Windows clipboard locked or momentarily busy - retry next interval
  } finally {
    isCheckingClipboard = false;
  }
}

// Check every 300ms for instant real-time response
setInterval(checkSystemClipboard, 300);
// Check immediately on startup
setTimeout(checkSystemClipboard, 200);

ipcMain.handle('jarvis:get-clipboard-history', async () => {
  await checkSystemClipboard();
  return clipboardHistory;
});

ipcMain.handle('jarvis:copy-clipboard-item', async (event, payload) => {
  try {
    if (!payload) return { success: false };

    let item = null;
    if (typeof payload === 'object') {
      item = payload;
    } else {
      item = clipboardHistory.find((i) => i.id === payload || i.text === payload);
    }

    if (item && item.type === 'image' && item.imageData) {
      const nativeImg = nativeImage.createFromDataURL(item.imageData);
      if (!nativeImg.isEmpty()) {
        const buf = nativeImg.toPNG();
        lastClipImageHash = `${buf.length}_${buf.slice(0, 32).toString('hex')}`;
        if (typeof clipboard.write === 'function' && typeof ClipboardItem !== 'undefined') {
          const blob = new Blob([buf], { type: 'image/png' });
          await clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } else if (typeof clipboard.writeImage === 'function') {
          clipboard.writeImage(nativeImg);
        }
        return { success: true };
      }
    }

    const textToCopy = (typeof payload === 'string' ? payload : (item ? item.text : '')).trim();
    if (!textToCopy) return { success: false };
    lastClipText = textToCopy;
    const writeRes = clipboard.writeText(textToCopy);
    if (writeRes instanceof Promise) await writeRes;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:paste-clipboard-item', async (event, payload) => {
  try {
    if (!payload) return { success: false };

    let item = null;
    if (typeof payload === 'object') {
      item = payload;
    } else {
      item = clipboardHistory.find((i) => i.id === payload || i.text === payload);
    }

    if (item && item.type === 'image' && item.imageData) {
      await pasteImageIntoActiveApp(item.imageData);
      return { success: true };
    }

    const textToPaste = (typeof payload === 'string' ? payload : (item ? item.text : '')).trim();
    if (!textToPaste) return { success: false };
    pasteTextIntoActiveApp(textToPaste);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:pin-clipboard-item', (event, id) => {
  const item = clipboardHistory.find((i) => i.id === id);
  if (item) {
    item.pinned = !item.pinned;
    clipboardHistory.sort((a, b) => {
      if (b.pinned !== a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return (b.time || 0) - (a.time || 0);
    });
    saveClipboardHistory();
    broadcastClipboardHistory();
  }
  return clipboardHistory;
});

ipcMain.handle('jarvis:delete-clipboard-item', (event, id) => {
  const idx = clipboardHistory.findIndex((i) => i.id === id);
  if (idx !== -1) {
    clipboardHistory.splice(idx, 1);
    saveClipboardHistory();
    broadcastClipboardHistory();
  }
  return clipboardHistory;
});

ipcMain.handle('jarvis:clear-clipboard-history', () => {
  const pinnedOnly = clipboardHistory.filter((i) => i.pinned);
  clipboardHistory.length = 0;
  clipboardHistory.push(...pinnedOnly);
  saveClipboardHistory();
  broadcastClipboardHistory();
  return clipboardHistory;
});

const osControlsScript = path.join(__dirname, 'os_controls.ps1').replace('app.asar', 'app.asar.unpacked');
const osVolumeScript = path.join(__dirname, 'os_volume.ps1').replace('app.asar', 'app.asar.unpacked');

// --- FAST OS MASTER VOLUME DAEMON (0ms Real-Time Windows Scalar Volume) ---
let volumeDaemon = null;
let volumePendingCallbacks = [];
let cachedVolumeState = { success: true, volume: 50, muted: false };

function ensureVolumeDaemon() {
  if (volumeDaemon && !volumeDaemon.killed && volumeDaemon.stdin && volumeDaemon.stdin.writable) {
    return volumeDaemon;
  }
  try {
    volumeDaemon = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', osVolumeScript, '-Daemon'], {
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
    });
    let buffer = '';
    volumeDaemon.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'READY') continue;
        try {
          const parsed = JSON.parse(trimmed);
          cachedVolumeState = parsed;
          const cb = volumePendingCallbacks.shift();
          if (cb) cb(parsed);
        } catch (_) {}
      }
    });
    volumeDaemon.on('exit', () => {
      volumeDaemon = null;
      while (volumePendingCallbacks.length) {
        const cb = volumePendingCallbacks.shift();
        cb(cachedVolumeState);
      }
    });
    volumeDaemon.on('error', () => {
      volumeDaemon = null;
    });
  } catch (_) {
    volumeDaemon = null;
  }
  return volumeDaemon;
}

function sendVolumeCommand(cmd) {
  return new Promise((resolve) => {
    const daemon = ensureVolumeDaemon();
    if (!daemon || !daemon.stdin || !daemon.stdin.writable) {
      // Fallback direct execution
      const parts = cmd.trim().split(/\s+/);
      const act = parts[0].toLowerCase();
      const val = parts[1] || -1;
      exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${osVolumeScript}" -Action "${act}" -Value ${val}`, { timeout: 3500 }, (err, stdout) => {
        try {
          const parsed = JSON.parse(stdout.trim());
          cachedVolumeState = parsed;
          resolve(parsed);
        } catch (_) {
          resolve(cachedVolumeState);
        }
      });
      return;
    }

    const timer = setTimeout(() => {
      resolve(cachedVolumeState);
    }, 1200);

    volumePendingCallbacks.push((res) => {
      clearTimeout(timer);
      resolve(res);
    });

    try {
      daemon.stdin.write(cmd + '\n');
    } catch (_) {
      clearTimeout(timer);
      resolve(cachedVolumeState);
    }
  });
}

async function getMasterVolume() {
  return await sendVolumeCommand('get');
}

async function setMasterVolume(val) {
  return await sendVolumeCommand(`set ${Math.max(0, Math.min(100, Math.round(Number(val) || 0)))}`);
}

async function toggleMasterVolumeMute() {
  return await sendVolumeCommand('toggle-mute');
}

function stopVolumeDaemon() {
  if (volumeDaemon) {
    try { volumeDaemon.kill(); } catch (_) {}
    volumeDaemon = null;
  }
}

// Pre-warm volume daemon
setTimeout(() => ensureVolumeDaemon(), 1200);

function runOsControlScript(action, target = '', value = 0) {
  return new Promise((resolve) => {
    const safeTarget = String(target || '').replace(/"/g, '\\"');
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${osControlsScript}" -Action "${action}" -Target "${safeTarget}" -Value ${Number(value) || 0}`;
    exec(cmd, { timeout: 9000 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve({ success: false, error: err ? err.message : 'No output' });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (e) {
        resolve({ success: false, error: 'Invalid JSON output' });
      }
    });
  });
}

ipcMain.handle('jarvis:os-control', async (event, payload = {}) => {
  const { action = 'status', target = '', value = 0 } = payload;
  if (action === 'get-volume') {
    return await getMasterVolume();
  }
  if (action === 'set-volume') {
    return await setMasterVolume(value);
  }
  if (action === 'toggle-mute') {
    return await toggleMasterVolumeMute();
  }
  return await runOsControlScript(action, target, value);
});

ipcMain.handle('jarvis:get-volume', async () => {
  return await getMasterVolume();
});

ipcMain.handle('jarvis:set-volume', async (event, val) => {
  return await setMasterVolume(val);
});

ipcMain.handle('jarvis:toggle-volume-mute', async () => {
  return await toggleMasterVolumeMute();
});

// Fast 0ms Node.js CPU tick tracker + non-blocking WMI hardware cache
let prevCpuTicks = null;
function getInstantCpuLoad() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }
  let pct = 14;
  if (prevCpuTicks) {
    const idleDiff = idle - prevCpuTicks.idle;
    const totalDiff = total - prevCpuTicks.total;
    if (totalDiff > 0) {
      pct = Math.max(1, Math.min(100, Math.round(100 - (100 * idleDiff) / totalDiff)));
    }
  }
  prevCpuTicks = { idle, total };
  return pct;
}
getInstantCpuLoad();

let extStatsCache = null;
let extStatsFetching = false;
function refreshExtStatsInBackground() {
  if (extStatsFetching) return;
  extStatsFetching = true;
  runOsControlScript('live-stats')
    .then((res) => {
      if (res && res.success) {
        extStatsCache = res;
      }
    })
    .catch(() => {})
    .finally(() => {
      extStatsFetching = false;
    });
}
refreshExtStatsInBackground();

ipcMain.handle('jarvis:get-system-stats', async () => {
  refreshExtStatsInBackground();
  try {
    const totalMem = Math.round((os.totalmem() / (1024 * 1024 * 1024)) * 10) / 10;
    const freeMem = Math.round((os.freemem() / (1024 * 1024 * 1024)) * 10) / 10;
    const usedMem = Math.round((totalMem - freeMem) * 10) / 10;
    const ramPct = Math.round((usedMem / totalMem) * 100);
    const cpus = os.cpus();
    const cpuModel = (cpus && cpus[0] ? cpus[0].model.replace(/\s+/g, ' ').trim() : 'Processor');
    const cpuThreads = cpus ? cpus.length : 8;
    const cpuCores = extStatsCache?.cpu?.cores || Math.max(1, Math.round(cpuThreads / 2));
    const cpuGhz = cpus && cpus[0] && cpus[0].speed ? Math.round((cpus[0].speed / 1000) * 100) / 100 : (extStatsCache?.cpu?.ghz || 3.2);
    const cpuPct = getInstantCpuLoad();

    const upSec = os.uptime();
    const upD = Math.floor(upSec / 86400);
    const upH = Math.floor((upSec % 86400) / 3600);
    const upM = Math.floor((upSec % 3600) / 60);
    const uptimeStr = `${upD}d ${upH}h ${upM}m`;

    // Instant local IPv4
    let localIp = extStatsCache?.network?.ip || 'Local LAN';
    let netAdapterName = extStatsCache?.network?.adapter || 'Wi-Fi';
    try {
      const nets = os.networkInterfaces();
      for (const [ifName, addrs] of Object.entries(nets)) {
        for (const a of addrs || []) {
          if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) {
            localIp = a.address;
            netAdapterName = ifName;
            break;
          }
        }
      }
    } catch (e) {}

    return {
      success: true,
      totalMem,
      freeMem,
      usedMem,
      ramPct,
      cpuModel,
      cpuCores: cpuThreads,
      cpu: {
        name: cpuModel,
        pct: cpuPct,
        ghz: cpuGhz,
        cores: cpuCores,
        threads: cpuThreads,
      },
      ram: {
        usedGB: usedMem,
        freeGB: freeMem,
        totalGB: totalMem,
        pct: ramPct,
      },
      gpu: extStatsCache?.gpu || {
        name: 'Integrated / Discrete GPU',
        vramGB: 4,
        display: '1920x1080 @ 144Hz',
      },
      uptime: uptimeStr,
      battery: extStatsCache?.battery || {
        pct: 100,
        status: 'AC Power',
        charging: true,
      },
      network: {
        adapter: extStatsCache?.network?.adapter || netAdapterName,
        speed: extStatsCache?.network?.speed || 'Connected',
        ip: localIp,
      },
      disks: extStatsCache?.disks || [
        { name: 'C:', usedGB: 120, freeGB: 40, totalGB: 160, pct: 75 },
      ],
      processes: extStatsCache?.processes || [],
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Scan Real Installed User Applications (.lnk from Start Menu & Desktop) + Native High-Res Icons
let cachedInstalledApps = null;
function scanShortcutsInDir(dirPath, maxItems = 40) {
  let list = [];
  if (!dirPath || !fs.existsSync(dirPath)) return list;
  try {
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      if (list.length >= maxItems) break;
      const fullPath = path.join(dirPath, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (!/^(Administrative Tools|System Tools|Accessibility|Accessories|StartUp|Maintenance)$/i.test(entry)) {
            list = list.concat(scanShortcutsInDir(fullPath, maxItems - list.length));
          }
        } else if (/\.lnk$/i.test(entry)) {
          const baseName = entry.replace(/\.lnk$/i, '').trim();
          if (/uninstall|readme|help|manual|website|documentation|update|setup|installer|license|release notes|command prompt|powershell/i.test(baseName)) {
            continue;
          }
          let targetExe = fullPath;
          try {
            const parsedLnk = shell.readShortcutLink(fullPath);
            if (parsedLnk && parsedLnk.target && fs.existsSync(parsedLnk.target)) {
              if (/uninstall|unins000|setup/i.test(path.basename(parsedLnk.target))) continue;
              targetExe = parsedLnk.target;
            }
          } catch (e) {}
          list.push({
            name: baseName,
            path: fullPath,
            exePath: targetExe,
            category: path.basename(dirPath) === 'Programs' ? 'Application' : path.basename(dirPath),
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  return list;
}

ipcMain.handle('jarvis:get-installed-apps', async () => {
  if (cachedInstalledApps && cachedInstalledApps.length > 0) {
    return cachedInstalledApps;
  }
  const userStartMenu = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
  const commonStartMenu = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs';
  const userDesktop = path.join(os.homedir(), 'Desktop');
  const oneDriveDesktop = path.join(os.homedir(), 'OneDrive', 'Desktop');

  let raw = []
    .concat(scanShortcutsInDir(userDesktop, 50))
    .concat(scanShortcutsInDir(oneDriveDesktop, 50))
    .concat(scanShortcutsInDir(userStartMenu, 150))
    .concat(scanShortcutsInDir(commonStartMenu, 150));

  const seenNames = new Set();
  const unique = [];
  for (const item of raw) {
    const key = item.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    unique.push(item);
  }

  // Also query Get-StartApps to find Windows Store & UWP apps
  try {
    const psCmd = `powershell -NoProfile -Command "Get-StartApps | ConvertTo-Json -Compress"`;
    const startAppsList = await new Promise((res) => {
      exec(psCmd, { maxBuffer: 10 * 1024 * 1024, timeout: 3000 }, (err, stdout) => {
        if (err || !stdout) return res([]);
        try {
          const parsed = JSON.parse(stdout);
          res(Array.isArray(parsed) ? parsed : [parsed]);
        } catch (e) {
          res([]);
        }
      });
    });

    for (const appItem of startAppsList) {
      if (!appItem.Name || !appItem.AppID || String(appItem.AppID).startsWith('http')) continue;
      const key = appItem.Name.toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        unique.push({
          name: appItem.Name,
          path: appItem.AppID,
          appId: appItem.AppID,
          category: 'Application',
        });
      }
    }
  } catch (e) {}

  unique.sort((a, b) => a.name.localeCompare(b.name));

  const enriched = await Promise.all(unique.map(async (item) => {
    let iconDataUrl = '';
    const iconPath = item.exePath || (item.path && item.path.includes('\\') ? item.path : null);
    if (iconPath && fs.existsSync(iconPath)) {
      try {
        const iconImg = await app.getFileIcon(iconPath, { size: 'normal' });
        if (iconImg && !iconImg.isEmpty()) {
          iconDataUrl = iconImg.toDataURL();
        }
      } catch (e) {}
    }
    return {
      ...item,
      icon: iconDataUrl,
    };
  }));

  cachedInstalledApps = enriched;
  return enriched;
});

ipcMain.handle('jarvis:launch-installed-app', async (event, appPath) => {
  if (!appPath) return { success: false };
  try {
    await shell.openPath(appPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================================
// INSTALLED GAMES SCANNER + FREE OFFICIAL POSTER API (Steam Store API + CheapShark)
// ============================================================================
const gamesPosterCachePath = path.join(grokkiDataDir, 'games-poster-cache.json');
let gamesPosterCache = {};
try {
  if (fs.existsSync(gamesPosterCachePath)) {
    gamesPosterCache = JSON.parse(fs.readFileSync(gamesPosterCachePath, 'utf8')) || {};
  }
} catch (e) {
  gamesPosterCache = {};
}

function saveGamesPosterCache() {
  try {
    fs.writeFileSync(gamesPosterCachePath, JSON.stringify(gamesPosterCache, null, 2), 'utf8');
  } catch (e) {}
}

const KNOWN_GAME_TITLES = {
  farcry5: { title: 'Far Cry 5', appId: '552520' },
  forzahorizon4: { title: 'Forza Horizon 4', appId: '1293830' },
  forzahorizon5: { title: 'Forza Horizon 5', appId: '1551360' },
  sleepingdogsdefinitiveedition: { title: 'Sleeping Dogs: Definitive Edition', appId: '307690' },
  chainedtogether: { title: 'Chained Together', appId: '2567870' },
  picopark: { title: 'PICO PARK', appId: '1509960' },
  pico_park: { title: 'PICO PARK', appId: '1509960' },
  crabgame: { title: 'Crab Game', appId: '1782210' },
  marvelsspiderman2: { title: "Marvel's Spider-Man 2", appId: '2651280' },
  needforspeedheat: { title: 'Need for Speed Heat', appId: '1222680' },
  thewitcher3: { title: 'The Witcher 3: Wild Hunt', appId: '292030' },
  mafiadefinitiveedition: { title: 'Mafia: Definitive Edition', appId: '1030840' },
  reddeadredemption2: { title: 'Red Dead Redemption 2', appId: '1174180' },
  grandtheftautov: { title: 'Grand Theft Auto V', appId: '271590' },
  gtav: { title: 'Grand Theft Auto V', appId: '271590' },
  cyberpunk2077: { title: 'Cyberpunk 2077', appId: '1091500' },
  eldenring: { title: 'Elden Ring', appId: '1245620' },
};

function normalizeGameKey(rawName = '') {
  return String(rawName)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function prettifyGameFolderName(rawFolder = '') {
  const norm = normalizeGameKey(rawFolder);
  if (KNOWN_GAME_TITLES[norm]) {
    return KNOWN_GAME_TITLES[norm].title;
  }
  return String(rawFolder)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d+)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function isIgnoredGameFolder(folderName = '', fullDirPath = '') {
  const lower = String(folderName).toLowerCase().trim();
  if (!lower) return true;
  if (
    /^(steamworks shared|wallpaper_engine|wallpaper engine|steam controller configs|proton.*|steamlinuxruntime.*|directx|redist|_commonredist|commonredist|installers|support|shader|shadercache|temp|logs|crash|excalibur|blender|gamesave|tools|soundtrack|artbook|sdk|dedicated server)$/i.test(
      lower
    )
  ) {
    return true;
  }
  try {
    const entries = fs.readdirSync(fullDirPath);
    if (!entries || entries.length === 0) return true;
  } catch (e) {
    return true;
  }
  return false;
}

function findGameExecutable(installDir, maxDepth = 3, currentDepth = 0) {
  if (!installDir || !fs.existsSync(installDir) || currentDepth > maxDepth) return '';
  let candidates = [];
  try {
    const entries = fs.readdirSync(installDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(installDir, entry.name);
      if (entry.isFile() && /\.exe$/i.test(entry.name)) {
        if (
          /^(unins|crash|unitycrash|crs-|dxsetup|vc_redist|vcredist|dotnet|easyanticheat|battleye|beservice|launcher_helper|steamerrorreporter|cleanup|touchup|activation|cep|qtdiag|cefprocess|webhelper|installer)/i.test(
            entry.name
          )
        ) {
          continue;
        }
        let size = 0;
        try {
          size = fs.statSync(fullPath).size;
        } catch (e) {}
        if (size >= 20480) {
          candidates.push({ path: fullPath, name: entry.name, size, depth: currentDepth });
        }
      } else if (entry.isDirectory() && currentDepth < maxDepth) {
        if (!/^(redist|_commonredist|directx|support|installers|easyanticheat|battleye|mono|logs|shadercache)$/i.test(entry.name)) {
          const subExe = findGameExecutable(fullPath, maxDepth, currentDepth + 1);
          if (subExe) {
            let size = 0;
            try {
              size = fs.statSync(subExe).size;
            } catch (e) {}
            if (size >= 20480) {
              candidates.push({ path: subExe, name: path.basename(subExe), size, depth: currentDepth + 1 });
            }
          }
        }
      }
    }
  } catch (e) {}

  if (!candidates.length) return '';
  const folderNorm = normalizeGameKey(path.basename(installDir));
  candidates.sort((a, b) => {
    const aNorm = normalizeGameKey(a.name.replace(/\.exe$/i, ''));
    const bNorm = normalizeGameKey(b.name.replace(/\.exe$/i, ''));
    const aMatches = folderNorm && (aNorm.includes(folderNorm) || folderNorm.includes(aNorm)) ? 1 : 0;
    const bMatches = folderNorm && (bNorm.includes(folderNorm) || folderNorm.includes(bNorm)) ? 1 : 0;
    if (aMatches !== bMatches) return bMatches - aMatches;
    return b.size - a.size;
  });
  return candidates[0].path;
}

function fetchJsonHttps(urlStr, timeoutMs = 4500) {
  return new Promise((resolve) => {
    try {
      const https = require('https');
      const req = https.get(
        urlStr,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'application/json',
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return resolve(fetchJsonHttps(res.headers.location, timeoutMs));
          }
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve(null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

async function resolveGamePosterFreeAPI(gameTitle, knownAppId = '') {
  const normKey = normalizeGameKey(gameTitle);
  if (gamesPosterCache[normKey] && gamesPosterCache[normKey].poster) {
    return gamesPosterCache[normKey];
  }

  let appId = knownAppId || (KNOWN_GAME_TITLES[normKey] && KNOWN_GAME_TITLES[normKey].appId) || '';
  let apiTinyImage = '';

  if (!appId) {
    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameTitle)}&l=english&cc=US`;
    const data = await fetchJsonHttps(searchUrl);
    if (data && Array.isArray(data.items) && data.items.length > 0) {
      const best =
        data.items.find(
          (item) => !/\b(soundtrack|ost|dlc|season pass|artbook|pack|upgrade|demo|trial)\b/i.test(item.name || '')
        ) || data.items[0];
      if (best && best.id) {
        appId = String(best.id);
        apiTinyImage = best.tiny_image || '';
      }
    }
  }

  if (appId) {
    const result = {
      appId,
      poster: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`,
      fallbackPoster: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
      extraFallback: apiTinyImage || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
    };
    gamesPosterCache[normKey] = result;
    return result;
  }

  // Fallback free API: CheapShark Game Deals/Database API (no key required)
  const csUrl = `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(gameTitle)}&limit=3`;
  const csData = await fetchJsonHttps(csUrl);
  if (Array.isArray(csData) && csData.length > 0) {
    const match = csData[0];
    if (match.steamAppID) {
      const sId = String(match.steamAppID);
      const result = {
        appId: sId,
        poster: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${sId}/library_600x900.jpg`,
        fallbackPoster: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${sId}/header.jpg`,
        extraFallback: match.thumb || '',
      };
      gamesPosterCache[normKey] = result;
      return result;
    } else if (match.thumb) {
      const result = {
        appId: '',
        poster: match.thumb,
        fallbackPoster: match.thumb,
        extraFallback: '',
      };
      gamesPosterCache[normKey] = result;
      return result;
    }
  }

  return { appId: '', poster: '', fallbackPoster: '', extraFallback: '' };
}

let cachedInstalledGames = null;

function discoverAllInstalledGamesOnDisk() {
  const steamAppsDirs = new Set();
  const standaloneGameRoots = new Set();

  const defaultSteamPaths = [
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
  ];

  for (const sp of defaultSteamPaths) {
    const sa = path.join(sp, 'steamapps');
    if (fs.existsSync(sa)) {
      steamAppsDirs.add(sa);
      const vdfPath = path.join(sa, 'libraryfolders.vdf');
      if (fs.existsSync(vdfPath)) {
        try {
          const vdfContent = fs.readFileSync(vdfPath, 'utf8');
          const pathMatches = vdfContent.matchAll(/"path"\s+"([^"]+)"/g);
          for (const m of pathMatches) {
            const libRoot = m[1].replace(/\\\\/g, '\\');
            const libSteamApps = path.join(libRoot, 'steamapps');
            if (fs.existsSync(libSteamApps)) {
              steamAppsDirs.add(libSteamApps);
            }
          }
        } catch (e) {}
      }
    }
  }

  // Scan drives C through G for SteamLibrary, Games, Epic Games, XboxGames
  for (const drive of ['C:', 'D:', 'E:', 'F:', 'G:']) {
    for (const sub of ['SteamLibrary\\steamapps', 'Steam\\steamapps', 'Games\\SteamLibrary\\steamapps']) {
      const candidate = path.join(drive + '\\', sub);
      if (fs.existsSync(candidate)) steamAppsDirs.add(candidate);
    }
    for (const rootFolder of ['Games', 'PC Games', 'Epic Games', 'XboxGames']) {
      const candidate = path.join(drive + '\\', rootFolder);
      if (fs.existsSync(candidate)) standaloneGameRoots.add(candidate);
    }
  }

  const discovered = [];
  const seenKeys = new Set();

  // 1. Parse Steam appmanifest_*.acf files & common folders
  for (const saDir of steamAppsDirs) {
    const manifestByInstallDir = {};
    try {
      const files = fs.readdirSync(saDir);
      for (const f of files) {
        if (/^appmanifest_\d+\.acf$/i.test(f)) {
          try {
            const raw = fs.readFileSync(path.join(saDir, f), 'utf8');
            const idMatch = raw.match(/"appid"\s+"(\d+)"/i);
            const nameMatch = raw.match(/"name"\s+"([^"]+)"/i);
            const dirMatch = raw.match(/"installdir"\s+"([^"]+)"/i);
            if (dirMatch) {
              manifestByInstallDir[dirMatch[1].toLowerCase()] = {
                appId: idMatch ? idMatch[1] : '',
                name: nameMatch ? nameMatch[1] : dirMatch[1],
              };
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    const commonDir = path.join(saDir, 'common');
    if (fs.existsSync(commonDir)) {
      try {
        const folders = fs.readdirSync(commonDir, { withFileTypes: true });
        for (const dirent of folders) {
          if (!dirent.isDirectory()) continue;
          const folderName = dirent.name;
          const fullInstallDir = path.join(commonDir, folderName);
          if (isIgnoredGameFolder(folderName, fullInstallDir)) continue;

          const acfInfo = manifestByInstallDir[folderName.toLowerCase()];
          const rawTitle = acfInfo && acfInfo.name ? acfInfo.name : prettifyGameFolderName(folderName);
          const normKey = normalizeGameKey(rawTitle);
          if (!normKey || seenKeys.has(normKey)) continue;

          const known = KNOWN_GAME_TITLES[normKey] || KNOWN_GAME_TITLES[normalizeGameKey(folderName)];
          const displayTitle = known ? known.title : rawTitle;
          const appId = (acfInfo && acfInfo.appId) || (known && known.appId) || '';
          const exePath = findGameExecutable(fullInstallDir, 3);
          if (!exePath || !fs.existsSync(exePath)) {
            // Must have a real existing game executable on disk to be considered installed
            continue;
          }

          seenKeys.add(normKey);
          discovered.push({
            id: normKey,
            name: displayTitle,
            folderName,
            installDir: fullInstallDir,
            exePath,
            appId,
            platform: 'Steam',
          });
        }
      } catch (e) {}
    }
  }

  // 2. Scan Epic Games manifests if present
  const epicManifestsDir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
  if (fs.existsSync(epicManifestsDir)) {
    try {
      const items = fs.readdirSync(epicManifestsDir);
      for (const f of items) {
        if (!f.endsWith('.item')) continue;
        try {
          const data = JSON.parse(fs.readFileSync(path.join(epicManifestsDir, f), 'utf8'));
          if (!data || !data.DisplayName || !data.InstallLocation || !fs.existsSync(data.InstallLocation)) continue;
          if (/unreal engine|epic online services|launcher/i.test(data.DisplayName)) continue;
          const normKey = normalizeGameKey(data.DisplayName);
          if (seenKeys.has(normKey)) continue;

          const exePath = data.LaunchExecutable ? path.join(data.InstallLocation, data.LaunchExecutable) : findGameExecutable(data.InstallLocation, 3);
          if (!exePath || !fs.existsSync(exePath)) continue;

          seenKeys.add(normKey);
          discovered.push({
            id: normKey,
            name: data.DisplayName,
            folderName: path.basename(data.InstallLocation),
            installDir: data.InstallLocation,
            exePath,
            appId: '',
            platform: 'Epic',
          });
        } catch (e) {}
      }
    } catch (e) {}
  }

  // 3. Scan standalone Games folders
  for (const rootDir of standaloneGameRoots) {
    try {
      const folders = fs.readdirSync(rootDir, { withFileTypes: true });
      for (const dirent of folders) {
        if (!dirent.isDirectory()) continue;
        const folderName = dirent.name;
        const fullInstallDir = path.join(rootDir, folderName);
        if (isIgnoredGameFolder(folderName, fullInstallDir)) continue;

        const displayTitle = prettifyGameFolderName(folderName);
        const normKey = normalizeGameKey(displayTitle);
        if (!normKey || seenKeys.has(normKey)) continue;

        const exePath = findGameExecutable(fullInstallDir, 3);
        if (!exePath || !fs.existsSync(exePath)) continue;

        seenKeys.add(normKey);
        discovered.push({
          id: normKey,
          name: displayTitle,
          folderName,
          installDir: fullInstallDir,
          exePath,
          appId: (KNOWN_GAME_TITLES[normKey] && KNOWN_GAME_TITLES[normKey].appId) || '',
          platform: 'PC',
        });
      }
    } catch (e) {}
  }

  discovered.sort((a, b) => a.name.localeCompare(b.name));
  return discovered;
}

ipcMain.handle('jarvis:get-installed-games', async (event, forceRefresh = false) => {
  if (cachedInstalledGames && cachedInstalledGames.length > 0 && !forceRefresh) {
    const valid = cachedInstalledGames.filter((g) => g.exePath && fs.existsSync(g.exePath));
    if (valid.length > 0) return valid;
  }
  cachedInstalledGames = null;

  const rawGames = discoverAllInstalledGamesOnDisk();
  const enriched = await Promise.all(
    rawGames.map(async (game) => {
      const art = await resolveGamePosterFreeAPI(game.name, game.appId);
      return {
        ...game,
        appId: game.appId || art.appId || '',
        poster: art.poster || '',
        fallbackPoster: art.fallbackPoster || '',
        extraFallback: art.extraFallback || '',
      };
    })
  );

  saveGamesPosterCache();
  cachedInstalledGames = enriched;
  return enriched;
});

ipcMain.handle('jarvis:launch-installed-game', async (event, game = {}) => {
  if (!game) return { success: false };
  try {
    if (game.exePath && fs.existsSync(game.exePath)) {
      await shell.openPath(game.exePath);
      return { success: true, method: 'exe' };
    }
    if (game.installDir && fs.existsSync(game.installDir)) {
      const foundExe = findGameExecutable(game.installDir, 3);
      if (foundExe && fs.existsSync(foundExe)) {
        await shell.openPath(foundExe);
        return { success: true, method: 'exe-discovered' };
      }
    }
    if (game.appId) {
      await shell.openExternal(`steam://rungameid/${game.appId}`);
      return { success: true, method: 'steam' };
    }
    if (game.installDir && fs.existsSync(game.installDir)) {
      await shell.openPath(game.installDir);
      return { success: true, method: 'folder' };
    }
    return { success: false, error: 'Executable not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Real Windows GSMTC Media + Wi-Fi SSID + Bluetooth + Audio Output Device
const mediaStatusScript = path.join(__dirname, 'get_media_status.ps1').replace('app.asar', 'app.asar.unpacked');
let cachedLiveMedia = null;
let liveMediaInProgress = false;

// --- HIGH-RES ALBUM ART COVER FETCHER & CACHE (FREE ITUNES SEARCH API) ---
const albumArtCache = new Map();

function cleanMusicSearchTerm(title = '', artist = '') {
  let t = (title || '')
    .replace(/\s*(\(|\[)(official\s*(music\s*)?video|video|audio|lyrics|hd|4k|remastered|hq|feat\..*|ft\..*)(\)|\])/gi, '')
    .replace(/ft\..*|feat\..*/gi, '')
    .trim();
  let a = (artist || '').replace(/ft\..*|feat\..*/gi, '').trim();
  if (a && a !== 'System Media' && a.toLowerCase() !== 'unknown artist') {
    return `${t} ${a}`.trim();
  }
  return t;
}

function fetchAlbumArtCover(title, artist) {
  if (!title) return Promise.resolve('');
  const cacheKey = `${title.toLowerCase()}:::${(artist || '').toLowerCase()}`;
  if (albumArtCache.has(cacheKey)) {
    return Promise.resolve(albumArtCache.get(cacheKey));
  }

  const query = cleanMusicSearchTerm(title, artist);
  if (!query) return Promise.resolve('');

  return new Promise((resolve) => {
    const https = require('https');
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`;
    const req = https.get(url, { timeout: 2200 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.results && parsed.results.length > 0 && parsed.results[0].artworkUrl100) {
            const highRes = parsed.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
            albumArtCache.set(cacheKey, highRes);
            return resolve(highRes);
          }
        } catch (_) {}
        albumArtCache.set(cacheKey, '');
        resolve('');
      });
    });
    req.on('error', () => {
      albumArtCache.set(cacheKey, '');
      resolve('');
    });
    req.on('timeout', () => {
      req.destroy();
      albumArtCache.set(cacheKey, '');
      resolve('');
    });
  });
}

ipcMain.handle('jarvis:get-live-media', async () => {
  if (liveMediaInProgress && cachedLiveMedia) {
    return cachedLiveMedia;
  }
  liveMediaInProgress = true;
  return new Promise((resolve) => {
    exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${mediaStatusScript}"`, { timeout: 4500 }, async (err, stdout) => {
      liveMediaInProgress = false;
      if (err || !stdout) {
        return resolve(cachedLiveMedia || { success: false });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        const media = parsed.media || parsed || {};
        const title = (media.title || parsed.title || '').trim();
        const artist = (media.artist || parsed.artist || '').trim();
        const status = media.status || parsed.status || 'Paused';
        const hasMedia = title.length > 0;
        const isPlaying = status === 'Playing';

        let thumbnail = media.thumbnail || parsed.thumbnail || '';
        if (!thumbnail && hasMedia) {
          const cacheKey = `${title.toLowerCase()}:::${artist.toLowerCase()}`;
          if (albumArtCache.has(cacheKey)) {
            thumbnail = albumArtCache.get(cacheKey) || '';
          } else {
            // Quick wait up to 550ms for cover art, background caching continues if it takes longer
            try {
              thumbnail = await Promise.race([
                fetchAlbumArtCover(title, artist),
                new Promise((r) => setTimeout(() => r(''), 550))
              ]) || '';
            } catch (_) {}
            if (!thumbnail) {
              fetchAlbumArtCover(title, artist).then((art) => {
                if (art && cachedLiveMedia && cachedLiveMedia.title === title) {
                  cachedLiveMedia.thumbnail = art;
                  if (cachedLiveMedia.media) cachedLiveMedia.media.thumbnail = art;
                }
              }).catch(() => {});
            }
          }
        }

        const result = {
          success: true,
          ...parsed,
          title,
          artist,
          status,
          playing: isPlaying,
          hasMedia,
          active: hasMedia,
          position: media.position || parsed.position || 0,
          duration: media.duration || parsed.duration || 0,
          thumbnail,
          media: {
            title,
            artist,
            status,
            position: media.position || parsed.position || 0,
            duration: media.duration || parsed.duration || 0,
            thumbnail
          }
        };

        cachedLiveMedia = result;
        resolve(result);
      } catch (e) {
        resolve(cachedLiveMedia || { success: false });
      }
    });
  });
});

// Real Weather (Open-Meteo + IP Geolocation) & Live News Headlines (Google News RSS)
let cachedTodayData = null;
let cachedTodayTime = 0;

function decodeHtmlEntities(str = '') {
  return str
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function weatherCodeToLabel(code) {
  const map = {
    0: { label: 'Clear Sky', icon: 'fa-cloud-sun' },
    1: { label: 'Mostly Clear', icon: 'fa-cloud-sun' },
    2: { label: 'Partly Cloudy', icon: 'fa-cloud-sun' },
    3: { label: 'Overcast', icon: 'fa-cloud' },
    45: { label: 'Foggy', icon: 'fa-smog' },
    48: { label: 'Rime Fog', icon: 'fa-smog' },
    51: { label: 'Light Drizzle', icon: 'fa-cloud-rain' },
    53: { label: 'Drizzle', icon: 'fa-cloud-rain' },
    55: { label: 'Heavy Drizzle', icon: 'fa-cloud-showers-heavy' },
    61: { label: 'Light Rain', icon: 'fa-cloud-rain' },
    63: { label: 'Moderate Rain', icon: 'fa-cloud-showers-heavy' },
    65: { label: 'Heavy Rain', icon: 'fa-cloud-showers-heavy' },
    71: { label: 'Light Snow', icon: 'fa-snowflake' },
    80: { label: 'Rain Showers', icon: 'fa-cloud-sun-rain' },
    81: { label: 'Heavy Showers', icon: 'fa-cloud-showers-heavy' },
    95: { label: 'Thunderstorm', icon: 'fa-cloud-bolt' },
  };
  return map[code] || { label: 'Partly Cloudy', icon: 'fa-cloud-sun' };
}

ipcMain.handle('jarvis:get-today-data', async () => {
  if (cachedTodayData && Date.now() - cachedTodayTime < 5 * 60 * 1000) {
    return cachedTodayData;
  }
  const result = {
    weather: {
      city: 'Local',
      temp: '--',
      feelsLike: '--',
      humidity: '--',
      wind: '--',
      high: '--',
      low: '--',
      condition: 'Loading...',
      icon: 'fa-cloud-sun',
    },
    news: [],
  };

  try {
    const geo = await fetch('http://ip-api.com/json/').then(r => r.json()).catch(() => ({
      city: 'Guwahati',
      lat: 26.1445,
      lon: 91.7362,
    }));
    const lat = geo.lat || 26.1445;
    const lon = geo.lon || 91.7362;
    const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
    const wData = await fetch(wUrl).then(r => r.json());
    if (wData && wData.current) {
      const wInfo = weatherCodeToLabel(wData.current.weather_code);
      const fmtSun = (isoStr) => {
        if (!isoStr) return '--:--';
        try {
          const d = new Date(isoStr);
          return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } catch (e) {
          return '--:--';
        }
      };
      result.weather = {
        city: geo.city || 'Guwahati',
        temp: Math.round(wData.current.temperature_2m),
        feelsLike: Math.round(wData.current.apparent_temperature),
        humidity: Math.round(wData.current.relative_humidity_2m),
        wind: Math.round(wData.current.wind_speed_10m),
        pressure: wData.current.surface_pressure ? Math.round(wData.current.surface_pressure) : 1012,
        high: wData.daily?.temperature_2m_max?.[0] ? Math.round(wData.daily.temperature_2m_max[0]) : '--',
        low: wData.daily?.temperature_2m_min?.[0] ? Math.round(wData.daily.temperature_2m_min[0]) : '--',
        uv: wData.daily?.uv_index_max?.[0] != null ? Math.round(wData.daily.uv_index_max[0]) : '--',
        sunrise: fmtSun(wData.daily?.sunrise?.[0]),
        sunset: fmtSun(wData.daily?.sunset?.[0]),
        sunriseIso: wData.daily?.sunrise?.[0] || '',
        sunsetIso: wData.daily?.sunset?.[0] || '',
        condition: wInfo.label,
        icon: wInfo.icon,
      };
    }
  } catch (e) {}

  try {
    const rss = await fetch('https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en').then(r => r.text());
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(rss)) !== null && result.news.length < 6) {
      const block = match[1];
      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
      const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      if (titleMatch && linkMatch) {
        let fullTitle = decodeHtmlEntities(titleMatch[1]);
        const src = sourceMatch ? decodeHtmlEntities(sourceMatch[1]) : 'News';
        if (fullTitle.endsWith(' - ' + src)) {
          fullTitle = fullTitle.slice(0, -(' - ' + src).length);
        }
        result.news.push({
          title: fullTitle,
          source: src,
          link: linkMatch[1].trim(),
        });
      }
    }
  } catch (e) {}

  cachedTodayData = result;
  cachedTodayTime = Date.now();
  return result;
});

ipcMain.handle('jarvis:open-settings-page', (event, page) => {
  const pageMap = {
    wifi: 'ms-settings:network-wifi',
    bluetooth: 'ms-settings:bluetooth',
    nightlight: 'ms-settings:nightlight',
    sound: 'ms-settings:sound',
    personalization: 'ms-settings:personalization',
    powersleep: 'ms-settings:powersleep',
  };
  const target = pageMap[page] || 'ms-settings:';
  shell.openExternal(target).catch(() => {});
  return { success: true };
});

function scanWallpapersInDirectory(dirPath, maxFiles = 25) {
  let results = [];
  if (!dirPath || !fs.existsSync(dirPath)) return results;
  try {
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (/^(Screenshots|Feedback|Saved Pictures|Camera Roll|\.)/i.test(entry)) continue;
      const fullPath = path.join(dirPath, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(scanWallpapersInDirectory(fullPath, maxFiles - results.length));
        } else if (/\.(jpg|jpeg|png|webp|bmp)$/i.test(entry) && !/^Screenshot/i.test(entry)) {
          results.push({
            name: entry,
            path: fullPath,
            url: 'file:///' + fullPath.replace(/\\/g, '/'),
          });
        }
      } catch (e) {}
    }
  } catch (e) {}
  return results;
}

ipcMain.handle('jarvis:get-wallpapers', () => {
  let list = [];
  const nitroDir = path.join(os.homedir(), 'OneDrive', 'Pictures', 'Nitro');
  const oneDrivePics = path.join(os.homedir(), 'OneDrive', 'Pictures');
  const picturesDir = path.join(os.homedir(), 'Pictures');
  list = list.concat(scanWallpapersInDirectory(nitroDir, 10));
  list = list.concat(scanWallpapersInDirectory(oneDrivePics, 12));
  list = list.concat(scanWallpapersInDirectory(picturesDir, 12));
  list = list.concat(scanWallpapersInDirectory('C:\\Windows\\Web\\Wallpaper', 25));
  // Deduplicate by file path
  const seen = new Set();
  return list.filter(item => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
});

ipcMain.handle('jarvis:browse-wallpaper', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Select Wallpaper Image',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }],
  });
  if (res.canceled || !res.filePaths.length) return { canceled: true };
  const chosenPath = res.filePaths[0];
  const dir = path.dirname(chosenPath);
  const folderWalls = scanWallpapersInDirectory(dir, 30);
  return {
    canceled: false,
    selected: chosenPath,
    wallpapers: folderWalls.length ? folderWalls : [{
      name: path.basename(chosenPath),
      path: chosenPath,
      url: 'file:///' + chosenPath.replace(/\\/g, '/'),
    }],
  };
});

ipcMain.handle('jarvis:browse-wallpaper-folder', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Select Wallpaper Folder',
    properties: ['openDirectory'],
  });
  if (res.canceled || !res.filePaths.length) return { canceled: true };
  const folderWalls = scanWallpapersInDirectory(res.filePaths[0], 40);
  return {
    canceled: false,
    wallpapers: folderWalls,
  };
});

ipcMain.handle('jarvis:set-wallpaper', async (event, wallpaperPath) => {
  if (!wallpaperPath || !fs.existsSync(wallpaperPath)) {
    return { success: false, error: 'Wallpaper file not found' };
  }
  return await runOsControlScript('set-wallpaper', wallpaperPath);
});

ipcMain.handle('jarvis:media-key', (event, key) => {
  // Windows Virtual Key codes: 0xB3 = Play/Pause, 0xB0 = Next Track, 0xB1 = Prev Track
  let vk = 0xB3;
  if (key === 'next') vk = 0xB0;
  else if (key === 'prev') vk = 0xB1;
  const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class NativeMediaKey {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    public static void Send(byte vk) {
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        keybd_event(vk, 0, 2, UIntPtr.Zero);
    }
}
"@ -ErrorAction SilentlyContinue
[NativeMediaKey]::Send(${vk})
`;
  const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
  exec(`powershell.exe -NoProfile -EncodedCommand ${encoded}`);
  return { success: true };
});

ipcMain.handle('jarvis:slide-control', async (event, action) => {
  return await agentBrain.executeTool('presentation_slide_changer', { action });
});

let handGestureProcess = null;
let handGesturePid = null;

function stopHandGestureDaemon() {
  const proc = handGestureProcess;
  const pid = handGesturePid || (proc ? proc.pid : null);
  handGestureProcess = null;
  handGesturePid = null;

  if (proc) {
    try {
      if (proc.stdin && !proc.stdin.destroyed) {
        proc.stdin.write('stop\n');
        proc.stdin.end();
      }
    } catch (e) {}

    try {
      proc.kill('SIGTERM');
    } catch (e) {}
  }

  if (process.platform === 'win32' && pid) {
    try {
      exec(`taskkill /pid ${pid} /t /f`, () => {});
    } catch (e) {}
  }

  console.log('[Presentation] Python Hand Gesture Daemon stopped and camera freed.');
}

// Bind agentBrain callback directly so voice/chat tools shut down camera with 0 IPC hops
agentBrain.onPresentationToggle = (active, mode = 'presentation') => {
  const isAct = Boolean(active);
  if (isAct) {
    startHandGestureDaemon(mode);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  } else {
    stopHandGestureDaemon();
    if (mainWindow && !mainWindow.isDestroyed()) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth } = primaryDisplay.workAreaSize;
      const winWidth = 660;
      const x = Math.round((screenWidth - winWidth) / 2);
      mainWindow.setPosition(x, 0);
      mainWindow.webContents.send('jarvis:presentation-mode', { active: false, mode });
    }
  }
};

function getPythonExecutable() {
  return getPythonPath();
}

function startHandGestureDaemon(initialMode = 'presentation') {
  stopHandGestureDaemon();

  const daemonPath = resolveScriptPath('hand_gesture_daemon.py');
  if (!fs.existsSync(daemonPath)) {
    console.warn('[Presentation] hand_gesture_daemon.py not found at', daemonPath);
    return;
  }

  try {
    const pythonExe = getPythonExecutable();
    // '-u' is critical: forces unbuffered binary stdout so gestures are delivered with 0ms delay!
    handGestureProcess = spawn(pythonExe, ['-u', daemonPath, '--mode', initialMode], {
      cwd: path.dirname(daemonPath),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' },
    });
    handGesturePid = handGestureProcess.pid;

    handGestureProcess.on('error', (err) => {
      console.warn('[Spatial AI] Python daemon process error:', err?.message);
      handGestureProcess = null;
    });

    if (handGestureProcess.stdin) {
      handGestureProcess.stdin.on('error', (err) => {
        console.warn('[Spatial AI] Python daemon stdin error (ignored):', err?.message);
      });
    }

    let buffer = '';
    handGestureProcess.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const payload = JSON.parse(trimmed);
          if (payload.type === 'action' && payload.action) {
            if (payload.action === 'emergency_lock') {
              console.log('[Spatial AI] 🚨 Emergency Pinky Gesture -> Locking Windows Workstation!');
              stopHandGestureDaemon();
              try {
                const { exec } = require('child_process');
                exec('rundll32.exe user32.dll,LockWorkStation');
              } catch (e) {}
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('jarvis:presentation-mode', { active: false, mode: 'air_cursor' });
              }
            } else if (payload.action === 'stop_air_cursor') {
              console.log('[Spatial AI] ✋ Open Palm Gesture -> Stopping Air Cursor!');
              stopHandGestureDaemon();
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('jarvis:presentation-mode', { active: false, mode: 'air_cursor' });
              }
            } else {
              agentBrain.executeTool('presentation_slide_changer', { action: payload.action }).catch(() => {});
            }
          }
          if (payload.type === 'left_hand_gesture' && payload.fingers) {
            handleLeftHandGesture(payload.fingers, payload);
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('jarvis:presentation-gesture', payload);
          }
        } catch (e) {}
      }
    });

    handGestureProcess.stderr.on('data', (data) => {
      console.warn('[Spatial Hand AI]', data.toString().trim());
    });

    handGestureProcess.on('exit', (code) => {
      console.log('[Spatial AI] Python daemon terminated with exit code:', code);
      handGestureProcess = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('jarvis:presentation-gesture', { type: 'exit', code });
      }
    });

    console.log('[Spatial AI] Python MediaPipe Daemon started with', pythonExe, '(PID:', handGestureProcess.pid, 'Mode:', initialMode, ')');
  } catch (err) {
    console.error('[Spatial AI] Failed to launch Python Hand AI Daemon:', err);
  }
}

ipcMain.on('jarvis:toggle-presentation-mode', (event, active, mode = 'presentation') => {
  const isAct = Boolean(active);
  if (isAct) {
    startHandGestureDaemon(mode);
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth } = primaryDisplay.workAreaSize;
        if (mode === 'air_cursor') {
          // Shrink window to compact HUD pill at top edge so the entire desktop is 100% free for dragging and dropping files
          const hudWidth = 360;
          const hudHeight = 130;
          const hudX = Math.round((screenWidth - hudWidth) / 2);
          mainWindow.setBounds({ x: hudX, y: 0, width: hudWidth, height: hudHeight });
        } else {
          const winWidth = 716;
          const x = Math.round((screenWidth - winWidth) / 2);
          mainWindow.setBounds({ x, y: 0, width: winWidth, height: 580 });
        }
      } catch (e) {}
      showWindow();
    }
  } else {
    stopHandGestureDaemon();
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth } = primaryDisplay.workAreaSize;
        const winWidth = 716;
        const x = Math.round((screenWidth - winWidth) / 2);
        mainWindow.setBounds({ x, y: 0, width: winWidth, height: 580 });
      } catch (e) {}
      showWindow();
    }
  }
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('jarvis:presentation-mode', { active: isAct, mode });
  }
});

ipcMain.on('jarvis:set-gesture-mode', (event, mode) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth } = primaryDisplay.workAreaSize;
      if (mode === 'air_cursor') {
        const hudWidth = 360;
        const hudHeight = 130;
        const hudX = Math.round((screenWidth - hudWidth) / 2);
        mainWindow.setBounds({ x: hudX, y: 0, width: hudWidth, height: hudHeight });
      } else {
        const winWidth = 716;
        const x = Math.round((screenWidth - winWidth) / 2);
        mainWindow.setBounds({ x, y: 0, width: winWidth, height: 580 });
      }
    } catch (e) {}
  }
  if (handGestureProcess && handGestureProcess.stdin && !handGestureProcess.stdin.destroyed) {
    try {
      handGestureProcess.stdin.write(JSON.stringify({ cmd: 'set_mode', mode }) + '\n', (err) => {
        if (err) console.warn('[Spatial AI] set_mode write error (ignored):', err?.message);
      });
    } catch (e) {}
  }
});

ipcMain.handle('jarvis:kill-camera', () => {
  stopHandGestureDaemon();
  return true;
});

ipcMain.handle('jarvis:get-window-position', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [x, y] = mainWindow.getPosition();
    return { x, y };
  }
  return { x: 0, y: 0 };
});

ipcMain.handle('jarvis:set-window-position', (event, { x, y }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setPosition(Math.round(x), Math.round(y));
    return true;
  }
  return false;
});

ipcMain.handle('jarvis:reset-window-position', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const winWidth = 716;
    const x = Math.round((screenWidth - winWidth) / 2);
    const y = 0;
    mainWindow.setPosition(x, y);
    return true;
  }
  return false;
});

ipcMain.handle('jarvis:run-command', async (event, command) => {
  return new Promise((resolve) => {
    exec(command, { timeout: 15000, cwd: os.homedir() }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout || '',
        stderr: stderr || (error ? error.message : ''),
      });
    });
  });
});

ipcMain.handle('jarvis:execute-ai', async (event, prompt, context = {}) => {
  const config = loadConfig();
  return await agentBrain.run(prompt, config, context);
});

ipcMain.handle('jarvis:execute-dual-ai', async (event, prompt, brainA = {}, brainB = {}, context = {}) => {
  const config = loadConfig();
  return await agentBrain.runDual(prompt, { ...config, ...brainA }, { ...config, ...brainB }, context);
});

ipcMain.handle('jarvis:synthesize-consensus', async (event, prompt, replyA, replyB, brainAName, brainBName) => {
  return await agentBrain.synthesizeConsensus(prompt, replyA, replyB, brainAName, brainBName);
});

ipcMain.handle('jarvis:search-web', async (event, query, maxResults = 5) => {
  return await searchWeb(query, maxResults);
});

ipcMain.handle('jarvis:select-file', async () => {
  const { dialog } = require('electron');
  try {
    const parentWin = (dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.isVisible()) ? dashboardWindow : mainWindow;
    const result = await dialog.showOpenDialog(parentWin, {
      title: 'Select File to Share with Grokki',
      properties: ['openFile'],
    });
    if (parentWin && !parentWin.isDestroyed()) {
      parentWin.focus();
    }
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      let size = 0;
      try {
        const stats = fs.statSync(selectedPath);
        size = stats.size;
      } catch (e) {}
      return {
        canceled: false,
        path: selectedPath,
        name: path.basename(selectedPath),
        filePaths: result.filePaths,
        size,
        ext: path.extname(selectedPath).toLowerCase(),
      };
    }
  } catch (err) {
    console.error('File dialog error:', err);
  }
  return { canceled: true };
});

ipcMain.handle('jarvis:save-temp-file', async (event, payload = {}) => {
  try {
    const uploadsDir = path.join(grokkiDataDir, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    let fileBuf = null;
    let fileName = '';

    if (payload.dataUrl) {
      const match = payload.dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
      const b64 = match ? match[1] : payload.dataUrl.split(',')[1];
      fileBuf = Buffer.from(b64, 'base64');
      fileName = `${payload.prefix || 'crop_'}${Date.now()}.png`;
    } else if (payload.buffer) {
      fileBuf = Buffer.from(payload.buffer);
      fileName = path.basename(payload.name || 'file_' + Date.now());
    }

    if (fileBuf) {
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, fileBuf);
      return { success: true, path: filePath };
    }
    return { success: false, error: 'No data provided' };
  } catch (err) {
    console.error('Failed to save temp file:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:connect-google', async () => {
  const googleWorkspace = require('./google_workspace');
  return await googleWorkspace.startAuthFlow((profile) => {
    if (dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.webContents) {
      dashboardWindow.webContents.send('google:connected', profile);
    }
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('google:connected', profile);
    }
  });
});

ipcMain.handle('jarvis:get-google-status', async () => {
  const googleWorkspace = require('./google_workspace');
  await googleWorkspace.ensureValidToken().catch(() => {});
  const connected = googleWorkspace.isConnected();
  let profile = null;
  if (connected) {
    try {
      profile = await googleWorkspace.getUserProfile();
    } catch (e) {}
  }
  return { connected, profile };
});

ipcMain.handle('jarvis:execute-ai-audio', async (event, { base64Audio, mimeType }) => {
  const config = loadConfig();
  return await agentBrain.runAudio(base64Audio, mimeType, config);
});

ipcMain.handle('jarvis:speak', async (event, { text, voice, provider, apiKey, model, endpoint, speed } = {}) => {
  const config = loadConfig();
  if (config.ttsEnabled === false && !provider) return { success: false, disabled: true };
  const activeProvider = provider || config.ttsProvider || 'grokki_voice';
  if (activeProvider === 'elevenlabs') {
    const elKey = (apiKey !== undefined ? apiKey : config.elevenlabsApiKey) || '';
    const elVoice = voice || config.elevenlabsVoiceId || 'JBFqnCBsd6RMkjVDRZzb';
    const elModel = model || config.elevenlabsModel || 'eleven_v3';
    if (elKey.trim()) {
      const elRes = await elevenlabsTTS.synthesize(text, elVoice, elKey.trim(), elModel);
      if (elRes && elRes.success) return elRes;
      if (provider === 'elevenlabs') return elRes;
    } else if (provider === 'elevenlabs') {
      return { success: false, error: 'Please enter your ElevenLabs API key first.' };
    }
  }

  // Primary: Grokki Voice (KittenTTS on-device neural engine)
  const gvVoice = voice || config.grokkiVoiceId || config.ttsVoice || 'expr-voice-2-f';
  try {
    const gvRes = await grokkiVoiceTTS.synthesize(text, {
      voice: gvVoice,
      speed,
    });
    if (gvRes && gvRes.success) return gvRes;
  } catch (err) {
    console.warn('[Main] Grokki Voice synthesis error:', err);
  }

  // Fallback to legacy voicestudio if explicitly requested and available
  if (provider === 'voicestudio') {
    const vsEndpoint = (endpoint !== undefined ? endpoint : config.voiceStudioEndpoint) || 'http://localhost:3900';
    const vsApiKey = (apiKey !== undefined ? apiKey : config.voiceStudioApiKey) || '';
    const vsVoice = voice || config.voiceStudioVoiceId || 'default';
    const vsModel = model || config.voiceStudioModel || 'tts-1';
    const vsRes = await voicestudioTTS.synthesize(text, {
      voice: vsVoice,
      model: vsModel,
      endpoint: vsEndpoint,
      apiKey: vsApiKey,
      speed,
    });
    if (vsRes && vsRes.success) return vsRes;
  }

  return { success: false, cleanText: text, error: 'Grokki Voice synthesis failed' };
});

ipcMain.handle('jarvis:fetch-grokki-voices', async () => {
  return await grokkiVoiceTTS.fetchVoices();
});

ipcMain.handle('jarvis:check-grokki-voice-health', async () => {
  return await grokkiVoiceTTS.checkHealth();
});

ipcMain.handle('jarvis:fetch-voicestudio-voices', async (event, { endpoint, apiKey } = {}) => {
  return await grokkiVoiceTTS.fetchVoices();
});

ipcMain.handle('jarvis:check-voicestudio-health', async (event, { endpoint } = {}) => {
  return await grokkiVoiceTTS.checkHealth();
});

ipcMain.handle('jarvis:check-ollama-status', async (event, customEndpoint) => {
  const endpoint = (customEndpoint || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  let isRunning = false;
  let models = [];
  let detailedModels = [];
  let isInstalled = false;
  let exePath = '';

  // 1. Check if Ollama daemon is actively running and responding at the endpoint
  try {
    const fetch = global.fetch || require('node-fetch');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${endpoint}/api/tags`, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      isRunning = true;
      isInstalled = true;
      const data = await res.json();
      models = (data.models || []).map((m) => m.name || m.model);
      detailedModels = (data.models || []).map((m) => ({
        name: m.name || m.model,
        size: m.size || 0,
        modifiedAt: m.modified_at || '',
        parameterSize: m.details?.parameter_size || '',
        family: m.details?.family || '',
        quantization: m.details?.quantization_level || '',
      }));
    }
  } catch (_) {}

  // 2. If daemon not running, check if Ollama binary is installed on disk
  if (!isInstalled) {
    const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '');
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

    const candidates = [
      localAppData ? path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe') : '',
      localAppData ? path.join(localAppData, 'Programs', 'Ollama', 'ollama app.exe') : '',
      path.join(programFiles, 'Ollama', 'ollama.exe'),
      path.join(programFilesX86, 'Ollama', 'ollama.exe'),
    ];

    for (const c of candidates) {
      if (c && fs.existsSync(c)) {
        isInstalled = true;
        exePath = c;
        break;
      }
    }

    if (!isInstalled && process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const out = execSync('where.exe ollama', { encoding: 'utf8', timeout: 1200, stdio: ['ignore', 'pipe', 'ignore'] });
        if (out && out.trim()) {
          isInstalled = true;
          exePath = out.trim().split(/\r?\n/)[0];
        }
      } catch (_) {}
    }
  }

  return {
    installed: isInstalled,
    running: isRunning,
    models,
    detailedModels,
    exePath,
    endpoint,
  };
});

ipcMain.handle('jarvis:launch-ollama', async () => {
  try {
    const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '');
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';

    const candidates = [
      localAppData ? path.join(localAppData, 'Programs', 'Ollama', 'ollama app.exe') : '',
      localAppData ? path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe') : '',
      path.join(programFiles, 'Ollama', 'ollama.exe'),
    ];

    let exe = candidates.find((c) => c && fs.existsSync(c));
    if (!exe && process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const out = execSync('where.exe ollama', { encoding: 'utf8', timeout: 1200, stdio: ['ignore', 'pipe', 'ignore'] });
        if (out && out.trim()) exe = out.trim().split(/\r?\n/)[0];
      } catch (_) {}
    }

    if (exe && fs.existsSync(exe)) {
      await shell.openPath(exe);
      return { success: true, exePath: exe };
    }
    return { success: false, error: 'Ollama executable not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:pull-ollama-model', async (event, { modelName, endpoint } = {}) => {
  const ep = (endpoint || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const name = (modelName || '').trim();
  if (!name) return { success: false, error: 'Model name is required' };

  try {
    const http = require('http');
    const url = new URL(`${ep}/api/pull`);

    return await new Promise((resolve) => {
      const postData = JSON.stringify({ name, stream: true });
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || 11434,
          path: '/api/pull',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let buffer = '';
          res.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                let percent = 0;
                if (parsed.total && parsed.completed) {
                  percent = Math.round((parsed.completed / parsed.total) * 100);
                }
                event.sender.send('ollama:pull-progress', {
                  modelName: name,
                  status: parsed.status,
                  percent,
                  completed: parsed.completed,
                  total: parsed.total,
                });
              } catch (_) {}
            }
          });

          res.on('end', () => {
            resolve({ success: true, modelName: name });
          });
        }
      );

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.write(postData);
      req.end();
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:delete-ollama-model', async (event, { modelName, endpoint } = {}) => {
  const ep = (endpoint || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const name = (modelName || '').trim();
  if (!name) return { success: false, error: 'Model name is required' };

  try {
    const fetch = global.fetch || require('node-fetch');
    const res = await fetch(`${ep}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { success: true, modelName: name };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:fetch-elevenlabs-voices', async (event, { apiKey, search, pageSize } = {}) => {
  const config = loadConfig();
  const keyToUse = (apiKey !== undefined ? apiKey : config.elevenlabsApiKey) || '';
  return await elevenlabsTTS.fetchVoices({ apiKey: keyToUse, search, pageSize });
});

ipcMain.handle('jarvis:get-config', async () => {
  return loadConfig();
});

ipcMain.handle('jarvis:save-config', async (event, newConfig) => {
  const saved = saveConfig(newConfig);
  if (newConfig.hotkey) {
    registerShortcuts();
  }
  if (wakeWordService) {
    wakeWordService.updateConfig(saved);
  }
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send('config:updated', saved);
  }
  if (dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.webContents) {
    dashboardWindow.webContents.send('config:updated', saved);
  }
  if (topNotchWindow && !topNotchWindow.isDestroyed() && topNotchWindow.webContents) {
    topNotchWindow.webContents.send('config:updated', saved);
  }
  if (pocketGrokkiServer && saved.pillTheme) {
    pocketGrokkiServer.broadcast({ type: 'theme_changed', theme: saved.pillTheme });
  }
  return saved;
});

ipcMain.handle('jarvis:disconnect-google', async () => {
  const googleWorkspace = require('./google_workspace');
  const success = googleWorkspace.disconnect();
  if (dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.webContents) {
    dashboardWindow.webContents.send('google:disconnected');
  }
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send('google:disconnected');
  }
  return { success };
});

ipcMain.handle('jarvis:save-google-credentials', async (event, { clientId, clientSecret }) => {
  const googleWorkspace = require('./google_workspace');
  return googleWorkspace.saveCredentials(clientId, clientSecret);
});

ipcMain.handle('jarvis:has-google-credentials', async () => {
  const googleWorkspace = require('./google_workspace');
  return { hasCredentials: !!googleWorkspace.getClientCredentials() };
});

// Notion Workspace Integration
ipcMain.handle('jarvis:connect-notion', async (event, token) => {
  const notionWorkspace = require('./notion_workspace');
  return await notionWorkspace.connect(token, (profile) => {
    if (dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.webContents) {
      dashboardWindow.webContents.send('notion:connected', profile);
    }
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('notion:connected', profile);
    }
  });
});

ipcMain.handle('jarvis:save-notion-oauth', async (event, { clientId, clientSecret }) => {
  const notionWorkspace = require('./notion_workspace');
  return notionWorkspace.saveCredentials(clientId, clientSecret);
});

ipcMain.handle('jarvis:get-notion-status', async () => {
  const notionWorkspace = require('./notion_workspace');
  const connected = notionWorkspace.isConnected();
  const profile = notionWorkspace.getProfile();
  return { connected, profile };
});

ipcMain.handle('jarvis:disconnect-notion', async () => {
  const notionWorkspace = require('./notion_workspace');
  return notionWorkspace.disconnect();
});

ipcMain.handle('jarvis:open-notion-portal', async () => {
  const notionWorkspace = require('./notion_workspace');
  notionWorkspace.openNotionIntegrationsPortal();
  return { success: true };
});

// Obsidian Workspace Integration
ipcMain.handle('jarvis:select-obsidian-vault', async () => {
  const obsidianWorkspace = require('./obsidian_workspace');
  return await obsidianWorkspace.selectVault(dashboardWindow || mainWindow);
});

ipcMain.handle('jarvis:get-obsidian-status', async () => {
  const obsidianWorkspace = require('./obsidian_workspace');
  return obsidianWorkspace.getStatus();
});

ipcMain.handle('jarvis:disconnect-obsidian', async () => {
  const obsidianWorkspace = require('./obsidian_workspace');
  return obsidianWorkspace.disconnect();
});

ipcMain.handle('jarvis:open-obsidian-vault', async (event, notePath) => {
  const obsidianWorkspace = require('./obsidian_workspace');
  obsidianWorkspace.openVaultInObsidian(notePath);
  return { success: true };
});

// GitHub Workspace & Git CLI Integration
ipcMain.handle('jarvis:connect-github', async (event, token) => {
  const githubWorkspace = require('./github_workspace');
  return await githubWorkspace.connect(token, (profile) => {
    if (dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.webContents) {
      dashboardWindow.webContents.send('github:connected', profile);
    }
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('github:connected', profile);
    }
  });
});

ipcMain.handle('jarvis:save-github-oauth', async (event, { clientId, clientSecret }) => {
  const githubWorkspace = require('./github_workspace');
  return githubWorkspace.saveCredentials(clientId, clientSecret);
});

ipcMain.handle('jarvis:open-github-portal', async () => {
  const githubWorkspace = require('./github_workspace');
  githubWorkspace.openOAuthPortal();
  return { success: true };
});

ipcMain.handle('jarvis:disconnect-github', async () => {
  const githubWorkspace = require('./github_workspace');
  return githubWorkspace.disconnect();
});

ipcMain.handle('jarvis:get-github-status', async () => {
  const githubWorkspace = require('./github_workspace');
  return await githubWorkspace.getStatus();
});

ipcMain.handle('jarvis:restore-default-github-oauth', async () => {
  const githubWorkspace = require('./github_workspace');
  return await githubWorkspace.restoreDefaultOAuth();
});

ipcMain.handle('jarvis:get-github-repos', async (event, options) => {
  const githubWorkspace = require('./github_workspace');
  return await githubWorkspace.getRepos(options);
});

ipcMain.handle('jarvis:git-status', async (event, cwd) => {
  const githubWorkspace = require('./github_workspace');
  return await githubWorkspace.getGitStatus(cwd);
});

ipcMain.handle('jarvis:git-fetch', async (event, cwd) => {
  const githubWorkspace = require('./github_workspace');
  return await githubWorkspace.gitFetch(cwd);
});

ipcMain.handle('jarvis:git-pull', async (event, cwd) => {
  const githubWorkspace = require('./github_workspace');
  return await githubWorkspace.gitPull(cwd);
});

ipcMain.handle('jarvis:git-push', async (event, cwd, options) => {
  const githubWorkspace = require('./github_workspace');
  return await githubWorkspace.gitPush(cwd, options);
});

ipcMain.handle('jarvis:git-commit', async (event, cwd, options) => {
  const githubWorkspace = require('./github_workspace');
  return await githubWorkspace.gitCommit(cwd, options);
});

ipcMain.handle('jarvis:git-clone', async (event, cloneUrl, targetPath) => {
  const githubWorkspace = require('./github_workspace');
  return await githubWorkspace.gitClone(cloneUrl, targetPath);
});

ipcMain.handle('jarvis:git-select-dir', async () => {
  const githubWorkspace = require('./github_workspace');
  return await githubWorkspace.selectDirectory();
});

// OpenWA WhatsApp Gateway Integration
ipcMain.handle('jarvis:get-openwa-status', async (event, forceRefresh) => {
  const openwaWorkspace = require('./openwa_workspace');
  return await openwaWorkspace.getStatus(forceRefresh);
});

ipcMain.handle('jarvis:get-openwa-qr', async (event, forceFresh) => {
  const openwaWorkspace = require('./openwa_workspace');
  return await openwaWorkspace.getQrCode(forceFresh);
});

ipcMain.handle('jarvis:disconnect-openwa', async () => {
  const openwaWorkspace = require('./openwa_workspace');
  return await openwaWorkspace.disconnectSession();
});

ipcMain.handle('jarvis:test-openwa-send', async (event, { to, message }) => {
  const openwaWorkspace = require('./openwa_workspace');
  return await openwaWorkspace.sendWhatsAppMessage({ to, message });
});

ipcMain.handle('jarvis:get-openwa-chats', async (event, limit) => {
  const openwaWorkspace = require('./openwa_workspace');
  return await openwaWorkspace.getRecentChats(limit);
});

ipcMain.handle('jarvis:grokki-smart-reply', async (event, { to, sender, incomingMessage, instruction, useAi }) => {
  try {
    const openwaWorkspace = require('./openwa_workspace');
    const target = to || sender;
    if (!target) {
      return { success: false, error: 'Missing recipient' };
    }

    let finalMessage = (instruction || '').trim();
    const looksLikeInstruction = /^(tell|say|reply|ask|let\s+them\s+know|inform|write)\b/i.test(finalMessage);

    if (useAi || !finalMessage || looksLikeInstruction) {
      const cfg = loadConfig();
      agentBrain.activeConfig = cfg;
      const sysPrompt =
        'You are Grokki drafting a WhatsApp reply on behalf of the user. ' +
        'Output ONLY the exact message text to send to the recipient. ' +
        'Do NOT wrap in quotes, do NOT add explanations or prefixes. Keep it natural, casual, and concise.';
      const usrPrompt = finalMessage
        ? `Incoming message from "${sender || 'Contact'}": "${incomingMessage || ''}"\n\nUser instruction for how to reply: "${finalMessage}"\n\nWrite the exact first-person WhatsApp reply from the user to ${sender || 'them'}:`
        : `Incoming message from "${sender || 'Contact'}": "${incomingMessage || ''}"\n\nWrite a short, natural, friendly first-person WhatsApp reply:`;

      const aiDraft = await agentBrain.generateAcademicLLM(sysPrompt, usrPrompt, 180);
      if (aiDraft && aiDraft.trim()) {
        finalMessage = aiDraft.trim().replace(/^["']|["']$/g, '');
      } else if (!finalMessage) {
        finalMessage = "Hey! I'm a bit tied up right now, will get back to you shortly.";
      }
    }

    const res = await openwaWorkspace.sendWhatsAppMessage({
      to: target,
      message: finalMessage,
    });
    return {
      ...res,
      sentText: finalMessage,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Project / Local Workspace Context (@file & @folder autocomplete)
const workspaceContext = require('./workspace_context');

ipcMain.handle('jarvis:get-workspace-root', async () => {
  return workspaceContext.getWorkspaceRoot();
});

ipcMain.handle('jarvis:set-workspace-root', async (event, folderPath) => {
  return workspaceContext.saveRoot(folderPath);
});

ipcMain.handle('jarvis:select-workspace-folder', async () => {
  return await workspaceContext.selectWorkspaceFolder();
});

ipcMain.handle('jarvis:scan-workspace-files', async (event, options = {}) => {
  return workspaceContext.scanWorkspaceFiles(options);
});

ipcMain.handle('jarvis:read-workspace-item', async (event, itemPath) => {
  return workspaceContext.readWorkspaceItem(itemPath);
});

ipcMain.handle('jarvis:open-workspace-file', async (event, filePathOrName) => {
  return await workspaceContext.openWorkspaceFile(filePathOrName);
});

// Academic / University Portal Integration (Assam Don Bosco University ERP)
const academicPortal = require('./academic_portal');

ipcMain.handle('jarvis:get-academic-status', async () => {
  return academicPortal.getStatus();
});

ipcMain.handle('jarvis:save-academic-credentials', async (event, { university, username, password }) => {
  return academicPortal.saveCredentials(university, username, password);
});

ipcMain.handle('jarvis:sync-academic-portal', async () => {
  try {
    return await academicPortal.sync();
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:disconnect-academic-portal', async () => {
  return academicPortal.unlink();
});

ipcMain.handle('jarvis:get-academic-data', async () => {
  return academicPortal.getCachedData();
});

// --- GROKKI PERSISTENT MEMORY IPC HANDLERS ---
const persistentMemory = require('./persistent_memory');

ipcMain.handle('jarvis:get-all-memories', async (event, filters) => {
  return persistentMemory.getAllMemories(filters);
});

ipcMain.handle('jarvis:get-memory', async (event, id) => {
  return persistentMemory.getMemory(id);
});

ipcMain.handle('jarvis:add-memory', async (event, memoryData) => {
  return persistentMemory.addMemory(memoryData);
});

ipcMain.handle('jarvis:update-memory', async (event, { id, updates }) => {
  return persistentMemory.updateMemory(id, updates);
});

ipcMain.handle('jarvis:delete-memory', async (event, id) => {
  return persistentMemory.deleteMemory(id);
});

ipcMain.handle('jarvis:pin-memory', async (event, { id, pinned }) => {
  return persistentMemory.pinMemory(id, pinned);
});

ipcMain.handle('jarvis:get-all-projects', async () => {
  return persistentMemory.getAllProjects();
});

ipcMain.handle('jarvis:save-project', async (event, projectData) => {
  return persistentMemory.saveProject(projectData);
});

ipcMain.handle('jarvis:delete-project', async (event, projectId) => {
  return persistentMemory.deleteProject(projectId);
});

ipcMain.handle('jarvis:get-memory-stats', async () => {
  return persistentMemory.getStats();
});

ipcMain.handle('jarvis:clear-all-memories', async () => {
  return persistentMemory.clearAllMemories();
});

ipcMain.handle('jarvis:export-memories', async () => {
  return persistentMemory.exportMemories();
});

ipcMain.handle('jarvis:process-memory-now', async (event, payload = {}) => {
  const { userPrompt, assistantReply, context } = payload || {};
  if (userPrompt && assistantReply) {
    await persistentMemory.processConversationTurn(userPrompt, assistantReply, context);
  } else if (agentBrain && agentBrain.memory && Array.isArray(agentBrain.memory.history)) {
    const history = agentBrain.memory.history;
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i].role === 'user' && history[i + 1].role === 'assistant') {
        await persistentMemory.processConversationTurn(history[i].content, history[i + 1].content, context);
      }
    }
  }
  return persistentMemory.getStats();
});

// --- CHAT LOCK AUTHENTICATION HANDLERS ---
const chatLockAuth = require('./chat_lock_auth');

ipcMain.handle('jarvis:verify-windows-auth', async (event, options = {}) => {
  return await chatLockAuth.verifyWindowsAuth(options);
});

ipcMain.handle('jarvis:trigger-bluetooth-passkey', async (event, options = {}) => {
  return await chatLockAuth.triggerBluetoothPasskey({
    ...options,
    parentWindow: dashboardWindow,
  });
});

// Dashboard Studio Controls & Live Tests
ipcMain.on('dashboard:close', () => {
  const config = loadConfig();
  if (config.closeAction === 'quit') {
    isQuitting = true;
    app.quit();
    return;
  }
  if (config.closeAction === 'minimize') {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.minimize();
    }
    return;
  }
  // Default 'tray': hide window to system tray so it remains instant and resident
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.hide();
  }
});

ipcMain.handle('app:open-config-folder', async () => {
  try {
    const dir = path.dirname(configPath);
    await shell.openPath(dir);
    return { success: true, path: dir };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.on('dashboard:minimize', () => {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.minimize();
  }
});

ipcMain.on('dashboard:maximize', () => {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    if (dashboardWindow.isMaximized()) {
      dashboardWindow.unmaximize();
    } else {
      dashboardWindow.maximize();
    }
  }
});

ipcMain.handle('dashboard:is-maximized', async () => {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    return dashboardWindow.isMaximized();
  }
  return false;
});

ipcMain.handle('dashboard:get-system-info', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    totalMemGb: (os.totalmem() / 1e9).toFixed(1),
    freeMemGb: (os.freemem() / 1e9).toFixed(1),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Processor',
    username: os.userInfo()?.username || 'User',
    hostname: os.hostname(),
  };
});

// --- MODEL CONTEXT PROTOCOL (MCP) HANDLERS ---
const mcpManager = require('./mcp_manager');

ipcMain.handle('jarvis:mcp-get-status', async () => {
  return mcpManager.getStatus();
});
ipcMain.handle('jarvis:mcp-start-all', async () => {
  return await mcpManager.startAllEnabled();
});
ipcMain.handle('jarvis:mcp-connect-server', async (event, { serverId, config }) => {
  return await mcpManager.connectServer(serverId, config);
});
ipcMain.handle('jarvis:mcp-disconnect-server', async (event, serverId) => {
  await mcpManager.disconnectServer(serverId);
  return { success: true };
});
ipcMain.handle('jarvis:mcp-get-config', async () => {
  return mcpManager.getConfig();
});
ipcMain.handle('jarvis:mcp-save-config', async (event, config) => {
  return mcpManager.saveConfig(config);
});

// --- LANCEDB VECTOR DATABASE HANDLERS ---
const lanceDbStore = require('./vector_db_lancedb');

ipcMain.handle('jarvis:lancedb-search', async (event, { query, limit = 5 }) => {
  return await lanceDbStore.search(query, limit);
});
ipcMain.handle('jarvis:lancedb-index-folder', async (event, { folderPath, maxFiles = 30 }) => {
  return await lanceDbStore.indexFolder(folderPath, maxFiles);
});
ipcMain.handle('jarvis:lancedb-get-stats', async () => {
  return await lanceDbStore.getStats();
});

// --- MEM0 LONG-TERM MEMORY HANDLERS ---
const mem0Manager = require('./mem0_manager');

ipcMain.handle('jarvis:mem0-get-all', async () => {
  return mem0Manager.getAll();
});
ipcMain.handle('jarvis:mem0-search', async (event, { query, limit = 5 }) => {
  return await mem0Manager.searchMemories(query, limit);
});
ipcMain.handle('jarvis:mem0-add', async (event, { fact }) => {
  return await mem0Manager.extractMemoriesFromTurn(fact, '', null);
});
ipcMain.handle('jarvis:mem0-delete', async (event, id) => {
  return mem0Manager.deleteMemory(id);
});

// --- BROWSER-USE AUTONOMOUS AGENT HANDLERS ---
const browserAgent = require('./browser_agent');

ipcMain.handle('jarvis:browser-agent-run', async (event, { goal }) => {
  return await browserAgent.runGoal(goal, (sys, usr) => agentBrain.generateAcademicLLM(sys, usr, 800));
});
ipcMain.handle('jarvis:browser-agent-cancel', async () => {
  browserAgent.cancel();
  return { success: true };
});

// --- BYTEDANCE UI-TARS VISION DESKTOP AGENT HANDLERS ---
const uiTarsAgent = require('./ui_tars_agent');

ipcMain.handle('jarvis:uitars-run', async (event, { goal }) => {
  return await uiTarsAgent.runTask(goal, (sys, usr, img) => agentBrain.generateVisionLLM(sys, usr, img));
});
ipcMain.handle('jarvis:uitars-cancel', async () => {
  uiTarsAgent.cancel();
  return { success: true };
});

function compareSemver(v1, v2) {
  const clean1 = (v1 || '').replace(/^[^\d]*/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const clean2 = (v2 || '').replace(/^[^\d]*/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(clean1.length, clean2.length);
  for (let i = 0; i < len; i++) {
    const p1 = clean1[i] || 0;
    const p2 = clean2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app:check-for-updates', async () => {
  try {
    const currentVersion = app.getVersion();
    const officialRepo = 'lonewolfFSD/grokki-studio';
    const releasesWebUrl = `https://github.com/${officialRepo}/releases`;

    let latestRelease = null;

    // 1. First try the latest release endpoint with a tight 3.5s timeout
    try {
      const res = await fetch(`https://api.github.com/repos/${officialRepo}/releases/latest`, {
        signal: AbortSignal.timeout(3500),
        headers: {
          'User-Agent': 'Grokki-Studio-Desktop',
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (res.ok) {
        latestRelease = await res.json();
      }
    } catch (e) {}

    // 2. If no "latest" release, try listing all releases (first item)
    if (!latestRelease || !latestRelease.tag_name) {
      try {
        const res = await fetch(`https://api.github.com/repos/${officialRepo}/releases`, {
          signal: AbortSignal.timeout(3500),
          headers: {
            'User-Agent': 'Grokki-Studio-Desktop',
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            latestRelease = list[0];
          }
        }
      } catch (e) {}
    }

    if (!latestRelease || !latestRelease.tag_name) {
      return {
        updateAvailable: false,
        currentVersion,
        repo: officialRepo,
        releasesUrl: releasesWebUrl,
        message: `You're on the latest version (v${currentVersion}).`,
      };
    }

    const latestTag = latestRelease.tag_name;
    const isNewer = compareSemver(latestTag, currentVersion) > 0;

    if (!isNewer) {
      return {
        updateAvailable: false,
        currentVersion,
        latestVersion: latestTag,
        repo: officialRepo,
        releasesUrl: releasesWebUrl,
        message: `You're on the latest version (v${currentVersion}).`,
      };
    }

    // Identify binary asset if attached
    const asset = latestRelease.assets?.find((a) =>
      a.name.endsWith('.exe') || a.name.endsWith('.msi') || a.name.endsWith('.zip')
    ) || latestRelease.assets?.[0];

    const downloadTargetUrl = asset?.browser_download_url || latestRelease.html_url || releasesWebUrl;

    return {
      updateAvailable: true,
      currentVersion,
      latestVersion: latestTag,
      name: latestRelease.name || latestTag,
      releasesUrl: releasesWebUrl,
      downloadUrl: downloadTargetUrl,
      releaseNotes: latestRelease.body || '',
      repo: officialRepo,
    };
  } catch (err) {
    console.error('[Main] check-for-updates error:', err);
    return {
      updateAvailable: false,
      error: err.message,
    };
  }
});

ipcMain.on('app:restart-and-install', (event, data) => {
  try {
    console.log('[Main] Restarting Grokki Studio to apply update...', data);
    if (data?.downloadedPath && fs.existsSync(data.downloadedPath)) {
      if (data.downloadedPath.endsWith('.exe') || data.downloadedPath.endsWith('.msi')) {
        const cp = require('child_process');
        cp.spawn(data.downloadedPath, [], { detached: true, stdio: 'ignore' }).unref();
        app.exit(0);
        return;
      }
    }
    app.relaunch();
    app.exit(0);
  } catch (err) {
    console.error('[Main] Failed to relaunch app:', err);
    app.relaunch();
    app.exit(0);
  }
});

ipcMain.handle('dashboard:test-ai-key', async (event, { provider, key, model, endpoint }) => {
  const startTime = Date.now();
  try {
    if (provider === 'gemini') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'API key is empty.' };
      const ai = new GoogleGenAI({ apiKey });
      const res = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: 'Hello! Respond with ONLY "READY".',
      });
      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs, reply: res.text ? res.text.trim() : 'READY' };
    }

    if (provider === 'groq') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'Groq API key is empty.' };
      const fetch = global.fetch || require('node-fetch');
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Respond with ONLY "READY".' }],
          max_tokens: 10,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Groq error (${res.status}): ${errText}` };
      }
      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs, reply: data.choices?.[0]?.message?.content?.trim() || 'READY' };
    }

    if (provider === 'ollama') {
      const ep = (endpoint || 'http://127.0.0.1:11434').replace(/\/$/, '');
      const fetch = global.fetch || require('node-fetch');
      const res = await fetch(`${ep}/api/tags`, { method: 'GET' });
      if (!res.ok) return { success: false, error: `Ollama error HTTP ${res.status}` };
      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      const count = (data.models || []).length;
      return { success: true, latencyMs, reply: `Connected (${count} models found)` };
    }

    if (provider === 'openrouter') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'OpenRouter API key is empty.' };
      const fetch = global.fetch || require('node-fetch');
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) return { success: false, error: `OpenRouter key invalid (${res.status})` };
      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs, reply: data.data?.label ? `Verified (${data.data.label})` : 'Verified' };
    }

    if (provider === 'openai') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'OpenAI API key is empty.' };
      const fetch = global.fetch || require('node-fetch');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Respond with ONLY "READY".' }],
          max_tokens: 10,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `OpenAI error (${res.status}): ${errText.slice(0, 150)}` };
      }
      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs, reply: data.choices?.[0]?.message?.content?.trim() || 'READY' };
    }

    if (provider === 'grok') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'xAI Grok API key is empty.' };
      const fetch = global.fetch || require('node-fetch');
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'grok-2-1212',
          messages: [{ role: 'user', content: 'Respond with ONLY "READY".' }],
          max_tokens: 10,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `xAI Grok error (${res.status}): ${errText.slice(0, 150)}` };
      }
      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs, reply: data.choices?.[0]?.message?.content?.trim() || 'READY' };
    }

    if (provider === 'deepseek') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'DeepSeek API key is empty.' };
      const fetch = global.fetch || require('node-fetch');
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'deepseek-chat',
          messages: [{ role: 'user', content: 'Respond with ONLY "READY".' }],
          max_tokens: 10,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `DeepSeek error (${res.status}): ${errText.slice(0, 150)}` };
      }
      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs, reply: data.choices?.[0]?.message?.content?.trim() || 'READY' };
    }

    if (provider === 'qwen') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'Qwen API key is empty.' };
      const fetch = global.fetch || require('node-fetch');
      const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'qwen-plus',
          messages: [{ role: 'user', content: 'Respond with ONLY "READY".' }],
          max_tokens: 10,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Qwen error (${res.status}): ${errText.slice(0, 150)}` };
      }
      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs, reply: data.choices?.[0]?.message?.content?.trim() || 'READY' };
    }

    if (provider === 'omniroute' || provider === 'omnirouter') {
      const ep = (endpoint || 'http://localhost:20128/v1').replace(/\/+$/, '');
      const apiKey = (key || '').trim();
      const fetch = global.fetch || require('node-fetch');
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const res = await fetch(`${ep}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || 'auto',
          messages: [{ role: 'user', content: 'Respond with ONLY "READY".' }],
          max_tokens: 10,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `OmniRoute error (${res.status}): ${errText.slice(0, 150)}` };
      }
      const data = await res.json();
      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs, reply: data.choices?.[0]?.message?.content?.trim() || 'READY' };
    }

    return { success: false, error: `Unknown provider: ${provider}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('dashboard:fetch-provider-models', async (event, { provider, key, endpoint }) => {
  try {
    const fetch = global.fetch || require('node-fetch');
    if (provider === 'gemini') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'Gemini API key is required.' };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models = (data.models || [])
        .map(m => (m.name || '').replace(/^models\//, ''))
        .filter(name => name.startsWith('gemini-') && !name.includes('embedding') && !name.includes('aqa') && !name.includes('imagen'));
      return { success: true, models };
    }

    if (provider === 'groq') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'Groq API key is required.' };
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models = (data.data || []).map(m => m.id);
      return { success: true, models };
    }

    if (provider === 'ollama') {
      const ep = (endpoint || 'http://127.0.0.1:11434').replace(/\/$/, '');
      const res = await fetch(`${ep}/api/tags`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models = (data.models || []).map(m => m.name || m.model);
      return { success: true, models };
    }

    if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawList = (data.data || []).map(m => m.id);
      const autoSet = new Set(['openrouter/auto', 'openrouter/auto-beta']);
      const autoList = ['openrouter/auto', 'openrouter/auto-beta'];
      const rest = rawList.filter(id => !autoSet.has(id));
      const allModels = [...autoList, ...rest];
      return { success: true, models: allModels };
    }

    if (provider === 'openai') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'OpenAI API key is required.' };
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models = (data.data || [])
        .map(m => m.id)
        .filter(id => id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('chatgpt-'));
      return { success: true, models };
    }

    if (provider === 'grok') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'xAI Grok API key is required.' };
      const res = await fetch('https://api.x.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models = (data.data || []).map(m => m.id);
      return { success: true, models };
    }

    if (provider === 'deepseek') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'DeepSeek API key is required.' };
      const res = await fetch('https://api.deepseek.com/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models = (data.data || []).map(m => m.id);
      return { success: true, models };
    }

    if (provider === 'qwen') {
      const apiKey = (key || '').trim();
      if (!apiKey) return { success: false, error: 'Qwen API key is required.' };
      const res = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models = (data.data || []).map(m => m.id);
      return { success: true, models };
    }

    if (provider === 'omniroute' || provider === 'omnirouter') {
      const ep = (endpoint || 'http://localhost:20128/v1').replace(/\/+$/, '');
      const apiKey = (key || '').trim();
      const headers = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const res = await fetch(`${ep}/models`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let models = [];
      if (Array.isArray(data.data)) {
        models = data.data.map(m => (typeof m === 'string' ? m : (m.id || m.name || m.model)));
      } else if (Array.isArray(data.models)) {
        models = data.models.map(m => (typeof m === 'string' ? m : (m.id || m.name || m.model)));
      } else if (Array.isArray(data)) {
        models = data.map(m => (typeof m === 'string' ? m : (m.id || m.name || m.model)));
      }
      models = models.filter(Boolean);
      return { success: true, models };
    }

    return { success: false, error: `Unknown provider: ${provider}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:cancel-task', () => {
  let cancelled = false;
  if (agentBrain && typeof agentBrain.cancelCurrentTask === 'function') {
    cancelled = agentBrain.cancelCurrentTask() || cancelled;
  }
  try {
    const browserAgent = require('./browser_agent');
    if (browserAgent && typeof browserAgent.cancel === 'function') {
      browserAgent.cancel();
      cancelled = true;
    }
  } catch (_) {}
  try {
    const uiTarsAgent = require('./ui_tars_agent');
    if (uiTarsAgent && typeof uiTarsAgent.cancel === 'function') {
      uiTarsAgent.cancel();
      cancelled = true;
    }
  } catch (_) {}
  return cancelled;
});

ipcMain.handle('jarvis:toggle-window', () => {
  toggleWindow();
  return true;
});

ipcMain.on('jarvis:set-mode', (event, mode) => {
  // Mode changed in renderer (typing <-> voice)
  // Ensure wake word service remains active if enabled
  if (wakeWordService && !wakeWordService.isListening) {
    const config = loadConfig();
    if (config.wakeWordEnabled !== false) {
      wakeWordService.resume();
    }
  }
});

ipcMain.on('jarvis:recording-state', (event, isRecording) => {
  // Pause background wake detector only while Chromium microphone recording is actively happening
  if (wakeWordService) {
    if (isRecording) {
      wakeWordService.pause();
    } else {
      wakeWordService.resume();
    }
  }
});

ipcMain.on('jarvis:hide', () => {
  hideWindow();
  if (wakeWordService) {
    wakeWordService.resume();
  }
});

ipcMain.on('jarvis:show-window', () => {
  showWindow();
});

// Pocket Grokki (Zero-Install Mobile LAN Bridge)
ipcMain.handle('jarvis:get-pocket-status', async () => {
  if (!pocketGrokkiServer) return { active: false };
  return pocketGrokkiServer.getStatus();
});

ipcMain.handle('jarvis:toggle-pocket-server', async (event, enable) => {
  if (!pocketGrokkiServer) {
    pocketGrokkiServer = new PocketGrokkiServer({ agentBrain, mainWindow, loadConfig });
  }
  if (enable) {
    return await pocketGrokkiServer.start();
  } else {
    pocketGrokkiServer.stop();
    return pocketGrokkiServer.getStatus();
  }
});

// Tamagotchi Dimension Hop
ipcMain.handle('jarvis:hop-grokki-to-phone', async () => {
  if (pocketGrokkiServer) {
    return pocketGrokkiServer.hopToPhone();
  }
  return false;
});

ipcMain.handle('jarvis:hop-grokki-to-pc', async () => {
  if (pocketGrokkiServer) {
    return pocketGrokkiServer.hopToPc();
  }
  return false;
});

ipcMain.handle('jarvis:beam-file-to-phone', async (event, filePath) => {
  if (pocketGrokkiServer) {
    return pocketGrokkiServer.beamFileToPhone(filePath);
  }
  return false;
});

// App Lifecycle
app.whenReady().then(() => {
  // Grant microphone and media permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => true);
  if (session.defaultSession.setDevicePermissionHandler) {
    session.defaultSession.setDevicePermissionHandler(() => true);
  }

  const config = loadConfig();
  createWindow(!!config.showIslandOnStartup);
  createTopNotchWindow();
  createTray();
  registerShortcuts();

  // Auto-connect WhatsApp background listener if authenticated
  try {
    const openwaWorkspace = require('./openwa_workspace');
    if (openwaWorkspace && openwaWorkspace.hasLocalAuth()) {
      openwaWorkspace.startLocalEngine().catch((err) => {
        console.warn('[Main] OpenWA auto-connect error:', err?.message || err);
      });
    }
  } catch (err) {
    console.warn('[Main] OpenWA startup load error:', err?.message || err);
  }

  // Initialize LanceDB Embedded Vector Store & MCP Servers
  try {
    lanceDbStore.init().catch((err) => console.warn('[Main] LanceDB startup error:', err?.message || err));
    mcpManager.startAllEnabled().catch((err) => console.warn('[Main] MCP startup error:', err?.message || err));
  } catch (err) {
    console.warn('[Main] LanceDB/MCP startup error:', err?.message || err);
  }

  // Initialize Pocket Grokki (Zero-Install Mobile LAN Bridge)
  try {
    pocketGrokkiServer = new PocketGrokkiServer({
      agentBrain,
      mainWindow,
      loadConfig
    });
    pocketGrokkiServer.start().catch((err) => {
      console.warn('[Main] Pocket Grokki startup error:', err?.message || err);
    });
  } catch (err) {
    console.warn('[Main] Could not initialize Pocket Grokki:', err?.message || err);
  }

  // If opening Grokki Studio directly (not auto-started on Windows boot):
  const isAutostart = process.argv.includes('--autostart') || process.argv.includes('--hidden') || process.argv.includes('--background');
  if (!isAutostart || config.autoOpenStudioOnStartup) {
    openDashboardWindow(true);
  }

  // Initialize free background Wake Word listener
  wakeWordService = new WakeWordService({
    apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
    wakeWord: config.wakeWord || 'Hey Grokki',
    enabled: config.wakeWordEnabled !== false,
    onWakeWord: (command) => {
      console.log(`[Main] Wake word triggered! Command: "${command || ''}" - Summoning Grokki...`);
      showWindow();
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
        mainWindow.webContents.send('wake-word-detected', { command: command || '' });
      }
    },
  });
  if (config.wakeWordEnabled !== false) {
    wakeWordService.start();
  }

  // Grokki Voice (KittenTTS) engine warm-up guard
  (async () => {
    try {
      await grokkiVoiceTTS.ensureWorker();
      console.log('[Main] Grokki Voice neural worker initialized and ready.');
    } catch (e) {
      console.warn('[Main] Error during Grokki Voice startup:', e.message);
    }
  })();

  // Background Reminder & Timed OS Action trigger
  agentBrain.onReminderTriggered = (data) => {
    console.log('[Main] Background reminder triggered:', data);
    showWindow();
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('jarvis:reminder-fired', data);
    }
  };

  agentBrain.openCircleOverlay = openCircleOverlay;
  agentBrain.startVoiceDictation = startVoiceDictation;

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showWindow();
    }
  });
});

app.on('will-quit', () => {
  stopDragWatcher();
  stopVolumeDaemon();
  stopHandGestureDaemon();
  if (pocketGrokkiServer) {
    pocketGrokkiServer.stop();
  }
  if (wakeWordService) {
    wakeWordService.stop();
  }
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Keep running in tray on Windows
  if (process.platform !== 'win32') {
    app.quit();
  }
});
