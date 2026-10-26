/**
 * Grokki Spatial Controller (MediaPipe AI Python Edition)
 * Modes:
 * 1. AIR-CURSOR SPATIAL CONTROL:
 *    - Hand spatial pointer with adaptive EMA filtering (zero jitter)
 *    - Pinch Thumb + Index -> Native Left Click & Drag
 *    - Pinch Thumb + Middle -> Right Click
 *    - 2 Fingers Up (Index + Middle) -> Smooth Document Scrolling
 *    - Fist / Rest Hand -> Cursor Parked (Zero accidental clicks)
 * 2. PRESENTATION MODE:
 *    - 2 Fingers (Index + Middle) -> Next Slide
 *    - 3 Fingers (Index + Middle + Ring) -> Previous Slide
 *    - Open Palm Hold -> Blank Screen ('b' key)
 * 3. NATIVE DRAGGING & INSTANT HARDWARE CAMERA RELEASE
 */

class PresentationGestureController {
  constructor() {
    this.isActive = false;
    this.currentMode = 'presentation'; // 'presentation' or 'air_cursor'

    // UI Elements
    this.hudEl = null;
    this.islandBadgeEl = null;
    this.sensorDotEl = null;
    this.statusTextEl = null;
    this.airBadgeEl = null;
    this.airRadarDotEl = null;
    this.slidesViewEl = null;
    this.airViewEl = null;
    this.slidesTabBtn = null;
    this.airTabBtn = null;
    this.prevIslandDisplay = '';
    this.feedbackTimer = null;

    this.createHud();
    this.setupIslandControls();
    this.listenToPythonDaemon();
  }

