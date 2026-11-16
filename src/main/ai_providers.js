/**
 * Unified Multi-Provider AI Client for Grokki
 * Supports 100% Free / Open Source options:
 * 1. Google Gemini (Free Tier via Google AI Studio)
 * 2. Groq Cloud (100% Free & Fast - Llama 3.3 70B & Whisper-large-v3)
 * 3. Local Ollama (100% Offline / Private - Llama 3.2, DeepSeek R1, Qwen 2.5)
 * 4. OpenRouter (Free Community Models - Llama 3.3, DeepSeek R1)
 */

const os = require('os');

function convertSchemaToLowercase(schema, parentKey = '', isRequired = true) {
  if (!schema || typeof schema !== 'object') return schema;
  const out = Array.isArray(schema) ? [] : {};
  const requiredList = Array.isArray(schema.required) ? schema.required : [];

  for (const [key, val] of Object.entries(schema)) {
    if (key === 'type' && typeof val === 'string') {
      const lower = val.toLowerCase();
      // If optional parameter, allow null so models passing null do not trigger validation error
      if (!isRequired && ['string', 'number', 'boolean', 'integer'].includes(lower)) {
        out[key] = [lower, 'null'];
      } else {
        out[key] = lower;
      }
    } else if (key === 'properties' && typeof val === 'object' && val !== null) {
      out.properties = {};
      for (const [propName, propDef] of Object.entries(val)) {
        const propIsRequired = requiredList.includes(propName);
        out.properties[propName] = convertSchemaToLowercase(propDef, propName, propIsRequired);
      }
    } else if (typeof val === 'object' && val !== null) {
      out[key] = convertSchemaToLowercase(val, key, isRequired);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function convertGeminiToolsToOpenAI(geminiTools) {
  const openAITools = [];
  if (!geminiTools || !Array.isArray(geminiTools)) return openAITools;

  for (const group of geminiTools) {
    if (group.functionDeclarations && Array.isArray(group.functionDeclarations)) {
      for (const fn of group.functionDeclarations) {
        openAITools.push({
          type: 'function',
          function: {
            name: fn.name,
            description: fn.description || '',
            parameters: fn.parameters ? convertSchemaToLowercase(fn.parameters) : { type: 'object', properties: {} },
          },
        });
      }
    }
  }
  return openAITools;
}

async function callOpenAICompatible({
  endpoint,
  apiKey,
  model,
  messages,
  tools = null,
  temperature = 0.2,
  signal = null,
  timeout = 45000,
  max_tokens = 4000,
  onStreamDelta = null,
}) {
  const controller = new AbortController();
  let isTimedOut = false;
  const timeoutId = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, timeout);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  // OpenRouter requires HTTP-Referer and X-Title for free model routing
  if (endpoint && endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://github.com/assistant-ai/grokki';
    headers['X-Title'] = 'Grokki Assistant';
  }

  // Portkey headers
  if (endpoint && (endpoint.includes('portkey.ai') || endpoint.includes('8787'))) {
    if (apiKey) headers['x-portkey-api-key'] = apiKey.trim();
    headers['x-portkey-provider'] = 'openai';
  }

  // Helicone headers
  if (endpoint && (endpoint.includes('helicone.ai') || endpoint.includes('oai.helicone.ai'))) {
    if (apiKey) headers['Helicone-Auth'] = `Bearer ${apiKey.trim()}`;
  }

  const payload = {
    model: model || 'openai/gpt-oss-120b',
    messages,
    temperature,
    max_tokens,
  };

  if (typeof onStreamDelta === 'function') {
    payload.stream = true;
  }

  if (tools && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = 'auto';
  }

  // If connecting to local Ollama, pass optimized hardware options to cut VRAM and eliminate memory thrashing
  if (endpoint && (endpoint.includes('127.0.0.1') || endpoint.includes('localhost') || endpoint.includes('11434'))) {
    payload.options = {
      num_ctx: 8192,
      num_predict: max_tokens || 2048,
      num_thread: Math.max(1, Math.min(8, Math.floor((os.cpus()?.length || 4) / 2) || 4)),
      use_mmap: true,
    };
  }

  try {
    const url = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
    let res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // OpenRouter 402 credit/max_tokens auto-adjustment: if OpenRouter says "can only afford N", retry once with affordable max_tokens
    if (!res.ok && res.status === 402 && endpoint && endpoint.includes('openrouter.ai')) {
      const errorText = await res.text();
      let parsed = null;
      try { parsed = JSON.parse(errorText); } catch (e) {}
      const errMsg = parsed?.error?.message || parsed?.message || errorText || `HTTP ${res.status}`;
      const affordMatch = errMsg.match(/can only afford\s+(\d+)/i);
      const affordable = affordMatch ? parseInt(affordMatch[1], 10) : 0;
      if (affordable >= 64 && payload.max_tokens > affordable) {
        payload.max_tokens = Math.max(64, affordable - 16);
        res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } else {
        clearTimeout(timeoutId);
        throw new Error(`Provider API Error (${res.status}): ${errMsg}`);
      }
    }

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      let parsed = null;
      try { parsed = JSON.parse(errorText); } catch (e) {}
      const errMsg = parsed?.error?.message || parsed?.message || errorText || `HTTP ${res.status}`;
      throw new Error(`Provider API Error (${res.status}): ${errMsg}`);
    }

    if (typeof onStreamDelta === 'function' && res.body && (res.headers.get('content-type') || '').includes('text/event-stream')) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let sseBuffer = '';
      let fullContent = '';
      const toolCallsMap = new Map();
      let streamModel = payload.model;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const jsonPart = line.slice(5).trim();
          if (!jsonPart || jsonPart === '[DONE]') continue;
          try {
            const chunk = JSON.parse(jsonPart);
            if (chunk.model) streamModel = chunk.model;
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;
            if (typeof delta.content === 'string' && delta.content.length > 0) {
              fullContent += delta.content;
            }
            if (Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                const existing = toolCallsMap.get(idx) || {
                  id: tc.id || `call_${idx}_${Date.now()}`,
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.function.name += tc.function.name;
                if (typeof tc.function?.arguments === 'string') existing.function.arguments += tc.function.arguments;
                toolCallsMap.set(idx, existing);
              }
            }
            onStreamDelta({
              content: fullContent,
              toolCalls: Array.from(toolCallsMap.values()),
            });
          } catch (_) {}
        }
      }

      return {
        model: streamModel,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: fullContent,
              ...(toolCallsMap.size > 0 ? { tool_calls: Array.from(toolCallsMap.values()) } : {}),
            },
          },
        ],
      };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (signal && signal.aborted) {
      throw new Error('TASK_CANCELLED');
    }
    if (isTimedOut) {
      throw new Error(`Request timed out after ${Math.round(timeout / 1000)}s`);
    }
    throw err;
  }
}

async function transcribeWithGroqWhisper({ apiKey, base64Audio, mimeType = 'audio/webm', signal = null, timeout = 8000 }) {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY_REQUIRED');
  }

  const binaryBuffer = Buffer.from(base64Audio, 'base64');
  const cleanMime = (mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';
  const ext = cleanMime.includes('mp4') ? 'mp4' : cleanMime.includes('wav') ? 'wav' : 'webm';
  const blob = new Blob([binaryBuffer], { type: cleanMime });

  const formData = new FormData();
  formData.append('file', blob, `audio.${ext}`);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'json');
  formData.append('temperature', '0');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq Whisper Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.text || '';
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

module.exports = {
  convertGeminiToolsToOpenAI,
  callOpenAICompatible,
  transcribeWithGroqWhisper,
};
