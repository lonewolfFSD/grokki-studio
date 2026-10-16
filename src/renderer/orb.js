/**
 * Orb Effect (WebGL2 High-Performance Shader Orb)
 * Ported from React Bits Orb for vanilla Electron / WebGL2.
 */

(function () {
  const INTRO_SECONDS = 1.1;
  const FOCAL = 3.2;

  const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

  const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uRotation;
uniform vec2 uReach;
uniform float uNear;
uniform float uAwake;
uniform vec3 uBackground;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uScale;
uniform float uWobble;
uniform float uGlow;
uniform float uBleed;
uniform float uHighlight;
uniform float uSwirl;
uniform float uOrbit;
uniform vec2 uEcho;
uniform float uReveal;
uniform float uOpacity;
uniform float uTrail;
uniform vec2 uTilt;
out vec4 outColor;

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
  return dot(vec4(31.316), n);
}

float light1(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * attenuation);
}

float light2(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * dist * attenuation);
}

vec4 draw(vec2 uv) {
  float rawLen = length(uv);
  vec2 dir = rawLen > 0.0001 ? uv / rawLen : vec2(1.0, 0.0);
  float reachAmount = length(uReach);
  vec2 reachDir = reachAmount > 0.00001 ? uReach / reachAmount : vec2(1.0, 0.0);
  float facing = exp((dot(dir, reachDir) - 1.0) * 3.2);
  float len = max(rawLen - reachAmount * facing * smoothstep(0.25, 0.65, rawLen), 0.0);
  uv = dir * len;
  float ang = atan(dir.y, dir.x);
  float invLen = len > 0.0 ? 1.0 / len : 0.0;
  float near = facing * uNear;
  float bgLuminance = dot(uBackground, vec3(0.299, 0.587, 0.114));

  float n0 = snoise3(vec3(uv * 0.65, uTime * 0.5)) * 0.5 + 0.5;
  float r0 = mix(0.8 - 0.04 * uWobble, 0.8 + 0.04 * uWobble, n0);
  float d0 = distance(uv, (r0 * invLen) * uv);
  float v0 = light1(1.0, 10.0 / uGlow, d0);
  v0 *= smoothstep(r0 * 1.05, r0, len);
  float reach = max(uBleed, 0.04);
  float innerFade = smoothstep(r0 * (1.0 - 0.2 * reach), r0 * (1.0 - 0.05 * reach), len);
  v0 *= mix(innerFade, 1.0, bgLuminance * 0.7 * min(uBleed, 1.0));
  float body = smoothstep(0.8 - 0.2 * reach, 0.8, len);
  float cl = cos(ang + uSwirl) * 0.5 + 0.5;

  vec2 pos = vec2(cos(uOrbit), sin(uOrbit)) * r0;
  float d = distance(uv, pos);
  vec2 head = vec2(cos(uOrbit), sin(uOrbit));
  float lag = atan(head.x * dir.y - head.y * dir.x, dot(dir, head));
  float trail = uTrail > 0.0 ? smoothstep(0.0, 0.35, lag) * exp(-max(lag, 0.0) * 2.6 / uTrail) : 0.0;
  float v1 = (light2(1.5, 5.0, d) + trail * 0.6) * uHighlight;
  v1 *= light1(1.0, 50.0, d0);
  float band = v0 * smoothstep(1.0, mix(0.6, 1.0, n0 * 0.5), len) * body;
  float heat = pow(clamp(band / 0.82, 0.0, 1.0), 3.0);
  float bloom = light2(1.0, 160.0 / uGlow, max(len - r0, 0.0)) * smoothstep(0.4, 0.0, len - r0) * step(r0, len);

  float v2 = smoothstep(1.0, mix(0.6, 1.0, n0 * 0.5), len);
  float v3 = body;

  vec3 colBase = mix(uColor1, uColor2, cl);
  float fadeAmount = mix(1.0, 0.1, bgLuminance);

  float echoD = abs(len - r0 - uEcho.x);
  float echo = light1(1.0, 60.0, echoD) * smoothstep(0.12, 0.0, echoD) * uEcho.y;

  vec3 darkCol = mix(uColor3, colBase, v0);
  darkCol = (darkCol + v1) * v2 * v3 * (1.0 + uAwake + near * 0.35) + mix(colBase, vec3(1.0), 0.25) * heat * (0.28 + near * 0.3);
  darkCol = clamp(darkCol + colBase * (bloom * 0.1 + echo), 0.0, 1.0);

  vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount);
  lightCol = mix(uBackground, lightCol, clamp(v0 + echo, 0.0, 1.0));
  lightCol = mix(lightCol, colBase, clamp(v0, 0.0, 1.0) * clamp(near * 0.4 + uAwake, 0.0, 0.6));
  lightCol = clamp(mix(lightCol, vec3(1.0), clamp(v1 * 0.35, 0.0, 0.6)), 0.0, 1.0);

  vec3 finalCol = mix(darkCol, lightCol, bgLuminance);
  float alpha = max(max(finalCol.r, finalCol.g), finalCol.b);
  return vec4(finalCol / (alpha + 1e-5), alpha);
}

