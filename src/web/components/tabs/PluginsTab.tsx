import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  RefreshCwIcon,
  PuzzleIcon,
  Delete02Icon,
  Tick02Icon,
  Cancel01Icon,
  Search01Icon,
  ComputerTerminal01Icon,
  ArrowUpRight01Icon,
  User02Icon,
  ArrowLeft01Icon,
} from '@hugeicons/core-free-icons';
import { GrokkiPlugin, JarvisConfig } from '../../types/jarvis';
import { PluginBrandLogo } from '../PluginBrandLogo';

interface PluginsTabProps {
  config?: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
  onNavigateTab?: (tab: string) => void;
}

type MainViewMode = 'store' | 'installed' | 'custom-add';
type AddCustomMode = 'stdio' | 'remote';

interface CredentialField {
  name: string;
  label: string;
  placeholder?: string;
  isSecret?: boolean;
}

interface RegistryPluginItem {
  id: string;
  name: string;
  fullName?: string;
  description: string;
  category: string;
  imageUrl?: string | null;
  authPortalUrl?: string | null;
  authType?: 'google-oauth' | 'mcp-oauth' | 'mcp-remote' | 'api-key' | 'stdio-zero' | 'native';
  officialPluginId?: string;
  mcpUrl?: string | null;
  command?: string | null;
  args?: string[];
  transport?: 'stdio' | 'streamable-http' | 'sse';
  requiredEnv?: CredentialField[];
  requiredHeaders?: CredentialField[];
}

const STORE_CATEGORIES = [
  'Popular',
  'New & Noteworthy',
  'Small Business',
  'Communication',
  'Creativity',
  'Developer Tools',
  'Healthcare',
  'Finance',
  'Travel',
  'Entertainment',
  'Education',
  'Sales',
];

