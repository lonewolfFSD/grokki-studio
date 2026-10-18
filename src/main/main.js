const { app, BrowserWindow, globalShortcut, ipcMain, shell, Tray, Menu, screen, nativeImage, desktopCapturer, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, spawn } = require('child_process');
const { GoogleGenAI } = require('@google/genai');
const agentBrain = require('./agent_brain');
const kokoroTTS = require('./kokoro_tts');
require('dotenv').config();

app.commandLine.appendSwitch('disable-gpu-cache');

// Enforce single instance so Alt+Q hotkey is never hijacked by duplicate processes
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main] Another instance of Grokki is already running. Exiting duplicate process.');
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    showWindow();
  }
});

const grokkiDataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(grokkiDataDir)) {
  try { fs.mkdirSync(grokkiDataDir, { recursive: true }); } catch (e) {}
}
app.setPath('userData', grokkiDataDir);

const { WakeWordService } = require('./wake_word');

let mainWindow = null;
let dashboardWindow = null;
let splashWindow = null;
let tray = null;
let isQuitting = false;
let isVisible = true;
let hideTimeout = null;
let wakeWordService = null;

// Config file in userData
const configPath = path.join(grokkiDataDir, 'jarvis-config.json');

function loadConfig() {
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  const envGroqKey = (process.env.GROQ_API_KEY || '').trim();
  const envOpenRouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!data.provider) data.provider = 'gemini';
      if (!data.geminiApiKey && envKey) data.geminiApiKey = envKey;
      if (!data.geminiModel) data.geminiModel = 'gemini-2.5-flash';
      if (!data.groqApiKey && envGroqKey) data.groqApiKey = envGroqKey;
      if (!data.groqModel) data.groqModel = 'openai/gpt-oss-120b';
      if (!data.ollamaEndpoint) data.ollamaEndpoint = 'http://127.0.0.1:11434';
      if (!data.ollamaModel) data.ollamaModel = 'llama3.2';
      if (!data.openrouterApiKey && envOpenRouterKey) data.openrouterApiKey = envOpenRouterKey;
      if (!data.openrouterModel) data.openrouterModel = 'meta-llama/llama-3.3-70b-instruct:free';
      if (!data.pillTheme) data.pillTheme = 'original';
      if (!data.wakeWord) data.wakeWord = 'Hey Grokki';
      if (data.wakeWordEnabled === undefined) data.wakeWordEnabled = true;
      if (!data.musicProvider) data.musicProvider = 'ytmusic';
      if (!data.ttsVoice) data.ttsVoice = 'af_bella';
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
      return data;
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
  return {
    provider: 'gemini',
    geminiApiKey: envKey,
    geminiModel: 'gemini-2.5-flash',
    groqApiKey: envGroqKey,
    groqModel: 'openai/gpt-oss-120b',
    ollamaEndpoint: 'http://127.0.0.1:11434',
    ollamaModel: 'llama3.2',
    openrouterApiKey: envOpenRouterKey,
    openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
    wakeWord: 'Hey Grokki',
    hotkey: 'Alt+Q',
    voiceEnabled: true,
    ttsEnabled: true,
    ttsVoice: 'af_bella',
    pillTheme: 'original',
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
  };
}

function saveConfig(newConfig) {
  try {
    const current = loadConfig();
    const updated = { ...current, ...newConfig };
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

    // Dynamic live window adjustments
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      if (newConfig.alwaysOnTop !== undefined) {
        dashboardWindow.setAlwaysOnTop(!!newConfig.alwaysOnTop);
      }
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

    return updated;
  } catch (err) {
    console.error('Failed to save config:', err);
    return null;
  }
}

