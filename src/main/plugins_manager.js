const fs = require('fs');
const path = require('path');
const http = require('http');
const { getDataDir } = require('./data_dir');

/**
 * Grokki Plugins Engine
 * Manages native workspace integrations, OAuth 2.1 MCP flows, and live MCP registry discovery.
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
    name: 'Remote Desktop Commander',
    badge: 'Core',
    description: 'Use your computer from chat: native UI automation, clicks, typing, and window control.',
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
    name: 'Notion',
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
    description: 'Read, write, and index local Markdown notes with bi-directional wikilinks in your vault.',
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
    name: 'WhatsApp',
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
    name: 'GitHub',
    description: 'Triage PRs, issues, commits, branch management, and CI/CD publish flows.',
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

/**
 * Full Categorized Plugin Catalog (with real OAuth 2.1 MCP URLs, Auth Portals & Packages)
 */
const CURATED_PLUGIN_DIRECTORY = [
  // ================= POPULAR =================
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read and manage Gmail',
    category: 'Popular',
    authType: 'google-oauth',
    officialPluginId: 'google-workspace',
    authPortalUrl: 'https://mail.google.com',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Drive, Docs, Sheets or Slides',
    category: 'Popular',
    authType: 'google-oauth',
    officialPluginId: 'google-workspace',
    authPortalUrl: 'https://drive.google.com',
  },
  {
    id: 'desktop-automation',
    name: 'Remote Desktop Commander',
    description: 'Use your computer from chat',
    category: 'Popular',
    authType: 'native',
    officialPluginId: 'desktop-automation',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Triage PRs, issues, CI, and publish flows',
    category: 'Popular',
    authType: 'api-key',
    authPortalUrl: 'https://github.com/settings/tokens/new?description=Grokki+Studio+MCP&scopes=repo,read:org,workflow',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        label: 'GitHub Personal Access Token',
        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
        isSecret: true,
      },
    ],
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Manage and query databases',
    category: 'Popular',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.supabase.com/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://supabase.com/dashboard/account/tokens',
  },
  {
    id: 'notion-mcp',
    name: 'Notion',
    description: 'Search, read and write workspaces and databases',
    category: 'Popular',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.notion.com/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://www.notion.so/my-integrations',
  },

  // ================= NEW & NOTEWORTHY =================
  {
    id: 'icloud-mail',
    name: 'iCloud Mail',
    description: 'Read and manage iCloud email via IMAP & app-specific passwords',
    category: 'New & Noteworthy',
    authType: 'api-key',
    authPortalUrl: 'https://account.apple.com/account/manage',
    command: 'npx',
    args: ['-y', 'imap-mcp-server'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'IMAP_HOST',
        label: 'iCloud IMAP Host',
        placeholder: 'imap.mail.me.com',
        isSecret: false,
      },
      {
        name: 'IMAP_USER',
        label: 'Apple ID Email (@icloud.com)',
        placeholder: 'you@icloud.com',
        isSecret: false,
      },
      {
        name: 'IMAP_PASSWORD',
        label: 'Apple App-Specific Password',
        placeholder: 'xxxx-xxxx-xxxx-xxxx',
        isSecret: true,
      },
    ],
  },
  {
    id: 'icloud-calendar',
    name: 'iCloud Calendar',
    description: 'Read and manage iCloud CalDAV calendar events',
    category: 'New & Noteworthy',
    authType: 'api-key',
    authPortalUrl: 'https://account.apple.com/account/manage',
    command: 'npx',
    args: ['-y', 'caldav-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'CALDAV_BASE_URL',
        label: 'CalDAV URL',
        placeholder: 'https://caldav.icloud.com',
        isSecret: false,
      },
      {
        name: 'CALDAV_USERNAME',
        label: 'Apple ID Email',
        placeholder: 'you@icloud.com',
        isSecret: false,
      },
      {
        name: 'CALDAV_PASSWORD',
        label: 'Apple App-Specific Password',
        placeholder: 'xxxx-xxxx-xxxx-xxxx',
        isSecret: true,
      },
    ],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Voice agents, text-to-speech, and audio cloning',
    category: 'New & Noteworthy',
    authType: 'api-key',
    authPortalUrl: 'https://elevenlabs.io/app/settings/api-keys',
    command: 'uvx',
    args: ['elevenlabs-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'ELEVENLABS_API_KEY',
        label: 'ElevenLabs API Key',
        placeholder: 'sk_xxxxxxxxxxxxxxxx',
        isSecret: true,
      },
    ],
  },
  {
    id: 'sonos',
    name: 'Sonos',
    description: 'Control your Sonos speaker system on your network',
    category: 'New & Noteworthy',
    authType: 'stdio-zero',
    authPortalUrl: 'https://developer.sonos.com',
    command: 'npx',
    args: ['-y', 'sonos-mcp-server'],
    transport: 'stdio',
  },
  {
    id: 'atlassian',
    name: 'Atlassian (Jira & Confluence)',
    description: 'Manage Jira issues, sprints, and Confluence pages',
    category: 'New & Noteworthy',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.atlassian.com/v1/sse',
    transport: 'sse',
    authPortalUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
  },
  {
    id: 'cloudflare-docs',
    name: 'Cloudflare',
    description: 'Deploy Workers, KV, D1 and query Cloudflare docs',
    category: 'New & Noteworthy',
    authType: 'mcp-oauth',
    mcpUrl: 'https://docs.mcp.cloudflare.com/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://dash.cloudflare.com/profile/api-tokens',
  },

  // ================= SMALL BUSINESS =================
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Find, create, share, and organize Dropbox cloud files',
    category: 'Small Business',
    authType: 'api-key',
    authPortalUrl: 'https://www.dropbox.com/developers/apps',
    command: 'npx',
    args: ['-y', 'dropbox-mcp-server'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'DROPBOX_ACCESS_TOKEN',
        label: 'Dropbox OAuth Access Token',
        placeholder: 'sl.Bxxxxxxxxxxxxxxxxx',
        isSecret: true,
      },
    ],
  },
  {
    id: 'asana-sb',
    name: 'Asana',
    description: 'Automate project workflows, tasks, and team milestones',
    category: 'Small Business',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.asana.com/sse',
    transport: 'sse',
    authPortalUrl: 'https://app.asana.com/0/my-apps',
  },
  {
    id: 'webflow-sb',
    name: 'Webflow',
    description: 'Manage Webflow sites, CMS collections, and publishing',
    category: 'Small Business',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.webflow.com/sse',
    transport: 'sse',
    authPortalUrl: 'https://webflow.com/dashboard',
  },
  {
    id: 'intercom-sb',
    name: 'Intercom',
    description: 'Customer support inbox, tickets, and user context',
    category: 'Small Business',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.intercom.com/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://app.intercom.com/a/apps/_/developer-hub',
  },

  // ================= COMMUNICATION =================
  {
    id: 'outlook-email',
    name: 'Outlook Email',
    description: 'Triage Outlook inboxes and calendar events',
    category: 'Communication',
    authType: 'api-key',
    authPortalUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
    command: 'npx',
    args: ['-y', '@softeria/ms-365-mcp-server'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'MS365_MCP_ACCESS_TOKEN',
        label: 'Microsoft Graph / Outlook Access Token',
        placeholder: 'eyJ0eXAiOiJKV1QiLCJhbGci...',
        isSecret: true,
      },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Read and manage Slack channels and messages',
    category: 'Communication',
    authType: 'api-key',
    authPortalUrl: 'https://api.slack.com/apps',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'SLACK_BOT_TOKEN',
        label: 'Slack Bot User OAuth Token',
        placeholder: 'xoxb-your-token',
        isSecret: true,
      },
      {
        name: 'SLACK_TEAM_ID',
        label: 'Slack Workspace Team ID',
        placeholder: 'T01234567',
        isSecret: false,
      },
    ],
  },
  {
    id: 'hostinger-mail',
    name: 'Hostinger Mail',
    description: 'Use Hostinger Mail & custom domain inboxes',
    category: 'Communication',
    authType: 'api-key',
    authPortalUrl: 'https://hpanel.hostinger.com',
    command: 'npx',
    args: ['-y', 'imap-mcp-server'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'IMAP_HOST',
        label: 'IMAP Host',
        placeholder: 'imap.hostinger.com',
        isSecret: false,
      },
      {
        name: 'IMAP_USER',
        label: 'Email Address',
        placeholder: 'you@yourdomain.com',
        isSecret: false,
      },
      {
        name: 'IMAP_PASSWORD',
        label: 'Email Password',
        placeholder: '••••••••••••',
        isSecret: true,
      },
    ],
  },
  {
    id: 'microsoft-teams',
    name: 'Teams',
    description: 'Summarize Teams chats, meetings and follow up',
    category: 'Communication',
    authType: 'api-key',
    authPortalUrl: 'https://admin.teams.microsoft.com',
    command: 'npx',
    args: ['-y', '@softeria/ms-365-mcp-server'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'MS365_MCP_ACCESS_TOKEN',
        label: 'Microsoft Teams Graph Token',
        placeholder: 'eyJ0eXAiOiJKV1Qi...',
        isSecret: true,
      },
    ],
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Insights, cloud recordings & transcripts from Zoom',
    category: 'Communication',
    authType: 'api-key',
    authPortalUrl: 'https://marketplace.zoom.us/user/build',
    command: 'npx',
    args: ['-y', '@wirecat/zoom-cli', 'mcp', 'serve'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'ZOOM_ACCESS_TOKEN',
        label: 'Zoom Server-to-Server OAuth Token',
        placeholder: 'Zoom OAuth access token',
        isSecret: true,
      },
    ],
  },
  {
    id: 'intercom',
    name: 'Intercom',
    description: 'Customer support conversations, tickets and users',
    category: 'Communication',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.intercom.com/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://app.intercom.com/a/apps/_/developer-hub',
  },

  // ================= CREATIVITY =================
  {
    id: 'canva',
    name: 'Canva',
    description: 'Create, review, edit and export designs',
    category: 'Creativity',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.canva.com/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://www.canva.com/developers',
  },
  {
    id: 'figma',
    name: 'Figma',
    description: 'Create designs, inspect layouts and ship to code',
    category: 'Creativity',
    authType: 'api-key',
    authPortalUrl: 'https://www.figma.com/developers/api#access-tokens',
    command: 'npx',
    args: ['-y', 'figma-developer-mcp', '--stdio'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'FIGMA_API_KEY',
        label: 'Figma Personal Access Token',
        placeholder: 'figd_xxxxxxxxxxxxxxxxxxxx',
        isSecret: true,
      },
    ],
  },
  {
    id: 'higgsfield',
    name: 'Higgsfield',
    description: 'Every cinematic image and video motion model',
    category: 'Creativity',
    authType: 'mcp-remote',
    mcpUrl: 'https://api.inference.sh/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://higgsfield.ai',
  },
  {
    id: 'runway',
    name: 'Runway',
    description: 'Generate and edit video with Gen-3 Alpha & Gen-4',
    category: 'Creativity',
    authType: 'api-key',
    authPortalUrl: 'https://dev.runwayml.com',
    command: 'npx',
    args: ['-y', 'runway-mcp-server'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'RUNWAYML_API_SECRET',
        label: 'Runway API Secret Key',
        placeholder: 'key_xxxxxxxxxxxxxxxxxxxx',
        isSecret: true,
      },
    ],
  },
  {
    id: 'webflow',
    name: 'Webflow',
    description: 'Design, manage CMS collections and publish sites',
    category: 'Creativity',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.webflow.com/sse',
    transport: 'sse',
    authPortalUrl: 'https://webflow.com/dashboard',
  },
  {
    id: 'heygen',
    name: 'HeyGen',
    description: 'Create AI avatar videos, voice clones & translations',
    category: 'Creativity',
    authType: 'api-key',
    authPortalUrl: 'https://app.heygen.com/settings?nav=API',
    command: 'uvx',
    args: ['heygen-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'HEYGEN_API_KEY',
        label: 'HeyGen API Key',
        placeholder: 'Your HeyGen API key',
        isSecret: true,
      },
    ],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Voice agents, sound effects and speech media',
    category: 'Creativity',
    authType: 'api-key',
    authPortalUrl: 'https://elevenlabs.io/app/settings/api-keys',
    command: 'uvx',
    args: ['elevenlabs-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'ELEVENLABS_API_KEY',
        label: 'ElevenLabs API Key',
        placeholder: 'sk_xxxxxxxxxxxxxxxxxxxx',
        isSecret: true,
      },
    ],
  },

  // ================= DEVELOPER TOOLS =================
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Build, preview and deploy web apps',
    category: 'Developer Tools',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.vercel.com',
    transport: 'streamable-http',
    authPortalUrl: 'https://vercel.com/account/tokens',
  },
  {
    id: 'exa',
    name: 'Exa',
    description: 'Web search and deep crawling for AI agents',
    category: 'Developer Tools',
    authType: 'mcp-remote',
    mcpUrl: 'https://mcp.exa.ai/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://dashboard.exa.ai/api-keys',
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Find and manage issues, sprints, and roadmaps',
    category: 'Developer Tools',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.linear.app/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://linear.app/settings/api',
  },
  {
    id: 'sentry',
    name: 'Sentry',
    description: 'Inspect production errors, stack traces and releases',
    category: 'Developer Tools',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.sentry.dev/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://sentry.io/settings/account/api/auth-tokens/',
  },
  {
    id: 'atlassian',
    name: 'Atlassian (Jira & Confluence)',
    description: 'Manage Jira issues, sprints and Confluence docs',
    category: 'Developer Tools',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.atlassian.com/v1/sse',
    transport: 'sse',
    authPortalUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'Search Cloudflare docs, Workers, KV, D1 and radar',
    category: 'Developer Tools',
    authType: 'mcp-remote',
    mcpUrl: 'https://docs.mcp.cloudflare.com/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://dash.cloudflare.com/profile/api-tokens',
  },
  {
    id: 'playwright',
    name: 'TinyFish / Playwright',
    description: 'Find and complete live web tasks in a browser',
    category: 'Developer Tools',
    authType: 'stdio-zero',
    command: 'npx',
    args: ['-y', '@playwright/mcp@latest'],
    transport: 'stdio',
  },
  {
    id: 'base44',
    name: 'Base44',
    description: 'Build and migrate full-stack apps with AI',
    category: 'Developer Tools',
    authType: 'stdio-zero',
    command: 'npx',
    args: ['-y', 'escapebase44', 'mcp'],
    transport: 'stdio',
    authPortalUrl: 'https://base44.com',
  },

  // ================= FINANCE =================
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments, manage subscriptions & grow revenue',
    category: 'Finance',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.stripe.com',
    transport: 'streamable-http',
    authPortalUrl: 'https://dashboard.stripe.com/apikeys',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Invoices, transactions, payouts and commerce tools',
    category: 'Finance',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.paypal.com/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://developer.paypal.com/dashboard/',
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers (IBKR)',
    description: 'Analyze global markets, portfolios and orders',
    category: 'Finance',
    authType: 'api-key',
    authPortalUrl: 'https://www.interactivebrokers.com/en/trading/ib-api.php',
    command: 'npx',
    args: ['-y', 'ibkr-mcp-server'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'IBKR_ACCOUNT_ID',
        label: 'IBKR Account ID',
        placeholder: 'U1234567',
        isSecret: false,
      },
      {
        name: 'IBKR_GATEWAY_URL',
        label: 'Client Portal Gateway URL',
        placeholder: 'https://localhost:5000/v1/api',
        isSecret: false,
      },
    ],
  },
  {
    id: 'binance',
    name: 'Binance',
    description: 'Explore Binance crypto market data & orderbooks',
    category: 'Finance',
    authType: 'api-key',
    authPortalUrl: 'https://www.binance.com/en/my/settings/api-management',
    command: 'npx',
    args: ['-y', 'binance-mcp-server'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'BINANCE_API_KEY',
        label: 'Binance API Key (Optional for public market data)',
        placeholder: 'Optional API key',
        isSecret: true,
      },
    ],
  },
  {
    id: 'public-equity',
    name: 'Public Equity Investing',
    description: 'SEC filings, earnings transcripts & equity research',
    category: 'Finance',
    authType: 'api-key',
    authPortalUrl: 'https://sec-api.io',
    command: 'uvx',
    args: ['sec-edgar-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'SEC_EDGAR_USER_AGENT',
        label: 'SEC Edgar User-Agent (Name & Email)',
        placeholder: 'YourName you@domain.com',
        isSecret: false,
      },
    ],
  },
  {
    id: 'longbridge',
    name: 'Longbridge',
    description: 'Real-time stock quotes, watchlists and financial data',
    category: 'Finance',
    authType: 'api-key',
    authPortalUrl: 'https://open.longportapp.com/en',
    command: 'npx',
    args: ['-y', 'longport-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'LONGPORT_APP_KEY',
        label: 'Longport App Key',
        placeholder: 'App Key',
        isSecret: false,
      },
      {
        name: 'LONGPORT_APP_SECRET',
        label: 'Longport App Secret',
        placeholder: 'App Secret',
        isSecret: true,
      },
      {
        name: 'LONGPORT_ACCESS_TOKEN',
        label: 'Access Token',
        placeholder: 'Access Token',
        isSecret: true,
      },
    ],
  },

  // ================= HEALTHCARE =================
  {
    id: 'hevy',
    name: 'Hevy',
    description: 'Gym workout plans, routines and lifting insights',
    category: 'Healthcare',
    authType: 'api-key',
    authPortalUrl: 'https://hevy.com/settings?Developer',
    command: 'npx',
    args: ['-y', 'hevy-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'HEVY_API_KEY',
        label: 'Hevy Developer API Key',
        placeholder: 'hevy_xxxxxxxxxxxxxxxx',
        isSecret: true,
      },
    ],
  },
  {
    id: 'coros',
    name: 'COROS',
    description: 'Know your training load, pace & marathon recovery',
    category: 'Healthcare',
    authType: 'api-key',
    authPortalUrl: 'https://t.coros.com',
    command: 'npx',
    args: ['-y', 'strava-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'STRAVA_ACCESS_TOKEN',
        label: 'COROS / Strava Sync Access Token',
        placeholder: 'Access Token',
        isSecret: true,
      },
    ],
  },
  {
    id: 'calorie-tracker',
    name: 'Calorie Tracker',
    description: 'Track your daily food, macros and calories',
    category: 'Healthcare',
    authType: 'api-key',
    authPortalUrl: 'https://platform.fatsecret.com/api/',
    command: 'npx',
    args: ['-y', 'nutrition-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'USDA_API_KEY',
        label: 'FoodData Central API Key (or DEMO_KEY)',
        placeholder: 'DEMO_KEY',
        isSecret: false,
      },
    ],
  },
  {
    id: 'caliber',
    name: 'Caliber',
    description: 'Analyze your strength and fitness progression data',
    category: 'Healthcare',
    authType: 'api-key',
    authPortalUrl: 'https://caliberstrong.com',
    command: 'npx',
    args: ['-y', 'hevy-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'FITNESS_API_KEY',
        label: 'Fitness API Key',
        placeholder: 'API Key',
        isSecret: true,
      },
    ],
  },

  // ================= TRAVEL =================
  {
    id: 'booking-com',
    name: 'Booking.com',
    description: 'Find all best hotel stays, apartments and resorts',
    category: 'Travel',
    authType: 'mcp-remote',
    mcpUrl: 'https://www.mybooking.ai/mcp/directory',
    transport: 'streamable-http',
    authPortalUrl: 'https://www.booking.com',
  },
  {
    id: 'skyscanner',
    name: 'Skyscanner',
    description: 'Find cheap flights, routes and fare alerts',
    category: 'Travel',
    authType: 'api-key',
    authPortalUrl: 'https://duffel.com',
    command: 'uvx',
    args: ['flights-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'DUFFEL_API_KEY',
        label: 'Flight Search / Duffel API Key',
        placeholder: 'duffel_live_xxxxxxxx',
        isSecret: true,
      },
    ],
  },
  {
    id: 'expedia',
    name: 'Expedia',
    description: 'Plan travel itineraries, flights & hotels',
    category: 'Travel',
    authType: 'api-key',
    authPortalUrl: 'https://developers.expediagroup.com',
    command: 'npx',
    args: ['-y', '@googlemaps/code-assist-mcp'],
    transport: 'stdio',
    requiredEnv: [],
  },
  {
    id: 'tripadvisor',
    name: 'Tripadvisor',
    description: 'Book top-rated hotels, attractions & restaurants',
    category: 'Travel',
    authType: 'api-key',
    authPortalUrl: 'https://tripadvisor-content-api.readme.io/',
    command: 'uvx',
    args: ['tripadvisor-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'TRIPADVISOR_API_KEY',
        label: 'Tripadvisor Content API Key',
        placeholder: 'Your Tripadvisor API Key',
        isSecret: true,
      },
    ],
  },

  // ================= ENTERTAINMENT =================
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Music and podcasts playback & playlists for you',
    category: 'Entertainment',
    authType: 'api-key',
    authPortalUrl: 'https://developer.spotify.com/dashboard',
    command: 'uvx',
    args: ['spotify-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'SPOTIFY_CLIENT_ID',
        label: 'Spotify Client ID',
        placeholder: 'Your Spotify Client ID',
        isSecret: false,
      },
      {
        name: 'SPOTIFY_CLIENT_SECRET',
        label: 'Spotify Client Secret',
        placeholder: 'Your Spotify Client Secret',
        isSecret: true,
      },
    ],
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    description: 'Build playlists and search Apple Music catalog',
    category: 'Entertainment',
    authType: 'api-key',
    authPortalUrl: 'https://developer.apple.com/musickit/',
    command: 'npx',
    args: ['-y', 'apple-music-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'APPLE_MUSIC_DEVELOPER_TOKEN',
        label: 'Apple Music Developer Token',
        placeholder: 'eyJhbGciOiJFUzI1NiIs...',
        isSecret: true,
      },
    ],
  },

  // ================= EDUCATION =================
  {
    id: 'consensus',
    name: 'Consensus',
    description: 'Search peer-reviewed scientific research papers',
    category: 'Education',
    authType: 'stdio-zero',
    command: 'uvx',
    args: ['arxiv-mcp-server'],
    transport: 'stdio',
    authPortalUrl: 'https://consensus.app',
  },
  {
    id: 'scispace',
    name: 'SciSpace',
    description: 'For science, PubMed and academic literature research',
    category: 'Education',
    authType: 'stdio-zero',
    command: 'uvx',
    args: ['mcp-simple-pubmed'],
    transport: 'stdio',
    authPortalUrl: 'https://typeset.io',
  },
  {
    id: 'zotero',
    name: 'Zotero',
    description: 'Find papers and add citations from your Zotero library',
    category: 'Education',
    authType: 'api-key',
    authPortalUrl: 'https://www.zotero.org/settings/keys/new',
    command: 'uvx',
    args: ['zotero-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'ZOTERO_API_KEY',
        label: 'Zotero API Key',
        placeholder: 'Your Zotero Key',
        isSecret: true,
      },
      {
        name: 'ZOTERO_LIBRARY_ID',
        label: 'Zotero User / Group Library ID',
        placeholder: '12345678',
        isSecret: false,
      },
    ],
  },
  {
    id: 'acumen',
    name: 'Acumen / Context7',
    description: 'Keep your AI up to date with live library docs',
    category: 'Education',
    authType: 'stdio-zero',
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp'],
    transport: 'stdio',
    authPortalUrl: 'https://context7.com',
  },

  // ================= SALES =================
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Insights to action in HubSpot CRM, deals & contacts',
    category: 'Sales',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.hubspot.com/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://app.hubspot.com/private-apps',
  },
  {
    id: 'monday-com',
    name: 'monday.com',
    description: 'Manage projects, boards, tasks & CRM workflows',
    category: 'Sales',
    authType: 'api-key',
    mcpUrl: 'https://mcp.monday.com/mcp',
    transport: 'streamable-http',
    authPortalUrl: 'https://monday.com/developers/v2',
    requiredHeaders: [
      {
        name: 'Authorization',
        label: 'monday.com Personal API Token',
        placeholder: 'Bearer eyJhbGciOiJIUzI1NiJ9...',
        isSecret: true,
      },
    ],
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Track team projects, milestones, tasks and portfolios',
    category: 'Sales',
    authType: 'mcp-oauth',
    mcpUrl: 'https://mcp.asana.com/sse',
    transport: 'sse',
    authPortalUrl: 'https://app.asana.com/0/my-apps',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Find, create, and take action on cloud files',
    category: 'Sales',
    authType: 'api-key',
    authPortalUrl: 'https://www.dropbox.com/developers/apps',
    command: 'npx',
    args: ['-y', 'dropbox-mcp'],
    transport: 'stdio',
    requiredEnv: [
      {
        name: 'DROPBOX_ACCESS_TOKEN',
        label: 'Dropbox OAuth Access Token',
        placeholder: 'sl.Bxxxxxxxxxxxxxxxxxxxx',
        isSecret: true,
      },
    ],
  },
];

