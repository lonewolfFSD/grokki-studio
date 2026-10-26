/**
 * Unified Multi-Provider AI Client for Grokki
 * Supports 100% Free / Open Source options:
 * 1. Google Gemini (Free Tier via Google AI Studio)
 * 2. Groq Cloud (100% Free & Fast - Llama 3.3 70B & Whisper-large-v3)
 * 3. Local Ollama (100% Offline / Private - Llama 3.2, DeepSeek R1, Qwen 2.5)
 * 4. OpenRouter (Free Community Models - Llama 3.3, DeepSeek R1)
 */

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
  timeout = 25000,
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

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

  const payload = {
    model: model || 'openai/gpt-oss-120b',
    messages,
    temperature,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = 'auto';
  }

  try {
    const url = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      let parsed = null;
      try { parsed = JSON.parse(errorText); } catch (e) {}
      const errMsg = parsed?.error?.message || parsed?.message || errorText || `HTTP ${res.status}`;
      throw new Error(`Provider API Error (${res.status}): ${errMsg}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted || err.name === 'AbortError') {
      throw new Error('TASK_CANCELLED');
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
