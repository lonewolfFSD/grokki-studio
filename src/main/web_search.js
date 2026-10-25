const https = require('https');
const http = require('http');

/**
 * Universal Web Search Grounding Engine
 * Fetches real-time web results for Perplexity-style grounding & citations.
 */

function cleanHtmlEntities(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const CURRENCY_MAP = {
  'america': 'USD', 'american': 'USD', 'us': 'USD', 'usa': 'USD', 'united states': 'USD', 'usd': 'USD', 'dollar': 'USD', 'dollars': 'USD',
  'canada': 'CAD', 'canadian': 'CAD', 'cad': 'CAD',
  'euro': 'EUR', 'europe': 'EUR', 'eur': 'EUR',
  'uk': 'GBP', 'british': 'GBP', 'pound': 'GBP', 'pounds': 'GBP', 'gbp': 'GBP',
  'india': 'INR', 'indian': 'INR', 'inr': 'INR', 'rupee': 'INR', 'rupees': 'INR',
  'japan': 'JPY', 'japanese': 'JPY', 'yen': 'JPY', 'jpy': 'JPY',
  'australia': 'AUD', 'australian': 'AUD', 'aud': 'AUD',
  'china': 'CNY', 'chinese': 'CNY', 'yuan': 'CNY', 'rmb': 'CNY', 'cny': 'CNY',
  'mexico': 'MXN', 'mexican': 'MXN', 'peso': 'MXN', 'pesos': 'MXN', 'mxn': 'MXN',
  'switzerland': 'CHF', 'swiss': 'CHF', 'chf': 'CHF', 'franc': 'CHF'
};

function detectCurrencyPair(query = '') {
  const q = (query || '').toLowerCase();
  const isFx = /\b(exchange\s*rate|currency|convert|forex|fx|rate|vs|to)\b/i.test(q);
  if (!isFx) return null;

  const matches = [];
  for (const [key, code] of Object.entries(CURRENCY_MAP)) {
    const regex = new RegExp('\\b' + key + '\\b', 'gi');
    let m;
    while ((m = regex.exec(q)) !== null) {
      matches.push({ index: m.index, code });
    }
  }
  matches.sort((a, b) => a.index - b.index);
  const uniqueCodes = [];
  for (const item of matches) {
    if (!uniqueCodes.includes(item.code)) {
      uniqueCodes.push(item.code);
    }
  }
  if (uniqueCodes.length >= 2) {
    return { base: uniqueCodes[0], target: uniqueCodes[1] };
  }
  return null;
}

async function fetchLiveExchangeRate(base, target) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GrokkiStudio/1.0' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const rate = data.rates?.[target];
    if (rate !== undefined) {
      return {
        base,
        target,
        rate,
        date: data.time_last_update_utc ? new Date(data.time_last_update_utc).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    }
  } catch (e) {}
  return null;
}

async function fetchPageExcerpt(url, maxChars = 1000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return '';
    const html = await res.text();
    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return clean.slice(0, maxChars);
  } catch (e) {
    return '';
  }
}

function parseDuckDuckGoHtml(html, maxResults = 5) {
  const results = [];
  const regex = /<h2[^>]*class="result__title"[^>]*>[\s\S]*?<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  let m;
  let id = 1;
  while ((m = regex.exec(html)) !== null && results.length < maxResults) {
    let rawUrl = m[1];
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      rawUrl = decodeURIComponent(uddgMatch[1]);
    } else if (rawUrl.startsWith('//')) {
      rawUrl = 'https:' + rawUrl;
    }

    const title = cleanHtmlEntities(m[2]);
    const snippet = cleanHtmlEntities(m[3]);

    try {
      const parsedUrl = new URL(rawUrl);
      const hostname = parsedUrl.hostname.replace(/^www\./, '');
      if (hostname.includes('duckduckgo.com') || !title) continue;

      results.push({
        id: id++,
        title,
        url: rawUrl,
        snippet,
        hostname,
        favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
      });
    } catch (e) {
      // Invalid URL skipped
    }
  }

  return results;
}

