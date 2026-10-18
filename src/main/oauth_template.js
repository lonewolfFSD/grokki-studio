/**
 * Grokki Studio - High-End Apple/Grok Glassmorphic OAuth Callback Page
 * Renders connected / failed state with visual dual-logo connection beam
 */

function getGrokkiLogoSvg() {
  return `<svg width="44" height="44" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="orbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#181a24" />
        <stop offset="100%" stop-color="#07080d" />
      </linearGradient>
      <radialGradient id="cyanAura" cx="12%" cy="46%" r="68%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9" />
        <stop offset="50%" stop-color="#2563eb" stop-opacity="0.6" />
        <stop offset="100%" stop-color="#05060d" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="purpleAura" cx="88%" cy="44%" r="62%">
        <stop offset="0%" stop-color="#c084fc" stop-opacity="0.9" />
        <stop offset="50%" stop-color="#7c3aed" stop-opacity="0.5" />
        <stop offset="100%" stop-color="#05060d" stop-opacity="0" />
      </radialGradient>
      <clipPath id="circleClip">
        <circle cx="256" cy="256" r="240" />
      </clipPath>
    </defs>
    <circle cx="256" cy="256" r="248" fill="#0a0c12" stroke="rgba(255,255,255,0.12)" stroke-width="6"/>
    <g clip-path="url(#circleClip)">
      <circle cx="256" cy="256" r="240" fill="url(#orbGrad)" />
      <circle cx="256" cy="256" r="240" fill="url(#cyanAura)" />
      <circle cx="256" cy="256" r="240" fill="url(#purpleAura)" />
      <g transform="translate(328, 216) rotate(-21.8)">
        <rect x="-54" y="-45" width="45" height="118" rx="22.5" fill="#ffffff" />
        <rect x="9" y="-75" width="45" height="150" rx="22.5" fill="#ffffff" />
      </g>
    </g>
  </svg>`;
}

