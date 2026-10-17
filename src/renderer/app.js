/**
 * Apple Dynamic Island Assistant - App Controller
 * Orchestrates Grokki, Sound Engine, Screen Worker Cursor, and Voice.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const islandContainer = document.getElementById('islandContainer');
  const grokbotCanvas = document.getElementById('grokbot-canvas');
  const mainInput = document.getElementById('mainInput');
  const sendBtn = document.getElementById('sendBtn');
  const modeToggleBtn = document.getElementById('modeToggleBtn');
  const modeIcon = document.getElementById('modeIcon');
  const islandDrawer = document.getElementById('islandDrawer');
  const userText = document.getElementById('userText');
  const responseText = document.getElementById('responseText');
  const badgeRow = document.getElementById('badgeRow');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsSheet = document.getElementById('settingsSheet');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const providerSelect = document.getElementById('providerSelect');
  const musicProviderSelect = document.getElementById('musicProviderSelect');
  const geminiConfigFields = document.getElementById('geminiConfigFields');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const groqConfigFields = document.getElementById('groqConfigFields');
  const groqApiKeyInput = document.getElementById('groqApiKeyInput');
  const groqModelInput = document.getElementById('groqModelInput');
  const ollamaConfigFields = document.getElementById('ollamaConfigFields');
  const ollamaEndpointInput = document.getElementById('ollamaEndpointInput');
  const ollamaModelInput = document.getElementById('ollamaModelInput');
  const openrouterConfigFields = document.getElementById('openrouterConfigFields');
  const openrouterApiKeyInput = document.getElementById('openrouterApiKeyInput');
  const openrouterModelInput = document.getElementById('openrouterModelInput');
  const wakeWordInput = document.getElementById('wakeWordInput');
  const wakeWordToggle = document.getElementById('wakeWordToggle');
  const ttsEnabledToggle = document.getElementById('ttsEnabledToggle');
  const ttsVoiceSelect = document.getElementById('ttsVoiceSelect');
  const hotkeyInput = document.getElementById('hotkeyInput');
  const themeOriginalBtn = document.getElementById('themeOriginalBtn');
  const themeGlassBtn = document.getElementById('themeGlassBtn');
  const normalInputArea = document.getElementById('normalInputArea');
  const normalControlsGroup = document.getElementById('normalControlsGroup');
  const returnToTimerBtn = document.getElementById('returnToTimerBtn');
  const miniTimerDisplay = document.getElementById('miniTimerDisplay');
  const lockInFullView = document.getElementById('lockInFullView');
  const lockInFullSubject = document.getElementById('lockInFullSubject');
  const lockInFullCountdown = document.getElementById('lockInFullCountdown');
  const lockInPausePlayBtn = document.getElementById('lockInPausePlayBtn');
  const lockInPausePlayIcon = document.getElementById('lockInPausePlayIcon');
  const lockInStopSessionBtn = document.getElementById('lockInStopSessionBtn');
  const timerOpenTypingBtn = document.getElementById('timerOpenTypingBtn');
  const timerOpenVoiceBtn = document.getElementById('timerOpenVoiceBtn');

  let currentMode = 'typing';
  let agentProcessing = false;
  let activePillTheme = 'glass';
  let savedPillTheme = 'glass';

  /**
   * Complete, robust Markdown renderer for Grokki
   * Prioritizes window.marked (CDN) & jarvisAPI.renderMarkdown (preload),
   * with a full standalone fallback that parses headers, bold, italics, code, lists, and links.
   */
  /**
   * Renders a LaTeX math string using KaTeX (if available) or a built-in HTML math typesetter
   */
  function renderMathExpr(tex, displayMode = false) {
    const cleanTex = String(tex || '').trim();
    if (!cleanTex) return '';

    if (typeof window.katex !== 'undefined' && typeof window.katex.renderToString === 'function') {
      try {
        return window.katex.renderToString(cleanTex, {
          displayMode,
          throwOnError: false,
          strict: false,
        });
      } catch (e) {}
    }

    // Built-in offline HTML math typesetter
    let html = cleanTex
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\\left\s*([()[\]{}|.])/g, '$1')
      .replace(/\\right\s*([()[\]{}|.])/g, '$1')
      .replace(/\\left\\\{/g, '{')
      .replace(/\\right\\\}/g, '}')
      .replace(/\\,/g, '&thinsp;')
      .replace(/\\;/g, '&ensp;')
      .replace(/\\quad/g, '&emsp;');

    // Stacked fractions: \frac{num}{den}
    for (let i = 0; i < 3; i++) {
      html = html.replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="math-frac"><span class="math-frac-num">$1</span><span class="math-frac-den">$2</span></span>');
    }

    // Square roots: \sqrt{...}
    html = html.replace(/\\sqrt\{([^{}]+)\}/g, '&radic;<span style="border-top:1px solid rgba(255,255,255,0.6); padding:0 2px;">$1</span>');

    // Superscripts & Subscripts
    html = html
      .replace(/\^\{([^{}]+)\}/g, '<sup>$1</sup>')
      .replace(/\^([a-zA-Z0-9+\-]+)/g, '<sup>$1</sup>')
      .replace(/_\{([^{}]+)\}/g, '<sub>$1</sub>')
      .replace(/_([a-zA-Z0-9]+)/g, '<sub>$1</sub>');

    // Common LaTeX symbols & Greek letters
    const symbolMap = {
      '\\int': '∫', '\\sum': '∑', '\\prod': '∏', '\\infty': '∞',
      '\\partial': '∂', '\\nabla': '∇', '\\cdot': '·', '\\times': '×',
      '\\div': '÷', '\\pm': '±', '\\mp': '∓', '\\leq': '≤', '\\le': '≤',
      '\\geq': '≥', '\\ge': '≥', '\\neq': '≠', '\\ne': '≠', '\\approx': '≈',
      '\\equiv': '≡', '\\implies': '⟹', '\\Rightarrow': '⇒', '\\rightarrow': '→',
      '\\to': '→', '\\leftarrow': '←', '\\leftrightarrow': '↔', '\\in': '∈',
      '\\notin': '∉', '\\subset': '⊂', '\\subseteq': '⊆', '\\cup': '∪',
      '\\cap': '∩', '\\forall': '∀', '\\exists': '∃', '\\alpha': 'α',
      '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ϵ',
      '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\lambda': 'λ',
      '\\mu': 'μ', '\\pi': 'π', '\\rho': 'ρ', '\\sigma': 'σ',
      '\\tau': 'τ', '\\phi': 'φ', '\\chi': 'χ', '\\psi': 'ψ',
      '\\omega': 'ω', '\\Delta': 'Δ', '\\Gamma': 'Γ', '\\Lambda': 'Λ',
      '\\Omega': 'Ω', '\\Phi': 'Φ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Theta': 'Θ',
      '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan', '\\ln': 'ln', '\\log': 'log', '\\lim': 'lim',
    };

    for (const [k, v] of Object.entries(symbolMap)) {
      html = html.split(k).join(v);
    }

    return displayMode
      ? `<div class="math-block">${html}</div>`
      : `<span class="math-inline">${html}</span>`;
  }

  /**
   * Complete, robust Markdown + Math renderer for Grokki
   */
  function renderMarkdownHTML(text) {
    if (!text) return '';
    let raw = String(text).trim();

    // 1. Extract and protect Code Blocks first so math inside code blocks isn't touched
    const codeSlots = [];
    raw = raw.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
      const idx = codeSlots.length;
      const safeCode = code.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const langClass = lang ? ` class="language-${lang}"` : '';
      codeSlots.push(`<pre><code${langClass}>${safeCode}</code></pre>`);
      return `%%CODESLOT${idx}%%`;
    });

    // 2. Extract and render Display Math ($$...$$ and \[...\]) and Inline Math ($...$ and \(...\))
    // Use underscore-free placeholders (%%MATHSLOT0%%) so Markdown italic rules never touch them!
    const mathSlots = [];
    const pushMath = (tex, isDisplay) => {
      const idx = mathSlots.length;
      mathSlots.push(renderMathExpr(tex, isDisplay));
      return `%%MATHSLOT${idx}%%`;
    };

    // Display math: $$...$$ and \[...\]
    raw = raw.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => pushMath(tex, true));
    raw = raw.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => pushMath(tex, true));

    // Inline math: \(...\) and $...$ (avoid matching currency like $100 followed by space/words)
    raw = raw.replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => pushMath(tex, false));
    raw = raw.replace(/\$([^\$\n]+?)\$/g, (match, tex) => {
      if (/^\d+(\.\d+)?\s/.test(tex)) return match;
      return pushMath(tex, false);
    });

    // 3. Parse Markdown
    let out = parseMarkdownFallback(raw);

    // 4. Restore Math & Code slots
    out = out.replace(/%%MATHSLOT(\d+)%%/g, (_, i) => mathSlots[Number(i)] || '');
    out = out.replace(/%%CODESLOT(\d+)%%/g, (_, i) => codeSlots[Number(i)] || '');

    return out;
  }

  function parseMarkdownFallback(text) {
    let out = text;

    // Inline code
    out = out.replace(/`([^`\n]+)`/g, (_, c) => {
      // If inline backtick actually contains a LaTeX formula (e.g. `\frac{a}{b}` or `x^2 + 2x`), render it as math!
      if (/(\\frac|\\int|\\sum|\\sqrt|\^[0-9a-zA-Z{]|_[0-9a-zA-Z{])/.test(c) && !/[{};=]/.test(c.replace(/\\[a-zA-Z]+\{[^{}]*\}/g, ''))) {
        return renderMathExpr(c, false);
      }
      return `<code>${c}</code>`;
    });

    // Headers
    out = out.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    out = out.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    out = out.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    out = out.replace(/^# (.*$)/gim, '<h3>$1</h3>');

    // Bold
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic
    out = out.replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
    out = out.replace(/(^|[^_])_([^_\n]+)_([^_]|$)/g, '$1<em>$2</em>$3');

    // Markdown Links: [label](url)
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="#" data-external-href="$2" rel="noopener noreferrer">$1 ↗</a>');

    // Auto-link remaining bare URLs (http:// or https:// not preceded by href=" or >)
    out = out.replace(/(^|[^"'>])(https?:\/\/[a-zA-Z0-9\-_.]+(\.[a-zA-Z]{2,})[^\s<]*)/g, '$1<a href="#" data-external-href="$2" rel="noopener noreferrer">$2 ↗</a>');

    // Bullets (•, -, *)
    out = out.replace(/^[•\-\*] (.*$)/gim, '<li>$1</li>');
    out = out.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');
    out = out.replace(/<\/ul>\s*<ul>/g, '');

    // Paragraphs / Linebreaks
    out = out.replace(/\n\n+/g, '</p><p>');
    out = out.replace(/\n/g, '<br/>');

    return `<p>${out}</p>`;
  }

  let typingTimer = null;
  let activeCursorEl = null;

  function prepareTypingHtml(rawHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    let totalWords = 0;

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text || !text.trim()) return;

        const frag = doc.createDocumentFragment();
        const tokens = text.split(/(\s+)/);
        for (const tok of tokens) {
          if (!tok) continue;
          if (/^\s+$/.test(tok)) {
            frag.appendChild(doc.createTextNode(tok));
          } else {
            const span = doc.createElement('span');
            span.className = 'grokki-typing-word grokki-word-hidden';
            span.textContent = tok;
            frag.appendChild(span);
            totalWords++;
          }
        }
        node.parentNode.replaceChild(frag, node);
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (['SCRIPT', 'STYLE', 'SVG'].includes(node.tagName)) return;
        Array.from(node.childNodes).forEach(walk);
      }
    }

    Array.from(doc.body.childNodes).forEach(walk);
    return { html: doc.body.innerHTML, totalWords };
  }

  function setResponseHTML(html, animate = false) {
    if (typingTimer) {
      clearInterval(typingTimer);
      typingTimer = null;
    }
    if (activeCursorEl && activeCursorEl.parentNode) {
      activeCursorEl.parentNode.removeChild(activeCursorEl);
      activeCursorEl = null;
    }
    responseText.classList.remove('grokki-typing-active');

    if (!animate) {
      responseText.innerHTML = html;
      enhanceCodeBlocks(responseText);
      return;
    }

    const { html: preparedHtml, totalWords } = prepareTypingHtml(html);
    if (totalWords === 0) {
      responseText.innerHTML = html;
      enhanceCodeBlocks(responseText);
      return;
    }

    responseText.innerHTML = preparedHtml;
    enhanceCodeBlocks(responseText);
    responseText.classList.add('grokki-typing-active');

    const wordNodes = Array.from(responseText.querySelectorAll('.grokki-word-hidden'));
    const cursor = document.createElement('span');
    cursor.className = 'grokki-typing-cursor';
    activeCursorEl = cursor;

    let currentIndex = 0;
    const targetTotalTime = Math.min(2200, Math.max(500, totalWords * 22));
    const tickInterval = 20;
    const totalTicks = targetTotalTime / tickInterval;
    const wordsPerTick = Math.max(1, Math.ceil(totalWords / totalTicks));

    const finishTyping = () => {
      if (typingTimer) {
        clearInterval(typingTimer);
        typingTimer = null;
      }
      wordNodes.forEach((s) => {
        s.classList.remove('grokki-word-hidden');
        s.classList.add('grokki-word-fade');
      });
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      responseText.classList.remove('grokki-typing-active');
      activeCursorEl = null;
    };

    const revealBatch = () => {
      const end = Math.min(currentIndex + wordsPerTick, totalWords);
      for (let i = currentIndex; i < end; i++) {
        const s = wordNodes[i];
        s.classList.remove('grokki-word-hidden');
        s.classList.add('grokki-word-fade');
      }
      if (end > 0 && end <= totalWords) {
        wordNodes[end - 1].after(cursor);
      }
      currentIndex = end;
      if (islandDrawer) {
        islandDrawer.scrollTop = islandDrawer.scrollHeight;
      }
      if (currentIndex >= totalWords) {
        finishTyping();
      }
    };

    responseText.addEventListener('click', finishTyping, { once: true });
    typingTimer = setInterval(revealBatch, tickInterval);
    revealBatch();
  }

  function enhanceCodeBlocks(container) {
    if (!container) return;
    const preElements = container.querySelectorAll('pre');
    preElements.forEach((pre) => {
      if (pre.closest('.mac-code-window')) return;
      
      const code = pre.querySelector('code');
      const text = code ? code.innerText : pre.innerText;
      let lang = 'code';
      if (code && code.className) {
        const match = code.className.match(/language-([a-z0-9_-]+)/i);
        if (match) lang = match[1];
      }

      const windowWrap = document.createElement('div');
      windowWrap.className = 'mac-code-window';

      const header = document.createElement('div');
      header.className = 'mac-code-header';
      header.innerHTML = `
        <div class="mac-code-dots">
          <span class="mac-code-dot red"></span>
          <span class="mac-code-dot yellow"></span>
          <span class="mac-code-dot green"></span>
        </div>
        <span class="mac-code-lang">${lang}</span>
        <button class="mac-code-copy-btn" type="button" title="Copy code">
          <i class="fa-regular fa-copy"></i> Copy
        </button>
      `;

      const copyBtn = header.querySelector('.mac-code-copy-btn');
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text.trim());
          copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color:#34d399;"></i> Copied!';
          setTimeout(() => {
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
          }, 1800);
        } catch (err) {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
          }, 1800);
        }
      });

      pre.parentNode.insertBefore(windowWrap, pre);
      windowWrap.appendChild(header);
      windowWrap.appendChild(pre);
    });
  }

  // Intercept any clicked links inside Grokki's responses and open in default browser
  responseText.addEventListener('click', (ev) => {
    const link = ev.target.closest('a');
    if (link) {
      ev.preventDefault();
      ev.stopPropagation();
      const href = link.getAttribute('data-external-href') || link.getAttribute('href');
      if (href && href !== '#' && window.jarvisAPI && window.jarvisAPI.openUrl) {
        window.jarvisAPI.openUrl(href);
      }
    }
  });

  // 1. Initialize Sound Engine
  const sound = new window.SoundEngine();

  // 2. Initialize WebGL2 Orb Effect for Grokki
  const orbContainer = document.getElementById('grokkiOrbContainer');
  let grokkiOrb = null;
  if (orbContainer && window.Orb) {
    grokkiOrb = new window.Orb(orbContainer, {
      colors: ["#9c43fe", "#4cc2e9", "#101499"],
      hoverIntensity: 1,
      trail: 1.4,
      rotateOnHover: true,
      followCursor: true,
      hue: 0,
      size: 1.18, // Full black orb size (fills the full 54px-56px avatar)
      glow: 0.95,
      bleed: 3,
      wobble: 1.15,
      highlight: 0.85,
      tiltX: 1,
      tiltY: 0,
      speed: 1,
      backgroundColor: "#000000",
      forceHoverState: false,
      clickPulse: true,
      intro: true,
    });
  }

  // 3. Initialize LightRays Effect behind the Pill
  const lightRaysContainer = document.getElementById('lightRaysBackdrop');
  let lightRays = null;
  if (lightRaysContainer && window.LightRays) {
    lightRays = new window.LightRays(lightRaysContainer, {
      raysOrigin: "top-center",
      raysColor: "#ffffff",
      raysSpeed: 1,
      lightSpread: 0.5,
      rayLength: 3,
      glow: 0.6,
      haze: 0.25,
      followMouse: true,
      mouseInfluence: 0.1,
      rayDensity: 1,
      tilt: 0,
      raySharpness: 0.35,
      atmosphere: 1,
      intensity: 1,
      fadeDistance: 1,
      saturation: 1,
      noiseAmount: 0,
      distortion: 0,
      pulsating: false,
      cursorShadow: true,
      clickPulse: true,
      intro: true,
      lightMode: false,
    });
    window.grokkiLightRays = lightRays;
  }

  // 4. Initialize GlassSurface Effect on Dynamic Island
  let glassSurface = null;
  if (window.GlassSurfaceEffect) {
    glassSurface = new window.GlassSurfaceEffect(islandContainer, {
      borderRadius: 38,
      distortionScale: -180,
      displace: 0.5,
      backgroundOpacity: 0.1,
      borderWidth: 0.07,
      brightness: 50,
      opacity: 0.93,
      blur: 11,
      saturation: 1,
      redOffset: 0,
      greenOffset: 10,
      blueOffset: 20,
      mixBlendMode: 'difference',
      theme: 'glass',
    });
    applyPillTheme('glass');
  }

  function applyPillTheme(theme) {
    activePillTheme = theme === 'glass' ? 'glass' : 'original';
    if (glassSurface) {
      glassSurface.setTheme(activePillTheme);
    }
    if (islandContainer) {
      if (activePillTheme === 'glass') {
        islandContainer.classList.add('theme-glass');
      } else {
        islandContainer.classList.remove('theme-glass');
      }
    }
    if (themeOriginalBtn && themeGlassBtn) {
      if (activePillTheme === 'glass') {
        themeGlassBtn.classList.add('active');
        themeOriginalBtn.classList.remove('active');
      } else {
        themeOriginalBtn.classList.add('active');
        themeGlassBtn.classList.remove('active');
      }
    }
  }

  if (themeOriginalBtn) {
    themeOriginalBtn.addEventListener('click', () => {
      sound.playPoke();
      applyPillTheme('original');
    });
  }

  if (themeGlassBtn) {
    themeGlassBtn.addEventListener('click', () => {
      sound.playPoke();
      applyPillTheme('glass');
    });
  }

  // 5. Initialize Screen Worker (Mini-Grokki Cursor)
  const worker = new window.ScreenWorker(sound);

  // 5. Initialize Grokki Character with sound reactions and Orb integration
  const grokbot = new window.Grokbot(grokbotCanvas, sound, grokkiOrb);

  // 6. Initialize Grokki Agent
  const agent = new window.GrokkiAgent(window.jarvisAPI);

  // 5. Initialize Voice Engine
  const voice = new window.VoiceEngine(
    grokbot,
    async (spokenText) => {
      mainInput.value = spokenText;
      updateSendButtonState();
      await handleUserPrompt(spokenText);
    },
    (status) => {
      if (status === 'listening') {
        grokbot.setState('listening');
      } else {
        if (!agentProcessing) grokbot.setState('idle');
      }
    },
    // On Native Audio Recorded
    async (audioBlob) => {
      if (currentMode !== 'voice') {
        return;
      }
      agentProcessing = true;
      userText.innerText = 'Listening...';
      responseText.innerText = 'Processing voice...';
      islandDrawer.classList.add('open');
      islandContainer.classList.add('has-drawer-open');
      grokbot.setState('thinking');
      try {
        const response = await agent.processAudio(audioBlob);
        if (currentMode !== 'voice') {
          grokbot.setState('idle');
          return;
        }
        if (response && (response.error === 'NO_SPEECH_DETECTED' || !response.transcript)) {
          grokbot.setState('idle');
          userText.innerText = 'Listening for your command...';
          setTimeout(() => {
            if (currentMode === 'voice' && !agentProcessing) voice.startListening();
          }, 250);
          return;
        }
        userText.innerText = response.transcript || 'Voice command';
        setResponseHTML(renderMarkdownHTML(response.reply), true);
        islandDrawer.classList.add('open');
        islandContainer.classList.add('has-drawer-open');

        badgeRow.innerHTML = '';
        if (response.actionsExecuted && response.actionsExecuted.length > 0) {
          response.actionsExecuted.forEach((act) => {
            const pill = document.createElement('span');
            pill.className = 'apple-pill-badge';
            const label = (act.name || act.type || 'Done').replace(/_/g, ' ');
            pill.innerHTML = `<i class="fa-solid fa-check"></i> ${label}`;
            badgeRow.appendChild(pill);
          });
        }

        sound.playSuccess();
        grokbot.setState('happy');
        voice.speak(response.reply, () => {
          grokbot.setState('idle');
          if (currentMode === 'voice') {
            setTimeout(() => {
              if (currentMode === 'voice' && !agentProcessing) {
                userText.innerText = 'Listening for your command...';
                voice.startListening();
              }
            }, 350);
          }
        });
      } catch (err) {
        if (currentMode !== 'voice') {
          grokbot.setState('idle');
          return;
        }
        responseText.innerText = `Voice: ${err.message}`;
        islandDrawer.classList.add('open');
        grokbot.setState('idle');
        if (currentMode === 'voice') {
          setTimeout(() => {
            if (currentMode === 'voice' && !agentProcessing) {
              userText.innerText = 'Listening for your command...';
              voice.startListening();
            }
          }, 600);
        }
      } finally {
        agentProcessing = false;
      }
    },
    // On No Speech Detected (silence timeout)
    () => {
      if (currentMode === 'voice' && !agentProcessing) {
        setTimeout(() => {
          if (currentMode === 'voice' && !agentProcessing) {
            voice.startListening();
          }
        }, 200);
      }
    }
  );

  // Multi-Provider UI Controller
  function updateProviderUI(provider) {
    const p = provider || 'gemini';
    if (providerSelect) providerSelect.value = p;
    if (geminiConfigFields) geminiConfigFields.classList.toggle('hidden', p !== 'gemini');
    if (groqConfigFields) groqConfigFields.classList.toggle('hidden', p !== 'groq');
    if (ollamaConfigFields) ollamaConfigFields.classList.toggle('hidden', p !== 'ollama');
    if (openrouterConfigFields) openrouterConfigFields.classList.toggle('hidden', p !== 'openrouter');
  }

  if (providerSelect) {
    providerSelect.addEventListener('change', () => {
      updateProviderUI(providerSelect.value);
    });
  }

  // Load Preferences
  try {
    const config = await window.jarvisAPI.getConfig();
    if (config.provider) {
      updateProviderUI(config.provider);
    } else {
      updateProviderUI('gemini');
    }
    if (config.geminiApiKey) {
      agent.setApiKey(config.geminiApiKey);
      geminiApiKeyInput.value = config.geminiApiKey;
    }
    if (config.groqApiKey && groqApiKeyInput) groqApiKeyInput.value = config.groqApiKey;
    if (config.groqModel && groqModelInput) groqModelInput.value = config.groqModel;
    if (config.ollamaEndpoint && ollamaEndpointInput) ollamaEndpointInput.value = config.ollamaEndpoint;
    if (config.ollamaModel && ollamaModelInput) ollamaModelInput.value = config.ollamaModel;
    if (config.openrouterApiKey && openrouterApiKeyInput) openrouterApiKeyInput.value = config.openrouterApiKey;
    if (config.openrouterModel && openrouterModelInput) openrouterModelInput.value = config.openrouterModel;

    if (config.wakeWord) {
      voice.setWakeWord(config.wakeWord);
      wakeWordInput.value = config.wakeWord;
    } else {
      voice.setWakeWord('Hey Grokki');
      wakeWordInput.value = 'Hey Grokki';
    }
    if (config.hotkey) {
      hotkeyInput.value = config.hotkey;
    }
    if (config.pillTheme) {
      savedPillTheme = config.pillTheme;
      applyPillTheme(config.pillTheme);
    }
    if (wakeWordToggle) {
      wakeWordToggle.checked = config.wakeWordEnabled === true;
    }
    if (config.musicProvider && musicProviderSelect) {
      musicProviderSelect.value = config.musicProvider;
    }
    if (ttsEnabledToggle && config.ttsEnabled !== undefined) {
      ttsEnabledToggle.checked = config.ttsEnabled !== false;
      voice.setTTSEnabled(ttsEnabledToggle.checked);
    }
    if (ttsVoiceSelect && config.ttsVoice) {
      ttsVoiceSelect.value = config.ttsVoice;
      voice.setVoice(config.ttsVoice);
    }
  } catch (e) {}

  // Live Sync with Dashboard Studio Updates
  if (window.jarvisAPI && window.jarvisAPI.onConfigUpdated) {
    window.jarvisAPI.onConfigUpdated((updated) => {
      if (updated.pillTheme) {
        savedPillTheme = updated.pillTheme;
        applyPillTheme(updated.pillTheme);
      }
      if (updated.ttsVoice && voice && typeof voice.setVoice === 'function') {
        voice.setVoice(updated.ttsVoice);
      }
      if (updated.provider && typeof updateProviderUI === 'function') {
        updateProviderUI(updated.provider);
      }
      if (updated.wakeWord && voice && typeof voice.setWakeWord === 'function') {
        voice.setWakeWord(updated.wakeWord);
      }
    });
  }

  // 6. Mode Switcher (Font Awesome Mic <-> Keyboard)
  function setMode(mode) {
    currentMode = mode;
    if (window.jarvisAPI && window.jarvisAPI.setListeningMode) {
      window.jarvisAPI.setListeningMode(mode);
    }
    if (mode === 'voice') {
      modeIcon.className = 'fa-solid fa-keyboard';
      modeToggleBtn.classList.add('active-voice');
      modeToggleBtn.title = 'Switch to Typing Mode';
      mainInput.placeholder = 'Listening... (speak your command)';
      userText.innerText = 'Listening for your command...';
      voice.startListening();
      sound.playPoke();
    } else {
      modeIcon.className = 'fa-solid fa-microphone';
      modeToggleBtn.classList.remove('active-voice');
      modeToggleBtn.title = 'Switch to Voice Mode';
      mainInput.placeholder = 'Ask Grokki or give an order...';
      voice.cancelListening();
      mainInput.focus();
    }
  }

  modeToggleBtn.addEventListener('click', () => {
    if (currentMode === 'typing') {
      setMode('voice');
    } else {
      setMode('typing');
    }
  });

  // --- Slash Command Palette for Overlay Pill ---
  const slashPalette = document.getElementById('slashCommandPalette');
  const slashList = document.getElementById('slashPaletteList');
  let activeSlashIndex = 0;
  let currentFilteredCommands = [];

  const OVERLAY_SLASH_COMMANDS = [
    { name: 'btw', desc: 'Ask a quick question without interrupting the main conversation.', icon: 'fa-solid fa-circle-question', hasArg: true },
    { name: 'goal', desc: 'Run until the specified goal is completely finished.', icon: 'fa-solid fa-bullseye', hasArg: true },
    { name: 'compact', desc: 'Compact the conversation now (summarize history to free up the context window).', icon: 'fa-solid fa-compress', hasArg: false },
    { name: 'schedule', desc: 'Run an instruction on a recurring schedule or as a one-time timer.', icon: 'fa-solid fa-clock', hasArg: true },
    { name: 'browser', desc: 'Invoke a browser agent for web tasks.', icon: 'fa-solid fa-globe', hasArg: true },
    { name: 'plan', desc: 'Plan carefully before executing a task.', icon: 'fa-solid fa-list-check', hasArg: true },
    { name: 'grill-me', desc: 'Interview me to align on a plan.', icon: 'fa-solid fa-comments', hasArg: true },
    { name: 'teamwork-preview', desc: 'Invoke a team of agents to autonomously tackle large projects.', icon: 'fa-solid fa-users', hasArg: true },
    { name: 'status', desc: 'Check live PC health, CPU load, RTX GPU temp, and memory usage.', icon: 'fa-solid fa-chart-line', hasArg: false },
    { name: 'clean', desc: 'Clear temporary junk cache files and purge recycle bin.', icon: 'fa-solid fa-broom', hasArg: false },
    { name: 'screenshot', desc: 'Capture a clean fullscreen screenshot to Desktop and clipboard.', icon: 'fa-solid fa-camera', hasArg: false },
    { name: 'lock', desc: 'Immediately lock Windows workstation.', icon: 'fa-solid fa-lock', hasArg: false },
    { name: 'notes', desc: 'Generate study notes or meeting summary document to Desktop.', icon: 'fa-solid fa-file-lines', hasArg: true }
  ];

  function isSlashPaletteActive() {
    return slashPalette && slashPalette.classList.contains('open');
  }

  function renderSlashPalette(commands) {
    currentFilteredCommands = commands;
    if (!slashList) return;
    slashList.innerHTML = '';
    if (commands.length === 0) {
      hideSlashPalette();
      return;
    }

    // Close response drawer if it was open from past interaction so pill focuses on commands
    if (islandDrawer && islandDrawer.classList.contains('open')) {
      islandDrawer.classList.remove('open');
      islandContainer.classList.remove('has-drawer-open');
    }

    if (slashPalette) {
      slashPalette.classList.add('open');
    }
    if (islandContainer) {
      islandContainer.classList.add('has-slash-open');
    }

    commands.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = `slash-palette-item ${idx === activeSlashIndex ? 'active' : ''}`;
      item.innerHTML = `
        <div class="slash-icon"><i class="${cmd.icon}"></i></div>
        <span class="slash-title">/${cmd.name}</span>
        <span class="slash-desc">${cmd.desc}</span>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        selectSlashCommand(cmd);
      });
      slashList.appendChild(item);
    });
    const activeEl = slashList.children[activeSlashIndex];
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }

  function hideSlashPalette() {
    if (slashPalette) {
      slashPalette.classList.remove('open');
    }
    if (islandContainer) {
      islandContainer.classList.remove('has-slash-open');
    }
    activeSlashIndex = 0;
    currentFilteredCommands = [];
  }

  function selectSlashCommand(cmd) {
    if (cmd.hasArg) {
      mainInput.value = `/${cmd.name} `;
      mainInput.focus();
      hideSlashPalette();
      updateSendButtonState();
    } else {
      hideSlashPalette();
      handleUserPrompt(`/${cmd.name}`);
    }
  }

  function handleSlashInputChange() {
    const val = mainInput.value;
    if (val.startsWith('/') && !val.includes(' ')) {
      const q = val.slice(1).toLowerCase();
      const filtered = OVERLAY_SLASH_COMMANDS.filter(cmd =>
        cmd.name.toLowerCase().includes(q) || cmd.desc.toLowerCase().includes(q)
      );
      if (activeSlashIndex >= filtered.length) activeSlashIndex = 0;
      renderSlashPalette(filtered);
    } else {
      hideSlashPalette();
    }
  }

  // 7. Typing Reactions (Grokki looks down at keystrokes)
  mainInput.addEventListener('input', () => {
    grokbot.onUserTyping();
    updateSendButtonState();
    handleSlashInputChange();
  });

  function updateSendButtonState() {
    if (mainInput.value.trim().length > 0) {
      sendBtn.classList.add('has-text');
    } else {
      sendBtn.classList.remove('has-text');
    }
  }

  mainInput.addEventListener('keydown', (e) => {
    if (isSlashPaletteActive() && currentFilteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSlashIndex = (activeSlashIndex + 1) % currentFilteredCommands.length;
        renderSlashPalette(currentFilteredCommands);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSlashIndex = (activeSlashIndex - 1 + currentFilteredCommands.length) % currentFilteredCommands.length;
        renderSlashPalette(currentFilteredCommands);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const selected = currentFilteredCommands[activeSlashIndex] || currentFilteredCommands[0];
        if (selected) selectSlashCommand(selected);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        hideSlashPalette();
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      hideSlashPalette();
      handleUserPrompt(mainInput.value);
    }
  });

  sendBtn.addEventListener('click', () => {
    hideSlashPalette();
    handleUserPrompt(mainInput.value);
  });

  // Mouse hover tracking
  window.addEventListener('mousemove', (e) => {
    grokbot.onMouseMove(e.clientX, e.clientY);
  });

  const activeAttachmentPill = document.getElementById('activeAttachmentPill');
  const attachmentFileName = document.getElementById('attachmentFileName');
  const removeAttachmentBtn = document.getElementById('removeAttachmentBtn');

  let activeAttachment = null;

  function setAttachment(file) {
    if (!file) return;
    const filePath = file.path || '';
    const fileName = file.name || (filePath ? filePath.split(/[/\\]/).pop() : 'Attachment');
    const sizeStr = file.size ? ` (${Math.round(file.size / 1024)} KB)` : '';

    activeAttachment = {
      name: fileName,
      path: filePath,
      size: file.size || 0,
    };

    attachmentFileName.innerText = fileName;
    activeAttachmentPill.style.display = 'inline-flex';
    sound.playSuccess();
    grokbot.setState('happy');

    // Immediately open drawer and prompt user with proactive options
    userText.innerHTML = `<i class="fa-solid fa-file" style="margin-right:6px; color:#8ab4f8;"></i> <strong>${fileName}</strong>${sizeStr}`;
    setResponseHTML(`<strong>File attached!</strong> What would you like Grokki to do with <code>${fileName}</code>?`);
    islandDrawer.classList.add('open');
    islandContainer.classList.add('has-drawer-open');

    // Render interactive action chips in optionRow
    const optionRow = document.getElementById('optionRow');
    if (optionRow) {
      optionRow.innerHTML = '';

      const isStudyDoc = /\.(pdf|txt|md|docx?|pptx?|cpp|py|java|c|json|html|csv)$/i.test(fileName);

      const actions = [];
      if (isStudyDoc) {
        actions.push(
          { label: `🎙️ Viva Oral Quiz`, prompt: `Start a Viva oral exam quiz from this attached document`, autoSubmit: true },
          { label: `🗂️ Anki Flashcards`, prompt: `Export Anki flashcards from this attached document`, autoSubmit: true },
          { label: `🎯 1-Page Cheat Sheet`, prompt: `Generate a 1-page exam cheat sheet from this attached document and save it`, autoSubmit: true },
          { label: `📝 Revision Notes`, prompt: `Create high-yield study revision notes from this attached document and save it to my Desktop`, autoSubmit: true },
          { label: `❓ Exam Questions`, prompt: `Generate top probable exam questions with model answers from this attached document`, autoSubmit: true },
          { label: `💡 Explain Like I'm 10`, prompt: `Explain the core concepts of this attached document using the Feynman technique like I'm 10`, autoSubmit: true },
        );
      }

      actions.push(
        { label: `<i class="fa-brands fa-whatsapp"></i> Send on WhatsApp`, prompt: `Send this file "${fileName}" on WhatsApp to ` },
        { label: `<i class="fa-brands fa-google-drive"></i> Upload to Drive`, prompt: `Upload this file to my Google Drive` },
        { label: `<i class="fa-solid fa-trash-can"></i> Remove`, action: 'remove' }
      );

      actions.forEach((act) => {
        const chip = document.createElement('button');
        chip.className = 'option-chip';
        chip.innerHTML = act.label;
        chip.addEventListener('click', () => {
          sound.playPoke();
          if (act.action === 'remove') {
            clearAttachment();
            responseText.innerText = 'Attachment removed.';
            optionRow.innerHTML = '';
          } else if (act.autoSubmit) {
            handleUserPrompt(act.prompt);
          } else {
            mainInput.value = act.prompt;
            mainInput.focus();
          }
        });
        optionRow.appendChild(chip);
      });
    }
  }

  function clearAttachment() {
    activeAttachment = null;
    activeAttachmentPill.style.display = 'none';
    const optionRow = document.getElementById('optionRow');
    if (optionRow) optionRow.innerHTML = '';
  }

  if (removeAttachmentBtn) {
    removeAttachmentBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearAttachment();
    });
  }

  // --- Dual-Mode Pill: Full Timer View vs Chat Input View ---
  let isTimerActive = false;
  let isShowingFullTimer = false;
  let lockInInterval = null;
  let lockInRemainingSeconds = 0;
  let lockInIsPaused = false;
  let lockInSubjectName = 'Focus';

  function formatTimerDisplay(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function setPillDisplayMode(mode) {
    if (mode === 'timer') {
      isShowingFullTimer = true;
      if (normalInputArea) normalInputArea.style.display = 'none';
      if (normalControlsGroup) normalControlsGroup.style.display = 'none';
      if (lockInFullView) lockInFullView.style.display = 'flex';
      // Close drawer if open when returning to clean timer view
      islandDrawer.classList.remove('open');
      islandContainer.classList.remove('has-drawer-open');
    } else {
      // mode === 'chat' (typing or voice)
      isShowingFullTimer = false;
      if (lockInFullView) lockInFullView.style.display = 'none';
      if (normalInputArea) normalInputArea.style.display = 'flex';
      if (normalControlsGroup) normalControlsGroup.style.display = 'flex';
      // If timer is running in background, show the return mini-button
      if (returnToTimerBtn) {
        returnToTimerBtn.style.display = isTimerActive ? 'inline-flex' : 'none';
      }
    }
  }

  function startLockInTimer(durationMinutes = 25, subject = 'Focus') {
    if (lockInInterval) {
      clearInterval(lockInInterval);
    }

    isTimerActive = true;
    lockInSubjectName = (subject || 'Focus').replace(/Study Session|Session/gi, '').trim() || 'Focus';
    lockInRemainingSeconds = Math.max(1, Math.round(durationMinutes * 60));
    lockInIsPaused = false;

    if (lockInFullSubject) lockInFullSubject.innerText = lockInSubjectName;
    if (lockInFullCountdown) lockInFullCountdown.innerText = formatTimerDisplay(lockInRemainingSeconds);
    if (miniTimerDisplay) miniTimerDisplay.innerText = formatTimerDisplay(lockInRemainingSeconds);
    if (lockInPausePlayIcon) lockInPausePlayIcon.className = 'fa-solid fa-pause';

    // Morph the entire pill into the Focus Timer!
    setPillDisplayMode('timer');
    sound.playSuccess();
    grokbot.setState('happy');

    lockInInterval = setInterval(() => {
      if (lockInIsPaused) return;

      lockInRemainingSeconds--;
      const formatted = formatTimerDisplay(lockInRemainingSeconds);
      if (lockInFullCountdown) lockInFullCountdown.innerText = formatted;
      if (miniTimerDisplay) miniTimerDisplay.innerText = formatted;

      if (lockInRemainingSeconds <= 0) {
        clearInterval(lockInInterval);
        lockInInterval = null;
        isTimerActive = false;

        sound.playSuccess();
        grokbot.setState('happy');

        // Bring back chat mode with victory celebration banner
        setPillDisplayMode('chat');
        userText.innerHTML = `🔥 <strong>Lock-In Block Finished!</strong>`;
        setResponseHTML(`<h3>🏆 Outstanding Work!</h3><p>You completed a full <strong>${durationMinutes}-minute focus session</strong> on <em>${lockInSubjectName}</em>.</p><p style="color:#a8c7fa; margin-top:6px;">Take a well-deserved 5-minute breather or stretch!</p>`);
        islandDrawer.classList.add('open');
        islandContainer.classList.add('has-drawer-open');

        voice.speak(`Great job! You finished your ${durationMinutes} minute lock-in session on ${lockInSubjectName}. Take a quick break!`);
      }
    }, 1000);
  }

  function togglePauseLockIn() {
    lockInIsPaused = !lockInIsPaused;
    sound.playPoke();
    if (lockInPausePlayIcon) {
      lockInPausePlayIcon.className = lockInIsPaused ? 'fa-solid fa-play' : 'fa-solid fa-pause';
    }
  }

  function stopLockInTimer() {
    if (lockInInterval) {
      clearInterval(lockInInterval);
      lockInInterval = null;
    }
    isTimerActive = false;
    lockInRemainingSeconds = 0;
    lockInIsPaused = false;
    setPillDisplayMode('chat');
    if (returnToTimerBtn) returnToTimerBtn.style.display = 'none';
  }

  // Timer View Listeners
  if (lockInPausePlayBtn) {
    lockInPausePlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePauseLockIn();
    });
  }

  if (lockInStopSessionBtn) {
    lockInStopSessionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playDismiss();
      stopLockInTimer();
      responseText.innerText = 'Study lock-in session ended.';
    });
  }

  // Right switcher on timer bar: Switch to Keyboard / Chat
  if (timerOpenTypingBtn) {
    timerOpenTypingBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playPoke();
      setPillDisplayMode('chat');
      setMode('typing');
      setTimeout(() => mainInput.focus(), 80);
    });
  }

  // Right switcher on timer bar: Switch to Voice Mode
  if (timerOpenVoiceBtn) {
    timerOpenVoiceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playPoke();
      setPillDisplayMode('chat');
      setMode('voice');
    });
  }

  // Mini-return button inside chat mode: Flip back to timer view
  if (returnToTimerBtn) {
    returnToTimerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playPoke();
      setPillDisplayMode('timer');
    });
  }

  // Preload native drop listener fallback
  if (window.jarvisAPI && window.jarvisAPI.onFileDrop) {
    window.jarvisAPI.onFileDrop((droppedFile) => {
      setAttachment(droppedFile);
    });
  }

  // Bulletproof Drag & Drop Reaction with counter
  let dragCounter = 0;

  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    islandContainer.classList.add('drag-active');
    grokbot.setState('happy');
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    if (!islandContainer.classList.contains('drag-active')) {
      islandContainer.classList.add('drag-active');
    }
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      islandContainer.classList.remove('drag-active');
      grokbot.setState('idle');
    }
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragCounter = 0;
    islandContainer.classList.remove('drag-active');

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      let filePath = '';
      try {
        if (window.jarvisAPI && window.jarvisAPI.getPathForFile) {
          filePath = window.jarvisAPI.getPathForFile(file);
        }
      } catch (err) {}
      if (!filePath && file.path) filePath = file.path;

      // Fallback: save buffer if path could not be resolved
      if (!filePath && window.jarvisAPI && window.jarvisAPI.saveTempFile) {
        try {
          const buffer = await file.arrayBuffer();
          const res = await window.jarvisAPI.saveTempFile({
            name: file.name,
            buffer: Array.from(new Uint8Array(buffer)),
          });
          if (res && res.path) filePath = res.path;
        } catch (err) {}
      }

      setAttachment({
        name: file.name,
        path: filePath || file.name,
        size: file.size || 0,
      });
    }
  });

  // 8. Execute User Order + Mini-Grokki Worker Simulation
  async function handleUserPrompt(promptText) {
    const text = (promptText || mainInput.value || '').trim();
    if (!text || agentProcessing) return;

    agentProcessing = true;
    mainInput.value = '';
    updateSendButtonState();
    badgeRow.innerHTML = '';
    userText.innerText = text;
    setResponseHTML('<span style="color:rgba(255,255,255,0.5);">Thinking...</span>');
    islandDrawer.classList.add('open');
    islandContainer.classList.add('has-drawer-open');

    grokbot.setState('thinking');

    try {
      // Execute real system command via agent with active file attachment context
      const response = await agent.process(text, { attachedFile: activeAttachment });

      if (response && (response.cancelled || response.reply === 'Cancelled.')) {
        setResponseHTML('<span style="color: rgba(255,255,255,0.4); font-style: italic;"><i class="fa-solid fa-ban"></i> Task killed.</span>');
        grokbot.setState('idle');
        return;
      }

      // Render Markdown output cleanly with per-word fade-in typing
      setResponseHTML(renderMarkdownHTML(response.reply), true);
      islandDrawer.classList.add('open');
      islandContainer.classList.add('has-drawer-open');

      // Render interactive options if Grokki is asking for a pivot
      const optionRow = document.getElementById('optionRow');
      optionRow.innerHTML = '';
      if (response.options && response.options.length > 0) {
        response.options.forEach((opt) => {
          const chip = document.createElement('button');
          chip.className = 'option-chip';
          chip.innerHTML = `<i class="fa-solid fa-arrow-turn-down"></i> ${opt.label}`;
          chip.addEventListener('click', () => {
            sound.playPoke();
            handleUserPrompt(opt.label);
          });
          optionRow.appendChild(chip);
        });
      }

      if (response.actionsExecuted && response.actionsExecuted.length > 0) {
        response.actionsExecuted.forEach((act) => {
          const pill = document.createElement('span');
          pill.className = 'apple-pill-badge';
          const label = (act.name || act.type || 'Done').replace(/_/g, ' ');
          pill.innerHTML = `<i class="fa-solid fa-check"></i> ${label}`;
          badgeRow.appendChild(pill);

          // If lock-in study session started, launch the live timer in the Dynamic Island pill!
          if (act.name === 'start_lock_in_study_session' || act.result?.actionType === 'START_LOCK_IN') {
            const duration = act.result?.durationMinutes || act.args?.duration_minutes || 25;
            const subject = act.result?.subject || act.args?.subject || 'Study';
            startLockInTimer(duration, subject);
          }
        });
      }

      // If no contextual follow-up chips, show high-value student & automation quick action chips
      if (!response.options || response.options.length === 0) {
        const defaultChips = [
          { label: '📸 Snap & Solve', prompt: 'Snap and solve my screen' },
          { label: '💻 PC & GPU Health', prompt: 'Check PC health' },
          { label: '🗂️ Organize Downloads', prompt: 'Organize my Downloads folder' },
          { label: '⏱️ Lock-In 25m', prompt: 'Start a 25-minute study lock-in session' },
          { label: '🛠️ Bug Doctor', prompt: 'Fix my code bug in VS Code' },
        ];
        defaultChips.forEach((sc) => {
          const chip = document.createElement('button');
          chip.className = 'option-chip';
          chip.innerHTML = sc.label;
          chip.addEventListener('click', () => {
            sound.playPoke();
            if (sc.prompt.endsWith(' ')) {
              mainInput.value = sc.prompt;
              mainInput.focus();
            } else {
              handleUserPrompt(sc.prompt);
            }
          });
          optionRow.appendChild(chip);
        });
      }

      // Play victory chime and celebrate
      sound.playSuccess();
      grokbot.setState('happy');

      voice.speak(response.reply, () => {
        grokbot.setState('idle');
        if (currentMode === 'voice') {
          setTimeout(() => {
            if (currentMode === 'voice' && !agentProcessing) {
              userText.innerText = 'Listening for your command...';
              voice.startListening();
            }
          }, 350);
        }
      });
    } catch (err) {
      responseText.innerText = `Error: ${err.message}`;
      islandDrawer.classList.add('open');
      grokbot.setState('idle');
      if (currentMode === 'voice') {
        setTimeout(() => {
          if (currentMode === 'voice' && !agentProcessing) {
            userText.innerText = 'Listening for your command...';
            voice.startListening();
          }
        }, 600);
      }
    } finally {
      agentProcessing = false;
    }
  }

  // 9. Settings Sheet
  const googleStatusBadge = document.getElementById('googleStatusBadge');
  const connectGoogleBtn = document.getElementById('connectGoogleBtn');

  async function updateGoogleStatus() {
    if (!window.jarvisAPI || !window.jarvisAPI.getGoogleStatus) return;
    try {
      const { connected } = await window.jarvisAPI.getGoogleStatus();
      if (connected) {
        googleStatusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Connected';
        googleStatusBadge.className = 'gs-badge inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
        connectGoogleBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Reconnect';
        connectGoogleBtn.className = 'gs-btn gs-sm inline-flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 cursor-pointer transition shrink-0';
      } else {
        googleStatusBadge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Offline';
        googleStatusBadge.className = 'gs-badge inline-flex items-center gap-1';
        connectGoogleBtn.innerHTML = '<i class="fa-brands fa-google"></i> Connect';
        connectGoogleBtn.className = 'gs-btn gs-sm inline-flex items-center gap-1.5 cursor-pointer transition shrink-0';
      }
    } catch (e) {}
  }

  const openSettings = () => {
    savedPillTheme = activePillTheme;
    islandDrawer.classList.remove('open');
    islandContainer.classList.remove('has-drawer-open');
    islandContainer.classList.add('has-settings-open');
    settingsSheet.classList.add('open');
    updateGoogleStatus();
  };

  const closeSettings = (revert = false) => {
    if (revert) {
      applyPillTheme(savedPillTheme);
    }
    islandContainer.classList.remove('has-settings-open');
    settingsSheet.classList.remove('open');
  };

  settingsBtn.addEventListener('click', openSettings);

  if (connectGoogleBtn) {
    connectGoogleBtn.addEventListener('click', async () => {
      connectGoogleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
      try {
        const res = await window.jarvisAPI.connectGoogle();
        if (res.needsCredentials) {
          alert(res.message);
        }
      } catch (err) {
        alert(err.message);
      }
      await updateGoogleStatus();
    });
  }

  closeSettingsBtn.addEventListener('click', () => closeSettings(true));
  cancelSettingsBtn.addEventListener('click', () => closeSettings(true));

  saveSettingsBtn.addEventListener('click', async () => {
    const newProvider = providerSelect ? providerSelect.value : 'gemini';
    const newApiKey = geminiApiKeyInput.value.trim();
    const newGroqApiKey = groqApiKeyInput ? groqApiKeyInput.value.trim() : '';
    const newGroqModel = (groqModelInput && groqModelInput.value.trim()) || 'openai/gpt-oss-120b';
    const newOllamaEndpoint = (ollamaEndpointInput && ollamaEndpointInput.value.trim()) || 'http://127.0.0.1:11434';
    const newOllamaModel = (ollamaModelInput && ollamaModelInput.value.trim()) || 'llama3.2';
    const newOpenrouterApiKey = openrouterApiKeyInput ? openrouterApiKeyInput.value.trim() : '';
    const newOpenrouterModel = (openrouterModelInput && openrouterModelInput.value.trim()) || 'meta-llama/llama-3.3-70b-instruct:free';
    const newWakeWord = wakeWordInput.value.trim() || 'Hey Grokki';
    const newHotkey = hotkeyInput.value.trim() || 'Alt+Q';
    const newWakeWordEnabled = wakeWordToggle ? wakeWordToggle.checked : false;
    const newMusicProvider = musicProviderSelect ? musicProviderSelect.value : 'ytmusic';
    const newTtsEnabled = ttsEnabledToggle ? ttsEnabledToggle.checked : true;
    const newTtsVoice = ttsVoiceSelect ? ttsVoiceSelect.value : 'af_bella';

    agent.setApiKey(newApiKey);
    voice.setWakeWord(newWakeWord);
    voice.setTTSEnabled(newTtsEnabled);
    voice.setVoice(newTtsVoice);

    savedPillTheme = activePillTheme;

    await window.jarvisAPI.saveConfig({
      provider: newProvider,
      geminiApiKey: newApiKey,
      groqApiKey: newGroqApiKey,
      groqModel: newGroqModel,
      ollamaEndpoint: newOllamaEndpoint,
      ollamaModel: newOllamaModel,
      openrouterApiKey: newOpenrouterApiKey,
      openrouterModel: newOpenrouterModel,
      wakeWord: newWakeWord,
      hotkey: newHotkey,
      pillTheme: savedPillTheme,
      wakeWordEnabled: newWakeWordEnabled,
      musicProvider: newMusicProvider,
      ttsEnabled: newTtsEnabled,
      ttsVoice: newTtsVoice,
    });

    sound.playSuccess();
    closeSettings(false);
  });

  // Background Wake Word Detection (Windows Native Offline Speech Recognition)
  if (window.jarvisAPI && window.jarvisAPI.onWakeWordDetected) {
    window.jarvisAPI.onWakeWordDetected((data) => {
      sound.playPoke();
      islandContainer.classList.remove('hidden-state');
      const command = (data && data.command) ? data.command.trim() : '';
      if (command) {
        mainInput.value = command;
        handleUserPrompt(command);
      } else {
        // Hey Grokki opens in voice mode!
        setMode('voice');
        islandDrawer.classList.add('open');
        islandContainer.classList.add('has-drawer-open');
        userText.innerText = 'Listening for your command...';
        responseText.innerText = '';
      }
    });
  }

  // 10. Window State & Transitions (Cute Squash & Stretch Launch Animation)
  const GREETING_LINES = [
    "Hi! 👋",
    "Hey there! ✨",
    "Ready to roll! 🚀",
    "Sup human! 👀",
    "Grokki online! ⚡",
    "At your service! 🎩",
    "What's the plan? 💡",
    "Good to see ya! 🌟",
    "How can I help? 🤖",
    "Let's build! 🛠️",
    "I'm all ears! 👂",
    "Grokki's here! 💫",
    "What are we making? 🎨",
    "Ready when you are! 🎯",
    "Beep boop! 🛸",
    "Hey friend! ☕",
    "All systems go! 🌟"
  ];

  let launchTimer = null;
  let impactSoundTimer = null;
  let hiGreetingTimer = null;
  let chimeTimer = null;

  function playLaunchAnimation() {
    if (launchTimer) clearTimeout(launchTimer);
    if (impactSoundTimer) clearTimeout(impactSoundTimer);
    if (hiGreetingTimer) clearTimeout(hiGreetingTimer);
    if (chimeTimer) clearTimeout(chimeTimer);

    // Pick random hardcoded greeting line
    const hiBubble = document.getElementById('grokkiHiBubble');
    if (hiBubble) {
      const line = GREETING_LINES[Math.floor(Math.random() * GREETING_LINES.length)];
      hiBubble.textContent = line;
    }

    islandContainer.classList.remove('hidden-state');
    islandContainer.classList.remove('is-launching');

    // Force reflow so animation cleanly restarts
    void islandContainer.offsetWidth;

    islandContainer.classList.add('is-launching');

    // Rule #1: Squash on impact sound at center (~410ms)
    impactSoundTimer = setTimeout(() => {
      sound.playPoke();
    }, 410);

    // Grokki stays in center & does joyful motion "Hi!" animation (~520ms)
    hiGreetingTimer = setTimeout(() => {
      grokbot.sayHi();
      sound.playSuccess();
    }, 520);

    // Pill expands outward chime as Grokki slides into left slot (~1460ms)
    chimeTimer = setTimeout(() => {
      sound.playSummon();
      if (lightRaysContainer) lightRaysContainer.classList.add('active');
      if (lightRays) {
        lightRays.wake();
        lightRays.pulse();
      }
    }, 1460);

    // Complete transition and return to normal interactive state (~1900ms)
    launchTimer = setTimeout(() => {
      islandContainer.classList.remove('is-launching');
      if (lightRaysContainer) lightRaysContainer.classList.add('active');
      if (currentMode === 'typing') mainInput.focus();
      else voice.startListening();
      launchTimer = null;
    }, 1900);
  }

  window.jarvisAPI.onWindowStateChanged(({ visible }) => {
    if (visible) {
      playLaunchAnimation();
    } else {
      if (launchTimer) clearTimeout(launchTimer);
      if (impactSoundTimer) clearTimeout(impactSoundTimer);
      if (hiGreetingTimer) clearTimeout(hiGreetingTimer);
      if (chimeTimer) clearTimeout(chimeTimer);
      if (lightRaysContainer) lightRaysContainer.classList.remove('active');
      islandContainer.classList.remove('is-launching');
      islandContainer.classList.add('hidden-state');
      islandDrawer.classList.remove('open');
      closeSettings();
      userText.innerText = '';
      responseText.innerText = '';
      badgeRow.innerHTML = '';
      const optionRow = document.getElementById('optionRow');
      if (optionRow) optionRow.innerHTML = '';
      voice.stopListening();
      if (window.jarvisAPI && window.jarvisAPI.setListeningMode) {
        window.jarvisAPI.setListeningMode('voice');
      }
    }
  });

  window.jarvisAPI.onOpenSettings(() => {
    openSettings();
  });

  async function handleHotkeyKillOrToggle(data = {}) {
    const action = (data && data.action) ? data.action : 'toggle';

    if (agentProcessing || (voice && voice.isListening)) {
      // KILL SWITCH: Cancel ongoing task, halt token generation, and reset state!
      console.log('[App] Alt+Q killer pressed during ongoing reply/task. Halting immediately!');
      agentProcessing = false;
      if (window.jarvisAPI && window.jarvisAPI.cancelTask) {
        await window.jarvisAPI.cancelTask();
      }
      if (voice) voice.stopListening();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      sound.playDismiss();
      grokbot.setState('idle');
      setResponseHTML('<span style="color: rgba(255,255,255,0.4); font-style: italic;"><i class="fa-solid fa-ban"></i> Task killed.</span>');
      setTimeout(() => {
        islandDrawer.classList.remove('open');
        islandContainer.classList.remove('has-drawer-open');
        islandContainer.classList.add('hidden-state');
        if (window.jarvisAPI && window.jarvisAPI.hideWindow) {
          window.jarvisAPI.hideWindow();
        }
      }, 350);
      return;
    }

    if (action === 'show' || islandContainer.classList.contains('hidden-state')) {
      islandContainer.classList.remove('hidden-state');
      if (isTimerActive && !isShowingFullTimer) {
        setPillDisplayMode('timer');
      } else {
        setPillDisplayMode('chat');
        setMode('typing');
        setTimeout(() => mainInput.focus(), 80);
      }
      sound.playPoke();
      return;
    }

    // If currently in full timer view, Alt+Q flips directly into typing mode!
    if (isTimerActive && isShowingFullTimer) {
      sound.playPoke();
      setPillDisplayMode('chat');
      setMode('typing');
      setTimeout(() => mainInput.focus(), 80);
      return;
    }

    // Tap Alt+Q while already open and idle: Dismiss/hide
    sound.playDismiss();
    islandDrawer.classList.remove('open');
    islandContainer.classList.remove('has-drawer-open');
    islandContainer.classList.add('hidden-state');
    clearAttachment();
    if (voice) voice.stopListening();
    if (window.jarvisAPI && window.jarvisAPI.hideWindow) {
      window.jarvisAPI.hideWindow();
    }
  }

  // Global hotkey trigger from Main Process
  if (window.jarvisAPI && window.jarvisAPI.onHotkeyTrigger) {
    window.jarvisAPI.onHotkeyTrigger((data) => {
      handleHotkeyKillOrToggle(data);
    });
  }

  // Spoken Background Reminder & Timed OS Action trigger from Main Process
  if (window.jarvisAPI && window.jarvisAPI.onReminderFired) {
    window.jarvisAPI.onReminderFired((data) => {
      const text = (data && data.reminderText) ? data.reminderText : 'Time is up for your scheduled reminder!';
      const osAct = (data && data.osAction && data.osAction !== 'none') ? `\n\n⚡ *Executing scheduled OS action: **${data.osAction.toUpperCase()}**...*` : '';
      islandContainer.classList.remove('hidden-state');
      islandContainer.classList.remove('is-launching');
      userText.innerHTML = `<i class="fa-solid fa-bell" style="color:#fbbf24; margin-right:6px;"></i> <strong>Scheduled Reminder (${data.fireTimeStr || 'Now'})</strong>`;
      setResponseHTML(renderMarkdownHTML(`### ⏰ Reminder Alert!\n**${text}**${osAct}`), true);
      islandDrawer.classList.add('open');
      islandContainer.classList.add('has-drawer-open');
      sound.playSuccess();
      grokbot.setState('happy');
      voice.speak(`Hey! Quick reminder... ${text}`, () => {
        grokbot.setState('idle');
      });
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      sound.playDismiss();
      if (isSlashPaletteActive()) {
        hideSlashPalette();
        return;
      }
      if (settingsSheet.classList.contains('open')) {
        closeSettings(true);
        return;
      }
      if (agentProcessing) {
        handleHotkeyKillOrToggle();
        return;
      }
      hideSlashPalette();
      islandDrawer.classList.remove('open');
      islandContainer.classList.remove('has-drawer-open');
      islandContainer.classList.add('hidden-state');
      clearAttachment();
      if (voice) voice.stopListening();
      if (window.jarvisAPI && window.jarvisAPI.hideWindow) {
        window.jarvisAPI.hideWindow();
      }
      return;
    }

    if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      handleHotkeyKillOrToggle();
    }
  });

  // Auto-login & verify Google Workspace connection on startup
  updateGoogleStatus();

  // Play cute Grokki launch animation on initial startup
  playLaunchAnimation();
});
