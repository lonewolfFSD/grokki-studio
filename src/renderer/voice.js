/**
 * Voice Engine for Grokki
 * - Native MediaRecorder capture for multi-modal Gemini AI
 * - Zero WebSpeech upload errors (no chunked data pipe failures)
 * - Real-time Audio Level visualizer for Grokbot character
 * - Automatic Voice Activity Detection (silence detection)
 * - Natural Text-to-Speech (TTS) with speech audio synthesis
 */

class VoiceEngine {
  constructor(grokbot, onSpeechRecognized, onStatusChange, onAudioRecorded, onNoSpeech, onInterimSpeech) {
    this.grokbot = grokbot;
    this.onSpeechRecognized = onSpeechRecognized;
    this.onStatusChange = onStatusChange || (() => {});
    this.onAudioRecorded = onAudioRecorded || null;
    this.onNoSpeech = onNoSpeech || null;
    this.onInterimSpeech = onInterimSpeech || null;

    this.isListening = false;
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.wakeWord = 'hey grokki';
    this.ttsEnabled = true;
    this.voiceName = 'af_bella';
    this.ttsProvider = 'grokki';
    this.elevenlabsVoiceId = 'JBFqnCBsd6RMkjVDRZzb';
    this.elevenlabsApiKey = '';
    this.elevenlabsModel = 'eleven_v3';
    this.currentAudio = null;

    // Voice Activity & Silence Detection
    this.speechDetected = false;
    this.silenceTimeout = null;
    this.maxRecordingTimeout = null;
    this.speechRecognition = null;
    this.liveTranscript = '';
    this.synthAnimFrame = null;
  }

  setWakeWord(word) {
    this.wakeWord = (word || 'hey grokki').trim().toLowerCase();
  }

  setTTSEnabled(enabled) {
    this.ttsEnabled = enabled !== false;
  }

  setVoice(voice) {
    this.voiceName = voice || 'af_bella';
  }

  setTTSProvider(provider, elevenlabsVoiceId, elevenlabsApiKey, elevenlabsModel) {
    this.ttsProvider = provider || 'grokki';
    if (elevenlabsVoiceId) this.elevenlabsVoiceId = elevenlabsVoiceId;
    if (elevenlabsApiKey !== undefined) this.elevenlabsApiKey = elevenlabsApiKey;
    if (elevenlabsModel) this.elevenlabsModel = elevenlabsModel;
  }

  async startListening() {
    if (this.isListening) return;
    this.isListening = true;
    this.speechDetected = false;
    this.speechFrameCount = 0;
    this.discardRecording = false;
    this.liveTranscript = '';
    if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
    if (this.maxRecordingTimeout) clearTimeout(this.maxRecordingTimeout);

    if (window.jarvisAPI && window.jarvisAPI.setRecordingActive) {
      window.jarvisAPI.setRecordingActive(true);
    }

    this.maxRecordingTimeout = setTimeout(() => {
      if (this.isListening) this.stopListening();
    }, 8000);

    this.grokbot.setState('listening');
    this.onStatusChange('listening');

    // Start live microphone stream and visualizer analysis
    await this.startAudioAnalysis();

    // Start native MediaRecorder to capture audio chunks
    this.startMediaRecording();
    this.startLiveSpeechRecognition();
  }

  startLiveSpeechRecognition() {
    try {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRec) return;
      if (this.speechRecognition) {
        try { this.speechRecognition.stop(); } catch (e) {}
      }
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        if (this.discardRecording || !this.isListening) return;
        let finalStr = '';
        let interimStr = '';
        for (let i = 0; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalStr += t + ' ';
          else interimStr += t;
        }
        const combined = (finalStr + interimStr).trim();
        if (combined) {
          this.liveTranscript = combined;
          this.speechDetected = true;
          if (this.onInterimSpeech) {
            this.onInterimSpeech(combined);
          }
        }
      };

