import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Add01Icon,
  RefreshCwIcon,
  PuzzleIcon,
  Settings01Icon,
  Delete02Icon,
  Tick02Icon,
  Cancel01Icon,
  Globe02Icon,
  Search01Icon,
  BotIcon,
  ComputerTerminal01Icon,
  Mic01Icon,
  WorkflowSquare01Icon,
  Layers01Icon,
  DatabaseIcon,
  CloudIcon,
  FileCodeIcon,
  CodeSquareIcon,
} from '@hugeicons/core-free-icons';
import { GrokkiPlugin, JarvisConfig } from '../../types/jarvis';

interface PluginsTabProps {
  config?: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
  onNavigateTab?: (tab: string) => void;
}

type PluginSubView = 'list' | 'add' | 'configure';
type AddPluginMode = 'presets' | 'stdio' | 'remote' | 'json';

interface McpPreset {
  id: string;
  name: string;
  category: string;
  transport: 'stdio' | 'streamable-http';
  command: string;
  args: string[];
  description: string;
  envKeys?: string[];
  badge?: string;
}

const MCP_PRESETS: McpPreset[] = [
  {
    id: 'github',
    name: 'GitHub MCP Server',
    category: 'Developer Tools',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    description: 'Read and query GitHub repositories, pull requests, issues, commits, and releases.',
    envKeys: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
    badge: 'Verified',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL Database',
    category: 'Databases',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    description: 'Inspect schemas, execute analytical queries, and manage local or cloud Postgres instances.',
    envKeys: ['POSTGRES_CONNECTION_STRING'],
    badge: 'Verified',
  },
  {
    id: 'filesystem',
    name: 'Sandboxed Filesystem',
    category: 'System',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    description: 'Secure, sandboxed read and write access to designated workspace directories.',
    badge: 'Core',
  },
  {
    id: 'playwright',
    name: 'Playwright Browser',
    category: 'Automation & Web',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-playwright'],
    description: 'Headless Chromium browser automation, webpage navigation, screenshot verification, and scraping.',
    badge: 'Automation',
  },
  {
    id: 'brave-search',
    name: 'Brave Search API',
    category: 'Search & Research',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    description: 'Privacy-first web and local search indexing directly within agent loops.',
    envKeys: ['BRAVE_API_KEY'],
    badge: 'Search',
  },
  {
    id: 'sqlite',
    name: 'SQLite Explorer',
    category: 'Databases',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-sqlite', '--db-path', 'database.sqlite'],
    description: 'Zero-config local SQLite inspection and SQL query execution for datasets and apps.',
    badge: 'Python uvx',
  },
  {
    id: 'memory-graph',
    name: 'Knowledge Memory Graph',
    category: 'Memory & Context',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    description: 'Persistent knowledge graph memory allowing agents to remember entities and relations across sessions.',
    badge: 'Memory',
  },
  {
    id: 'deepseek-client',
    name: 'DeepSeek Cordis Router',
    category: 'Harness',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@deepseek-ai/dsh-mcp-client'],
    description: 'Official DeepSeek Harness MCP client bridge connecting external tool providers.',
    badge: 'DeepSeek',
  },
];

