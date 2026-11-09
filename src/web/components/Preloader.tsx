import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  motion,
  animate,
  useMotionValue,
  useReducedMotion,
} from 'motion/react';
import grokkiLogo from '../assets/grokki_logo.png';
import grokkiWordmark from '../assets/grokki_wordmark.png';
import grokkiVoice from '../assets/grokki-intro.webm';

interface PreloaderProps {
  onComplete: () => void;
  onReveal?: () => void;
  /** Minimum time (ms) the intro stays up */
  duration?: number;
  /** Safety cap (ms) */
  maxWait?: number;
}

const LOGO = grokkiLogo;
const WORDMARK = grokkiWordmark;
const GROKKI_VOICE = grokkiVoice;
const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Web Audio Synthesizers & Sound FX ────────── */

const playCuteGrokkiSound = (ctx: AudioContext) => {
  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, now);

    osc1.type = 'sine';
    // Upward playful trill: D5 -> A5 -> E6 -> A6
    osc1.frequency.setValueAtTime(587, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(1318, now + 0.16);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.25);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.14, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

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
    // Ignore audio error
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
    // Ignore audio error
  }
};

const playWhooshSound = (ctx: AudioContext) => {
  try {
    const now = ctx.currentTime;
    const duration = 0.85;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.16;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.8, now);
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(1100, now + 0.25);
    filter.frequency.exponentialRampToValueAtTime(90, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  } catch {
    // Ignore audio error
  }
};

export const Preloader: React.FC<PreloaderProps> = ({
  onComplete,
  onReveal,
  duration = 2200,
  maxWait = 4500,
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
        gain.gain.setValueAtTime(0.9, ctx.currentTime);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        return;
      }

      if (!grokkiVoiceRef.current) {
        grokkiVoiceRef.current = new Audio(GROKKI_VOICE);
        grokkiVoiceRef.current.preload = 'auto';
      }
      grokkiVoiceRef.current.volume = 0.9;
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

  // Clean fade value (No circle mask / iris cutout)
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

    // Smooth fade out to reveal the Studio Dashboard (NOT circle out)
    animate(fade, 0, {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
      onComplete: () => onCompleteRef.current(),
    });
  }, [reduce, fade, getAudioContext]);

  useEffect(() => {
    let cancelled = false;
    let minDone = false;
    let cuteTimer: number | undefined;
    let beepsTimer: number | undefined;
    let voiceTimer: number | undefined;

    const tryExit = () => {
      if (!cancelled && minDone) startExit();
    };

    // Pre-decode audio buffer into Web Audio API for instantaneous playback
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

    const minTimer = window.setTimeout(() => {
      minDone = true;
      tryExit();
    }, duration);

    const maxTimer = window.setTimeout(() => {
      if (!cancelled) startExit();
    }, Math.max(maxWait, duration));

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
    };
  }, [duration, maxWait, startExit, reduce, getAudioContext, playGrokkiVoice, unlockAndPlay]);

  return (
    <motion.div
      role="status"
      aria-label="Loading Grokki Studio"
      style={{ opacity: fade }}
      className="fixed inset-0 z-[9999999] flex select-none items-center justify-center bg-[#111111]"
      onClick={unlockAndPlay}
    >
      {/* Logo + wordmark container (Prominent & balanced desktop sizing) */}
      <motion.div
        initial={reduce ? false : { scale: 0.9, opacity: 0 }}
        animate={
          exiting && !reduce
            ? { scale: 0.97, opacity: 0 }
            : { scale: 1, opacity: 1 }
        }
        transition={
          exiting
            ? { duration: 0.35, ease: EASE }
            : { duration: 0.5, ease: EASE }
        }
        className="flex h-24 md:h-32 items-center justify-center"
      >
        {/* Logo icon */}
        <motion.img
          src={LOGO}
          alt="Grokki"
          draggable={false}
          initial={reduce ? false : { scale: 0, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          className="h-16 w-16 md:h-20 md:w-20 shrink-0 object-contain select-none -mt-1"
        />

        {/* Wordmark unfolds beside it */}
        <motion.div
          initial={reduce ? false : { width: 0, opacity: 0, marginLeft: 0 }}
          animate={{ width: 'auto', opacity: 1, marginLeft: 22 }}
          transition={{ duration: 0.7, delay: 0.75, ease: EASE }}
          className="overflow-hidden flex items-center"
        >
          <img
            src={WORDMARK}
            alt="Grokki Studio"
            draggable={false}
            className="block h-20 md:h-24 w-auto max-w-none object-contain select-none"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Preloader;
