/**
 * VoiceStudio TTS Service
 * Powered by debpalash/VoiceStudio
 * "AI voice studio. On your device. Clone, design, dub, dictate, transcribe and narrate in 646 languages.
 *  Runs on your laptop, desktop, servers, phone, tablets and more."
 *
 * Connects via standard OpenAI-compatible audio API at http://localhost:3900
 * Endpoints:
 *   POST /v1/audio/speech
 *   GET  /v1/audio/voices
 */

class VoiceStudioTTSService {
  constructor() {
    this.defaultEndpoint = 'http://localhost:3900';
    this.defaultModel = 'tts-1';
    this.defaultVoice = 'default';
  }

  normalizeEndpoint(endpoint) {
    let url = (endpoint || this.defaultEndpoint).trim();
    if (!url) url = this.defaultEndpoint;
    url = url.replace(/\/+$/, '');
    if (url.endsWith('/v1')) {
      url = url.slice(0, -3);
    }
    return url;
  }

  /**
   * Health-check against VoiceStudio local server
   */
  async checkHealth(endpoint) {
    const base = this.normalizeEndpoint(endpoint);
    const urlsToTry = [
      `${base}/health`,
      `${base}/.well-known/voicestudio-speech`,
      `${base}/v1/audio/voices`,
      `${base}/`,
    ];

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok || res.status === 200 || res.status === 404) {
          return {
            connected: true,
            endpoint: base,
            status: res.status,
            message: 'VoiceStudio server connected',
          };
        }
      } catch (err) {
        // Try next
      }
    }

    return {
      connected: false,
      endpoint: base,
      message: 'VoiceStudio offline (Run VoiceStudio at http://localhost:3900)',
    };
  }

  /**
   * Transforms raw markdown/status replies into a short, emotionally expressive spoken takeaway.
   */
  formatForExpressiveSpeech(rawText) {
    let text = String(rawText || '').trim();
    if (!text) return '';

    // 1. Convert dry OS status replies into warm, expressive human reactions
    const volMatch = text.match(/^Volume:\s*(\d+)%$/i);
    if (volMatch) {
      const lvl = parseInt(volMatch[1], 10);
      if (lvl >= 80) return `Whoa, cranking it up! Volume's at ${lvl} percent.`;
      if (lvl <= 25) return `Keeping it nice and quiet... volume's at ${lvl} percent.`;
      return `Got it... volume set to ${lvl} percent!`;
    }
    if (/^Volume:\s*Muted$/i.test(text)) return `Shhh... audio muted.`;
    if (/^Volume:\s*Unmuted$/i.test(text)) return `Ahhh... sound is back on!`;
    if (/^Closed\s+(.+)$/i.test(text)) {
      const app = text.replace(/^Closed\s+/i, '').trim();
      return `Phew... closed ${app} for you!`;
    }
    if (/^Workstation locked/i.test(text)) return `Locking it down... see ya in a bit!`;

    // 2. Smart Spoken Summaries for Rich Cards
    if (/Academic Research Papers|Citation \((?:APA|IEEE|BibTeX)\)/i.test(text)) {
      return `Heh, I've pulled up the top peer-reviewed research papers and citations for you right here on screen!`;
    }
    if (/Key Clickable Timestamps|Core Lecture Takeaways/i.test(text)) {
      return `Got it! I've summarized the lecture and added clickable timestamps right below so you can jump to any topic.`;
    }
    if (/Symbolic Math Result/i.test(text)) {
      return `Done! I've solved the expression and formatted the exact mathematical formula for you on screen.`;
    }
    if (/Screen Snap & Solve/i.test(text)) {
      return `I've scanned your screen and laid out the direct answer and step-by-step solution right below!`;
    }
    if (/Lock-In Study Mode Activated/i.test(text)) {
      return `Lock-in mode activated! Lo-fi beats are on... stay focused, you've got this!`;
    }
    if (/Saved to Desktop:.*Grokki_Study_Notes|opened in your editor/i.test(text)) {
      return `Boom! Your study revision sheet is ready and opened in your editor.`;
    }
    if (/Viva Exam Completed|Viva \/ Oral Exam Complete/i.test(text)) {
      return `Awesome job finishing the Viva exam! I've exported your Anki flashcard deck right to your desktop.`;
    }
    if (/Highlight-to-Action \(Replaced in Place!\)/i.test(text)) {
      return `Done! I've transformed your highlighted selection and pasted it right back in place!`;
    }
    if (/Highlight-to-Action/i.test(text)) {
      return `Done! I've processed your selection and copied the result to your clipboard.`;
    }
    if (/Auto-Organized .* Folder/i.test(text)) {
      return `Phew... all cleaned up! I've sorted your files into neat folders and opened it in Explorer.`;
    }
    if (/Live PC & RTX GPU Health Report/i.test(text)) {
      if (/RAM Boost Complete/i.test(text)) {
        return `Boom! I've freed up your system memory and pulled up your live CPU, RAM, and RTX GPU stats.`;
      }
      return `Here's your live PC, RAM, and RTX GPU health report right on screen!`;
    }
    if (/Downloaded \d+ Research Paper PDFs/i.test(text)) {
      return `Awesome! I've downloaded the research paper PDFs straight to your Desktop and opened the folder for you!`;
    }
    if (/Scheduled Reminder Set for/i.test(text)) {
      return `Got it! Your timer is set in the background... I'll let you know right when time's up!`;
    }
    if (/Network & Connectivity Status/i.test(text)) {
      return `Here's your live Wi-Fi network, IP address, and internet ping status right on screen!`;
    }
    if (/Storage Drive Space Report/i.test(text)) {
      return `I've checked your storage drives! Here is your free and used disk space right below.`;
    }
    if (/Clean Fullscreen Screenshot Captured/i.test(text)) {
      return `Snap! Screenshot saved to your Desktop and copied straight to your clipboard!`;
    }
    if (/Live Lecture Stenographer ACTIVE/i.test(text)) {
      return `Stenographer is active and recording your lecture in the background! Just say "finish lecture notes" when you're done.`;
    }
    if (/Live Lecture Notes Generated/i.test(text)) {
      return `Boom! Your live lecture notes are ready and saved to your desktop!`;
    }
    if (/Freed Port \d+/i.test(text) || /Port \d+ is already/i.test(text)) {
      return `Done! I've freed up the port so you can start your dev server right away.`;
    }
    if (/Git Autopilot Complete/i.test(text)) {
      return `Git autopilot complete! Staged your changes, committed, and pushed.`;
    }
    if (/PDFs Merged Successfully/i.test(text)) {
      return `All set! Merged your PDFs into one clean assignment file on your desktop.`;
    }
    if (/PDF Optimization Complete/i.test(text)) {
      return `Done! Optimized your PDF and made it ready for portal submission.`;
    }
    if (/Web Form & Internship Autofiller Ready/i.test(text)) {
      return `Here is your 1-click internship autofill script!`;
    }
    if (/100% Offline Air-Gapped Mode/i.test(text) || /Air-Gap & Offline Connectivity Status/i.test(text)) {
      return `Air-gapped offline status updated!`;
    }
    if (/Smart Presentation Mode ACTIVATED/i.test(text)) {
      return `Presentation mode activated! Wave your hand left or right, or say "next slide" without touching your laptop.`;
    }
    if (/Presentation Mode Deactivated/i.test(text)) {
      return `Presentation mode deactivated.`;
    }
    if (/Advanced to Next Slide|Moved to Previous Slide|Toggled Blackout Screen/i.test(text)) {
      return ``;
    }
    if (/Found Your (?:File|Folder)!/i.test(text)) {
      return `Found it! I've opened File Explorer and highlighted your file right there.`;
    }

    // Special handling for active Viva Oral Quiz turns
    if (/Viva Oral Exam Mode|Question \d+ of 5/i.test(text)) {
      let vivaSpoken = text
        .replace(/💡\s*\*?(?:Key Note|Model Answer)\*?:[^\n]+/gi, '')
        .replace(/\*\(Speak or type your answer[^)]*\)\*/gi, '')
        .replace(/🎙️\s*\*\*Viva Oral Exam Mode:[^*\n]+\*\*\s*\*?\(Question \d+ of 5\)\*?/gi, 'Alright, let us begin your Viva oral exam!')
        .replace(/🎙️\s*\*\*Question (\d+) of 5\*\*:/gi, 'Next up, question $1:')
        .replace(/✅\s*\*\*Score:\s*(\d+)\/10\*\*\s*—?/gi, 'You scored $1 out of 10! ');
      text = vivaSpoken;
    }

    // 3. Translate paralinguistic / emotion tags
    text = text
      .replace(/\[(?:laugh|laughs|laughing)\]|\*(?:laughs?|laughing)\*/gi, 'Haha, ')
      .replace(/\[(?:chuckle|chuckles|giggle)\]|\*(?:chuckles?|giggles?)\*/gi, 'Heh... ')
      .replace(/\[(?:sigh|sighs|sighing)\]|\*(?:sighs?|sighing)\*/gi, 'Ahhh... ')
      .replace(/\[(?:relief|whew|phew)\]|\*(?:phew|relieved)\*/gi, 'Phew... ')
      .replace(/\[(?:gasp|gasps|surprised)\]|\*(?:gasps?)\*/gi, 'Oh! ')
      .replace(/\[(?:hmm|thinking|pondering)\]|\*(?:thinks?|thinking)\*/gi, 'Hmm... ')
      .replace(/\[(?:um|uh|hesitate)\]/gi, 'Umm... ');

    // 4. Strip code blocks, LaTeX math formulas, URLs, and markdown noise
    const hadLongContent = text.length > 180 || /```|\$\$|\\\[|\n\s*[-•*]\s+/m.test(text);

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

    // 5. Keep spoken voice snappy
    const maxSpokenLen = 120;
    if (text.length > maxSpokenLen || hadLongContent) {
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
   * Fetch live voices from VoiceStudio instance or return curated multilingual presets
   */
  async fetchVoices({ endpoint, apiKey } = {}) {
    const base = this.normalizeEndpoint(endpoint);
    const headers = { Accept: 'application/json' };
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const endpoints = [
      `${base}/v1/audio/voices`,
      `${base}/v1/voices`,
      `${base}/api/voices`,
    ];

    let liveVoices = [];
    let connected = false;

    for (const ep of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(ep, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          connected = true;
          const rawList = Array.isArray(data)
            ? data
            : (Array.isArray(data.voices) ? data.voices : (Array.isArray(data.data) ? data.data : []));

          if (rawList.length > 0) {
            liveVoices = rawList.map((v, i) => {
              if (typeof v === 'string') {
                return {
                  id: v,
                  name: v.charAt(0).toUpperCase() + v.slice(1).replace(/[-_]/g, ' '),
                  style: 'VoiceStudio Profile',
                  tag: 'Cloned Voice',
                  accent: 'us',
                  gender: i % 2 === 0 ? 'female' : 'male',
                  category: 'cloned',
                  language: 'en',
                  languageName: 'English',
                };
              }
              return {
                id: v.id || v.voice_id || v.name || `vs_voice_${i}`,
                name: v.name || v.id || `Voice ${i + 1}`,
                style: v.description || v.style || (v.cloned ? 'Cloned Voice' : 'VoiceStudio Engine'),
                tag: v.tag || (v.language ? `Lang: ${v.language}` : 'VoiceStudio Native'),
                accent: v.accent || 'us',
                gender: v.gender || (i % 2 === 0 ? 'female' : 'male'),
                category: v.category || (v.cloned ? 'cloned' : 'preset'),
                previewUrl: v.preview_url || v.sample_url || '',
                language: v.language || 'en',
                languageName: v.language_name || 'English',
              };
            });
            break;
          }
        }
      } catch (err) {
        // Fall back to presets
      }
    }

    return {
      success: true,
      connected,
      endpoint: base,
      voices: liveVoices,
    };
  }

  /**
   * Synthesizes speech using VoiceStudio OpenAI-compatible server at endpoint.
   */
  async synthesize(text, { voice, model, endpoint, apiKey, speed } = {}) {
    const cleanText = this.formatForExpressiveSpeech(text);
    if (!cleanText) {
      return { success: false, error: 'Empty text', cleanText: '' };
    }

    const base = this.normalizeEndpoint(endpoint);
    const targetVoice = voice || this.defaultVoice;
    const targetModel = model || this.defaultModel;
    const targetSpeed = typeof speed === 'number' ? speed : 1.0;

    const requestUrl = `${base}/v1/audio/speech`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'audio/wav, audio/mpeg, audio/*;q=0.9',
    };
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const payload = {
      model: targetModel,
      voice: targetVoice,
      input: cleanText,
      response_format: 'wav',
      speed: targetSpeed,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'audio/wav';
        const mimeType = contentType.includes('mpeg') || contentType.includes('mp3')
          ? 'audio/mpeg'
          : 'audio/wav';

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');

        return {
          success: true,
          base64Audio,
          cleanText,
          mimeType,
          provider: 'voicestudio',
          engine: 'voicestudio',
        };
      }
    } catch (_) {
      // VoiceStudio server offline or unavailable
    }

    return {
      success: false,
      cleanText,
      error: 'VoiceStudio local server not reachable at ' + base,
      provider: 'voicestudio',
    };
  }
}

module.exports = new VoiceStudioTTSService();
