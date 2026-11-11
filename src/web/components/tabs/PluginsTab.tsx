import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Search01Icon,
  ComputerTerminal01Icon,
  Layers01Icon,
  StarIcon,
  ArrowUpRight01Icon,
} from '@hugeicons/core-free-icons';
import { GrokkiPlugin, JarvisConfig } from '../../types/jarvis';

// Real logos for Grokki's official plugins
import googleLogo from '../../assets/logos/google.png';
import githubLogo from '../../assets/logos/github.png';
import notionLogo from '../../assets/logos/notion.png';
import obsidianLogo from '../../assets/logos/obsidian.png';
import whatsappLogo from '../../assets/logos/whatsapp.svg';

interface PluginsTabProps {
  config?: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
  onNavigateTab?: (tab: string) => void;
}

type PluginSubView = 'list' | 'add' | 'configure';
type AddPluginMode = 'marketplace' | 'stdio' | 'remote' | 'json';

interface McpRegistryServer {
  id: string;
  name: string;
  fullName: string;
  author: string;
  description: string;
  stars: number;
  imageUrl: string;
  repoUrl: string;
  command: string;
  args: string[];
  transport: 'stdio' | 'streamable-http';
}

export const PluginsTab: React.FC<PluginsTabProps> = ({ onNavigateTab }) => {
  const [currentView, setCurrentView] = useState<PluginSubView>('list');
  const [officialPlugins, setOfficialPlugins] = useState<GrokkiPlugin[]>([]);
  const [customPlugins, setCustomPlugins] = useState<GrokkiPlugin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // In-Tab Configure Sub-View State
  const [configuringPlugin, setConfiguringPlugin] = useState<GrokkiPlugin | null>(null);
  const [tempConfig, setTempConfig] = useState<Record<string, any>>({});

  // In-Tab Add Plugin Sub-View State
  const [addMode, setAddMode] = useState<AddPluginMode>('marketplace');
  const [registryServers, setRegistryServers] = useState<McpRegistryServer[]>([]);
  const [isRegistryLoading, setIsRegistryLoading] = useState(false);
  const [registrySearch, setRegistrySearch] = useState('');
  const [installingId, setInstallingId] = useState<string | null>(null);

  // Custom Form Fields
  const [newPluginName, setNewPluginName] = useState('');
  const [newPluginDesc, setNewPluginDesc] = useState('');
  const [newMcpCommand, setNewMcpCommand] = useState('npx');
  const [newMcpArgs, setNewMcpArgs] = useState('-y\n');
  const [newMcpEnv, setNewMcpEnv] = useState('');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [newRemoteAuthHeader, setNewRemoteAuthHeader] = useState('');
  const [rawJsonConfig, setRawJsonConfig] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const checkAccountStatuses = async (): Promise<Record<string, boolean>> => {
    const statuses: Record<string, boolean> = {
      'google-workspace': false,
      whatsapp: false,
      notion: false,
      obsidian: false,
      'git-tools': false,
    };

    try {
      if (window.jarvisAPI?.getGoogleStatus) {
        const res = await window.jarvisAPI.getGoogleStatus();
        statuses['google-workspace'] = Boolean(res?.connected);
      }
    } catch {}

    try {
      if (window.jarvisAPI?.getOpenWAStatus) {
        const res = await window.jarvisAPI.getOpenWAStatus();
        statuses['whatsapp'] = Boolean(res?.connected);
      }
    } catch {}

    try {
      if (window.jarvisAPI?.getNotionStatus) {
        const res = await window.jarvisAPI.getNotionStatus();
        statuses['notion'] = Boolean(res?.connected);
      }
    } catch {}

    try {
      if (window.jarvisAPI?.getObsidianStatus) {
        const res = await window.jarvisAPI.getObsidianStatus();
        statuses['obsidian'] = Boolean(res?.connected);
      }
    } catch {}

    try {
      if (window.jarvisAPI?.getGitHubStatus) {
        const res = await window.jarvisAPI.getGitHubStatus();
        let isGit = Boolean(res?.connected);
        if (!isGit && window.jarvisAPI?.getGitStatus) {
          const gitRes = await window.jarvisAPI.getGitStatus();
          isGit = Boolean(gitRes?.isRepo);
        }
        statuses['git-tools'] = isGit;
      }
    } catch {}

    return statuses;
  };

  const fetchPlugins = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pluginsRes, liveStatuses] = await Promise.all([
        window.jarvisAPI?.getPlugins ? window.jarvisAPI.getPlugins() : Promise.resolve(null),
        checkAccountStatuses(),
      ]);

      if (pluginsRes && pluginsRes.success) {
        const enrichedOfficial = (pluginsRes.official || []).map((p: GrokkiPlugin) => {
          const isLinked = p.requiresAccount ? (liveStatuses[p.id] ?? p.accountLinked ?? false) : true;
          return {
            ...p,
            accountLinked: isLinked,
            isEnabled: p.requiresAccount && !isLinked ? false : p.isEnabled,
          };
        });
        setOfficialPlugins(enrichedOfficial);
        setCustomPlugins(pluginsRes.custom || []);
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

  // Live MCP Registry Fetcher
  const fetchRegistry = useCallback(async (query: string = '') => {
    setIsRegistryLoading(true);
    try {
      if (window.jarvisAPI?.fetchMcpRegistry) {
        const res = await window.jarvisAPI.fetchMcpRegistry(query);
        if (res && res.success && Array.isArray(res.servers)) {
          setRegistryServers(res.servers);
        }
      }
    } catch (err) {
      console.warn('[PluginsTab] Registry fetch failed:', err);
    } finally {
      setIsRegistryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentView === 'add' && addMode === 'marketplace') {
      fetchRegistry(registrySearch);
    }
  }, [currentView, addMode, fetchRegistry]);

  const handleSearchChange = (val: string) => {
    setRegistrySearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchRegistry(val);
    }, 350);
  };

  const handleToggle = async (plugin: GrokkiPlugin, e: React.MouseEvent) => {
    e.stopPropagation();

    // Block enabling if account is required and not linked in Workspace settings
    if (!plugin.isEnabled && plugin.requiresAccount && !plugin.accountLinked) {
      showNotice(`⚠️ ${plugin.name} cannot be turned on. Connect your account in Workspace settings first.`);
      return;
    }

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
        const res = await window.jarvisAPI.togglePlugin(plugin.id, nextState);
        if (res && res.error) {
          showNotice(`⚠️ ${res.error}`);
          fetchPlugins();
          return;
        }
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

  // Real MCP Registry 1-Click Install
  const handleInstallFromRegistry = async (server: McpRegistryServer) => {
    setInstallingId(server.id);
    try {
      if (window.jarvisAPI?.addCustomPlugin) {
        const res = await window.jarvisAPI.addCustomPlugin({
          id: server.id,
          name: server.name,
          description: server.description,
          category: 'mcp',
          icon: 'mcp',
          imageUrl: server.imageUrl,
          repoUrl: server.repoUrl,
          mcpServer: {
            transport: server.transport || 'stdio',
            command: server.command,
            args: server.args,
          },
        });

        if (res?.success) {
          showNotice(`Installed ${server.name} successfully!`);
          setCurrentView('list');
          await fetchPlugins();
        } else {
          alert(res?.error || 'Failed to install plugin.');
        }
      }
    } catch (err: any) {
      alert(`Installation failed: ${err.message}`);
    } finally {
      setInstallingId(null);
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
          setAddError('Remote endpoint URL is required.');
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

  // Config JSON Batch Importer
  const handleImportJson = async () => {
    setAddError(null);
    if (!rawJsonConfig.trim()) {
      setAddError('Please paste a JSON configuration.');
      return;
    }

    try {
      const parsed = JSON.parse(rawJsonConfig.trim());
      const serversToInstall: Array<{ name: string; mcp: any }> = [];

      if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
        Object.entries(parsed.mcpServers).forEach(([srvName, srvConf]: [string, any]) => {
          serversToInstall.push({
            name: srvName,
            mcp: {
              transport: srvConf.transport || (srvConf.url ? 'streamable-http' : 'stdio'),
              command: srvConf.command || 'npx',
              args: srvConf.args || [],
              env: srvConf.env,
              url: srvConf.url,
              headers: srvConf.headers,
            },
          });
        });
      } else if (parsed.name && (parsed.command || parsed.url)) {
        serversToInstall.push({
          name: parsed.name,
          mcp: {
            transport: parsed.transport || (parsed.url ? 'streamable-http' : 'stdio'),
            command: parsed.command || 'npx',
            args: parsed.args || [],
            env: parsed.env,
            url: parsed.url,
            headers: parsed.headers,
          },
        });
      } else {
        throw new Error('Unrecognized format. Must contain "mcpServers" object or valid server schema.');
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

        showNotice(`Imported ${serversToInstall.length} MCP server(s)!`);
        setCurrentView('list');
        setRawJsonConfig('');
        await fetchPlugins();
      }
    } catch (err: any) {
      setAddError(err.message || 'Invalid JSON syntax.');
    }
  };

  // Real Icon & Image Renderer for Grokki Plugins
  const renderPluginIcon = (icon?: string, id?: string, imageUrl?: string | null) => {
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt="Plugin logo"
          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-200 dark:border-zinc-800"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      );
    }

    switch (icon || id) {
      case 'google':
      case 'google-workspace':
        return (
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center shrink-0 p-2 shadow-xs">
            <img src={googleLogo} alt="Google" className="w-full h-full object-contain" />
          </div>
        );
      case 'desktop':
      case 'desktop-automation':
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={ComputerTerminal01Icon} size={20} strokeWidth={2} className="text-blue-500 dark:text-blue-400" />
          </div>
        );
      case 'notion':
        return (
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center shrink-0 p-2 shadow-xs">
            <img src={notionLogo} alt="Notion" className="w-full h-full object-contain" />
          </div>
        );
      case 'obsidian':
        return (
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center shrink-0 p-2 shadow-xs">
            <img src={obsidianLogo} alt="Obsidian" className="w-full h-full object-contain" />
          </div>
        );
      case 'whatsapp':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 p-2">
            <img src={whatsappLogo} alt="WhatsApp" className="w-full h-full object-contain" />
          </div>
        );
      case 'git':
      case 'git-tools':
        return (
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center shrink-0 p-2 shadow-xs">
            <img src={githubLogo} alt="GitHub" className="w-full h-full object-contain dark:invert" />
          </div>
        );
      case 'memory':
      case 'persistent-memory':
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
            <HugeiconsIcon icon={Layers01Icon} size={20} strokeWidth={2} className="text-purple-400" />
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

          {/* Official Core Capability Packs (Real Grokki Features) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                Official {officialPlugins.length}
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              {officialPlugins.map((plugin) => {
                const isBlockedByAccount = plugin.requiresAccount && !plugin.accountLinked;
                return (
                  <div
                    key={plugin.id}
                    onClick={() => handleOpenConfigure(plugin)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                      plugin.isEnabled
                        ? 'bg-white dark:bg-[#0c0d10] border-gray-200/80 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-gray-50/70 dark:hover:bg-[#111216]'
                        : isBlockedByAccount
                        ? 'bg-gray-50/40 dark:bg-[#070709] border-gray-200/40 dark:border-zinc-850/50 opacity-60 hover:opacity-80'
                        : 'bg-gray-50/50 dark:bg-[#070709] border-gray-200/50 dark:border-zinc-800/60 opacity-60 hover:opacity-85'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-4">
                      {renderPluginIcon(plugin.icon, plugin.id)}

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-950 dark:text-white truncate">
                            {plugin.name}
                          </span>
                          {plugin.badge && (
                            <span className="text-[10px] font-medium text-blue-500 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                              {plugin.badge}
                            </span>
                          )}
                          {plugin.requiresAccount && (
                            plugin.accountLinked ? (
                              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/25">
                                Linked
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onNavigateTab) onNavigateTab('workspace');
                                }}
                                className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/25 flex items-center gap-1 cursor-pointer transition-colors"
                                title="Click to open Workspace settings and connect this account"
                              >
                                Not linked in Workspace ↗
                              </button>
                            )
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
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors relative shrink-0 focus:outline-none ${
                          isBlockedByAccount
                            ? 'bg-gray-200/60 dark:bg-zinc-800/60 border border-gray-300/60 dark:border-zinc-700/60 opacity-40 cursor-not-allowed'
                            : plugin.isEnabled
                            ? 'bg-gray-950 dark:bg-white text-white dark:text-gray-950 cursor-pointer'
                            : 'bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 cursor-pointer'
                        }`}
                        title={
                          isBlockedByAccount
                            ? `Cannot be enabled. Connect your ${plugin.accountName || 'account'} in Workspace settings first.`
                            : plugin.isEnabled
                            ? 'Disable plugin'
                            : 'Enable plugin'
                        }
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
                );
              })}
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
                  Connect external Model Context Protocol (MCP) servers or community packages with real-time tool execution.
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
                  <span>Browse MCP Registry & Install</span>
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
                      {renderPluginIcon(plugin.icon, plugin.id, plugin.imageUrl)}

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

      {/* VIEW 2: IN-TAB "ADD PLUGIN" (NO MODAL - REAL REGISTRY FETCHING WITH IMAGES) */}
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
              Install Model Context Protocol (MCP) Plugins
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Browse real community servers from the open MCP registry, connect a local subprocess command, or stream a remote HTTP endpoint.
            </p>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 w-fit">
            <button
              type="button"
              onClick={() => setAddMode('marketplace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                addMode === 'marketplace'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold shadow-xs'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Real MCP Registry
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
              Custom Local (stdio)
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

          {/* TAB 1: REAL MCP REGISTRY (WITH REAL AVATARS & LIVE DATA) */}
          {addMode === 'marketplace' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={15}
                    strokeWidth={2}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500"
                  />
                  <input
                    type="text"
                    placeholder="Search real MCP servers (playwright, postgres, github, sqlite...)"
                    value={registrySearch}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => fetchRegistry(registrySearch)}
                  disabled={isRegistryLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 text-xs font-medium text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <HugeiconsIcon icon={RefreshCwIcon} size={14} strokeWidth={2} className={isRegistryLoading ? 'animate-spin' : ''} />
                  <span>Refresh Registry</span>
                </button>
              </div>

              {isRegistryLoading ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <HugeiconsIcon icon={RefreshCwIcon} size={24} strokeWidth={2} className="animate-spin text-gray-400 dark:text-zinc-500 mb-2" />
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Fetching live servers from MCP registry...</p>
                </div>
              ) : registryServers.length === 0 ? (
                <div className="p-12 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 text-center">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">No matching MCP servers found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {registryServers.map((server) => {
                    const isInstalled = customPlugins.some((p) => p.id === server.id);
                    const isInstalling = installingId === server.id;

                    return (
                      <div
                        key={server.id}
                        className="p-4 rounded-xl border border-gray-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0c0d10] hover:border-gray-300 dark:hover:border-zinc-700 flex flex-col justify-between gap-4 transition-all"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start gap-3">
                            {server.imageUrl ? (
                              <img
                                src={server.imageUrl}
                                alt={server.name}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                                <HugeiconsIcon icon={PuzzleIcon} size={18} strokeWidth={2} className="text-gray-500" />
                              </div>
                            )}

                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-gray-950 dark:text-white truncate">
                                  {server.name}
                                </span>
                                {server.stars > 0 && (
                                  <span className="flex items-center gap-1 text-[10.5px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0">
                                    <HugeiconsIcon icon={StarIcon} size={10} strokeWidth={2} />
                                    <span>{server.stars >= 1000 ? `${(server.stars / 1000).toFixed(1)}k` : server.stars}</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-gray-400 dark:text-zinc-500 truncate">
                                {server.fullName || server.author}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                            {server.description}
                          </p>

                          <div className="font-mono text-[10.5px] text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-[#121318] p-2 rounded-lg border border-gray-100 dark:border-zinc-800 truncate">
                            {server.command} {server.args.join(' ')}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800/60">
                          {server.repoUrl ? (
                            <a
                              href={server.repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
                            >
                              <span>View Source</span>
                              <HugeiconsIcon icon={ArrowUpRight01Icon} size={12} strokeWidth={2} />
                            </a>
                          ) : <div />}

                          <button
                            type="button"
                            disabled={isInstalled || isInstalling}
                            onClick={() => handleInstallFromRegistry(server)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs select-none ${
                              isInstalled
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 cursor-default'
                                : 'bg-gray-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-gray-800 dark:hover:bg-zinc-200 cursor-pointer'
                            }`}
                          >
                            {isInstalled ? 'Installed' : isInstalling ? 'Installing...' : 'Install Plugin'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                    value="stdio (Local Subprocess)"
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

          {/* TAB 3: REMOTE HTTP / SSE MCP */}
          {addMode === 'remote' && (
            <form onSubmit={handleAddCustomPlugin} className="flex flex-col gap-4 max-w-2xl">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  Plugin Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Remote Cloud MCP, Vector DB Endpoint"
                  value={newPluginName}
                  onChange={(e) => setNewPluginName(e.target.value)}
                  className="w-full bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                  Remote Endpoint URL * (HTTP / SSE)
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

          {/* TAB 4: IMPORT CONFIG JSON */}
          {addMode === 'json' && (
            <div className="flex flex-col gap-4 max-w-2xl">
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed">
                Paste any standard MCP configuration JSON snippet below containing <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-mono text-[11px]">mcpServers</code>. Grokki will automatically register the commands, arguments, and environment variables.
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
                  onClick={handleImportJson}
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

      {/* VIEW 3: IN-TAB "CONFIGURE PLUGIN" (NO MODAL) */}
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
            {renderPluginIcon(configuringPlugin.icon, configuringPlugin.id, configuringPlugin.imageUrl)}
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
            {/* Real Settings Per Grokki Plugin */}
            {configuringPlugin.id === 'google-workspace' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800 dark:text-zinc-200">Calendar Agenda Sync</span>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">Sync upcoming events with Grokki's Today agenda timeline</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempConfig.syncCalendar !== false}
                    onChange={(e) => setTempConfig({ ...tempConfig, syncCalendar: e.target.checked })}
                    className="w-4 h-4 rounded accent-gray-900 dark:accent-white"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800 dark:text-zinc-200">Draft Email Authorization</span>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">Allow agent to compose drafts in Gmail without automatic sending</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempConfig.allowDraftEmails !== false}
                    onChange={(e) => setTempConfig({ ...tempConfig, allowDraftEmails: e.target.checked })}
                    className="w-4 h-4 rounded accent-gray-900 dark:accent-white"
                  />
                </div>
              </div>
            )}

            {configuringPlugin.id === 'desktop-automation' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-800 dark:text-zinc-200">
                    UI Interaction Timeout (milliseconds)
                  </label>
                  <input
                    type="number"
                    value={tempConfig.timeoutMs ?? 15000}
                    onChange={(e) =>
                      setTempConfig({ ...tempConfig, timeoutMs: parseInt(e.target.value) || 15000 })
                    }
                    className="w-full bg-gray-50 dark:bg-[#111216] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800 dark:text-zinc-200">Fallback to Vision Model</span>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">Capture desktop screenshot when accessibility elements are unavailable</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempConfig.fallbackToVision !== false}
                    onChange={(e) => setTempConfig({ ...tempConfig, fallbackToVision: e.target.checked })}
                    className="w-4 h-4 rounded accent-gray-900 dark:accent-white"
                  />
                </div>
              </div>
            )}

            {configuringPlugin.id === 'notion' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-800 dark:text-zinc-200">Auto-sync Document Pages</span>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">Keep recent Notion document links indexed in memory</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempConfig.autoSyncPages !== false}
                    onChange={(e) => setTempConfig({ ...tempConfig, autoSyncPages: e.target.checked })}
                    className="w-4 h-4 rounded accent-gray-900 dark:accent-white"
                  />
                </div>
              </div>
            )}

            {configuringPlugin.id === 'obsidian' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-800 dark:text-zinc-200">
                    Default Vault Directory
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. C:\Users\Username\Documents\ObsidianVault"
                    value={tempConfig.defaultVaultPath || ''}
                    onChange={(e) => setTempConfig({ ...tempConfig, defaultVaultPath: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-[#111216] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none font-mono"
                  />
                </div>
              </div>
            )}

            {configuringPlugin.id === 'git-tools' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-800 dark:text-zinc-200">
                    Max Diff Inspection Lines
                  </label>
                  <input
                    type="number"
                    value={tempConfig.maxDiffLines ?? 1500}
                    onChange={(e) =>
                      setTempConfig({ ...tempConfig, maxDiffLines: parseInt(e.target.value) || 1500 })
                    }
                    className="w-full bg-gray-50 dark:bg-[#111216] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-zinc-100 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Custom MCP Server Details */}
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
                    <span className="text-gray-500 dark:text-zinc-400 font-sans">Remote Endpoint URL:</span>
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