  createHud() {
    if (document.getElementById('grokki-presentation-hud')) return;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      #grokki-presentation-hud {
        display: none;
        position: fixed;
        top: 16px;
        left: calc(50% - 165px);
        z-index: 99999;
        width: 330px;
        background: radial-gradient(140% 120% at 50% -20%, rgba(255, 255, 255, 0.15) 0%, rgba(18, 20, 28, 0.90) 45%, rgba(9, 10, 15, 0.96) 100%);
        backdrop-filter: blur(48px) saturate(210%);
        -webkit-backdrop-filter: blur(48px) saturate(210%);
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.88),
                    0 8px 24px -6px rgba(0, 0, 0, 0.55),
                    inset 0 1px 0.5px 0 rgba(255, 255, 255, 0.55);
        border-radius: 24px;
        padding: 13px 15px;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
        user-select: none;
        -webkit-app-region: drag;
        animation: presHudSlideIn 0.32s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: grab;
      }

      #grokki-presentation-hud:active {
        cursor: grabbing;
      }

      @keyframes presHudSlideIn {
        from { opacity: 0; transform: translateY(-10px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .pres-hud-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 11px;
        -webkit-app-region: drag;
      }

      .pres-hud-mode-pill {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        padding: 2.5px 3.5px;
        -webkit-app-region: no-drag !important;
      }

      .pres-mode-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
        -webkit-app-region: no-drag !important;
      }

      .pres-mode-btn:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.08);
      }

      .pres-mode-btn.active {
        background: rgba(56, 189, 248, 0.22);
        border: 1px solid rgba(56, 189, 248, 0.45);
        color: #38bdf8;
        font-weight: 600;
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
      }

      .pres-hud-close {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: rgba(255, 255, 255, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 12px;
        -webkit-app-region: no-drag !important;
        transition: all 0.18s ease;
      }

      .pres-hud-close:hover {
        background: rgba(239, 68, 68, 0.28);
        border-color: rgba(239, 68, 68, 0.55);
        color: #fca5a5;
        transform: scale(1.1);
      }

      .pres-hud-close:active {
        transform: scale(0.95);
      }

      /* Mode 1: Slides Track Bar */
      .pres-sensor-track {
        position: relative;
        height: 22px;
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        margin-bottom: 9px;
        overflow: hidden;
        -webkit-app-region: no-drag !important;
      }

      .pres-sensor-zone-label {
        font-size: 9.5px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.35);
        display: flex;
        align-items: center;
        gap: 4px;
        z-index: 2;
        pointer-events: none;
      }

      .pres-sensor-dot {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 28px;
        height: 14px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(56, 189, 248, 0.65) 0%, rgba(56, 189, 248, 0.15) 100%);
        border: 1px solid rgba(56, 189, 248, 0.8);
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
        transform: translate(-50%, -50%);
        transition: left 0.06s linear, background 0.15s ease, transform 0.15s ease;
        z-index: 1;
        pointer-events: none;
      }

      /* Mode 2: Air Cursor Spatial Radar */
      .air-radar-box {
        position: relative;
        height: 38px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        margin-bottom: 9px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-app-region: no-drag !important;
      }

      .air-radar-grid {
        position: absolute;
        inset: 0;
        background-size: 16px 16px;
        background-image: radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
        pointer-events: none;
      }

      .air-radar-dot {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #38bdf8;
        box-shadow: 0 0 12px #38bdf8;
        border: 2px solid #ffffff;
        transform: translate(-50%, -50%);
        transition: left 0.05s linear, top 0.05s linear, background 0.15s ease, transform 0.15s ease;
        z-index: 2;
        pointer-events: none;
      }

      .air-radar-dot.pinched {
        background: #34d399 !important;
        box-shadow: 0 0 18px #34d399 !important;
        transform: translate(-50%, -50%) scale(1.3) !important;
      }

      .air-gestures-guide {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 9.5px;
        color: rgba(255, 255, 255, 0.42);
        margin-bottom: 9px;
        padding: 0 4px;
      }

      .air-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2.5px 8px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 600;
        background: rgba(56, 189, 248, 0.14);
        border: 1px solid rgba(56, 189, 248, 0.3);
        color: #38bdf8;
      }

      .pres-status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.72);
        margin-bottom: 10px;
        min-height: 20px;
        -webkit-app-region: drag;
      }

      .pres-status-left {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .pres-controls-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 6px;
        -webkit-app-region: no-drag !important;
      }

      .pres-ctrl-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.11);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.88);
        padding: 6px 8px;
        border-radius: 11px;
        cursor: pointer;
        font-size: 11.5px;
        font-weight: 500;
        -webkit-app-region: no-drag !important;
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .pres-ctrl-btn:hover {
        background: rgba(255, 255, 255, 0.14);
        border-color: rgba(255, 255, 255, 0.25);
        color: #ffffff;
        transform: translateY(-1px);
      }

      .pres-ctrl-btn:active {
        transform: scale(0.95);
      }

      .pres-ctrl-btn.primary {
        background: rgba(56, 189, 248, 0.16);
        border-color: rgba(56, 189, 248, 0.38);
        color: #38bdf8;
        font-weight: 600;
      }

      .pres-ctrl-btn.primary:hover {
        background: rgba(56, 189, 248, 0.26);
        border-color: rgba(56, 189, 248, 0.6);
        color: #7dd3fc;
      }

      .air-cursor-mini-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        background: rgba(56, 189, 248, 0.16);
        border: 1px solid rgba(56, 189, 248, 0.38);
        border-radius: 999px;
        color: #38bdf8;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        -webkit-app-region: no-drag !important;
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.22);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        animation: airBadgePulse 2.4s infinite ease-in-out;
      }

      .air-cursor-mini-btn:hover {
        background: rgba(239, 68, 68, 0.25);
        border-color: rgba(239, 68, 68, 0.55);
        color: #fca5a5;
        transform: scale(1.04);
      }

      .air-cursor-mini-btn.dragging {
        background: rgba(52, 211, 153, 0.25);
        border-color: rgba(52, 211, 153, 0.6);
        color: #34d399;
        box-shadow: 0 0 18px rgba(52, 211, 153, 0.45);
      }

      @keyframes airBadgePulse {
        0%, 100% { box-shadow: 0 0 8px rgba(56, 189, 248, 0.2); }
        50% { box-shadow: 0 0 16px rgba(56, 189, 248, 0.42); }
      }
    `;
    document.head.appendChild(styleEl);

    const hud = document.createElement('div');
    hud.id = 'grokki-presentation-hud';
    hud.innerHTML = `
      <div class="pres-hud-header" title="Drag anywhere on header to move floating HUD">
        <div class="pres-hud-mode-pill">
          <button id="pres-tab-slides" class="pres-mode-btn active" title="Slides Mode (2 & 3 fingers)">
            <i class="fa-solid fa-display"></i>
            <span>Slides</span>
          </button>
          <button id="pres-tab-aircursor" class="pres-mode-btn" title="Air Cursor (Spatial Mouse Pointer)">
            <i class="fa-solid fa-arrow-pointer"></i>
            <span>Air Cursor</span>
          </button>
        </div>
        <button id="close-pres-hud-btn" class="pres-hud-close" title="Exit Mode & Turn Off Camera">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Mode View A: Slides Mode -->
      <div id="pres-view-slides">
        <div class="pres-sensor-track" title="Live Optical Hand Sensor">
          <span class="pres-sensor-zone-label"><i class="fa-solid fa-hand"></i> 3 Fingers (Prev)</span>
          <div id="pres-sensor-dot" class="pres-sensor-dot"></div>
          <span class="pres-sensor-zone-label">2 Fingers (Next) <i class="fa-solid fa-peace"></i></span>
        </div>

        <div class="pres-controls-grid">
          <button id="pres-prev-btn" class="pres-ctrl-btn" title="Previous Slide (3 Fingers)">
            <i class="fa-solid fa-chevron-left"></i>
            <span>Prev (3)</span>
          </button>
          <button id="pres-black-btn" class="pres-ctrl-btn" title="Blackout Screen (Hold 5)">
            <i class="fa-solid fa-eye-slash"></i>
            <span>Blank (5)</span>
          </button>
          <button id="pres-next-btn" class="pres-ctrl-btn primary" title="Next Slide (2 Fingers)">
            <span>Next (2)</span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- Mode View B: Air Cursor Mode -->
      <div id="pres-view-air" style="display: none;">
        <div class="air-radar-box" title="Spatial Interaction Radar">
          <div class="air-radar-grid"></div>
          <div id="air-radar-dot" class="air-radar-dot"></div>
        </div>

        <div class="air-gestures-guide">
          <span><i class="fa-solid fa-hand-pointer"></i> Move: Glide</span>
          <span><i class="fa-solid fa-peace"></i> Touch 2: Drag/Drop</span>
          <span><i class="fa-solid fa-arrows-up-down"></i> 3-Fingers: Scroll</span>
        </div>
      </div>

      <!-- Shared Status Row -->
      <div class="pres-status-row">
        <div id="pres-status-text" class="pres-status-left">
          <i class="fa-solid fa-spinner fa-spin" style="color: #38bdf8;"></i>
          <span>Starting Spatial 1-Hand AI...</span>
        </div>
        <span id="air-status-badge" class="air-badge" style="display: none;">
          <i class="fa-solid fa-arrow-pointer"></i> Moving
        </span>
      </div>
    `;

    document.body.appendChild(hud);
    this.hudEl = hud;
    this.sensorDotEl = document.getElementById('pres-sensor-dot');
    this.statusTextEl = document.getElementById('pres-status-text');
    this.airBadgeEl = document.getElementById('air-status-badge');
    this.airRadarDotEl = document.getElementById('air-radar-dot');
    this.slidesViewEl = document.getElementById('pres-view-slides');
    this.airViewEl = document.getElementById('pres-view-air');
    this.slidesTabBtn = document.getElementById('pres-tab-slides');
    this.airTabBtn = document.getElementById('pres-tab-aircursor');

    // Controls
    document.getElementById('pres-prev-btn').addEventListener('click', () => this.triggerManual('prev'));
    document.getElementById('pres-black-btn').addEventListener('click', () => this.triggerManual('blackout'));
    document.getElementById('pres-next-btn').addEventListener('click', () => this.triggerManual('next'));

    // Mode Tabs
    this.slidesTabBtn.addEventListener('click', () => this.switchMode('presentation'));
    this.airTabBtn.addEventListener('click', () => this.switchMode('air_cursor'));

    // Close button: explicitly stop mode and shut down camera
    const closeBtn = document.getElementById('close-pres-hud-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.stop();
      });
    }
  }

  setupIslandControls() {
    if (this.islandBadgeEl) return;
    const existing = document.getElementById('airCursorIslandBadge');
    if (existing) {
      this.islandBadgeEl = existing;
      return;
    }

    const controlsGroup = document.getElementById('normalControlsGroup');
    if (!controlsGroup) {
      setTimeout(() => this.setupIslandControls(), 500);
      return;
    }

    const btn = document.createElement('button');
    btn.id = 'airCursorIslandBadge';
    btn.className = 'air-cursor-mini-btn';
    btn.style.display = 'none';
    btn.title = 'Air Cursor Active (Touch Index+Middle to Drag) · Click to Stop & Turn Off Camera';
    btn.innerHTML = `
      <i class="fa-solid fa-hand-pointer" style="color: #38bdf8;"></i>
      <span>Air Cursor</span>
      <i class="fa-solid fa-xmark" style="font-size: 10px; margin-left: 2px; opacity: 0.7;"></i>
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.stop();
    });

    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
      controlsGroup.insertBefore(btn, sendBtn);
    } else {
      controlsGroup.appendChild(btn);
    }
    this.islandBadgeEl = btn;
  }

  updateIslandBadge(active, state = 'move') {
    if (!this.islandBadgeEl) this.setupIslandControls();
    const btn = this.islandBadgeEl || document.getElementById('airCursorIslandBadge');
    const bubble = document.getElementById('grokkiHiBubble');

    if (!active) {
      if (btn) btn.style.display = 'none';
      if (bubble && bubble.textContent && bubble.textContent.includes('Air Cursor')) {
        bubble.textContent = 'Ready';
      }
      return;
    }

    if (btn) {
      btn.style.display = 'inline-flex';
      if (state === 'drag') {
        btn.classList.add('dragging');
        btn.innerHTML = `
          <i class="fa-solid fa-hand-holding" style="color: #34d399;"></i>
          <span>Dragging</span>
          <i class="fa-solid fa-xmark" style="font-size: 10px; margin-left: 2px; opacity: 0.7;"></i>
        `;
      } else if (state === 'scroll') {
        btn.classList.remove('dragging');
        btn.innerHTML = `
          <i class="fa-solid fa-arrows-up-down" style="color: #fbbf24;"></i>
          <span>Scrolling</span>
          <i class="fa-solid fa-xmark" style="font-size: 10px; margin-left: 2px; opacity: 0.7;"></i>
        `;
      } else {
        btn.classList.remove('dragging');
        btn.innerHTML = `
          <i class="fa-solid fa-hand-pointer" style="color: #38bdf8;"></i>
          <span>Air Cursor</span>
          <i class="fa-solid fa-xmark" style="font-size: 10px; margin-left: 2px; opacity: 0.7;"></i>
        `;
      }
    }

    if (bubble) {
      bubble.textContent = state === 'drag' ? 'Holding 🤏' : 'Air Cursor ✌️';
    }
  }

  switchMode(mode) {
    this.currentMode = mode;
    const island = document.getElementById('islandContainer');

    if (mode === 'air_cursor') {
      // In Air Cursor mode: do NOT show floating HUD window; keep Grokki Island visible!
      if (this.hudEl) this.hudEl.style.display = 'none';
      if (island) {
        island.style.display = '';
        island.classList.remove('hidden-state');
      }
      this.updateIslandBadge(true, 'move');
    } else {
      // In Presentation mode: show floating HUD window, minimize Grokki Island
      if (island) island.style.display = 'none';
      if (this.hudEl) this.hudEl.style.display = 'block';
      this.updateIslandBadge(false);

      if (this.airTabBtn) this.airTabBtn.classList.remove('active');
      if (this.slidesTabBtn) this.slidesTabBtn.classList.add('active');
      if (this.airViewEl) this.airViewEl.style.display = 'none';
      if (this.slidesViewEl) this.slidesViewEl.style.display = 'block';
      if (this.airBadgeEl) this.airBadgeEl.style.display = 'none';
      if (this.statusTextEl) {
        this.statusTextEl.innerHTML = `
          <i class="fa-solid fa-hand" style="color: #34d399;"></i>
          <span>Ready · Show 2 fingers for Next, 3 for Prev</span>
        `;
      }
    }

    if (window.jarvisAPI && window.jarvisAPI.setGestureMode) {
      window.jarvisAPI.setGestureMode(mode);
    }
  }

  listenToPythonDaemon() {
    if (!window.jarvisAPI || !window.jarvisAPI.onPresentationGesture) return;

    window.jarvisAPI.onPresentationGesture((data) => {
      if (!this.isActive) return;

      // 1. Air Cursor Telemetry
      if (data.type === 'air_cursor') {
        if (this.currentMode === 'air_cursor') {
          this.updateIslandBadge(true, data.state);
        }
        if (this.airRadarDotEl && data.x !== undefined && data.y !== undefined) {
          const px = Math.max(8, Math.min(92, data.x * 100));
          const py = Math.max(12, Math.min(88, data.y * 100));
          this.airRadarDotEl.style.left = `${px.toFixed(1)}%`;
          this.airRadarDotEl.style.top = `${py.toFixed(1)}%`;

          if (data.pinched) {
            this.airRadarDotEl.classList.add('pinched');
          } else {
            this.airRadarDotEl.classList.remove('pinched');
          }
        }

        if (this.airBadgeEl) {
          if (data.state === 'drag') {
            this.airBadgeEl.innerHTML = `<i class="fa-solid fa-hand-holding"></i> Pinch Drag`;
            this.airBadgeEl.style.background = 'rgba(52, 211, 153, 0.2)';
            this.airBadgeEl.style.borderColor = 'rgba(52, 211, 153, 0.5)';
            this.airBadgeEl.style.color = '#34d399';
          } else if (data.state === 'scroll') {
            this.airBadgeEl.innerHTML = `<i class="fa-solid fa-arrows-up-down"></i> Scrolling`;
            this.airBadgeEl.style.background = 'rgba(251, 191, 36, 0.2)';
            this.airBadgeEl.style.borderColor = 'rgba(251, 191, 36, 0.5)';
            this.airBadgeEl.style.color = '#fbbf24';
          } else if (data.state === 'right_click') {
            this.airBadgeEl.innerHTML = `<i class="fa-solid fa-mouse"></i> Right Click`;
            this.airBadgeEl.style.background = 'rgba(168, 85, 247, 0.2)';
            this.airBadgeEl.style.borderColor = 'rgba(168, 85, 247, 0.5)';
            this.airBadgeEl.style.color = '#c084fc';
          } else {
            this.airBadgeEl.innerHTML = `<i class="fa-solid fa-arrow-pointer"></i> Moving`;
            this.airBadgeEl.style.background = 'rgba(56, 189, 248, 0.14)';
            this.airBadgeEl.style.borderColor = 'rgba(56, 189, 248, 0.3)';
            this.airBadgeEl.style.color = '#38bdf8';
          }
        }
      }

      // 2. Presentation Slide Gestures
      else if (data.type === 'hand' && this.currentMode === 'presentation') {
        const pct = Math.max(12, Math.min(88, data.x * 100));
        if (this.sensorDotEl) {
          this.sensorDotEl.style.left = `${pct.toFixed(1)}%`;
          this.sensorDotEl.style.background = 'rgba(52, 211, 153, 0.9)';
        }
        if (this.statusTextEl && !this.feedbackTimer) {
          const fingers = data.fingers;
          let icon = 'fa-hand';
          let label = data.label || 'Hand Active';
          if (fingers === 2) {
            icon = 'fa-peace';
            label = '✌️ 2 Fingers Detected (Next Slide)';
          } else if (fingers === 3) {
            icon = 'fa-hand';
            label = '🤟 3 Fingers Detected (Previous Slide)';
          } else if (fingers === 5) {
            icon = 'fa-hand';
            label = '✋ Open Palm (Hold for Blank Screen)';
          }
          this.statusTextEl.innerHTML = `
            <i class="fa-solid ${icon}" style="color: #34d399;"></i>
            <span>${label}</span>
          `;
        }
      }

      // 3. Actions
      else if (data.type === 'action') {
        this.playHapticTick(data.action);
        if (data.action === 'emergency_lock') {
          this.showFeedback('fa-solid fa-lock', '🚨 Emergency Sign Out Triggered', '#ef4444');
          this.stop();
        } else if (data.action === 'stop_air_cursor') {
          this.showFeedback('fa-solid fa-hand', '✋ Open Palm · Air Cursor Stopped', '#fbbf24');
          this.stop();
        } else if (data.action === 'next') {
          this.showFeedback('fa-solid fa-peace', data.reason || '✌️ 2 Fingers · Next Slide', '#34d399');
        } else if (data.action === 'prev') {
          this.showFeedback('fa-solid fa-hand', data.reason || '🤟 3 Fingers · Previous Slide', '#38bdf8');
        } else if (data.action === 'blackout') {
          this.showFeedback('fa-solid fa-eye-slash', data.reason || '✋ Open Palm · Screen Blanked', '#fbbf24');
        }
      }

      // 4. Status, Ready, and Error Handling
      else if (data.type === 'status') {
        if (this.statusTextEl && !this.feedbackTimer) {
          this.statusTextEl.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin" style="color: #38bdf8;"></i>
            <span>${data.message || 'Connecting to Spatial AI...'}</span>
          `;
        }
      } else if (data.type === 'error' || data.type === 'exit') {
        if (this.statusTextEl) {
          this.statusTextEl.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="color: #f87171;"></i>
            <span>Webcam unavailable · Use manual controls</span>
          `;
        }
      } else if (data.type === 'ready') {
        if (data.mode) {
          this.switchMode(data.mode);
        }
        if (this.statusTextEl) {
          this.statusTextEl.innerHTML = this.currentMode === 'air_cursor'
            ? `<i class="fa-solid fa-hand" style="color: #34d399;"></i><span>Air Cursor Ready · Pinch to click</span>`
            : `<i class="fa-solid fa-hand" style="color: #34d399;"></i><span>Ready · Show 2 fingers for Next, 3 for Prev</span>`;
        }
        this.showFeedback('fa-solid fa-circle-check', 'Spatial 1-Hand AI Online', '#34d399');
      } else if (data.type === 'no_hand') {
        if (this.sensorDotEl) {
          this.sensorDotEl.style.left = '50%';
          this.sensorDotEl.style.background = '';
        }
        if (this.airRadarDotEl) {
          this.airRadarDotEl.style.left = '50%';
          this.airRadarDotEl.style.top = '50%';
          this.airRadarDotEl.classList.remove('pinched');
        }
        if (this.statusTextEl && !this.feedbackTimer) {
          this.statusTextEl.innerHTML = this.currentMode === 'air_cursor'
            ? `<i class="fa-solid fa-hand" style="color: #38bdf8;"></i><span>Aim hand at screen to control cursor</span>`
            : `<i class="fa-solid fa-hand" style="color: #38bdf8;"></i><span>Ready · Show 2 fingers for Next, 3 for Prev</span>`;
        }
      }
    });

    if (window.jarvisAPI && window.jarvisAPI.onLeftHandAction) {
      window.jarvisAPI.onLeftHandAction((data) => {
        this.playHapticTick('next');
        const targetApp = data.app ? data.app.toUpperCase() : 'APP';
        const label = `Left Hand (${data.fingers} finger${data.fingers > 1 ? 's' : ''}) -> Opened ${targetApp}`;
        this.showFeedback('fa-solid fa-bolt', label, '#38bdf8');
        if (this.islandBadgeEl) {
          const prevHTML = this.islandBadgeEl.innerHTML;
          this.islandBadgeEl.innerHTML = `<i class="fa-solid fa-bolt" style="color: #38bdf8;"></i> ${targetApp}`;
          setTimeout(() => {
            if (this.islandBadgeEl && this.isActive) {
              this.updateIslandBadge(true, 'move');
            }
          }, 1600);
        }
      });
    }
  }

  playHapticTick(action) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(action === 'next' ? 720 : action === 'prev' ? 520 : 380, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.065);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.07);
    } catch (e) {}
  }

  showFeedback(iconClass, text, accentColor = '#38bdf8') {
    if (!this.statusTextEl) return;
    this.statusTextEl.innerHTML = `
      <i class="${iconClass}" style="color: ${accentColor};"></i>
      <span style="color: #ffffff; font-weight: 600;">${text}</span>
    `;
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => {
      this.feedbackTimer = null;
      if (this.isActive && this.statusTextEl) {
        this.statusTextEl.innerHTML = this.currentMode === 'air_cursor'
          ? `<i class="fa-solid fa-hand" style="color: #38bdf8;"></i><span>Air Cursor Ready · Pinch to click</span>`
          : `<i class="fa-solid fa-hand" style="color: #38bdf8;"></i><span>Ready · Show 2 fingers for Next, 3 for Prev</span>`;
      }
    }, 1200);
  }

  async triggerManual(action) {
    this.playHapticTick(action);
    if (action === 'next') {
      this.showFeedback('fa-solid fa-arrow-right', 'Next Slide · Manual Click', '#34d399');
    } else if (action === 'prev') {
      this.showFeedback('fa-solid fa-arrow-left', 'Previous Slide · Manual Click', '#38bdf8');
    } else {
      this.showFeedback('fa-solid fa-eye-slash', 'Screen Blanked · Manual Click', '#fbbf24');
    }

    if (window.jarvisAPI && window.jarvisAPI.slideControl) {
      window.jarvisAPI.slideControl(action);
    }
  }

  start(mode = 'presentation') {
    if (this.isActive) {
      if (mode && mode !== this.currentMode) {
        this.switchMode(mode);
      }
      return;
    }
    this.isActive = true;
    this.currentMode = mode;

    const island = document.getElementById('islandContainer');

    if (mode === 'air_cursor') {
      // In Air Cursor mode: keep Grokki Island visible and hide floating presentation HUD completely!
      if (island) {
        island.style.display = '';
        island.classList.remove('hidden-state');
      }
      if (this.hudEl) {
        this.hudEl.style.display = 'none';
      }
      this.updateIslandBadge(true, 'move');
      if (window.jarvisAPI && window.jarvisAPI.showWindow) {
        window.jarvisAPI.showWindow();
      }
    } else {
      // Presentation Mode: show floating HUD and minimize Island bar
      if (island) {
        this.prevIslandDisplay = island.style.display;
        island.style.display = 'none';
      }
      if (this.hudEl) {
        this.hudEl.style.display = 'block';
        this.switchMode('presentation');
        if (this.statusTextEl) {
          this.statusTextEl.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin" style="color: #38bdf8;"></i>
            <span>Starting Spatial 1-Hand AI...</span>
          `;
        }
      }
      this.updateIslandBadge(false);
    }

    // Start Python MediaPipe Spatial AI Daemon via Electron IPC
    if (window.jarvisAPI && window.jarvisAPI.togglePresentationMode) {
      window.jarvisAPI.togglePresentationMode(true, mode);
    }
  }

  cleanupUi() {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }

    if (this.hudEl) {
      this.hudEl.style.display = 'none';
    }

    this.updateIslandBadge(false);

    // Restore Island container to visible interactive state
    const island = document.getElementById('islandContainer');
    if (island) {
      island.style.display = '';
      island.classList.remove('hidden-state');
    }
    if (window.jarvisAPI && window.jarvisAPI.resetWindowPosition) {
      window.jarvisAPI.resetWindowPosition();
    }
  }

  stop(notifyMain = true) {
    if (!this.isActive) {
      this.cleanupUi();
      return;
    }
    this.isActive = false;
    this.cleanupUi();

    // Only notify Main if stop was initiated from renderer (avoids infinite loop)
    if (notifyMain) {
      if (window.jarvisAPI && window.jarvisAPI.togglePresentationMode) {
        window.jarvisAPI.togglePresentationMode(false);
      }
      if (window.jarvisAPI && window.jarvisAPI.killCamera) {
        window.jarvisAPI.killCamera();
      }
    }
  }

  toggle(mode = 'presentation') {
    if (this.isActive) this.stop();
    else this.start(mode);
  }
}

window.presentationController = new PresentationGestureController();

if (window.jarvisAPI && window.jarvisAPI.onPresentationModeToggled) {
  window.jarvisAPI.onPresentationModeToggled((data) => {
    if (data && data.active) {
      window.presentationController.start(data.mode || 'presentation');
    } else {
      window.presentationController.stop(false);
    }
  });
}
