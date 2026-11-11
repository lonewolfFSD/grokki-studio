const fs = require('fs');
const path = require('path');
const { getDataDir } = require('./data_dir');

/**
 * Grokki Plugins Engine
 * Manages native built-in workspace capability plugins and Model Context Protocol (MCP) servers.
 */

const DEFAULT_OFFICIAL_PLUGINS = [
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    badge: 'Core',
    description: 'Access Gmail, Google Drive, Google Calendar, Docs, and Sheets directly.',
    category: 'official',
    icon: 'google',
    requiresAccount: true,
    accountName: 'Google account',
    isEnabled: false,
    config: {
      syncCalendar: true,
      allowDraftEmails: true,
      maxDriveSearchResults: 10,
    },
  },
  {
    id: 'desktop-automation',
    name: 'Desktop Automation (agent-desktop)',
    badge: 'Core',
    description: 'Zero-token native Windows UI automation, background element clicks, typing, and window lifecycle control.',
    category: 'official',
    icon: 'desktop',
    requiresAccount: false,
    isEnabled: true,
    config: {
      autoFocusWindow: false,
      timeoutMs: 15000,
      fallbackToVision: true,
    },
  },
  {
    id: 'notion',
    name: 'Notion Workspace',
    description: 'Query, create, and manage Notion pages, project task databases, and documentation.',
    category: 'official',
    icon: 'notion',
    requiresAccount: true,
    accountName: 'Notion workspace',
    isEnabled: false,
    config: {
      autoSyncPages: true,
      maxDatabaseQueryLimit: 20,
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian Vault',
    description: 'Read, write, and index local Markdown notes with bi-directional wikilinks in your personal vault.',
    category: 'official',
    icon: 'obsidian',
    requiresAccount: true,
    accountName: 'Obsidian vault',
    isEnabled: false,
    config: {
      defaultVaultPath: '',
      enableBacklinks: true,
    },
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Gateway',
    description: 'Automated WhatsApp messaging, direct message dispatch, and contact interactions.',
    category: 'official',
    icon: 'whatsapp',
    requiresAccount: true,
    accountName: 'WhatsApp account',
    isEnabled: false,
    config: {
      headless: true,
      autoReplyEnabled: false,
    },
  },
  {
    id: 'git-tools',
    name: 'Developer Tools & Git',
    description: 'Execute Git status, commits, branch management, and automated code review.',
    category: 'official',
    icon: 'git',
    requiresAccount: true,
    accountName: 'GitHub account',
    isEnabled: false,
    config: {
      autoFetchRemotes: false,
      maxDiffLines: 1500,
    },
  },
  {
    id: 'persistent-memory',
    name: 'Persistent Memory',
    badge: 'Core',
    description: 'Episodic vector memory and entity recall across chat sessions powered by LanceDB.',
    category: 'official',
    icon: 'memory',
    requiresAccount: false,
    isEnabled: true,
    config: {
      maxRecallItems: 5,
      autoLearnFacts: true,
    },
  },
];