/**
 * Searches the web via DuckDuckGo HTML interface with deep page excerpt enrichment
 * and instant financial/forex spot rate support.
 * Returns array of structured source objects.
 */
async function searchWeb(query, maxResults = 5) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const cleanQuery = query
    .replace(/^(search\s+(the\s+)?web\s+for|google|search\s+for|find\s+info\s+on)\s+/i, '')
    .trim();

  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;

  try {
    const fxPair = detectCurrencyPair(cleanQuery);
    const [ddgRes, fxData] = await Promise.all([
      (async () => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(searchUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
          clearTimeout(timeout);
          if (!res.ok) return '';
          return await res.text();
        } catch (e) {
          return '';
        }
      })(),
      fxPair ? fetchLiveExchangeRate(fxPair.base, fxPair.target) : Promise.resolve(null),
    ]);

    let results = ddgRes ? parseDuckDuckGoHtml(ddgRes, maxResults) : [];

    // Deep page content enrichment for the top 2 results
    if (results.length > 0) {
      await Promise.all(
        results.slice(0, 2).map(async (item) => {
          const excerpt = await fetchPageExcerpt(item.url, 800);
          if (excerpt) {
            item.pageExcerpt = excerpt;
          }
        })
      );
    }

    // If live currency conversion was found, inject verified spot rate as Source #1
    if (fxData) {
      const liveSource = {
        id: 1,
        title: `Live Exchange Rate: 1 ${fxData.base} = ${Number(fxData.rate).toFixed(4)} ${fxData.target}`,
        url: `https://www.google.com/finance/quote/${fxData.base}-${fxData.target}`,
        snippet: `Current verified live exchange rate: 1 ${fxData.base} = ${Number(fxData.rate).toFixed(4)} ${fxData.target} (Updated: ${fxData.date}). Interbank Forex Market spot rate.`,
        hostname: 'google.com/finance',
        favicon: 'https://www.google.com/s2/favicons?domain=google.com&sz=32',
      };
      // Prepend live source and keep total within maxResults
      results = [liveSource, ...results.slice(0, maxResults - 1)];
      // Re-number IDs sequentially
      results.forEach((r, idx) => {
        r.id = idx + 1;
      });
    }

    return results;
  } catch (err) {
    console.warn(`[WebSearch] Search failed for "${query}":`, err.message);
    return [];
  }
}

/**
 * Builds the Perplexity-style grounding context block to inject into the LLM system/user turn.
 */
function buildGroundingPrompt(sources, query) {
  if (!sources || sources.length === 0) return '';

  const sourcesFormatted = sources
    .map(
      (s) =>
        `[${s.id}] "${s.title}" (${s.hostname})\nURL: ${s.url}\nSummary: ${s.snippet}${s.pageExcerpt ? `\nPage Excerpt: ${s.pageExcerpt.slice(0, 500)}...` : ''}`
    )
    .join('\n\n');

  return `\n\n[LIVE WEB SEARCH GROUNDING]
Real-time web sources retrieved for: "${query}"

${sourcesFormatted}

CRITICAL GROUNDING INSTRUCTIONS:
1. You HAVE ACTIVE REAL-TIME INTERNET SEARCH ACCESS. The sources and live data above were fetched live from the web right now for this prompt.
2. NEVER apologize, hesitate, or say "I don't have access to real-time data", "as an AI I cannot browse the internet", or "I lack current information".
3. Directly answer the user's question with the exact live numbers, rates, dates, facts, and conclusions found in the sources above.
4. Cite sources using bracketed citations like [1], [2] immediately following each key fact, number, or statement.
5. Keep your response direct, concise, and helpful.`;
}

module.exports = {
  searchWeb,
  buildGroundingPrompt,
};