function createWindow(showOnReady = false) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const winWidth = 660;
  const winHeight = 580;
  const x = Math.round((screenWidth - winWidth) / 2);
  const y = 0;

  const icoPath = path.join(__dirname, '../../assets/grokki_icon.ico');
  const pngPath = path.join(__dirname, '../../assets/grokki_icon.png');
  const appIconPath = (process.platform === 'win32' && fs.existsSync(icoPath)) ? icoPath : pngPath;

  mainWindow = new BrowserWindow({
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    width: winWidth,
    height: winHeight,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    vibrancy: 'appearance-based',
    visualEffectState: 'followWindow',
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

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

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

function showWindow() {
  if (!mainWindow) return;
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  isVisible = true;
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
  if (wakeWordService) {
    wakeWordService.resume();
  }
  mainWindow.webContents.send('window:state-changed', { visible: false });
  // Allow slide-up animation to play in renderer before hiding
  hideTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !isVisible) {
      mainWindow.hide();
    }
    hideTimeout = null;
  }, 280);
}

function handleGlobalHotkey() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow(true);
    return;
  }

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

function createSplashWindow(onFinish) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.focus();
    return;
  }

  const studioIcoPath = path.join(__dirname, '../../assets/grokki_studio_icon.ico');
  const studioPngPath = path.join(__dirname, '../../assets/grokki_studio_tray.png');
  const appIconPath = fs.existsSync(studioIcoPath) ? studioIcoPath : (fs.existsSync(studioPngPath) ? studioPngPath : undefined);

  splashWindow = new BrowserWindow({
    width: 540,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    show: false,
    icon: appIconPath,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, '../renderer/splash.html'));

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

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
      dashboardWindow.show();
      dashboardWindow.focus();
    }
    return;
  }

  const studioIcoPath = path.join(__dirname, '../../assets/grokki_studio_icon.ico');
  const studioPngPath = path.join(__dirname, '../../assets/grokki_studio_tray.png');
  const appIconPath = fs.existsSync(studioIcoPath) ? studioIcoPath : (fs.existsSync(studioPngPath) ? studioPngPath : undefined);

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
    backgroundColor: isLight ? '#f7f7fa' : '#0c0d12',
    icon: appIconPath,
    show: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  dashboardWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:)/i.test(url)) {
      shell.openExternal(url);
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
    const http = require('http');
    const req = http.get('http://127.0.0.1:5173/dashboard.html', (res) => {
      if (res.statusCode === 200) {
        dashboardWindow.loadURL('http://127.0.0.1:5173/dashboard.html');
      } else {
        dashboardWindow.loadFile(distDashboard);
      }
    });
    req.on('error', () => {
      dashboardWindow.loadFile(distDashboard);
    });
    req.setTimeout(400, () => {
      req.destroy();
    });
  }

  dashboardWindow.once('ready-to-show', () => {
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
  });
}

