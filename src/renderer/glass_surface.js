/**
 * GlassSurface Effect for Grokki Dynamic Island
 * Ported directly from React Bits GlassSurface
 * 
 * Exact parameters:
 * - width / height: auto-adapts to island container
 * - borderRadius: 38 (36 on pill, 28 when drawer/settings open)
 * - distortionScale: -180
 * - displace: 0.5
 * - backgroundOpacity: 0.1
 * - borderWidth: 0.07
 * - brightness: 50
 * - opacity: 0.93
 * - blur: 11
 * - saturation: 1
 * - redOffset: 0
 * - greenOffset: 10
 * - blueOffset: 20
 * - refraction: true
 * - renderer: 'auto'
 */

(function () {
  class GlassSurfaceEffect {
    constructor(containerElement, options = {}) {
      this.container = containerElement || document.getElementById('islandContainer');
      this.options = {
        borderRadius: options.borderRadius || 38,
        distortionScale: options.distortionScale !== undefined ? options.distortionScale : -180,
        displace: options.displace !== undefined ? options.displace : 0.5,
        backgroundOpacity: options.backgroundOpacity !== undefined ? options.backgroundOpacity : 0.1,
        borderWidth: options.borderWidth !== undefined ? options.borderWidth : 0.07,
        brightness: options.brightness !== undefined ? options.brightness : 50,
        opacity: options.opacity !== undefined ? options.opacity : 0.93,
        blur: options.blur !== undefined ? options.blur : 11,
        saturation: options.saturation !== undefined ? options.saturation : 1,
        redOffset: options.redOffset !== undefined ? options.redOffset : 0,
        greenOffset: options.greenOffset !== undefined ? options.greenOffset : 10,
        blueOffset: options.blueOffset !== undefined ? options.blueOffset : 20,
        mixBlendMode: options.mixBlendMode || 'difference',
        theme: options.theme || 'original',
      };

      this.currentTheme = this.options.theme;
      this.filterId = 'grokki-glass-filter';
      this.feImageId = 'grokki-glass-feImage';
      this.svgDefsElement = null;
      this.feImageElement = null;
      this.resizeObserver = null;
      this.lastSignature = '';

      this.init();
    }

    init() {
      this.injectSvgDefs();
      this.injectSheenAndRim();
      this.setupResizeObserver();
      this.setupPointerRefraction();
      this.setTheme(this.currentTheme);
    }

    injectSvgDefs() {
      if (document.getElementById('glassSurfaceSvgDefs')) {
        this.svgDefsElement = document.getElementById('glassSurfaceSvgDefs');
        this.feImageElement = document.getElementById(this.feImageId);
        return;
      }

      const svgNs = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNs, 'svg');
      svg.id = 'glassSurfaceSvgDefs';
      svg.setAttribute('class', 'glass-svg-defs');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.position = 'absolute';
      svg.style.width = '0';
      svg.style.height = '0';
      svg.style.overflow = 'hidden';
      svg.style.pointerEvents = 'none';

      const defs = document.createElementNS(svgNs, 'defs');

      const filter = document.createElementNS(svgNs, 'filter');
      filter.id = this.filterId;
      filter.setAttribute('color-interpolation-filters', 'sRGB');
      filter.setAttribute('x', '0%');
      filter.setAttribute('y', '0%');
      filter.setAttribute('width', '100%');
      filter.setAttribute('height', '100%');

      const feImage = document.createElementNS(svgNs, 'feImage');
      feImage.id = this.feImageId;
      feImage.setAttribute('x', '0');
      feImage.setAttribute('y', '0');
      feImage.setAttribute('width', '100%');
      feImage.setAttribute('height', '100%');
      feImage.setAttribute('preserveAspectRatio', 'none');
      feImage.setAttribute('result', 'map');

      // Red Channel Displacement & ColorMatrix
      const dispRed = document.createElementNS(svgNs, 'feDisplacementMap');
      dispRed.setAttribute('id', 'grokki-disp-red');
      dispRed.setAttribute('in', 'SourceGraphic');
      dispRed.setAttribute('in2', 'map');
      dispRed.setAttribute('scale', (this.options.distortionScale + this.options.redOffset).toString());
      dispRed.setAttribute('xChannelSelector', 'R');
      dispRed.setAttribute('yChannelSelector', 'G');
      dispRed.setAttribute('result', 'dispRed');

      const colRed = document.createElementNS(svgNs, 'feColorMatrix');
      colRed.setAttribute('in', 'dispRed');
      colRed.setAttribute('type', 'matrix');
      colRed.setAttribute('values', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0');
      colRed.setAttribute('result', 'red');

      // Green Channel Displacement & ColorMatrix
      const dispGreen = document.createElementNS(svgNs, 'feDisplacementMap');
      dispGreen.setAttribute('id', 'grokki-disp-green');
      dispGreen.setAttribute('in', 'SourceGraphic');
      dispGreen.setAttribute('in2', 'map');
      dispGreen.setAttribute('scale', (this.options.distortionScale + this.options.greenOffset).toString());
      dispGreen.setAttribute('xChannelSelector', 'R');
      dispGreen.setAttribute('yChannelSelector', 'G');
      dispGreen.setAttribute('result', 'dispGreen');

      const colGreen = document.createElementNS(svgNs, 'feColorMatrix');
      colGreen.setAttribute('in', 'dispGreen');
      colGreen.setAttribute('type', 'matrix');
      colGreen.setAttribute('values', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0');
      colGreen.setAttribute('result', 'green');

      // Blue Channel Displacement & ColorMatrix
      const dispBlue = document.createElementNS(svgNs, 'feDisplacementMap');
      dispBlue.setAttribute('id', 'grokki-disp-blue');
      dispBlue.setAttribute('in', 'SourceGraphic');
      dispBlue.setAttribute('in2', 'map');
      dispBlue.setAttribute('scale', (this.options.distortionScale + this.options.blueOffset).toString());
      dispBlue.setAttribute('xChannelSelector', 'R');
      dispBlue.setAttribute('yChannelSelector', 'G');
      dispBlue.setAttribute('result', 'dispBlue');

      const colBlue = document.createElementNS(svgNs, 'feColorMatrix');
      colBlue.setAttribute('in', 'dispBlue');
      colBlue.setAttribute('type', 'matrix');
      colBlue.setAttribute('values', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0');
      colBlue.setAttribute('result', 'blue');

      // Screen blend channels
      const blendRg = document.createElementNS(svgNs, 'feBlend');
      blendRg.setAttribute('in', 'red');
      blendRg.setAttribute('in2', 'green');
      blendRg.setAttribute('mode', 'screen');
      blendRg.setAttribute('result', 'rg');

      const blendRgb = document.createElementNS(svgNs, 'feBlend');
      blendRgb.setAttribute('in', 'rg');
      blendRgb.setAttribute('in2', 'blue');
      blendRgb.setAttribute('mode', 'screen');
      blendRgb.setAttribute('result', 'output');

      // Dispersion / blur smoothing
      const feBlur = document.createElementNS(svgNs, 'feGaussianBlur');
      feBlur.setAttribute('in', 'output');
      feBlur.setAttribute('stdDeviation', this.options.displace.toString());

      filter.appendChild(feImage);
      filter.appendChild(dispRed);
      filter.appendChild(colRed);
      filter.appendChild(dispGreen);
      filter.appendChild(colGreen);
      filter.appendChild(dispBlue);
      filter.appendChild(colBlue);
      filter.appendChild(blendRg);
      filter.appendChild(blendRgb);
      filter.appendChild(feBlur);

      defs.appendChild(filter);
      svg.appendChild(defs);
      document.body.appendChild(svg);

      this.svgDefsElement = svg;
      this.feImageElement = feImage;
    }

    injectSheenAndRim() {
      if (!this.container) return;
      if (!this.container.querySelector('.glass-surface-sheen')) {
        const sheen = document.createElement('div');
        sheen.className = 'glass-surface-sheen';
        sheen.setAttribute('aria-hidden', 'true');
        this.container.appendChild(sheen);
      }
      if (!this.container.querySelector('.glass-surface-rim')) {
        const rim = document.createElement('div');
        rim.className = 'glass-surface-rim';
        rim.setAttribute('aria-hidden', 'true');
        this.container.appendChild(rim);
      }
    }

    generateDisplacementMapUrl(w, h, r) {
      const width = Math.max(10, Math.round(w));
      const height = Math.max(10, Math.round(h));
      const borderRadius = Math.max(0, Math.round(r));
      const edgeSize = Math.max(1, Math.min(width, height) * (this.options.borderWidth * 0.5));

      const redGradId = 'grokki-red-grad';
      const blueGradId = 'grokki-blue-grad';
      const softId = 'grokki-soft-filter';

      const innerW = Math.max(1, width - edgeSize * 2);
      const innerH = Math.max(1, height - edgeSize * 2);

      const svgContent = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#0000"/>
              <stop offset="100%" stop-color="red"/>
            </linearGradient>
            <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0000"/>
              <stop offset="100%" stop-color="blue"/>
            </linearGradient>
            <filter id="${softId}" filterUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" color-interpolation-filters="sRGB">
              <feGaussianBlur stdDeviation="${this.options.blur}" />
            </filter>
          </defs>
          <rect x="0" y="0" width="${width}" height="${height}" fill="black" />
          <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" fill="url(#${redGradId})" />
          <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${this.options.mixBlendMode}" />
          <rect x="${edgeSize}" y="${edgeSize}" width="${innerW}" height="${innerH}" rx="${borderRadius}" fill="hsl(0 0% ${this.options.brightness}% / ${this.options.opacity})" filter="url(#${softId})" />
        </svg>
      `;

      return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
    }

    updateDisplacementMap() {
      if (!this.container || !this.feImageElement || this.currentTheme !== 'glass') return;

      const rect = this.container.getBoundingClientRect();
      const w = rect.width || 630;
      const h = rect.height || 72;

      // Determine appropriate corner radius based on pill state
      const isExpanded = this.container.classList.contains('has-drawer-open') || 
                         this.container.classList.contains('has-settings-open');
      const r = isExpanded ? 28 : (this.options.borderRadius || 38);

      const sig = `${w}|${h}|${r}`;
      if (sig === this.lastSignature) return;
      this.lastSignature = sig;

      const mapUrl = this.generateDisplacementMapUrl(w, h, r);
      this.feImageElement.setAttribute('href', mapUrl);
    }

    setupResizeObserver() {
      if (!this.container || typeof ResizeObserver === 'undefined') return;

      this.resizeObserver = new ResizeObserver(() => {
        if (this.currentTheme === 'glass') {
          this.updateDisplacementMap();
        }
      });

      this.resizeObserver.observe(this.container);
    }

    setupPointerRefraction() {
      if (!this.container) return;
      let rafId = null;
      let targetX = 50;
      let targetY = 0;
      let currentX = 50;
      let currentY = 0;

      const updateSpring = () => {
        currentX += (targetX - currentX) * 0.16;
        currentY += (targetY - currentY) * 0.16;
        this.container.style.setProperty('--glass-pointer-x', `${currentX.toFixed(1)}%`);
        this.container.style.setProperty('--glass-pointer-y', `${currentY.toFixed(1)}%`);
        if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
          rafId = requestAnimationFrame(updateSpring);
        } else {
          rafId = null;
        }
      };

      const onPointerMove = (e) => {
        if (this.currentTheme !== 'glass') return;
        const rect = this.container.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        targetX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        targetY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        if (!rafId) {
          rafId = requestAnimationFrame(updateSpring);
        }
      };

      const onPointerLeave = () => {
        targetX = 50;
        targetY = 0;
        if (!rafId) {
          rafId = requestAnimationFrame(updateSpring);
        }
      };

      this.container.addEventListener('pointermove', onPointerMove, { passive: true });
      this.container.addEventListener('pointerleave', onPointerLeave, { passive: true });
    }

    setTheme(theme) {
      this.currentTheme = theme === 'glass' ? 'glass' : 'original';

      if (!this.container) return;

      if (this.currentTheme === 'glass') {
        this.container.classList.add('theme-glass');
        this.updateDisplacementMap();
      } else {
        this.container.classList.remove('theme-glass');
      }
    }

    getTheme() {
      return this.currentTheme;
    }

    destroy() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      if (this.container) {
        this.container.classList.remove('theme-glass');
      }
    }
  }

  window.GlassSurfaceEffect = GlassSurfaceEffect;
})();
