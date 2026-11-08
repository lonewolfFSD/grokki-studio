/**
 * Grokki MCP Manager - Model Context Protocol Client Integration
 * Integrates open MCP servers (GitHub, Filesystem, SQLite, Brave, Fetch, Memory, etc.)
 * directly into Grokki's tool calling loop.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

class McpManager {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.configFile = path.join(this.dataDir, 'mcp_servers.json');
    this.clients = new Map(); // serverId -> { client, transport, info, tools: [] }
    this.allTools = []; // Cached array of tools from all connected servers
    this.initConfigFile();
  }

  initConfigFile() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.configFile)) {
        const defaultServers = {
          mcpServers: {
            // Built-in / Starter MCP templates (enabled: false until user provides tokens/paths)
            "fetch": {
              "command": "uvx",
              "args": ["mcp-server-fetch"],
              "enabled": false,
              "description": "Web fetcher converting HTML to clean markdown for LLMs"
            },
            "filesystem": {
              "command": "npx",
              "args": ["-y", "@modelcontextprotocol/server-filesystem", process.cwd()],
              "enabled": false,
              "description": "Secure local filesystem access for LLM workspace editing"
            },
            "sqlite": {
              "command": "uvx",
              "args": ["mcp-server-sqlite", "--db-path", path.join(this.dataDir, "grokki_local.db")],
              "enabled": false,
              "description": "Local SQLite database querying & analysis"
            },
            "github": {
              "command": "npx",
              "args": ["-y", "@modelcontextprotocol/server-github"],
              "env": {
                "GITHUB_PERSONAL_ACCESS_TOKEN": ""
              },
              "enabled": false,
              "description": "GitHub issues, PRs, commits and repo management"
            }
          }
        };
        fs.writeFileSync(this.configFile, JSON.stringify(defaultServers, null, 2), 'utf8');
      }
    } catch (err) {
      console.warn('[MCP] Failed to initialize mcp_servers.json:', err.message);
    }
  }

  getConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      }
    } catch (_) {}
    return { mcpServers: {} };
  }

  saveConfig(config) {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.warn('[MCP] Error saving config:', err.message);
      return false;
    }
  }

  async startAllEnabled() {
    const config = this.getConfig();
    const servers = config.mcpServers || {};
    const results = [];

    for (const [id, srv] of Object.entries(servers)) {
      if (srv.enabled) {
        try {
          const res = await this.connectServer(id, srv);
          results.push({ id, success: true, toolsCount: res.tools.length });
        } catch (err) {
          results.push({ id, success: false, error: err.message });
          console.warn(`[MCP] Failed to connect to server "${id}":`, err.message);
        }
      }
    }
    await this.refreshCombinedTools();
    return results;
  }

  async connectServer(serverId, srvConfig) {
    // If already connected, disconnect first
    if (this.clients.has(serverId)) {
      await this.disconnectServer(serverId);
    }

    const command = srvConfig.command;
    const args = Array.isArray(srvConfig.args) ? srvConfig.args : [];
    const env = { ...process.env, ...(srvConfig.env || {}) };

    const transport = new StdioClientTransport({
      command,
      args,
      env,
    });

    const client = new Client(
      {
        name: `grokki-client-${serverId}`,
        version: '1.0.0',
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );

    await client.connect(transport);

    // List available tools from the server
    let tools = [];
    try {
      const toolRes = await client.listTools();
      tools = (toolRes && toolRes.tools) || [];
    } catch (err) {
      console.warn(`[MCP] Error listing tools for ${serverId}:`, err.message);
    }

    this.clients.set(serverId, {
      id: serverId,
      client,
      transport,
      config: srvConfig,
      tools,
    });

    console.log(`[MCP] Connected server "${serverId}" with ${tools.length} tool(s).`);
    await this.refreshCombinedTools();
    return { success: true, tools };
  }

  async disconnectServer(serverId) {
    const item = this.clients.get(serverId);
    if (!item) return;

    try {
      await item.client.close();
    } catch (_) {}
    try {
      await item.transport.close();
    } catch (_) {}

    this.clients.delete(serverId);
    await this.refreshCombinedTools();
    console.log(`[MCP] Disconnected server "${serverId}".`);
  }

  async disconnectAll() {
    for (const serverId of Array.from(this.clients.keys())) {
      await this.disconnectServer(serverId);
    }
  }

  async refreshCombinedTools() {
    const tools = [];
    for (const [serverId, item] of this.clients.entries()) {
      for (const t of item.tools) {
        // Namespace tool if needed, or keep clean prefix
        const toolName = `mcp__${serverId}__${t.name}`;
        tools.push({
          rawName: t.name,
          mcpName: toolName,
          serverId,
          description: `[MCP: ${serverId}] ${t.description || t.name}`,
          inputSchema: t.inputSchema || { type: 'object', properties: {} },
        });
      }
    }
    this.allTools = tools;
    return this.allTools;
  }

  getOpenAIToolDefinitions() {
    return this.allTools.map((t) => ({
      type: 'function',
      function: {
        name: t.mcpName,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
  }

  isMcpTool(name) {
    return typeof name === 'string' && name.startsWith('mcp__');
  }

  async executeMcpTool(mcpToolName, args) {
    const found = this.allTools.find((t) => t.mcpName === mcpToolName);
    if (!found) {
      return { success: false, error: `MCP Tool "${mcpToolName}" not found.` };
    }

    const item = this.clients.get(found.serverId);
    if (!item) {
      return { success: false, error: `MCP Server "${found.serverId}" is not currently connected.` };
    }

    try {
      console.log(`[MCP] Executing ${found.rawName} on server ${found.serverId}...`);
      const result = await item.client.callTool({
        name: found.rawName,
        arguments: args || {},
      });
      return {
        success: true,
        result,
      };
    } catch (err) {
      console.error(`[MCP] Tool execution error (${mcpToolName}):`, err);
      return {
        success: false,
        error: err.message || String(err),
      };
    }
  }

  getStatus() {
    const config = this.getConfig();
    const servers = config.mcpServers || {};
    const list = [];

    for (const [id, srv] of Object.entries(servers)) {
      const live = this.clients.get(id);
      list.push({
        id,
        description: srv.description || '',
        command: srv.command,
        args: srv.args,
        enabled: !!srv.enabled,
        connected: !!live,
        tools: live ? live.tools.map((t) => t.name) : [],
      });
    }

    return {
      activeCount: this.clients.size,
      totalTools: this.allTools.length,
      servers: list,
    };
  }
}

module.exports = new McpManager();