export const PluginsTab: React.FC<PluginsTabProps> = () => {
  const [currentView, setCurrentView] = useState<PluginSubView>('list');
  const [officialPlugins, setOfficialPlugins] = useState<GrokkiPlugin[]>([]);
  const [customPlugins, setCustomPlugins] = useState<GrokkiPlugin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Configure View State
  const [configuringPlugin, setConfiguringPlugin] = useState<GrokkiPlugin | null>(null);
  const [tempConfig, setTempConfig] = useState<Record<string, any>>({});

  // Add Plugin View State (In-Tab)
  const [addMode, setAddMode] = useState<AddPluginMode>('presets');
  const [newPluginName, setNewPluginName] = useState('');
  const [newPluginDesc, setNewPluginDesc] = useState('');
  const [newMcpCommand, setNewMcpCommand] = useState('npx');
  const [newMcpArgs, setNewMcpArgs] = useState('-y\n');
  const [newMcpEnv, setNewMcpEnv] = useState('');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [newRemoteAuthHeader, setNewRemoteAuthHeader] = useState('');
  const [rawJsonConfig, setRawJsonConfig] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [presetSearch, setPresetSearch] = useState('');

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const fetchPlugins = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.jarvisAPI?.getPlugins) {
        const res = await window.jarvisAPI.getPlugins();
        if (res && res.success) {
          setOfficialPlugins(res.official || []);
          setCustomPlugins(res.custom || []);
        }
      }
    } catch (err) {
      console.warn('[PluginsTab] Fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const handleToggle = async (plugin: GrokkiPlugin, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !plugin.isEnabled;

    if (plugin.category === 'official') {
      setOfficialPlugins((prev) =>
        prev.map((p) => (p.id === plugin.id ? { ...p, isEnabled: nextState } : p))
      );
    } else {
      setCustomPlugins((prev) =>
        prev.map((p) => (p.id === plugin.id ? { ...p, isEnabled: nextState } : p))
      );
    }

    try {
      if (window.jarvisAPI?.togglePlugin) {
        await window.jarvisAPI.togglePlugin(plugin.id, nextState);
        showNotice(`${plugin.name} ${nextState ? 'enabled' : 'disabled'}`);
      }
    } catch (err) {
      console.error('[PluginsTab] Toggle failed:', err);
      fetchPlugins();
    }
  };

  const handleOpenConfigure = (plugin: GrokkiPlugin, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfiguringPlugin(plugin);
    setTempConfig({ ...(plugin.config || {}) });
    setCurrentView('configure');
  };

  const handleSaveConfig = async () => {
    if (!configuringPlugin) return;
    try {
      if (window.jarvisAPI?.savePluginConfig) {
        await window.jarvisAPI.savePluginConfig(configuringPlugin.id, tempConfig);
        showNotice(`Saved settings for ${configuringPlugin.name}`);
        setCurrentView('list');
        setConfiguringPlugin(null);
        await fetchPlugins();
      }
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  const handleDeleteCustom = async (pluginId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Uninstall plugin "${pluginId}"?`)) return;
    try {
      if (window.jarvisAPI?.deletePlugin) {
        const res = await window.jarvisAPI.deletePlugin(pluginId);
        if (res?.success) {
          showNotice(`Uninstalled ${pluginId}`);
          await fetchPlugins();
        }
      }
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // Preset One-Click Install
  const handleInstallPreset = async (preset: McpPreset) => {
    try {
      if (window.jarvisAPI?.addCustomPlugin) {
        const res = await window.jarvisAPI.addCustomPlugin({
          id: preset.id,
          name: preset.name,
          description: preset.description,
          category: 'mcp',
          icon: 'mcp',
          mcpServer: {
            transport: preset.transport,
            command: preset.command,
            args: preset.args,
          },
        });
        if (res?.success) {
          showNotice(`Installed ${preset.name}`);
          setCurrentView('list');
          await fetchPlugins();
        } else {
          alert(res?.error || 'Failed to install preset.');
        }
      }
    } catch (err: any) {
      alert(`Failed to install: ${err.message}`);
    }
  };

  // Custom Form Submit
  const handleAddCustomPlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newPluginName.trim()) {
      setAddError('Plugin name is required.');
      return;
    }

    try {
      let mcpServerConfig: any = null;

      if (addMode === 'stdio') {
        const argsArray = newMcpArgs
          .trim()
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);

        const envObj: Record<string, string> = {};
        newMcpEnv
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .forEach((line) => {
            const idx = line.indexOf('=');
            if (idx !== -1) {
              envObj[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
            }
          });

        mcpServerConfig = {
          transport: 'stdio',
          command: newMcpCommand.trim() || 'npx',
          args: argsArray,
          env: Object.keys(envObj).length > 0 ? envObj : undefined,
        };
      } else if (addMode === 'remote') {
        if (!newRemoteUrl.trim()) {
          setAddError('Remote server URL is required.');
          return;
        }

        const headersObj: Record<string, string> = {};
        if (newRemoteAuthHeader.trim()) {
          headersObj['Authorization'] = newRemoteAuthHeader.trim().startsWith('Bearer ')
            ? newRemoteAuthHeader.trim()
            : `Bearer ${newRemoteAuthHeader.trim()}`;
        }

        mcpServerConfig = {
          transport: 'streamable-http',
          url: newRemoteUrl.trim(),
          headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
        };
      }

      if (window.jarvisAPI?.addCustomPlugin) {
        const res = await window.jarvisAPI.addCustomPlugin({
          name: newPluginName.trim(),
          description: newPluginDesc.trim(),
          category: 'mcp',
          mcpServer: mcpServerConfig,
        });

        if (res?.success) {
          showNotice(`Installed plugin "${newPluginName.trim()}"`);
          setCurrentView('list');
          setNewPluginName('');
          setNewPluginDesc('');
          setNewMcpCommand('npx');
          setNewMcpArgs('-y\n');
          setNewMcpEnv('');
          setNewRemoteUrl('');
          setNewRemoteAuthHeader('');
          await fetchPlugins();
        } else {
          setAddError(res?.error || 'Failed to install plugin.');
        }
      }
    } catch (err: any) {
      setAddError(err.message || 'An error occurred.');
    }
  };

  // Raw JSON / Claude & DeepSeek Config Import
  const handleImportRawJson = async () => {
    setAddError(null);
    if (!rawJsonConfig.trim()) {
      setAddError('Please paste a JSON configuration.');
      return;
    }

    try {
      const parsed = JSON.parse(rawJsonConfig.trim());
      let serversToInstall: Array<{ name: string; mcp: any }> = [];

      // Format 1: { "mcpServers": { "name": { command, args, env } } }
      if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
        Object.entries(parsed.mcpServers).forEach(([srvName, srvConf]: [string, any]) => {
          serversToInstall.push({
            name: srvName,
            mcp: {
              transport: srvConf.transport || (srvConf.url ? 'streamable-http' : 'stdio'),
              command: srvConf.command,
              args: srvConf.args || [],
              env: srvConf.env,
              url: srvConf.url,
              headers: srvConf.headers,
            },
          });
        });
      } else if (parsed.name && (parsed.command || parsed.url)) {
        // Format 2: Single server object { name, command, args }
        serversToInstall.push({
          name: parsed.name,
          mcp: {
            transport: parsed.transport || (parsed.url ? 'streamable-http' : 'stdio'),
            command: parsed.command,
            args: parsed.args || [],
            env: parsed.env,
            url: parsed.url,
            headers: parsed.headers,
          },
        });
      } else {
        throw new Error('Unrecognized format. Must contain "mcpServers" or valid server definition.');
      }

      if (window.jarvisAPI?.addCustomPlugin) {
        for (const item of serversToInstall) {
          await window.jarvisAPI.addCustomPlugin({
            name: item.name,
            description: `Imported MCP server (${item.mcp.transport || 'stdio'})`,
            category: 'mcp',
            mcpServer: item.mcp,
          });
        }

        showNotice(`Imported ${serversToInstall.length} MCP plugin(s) successfully!`);
        setCurrentView('list');
        setRawJsonConfig('');
        await fetchPlugins();
      }
    } catch (err: any) {
      setAddError(err.message || 'Invalid JSON syntax.');
    }
  };

  const filteredPresets = useMemo(() => {
    if (!presetSearch.trim()) return MCP_PRESETS;
    const q = presetSearch.toLowerCase();
    return MCP_PRESETS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [presetSearch]);

  const renderPluginIcon = (icon?: string, id?: string) => {
    switch (icon || id) {
      case 'teams':
      case 'agent-teams':
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/15 via-blue-500/10 to-indigo-500/20 border border-teal-500/30 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={BotIcon} size={20} strokeWidth={2} className="text-teal-400" />
          </div>
        );
      case 'voice':
      case 'voice-input':
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/15 to-blue-600/15 border border-sky-500/30 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Mic01Icon} size={20} strokeWidth={2} className="text-sky-400" />
          </div>
        );
      case 'shell':
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={ComputerTerminal01Icon} size={20} strokeWidth={2} className="text-blue-400" />
          </div>
        );
      case 'loop':
      case 'agent-loop':
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-fuchsia-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={WorkflowSquare01Icon} size={20} strokeWidth={2} className="text-purple-400" />
          </div>
        );
      case 'subagent':
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Layers01Icon} size={20} strokeWidth={2} className="text-cyan-400" />
          </div>
        );
      case 'search':
      case 'web-search':
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 border border-teal-500/30 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={2} className="text-teal-400" />
          </div>
        );
      case 'database':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={DatabaseIcon} size={20} strokeWidth={2} className="text-amber-400" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={PuzzleIcon} size={20} strokeWidth={2} className="text-gray-700 dark:text-zinc-300" />
          </div>
        );
    }
  };

  return (
    <div className="flex-1 w-full min-h-full bg-[#f7f7fa] dark:bg-[#070709] text-gray-900 dark:text-zinc-100 font-sans select-none px-8 py-10 overflow-y-auto">
      {/* Floating Notice Toast */}
      {notice && (
        <div className="fixed top-6 right-8 z-50 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-medium shadow-xl flex items-center gap-2 animate-in fade-in duration-150">
          <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.5} />
          <span>{notice}</span>
        </div>
      )}

      {/* VIEW 1: PLUGINS LIST VIEW */}
      {currentView === 'list' && (
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-white">Plugins</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Add and manage plugins
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchPlugins}
                disabled={isLoading}
                className="p-2 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                title="Refresh plugins"
              >
                <HugeiconsIcon icon={RefreshCwIcon} size={16} strokeWidth={2} className={isLoading ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddError(null);
                  setCurrentView('add');
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors shadow-xs cursor-pointer select-none"
              >
                <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2.5} />
                <span>Add plugin</span>
              </button>
            </div>
          </div>

          {/* Official Core Capability Packs (Matching Claude/DeepSeek Layout) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                Official {officialPlugins.length}
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              {officialPlugins.map((plugin) => (
                <div
                  key={plugin.id}
                  onClick={() => handleOpenConfigure(plugin)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    plugin.isEnabled
                      ? 'bg-white dark:bg-[#0c0d10] border-gray-200/80 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-gray-50/70 dark:hover:bg-[#111216]'
                      : 'bg-gray-50/50 dark:bg-[#070709] border-gray-200/50 dark:border-zinc-800/60 opacity-60 hover:opacity-85'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    {renderPluginIcon(plugin.icon, plugin.id)}

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-950 dark:text-white truncate">
                          {plugin.name}
                        </span>
                        {plugin.badge && (
                          <span className="text-[10px] font-medium text-blue-500 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                            {plugin.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-1 leading-relaxed mt-0.5">
                        {plugin.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleOpenConfigure(plugin, e)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Configure plugin"
                    >
                      <HugeiconsIcon icon={Settings01Icon} size={15} strokeWidth={1.8} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggle(plugin, e)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors relative shrink-0 focus:outline-none cursor-pointer ${
                        plugin.isEnabled
                          ? 'bg-gray-950 dark:bg-white text-white dark:text-gray-950'
                          : 'bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700'
                      }`}
                      title={plugin.isEnabled ? 'Disable plugin' : 'Enable plugin'}
                    >
                      <div
                        className={`w-4 h-4 rounded-full transition-transform shadow-xs ${
                          plugin.isEnabled
                            ? 'translate-x-4 bg-white dark:bg-zinc-950'
                            : 'translate-x-0 bg-white dark:bg-zinc-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom & Community MCP Plugins Section */}
          <div className="flex flex-col gap-3 pt-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                Community & MCP Plugins ({customPlugins.length})
              </h2>
            </div>

            {customPlugins.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-gray-300 dark:border-zinc-800 bg-white/40 dark:bg-[#0a0b0e]/50 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700/80 flex items-center justify-center mb-3">
                  <HugeiconsIcon icon={PuzzleIcon} size={22} strokeWidth={1.8} className="text-gray-400 dark:text-zinc-500" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
                  No community or MCP plugins installed
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-md leading-relaxed">
                  Install verified Model Context Protocol (MCP) servers, DeepSeek Cordis plugins, or connect custom tools to expand Grokki's capabilities.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAddError(null);
                    setCurrentView('add');
                  }}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2.5} />
                  <span>Browse MCP Presets & Install</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {customPlugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    onClick={() => handleOpenConfigure(plugin)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                      plugin.isEnabled
                        ? 'bg-white dark:bg-[#0c0d10] border-gray-200/80 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-gray-50/70 dark:hover:bg-[#111216]'
                        : 'bg-gray-50/50 dark:bg-[#070709] border-gray-200/50 dark:border-zinc-800/60 opacity-60 hover:opacity-85'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-4">
                      {renderPluginIcon(plugin.icon, plugin.id)}

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-950 dark:text-white truncate">
                            {plugin.name}
                          </span>
                          <span className="text-[10px] font-mono text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded border border-gray-300 dark:border-zinc-700">
                            {plugin.mcpServer?.transport || plugin.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-1 leading-relaxed mt-0.5">
                          {plugin.description || 'Custom MCP plugin integration.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleOpenConfigure(plugin, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Configure plugin"
                      >
                        <HugeiconsIcon icon={Settings01Icon} size={15} strokeWidth={1.8} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustom(plugin.id, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Uninstall plugin"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggle(plugin, e)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors relative shrink-0 focus:outline-none cursor-pointer ${
                          plugin.isEnabled
                            ? 'bg-gray-950 dark:bg-white text-white dark:text-gray-950'
                            : 'bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700'
                        }`}
                        title={plugin.isEnabled ? 'Disable plugin' : 'Enable plugin'}
                      >
                        <div
                          className={`w-4 h-4 rounded-full transition-transform shadow-xs ${
                            plugin.isEnabled
                              ? 'translate-x-4 bg-white dark:bg-zinc-950'
                              : 'translate-x-0 bg-white dark:bg-zinc-400'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: IN-TAB "ADD PLUGIN" (NO MODAL - FULL TAB INTERFACE) */}
      {currentView === 'add' && (
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Top Bar with Back Button */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800/80 pb-4">
            <button
              type="button"
              onClick={() => setCurrentView('list')}
              className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
              <span>Back to Plugins</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('list')}
              className="px-3 py-1 rounded-lg text-xs font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
              Install Plugin & Connect MCP
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Select a verified MCP server preset, connect a local command, stream a remote HTTP endpoint, or paste your Claude/DeepSeek config.
            </p>
          </div>

          {/* Sub-Navigation Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 w-fit">
            <button
              type="button"
              onClick={() => setAddMode('presets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                addMode === 'presets'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold shadow-xs'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Marketplace Presets
            </button>
            <button
              type="button"
              onClick={() => setAddMode('stdio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                addMode === 'stdio'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold shadow-xs'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Custom MCP (stdio)
            </button>
            <button
              type="button"
              onClick={() => setAddMode('remote')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                addMode === 'remote'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold shadow-xs'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Remote HTTP / SSE
            </button>
            <button
              type="button"
              onClick={() => setAddMode('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                addMode === 'json'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold shadow-xs'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Import Config JSON
            </button>
          </div>

          {addError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono">
              {addError}
            </div>
          )}

          {/* TAB 1: PRESETS / MARKETPLACE */}
          {addMode === 'presets' && (
            <div className="flex flex-col gap-4">
              <div className="relative w-full max-w-md">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={15}
                  strokeWidth={2}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500"
                />
                <input
                  type="text"
                  placeholder="Filter MCP servers (GitHub, Postgres, Playwright, SQLite...)"
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {filteredPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-4 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0c0d10] hover:border-gray-300 dark:hover:border-zinc-700 flex flex-col justify-between gap-4 transition-all"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-950 dark:text-white">
                          {preset.name}
                        </span>
                        {preset.badge && (
                          <span className="text-[10px] font-mono text-blue-500 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                            {preset.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                        {preset.description}
                      </p>

                      <div className="mt-2 font-mono text-[10.5px] text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-[#121318] p-2 rounded-lg border border-gray-100 dark:border-zinc-800 truncate">
                        {preset.command} {preset.args.join(' ')}
                      </div>

                      {preset.envKeys && preset.envKeys.length > 0 && (
                        <div className="text-[10.5px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                          <span>Requires environment:</span>
                          <span className="font-mono">{preset.envKeys.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-gray-100 dark:border-zinc-800/60">
                      <button
                        type="button"
                        onClick={() => handleInstallPreset(preset)}
                        className="px-3.5 py-1.5 rounded-lg bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors shadow-xs cursor-pointer select-none"
                      >
                        Install Plugin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM STDIO MCP */}
          {addMode === 'stdio' && (
            <form onSubmit={handleAddCustomPlugin} className="flex flex-col gap-4 max-w-2xl">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  Plugin Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GitHub Tools, Neon Postgres, Linear"
                  value={newPluginName}
                  onChange={(e) => setNewPluginName(e.target.value)}
                  className="w-full bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Query pull requests, issues, and repositories"
                  value={newPluginDesc}
                  onChange={(e) => setNewPluginDesc(e.target.value)}
                  className="w-full bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    Command (Executable) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="npx, uvx, node, python, or binary path"
                    value={newMcpCommand}
                    onChange={(e) => setNewMcpCommand(e.target.value)}
                    className="w-full font-mono bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    Transport
                  </label>
                  <input
                    type="text"
                    disabled
                    value="stdio (Local Process Subprocess)"
                    className="w-full font-mono bg-gray-100 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-500 dark:text-zinc-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  Arguments (One per line)
                </label>
                <textarea
                  rows={4}
                  placeholder="-y&#10;@modelcontextprotocol/server-github"
                  value={newMcpArgs}
                  onChange={(e) => setNewMcpArgs(e.target.value)}
                  className="w-full font-mono bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  Environment Variables (KEY=VALUE, one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...&#10;DATABASE_URL=postgres://..."
                  value={newMcpEnv}
                  onChange={(e) => setNewMcpEnv(e.target.value)}
                  className="w-full font-mono bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors shadow-xs cursor-pointer select-none"
                >
                  Install Plugin
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('list')}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: REMOTE HTTP / SSE MCP (DeepSeek streamable-http) */}
          {addMode === 'remote' && (
            <form onSubmit={handleAddCustomPlugin} className="flex flex-col gap-4 max-w-2xl">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  Plugin Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Remote Cloud MCP, Enterprise Vector API"
                  value={newPluginName}
                  onChange={(e) => setNewPluginName(e.target.value)}
                  className="w-full bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  Remote Endpoint URL * (streamable-http / SSE)
                </label>
                <input
                  type="url"
                  required
                  placeholder="http://localhost:3000/mcp or https://mcp.company.internal/sse"
                  value={newRemoteUrl}
                  onChange={(e) => setNewRemoteUrl(e.target.value)}
                  className="w-full font-mono bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  Authorization Bearer Token (Optional)
                </label>
                <input
                  type="password"
                  placeholder="mcp_live_sec_..."
                  value={newRemoteAuthHeader}
                  onChange={(e) => setNewRemoteAuthHeader(e.target.value)}
                  className="w-full font-mono bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors shadow-xs cursor-pointer select-none"
                >
                  Connect Remote MCP
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('list')}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: IMPORT CLAUDE / DEEPSEEK CONFIG JSON */}
          {addMode === 'json' && (
            <div className="flex flex-col gap-4 max-w-2xl">
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                Paste any standard <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-mono text-[11px]">claude_desktop_config.json</code> or DeepSeek Cordis patch JSON snippet below. Grokki will automatically parse the server configurations, transports, arguments, and environment variables.
              </p>

              <textarea
                rows={12}
                placeholder={`{\n  "mcpServers": {\n    "github": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-github"],\n      "env": {\n        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."\n      }\n    }\n  }\n}`}
                value={rawJsonConfig}
                onChange={(e) => setRawJsonConfig(e.target.value)}
                className="w-full font-mono bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 text-xs text-gray-900 dark:text-zinc-100 outline-none leading-relaxed resize-none shadow-xs"
              />

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleImportRawJson}
                  className="px-5 py-2 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors shadow-xs cursor-pointer select-none"
                >
                  Import & Install
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('list')}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: IN-TAB "CONFIGURE PLUGIN" (NO MODAL - FULL TAB INTERFACE) */}
      {currentView === 'configure' && configuringPlugin && (
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Top Bar with Back Button */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800/80 pb-4">
            <button
              type="button"
              onClick={() => setCurrentView('list')}
              className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
              <span>Back to Plugins</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-1.5 rounded-lg bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors shadow-xs cursor-pointer select-none"
              >
                Save Changes
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {renderPluginIcon(configuringPlugin.icon, configuringPlugin.id)}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white">
                  {configuringPlugin.name}
                </h1>
                {configuringPlugin.badge && (
                  <span className="text-[10px] font-medium text-blue-500 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                    {configuringPlugin.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                {configuringPlugin.description}
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800/80 flex flex-col gap-4 text-xs">
            {/* Specific Settings Per Plugin */}
            {configuringPlugin.id === 'shell' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-800 dark:text-zinc-200">
                    Command Timeout (milliseconds)
                  </label>
                  <input
                    type="number"
                    value={tempConfig.timeoutMs ?? 30000}
                    onChange={(e) =>
                      setTempConfig({ ...tempConfig, timeoutMs: parseInt(e.target.value) || 30000 })
                    }
                    className="w-full bg-gray-50 dark:bg-[#111216] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-800 dark:text-zinc-200">
                    Max Command Output Lines
                  </label>
                  <input
                    type="number"
                    value={tempConfig.maxOutputLines ?? 1000}
                    onChange={(e) =>
                      setTempConfig({ ...tempConfig, maxOutputLines: parseInt(e.target.value) || 1000 })
                    }
                    className="w-full bg-gray-50 dark:bg-[#111216] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                  />
                </div>
              </div>
            )}

            {configuringPlugin.id === 'agent-loop' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-800 dark:text-zinc-200">
                    Max Consecutive Steps per Turn
                  </label>
                  <input
                    type="number"
                    value={tempConfig.maxSteps ?? 25}
                    onChange={(e) =>
                      setTempConfig({ ...tempConfig, maxSteps: parseInt(e.target.value) || 25 })
                    }
                    className="w-full bg-gray-50 dark:bg-[#111216] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                  />
                </div>
              </div>
            )}

            {configuringPlugin.id === 'web-search' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-800 dark:text-zinc-200">
                    Search Engine Provider
                  </label>
                  <select
                    value={tempConfig.provider || 'deepseek'}
                    onChange={(e) => setTempConfig({ ...tempConfig, provider: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-[#111216] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                  >
                    <option value="deepseek">DeepSeek Search (Default)</option>
                    <option value="duckduckgo">DuckDuckGo</option>
                    <option value="brave">Brave Search API</option>
                    <option value="google">Google Custom Search</option>
                  </select>
                </div>
              </div>
            )}

            {configuringPlugin.id === 'subagent' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-800 dark:text-zinc-200">
                    Max Recursion Depth
                  </label>
                  <input
                    type="number"
                    value={tempConfig.maxDepth ?? 3}
                    onChange={(e) =>
                      setTempConfig({ ...tempConfig, maxDepth: parseInt(e.target.value) || 3 })
                    }
                    className="w-full bg-gray-50 dark:bg-[#111216] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                  />
                </div>
              </div>
            )}

            {configuringPlugin.id === 'agent-teams' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-800 dark:text-zinc-200">
                    Max Team Members
                  </label>
                  <input
                    type="number"
                    value={tempConfig.maxMembers ?? 4}
                    onChange={(e) =>
                      setTempConfig({ ...tempConfig, maxMembers: parseInt(e.target.value) || 4 })
                    }
                    className="w-full bg-gray-50 dark:bg-[#111216] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                  />
                </div>
              </div>
            )}

            {configuringPlugin.id === 'voice-input' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-800 dark:text-zinc-200">
                    Transcription Engine
                  </label>
                  <select
                    value={tempConfig.engine || 'SenseVoice'}
                    onChange={(e) => setTempConfig({ ...tempConfig, engine: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-[#111216] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                  >
                    <option value="SenseVoice">SenseVoice (FunASR Multilingual)</option>
                    <option value="Whisper">OpenAI Whisper (Local)</option>
                    <option value="WebSpeech">System WebSpeech API</option>
                  </select>
                </div>
              </div>
            )}

            {/* Custom MCP Details */}
            {configuringPlugin.category === 'mcp' && configuringPlugin.mcpServer && (
              <div className="flex flex-col gap-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 font-sans">
                  <span>Transport:</span>
                  <span className="font-mono text-gray-900 dark:text-white px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800">
                    {configuringPlugin.mcpServer.transport || 'stdio'}
                  </span>
                </div>

                {configuringPlugin.mcpServer.command && (
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-500 dark:text-zinc-400 font-sans">Execution Command:</span>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#070709] border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-200 overflow-x-auto">
                      {configuringPlugin.mcpServer.command}{' '}
                      {(configuringPlugin.mcpServer.args || []).join(' ')}
                    </div>
                  </div>
                )}

                {configuringPlugin.mcpServer.url && (
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-500 dark:text-zinc-400 font-sans">Remote Server URL:</span>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#070709] border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-200 overflow-x-auto">
                      {configuringPlugin.mcpServer.url}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
