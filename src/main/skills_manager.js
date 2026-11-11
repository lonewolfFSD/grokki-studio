const fs = require('fs');
const path = require('path');
const { getDataDir } = require('./data_dir');

/**
 * Grokki Skills Engine
 * Conforms to the Open Agent Skills (SKILL.md) standard pioneered by Claude Code & Antigravity.
 * Skills are modular, versioned markdown playbooks with YAML frontmatter.
 */

const BUILT_IN_SKILLS = [];

function parseSkillMarkdown(rawContent, fallbackId = '') {
  const trimmed = (rawContent || '').trim();
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = trimmed.match(frontmatterRegex);
  const meta = {};
  let instructions = trimmed;

  if (match) {
    const yamlBlock = match[1];
    instructions = match[2].trim();
    const lines = yamlBlock.split(/\r?\n/);
    let currentKey = null;
    let isBlockScalar = false;

    for (const rawLine of lines) {
      const isIndented = /^\s+/.test(rawLine);
      const colonIdx = rawLine.indexOf(':');

      if (!isIndented && colonIdx > 0) {
        const key = rawLine.slice(0, colonIdx).trim().toLowerCase();
        let val = rawLine.slice(colonIdx + 1).trim();

        if (val === '>' || val === '|' || val === '>-' || val === '|-') {
          currentKey = key;
          isBlockScalar = true;
          meta[key] = '';
        } else {
          currentKey = key;
          isBlockScalar = false;
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          meta[key] = val;
        }
      } else if (isIndented && currentKey) {
        const lineContent = rawLine.trim();
        if (lineContent) {
          meta[currentKey] = meta[currentKey] ? `${meta[currentKey]} ${lineContent}` : lineContent;
        }
      }
    }
  }

  const name = meta.name || meta.title || fallbackId || 'custom-skill';
  const id = (meta.id || meta.name || fallbackId).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'skill';
  const title = meta.title || meta.name || id;
  let description = meta.description || meta.desc || '';
  if (description === '>' || description === '|' || description === '>-' || description === '|-') {
    description = '';
  } else if (/^[>|]-?\s*/.test(description)) {
    description = description.replace(/^[>|]-?\s*/, '').trim();
  }
  const category = meta.category || 'custom';
  const author = meta.author || 'User';
  const version = meta.version || '1.0.0';

  return {
    id,
    name,
    title,
    description,
    category,
    author,
    version,
    instructions: instructions || `# ${name}\n\nNo instructions provided.`,
    isBuiltIn: false,
    rawMarkdown: trimmed,
  };
}

function formatSkillMarkdown(skill) {
  const name = skill.name || skill.id;
  const description = (skill.description || '').replace(/\r?\n/g, ' ');
  return `---
name: ${name}
description: ${description}
---

${skill.instructions || ''}`.trim() + '\n';
}

