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
  ArrowUpRight01Icon,
  InformationCircleIcon,
  User02Icon,
} from '@hugeicons/core-free-icons';
import { GrokkiPlugin, JarvisConfig } from '../../types/jarvis';

// Imported local logos
import googleLogo from '../../assets/logos/google.png';
import githubLogo from '../../assets/logos/github.png';
import notionLogo from '../../assets/logos/notion.png';
import obsidianLogo from '../../assets/logos/obsidian.png';
import whatsappLogo from '../../assets/logos/whatsapp.svg';
import spotifyLogo from '../../assets/logos/spotify.svg';

interface PluginsTabProps {
  config?: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
  onNavigateTab?: (tab: string) => void;
}

type MainViewMode = 'store' | 'installed' | 'custom-add';
type AddCustomMode = 'stdio' | 'remote' | 'json';

interface RegistryPluginItem {
  id: string;
  name: string;
  description: string;
  category: string;
  author?: string;
  imageUrl?: string;
  command?: string;
  args?: string[];
  transport?: 'stdio' | 'streamable-http';
  isOfficial?: boolean;
  officialPluginId?: string;
  requiresAccount?: boolean;
}

// Crisp Vector Brand Logos for the Marketplace
const PluginBrandLogo: React.FC<{ id: string; name?: string; imageUrl?: string; className?: string }> = ({
  id,
  name = '',
  imageUrl,
  className = 'w-10 h-10',
}) => {
  const normId = id.toLowerCase();

  // If explicit imageUrl provided from server and not local fallback
  if (imageUrl && !normId.includes('custom') && !normId.includes('plugin-')) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${className} rounded-xl object-contain shrink-0 bg-white/5 border border-white/10 p-1`}
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  // Gmail
  if (normId === 'gmail' || normId.includes('gmail')) {
    return (
      <div className={`${className} rounded-xl bg-white dark:bg-[#14151a] border border-gray-200 dark:border-white/10 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" fill="#E8E8E8" />
          <path d="M20 4L12 11 4 4" fill="#EA4335" />
          <path d="M4 4h4v7L4 7z" fill="#C5221F" />
          <path d="M20 4h-4v7l4-4z" fill="#C5221F" />
          <path d="M2 6l10 7 10-7v12H2z" fill="#EA4335" />
          <path d="M2 18l7-6-7-5z" fill="#FBBC04" />
          <path d="M22 18l-7-6 7-5z" fill="#34A853" />
          <path d="M2 6v12h2V6z" fill="#4285F4" />
          <path d="M20 6v12h2V6z" fill="#4285F4" />
        </svg>
      </div>
    );
  }

  // Google Drive / Workspace
  if (normId.includes('drive') || normId === 'google-workspace') {
    return (
      <div className={`${className} rounded-xl bg-white dark:bg-[#14151a] border border-gray-200 dark:border-white/10 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <svg viewBox="0 0 87.3 78" className="w-full h-full">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
        </svg>
      </div>
    );
  }

  // GitHub
  if (normId.includes('github') || normId === 'git-tools') {
    return (
      <div className={`${className} rounded-xl bg-black dark:bg-[#181920] border border-gray-200 dark:border-white/10 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <img src={githubLogo} alt="GitHub" className="w-full h-full object-contain invert dark:invert-0" />
      </div>
    );
  }

  // Supabase
  if (normId.includes('supabase')) {
    return (
      <div className={`${className} rounded-xl bg-[#1c1c1c] border border-emerald-500/20 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <svg viewBox="0 0 109 113" className="w-5 h-5">
          <path
            d="M65.4 112.5c-2.3 2.9-7.1 1.7-7.7-2L48 57.7h45.6c4.6 0 7.3 5 4.8 8.9L65.4 112.5z"
            fill="#3ECF8E"
          />
          <path
            d="M43.6.5c2.3-2.9 7.1-1.7 7.7 2L61 55.3H15.4c-4.6 0-7.3-5-4.8-8.9L43.6.5z"
            fill="#3ECF8E"
            fillOpacity="0.75"
          />
        </svg>
      </div>
    );
  }

  // ElevenLabs
  if (normId.includes('elevenlabs')) {
    return (
      <div className={`${className} rounded-xl bg-black dark:bg-white text-white dark:text-black border border-white/10 flex items-center justify-center p-2.5 shrink-0 shadow-xs`}>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-4.5 bg-current rounded-full" />
          <div className="w-1.5 h-4.5 bg-current rounded-full" />
        </div>
      </div>
    );
  }

  // Spotify
  if (normId.includes('spotify')) {
    return (
      <div className={`${className} rounded-xl bg-[#121212] border border-emerald-500/20 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <img src={spotifyLogo} alt="Spotify" className="w-full h-full object-contain" />
      </div>
    );
  }

  // Dropbox
  if (normId.includes('dropbox')) {
    return (
      <div className={`${className} rounded-xl bg-[#0061FE] border border-blue-400/30 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
          <path d="M6 2l6 4-6 4-6-4 6-4zm12 0l6 4-6 4-6-4 6-4zM0 10l6 4 6-4-6-4-6 4zm24 0l-6-4-6 4 6 4 6-4zM6 14.5l6 4 6-4-6-4-6 4zm6 5.5l-6-4-1.5 1 7.5 5 7.5-5-1.5-1-6 4z" />
        </svg>
      </div>
    );
  }

  // Linear
  if (normId.includes('linear')) {
    return (
      <div className={`${className} rounded-xl bg-[#5E6AD2] border border-indigo-400/30 flex items-center justify-center p-2 shrink-0 shadow-xs text-white`}>
        <svg viewBox="0 0 100 100" className="w-5 h-5" fill="currentColor">
          <path d="M1.2 50a48.8 48.8 0 0 0 48.8 48.8c12 0 23-4.3 31.6-11.5L5.7 18.4A48.6 48.6 0 0 0 1.2 50zm17.2-37.3l81.6 81.6A48.8 48.8 0 0 0 98.8 50a48.8 48.8 0 0 0-48.8-48.8c-12 0-23 4.3-31.6 11.5z" />
        </svg>
      </div>
    );
  }

  // Figma
  if (normId.includes('figma')) {
    return (
      <div className={`${className} rounded-xl bg-[#1e1e1e] border border-white/10 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <svg viewBox="0 0 38 57" className="w-4 h-5">
          <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE" />
          <path d="M0 47.5a9.5 9.5 0 0 1 9.5-9.5H19v9.5a9.5 9.5 0 1 1-19 0z" fill="#0ACF83" />
          <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#FF7262" />
          <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E" />
          <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF" />
        </svg>
      </div>
    );
  }

  // Slack
  if (normId.includes('slack')) {
    return (
      <div className={`${className} rounded-xl bg-[#4A154B] border border-white/10 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <svg viewBox="0 0 128 128" className="w-5 h-5">
          <path d="M26.7 80.5a12.8 12.8 0 1 1-12.8-12.8h12.8v12.8z" fill="#E01E5A" />
          <path d="M33.1 80.5a12.8 12.8 0 0 1 25.6 0v32a12.8 12.8 0 0 1-25.6 0v-32z" fill="#E01E5A" />
          <path d="M47.5 26.7a12.8 12.8 0 1 1 12.8-12.8v12.8h-12.8z" fill="#36C5F0" />
          <path d="M47.5 33.1a12.8 12.8 0 0 1 0 25.6h-32a12.8 12.8 0 0 1 0-25.6h32z" fill="#36C5F0" />
          <path d="M101.3 47.5a12.8 12.8 0 1 1 12.8 12.8h-12.8v-12.8z" fill="#2EB67D" />
          <path d="M94.9 47.5a12.8 12.8 0 0 1-25.6 0v-32a12.8 12.8 0 0 1 25.6 0v32z" fill="#2EB67D" />
          <path d="M80.5 101.3a12.8 12.8 0 1 1-12.8 12.8v-12.8h12.8z" fill="#ECB22E" />
          <path d="M80.5 94.9a12.8 12.8 0 0 1 0-25.6h32a12.8 12.8 0 0 1 0 25.6h-32z" fill="#ECB22E" />
        </svg>
      </div>
    );
  }

  // Playwright
  if (normId.includes('playwright')) {
    return (
      <div className={`${className} rounded-xl bg-[#2EAD33]/15 border border-[#2EAD33]/30 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <span className="text-lg">🎭</span>
      </div>
    );
  }

  // SQLite / Database
  if (normId.includes('sqlite') || normId.includes('postgres') || normId.includes('db')) {
    return (
      <div className={`${className} rounded-xl bg-[#003B57]/20 border border-[#003B57]/40 flex items-center justify-center p-2 shrink-0 shadow-xs text-sky-400`}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      </div>
    );
  }

  // Notion
  if (normId.includes('notion')) {
    return (
      <div className={`${className} rounded-xl bg-white dark:bg-[#181920] border border-gray-200 dark:border-white/10 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <img src={notionLogo} alt="Notion" className="w-full h-full object-contain" />
      </div>
    );
  }

  // Obsidian
  if (normId.includes('obsidian')) {
    return (
      <div className={`${className} rounded-xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <img src={obsidianLogo} alt="Obsidian" className="w-full h-full object-contain" />
      </div>
    );
  }

  // WhatsApp
  if (normId.includes('whatsapp')) {
    return (
      <div className={`${className} rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center p-2 shrink-0 shadow-xs`}>
        <img src={whatsappLogo} alt="WhatsApp" className="w-full h-full object-contain" />
      </div>
    );
  }

  // Remote Desktop / Desktop Automation
  if (normId.includes('desktop')) {
    return (
      <div className={`${className} rounded-xl bg-black/60 dark:bg-white/10 border border-white/15 flex items-center justify-center p-2 shrink-0 shadow-xs text-indigo-400`}>
        <HugeiconsIcon icon={ComputerTerminal01Icon} size={20} strokeWidth={2} />
      </div>
    );
  }

  // Fallback
  return (
    <div className={`${className} rounded-xl bg-gray-100 dark:bg-zinc-800/80 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 text-gray-400 dark:text-zinc-400`}>
      <HugeiconsIcon icon={PuzzleIcon} size={20} strokeWidth={1.8} />
    </div>
  );
};

export const PluginsTab: React.FC<PluginsTabProps> = ({ onNavigateTab }) => {
  const [viewMode, setViewMode] = useState<MainViewMode>('store');
  const [officialPlugins, setOfficialPlugins] = useState<GrokkiPlugin[]>([]);
  const [customPlugins, setCustomPlugins] = useState<GrokkiPlugin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Search & Live Registry
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryServers, setRegistryServers] = useState<RegistryPluginItem[]>([]);
  const [isRegistryLoading, setIsRegistryLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  // In-Tab Configure Drawer State
  const [configuringPlugin, setConfiguringPlugin] = useState<GrokkiPlugin | null>(null);
  const [tempConfig, setTempConfig] = useState<Record<string, any>>({});

  // Custom Form Fields (for power users)
  const [addCustomMode, setAddCustomMode] = useState<AddCustomMode>('stdio');
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
    fetchRegistry(registrySearch);
  }, [fetchRegistry, registrySearch]);

  const handleSearchChange = (val: string) => {
    setRegistrySearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchRegistry(val);
    }, 300);
  };

  // Check if a plugin is installed & active
  const isInstalled = useCallback(
    (pluginId: string) => {
      const isCustom = customPlugins.some((p) => p.id === pluginId && p.isEnabled);
      const isOff = officialPlugins.some((p) => (p.id === pluginId || (pluginId === 'gmail' && p.id === 'google-workspace') || (pluginId === 'google-drive' && p.id === 'google-workspace')) && p.isEnabled);
      return isCustom || isOff;
    },
    [customPlugins, officialPlugins]
  );

  // 1-Click Install or Connect
  const handleInstallPlugin = async (item: RegistryPluginItem) => {
    setInstallingId(item.id);

    // If it maps to an official built-in plugin
    if (item.isOfficial || item.officialPluginId) {
      const targetId = item.officialPluginId || item.id;
      const off = officialPlugins.find((p) => p.id === targetId);

      if (off) {
        if (off.requiresAccount && !off.accountLinked) {
          // Open configure modal to connect account
          handleOpenConfigure(off);
          setInstallingId(null);
          return;
        }

        // Toggle official on
        try {
          if (window.jarvisAPI?.togglePlugin) {
            await window.jarvisAPI.togglePlugin(targetId, true);
            showNotice(`Connected ${item.name}!`);
            await fetchPlugins();
          }
        } catch (e: any) {
          alert(`Failed to activate: ${e.message}`);
        }
        setInstallingId(null);
        return;
      }
    }

    // Otherwise, install as MCP plugin
    try {
      if (window.jarvisAPI?.addCustomPlugin) {
        const res = await window.jarvisAPI.addCustomPlugin({
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category || 'mcp',
          icon: item.id,
          imageUrl: item.imageUrl,
          isEnabled: true,
          mcpServer: {
            transport: item.transport || 'stdio',
            command: item.command || 'npx',
            args: item.args || ['-y', item.id],
          },
        });

        if (res?.success) {
          showNotice(`Installed ${item.name} successfully!`);
          await fetchPlugins();
        } else {
          alert(res?.error || 'Installation failed.');
        }
      }
    } catch (err: any) {
      alert(`Installation error: ${err.message}`);
    } finally {
      setInstallingId(null);
    }
  };

  const handleToggleOfficial = async (pluginId: string, nextState: boolean) => {
    try {
      if (window.jarvisAPI?.togglePlugin) {
        await window.jarvisAPI.togglePlugin(pluginId, nextState);
        await fetchPlugins();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenConfigure = (plugin: GrokkiPlugin, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfiguringPlugin(plugin);
    setTempConfig({ ...(plugin.config || {}) });
  };

  const handleSaveConfig = async () => {
    if (!configuringPlugin) return;
    try {
      if (window.jarvisAPI?.savePluginConfig) {
        await window.jarvisAPI.savePluginConfig(configuringPlugin.id, tempConfig);
        showNotice(`Saved settings for ${configuringPlugin.name}`);
        setConfiguringPlugin(null);
        await fetchPlugins();
      }
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  const handleDeleteCustom = async (pluginId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Uninstall plugin "${pluginId}"?`)) return;
    try {
      if (window.jarvisAPI?.deletePlugin) {
        const res = await window.jarvisAPI.deletePlugin(pluginId);
        if (res?.success) {
          showNotice(`Uninstalled ${pluginId}`);
          if (configuringPlugin?.id === pluginId) setConfiguringPlugin(null);
          await fetchPlugins();
        }
      }
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // Add Custom Plugin (stdio / remote / json)
  const handleAddCustomPlugin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newPluginName.trim()) {
      setAddError('Plugin name is required.');
      return;
    }

    try {
      let mcpServerConfig: any = null;

      if (addCustomMode === 'stdio') {
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
      } else if (addCustomMode === 'remote') {
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
          showNotice(`Installed custom plugin "${newPluginName.trim()}"`);
          setViewMode('store');
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

  // Curated Popular Plugins
  const popularPlugins: RegistryPluginItem[] = useMemo(
    () => [
      {
        id: 'gmail',
        name: 'Gmail',
        description: 'Read and manage Gmail messages and drafts',
        category: 'Popular',
        isOfficial: true,
        officialPluginId: 'google-workspace',
        requiresAccount: true,
      },
      {
        id: 'google-drive',
        name: 'Google Drive',
        description: 'Drive, Docs, Sheets, or Slides',
        category: 'Popular',
        isOfficial: true,
        officialPluginId: 'google-workspace',
        requiresAccount: true,
      },
      {
        id: 'desktop-automation',
        name: 'Remote Desktop Commander',
        description: 'Use your computer and automate windows from chat',
        category: 'Popular',
        isOfficial: true,
        officialPluginId: 'desktop-automation',
      },
      {
        id: 'github-mcp',
        name: 'GitHub',
        description: 'Triage PRs, issues, CI, and publish flows',
        category: 'Popular',
        isOfficial: true,
        officialPluginId: 'git-tools',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
      },
      {
        id: 'supabase',
        name: 'Supabase',
        description: 'Manage and query PostgreSQL databases',
        category: 'Popular',
        command: 'npx',
        args: ['-y', '@supabase/mcp-server-supabase'],
      },
      {
        id: 'notion',
        name: 'Notion',
        description: 'Query, create, and manage pages and databases',
        category: 'Popular',
        isOfficial: true,
        officialPluginId: 'notion',
        requiresAccount: true,
      },
    ],
    []
  );

  // Curated New & Noteworthy Plugins
  const noteworthyPlugins: RegistryPluginItem[] = useMemo(
    () => [
      {
        id: 'elevenlabs',
        name: 'ElevenLabs',
        description: 'Voice agents, media generation, and cloned TTS',
        category: 'New & Noteworthy',
        command: 'npx',
        args: ['-y', 'elevenlabs-mcp'],
      },
      {
        id: 'spotify',
        name: 'Spotify',
        description: 'Control playback, browse playlists, and search tracks',
        category: 'New & Noteworthy',
        command: 'npx',
        args: ['-y', 'spotify-mcp'],
      },
      {
        id: 'playwright-mcp',
        name: 'Playwright',
        description: 'Automate live web browsing, UI testing, and scraping',
        category: 'New & Noteworthy',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-playwright'],
      },
      {
        id: 'dropbox',
        name: 'Dropbox',
        description: 'Find, create, and manage cloud files across teams',
        category: 'New & Noteworthy',
        command: 'npx',
        args: ['-y', 'dropbox-mcp'],
      },
      {
        id: 'linear',
        name: 'Linear',
        description: 'Sync issues, engineering roadmaps, and sprints',
        category: 'New & Noteworthy',
        command: 'npx',
        args: ['-y', 'linear-mcp'],
      },
      {
        id: 'figma',
        name: 'Figma',
        description: 'Inspect UI layouts, components, and export SVG code',
        category: 'New & Noteworthy',
        command: 'npx',
        args: ['-y', 'figma-mcp'],
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Send messages, read channels, and manage threads',
        category: 'New & Noteworthy',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-slack'],
      },
    ],
    []
  );

  // Curated Developer & Data Plugins
  const developerPlugins: RegistryPluginItem[] = useMemo(
    () => [
      {
        id: 'sqlite-mcp',
        name: 'SQLite Explorer',
        description: 'Zero-config local SQLite inspection and SQL execution',
        category: 'Developer & Data',
        command: 'uvx',
        args: ['mcp-server-sqlite', '--db-path', 'database.sqlite'],
      },
      {
        id: 'brave-search-mcp',
        name: 'Brave Search',
        description: 'Real-time web search and index scraping in agent loops',
        category: 'Developer & Data',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-brave-search'],
      },
      {
        id: 'postgres-mcp',
        name: 'PostgreSQL Database',
        description: 'Inspect schemas, execute queries, and analyze data',
        category: 'Developer & Data',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-postgres'],
      },
      {
        id: 'scrapling-mcp',
        name: 'Scrapling',
        description: 'High-performance web crawler and data extractor',
        category: 'Developer & Data',
        command: 'uvx',
        args: ['scrapling-mcp'],
      },
      {
        id: 'n8n-mcp',
        name: 'n8n Automations',
        description: 'Connect 400+ third-party service workflows',
        category: 'Developer & Data',
        command: 'npx',
        args: ['-y', 'n8n-mcp'],
      },
      {
        id: 'obsidian',
        name: 'Obsidian Vault',
        description: 'Read and index local Markdown notes and wikilinks',
        category: 'Developer & Data',
        isOfficial: true,
        officialPluginId: 'obsidian',
        requiresAccount: true,
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp Gateway',
        description: 'Automated messaging, contact chats, and alerts',
        category: 'Developer & Data',
        isOfficial: true,
        officialPluginId: 'whatsapp',
        requiresAccount: true,
      },
    ],
    []
  );

  // Render a single ChatGPT-style Plugin Row
  const renderPluginRow = (item: RegistryPluginItem) => {
    const installed = isInstalled(item.id);
    const installing = installingId === item.id;

    // Find actual matching plugin object if configured
    const officialMatch = officialPlugins.find((p) => p.id === (item.officialPluginId || item.id));
    const customMatch = customPlugins.find((p) => p.id === item.id);
    const activePlugin = officialMatch || customMatch;

    return (
      <div
        key={item.id}
        onClick={() => {
          if (installed && activePlugin) {
            handleOpenConfigure(activePlugin);
          }
        }}
        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
          installed
            ? 'bg-white dark:bg-[#0c0d10] border-gray-200/90 dark:border-white/[0.09] hover:border-gray-300 dark:hover:border-white/20 cursor-pointer shadow-xs'
            : 'bg-white/60 dark:bg-[#0a0b0d]/70 border-gray-200/70 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/15'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0 pr-3">
          <PluginBrandLogo id={item.id} name={item.name} imageUrl={item.imageUrl} className="w-10 h-10" />

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {item.name}
              </span>
              {installed && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate leading-relaxed">
              {item.description}
            </p>
          </div>
        </div>

        {/* Right Action */}
        <div className="flex items-center gap-2 shrink-0">
          {installing ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center">
              <HugeiconsIcon icon={RefreshCwIcon} size={15} strokeWidth={2.2} className="animate-spin text-gray-400" />
            </div>
          ) : installed ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (activePlugin) handleOpenConfigure(activePlugin);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Installed & Active (Click to configure)"
            >
              <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleInstallPlugin(item);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title={`Install ${item.name}`}
            >
              <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#f7f7fa] dark:bg-[#070709] overflow-hidden select-none">
      {/* Toast Notice */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 text-xs font-medium shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-2">
          <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.5} className="text-emerald-400 dark:text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* TOP HEADER (ChatGPT style) */}
      <div className="px-6 py-4 flex items-center justify-between gap-4 border-b border-gray-200/80 dark:border-white/[0.07] bg-white dark:bg-[#070709] shrink-0">
        {/* Left: [ Plugins ] [ Skills ] Toggle Pills */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-gray-100 dark:bg-[#14151a] border border-gray-200/80 dark:border-white/[0.08] shrink-0">
          <button
            type="button"
            className="px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-[#202127] text-gray-900 dark:text-white shadow-xs cursor-default"
          >
            Plugins
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab?.('skills')}
            className="px-3 py-1 rounded-full text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            Skills
          </button>
        </div>

        {/* Center: Search Plugins Bar */}
        <div className="relative flex-1 max-w-md">
          <HugeiconsIcon
            icon={Search01Icon}
            size={15}
            strokeWidth={2}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search plugins (Gmail, Supabase, ElevenLabs, Playwright...)"
            value={registrySearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 rounded-full bg-gray-50 dark:bg-[#121318] border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none focus:border-gray-400 dark:focus:border-white/25 transition-all"
          />
          {registrySearch && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Right: View Toggles & Custom Add */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'installed' ? 'store' : 'installed')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              viewMode === 'installed'
                ? 'bg-black/5 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white font-semibold'
                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white'
            }`}
          >
            Installed ({officialPlugins.filter((p) => p.isEnabled).length + customPlugins.length})
          </button>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'custom-add' ? 'store' : 'custom-add')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              viewMode === 'custom-add'
                ? 'bg-black/5 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white font-semibold'
                : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white'
            }`}
          >
            <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2.2} />
            <span>Custom MCP</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-5xl mx-auto w-full">
        {/* VIEW 1: SEARCH RESULTS */}
        {registrySearch.trim() ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Search Results for &ldquo;{registrySearch}&rdquo;
              </h2>
              {isRegistryLoading && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <HugeiconsIcon icon={RefreshCwIcon} size={13} strokeWidth={2} className="animate-spin" />
                  <span>Fetching live servers...</span>
                </div>
              )}
            </div>

            {registryServers.length === 0 && !isRegistryLoading ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                <p className="text-sm text-gray-500 dark:text-zinc-400">No matching plugins found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {registryServers.map((server) => renderPluginRow(server))}
              </div>
            )}
          </div>
        ) : viewMode === 'installed' ? (
          /* VIEW 2: INSTALLED PLUGINS ONLY */
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/[0.08]">
              <div>
                <h1 className="text-base font-semibold text-gray-950 dark:text-white">Installed Plugins</h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Manage your active integrations and community MCP servers.
                </p>
              </div>
            </div>

            {/* Official Active */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                Official Workspace Tools
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {officialPlugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    onClick={() => handleOpenConfigure(plugin)}
                    className="flex items-center justify-between p-3.5 rounded-2xl border bg-white dark:bg-[#0c0d10] border-gray-200/90 dark:border-white/[0.09] hover:border-gray-300 dark:hover:border-white/20 transition-all cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <PluginBrandLogo id={plugin.id} name={plugin.name} className="w-10 h-10" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {plugin.name}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                          {plugin.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleOfficial(plugin.id, !plugin.isEnabled);
                        }}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors relative focus:outline-none cursor-pointer ${
                          plugin.isEnabled
                            ? 'bg-gray-950 dark:bg-white text-white dark:text-gray-950'
                            : 'bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700'
                        }`}
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

            {/* Custom Installed */}
            <div className="flex flex-col gap-3 pt-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                Community MCP Plugins ({customPlugins.length})
              </h3>
              {customPlugins.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    No custom or community MCP plugins installed yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customPlugins.map((plugin) => (
                    <div
                      key={plugin.id}
                      onClick={() => handleOpenConfigure(plugin)}
                      className="flex items-center justify-between p-3.5 rounded-2xl border bg-white dark:bg-[#0c0d10] border-gray-200/90 dark:border-white/[0.09] hover:border-gray-300 dark:hover:border-white/20 transition-all cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <PluginBrandLogo id={plugin.id} name={plugin.name} imageUrl={plugin.imageUrl} className="w-10 h-10" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {plugin.name}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {plugin.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustom(plugin.id, e)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                          title="Uninstall"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'custom-add' ? (
          /* VIEW 3: POWER USER CUSTOM ADD (stdio / remote / json) */
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base font-semibold text-gray-950 dark:text-white">Add Custom MCP Server</h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Connect a local subprocess or remote HTTP server for development.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('store')}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white"
              >
                Back to Store
              </button>
            </div>

            <div className="flex items-center gap-2 p-1 rounded-xl bg-gray-100 dark:bg-[#14151a] w-fit">
              <button
                type="button"
                onClick={() => setAddCustomMode('stdio')}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  addCustomMode === 'stdio'
                    ? 'bg-white dark:bg-[#202127] text-gray-900 dark:text-white shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-zinc-400'
                }`}
              >
                Local Subprocess (stdio)
              </button>
              <button
                type="button"
                onClick={() => setAddCustomMode('remote')}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  addCustomMode === 'remote'
                    ? 'bg-white dark:bg-[#202127] text-gray-900 dark:text-white shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-zinc-400'
                }`}
              >
                Remote HTTP / SSE
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddCustomPlugin} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1 block">Server Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Custom Database"
                  value={newPluginName}
                  onChange={(e) => setNewPluginName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1 block">Description</label>
                <input
                  type="text"
                  placeholder="Short summary of what tools this server provides"
                  value={newPluginDesc}
                  onChange={(e) => setNewPluginDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>

              {addCustomMode === 'stdio' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1 block">Command</label>
                      <input
                        type="text"
                        placeholder="npx, uvx, python, node..."
                        value={newMcpCommand}
                        onChange={(e) => setNewMcpCommand(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1 block">Arguments (one per line)</label>
                      <textarea
                        rows={3}
                        placeholder="-y&#10;@my/mcp-server"
                        value={newMcpArgs}
                        onChange={(e) => setNewMcpArgs(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white outline-none resize-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1 block">Remote Endpoint URL</label>
                  <input
                    type="url"
                    placeholder="https://my-server.com/sse"
                    value={newRemoteUrl}
                    onChange={(e) => setNewRemoteUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-900 dark:text-white outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                className="mt-2 py-2.5 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer transition-all hover:bg-gray-800 dark:hover:bg-zinc-200"
              >
                Register &amp; Connect MCP Server
              </button>
            </form>
          </div>
        ) : (
          /* VIEW 4: CHATGPT-STYLE STORE FRONT */
          <div className="flex flex-col gap-8 pb-12">
            {/* 1. Popular Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1 cursor-pointer">
                  <span>Popular</span>
                  <span className="text-gray-400 dark:text-zinc-500 font-normal">&rsaquo;</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {popularPlugins.map((plugin) => renderPluginRow(plugin))}
              </div>
            </div>

            {/* 2. New & Noteworthy Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1 cursor-pointer">
                  <span>New &amp; Noteworthy</span>
                  <span className="text-gray-400 dark:text-zinc-500 font-normal">&rsaquo;</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {noteworthyPlugins.map((plugin) => renderPluginRow(plugin))}
              </div>
            </div>

            {/* 3. Developer & Data Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1 cursor-pointer">
                  <span>Developer &amp; Data</span>
                  <span className="text-gray-400 dark:text-zinc-500 font-normal">&rsaquo;</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {developerPlugins.map((plugin) => renderPluginRow(plugin))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SLIDE-OVER CONFIGURE DRAWER */}
      {configuringPlugin && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
          onClick={() => setConfiguringPlugin(null)}
        >
          <div
            className="w-full max-w-md h-full bg-white dark:bg-[#0c0d10] border-l border-gray-200 dark:border-white/10 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PluginBrandLogo id={configuringPlugin.id} name={configuringPlugin.name} imageUrl={configuringPlugin.imageUrl} className="w-11 h-11" />
                  <div>
                    <h2 className="text-base font-semibold text-gray-950 dark:text-white">
                      {configuringPlugin.name}
                    </h2>
                    <span className="text-xs text-gray-400 font-mono">
                      {configuringPlugin.category || 'MCP Server'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfiguringPlugin(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                {configuringPlugin.description}
              </p>

              {/* Status & Toggle */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.03] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block">Plugin Status</span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                    {configuringPlugin.isEnabled ? 'Enabled & Active in agent tools' : 'Disabled'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !configuringPlugin.isEnabled;
                    if (configuringPlugin.category === 'official') {
                      handleToggleOfficial(configuringPlugin.id, next);
                    } else if (window.jarvisAPI?.togglePlugin) {
                      window.jarvisAPI.togglePlugin(configuringPlugin.id, next).then(fetchPlugins);
                    }
                    setConfiguringPlugin({ ...configuringPlugin, isEnabled: next });
                  }}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors relative cursor-pointer ${
                    configuringPlugin.isEnabled
                      ? 'bg-gray-950 dark:bg-white'
                      : 'bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      configuringPlugin.isEnabled
                        ? 'translate-x-4 bg-white dark:bg-zinc-950'
                        : 'translate-x-0 bg-white dark:bg-zinc-400'
                    }`}
                  />
                </button>
              </div>

              {/* Account Connection Alert (for Google Workspace or Notion) */}
              {configuringPlugin.requiresAccount && (
                <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sky-500">
                    <HugeiconsIcon icon={User02Icon} size={16} strokeWidth={2} />
                    <span className="text-xs font-semibold">Account Authorization</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                    {configuringPlugin.accountLinked
                      ? 'Connected and authorized with your workspace.'
                      : 'Requires an authenticated account connection.'}
                  </p>
                  {!configuringPlugin.accountLinked && onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfiguringPlugin(null);
                        onNavigateTab('google');
                      }}
                      className="mt-1 px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-semibold w-fit cursor-pointer hover:bg-sky-600"
                    >
                      Connect Account in Workspace
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
              {configuringPlugin.category !== 'official' ? (
                <button
                  type="button"
                  onClick={(e) => handleDeleteCustom(configuringPlugin.id, e)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium cursor-pointer"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} />
                  <span>Uninstall Plugin</span>
                </button>
              ) : <div />}

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
