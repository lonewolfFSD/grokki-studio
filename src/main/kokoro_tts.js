const path = require('path');
const fs = require('fs');

class KokoroTTSService {
  constructor() {
    this.ttsInstance = null;
    this.isLoading = false;
    this.initPromise = null;
    this.defaultVoice = 'af_heart';
    this.modelId = 'onnx-community/Kokoro-82M-v1.0-ONNX';
  }

  async getTTS() {
    if (this.ttsInstance) return this.ttsInstance;
    if (this.initPromise) return await this.initPromise;

    this.isLoading = true;
    this.initPromise = (async () => {
      try {
        console.log('[KokoroTTS] Initializing local 82M model...');
        const { KokoroTTS } = await import('kokoro-js');
        this.ttsInstance = await KokoroTTS.from_pretrained(this.modelId, {
          dtype: 'q8',
          device: 'cpu',
        });
        console.log('[KokoroTTS] Kokoro-82M model ready in memory!');
        this.isLoading = false;
        return this.ttsInstance;
      } catch (err) {
        this.isLoading = false;
        this.initPromise = null;
        throw err;
      }
    })();

    return await this.initPromise;
  }

  /**
   * Transforms raw markdown/status replies into a short, emotionally expressive spoken takeaway.
   * Never reads out long essays, raw LaTeX formulas, citations, or bullet lists verbatim—
   * keeps spoken audio under ~145 chars so Kokoro-82M synthesizes in <300ms without blocking!
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

    // 2. Smart Spoken Summaries for Rich Visual / Academic Cards
    // Instead of reading 500 words of citations, timestamps, or math equations aloud, speak a natural summary!
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
    // Stay silent during active slide advancement so speaker is never interrupted!
    if (/Advanced to Next Slide|Moved to Previous Slide|Toggled Blackout Screen/i.test(text)) {
      return ``;
    }
    if (/Found Your (?:File|Folder)!/i.test(text)) {
      return `Found it! I've opened File Explorer and highlighted your file right there.`;
    }

    // Special handling for active Viva Oral Quiz turns: read feedback + question, skip tips/model answer
    if (/Viva Oral Exam Mode|Question \d+ of 5/i.test(text)) {
      let vivaSpoken = text
        .replace(/💡\s*\*?(?:Key Note|Model Answer)\*?:[^\n]+/gi, '')
        .replace(/\*\(Speak or type your answer[^)]*\)\*/gi, '')
        .replace(/🎙️\s*\*\*Viva Oral Exam Mode:[^*\n]+\*\*\s*\*?\(Question \d+ of 5\)\*?/gi, 'Alright, let us begin your Viva oral exam!')
        .replace(/🎙️\s*\*\*Question (\d+) of 5\*\*:/gi, 'Next up, question $1:')
        .replace(/✅\s*\*\*Score:\s*(\d+)\/10\*\*\s*—?/gi, 'You scored $1 out of 10! ');
      text = vivaSpoken;
    }

    // 3. Translate paralinguistic / emotion tags into Kokoro-compatible phonetic vocalizations
    text = text
      .replace(/\[(?:laugh|laughs|laughing)\]|\*(?:laughs?|laughing)\*/gi, 'Haha, ')
      .replace(/\[(?:chuckle|chuckles|giggle)\]|\*(?:chuckles?|giggles?)\*/gi, 'Heh... ')
      .replace(/\[(?:sigh|sighs|sighing)\]|\*(?:sighs?|sighing)\*/gi, 'Ahhh... ')
      .replace(/\[(?:relief|whew|phew)\]|\*(?:phew|relieved)\*/gi, 'Phew... ')
      .replace(/\[(?:gasp|gasps|surprised)\]|\*(?:gasps?)\*/gi, 'Oh! ')
      .replace(/\[(?:hmm|thinking|pondering)\]|\*(?:thinks?|thinking)\*/gi, 'Hmm... ')
      .replace(/\[(?:um|uh|hesitate)\]/gi, 'Umm... ');

    // 4. Strip code blocks, LaTeX math formulas, URLs, and markdown noise so TTS never chokes
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
      // Remove emojis
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Strip markdown formatting symbols (#, *, _, ~, >, •, |)
      .replace(/[#*_~>•|]/g, ' ')
      .replace(/\s+--\s+/g, ' — ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      return `Here you go! Check out the result on your screen.`;
    }

    // 5. Keep spoken voice ultra-snappy (1 short sentence, max 95 chars)
    // If the displayed text is long, only speak the opening takeaway so synthesis is sub-second!
    const maxSpokenLen = 95;
    if (text.length > maxSpokenLen || hadLongContent) {
      const sentences = text.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 0) {
        let first = sentences[0].trim();
        if (first.length > maxSpokenLen) {
          first = first.substring(0, maxSpokenLen).replace(/\s+\S*$/, '') + '.';
        }
        text = first;
      } else {
        text = text.substring(0, maxSpokenLen).replace(/\s+\S*$/, '') + '.';
      }
    }

    return text;
  }

  async synthesize(text, voice = 'af_heart') {
    const cleanText = this.formatForExpressiveSpeech(text);
    if (!cleanText) return { success: false, error: 'Empty text', cleanText: '' };

    // Only use Kokoro if the model is already warm in memory and text is short;
    // otherwise return cleanText immediately so the renderer can speak with zero delay!
    if (!this.ttsInstance) {
      // Trigger non-blocking background warm-up if not started
      this.getTTS().catch(() => {});
      return {
        success: false,
        useFastNative: true,
        cleanText,
      };
    }

    try {
      const tts = this.ttsInstance;
      const targetVoice = voice || this.defaultVoice;

      const startTime = Date.now();
      const audio = await tts.generate(cleanText, {
        voice: targetVoice,
        speed: 1.05,
      });
      const durationMs = Date.now() - startTime;
      console.log(`[KokoroTTS] Synthesized "${cleanText}" in ${durationMs}ms with voice "${targetVoice}"`);

      // Convert audio Float32Array to 16-bit PCM WAV buffer
      const wavBuffer = this.createWavBuffer(audio.audio, audio.sampling_rate || 24000);
      const base64Audio = wavBuffer.toString('base64');

      return {
        success: true,
        base64Audio,
        cleanText,
        mimeType: 'audio/wav',
        durationMs,
      };
    } catch (err) {
      console.error('[KokoroTTS] Synthesis error:', err);
      return { success: false, error: err.message, cleanText };
    }
  }

  createWavBuffer(float32Array, sampleRate = 24000) {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = float32Array.length * bytesPerSample;
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF identifier
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt subchunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // BitsPerSample (16)

    // data subchunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Write 16-bit PCM samples
    let offset = 44;
    for (let i = 0; i < float32Array.length; i++) {
      let sample = Math.max(-1, Math.min(1, float32Array[i]));
      let int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      buffer.writeInt16LE(Math.round(int16), offset);
      offset += 2;
    }

    return buffer;
  }
}

module.exports = new KokoroTTSService();
