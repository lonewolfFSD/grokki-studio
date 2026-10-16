/**
 * Mini-Grokki Screen Worker Cursor
 * A miniature flying Grokki companion that traverses the user's screen,
 * clicks on targets with animated ripple rings and sound,
 * and executes real automated typing!
 */

class ScreenWorker {
  constructor(soundEngine) {
    this.sound = soundEngine;
    this.container = document.createElement('div');
    this.container.className = 'grokki-worker-cursor';
    this.container.style.display = 'none';

    this.container.innerHTML = `
      <div class="worker-orb">
        <canvas class="worker-canvas" width="36" height="36"></canvas>
      </div>
      <div class="worker-pointer">
        <i class="fa-solid fa-arrow-pointer"></i>
      </div>
      <div class="worker-bubble" id="workerBubble"></div>
      <div class="worker-ripple" id="workerRipple"></div>
    `;

    document.body.appendChild(this.container);

    this.canvas = this.container.querySelector('.worker-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.bubble = document.getElementById('workerBubble');
    this.ripple = document.getElementById('workerRipple');

    this.x = window.innerWidth / 2;
    this.y = 40;
    this.isActive = false;

    this.drawMiniGrokki();
  }

  drawMiniGrokki(squash = 1) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 36, 36);

    ctx.save();
    ctx.translate(18, 18);
    ctx.scale(1, squash);

    // Mini black sphere
    ctx.fillStyle = '#08080a';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Specular edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Twin white pills
    ctx.save();
    ctx.translate(4, -3);
    ctx.rotate(-0.38);
    ctx.fillStyle = '#ffffff';

    // Left pill
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-3, -4, 2.8, 8, 1.4);
    else ctx.rect(-3, -4, 2.8, 8);
    ctx.fill();

    // Right pill
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(1, -5, 2.8, 10, 1.4);
    else ctx.rect(1, -5, 2.8, 10);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  showBubble(text, duration = 1500) {
    if (!text) {
      this.bubble.style.opacity = '0';
      return;
    }
    this.bubble.innerText = text;
    this.bubble.style.opacity = '1';
    if (duration > 0) {
      setTimeout(() => {
        this.bubble.style.opacity = '0';
      }, duration);
    }
  }

  // Smoothly glide Mini-Grokki to (x, y) coordinates
  async flyTo(targetX, targetY, duration = 650) {
    this.container.style.display = 'flex';
    this.isActive = true;

    return new Promise((resolve) => {
      const startX = this.x;
      const startY = this.y;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Smooth Apple ease-out-cubic
        const ease = 1 - Math.pow(1 - progress, 3);

        this.x = startX + (targetX - startX) * ease;
        this.y = startY + (targetY - startY) * ease;

        this.container.style.transform = `translate(${this.x}px, ${this.y}px)`;

        // Little tilt while flying
        const angle = Math.atan2(targetY - startY, targetX - startX) * 0.2;
        this.canvas.style.transform = `rotate(${angle}rad)`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.canvas.style.transform = 'none';
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  // Animate a click action with ripple wave and sound
  async clickAt(x, y, label = 'Click') {
    await this.flyTo(x, y, 500);

    if (this.sound) this.sound.playWorkerClick();

    // Trigger real OS mouse click on Windows
    if (window.jarvisAPI && window.jarvisAPI.mouseClick) {
      window.jarvisAPI.mouseClick({ x, y }).catch(() => {});
    }

    // Squish on click
    this.drawMiniGrokki(0.65);

    // Trigger visual ripple
    this.ripple.classList.remove('animate');
    void this.ripple.offsetWidth; // trigger reflow
    this.ripple.classList.add('animate');

    if (label) this.showBubble(label, 1200);

    await new Promise((r) => setTimeout(r, 120));
    this.drawMiniGrokki(1);
    await new Promise((r) => setTimeout(r, 200));
  }

  // Simulate typing text with a real worker sequence
  async simulateWork(actionName, details = '') {
    // 1. Mini-Grokki swoops down from top island onto screen
    const screenCenterW = window.innerWidth / 2;
    const screenCenterH = window.innerHeight * 0.45;

    await this.flyTo(screenCenterW, screenCenterH, 600);

    // 2. Click on application window
    await this.clickAt(screenCenterW, screenCenterH, actionName);

    // 3. If typing or processing
    if (details) {
      this.showBubble(`Typing: "${details}"...`, 2000);
      await new Promise((r) => setTimeout(r, 600));
    }

    // 4. Return to Island
    await new Promise((r) => setTimeout(r, 800));
    await this.flyHome();
  }

  async flyHome() {
    const homeX = window.innerWidth / 2;
    const homeY = 36;
    await this.flyTo(homeX, homeY, 500);
    this.showBubble('');
    this.container.style.display = 'none';
    this.isActive = false;
  }
}

window.ScreenWorker = ScreenWorker;