class SkillsManager {
  constructor() {
    this.skillsDir = path.join(getDataDir(), 'skills');
    this.customSkills = new Map(); // id -> skill
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(this.skillsDir)) {
        fs.mkdirSync(this.skillsDir, { recursive: true });
      }
      this.loadCustomSkills();
    } catch (err) {
      console.warn('[SkillsManager] Init error:', err.message);
    }
  }

  loadCustomSkills() {
    try {
      this.customSkills.clear();
      if (!fs.existsSync(this.skillsDir)) return;

      const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
          try {
            const raw = fs.readFileSync(path.join(this.skillsDir, entry.name), 'utf8');
            const fallbackId = entry.name.replace(/\.(md|markdown)$/i, '');
            const parsed = parseSkillMarkdown(raw, fallbackId);
            if (parsed && parsed.id) {
              this.customSkills.set(parsed.id, parsed);
            }
          } catch (_) {}
        } else if (entry.isDirectory()) {
          // Check for folder/SKILL.md standard layout
          const skillMdPath = path.join(this.skillsDir, entry.name, 'SKILL.md');
          if (fs.existsSync(skillMdPath)) {
            try {
              const raw = fs.readFileSync(skillMdPath, 'utf8');
              const parsed = parseSkillMarkdown(raw, entry.name);
              if (parsed && parsed.id) {
                this.customSkills.set(parsed.id, parsed);
              }
            } catch (_) {}
          }
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          // Backward compatibility for existing json skills
          try {
            const raw = fs.readFileSync(path.join(this.skillsDir, entry.name), 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && parsed.id) {
              this.customSkills.set(parsed.id, {
                ...parsed,
                isBuiltIn: false,
              });
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('[SkillsManager] Error loading custom skills:', err.message);
    }
  }

  getSkills(config = {}) {
    const disabledList = Array.isArray(config.disabledSkills) ? config.disabledSkills : [];
    const hasEnabledList = Array.isArray(config.enabledSkills);
    const enabledSet = hasEnabledList ? new Set(config.enabledSkills) : null;

    const all = [...BUILT_IN_SKILLS, ...Array.from(this.customSkills.values())];
    return all.map((skill) => {
      let isEnabled = true;
      if (disabledList.includes(skill.id)) {
        isEnabled = false;
      } else if (enabledSet) {
        isEnabled = enabledSet.has(skill.id);
      }
      return {
        ...skill,
        isEnabled,
        rawMarkdown: skill.rawMarkdown || formatSkillMarkdown(skill),
      };
    });
  }

  getSkill(skillId, config = {}) {
    const all = this.getSkills(config);
    return all.find((s) => s.id === skillId || s.name === skillId) || null;
  }

  toggleSkill(skillId, enabled, config = {}) {
    const skills = this.getSkills(config);
    const target = skills.find((s) => s.id === skillId);
    if (!target) return { success: false, error: 'Skill not found' };

    const newEnabled = typeof enabled === 'boolean' ? enabled : !target.isEnabled;
    const disabledList = new Set(Array.isArray(config.disabledSkills) ? config.disabledSkills : []);

    if (newEnabled) {
      disabledList.delete(skillId);
    } else {
      disabledList.add(skillId);
    }

    return {
      success: true,
      enabled: newEnabled,
      disabledSkills: Array.from(disabledList),
    };
  }

  saveSkill(skillInput) {
    try {
      let skill;
      if (typeof skillInput === 'string' || skillInput.rawMarkdown) {
        // Direct markdown input with frontmatter
        const raw = typeof skillInput === 'string' ? skillInput : skillInput.rawMarkdown;
        skill = parseSkillMarkdown(raw, skillInput.id || '');
      } else {
        // Object input
        const id = (skillInput.id || skillInput.name || 'custom-skill').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '');
        skill = {
          id,
          name: (skillInput.name || id).trim(),
          title: skillInput.title || skillInput.name || id,
          description: (skillInput.description || '').trim(),
          category: skillInput.category || 'custom',
          author: skillInput.author || 'User',
          version: skillInput.version || '1.0.0',
          instructions: (skillInput.instructions || '').trim(),
          isBuiltIn: false,
        };
      }

      if (!skill.name) {
        return { success: false, error: 'Skill name is required in frontmatter.' };
      }

      if (BUILT_IN_SKILLS.some((b) => b.id === skill.id) && !this.customSkills.has(skill.id)) {
        return { success: false, error: `Cannot overwrite built-in skill "${skill.id}". Please choose another name.` };
      }

      const formatted = formatSkillMarkdown(skill);
      const filePath = path.join(this.skillsDir, `${skill.id}.md`);
      fs.writeFileSync(filePath, formatted, 'utf8');

      this.customSkills.set(skill.id, {
        ...skill,
        rawMarkdown: formatted,
      });

      return { success: true, skill };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  importSkillContent(rawContent, originalFilename = '') {
    try {
      const fallbackId = (originalFilename || '').replace(/\.(md|markdown)$/i, '');
      const parsed = parseSkillMarkdown(rawContent, fallbackId);
      if (!parsed.name && !parsed.id) {
        return { success: false, error: 'Could not parse skill name or frontmatter from markdown file.' };
      }

      return this.saveSkill({
        ...parsed,
        rawMarkdown: rawContent,
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  deleteSkill(skillId) {
    try {
      if (BUILT_IN_SKILLS.some((b) => b.id === skillId)) {
        return { success: false, error: 'Cannot delete built-in skills.' };
      }

      const mdPath = path.join(this.skillsDir, `${skillId}.md`);
      if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);

      const jsonPath = path.join(this.skillsDir, `${skillId}.json`);
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);

      const dirPath = path.join(this.skillsDir, skillId);
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }

      this.customSkills.delete(skillId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  formatSkillMarkdown(skill) {
    return formatSkillMarkdown(skill);
  }

  /**
   * Intelligently selects active skill playbooks to inject into the Agent System Prompt
   * Follows Claude Code's progressive disclosure standard:
   * 1. Descriptions are scanned against user query or explicit slash command (/skill-name).
   * 2. When triggered, the full markdown playbook is dynamically loaded.
   */
  getActiveSkillsPrompt(prompt = '', context = {}, config = {}) {
    const skills = this.getSkills(config).filter((s) => s.isEnabled);
    if (!skills.length) return '';

    const pLower = prompt.toLowerCase();
    const matched = [];

    for (const skill of skills) {
      const sId = skill.id.toLowerCase();
      const sName = (skill.name || '').toLowerCase();

      // Explicit slash command match: /code-architect, /pr-review, etc.
      const isExplicitSlash = pLower.startsWith(`/${sId}`) || pLower.startsWith(`/${sName}`) || pLower.includes(`/${sId} `) || pLower.includes(`/${sName} `);

      // Semantic description word match
      const descWords = (skill.description || '')
        .toLowerCase()
        .split(/[^a-z0-9_-]+/)
        .filter((w) => w.length >= 4 && !['when', 'with', 'that', 'this', 'have', 'from', 'code', 'file'].includes(w));

      const matchedWords = descWords.filter((w) => {
        const reg = new RegExp(`\\b${w}\\b`, 'i');
        return reg.test(pLower);
      });

      // Name or explicit phrase match
      const nameMatch = pLower.includes(sId) || (sName.length > 3 && pLower.includes(sName));

      if (isExplicitSlash || (matchedWords.length >= 2) || (nameMatch && matchedWords.length >= 1)) {
        matched.push(skill);
      }
    }

    const skillsToInject = matched.length > 0 ? matched.slice(0, 3) : [];

    if (!skillsToInject.length) {
      // Concise metadata index for progressive disclosure (~100 tokens)
      const summaryList = skills.map((s) => `- /${s.id}: ${s.description}`).join('\n');
      return `\n[AVAILABLE AGENT SKILLS (Type /<skill-name> or mention its procedure to execute)]:\n${summaryList}\n`;
    }

    const playbooks = skillsToInject
      .map((s) => `#### [ACTIVE SKILL PLAYBOOK: /${s.id} (${s.name})]\n${s.instructions}`)
      .join('\n\n');

    return `\n[ACTIVE AGENT SKILLS LOADED INTO CONTEXT FOR THIS TASK]:\n${playbooks}\n`;
  }
}

module.exports = new SkillsManager();
