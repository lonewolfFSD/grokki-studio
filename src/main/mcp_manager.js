/**
 * Grokki MCP Manager - Model Context Protocol Client Integration
 * Integrates open MCP servers (GitHub, Filesystem, SQLite, Brave, Fetch, Memory, etc.)
 * directly into Grokki's tool calling loop.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

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

    const createClient = () =>
      new Client(
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

    let client = createClient();
    let transport = null;

    if (srvConfig.url) {
      const targetUrl = new URL(srvConfig.url);
      const headers = { ...(srvConfig.headers || {}) };
      if (srvConfig.accessToken && !headers['Authorization'] && !headers['authorization']) {
        headers['Authorization'] = `Bearer ${srvConfig.accessToken}`;
      }
      const reqInit = Object.keys(headers).length > 0 ? { headers } : undefined;
      const preferSse =
        srvConfig.transport === 'sse' || targetUrl.pathname.toLowerCase().endsWith('/sse');

      if (preferSse) {
        transport = new SSEClientTransport(targetUrl, { requestInit: reqInit });
        await client.connect(transport);
      } else {
        try {
          transport = new StreamableHTTPClientTransport(targetUrl, { requestInit: reqInit });
          await client.connect(transport);
        } catch (err) {
          // If streamable HTTP fails with 404/405 (and not 401 auth error), try SSE fallback
          if (err.code === 401 || String(err.message).includes('401')) {
            throw err;
          }
          client = createClient();
          transport = new SSEClientTransport(targetUrl, { requestInit: reqInit });
          await client.connect(transport);
        }
      }
    } else if (srvConfig.command) {
      const command = srvConfig.command;
      const args = Array.isArray(srvConfig.args) ? srvConfig.args : [];
      const env = { ...process.env, ...(srvConfig.env || {}) };

      transport = new StdioClientTransport({
        command,
        args,
        env,
      });
      await client.connect(transport);
    } else {
      throw new Error(`Invalid MCP config for "${serverId}": missing url or command.`);
    }

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

  isConnected(serverId) {
    return this.clients.has(serverId);
  }

  getServerTools(serverId) {
    const item = this.clients.get(serverId);
    return item ? item.tools : [];
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

  getOpenAIToolDefinitions(prompt = '', activePlugins = [], maxTools = 35) {
    const selected = this.getRelevantMcpTools(prompt, activePlugins, maxTools);
    return selected.map((t) => ({
      type: 'function',
      function: {
        name: t.mcpName,
        description: (t.description || t.rawName || '').slice(0, 500),
        parameters: t.inputSchema || { type: 'object', properties: {} },
      },
    }));
  }

  sanitizeSchemaForGemini(schema) {
    if (!schema || typeof schema !== 'object') {
      return { type: 'OBJECT', properties: {} };
    }
    const typeMap = {
      object: 'OBJECT',
      string: 'STRING',
      number: 'NUMBER',
      integer: 'INTEGER',
      boolean: 'BOOLEAN',
      array: 'ARRAY',
    };

    const rawType = Array.isArray(schema.type) ? schema.type[0] : schema.type;
    const mappedType = typeMap[String(rawType || 'object').toLowerCase()] || 'STRING';
    const out = { type: mappedType };

    if (schema.description && typeof schema.description === 'string') {
      out.description = schema.description.slice(0, 400);
    }
    if (Array.isArray(schema.enum) && schema.enum.length > 0 && mappedType === 'STRING') {
      out.enum = schema.enum.map((e) => String(e));
    }

    if (mappedType === 'OBJECT') {
      const props = {};
      if (schema.properties && typeof schema.properties === 'object') {
        for (const [k, v] of Object.entries(schema.properties)) {
          props[k] = this.sanitizeSchemaForGemini(v);
        }
      }
      out.properties = props;
      if (Array.isArray(schema.required) && schema.required.length > 0) {
        out.required = schema.required.filter((r) => typeof r === 'string' && r in props);
      }
    } else if (mappedType === 'ARRAY') {
      out.items = schema.items ? this.sanitizeSchemaForGemini(schema.items) : { type: 'STRING' };
    }

    return out;
  }

  getGeminiToolDeclarations(prompt = '', activePlugins = [], maxTools = 55) {
    const selected = this.getRelevantMcpTools(prompt, activePlugins, maxTools);
    return selected.map((t) => ({
      name: t.mcpName,
      description: (t.description || t.rawName || '').slice(0, 500),
      parameters: this.sanitizeSchemaForGemini(t.inputSchema),
    }));
  }

  async ensureServersConnected(activePlugins = []) {
    const config = this.getConfig();
    const servers = config.mcpServers || {};
    const requestedIds = Array.isArray(activePlugins)
      ? activePlugins.map((p) => String(p.id || p.name || '').toLowerCase().trim()).filter(Boolean)
      : [];

    for (const [serverId, srv] of Object.entries(servers)) {
      if (!srv || !srv.enabled) continue;
      if (this.clients.has(serverId)) continue;
      if (requestedIds.length > 0) {
        const lowerId = serverId.toLowerCase();
        const matches = requestedIds.some((rid) => lowerId === rid || lowerId.includes(rid) || rid.includes(lowerId));
        if (!matches) continue;
      }
      try {
        await this.connectServer(serverId, srv);
      } catch (err) {
        console.warn(`[MCP] On-demand connect failed for "${serverId}":`, err.message);
      }
    }
  }

  getRelevantMcpTools(prompt = '', activePlugins = [], maxTools = 35) {
    if (!Array.isArray(this.allTools) || this.allTools.length === 0) return [];

    let pool = this.allTools;

    // 1. If user explicitly invoked @Plugin(s), scope to those servers first
    if (Array.isArray(activePlugins) && activePlugins.length > 0) {
      const targetIds = activePlugins
        .map((p) => String(p.id || p.name || '').toLowerCase().trim())
        .filter(Boolean);
      const scoped = this.allTools.filter((t) => {
        const sid = (t.serverId || '').toLowerCase();
        return targetIds.some((tid) => sid === tid || sid.includes(tid) || tid.includes(sid));
      });
      if (scoped.length > 0) {
        pool = scoped;
      }
    }

    if (pool.length <= maxTools) {
      return pool;
    }

    // 2. Score tools by prompt keywords so large servers (e.g. Vercel's 250 tools) fit cleanly in LLM tool limits
    const cleanPrompt = (prompt || '').toLowerCase().replace(/@[a-z0-9_.-]+/gi, ' ');
    const tokens = cleanPrompt
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 2 && !['can', 'you', 'the', 'for', 'and', 'with', 'check', 'please', 'my', 'me', 'on', 'in', 'to', 'of', 'is', 'are', 'what'].includes(w));

    const expandedTokens = new Set(tokens);
    for (const tok of tokens) {
      if (tok.endsWith('s') && tok.length > 3) expandedTokens.add(tok.slice(0, -1));
      else expandedTokens.add(`${tok}s`);
    }

    const scored = pool.map((t) => {
      const nameLower = (t.rawName || '').toLowerCase();
      const descLower = (t.description || '').toLowerCase();
      let score = 0;

      for (const tok of expandedTokens) {
        if (nameLower.includes(tok)) score += 12;
        if (descLower.includes(tok)) score += 4;
      }

      // Boost common read/list/get discovery tools when user asks to check/show/list
      if (/^(list_|get_|search_|fetch_|read_)/.test(nameLower)) score += 3;
      if (nameLower === 'list_deployments' || nameLower === 'get_deployment' || nameLower === 'list_projects' || nameLower === 'list_teams') {
        score += 6;
      }

      return { tool: t, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxTools).map((s) => s.tool);
  }

  isMcpTool(name) {
    return typeof name === 'string' && name.startsWith('mcp__');
  }

  async executeMcpTool(mcpToolName, args) {
    const found = this.allTools.find((t) => t.mcpName === mcpToolName);
    if (!found) {
      const prefixMatch = String(mcpToolName || '').match(/^(mcp__[^_]+__)/);
      const serverPrefix = prefixMatch ? prefixMatch[1] : null;
      const candidateTools = (serverPrefix
        ? this.allTools.filter((t) => t.mcpName.startsWith(serverPrefix))
        : this.allTools
      )
        .slice(0, 20)
        .map((t) => t.mcpName);
      const hint = candidateTools.length > 0
        ? ` Use one of these exact available tool names instead: ${candidateTools.join(', ')}`
        : '';
      const errMsg = `MCP Tool "${mcpToolName}" not found.${hint}`;
      return { success: false, error: errMsg, message: errMsg };
    }

    const item = this.clients.get(found.serverId);
    if (!item) {
      const errMsg = `MCP Server "${found.serverId}" is not currently connected.`;
      return { success: false, error: errMsg, message: errMsg };
    }

    try {
      console.log(`[MCP] Executing ${found.rawName} on server ${found.serverId}...`);
      const result = await item.client.callTool({
        name: found.rawName,
        arguments: args || {},
      });

      let message = '';
      if (result && Array.isArray(result.content)) {
        message = result.content
          .map((c) => (c.type === 'text' ? c.text : JSON.stringify(c)))
          .filter(Boolean)
          .join('\n\n');
      } else if (result) {
        message = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      }

      return {
        success: !result?.isError,
        message: message || 'MCP tool executed successfully.',
        result,
      };
    } catch (err) {
      console.error(`[MCP] Tool execution error (${mcpToolName}):`, err);
      return {
        success: false,
        error: err.message || String(err),
        message: `MCP tool "${found.rawName}" failed: ${err.message || String(err)}`,
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