export const PluginsTab: React.FC<PluginsTabProps> = ({ onNavigateTab }) => {
  const [viewMode, setViewMode] = useState<MainViewMode>('store');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [officialPlugins, setOfficialPlugins] = useState<GrokkiPlugin[]>([]);
  const [customPlugins, setCustomPlugins] = useState<GrokkiPlugin[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // Live Registry & Search State
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryServers, setRegistryServers] = useState<RegistryPluginItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isRegistryLoading, setIsRegistryLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Active Connection / OAuth Modal State
  const [connectingItem, setConnectingItem] = useState<RegistryPluginItem | null>(null);
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [customBearerToken, setCustomBearerToken] = useState('');
  const [showManualTokenInput, setShowManualTokenInput] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Configure Connected Plugin Drawer State
  const [configuringPlugin, setConfiguringPlugin] = useState<GrokkiPlugin | null>(null);

  // Custom Add Form State
  const [addCustomMode, setAddCustomMode] = useState<AddCustomMode>('remote');
  const [newPluginName, setNewPluginName] = useState('');
  const [newPluginDesc, setNewPluginDesc] = useState('');
  const [newMcpCommand, setNewMcpCommand] = useState('npx');
  const [newMcpArgs, setNewMcpArgs] = useState('-y\n');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [newRemoteAuthHeader, setNewRemoteAuthHeader] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
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
        statuses['git-tools'] = Boolean(res?.connected);
      }
    } catch {}

    return statuses;
  };

  const fetchPlugins = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  // Listen for live Google OAuth completion
  useEffect(() => {
    if (!window.jarvisAPI?.onGoogleConnected) return;
    const unsub = window.jarvisAPI.onGoogleConnected(() => {
      fetchPlugins();
      showNotice('Google account connected successfully!');
      setConnectingItem(null);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [fetchPlugins]);

  // Fetch from Live Official MCP Registry + Curated Directory
  const fetchRegistry = useCallback(async (query: string = '', cursor: string = '') => {
    if (cursor) setIsLoadingMore(true);
    else setIsRegistryLoading(true);

    try {
      if (window.jarvisAPI?.fetchMcpRegistry) {
        const res: any = await (window.jarvisAPI.fetchMcpRegistry as any)(
          cursor ? { query, cursor } : query
        );
        if (res && res.success && Array.isArray(res.servers)) {
          setNextCursor(res.nextCursor || null);
          if (cursor) {
            setRegistryServers((prev) => {
              const seen = new Set(prev.map((x) => x.id));
              const added = res.servers.filter((x: RegistryPluginItem) => !seen.has(x.id));
              return [...prev, ...added];
            });
          } else {
            setRegistryServers(res.servers);
          }
        }
      }
    } catch (err) {
      console.warn('[PluginsTab] Registry fetch failed:', err);
    } finally {
      setIsRegistryLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistry('');
  }, [fetchRegistry]);

  // Auto-open Connect modal when navigated from Grokki Chat @plugin menu
  useEffect(() => {
    if (registryServers.length === 0) return;
    try {
      const targetId = localStorage.getItem('grokki_open_plugin_connect');
      if (targetId) {
        localStorage.removeItem('grokki_open_plugin_connect');
        const found = registryServers.find(
          (s) => s.id.toLowerCase() === targetId.toLowerCase() || s.name.toLowerCase() === targetId.toLowerCase()
        );
        if (found) {
          setConnectingItem(found);
          setCredentialValues({});
          setCustomBearerToken('');
          setShowManualTokenInput(false);
          setConnectError(null);
        }
      }
    } catch (_) {}
  }, [registryServers]);

  const handleSearchChange = (val: string) => {
    setRegistrySearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchRegistry(val, '');
    }, 300);
  };

  // Check if a plugin is genuinely connected & enabled
  const isConnectedPlugin = useCallback(
    (item: RegistryPluginItem) => {
      if (item.officialPluginId) {
        const off = officialPlugins.find((p) => p.id === item.officialPluginId);
        if (!off) return false;
        return off.requiresAccount ? Boolean(off.accountLinked && off.isEnabled) : Boolean(off.isEnabled);
      }
      return customPlugins.some((p) => p.id === item.id && p.isEnabled);
    },
    [customPlugins, officialPlugins]
  );

  // Open the Connect / Authorization Modal when clicking + or an unconnected card
  const handleInitiateConnect = (item: RegistryPluginItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If already connected, open configuration drawer
    if (isConnectedPlugin(item)) {
      const match =
        officialPlugins.find((p) => p.id === (item.officialPluginId || item.id)) ||
        customPlugins.find((p) => p.id === item.id);
      if (match) {
        setConfiguringPlugin(match);
        return;
      }
    }

    setConnectingItem(item);
    setCredentialValues({});
    setCustomBearerToken('');
    setShowManualTokenInput(false);
    setConnectError(null);
  };

  // Execute the REAL OAuth Redirect / API Token / MCP Connection
  const handleConfirmConnect = async (useManualToken = false) => {
    if (!connectingItem) return;
    setIsConnecting(true);
    setConnectError(null);

    try {
      // 1. Google OAuth Flow (Gmail / Google Drive)
      if (connectingItem.authType === 'google-oauth') {
        if (window.jarvisAPI?.connectGoogle) {
          const res = await window.jarvisAPI.connectGoogle();
          if (res?.success || res?.connected) {
            if (window.jarvisAPI?.togglePlugin && connectingItem.officialPluginId) {
              await window.jarvisAPI.togglePlugin(connectingItem.officialPluginId, true);
            }
            await fetchPlugins();
            showNotice(`Connected ${connectingItem.name} to your Google account!`);
            setConnectingItem(null);
          } else {
            setConnectError(res?.error || 'Google sign-in was not completed.');
          }
        }
        setIsConnecting(false);
        return;
      }

      // 2. Native Built-in Plugin (e.g. Remote Desktop Commander)
      if (connectingItem.authType === 'native' && connectingItem.officialPluginId) {
        if (window.jarvisAPI?.togglePlugin) {
          await window.jarvisAPI.togglePlugin(connectingItem.officialPluginId, true);
          await fetchPlugins();
          showNotice(`Enabled ${connectingItem.name}!`);
          setConnectingItem(null);
        }
        setIsConnecting(false);
        return;
      }

      // 3. Validate required credentials if API-key based
      const envObj: Record<string, string> = {};
      if (Array.isArray(connectingItem.requiredEnv) && connectingItem.requiredEnv.length > 0) {
        for (const field of connectingItem.requiredEnv) {
          const val = (credentialValues[field.name] || '').trim();
          if (!val && !field.label.toLowerCase().includes('optional')) {
            setConnectError(`Please provide ${field.label} to connect ${connectingItem.name}.`);
            setIsConnecting(false);
            return;
          }
          if (val) envObj[field.name] = val;
        }
      }

      const headersObj: Record<string, string> = {};
      if (Array.isArray(connectingItem.requiredHeaders) && connectingItem.requiredHeaders.length > 0) {
        for (const field of connectingItem.requiredHeaders) {
          const val = (credentialValues[field.name] || '').trim();
          if (!val) {
            setConnectError(`Please provide ${field.label} to connect ${connectingItem.name}.`);
            setIsConnecting(false);
            return;
          }
          headersObj[field.name] =
            field.name.toLowerCase() === 'authorization' && !val.toLowerCase().startsWith('bearer ')
              ? `Bearer ${val}`
              : val;
        }
      }

      if (useManualToken && customBearerToken.trim()) {
        const raw = customBearerToken.trim();
        headersObj['Authorization'] = raw.toLowerCase().startsWith('bearer ') ? raw : `Bearer ${raw}`;
      }

      // 4. Call Backend to Run OAuth 2.1 Redirect Flow or Connect MCP Server & Verify Tools
      if (window.jarvisAPI?.addCustomPlugin) {
        const res: any = await window.jarvisAPI.addCustomPlugin({
          id: connectingItem.id,
          name: connectingItem.name,
          description: connectingItem.description,
          category: connectingItem.category,
          icon: connectingItem.id,
          imageUrl: connectingItem.imageUrl || undefined,
          repoUrl: connectingItem.authPortalUrl || undefined,
          authType: useManualToken ? 'api-key' : connectingItem.authType,
          authPortalUrl: connectingItem.authPortalUrl,
          mcpUrl: connectingItem.mcpUrl,
          mcpServer: connectingItem.mcpUrl
            ? {
                transport: (connectingItem.transport as any) || 'streamable-http',
                url: connectingItem.mcpUrl,
                headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
              }
            : {
                transport: 'stdio',
                command: connectingItem.command || 'npx',
                args: connectingItem.args || ['-y', connectingItem.id],
                env: Object.keys(envObj).length > 0 ? envObj : undefined,
              },
        } as any);

        if (res?.success) {
          await fetchPlugins();
          const toolsLabel = res.toolsCount ? ` (${res.toolsCount} tools active)` : '';
          showNotice(`Connected to ${connectingItem.name}${toolsLabel}!`);
          setConnectingPluginFromConnect(res.plugin);
          setConnectingItem(null);
        } else if (res?.requiresCredentials) {
          setShowManualTokenInput(true);
          setConnectError(
            res.error ||
              `${connectingItem.name} requires an API token or personal access token to authorize.`
          );
        } else {
          setConnectError(res?.error || `Failed to connect to ${connectingItem.name}.`);
        }
      }
    } catch (err: any) {
      setConnectError(err.message || 'Connection failed.');
    } finally {
      setIsConnecting(false);
    }
  };

  const setConnectingPluginFromConnect = (plugin?: GrokkiPlugin) => {
    if (plugin) {
      // Optional: keep user in store with green check
    }
  };

  const handleOpenExternal = (url?: string | null) => {
    if (!url) return;
    if (window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDeleteCustom = async (pluginId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (window.jarvisAPI?.deletePlugin) {
        const res = await window.jarvisAPI.deletePlugin(pluginId);
        if (res?.success) {
          showNotice(`Disconnected and removed ${pluginId}`);
          if (configuringPlugin?.id === pluginId) setConfiguringPlugin(null);
          await fetchPlugins();
        }
      }
    } catch (err: any) {
      alert(`Failed to remove: ${err.message}`);
    }
  };

  // Power User Custom MCP Form Submit
  const handleAddCustomPlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newPluginName.trim()) {
      setAddError('Server name is required.');
      return;
    }

    setIsConnecting(true);
    try {
      let mcpServerConfig: any = null;
      if (addCustomMode === 'remote') {
        if (!newRemoteUrl.trim()) {
          setAddError('Remote MCP Endpoint URL is required.');
          setIsConnecting(false);
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
      } else {
        const argsArray = newMcpArgs
          .trim()
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        mcpServerConfig = {
          transport: 'stdio',
          command: newMcpCommand.trim() || 'npx',
          args: argsArray,
        };
      }

      if (window.jarvisAPI?.addCustomPlugin) {
        const res: any = await window.jarvisAPI.addCustomPlugin({
          name: newPluginName.trim(),
          description: newPluginDesc.trim() || 'Custom MCP Server',
          category: 'Developer Tools',
          mcpUrl: addCustomMode === 'remote' ? newRemoteUrl.trim() : undefined,
          mcpServer: mcpServerConfig,
        } as any);

        if (res?.success) {
          showNotice(`Connected "${newPluginName.trim()}" (${res.toolsCount || 0} tools)!`);
          setViewMode('store');
          setNewPluginName('');
          setNewPluginDesc('');
          setNewRemoteUrl('');
          setNewRemoteAuthHeader('');
          await fetchPlugins();
        } else {
          setAddError(res?.error || 'Failed to connect to server.');
        }
      }
    } catch (err: any) {
      setAddError(err.message || 'Failed to connect.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Group servers by Category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, RegistryPluginItem[]> = {};
    for (const cat of STORE_CATEGORIES) {
      groups[cat] = [];
    }
    for (const item of registryServers) {
      const cat = item.category && groups[item.category] ? item.category : 'Developer Tools';
      groups[cat].push(item);
    }
    return groups;
  }, [registryServers]);

  // Render a single ChatGPT-style Plugin Row
  const renderPluginRow = (item: RegistryPluginItem) => {
    const connected = isConnectedPlugin(item);

    return (
      <div
        key={item.id}
        onClick={(e) => handleInitiateConnect(item, e)}
        className="group flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3.5 min-w-0 pr-3">
          <PluginBrandLogo
            id={item.id}
            name={item.name}
            imageUrl={item.imageUrl}
            className="w-10 h-10"
          />

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                {item.name}
              </span>
              {connected && (
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                  Connected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate mt-0.5">
              {item.description}
            </p>
          </div>
        </div>

        {/* Right Action Button */}
        <button
          type="button"
          onClick={(e) => handleInitiateConnect(item, e)}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
            connected
              ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20'
              : 'text-gray-500 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'
          }`}
          title={connected ? `Manage ${item.name}` : `Connect ${item.name}`}
        >
          {connected ? (
            <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.5} />
          ) : (
            <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={2} />
          )}
        </button>
      </div>
    );
  };

  const activeConnectedCount =
    officialPlugins.filter((p) => (p.requiresAccount ? p.accountLinked && p.isEnabled : p.isEnabled))
      .length + customPlugins.filter((p) => p.isEnabled).length;

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-[#070709] overflow-hidden select-none">
      {/* Toast Notice */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-xs font-medium shadow-2xl flex items-center gap-2">
          <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.5} className="text-emerald-500" />
          <span>{notice}</span>
        </div>
      )}

      {/* TOP HEADER BAR (Matches ChatGPT Plugins Header) */}
      <div className="px-6 py-3.5 flex items-center justify-between gap-4 bg-white dark:bg-[#070709] shrink-0">
        {/* Left: [ Plugins ] [ Skills ] Toggle Pills */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setViewMode('store');
              setSelectedCategory(null);
            }}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-black/10 dark:bg-white/15 text-gray-900 dark:text-white cursor-pointer"
          >
            Plugins
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab?.('skills')}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            Skills
          </button>
        </div>

        {/* Right: Connected Filter & Add Custom Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'installed' ? 'store' : 'installed')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              viewMode === 'installed'
                ? 'bg-black/10 dark:bg-white/15 text-gray-900 dark:text-white font-semibold'
                : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Connected ({activeConnectedCount})
          </button>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'custom-add' ? 'store' : 'custom-add')}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-950 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span>Add</span>
            <HugeiconsIcon icon={Add01Icon} size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* MAIN SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto px-6 pb-16">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pt-2">
          {/* Search Input Bar (Centered like ChatGPT) */}
          {viewMode === 'store' && (
            <div className="relative w-full">
              <HugeiconsIcon
                icon={Search01Icon}
                size={15}
                strokeWidth={2}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search plugins"
                value={registrySearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-full bg-gray-100/80 dark:bg-[#14151a] border border-gray-200/80 dark:border-white/[0.08] text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none focus:border-gray-400 dark:focus:border-white/20 transition-all"
              />
              {registrySearch && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          )}

          {/* VIEW 1: SEARCH RESULTS */}
          {viewMode === 'store' && registrySearch.trim() ? (
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Results for &ldquo;{registrySearch}&rdquo; ({registryServers.length})
                </h2>
                {isRegistryLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <HugeiconsIcon icon={RefreshCwIcon} size={13} strokeWidth={2} className="animate-spin" />
                    <span>Searching live MCP registry...</span>
                  </div>
                )}
              </div>

              {registryServers.length === 0 && !isRegistryLoading ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    No matching plugins found in registry.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  {registryServers.map((server) => renderPluginRow(server))}
                </div>
              )}
            </div>
          ) : viewMode === 'store' && selectedCategory ? (
            /* VIEW 2: SINGLE CATEGORY DRILLDOWN */
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
                </button>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {selectedCategory}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                {(groupedByCategory[selectedCategory] || []).map((plugin) =>
                  renderPluginRow(plugin)
                )}
              </div>
            </div>
          ) : viewMode === 'installed' ? (
            /* VIEW 3: CONNECTED PLUGINS */
            <div className="flex flex-col gap-6 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-950 dark:text-white">
                    Connected Plugins
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Authenticated accounts and active Model Context Protocol servers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('store')}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-black/5 dark:bg-white/10 text-gray-700 dark:text-zinc-200 cursor-pointer"
                >
                  Browse Store
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {officialPlugins
                  .filter((p) => (p.requiresAccount ? p.accountLinked && p.isEnabled : p.isEnabled))
                  .map((plugin) => (
                    <div
                      key={plugin.id}
                      onClick={() => setConfiguringPlugin(plugin)}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#111217] cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <PluginBrandLogo id={plugin.id} name={plugin.name} className="w-10 h-10" />
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white block truncate">
                            {plugin.name}
                          </span>
                          <span className="text-xs text-emerald-500 font-medium">
                            Connected &amp; Active
                          </span>
                        </div>
                      </div>
                      <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.5} className="text-emerald-500 shrink-0" />
                    </div>
                  ))}

                {customPlugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    onClick={() => setConfiguringPlugin(plugin)}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#111217] cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <PluginBrandLogo
                        id={plugin.id}
                        name={plugin.name}
                        imageUrl={plugin.imageUrl}
                        className="w-10 h-10"
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white block truncate">
                          {plugin.name}
                        </span>
                        <span className="text-xs text-emerald-500 font-medium">
                          Connected {(plugin as any).toolsCount ? `· ${(plugin as any).toolsCount} tools` : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCustom(plugin.id, e)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 cursor-pointer"
                      title="Disconnect & Remove"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : viewMode === 'custom-add' ? (
            /* VIEW 4: ADD CUSTOM SERVER */
            <div className="flex flex-col gap-5 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-950 dark:text-white">
                    Connect Custom MCP Server
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Connect any remote Streamable HTTP / SSE MCP server or local command.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('store')}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-black/5 dark:bg-white/10 text-gray-700 dark:text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#14151a] w-fit">
                <button
                  type="button"
                  onClick={() => setAddCustomMode('remote')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    addCustomMode === 'remote'
                      ? 'bg-white dark:bg-[#22232a] text-gray-900 dark:text-white font-semibold'
                      : 'text-gray-500 dark:text-zinc-400'
                  }`}
                >
                  Remote Server (OAuth / HTTP / SSE)
                </button>
                <button
                  type="button"
                  onClick={() => setAddCustomMode('stdio')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    addCustomMode === 'stdio'
                      ? 'bg-white dark:bg-[#22232a] text-gray-900 dark:text-white font-semibold'
                      : 'text-gray-500 dark:text-zinc-400'
                  }`}
                >
                  Local Package (npx / uvx)
                </button>
              </div>

              {addError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddCustomPlugin} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1 block">
                    Plugin Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Internal API"
                    value={newPluginName}
                    onChange={(e) => setNewPluginName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#14151a] border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1 block">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="What tools or data does this plugin provide?"
                    value={newPluginDesc}
                    onChange={(e) => setNewPluginDesc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#14151a] border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>

                {addCustomMode === 'remote' ? (
                  <>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1 block">
                        Remote MCP Server URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://mcp.example.com/mcp"
                        value={newRemoteUrl}
                        onChange={(e) => setNewRemoteUrl(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#14151a] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white outline-none"
                      />
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        If the server uses OAuth 2.1, Grokki will automatically open your browser to sign in.
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1 block">
                        Bearer Token (Optional if using OAuth)
                      </label>
                      <input
                        type="password"
                        placeholder="Optional Authorization token"
                        value={newRemoteAuthHeader}
                        onChange={(e) => setNewRemoteAuthHeader(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#14151a] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1 block">
                        Runner Command
                      </label>
                      <input
                        type="text"
                        placeholder="npx or uvx"
                        value={newMcpCommand}
                        onChange={(e) => setNewMcpCommand(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#14151a] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1 block">
                        Arguments (one per line)
                      </label>
                      <textarea
                        rows={3}
                        value={newMcpArgs}
                        onChange={(e) => setNewMcpArgs(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#14151a] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white outline-none resize-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="mt-2 py-2.5 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting & Verifying...' : 'Connect Server'}
                </button>
              </form>
            </div>
          ) : (
            /* VIEW 5: FULL CATEGORIZED CHATGPT-STYLE STOREFRONT */
            <div className="flex flex-col gap-9 pt-2">
              {STORE_CATEGORIES.map((category) => {
                const items = groupedByCategory[category] || [];
                if (items.length === 0) return null;
                const previewItems = items.slice(0, 6);

                return (
                  <div key={category} className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className="flex items-center gap-1.5 text-left w-fit group cursor-pointer"
                    >
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {category}
                      </span>
                      <span className="text-gray-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform">
                        &rsaquo;
                      </span>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                      {previewItems.map((plugin) => renderPluginRow(plugin))}
                    </div>
                  </div>
                );
              })}

              {/* Load More from Live Official MCP Registry */}
              {nextCursor && (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    disabled={isLoadingMore}
                    onClick={() => fetchRegistry(registrySearch, nextCursor)}
                    className="flex items-center gap-2 px-5 py-2 rounded-full bg-black/5 dark:bg-white/[0.07] hover:bg-black/10 dark:hover:bg-white/12 text-xs font-medium text-gray-700 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    {isLoadingMore && (
                      <HugeiconsIcon icon={RefreshCwIcon} size={13} strokeWidth={2} className="animate-spin" />
                    )}
                    <span>{isLoadingMore ? 'Loading more plugins...' : 'Discover More Plugins from Registry'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          REAL OAUTH / ACCOUNT CONNECTION MODAL (WHEN CLICKING + ON A PLUGIN)
         ===================================================================== */}
      {connectingItem && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !isConnecting && setConnectingItem(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#121318] border border-gray-200 dark:border-white/10 p-6 flex flex-col gap-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <PluginBrandLogo
                  id={connectingItem.id}
                  name={connectingItem.name}
                  imageUrl={connectingItem.imageUrl}
                  className="w-12 h-12"
                />
                <div>
                  <h3 className="text-base font-semibold text-gray-950 dark:text-white">
                    Connect {connectingItem.name}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-zinc-400">
                    {connectingItem.category}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={isConnecting}
                onClick={() => setConnectingItem(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
              {connectingItem.description}
            </p>

            {/* Endpoint / Package Info */}
            {connectingItem.mcpUrl && (
              <div className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/[0.06] flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-gray-500 dark:text-zinc-400 truncate">
                  {connectingItem.mcpUrl}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-500 dark:text-zinc-300 shrink-0">
                  {connectingItem.authType === 'mcp-oauth' ? 'OAuth 2.1' : 'Remote MCP'}
                </span>
              </div>
            )}

            {/* Required API Key / Environment Variable Inputs */}
            {Array.isArray(connectingItem.requiredEnv) && connectingItem.requiredEnv.length > 0 && (
              <div className="flex flex-col gap-3">
                {connectingItem.authPortalUrl && (
                  <button
                    type="button"
                    onClick={() => handleOpenExternal(connectingItem.authPortalUrl)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.09] border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-800 dark:text-zinc-200 transition-colors cursor-pointer"
                  >
                    <span>1. Open {connectingItem.name} Portal to get your token</span>
                    <HugeiconsIcon icon={ArrowUpRight01Icon} size={15} strokeWidth={2} />
                  </button>
                )}

                {connectingItem.requiredEnv.map((field) => (
                  <div key={field.name} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                      {field.label}
                    </label>
                    <input
                      type={field.isSecret ? 'password' : 'text'}
                      placeholder={field.placeholder || field.name}
                      value={credentialValues[field.name] || ''}
                      onChange={(e) =>
                        setCredentialValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white outline-none focus:border-gray-400 dark:focus:border-white/25"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Required HTTP Headers */}
            {Array.isArray(connectingItem.requiredHeaders) &&
              connectingItem.requiredHeaders.length > 0 && (
                <div className="flex flex-col gap-3">
                  {connectingItem.authPortalUrl && (
                    <button
                      type="button"
                      onClick={() => handleOpenExternal(connectingItem.authPortalUrl)}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.09] border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <span>1. Open {connectingItem.name} Developer Portal</span>
                      <HugeiconsIcon icon={ArrowUpRight01Icon} size={15} strokeWidth={2} />
                    </button>
                  )}

                  {connectingItem.requiredHeaders.map((field) => (
                    <div key={field.name} className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                        {field.label}
                      </label>
                      <input
                        type={field.isSecret ? 'password' : 'text'}
                        placeholder={field.placeholder || field.name}
                        value={credentialValues[field.name] || ''}
                        onChange={(e) =>
                          setCredentialValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white outline-none focus:border-gray-400 dark:focus:border-white/25"
                      />
                    </div>
                  ))}
                </div>
              )}

            {/* Fallback Manual Token Input for OAuth Servers if needed */}
            {showManualTokenInput && (
              <div className="flex flex-col gap-2 pt-1">
                {connectingItem.authPortalUrl && (
                  <button
                    type="button"
                    onClick={() => handleOpenExternal(connectingItem.authPortalUrl)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-200 cursor-pointer"
                  >
                    <span>Open {connectingItem.name} to copy Access Token</span>
                    <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={2} />
                  </button>
                )}
                <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                  Access Token / API Key
                </label>
                <input
                  type="password"
                  placeholder="Paste your Bearer token or API key..."
                  value={customBearerToken}
                  onChange={(e) => setCustomBearerToken(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white outline-none"
                />
              </div>
            )}

            {/* Error Alert */}
            {connectError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs leading-relaxed">
                {connectError}
              </div>
            )}

            {/* Primary Connect Button */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => handleConfirmConnect(showManualTokenInput)}
                className="w-full py-2.5 px-4 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <HugeiconsIcon icon={RefreshCwIcon} size={14} strokeWidth={2.2} className="animate-spin" />
                    <span>
                      {connectingItem.authType === 'mcp-oauth' ||
                      connectingItem.authType === 'google-oauth'
                        ? 'Waiting for browser authorization...'
                        : 'Connecting to server...'}
                    </span>
                  </>
                ) : connectingItem.authType === 'mcp-oauth' && !showManualTokenInput ? (
                  <>
                    <span>Continue to {connectingItem.name}</span>
                    <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={2.2} />
                  </>
                ) : connectingItem.authType === 'google-oauth' ? (
                  <>
                    <span>Continue with Google</span>
                    <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={2.2} />
                  </>
                ) : (
                  <span>Connect &amp; Verify {connectingItem.name}</span>
                )}
              </button>

              {connectingItem.authType === 'mcp-oauth' && !showManualTokenInput && (
                <button
                  type="button"
                  onClick={() => setShowManualTokenInput(true)}
                  className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 text-center py-1 cursor-pointer"
                >
                  Or connect using a Personal Access Token instead
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CONNECTED PLUGIN DRAWER (INSPECT TOOLS & DISCONNECT)
         ===================================================================== */}
      {configuringPlugin && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
          onClick={() => setConfiguringPlugin(null)}
        >
          <div
            className="w-full max-w-md h-full bg-white dark:bg-[#0c0d10] border-l border-gray-200 dark:border-white/10 p-6 flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-5 overflow-y-auto pr-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PluginBrandLogo
                    id={configuringPlugin.id}
                    name={configuringPlugin.name}
                    imageUrl={configuringPlugin.imageUrl}
                    className="w-11 h-11"
                  />
                  <div>
                    <h2 className="text-base font-semibold text-gray-950 dark:text-white">
                      {configuringPlugin.name}
                    </h2>
                    <span className="text-xs text-emerald-500 font-medium">
                      Connected &amp; Active
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfiguringPlugin(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                {configuringPlugin.description}
              </p>

              {/* Discovered Live Tools */}
              {Array.isArray((configuringPlugin as any).tools) &&
                (configuringPlugin as any).tools.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                      Available Tools ({(configuringPlugin as any).tools.length})
                    </span>
                    <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                      {(configuringPlugin as any).tools.map((t: any) => (
                        <div
                          key={t.name}
                          className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/70 dark:border-white/[0.06]"
                        >
                          <span className="text-xs font-mono font-semibold text-gray-900 dark:text-white block">
                            {t.name}
                          </span>
                          {t.description && (
                            <span className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-2 mt-0.5 block">
                              {t.description}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
              {configuringPlugin.category !== 'official' ? (
                <button
                  type="button"
                  onClick={(e) => handleDeleteCustom(configuringPlugin.id, e)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} />
                  <span>Disconnect Plugin</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setConfiguringPlugin(null)}
                className="px-4 py-2 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginsTab;
