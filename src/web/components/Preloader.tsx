import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  motion,
  animate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import grokkiLogo from '../assets/grokki_logo.png';
import grokkiWordmark from '../assets/grokki_wordmark.png';
import grokkiVoice from '../assets/grokki-intro.webm';

interface PreloaderProps {
  onComplete: () => void;
  onReveal?: () => void;
  /** Minimum time (ms) the intro stays up, even if everything is already loaded. */
  duration?: number;
  /** Safety cap (ms): reveal anyway if some asset never finishes. */
  maxWait?: number;
  /** Extra image URLs to wait for before revealing the app. */
  assets?: string[];
}

const LOGO = grokkiLogo;
const WORDMARK = grokkiWordmark;
const GROKKI_VOICE = grokkiVoice;
const EASE = [0.16, 1, 0.3, 1] as const;

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
    if (img.decode) img.decode().then(() => resolve(), () => resolve());
  });

const preloadAudio = (src: string) =>
  new Promise<void>((resolve) => {
    try {
      const audio = new Audio();
      audio.src = src;
      audio.preload = 'auto';
      const done = () => resolve();
      audio.addEventListener('canplaythrough', done, { once: true });
      audio.addEventListener('error', done, { once: true });
      setTimeout(done, 300);
    } catch {
      resolve();
    }
  });

const whenWindowLoaded = () =>
  new Promise<void>((resolve) => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') return resolve();
    const done = () => resolve();
    window.addEventListener('DOMContentLoaded', done, { once: true });
    window.addEventListener('load', done, { once: true });
    setTimeout(done, 250);
  });

const fontsReady = () =>
  new Promise<void>((resolve) => {
    if ((document as any).fonts?.ready) {
      (document as any).fonts.ready.then(() => resolve(), () => resolve());
      setTimeout(resolve, 300);
    } else {
      resolve();
    }
  });

/* ── Web Audio Synthesizers & Sound FX ────────── */

const playCuteGrokkiSound = (ctx: AudioContext) => {
  try {
    const now = ctx.currentTime;

    // Primary friendly vocalization chirp
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, now);

    osc1.type = 'sine';
    // Upward playful trill: D5 -> A5 -> E6 -> A6 with companion bounce
    osc1.frequency.setValueAtTime(587, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(1318, now + 0.16);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.25);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.14, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    // Warm companion harmonic tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1318, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.24);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.05, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain1);
    gain1.connect(filter);
    osc2.connect(gain2);
    gain2.connect(filter);
    filter.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);
    osc2.start(now);
    osc2.stop(now + 0.32);
  } catch {
    // AudioContext might be blocked by browser policy
  }
};

const playTechBeepsSound = (ctx: AudioContext) => {
  try {
    const now = ctx.currentTime;
    const frequencies = [1600, 2200, 1850, 2400, 1950];
    const beepDuration = 0.024;
    const spacing = 0.055;

    frequencies.forEach((freq, idx) => {
      const start = now + idx * spacing;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.032, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, start + beepDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + beepDuration + 0.01);
    });
  } catch {
    // Ignore audio errors
  }
};

const playWhooshSound = (ctx: AudioContext) => {
  try {
    const now = ctx.currentTime;
    const duration = 0.85;

    // Air displacement pink noise buffer
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.18;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Resonant spatial bandpass sweep
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.8, now);
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.28);
    filter.frequency.exponentialRampToValueAtTime(90, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Deep airy sub sweep
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(95, now);
    sub.frequency.exponentialRampToValueAtTime(50, now + duration);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.08, now + 0.18);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    sub.connect(subGain);
    subGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
    sub.start(now);
    sub.stop(now + duration);
  } catch {
    // Ignore audio errors
  }
};

