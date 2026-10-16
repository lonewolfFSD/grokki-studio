/**
 * Grokki - The Animated Cute Companion
 * Features:
 * - Jelly spring physics (squash & stretch on clicks and jumps)
 * - Hyper-expressive eye motions: curious head tilts, saccades, micro-twitches, winks
 * - Poke / click reaction: squashes, hops, winks, and giggles
 * - Real-time typing tracking (glances down at keystrokes with playful rhythm)
 */

class Grokbot {
  constructor(canvas, soundEngine, orbInstance = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = soundEngine;
    this.orb = orbInstance;

    this.width = canvas.width;
    this.height = canvas.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.radius = 27;

    // States: 'idle', 'listening', 'typing', 'thinking', 'speaking', 'happy', 'poked'
    this.state = 'idle';

    // Gaze Physics (Spring-damped normalized -1 to 1)
    this.targetX = 0.25;
    this.targetY = -0.15;
    this.currentX = 0.25;
    this.currentY = -0.15;
    this.velocityX = 0;
    this.velocityY = 0;

    // Head / Body Tilt
    this.bodyTilt = 0;
    this.targetTilt = 0;

    // Jelly Squash & Stretch Physics
    this.scaleX = 1;
    this.scaleY = 1;
    this.targetScaleX = 1;
    this.targetScaleY = 1;
    this.scaleVelX = 0;
    this.scaleVelY = 0;
    this.hopOffsetY = 0;
    this.hopVelY = 0;

    // Eye specs (Signature Grok tilted twin pills)
    this.eyeAngle = -0.38; // ~ -22 degrees tilt
    this.pillWidth = 5.2;
    this.pillHeight1 = 15; // Left pill
    this.pillHeight2 = 18; // Right pill
    this.pillGap = 7;

    // Blinking & Winking
    this.blinkProgress = 0;
    this.isBlinking = false;
    this.isWinking = false; // Only right eye or left eye closes
    this.nextBlink = Date.now() + 2000;

    // Motion timing
    this.breathPhase = 0;
    this.audioLevel = 0;
    this.typingTimer = null;
    this.lastGlanceTime = Date.now();

    this.setupInteractions();
    this.startLoop();
  }

  setupInteractions() {
    this.canvas.addEventListener('click', (e) => {
      e.stopPropagation();
      this.poke();
    });
  }

  // Cute reaction when clicking or poking Grokki
  poke() {
    if (this.sound) this.sound.playPoke();
    if (this.orb && typeof this.orb.pulse === 'function') {
      this.orb.pulse();
    }

    // Jelly squish flat, then spring upwards
    this.scaleX = 1.38;
    this.scaleY = 0.65;
    this.scaleVelX = -0.35;
    this.scaleVelY = 0.45;
    this.hopVelY = -7.2;

    // Playful head tilt and wink
    this.targetTilt = (Math.random() > 0.5 ? 1 : -1) * 0.28;
    this.isWinking = Math.random() > 0.25;
    this.blinkProgress = 1;
    this.isBlinking = true;
    this.blinkStart = Date.now();
    this.blinkDuration = 260;

    this.state = 'poked';
    setTimeout(() => {
      this.targetTilt = 0;
      this.isWinking = false;
      if (this.state === 'poked') this.state = 'idle';
    }, 1200);
  }

  // Playful greeting animation when launching in the center (smooth eyes, CSS handles body physics)
  sayHi() {
    this.state = 'happy';
    this.targetTilt = 0;
    this.hopOffsetY = 0;
    this.hopVelY = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    setTimeout(() => {
      if (this.state === 'happy') this.state = 'idle';
    }, 1150);
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;

    if (newState === 'happy') {
      // Cheerful double hop
      this.hopVelY = -6;
      this.scaleX = 1.25;
      this.scaleY = 0.78;
      this.targetTilt = 0.18;
      setTimeout(() => {
        this.targetTilt = 0;
        if (this.state === 'happy') this.setState('idle');
      }, 2000);
    } else if (newState === 'thinking') {
      this.targetTilt = -0.22; // curious tilted gaze
      this.scaleX = 0.94;
      this.scaleY = 1.06;
    } else if (newState === 'listening') {
      this.targetTilt = 0.05;
      this.scaleX = 1.05;
      this.scaleY = 0.95;
    } else if (newState === 'idle') {
      this.targetTilt = 0;
      this.targetScaleX = 1;
      this.targetScaleY = 1;
    }
  }

