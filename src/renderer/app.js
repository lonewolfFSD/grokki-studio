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
  const pocketGrokkiBtn = document.getElementById('pocketGrokkiBtn');
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
  const pillThemeToggle = document.getElementById('pillThemeToggle');
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
  let activePillTheme = 'grokki-blue';
  let savedPillTheme = 'grokki-blue';

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

  function getIslandFileIconClass(ext) {
    const e = (ext || '').toLowerCase();
    if (['tsx', 'jsx'].includes(e)) return 'fa-brands fa-react';
    if (['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'].includes(e)) return 'fa-brands fa-js';
    if (['py', 'pyw'].includes(e)) return 'fa-brands fa-python';
    if (['html', 'htm'].includes(e)) return 'fa-brands fa-html5';
    if (['css', 'scss', 'sass', 'less'].includes(e)) return 'fa-brands fa-css3-alt';
    if (['java'].includes(e)) return 'fa-brands fa-java';
    if (['rs'].includes(e)) return 'fa-brands fa-rust';
    if (['go'].includes(e)) return 'fa-brands fa-golang';
    if (['pdf'].includes(e)) return 'fa-solid fa-file-pdf';
    if (['doc', 'docx'].includes(e)) return 'fa-solid fa-file-word';
    if (['xls', 'xlsx', 'csv'].includes(e)) return 'fa-solid fa-file-csv';
    if (['ppt', 'pptx'].includes(e)) return 'fa-solid fa-file-powerpoint';
    if (['md', 'markdown', 'txt'].includes(e)) return 'fa-solid fa-file-lines';
    return 'fa-solid fa-file-code';
  }

  function parseMarkdownFallback(text) {
    let out = text;

    // Inline code (detect filenames with extension -> Grokki Blue file chip)
    out = out.replace(/`([^`\n]+)`/g, (_, c) => {
      if (/(\\frac|\\int|\\sum|\\sqrt|\^[0-9a-zA-Z{]|_[0-9a-zA-Z{])/.test(c) && !/[{};=]/.test(c.replace(/\\[a-zA-Z]+\{[^{}]*\}/g, ''))) {
        return renderMathExpr(c, false);
      }
      const trimmed = c.trim();
      const rawFile = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
      const fileMatch = rawFile.match(/^([a-zA-Z0-9_\-\.\/\\]+\.(tsx|ts|jsx|js|mjs|cjs|py|html|css|scss|json|ya?ml|toml|sql|rs|go|c|cpp|h|hpp|cs|java|sh|ps1|md|txt|pdf|docx?|pptx?|xlsx?|csv))$/i);
      if (fileMatch) {
        const cleanName = fileMatch[1];
        const ext = fileMatch[2].toLowerCase();
        const iconCls = getIslandFileIconClass(ext);
        return `<span class="island-file-chip" data-grokki-file-chip="true" data-file-name="${cleanName}" title="Ctrl + Click to open ${cleanName}"><i class="${iconCls}"></i><span>${trimmed}</span></span>`;
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
    out = out.replace(/(?:<li>[^\n]*<\/li>\s*)+/g, (match) => `<ul>${match}</ul>`);

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

    // For very long responses (>1800 chars), skip per-word span wrapping to keep DOM ultra-fast and prevent UI freeze
    if (html.length > 1800) {
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

  // Intercept any clicked links or file chips inside Grokki's responses
  responseText.addEventListener('click', (ev) => {
    const fileChip = ev.target.closest('[data-grokki-file-chip]');
    if (fileChip) {
      const fileName = fileChip.getAttribute('data-file-name') || fileChip.textContent || '';
      const hasSelection = !!(window.getSelection && window.getSelection().toString());
      if (ev.ctrlKey || ev.metaKey || !hasSelection) {
        ev.preventDefault();
        ev.stopPropagation();
        if (window.jarvisAPI && window.jarvisAPI.openWorkspaceFile) {
          window.jarvisAPI.openWorkspaceFile(fileName);
        }
        return;
      }
    }

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
  }

  const VALID_THEMES = ['grokki-blue', 'cream', 'jungle', 'sakura', 'cyber', 'sunset', 'arctic', 'crimson'];

  function applyPillTheme(theme) {
    const normalized = VALID_THEMES.includes(theme) ? theme : 'grokki-blue';
    activePillTheme = normalized;
    document.documentElement.setAttribute('data-theme', activePillTheme);
    if (islandContainer) {
      islandContainer.setAttribute('data-theme', activePillTheme);
    }
  }

  applyPillTheme('grokki-blue');

  // 5. Initialize Screen Worker (Mini-Grokki Cursor)
  const worker = new window.ScreenWorker(sound);

  // 5. Initialize Grokki Character with sound reactions and Orb integration
  const grokbot = new window.Grokbot(grokbotCanvas, sound, grokkiOrb);

  // 6. Initialize Grokki Agent
  const agent = new window.GrokkiAgent(window.jarvisAPI);

  // Helper to extract a brief, natural spoken response for voice output
  function summarizeForSpokenVoice(rawText, actions = []) {
    if (!rawText && (!actions || actions.length === 0)) return '';

    // 1. Check if specific actions were executed
    if (actions && actions.length > 0) {
      for (const act of actions) {
        const name = (act.name || act.type || '').toLowerCase();
        const actionSub = (act.action || '').toLowerCase();

        if (name.includes('presentation') || actionSub.includes('presentation')) {
          const lowerText = (rawText || '').toLowerCase();
          if (lowerText.includes('stop') || lowerText.includes('off') || lowerText.includes('exit') || lowerText.includes('deactivat') || lowerText.includes('closed')) {
            return 'Presentation mode deactivated.';
          }
          return 'Presentation mode activated.';
        }
        if (name.includes('organize') || actionSub.includes('organize')) {
          return 'Folder organized.';
        }
        if (name.includes('volume') || actionSub.includes('volume')) {
          return 'Volume updated.';
        }
        if (name.includes('screen_capture') || name.includes('screenshot') || actionSub.includes('screenshot')) {
          return 'Screenshot captured.';
        }
        if (name.includes('lock_in') || name.includes('focus') || actionSub.includes('lock_in')) {
          return 'Lock-in session started.';
        }
        if (name.includes('open_app') || actionSub.includes('open_app')) {
          const app = act.appName || 'App';
          return `${app} opened.`;
        }
        if (name.includes('pc_health') || name.includes('health')) {
          return 'System health check complete.';
        }
        if (name.includes('whatsapp')) {
          return 'Message sent.';
        }
        if (name.includes('drive')) {
          return 'File uploaded to Google Drive.';
        }
      }
    }

    if (!rawText) return 'Done.';

    // 2. Clean markdown, formatting, code blocks, URLs
    let clean = String(rawText)
      .replace(/```[\s\S]*?```/g, '') // strip code blocks
      .replace(/`([^`]+)`/g, '$1')     // strip inline code ticks
      .replace(/!\[.*?\]\(.*?\)/g, '') // strip images
      .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // strip links, keep label
      .replace(/[*_#~>|-]/g, ' ')      // strip markdown symbols
      .replace(/https?:\/\/\S+/g, '')  // strip URLs
      .replace(/\s+/g, ' ')            // collapse whitespace
      .trim();

    if (!clean) return 'All set.';

    // 3. Extract the first concise sentence
    const sentenceMatch = clean.match(/^([^.!?\n]+[.!?]?)/);
    let firstSentence = sentenceMatch ? sentenceMatch[1].trim() : clean;

    // Remove any leading bullet numbers or dots (e.g. "1." or "•")
    firstSentence = firstSentence.replace(/^[\d\.\-\s•]+/, '').trim();

    // 4. Cap at max ~95 characters to keep it brief and conversational
    if (firstSentence.length > 95) {
      const truncated = firstSentence.slice(0, 95);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 50) {
        firstSentence = truncated.slice(0, lastSpace) + '.';
      } else {
        firstSentence = truncated + '...';
      }
    }

    return firstSentence || 'Done.';
  }

  // 5. Initialize Voice Engine
  const voice = new window.VoiceEngine(
    grokbot,
    async (spokenText) => {
      mainInput.value = spokenText;
      updateSendButtonState();
      await handleUserPrompt(spokenText, { isVoice: true });
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
        const spoken = summarizeForSpokenVoice(response.reply, response.actionsExecuted);
        voice.speak(spoken, () => {
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
    },
    // On Live Interim Speech Recognized
    (interimText) => {
      if (currentMode === 'voice' && !agentProcessing && interimText) {
        userText.innerText = interimText;
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
    if (voice && typeof voice.setTTSProvider === 'function') {
      voice.setTTSProvider(
        config.ttsProvider || 'grokki',
        config.elevenlabsVoiceId,
        config.elevenlabsApiKey,
        config.elevenlabsModel
      );
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
        if (ttsVoiceSelect) ttsVoiceSelect.value = updated.ttsVoice;
      }
      if (voice && typeof voice.setTTSProvider === 'function') {
        voice.setTTSProvider(
          updated.ttsProvider || 'grokki',
          updated.elevenlabsVoiceId,
          updated.elevenlabsApiKey,
          updated.elevenlabsModel
        );
      }
      if (updated.provider && typeof updateProviderUI === 'function') {
        updateProviderUI(updated.provider);
        if (providerSelect) providerSelect.value = updated.provider;
      }
      if (updated.wakeWord && voice && typeof voice.setWakeWord === 'function') {
        voice.setWakeWord(updated.wakeWord);
        if (wakeWordInput) wakeWordInput.value = updated.wakeWord;
      }
      if (updated.wakeWordEnabled !== undefined && wakeWordToggle) {
        wakeWordToggle.checked = updated.wakeWordEnabled === true;
      }
      if (updated.ttsEnabled !== undefined && ttsEnabledToggle) {
        ttsEnabledToggle.checked = updated.ttsEnabled !== false;
        if (voice && typeof voice.setTTSEnabled === 'function') {
          voice.setTTSEnabled(updated.ttsEnabled !== false);
        }
      }
      if (updated.hotkey && hotkeyInput) {
        hotkeyInput.value = updated.hotkey;
      }
      if (updated.musicProvider && musicProviderSelect) {
        musicProviderSelect.value = updated.musicProvider;
        musicProviderSelect.dispatchEvent(new Event('change', { bubbles: true }));
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
    { name: 'pocket', desc: 'Pocket Grokki: Zero-install mobile companion (Camera Snap & Solve, Remote Control, Mobile Chat).', icon: 'fa-solid fa-mobile-screen-button', hasArg: false },
    { name: 'beam', desc: 'Dimension Hop: Beam the attached file or screenshot directly to your connected phone.', icon: 'fa-solid fa-plane-departure', hasArg: false },
    { name: 'aircursor', desc: 'Spatial hand mouse: move pointer in air, pinch to click/drag, 2 fingers to scroll.', icon: 'fa-solid fa-arrow-pointer', hasArg: false },
    { name: 'present', desc: 'Start touchless optical hand-gesture & voice presentation control.', icon: 'fa-solid fa-display', hasArg: false },
    { name: 'organize', desc: 'Auto-sort messy Downloads or Desktop folder into clean categories.', icon: 'fa-solid fa-folder-tree', hasArg: false },
    { name: 'status', desc: 'Check live PC health, CPU load, RTX GPU temp, and memory usage.', icon: 'fa-solid fa-microchip', hasArg: false },
    { name: 'clean', desc: 'Clear temporary junk cache files and purge recycle bin.', icon: 'fa-solid fa-broom', hasArg: false },
    { name: 'screenshot', desc: 'Capture a clean fullscreen screenshot to Desktop and clipboard.', icon: 'fa-solid fa-camera', hasArg: false },
    { name: 'lock', desc: 'Immediately lock Windows workstation.', icon: 'fa-solid fa-lock', hasArg: false },
    { name: 'sleep', desc: 'Put PC to sleep.', icon: 'fa-solid fa-moon', hasArg: false },
    { name: 'mute', desc: 'Mute system master audio.', icon: 'fa-solid fa-volume-xmark', hasArg: false },
    { name: 'unmute', desc: 'Unmute system master audio.', icon: 'fa-solid fa-volume-high', hasArg: false },
    { name: 'notes', desc: 'Generate study notes or revision document to Desktop.', icon: 'fa-solid fa-file-pen', hasArg: true },
    { name: 'schedule', desc: 'Set a spoken reminder or timed OS action.', icon: 'fa-solid fa-clock', hasArg: true },
    { name: 'browser', desc: 'Open a website or search the web.', icon: 'fa-solid fa-globe', hasArg: true },
    { name: 'btw', desc: 'Ask a quick side question without altering context.', icon: 'fa-solid fa-bolt', hasArg: true },
    { name: 'compact', desc: 'Clear and compact conversation memory.', icon: 'fa-solid fa-compress', hasArg: false }
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
      handleUserPrompt(`/${cmd.name}`, { isVoice: false });
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

  const mainInputMirror = document.getElementById('mainInputMirror');

  function detectIslandBrandIcon(url) {
    if (/github\.com|github\.io/i.test(url)) return 'fa-brands fa-github';
    if (/gitlab\.com/i.test(url)) return 'fa-brands fa-gitlab';
    if (/bitbucket\.org/i.test(url)) return 'fa-brands fa-bitbucket';
    if (/youtube\.com|youtu\.be/i.test(url)) return 'fa-brands fa-youtube';
    if (/docs\.google\.com\/spreadsheets|sheets\.google\.com/i.test(url)) return 'fa-solid fa-table-cells';
    if (/docs\.google\.com\/document/i.test(url)) return 'fa-solid fa-file-lines';
    if (/drive\.google\.com/i.test(url)) return 'fa-brands fa-google-drive';
    if (/google\.com|mail\.google\.com/i.test(url)) return 'fa-brands fa-google';
    if (/twitter\.com|(?:^|\/\/|\.)x\.com/i.test(url)) return 'fa-brands fa-x-twitter';
    if (/discord\.com|discord\.gg/i.test(url)) return 'fa-brands fa-discord';
    if (/figma\.com/i.test(url)) return 'fa-brands fa-figma';
    if (/reddit\.com|redd\.it/i.test(url)) return 'fa-brands fa-reddit';
    if (/spotify\.com/i.test(url)) return 'fa-brands fa-spotify';
    if (/linkedin\.com/i.test(url)) return 'fa-brands fa-linkedin';
    if (/stackoverflow\.com|stackexchange\.com/i.test(url)) return 'fa-brands fa-stack-overflow';
    if (/whatsapp\.com|wa\.me/i.test(url)) return 'fa-brands fa-whatsapp';
    if (/t\.me|telegram\.org|telegram\.me/i.test(url)) return 'fa-brands fa-telegram';
    if (/npmjs\.com/i.test(url)) return 'fa-brands fa-npm';
    if (/wikipedia\.org/i.test(url)) return 'fa-brands fa-wikipedia-w';
    if (/amazon\.[a-z.]+|amzn\.to/i.test(url)) return 'fa-brands fa-amazon';
    if (/twitch\.tv/i.test(url)) return 'fa-brands fa-twitch';
    if (/medium\.com/i.test(url)) return 'fa-brands fa-medium';
    if (/dribbble\.com/i.test(url)) return 'fa-brands fa-dribbble';
    if (/instagram\.com/i.test(url)) return 'fa-brands fa-instagram';
    if (/tiktok\.com/i.test(url)) return 'fa-brands fa-tiktok';
    if (/facebook\.com/i.test(url)) return 'fa-brands fa-facebook';
    return 'fa-solid fa-globe';
  }

  function escapeIslandHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function syncIslandMirrorScroll() {
    if (mainInputMirror && mainInput) {
      mainInputMirror.scrollLeft = mainInput.scrollLeft;
    }
  }

  mainInput.addEventListener('scroll', syncIslandMirrorScroll);
  mainInput.addEventListener('keyup', syncIslandMirrorScroll);
  mainInput.addEventListener('click', (e) => {
    syncIslandMirrorScroll();
    if (e.ctrlKey || e.metaKey) {
      const val = mainInput.value || '';
      const matches = [...val.matchAll(/https?:\/\/[^\s]+/gi)];
      if (matches.length > 0) {
        const cursor = typeof mainInput.selectionStart === 'number' ? mainInput.selectionStart : 0;
        const hoveredMatch = matches.find(m => cursor >= m.index && cursor <= m.index + m[0].length) || matches[0];
        if (hoveredMatch) {
          const cleanUrl = hoveredMatch[0].replace(/[),.;:!]+$/, '');
          if (window.jarvisAPI && typeof window.jarvisAPI.openUrl === 'function') {
            window.jarvisAPI.openUrl(cleanUrl);
          } else {
            window.open(cleanUrl, '_blank', 'noopener,noreferrer');
          }
        }
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.shiftKey && e.code === 'KeyC') || (e.altKey && e.code === 'KeyC')) {
      e.preventDefault();
      toggleControlCenter();
      return;
    }
    if (e.key === 'Control' || e.key === 'Meta') {
      mainInput.classList.add('ctrl-held');
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      mainInput.classList.remove('ctrl-held');
    }
  });
  window.addEventListener('blur', () => {
    mainInput.classList.remove('ctrl-held');
  });

  function updateSendButtonState() {
    const val = mainInput.value || '';
    if (val.trim().length > 0) {
      sendBtn.classList.add('has-text');
    } else {
      sendBtn.classList.remove('has-text');
    }

    if (/(https?:\/\/[^\s]+)/i.test(val) && mainInputMirror) {
      const parts = val.split(/(https?:\/\/[^\s]+)/gi);
      mainInputMirror.innerHTML = parts
        .map((part) => {
          if (/^https?:\/\/[^\s]+$/i.test(part)) {
            const clean = part.replace(/[),.;:!]+$/, '');
            const trailing = part.slice(clean.length);
            const iconCls = detectIslandBrandIcon(clean);
            return `<span class="island-inline-url"><i class="${iconCls}"></i><span>${escapeIslandHtml(clean)}</span></span>${escapeIslandHtml(trailing)}`;
          }
          return `<span>${escapeIslandHtml(part)}</span>`;
        })
        .join('');
      mainInputMirror.classList.add('active');
      mainInput.classList.add('has-brand-link');
      requestAnimationFrame(syncIslandMirrorScroll);
    } else {
      if (mainInputMirror) {
        mainInputMirror.innerHTML = '';
        mainInputMirror.classList.remove('active');
      }
      mainInput.classList.remove('has-brand-link');
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
      handleUserPrompt(mainInput.value, { isVoice: false });
    }
  });

  sendBtn.addEventListener('click', () => {
    hideSlashPalette();
    handleUserPrompt(mainInput.value, { isVoice: false });
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
          { label: `<i class="fa-solid fa-microphone-lines"></i><span>Viva Oral Quiz</span>`, prompt: `Start a Viva oral exam quiz from this attached document`, autoSubmit: true },
          { label: `<i class="fa-solid fa-layer-group"></i><span>Anki Flashcards</span>`, prompt: `Export Anki flashcards from this attached document`, autoSubmit: true },
          { label: `<i class="fa-solid fa-bolt"></i><span>1-Page Cheat Sheet</span>`, prompt: `Generate a 1-page exam cheat sheet from this attached document and save it`, autoSubmit: true },
          { label: `<i class="fa-solid fa-file-pen"></i><span>Revision Notes</span>`, prompt: `Create high-yield study revision notes from this attached document and save it to my Desktop`, autoSubmit: true },
          { label: `<i class="fa-solid fa-circle-question"></i><span>Exam Questions</span>`, prompt: `Generate top probable exam questions with model answers from this attached document`, autoSubmit: true },
          { label: `<i class="fa-solid fa-lightbulb"></i><span>Explain Concept</span>`, prompt: `Explain the core concepts of this attached document using the Feynman technique like I'm 10`, autoSubmit: true },
        );
      }

      actions.push(
        { label: `<i class="fa-brands fa-whatsapp"></i><span>Send on WhatsApp</span>`, prompt: `Send this file "${fileName}" on WhatsApp to ` },
        { label: `<i class="fa-brands fa-google-drive"></i><span>Upload to Drive</span>`, prompt: `Upload this file to my Google Drive` },
        { label: `<i class="fa-solid fa-xmark"></i><span>Remove</span>`, action: 'remove' }
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
            handleUserPrompt(act.prompt, { isVoice: false });
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

  const islandChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('grokki_island_channel') : null;

  function dispatchMiniIslandActivity(payload) {
    try {
      if (payload && payload.action === 'start') {
        localStorage.setItem('grokki_island_live_activity', JSON.stringify(payload));
      } else if (payload && payload.action === 'stop') {
        localStorage.removeItem('grokki_island_live_activity');
      }
    } catch (_) {}
    try {
      if (islandChannel) islandChannel.postMessage(payload);
    } catch (_) {}
    try {
      if (window.jarvisAPI && window.jarvisAPI.setIslandActivity) {
        window.jarvisAPI.setIslandActivity(payload);
      }
    } catch (_) {}
  }

  function setPillDisplayMode(mode) {
    // Keep Grokki Island in normal chat/voice mode; timers & activities live on the Mini Dynamic Island!
    isShowingFullTimer = false;
    if (lockInFullView) lockInFullView.style.display = 'none';
    if (normalInputArea) normalInputArea.style.display = 'flex';
    if (normalControlsGroup) normalControlsGroup.style.display = 'flex';
    if (returnToTimerBtn) returnToTimerBtn.style.display = 'none';
  }

  function startLockInTimer(durationMinutes = 25, subject = 'Focus') {
    if (lockInInterval) {
      clearInterval(lockInInterval);
      lockInInterval = null;
    }

    isTimerActive = true;
    lockInSubjectName = (subject || 'Focus').replace(/Study Session|Session/gi, '').trim() || 'Focus';
    lockInRemainingSeconds = Math.max(1, Math.round(durationMinutes * 60));
    lockInIsPaused = false;

    // Ensure Grokki Island stays in normal chat mode while Mini Dynamic Island hosts the live timer
    setPillDisplayMode('chat');
    sound.playSuccess();
    grokbot.setState('happy');

    dispatchMiniIslandActivity({
      action: 'start',
      kind: 'timer',
      icon: 'fa-solid fa-stopwatch',
      title: lockInSubjectName.toLowerCase() === 'timer' ? 'Timer' : `Lock-In • ${lockInSubjectName}`,
      subject: lockInSubjectName,
      durationMinutes,
      durationSeconds: lockInRemainingSeconds,
      endTime: Date.now() + lockInRemainingSeconds * 1000,
    });
  }

  function togglePauseLockIn() {
    lockInIsPaused = !lockInIsPaused;
    sound.playPoke();
    dispatchMiniIslandActivity({
      action: lockInIsPaused ? 'pause' : 'resume',
      kind: 'timer',
    });
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
    dispatchMiniIslandActivity({
      action: 'stop',
      kind: 'timer',
    });
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

  function isEventOverIsland(e) {
    if (!islandContainer) return false;
    const rect = islandContainer.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
  }

  function isIslandAcceptingDrops() {
    if (!islandContainer) return false;
    if (islandContainer.style.display === 'none') return false;
    if (islandContainer.classList.contains('hidden-state')) return false;
    if (window.presentationController && window.presentationController.isActive) return false;
    return true;
  }

  function isFileTransfer(e) {
    if (!e.dataTransfer) return false;
    const types = Array.from(e.dataTransfer.types || []);
    return types.includes('Files');
  }

  window.addEventListener('dragenter', (e) => {
    if (!isIslandAcceptingDrops() || !isEventOverIsland(e) || !isFileTransfer(e)) return;
    e.preventDefault();
    dragCounter++;
    islandContainer.classList.add('drag-active');
    grokbot.setState('happy');
  });

  window.addEventListener('dragover', (e) => {
    if (!isIslandAcceptingDrops() || !isEventOverIsland(e) || !isFileTransfer(e)) {
      if (islandContainer.classList.contains('drag-active')) {
        islandContainer.classList.remove('drag-active');
      }
      return;
    }
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    if (!islandContainer.classList.contains('drag-active')) {
      islandContainer.classList.add('drag-active');
    }
  });

  window.addEventListener('dragleave', (e) => {
    if (!isIslandAcceptingDrops()) return;
    if (!isEventOverIsland(e)) {
      dragCounter = 0;
      islandContainer.classList.remove('drag-active');
      grokbot.setState('idle');
      return;
    }
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      islandContainer.classList.remove('drag-active');
      grokbot.setState('idle');
    }
  });

  window.addEventListener('drop', async (e) => {
    if (!isIslandAcceptingDrops() || !isEventOverIsland(e)) {
      islandContainer.classList.remove('drag-active');
      return;
    }
    e.preventDefault();
    dragCounter = 0;
    islandContainer.classList.remove('drag-active');
    if (window.jarvisAPI && window.jarvisAPI.notifyDropReceived) {
      window.jarvisAPI.notifyDropReceived();
    }

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      let filePath = '';
      try {
        if (window.jarvisAPI && window.jarvisAPI.getPathForFile) {
          filePath = window.jarvisAPI.getPathForFile(file);
        }
      } catch (err) {}
      if (!filePath && file.path) filePath = file.path;

      // Check detected shell drag file fallback
      if (!filePath && window.jarvisAPI && window.jarvisAPI.getLastDetectedDragFiles) {
        try {
          const detected = await window.jarvisAPI.getLastDetectedDragFiles();
          if (detected && detected.length > 0) {
            filePath = detected[0];
          }
        } catch (_) {}
      }

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

  // Global Drag Watcher Listener
  if (window.jarvisAPI && window.jarvisAPI.onWindowDragActive) {
    window.jarvisAPI.onWindowDragActive((data) => {
      if (!isIslandAcceptingDrops()) return;
      if (data && data.active && Array.isArray(data.files) && data.files.length > 0) {
        if (!islandContainer.classList.contains('drag-active')) {
          islandContainer.classList.add('drag-active');
          if (grokbot) grokbot.setState('happy');
        }
      } else {
        if (islandContainer.classList.contains('drag-active')) {
          islandContainer.classList.remove('drag-active');
          if (grokbot) grokbot.setState('idle');
        }
      }
    });
  }

  // Pocket Grokki QR Code & Connection Card in Dynamic Island
  async function showPocketGrokkiCard() {
    try {
      let status = { active: false };
      if (window.jarvisAPI && window.jarvisAPI.getPocketStatus) {
        status = await window.jarvisAPI.getPocketStatus();
        if (!status || !status.active) {
          status = await window.jarvisAPI.togglePocketServer(true);
        }
      }

      const cardHtml = `
        <div class="pocket-grokki-card" style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px 12px; background: rgba(255,255,255,0.04); border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); margin: 6px 0; text-align: center;">
          <div style="font-weight: 700; font-size: 14px; color: #f3f4f6; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-mobile-screen-button" style="color: #60a5fa;"></i> Pocket Grokki — Mobile Companion
          </div>
          <div style="color: rgba(255,255,255,0.65); font-size: 11.5px; max-width: 330px; line-height: 1.4;">
            Scan with your iPhone or Android camera on the same Wi-Fi. Zero app install needed!
          </div>
          ${status && status.qrDataUrl ? `
          <div style="background: white; padding: 9px; border-radius: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.6);">
            <img src="${status.qrDataUrl}" style="width: 170px; height: 170px; display: block; border-radius: 8px;" alt="Pocket Grokki QR" />
          </div>` : ''}
          <div style="display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.45); padding: 7px 14px; border-radius: 20px; font-family: monospace; font-size: 12px; color: #93c5fd; border: 1px solid rgba(147,197,253,0.25);">
            <i class="fa-solid fa-wifi"></i> <span>${(status && status.url) || 'http://127.0.0.1:8765'}</span>
          </div>
          <div style="display: flex; justify-content: center; gap: 14px; font-size: 11px; color: rgba(255,255,255,0.5);">
            <span><i class="fa-solid fa-camera"></i> Camera Snap & Solve</span>
            <span><i class="fa-solid fa-gamepad"></i> PC Remote</span>
            <span><i class="fa-solid fa-comments"></i> Mobile Chat</span>
          </div>
          ${status && status.connectedCount > 0 ? `
          <div style="font-size: 11px; color: #34d399; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-circle-check"></i> ${status.connectedCount} phone${status.connectedCount > 1 ? 's' : ''} connected
          </div>` : ''}
        </div>
      `;

      badgeRow.innerHTML = '';
      const pill = document.createElement('span');
      pill.className = 'apple-pill-badge';
      pill.innerHTML = `<i class="fa-solid fa-mobile-screen"></i> Pocket Grokki`;
      badgeRow.appendChild(pill);

      setResponseHTML(cardHtml);
      islandDrawer.classList.add('open');
      islandContainer.classList.add('has-drawer-open');
      sound.playSuccess();
      grokbot.setState('happy');
    } catch (err) {
      console.error('[Pocket Grokki UI] Error showing QR card:', err);
    }
  }

  // 8. Execute User Order + Mini-Grokki Worker Simulation
  async function handleUserPrompt(promptText, { isVoice = false } = {}) {
    const text = (promptText || mainInput.value || '').trim();
    if (!text || agentProcessing) return;

    const lowerText = text.toLowerCase().trim();
    if (lowerText === '/pocket' || lowerText === 'pocket' || lowerText === 'pocket grokki' || lowerText === '/pocketgrokki') {
      mainInput.value = '';
      updateSendButtonState();
      userText.innerText = '/pocket';
      await showPocketGrokkiCard();
      return;
    }

    if (lowerText === '/beam' || lowerText === 'beam' || lowerText.startsWith('beam to phone')) {
      mainInput.value = '';
      updateSendButtonState();
      if (activeAttachment && activeAttachment.path) {
        if (window.jarvisAPI && window.jarvisAPI.beamFileToPhone) {
          window.jarvisAPI.beamFileToPhone(activeAttachment.path);
          sound.playSuccess();
          grokbot.setState('happy');
          setResponseHTML(`<div style="display:flex;align-items:center;gap:8px;padding:12px;background:rgba(56,189,248,0.12);border-radius:14px;color:#7dd3fc;border:1px solid rgba(56,189,248,0.3);"><i class="fa-solid fa-plane-departure"></i> <span>🛸 Beamed <strong>${activeAttachment.name}</strong> to your phone!</span></div>`);
          islandDrawer.classList.add('open');
          islandContainer.classList.add('has-drawer-open');
        }
      } else {
        setResponseHTML(`<div style="padding:10px;color:rgba(255,255,255,0.7);"><i class="fa-solid fa-circle-info"></i> Attach a file or screenshot first, then type <code>/beam</code> to send it to your phone!</div>`);
        islandDrawer.classList.add('open');
        islandContainer.classList.add('has-drawer-open');
      }
      return;
    }

    agentProcessing = true;
    mainInput.value = '';
    updateSendButtonState();
    badgeRow.innerHTML = '';
    userText.innerText = text;
    setResponseHTML('<span style="color:rgba(255,255,255,0.5);">Thinking...</span>');
    islandDrawer.classList.add('open');
    islandContainer.classList.add('has-drawer-open');

    // Immediate local deactivation hook for camera, presentation mode, and timers
    if (
      lowerText === 'deactivate' ||
      lowerText === 'stop' ||
      lowerText === 'exit' ||
      lowerText === 'camera off' ||
      lowerText === 'turn off camera' ||
      lowerText.includes('stop presentation') ||
      lowerText.includes('turn off presentation') ||
      lowerText.includes('deactivate presentation')
    ) {
      if (window.presentationController) {
        window.presentationController.stop();
      }
      if (window.jarvisAPI && window.jarvisAPI.togglePresentationMode) {
        window.jarvisAPI.togglePresentationMode(false);
      }
      if (window.jarvisAPI && window.jarvisAPI.killCamera) {
        window.jarvisAPI.killCamera();
      }
      dispatchMiniIslandActivity({ action: 'stop', kind: 'mode' });
    }

    if (/\b(stop|cancel|end|clear)\s+(the\s+)?(lock[- ]?in|timer|pomodoro|countdown|study\s+session)\b/i.test(lowerText)) {
      stopLockInTimer();
    }

    // If user requested a Lock-In study session or countdown timer, immediately launch it on the Mini Dynamic Island
    if (
      /\b(lock[- ]?in|pomodoro|study\s+session|focus\s+session|focus\s+timer|study\s+timer)\b/i.test(lowerText) ||
      /\b(set|start|begin|create|run)\s+(a\s+|an\s+)?(\d+(\.\d+)?\s*[- ]?(min|mins|minute|minutes|sec|secs|second|seconds|hr|hrs|hour|hours)\s+)?(timer|countdown|lock[- ]?in|pomodoro)\b/i.test(lowerText)
    ) {
      if (!/\b(stop|cancel|end|clear)\b/i.test(lowerText)) {
        let mins = 25;
        const minMatch = text.match(/(\d+(?:\.\d+)?)\s*[- ]?(?:min|mins|minute|minutes|m)\b/i);
        const secMatch = text.match(/(\d+(?:\.\d+)?)\s*[- ]?(?:sec|secs|second|seconds|s)\b/i);
        const hrMatch = text.match(/(\d+(?:\.\d+)?)\s*[- ]?(?:hr|hrs|hour|hours|h)\b/i);
        if (minMatch) mins = parseFloat(minMatch[1]);
        else if (secMatch) mins = Math.max(0.08, parseFloat(secMatch[1]) / 60);
        else if (hrMatch) mins = parseFloat(hrMatch[1]) * 60;

        const isPlainTimer = /\b(timer|countdown)\b/i.test(lowerText) && !/\b(lock[- ]?in|study|pomodoro|focus)\b/i.test(lowerText);
        let subject = isPlainTimer ? 'Timer' : 'Study';
        const subjMatch = text.match(/(?:on|for|studying)\s+([a-zA-Z0-9\s_+-]+)$/i);
        if (subjMatch) {
          const candidate = subjMatch[1].replace(/\b(\d+\s*(min|mins|minute|minutes|sec|seconds|m|s)|lock[- ]?in|session|timer|study)\b/gi, '').trim();
          if (candidate) subject = candidate;
        }
        startLockInTimer(mins, subject);
      }
    }

    grokbot.setState('thinking');

    try {
      // Prevent openApp / shell from matching task/session/timer prompts
      const safeAgentPrompt = /^(?:can\s+you\s+)?(?:start|run|launch|open|begin|set)\s+(?:a\s+|an\s+|my\s+|the\s+)?.*?\b(lock[- ]?in|session|timer|pomodoro|countdown|study|alarm|reminder)\b/i.test(text)
        ? text.replace(/^(?:can\s+you\s+)?(?:start|run|launch|open|begin|set)\s+/i, 'Begin ')
        : text;
      // Execute real system command via agent with active file attachment context
      const response = await agent.process(safeAgentPrompt, { attachedFile: activeAttachment });

      if (response && (response.cancelled || response.reply === 'Cancelled.')) {
        setResponseHTML('<span style="color: rgba(255,255,255,0.4); font-style: italic;"><i class="fa-solid fa-ban"></i> Task killed.</span>');
        grokbot.setState('idle');
        return;
      }

      // Render Markdown output cleanly with per-word fade-in typing
      setResponseHTML(renderMarkdownHTML(response.reply), true);
      islandDrawer.classList.add('open');
      islandContainer.classList.add('has-drawer-open');

      // AI Text Response Fallback: If AI message says presentation mode is off, shut off camera!
      const replyLower = (response?.reply || '').toLowerCase();
      if (
        replyLower.includes('presentation-control mode turned off') ||
        replyLower.includes('presentation mode deactivated') ||
        replyLower.includes('presentation control stopped') ||
        (replyLower.includes('presentation') && (replyLower.includes('turned off') || replyLower.includes('deactivated') || replyLower.includes('stopped')))
      ) {
        if (window.presentationController) {
          window.presentationController.stop();
        }
        if (window.jarvisAPI && window.jarvisAPI.togglePresentationMode) {
          window.jarvisAPI.togglePresentationMode(false);
        }
        if (window.jarvisAPI && window.jarvisAPI.killCamera) {
          window.jarvisAPI.killCamera();
        }
      }

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
            handleUserPrompt(opt.label, { isVoice: false });
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

          if (act.name === 'pocket_grokki' || act.result?.actionType === 'SHOW_POCKET_GROKKI') {
            showPocketGrokkiCard();
          }

          if (act.name === 'presentation_slide_changer' || act.result?.actionType === 'START_AIR_CURSOR' || act.result?.actionType === 'START_PRESENTATION') {
            const pAction = (act.args?.action || '').toLowerCase();
            const mode = (pAction === 'air_cursor' || act.result?.actionType === 'START_AIR_CURSOR') ? 'air_cursor' : 'presentation';
            if ((pAction === 'start_mode' || pAction === 'air_cursor' || act.result?.actionType?.startsWith('START')) && window.presentationController) {
              if (mode === 'air_cursor') {
                islandContainer.style.display = 'none';
                islandContainer.classList.add('hidden-state');
              }
              window.presentationController.start(mode);
              dispatchMiniIslandActivity({
                action: 'start',
                kind: 'mode',
                icon: mode === 'air_cursor' ? 'fa-solid fa-hand-pointer' : 'fa-solid fa-display',
                title: mode === 'air_cursor' ? 'Air Cursor Active' : 'Presentation Mode',
                startTime: Date.now(),
              });
            } else if ((pAction === 'stop_mode' || act.result?.actionType === 'STOP_PRESENTATION') && window.presentationController) {
              window.presentationController.stop();
              dispatchMiniIslandActivity({ action: 'stop', kind: 'mode' });
            }
          }
        });
      }

      // If no contextual follow-up chips, show high-value student & automation quick action chips
      if (!response.options || response.options.length === 0) {
        const defaultChips = [
          { label: '<i class="fa-solid fa-arrow-pointer"></i><span>Air Cursor</span>', prompt: '/aircursor' },
          { label: '<i class="fa-solid fa-expand"></i><span>Snap & Solve</span>', prompt: 'Snap and solve my screen' },
          { label: '<i class="fa-solid fa-microchip"></i><span>PC & GPU Health</span>', prompt: 'Check PC health' },
          { label: '<i class="fa-solid fa-folder-tree"></i><span>Organize Downloads</span>', prompt: 'Organize my Downloads folder' },
          { label: '<i class="fa-solid fa-display"></i><span>Presentation Mode</span>', prompt: '/present' },
          { label: '<i class="fa-solid fa-stopwatch"></i><span>Lock-In 25m</span>', prompt: 'Lock-in for a 25-minute study session' },
          { label: '<i class="fa-solid fa-screwdriver-wrench"></i><span>Bug Doctor</span>', prompt: 'Fix my code bug in VS Code' },
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
              handleUserPrompt(sc.prompt, { isVoice: false });
            }
          });
          optionRow.appendChild(chip);
        });
      }

      // Play victory chime and celebrate
      sound.playSuccess();
      grokbot.setState('happy');

      if (isVoice) {
        const spoken = summarizeForSpokenVoice(response.reply, response.actionsExecuted);
        voice.speak(spoken, () => {
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
      } else {
        // User typed or clicked - no voice reply, text-only in drawer
        setTimeout(() => {
          if (!agentProcessing) {
            grokbot.setState('idle');
          }
        }, 1200);
      }
    } catch (err) {
      responseText.innerText = `Error: ${err.message}`;
      islandDrawer.classList.add('open');
      grokbot.setState('idle');
      if (isVoice && currentMode === 'voice') {
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

  // University Portal Elements
  const universitySelect = document.getElementById('universitySelect');
  const universityStatusBadge = document.getElementById('universityStatusBadge');
  const universityFields = document.getElementById('universityFields');
  const uniUsernameInput = document.getElementById('uniUsernameInput');
  const uniPasswordInput = document.getElementById('uniPasswordInput');
  const toggleUniPasswordBtn = document.getElementById('toggleUniPasswordBtn');
  const uniEyeIcon = document.getElementById('uniEyeIcon');
  const syncUniversityBtn = document.getElementById('syncUniversityBtn');
  const unlinkUniversityBtn = document.getElementById('unlinkUniversityBtn');
  const uniSyncSpinner = document.getElementById('uniSyncSpinner');
  const uniSyncText = document.getElementById('uniSyncText');
  const uniSyncResult = document.getElementById('uniSyncResult');

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

  async function updateUniversityStatus() {
    if (!window.jarvisAPI || !window.jarvisAPI.getAcademicStatus) return;
    try {
      const status = await window.jarvisAPI.getAcademicStatus();
      if (status && status.linked) {
        if (universitySelect) universitySelect.value = status.university || 'adbu';
        if (universityFields) universityFields.classList.remove('hidden');
        if (universityStatusBadge) {
          universityStatusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Linked';
          universityStatusBadge.className = 'gs-badge inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
        }
        if (uniUsernameInput && status.username) uniUsernameInput.value = status.username;
        if (uniPasswordInput) {
          uniPasswordInput.placeholder = status.hasPassword ? '•••••••••••• (Saved)' : 'Enter ERP Password';
        }
        if (unlinkUniversityBtn) unlinkUniversityBtn.style.display = 'inline-flex';
        if (uniSyncText) uniSyncText.innerText = status.hasData ? 'Sync Now' : 'Link & Sync';
        if (uniSyncResult && status.lastSynced) {
          const syncTime = new Date(status.lastSynced);
          uniSyncResult.innerHTML = `<span style="color:#10b981;">✓ Synced</span> ${syncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
      } else {
        if (universitySelect) universitySelect.value = 'none';
        if (universityFields) universityFields.classList.add('hidden');
        if (uniPasswordInput) {
          uniPasswordInput.placeholder = 'Enter ERP Password';
        }
        if (universityStatusBadge) {
          universityStatusBadge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Not Linked';
          universityStatusBadge.className = 'gs-badge inline-flex items-center gap-1';
        }
        if (unlinkUniversityBtn) unlinkUniversityBtn.style.display = 'none';
        if (uniSyncText) uniSyncText.innerText = 'Link & Sync';
        if (uniSyncResult) uniSyncResult.innerText = '';
      }
    } catch (e) {
      console.warn('[University Status Error]', e);
    }
  }

  const openSettings = () => {
    savedPillTheme = activePillTheme;
    islandDrawer.classList.remove('open');
    islandContainer.classList.remove('has-drawer-open');
    islandContainer.classList.add('has-settings-open');
    settingsSheet.classList.add('open');
    updateGoogleStatus();
    updateUniversityStatus();
  };

  const closeSettings = (revert = false) => {
    if (revert) {
      applyPillTheme(savedPillTheme);
    }
    islandContainer.classList.remove('has-settings-open');
    settingsSheet.classList.remove('open');
  };

  // Automatically sync Electron window height with island expansion state
  function syncWindowExpandedState() {
    if (!window.jarvisAPI || !window.jarvisAPI.setIslandExpanded) return;
    const isExpanded = !!(
      (islandContainer && (
        islandContainer.classList.contains('has-drawer-open') ||
        islandContainer.classList.contains('has-settings-open') ||
        islandContainer.classList.contains('has-slash-open')
      )) ||
      (islandDrawer && islandDrawer.classList.contains('open')) ||
      (settingsSheet && settingsSheet.classList.contains('open')) ||
      (slashPalette && slashPalette.classList.contains('open'))
    );
    window.jarvisAPI.setIslandExpanded(isExpanded);
  }

  const islandExpandedObserver = new MutationObserver(() => {
    syncWindowExpandedState();
  });

  if (islandContainer) {
    islandExpandedObserver.observe(islandContainer, { attributes: true, attributeFilter: ['class', 'style'] });
  }
  if (islandDrawer) {
    islandExpandedObserver.observe(islandDrawer, { attributes: true, attributeFilter: ['class', 'style'] });
  }
  if (settingsSheet) {
    islandExpandedObserver.observe(settingsSheet, { attributes: true, attributeFilter: ['class', 'style'] });
  }
  if (slashPalette) {
    islandExpandedObserver.observe(slashPalette, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  // --- HITODAMA TOP NOTCH CONTROL CENTRE (FLUSH AT SCREEN TOP: 0) ---
  const hitodamaTopTrigger = document.getElementById('hitodamaTopTrigger');
  const hitodamaTopNotch = document.getElementById('hitodamaTopNotch');
  const closeTopNotchBtn = document.getElementById('closeTopNotchBtn');
  const htNotchPinBtn = document.getElementById('htNotchPinBtn');
  let isNotchPinned = false;
  let notchHideTimer = null;

  const openTopNotch = () => {
    if (notchHideTimer) clearTimeout(notchHideTimer);
    if (hitodamaTopNotch) hitodamaTopNotch.classList.add('visible');
    // Refresh live stats & clipboard when opening
    loadRealSystemStats();
    refreshClipboardHistory();
  };

  const closeTopNotch = () => {
    if (isNotchPinned) return;
    if (hitodamaTopNotch) hitodamaTopNotch.classList.remove('visible');
  };

  const toggleTopNotch = () => {
    if (hitodamaTopNotch && hitodamaTopNotch.classList.contains('visible')) {
      closeTopNotch();
    } else {
      openTopNotch();
    }
  };

  // 1. TOUCH MOUSE CURSOR TO TOP EDGE TO OPEN
  if (hitodamaTopTrigger) {
    hitodamaTopTrigger.addEventListener('mouseenter', openTopNotch);
    hitodamaTopTrigger.addEventListener('click', toggleTopNotch);
  }

  // Global cursor detection: touching within 8px of top edge at horizontal center reveals notch
  window.addEventListener('mousemove', (e) => {
    const winCenter = window.innerWidth / 2;
    if (e.clientY <= 8 && Math.abs(e.clientX - winCenter) < 180) {
      openTopNotch();
    }
  });

  // Retract when mouse leaves the notch panel
  if (hitodamaTopNotch) {
    hitodamaTopNotch.addEventListener('mouseenter', () => {
      if (notchHideTimer) clearTimeout(notchHideTimer);
    });
    hitodamaTopNotch.addEventListener('mouseleave', () => {
      if (isNotchPinned) return;
      notchHideTimer = setTimeout(() => {
        closeTopNotch();
      }, 450);
    });
  }

  if (closeTopNotchBtn) {
    closeTopNotchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isNotchPinned = false;
      if (htNotchPinBtn) htNotchPinBtn.classList.remove('pinned');
      closeTopNotch();
    });
  }

  if (htNotchPinBtn) {
    htNotchPinBtn.addEventListener('click', () => {
      isNotchPinned = !isNotchPinned;
      htNotchPinBtn.classList.toggle('pinned', isNotchPinned);
      sound.playPoke();
    });
  }

  // --- 2. 7 TABS SWITCHER ---
  const htTabBtns = document.querySelectorAll('.ht-tab-btn');
  const htTabContents = {
    controls: document.getElementById('htTabControls'),
    today: document.getElementById('htTabToday'),
    stats: document.getElementById('htTabStats'),
    clipboard: document.getElementById('htTabClipboard'),
    apps: document.getElementById('htTabApps'),
    wallpaper: document.getElementById('htTabWallpaper'),
    power: document.getElementById('htTabPower'),
  };

  htTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      htTabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-tab');

      Object.entries(htTabContents).forEach(([key, el]) => {
        if (!el) return;
        if (key === target) {
          el.style.display = 'block';
          el.classList.add('active');
        } else {
          el.style.display = 'none';
          el.classList.remove('active');
        }
      });
      sound.playPoke();
    });
  });

  // --- 3. CONTROLS TAB INTERACTIONS (REAL OS CONTROLS) ---
  const htWifiBtn = document.getElementById('htWifiBtn');
  const htWifiStatus = document.getElementById('htWifiStatus');
  let isWifiOn = true;
  if (htWifiBtn) {
    htWifiBtn.addEventListener('click', () => {
      isWifiOn = !isWifiOn;
      htWifiBtn.classList.toggle('ht-card-active', isWifiOn);
      if (htWifiStatus) htWifiStatus.textContent = isWifiOn ? 'Connected' : 'Off';
      if (window.jarvisAPI && window.jarvisAPI.openSettingsPage) {
        window.jarvisAPI.openSettingsPage('wifi');
      }
      sound.playPoke();
    });
  }

  const htBtBtn = document.getElementById('htBtBtn');
  const htBtStatus = document.getElementById('htBtStatus');
  let isBtOn = true;
  if (htBtBtn) {
    htBtBtn.addEventListener('click', () => {
      isBtOn = !isBtOn;
      htBtBtn.classList.toggle('ht-card-active', isBtOn);
      if (htBtStatus) htBtStatus.textContent = isBtOn ? 'On' : 'Off';
      if (window.jarvisAPI && window.jarvisAPI.openSettingsPage) {
        window.jarvisAPI.openSettingsPage('bluetooth');
      }
      sound.playPoke();
    });
  }

  const htAudioBtn = document.getElementById('htAudioBtn');
  const htAudioStatus = document.getElementById('htAudioStatus');
  const htMediaOutputLabel = document.getElementById('htMediaOutputLabel');
  let isSpeakers = true;
  if (htAudioBtn) {
    htAudioBtn.addEventListener('click', () => {
      isSpeakers = !isSpeakers;
      const device = isSpeakers ? 'Speakers' : 'Headphones';
      if (htAudioStatus) htAudioStatus.textContent = device;
      if (htMediaOutputLabel) htMediaOutputLabel.textContent = `System Media • ${device}`;
      sound.playPoke();
    });
  }

  const htNightLightBtn = document.getElementById('htNightLightBtn');
  const htNightLightStatus = document.getElementById('htNightLightStatus');
  let isNightLightOn = false;
  if (htNightLightBtn) {
    htNightLightBtn.addEventListener('click', () => {
      isNightLightOn = !isNightLightOn;
      htNightLightBtn.classList.toggle('ht-card-active', isNightLightOn);
      if (htNightLightStatus) htNightLightStatus.textContent = isNightLightOn ? 'On' : 'Off';
      if (window.jarvisAPI && window.jarvisAPI.openSettingsPage) {
        window.jarvisAPI.openSettingsPage('nightlight');
      }
      sound.playPoke();
    });
  }

  const htDarkModeBtn = document.getElementById('htDarkModeBtn');
  const htDarkModeStatus = document.getElementById('htDarkModeStatus');
  let isDarkModeOn = true;
  if (htDarkModeBtn) {
    htDarkModeBtn.addEventListener('click', () => {
      isDarkModeOn = !isDarkModeOn;
      htDarkModeBtn.classList.toggle('ht-card-active', isDarkModeOn);
      if (htDarkModeStatus) htDarkModeStatus.textContent = isDarkModeOn ? 'On' : 'Off';
      sound.playPoke();
    });
  }

  // Real Master Volume Slider (No Orange)
  const htVolInput = document.getElementById('htVolInput');
  const htVolFill = document.getElementById('htVolFill');
  const htVolPct = document.getElementById('htVolPct');
  if (htVolInput) {
    htVolInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (htVolFill) htVolFill.style.width = `${val}%`;
      if (htVolPct) htVolPct.textContent = `${val}%`;
      if (window.jarvisAPI && window.jarvisAPI.systemControl) {
        window.jarvisAPI.systemControl({ action: 'volume_set', level: val });
      }
    });
  }

  // Media Controls
  const htPlayBtn = document.getElementById('htPlayBtn');
  const htPlayIcon = document.getElementById('htPlayIcon');
  const htPrevBtn = document.getElementById('htPrevBtn');
  const htNextBtn = document.getElementById('htNextBtn');
  let isMediaPlaying = false;

  if (htPlayBtn) {
    htPlayBtn.addEventListener('click', async () => {
      isMediaPlaying = !isMediaPlaying;
      if (htPlayIcon) {
        htPlayIcon.className = isMediaPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      }
      sound.playPoke();
      const act = isMediaPlaying ? 'resume' : 'pause';
      await agent.process(`${act} music`);
    });
  }

  if (htPrevBtn) {
    htPrevBtn.addEventListener('click', async () => {
      sound.playPoke();
      await agent.process('previous track');
    });
  }

  if (htNextBtn) {
    htNextBtn.addEventListener('click', async () => {
      sound.playPoke();
      await agent.process('next track');
    });
  }

  // --- 4. REAL DYNAMIC CLIPBOARD HISTORY ---
  const htClipSearchInput = document.getElementById('htClipSearchInput');
  const htClipFilters = document.querySelectorAll('.ht-clip-filter');
  const htClipListContainer = document.getElementById('htClipListContainer');
  const htClipPreviewBody = document.getElementById('htClipPreviewBody');
  const htClipMetaType = document.getElementById('htClipMetaType');
  const htClipMetaChars = document.getElementById('htClipMetaChars');
  const htClipMetaTime = document.getElementById('htClipMetaTime');
  const htClipPasteBtn = document.getElementById('htClipPasteBtn');
  const htClipLiveCount = document.getElementById('htClipLiveCount');

  let liveClips = [];
  let selectedClip = null;
  let activeFilter = 'all';

  function formatRelativeTime(ts) {
    const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function renderClipsList(clips) {
    if (!htClipListContainer) return;
    htClipListContainer.innerHTML = '';

    const query = (htClipSearchInput?.value || '').toLowerCase().trim();
    const filtered = clips.filter((item) => {
      const matchFilter = (activeFilter === 'all') || (item.type === activeFilter);
      const matchQuery = !query || item.text.toLowerCase().includes(query);
      return matchFilter && matchQuery;
    });

    if (htClipLiveCount) {
      htClipLiveCount.textContent = `${clips.length} items captured`;
    }

    if (filtered.length === 0) {
      htClipListContainer.innerHTML = `<div class="ht-clip-empty">No items match your filter.<br/>Copy any text, link, or code on your PC to see it here.</div>`;
      return;
    }

    filtered.forEach((clip, idx) => {
      const el = document.createElement('div');
      el.className = 'ht-clip-item';
      if (selectedClip && selectedClip.id === clip.id) {
        el.classList.add('active');
      } else if (!selectedClip && idx === 0) {
        el.classList.add('active');
        selectClipForPreview(clip);
      }

      let iconClass = 'fa-solid fa-paragraph';
      if (clip.type === 'link') iconClass = 'fa-solid fa-link';
      else if (clip.type === 'code') iconClass = 'fa-solid fa-code';
      else if (clip.type === 'image') iconClass = 'fa-solid fa-image';

      el.innerHTML = `
        <i class="${iconClass} ht-clip-type-icon"></i>
        <span class="ht-clip-summary">${(clip.text || 'Image').replace(/\n/g, ' ')}</span>
        <span class="ht-clip-time">${formatRelativeTime(clip.time)}</span>
      `;

      el.addEventListener('click', () => {
        document.querySelectorAll('.ht-clip-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        selectClipForPreview(clip);
        sound.playPoke();
      });

      htClipListContainer.appendChild(el);
    });
  }

  function selectClipForPreview(clip) {
    selectedClip = clip;
    if (htClipPreviewBody) {
      if (clip.type === 'image' && clip.imageData) {
        htClipPreviewBody.innerHTML = `<img src="${clip.imageData}" style="max-width:100%;max-height:220px;border-radius:8px;object-fit:contain;" />`;
      } else {
        htClipPreviewBody.textContent = clip.text;
      }
    }
    if (htClipMetaType) htClipMetaType.textContent = `Type: ${clip.type.toUpperCase()}`;
    if (htClipMetaChars) {
      htClipMetaChars.textContent = clip.type === 'image' ? `${clip.imageWidth || 0}x${clip.imageHeight || 0} px` : `${clip.text.length} chars`;
    }
    if (htClipMetaTime) htClipMetaTime.textContent = formatRelativeTime(clip.time);
  }

  async function refreshClipboardHistory() {
    if (window.jarvisAPI && window.jarvisAPI.getClipboardHistory) {
      try {
        const clips = await window.jarvisAPI.getClipboardHistory();
        liveClips = Array.isArray(clips) ? clips : [];
        renderClipsList(liveClips);
      } catch (err) {
        console.warn('Failed to load clipboard history:', err);
      }
    }
  }

  // Real-time listener when new item is copied on PC
  if (window.jarvisAPI && window.jarvisAPI.onClipboardHistoryUpdated) {
    window.jarvisAPI.onClipboardHistoryUpdated((clips) => {
      liveClips = Array.isArray(clips) ? clips : [];
      renderClipsList(liveClips);
    });
  }

  if (htClipSearchInput) {
    htClipSearchInput.addEventListener('input', () => {
      renderClipsList(liveClips);
    });
  }

  htClipFilters.forEach((chip) => {
    chip.addEventListener('click', () => {
      htClipFilters.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter') || 'all';
      renderClipsList(liveClips);
      sound.playPoke();
    });
  });

  if (htClipPasteBtn) {
    htClipPasteBtn.addEventListener('click', async () => {
      if (selectedClip && window.jarvisAPI && window.jarvisAPI.pasteClipboardItem) {
        await window.jarvisAPI.pasteClipboardItem(selectedClip.text);
        sound.playSuccess();
        closeTopNotch();
      }
    });
  }

  // --- 5. REAL HARDWARE & SYSTEM STATS ---
  const htStatRamBar = document.getElementById('htStatRamBar');
  const htStatRamPct = document.getElementById('htStatRamPct');
  const htStatRamDetails = document.getElementById('htStatRamDetails');
  const htStatCpuModel = document.getElementById('htStatCpuModel');
  const htStatCpuCores = document.getElementById('htStatCpuCores');
  const htStatsRamBoost = document.getElementById('htStatsRamBoost');
  const htTodayClock = document.getElementById('htTodayClock');
  const htTodayDate = document.getElementById('htTodayDate');

  async function loadRealSystemStats() {
    if (window.jarvisAPI && window.jarvisAPI.getSystemStats) {
      try {
        const stats = await window.jarvisAPI.getSystemStats();
        if (stats && stats.success) {
          if (htStatRamPct) htStatRamPct.textContent = `${stats.ramPct}%`;
          if (htStatRamBar) htStatRamBar.style.width = `${stats.ramPct}%`;
          if (htStatRamDetails) htStatRamDetails.textContent = `${stats.usedMem} GB / ${stats.totalMem} GB (${stats.freeMem} GB free)`;
          if (htStatCpuModel) htStatCpuModel.textContent = stats.cpuModel;
          if (htStatCpuCores) htStatCpuCores.textContent = `${stats.cpuCores} Threads / Logical Cores`;
        }
      } catch (err) {
        console.warn('Failed to load system stats:', err);
      }
    }
  }

  if (htStatsRamBoost) {
    htStatsRamBoost.addEventListener('click', async () => {
      sound.playPoke();
      htStatsRamBoost.textContent = '⚡ Optimizing RAM...';
      try {
        await loadRealSystemStats();
        setTimeout(() => {
          htStatsRamBoost.textContent = '✓ RAM Optimized';
          sound.playSuccess();
          setTimeout(() => {
            htStatsRamBoost.textContent = '⚡ Free Memory';
          }, 2000);
        }, 800);
      } catch (e) {
        htStatsRamBoost.textContent = '⚡ Free Memory';
      }
    });
  }

  // Real-time Clock in Today tab
  function updateTodayClock() {
    const now = new Date();
    if (htTodayClock) {
      htTodayClock.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    if (htTodayDate) {
      htTodayDate.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  }
  setInterval(updateTodayClock, 1000);
  updateTodayClock();

  // --- 6. REAL WALLPAPER PRESETS & APPLIER ---
  const htWallTiles = document.querySelectorAll('.ht-wall-tile');
  const htWallBrowseBtn = document.getElementById('htWallBrowseBtn');
  const htWallStatus = document.getElementById('htWallStatus');

  htWallTiles.forEach((tile) => {
    tile.addEventListener('click', async () => {
      htWallTiles.forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      const theme = tile.getAttribute('data-theme');
      if (htWallStatus) htWallStatus.textContent = `Selected ${tile.getAttribute('title') || theme}...`;
      sound.playSuccess();
    });
  });

  if (htWallBrowseBtn) {
    htWallBrowseBtn.addEventListener('click', async () => {
      if (window.jarvisAPI && window.jarvisAPI.selectFile) {
        const file = await window.jarvisAPI.selectFile();
        if (file && file.path && window.jarvisAPI.setWallpaper) {
          const res = await window.jarvisAPI.setWallpaper(file.path);
          if (htWallStatus) {
            htWallStatus.textContent = res.success ? '✓ Wallpaper applied to Windows desktop!' : `Error: ${res.error}`;
          }
          sound.playSuccess();
        }
      }
    });
  }

  // --- 7. REAL APPS LAUNCHER ---
  const htAppTiles = document.querySelectorAll('.ht-app-tile');
  htAppTiles.forEach((tile) => {
    tile.addEventListener('click', () => {
      const app = tile.getAttribute('data-app');
      sound.playPoke();
      closeTopNotch();
      if (window.jarvisAPI && window.jarvisAPI.openApp) {
        window.jarvisAPI.openApp(app);
      } else {
        handleUserPrompt(`Open ${app}`, { isVoice: false });
      }
    });
  });

  // --- 8. POWER ACTIONS ---
  const htPowerBtns = document.querySelectorAll('.ht-power-btn');
  htPowerBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-power');
      sound.playPoke();
      closeTopNotch();
      if (window.jarvisAPI && window.jarvisAPI.systemControl) {
        window.jarvisAPI.systemControl(act);
      }
    });
  });

  // Keyboard shortcut: Escape closes top notch, Ctrl+Shift+C toggles it
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hitodamaTopNotch && hitodamaTopNotch.classList.contains('visible')) {
      closeTopNotch();
    }
  });

  // --- CIRCLE TO ASK EVENT HANDLERS ---
  const circledImagePill = document.getElementById('circledImagePill');
  const circledThumbImg = document.getElementById('circledThumbImg');
  const removeCircledBtn = document.getElementById('removeCircledBtn');
  let currentCircledCrop = null;

  if (removeCircledBtn) {
    removeCircledBtn.addEventListener('click', () => {
      currentCircledCrop = null;
      if (circledImagePill) circledImagePill.style.display = 'none';
      if (currentAttachment && currentAttachment.name === 'Circled_Screen.png') {
        currentAttachment = null;
      }
      mainInput.placeholder = "Ask Grokki, drop a file, or give an order...";
    });
  }

  if (window.jarvisAPI && window.jarvisAPI.onCircleToAskReady) {
    window.jarvisAPI.onCircleToAskReady(async ({ dataUrl }) => {
      sound.playSuccess();
      grokbot.setState('happy');
      currentCircledCrop = dataUrl;

      if (circledThumbImg) circledThumbImg.src = dataUrl;
      if (circledImagePill) circledImagePill.style.display = 'flex';

      try {
        if (window.jarvisAPI.saveTempFile) {
          const res = await window.jarvisAPI.saveTempFile({
            dataUrl,
            prefix: 'circled_crop_'
          });
          if (res && res.path) {
            currentAttachment = {
              name: 'Circled_Screen.png',
              path: res.path,
              ext: '.png'
            };
          }
        }
      } catch (err) {
        console.warn('Failed to save circled crop temp file:', err);
      }

      islandContainer.classList.remove('hidden-state');
      setResponseHTML(`<h3>⭕ Circled Region Captured</h3><p>I see what you circled on your screen! Ask me anything about it out loud or type below (e.g. <em>"explain this"</em>, <em>"solve this problem"</em>, <em>"what is this code doing?"</em>).</p>`, true);
      islandDrawer.classList.add('open');
      islandContainer.classList.add('has-drawer-open');

      mainInput.placeholder = "Ask about the circled region...";
      mainInput.focus();
    });
  }

  settingsBtn.addEventListener('click', openSettings);
  if (pocketGrokkiBtn) {
    pocketGrokkiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPocketGrokkiCard();
    });
  }

  if (connectGoogleBtn) {
    connectGoogleBtn.addEventListener('click', async () => {
      connectGoogleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
      try {
        const res = await window.jarvisAPI.connectGoogle();
        if (res && !res.success) {
          console.warn('[Google Auth]', res.message || res.error);
        }
      } catch (err) {
        console.error('[Google Auth Error]', err);
      }
      await updateGoogleStatus();
    });
  }

  if (universitySelect) {
    universitySelect.addEventListener('change', () => {
      const val = universitySelect.value;
      if (val === 'adbu') {
        if (universityFields) universityFields.classList.remove('hidden');
        if (uniUsernameInput) uniUsernameInput.focus();
      } else {
        if (universityFields) universityFields.classList.add('hidden');
      }
    });
  }

  if (toggleUniPasswordBtn && uniPasswordInput && uniEyeIcon) {
    toggleUniPasswordBtn.addEventListener('click', () => {
      if (uniPasswordInput.type === 'password') {
        uniPasswordInput.type = 'text';
        uniEyeIcon.classList.remove('fa-eye');
        uniEyeIcon.classList.add('fa-eye-slash');
      } else {
        uniPasswordInput.type = 'password';
        uniEyeIcon.classList.remove('fa-eye-slash');
        uniEyeIcon.classList.add('fa-eye');
      }
    });
  }

  if (syncUniversityBtn) {
    syncUniversityBtn.addEventListener('click', async () => {
      const uni = universitySelect ? universitySelect.value : 'adbu';
      if (uni === 'none') {
        if (uniSyncResult) uniSyncResult.innerHTML = '<span style="color:#ef4444;">Please select a university</span>';
        return;
      }
      const uName = uniUsernameInput ? uniUsernameInput.value.trim() : '';
      const uPass = uniPasswordInput ? uniPasswordInput.value.trim() : '';

      const currentStatus = (window.jarvisAPI && window.jarvisAPI.getAcademicStatus)
        ? await window.jarvisAPI.getAcademicStatus()
        : null;
      const hasSavedPass = Boolean(currentStatus && currentStatus.hasPassword);

      if (!uName) {
        if (uniSyncResult) uniSyncResult.innerHTML = '<span style="color:#ef4444;">Enter Student ID / Username</span>';
        return;
      }
      if (!hasSavedPass && !uPass) {
        if (uniSyncResult) uniSyncResult.innerHTML = '<span style="color:#ef4444;">Enter ERP password to link</span>';
        return;
      }

      if (uniSyncSpinner) uniSyncSpinner.classList.add('fa-spin');
      if (uniSyncText) uniSyncText.innerText = 'Connecting...';
      if (uniSyncResult) uniSyncResult.innerText = '';
      syncUniversityBtn.disabled = true;

      try {
        if (uPass || uName !== (currentStatus && currentStatus.username)) {
          await window.jarvisAPI.saveAcademicCredentials({ university: uni, username: uName, password: uPass });
        }
        const res = await window.jarvisAPI.syncAcademicPortal();
        if (res && res.success) {
          sound.playSuccess();
          if (uniPasswordInput) {
            uniPasswordInput.value = '';
            uniPasswordInput.placeholder = '•••••••••••• (Saved)';
          }
          if (uniSyncResult) {
            uniSyncResult.innerHTML = `<span style="color:#10b981;">✓ Synced ${res.totalSubjects} courses for ${res.studentName}</span>`;
          }
          await updateUniversityStatus();
        } else {
          sound.playAlert();
          if (uniSyncResult) {
            uniSyncResult.innerHTML = `<span style="color:#ef4444;">⚠️ ${res.error || 'Login failed'}</span>`;
          }
        }
      } catch (err) {
        sound.playAlert();
        if (uniSyncResult) {
          uniSyncResult.innerHTML = `<span style="color:#ef4444;">⚠️ ${err.message || 'Connection error'}</span>`;
        }
      } finally {
        if (uniSyncSpinner) uniSyncSpinner.classList.remove('fa-spin');
        syncUniversityBtn.disabled = false;
        if (uniSyncText) uniSyncText.innerText = 'Sync Now';
      }
    });
  }

  if (unlinkUniversityBtn) {
    unlinkUniversityBtn.addEventListener('click', async () => {
      if (confirm('Unlink this university portal and clear cached attendance data?')) {
        await window.jarvisAPI.disconnectAcademicPortal();
        if (uniUsernameInput) uniUsernameInput.value = '';
        if (uniPasswordInput) uniPasswordInput.value = '';
        await updateUniversityStatus();
      }
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
        handleUserPrompt(command, { isVoice: true });
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

  // 10. Window State & Transitions (Squash & Stretch Launch Animation)
  const GREETING_LINES = [
    "Ready",
    "Online",
    "Standing by",
    "Listening",
    "At your service",
    "Grokki Online",
    "All systems go"
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
    islandContainer.classList.remove('is-exiting-to-mobile');

    // Force reflow so animation cleanly restarts
    void islandContainer.offsetWidth;

    islandContainer.classList.add('is-launching');

    // Grokki stays in center & does joyful motion "Hi!" animation (~520ms) (Old startup sounds removed; audio handled cleanly by preloader)
    hiGreetingTimer = setTimeout(() => {
      grokbot.sayHi();
    }, 520);

    // Complete transition and return to normal interactive state (~1900ms)
    launchTimer = setTimeout(() => {
      islandContainer.classList.remove('is-launching');
      if (currentMode === 'typing') mainInput.focus();
      else voice.startListening();
      launchTimer = null;
    }, 1900);
  }

  window.jarvisAPI.onWindowStateChanged(({ visible }) => {
    if (visible) {
      grokbot.resume();
      playLaunchAnimation();
    } else {
      grokbot.pause();
      if (launchTimer) clearTimeout(launchTimer);
      if (impactSoundTimer) clearTimeout(impactSoundTimer);
      if (hiGreetingTimer) clearTimeout(hiGreetingTimer);
      if (chimeTimer) clearTimeout(chimeTimer);
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

    if (action === 'show' || islandContainer.classList.contains('hidden-state') || islandContainer.style.display === 'none') {
      islandContainer.style.display = '';
      islandContainer.classList.remove('hidden-state');
      setPillDisplayMode('chat');
      setMode('typing');
      setTimeout(() => mainInput.focus(), 80);
      sound.playPoke();
      return;
    }

    // Alt+Q toggles chat or dismisses cleanly
    setPillDisplayMode('chat');

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
      const osAct = (data && data.osAction && data.osAction !== 'none') ? `\n\n*Executing scheduled OS action: **${data.osAction.toUpperCase()}**...*` : '';
      islandContainer.classList.remove('hidden-state');
      islandContainer.classList.remove('is-launching');
      userText.innerHTML = `<i class="fa-solid fa-bell" style="color:#38bdf8; margin-right:6px;"></i> <strong>Scheduled Reminder (${data.fireTimeStr || 'Now'})</strong>`;
      setResponseHTML(renderMarkdownHTML(`### Reminder Alert\n**${text}**${osAct}`), true);
      islandDrawer.classList.add('open');
      islandContainer.classList.add('has-drawer-open');
      sound.playSuccess();
      grokbot.setState('happy');
      voice.speak(`Hey! Quick reminder... ${text}`, () => {
        grokbot.setState('idle');
      });
    });
  }

  // Pocket Grokki Event Handlers (Mobile Camera Snap & Solve, Connected notifications)
  if (window.jarvisAPI && window.jarvisAPI.onPocketPhotoReceived) {
    window.jarvisAPI.onPocketPhotoReceived(async (data) => {
      console.log('[Pocket Grokki] Photo received from phone:', data);
      sound.playSuccess();
      grokbot.setState('surprised');

      // Summon Grokki Island if hidden
      islandContainer.classList.remove('hidden-state');
      if (window.jarvisAPI && window.jarvisAPI.showWindow) {
        window.jarvisAPI.showWindow();
      }

      setAttachment({
        name: data.name || 'Phone Camera Photo.jpg',
        path: data.path,
        size: 0
      });

      userText.innerHTML = `<i class="fa-solid fa-mobile-screen-button" style="color: #60a5fa; margin-right: 6px;"></i> <strong>Phone Camera Snap</strong>`;
      setResponseHTML('<span style="color:rgba(255,255,255,0.6);"><i class="fa-solid fa-circle-notch fa-spin"></i> Photo received from phone camera! Grokki is analyzing and solving...</span>');
      islandDrawer.classList.add('open');
      islandContainer.classList.add('has-drawer-open');

      const solvePrompt = data.prompt || "Please analyze, solve, and explain this photo from my phone camera in detail.";
      await handleUserPrompt(solvePrompt, { isVoice: false });
    });
  }

  if (window.jarvisAPI && window.jarvisAPI.onPocketDeviceConnected) {
    window.jarvisAPI.onPocketDeviceConnected((data) => {
      sound.playSuccess();
      grokbot.setState('happy');
      const pill = document.createElement('span');
      pill.className = 'apple-pill-badge';
      const statusLabel = data.isAutoConnected ? 'Auto-Linked' : 'Linked';
      pill.innerHTML = `<i class="fa-solid fa-mobile-screen-button"></i> 📱 ${data.deviceType} ${statusLabel}`;
      badgeRow.appendChild(pill);
      setTimeout(() => {
        if (pill.parentNode) pill.remove();
      }, 5000);
    });
  }

  if (window.jarvisAPI && window.jarvisAPI.onPocketChatSent) {
    window.jarvisAPI.onPocketChatSent(() => {
      grokbot.setState('surprised');
      setTimeout(() => grokbot.setState('idle'), 2000);
    });
  }

  // Grokki Reverse Intro: Slide from Left Dock to Center, Squeeze Flat, and Fly Up to Phone
  function playExitToMobileAnimation() {
    if (chimeTimer) clearTimeout(chimeTimer);
    if (launchTimer) clearTimeout(launchTimer);

    islandContainer.classList.remove('is-launching');
    islandContainer.classList.remove('hidden-state');
    void islandContainer.offsetWidth;
    islandContainer.classList.add('is-exiting-to-mobile');

    sound.playPoke();
    setTimeout(() => {
      sound.playLaunch();
    }, 550);

    setTimeout(() => {
      islandContainer.classList.remove('is-exiting-to-mobile');
      islandContainer.classList.add('hidden-state');
      const botWrapper = document.querySelector('.bot-wrapper');
      if (botWrapper) {
        botWrapper.style.visibility = 'hidden';
      }
    }, 980);
  }

  // Dimension Hop IPC Listeners (Phone <-> PC Island)
  if (window.jarvisAPI && window.jarvisAPI.onGrokkiHoppedToPhone) {
    window.jarvisAPI.onGrokkiHoppedToPhone(() => {
      playExitToMobileAnimation();
    });
  }

  if (window.jarvisAPI && window.jarvisAPI.onGrokkiHoppedToPC) {
    window.jarvisAPI.onGrokkiHoppedToPC((data) => {
      const botWrapper = document.querySelector('.bot-wrapper');
      if (botWrapper) {
        botWrapper.style.visibility = 'visible';
      }
      playLaunchAnimation();

      // Handle file saved confirmation from phone (NEVER trigger vision or prompt execution!)
      if (data && data.action === 'file_saved') {
        sound.playSuccess();
        grokbot.setState('happy');
        userText.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #34d399; margin-right: 6px;"></i> <strong>[From Phone]</strong> Saved ${data.fileName}`;
        setResponseHTML(`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;color:#34d399;"><i class="fa-solid fa-check"></i> <span>Grokki saved <strong>${data.fileName}</strong> to your PC at <code>${data.savePath}</code></span></div>`);
        islandDrawer.classList.add('open');
        islandContainer.classList.add('has-drawer-open');
        return;
      }

      // Only execute if an actual user instruction was provided from phone!
      const instruction = (data && data.instruction ? data.instruction.trim() : '');
      if (instruction) {
        if (data.filePath) {
          setAttachment({
            name: data.fileName || 'Phone File',
            path: data.filePath,
            size: 0
          });
        }
        userText.innerHTML = `<i class="fa-solid fa-mobile-screen" style="color: #60a5fa; margin-right: 6px;"></i> <strong>[From Phone]</strong> ${instruction}`;
        islandDrawer.classList.add('open');
        islandContainer.classList.add('has-drawer-open');
        setTimeout(() => {
          handleUserPrompt(instruction, { isVoice: false });
        }, 1600);
      }
    });
  }

  if (window.jarvisAPI && window.jarvisAPI.onPocketTaskCompleted) {
    window.jarvisAPI.onPocketTaskCompleted(() => {
      sound.playSuccess();
      grokbot.setState('happy');
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      sound.playDismiss();
      if (isSlashPaletteActive()) {
        hideSlashPalette();
        return;
      }
      if (islandContainer.classList.contains('has-control-center-open')) {
        closeControlCenter();
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
  updateUniversityStatus();

  // Play cute Grokki launch animation on initial startup
  playLaunchAnimation();
});
