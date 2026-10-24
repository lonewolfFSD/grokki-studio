/**
 * Grokki Studio Controller
 * ElevenLabs-Inspired Minimalist SaaS UI
 */

document.addEventListener('DOMContentLoaded', async () => {
  const api = window.jarvisAPI;
  if (!api) {
    console.error('jarvisAPI not found in dashboard');
    return;
  }

  // State
  let currentConfig = {};
  let currentThemeMode = 'light';
  let selectedTone = 'companion';
  let selectedVoice = 'af_bella';
  let selectedProvider = 'gemini';
  let selectedIslandTheme = 'glass';
  let activeAudio = null;
  let isTestingVoice = false;
  let hasUnsavedChanges = false;
  let googleProfile = null;

  // Window Controls
  const btnTrafficClose = document.getElementById('btnTrafficClose');
  const btnTrafficMin = document.getElementById('btnTrafficMin');
  const topBarTitle = document.getElementById('topBarTitle');

  // Floating Unsaved Bar (Discord-Style)
  const unsavedChangesBar = document.getElementById('unsavedChangesBar');
  const btnResetChanges = document.getElementById('btnResetChanges');
  const btnSaveFloating = document.getElementById('btnSaveFloating');

  // Theme Toggle Button
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const themeToggleIcon = document.getElementById('themeToggleIcon');

  // Navigation
  const navBtns = document.querySelectorAll('.nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // Sidebar Elements
  const sidebarUserName = document.getElementById('sidebarUserName');
  const sidebarHotkeyBadge = document.getElementById('sidebarHotkeyBadge');

  // Overview Elements
  const heroGreeting = document.getElementById('heroGreeting');
  const statActiveModel = document.getElementById('statActiveModel');
  const statModelLatency = document.getElementById('statModelLatency');
  const statActiveVoice = document.getElementById('statActiveVoice');
  const statGoogleStatus = document.getElementById('statGoogleStatus');
  const statGoogleDetail = document.getElementById('statGoogleDetail');

  // Profile Elements
  const inputUserName = document.getElementById('inputUserName');
  const inputUserNickname = document.getElementById('inputUserNickname');
  const inputUserBio = document.getElementById('inputUserBio');
  const toneCards = document.querySelectorAll('.tone-card');

  // AI Elements
  const providerBtns = document.querySelectorAll('.provider-btn');
  const providerFields = document.querySelectorAll('.provider-fields');
  const inputGeminiKey = document.getElementById('inputGeminiKey');
  const btnToggleGeminiVis = document.getElementById('btnToggleGeminiVis');
  const btnTestGemini = document.getElementById('btnTestGemini');
  const testResultGemini = document.getElementById('testResultGemini');

  const inputGroqKey = document.getElementById('inputGroqKey');
  const inputGroqModel = document.getElementById('inputGroqModel');
  const btnTestGroq = document.getElementById('btnTestGroq');
  const testResultGroq = document.getElementById('testResultGroq');

  const inputOllamaEndpoint = document.getElementById('inputOllamaEndpoint');
  const inputOllamaModel = document.getElementById('inputOllamaModel');
  const btnTestOllama = document.getElementById('btnTestOllama');
  const testResultOllama = document.getElementById('testResultOllama');

  const inputOpenrouterKey = document.getElementById('inputOpenrouterKey');
  const inputOpenrouterModel = document.getElementById('inputOpenrouterModel');
  const btnTestOpenrouter = document.getElementById('btnTestOpenrouter');
  const testResultOpenrouter = document.getElementById('testResultOpenrouter');

  // Voice Elements
  const voiceCards = document.querySelectorAll('.voice-card');
  const inputVoiceTestText = document.getElementById('inputVoiceTestText');
  const btnPreviewVoice = document.getElementById('btnPreviewVoice');
  const btnPreviewVoiceLabel = document.getElementById('btnPreviewVoiceLabel');
  const toggleTts = document.getElementById('toggleTts');
  const toggleWakeWord = document.getElementById('toggleWakeWord');

  // Google Elements
  const googleConnectionDetail = document.getElementById('googleConnectionDetail');
  const btnConnectGoogle = document.getElementById('btnConnectGoogle');
  const btnConnectGoogleText = document.getElementById('btnConnectGoogleText');

  // Appearance Elements
  const islandThemeCards = document.querySelectorAll('.island-theme-card');
  const inputHotkey = document.getElementById('inputHotkey');

  // 1. Window Controls
  if (btnTrafficClose) {
    btnTrafficClose.addEventListener('click', () => {
      if (hasUnsavedChanges) {
        if (unsavedChangesBar) {
          unsavedChangesBar.classList.remove('shake');
          void unsavedChangesBar.offsetWidth; // Force CSS reflow
          unsavedChangesBar.classList.add('shake');
        }
        return; // PREVENT CLOSING UNTIL SAVED!
      }
      if (api.closeDashboard) api.closeDashboard();
      else window.close();
    });
  }
  if (btnTrafficMin) {
    btnTrafficMin.addEventListener('click', () => {
      if (api.minimizeDashboard) api.minimizeDashboard();
    });
  }

  // 2. Light / Dark Mode Toggle
  function applyThemeMode(mode) {
    currentThemeMode = mode === 'light' ? 'light' : 'dark';
    if (currentThemeMode === 'light') {
      document.documentElement.classList.remove('dark', 'theme-dark');
      document.documentElement.classList.add('light', 'theme-light');
      document.body.classList.remove('dark', 'theme-dark');
      document.body.classList.add('light', 'theme-light');
      if (themeToggleIcon) {
        themeToggleIcon.className = 'fa-solid fa-moon';
      }
    } else {
      document.documentElement.classList.remove('light', 'theme-light');
      document.documentElement.classList.add('dark', 'theme-dark');
      document.body.classList.remove('light', 'theme-light');
      document.body.classList.add('dark', 'theme-dark');
      if (themeToggleIcon) {
        themeToggleIcon.className = 'fa-solid fa-sun';
      }
    }
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const nextMode = currentThemeMode === 'dark' ? 'light' : 'dark';
      applyThemeMode(nextMode);
      markUnsaved();
    });
  }

  // 3. Navigation
  const tabTitles = {
    'tab-overview': 'Overview',
    'tab-voice': 'Voice Models',
    'tab-ai': 'AI Brain & Keys',
    'tab-profile': 'Personalization',
    'tab-google': 'Google Workspace',
    'tab-appearance': 'Appearance',
    'tab-about': 'About Grokki Studio',
  };

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');
      navBtns.forEach((b) => b.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetTabId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
      if (topBarTitle && tabTitles[targetTabId]) {
        topBarTitle.innerText = tabTitles[targetTabId];
      }
    });
  });

  // Voice Category Filter Buttons
  const voiceFilterBtns = document.querySelectorAll('.voice-filter-btn');
  voiceFilterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      voiceFilterBtns.forEach((b) => {
        b.classList.remove('active', 'bg-gray-900', 'dark:bg-white', 'text-white', 'dark:text-gray-900', 'font-semibold');
        b.classList.add('text-gray-600', 'dark:text-gray-400', 'font-medium', 'bg-transparent');
      });
      btn.classList.add('active', 'bg-gray-900', 'dark:bg-white', 'text-white', 'dark:text-gray-900', 'font-semibold');
      btn.classList.remove('text-gray-600', 'dark:text-gray-400', 'font-medium', 'bg-transparent');

      const filter = btn.getAttribute('data-filter');
      voiceCards.forEach((card) => {
        const accent = card.getAttribute('data-accent');
        if (filter === 'all' || accent === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Voice Test Prompt Presets
  const voicePresetBtns = document.querySelectorAll('.voice-preset-btn');
  voicePresetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-text');
      if (inputVoiceTestText && text) {
        inputVoiceTestText.value = text;
        markUnsaved();
      }
    });
  });

  // 4. Tone Selector
  toneCards.forEach((card) => {
    card.addEventListener('click', () => {
      toneCards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      selectedTone = card.getAttribute('data-tone');
      markUnsaved();
    });
  });

  // 5. ElevenLabs Voice Selection & Preview
  function updateVoiceCardsUI() {
    voiceCards.forEach((card) => {
      const vId = card.getAttribute('data-voice');
      const btn = card.querySelector('.voice-select-btn');
      if (vId === selectedVoice) {
        card.classList.add('active');
        if (btn) btn.innerText = 'Active ✓';
      } else {
        card.classList.remove('active');
        if (btn) btn.innerText = 'Select';
      }
    });
  }

  voiceCards.forEach((card) => {
    const vId = card.getAttribute('data-voice');

    // Click card or Select button
    card.addEventListener('click', (e) => {
      if (e.target.closest('.voice-disc-play')) return; // handled by play button
      selectedVoice = vId;
      updateVoiceCardsUI();
      const vName = card.querySelector('strong')?.innerText || vId;
      statActiveVoice.innerText = `Kokoro-82M (${vName})`;
      markUnsaved();
    });

    // Disc Play Preview Button
    const playBtn = card.querySelector('.voice-disc-play');
    if (playBtn) {
      playBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await playVoiceSample(vId, card, playBtn);
      });
    }
  });

  async function playVoiceSample(voiceId, cardElement, playBtn) {
    if (activeAudio) {
      try { activeAudio.pause(); } catch (e) {}
      activeAudio = null;
      document.querySelectorAll('.voice-card').forEach((c) => c.classList.remove('is-playing'));
      document.querySelectorAll('.voice-disc-play i').forEach((i) => i.className = 'fa-solid fa-play text-[10px] ml-0.5');
    }

    const icon = playBtn.querySelector('i');
    if (icon) icon.className = 'fa-solid fa-spinner fa-spin text-[10px]';
    cardElement.classList.add('is-playing');

    const sampleName = cardElement.querySelector('strong')?.innerText || 'Grokki';
    const sampleText = `Hello! I am ${sampleName}, ready to assist you.`;

    try {
      const res = await api.speakText(sampleText, voiceId);
      if (res && res.success && res.base64Audio) {
        activeAudio = new Audio(`data:audio/wav;base64,${res.base64Audio}`);
        if (icon) icon.className = 'fa-solid fa-stop text-[10px]';

        activeAudio.onended = () => {
          cardElement.classList.remove('is-playing');
          if (icon) icon.className = 'fa-solid fa-play text-[10px] ml-0.5';
          activeAudio = null;
        };
        activeAudio.onerror = () => {
          cardElement.classList.remove('is-playing');
          if (icon) icon.className = 'fa-solid fa-play text-[10px] ml-0.5';
          activeAudio = null;
        };
        await activeAudio.play();
      } else {
        cardElement.classList.remove('is-playing');
        if (icon) icon.className = 'fa-solid fa-play text-[10px] ml-0.5';
      }
    } catch (err) {
      cardElement.classList.remove('is-playing');
      if (icon) icon.className = 'fa-solid fa-play text-[10px] ml-0.5';
    }
  }

  // Global Speech Tester
  if (btnPreviewVoice) {
    btnPreviewVoice.addEventListener('click', async () => {
      if (isTestingVoice) return;
      const textToSpeak = (inputVoiceTestText.value || 'Hello, I am Grokki!').trim();
      isTestingVoice = true;
      btnPreviewVoiceLabel.innerText = 'Speaking...';
      btnPreviewVoice.classList.add('opacity-70');

      try {
        const res = await api.speakText(textToSpeak, selectedVoice);
        if (res && res.success && res.base64Audio) {
          const audio = new Audio(`data:audio/wav;base64,${res.base64Audio}`);
          audio.onended = () => {
            isTestingVoice = false;
            btnPreviewVoiceLabel.innerText = 'Test Voice';
            btnPreviewVoice.classList.remove('opacity-70');
          };
          audio.onerror = () => {
            isTestingVoice = false;
            btnPreviewVoiceLabel.innerText = 'Test Voice';
            btnPreviewVoice.classList.remove('opacity-70');
          };
          await audio.play();
        } else {
          isTestingVoice = false;
          btnPreviewVoiceLabel.innerText = 'Test Voice';
          btnPreviewVoice.classList.remove('opacity-70');
        }
      } catch (err) {
        isTestingVoice = false;
        btnPreviewVoiceLabel.innerText = 'Test Voice';
        btnPreviewVoice.classList.remove('opacity-70');
      }
    });
  }

  // 6. Provider Selector
  providerBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      providerBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedProvider = btn.getAttribute('data-provider');

      providerFields.forEach((f) => f.classList.add('hidden'));
      const activeField = document.getElementById(`fields${capitalize(selectedProvider)}`);
      if (activeField) activeField.classList.remove('hidden');

      statActiveModel.innerText = getProviderDisplayName(selectedProvider);
      markUnsaved();
    });
  });

  // 7. Dynamic Island Theme Selector
  islandThemeCards.forEach((card) => {
    card.addEventListener('click', () => {
      islandThemeCards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      selectedIslandTheme = card.getAttribute('data-theme');
      markUnsaved();
    });
  });

  // 8. Load Initial Config & UI Sync
  function applyConfigToUI(cfg) {
    if (!cfg) cfg = {};

    // Dashboard Theme Mode (Default Light)
    currentThemeMode = cfg.dashboardTheme || 'light';
    applyThemeMode(currentThemeMode);

    // Profile & Identity
    inputUserName.value = cfg.userName || '';
    inputUserNickname.value = cfg.userNickname || '';
    inputUserBio.value = cfg.userBio || '';

    updateUserInfoUI();

    selectedTone = cfg.userTone || 'companion';
    toneCards.forEach((c) => {
      if (c.getAttribute('data-tone') === selectedTone) c.classList.add('active');
      else c.classList.remove('active');
    });

    // AI Provider
    selectedProvider = cfg.provider || 'gemini';
    providerBtns.forEach((b) => {
      if (b.getAttribute('data-provider') === selectedProvider) b.classList.add('active');
      else b.classList.remove('active');
    });
    providerFields.forEach((f) => f.classList.add('hidden'));
    const activeField = document.getElementById(`fields${capitalize(selectedProvider)}`);
    if (activeField) activeField.classList.remove('hidden');

    inputGeminiKey.value = cfg.geminiApiKey || '';
    inputGroqKey.value = cfg.groqApiKey || '';
    inputGroqModel.value = cfg.groqModel || 'openai/gpt-oss-120b';
    inputOllamaEndpoint.value = cfg.ollamaEndpoint || 'http://127.0.0.1:11434';
    inputOllamaModel.value = cfg.ollamaModel || 'llama3.2';
    inputOpenrouterKey.value = cfg.openrouterApiKey || '';
    inputOpenrouterModel.value = cfg.openrouterModel || 'meta-llama/llama-3.3-70b-instruct:free';

    statActiveModel.innerText = getProviderDisplayName(selectedProvider);

    // Voice
    selectedVoice = cfg.ttsVoice || 'af_bella';
    updateVoiceCardsUI();
    const currentActiveVoiceCard = document.querySelector(`.voice-card[data-voice="${selectedVoice}"]`);
    if (currentActiveVoiceCard) {
      const vTitle = currentActiveVoiceCard.querySelector('strong')?.innerText || selectedVoice;
      statActiveVoice.innerText = `Kokoro-82M (${vTitle})`;
    }

    toggleTts.checked = cfg.ttsEnabled !== false;
    toggleWakeWord.checked = cfg.wakeWordEnabled !== false;

    // Island Theme & Hotkey
    selectedIslandTheme = cfg.pillTheme || 'glass';
    islandThemeCards.forEach((c) => {
      if (c.getAttribute('data-theme') === selectedIslandTheme) c.classList.add('active');
      else c.classList.remove('active');
    });

    inputHotkey.value = cfg.hotkey || 'Alt+Q';
    sidebarHotkeyBadge.innerText = cfg.hotkey || 'Alt+Q';
  }

  // Update User Identity & Avatar UI (Google Account Priority)
  function updateUserInfoUI() {
    let displayName = 'Friend';
    if (googleProfile && googleProfile.name) {
      displayName = googleProfile.name;
    }
    if (currentConfig.userNickname) {
      displayName = currentConfig.userNickname;
    } else if (currentConfig.userName) {
      displayName = currentConfig.userName;
    }

    if (sidebarUserName) sidebarUserName.innerText = displayName;
    if (heroGreeting) heroGreeting.innerText = `Welcome back, ${displayName}!`;

    const avatarEl = document.getElementById('sidebarUserAvatar');
    if (avatarEl) {
      if (googleProfile && googleProfile.picture) {
        avatarEl.innerHTML = `<img src="${googleProfile.picture}" class="w-full h-full object-cover rounded-lg" alt="${displayName}">`;
      } else {
        avatarEl.innerHTML = `<i class="fa-solid fa-user"></i>`;
      }
    }
  }

  async function loadInitial() {
    try {
      currentConfig = await api.getConfig();
      if (!currentConfig) currentConfig = {};
      applyConfigToUI(currentConfig);
      await checkGoogleStatus();

      // Populate About Tab Diagnostics
      if (api.getSystemInfo) {
        try {
          const sysInfo = await api.getSystemInfo();
          if (sysInfo) {
            const osEl = document.getElementById('aboutOsInfo');
            const cpuEl = document.getElementById('aboutCpuInfo');
            const memEl = document.getElementById('aboutMemInfo');
            const hotkeyEl = document.getElementById('aboutHotkeyInfo');
            if (osEl) osEl.innerText = `${sysInfo.platform === 'win32' ? 'Windows' : sysInfo.platform} (${sysInfo.arch})`;
            if (cpuEl) cpuEl.innerText = sysInfo.cpuModel || 'CPU';
            if (memEl) memEl.innerText = `${sysInfo.freeMemGb} GB free / ${sysInfo.totalMemGb} GB`;
            if (hotkeyEl) hotkeyEl.innerText = `${currentConfig.hotkey || 'Alt+Q'} Active`;
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Failed to load initial config:', err);
    }
  }

  // 9. Google Workspace Status Check
  async function checkGoogleStatus() {
    try {
      const res = await api.getGoogleStatus();
      if (res && res.connected) {
        statGoogleStatus.innerText = 'Connected';
        statGoogleStatus.className = 'text-sm font-semibold text-emerald-600 dark:text-emerald-400';
        googleProfile = res.profile || null;
        const emailOrName = googleProfile?.email ? ` (${googleProfile.email})` : '';
        googleConnectionDetail.innerText = `Google Account linked${emailOrName}.`;
        btnConnectGoogleText.innerText = 'Account Linked ✓';
      } else {
        googleProfile = null;
        statGoogleStatus.innerText = 'Not Linked';
        statGoogleStatus.className = 'text-sm font-semibold text-gray-400';
        googleConnectionDetail.innerText = 'Click to connect Gmail, Calendar, Docs & Drive.';
        btnConnectGoogleText.innerText = 'Connect Account';
      }
    } catch (e) {
      googleProfile = null;
      statGoogleStatus.innerText = 'Offline';
    }
    updateUserInfoUI();
  }

  if (btnConnectGoogle) {
    btnConnectGoogle.addEventListener('click', async () => {
      btnConnectGoogleText.innerText = 'Authorizing...';
      try {
        const res = await api.connectGoogle();
        if (res && res.success) {
          checkGoogleStatus();
        } else {
          alert('Google Auth: ' + (res?.error || 'Authorization incomplete'));
          checkGoogleStatus();
        }
      } catch (err) {
        alert('Google Auth Error: ' + err.message);
        checkGoogleStatus();
      }
    });
  }

  // 10. AI Key Live Testers
  async function testKey(provider, key, model, endpoint, resultEl, btnEl) {
    btnEl.innerText = 'Testing...';
    btnEl.disabled = true;
    resultEl.classList.add('hidden');

    try {
      const res = await api.testAiKey({ provider, key, model, endpoint });
      if (res && res.success) {
        resultEl.className = 'test-result text-xs p-2 rounded-lg font-medium border border-emerald-500/30 text-emerald-400';
        resultEl.innerHTML = `<i class="fa-solid fa-circle-check mr-1.5"></i> Verified in <strong>${res.latencyMs}ms</strong> (${res.reply || 'Ready'})`;
        resultEl.classList.remove('hidden');
      } else {
        resultEl.className = 'test-result text-xs p-2 rounded-lg font-medium border border-red-500/30 text-red-400';
        resultEl.innerHTML = `<i class="fa-solid fa-circle-xmark mr-1.5"></i> Failed: ${res?.error || 'Invalid key'}`;
        resultEl.classList.remove('hidden');
      }
    } catch (err) {
      resultEl.className = 'test-result text-xs p-2 rounded-lg font-medium border border-red-500/30 text-red-400';
      resultEl.innerHTML = `<i class="fa-solid fa-circle-xmark mr-1.5"></i> ${err.message}`;
      resultEl.classList.remove('hidden');
    } finally {
      btnEl.innerText = 'Test Connection';
      btnEl.disabled = false;
    }
  }

  if (btnTestGemini) {
    btnTestGemini.addEventListener('click', () => {
      testKey('gemini', inputGeminiKey.value, null, null, testResultGemini, btnTestGemini);
    });
  }
  if (btnTestGroq) {
    btnTestGroq.addEventListener('click', () => {
      testKey('groq', inputGroqKey.value, inputGroqModel.value, null, testResultGroq, btnTestGroq);
    });
  }
  if (btnTestOllama) {
    btnTestOllama.addEventListener('click', () => {
      testKey('ollama', null, inputOllamaModel.value, inputOllamaEndpoint.value, testResultOllama, btnTestOllama);
    });
  }
  if (btnTestOpenrouter) {
    btnTestOpenrouter.addEventListener('click', () => {
      testKey('openrouter', inputOpenrouterKey.value, inputOpenrouterModel.value, null, testResultOpenrouter, btnTestOpenrouter);
    });
  }

  // Toggle Gemini Key Visibility
  if (btnToggleGeminiVis) {
    btnToggleGeminiVis.addEventListener('click', () => {
      const type = inputGeminiKey.getAttribute('type') === 'password' ? 'text' : 'password';
      inputGeminiKey.setAttribute('type', type);
      btnToggleGeminiVis.innerHTML = type === 'password' ? '<i class="fa-regular fa-eye text-xs"></i>' : '<i class="fa-regular fa-eye-slash text-xs"></i>';
    });
  }

  // 11. Save Configuration
  async function saveAllChanges() {
    if (btnSaveFloating) {
      btnSaveFloating.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Saving...</span>';
      btnSaveFloating.disabled = true;
    }

    const payload = {
      dashboardTheme: currentThemeMode,
      userName: inputUserName.value.trim(),
      userNickname: inputUserNickname.value.trim(),
      userBio: inputUserBio.value.trim(),
      userTone: selectedTone,
      provider: selectedProvider,
      geminiApiKey: inputGeminiKey.value.trim(),
      groqApiKey: inputGroqKey.value.trim(),
      groqModel: inputGroqModel.value.trim(),
      ollamaEndpoint: inputOllamaEndpoint.value.trim(),
      ollamaModel: inputOllamaModel.value.trim(),
      openrouterApiKey: inputOpenrouterKey.value.trim(),
      openrouterModel: inputOpenrouterModel.value.trim(),
      ttsVoice: selectedVoice,
      ttsEnabled: toggleTts.checked,
      wakeWordEnabled: toggleWakeWord.checked,
      pillTheme: selectedIslandTheme,
      hotkey: inputHotkey.value.trim() || 'Alt+Q',
    };

    try {
      const updated = await api.saveConfig(payload);
      currentConfig = updated;

      updateUserInfoUI();
      sidebarHotkeyBadge.innerText = updated.hotkey;

      hideUnsavedBar();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      if (btnSaveFloating) {
        btnSaveFloating.innerHTML = 'Save Changes';
        btnSaveFloating.disabled = false;
      }
    }
  }

  if (btnSaveFloating) {
    btnSaveFloating.addEventListener('click', saveAllChanges);
  }

  if (btnResetChanges) {
    btnResetChanges.addEventListener('click', () => {
      applyConfigToUI(currentConfig);
      hideUnsavedBar();
    });
  }

  function markUnsaved() {
    hasUnsavedChanges = true;
    if (unsavedChangesBar) {
      unsavedChangesBar.classList.add('visible');
    }
  }

  function hideUnsavedBar() {
    hasUnsavedChanges = false;
    if (unsavedChangesBar) {
      unsavedChangesBar.classList.remove('visible');
      unsavedChangesBar.classList.remove('shake');
    }
  }

  [inputUserName, inputUserNickname, inputUserBio, inputGeminiKey, inputGroqKey, inputGroqModel, inputOllamaEndpoint, inputOllamaModel, inputOpenrouterKey, inputOpenrouterModel, inputHotkey].forEach((input) => {
    if (input) input.addEventListener('input', markUnsaved);
  });
  [toggleTts, toggleWakeWord].forEach((toggle) => {
    if (toggle) toggle.addEventListener('change', markUnsaved);
  });

  // Helpers
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getProviderDisplayName(provider) {
    switch (provider) {
      case 'gemini': return 'Gemini 2.5 Flash';
      case 'groq': return 'Groq (openai/gpt-oss-120b)';
      case 'ollama': return 'Ollama (Offline Air-Gap)';
      case 'openrouter': return 'OpenRouter Multi-Model';
      default: return provider;
    }
  }

  // Load initial settings
  await loadInitial();
});