vec2 toPlane(vec2 p, out float hit) {
  float cx = cos(uTilt.x);
  float sx = sin(uTilt.x);
  float cy = cos(uTilt.y);
  float sy = sin(uTilt.y);
  vec3 ex = vec3(cy, 0.0, -sy);
  vec3 ey = vec3(sy * sx, cx, cy * sx);
  vec3 normal = vec3(sy * cx, -sx, cy * cx);
  vec3 origin = vec3(0.0, 0.0, 3.2);
  vec3 ray = vec3(p, -3.2);
  float denom = dot(normal, ray);
  float t = -dot(normal, origin) / (abs(denom) > 0.00001 ? denom : -0.00001);
  hit = t > 0.0 ? 1.0 : 0.0;
  vec3 q = origin + ray * t;
  return vec2(dot(q, ex), dot(q, ey));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y) * 2.0;
  uv *= uScale;
  float hit = 1.0;
  if (abs(uTilt.x) + abs(uTilt.y) > 0.0001) uv = toPlane(uv, hit);

  float s = sin(uRotation);
  float c = cos(uRotation);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

  vec4 col = draw(uv);
  float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  float alpha = clamp(col.a * hit * uReveal * uOpacity + dither, 0.0, 1.0);
  outColor = vec4(col.rgb * alpha * alpha, alpha);
}`;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  };

  const link = (gl) => {
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  };

  class Orb {
    constructor(container, options = {}) {
      this.container = container;
      if (!this.container) return;

      // Create or find canvas
      let canvas = this.container.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        this.container.appendChild(canvas);
      }
      this.canvas = canvas;

      this.gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
      });

      if (!this.gl) {
        console.warn('WebGL2 not supported, Orb shader cannot initialize.');
        return;
      }

      this.linkedProgram = link(this.gl);
      if (!this.linkedProgram) return;

      const gl = this.gl;
      this.buffer = gl.createBuffer();
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      this.probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      this.reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      this.colorCache = new Map();

      this.setOptions(options);

      this.view = { width: 1, height: 1 };
      this.pointer = { x: 0, y: 0, inside: false };
      this.state = {
        time: 0,
        swirl: 0,
        orbit: 0,
        echo: 1,
        rotation: 0,
        hover: 0,
        near: 0,
        reachX: 0,
        reachY: 0,
        reachSpeedX: 0,
        reachSpeedY: 0,
        pulse: 0,
        pulseSpeed: 0,
        kick: this.settings.intro && !this.reduce ? 2.5 : 0,
        reveal: this.settings.intro && !this.reduce ? 0 : 1,
      };

      this.raf = 0;
      this.last = 0;
      this.visible = true;

      this.setupEvents();
      this.resize();
      this.wake();
    }

    setOptions(options = {}) {
      const colors = Array.isArray(options.colors) ? options.colors : ['#9c43fe', '#4cc2e9', '#101499'];
      this.settings = {
        colors: [colors[0] ?? '#9c43fe', colors[1] ?? '#4cc2e9', colors[2] ?? '#101499'].map(String),
        hue: options.hue ?? 0,
        backgroundColor: String(options.backgroundColor ?? '#000000'),
        size: clamp(options.size ?? 0.52, 0.1, 3),
        glow: clamp(options.glow ?? 0.95, 0.1, 5),
        bleed: clamp(options.bleed ?? 3, 0, 4),
        wobble: Math.max(0, options.wobble ?? 1.15),
        highlight: Math.max(0, options.highlight ?? 0.85),
        trail: Math.max(0, options.trail ?? 1.4),
        tiltX: clamp(options.tiltX ?? 1, -70, 70),
        tiltY: clamp(options.tiltY ?? 0, -70, 70),
        speed: options.speed ?? 1,
        hoverIntensity: Math.max(0, options.hoverIntensity ?? 1),
        rotateOnHover: options.rotateOnHover ?? true,
        forceHoverState: options.forceHoverState ?? false,
        followCursor: options.followCursor ?? true,
        clickPulse: options.clickPulse ?? true,
        intro: options.intro ?? true,
        opacity: clamp(options.opacity ?? 1, 0, 1),
        paused: options.paused ?? false,
        dpr: options.dpr,
      };
      this.wake();
    }

    parseColor(value) {
      if (this.colorCache.has(value)) return this.colorCache.get(value);
      let rgb = [0, 0, 0];
      if (this.probe) {
        this.probe.clearRect(0, 0, 1, 1);
        this.probe.fillStyle = '#000000';
        this.probe.fillStyle = value;
        this.probe.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = this.probe.getImageData(0, 0, 1, 1).data;
        rgb = a ? [r / 255, g / 255, b / 255] : [0, 0, 0];
      }
      this.colorCache.set(value, rgb);
      return rgb;
    }

    shiftHue(rgb, degrees) {
      if (!degrees) return rgb;
      const angle = (degrees * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const [r, g, b] = rgb;
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const i = 0.596 * r - 0.274 * g - 0.322 * b;
      const q = 0.211 * r - 0.523 * g + 0.312 * b;
      const ni = i * cos - q * sin;
      const nq = i * sin + q * cos;
      return [y + 0.956 * ni + 0.621 * nq, y - 0.272 * ni - 0.647 * nq, y - 1.106 * ni + 1.703 * nq];
    }

    toOrb(x, y) {
      const s = this.settings;
      const side = Math.min(this.view.width, this.view.height);
      const scale = 1 / (s.size * (1 + this.state.pulse));
      let ux = ((x - this.view.width / 2) / side) * 2 * scale;
      let uy = ((this.view.height / 2 - y) / side) * 2 * scale;
      if (s.tiltX || s.tiltY) {
        const ax = (-s.tiltX * Math.PI) / 180;
        const ay = (s.tiltY * Math.PI) / 180;
        const [cx, sx, cy, sy] = [Math.cos(ax), Math.sin(ax), Math.cos(ay), Math.sin(ay)];
        const normal = [sy * cx, -sx, cy * cx];
        const ray = [ux, uy, -FOCAL];
        const denom = normal[0] * ray[0] + normal[1] * ray[1] + normal[2] * ray[2];
        const t = -(normal[2] * FOCAL) / (Math.abs(denom) > 0.00001 ? denom : -0.00001);
        if (t <= 0) return [99, 99];
        const q = [ray[0] * t, ray[1] * t, FOCAL + ray[2] * t];
        ux = q[0] * cy - q[2] * sy;
        uy = q[0] * sy * sx + q[1] * cx + q[2] * cy * sx;
      }
      const sin = Math.sin(this.state.rotation);
      const cos = Math.cos(this.state.rotation);
      return [cos * ux - sin * uy, sin * ux + cos * uy];
    }

    render() {
      const gl = this.gl;
      if (!gl || !this.linkedProgram) return;

      const s = this.settings;
      const u = this.linkedProgram.uniforms;
      const [c1, c2, c3] = s.colors.map((v) => this.shiftHue(this.parseColor(v), s.hue));
      const reveal = this.state.reveal;
      const back = reveal - 1;
      const grow = 1 + 2.2 * back * back * back + 1.2 * back * back;

      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.useProgram(this.linkedProgram.program);
      gl.bindVertexArray(this.vao);
      gl.uniform2f(u.uResolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(u.uTime, this.state.time);
      gl.uniform2f(u.uReach, this.state.reachX, this.state.reachY);
      gl.uniform1f(u.uNear, this.state.near);
      gl.uniform1f(u.uAwake, this.state.hover * s.hoverIntensity * 0.18);
      gl.uniform1f(u.uRotation, this.state.rotation);
      gl.uniform3fv(u.uBackground, this.parseColor(s.backgroundColor));
      gl.uniform3fv(u.uColor1, c1);
      gl.uniform3fv(u.uColor2, c2);
      gl.uniform3fv(u.uColor3, c3);
      gl.uniform1f(u.uScale, 1 / (s.size * (1 + this.state.pulse) * (0.62 + 0.38 * grow)));
      gl.uniform1f(u.uWobble, s.wobble);
      gl.uniform1f(u.uGlow, s.glow);
      gl.uniform1f(u.uBleed, s.bleed);
      gl.uniform1f(u.uHighlight, s.highlight);
      gl.uniform2f(u.uEcho, this.state.echo * 0.55, this.state.echo < 1 ? (1 - this.state.echo) * (1 - this.state.echo) : 0);
      gl.uniform1f(u.uSwirl, this.state.swirl);
      gl.uniform1f(u.uOrbit, this.state.orbit);
      gl.uniform1f(
        u.uReveal,
        Math.min(1, reveal / 0.55) * Math.min(1, reveal / 0.55) * (3 - 2 * Math.min(1, reveal / 0.55))
      );
      gl.uniform1f(u.uOpacity, s.opacity);
      gl.uniform1f(u.uTrail, s.trail);
      gl.uniform2f(u.uTilt, (-s.tiltX * Math.PI) / 180, (s.tiltY * Math.PI) / 180);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    frame(now) {
      this.raf = 0;
      if (!this.visible || document.hidden) return;
      const s = this.settings;
      const dt = this.last ? clamp((now - this.last) / 1000, 0.0005, 0.05) : 1 / 60;
      this.last = now;
      if (s.paused) {
        this.state.reveal = 1;
        this.render();
        this.last = 0;
        return;
      }
      const motion = this.reduce ? 0 : 1;
      const [px, py] = this.toOrb(this.pointer.x, this.pointer.y);
      const distance = Math.hypot(px, py);
      const region = this.pointer.inside && motion ? clamp((1.45 - distance) / 0.4, 0, 1) : 0;
      const zone = region * region * (3 - 2 * region);
      const aimed = zone * clamp((distance - 0.15) / 0.45, 0, 1);
      const near = zone > 0.5;
      const target = s.forceHoverState ? 1 : zone;
      this.state.hover += (target - this.state.hover) * (1 - Math.exp(-dt / 0.16));
      const reach = 0.075 * s.hoverIntensity * aimed;
      const goalX = distance > 0.0001 ? (px / distance) * reach : 0;
      const goalY = distance > 0.0001 ? (py / distance) * reach : 0;
      this.state.reachSpeedX += (70 * (goalX - this.state.reachX) - 7 * this.state.reachSpeedX) * dt;
      this.state.reachSpeedY += (70 * (goalY - this.state.reachY) - 7 * this.state.reachSpeedY) * dt;
      this.state.reachX += this.state.reachSpeedX * dt;
      this.state.reachY += this.state.reachSpeedY * dt;
      this.state.near += (aimed * s.hoverIntensity - this.state.near) * (1 - Math.exp(-dt / 0.12));

      const step = dt * s.speed * motion;
      this.state.time += step;
      this.state.swirl += step * 2 * (1 + this.state.kick);
      this.state.echo = Math.min(1, this.state.echo + dt / 1.2);
      if (s.rotateOnHover) this.state.rotation += dt * 0.3 * this.state.hover * motion;

      const aim = Math.atan2(py, px);
      if (s.followCursor && near && motion) {
        const delta = Math.atan2(Math.sin(aim - this.state.orbit), Math.cos(aim - this.state.orbit));
        this.state.orbit += delta * (1 - Math.exp(-dt * 6));
      } else {
        this.state.orbit -= step;
      }
      this.state.orbit = Math.atan2(Math.sin(this.state.orbit), Math.cos(this.state.orbit));

      this.state.pulseSpeed += (-170 * this.state.pulse - 11 * this.state.pulseSpeed) * dt;
      this.state.pulse += this.state.pulseSpeed * dt;
      this.state.kick *= Math.exp(-dt * 2.5);

      if (!s.intro || this.reduce) this.state.reveal = 1;
      else if (this.state.reveal < 1) this.state.reveal = Math.min(1, this.state.reveal + dt / INTRO_SECONDS);

      this.render();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    }

    wake() {
      if (!this.raf && this.visible && !document.hidden) {
        this.raf = requestAnimationFrame((t) => this.frame(t));
      }
    }

    pulse() {
      this.state.pulseSpeed += 0.95;
      this.state.kick = 2.4;
      this.state.echo = 0;
      this.wake();
    }

    resize() {
      const s = this.settings;
      const width = this.container.clientWidth || this.container.offsetWidth || 64;
      const height = this.container.clientHeight || this.container.offsetHeight || 64;
      const ratio = Math.min(s.dpr || window.devicePixelRatio || 1, 2);
      this.view.width = Math.max(1, width);
      this.view.height = Math.max(1, height);
      this.canvas.width = Math.max(1, Math.round(width * ratio));
      this.canvas.height = Math.max(1, Math.round(height * ratio));
      this.render();
      this.wake();
    }

    setupEvents() {
      const locate = (event) => {
        const rect = this.container.getBoundingClientRect();
        this.pointer.x = event.clientX - rect.left;
        this.pointer.y = event.clientY - rect.top;
        this.pointer.inside =
          this.pointer.x >= 0 &&
          this.pointer.y >= 0 &&
          this.pointer.x <= rect.width &&
          this.pointer.y <= rect.height;
      };

      this.onPointerMove = (e) => {
        locate(e);
        if (!this.settings.paused) this.wake();
      };

      this.onPointerDown = (e) => {
        locate(e);
        if (!this.pointer.inside || !this.settings.clickPulse || this.settings.paused || this.reduce) return;
        const [px, py] = this.toOrb(this.pointer.x, this.pointer.y);
        if (Math.hypot(px, py) > 1.2) return;
        this.pulse();
      };

      this.onPointerUp = (e) => {
        if (e.pointerType !== 'mouse') this.pointer.inside = false;
      };

      this.onPointerLeave = () => {
        this.pointer.inside = false;
      };

      this.onVisibility = () => {
        this.last = 0;
        this.wake();
      };

      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);

      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
      window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
      window.addEventListener('pointerup', this.onPointerUp, { passive: true });
      document.documentElement.addEventListener('pointerleave', this.onPointerLeave);
      document.addEventListener('visibilitychange', this.onVisibility);
    }

    destroy() {
      if (this.raf) cancelAnimationFrame(this.raf);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerdown', this.onPointerDown);
      window.removeEventListener('pointerup', this.onPointerUp);
      document.documentElement.removeEventListener('pointerleave', this.onPointerLeave);
      document.removeEventListener('visibilitychange', this.onVisibility);
      if (this.gl) {
        if (this.linkedProgram) this.gl.deleteProgram(this.linkedProgram.program);
        if (this.buffer) this.gl.deleteBuffer(this.buffer);
        if (this.vao) this.gl.deleteVertexArray(this.vao);
        this.gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    }
  }

  window.Orb = Orb;
})();
