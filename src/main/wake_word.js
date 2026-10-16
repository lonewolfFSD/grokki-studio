const { spawn } = require('child_process');
const path = require('path');

/**
 * Windows Native Offline Wake Word Service for Grokki
 * - Uses Windows built-in System.Speech.Recognition (100% free, offline, instant ~100ms response)
 * - Strict 0.70 confidence threshold + two-word cadence ignores low-frequency murmurs and mobile speakers.
 * - Pauses automatically when in Typing Mode.
 */
class WakeWordService {
  constructor(options = {}) {
    this.onWakeWord = options.onWakeWord || (() => {});
    this.wakeWord = (options.wakeWord || 'Hey Grokki').trim();
    this.enabled = options.enabled !== false; // Default TRUE

    this.process = null;
    this.isListening = false;
    this.isPaused = false;
    this.cooldownUntil = 0;
  }

  start() {
    this.stop();

    if (!this.enabled) {
      console.log('[WakeWord] Hands-free wake word is OFF in settings.');
      return false;
    }

    const scriptPath = path.resolve(__dirname, 'native_wake_detector.ps1');

    // Strict two-word phrases ONLY to prevent false triggers from mobile speakers or casual speech
    const phraseSet = new Set([
      'Hey Grokki',
      'Hey Groki',
      'Hey Grok'
    ]);

    if (this.wakeWord && this.wakeWord.toLowerCase() !== 'hey grokki') {
      phraseSet.add(this.wakeWord);
      phraseSet.add(`Hey ${this.wakeWord}`);
    }

    const phrases = Array.from(phraseSet).join(',');

    try {
      console.log(`[WakeWord] Starting strict native detector for [${phrases}]...`);
      this.process = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath,
        '-Phrases', phrases
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });

      this.isListening = true;
      this.isPaused = false;

      this.process.stdout.on('data', (data) => {
        const text = data.toString();
        const lines = text.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('READY')) {
            console.log('[WakeWord] Native speech detector ACTIVE and listening for "Hey Grokki"!');
          } else if (line.startsWith('WAKE:')) {
            const parts = line.split(':');
            const phrase = parts[1] || this.wakeWord;
            const confidence = parts[2] || '1.0';

            if (this.isPaused) {
              console.log(`[WakeWord] Ignored wake trigger because listener is paused.`);
              continue;
            }

            if (Date.now() < this.cooldownUntil) {
              console.log(`[WakeWord] "${phrase}" detected during cooldown, ignoring.`);
              continue;
            }

            this.cooldownUntil = Date.now() + 2000; // 2s cooldown
            console.log(`[WakeWord] >>> Verified wake phrase "${phrase}" (Confidence: ${confidence})! Summoning in Voice Mode...`);
            if (this.onWakeWord) {
              this.onWakeWord('');
            }
          } else if (line.startsWith('IGNORED:')) {
            console.log(`[WakeWord Audio] ${line}`);
          } else if (line.startsWith('PAUSED')) {
            console.log('[WakeWord] Native detector paused (typing mode).');
          } else if (line.startsWith('RESUMED')) {
            console.log('[WakeWord] Native detector resumed.');
          } else if (line.startsWith('ERROR:') || line.startsWith('FATAL:')) {
            console.warn(`[WakeWord] Detector warning:`, line);
          }
        }
      });

      this.process.stderr.on('data', (data) => {
        const errStr = data.toString().trim();
        if (errStr) console.warn('[WakeWord Stderr]:', errStr);
      });

      this.process.on('close', (code) => {
        console.log(`[WakeWord] Native detector process stopped (exit code: ${code}).`);
        this.isListening = false;
        this.process = null;
      });

      return true;
    } catch (err) {
      console.error('[WakeWord] Failed to spawn native detector:', err.message);
      this.isListening = false;
      this.process = null;
      return false;
    }
  }

  pause() {
    if (this.process && this.isListening && !this.isPaused) {
      this.isPaused = true;
      try {
        this.process.stdin.write('PAUSE\n');
      } catch (e) {}
    }
  }

  resume() {
    if (this.process && this.isListening && this.isPaused) {
      this.isPaused = false;
      try {
        this.process.stdin.write('RESUME\n');
      } catch (e) {}
    } else if (!this.process && this.enabled) {
      this.start();
    }
  }

  stop() {
    this.isListening = false;
    this.isPaused = false;
    if (this.process) {
      const proc = this.process;
      this.process = null;
      try {
        proc.stdin.write('QUIT\n');
      } catch (e) {}
      setTimeout(() => {
        try { proc.kill(); } catch (e) {}
      }, 300);
    }
  }

  updateConfig(config = {}) {
    const newWakeWord = (config.wakeWord || 'Hey Grokki').trim();
    const newEnabled = config.wakeWordEnabled !== false;

    const needsRestart = (this.wakeWord !== newWakeWord) || (this.enabled !== newEnabled);
    this.wakeWord = newWakeWord;
    this.enabled = newEnabled;

    if (needsRestart) {
      if (this.enabled) {
        this.start();
      } else {
        this.stop();
      }
    }
  }
}

module.exports = { WakeWordService };