function getServiceLogoSvg(service) {
  const s = (service || '').toLowerCase();
  if (s.includes('google')) {
    return `<svg width="40" height="40" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>`;
  }
  if (s.includes('github')) {
    return `<svg width="40" height="40" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>`;
  }
  if (s.includes('notion')) {
    return `<svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#ffffff"/>
      <path d="M28 28H42L62 64V28H72V72H58L38 36V72H28V28Z" fill="#000000"/>
    </svg>`;
  }
  // Generic Fallback
  return `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
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
    ? `${serviceName} Connected!`
    : `${serviceName} Connection Failed`;
  const defaultDesc = isSuccess
    ? `Grokki Studio now has autonomous access to your ${serviceName}. You can return to your desktop.`
    : (errorMessage || 'The authorization was cancelled or encountered an error. Please try again.');

  const heading = title || defaultTitle;
  const desc = description || defaultDesc;

  const accentColor = isSuccess ? '#10b981' : '#ef4444';
  const accentGlow = isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  const beamColor = isSuccess ? '#3b82f6' : '#64748b';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isSuccess ? 'Connected' : 'Connection Failed'} • Grokki Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #08090d;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: hidden;
      position: relative;
    }

    /* Ambient Cosmic Backdrop */
    .bg-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, ${isSuccess ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.12)'} 0%, rgba(8, 9, 13, 0) 70%);
      pointer-events: none;
      z-index: 0;
    }

    /* Glass Card */
    .card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 460px;
      background: rgba(18, 20, 29, 0.72);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 28px;
      padding: 44px 36px 36px;
      text-align: center;
      box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.05);
      animation: cardAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes cardAppear {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Dual Logo Connection Bridge */
    .bridge-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 28px;
      position: relative;
    }

    .logo-badge {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.5);
      transition: transform 0.3s ease;
    }
    .logo-badge:hover {
      transform: translateY(-2px);
    }

    /* Animated Beam Link */
    .beam-link {
      position: relative;
      width: 64px;
      height: 2px;
      background: rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .beam-link::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, ${accentColor});
      opacity: ${isSuccess ? '0.9' : '0.4'};
    }

    .beam-pulse-dot {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 0 8px #ffffff;
      animation: pulseTravel 2s infinite ease-in-out;
    }

    @keyframes pulseTravel {
      0% { left: 0%; opacity: 0; }
      50% { opacity: 1; }
      100% { left: 100%; opacity: 0; }
    }

    .status-badge {
      position: absolute;
      top: -12px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: ${accentColor};
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      box-shadow: 0 0 16px ${accentGlow};
      border: 2px solid #08090d;
      z-index: 2;
    }

    /* Typography */
    .pill-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      background: ${isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'};
      border: 1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
      color: ${accentColor};
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 14px;
    }

    .pill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${accentColor};
      box-shadow: 0 0 6px ${accentColor};
    }

    h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 10px;
      color: #ffffff;
    }

    p.description {
      font-size: 13.5px;
      line-height: 1.55;
      color: #94a3b8;
      margin-bottom: 24px;
    }

    /* User Profile Card */
    .user-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 12px;
      color: #cbd5e1;
      font-weight: 500;
      margin-bottom: 24px;
    }

    /* Actions */
    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 13px 20px;
      border-radius: 14px;
      background: #ffffff;
      color: #090a0f;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(255, 255, 255, 0.15);
      transition: all 0.2s ease;
    }
    .btn-action:hover {
      background: #f1f5f9;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(255, 255, 255, 0.22);
    }
    .btn-action:active {
      transform: translateY(0);
    }

    .countdown-text {
      margin-top: 18px;
      font-size: 11.5px;
      color: #64748b;
      font-weight: 500;
    }

    .countdown-bar {
      margin-top: 8px;
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 3px;
      overflow: hidden;
    }

    .countdown-fill {
      width: 100%;
      height: 100%;
      background: ${accentColor};
      transition: width 1s linear;
    }

    /* Footer Brand */
    .footer {
      margin-top: 24px;
      font-size: 11px;
      color: #475569;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .footer-dot {
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="bg-glow"></div>

  <div class="card">
    <!-- Visual Logo Connection Beam -->
    <div class="bridge-container">
      <div class="logo-badge" title="${serviceName}">
        ${getServiceLogoSvg(serviceType)}
      </div>

      <div class="beam-link">
        ${isSuccess ? '<div class="beam-pulse-dot"></div>' : ''}
        <div class="status-badge">${isSuccess ? '✓' : '✕'}</div>
      </div>

      <div class="logo-badge" title="Grokki Studio">
        ${getGrokkiLogoSvg()}
      </div>
    </div>

    <!-- Status Tag -->
    <div class="pill-tag">
      <div class="pill-dot"></div>
      <span>${isSuccess ? 'Authorization Verified' : 'Authentication Error'}</span>
    </div>

    <!-- Main Title -->
    <h1>${heading}</h1>

    <!-- Description -->
    <p class="description">${desc}</p>

    ${userIdentifier ? `
      <div class="user-chip">
        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981;"></span>
        <span>${userIdentifier}</span>
      </div>
    ` : ''}

    <!-- Return to App Button -->
    <button class="btn-action" onclick="closeTab()">
      Return to Grokki Studio
    </button>

    ${isSuccess ? `
      <div class="countdown-text" id="countdownLabel">Closing tab in <b id="countdownSec">5</b>s...</div>
      <div class="countdown-bar">
        <div class="countdown-fill" id="countdownFill"></div>
      </div>
    ` : ''}
  </div>

  <div class="footer">
    <span>Grokki Studio</span>
    <span class="footer-dot">•</span>
    <span>Autonomous Multimodal Companion</span>
    <span class="footer-dot">•</span>
    <span>100% Local Privacy</span>
  </div>

  <script>
    function closeTab() {
      window.close();
      // If browser security blocks window.close()
      setTimeout(() => {
        const btn = document.querySelector('.btn-action');
        if (btn) btn.textContent = 'Ready! You can switch back to Grokki';
      }, 400);
    }

    ${isSuccess ? `
      let timeLeft = 5;
      const secEl = document.getElementById('countdownSec');
      const fillEl = document.getElementById('countdownFill');
      const timer = setInterval(() => {
        timeLeft--;
        if (secEl) secEl.textContent = timeLeft;
        if (fillEl) fillEl.style.width = ((timeLeft / 5) * 100) + '%';
        if (timeLeft <= 0) {
          clearInterval(timer);
          closeTab();
        }
      }, 1000);
    ` : ''}
  </script>
</body>
</html>`;
}

module.exports = { renderOAuthCallbackHtml };
