/**
 * Grokki Touchless Presentation Controller
 * 1. Iron Man Style: Optical Motion Vector Webcam Hand Gesture Control
 *    - Wave Hand Right ➔ Next Slide
 *    - Wave Hand Left ⬅️ Previous Slide
 *    - Open Palm Hold ✋ Blackout Screen (PowerPoint/Google Slides 'B' key)
 * 2. Contextual Voice Cueing (Natural & Hands-Free)
 *    - Direct: "Next slide", "Previous slide", "Blank screen"
 *    - Contextual: "Moving on to the next topic...", "As you can see on the next slide..."
 */

class PresentationGestureController {
  constructor() {
    this.isActive = false;
    this.videoEl = null;
    this.canvasEl = null;
    this.ctx = null;
    this.stream = null;
    this.animId = null;

    // Optical Motion Tracking
    this.prevFrame = null;
    this.motionHistory = [];
    this.lastTriggerTime = 0;
    this.cooldownMs = 750;

    // Voice Cue Recognition
    this.speechRecognizer = null;
    this.isListeningVoice = false;

    // UI HUD
    this.hudEl = null;
    this.createHud();
  }

  createHud() {
    if (document.getElementById('grokki-presentation-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'grokki-presentation-hud';
    hud.style.cssText = `
      display: none;
      position: fixed;
      top: 14px;
      right: 18px;
      z-index: 99999;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(56, 189, 248, 0.4);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
      border-radius: 12px;
      padding: 10px 14px;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      min-width: 250px;
      transition: all 0.25s ease;
      user-select: none;
    `;

    hud.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; color: #38bdf8;">
          <span style="font-size: 14px;">📽️</span> Presentation Mode Active
        </div>
        <button id="close-pres-hud-btn" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 13px; line-height: 1;">✕</button>
      </div>
      <div id="pres-status-text" style="color: #cbd5e1; font-size: 11px; margin-bottom: 8px;">
        🖐️ Wave Left/Right to change slides | 🗣️ "Next slide"
      </div>
      <div style="display: flex; gap: 6px;">
        <button id="pres-prev-btn" style="flex: 1; background: rgba(51, 65, 85, 0.6); border: 1px solid rgba(148, 163, 184, 0.25); color: #f8fafc; padding: 4px 6px; border-radius: 6px; cursor: pointer; font-size: 11px;">⬅️ Prev</button>
        <button id="pres-black-btn" style="flex: 1; background: rgba(51, 65, 85, 0.6); border: 1px solid rgba(148, 163, 184, 0.25); color: #f8fafc; padding: 4px 6px; border-radius: 6px; cursor: pointer; font-size: 11px;">⏹️ Blank</button>
        <button id="pres-next-btn" style="flex: 1; background: rgba(14, 165, 233, 0.25); border: 1px solid rgba(56, 189, 248, 0.5); color: #38bdf8; padding: 4px 6px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600;">Next ➡️</button>
      </div>
    `;

    document.body.appendChild(hud);
    this.hudEl = hud;

    // HUD Button Handlers
    document.getElementById('pres-prev-btn').addEventListener('click', () => this.triggerSlide('prev', 'Manual Prev'));
    document.getElementById('pres-black-btn').addEventListener('click', () => this.triggerSlide('blackout', 'Manual Blank'));
    document.getElementById('pres-next-btn').addEventListener('click', () => this.triggerSlide('next', 'Manual Next'));
    document.getElementById('close-pres-hud-btn').addEventListener('click', () => this.stop());
  }

  showFeedback(text, isNext = true) {
    if (!this.hudEl) return;
    const statusText = document.getElementById('pres-status-text');
    if (statusText) {
      statusText.innerHTML = `<span style="color: ${isNext ? '#4ade80' : '#f59e0b'}; font-weight: 600;">${text}</span>`;
      setTimeout(() => {
        if (this.isActive && statusText) {
          statusText.innerHTML = '🖐️ Wave Left/Right to change slides | 🗣️ "Next slide"';
        }
      }, 1500);
    }
  }

  async triggerSlide(action, reason = '') {
    const now = Date.now();
    if (now - this.lastTriggerTime < this.cooldownMs) return;
    this.lastTriggerTime = now;

    console.log(`[PresentationController] Triggering ${action} (${reason})`);

    // Audio tick/haptic feedback
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(action === 'next' ? 660 : 440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch (e) {}

    const isNext = action === 'next';
    const label = action === 'next' ? '➡️ Next Slide' : (action === 'prev' ? '⬅️ Previous Slide' : '⏹️ Blackout Screen');
    this.showFeedback(`${label} (${reason})`, isNext);

    if (window.jarvisAPI && window.jarvisAPI.slideControl) {
      await window.jarvisAPI.slideControl(action);
    }
  }

  // ==========================================
  // 1. WEBCAM OPTICAL MOTION GESTURE TRACKER
  // ==========================================

  async startWebcamGestureTracker() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } },
        audio: false,
      });

      this.videoEl = document.createElement('video');
      this.videoEl.autoplay = true;
      this.videoEl.playsInline = true;
      this.videoEl.muted = true;
      this.videoEl.srcObject = this.stream;

      await new Promise((resolve) => {
        this.videoEl.onloadedmetadata = () => {
          this.videoEl.play();
          resolve();
        };
      });

      this.canvasEl = document.createElement('canvas');
      this.canvasEl.width = 64;
      this.canvasEl.height = 48;
      this.ctx = this.canvasEl.getContext('2d', { willReadFrequently: true });

      this.prevFrame = null;
      this.motionHistory = [];
      this.processVideoFrame();
      console.log('[PresentationController] Webcam Gesture Tracker started.');
    } catch (err) {
      console.warn('[PresentationController] Webcam could not be accessed:', err.message);
      this.showFeedback('⚠️ Webcam access denied (Voice cues still active)', false);
    }
  }

  processVideoFrame() {
    if (!this.isActive) return;

    if (this.videoEl && this.videoEl.readyState >= 2 && this.ctx) {
      const w = this.canvasEl.width;
      const h = this.canvasEl.height;

      this.ctx.drawImage(this.videoEl, 0, 0, w, h);
      const imgData = this.ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Extract grayscale luminance buffer
      const currentLuma = new Uint8Array(w * h);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        currentLuma[j] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
      }

      if (this.prevFrame) {
        let diffSum = 0;
        let weightedX = 0;
        let diffCount = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const diff = Math.abs(currentLuma[idx] - this.prevFrame[idx]);
            if (diff > 26) { // Sensitivity threshold
              diffSum += diff;
              weightedX += x * diff;
              diffCount++;
            }
          }
        }

        const totalPixels = w * h;
        const motionPct = diffCount / totalPixels;

        if (diffCount > 35 && motionPct < 0.85) {
          const centerX = weightedX / diffSum;
          this.motionHistory.push({ x: centerX, time: performance.now() });

          // Keep sliding window of ~260ms (7 frames)
          if (this.motionHistory.length > 7) {
            this.motionHistory.shift();
          }

          if (this.motionHistory.length >= 5) {
            const first = this.motionHistory[0];
            const last = this.motionHistory[this.motionHistory.length - 1];
            const deltaX = last.x - first.x;
            const deltaTime = last.time - first.time;

            if (deltaTime > 60 && deltaTime < 400) {
              // Note: Front webcam is mirrored. Moving physical hand Left->Right creates deltaX > +10
              if (deltaX > 11) {
                this.triggerSlide('next', '🖐️ Hand Swipe Right');
                this.motionHistory = [];
              } else if (deltaX < -11) {
                this.triggerSlide('prev', '🖐️ Hand Swipe Left');
                this.motionHistory = [];
              }
            }
          }
        } else if (motionPct >= 0.65) {
          // Open Palm / Rapid Cover
          this.triggerSlide('blackout', '✋ Open Palm Blank');
          this.motionHistory = [];
        }
      }

      this.prevFrame = currentLuma;
    }

    this.animId = requestAnimationFrame(() => this.processVideoFrame());
  }

  // ==========================================
  // 2. CONTEXTUAL VOICE CUE DETECTOR
  // ==========================================

  startVoiceCueDetector() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[PresentationController] Web Speech API not supported for voice cues.');
      return;
    }

    try {
      this.speechRecognizer = new SpeechRecognition();
      this.speechRecognizer.continuous = true;
      this.speechRecognizer.interimResults = true;
      this.speechRecognizer.lang = 'en-US';

      this.speechRecognizer.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim();
          this.evaluateVoiceTranscript(transcript);
        }
      };

      this.speechRecognizer.onerror = (e) => {
        // Silently handle recognition restarts
        if (this.isActive && e.error !== 'aborted') {
          setTimeout(() => {
            if (this.isActive) this.restartVoice();
          }, 1000);
        }
      };

      this.speechRecognizer.onend = () => {
        if (this.isActive) {
          this.restartVoice();
        }
      };

      this.speechRecognizer.start();
      this.isListeningVoice = true;
      console.log('[PresentationController] Contextual Voice Cue Detector active.');
    } catch (err) {
      console.warn('[PresentationController] Voice recognizer error:', err.message);
    }
  }

  restartVoice() {
    try {
      if (this.speechRecognizer) {
        this.speechRecognizer.start();
      }
    } catch (e) {}
  }

  evaluateVoiceTranscript(text) {
    if (!text) return;

    // Direct Next triggers
    if (/\b(next\s+slide|slide\s+forward|go\s+forward|advance\s+slide|next\s+page)\b/i.test(text)) {
      this.triggerSlide('next', '🗣️ "Next slide"');
      return;
    }

    // Natural Contextual Transition Cues
    if (/\b(moving\s+on\s+to\s+(the\s+)?next(\s+(slide|topic|point))?|as\s+you\s+can\s+see\s+on\s+(the\s+)?next\s+slide|turning\s+to\s+(the\s+)?next\s+slide|let'?s\s+(look\s+at|move\s+to)\s+(the\s+)?next\s+slide)\b/i.test(text)) {
      this.triggerSlide('next', '🗣️ Contextual Transition');
      return;
    }

    // Direct Previous triggers
    if (/\b(previous\s+slide|prev\s+slide|slide\s+back|go\s+back\s+a\s+slide|back\s+slide|one\s+slide\s+back)\b/i.test(text)) {
      this.triggerSlide('prev', '🗣️ "Previous slide"');
      return;
    }

    // Blackout / Attention pause
    if (/\b(black\s+screen|blank\s+screen|blackout\s+screen|pause\s+presentation)\b/i.test(text)) {
      this.triggerSlide('blackout', '🗣️ "Blank screen"');
    }
  }

  // ==========================================
  // ACTIVATION & LIFECYCLE
  // ==========================================

  start() {
    if (this.isActive) return;
    this.isActive = true;

    if (this.hudEl) this.hudEl.style.display = 'block';

    this.startWebcamGestureTracker();
    this.startVoiceCueDetector();

    console.log('[PresentationController] Touchless presentation slide changer ACTIVE.');
  }

  stop() {
    this.isActive = false;

    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.speechRecognizer) {
      try { this.speechRecognizer.stop(); } catch (e) {}
      this.speechRecognizer = null;
    }

    if (this.hudEl) this.hudEl.style.display = 'none';

    console.log('[PresentationController] Presentation slide changer STOPPED.');
  }

  toggle() {
    if (this.isActive) this.stop();
    else this.start();
  }
}

// Instantiate and bind to window
window.presentationController = new PresentationGestureController();

// Listen to main process IPC events
if (window.jarvisAPI && window.jarvisAPI.onPresentationModeToggled) {
  window.jarvisAPI.onPresentationModeToggled((data) => {
    if (data && data.active) {
      window.presentationController.start();
    } else {
      window.presentationController.stop();
    }
  });
}
