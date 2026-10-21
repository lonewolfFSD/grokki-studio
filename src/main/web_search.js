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
 * Searches the web via DuckDuckGo HTML interface.
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[WebSearch] Search request failed with status: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const results = parseDuckDuckGoHtml(html, maxResults);
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
        `[${s.id}] "${s.title}" (${s.hostname})\nURL: ${s.url}\nSummary: ${s.snippet}`
    )
    .join('\n\n');

  return `\n\n[LIVE WEB SEARCH GROUNDING]
Real-time web sources retrieved for: "${query}"

${sourcesFormatted}

GROUNDING RULES FOR ANSWER:
1. Use the above real-time sources to provide an accurate, factually grounded, and comprehensive response.
2. Cite sources using bracketed numerical citations like [1], [2], or [1, 2] immediately after any statement, metric, or fact derived from that source.
3. Keep citations clean (e.g. [1]). Do not invent sources that are not in the list above.
4. If sources contradict each other, briefly note the discrepancy.`;
}

module.exports = {
  searchWeb,
  buildGroundingPrompt,
};