  setAudioLevel(level) {
    this.audioLevel = Math.max(0, Math.min(1, level));
  }

  // Dynamic energetic typing reaction
  onUserTyping() {
    this.state = 'typing';

    // Rhythmically glance down at the letters with micro eye twitches
    const jitter = (Math.random() - 0.5) * 0.25;
    this.targetX = 0.45 + jitter;
    this.targetY = 0.7; // Look down directly at typing
    this.targetTilt = 0.14; // Focus tilt

    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      if (this.state === 'typing') {
        this.state = 'idle';
        this.targetX = 0.25;
        this.targetY = -0.15;
        this.targetTilt = 0;
      }
    }, 1300);
  }

  onMouseMove(mouseX, mouseY) {
    if (this.state === 'typing' || this.state === 'listening' || this.state === 'poked') return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (mouseX - (rect.left + this.centerX)) / 130;
    const y = (mouseY - (rect.top + this.centerY)) / 130;

    this.targetX = Math.max(-0.7, Math.min(0.75, x));
    this.targetY = Math.max(-0.65, Math.min(0.7, y));
    this.targetTilt = this.targetX * 0.2;
  }

  update() {
    const now = Date.now();
    this.breathPhase += 0.055;

    // 1. Spring physics for gaze
    const springK = 0.2;
    const friction = 0.76;

    const forceX = (this.targetX - this.currentX) * springK;
    this.velocityX = (this.velocityX + forceX) * friction;
    this.currentX += this.velocityX;

    const forceY = (this.targetY - this.currentY) * springK;
    this.velocityY = (this.velocityY + forceY) * friction;
    this.currentY += this.velocityY;

    // 2. Spring physics for head tilt
    this.bodyTilt += (this.targetTilt - this.bodyTilt) * 0.16;

    // 3. Jelly Spring Physics for Scale & Hop
    const jellyK = 0.24;
    const jellyDamp = 0.7;

    const scaleForceX = (this.targetScaleX - this.scaleX) * jellyK;
    this.scaleVelX = (this.scaleVelX + scaleForceX) * jellyDamp;
    this.scaleX += this.scaleVelX;

    const scaleForceY = (this.targetScaleY - this.scaleY) * jellyK;
    this.scaleVelY = (this.scaleVelY + scaleForceY) * jellyDamp;
    this.scaleY += this.scaleVelY;

    // Hop gravity and bounce
    this.hopOffsetY += this.hopVelY;
    if (this.hopOffsetY < 0) {
      this.hopVelY += 0.6; // gravity
    } else {
      this.hopOffsetY = 0;
      this.hopVelY = 0;
    }

    // 4. Energetic idle saccades (natural wandering eye twitches)
    if (this.state === 'idle') {
      if (now - this.lastGlanceTime > 1600 && Math.random() < 0.04) {
        this.lastGlanceTime = now;
        this.targetX = 0.2 + (Math.random() - 0.5) * 0.6;
        this.targetY = -0.1 + (Math.random() - 0.5) * 0.5;
        this.targetTilt = (Math.random() - 0.5) * 0.22;
      }
    }

    // 5. Blinks & Winks
    if (!this.isBlinking && now > this.nextBlink) {
      this.isBlinking = true;
      this.blinkStart = now;
      this.blinkDuration = 160;
      this.isWinking = Math.random() < 0.14;
    }

    if (this.isBlinking) {
      const elapsed = now - this.blinkStart;
      const progress = elapsed / this.blinkDuration;
      if (progress >= 1) {
        this.isBlinking = false;
        this.isWinking = false;
        this.blinkProgress = 0;
        this.nextBlink = now + 2000 + Math.random() * 2800;
      } else {
        this.blinkProgress = Math.sin(progress * Math.PI);
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const cx = this.centerX;
    const cy = this.centerY + this.hopOffsetY;

    // Subtle organic breathing scale
    let breath = Math.sin(this.breathPhase) * 0.018;
    if (this.state === 'listening') {
      breath += this.audioLevel * 0.18;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.bodyTilt);
    ctx.scale(this.scaleX + breath, this.scaleY + breath);

    // 1. Glossy Obsidian Sphere
    this.drawSphere(ctx);

    // 2. Animated Expressive Grok Eyes
    this.drawGrokEyes(ctx);

    ctx.restore();
  }

  drawSphere(ctx) {
    // When WebGL Orb is active, it completely replaces the black sphere at full size
    if (this.orb) return;

    const r = this.radius;

    // Ambient drop shadow (deep luxury depth)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;

    // Solid deep obsidian black (only if WebGL Orb is not active)
    if (!this.orb) {
      ctx.fillStyle = '#060608';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Apple ceramic specular highlight edge
    ctx.save();
    const rimGrad = ctx.createLinearGradient(-r, -r, r, r);
    rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    rimGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.08)');
    rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Soft glass sheen reflection on top
    const sheen = ctx.createRadialGradient(-r * 0.32, -r * 0.42, 1, -r * 0.32, -r * 0.42, r * 0.9);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    sheen.addColorStop(0.6, 'rgba(255, 255, 255, 0.03)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawGrokEyes(ctx) {
    ctx.save();

    // Base face anchor
    const baseOffsetX = 8;
    const baseOffsetY = -5;

    // Spring gaze offset
    const maxLookX = 9;
    const maxLookY = 8;
    const gazeX = this.currentX * maxLookX;
    const gazeY = this.currentY * maxLookY;

    ctx.translate(baseOffsetX + gazeX, baseOffsetY + gazeY);

    // Pill tilt
    let currentAngle = this.eyeAngle;
    if (this.state === 'typing') {
      currentAngle -= 0.14;
    } else if (this.state === 'happy') {
      currentAngle += 0.24;
    } else if (this.state === 'thinking') {
      currentAngle -= 0.2;
    }
    ctx.rotate(currentAngle);

    // Happy eyes (curved happy arcs)
    if (this.state === 'happy') {
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-this.pillGap / 2, 0, 4.5, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.pillGap / 2, 0, 4.8, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Thinking state (curious asymmetrical squint)
    if (this.state === 'thinking') {
      ctx.fillStyle = '#ffffff';
      this.drawRoundedPill(ctx, -this.pillGap / 2 - this.pillWidth / 2, -6, this.pillWidth, 12);
      this.drawRoundedPill(ctx, this.pillGap / 2 - this.pillWidth / 2, -10, this.pillWidth, 8);
      ctx.restore();
      return;
    }

    // Squashes for blinking/winking
    let leftSquash = 1 - this.blinkProgress;
    let rightSquash = 1 - this.blinkProgress;

    if (this.isWinking) {
      leftSquash = 1;
      rightSquash = Math.max(0.08, 1 - this.blinkProgress);
    } else {
      leftSquash = Math.max(0.08, leftSquash);
      rightSquash = Math.max(0.08, rightSquash);
    }

    const pw = this.pillWidth;
    const ph1 = this.pillHeight1 * leftSquash;
    const ph2 = this.pillHeight2 * rightSquash;

    ctx.fillStyle = '#ffffff';

    // Left pill
    this.drawRoundedPill(ctx, -this.pillGap / 2 - pw / 2, -ph1 / 2, pw, ph1);

    // Right pill
    this.drawRoundedPill(ctx, this.pillGap / 2 - pw / 2, -ph2 / 2, pw, ph2);

    ctx.restore();
  }

  drawRoundedPill(ctx, x, y, width, height) {
    const radius = Math.min(width, height) / 2;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.rect(x, y, width, height);
    }
    ctx.fill();
  }

  startLoop() {
    const animate = () => {
      this.update();
      this.draw();
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}

window.Grokbot = Grokbot;
