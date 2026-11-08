'use client';

import { useEffect, useRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';

const SIZES: Record<SpecularButtonSize, string> = {
  sm: 'px-5 py-2.5 text-[0.875rem]',
  md: 'px-7 py-3.5 text-[1rem]',
  lg: 'px-[38px] py-[18px] text-[1.125rem]'
};

const BUTTON =
  'relative isolate m-0 inline-flex cursor-pointer items-center justify-center gap-[0.5em] border-0 [font-family:inherit] font-medium leading-none tracking-[0.01em] [color:var(--sb-text-color)] [border-radius:var(--sb-radius)] [background:color-mix(in_srgb,var(--sb-tint)_calc(var(--sb-tint-opacity)*100%),transparent)] shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)] [-webkit-backdrop-filter:blur(var(--sb-blur))] [backdrop-filter:blur(var(--sb-blur))] outline-none [-webkit-tap-highlight-color:transparent] transition-transform duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-[3px] focus-visible:[outline-color:color-mix(in_srgb,var(--sb-text-color)_55%,transparent)] disabled:cursor-default disabled:opacity-50 disabled:active:scale-100';

const SURFACE =
  'relative m-0 border-0 [font-family:inherit] [color:var(--sb-text-color)] [border-radius:var(--sb-radius)] outline-none';

const PAD = 24;
const TAU = Math.PI * 2;

export type SpecularButtonSize = 'sm' | 'md' | 'lg';

export interface SpecularButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> {
  children?: ReactNode;
  size?: SpecularButtonSize;
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  idleIntensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  glow?: number;
  speed?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
  type?: 'button' | 'submit' | 'reset';
  as?: 'button' | 'div';
}

type Settings = {
  radius: number;
  lineColor: string;
  baseColor: string;
  intensity: number;
  idleIntensity: number;
  shineSize: number;
  shineFade: number;
  thickness: number;
  glow: number;
  speed: number;
  followMouse: boolean;
  proximity: number;
  autoAnimate: boolean;
  disabled: boolean;
};

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uRadius;
uniform float uPx;
uniform float uSpot;
uniform vec2 uEntry;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform vec2 uWindow;
uniform float uThickness;
uniform float uGlow;
out vec4 outColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float loopPosition(vec2 p, vec2 b, float r) {
  vec2 inner = b - r;
  float arc = 1.5707963 * r;
  float quarter = inner.x + inner.y + arc;
  vec2 a = abs(p);
  vec2 q = a - inner;
  float s = q.x > 0.0 && q.y > 0.0
    ? inner.y + atan(q.y, q.x) * r
    : (q.x > q.y ? min(a.y, inner.y) : inner.y + arc + inner.x - min(a.x, inner.x));
  if (p.x < 0.0) s = p.y >= 0.0 ? 2.0 * quarter - s : 2.0 * quarter + s;
  else if (p.y < 0.0) s = 4.0 * quarter - s;
  return s / max(4.0 * quarter, 0.0001);
}

float lobe(float position, float center) {
  float gap = abs(fract(position - center + 0.5) - 0.5);
  return 1.0 - smoothstep(uWindow.x, uWindow.x + uWindow.y, gap);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = roundedBox(p, uHalf, uRadius);
  float position = loopPosition(p, uHalf, uRadius);
  float key = lobe(position, uSpot);
  float back = lobe(position, uSpot + 0.5);
  float streak = key + back * 0.45;
  float width = max(uThickness * uPx * mix(1.0, max(key, back), 0.6), 0.35);
  float band = smoothstep(-width - 0.6, -width + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float hair = smoothstep(-uPx - 0.6, -uPx + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float inside = 1.0 - smoothstep(-0.6, 0.6, d);
  vec2 pool = (p - uEntry) / (uHalf.y * vec2(1.6, 1.1));
  float glow = streak * 0.2 * exp(-abs(d + width * 0.5) / (5.0 * uPx)) + inside * 0.08 * exp(-dot(pool, pool));
  float light = clamp((band * streak + glow * uGlow) * uIntensity, 0.0, 1.0);
  vec4 base = vec4(uBaseColor, 1.0) * hair * 0.6;
  outColor = vec4(uLineColor, 1.0) * light + base * (1.0 - light);
}`;

const UNIFORMS = [
  'uCenter',
  'uHalf',
  'uRadius',
  'uPx',
  'uSpot',
  'uEntry',
  'uLineColor',
  'uBaseColor',
  'uIntensity',
  'uWindow',
  'uThickness',
  'uGlow'
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const wrap = (value: number) => value - Math.floor(value);

const loopPosition = (x: number, y: number, halfX: number, halfY: number, r: number) => {
  const innerX = halfX - r;
  const innerY = halfY - r;
  const arc = (Math.PI / 2) * r;
  const quarter = innerX + innerY + arc;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const qx = ax - innerX;
  const qy = ay - innerY;
  let s;
  if (qx > 0 && qy > 0) s = innerY + Math.atan2(qy, qx) * r;
  else if (qx > qy) s = Math.min(ay, innerY);
  else s = innerY + arc + innerX - Math.min(ax, innerX);
  if (x < 0) s = y >= 0 ? 2 * quarter - s : 2 * quarter + s;
  else if (y < 0) s = 4 * quarter - s;
  return wrap(s / Math.max(4 * quarter, 0.0001));
};

const rimPoint = (position: number, halfX: number, halfY: number, r: number): [number, number] => {
  const innerX = halfX - r;
  const innerY = halfY - r;
  const arc = (Math.PI / 2) * r;
  const quarter = innerX + innerY + arc;
  let s = wrap(position) * 4 * quarter;
  let signX = 1;
  let signY = 1;
  if (s > 3 * quarter) {
    s = 4 * quarter - s;
    signY = -1;
  } else if (s > 2 * quarter) {
    s -= 2 * quarter;
    signX = -1;
    signY = -1;
  } else if (s > quarter) {
    s = 2 * quarter - s;
    signX = -1;
  }
  let x = innerX - (s - innerY - arc);
  let y = halfY;
  if (s <= innerY) {
    x = halfX;
    y = s;
  } else if (s <= innerY + arc) {
    const angle = (s - innerY) / Math.max(r, 0.0001);
    x = innerX + Math.cos(angle) * r;
    y = innerY + Math.sin(angle) * r;
  }
  return [x * signX, y * signY];
};

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = (gl: WebGL2RenderingContext) => {
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
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
};

const SpecularButton = ({
  children = 'Get Started',
  size = 'lg',
  radius = 18,
  tint = '#ffffff',
  tintOpacity = 0.04,
  blur = 0,
  textColor = '#f5f5f5',
  lineColor = '#ffffff',
  baseColor = '#525252',
  intensity = 1,
  idleIntensity = 0.35,
  shineSize = 10,
  shineFade = 34,
  thickness = 1.2,
  glow = 1,
  speed = 0.35,
  followMouse = true,
  proximity = 250,
  autoAnimate = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  as = 'button',
  style,
  ...rest
}: SpecularButtonProps) => {
  const buttonRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const settings: Settings = {
    radius: Math.max(0, radius),
    lineColor: String(lineColor),
    baseColor: String(baseColor),
    intensity: Math.max(0, intensity),
    idleIntensity: clamp(idleIntensity, 0, 1),
    shineSize: Math.max(0, shineSize),
    shineFade: Math.max(0, shineFade),
    thickness: Math.max(0, thickness),
    glow: Math.max(0, glow),
    speed,
    followMouse,
    proximity: Math.max(1, proximity),
    autoAnimate,
    disabled
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const button = buttonRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!button || !canvas || !ctx) return undefined;

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const colors = new Map<string, [number, number, number]>();
    const view = { width: 1, height: 1, ratio: 1 };
    const pointer = { x: 0, y: 0, known: false };
    const state = { spot: 0, level: 0, press: 0, ready: false };
    let raf = 0;
    let last = 0;
    let visible = true;

    const toRgb255 = (value: string): [number, number, number] => {
      const cached = colors.get(value);
      if (cached) return cached;
      let rgb: [number, number, number] = [255, 255, 255];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#000000';
        probe.fillStyle = value;
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
        rgb = [r, g, b];
      }
      colors.set(value, rgb);
      return rgb;
    };

    const cornerRadius = (s: Settings) => Math.min(s.radius, view.width / 2, view.height / 2);

    const restSpot = (s: Settings) => {
      const r = cornerRadius(s);
      const inset = r * (1 - Math.SQRT1_2);
      return loopPosition(inset - view.width / 2, view.height / 2 - inset, view.width / 2, view.height / 2, r);
    };

    const aim = (s: Settings) => {
      if (!s.followMouse || s.disabled || !pointer.known) return null;
      const rect = button.getBoundingClientRect();
      const scale = rect.width / view.width || 1;
      const halfX = view.width / 2;
      const halfY = view.height / 2;
      const x = (pointer.x - rect.left - rect.width / 2) / scale;
      const y = (rect.top + rect.height / 2 - pointer.y) / scale;
      const distance = Math.hypot(Math.max(Math.abs(x) - halfX, 0), Math.max(Math.abs(y) - halfY, 0));
      const t = clamp(1 - distance / s.proximity, 0, 1);
      const near = t * t * (3 - 2 * t);
      const nearest = loopPosition(x, y, halfX, halfY, cornerRadius(s));
      if (distance > 0) return { spot: nearest, near };
      const depth = clamp(Math.min(halfX - Math.abs(x), halfY - Math.abs(y)) / (halfY * 0.8), 0, 1);
      const sway = restSpot(s) - (x / halfX) * 0.06 - (y / halfY) * 0.02;
      const offset = sway - nearest - Math.round(sway - nearest);
      return { spot: wrap(nearest + offset * depth * depth * (3 - 2 * depth)), near };
    };

    const draw = (s: Settings) => {
      const { width, height, ratio } = view;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(ratio, ratio);

      const r = Math.min(s.radius, width / 2, height / 2);
      const halfX = width / 2;
      const halfY = height / 2;
      const cx = PAD + halfX;
      const cy = PAD + halfY;

      const [lr, lg, lb] = toRgb255(s.lineColor);
      const [br, bg, bb] = toRgb255(s.baseColor);
      const effIntensity = s.intensity * (state.level + state.press * 0.8);
      const winX = s.shineSize / 360 + state.press * 0.06;
      const winY = s.shineFade / 360 + 0.0001;

      const lobeVal = (pos: number, center: number) => {
        const gap = Math.abs(wrap(pos - center + 0.5) - 0.5);
        const t = clamp((gap - winX) / winY, 0, 1);
        return 1 - t * t * (3 - 2 * t);
      };

      // 1. Inner pool glow clipped to the rounded box
      if (s.glow > 0 && effIntensity > 0.001) {
        const [rimX, rimY] = rimPoint(state.spot, halfX, halfY, r);
        const rimLen = Math.hypot(rimX, rimY);
        const pull = 1 - Math.min(0.35 * halfY, rimLen) / Math.max(rimLen, 0.0001);
        const entryX = cx + rimX * pull;
        const entryY = cy - rimY * pull;
        const poolRx = Math.max(1, halfY * 1.6);
        const poolRy = Math.max(1, halfY * 1.1);
        const poolAlpha = clamp(0.08 * s.glow * effIntensity, 0, 1);

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(PAD, PAD, width, height, r);
        ctx.clip();

        ctx.translate(entryX, entryY);
        ctx.scale(poolRx, poolRy);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        grad.addColorStop(0, `rgba(${lr}, ${lg}, ${lb}, ${poolAlpha})`);
        grad.addColorStop(0.5, `rgba(${lr}, ${lg}, ${lb}, ${poolAlpha * 0.55})`);
        grad.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
      }

      // 2. Base hairline border
      ctx.beginPath();
      ctx.roundRect(PAD, PAD, width, height, r);
      ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.6)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3. Specular rim highlight (100% continuous single-path vector stroke, zero dotted artifacts)
      if (effIntensity > 0.001) {
        const [rimX, rimY] = rimPoint(state.spot, halfX, halfY, r);
        const spotX = cx + rimX;
        const spotY = cy - rimY;
        const shineRadius = Math.max(140, Math.min(width, height) * 1.5, s.shineSize * 18);

        // Pass 1: Soft diffuse glow along the specular hotspot
        if (s.glow > 0) {
          const glowGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, shineRadius * 1.4);
          glowGrad.addColorStop(0, `rgba(${lr}, ${lg}, ${lb}, ${clamp(0.35 * s.glow * effIntensity, 0, 1)})`);
          glowGrad.addColorStop(0.4, `rgba(${lr}, ${lg}, ${lb}, ${clamp(0.12 * s.glow * effIntensity, 0, 1)})`);
          glowGrad.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`);

          ctx.beginPath();
          ctx.roundRect(PAD, PAD, width, height, r);
          ctx.strokeStyle = glowGrad;
          ctx.lineWidth = Math.max(2.2, s.thickness * 2.2);
          ctx.stroke();
        }

        // Pass 2: Laser-sharp continuous specular rim stroke (single smooth path)
        const shineGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, shineRadius);
        shineGrad.addColorStop(0, `rgba(${lr}, ${lg}, ${lb}, ${clamp(effIntensity, 0, 1)})`);
        shineGrad.addColorStop(0.25, `rgba(${lr}, ${lg}, ${lb}, ${clamp(effIntensity * 0.75, 0, 1)})`);
        shineGrad.addColorStop(0.65, `rgba(${lr}, ${lg}, ${lb}, ${clamp(effIntensity * 0.2, 0, 1)})`);
        shineGrad.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`);

        ctx.beginPath();
        ctx.roundRect(PAD, PAD, width, height, r);
        ctx.strokeStyle = shineGrad;
        ctx.lineWidth = Math.max(1, s.thickness);
        ctx.stroke();

        // Pass 3: Subtle opposite reflection
        const [backX, backY] = rimPoint(state.spot + 0.5, halfX, halfY, r);
        const backGrad = ctx.createRadialGradient(cx + backX, cy - backY, 0, cx + backX, cy - backY, shineRadius * 0.7);
        backGrad.addColorStop(0, `rgba(${lr}, ${lg}, ${lb}, ${clamp(effIntensity * 0.35, 0, 1)})`);
        backGrad.addColorStop(0.5, `rgba(${lr}, ${lg}, ${lb}, ${clamp(effIntensity * 0.1, 0, 1)})`);
        backGrad.addColorStop(1, `rgba(${lr}, ${lg}, ${lb}, 0)`);

        ctx.beginPath();
        ctx.roundRect(PAD, PAD, width, height, r);
        ctx.strokeStyle = backGrad;
        ctx.lineWidth = Math.max(0.75, s.thickness * 0.8);
        ctx.stroke();
      }

      ctx.restore();
    };

    let isWindowScrolling = false;
    let scrollStopTimer: any = 0;
    const handleScroll = () => {
      isWindowScrolling = true;
      clearTimeout(scrollStopTimer);
      scrollStopTimer = setTimeout(() => {
        isWindowScrolling = false;
        wake();
      }, 100);
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (isWindowScrolling) {
        // Yield animation frame to browser compositor during active scrolling
        raf = requestAnimationFrame(frame);
        return;
      }
      const s = settingsRef.current;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const target = aim(s);
      const spinning = s.autoAnimate;
      const steering = !!target && target.near > 0;
      if (!state.ready) {
        state.spot = restSpot(s);
        state.level = s.autoAnimate ? 1 : s.idleIntensity;
        state.ready = true;
      }
      let diff = 0;
      if (spinning && !steering) state.spot = wrap(state.spot + (s.speed / TAU) * dt);
      else {
        diff = (steering ? target.spot : restSpot(s)) - state.spot;
        diff -= Math.round(diff);
        state.spot = wrap(state.spot + diff * (1 - Math.exp(-dt * 8)));
      }
      const level = s.autoAnimate ? 1 : s.idleIntensity + (1 - s.idleIntensity) * (target ? target.near : 0);
      state.level += (level - state.level) * (1 - Math.exp(-dt * 7));
      state.press *= Math.exp(-dt * 5);
      draw(s);
      const settling = Math.abs(diff) > 0.0002 || Math.abs(level - state.level) > 0.001 || state.press > 0.002;
      if (settling || (spinning && !steering)) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    const measure = (entry?: ResizeObserverEntry) => {
      const box = entry?.borderBoxSize?.[0];
      view.width = Math.max(1, box ? box.inlineSize : button.offsetWidth);
      view.height = Math.max(1, box ? box.blockSize : button.offsetHeight);
      view.ratio = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.max(1, Math.round((view.width + PAD * 2) * view.ratio));
      canvas.height = Math.max(1, Math.round((view.height + PAD * 2) * view.ratio));
      if (state.ready) draw(settingsRef.current);
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.known = true;
      wake();
    };

    const onPointerDown = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.known = true;
      if (!settingsRef.current.disabled && as === 'button') state.press = 1;
      wake();
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      pointer.known = false;
      wake();
    };

    const onPointerLeave = () => {
      pointer.known = false;
      wake();
    };

    const resizeObserver = new ResizeObserver(entries => measure(entries[entries.length - 1]));
    resizeObserver.observe(button);
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) {
        last = 0;
        wake();
      }
    });
    intersection.observe(button);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerEnd, { passive: true });
    window.addEventListener('pointercancel', onPointerEnd, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    button.addEventListener('pointerdown', onPointerDown);
    measure();
    wakeRef.current = wake;

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      clearTimeout(scrollStopTimer);
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      button.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  useEffect(() => {
    wakeRef.current?.();
  });

  const sharedStyle = {
    '--sb-radius': `${radius}px`,
    '--sb-tint': tint,
    '--sb-tint-opacity': tintOpacity,
    '--sb-blur': `${blur}px`,
    '--sb-text-color': textColor,
    ...style
  } as CSSProperties;

  if (as === 'div') {
    return (
      <div
        ref={buttonRef as React.RefObject<HTMLDivElement>}
        onClick={onClick as any}
        className={`${SURFACE}${className ? ` ${className}` : ''}`}
        style={sharedStyle}
      >
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute -inset-6 z-0 block h-[calc(100%+48px)] w-[calc(100%+48px)]"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-[inherit] w-full">{children}</div>
      </div>
    );
  }

  return (
    <button
      ref={buttonRef as React.RefObject<HTMLButtonElement>}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${BUTTON} ${SIZES[size] ?? SIZES.lg}${className ? ` ${className}` : ''}`}
      style={sharedStyle}
      {...rest}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute -inset-6 z-[1] block h-[calc(100%+48px)] w-[calc(100%+48px)]"
        aria-hidden="true"
      />
      <span className="relative z-[2] inline-flex items-center gap-[inherit]">{children}</span>
    </button>
  );
};

export default SpecularButton;