// Verified Real MCP Servers with Real Avatars
const VERIFIED_REAL_MCP_SERVERS = [
  {
    id: 'github-mcp',
    name: 'GitHub Integration',
    fullName: 'modelcontextprotocol/server-github',
    author: 'modelcontextprotocol',
    description: 'Read and manage GitHub repositories, commits, pull requests, issues, and releases.',
    stars: 92000,
    imageUrl: 'https://avatars.githubusercontent.com/u/182288589?v=4',
    repoUrl: 'https://github.com/modelcontextprotocol/servers',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    transport: 'stdio',
  },
  {
    id: 'playwright-mcp',
    name: 'Playwright Browser',
    fullName: 'microsoft/playwright-mcp',
    author: 'microsoft',
    description: 'Browser automation: interact with web pages through structured accessibility snapshots and actions.',
    stars: 45000,
    imageUrl: 'https://avatars.githubusercontent.com/u/6154722?v=4',
    repoUrl: 'https://github.com/microsoft/playwright-mcp',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-playwright'],
    transport: 'stdio',
  },
  {
    id: 'chrome-devtools-mcp',
    name: 'Chrome DevTools MCP',
    fullName: 'ChromeDevTools/chrome-devtools-mcp',
    author: 'ChromeDevTools',
    description: 'Chrome DevTools protocol integration for coding agents: live console, network, and DOM inspection.',
    stars: 55000,
    imageUrl: 'https://avatars.githubusercontent.com/u/11260967?v=4',
    repoUrl: 'https://github.com/ChromeDevTools/chrome-devtools-mcp',
    command: 'npx',
    args: ['-y', 'chrome-devtools-mcp'],
    transport: 'stdio',
  },
  {
    id: 'postgres-mcp',
    name: 'PostgreSQL Database',
    fullName: 'modelcontextprotocol/server-postgres',
    author: 'modelcontextprotocol',
    description: 'Inspect database schemas, execute read-only queries, and analyze relational data.',
    stars: 92000,
    imageUrl: 'https://avatars.githubusercontent.com/u/182288589?v=4',
    repoUrl: 'https://github.com/modelcontextprotocol/servers',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    transport: 'stdio',
  },
  {
    id: 'sqlite-mcp',
    name: 'SQLite Explorer',
    fullName: 'mcp-server-sqlite',
    author: 'modelcontextprotocol',
    description: 'Zero-config local SQLite inspection and SQL query execution for datasets and apps.',
    stars: 24000,
    imageUrl: 'https://avatars.githubusercontent.com/u/182288589?v=4',
    repoUrl: 'https://github.com/modelcontextprotocol/python-sdk',
    command: 'uvx',
    args: ['mcp-server-sqlite', '--db-path', 'database.sqlite'],
    transport: 'stdio',
  },
  {
    id: 'filesystem-mcp',
    name: 'Sandboxed Filesystem',
    fullName: 'modelcontextprotocol/server-filesystem',
    author: 'modelcontextprotocol',
    description: 'Secure, sandboxed read and write access to designated workspace directories.',
    stars: 92000,
    imageUrl: 'https://avatars.githubusercontent.com/u/182288589?v=4',
    repoUrl: 'https://github.com/modelcontextprotocol/servers',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    transport: 'stdio',
  },
  {
    id: 'brave-search-mcp',
    name: 'Brave Search API',
    fullName: 'modelcontextprotocol/server-brave-search',
    author: 'modelcontextprotocol',
    description: 'Web search and local search indexing directly within agent loops.',
    stars: 92000,
    imageUrl: 'https://avatars.githubusercontent.com/u/182288589?v=4',
    repoUrl: 'https://github.com/modelcontextprotocol/servers',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    transport: 'stdio',
  },
  {
    id: 'memory-graph-mcp',
    name: 'Knowledge Graph Memory',
    fullName: 'modelcontextprotocol/server-memory',
    author: 'modelcontextprotocol',
    description: 'Persistent knowledge graph memory allowing agents to remember entities and relations across sessions.',
    stars: 92000,
    imageUrl: 'https://avatars.githubusercontent.com/u/182288589?v=4',
    repoUrl: 'https://github.com/modelcontextprotocol/servers',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    transport: 'stdio',
  },
  {
    id: 'codebase-memory-mcp',
    name: 'Codebase Memory',
    fullName: 'DeusData/codebase-memory-mcp',
    author: 'DeusData',
    description: 'Local code intelligence for developers and AI agents. Connect code, docs and infrastructure in a persistent graph.',
    stars: 48000,
    imageUrl: 'https://avatars.githubusercontent.com/u/81762164?v=4',
    repoUrl: 'https://github.com/DeusData/codebase-memory-mcp',
    command: 'npx',
    args: ['-y', 'codebase-memory-mcp'],
    transport: 'stdio',
  },
  {
    id: 'context7-mcp',
    name: 'Context7 Platform',
    fullName: 'upstash/context7',
    author: 'upstash',
    description: 'Up-to-date documentation and code index fetching for AI agents.',
    stars: 64000,
    imageUrl: 'https://avatars.githubusercontent.com/u/74989412?v=4',
    repoUrl: 'https://github.com/upstash/context7',
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp'],
    transport: 'stdio',
  },
  {
    id: 'n8n-mcp',
    name: 'n8n Workflow Automation',
    fullName: 'n8n-io/n8n',
    author: 'n8n-io',
    description: 'Workflow automation platform with native AI capabilities: 400+ third-party service integrations.',
    stars: 210000,
    imageUrl: 'https://avatars.githubusercontent.com/u/45487711?v=4',
    repoUrl: 'https://github.com/n8n-io/n8n',
    command: 'npx',
    args: ['-y', 'n8n-mcp'],
    transport: 'stdio',
  },
  {
    id: 'scrapling-mcp',
    name: 'Scrapling Web Scraper',
    fullName: 'D4Vinci/Scrapling',
    author: 'D4Vinci',
    description: 'Fast, high-performance web scraping and crawler framework for AI agent research.',
    stars: 101000,
    imageUrl: 'https://avatars.githubusercontent.com/u/20604835?v=4',
    repoUrl: 'https://github.com/D4Vinci/Scrapling',
    command: 'uvx',
    args: ['scrapling-mcp'],
    transport: 'stdio',
  },
];

