/**
 * Grokki Studio - Native OAuth Callback Page
 * Clean, dark obsidian styling with subtle blue gradient accents.
 * Features the official Grokki Studio logo and connected service bridge.
 */

const fs = require('fs');
const path = require('path');

function getGrokkiStudioLogoBase64() {
  const candidatePaths = [
    path.resolve(__dirname, '../../assets/grokki_logo.png'),
    path.resolve(__dirname, '../../../assets/grokki_logo.png'),
    path.resolve(__dirname, '../web/assets/grokki_logo.png'),
    process.resourcesPath ? path.join(process.resourcesPath, 'assets/grokki_logo.png') : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'app.asar/assets/grokki_logo.png') : null,
  ].filter(Boolean);

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
      } catch (e) {}
    }
  }
  return null;
}

const GROKKI_STUDIO_LOGO_B64 = getGrokkiStudioLogoBase64();

function getServiceLogoHtml(serviceType, serviceName) {
  const type = (serviceType || '').toLowerCase();
  if (type.includes('google')) {
    return `<svg width="26" height="26" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>`;
  }
  if (type.includes('github')) {
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

function getGrokkiStudioLogoHtml() {
  const logoSrc = GROKKI_STUDIO_LOGO_B64 || getGrokkiStudioLogoBase64();
  if (logoSrc) {
    return `<img src="${logoSrc}" alt="Grokki Studio" style="width: 36px; height: 36px; object-fit: contain; border-radius: 8px;" />`;
  }
  return `<div style="width: 36px; height: 36px; border-radius: 8px; background: #0f172a; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #38bdf8;">GS</div>`;
}

function renderOAuthCallbackHtml({
  serviceName = 'Google Workspace',
  serviceType = 'google',
  status = 'success',
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
    ? `Grokki Studio now has authorized access to your ${serviceName}. You can return to your desktop app.`
    : (errorMessage || 'The authorization was cancelled or encountered an error. Please try again.');

  const heading = title || defaultTitle;
  const desc = description || defaultDesc;

  const serviceLogoHtml = getServiceLogoHtml(serviceType, serviceName);
  const grokkiLogoHtml = getGrokkiStudioLogoHtml();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isSuccess ? 'Connected' : 'Connection Failed'} • Grokki Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #090a0f;
      background-image: radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.14) 0%, transparent 60%);
      color: #f1f5f9;
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
      max-width: 430px;
      background: #11131a;
      border: 1px solid #1e2230;
      border-radius: 20px;
      padding: 38px 32px 32px 32px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    /* Dual Pod Bridge */
    .bridge-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .logo-pod {
      width: 54px;
      height: 54px;
      border-radius: 14px;
      background: #171923;
      border: 1px solid #222636;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .connector-line {
      flex: 1;
      height: 1px;
      background: #252a3d;
    }
    .status-badge {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .status-success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      color: #10b981;
    }
    .status-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #ef4444;
    }

    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 8px 0;
      letter-spacing: -0.01em;
    }
    p.desc {
      font-size: 13px;
      color: #8b93a7;
      line-height: 1.55;
      margin: 0 0 20px 0;
    }

    .user-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: #161924;
      border: 1px solid #23283a;
      border-radius: 9999px;
      font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
      color: #34d399;
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
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 12px;
      color: #f87171;
      margin-bottom: 20px;
      text-align: left;
      word-break: break-word;
      font-family: 'JetBrains Mono', monospace;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 42px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      border: none;
      transition: background 0.15s ease, transform 0.1s ease;
      text-decoration: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    }
    .btn-primary:active {
      transform: scale(0.99);
    }
    .btn-secondary {
      background: #1b1e2b;
      color: #e2e8f0;
      border: 1px solid #262b3d;
    }
    .btn-secondary:hover {
      background: #232738;
    }

    .footer-brand {
      margin-top: 22px;
      font-size: 11px;
      color: #4f566b;
      letter-spacing: 0.02em;
    }
    .tab-hint {
      margin-top: 12px;
      font-size: 11.5px;
      color: #61687d;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="bridge-row">
      <div class="logo-pod" title="${serviceName}">
        ${serviceLogoHtml}
      </div>
      <div class="connector-line"></div>
      <div class="status-badge ${isSuccess ? 'status-success' : 'status-error'}">
        ${isSuccess ? `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        ` : `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `}
      </div>
      <div class="connector-line"></div>
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

    <p class="tab-hint">You can safely close this browser window.</p>
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
