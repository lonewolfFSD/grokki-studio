/**
 * Grokki Voice TTS Service
 * Powered by KittenTTS (ultra-low latency on-device neural TTS)
 * Branded and styled as "Grokki Voice"
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

class GrokkiVoiceTTSService {
  constructor() {
    this.workerProcess = null;
    this.rl = null;
    this.isReady = false;
    this.pendingQueue = [];
    this.initPromise = null;
    this.defaultVoice = 'expr-voice-2-f'; // Bella
    this.pythonPath = 'python';

    // Core Grokki Neural Voice list (8 voices)
    this.voices = [
      {
        id: 'expr-voice-2-f',
        alias: 'bella',
        name: 'Bella',
        style: 'Warm & Natural',
        tag: 'Conversational • Expressive',
        accent: 'us',
        gender: 'female',
        language: 'en',
        languageName: 'English',
        langCode: 'en-US',
        sampleText: 'Hey! I am Grokki, your Windows companion. How can I assist you today?',
      },
      {
        id: 'expr-voice-2-m',
        alias: 'jasper',
        name: 'Jasper',
        style: 'Calm & Friendly',
        tag: 'Natural • Companion',
        accent: 'us',
        gender: 'male',
        language: 'en',
        languageName: 'English',
        langCode: 'en-US',
        sampleText: 'Good afternoon. All system metrics and background tasks are running smoothly.',
      },
      {
        id: 'expr-voice-3-f',
        alias: 'luna',
        name: 'Luna',
        style: 'Smooth & Gentle',
        tag: 'Soft • Conversational',
        accent: 'us',
        gender: 'female',
        language: 'en',
        languageName: 'English',
        langCode: 'en-US',
        sampleText: 'I am here to help you work faster, automate tasks, and keep your workspace organized.',
      },
      {
        id: 'expr-voice-3-m',
        alias: 'bruno',
        name: 'Bruno',
        style: 'Deep & Confident',
        tag: 'Bold • Resonant',
        accent: 'us',
        gender: 'male',
        language: 'en',
        languageName: 'English',
        langCode: 'en-US',
        sampleText: 'Compilation finished successfully. Zero errors and zero warnings detected.',
      },
      {
        id: 'expr-voice-4-f',
        alias: 'rosie',
        name: 'Rosie',
        style: 'Bright & Expressive',
        tag: 'High Energy • Cheerful',
        accent: 'us',
        gender: 'female',
        language: 'en',
        languageName: 'English',
        langCode: 'en-US',
        sampleText: 'Ready to get things done! Tell me what you want to build or automate next!',
      },
      {
        id: 'expr-voice-4-m',
        alias: 'hugo',
        name: 'Hugo',
        style: 'Crisp & Articulate',
        tag: 'Executive • Studio Pro',
        accent: 'uk',
        gender: 'male',
        language: 'en',
        languageName: 'English',
        langCode: 'en-GB',
        sampleText: 'Good day! Allow me to take care of the details while you concentrate on the big picture.',
      },
      {
        id: 'expr-voice-5-f',
        alias: 'kiki',
        name: 'Kiki',
        style: 'Playful & Energetic',
        tag: 'Vibrant • Dynamic',
        accent: 'global',
        gender: 'female',
        language: 'en',
        languageName: 'English',
        langCode: 'en-US',
        sampleText: 'Your workspace environment and all configured tasks are up to date and ready to roll!',
      },
      {
        id: 'expr-voice-5-m',
        alias: 'leo',
        name: 'Leo',
        style: 'Warm & Resonant',
        tag: 'Authoritative • Clear',
        accent: 'global',
        gender: 'male',
        language: 'en',
        languageName: 'English',
        langCode: 'en-US',
        sampleText: 'In deep space, silence reigns supreme as stars quietly burn across billions of years.',
      },
    ];
  }

  /**
   * Initializes or gets the persistent Python worker process
   */
  async ensureWorker() {
    if (this.isReady && this.workerProcess && !this.workerProcess.killed) {
      return true;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      try {
        const scriptPath = path.join(__dirname, 'grokki_voice_worker.py');
        this.workerProcess = spawn(this.pythonPath, [scriptPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        });

        this.rl = readline.createInterface({
          input: this.workerProcess.stdout,
          crlfDelay: Infinity,
        });

        let resolved = false;

        this.rl.on('line', (line) => {
          line = line.trim();
          if (!line) return;
          try {
            const data = JSON.parse(line);
            if (!this.isReady && data.status === 'ready') {
              this.isReady = true;
              if (!resolved) {
                resolved = true;
                resolve(true);
              }
              return;
            }

            // Dispatch to oldest waiting request
            if (this.pendingQueue.length > 0) {
              const req = this.pendingQueue.shift();
              req.resolve(data);
            }
          } catch (e) {
            console.error('[GrokkiVoiceTTS] Parse error:', e, line);
          }
        });

        this.workerProcess.stderr.on('data', (data) => {
          // Progress or warning logs
          const str = data.toString();
          if (!str.includes('HF Hub') && !str.includes('UserWarning')) {
            console.warn('[GrokkiVoiceTTS stderr]:', str.trim());
          }
        });

        this.workerProcess.on('error', (err) => {
          console.error('[GrokkiVoiceTTS Process Error]:', err);
          this.isReady = false;
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
          this._drainPendingWithError(err.message);
        });

        this.workerProcess.on('exit', (code) => {
          console.log('[GrokkiVoiceTTS Process Exited]: code', code);
          this.isReady = false;
          this.workerProcess = null;
          this.rl = null;
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
          this._drainPendingWithError('Voice worker process terminated');
        });

        // 15 second initialization timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(this.isReady);
          }
        }, 15000);
      } catch (err) {
        console.error('[GrokkiVoiceTTS spawn error]:', err);
        resolve(false);
      }
    }).finally(() => {
      this.initPromise = null;
    });

    return this.initPromise;
  }

  _drainPendingWithError(errMsg) {
    while (this.pendingQueue.length > 0) {
      const item = this.pendingQueue.shift();
      if (item.timer) clearTimeout(item.timer);
      item.resolve({ success: false, error: errMsg });
    }
  }

  /**
   * Health-check method
   */
  async checkHealth() {
    try {
      const ready = await this.ensureWorker();
      return {
        connected: ready,
        provider: 'grokki_voice',
        message: ready ? 'Grokki Voice Neural Engine online' : 'Failed to initialize Grokki Voice',
      };
    } catch (e) {
      return { connected: false, provider: 'grokki_voice', message: e.message };
    }
  }

  /**
   * Returns available neural voices
   */
  async fetchVoices() {
    return {
      success: true,
      connected: true,
      voices: this.voices,
    };
  }

  /**
   * Transforms raw markdown/system status replies into short, expressive spoken text.
   */
  formatForExpressiveSpeech(rawText) {
    let text = String(rawText || '').trim();
    if (!text) return '';

    // Convert dry OS status replies into warm human reactions
    const volMatch = text.match(/^Volume:\s*(\d+)%$/i);
    if (volMatch) {
      const lvl = parseInt(volMatch[1], 10);
      if (lvl >= 80) return `Whoa, cranking it up! Volume is at ${lvl} percent.`;
      if (lvl <= 25) return `Keeping it nice and quiet... volume is at ${lvl} percent.`;
      return `Got it! Volume set to ${lvl} percent.`;
    }
    if (/^Volume:\s*Muted$/i.test(text)) return `Audio is muted.`;
    if (/^Volume:\s*Unmuted$/i.test(text)) return `Sound is back on!`;
    if (/^Closed\s+(.+)$/i.test(text)) {
      const app = text.replace(/^Closed\s+/i, '').trim();
      return `Closed ${app} for you!`;
    }
    if (/^Workstation locked/i.test(text)) return `Locking it down... see you soon!`;

    // Strip code blocks, LaTeX math formulas, URLs, and markdown noise
    text = text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/\$\$[\s\S]*?\$\$/g, ' ')
      .replace(/\\\[[\s\S]*?\\\]/g, ' ')
      .replace(/\\\([\s\S]*?\\\)/g, ' ')
      .replace(/\$[^\$\n]+\$/g, ' ')
      .replace(/\\[a-zA-Z]+\{[^{}]*\}/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/[^\s)]+/g, ' ')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[#*_~>•|]/g, ' ')
      .replace(/\s+--\s+/g, ' — ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      return `Here you go! Check out the result on your screen.`;
    }

    // Keep spoken text natural and concise
    const maxSpokenLen = 200;
    if (text.length > maxSpokenLen) {
      const sentences = text.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 0) {
        let first = sentences[0].trim();
        if (first.length > maxSpokenLen) {
          first = first.substring(0, maxSpokenLen).replace(/\s+\S*$/, '') + '.';
        }
        return first;
      }
      return text.substring(0, maxSpokenLen).replace(/\s+\S*$/, '') + '.';
    }

    return text;
  }

  /**
   * Synthesizes speech using local KittenTTS engine.
   */
  async synthesize(text, { voice, speed } = {}) {
    const cleanText = this.formatForExpressiveSpeech(text);
    if (!cleanText) {
      return { success: false, error: 'Empty text', cleanText: '' };
    }

    const ready = await this.ensureWorker();
    if (!ready || !this.workerProcess) {
      return {
        success: false,
        cleanText,
        error: 'Grokki Voice engine not ready',
        provider: 'grokki_voice',
      };
    }

    const targetVoice = voice || this.defaultVoice;
    const targetSpeed = typeof speed === 'number' ? speed : 1.0;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        // Remove from queue if timed out
        const idx = this.pendingQueue.findIndex((i) => i.timer === timer);
        if (idx !== -1) this.pendingQueue.splice(idx, 1);
        resolve({
          success: false,
          cleanText,
          error: 'Synthesis timeout',
          provider: 'grokki_voice',
        });
      }, 15000);

      this.pendingQueue.push({
        resolve: (data) => {
          clearTimeout(timer);
          if (data && data.success) {
            resolve({
              success: true,
              base64Audio: data.base64Audio,
              mimeType: data.mimeType || 'audio/mpeg',
              cleanText,
              inferenceMs: data.inferenceMs,
              provider: 'grokki_voice',
              engine: 'grokki_voice',
            });
          } else {
            resolve({
              success: false,
              cleanText,
              error: data ? data.error : 'Unknown synthesis error',
              provider: 'grokki_voice',
            });
          }
        },
        timer,
      });

      const payload = JSON.stringify({
        command: 'generate',
        text: cleanText,
        voice: targetVoice,
        speed: targetSpeed,
      }) + '\n';

      try {
        this.workerProcess.stdin.write(payload);
      } catch (err) {
        clearTimeout(timer);
        resolve({
          success: false,
          cleanText,
          error: 'Failed to write to voice worker: ' + err.message,
          provider: 'grokki_voice',
        });
      }
    });
  }
}

module.exports = new GrokkiVoiceTTSService();