class PluginsManager {
  constructor() {
    this.pluginsFilePath = path.join(getDataDir(), 'plugins.json');
    this.state = {
      officialOverrides: {},
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

  checkAccountLinked(pluginId) {
    try {
      if (pluginId === 'google-workspace') {
        const googleWorkspace = require('./google_workspace');
        return Boolean(googleWorkspace.isConnected && googleWorkspace.isConnected());
      }
      if (pluginId === 'whatsapp') {
        const openwaWorkspace = require('./openwa_workspace');
        return Boolean(openwaWorkspace.isLocalReady && (openwaWorkspace.isLocalReady() || openwaWorkspace.hasLocalAuth()));
      }
      if (pluginId === 'notion') {
        const notionWorkspace = require('./notion_workspace');
        return Boolean(notionWorkspace.isConnected && notionWorkspace.isConnected());
      }
      if (pluginId === 'obsidian') {
        const obsidianWorkspace = require('./obsidian_workspace');
        const st = obsidianWorkspace.getStatus ? obsidianWorkspace.getStatus() : null;
        return Boolean(st && st.connected);
      }
      if (pluginId === 'git-tools') {
        const githubWorkspace = require('./github_workspace');
        const isGh = Boolean(githubWorkspace.isConnected && githubWorkspace.isConnected());
        return isGh;
      }
    } catch (e) {
      return false;
    }
    return true;
  }

  getPlugins() {
    const official = DEFAULT_OFFICIAL_PLUGINS.map((def) => {
      const override = this.state.officialOverrides[def.id] || {};
      const accountLinked = def.requiresAccount ? this.checkAccountLinked(def.id) : true;
      // If plugin requires an account and it is NOT linked, it cannot be enabled
      const rawEnabled = override.isEnabled !== undefined ? override.isEnabled : def.isEnabled;
      const isEnabled = def.requiresAccount && !accountLinked ? false : rawEnabled;

      return {
        ...def,
        accountLinked,
        isEnabled,
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
      if (isEnabled && officialDef.requiresAccount) {
        const isLinked = this.checkAccountLinked(pluginId);
        if (!isLinked) {
          return {
            success: false,
            error: `Cannot enable ${officialDef.name}. Please connect your ${officialDef.accountName || 'account'} in Workspace settings first.`,
          };
        }
      }

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
      imageUrl: pluginData.imageUrl || null,
      repoUrl: pluginData.repoUrl || null,
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

  async fetchMcpRegistry(query = '') {
    try {
      const q = query && query.trim() ? `${query.trim()} topic:mcp-server` : 'topic:mcp-server';
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Grokki-Studio' },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          const liveServers = data.items.map((repo) => ({
            id: repo.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
            name: repo.name,
            fullName: repo.full_name,
            author: repo.owner.login,
            description: repo.description || 'Model Context Protocol community server',
            stars: repo.stargazers_count,
            imageUrl: repo.owner.avatar_url,
            repoUrl: repo.html_url,
            command: repo.language === 'Python' ? 'uvx' : 'npx',
            args: ['-y', repo.name],
            transport: 'stdio',
          }));

          return {
            success: true,
            source: 'live',
            servers: liveServers,
          };
        }
      }
    } catch (err) {
      console.warn('[PluginsManager] Live registry fetch error, falling back to verified servers:', err.message);
    }

    // Filter verified servers if search query provided
    let fallback = VERIFIED_REAL_MCP_SERVERS;
    if (query && query.trim()) {
      const lower = query.toLowerCase();
      fallback = VERIFIED_REAL_MCP_SERVERS.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.fullName.toLowerCase().includes(lower) ||
          s.description.toLowerCase().includes(lower)
      );
    }

    return {
      success: true,
      source: 'cached',
      servers: fallback,
    };
  }
}

const pluginsManager = new PluginsManager();

module.exports = {
  pluginsManager,
  DEFAULT_OFFICIAL_PLUGINS,
  VERIFIED_REAL_MCP_SERVERS,
};
