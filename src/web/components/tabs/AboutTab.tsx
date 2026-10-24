// AboutTab.tsx
import React, { useEffect, useState } from 'react';
import { Star, Coffee, Bug, History, ExternalLink, Users } from 'lucide-react';
import { SystemInfo } from '../../types/jarvis';
import grokkiLogo from '../../assets/grokki_logo.png';
import grokkiWordmarkDark from '../../assets/grokki_wordmark.png';
import grokkiWordmarkLight from '../../assets/grokki_wordmark_light.png';
import { FaGithub } from 'react-icons/fa6';

const REPO = 'lonewolfFSD/grokki-studio';
const REPO_URL = `https://github.com/${REPO}`;
const DEVELOPER = 'lonewolfFSD';
const BMC_URL = 'https://buymeacoffee.com/lonewolffsd';

const APP_VERSION = '1.52.324';
const RELEASE = '2026.10';
const BUILD = '2026.10.16';

const STARS_CACHE_KEY = 'grokki_about_stars';
const CONTRIBUTORS_CACHE_KEY = 'grokki_about_contributors';

interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

interface AboutTabProps {
  systemInfo: SystemInfo | null;
  hotkey: string;
}

const readCache = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeCache = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const formatStars = (n: number | null): string => {
  if (n === null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
};

const cardClass =
  'bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-2xl shadow-xs';

const linkRowClass =
  'group flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1c24] transition-colors';

export const AboutTab = React.memo<AboutTabProps>(({ systemInfo, hotkey }) => {
  const [stars, setStars] = useState<number | null>(() => readCache<number | null>(STARS_CACHE_KEY, null));
  const [contributors, setContributors] = useState<Contributor[]>(() =>
    readCache<Contributor[]>(CONTRIBUTORS_CACHE_KEY, [])
  );
  const [contributorsLoaded, setContributorsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`https://api.github.com/repos/${REPO}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled || typeof data.stargazers_count !== 'number') return;
        setStars(data.stargazers_count);
        writeCache(STARS_CACHE_KEY, data.stargazers_count);
      })
      .catch(() => {});

    fetch(`https://api.github.com/repos/${REPO}/contributors?per_page=12`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const list: Contributor[] = data
          .filter((c) => c && c.type !== 'Bot')
          .map((c) => ({
            login: c.login,
            avatar_url: c.avatar_url,
            html_url: c.html_url,
            contributions: c.contributions,
          }));
        setContributors(list);
        writeCache(CONTRIBUTORS_CACHE_KEY, list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setContributorsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const osLabel = systemInfo
    ? `${systemInfo.platform === 'win32' ? 'Windows' : systemInfo.platform} (${systemInfo.arch})`
    : 'Windows x64';

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl mt-16 font-bold tracking-tight text-gray-900 dark:text-gray-100">
            About Grokki Studio
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Version info, credits, and ways to support the project.
          </p>
        </div>
        <span className="text-[10px] font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#1e2029] font-mono">
          v{APP_VERSION}
        </span>
      </div>

      {/* Hero */}
      <div className={`${cardClass} p-6 flex flex-col gap-6`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center -mt-2 gap-4">
            <img
              src={grokkiLogo}
              alt="Grokki Studio"
              className="w-14 h-14 mt-2 rounded-2xl object-contain flex-shrink-0"
            />
            <div>
              <img
                src={grokkiWordmarkDark}
                alt="Grokki Studio"
                className="hidden dark:block h-14 -mb-4 w-auto object-contain select-none"
              />
              <img
                src={grokkiWordmarkLight}
                alt="Grokki Studio"
                className="block dark:hidden h-14 -mb-4 w-auto object-contain select-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Autonomous Multimodal Operating System Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#262833] hover:bg-gray-200/70 dark:hover:bg-[#21242e] transition-colors active:scale-[0.98]"
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Star on GitHub</span>
              
            </a>

            <a
              href={BMC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-black bg-[#FFDD00] hover:bg-[#f5d300] transition-colors active:scale-[0.98]"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Buy me a coffee</span>
            </a>
          </div>
        </div>

        {/* Version facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-gray-100 dark:border-[#1e2029]">
          {[
            ['Version', `v${APP_VERSION}`],
            ['Release', RELEASE],
            ['Build', BUILD],
            ['Platform', osLabel],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{label}</span>
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 font-mono truncate">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Developer + Links */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className={`${cardClass} p-5 md:col-span-3 flex flex-col gap-4`}>

          <a
            href={`https://github.com/${DEVELOPER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 group"
          >
            <img
              src={`https://github.com/${DEVELOPER}.png?size=96`}
              alt={DEVELOPER}
              className="w-12 h-12 rounded-full border border-gray-200 dark:border-[#262833] object-cover bg-gray-100 dark:bg-[#1a1c24]"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:underline underline-offset-4">
                {DEVELOPER}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Creator &amp; maintainer
              </p>
            </div>
          </a>
          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Grokki Studio is built and maintained by an independent developer. If it saves you time,
            a star or a coffee goes a long way.
          </p>
        </div>

        <div className={`${cardClass} p-2 md:col-span-2 flex flex-col`}>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={linkRowClass}>
            <span className="flex text-[12.5px] font-semibold items-center gap-2.5">
              <FaGithub className="w-4.5 h-4.5 -mt-0.5 text-gray-500 dark:text-gray-400" />
              Source code
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
          </a>
          <a
            href={`${REPO_URL}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkRowClass}
          >
            <span className="flex text-[12.5px] font-semibold items-center gap-2.5">
              <History className="w-4.5 h-4.5 -mt-0.5 text-gray-500 dark:text-gray-400" />
              Changelog
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
          </a>
          <a
            href={`${REPO_URL}/issues/new`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkRowClass}
          >
            <span className="flex text-[12.5px] font-semibold items-center gap-2.5">
              <Bug className="w-4.5 h-4.5 -mt-0.5 text-gray-500 dark:text-gray-400" />
              Report an issue
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
          </a>
        </div>
      </div>

      {/* Contributors */}
      <div className={`${cardClass} p-5 flex flex-col gap-4`}>
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight uppercase">
            
            Contributors
          </h4>
          <a
            href={`${REPO_URL}/graphs/contributors`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            View all
          </a>
        </div>

        {contributors.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {contributors.map((c) => (
              <a
                key={c.login}
                href={c.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1a1c24] transition-colors"
              >
                <img
                  src={c.avatar_url}
                  alt={c.login}
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-[#262833] bg-gray-100 dark:bg-[#1a1c24]"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {c.login}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                    {c.contributions} commit{c.contributions === 1 ? '' : 's'}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {contributorsLoaded
              ? 'Could not load contributors right now.'
              : 'Loading contributors…'}
          </p>
        )}
      </div>

      {/* Diagnostics */}
      <div className={`${cardClass} p-5 flex flex-col gap-3`}>
        <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight uppercase">
          System
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 dark:text-gray-500 text-[11px]">Operating System</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">{osLabel}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 dark:text-gray-500 text-[11px]">Processor</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono truncate">
              {systemInfo?.cpuModel || 'CPU'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 dark:text-gray-500 text-[11px]">Memory</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
              {systemInfo ? `${systemInfo.freeMemGb} GB free / ${systemInfo.totalMemGb} GB` : '8.0 GB RAM'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400 dark:text-gray-500 text-[11px]">Summon Hotkey</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">{hotkey}</span>
          </div>
        </div>
      </div>
    </div>
  );
});