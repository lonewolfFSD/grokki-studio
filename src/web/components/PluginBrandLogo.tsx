import React, { useState } from 'react';

// Local high-res official brand logos bundled with Grokki Studio
import googleLogo from '../assets/logos/google.png';
import githubLogo from '../assets/logos/github.png';
import notionLogo from '../assets/logos/notion.png';
import obsidianLogo from '../assets/logos/obsidian.png';
import whatsappLogo from '../assets/logos/whatsapp.svg';
import spotifyLogo from '../assets/logos/spotify.svg';
import appleMusicLogo from '../assets/logos/applemusic.svg';

/**
 * Maps plugin IDs or names to their official brand website domain
 * so we always load the real official high-resolution brand logo.
 */
export const PLUGIN_BRAND_DOMAINS: Record<string, string> = {
  // Popular & Workspace
  gmail: 'mail.google.com',
  'google-drive': 'drive.google.com',
  'google-workspace': 'google.com',
  'google-calendar': 'calendar.google.com',
  'google-docs': 'docs.google.com',
  'google-sheets': 'sheets.google.com',
  github: 'github.com',
  'git-tools': 'github.com',
  supabase: 'supabase.com',
  notion: 'notion.so',
  'notion-mcp': 'notion.so',
  obsidian: 'obsidian.md',
  whatsapp: 'whatsapp.com',
  linkedin: 'linkedin.com',
  linktree: 'linktr.ee',
  'openai-platform': 'openai.com',
  openai: 'openai.com',

  // New & Noteworthy
  'icloud-mail': 'icloud.com',
  'icloud-calendar': 'icloud.com',
  elevenlabs: 'elevenlabs.io',
  tripsy: 'tripsy.app',
  sonos: 'sonos.com',
  hevy: 'hevy.com',
  'hevy-pop': 'hevy.com',
  atlassian: 'atlassian.com',
  jira: 'atlassian.com',
  confluence: 'atlassian.com',
  cloudflare: 'cloudflare.com',
  'cloudflare-docs': 'cloudflare.com',

  // Small Business
  dropbox: 'dropbox.com',
  hubspot: 'hubspot.com',
  'hubspot-sb': 'hubspot.com',
  asana: 'asana.com',
  'asana-sb': 'asana.com',
  webflow: 'webflow.com',
  'webflow-sb': 'webflow.com',
  intercom: 'intercom.com',
  'intercom-sb': 'intercom.com',
  shopify: 'shopify.com',
  calendly: 'calendly.com',
  typeform: 'typeform.com',
  mailchimp: 'mailchimp.com',
  airtable: 'airtable.com',
  clickup: 'clickup.com',
  trello: 'trello.com',

  // Communication
  'outlook-email': 'outlook.live.com',
  outlook: 'outlook.live.com',
  slack: 'slack.com',
  'hostinger-mail': 'hostinger.com',
  'microsoft-teams': 'teams.microsoft.com',
  teams: 'teams.microsoft.com',
  zoom: 'zoom.us',
  discord: 'discord.com',
  telegram: 'telegram.org',
  'x-twitter': 'x.com',
  twitter: 'x.com',
  reddit: 'reddit.com',
  loom: 'loom.com',

  // Creativity
  canva: 'canva.com',
  higgsfield: 'higgsfield.ai',
  figma: 'figma.com',
  runway: 'runwayml.com',
  'product-design': 'uxpilot.ai',
  heygen: 'heygen.com',
  miro: 'miro.com',
  framer: 'framer.com',
  spline: 'spline.design',
  suno: 'suno.com',
  youtube: 'youtube.com',

  // Developer Tools
  tinyfish: 'tinyfish.ai',
  vercel: 'vercel.com',
  exa: 'exa.ai',
  lovable: 'lovable.dev',
  wpvibe: 'wordpress.org',
  base44: 'base44.com',
  linear: 'linear.app',
  sentry: 'sentry.io',
  neon: 'neon.tech',
  posthog: 'posthog.com',
  datadog: 'datadoghq.com',
  docker: 'docker.com',
  'brave-search': 'brave.com',
  perplexity: 'perplexity.ai',
  firebase: 'firebase.google.com',
  aws: 'aws.amazon.com',

  // Healthcare & Fitness
  coros: 'coros.com',
  'calorie-tracker': 'myfitnesspal.com',
  'freddy-health': 'freddy.Ai',
  caliber: 'caliberstrong.com',
  'calories-club': 'loseit.com',
  strava: 'strava.com',
  oura: 'ouraring.com',
  whoop: 'whoop.com',

  // Finance
  'interactive-brokers': 'interactivebrokers.com',
  'public-equity': 'public.com',
  binance: 'binance.com',
  stripe: 'stripe.com',
  longbridge: 'longbridge.com',
  massive: 'polygon.io',
  paypal: 'paypal.com',
  coinbase: 'coinbase.com',
  tradingview: 'tradingview.com',
  quickbooks: 'quickbooks.intuit.com',
  xero: 'xero.com',

  // Travel
  'booking-com': 'booking.com',
  skyscanner: 'skyscanner.net',
  expedia: 'expedia.com',
  'trip-com': 'trip.com',
  'flight-network': 'flightnetwork.com',
  tripadvisor: 'tripadvisor.com',
  airbnb: 'airbnb.com',
  kayak: 'kayak.com',
  uber: 'uber.com',

  // Entertainment
  'flaim-fantasy': 'espn.com',
  'daily-tarot': 'labyrinthos.co',
  spotify: 'spotify.com',
  'apple-music': 'music.apple.com',
  'steer-astro': 'costarastrology.com',
  'fantasybot-sports': 'sleeper.com',
  twitch: 'twitch.tv',
  'chess-com': 'chess.com',
  tmdb: 'themoviedb.org',

  // Education
  consensus: 'consensus.app',
  scispace: 'scispace.com',
  zotero: 'zotero.org',
  acumen: 'arxiv.org',
  'sider-scholar': 'sider.ai',
  scite: 'scite.ai',
  coursera: 'coursera.org',
  'wolfram-alpha': 'wolframalpha.com',
  'khan-academy': 'khanacademy.org',
  duolingo: 'duolingo.com',

  // Sales & CRM
  'monday-com': 'monday.com',
  docusign: 'docusign.com',
  zendesk: 'zendesk.com',
  'apollo-io': 'apollo.io',
  pipedrive: 'pipedrive.com',
};