      rec.onerror = () => {};
      rec.start();
      this.speechRecognition = rec;
    } catch (e) {}
  }

  stopLiveSpeechRecognition() {
    if (this.speechRecognition) {
      try { this.speechRecognition.stop(); } catch (e) {}
      this.speechRecognition = null;
    }
  }

  /**
   * Immediately aborts/cancels voice listening & discards recorded chunks
   * Used when switching from Voice Mode -> Typing Mode so no phantom "Thank you" audio is sent!
   */
  cancelListening() {
    this.discardRecording = true;
    this.speechDetected = false;
    this.speechFrameCount = 0;
    this.liveTranscript = '';
    this.audioChunks = [];
    this.stopLiveSpeechRecognition();
    this.stopSpeaking();

    if (!this.isListening) {
      this.stopAudioAnalysis();
      if (this.grokbot.state === 'listening' || this.grokbot.state === 'speaking') {
        this.grokbot.setState('idle');
      }
      return;
    }

    this.isListening = false;
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    if (this.maxRecordingTimeout) {
      clearTimeout(this.maxRecordingTimeout);
      this.maxRecordingTimeout = null;
    }

    if (window.jarvisAPI && window.jarvisAPI.setRecordingActive) {
      window.jarvisAPI.setRecordingActive(false);
    }

    this.stopMediaRecording();
    this.stopAudioAnalysis();

    if (this.grokbot.state === 'listening' || this.grokbot.state === 'speaking') {
      this.grokbot.setState('idle');
    }
    this.onStatusChange('idle');
  }

  stopListening() {
    if (!this.isListening) return;
    this.isListening = false;
    this.stopLiveSpeechRecognition();
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    if (this.maxRecordingTimeout) {
      clearTimeout(this.maxRecordingTimeout);
      this.maxRecordingTimeout = null;
    }

    if (window.jarvisAPI && window.jarvisAPI.setRecordingActive) {
      window.jarvisAPI.setRecordingActive(false);
    }

    // Stop MediaRecorder and trigger audio processing
    this.stopMediaRecording();
    this.stopAudioAnalysis();

    if (this.grokbot.state === 'listening') {
      this.grokbot.setState('idle');
    }
    this.onStatusChange('idle');
  }

  toggleListening() {
    if (this.isListening) {
      this.cancelListening();
      return false;
    } else {
      this.startListening();
      return true;
    }
  }

  startMediaRecording() {
    try {
      if (!this.micStream) return;
      this.audioChunks = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      this.mediaRecorder = new MediaRecorder(this.micStream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (!this.discardRecording && event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        if (this.discardRecording) {
          this.audioChunks = [];
          this.liveTranscript = '';
          console.log('[VoiceEngine] Recording discarded (switched to typing or cancelled).');
          return;
        }
        const capturedText = (this.liveTranscript || '').trim();
        this.liveTranscript = '';

        // If live browser speech recognition already decoded the phrase, execute immediately (0ms network wait!)
        if (capturedText && capturedText.length >= 2 && this.onSpeechRecognized) {
          console.log(`[VoiceEngine] Fast live speech recognized: "${capturedText}"`);
          this.onSpeechRecognized(capturedText);
          return;
        }

        if (this.audioChunks.length > 0 && this.speechDetected && this.onAudioRecorded) {
          const blob = new Blob(this.audioChunks, { type: mimeType });
          this.onAudioRecorded(blob);
        } else if (!this.speechDetected) {
          console.log('[VoiceEngine] No speech detected in recording session.');
          if (this.onNoSpeech) {
            this.onNoSpeech();
          }
        }
      };

      this.mediaRecorder.start(200);
    } catch (err) {
      console.warn('MediaRecorder error:', err);
    }
  }

  stopMediaRecording() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    } catch (e) {}
  }

  async startAudioAnalysis() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[Voice] getUserMedia not supported in navigator.mediaDevices');
        return;
      }
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.isListening && this.grokbot.state !== 'speaking') {
          this.grokbot.setAudioLevel(0);
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.max(0, (avg - 10) / 85);
        this.grokbot.setAudioLevel(normalized);

        // Voice Activity Detection (VAD) - require sustained frames (>=3) so mouse clicks don't trigger speech!
        if (normalized > 0.08) {
          this.speechFrameCount = (this.speechFrameCount || 0) + 1;
          if (this.speechFrameCount >= 3) {
            this.speechDetected = true;
          }
          if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
          }
        } else {
          if (!this.speechDetected) {
            this.speechFrameCount = 0;
          }
          if (this.speechDetected && normalized < 0.06 && !this.silenceTimeout) {
            // User paused speaking: auto-stop after 850ms of silence for snappy response!
            this.silenceTimeout = setTimeout(() => {
              if (this.isListening && this.speechDetected) {
                this.stopListening();
              }
            }, 850);
          }
        }

        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err) {
      console.warn('Microphone audio analysis unavailable:', err);
    }
  }

  stopAudioAnalysis() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.grokbot.setAudioLevel(0);
  }

  formatLocalSpeech(rawText) {
    let text = String(rawText || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/\$\$[\s\S]*?\$\$/g, ' ')
      .replace(/\$[^\$\n]+\$/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/[^\s)]+/g, ' ')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[#*_~>•|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return 'Here you go! Check out the result on your screen.';
    const maxLen = 110;
    if (text.length > maxLen) {
      const sentences = text.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 0 && sentences[0].trim().length <= maxLen) {
        return sentences[0].trim();
      }
      return text.substring(0, maxLen).replace(/\s+\S*$/, '') + '.';
    }
    return text;
  }

  speakWithNativeSynth(text, onComplete) {
    if (!window.speechSynthesis) {
      this.grokbot.setAudioLevel(0);
      this.grokbot.setState('idle');
      if (onComplete) onComplete();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const spokenText = this.formatLocalSpeech(text);
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = 1.08;
      utterance.pitch = 1.02;

      const voices = window.speechSynthesis.getVoices() || [];
      const isMale = /^am_|^bm_/i.test(this.voiceName || '');
      const isBritish = /^bf_|^bm_/i.test(this.voiceName || '');
      const preferredVoice =
        voices.find((v) => /natural|online/i.test(v.name) && (isBritish ? /uk|british|gb/i.test(v.lang + v.name) : /us|english/i.test(v.lang + v.name)) && (isMale ? /guy|ryan|christopher|eric|andrew|brian|male/i.test(v.name) : /aria|jenny|ava|Emma|sonia|libby|zira|female/i.test(v.name))) ||
        voices.find((v) => /natural|online|aria|jenny|ava|zira|david/i.test(v.name) && /en/i.test(v.lang)) ||
        voices.find((v) => /en/i.test(v.lang)) ||
        voices[0];

      if (preferredVoice) utterance.voice = preferredVoice;

      const raysBackdrop = document.getElementById('lightRaysBackdrop');
      if (raysBackdrop) raysBackdrop.classList.add('active');

      let active = true;
      const pulseLoop = () => {
        if (!active || !window.speechSynthesis.speaking) {
          this.grokbot.setAudioLevel(0);
          if (window.grokkiLightRays && typeof window.grokkiLightRays.resetAudioReaction === 'function') {
            window.grokkiLightRays.resetAudioReaction();
          }
          return;
        }
        const t = Date.now() / 95;
        const vol = 0.35 + 0.35 * Math.abs(Math.sin(t) * Math.cos(t * 0.65));
        const pitch = 0.4 + 0.3 * Math.sin(t * 0.8);
        this.grokbot.setAudioLevel(vol);
        if (window.grokkiLightRays && typeof window.grokkiLightRays.reactToAudio === 'function') {
          window.grokkiLightRays.reactToAudio(vol, pitch);
        }
        this.synthAnimFrame = requestAnimationFrame(pulseLoop);
      };

      const finish = () => {
        if (!active) return;
        active = false;
        if (this.synthAnimFrame) {
          cancelAnimationFrame(this.synthAnimFrame);
          this.synthAnimFrame = null;
        }
        this.grokbot.setAudioLevel(0);
        this.grokbot.setState('idle');
        if (window.grokkiLightRays && typeof window.grokkiLightRays.resetAudioReaction === 'function') {
          window.grokkiLightRays.resetAudioReaction();
        }
        if (onComplete) onComplete();
      };

      utterance.onstart = () => {
        this.grokbot.setState('speaking');
        pulseLoop();
      };
      utterance.onend = finish;
      utterance.onerror = finish;

      // Safety fallback timeout so it never hangs
      setTimeout(finish, Math.max(4000, spokenText.length * 95));

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      this.grokbot.setAudioLevel(0);
      this.grokbot.setState('idle');
      if (onComplete) onComplete();
    }
  }

  // Kokoro-82M Studio Natural Voice Output with Instant Native Fallback
  async speak(text, onComplete) {
    if (!this.ttsEnabled || !text) {
      if (onComplete) onComplete();
      return;
    }

    this.stopSpeaking();
    this.grokbot.setState('speaking');

    if (!window.jarvisAPI || !window.jarvisAPI.speakText) {
      this.speakWithNativeSynth(text, onComplete);
      return;
    }

    try {
      const isElevenLabs = this.ttsProvider === 'elevenlabs';
      const voiceIdToPass = isElevenLabs ? (this.elevenlabsVoiceId || 'JBFqnCBsd6RMkjVDRZzb') : (this.voiceName || 'af_heart');
      const timeoutMs = isElevenLabs ? 4500 : 1400;

      let res = null;
      if (isElevenLabs && this.elevenlabsApiKey && this.elevenlabsApiKey.trim()) {
        // Direct ElevenLabs v3 / Flash synthesis in renderer so it always works
        const clean = String(text || '').replace(/[*#`_~\[\]]/g, '').trim().slice(0, 450);
        const rawId = String(voiceIdToPass).split('__')[0];
        const targetVoice =
          rawId &&
          !rawId.startsWith('af_') &&
          !rawId.startsWith('am_') &&
          !rawId.startsWith('bf_') &&
          !rawId.startsWith('bm_')
            ? rawId
            : 'JBFqnCBsd6RMkjVDRZzb';
        const prefModel = this.elevenlabsModel || 'eleven_v3';
        const modelsToTry =
          prefModel === 'eleven_v3'
            ? ['eleven_v3', 'eleven_flash_v2_5', 'eleven_multilingual_v2']
            : [prefModel, 'eleven_flash_v2_5'];

        for (const m of modelsToTry) {
          try {
            const q = m === 'eleven_v3' ? 'output_format=mp3_44100_128' : 'optimize_streaming_latency=3&output_format=mp3_44100_128';
            const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(targetVoice)}?${q}`, {
              method: 'POST',
              headers: {
                'xi-api-key': this.elevenlabsApiKey.trim(),
                'Content-Type': 'application/json',
                Accept: 'audio/mpeg',
              },
              body: JSON.stringify({
                text: clean,
                model_id: m,
                voice_settings: { stability: 0.5, similarity_boost: 0.78, style: 0.15, use_speaker_boost: true },
              }),
            });
            if (r.ok) {
              const buf = await r.arrayBuffer();
              const bytes = new Uint8Array(buf);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
              res = { success: true, base64Audio: btoa(binary), mimeType: 'audio/mpeg', cleanText: clean };
              break;
            }
            if (r.status === 401) break;
          } catch (e) {}
        }
      }

      if (!res) {
        res = await Promise.race([
          window.jarvisAPI.speakText(text, voiceIdToPass, {
            provider: this.ttsProvider,
            apiKey: this.elevenlabsApiKey,
            model: this.elevenlabsModel || 'eleven_v3',
          }),
          new Promise((resolve) => setTimeout(() => resolve({ success: false, useFastNative: true }), timeoutMs)),
        ]);
      }
      if (!res || !res.success || !res.base64Audio) {
        const cleanToSpeak = (res && res.cleanText) ? res.cleanText : text;
        this.speakWithNativeSynth(cleanToSpeak, onComplete);
        return;
      }

      const mime = res.mimeType || 'audio/wav';
      const audio = new Audio(`data:${mime};base64,${res.base64Audio}`);
      this.currentAudio = audio;

      const raysBackdrop = document.getElementById('lightRaysBackdrop');
      if (raysBackdrop) raysBackdrop.classList.add('active');

      let audioCtx = null;
      let analyser = null;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.currentAudioCtx = audioCtx;
        const source = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128; // 64 frequency bins for fast pitch/intensity tracking
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch (e) {}

      const bufferLength = analyser ? analyser.frequencyBinCount : 0;
      const dataArray = analyser ? new Uint8Array(bufferLength) : null;

      const updateLevel = () => {
        if (!this.currentAudio || this.currentAudio.paused || this.currentAudio.ended) {
          this.grokbot.setAudioLevel(0);
          if (window.grokkiLightRays && typeof window.grokkiLightRays.resetAudioReaction === 'function') {
            window.grokkiLightRays.resetAudioReaction();
          }
          return;
        }

        if (analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray);

          // 1. Calculate Volume / Intensity (RMS across full speech spectrum)
          let sum = 0;
          let weightedPitchSum = 0;
          let magnitudeSum = 0;
          const maxVoiceBin = Math.min(bufferLength, 46);

          for (let i = 0; i < bufferLength; i++) {
            const mag = dataArray[i];
            sum += mag;
            if (i >= 1 && i <= maxVoiceBin && mag > 12) {
              weightedPitchSum += i * mag;
              magnitudeSum += mag;
            }
          }

          const avg = sum / bufferLength;
          const normalizedVol = Math.min(1, Math.max(0, (avg - 5) / 85));
          this.grokbot.setAudioLevel(normalizedVol);

          // 2. Calculate Voice Pitch (Spectral Centroid Ratio)
          const centroid = magnitudeSum > 0 ? (weightedPitchSum / magnitudeSum) : 8;
          // Centroid typically fluctuates between bin 3.5 (~300Hz) and bin 24 (~2200Hz)
          const pitchRatio = Math.min(1, Math.max(0, (centroid - 3.5) / 19.5));

          // 3. Modulate Light Rays with voice Pitch and Intensity
          if (window.grokkiLightRays && typeof window.grokkiLightRays.reactToAudio === 'function') {
            window.grokkiLightRays.reactToAudio(normalizedVol, pitchRatio);
          }
        } else {
          // Fallback pulse if AudioContext is restricted
          const fallbackVol = 0.4 + 0.3 * Math.sin(Date.now() / 120);
          this.grokbot.setAudioLevel(fallbackVol);
          if (window.grokkiLightRays && typeof window.grokkiLightRays.reactToAudio === 'function') {
            window.grokkiLightRays.reactToAudio(fallbackVol, 0.5);
          }
        }
        requestAnimationFrame(updateLevel);
      };

      audio.onplay = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        updateLevel();
      };

      audio.onended = () => {
        this.currentAudio = null;
        this.grokbot.setAudioLevel(0);
        this.grokbot.setState('idle');
        if (window.grokkiLightRays && typeof window.grokkiLightRays.resetAudioReaction === 'function') {
          window.grokkiLightRays.resetAudioReaction();
        }
        try { if (audioCtx) audioCtx.close(); } catch (e) {}
        if (onComplete) onComplete();
      };

      audio.onerror = () => {
        this.currentAudio = null;
        this.grokbot.setAudioLevel(0);
        this.grokbot.setState('idle');
        if (window.grokkiLightRays && typeof window.grokkiLightRays.resetAudioReaction === 'function') {
          window.grokkiLightRays.resetAudioReaction();
        }
        if (onComplete) onComplete();
      };

      await audio.play();
    } catch (err) {
      console.warn('[VoiceEngine] Kokoro speech output failed:', err);
      this.grokbot.setAudioLevel(0);
      this.grokbot.setState('idle');
      if (window.grokkiLightRays && typeof window.grokkiLightRays.resetAudioReaction === 'function') {
        window.grokkiLightRays.resetAudioReaction();
      }
      if (onComplete) onComplete();
    }
  }

  stopSpeaking() {
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    if (this.synthAnimFrame) {
      cancelAnimationFrame(this.synthAnimFrame);
      this.synthAnimFrame = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio = null;
      } catch (e) {}
    }
    if (this.currentAudioCtx) {
      try {
        if (this.currentAudioCtx.state !== 'closed') this.currentAudioCtx.close();
      } catch (e) {}
      this.currentAudioCtx = null;
    }
    this.grokbot.setAudioLevel(0);
    if (window.grokkiLightRays && typeof window.grokkiLightRays.resetAudioReaction === 'function') {
      window.grokkiLightRays.resetAudioReaction();
    }
    if (this.grokbot.state === 'speaking') {
      this.grokbot.setState('idle');
    }
  }
}

window.VoiceEngine = VoiceEngine;
