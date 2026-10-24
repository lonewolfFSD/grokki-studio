// oauthCallbackPage.js
/**
 * Grokki Studio - Native OAuth Callback Page
 * Flat, minimal dark page. The button launches the desktop app via the
 * grokki:// custom protocol (browsers can't run an .exe directly).
 */

const fs = require('fs');
const path = require('path');

const APP_PROTOCOL_URL = 'grokki://oauth-complete';

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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getServiceLogoHtml(serviceType) {
  const type = (serviceType || '').toLowerCase();
  if (type.includes('google')) {
    return `<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>`;
  }
  if (type.includes('github')) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>`;
  }
  if (type.includes('notion')) {
    return `<svg width="16" height="16" viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="20" fill="#ffffff"/>
      <path d="M28 28H42L62 64V28H72V72H58L38 36V72H28V28Z" fill="#000000"/>
    </svg>`;
  }
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
}

function getGrokkiStudioLogoHtml() {
  const logoSrc = GROKKI_STUDIO_LOGO_B64 || getGrokkiStudioLogoBase64();
  if (logoSrc) {
    return `<img src="${logoSrc}" alt="Grokki Studio" width="44" height="44" />`;
  }
  return `<div class="logo-fallback">G</div>`;
}

function renderOAuthCallbackHtml({
  serviceName = 'Google Workspace',
  serviceType = 'google',
  status = 'success',
  title = '',
  description = '',
  userIdentifier = '',
  errorMessage = '',
  protocolUrl = APP_PROTOCOL_URL,
}) {
  const isSuccess = status === 'success';

  const safeService = escapeHtml(serviceName);
  const heading = escapeHtml(
    title || (isSuccess ? `${serviceName} connected` : `${serviceName} connection failed`)
  );
  const desc = escapeHtml(
    description ||
      (isSuccess
        ? 'Grokki Studio can now use this account. Head back to the app to continue.'
        : 'The authorization was cancelled or something went wrong. Go back to the app and try again.')
  );
  const safeUser = escapeHtml(userIdentifier);
  const safeError = escapeHtml(errorMessage);
  const safeProtocol = escapeHtml(protocolUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isSuccess ? 'Connected' : 'Connection failed'} · Grokki Studio</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0a0a0b;
      --surface: #111113;
      --border: rgba(255, 255, 255, 0.08);
      --text: #fafafa;
      --muted: #8a8a93;
      --ok: #4ade80;
      --err: #f87171;
    }

    html, body { height: 100%; }

    body {
      font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }

    main {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .logo img, .logo-fallback {
      width: 44px;
      height: 44px;
      object-fit: contain;
      display: block;
    }
    .logo-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      font-weight: 700;
    }

    .service {
      margin-top: 28px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--muted);
    }
    .service .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${isSuccess ? 'var(--ok)' : 'var(--err)'};
    }

    h1 {
      margin-top: 14px;
      font-size: 26px;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .desc {
      margin-top: 12px;
      font-size: 14px;
      line-height: 1.6;
      color: var(--muted);
      text-wrap: balance;
    }

    .account {
      margin-top: 20px;
      font-size: 13px;
      color: var(--text);
      padding: 8px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .error {
      margin-top: 20px;
      width: 100%;
      text-align: left;
      font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
      color: var(--err);
      padding: 10px 12px;
      border: 1px solid rgba(248, 113, 113, 0.25);
      border-radius: 8px;
      word-break: break-word;
    }

    .btn {
      margin-top: 32px;
      width: 100%;
      height: 44px;
      border: 0;
      border-radius: 10px;
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      background: #ffffff;
      color: #0a0a0b;
      transition: background 0.15s ease, transform 0.1s ease;
    }
    .btn:hover { background: #e5e5e5; }
    .btn:active { transform: scale(0.99); }
    .btn:focus-visible { outline: 2px solid #ffffff; outline-offset: 3px; }

    .hint {
      margin-top: 14px;
      min-height: 18px;
      font-size: 12px;
      color: var(--muted);
      transition: opacity 0.2s ease;
    }
  </style>
</head>
<body>
  <main>
    <div class="logo">${getGrokkiStudioLogoHtml()}</div>

    <div class="service">
      ${getServiceLogoHtml(serviceType)}
      <span>${safeService}</span>
      <span class="dot"></span>
    </div>

    <h1>${heading}</h1>
    <p class="desc">${desc}</p>

    ${safeUser ? `<div class="account" title="${safeUser}">${safeUser}</div>` : ''}
    ${!isSuccess && safeError ? `<div class="error">${safeError}</div>` : ''}

    <button type="button" class="btn" id="open-app">Open Grokki Studio</button>
    <p class="hint" id="hint">You can close this tab afterwards.</p>
  </main>

  <script>
    (function () {
      var PROTOCOL_URL = "${safeProtocol}";
      var btn = document.getElementById('open-app');
      var hint = document.getElementById('hint');
      var launched = false;

      function openApp() {
        launched = true;
        hint.textContent = 'Opening Grokki Studio…';
        window.location.href = PROTOCOL_URL;

        setTimeout(function () {
          if (document.visibilityState === 'visible') {
            hint.textContent = 'Nothing happened? Open Grokki Studio from your taskbar or Start menu.';
          }
        }, 2000);
      }

      btn.addEventListener('click', openApp);

      document.addEventListener('visibilitychange', function () {
        if (launched && document.visibilityState === 'hidden') {
          hint.textContent = 'You can close this tab.';
        }
      });

      ${isSuccess ? 'setTimeout(openApp, 400);' : ''}
    })();
  </script>
</body>
</html>`;
}

module.exports = {
  renderOAuthCallbackHtml,
  APP_PROTOCOL_URL,
};