/**
 * Grokki Studio - Native OAuth Callback Page
 * Clean, dark obsidian styling matching Grokki Studio UI exactly.
 * Features authentic Grokki Studio logo and service logos with clean connected/failed bridge.
 */

const fs = require('fs');
const path = require('path');

// Cache assets as Base64 data URIs
function loadAssetBase64(relPath, mimeType = 'image/png') {
  try {
    const fullPath = path.resolve(__dirname, relPath);
    if (fs.existsSync(fullPath)) {
      return `data:${mimeType};base64,${fs.readFileSync(fullPath).toString('base64')}`;
    }
  } catch (e) {
    console.warn(`[oauth_template] Failed to load asset ${relPath}:`, e.message);
  }
  return null;
}

const CACHED_LOGOS = {
  grokki: loadAssetBase64('../web/assets/grokki_logo.png', 'image/png'),
  google: loadAssetBase64('../web/assets/logos/google.png', 'image/png'),
  github: loadAssetBase64('../web/assets/logos/github.png', 'image/png'),
  notion: loadAssetBase64('../web/assets/logos/notion.png', 'image/png'),
};

function getServiceLogoHtml(serviceType, serviceName) {
  const type = (serviceType || '').toLowerCase();
  const isGithub = type.includes('github');
  const cached = CACHED_LOGOS[type] || (isGithub ? CACHED_LOGOS.github : (type.includes('google') ? CACHED_LOGOS.google : (type.includes('notion') ? CACHED_LOGOS.notion : null)));

  if (cached) {
    return `<img src="${cached}" alt="${serviceName}" style="width: 26px; height: 26px; object-fit: contain; ${isGithub ? 'filter: brightness(0) invert(1);' : ''}" />`;
  }

  // Pure SVG fallbacks if image asset is unavailable
  if (type.includes('google')) {
    return `<svg width="26" height="26" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>`;
  }
  if (isGithub) {
    return `<svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>`;
  }
  if (type.includes('notion')) {
    return `<svg width="26" height="26" viewBox="0 0 100 100">
      <rect width="100" height="100" rx="20" fill="#ffffff"/>
      <path d="M28 28H42L62 64V28H72V72H58L38 36V72H28V28Z" fill="#000000"/>
    </svg>`;
  }
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
}

function getGrokkiLogoHtml() {
  if (CACHED_LOGOS.grokki) {
    return `<img src="${CACHED_LOGOS.grokki}" alt="Grokki Studio" style="width: 32px; height: 32px; object-fit: contain; border-radius: 6px;" />`;
  }
  // SVG fallback: official Grokki parallel slashes on dark tile
  return `<svg width="32" height="32" viewBox="0 0 64 64">
    <rect x="3" y="3" width="58" height="58" rx="14" fill="#0f1013" stroke="#373a46" stroke-width="2"/>
    <line x1="23" y1="46" x2="31" y2="18" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
    <line x1="35" y1="46" x2="43" y2="18" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
}

function renderOAuthCallbackHtml({
  serviceName = 'Google Workspace',
  serviceType = 'google',
  status = 'success', // 'success' | 'error'
  title = '',
  description = '',
  userIdentifier = '',
  errorMessage = '',
}) {
  const isSuccess = status === 'success';
  const defaultTitle = isSuccess
    ? `${serviceName} Connected to Grokki Studio`
    : `${serviceName} Connection Failed`;
  const defaultDesc = isSuccess
    ? `Grokki Studio now has authorized access to your ${serviceName}. You can return to your desktop.`
    : (errorMessage || 'The authorization was cancelled or encountered an error. Please try again.');

  const heading = title || defaultTitle;
  const desc = description || defaultDesc;

  const serviceLogoHtml = getServiceLogoHtml(serviceType, serviceName);
  const grokkiLogoHtml = getGrokkiLogoHtml();

  const statusBadgeHtml = isSuccess
    ? `<div class="status-badge status-success" title="Connected">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>`
    : `<div class="status-badge status-error" title="Failed">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isSuccess ? 'Connected' : 'Connection Failed'} • Grokki Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0b0c10;
      color: #f3f4f6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: #13141a;
      border: 1px solid #1e2029;
      border-radius: 16px;
      padding: 36px 30px;
      text-align: center;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    }
    /* Logo Bridge */
    .bridge-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .logo-pod {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: #1a1c24;
      border: 1px solid #1e2029;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .connector {
      flex: 1;
      height: 1px;
      background: #222533;
    }
    .status-badge {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .status-success {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
    }
    .status-error {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
    }
    h1 {
      font-size: 19px;
      font-weight: 600;
      color: #f3f4f6;
      margin: 0 0 8px 0;
      letter-spacing: -0.01em;
    }
    p.desc {
      font-size: 13px;
      color: #8b92a2;
      line-height: 1.5;
      margin: 0 0 20px 0;
    }
    .user-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 12px;
      background: #181a22;
      border: 1px solid #222533;
      border-radius: 8px;
      font-size: 12px;
      color: #d1d5db;
      margin-bottom: 22px;
      max-width: 100%;
    }
    .user-chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      flex-shrink: 0;
    }
    .user-chip-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .error-box {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      color: #f87171;
      margin-bottom: 20px;
      text-align: left;
      word-break: break-word;
      font-family: ui-monospace, Menlo, Consolas, monospace;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 38px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
      text-decoration: none;
      border: none;
    }
    .btn-primary {
      background: #ffffff;
      color: #0d0e12;
    }
    .btn-primary:hover {
      background: #e5e7eb;
    }
    .btn-secondary {
      background: #1a1c24;
      color: #f3f4f6;
      border: 1px solid #1e2029;
    }
    .btn-secondary:hover {
      background: #252836;
      border-color: #2a2d3d;
    }
    .footer-brand {
      margin-top: 22px;
      font-size: 11px;
      color: #4b5563;
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <div class="card">
    <!-- Clean Minimalist Dual-Logo Bridge -->
    <div class="bridge-row">
      <div class="logo-pod" title="${serviceName}">
        ${serviceLogoHtml}
      </div>
      <div class="connector"></div>
      ${statusBadgeHtml}
      <div class="connector"></div>
      <div class="logo-pod" title="Grokki Studio">
        ${grokkiLogoHtml}
      </div>
    </div>

    <h1>${heading}</h1>
    <p class="desc">${desc}</p>

    ${userIdentifier ? `
      <div class="user-chip">
        <span class="user-chip-dot"></span>
        <span class="user-chip-text">${userIdentifier}</span>
      </div>
    ` : ''}

    ${!isSuccess && errorMessage ? `
      <div class="error-box">
        ${errorMessage}
      </div>
    ` : ''}

    <button type="button" class="btn ${isSuccess ? 'btn-primary' : 'btn-secondary'}" onclick="handleClose()">
      Return to Grokki Studio
    </button>
  </div>

  <div class="footer-brand">
    Grokki Studio
  </div>

  <script>
    function handleClose() {
      try {
        window.close();
      } catch (e) {}
    }
  </script>
</body>
</html>`;
}

module.exports = {
  renderOAuthCallbackHtml,
};
