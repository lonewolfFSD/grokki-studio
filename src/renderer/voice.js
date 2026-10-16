/**
 * Voice Engine for Grokki
 * - Native MediaRecorder capture for multi-modal Gemini AI
 * - Zero WebSpeech upload errors (no chunked data pipe failures)
 * - Real-time Audio Level visualizer for Grokbot character
 * - Automatic Voice Activity Detection (silence detection)
 * - Natural Text-to-Speech (TTS) with speech audio synthesis
 */

class VoiceEngine {
  constructor(grokbot, onSpeechRecognized, onStatusChange, onAudioRecorded, onNoSpeech) {
    this.grokbot = grokbot;
    this.onSpeechRecognized = onSpeechRecognized;
    this.onStatusChange = onStatusChange || (() => {});
    this.onAudioRecorded = onAudioRecorded || null;
    this.onNoSpeech = onNoSpeech || null;

    this.isListening = false;
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.wakeWord = 'hey grokki';
    this.ttsEnabled = true;
    this.voiceName = 'af_bella';
    this.currentAudio = null;

    // Voice Activity & Silence Detection
    this.speechDetected = false;
    this.silenceTimeout = null;
    this.maxRecordingTimeout = null;
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

  async startListening() {
    if (this.isListening) return;
    this.isListening = true;
    this.speechDetected = false;
    this.speechFrameCount = 0;
    this.discardRecording = false;
    if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
    if (this.maxRecordingTimeout) clearTimeout(this.maxRecordingTimeout);

    if (window.jarvisAPI && window.jarvisAPI.setRecordingActive) {
      window.jarvisAPI.setRecordingActive(true);
    }

    this.maxRecordingTimeout = setTimeout(() => {
      if (this.isListening) this.stopListening();
    }, 9000);

    this.grokbot.setState('listening');
    this.onStatusChange('listening');

    // Start live microphone stream and visualizer analysis
    await this.startAudioAnalysis();

    // Start native MediaRecorder to capture audio chunks
    this.startMediaRecording();
  }

  /**
   * Immediately aborts/cancels voice listening & discards recorded chunks
   * Used when switching from Voice Mode -> Typing Mode so no phantom "Thank you" audio is sent!
   */
  cancelListening() {
    this.discardRecording = true;
    this.speechDetected = false;
    this.speechFrameCount = 0;
    this.audioChunks = [];

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
          console.log('[VoiceEngine] Recording discarded (switched to typing or cancelled).');
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

        // Voice Activity Detection (VAD) - require sustained frames (>4) so mouse clicks don't trigger speech!
        if (normalized > 0.11) {
          this.speechFrameCount = (this.speechFrameCount || 0) + 1;
          if (this.speechFrameCount >= 4) {
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
          if (this.speechDetected && normalized < 0.05 && !this.silenceTimeout) {
            // User paused speaking: auto-stop after 1.5s of silence
            this.silenceTimeout = setTimeout(() => {
              if (this.isListening && this.speechDetected) {
                this.stopListening();
              }
            }, 1500);
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

  // Kokoro-82M Studio Natural Voice Output
  async speak(text, onComplete) {
    if (!this.ttsEnabled || !text || !window.jarvisAPI || !window.jarvisAPI.speakText) {
      if (onComplete) onComplete();
      return;
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

    this.grokbot.setState('speaking');

    try {
      const res = await Promise.race([
        window.jarvisAPI.speakText(text, this.voiceName || 'af_heart'),
        new Promise((resolve) => setTimeout(() => resolve({ success: false, error: 'TTS_TIMEOUT' }), 7000)),
      ]);
      if (!res || !res.success || !res.base64Audio) {
        this.grokbot.setAudioLevel(0);
        this.grokbot.setState('idle');
        if (onComplete) onComplete();
        return;
      }

      const audio = new Audio(`data:audio/wav;base64,${res.base64Audio}`);
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
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio = null;
      } catch (e) {}
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