function createTray() {
  const studioPngPath = path.join(__dirname, '../../assets/grokki_studio_tray.png');
  const studioIcoPath = path.join(__dirname, '../../assets/grokki_studio_icon.ico');
  const trayPngPath = path.join(__dirname, '../../assets/grokki_tray.png');
  const icoPath = path.join(__dirname, '../../assets/grokki_icon.ico');
  let icon;
  if (fs.existsSync(studioPngPath)) {
    icon = nativeImage.createFromPath(studioPngPath);
  } else if (fs.existsSync(studioIcoPath)) {
    icon = nativeImage.createFromPath(studioIcoPath);
  } else if (fs.existsSync(trayPngPath)) {
    icon = nativeImage.createFromPath(trayPngPath);
  } else if (fs.existsSync(icoPath)) {
    icon = nativeImage.createFromPath(icoPath);
  } else {
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

  console.log(`[Main] Global hotkey [${shortcut}] active: ${registered}`);
}

// Desktop Automation Tool Handlers
ipcMain.handle('jarvis:open-app', async (event, appName) => {
  const lower = (appName || '').trim().toLowerCase();
  
  if (!lower || lower.length < 2 || ['hi', 'hello', 'hey', 'grokki', 'grokbot', 'jarvis', 'what', 'who', 'how', 'why', 'ok', 'yes', 'no'].includes(lower)) {
    return { success: false, error: `"${appName}" is not an application.` };
  }
  
  // App mapping dictionary for Windows
  const appMap = {
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
    const psCmd = `powershell -Command "Start-Process '${target}'"`;
    exec(psCmd, (err) => {
      if (err) {
        // Try direct command execution fallback
        exec(`start "" "${target}"`, (err2) => {
          if (err2) {
            resolve({ success: false, error: `Could not launch ${appName}: ${err2.message}` });
          } else {
            resolve({ success: true, message: `Opened ${appName}` });
          }
        });
      } else {
        resolve({ success: true, message: `Opened ${appName}` });
      }
    });
  });
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

ipcMain.handle('jarvis:open-url', async (event, url) => {
  let targetUrl = url;
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }
  try {
    await shell.openExternal(targetUrl);
    return { success: true, message: `Opened ${targetUrl}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:type-text', async (event, text) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'os_input.ps1');
    const safeText = String(text || '').replace(/'/g, "''");
    exec(`powershell.exe -NoProfile -File "${scriptPath}" -action type -text '${safeText}'`, (err, stdout, stderr) => {
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
    const scriptPath = path.join(__dirname, 'os_input.ps1');
    exec(`powershell.exe -NoProfile -File "${scriptPath}" -action click -x ${Math.round(x)} -y ${Math.round(y)}`, (err, stdout, stderr) => {
      resolve({ success: !err, message: (stdout || stderr || '').trim() });
    });
  });
});

ipcMain.handle('jarvis:mouse-double-click', async (event, { x, y }) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'os_input.ps1');
    exec(`powershell.exe -NoProfile -File "${scriptPath}" -action doubleclick -x ${Math.round(x)} -y ${Math.round(y)}`, (err, stdout, stderr) => {
      resolve({ success: !err, message: (stdout || stderr || '').trim() });
    });
  });
});

ipcMain.handle('jarvis:mouse-right-click', async (event, { x, y }) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'os_input.ps1');
    exec(`powershell.exe -NoProfile -File "${scriptPath}" -action rightclick -x ${Math.round(x)} -y ${Math.round(y)}`, (err, stdout, stderr) => {
      resolve({ success: !err, message: (stdout || stderr || '').trim() });
    });
  });
});

ipcMain.handle('jarvis:mouse-move', async (event, { x, y }) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'os_input.ps1');
    exec(`powershell.exe -NoProfile -File "${scriptPath}" -action move -x ${Math.round(x)} -y ${Math.round(y)}`, (err, stdout, stderr) => {
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
    const scriptPath = path.join(__dirname, 'os_input.ps1');
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

    exec(`powershell.exe -NoProfile -File "${scriptPath}" ${psArgs}`, (err, stdout, stderr) => {
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

ipcMain.handle('jarvis:slide-control', async (event, action) => {
  return await agentBrain.executeTool('presentation_slide_changer', { action });
});

ipcMain.on('jarvis:toggle-presentation-mode', (event, active) => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('jarvis:presentation-mode', { active: Boolean(active) });
  }
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

ipcMain.handle('jarvis:save-temp-file', async (event, { name, buffer }) => {
  try {
    const uploadsDir = path.join(grokkiDataDir, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const cleanName = path.basename(name || 'file_' + Date.now());
    const filePath = path.join(uploadsDir, cleanName);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, path: filePath };
  } catch (err) {
    console.error('Failed to save temp file:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:connect-google', async () => {
  const googleWorkspace = require('./google_workspace');
  return await googleWorkspace.startAuthFlow();
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

ipcMain.handle('jarvis:speak', async (event, { text, voice }) => {
  const config = loadConfig();
  if (config.ttsEnabled === false) return { success: false, disabled: true };
  const voiceToUse = voice || config.ttsVoice || 'af_bella';
  return await kokoroTTS.synthesize(text, voiceToUse);
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
  return saved;
});

ipcMain.handle('jarvis:disconnect-google', async () => {
  const googleWorkspace = require('./google_workspace');
  const success = googleWorkspace.disconnect();
  return { success };
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

ipcMain.handle('app:check-for-updates', async () => {
  try {
    const currentVersion = '2.5.0';
    const officialRepo = 'lonewolfFSD/grokki-studio';
    const releasesWebUrl = `https://github.com/${officialRepo}/releases`;

    let latestRelease = null;

    // 1. First try the latest release endpoint
    try {
      const res = await fetch(`https://api.github.com/repos/${officialRepo}/releases/latest`, {
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

    // 3. Fallback: check git tags if releases not yet created
    if (!latestRelease || !latestRelease.tag_name) {
      try {
        const res = await fetch(`https://api.github.com/repos/${officialRepo}/tags`, {
          headers: {
            'User-Agent': 'Grokki-Studio-Desktop',
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        if (res.ok) {
          const tags = await res.json();
          if (Array.isArray(tags) && tags.length > 0) {
            latestRelease = {
              tag_name: tags[0].name,
              name: tags[0].name,
              html_url: releasesWebUrl,
              zipball_url: tags[0].zipball_url,
              body: 'New version pushed to repository.',
            };
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
        message: `Up to date (v${currentVersion}). No newer releases on GitHub.`,
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

    let downloadedPath = null;
    const downloadTargetUrl = asset?.browser_download_url || latestRelease.zipball_url;

    if (downloadTargetUrl) {
      try {
        const updatesDir = path.join(app.getPath('userData'), 'updates');
        if (!fs.existsSync(updatesDir)) {
          fs.mkdirSync(updatesDir, { recursive: true });
        }
        const fileName = asset?.name || `grokki-update-${latestTag}.zip`;
        const filePath = path.join(updatesDir, fileName);
        const fileRes = await fetch(downloadTargetUrl, {
          headers: { 'User-Agent': 'Grokki-Studio-Desktop' },
        });
        if (fileRes.ok) {
          const buffer = Buffer.from(await fileRes.arrayBuffer());
          fs.writeFileSync(filePath, buffer);
          downloadedPath = filePath;
        }
      } catch (e) {
        console.warn('[Main] Release asset auto-download notice:', e.message);
      }
    }

    return {
      updateAvailable: true,
      currentVersion,
      latestVersion: latestTag,
      name: latestRelease.name || latestTag,
      releasesUrl: releasesWebUrl,
      downloadUrl: asset?.browser_download_url || latestRelease.html_url || releasesWebUrl,
      downloadedPath,
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

    return { success: false, error: `Unknown provider: ${provider}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('jarvis:cancel-task', () => {
  if (agentBrain && typeof agentBrain.cancelCurrentTask === 'function') {
    return agentBrain.cancelCurrentTask();
  }
  return false;
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
  createTray();
  registerShortcuts();

  // If opening Grokki Studio directly (not auto-started on Windows boot):
  const isAutostart = process.argv.includes('--autostart') || process.argv.includes('--hidden') || process.argv.includes('--background');
  if (!isAutostart) {
    if (config.showSplashScreen !== false) {
      // Show ONLY the startup splash window first.
      // Grokki Studio dashboard window is strictly created and launched AFTER splash finishes.
      createSplashWindow(() => {
        openDashboardWindow(true);
      });
    } else {
      openDashboardWindow(true);
    }
  } else if (config.autoOpenStudioOnStartup) {
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

  // Pre-warm Kokoro-82M voice model in memory so first voice reply is instant
  if (config.ttsEnabled !== false && kokoroTTS && typeof kokoroTTS.getTTS === 'function') {
    kokoroTTS.getTTS().catch((e) => console.warn('[Main] Kokoro pre-warm warning:', e.message));
  }

  // Background Reminder & Timed OS Action trigger
  agentBrain.onReminderTriggered = (data) => {
    console.log('[Main] Background reminder triggered:', data);
    showWindow();
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
      mainWindow.webContents.send('jarvis:reminder-fired', data);
    }
  };

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showWindow();
    }
  });
});

app.on('will-quit', () => {
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
