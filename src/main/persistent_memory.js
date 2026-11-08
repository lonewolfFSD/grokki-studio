const fs = require('fs');
const path = require('path');
const { getDataDir } = require('./data_dir');

/**
 * Grokki Persistent Memory System
 * 
 * 4 Autonomous Memory Categories:
 * - Profile: Personal preferences, communication style, tech stacks, stable facts
 * - Project: Multi-project independent storage (architecture, decisions, progress, issues)
 * - Episodic: Significant past experiences, key discussions, turning points, historical context
 * - Knowledge: Technical facts, concepts, cross-cutting insights, relationships
 */

class PersistentMemory {
  constructor() {
    this.baseDir = path.join(getDataDir(), 'memory');
    this.dirs = {
      profile: path.join(this.baseDir, 'profile'),
      projects: path.join(this.baseDir, 'projects'),
      episodic: path.join(this.baseDir, 'episodic'),
      knowledge: path.join(this.baseDir, 'knowledge'),
    };

    this.indexPath = path.join(this.baseDir, 'index.json');
    this.projectsIndexPath = path.join(this.dirs.projects, 'index.json');

    this.memories = new Map(); // id -> MemoryItem
    this.projects = new Map(); // id -> ProjectItem
    this.isInitialized = false;

    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      for (const key of Object.keys(this.dirs)) {
        if (!fs.existsSync(this.dirs[key])) {
          fs.mkdirSync(this.dirs[key], { recursive: true });
        }
      }

      this.loadIndex();
      this.loadProjectsIndex();

      this.isInitialized = true;
    } catch (err) {
      console.warn('[PersistentMemory] Init error:', err.message);
    }
  }

  loadIndex() {
    try {
      if (fs.existsSync(this.indexPath)) {
        const raw = fs.readFileSync(this.indexPath, 'utf8');
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          this.memories.clear();
          for (const item of items) {
            if (item && item.id) {
              this.memories.set(item.id, item);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[PersistentMemory] Failed to load index:', err.message);
    }
  }

  saveIndex() {
    try {
      const items = Array.from(this.memories.values());
      fs.writeFileSync(this.indexPath, JSON.stringify(items, null, 2), 'utf8');
      this.syncMarkdownFiles();
    } catch (err) {
      console.warn('[PersistentMemory] Failed to save index:', err.message);
    }
  }

  loadProjectsIndex() {
    try {
      if (fs.existsSync(this.projectsIndexPath)) {
        const raw = fs.readFileSync(this.projectsIndexPath, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.projects.clear();
          for (const p of list) {
            if (p && p.id) {
              this.projects.set(p.id, p);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[PersistentMemory] Failed to load projects index:', err.message);
    }
  }

  saveProjectsIndex() {
    try {
      const list = Array.from(this.projects.values());
      fs.writeFileSync(this.projectsIndexPath, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.warn('[PersistentMemory] Failed to save projects index:', err.message);
    }
  }

  // --- CRUD Operations ---

  getAllMemories(filters = {}) {
    let items = Array.from(this.memories.values());

    if (filters.category && filters.category !== 'all') {
      items = items.filter((m) => m.category === filters.category);
    }
    if (filters.projectId && filters.projectId !== 'all') {
      items = items.filter((m) => m.projectId === filters.projectId);
    }
    if (filters.pinned !== undefined) {
      items = items.filter((m) => !!m.pinned === !!filters.pinned);
    }
    if (filters.userConfirmed !== undefined) {
      items = items.filter((m) => !!m.userConfirmed === !!filters.userConfirmed);
    }
    if (filters.tag) {
      const t = filters.tag.toLowerCase();
      items = items.filter((m) => Array.isArray(m.tags) && m.tags.some((tag) => tag.toLowerCase() === t));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (m) =>
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.content && m.content.toLowerCase().includes(q)) ||
          (m.projectName && m.projectName.toLowerCase().includes(q)) ||
          (Array.isArray(m.tags) && m.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Sort: pinned first, then by updatedAt descending
    return items.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }

  getMemory(id) {
    return this.memories.get(id) || null;
  }

  addMemory(data) {
    const now = new Date().toISOString();
    const id = data.id || `mem_${data.category || 'gen'}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const item = {
      id,
      category: data.category || 'knowledge',
      projectId: data.projectId || undefined,
      projectName: data.projectName || undefined,
      title: (data.title || 'Untitled Memory').trim(),
      content: (data.content || '').trim(),
      summary: data.summary || undefined,
      tags: Array.isArray(data.tags) ? data.tags.map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
      confidence: typeof data.confidence === 'number' ? Math.max(0, Math.min(1, data.confidence)) : 0.85,
      userConfirmed: Boolean(data.userConfirmed),
      pinned: Boolean(data.pinned),
      sourceConversationId: data.sourceConversationId || undefined,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      connections: Array.isArray(data.connections) ? data.connections : [],
      history: Array.isArray(data.history) ? data.history : [],
    };

    // If attached to a project and projectName was missing, look up project
    if (item.projectId && !item.projectName && this.projects.has(item.projectId)) {
      item.projectName = this.projects.get(item.projectId).name;
    }

    this.memories.set(id, item);
    this.saveIndex();
    this.writeMemoryToCategoryFile(item);

    return item;
  }

  updateMemory(id, updates = {}) {
    const existing = this.memories.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();

    // If content changed significantly, preserve decision evolution in history
    if (updates.content && updates.content.trim() !== existing.content.trim()) {
      const historyEntry = {
        date: existing.updatedAt || existing.createdAt || now,
        previousContent: existing.content,
        reason: updates.reason || 'Updated with new information',
      };
      existing.history = Array.isArray(existing.history) ? [...existing.history, historyEntry] : [historyEntry];
    }

    const updated = {
      ...existing,
      ...updates,
      tags: Array.isArray(updates.tags)
        ? updates.tags.map((t) => t.trim().toLowerCase()).filter(Boolean)
        : existing.tags,
      updatedAt: now,
    };

    if (updates.userConfirmed !== undefined) {
      updated.userConfirmed = Boolean(updates.userConfirmed);
    }

    this.memories.set(id, updated);
    this.saveIndex();
    this.writeMemoryToCategoryFile(updated);

    return updated;
  }

  deleteMemory(id) {
    if (!this.memories.has(id)) return false;
    const item = this.memories.get(id);
    this.memories.delete(id);

    // Remove any references from other memories
    for (const other of this.memories.values()) {
      if (Array.isArray(other.connections) && other.connections.includes(id)) {
        other.connections = other.connections.filter((c) => c !== id);
      }
    }

    this.saveIndex();
    return true;
  }

  pinMemory(id, pinned = true) {
    const item = this.memories.get(id);
    if (!item) return null;
    item.pinned = !!pinned;
    item.updatedAt = new Date().toISOString();
    this.saveIndex();
    return item;
  }

  // --- Projects Storage & Management ---

  getAllProjects() {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  }

  getProject(projectId) {
    return this.projects.get(projectId) || null;
  }

  saveProject(projectData) {
    const now = new Date().toISOString();
    const id = projectData.id || `proj_${(projectData.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

    const project = {
      id,
      name: (projectData.name || 'New Project').trim(),
      description: (projectData.description || '').trim(),
      techStack: Array.isArray(projectData.techStack) ? projectData.techStack : [],
      status: projectData.status || 'active',
      createdAt: projectData.createdAt || now,
      updatedAt: now,
      notes: projectData.notes || '',
    };

    this.projects.set(id, project);
    this.saveProjectsIndex();

    // Ensure dedicated folder exists for this independent project
    const projDir = path.join(this.dirs.projects, id);
    if (!fs.existsSync(projDir)) {
      fs.mkdirSync(projDir, { recursive: true });
    }
    fs.writeFileSync(path.join(projDir, 'project.json'), JSON.stringify(project, null, 2), 'utf8');

    return project;
  }

  deleteProject(projectId) {
    if (!this.projects.has(projectId)) return false;
    this.projects.delete(projectId);
    this.saveProjectsIndex();

    // Remove memories linked to this project
    for (const [id, mem] of this.memories.entries()) {
      if (mem.projectId === projectId) {
        this.memories.delete(id);
      }
    }
    this.saveIndex();

    const projDir = path.join(this.dirs.projects, projectId);
    try {
      if (fs.existsSync(projDir)) {
        fs.rmSync(projDir, { recursive: true, force: true });
      }
    } catch (_) {}

    return true;
  }

  // --- Category Markdown Synchronization ---

  writeMemoryToCategoryFile(item) {
    try {
      if (item.category === 'profile') {
        const mdPath = path.join(this.dirs.profile, 'profile.md');
        this.writeProfileMarkdown(mdPath);
      } else if (item.category === 'project' && item.projectId) {
        const projDir = path.join(this.dirs.projects, item.projectId);
        if (!fs.existsSync(projDir)) fs.mkdirSync(projDir, { recursive: true });
        const mdPath = path.join(projDir, 'context.md');
        this.writeProjectMarkdown(item.projectId, mdPath);
      } else if (item.category === 'knowledge') {
        const mdPath = path.join(this.dirs.knowledge, 'knowledge_base.md');
        this.writeCategorySummaryMarkdown('knowledge', 'Knowledge Memory Base', mdPath);
      } else if (item.category === 'episodic') {
        const mdPath = path.join(this.dirs.episodic, 'episodes_timeline.md');
        this.writeCategorySummaryMarkdown('episodic', 'Episodic Memory & Decisions Timeline', mdPath);
      }
    } catch (err) {
      console.warn('[PersistentMemory] Markdown write error:', err.message);
    }
  }

  syncMarkdownFiles() {
    try {
      this.writeProfileMarkdown(path.join(this.dirs.profile, 'profile.md'));
      for (const projId of this.projects.keys()) {
        const pDir = path.join(this.dirs.projects, projId);
        if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true });
        this.writeProjectMarkdown(projId, path.join(pDir, 'context.md'));
      }
      this.writeCategorySummaryMarkdown('knowledge', 'Knowledge Memory Base', path.join(this.dirs.knowledge, 'knowledge_base.md'));
      this.writeCategorySummaryMarkdown('episodic', 'Episodic Memory & Decisions Timeline', path.join(this.dirs.episodic, 'episodes_timeline.md'));
    } catch (_) {}
  }

  writeProfileMarkdown(filePath) {
    const items = this.getAllMemories({ category: 'profile' });
    let md = `# User Profile & Preferences\n\n*Updated: ${new Date().toLocaleString()}*\n\n`;
    for (const item of items) {
      md += `### ${item.title}${item.pinned ? ' ⭐' : ''}\n${item.content}\n\n`;
      if (item.tags.length > 0) md += `*Tags: ${item.tags.join(', ')}*\n\n`;
    }
    fs.writeFileSync(filePath, md, 'utf8');
  }

  writeProjectMarkdown(projectId, filePath) {
    const proj = this.projects.get(projectId);
    if (!proj) return;
    const items = this.getAllMemories({ category: 'project', projectId });
    let md = `# Project: ${proj.name}\n\n${proj.description}\n\n`;
    if (proj.techStack && proj.techStack.length > 0) {
      md += `**Tech Stack**: ${proj.techStack.join(', ')}\n\n`;
    }
    md += `## Decisions, Architecture & Progress\n\n`;
    for (const item of items) {
      md += `### ${item.title}${item.pinned ? ' ⭐' : ''}\n${item.content}\n\n`;
      if (item.history && item.history.length > 0) {
        md += `> **Historical Evolution**:\n`;
        for (const h of item.history) {
          md += `> - *${new Date(h.date).toLocaleDateString()}*: ${h.previousContent}\n`;
        }
        md += `\n`;
      }
    }
    fs.writeFileSync(filePath, md, 'utf8');
  }

  writeCategorySummaryMarkdown(category, heading, filePath) {
    const items = this.getAllMemories({ category });
    let md = `# ${heading}\n\n*Total Records: ${items.length} | Last Updated: ${new Date().toLocaleString()}*\n\n`;
    for (const item of items) {
      const dateStr = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '';
      md += `### ${item.title} ${dateStr ? `(${dateStr})` : ''}${item.pinned ? ' ⭐' : ''}\n`;
      if (item.projectName) md += `*Related Project: ${item.projectName}*\n\n`;
      md += `${item.content}\n\n`;
      if (item.history && item.history.length > 0) {
        md += `> **History & Past Decision**:\n`;
        for (const h of item.history) {
          md += `> - ${h.previousContent}\n`;
        }
        md += `\n`;
      }
    }
    fs.writeFileSync(filePath, md, 'utf8');
  }

  // --- Intelligent Persistent Retrieval ---

  /**
   * Intelligently retrieves memories matching user query/intent
   * Respects context window limits by selecting the top relevant entries.
   */
  retrieveContext(prompt, options = {}) {
    const query = (prompt || '').trim().toLowerCase();
    if (!query) {
      return { formattedPromptSection: '', retrievedMemories: [] };
    }

    const words = query
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const scored = [];
    const allMemories = Array.from(this.memories.values());

    // Check if query references any specific project
    let activeProjectId = options.projectId || null;
    if (!activeProjectId) {
      for (const proj of this.projects.values()) {
        const nameLower = proj.name.toLowerCase();
        if (query.includes(nameLower) || words.some((w) => nameLower.includes(w))) {
          activeProjectId = proj.id;
          break;
        }
      }
    }

    // Detect if user is asking for past discussions / decisions
    const isRecallQuery =
      /\b(remember|what did we|recall|last time|previously|decision|we chose|we decided|continue|where we left off|what was that)\b/i.test(
        query
      );

    for (const mem of allMemories) {
      let score = 0;
      const titleLower = (mem.title || '').toLowerCase();
      const contentLower = (mem.content || '').toLowerCase();
      const projectLower = (mem.projectName || '').toLowerCase();

      // Pinned memories get high baseline boost
      if (mem.pinned) score += 6.0;

      // Project-specific alignment
      if (activeProjectId && mem.projectId === activeProjectId) {
        score += 8.0;
      } else if (projectLower && query.includes(projectLower)) {
        score += 6.0;
      }

      // Exact title phrase match
      if (titleLower && query.includes(titleLower)) {
        score += 10.0;
      }

      // Word matches
      let matchCount = 0;
      for (const word of words) {
        if (titleLower.includes(word)) {
          score += 3.5;
          matchCount++;
        }
        if (contentLower.includes(word)) {
          score += 2.0;
          matchCount++;
        }
        if (Array.isArray(mem.tags) && mem.tags.some((t) => t.includes(word))) {
          score += 3.0;
          matchCount++;
        }
      }

      // Category matching boosts
      if (isRecallQuery && (mem.category === 'episodic' || mem.category === 'project')) {
        score += 5.0;
      }
      if (mem.userConfirmed) {
        score += 2.0;
      }

      // Confidence factor
      score *= mem.confidence || 0.8;

      if (score >= 4.0 || (mem.pinned && score >= 3.0)) {
        scored.push({ mem, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    // Limit to top 6 most relevant memories to strictly respect model context limits
    const topMemories = scored.slice(0, 6).map((s) => s.mem);

    if (topMemories.length === 0) {
      // If no direct query match but we have pinned profile preferences, inject top pinned profile items
      const pinnedProfile = allMemories.filter((m) => m.pinned && m.category === 'profile').slice(0, 3);
      if (pinnedProfile.length > 0) {
        const section = this.formatRetrievedSection(pinnedProfile);
        return { formattedPromptSection: section, retrievedMemories: pinnedProfile };
      }
      return { formattedPromptSection: '', retrievedMemories: [] };
    }

    const section = this.formatRetrievedSection(topMemories);
    return { formattedPromptSection: section, retrievedMemories: topMemories };
  }

  formatRetrievedSection(memories) {
    if (!memories || memories.length === 0) return '';

    let out = `\n[GROKKI PERSISTENT MEMORY CONTEXT]\n`;
    out += `The following relevant memories are retrieved from your persistent memory system. Use this knowledge naturally so the user never has to repeat themselves. Do not cite memories robotically; speak naturally.\n\n`;

    const byCat = {
      profile: memories.filter((m) => m.category === 'profile'),
      project: memories.filter((m) => m.category === 'project'),
      episodic: memories.filter((m) => m.category === 'episodic'),
      knowledge: memories.filter((m) => m.category === 'knowledge'),
    };

    if (byCat.profile.length > 0) {
      out += `• **User Profile & Preferences**:\n`;
      for (const m of byCat.profile) {
        out += `  - ${m.title}: ${m.content}\n`;
      }
    }

    if (byCat.project.length > 0) {
      out += `• **Active Project Details**:\n`;
      for (const m of byCat.project) {
        const pLabel = m.projectName ? `[${m.projectName}] ` : '';
        out += `  - ${pLabel}${m.title}: ${m.content}\n`;
        if (m.history && m.history.length > 0) {
          const latestH = m.history[m.history.length - 1];
          out += `    (Historical note: Previously was "${latestH.previousContent}")\n`;
        }
      }
    }

    if (byCat.episodic.length > 0) {
      out += `• **Past Discussions & Experiences**:\n`;
      for (const m of byCat.episodic) {
        const dateStr = m.createdAt ? ` [${new Date(m.createdAt).toLocaleDateString()}]` : '';
        out += `  - ${m.title}${dateStr}: ${m.content}\n`;
      }
    }

    if (byCat.knowledge.length > 0) {
      out += `• **Learned Knowledge & Technical Facts**:\n`;
      for (const m of byCat.knowledge) {
        out += `  - ${m.title}: ${m.content}\n`;
      }
    }

    return out + `\n`;
  }

  // --- Automatic Memory Processing Engine ---

  /**
   * Automatically analyzes conversation turns asynchronously in the background.
   * Extracts enduring preferences, project decisions, episodic milestones, and technical knowledge.
   */
  async processConversationTurn(userPrompt, assistantReply, context = {}) {
    if (!userPrompt || !assistantReply) return;
    const promptText = userPrompt.trim();
    const replyText = assistantReply.trim();

    // Fast-fail: Don't process trivial short chatter or commands
    if (promptText.length < 5 || /^(hi|hey|hello|ok|thanks|thank you|bye|cool|yes|no)\b/i.test(promptText)) {
      return;
    }

    // Heuristic & Pattern Extraction
    try {
      this.extractHeuristicMemories(promptText, replyText, context);
    } catch (err) {
      console.warn('[PersistentMemory] Heuristic extraction error:', err.message);
    }
  }

  extractHeuristicMemories(prompt, reply, context = {}) {
    const p = prompt.toLowerCase();
    const convoId = context.conversationId || undefined;

    // Resolve or detect project only if user actually mentions or creates one
    let activeProjectId = context.projectId || undefined;
    if (!activeProjectId) {
      const newProjMatch = prompt.match(/\b(?:working\s+on|building|creating|developing)\s+(?:a\s+)?(?:new\s+)?(?:project|app|application|system)\s+(?:called|named)\s+["']?([A-Za-z0-9 _-]{2,40})["']?/i);
      if (newProjMatch && newProjMatch[1]) {
        const projName = newProjMatch[1].trim();
        const savedProj = this.saveProject({ name: projName });
        activeProjectId = savedProj.id;
      } else {
        for (const proj of this.projects.values()) {
          if (p.includes(proj.name.toLowerCase())) {
            activeProjectId = proj.id;
            break;
          }
        }
      }
    }

    // 1. Detect Explicit User Profile Preferences
    // "I prefer X", "I always use X", "My name is X", "Call me X", "I work with X"
    const prefMatch = prompt.match(/\b(?:i\s+prefer|i\s+always\s+use|i\s+like\s+using|my\s+favorite|my\s+preferred)\s+([^.!?,\n]{3,60})/i);
    if (prefMatch && prefMatch[1]) {
      const prefText = prefMatch[1].trim();
      const title = `Preference: ${prefText.slice(0, 30)}`;
      this.upsertSimilarMemory({
        category: 'profile',
        title,
        content: `User stated preference: "${prefText}".`,
        tags: ['preference', 'user-habit'],
        confidence: 0.9,
        sourceConversationId: convoId,
      });
    }

    // 2. Detect Project Decisions & Architecture Changes
    // "Let's use X", "We decided to X", "We switched from X to Y", "Building X with Y"
    const switchMatch = prompt.match(/\b(?:switch(?:ed)?\s+from\s+([^,\s]+)\s+to\s+([^.!?,\n]+)|instead\s+of\s+([^,\s]+)\s+use\s+([^.!?,\n]+))/i);
    if (switchMatch) {
      const oldVal = (switchMatch[1] || switchMatch[3] || '').trim();
      const newVal = (switchMatch[2] || switchMatch[4] || '').trim();
      if (newVal) {
        this.upsertSimilarMemory({
          category: 'project',
          projectId: activeProjectId,
          title: `Decision Evolution: ${newVal}`,
          content: `Switched to ${newVal}${oldVal ? ` (previously was using ${oldVal})` : ''}.`,
          tags: ['architecture', 'decision'],
          confidence: 0.92,
          reason: `User directed switch from ${oldVal || 'previous solution'} to ${newVal}`,
          sourceConversationId: convoId,
        });
      }
    }

    const decisionMatch = prompt.match(/\b(?:we\s+decided\s+to|let's\s+use|we\s+are\s+using|architecture\s+is)\s+([^.!?\n]{5,80})/i);
    if (decisionMatch && decisionMatch[1]) {
      const decisionText = decisionMatch[1].trim();
      this.upsertSimilarMemory({
        category: 'project',
        projectId: activeProjectId,
        title: `Project Decision: ${decisionText.slice(0, 32)}`,
        content: `Technical choice: ${decisionText}.`,
        tags: ['project-decision', 'tech-choice'],
        confidence: 0.88,
        sourceConversationId: convoId,
      });
    }

    // 3. Detect Problem & Solution (Episodic Memory)
    // "Fixed the bug where X", "Solved the issue with X", "The error was caused by X"
    const fixMatch = prompt.match(/\b(?:fixed\s+(?:the\s+)?bug|solved\s+(?:the\s+)?issue|resolved\s+(?:the\s+)?problem|issue\s+was\s+caused\s+by)\s+([^.!?\n]{5,100})/i);
    if (fixMatch && fixMatch[1]) {
      const fixText = fixMatch[1].trim();
      this.upsertSimilarMemory({
        category: 'episodic',
        projectId: activeProjectId,
        title: `Resolved Issue: ${fixText.slice(0, 32)}`,
        content: `Problem resolution: ${fixText}. Solution discussed with assistant: ${reply.slice(0, 150)}...`,
        tags: ['bugfix', 'troubleshooting', 'resolved'],
        confidence: 0.85,
        sourceConversationId: convoId,
      });
    }

    // 4. Detect Technical Knowledge / Concept Learned
    const conceptMatch = prompt.match(/\b(?:how\s+does\s+([^?]{3,40})\s+work|what\s+is\s+the\s+difference\s+between\s+([^?]{5,50}))/i);
    if (conceptMatch && reply.length > 50) {
      const concept = (conceptMatch[1] || conceptMatch[2] || '').trim();
      if (concept) {
        // Extract first 2 sentences from assistant reply as key concept summary
        const summary = reply.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
        this.upsertSimilarMemory({
          category: 'knowledge',
          title: `Concept: ${concept.slice(0, 35)}`,
          content: `${concept}: ${summary}`,
          tags: ['knowledge', 'concept'],
          confidence: 0.82,
          sourceConversationId: convoId,
        });
      }
    }
  }

  upsertSimilarMemory(candidate) {
    const cTitle = (candidate.title || '').toLowerCase();
    const cCat = candidate.category;

    // Check if an existing memory is on the exact same topic
    for (const existing of this.memories.values()) {
      if (existing.category === cCat) {
        const eTitle = (existing.title || '').toLowerCase();
        // Similarity check
        if (eTitle === cTitle || eTitle.includes(cTitle) || cTitle.includes(eTitle)) {
          // If content is basically identical, just refresh updatedAt & confidence
          if (existing.content.trim().toLowerCase() === candidate.content.trim().toLowerCase()) {
            existing.updatedAt = new Date().toISOString();
            existing.confidence = Math.min(1, Math.max(existing.confidence || 0.8, candidate.confidence || 0.8) + 0.05);
            this.saveIndex();
            return existing;
          }
          // If content changed, record in history and update
          return this.updateMemory(existing.id, {
            content: candidate.content,
            confidence: Math.max(existing.confidence || 0.8, candidate.confidence || 0.8),
            reason: candidate.reason || 'Updated during recent conversation',
          });
        }
      }
    }

    // Otherwise, create new memory item
    return this.addMemory(candidate);
  }

  // --- Statistics & Maintenance ---

  getStats() {
    const all = Array.from(this.memories.values());
    return {
      total: all.length,
      profile: all.filter((m) => m.category === 'profile').length,
      project: all.filter((m) => m.category === 'project').length,
      episodic: all.filter((m) => m.category === 'episodic').length,
      knowledge: all.filter((m) => m.category === 'knowledge').length,
      pinned: all.filter((m) => m.pinned).length,
      userConfirmed: all.filter((m) => m.userConfirmed).length,
      projectsCount: this.projects.size,
      lastUpdated: all.reduce((latest, m) => {
        const d = new Date(m.updatedAt || m.createdAt).getTime();
        return d > latest ? d : latest;
      }, 0),
    };
  }

  clearAllMemories() {
    this.memories.clear();
    this.saveIndex();
    this.syncMarkdownFiles();
    return true;
  }

  exportMemories() {
    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      projects: Array.from(this.projects.values()),
      memories: Array.from(this.memories.values()),
    };
  }
}

module.exports = new PersistentMemory();