class PluginsManager {
  constructor() {
    this.pluginsFilePath = path.join(getDataDir(), 'plugins.json');
    this.oauthStorePath = path.join(getDataDir(), 'mcp_oauth_tokens.json');
    this.state = {
      officialOverrides: {},
      customPlugins: [],
    };
    this.oauthStore = {};
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
      if (fs.existsSync(this.oauthStorePath)) {
        this.oauthStore = JSON.parse(fs.readFileSync(this.oauthStorePath, 'utf8')) || {};
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

  saveOAuthStore() {
    try {
      const dir = path.dirname(this.oauthStorePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.oauthStorePath, JSON.stringify(this.oauthStore, null, 2), 'utf8');
    } catch (err) {
      console.error('[PluginsManager] Failed to save OAuth store:', err.message);
    }
  }

  checkAccountLinked(pluginId) {
    try {
      if (pluginId === 'google-workspace' || pluginId === 'gmail' || pluginId === 'google-drive') {
        const googleWorkspace = require('./google_workspace');
        return Boolean(googleWorkspace.isConnected && googleWorkspace.isConnected());
      }
      if (pluginId === 'whatsapp') {
        const openwaWorkspace = require('./openwa_workspace');
        return Boolean(
          openwaWorkspace.isLocalReady &&
            (openwaWorkspace.isLocalReady() || openwaWorkspace.hasLocalAuth())
        );
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
        return Boolean(githubWorkspace.isConnected && githubWorkspace.isConnected());
      }
    } catch (_) {
      return false;
    }
    return true;
  }

  getPlugins() {
    const official = DEFAULT_OFFICIAL_PLUGINS.map((def) => {
      const override = this.state.officialOverrides[def.id] || {};
      const accountLinked = def.requiresAccount ? this.checkAccountLinked(def.id) : true;
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
      if (isEnabled && officialDef.requiresAccount && !this.checkAccountLinked(pluginId)) {
        return {
          success: false,
          requiresAuth: true,
          error: `${officialDef.name} requires connecting your ${officialDef.accountName || 'account'} first.`,
        };
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

  /**
   * Runs a real RFC 8414 / RFC 9728 / RFC 7591 OAuth 2.1 flow with PKCE:
   * 1. Spins up ephemeral localhost HTTP callback listener
   * 2. Dynamically registers OAuth client with remote MCP server
   * 3. Redirects user browser to authorization_endpoint
   * 4. Receives callback code & exchanges for access_token
   */
  async runMcpOAuthFlow(pluginId, serverUrl, pluginName) {
    const { auth } = require('@modelcontextprotocol/sdk/client/auth.js');
    const { shell } = require('electron');

    return new Promise((resolve, reject) => {
      let server = null;
      let timeoutId = null;
      const sessionData = this.oauthStore[pluginId] || {};

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (server) {
          try {
            server.close();
          } catch (_) {}
          server = null;
        }
      };

      server = http.createServer(async (req, res) => {
        try {
          const reqUrl = new URL(req.url, `http://127.0.0.1:${port}`);
          if (reqUrl.pathname !== '/oauth/callback') {
            res.writeHead(404);
            res.end('Not found');
            return;
          }

          const code = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');
          const errorDesc = reqUrl.searchParams.get('error_description');

          if (error || !code) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!DOCTYPE html><html><body style="background:#090a0f;color:#f4f4f5;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center;max-width:420px;padding:32px;border-radius:16px;background:#12131a;border:1px solid #27272a"><h2 style="color:#ef4444;margin-top:0">Authorization Cancelled</h2><p style="color:#a1a1aa;font-size:14px">${errorDesc || error || 'No authorization code received.'}</p></div></body></html>`);
            cleanup();
            reject(new Error(errorDesc || error || 'Authorization cancelled by user.'));
            return;
          }

          // Exchange code for tokens using MCP SDK
          await auth(provider, { serverUrl, authorizationCode: code });

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!DOCTYPE html><html><body style="background:#090a0f;color:#f4f4f5;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center;max-width:420px;padding:32px;border-radius:16px;background:#12131a;border:1px solid #27272a"><div style="width:48px;height:48px;border-radius:50%;background:rgba(16,185,129,0.15);color:#10b981;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px">✓</div><h2 style="margin:0 0 8px">Connected to ${pluginName}</h2><p style="color:#a1a1aa;font-size:14px;margin:0">Authentication complete. You can close this tab and return to Grokki Studio.</p><script>setTimeout(()=>window.close(),1500)</script></div></body></html>`);

          cleanup();
          resolve(sessionData.tokens);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Token exchange failed: ' + err.message);
          cleanup();
          reject(err);
        }
      });

      let port = 0;
      let provider = null;

      server.listen(0, '127.0.0.1', async () => {
        port = server.address().port;
        const redirectUri = `http://127.0.0.1:${port}/oauth/callback`;

        provider = {
          get redirectUrl() {
            return redirectUri;
          },
          get clientMetadata() {
            return {
              client_name: 'Grokki Studio',
              redirect_uris: [redirectUri],
              grant_types: ['authorization_code', 'refresh_token'],
              response_types: ['code'],
              token_endpoint_auth_method: 'none',
            };
          },
          clientInformation: () => {
            // Re-register for new ephemeral port if redirect_uri changed
            if (
              sessionData.clientInfo &&
              Array.isArray(sessionData.clientInfo.redirect_uris) &&
              sessionData.clientInfo.redirect_uris.includes(redirectUri)
            ) {
              return sessionData.clientInfo;
            }
            return undefined;
          },
          saveClientInformation: (info) => {
            sessionData.clientInfo = info;
            this.oauthStore[pluginId] = sessionData;
            this.saveOAuthStore();
          },
          tokens: () => sessionData.tokens,
          saveTokens: (tokens) => {
            sessionData.tokens = tokens;
            this.oauthStore[pluginId] = sessionData;
            this.saveOAuthStore();
          },
          redirectToAuthorization: async (authorizationUrl) => {
            console.log(`[PluginsManager] Opening OAuth URL for ${pluginName}:`, authorizationUrl.toString());
            await shell.openExternal(authorizationUrl.toString());
          },
          saveCodeVerifier: (verifier) => {
            sessionData.codeVerifier = verifier;
          },
          codeVerifier: () => sessionData.codeVerifier || '',
        };

        // Timeout after 3 minutes if user doesn't complete browser login
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('OAuth login timed out after 3 minutes.'));
        }, 180000);

        try {
          const result = await auth(provider, { serverUrl });
          if (result === 'AUTHORIZED' && sessionData.tokens) {
            cleanup();
            resolve(sessionData.tokens);
          }
          // If result === 'REDIRECT', browser is now open and waiting for /oauth/callback
        } catch (err) {
          cleanup();
          reject(err);
        }
      });
    });
  }

  /**
   * Connects & installs a plugin with REAL authentication & live MCP verification.
   */
  async addCustomPlugin(pluginData) {
    if (!pluginData || !pluginData.name) {
      return { success: false, error: 'Plugin name is required.' };
    }

    const id =
      (pluginData.id || pluginData.name)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-|-$/g, '') || `plugin-${Date.now()}`;

    const mcpManager = require('./mcp_manager');
    const mcpServer = pluginData.mcpServer || {};
    const remoteUrl = mcpServer.url || pluginData.mcpUrl || null;

    // 1. If this is a Remote MCP Server (streamable-http / sse)
    if (remoteUrl) {
      let headers = { ...(mcpServer.headers || {}) };
      const savedOAuth = this.oauthStore[id]?.tokens;
      if (savedOAuth?.access_token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${savedOAuth.access_token}`;
      }

      // First attempt direct connection (works if public server or already has valid token/header)
      let connectedTools = [];
      let needsOAuth = false;

      try {
        const connRes = await mcpManager.connectServer(id, {
          transport: mcpServer.transport || 'streamable-http',
          url: remoteUrl,
          headers,
        });
        connectedTools = connRes.tools || [];
      } catch (connErr) {
        const msg = String(connErr.message || '');
        if (connErr.code === 401 || msg.includes('401') || msg.includes('Unauthorized') || msg.includes('Forbidden') || pluginData.authType === 'mcp-oauth') {
          needsOAuth = true;
        } else {
          return {
            success: false,
            error: `Could not connect to ${pluginData.name} server (${remoteUrl}): ${msg}`,
          };
        }
      }

      // Trigger real browser OAuth 2.1 flow if unauthorized
      if (needsOAuth) {
        try {
          const tokens = await this.runMcpOAuthFlow(id, remoteUrl, pluginData.name);
          if (!tokens || !tokens.access_token) {
            return {
              success: false,
              error: `Authorization with ${pluginData.name} was not completed.`,
            };
          }
          headers['Authorization'] = `Bearer ${tokens.access_token}`;
          const connRes = await mcpManager.connectServer(id, {
            transport: mcpServer.transport || 'streamable-http',
            url: remoteUrl,
            headers,
          });
          connectedTools = connRes.tools || [];
        } catch (oauthErr) {
          // If dynamic client registration is forbidden on this host, ask user for token/header via modal
          return {
            success: false,
            requiresCredentials: true,
            authPortalUrl: pluginData.authPortalUrl || remoteUrl,
            error: oauthErr.message,
          };
        }
      }

      const newPlugin = {
        id,
        name: pluginData.name.trim(),
        description: (pluginData.description || '').trim(),
        category: pluginData.category || 'mcp',
        icon: pluginData.icon || id,
        imageUrl: pluginData.imageUrl || null,
        repoUrl: pluginData.repoUrl || pluginData.authPortalUrl || null,
        isEnabled: true,
        connected: true,
        toolsCount: connectedTools.length,
        tools: connectedTools.map((t) => ({ name: t.name, description: t.description })),
        mcpServer: {
          transport: mcpServer.transport || 'streamable-http',
          url: remoteUrl,
          headers,
        },
        config: pluginData.config || {},
        createdAt: new Date().toISOString(),
      };

      const existingIdx = this.state.customPlugins.findIndex((p) => p.id === id);
      if (existingIdx !== -1) {
        this.state.customPlugins[existingIdx] = newPlugin;
      } else {
        this.state.customPlugins.push(newPlugin);
      }
      this.save();

      // Persist in mcp_servers.json
      const mcpConfig = mcpManager.getConfig();
      mcpConfig.mcpServers = mcpConfig.mcpServers || {};
      mcpConfig.mcpServers[id] = {
        transport: newPlugin.mcpServer.transport,
        url: remoteUrl,
        headers,
        enabled: true,
        description: newPlugin.description,
      };
      mcpManager.saveConfig(mcpConfig);

      return { success: true, plugin: newPlugin, toolsCount: connectedTools.length };
    }

    // 2. Local Package MCP Server (stdio: npx / uvx)
    if (mcpServer.command) {
      let connectedTools = [];
      try {
        const connRes = await mcpManager.connectServer(id, {
          transport: 'stdio',
          command: mcpServer.command,
          args: mcpServer.args || [],
          env: mcpServer.env || {},
        });
        connectedTools = connRes.tools || [];
      } catch (err) {
        return {
          success: false,
          error: `Failed to start ${pluginData.name} (${mcpServer.command} ${(mcpServer.args || []).join(' ')}): ${err.message}`,
        };
      }

      const newPlugin = {
        id,
        name: pluginData.name.trim(),
        description: (pluginData.description || '').trim(),
        category: pluginData.category || 'mcp',
        icon: pluginData.icon || id,
        imageUrl: pluginData.imageUrl || null,
        repoUrl: pluginData.repoUrl || pluginData.authPortalUrl || null,
        isEnabled: true,
        connected: true,
        toolsCount: connectedTools.length,
        tools: connectedTools.map((t) => ({ name: t.name, description: t.description })),
        mcpServer: {
          transport: 'stdio',
          command: mcpServer.command,
          args: mcpServer.args || [],
          env: mcpServer.env || {},
        },
        config: pluginData.config || {},
        createdAt: new Date().toISOString(),
      };

      const existingIdx = this.state.customPlugins.findIndex((p) => p.id === id);
      if (existingIdx !== -1) {
        this.state.customPlugins[existingIdx] = newPlugin;
      } else {
        this.state.customPlugins.push(newPlugin);
      }
      this.save();

      const mcpConfig = mcpManager.getConfig();
      mcpConfig.mcpServers = mcpConfig.mcpServers || {};
      mcpConfig.mcpServers[id] = {
        transport: 'stdio',
        command: mcpServer.command,
        args: mcpServer.args || [],
        env: mcpServer.env || {},
        enabled: true,
        description: newPlugin.description,
      };
      mcpManager.saveConfig(mcpConfig);

      return { success: true, plugin: newPlugin, toolsCount: connectedTools.length };
    }

    return { success: false, error: 'Plugin configuration requires a remote MCP URL or stdio command.' };
  }

  deletePlugin(pluginId) {
    if (DEFAULT_OFFICIAL_PLUGINS.some((p) => p.id === pluginId)) {
      return { success: false, error: 'Cannot delete official plugins. You can disable them instead.' };
    }

    const beforeLen = this.state.customPlugins.length;
    this.state.customPlugins = this.state.customPlugins.filter((p) => p.id !== pluginId);
    if (this.state.customPlugins.length !== beforeLen) {
      this.save();
      delete this.oauthStore[pluginId];
      this.saveOAuthStore();

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

  cleanPluginName(rawName, title) {
    if (title && title.trim()) return title.trim();
    const parts = rawName.split('/');
    const last = parts[parts.length - 1] || rawName;
    return last
      .replace(/^(mcp-server-|server-|mcp-)/i, '')
      .replace(/(-mcp|-server)$/i, '')
      .split(/[-_.]/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  cleanPluginDescription(rawDesc) {
    if (!rawDesc) return 'Connect external tools and actions via Model Context Protocol.';
    return (
      rawDesc
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140) || 'Connect external tools and actions via Model Context Protocol.'
    );
  }

  inferCategory(name, desc) {
    const text = `${name} ${desc}`.toLowerCase();
    if (/mail|slack|chat|message|teams|zoom|discord|telegram|whatsapp|inbox|intercom|sms/.test(text)) {
      return 'Communication';
    }
    if (/design|canva|figma|video|image|audio|voice|music|render|3d|svg|animation|heygen|runway/.test(text)) {
      return 'Creativity';
    }
    if (/stock|crypto|finance|stripe|payment|invoice|bank|trading|market|sec|portfolio|tax|wallet|paypal/.test(text)) {
      return 'Finance';
    }
    if (/health|fitness|workout|calorie|nutrition|medical|gym|sleep|strava|coros|hevy/.test(text)) {
      return 'Healthcare';
    }
    if (/flight|hotel|travel|booking|trip|airline|weather|map|expedia|skyscanner/.test(text)) {
      return 'Travel';
    }
    if (/spotify|game|sport|movie|tarot|astro|fantasy|media|youtube|stream/.test(text)) {
      return 'Entertainment';
    }
    if (/paper|research|scholar|citation|arxiv|pubmed|zotero|study|course|learn|academy|science/.test(text)) {
      return 'Education';
    }
    if (/crm|hubspot|sales|monday|asana|lead|deal|marketing|shopify|commerce|dropbox|customer/.test(text)) {
      return 'Sales';
    }
    return 'Developer Tools';
  }

  /**
   * Fetches from both the Curated Multi-Category Directory AND the live Official MCP Registry
   * (https://registry.modelcontextprotocol.io/v0/servers)
   */
  async fetchMcpRegistry(queryOrOpts = '') {
    const query = typeof queryOrOpts === 'string' ? queryOrOpts : queryOrOpts?.query || '';
    const cursor = typeof queryOrOpts === 'object' ? queryOrOpts?.cursor || '' : '';

    const liveItems = [];
    let nextCursor = null;

    // 1. Query Official MCP Registry (registry.modelcontextprotocol.io)
    try {
      const params = new URLSearchParams({
        version: 'latest',
        limit: '50',
      });
      if (query && query.trim()) {
        params.set('search', query.trim());
      }
      if (cursor) {
        params.set('cursor', cursor);
      }

      const url = `https://registry.modelcontextprotocol.io/v0/servers?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'Grokki-Studio' },
      });

      if (res.ok) {
        const data = await res.json();
        nextCursor = data?.metadata?.nextCursor || null;

        if (Array.isArray(data?.servers)) {
          for (const entry of data.servers) {
            const srv = entry?.server;
            if (!srv || !srv.name) continue;

            const id = srv.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
            const name = this.cleanPluginName(srv.name, srv.title);
            const description = this.cleanPluginDescription(srv.description);
            const iconObj = Array.isArray(srv.icons) && srv.icons.length > 0 ? srv.icons[0] : null;
            const imageUrl = iconObj?.src || null;
            const remote = Array.isArray(srv.remotes) && srv.remotes.length > 0 ? srv.remotes[0] : null;
            const pkg = Array.isArray(srv.packages) && srv.packages.length > 0 ? srv.packages[0] : null;

            if (!remote && !pkg) continue;

            const requiredHeaders = Array.isArray(remote?.headers)
              ? remote.headers
                  .filter((h) => h.name)
                  .map((h) => ({
                    name: h.name,
                    label: h.description || h.name,
                    placeholder: h.value || `Enter ${h.name}`,
                    isSecret: Boolean(h.isSecret),
                  }))
              : [];

            const requiredEnv = Array.isArray(pkg?.environmentVariables)
              ? pkg.environmentVariables
                  .filter((ev) => ev.name)
                  .map((ev) => ({
                    name: ev.name,
                    label: ev.description || ev.name,
                    placeholder: `Enter ${ev.name}`,
                    isSecret: Boolean(ev.isSecret),
                  }))
              : [];

            let command = null;
            let args = [];
            if (pkg) {
              if (pkg.registryType === 'pypi' || pkg.runtimeHint === 'uvx') {
                command = 'uvx';
                args = [pkg.identifier];
              } else {
                command = 'npx';
                args = ['-y', pkg.identifier];
              }
              if (Array.isArray(pkg.packageArguments)) {
                for (const arg of pkg.packageArguments) {
                  if (arg.type === 'positional' && arg.value) args.push(arg.value);
                  else if (arg.type === 'named' && arg.name) {
                    args.push(arg.name);
                    if (arg.value) args.push(arg.value);
                  }
                }
              }
            }

            liveItems.push({
              id,
              name,
              fullName: srv.name,
              description,
              category: this.inferCategory(name, description),
              imageUrl,
              authPortalUrl: srv.websiteUrl || srv.repository?.url || null,
              authType: remote
                ? requiredHeaders.length > 0
                  ? 'api-key'
                  : 'mcp-oauth'
                : requiredEnv.length > 0
                ? 'api-key'
                : 'stdio-zero',
              mcpUrl: remote ? remote.url : null,
              transport: remote ? remote.type || 'streamable-http' : 'stdio',
              command,
              args,
              requiredHeaders,
              requiredEnv,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[PluginsManager] Official MCP registry fetch error:', err.message);
    }

    // 2. Filter Curated Directory
    let curatedMatches = CURATED_PLUGIN_DIRECTORY;
    if (query && query.trim()) {
      const lower = query.toLowerCase().trim();
      curatedMatches = CURATED_PLUGIN_DIRECTORY.filter(
        (item) =>
          item.name.toLowerCase().includes(lower) ||
          item.description.toLowerCase().includes(lower) ||
          item.category.toLowerCase().includes(lower) ||
          item.id.toLowerCase().includes(lower)
      );
    }

    // Merge without duplicates (if cursor pagination, return only new live items)
    if (cursor) {
      return {
        success: true,
        source: 'live',
        nextCursor,
        servers: liveItems,
      };
    }

    const seenIds = new Set(curatedMatches.map((s) => s.id));
    const seenNames = new Set(curatedMatches.map((s) => s.name.toLowerCase()));
    const combined = [...curatedMatches];

    for (const item of liveItems) {
      const lowerName = item.name.toLowerCase();
      if (!seenIds.has(item.id) && !seenNames.has(lowerName)) {
        seenIds.add(item.id);
        seenNames.add(lowerName);
        combined.push(item);
      }
    }

    return {
      success: true,
      source: 'live',
      nextCursor,
      servers: combined,
    };
  }
}

const pluginsManager = new PluginsManager();

module.exports = {
  pluginsManager,
  DEFAULT_OFFICIAL_PLUGINS,
  CURATED_PLUGIN_DIRECTORY,
};