export const Preloader: React.FC<PreloaderProps> = ({
  onComplete,
  onReveal,
  duration = 2800,
  maxWait = 8000,
  assets = [],
}) => {
  const reduce = !!useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const exitedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const grokkiVoiceRef = useRef<HTMLAudioElement | null>(null);
  const grokkiBufferRef = useRef<AudioBuffer | null>(null);
  const voicePlayedRef = useRef(false);
  const wordmarkStartedRef = useRef(false);

  const getAudioContext = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  const playGrokkiVoice = useCallback(() => {
    if (voicePlayedRef.current || reduce) return;
    voicePlayedRef.current = true;
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'running' && grokkiBufferRef.current) {
        const source = ctx.createBufferSource();
        source.buffer = grokkiBufferRef.current;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.95, ctx.currentTime);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        return;
      }

      if (!grokkiVoiceRef.current) {
        grokkiVoiceRef.current = new Audio(GROKKI_VOICE);
        grokkiVoiceRef.current.preload = 'auto';
      }
      grokkiVoiceRef.current.volume = 0.95;
      grokkiVoiceRef.current.currentTime = 0;
      grokkiVoiceRef.current.play().catch(() => {});
    } catch {
      // Ignore audio error
    }
  }, [reduce, getAudioContext]);

  const unlockAndPlay = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          if (wordmarkStartedRef.current && !voicePlayedRef.current) {
            playGrokkiVoice();
          }
        })
        .catch(() => {});
    }
    if (wordmarkStartedRef.current && !voicePlayedRef.current) {
      playGrokkiVoice();
    }
  }, [getAudioContext, playGrokkiVoice]);

  // Iris: a transparent hole that grows from the centre.
  const radius = useMotionValue(0);
  const mask = useTransform(
    radius,
    (v) => `radial-gradient(circle at 50% 50%, transparent ${v}px, #000 ${v + 1}px)`
  );
  // Reduced motion: plain fade instead.
  const fade = useMotionValue(1);

  const startExit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    setExiting(true);
    onRevealRef.current?.();

    if (!reduce) {
      const ctx = getAudioContext();
      if (ctx) playWhooshSound(ctx);
    }

    if (reduce) {
      animate(fade, 0, {
        duration: 0.3,
        onComplete: () => onCompleteRef.current(),
      });
      return;
    }

    const maxRadius = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 40;
    animate(radius, maxRadius, {
      duration: 1,
      delay: 0.15,
      ease: [0.76, 0, 0.24, 1],
      onComplete: () => onCompleteRef.current(),
    });
  }, [reduce, radius, fade, getAudioContext]);

  const assetsKey = assets.join('|');

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let cancelled = false;
    let minDone = false;
    let assetsDone = false;
    let cuteTimer: number | undefined;
    let beepsTimer: number | undefined;
    let voiceTimer: number | undefined;

    const tryExit = () => {
      if (!cancelled && minDone && assetsDone) startExit();
    };

    // Pre-decode audio buffer into Web Audio API for zero latency playback
    const ctx = getAudioContext();
    if (ctx) {
      fetch(GROKKI_VOICE)
        .then((res) => res.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          grokkiBufferRef.current = decoded;
        })
        .catch(() => {});
    }

    if (!reduce) {
      // 1. Cute Grokki chirp sound when the logo zooms in (synced with delay 0.2s)
      cuteTimer = window.setTimeout(() => {
        if (!cancelled) {
          const aCtx = getAudioContext();
          if (aCtx) playCuteGrokkiSound(aCtx);
        }
      }, 200);

      // 2. Short technical data beeps as wordmark begins unfolding (synced with delay 0.75s)
      beepsTimer = window.setTimeout(() => {
        if (!cancelled) {
          const aCtx = getAudioContext();
          if (aCtx) playTechBeepsSound(aCtx);
        }
      }, 750);

      // 3. Play Grokki voice when the second image (wordmark) starts revealing (synced with delay 0.75s)
      voiceTimer = window.setTimeout(() => {
        if (!cancelled) {
          wordmarkStartedRef.current = true;
          playGrokkiVoice();
        }
      }, 750);
    }

    // Stays up at least `duration`...
    const minTimer = window.setTimeout(() => {
      minDone = true;
      tryExit();
    }, duration);

    // ...but never longer than `maxWait`.
    const maxTimer = window.setTimeout(() => {
      if (!cancelled) startExit();
    }, Math.max(maxWait, duration));

    // ...and waits for real assets if they're slow.
    Promise.all([
      whenWindowLoaded(),
      fontsReady(),
      preloadImage(LOGO),
      preloadImage(WORDMARK),
      preloadAudio(GROKKI_VOICE),
      ...assets.map(preloadImage),
    ])
      .catch(() => undefined)
      .then(() => {
        assetsDone = true;
        tryExit();
      });

    const onKey = (e: KeyboardEvent) => {
      unlockAndPlay();
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        startExit();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', unlockAndPlay, { passive: true });

    return () => {
      cancelled = true;
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      window.clearTimeout(cuteTimer);
      window.clearTimeout(beepsTimer);
      window.clearTimeout(voiceTimer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', unlockAndPlay);
      document.body.style.overflow = originalOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, maxWait, assetsKey, startExit, reduce, getAudioContext, playGrokkiVoice, unlockAndPlay]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label="Loading Grokki Studio"
      style={
        reduce
          ? { opacity: fade }
          : { WebkitMaskImage: mask, maskImage: mask }
      }
      className="fixed inset-0 z-[9999] flex select-none items-center justify-center bg-[#07080b]"
      onClick={unlockAndPlay}
    >
      {/* Logo + wordmark */}
      <motion.div
        initial={reduce ? false : { scale: 0.2, opacity: 0 }}
        animate={
          exiting && !reduce
            ? { scale: 0.85, opacity: 0 }
            : { scale: 1, opacity: 1 }
        }
        transition={
          exiting
            ? { duration: 0.35, ease: EASE }
            : { duration: 0.55, ease: EASE }
        }
        className="flex h-16 items-center"
      >
        {/* Logo pops in first */}
        <motion.img
          src={LOGO}
          alt=""
          draggable={false}
          initial={reduce ? false : { scale: 0, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          className="h-10 w-auto md:h-[50px] md:w-[50px] md:mr-1 -mt-1 shrink-0 object-contain"
        />

        {/* Wordmark unfolds beside it */}
        <motion.div
          initial={reduce ? false : { width: 0, opacity: 0, marginLeft: 0 }}
          animate={{ width: 'auto', opacity: 1, marginLeft: 12 }}
          transition={{ duration: 0.7, delay: 0.75, ease: EASE }}
          className="overflow-hidden"
        >
          <img
            src={WORDMARK}
            alt="Grokki Studio"
            draggable={false}
            className="block h-16 md:h-24 w-auto max-w-none object-contain"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Preloader;
