/**
 * Grokki Mem0 Long-Term Personalized Memory Manager
 * Powered by mem0ai (https://github.com/mem0ai/mem0)
 *
 * Automatically captures facts, preferences, social relationships, and semester context.
 * Supports both Mem0 Cloud API (when key is provided) and Grokki's Local LanceDB-backed Mem0 Engine.
 */

const fs = require('fs');
const path = require('path');
const lanceDbStore = require('./vector_db_lancedb');

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'or', 'by', 'with',
  'from', 'as', 'about', 'what', 'who', 'how', 'when', 'where', 'why', 'can', 'you', 'tell', 'me',
  'give', 'show', 'please', 'update', 'latest', 'news', 'info', 'information', 'all', 'more',
  'some', 'this', 'that', 'there', 'their', 'they', 'them', 'my', 'your', 'his', 'her', 'it', 'its'
]);

class Mem0Manager {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.storageFile = path.join(this.dataDir, 'mem0_local_store.json');
    this.userId = 'default_user';
    this.cloudClient = null;
    this.localMemories = [];
    this.loadLocal();
    this.initCloud();
  }

  initCloud() {
    try {
      const apiKey = process.env.MEM0_API_KEY || '';
      if (apiKey) {
        const { MemoryClient } = require('mem0ai');
        this.cloudClient = new MemoryClient({ apiKey });
        console.log('[Mem0] Connected to Mem0 Cloud API.');
      }
    } catch (err) {
      console.warn('[Mem0] Cloud init skipped:', err.message);
    }
  }

  loadLocal() {
    try {
      if (fs.existsSync(this.storageFile)) {
        this.localMemories = JSON.parse(fs.readFileSync(this.storageFile, 'utf8'));
      } else {
        this.localMemories = [
          {
            id: 'mem_init_1',
            memory: 'User prefers concise, clean responses and dark/cream aesthetics.',
            category: 'preference',
            created_at: Date.now(),
          },
        ];
        this.saveLocal();
      }
    } catch (_) {
      this.localMemories = [];
    }
  }

  saveLocal() {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(this.localMemories, null, 2), 'utf8');
    } catch (err) {
      console.warn('[Mem0] Save local memories error:', err.message);
    }
  }

  // Automatic memory extraction from conversation turn
  async extractMemoriesFromTurn(userPrompt, assistantReply, llmCallable = null) {
    if (!userPrompt || userPrompt.length < 5) return [];

    // Filter out common throwaway greetings or commands
    if (/^(hi|hey|hello|yo|ok|thanks|thank you|stop|close|exit|cancel)$/i.test(userPrompt.trim())) {
      return [];
    }

    if (this.cloudClient) {
      try {
        const messages = [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: assistantReply || '' },
        ];
        const res = await this.cloudClient.add(messages, { user_id: this.userId });
        console.log('[Mem0] Cloud memories added:', res);
        return res;
      } catch (err) {
        console.warn('[Mem0] Cloud add error, falling back to local engine:', err.message);
      }
    }

    // Local Mem0 Extraction
    // If LLM callable is provided, ask LLM to extract long-term facts
    let extractedFacts = [];
    if (typeof llmCallable === 'function') {
      try {
        const sys = `You are the Mem0 Long-Term Memory Extraction Engine.
Analyze the user statement and extract any persistent user facts, preferences, project details, friends, or life updates.
Return ONLY a valid JSON array of strings (max 3 facts). If there are no long-term facts worth remembering, return [].
Example: ["User's dad name is Arjun", "User studies BCA at ADBU University", "User prefers dark mode"]`;
        const prompt = `User: "${userPrompt}"\nAssistant: "${assistantReply || ''}"`;
        const llmOut = await llmCallable(sys, prompt, 200);
        const match = llmOut.match(/\[[\s\S]*?\]/);
        if (match) {
          extractedFacts = JSON.parse(match[0]);
        }
      } catch (_) {}
    }

    // Heuristic fallback if LLM returned empty or was not supplied
    if (!Array.isArray(extractedFacts) || extractedFacts.length === 0) {
      const lower = userPrompt.toLowerCase();
      if (lower.includes('my name is ') || lower.includes("i'm ") || lower.includes('i am ')) {
        const m = userPrompt.match(/(?:my name is|i am|i'm)\s+([A-Z][a-zA-Z0-9_\s]+)/i);
        if (m) extractedFacts.push(`User name is ${m[1].trim()}`);
      }
      if (lower.includes('i study') || lower.includes('my college') || lower.includes('my university')) {
        extractedFacts.push(`User education: ${userPrompt.trim()}`);
      }
      if (lower.includes('i prefer ') || lower.includes('i like ') || lower.includes('i love ')) {
        extractedFacts.push(`User preference: ${userPrompt.trim()}`);
      }
    }

    // Add and deduplicate in local store & LanceDB
    const added = [];
    for (const fact of extractedFacts) {
      if (typeof fact === 'string' && fact.trim().length > 3) {
        const clean = fact.trim();
        const exists = this.localMemories.some((m) => m.memory.toLowerCase() === clean.toLowerCase());
        if (!exists) {
          const item = {
            id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            memory: clean,
            category: 'fact',
            created_at: Date.now(),
          };
          this.localMemories.push(item);
          added.push(item);

          // Index in LanceDB vector store as well!
          try {
            lanceDbStore.addDocument({
              id: item.id,
              title: 'Mem0 Memory',
              text: clean,
              source: 'mem0_memory',
            }).catch(() => {});
          } catch (_) {}
        }
      }
    }

    if (added.length > 0) {
      this.saveLocal();
      console.log(`[Mem0] Saved ${added.length} new memory fact(s).`);
    }

    return added;
  }
  async searchMemories(query, limit = 4) {
    if (this.cloudClient) {
      try {
        const res = await this.cloudClient.search(query, { user_id: this.userId, limit });
        if (Array.isArray(res) && res.length > 0) return res;
      } catch (err) {
        console.warn('[Mem0] Cloud search error, falling back to local:', err.message);
      }
    }

    const q = String(query || '').toLowerCase().trim();
    if (!q) return [];

    const qWords = q.split(/[^a-zA-Z0-9]+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    if (qWords.length === 0) return [];

    // Vector search via LanceDB (Strict similarity threshold >= 0.65)
    try {
      const vectorHits = await lanceDbStore.search(q, limit);
      const memHits = vectorHits.filter((h) => h.source === 'mem0_memory' && (h.score === undefined || h.score >= 0.65));
      if (memHits.length > 0) {
        return memHits.map((h) => ({ id: h.id, memory: h.text, score: h.score }));
      }
    } catch (_) {}

    // Precise whole-word match fallback on meaningful non-stopwords
    return this.localMemories
      .filter((m) => {
        const mLower = m.memory.toLowerCase();
        return qWords.some((w) => {
          const reg = new RegExp(`\\b${w}\\b`, 'i');
          return reg.test(mLower);
        });
      })
      .slice(0, limit);
  }

  async getMemoriesContext(userQuery) {
    try {
      const hits = await this.searchMemories(userQuery, 3);
      if (!Array.isArray(hits) || hits.length === 0) return '';
      const list = hits.map((h) => `- ${h.memory || h.text}`).join('\n');
      return `\n[User Profile & Long-Term Memory Context]:\n${list}\n(CRITICAL INSTRUCTION: The above facts describe the user's personal profile. ONLY utilize them if directly relevant to what the user explicitly asks. NEVER force or hallucinate these personal facts into unrelated queries like video games, entertainment, news, general facts, or web searches.)\n`;
    } catch (_) {
      return '';
    }
  }

  getAll() {
    return this.localMemories;
  }

  deleteMemory(id) {
    this.localMemories = this.localMemories.filter((m) => m.id !== id);
    this.saveLocal();
    return true;
  }
}

module.exports = new Mem0Manager();
