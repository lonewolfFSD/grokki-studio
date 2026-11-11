const fs = require('fs');
const path = require('path');
const { getDataDir } = require('./data_dir');

/**
 * Grokki Plugins Engine
 * Conforms to the Claude Code, DeepSeek Harness & MCP Plugin standards.
 * Manages core runtime capability packs and custom MCP tool integrations.
 */

const DEFAULT_OFFICIAL_PLUGINS = [
  {
    id: 'agent-teams',
    name: 'Agent Teams',
    badge: 'Beta',
    description: 'Enable team collaboration, team tools, the member roster, and the shared task board.',
    category: 'official',
    icon: 'teams',
    isEnabled: false,
    config: {
      maxMembers: 4,
      rosterStrategy: 'auto',
      allowCrossDelegation: true,
    },
  },
  {
    id: 'voice-input',
    name: 'Voice input',
    badge: 'Beta',
    description: 'Transcribe recordings locally with SenseVoice; first use requires installing dependencies',
    category: 'official',
    icon: 'voice',
    isEnabled: false,
    config: {
      engine: 'SenseVoice',
      language: 'auto',
      autoTranscribe: true,
    },
  },
  {
    id: 'shell',
    name: 'Shell',
    description: 'Limit how long each command may run and how much it may output.',
    category: 'official',
    icon: 'shell',
    isEnabled: true,
    config: {
      timeoutMs: 30000,
      maxOutputLines: 1000,
      autoKillHungProcess: true,
    },
  },
  {
    id: 'agent-loop',
    name: 'Agent loop',
    description: 'Control how the Agent dispatches tool calls.',
    category: 'official',
    icon: 'loop',
    isEnabled: true,
    config: {
      maxSteps: 25,
      autoApproveReads: true,
      requireWriteApproval: false,
    },
  },
  {
    id: 'subagent',
    name: 'Subagent',
    description: 'Set Subagent recursion depth, count, and models.',
    category: 'official',
    icon: 'subagent',
    isEnabled: true,
    config: {
      maxDepth: 3,
      maxConcurrent: 2,
      modelStrategy: 'inherit',
    },
  },
  {
    id: 'web-search',
    name: 'Web search',
    description: 'Set up the DeepSeek search provider.',
    category: 'official',
    icon: 'search',
    isEnabled: true,
    config: {
      provider: 'deepseek',
      maxResults: 5,
      recencyFilter: 'month',
    },
  },
];

class PluginsManager {
  constructor() {
    this.pluginsFilePath = path.join(getDataDir(), 'plugins.json');
    this.state = {
      officialOverrides: {}, // id -> { isEnabled, config }
      customPlugins: [],
    };
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(this.pluginsFilePath)) {
        const raw = fs.readFileSync(this.pluginsFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.state.officialOverrides = parsed.officialOverrides || {};
          this.state.customPlugins = Array.isArray(parsed.customPlugins) ? parsed.customPlugins : [];
        }
      }
    } catch (err) {
      console.warn('[PluginsManager] Failed to load plugins state:', err.message);
    }
  }

  save() {
    try {
      const dir = path.dirname(this.pluginsFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.pluginsFilePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      console.error('[PluginsManager] Failed to save plugins state:', err.message);
    }
  }

  getPlugins() {
    const official = DEFAULT_OFFICIAL_PLUGINS.map((def) => {
      const override = this.state.officialOverrides[def.id] || {};
      return {
        ...def,
        isEnabled: override.isEnabled !== undefined ? override.isEnabled : def.isEnabled,
        config: {
          ...def.config,
          ...(override.config || {}),
        },
      };
    });

    return {
      official,
      custom: this.state.customPlugins,
    };
  }

  togglePlugin(pluginId, isEnabled) {
    const officialDef = DEFAULT_OFFICIAL_PLUGINS.find((p) => p.id === pluginId);
    if (officialDef) {
      if (!this.state.officialOverrides[pluginId]) {
        this.state.officialOverrides[pluginId] = {};
      }
      this.state.officialOverrides[pluginId].isEnabled = Boolean(isEnabled);
      this.save();
      return { success: true, pluginId, isEnabled: Boolean(isEnabled) };
    }

    const customIdx = this.state.customPlugins.findIndex((p) => p.id === pluginId);
    if (customIdx !== -1) {
      this.state.customPlugins[customIdx].isEnabled = Boolean(isEnabled);
      this.save();
      return { success: true, pluginId, isEnabled: Boolean(isEnabled) };
    }

    return { success: false, error: `Plugin "${pluginId}" not found.` };
  }

  savePluginConfig(pluginId, newConfig) {
    const officialDef = DEFAULT_OFFICIAL_PLUGINS.find((p) => p.id === pluginId);
    if (officialDef) {
      if (!this.state.officialOverrides[pluginId]) {
        this.state.officialOverrides[pluginId] = {};
      }
      this.state.officialOverrides[pluginId].config = {
        ...officialDef.config,
        ...(this.state.officialOverrides[pluginId].config || {}),
        ...newConfig,
      };
      this.save();
      return { success: true, pluginId, config: this.state.officialOverrides[pluginId].config };
    }

    const customIdx = this.state.customPlugins.findIndex((p) => p.id === pluginId);
    if (customIdx !== -1) {
      this.state.customPlugins[customIdx].config = {
        ...(this.state.customPlugins[customIdx].config || {}),
        ...newConfig,
      };
      this.save();
      return { success: true, pluginId, config: this.state.customPlugins[customIdx].config };
    }

    return { success: false, error: `Plugin "${pluginId}" not found.` };
  }

  addCustomPlugin(pluginData) {
    if (!pluginData || !pluginData.name) {
      return { success: false, error: 'Plugin name is required.' };
    }

    const id = (pluginData.id || pluginData.name)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-|-$/g, '') || `plugin-${Date.now()}`;

    // Check collision with official
    if (DEFAULT_OFFICIAL_PLUGINS.some((p) => p.id === id)) {
      return { success: false, error: `Plugin ID "${id}" is reserved by an official plugin.` };
    }

    const existingIdx = this.state.customPlugins.findIndex((p) => p.id === id);
    const newPlugin = {
      id,
      name: pluginData.name.trim(),
      description: (pluginData.description || '').trim(),
      category: pluginData.category || 'mcp',
      icon: pluginData.icon || 'custom',
      isEnabled: pluginData.isEnabled !== false,
      mcpServer: pluginData.mcpServer || null,
      config: pluginData.config || {},
      createdAt: new Date().toISOString(),
    };

    if (existingIdx !== -1) {
      this.state.customPlugins[existingIdx] = newPlugin;
    } else {
      this.state.customPlugins.push(newPlugin);
    }

    this.save();
    return { success: true, plugin: newPlugin };
  }

  deletePlugin(pluginId) {
    if (DEFAULT_OFFICIAL_PLUGINS.some((p) => p.id === pluginId)) {
      return { success: false, error: 'Cannot delete official plugins. You can disable them instead.' };
    }

    const beforeLen = this.state.customPlugins.length;
    this.state.customPlugins = this.state.customPlugins.filter((p) => p.id !== pluginId);
    if (this.state.customPlugins.length !== beforeLen) {
      this.save();
      return { success: true, pluginId };
    }

    return { success: false, error: `Custom plugin "${pluginId}" not found.` };
  }
}

const pluginsManager = new PluginsManager();

module.exports = {
  pluginsManager,
  DEFAULT_OFFICIAL_PLUGINS,
};
