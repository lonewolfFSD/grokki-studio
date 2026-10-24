/**
 * Grokki Studio - Native OAuth Callback Page
 * Ultra-modern, premium dark glassmorphism styling with blue-cyan cosmic gradients
 * Features the official Grokki cosmic orb logo with glowing aura.
 */

const GROKKI_ORB_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 512 512">
  <defs>
    <filter id="orbBloom" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="14" result="blur1" />
      <feGaussianBlur stdDeviation="28" result="blur2" />
      <feMerge>
        <feMergeNode in="blur2" />
        <feMergeNode in="blur1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="eyeGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="5" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <radialGradient id="baseGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#14172a" />
      <stop offset="70%" stop-color="#0a0c18" />
      <stop offset="100%" stop-color="#04050a" />
    </radialGradient>
    <radialGradient id="cyanAura" cx="12%" cy="46%" r="68%">
      <stop offset="0%" stop-color="#67e8f9" stop-opacity="1" />
      <stop offset="15%" stop-color="#38bdf8" stop-opacity="0.95" />
      <stop offset="35%" stop-color="#2563eb" stop-opacity="0.75" />
      <stop offset="65%" stop-color="#1e3a8a" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#05060d" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="purpleAura" cx="88%" cy="44%" r="62%">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.95" />
      <stop offset="22%" stop-color="#a855f7" stop-opacity="0.88" />
      <stop offset="48%" stop-color="#7c3aed" stop-opacity="0.6" />
      <stop offset="75%" stop-color="#4c1d95" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#05060d" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="topSheen" cx="30%" cy="16%" r="48%">
      <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.55" />
      <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="coreShadow" cx="52%" cy="54%" r="42%">
      <stop offset="0%" stop-color="#060710" stop-opacity="0.75" />
      <stop offset="70%" stop-color="#060710" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#060710" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.9" />
      <stop offset="25%" stop-color="#38bdf8" stop-opacity="0.85" />
      <stop offset="75%" stop-color="#c084fc" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0.9" />
    </linearGradient>
    <clipPath id="sphereClip">
      <circle cx="256" cy="256" r="248.32" />
    </clipPath>
  </defs>
  <circle cx="256" cy="256" r="250.32" fill="none" stroke="url(#rimGrad)" stroke-width="10" opacity="0.5" filter="url(#orbBloom)" />
  <g clip-path="url(#sphereClip)">
    <circle cx="256" cy="256" r="248.32" fill="url(#baseGrad)" />
    <circle cx="256" cy="256" r="248.32" fill="url(#cyanAura)" />
    <circle cx="256" cy="256" r="248.32" fill="url(#purpleAura)" />
    <circle cx="256" cy="256" r="248.32" fill="url(#topSheen)" />
    <circle cx="256" cy="256" r="248.32" fill="url(#coreShadow)" />
    <g transform="translate(328.01279999999997, 216.2688) rotate(-21.8)">
      <g filter="url(#eyeGlow)" opacity="0.9">
        <rect x="-54" y="-45" width="45" height="118" rx="22.5" ry="22.5" fill="#ffffff" />
        <rect x="9" y="-75" width="45" height="150" rx="22.5" ry="22.5" fill="#ffffff" />
      </g>
      <rect x="-54" y="-45" width="45" height="118" rx="22.5" ry="22.5" fill="#ffffff" />
      <rect x="9" y="-75" width="45" height="150" rx="22.5" ry="22.5" fill="#ffffff" />
    </g>
  </g>
  <circle cx="256" cy="256" r="247.32" fill="none" stroke="url(#rimGrad)" stroke-width="2.2" opacity="0.8" />