const LOCAL_BRAND_ASSETS: Record<string, string> = {
  'google-workspace': googleLogo,
  github: githubLogo,
  'git-tools': githubLogo,
  notion: notionLogo,
  'notion-mcp': notionLogo,
  obsidian: obsidianLogo,
  whatsapp: whatsappLogo,
  spotify: spotifyLogo,
  'apple-music': appleMusicLogo,
};

// Official product-specific brand icons where domain favicons return generic company logos
const DIRECT_BRAND_ICONS: Record<string, string> = {
  gmail: 'https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png',
  'google-drive': 'https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
  'google-calendar': 'https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_15_2x.png',
  'google-docs': 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico',
  'google-sheets': 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico',
};

/**
 * Infers a clean brand domain from any plugin ID, name, or URL.
 */
export function resolvePluginBrandDomain(
  id?: string,
  name?: string,
  authPortalUrl?: string | null,
  mcpUrl?: string | null
): string | null {
  const normId = (id || '').toLowerCase().trim();
  const normName = (name || '').toLowerCase().trim();

  if (PLUGIN_BRAND_DOMAINS[normId]) {
    return PLUGIN_BRAND_DOMAINS[normId];
  }

  for (const [key, domain] of Object.entries(PLUGIN_BRAND_DOMAINS)) {
    if (normId.includes(key) || normName === key || normName.includes(key.replace(/-/g, ' '))) {
      return domain;
    }
  }

  // Extract domain from authPortalUrl or mcpUrl if available
  for (const rawUrl of [authPortalUrl, mcpUrl]) {
    if (!rawUrl) continue;
    try {
      const u = new URL(rawUrl);
      const host = u.hostname.replace(/^(www\.|mcp\.|api\.|docs\.|portal\.|app\.|id\.|dash\.|admin\.|marketplace\.|hpanel\.)/, '');
      if (host && host.includes('.') && !host.includes('127.0.0.1') && !host.includes('localhost') && !host.includes('modelcontextprotocol.io')) {
        return host;
      }
    } catch (_) {}
  }

  return null;
}

export interface PluginBrandLogoProps {
  id: string;
  name?: string;
  imageUrl?: string | null;
  authPortalUrl?: string | null;
  mcpUrl?: string | null;
  className?: string;
  imgClassName?: string;
}

export const PluginBrandLogo: React.FC<PluginBrandLogoProps> = ({
  id,
  name = '',
  imageUrl,
  authPortalUrl,
  mcpUrl,
  className = 'w-10 h-10',
  imgClassName = 'p-[4px]',
}) => {
  const [sourceIndex, setSourceIndex] = useState(0);
  const normId = (id || '').toLowerCase().trim();

  // Build ordered list of real brand logo image sources
  const candidateUrls: string[] = [];

  // 1. Local high-res bundled asset if exact match
  if (LOCAL_BRAND_ASSETS[normId]) {
    candidateUrls.push(LOCAL_BRAND_ASSETS[normId]);
  }

  // 2. Official product-specific icon (e.g. Gmail, Google Drive, Calendar, Docs, Sheets)
  if (DIRECT_BRAND_ICONS[normId] && !candidateUrls.includes(DIRECT_BRAND_ICONS[normId])) {
    candidateUrls.push(DIRECT_BRAND_ICONS[normId]);
  }

  // 3. Explicit imageUrl from plugin / MCP registry
  if (imageUrl && !candidateUrls.includes(imageUrl)) {
    candidateUrls.push(imageUrl);
  }

  // 3. Official domain high-res icon (Google s2 128px + DuckDuckGo fallback)
  const domain = resolvePluginBrandDomain(id, name, authPortalUrl, mcpUrl);
  if (domain) {
    const gIcon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
    const ddgIcon = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
    if (!candidateUrls.includes(gIcon)) candidateUrls.push(gIcon);
    if (!candidateUrls.includes(ddgIcon)) candidateUrls.push(ddgIcon);
  }

  const activeSrc = candidateUrls[sourceIndex];

  if (activeSrc) {
    return (
      <div
        className={`${className} flex items-center justify-center shrink-0 overflow-hidden`}
      >
        <img
          src={activeSrc}
          alt={name || id}
          className={`w-full h-full object-contain ${normId === 'github' || normId === 'git-tools' ? 'dark:invert' : ''} ${imgClassName}`}
          onError={() => setSourceIndex((prev) => prev + 1)}
        />
      </div>
    );
  }

  // Remote Desktop Commander / Native System fallback
  const initials = (name || id || 'PL')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`${className} rounded-xl bg-[#14151a] border border-white/10 flex items-center justify-center text-white font-bold text-xs tracking-tight shrink-0`}
    >
      {initials || 'PL'}
    </div>
  );
};

export default PluginBrandLogo;
