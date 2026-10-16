class GrokkiAgent {
  constructor(apiClient) {
    this.api = apiClient || (typeof window !== 'undefined' ? window.jarvisAPI : null);
    this.apiKey = '';
  }

  getApi() {
    if (!this.api && typeof window !== 'undefined' && window.jarvisAPI) {
      this.api = window.jarvisAPI;
    }
    return this.api;
  }

  setApiKey(key) {
    this.apiKey = (key || '').trim();
  }

  timeout(promise, ms, label = 'Timed out') {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
    ]);
  }

  async process(goal, context = {}) {
    const api = this.getApi();
    if (!api || typeof api.executeAI !== 'function') {
      const local = await this.executeLocalFallback(goal);
      if (local.handled) return local;
      return {
        reply: 'Grokki API connection is initializing. Please try again.',
        actionsExecuted: [],
      };
    }

    // 1. Prioritize Gemini AI Brain
    let lastAiError = null;
    try {
      const aiRes = await this.timeout(api.executeAI(goal, context), 60000, 'Request timed out');
      if (aiRes && aiRes.success) {
        return {
          reply: aiRes.reply || 'Done.',
          actionsExecuted: aiRes.actionsExecuted || [],
        };
      }
      if (aiRes && aiRes.error) {
        lastAiError = aiRes.error;
      }
    } catch (err) {
      console.warn('AI failed, checking local fallback:', err);
      lastAiError = err.message;
    }

    // 2. Only use local fallback if AI is unavailable or fails
    const local = await this.executeLocalFallback(goal);
    if (local.handled) return local;

    return {
      reply: lastAiError ? `Error: ${lastAiError}` : 'Could not complete request. Try again.',
      actionsExecuted: [],
    };
  }

  async executeLocalFallback(goal) {
    const api = this.getApi();
    const text = (goal || '').trim();
    const lower = text.toLowerCase();

    if (/^(hi|hello|hey|yo)\b/i.test(lower)) {
      return { handled: true, reply: 'Ready.', actionsExecuted: [] };
    }

    if (lower.includes('volume') || lower.includes('sound') || lower.includes('mute')) {
      let action = 'get';
      const match = lower.match(/(\d{1,3})\s*%?/);
      if (match) {
        action = 'set';
        const level = Math.max(0, Math.min(100, Number(match[1])));
        const res = api ? await api.systemControl({ action, level }) : {};
        return { handled: true, reply: res.message || `Volume: ${level}%`, actionsExecuted: [{ type: 'system_control', action: 'volume_set' }] };
      }
      if (lower.includes('down')) action = 'down';
      else if (lower.includes('up') || lower.includes('increase')) action = 'up';
      else if (lower.includes('mute')) action = 'mute';
      const res = api ? await api.systemControl({ action }) : {};
      return { handled: true, reply: res.message || 'Volume updated.', actionsExecuted: [{ type: 'system_control', action }] };
    }

    if (lower.includes('code') || lower.includes('vs code') || lower.includes('vscode')) {
      if (lower.includes('error') || lower.includes('problem') || lower.includes('bug')) {
        try {
          if (api) {
            const aiRes = await this.timeout(api.executeAI('inspect VS Code errors'), 16000, 'VS Code scan busy');
            if (aiRes && aiRes.success) return { handled: true, reply: aiRes.reply, actionsExecuted: aiRes.actionsExecuted || [] };
          }
        } catch (err) {
          return { handled: true, reply: 'VS Code scan busy. Open Problems with Ctrl+Shift+M.', actionsExecuted: [] };
        }
      }
      if (api) await api.openApp('code');
      return { handled: true, reply: 'VS Code opened.', actionsExecuted: [{ type: 'open_app', appName: 'VS Code' }] };
    }

    if (lower.includes('word') || lower.includes('ms word') || lower.includes('microsoft word')) {
      if (api) await api.openApp('winword');
      return { handled: true, reply: 'Word opened.', actionsExecuted: [{ type: 'open_app', appName: 'Word' }] };
    }

    if (lower.includes('yt music') || lower.includes('youtube music') || (lower.includes('youtube') && lower.includes('music'))) {
      const songMatch = text.match(/(?:play|listen to|search for)\s+(.+?)(?:\s+in|\s+on|\s+at)?\s*(?:yt music|youtube music)?$/i);
      const song = songMatch ? songMatch[1].replace(/in yt music|on yt music/i, '').trim() : '';
      const url = song ? `https://music.youtube.com/search?q=${encodeURIComponent(song)}` : 'https://music.youtube.com';
      if (api) await api.openUrl(url);
      return { handled: true, reply: `YouTube Music: ${song || 'opened'}.`, actionsExecuted: [{ type: 'open_url', url }] };
    }

    if (/^(connect|sign in|login|link|auth).*google/i.test(lower) || /google.*(connect|sign in|login|link|auth)/i.test(lower)) {
      if (api && api.connectGoogle) {
        api.connectGoogle();
        return {
          handled: true,
          reply: 'Opened Google Sign-In in your default browser. Please select your account and grant permissions to connect Grokki!',
          actionsExecuted: [{ type: 'connect_google' }],
        };
      }
    }

    if (/^(search\s+for|search\s+on\s+google|search|google\s+(?!doc|sheet|drive|classroom|task|contact|account|connect|calendar|mail|email))\b/i.test(lower)) {
      let query = text.replace(/^(?:search\s+for|search\s+on\s+google|search|google)\s+/i, '').trim();
      if (query) {
        const url = lower.includes('youtube')
          ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query.replace(/youtube/i, '').trim())}`
          : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        if (api) await api.openUrl(url);
        return { handled: true, reply: `Opened search: ${query}.`, actionsExecuted: [{ type: 'open_url', url }] };
      }
    }

    const launchMatch = text.match(/^(?:open|launch|start|run)\s+(.+)$/i);
    if (launchMatch) {
      const appName = launchMatch[1].trim();
      if (api) await api.openApp(appName);
      return { handled: true, reply: `${appName} opened.`, actionsExecuted: [{ type: 'open_app', appName }] };
    }

    return { handled: false, reply: '', actionsExecuted: [] };
  }

  async processAudio(audioBlob) {
    const api = this.getApi();
    if (!api || typeof api.executeAIAudio !== 'function') {
      return {
        reply: 'Audio bridge not ready. Please try typing.',
        transcript: 'Voice command',
        actionsExecuted: [],
      };
    }
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    try {
      const res = await this.timeout(api.executeAIAudio({
        base64Audio,
        mimeType: audioBlob.type || 'audio/webm',
      }), 18000, 'Voice AI busy');

      if (res && res.success) {
        return {
          reply: res.reply || 'Done.',
          transcript: res.transcript || 'Voice command',
          actionsExecuted: res.actionsExecuted || [],
        };
      }
      let errorReply = 'Voice processing failed. Try typing.';
      if (res?.error === 'NO_SPEECH_DETECTED') {
        errorReply = 'No speech detected.';
      } else if (res?.error === 'NO_API_KEY') {
        errorReply = 'No API key configured.';
      } else if (res?.error) {
        errorReply = typeof res.error === 'string' ? res.error : 'Voice error.';
      }
      return {
        reply: errorReply,
        transcript: 'Voice command',
        actionsExecuted: [],
      };
    } catch (err) {
      return {
        reply: `${err.message || 'Voice failed'}. Try typing.`,
        transcript: 'Voice command',
        actionsExecuted: [],
      };
    }
  }
}

if (typeof window !== 'undefined') {
  window.GrokkiAgent = GrokkiAgent;
  window.JarvisAgent = GrokkiAgent;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GrokkiAgent;
}