</svg>
`;

function getServiceLogoHtml(serviceType, serviceName) {
  const type = (serviceType || '').toLowerCase();
  if (type.includes('google')) {
    return `<svg width="28" height="28" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>`;
  }
  if (type.includes('github')) {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>`;
  }
  if (type.includes('notion')) {
    return `<svg width="28" height="28" viewBox="0 0 100 100">
      <rect width="100" height="100" rx="20" fill="#ffffff"/>
      <path d="M28 28H42L62 64V28H72V72H58L38 36V72H28V28Z" fill="#000000"/>
    </svg>`;
  }
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
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
    ? `${serviceName} Connected to Grokki!`
    : `${serviceName} Connection Failed`;
  const defaultDesc = isSuccess
    ? `Grokki Studio now has autonomous access to your ${serviceName}. You can return to your desktop.`
    : (errorMessage || 'The authorization was cancelled or encountered an error. Please try again in Grokki Studio.');

  const heading = title || defaultTitle;
  const desc = description || defaultDesc;

  const serviceLogoHtml = getServiceLogoHtml(serviceType, serviceName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isSuccess ? 'Authorized' : 'Authorization Failed'} • Grokki Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #06070b;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* Ambient Blue & Purple Gradient Aurora Backgrounds */
    .aurora-bg {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }
    .aurora-top {
      position: absolute;
      top: -150px;
      left: 50%;
      transform: translateX(-50%);
      width: 720px;
      height: 520px;
      background: radial-gradient(ellipse 65% 55% at 50% 20%, rgba(56, 189, 248, 0.28) 0%, rgba(37, 99, 235, 0.16) 45%, rgba(99, 102, 241, 0.08) 70%, transparent 95%);
      filter: blur(48px);
      animation: pulseGlow 8s ease-in-out infinite alternate;
    }
    .aurora-bottom {
      position: absolute;
      bottom: -180px;
      left: 50%;
      transform: translateX(-50%);
      width: 680px;
      height: 480px;
      background: radial-gradient(ellipse 60% 50% at 50% 80%, rgba(168, 85, 247, 0.18) 0%, rgba(59, 130, 246, 0.12) 45%, transparent 90%);
      filter: blur(52px);
    }
    .grid-pattern {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(255, 255, 255, 0.065) 1px, transparent 1px);
      background-size: 28px 28px;
      mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 85%);
      -webkit-mask-image: radial-gradient(circle at 50% 50%, black 40%, transparent 85%);
      opacity: 0.8;
    }

    @keyframes pulseGlow {
      0% { opacity: 0.75; transform: translateX(-50%) scale(0.96); }
      100% { opacity: 1; transform: translateX(-50%) scale(1.04); }
    }

    /* Glassmorphic Card */
    .card-wrapper {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 450px;
    }
    .card {
      position: relative;
      background: rgba(14, 16, 26, 0.78);
      backdrop-filter: blur(36px) saturate(190%);
      -webkit-backdrop-filter: blur(36px) saturate(190%);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 24px;
      padding: 40px 34px 34px 34px;
      text-align: center;
      box-shadow: 
        0 30px 80px -15px rgba(0, 0, 0, 0.85),
        0 0 50px -12px rgba(56, 189, 248, 0.16),
        inset 0 1px 0 rgba(255, 255, 255, 0.16),
        inset 0 0 20px rgba(56, 189, 248, 0.03);
      animation: cardFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes cardFadeIn {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Sleek Dual Pod Bridge */
    .bridge-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 28px;
    }
    .logo-pod {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 
        0 10px 24px -4px rgba(0, 0, 0, 0.45),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
      transition: transform 0.25s ease, border-color 0.25s ease;
    }
    .logo-pod.grokki-pod {
      background: radial-gradient(circle at 35% 35%, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%);
      border: 1px solid rgba(56, 189, 248, 0.35);
      box-shadow: 
        0 0 24px -2px rgba(56, 189, 248, 0.25),
        0 10px 24px -4px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }
    .connector-line {
      flex: 1;
      height: 2px;
      background: linear-gradient(90deg, rgba(56, 189, 248, 0.3), rgba(16, 185, 129, 0.6), rgba(168, 85, 247, 0.4));
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.25);
      border-radius: 2px;
    }
    .status-badge {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .status-success {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.4));
      border: 1.5px solid #10b981;
      box-shadow: 0 0 18px rgba(16, 185, 129, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.3);
      animation: pulseBadge 2.2s infinite ease-in-out;
    }
    .status-error {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.4));
      border: 1.5px solid #ef4444;
      box-shadow: 0 0 18px rgba(239, 68, 68, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    @keyframes pulseBadge {
      0%, 100% { transform: scale(1); box-shadow: 0 0 16px rgba(16, 185, 129, 0.5); }
      50% { transform: scale(1.08); box-shadow: 0 0 24px rgba(16, 185, 129, 0.8); }
    }

    /* Headings & Text */
    h1 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 10px 0;
      background: linear-gradient(135deg, #ffffff 20%, #93c5fd 65%, #c4b5fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.3;
    }
    p.desc {
      font-size: 13.5px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 22px 0;
      padding: 0 6px;
    }

    /* User Account Chip */
    .user-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 9999px;
      font-size: 12.5px;
      font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
      color: #34d399;
      margin-bottom: 24px;
      max-width: 100%;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
    }
    .user-chip-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      flex-shrink: 0;
    }
    .user-chip-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Error Box */
    .error-box {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 12.5px;
      color: #fca5a5;
      margin-bottom: 22px;
      text-align: left;
      word-break: break-word;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
    }

    /* Glowing Action Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 44px;
      border-radius: 12px;
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      border: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      text-decoration: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #38bdf8 0%, #2563eb 50%, #1d4ed8 100%);
      color: #ffffff;
      box-shadow: 
        0 10px 24px -4px rgba(37, 99, 235, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.35);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
      box-shadow: 
        0 14px 30px -4px rgba(59, 130, 246, 0.65),
        inset 0 1px 0 rgba(255, 255, 255, 0.45);
      transform: translateY(-1.5px);
    }
    .btn-primary:active {
      transform: translateY(0.5px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1.5px);
    }

    .footer-brand {
      margin-top: 26px;
      font-size: 11.5px;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 6px;
      letter-spacing: 0.02em;
    }
    .footer-brand-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #38bdf8;
    }
    .tab-hint {
      margin-top: 12px;
      font-size: 11.5px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <!-- Ambient Aurora Glows -->
  <div class="aurora-bg">
    <div class="aurora-top"></div>
    <div class="aurora-bottom"></div>
    <div class="grid-pattern"></div>
  </div>

  <div class="card-wrapper">
    <div class="card">
      <!-- Modern Dual-Logo Bridge -->
      <div class="bridge-row">
        <div class="logo-pod" title="${serviceName}">
          ${serviceLogoHtml}
        </div>
        <div class="connector-line"></div>
        <div class="status-badge ${isSuccess ? 'status-success' : 'status-error'}" title="${isSuccess ? 'Connected' : 'Failed'}">
          ${isSuccess ? `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ` : `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          `}
        </div>
        <div class="connector-line"></div>
        <div class="logo-pod grokki-pod" title="Grokki Studio">
          ${GROKKI_ORB_SVG}
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <span>Return to Grokki Studio</span>
      </button>

      <p class="tab-hint">You can safely close this browser window.</p>
    </div>
  </div>

  <div class="footer-brand">
    <span>Grokki Studio</span>
    <span class="footer-brand-dot"></span>
    <span>Autonomous AI Workspace</span>
  </div>

  <script>
    function handleClose() {
      try {
        window.location.href = 'grokki://oauth-complete';
      } catch (e) {}
      setTimeout(() => {
        try { window.close(); } catch (e) {}
      }, 400);
    }
  </script>
</body>
</html>`;
}

module.exports = {
  renderOAuthCallbackHtml,
};
