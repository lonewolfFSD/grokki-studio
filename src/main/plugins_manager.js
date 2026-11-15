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

// Verified Consumer-Grade Plugins & MCP Tools
const VERIFIED_REAL_MCP_SERVERS = [
  {
    id: 'supabase',
    name: 'Supabase',
    fullName: 'supabase/mcp-server-supabase',
    author: 'supabase',
    description: 'Manage and query PostgreSQL databases with instant schema inspection.',
    stars: 88000,
    imageUrl: 'https://avatars.githubusercontent.com/u/54469796?v=4',
    repoUrl: 'https://github.com/supabase/mcp-server-supabase',
    command: 'npx',
    args: ['-y', '@supabase/mcp-server-supabase'],
    transport: 'stdio',
    category: 'Popular',
  },
  {
    id: 'github-mcp',
    name: 'GitHub',
    fullName: 'modelcontextprotocol/server-github',
    author: 'github',
    description: 'Triage PRs, issues, commits, branches, and CI/CD publish flows.',
    stars: 92000,
    imageUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
    repoUrl: 'https://github.com/modelcontextprotocol/servers',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    transport: 'stdio',
    category: 'Popular',
  },
  {
    id: 'playwright-mcp',
    name: 'Playwright',
    fullName: 'microsoft/playwright-mcp',
    author: 'microsoft',
    description: 'Automate web browsing, interact with visual web apps, and extract pages.',
    stars: 45000,
    imageUrl: 'https://avatars.githubusercontent.com/u/6154722?v=4',
    repoUrl: 'https://github.com/microsoft/playwright-mcp',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-playwright'],
    transport: 'stdio',
    category: 'Popular',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    fullName: 'elevenlabs/elevenlabs-mcp',
    author: 'elevenlabs',
    description: 'Voice agents, high-fidelity speech synthesis, and audio media.',
    stars: 38000,
    imageUrl: 'https://avatars.githubusercontent.com/u/101893325?v=4',
    repoUrl: 'https://github.com/elevenlabs/elevenlabs-mcp',
    command: 'npx',
    args: ['-y', 'elevenlabs-mcp'],
    transport: 'stdio',
    category: 'New & Noteworthy',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    fullName: 'spotify/spotify-mcp',
    author: 'spotify',
    description: 'Control playback, browse playlists, and search tracks in real time.',
    stars: 29000,
    imageUrl: 'https://avatars.githubusercontent.com/u/251374?v=4',
    repoUrl: 'https://github.com/spotify',
    command: 'npx',
    args: ['-y', 'spotify-mcp'],
    transport: 'stdio',
    category: 'New & Noteworthy',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    fullName: 'dropbox/dropbox-mcp',
    author: 'dropbox',
    description: 'Find, create, and manage cloud files across personal and team drives.',
    stars: 31000,
    imageUrl: 'https://avatars.githubusercontent.com/u/557635?v=4',
    repoUrl: 'https://github.com/dropbox',
    command: 'npx',
    args: ['-y', 'dropbox-mcp'],
    transport: 'stdio',
    category: 'New & Noteworthy',
  },
  {
    id: 'linear',
    name: 'Linear',
    fullName: 'linear/linear-mcp',
    author: 'linear',
    description: 'Sync engineering issues, sprint cycles, roadmaps, and bug reports.',
    stars: 26000,
    imageUrl: 'https://avatars.githubusercontent.com/u/45136892?v=4',
    repoUrl: 'https://github.com/linear',
    command: 'npx',
    args: ['-y', 'linear-mcp'],
    transport: 'stdio',
    category: 'New & Noteworthy',
  },
  {
    id: 'figma',
    name: 'Figma',
    fullName: 'figma/figma-mcp',
    author: 'figma',
    description: 'Inspect UI component design tokens, layouts, and export SVG specs.',
    stars: 34000,
    imageUrl: 'https://avatars.githubusercontent.com/u/5155094?v=4',
    repoUrl: 'https://github.com/figma',
    command: 'npx',
    args: ['-y', 'figma-mcp'],
    transport: 'stdio',
    category: 'New & Noteworthy',
  },
  {
    id: 'slack',
    name: 'Slack',
    fullName: 'modelcontextprotocol/server-slack',
    author: 'slack',
    description: 'Send messages, read channels, and manage team communication threads.',
    stars: 41000,
    imageUrl: 'https://avatars.githubusercontent.com/u/6962124?v=4',
    repoUrl: 'https://github.com/modelcontextprotocol/servers',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    transport: 'stdio',
    category: 'New & Noteworthy',
  },
  {
    id: 'sqlite-mcp',
    name: 'SQLite Explorer',
    fullName: 'mcp-server-sqlite',
    author: 'modelcontextprotocol',
    description: 'Zero-config local SQLite inspection and SQL query execution for datasets.',
    stars: 24000,
    imageUrl: 'https://avatars.githubusercontent.com/u/182288589?v=4',
    repoUrl: 'https://github.com/modelcontextprotocol/python-sdk',
    command: 'uvx',
    args: ['mcp-server-sqlite', '--db-path', 'database.sqlite'],
    transport: 'stdio',
    category: 'Developer & Data',
  },
  {
    id: 'brave-search-mcp',
    name: 'Brave Search',
    fullName: 'modelcontextprotocol/server-brave-search',
    author: 'brave',
    description: 'Real-time web search and local index querying directly within agent loops.',
    stars: 92000,
    imageUrl: 'https://avatars.githubusercontent.com/u/14815418?v=4',
    repoUrl: 'https://github.com/modelcontextprotocol/servers',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    transport: 'stdio',
    category: 'Developer & Data',
  },
  {
    id: 'postgres-mcp',
    name: 'PostgreSQL Database',
    fullName: 'modelcontextprotocol/server-postgres',
    author: 'postgresql',
    description: 'Inspect database schemas, execute queries, and analyze relational data.',
    stars: 92000,
    imageUrl: 'https://avatars.githubusercontent.com/u/177543?v=4',
    repoUrl: 'https://github.com/modelcontextprotocol/servers',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    transport: 'stdio',
    category: 'Developer & Data',
  },
  {
    id: 'scrapling-mcp',
    name: 'Scrapling',
    fullName: 'D4Vinci/Scrapling',
    author: 'D4Vinci',
    description: 'High-performance web scraping and crawler framework for agent research.',
    stars: 101000,
    imageUrl: 'https://avatars.githubusercontent.com/u/20604835?v=4',
    repoUrl: 'https://github.com/D4Vinci/Scrapling',
    command: 'uvx',
    args: ['scrapling-mcp'],
    transport: 'stdio',
    category: 'Developer & Data',
  },
  {
    id: 'n8n-mcp',
    name: 'n8n Automations',
    fullName: 'n8n-io/n8n',
    author: 'n8n',
    description: 'Workflow automation platform with 400+ third-party service integrations.',
    stars: 210000,
    imageUrl: 'https://avatars.githubusercontent.com/u/45487711?v=4',
    repoUrl: 'https://github.com/n8n-io/n8n',
    command: 'npx',
    args: ['-y', 'n8n-mcp'],
    transport: 'stdio',
    category: 'Developer & Data',
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

      // Sync active state to McpManager
      try {
        const mcpManager = require('./mcp_manager');
        const mcpConfig = mcpManager.getConfig();
        if (mcpConfig.mcpServers && mcpConfig.mcpServers[pluginId]) {
          mcpConfig.mcpServers[pluginId].enabled = Boolean(isEnabled);
          mcpManager.saveConfig(mcpConfig);
          if (isEnabled) {
            mcpManager.connectServer(pluginId, mcpConfig.mcpServers[pluginId]).catch(() => {});
          } else {
            mcpManager.disconnectServer(pluginId).catch(() => {});
          }
        }
      } catch (_) {}

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

    // Live Sync with McpManager so tools are immediately usable by agent
    if (newPlugin.mcpServer && newPlugin.mcpServer.command) {
      try {
        const mcpManager = require('./mcp_manager');
        const mcpConfig = mcpManager.getConfig();
        mcpConfig.mcpServers = mcpConfig.mcpServers || {};
        mcpConfig.mcpServers[id] = {
          command: newPlugin.mcpServer.command,
          args: newPlugin.mcpServer.args || [],
          env: newPlugin.mcpServer.env || {},
          enabled: newPlugin.isEnabled,
          description: newPlugin.description,
        };
        mcpManager.saveConfig(mcpConfig);
        if (newPlugin.isEnabled) {
          mcpManager.connectServer(id, mcpConfig.mcpServers[id]).catch((err) => {
            console.warn(`[PluginsManager] Background connection to ${id} failed:`, err.message);
          });
        }
      } catch (e) {
        console.warn('[PluginsManager] Failed to sync with mcpManager:', e.message);
      }
    }

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

      // Disconnect from McpManager
      try {
        const mcpManager = require('./mcp_manager');
        const mcpConfig = mcpManager.getConfig();
        if (mcpConfig.mcpServers && mcpConfig.mcpServers[pluginId]) {
          delete mcpConfig.mcpServers[pluginId];
          mcpManager.saveConfig(mcpConfig);
          mcpManager.disconnectServer(pluginId).catch(() => {});
        }
      } catch (_) {}

      return { success: true, pluginId };
    }

    return { success: false, error: `Custom plugin "${pluginId}" not found.` };
  }

  cleanPluginName(rawName) {
    return rawName
      .replace(/^(@[a-z0-9_-]+\/)?(mcp-server-|server-|mcp-)/i, '')
      .replace(/(-mcp|-server)$/i, '')
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  cleanPluginDescription(rawDesc) {
    if (!rawDesc) return 'Community Model Context Protocol plugin';
    return (
      rawDesc
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 130) || 'Community Model Context Protocol plugin'
    );
  }

  async fetchMcpRegistry(query = '') {
    let liveServers = [];
    if (query && query.trim()) {
      try {
        const q = `${query.trim()} topic:mcp-server`;
        const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=20`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Grokki-Studio' },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.items) && data.items.length > 0) {
            liveServers = data.items.map((repo) => {
              const cleanName = this.cleanPluginName(repo.name);
              const cleanDesc = this.cleanPluginDescription(repo.description);
              const isPython = repo.language === 'Python';
              return {
                id: repo.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
                name: cleanName,
                fullName: repo.full_name,
                author: repo.owner.login,
                description: cleanDesc,
                stars: repo.stargazers_count,
                imageUrl: repo.owner.avatar_url,
                repoUrl: repo.html_url,
                command: isPython ? 'uvx' : 'npx',
                args: isPython ? [repo.name] : ['-y', repo.name],
                transport: 'stdio',
                category: 'Community',
              };
            });
          }
        }
      } catch (err) {
        console.warn('[PluginsManager] Live search error:', err.message);
      }
    }

    // Merge verified catalog matches
    let verifiedMatches = VERIFIED_REAL_MCP_SERVERS;
    if (query && query.trim()) {
      const lower = query.toLowerCase();
      verifiedMatches = VERIFIED_REAL_MCP_SERVERS.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.fullName.toLowerCase().includes(lower) ||
          s.description.toLowerCase().includes(lower) ||
          s.id.toLowerCase().includes(lower)
      );
    }

    // Combine verified first, then unique live servers
    const seenIds = new Set(verifiedMatches.map((s) => s.id));
    const combined = [...verifiedMatches];
    for (const s of liveServers) {
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        combined.push(s);
      }
    }

    return {
      success: true,
      source: query ? 'live' : 'catalog',
      servers: combined,
    };
  }
}

const pluginsManager = new PluginsManager();

module.exports = {
  pluginsManager,
  DEFAULT_OFFICIAL_PLUGINS,
  VERIFIED_REAL_MCP_SERVERS,
};
