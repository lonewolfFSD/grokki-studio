const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { searchWeb } = require('./web_search');

let PDFParse = null;
try {
  const pdfModule = require('pdf-parse');
  PDFParse = pdfModule.PDFParse || pdfModule.default || pdfModule;
} catch (e) {}

// Active Viva / Oral Exam Quiz State
const vivaState = {
  active: false,
  topic: '',
  sourceExcerpt: '',
  questionNumber: 0,
  totalQuestions: 5,
  score: 0,
  lastQuestion: '',
};

/**
 * Extracts plain text from student files (PDF, Markdown, Text, Code)
 * Safely caps text to prevent token explosion.
 */
async function extractTextFromFile(filePath, maxWords = 10000) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  let extracted = '';

  if (ext === '.pdf') {
    if (!PDFParse) {
      throw new Error('PDF parsing library is not loaded.');
    }
    const buffer = fs.readFileSync(filePath);
    try {
      const parser = new PDFParse({ data: buffer });
      extracted = await parser.getText();
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    } catch (err) {
      // Fallback: simple text buffer string extraction if structured parser fails
      extracted = buffer.toString('utf8').replace(/[^\x20-\x7E\r\n\t]/g, ' ');
    }
  } else if (['.txt', '.md', '.markdown', '.json', '.csv', '.py', '.js', '.ts', '.cpp', '.c', '.java', '.cs', '.html'].includes(ext)) {
    extracted = fs.readFileSync(filePath, 'utf8');
  } else {
    const buffer = fs.readFileSync(filePath);
    extracted = buffer.toString('utf8').replace(/[^\x20-\x7E\r\n\t]/g, ' ');
  }

  extracted = String(extracted || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  const words = extracted.split(/\s+/);
  if (words.length > maxWords) {
    extracted = words.slice(0, maxWords).join(' ') + `\n\n[...Truncated to first ${maxWords} words for optimal study revision...]`;
  }

  return {
    text: extracted,
    totalWords: words.length,
    fileName: path.basename(filePath),
    filePath,
  };
}

/**
 * Builds focused, high-yield academic prompts for university students
 */
function buildStudyPrompt(mode, textContent, topic = '', customInstructions = '') {
  const subjectHeader = topic ? `Subject / Topic: ${topic}` : '';
  const extra = customInstructions ? `Additional Student Request: ${customInstructions}` : '';

  if (mode === 'cheat_sheet') {
    return `You are Grokki, an elite university professor and study coach.
Analyze the following lecture material and create the ULTIMATE 1-PAGE EXAM CHEAT SHEET for revision.

${subjectHeader}
${extra}

### REQUIRED STRUCTURE:
1. 🎯 **Core Principles & High-Yield Definitions**: Key terms with crisp 1-sentence explanations.
2. 📐 **Essential Formulas, Theorems & Laws**: All equations with variable definitions and units.
3. ⚖️ **Comparison Table**: Compare key concepts, algorithms, or theories side-by-side.
4. ⚠️ **Common Exam Traps & Pitfalls**: 3 common student mistakes and how to avoid them.
5. 💡 **Memory Mnemonics**: Clever tricks to memorize difficult lists or sequences.

FORMATTING: Use clean, professional GitHub Flavored Markdown (headings, bold, bullet points, markdown tables). Keep it dense, high-yield, and focused on scoring maximum marks in the exam.

Lecture Content:
"""
${textContent}
"""`;
  }

  if (mode === 'exam_questions') {
    return `You are Grokki, an experienced university examiner creating an exam preparation paper.
Analyze the provided course material and generate the TOP 7 MOST LIKELY EXAM QUESTIONS with complete marking-scheme model answers.

${subjectHeader}
${extra}

### REQUIRED STRUCTURE:
For each question:
- **Question [Number]** (specify marks: e.g. [5 Marks] or [10 Marks])
- **Type**: (Conceptual, Numerical / Derivation, or Problem-Solving / Code)
- **Model Answer**: Complete, high-scoring explanation.
- **Key Points Examiner Looks For**: Bullet points showing where marks are awarded.

FORMATTING: Clean Markdown with bold keywords.

Lecture Content:
"""
${textContent}
"""`;
  }

  if (mode === 'eli5') {
    return `You are Grokki, a master teacher renowned for making the most complex technical topics crystal clear.
Explain the core concepts in this lecture material using the "Feynman Technique" (Explain Like I'm 10).

${subjectHeader}
${extra}

### REQUIRED STRUCTURE:
1. 💡 **The Big Picture (The "Why")**: Why does this topic exist in the real world?
2. 🚀 **Real-World Intuitive Analogies**: Explain every difficult concept, algorithm, or proof using everyday analogies (e.g. comparing network packets to post office mail, or memory pointers to locker numbers).
3. 🧱 **Step-by-Step Breakdown**: Build from simple to advanced without jargon.
4. 🧠 **Quick Concept Check**: 2 fast questions to test understanding with answers.

Lecture Content:
"""
${textContent}
"""`;
  }

  // Default: quick_notes
  return `You are Grokki, an academic summarizer and university study assistant.
Generate clean, beautifully structured lecture revision notes from the provided material.

${subjectHeader}
${extra}

### REQUIRED STRUCTURE:
1. 📌 **Executive Overview**: High-level summary of the lecture in 3 sentences.
2. 📝 **Comprehensive Topic-by-Topic Notes**:
   - Clear Markdown subheadings (###)
   - Bullet points explaining mechanics and details
   - Bold terms for quick visual scanning
3. 🔑 **Key Takeaways & Summary Box**: 5 crucial points to remember for the exam.

Lecture Content:
"""
${textContent}
"""`;
}

/**
 * Saves generated study notes directly to the user's Desktop
 */
function saveStudyDocument(title, content, mode = 'notes') {
  const safeTitle = (title || 'Study_Revision')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .substring(0, 40);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const targetDir = path.join(os.homedir(), 'Desktop', 'Grokki_Study_Notes');

  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {}
  }

  const filename = `${safeTitle}_${mode}_${timestamp}.md`;
  const fullPath = path.join(targetDir, filename);

  const documentHeader = `# ${title || 'Study Revision Notes'}
*Generated by Grokki AI Study Companion on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*
*Mode: ${mode.toUpperCase()}*

---

${content}

---
*Created with Grokki Assistant*
`;

  fs.writeFileSync(fullPath, documentHeader, 'utf8');

  exec(`code "${fullPath}"`, (err) => {
    if (err) {
      exec(`notepad.exe "${fullPath}"`);
    }
  });

  return {
    saved: true,
    fullPath,
    filename,
    directory: targetDir,
  };
}

/**
 * 1. REAL RESEARCH PAPER & CITATION ENGINE
 * Uses 100% Free, No-Key OpenAlex API (250M+ peer-reviewed papers) + arXiv API
 * Generates IEEE, APA 7th, and BibTeX citations automatically.
 */
function reconstructOpenAlexAbstract(invertedIndex) {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (Array.isArray(positions)) {
      for (const pos of positions) {
        words[pos] = word;
      }
    }
  }
  return words.filter(Boolean).join(' ').substring(0, 320);
}

async function searchAcademicPapers(query, maxResults = 4, citationStyle = 'APA') {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) {
    return { success: false, message: 'Please provide a research topic or paper title.' };
  }

  const results = [];

  // A. Query OpenAlex API (Free, No API Key Required, 250M+ Works)
  try {
    const openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(cleanQuery)}&per-page=${maxResults}&sort=cited_by_count:desc`;
    const res = await fetch(openAlexUrl, {
      headers: { 'User-Agent': 'GrokkiStudyAssistant/1.0 (mailto:student@university.edu)' },
    });
    if (res.ok) {
      const data = await res.json();
      const works = data.results || [];
      for (const w of works) {
        const title = w.title || w.display_name || 'Untitled Paper';
        const year = w.publication_year || 'n.d.';
        const citedBy = w.cited_by_count || 0;
        const doiUrl = w.doi || '';
        const oaUrl = w.open_access?.oa_url || w.primary_location?.pdf_url || w.primary_location?.landing_page_url || doiUrl || `https://openalex.org/${w.id}`;
        const venue = w.primary_location?.source?.display_name || 'Academic Journal';
        const authorsList = (w.authorships || [])
          .slice(0, 3)
          .map((a) => a.author?.display_name)
          .filter(Boolean);
        const authorsStr = authorsList.length > 0
          ? authorsList.join(', ') + ((w.authorships?.length || 0) > 3 ? ' et al.' : '')
          : 'Unknown Authors';

        const abstractSnippet = reconstructOpenAlexAbstract(w.abstract_inverted_index);

        // Build APA & IEEE Citations
        const apaCitation = `${authorsStr} (${year}). ${title}. *${venue}*. ${doiUrl || oaUrl}`;
        const ieeeCitation = `${authorsStr}, "${title}," *${venue}*, ${year}. [Online]. Available: ${doiUrl || oaUrl}`;
        const bibtexKey = `${(authorsList[0] || 'author').split(' ').pop().toLowerCase()}${year}`;
        const bibtex = `@article{${bibtexKey},\n  title={${title}},\n  author={${authorsList.join(' and ')}},\n  journal={${venue}},\n  year={${year}},\n  url={${doiUrl || oaUrl}}\n}`;

        results.push({
          source: 'OpenAlex',
          title,
          authors: authorsStr,
          year,
          venue,
          citedBy,
          url: oaUrl,
          doi: doiUrl,
          abstract: abstractSnippet,
          apaCitation,
          ieeeCitation,
          bibtex,
        });
      }
    }
  } catch (err) {
    console.warn('[StudyEngine] OpenAlex fetch warning:', err.message);
  }

  // B. Query arXiv API for preprints (CS, AI, Math, Physics) if more results needed
  if (results.length < maxResults) {
    try {
      const arxivUrl = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(cleanQuery)}&start=0&max_results=2`;
      const res = await fetch(arxivUrl);
      if (res.ok) {
        const xml = await res.text();
        const entries = xml.split('<entry>').slice(1);
        for (const entry of entries) {
          const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
          const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
          const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
          const publishedMatch = entry.match(/<published>(\d{4})/);
          const authorMatches = [...entry.matchAll(/<name>(.*?)<\/name>/g)].map((m) => m[1]);

          if (titleMatch && idMatch) {
            const title = titleMatch[1].replace(/\s+/g, ' ').trim();
            const absUrl = idMatch[1].trim();
            const pdfUrl = absUrl.replace('/abs/', '/pdf/');
            const year = publishedMatch ? publishedMatch[1] : '2025';
            const authorsStr = authorMatches.slice(0, 3).join(', ') + (authorMatches.length > 3 ? ' et al.' : '');
            const abstractSnippet = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim().substring(0, 280) : '';

            results.push({
              source: 'arXiv',
              title,
              authors: authorsStr || 'arXiv Authors',
              year,
              venue: 'arXiv Preprint',
              citedBy: null,
              url: pdfUrl,
              doi: absUrl,
              abstract: abstractSnippet,
              apaCitation: `${authorsStr} (${year}). ${title}. *arXiv Preprint*. ${absUrl}`,
              ieeeCitation: `${authorsStr}, "${title}," *arXiv preprint*, ${year}. [Online]. Available: ${absUrl}`,
            });
          }
        }
      }
    } catch (err) {
      console.warn('[StudyEngine] arXiv fetch warning:', err.message);
    }
  }

  if (results.length === 0) {
    return {
      success: false,
      message: `No peer-reviewed papers found for "${cleanQuery}". Try broader academic keywords.`,
    };
  }

  const styleUpper = String(citationStyle || 'APA').toUpperCase();
  const formattedList = results.slice(0, maxResults).map((p, idx) => {
    const citeText = styleUpper.includes('IEEE') ? p.ieeeCitation : p.apaCitation;
    const citedBadge = p.citedBy !== null ? ` • 🔥 **${p.citedBy} Citations**` : ' • 📄 **arXiv PDF**';
    const abstractLine = p.abstract ? `\n  *Abstract*: ${p.abstract}...` : '';
    return `### ${idx + 1}. ${p.title} (${p.year})
- **Authors**: ${p.authors} | *${p.venue}*${citedBadge}
- 🔗 **[Open Paper / PDF](${p.url})**${p.doi && p.doi !== p.url ? ` • **[DOI Link](${p.doi})**` : ''}${abstractLine}
- 📋 **${styleUpper} Citation**:
  \`${citeText}\``;
  }).join('\n\n');

  return {
    success: true,
    papers: results,
    message: `🎓 **Peer-Reviewed Research Papers for "${cleanQuery}"**\n\n${formattedList}`,
  };
}

/**
 * 2. YOUTUBE LECTURE SUMMARIZER + CLICKABLE TIMESTAMP FINDER
 * Extracts full timed captions directly from YouTube without requiring an API key.
 */
function formatTimestamp(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(timeStr, 10) || 0;
}

async function fetchYouTubeTranscript(videoUrlOrQuery) {
  let videoId = '';
  const input = String(videoUrlOrQuery || '').trim();

  // Extract videoId if URL provided
  const urlMatch = input.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (urlMatch) {
    videoId = urlMatch[1];
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    videoId = input;
  } else {
    // Search YouTube to resolve the top video ID
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(input)}`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      const html = await searchRes.text();
      const idMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (idMatch) videoId = idMatch[1];
    } catch (e) {
      console.warn('[StudyEngine] YouTube search error:', e.message);
    }
  }

  if (!videoId) {
    return {
      success: false,
      message: 'Could not resolve a valid YouTube video. Please provide a valid YouTube link or search topic.',
    };
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let videoTitle = '';
  let channel = '';
  let shortDescription = '';
  let lengthSeconds = 0;
  let keywords = [];
  let captionTracks = [];

  // Try YouTube internal Player API
  try {
    const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: { client: { hl: 'en', gl: 'US', clientName: 'WEB', clientVersion: '2.20240410.01.00' } },
        videoId,
      }),
    });
    if (playerRes.ok) {
      const pJson = await playerRes.json();
      if (pJson?.videoDetails) {
        videoTitle = pJson.videoDetails.title || '';
        channel = pJson.videoDetails.author || '';
        shortDescription = pJson.videoDetails.shortDescription || '';
        lengthSeconds = parseInt(pJson.videoDetails.lengthSeconds, 10) || 0;
        keywords = pJson.videoDetails.keywords || [];
      }
      if (pJson?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
        captionTracks = pJson.captions.playerCaptionsTracklistRenderer.captionTracks;
      }
    }
  } catch (err) {
    console.warn('[StudyEngine] Player API fetch failed, falling back to HTML:', err.message);
  }

  // Fallback to HTML scrape if title or channel missing
  if (!videoTitle) {
    try {
      const res = await fetch(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      const html = await res.text();
      const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/i);
      if (titleMatch) {
        videoTitle = titleMatch[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      }
      if (!channel) {
        const authorMatch = html.match(/"author":"([^"]+)"/) || html.match(/"ownerChannelName":"([^"]+)"/);
        if (authorMatch) channel = authorMatch[1];
      }
      if (!shortDescription) {
        const descMatch = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
        if (descMatch) shortDescription = JSON.parse(`"${descMatch[1]}"`);
      }
      if (captionTracks.length === 0) {
        const captionsMatch = html.match(/"captionTracks":(\[.*?\])/);
        if (captionsMatch) {
          captionTracks = JSON.parse(captionsMatch[1]);
        }
      }
    } catch (err) {
      console.warn('[StudyEngine] HTML watch fetch warning:', err.message);
    }
  }

  // Extract Caption Tracks
  let segments = [];
  if (captionTracks.length > 0) {
    try {
      const track = captionTracks.find((t) => t.languageCode && t.languageCode.startsWith('en')) || captionTracks[0];
      if (track && track.baseUrl) {
        const capRes = await fetch(track.baseUrl + '&fmt=json3', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        if (capRes.ok) {
          const capJson = await capRes.json();
          if (capJson && Array.isArray(capJson.events)) {
            for (const ev of capJson.events) {
              if (ev.segs) {
                const text = ev.segs.map((s) => s.utf8 || '').join('').replace(/\s+/g, ' ').trim();
                if (text) {
                  segments.push({
                    startSec: Math.floor((ev.tStartMs || 0) / 1000),
                    text,
                  });
                }
              }
            }
          }
        }
        // XML fallback if json3 didn't populate
        if (segments.length === 0) {
          const xmlRes = await fetch(track.baseUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          });
          const xmlText = await xmlRes.text();
          const textNodes = [...xmlText.matchAll(/<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g)];
          for (const node of textNodes) {
            const startSec = Math.floor(parseFloat(node[1]) || 0);
            const clean = node[2]
              .replace(/&amp;/g, '&')
              .replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/<[^>]+>/g, '')
              .replace(/\s+/g, ' ')
              .trim();
            if (clean) {
              segments.push({ startSec, text: clean });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[StudyEngine] Caption parse warning:', e.message);
    }
  }

  // Extract buckets / chapters
  const buckets = [];
  if (segments.length > 0) {
    const bucketSizeSec = 120;
    let currentBucket = -1;
    for (const seg of segments) {
      const b = Math.floor(seg.startSec / bucketSizeSec);
      if (b !== currentBucket) {
        currentBucket = b;
        buckets.push({
          seconds: seg.startSec,
          timeStr: formatTimestamp(seg.startSec),
          texts: [seg.text],
        });
      } else {
        buckets[buckets.length - 1].texts.push(seg.text);
      }
    }
  } else if (shortDescription) {
    // Parse chapters from description: e.g. "01:23 Topic Name"
    const chapterRegex = /(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+([^\n\r]+)/g;
    let chMatch;
    while ((chMatch = chapterRegex.exec(shortDescription)) !== null) {
      const timeStr = chMatch[1];
      const desc = chMatch[2].trim();
      const sec = parseSeconds(timeStr);
      buckets.push({
        seconds: sec,
        timeStr,
        text: desc,
      });
    }
  }

  // Strip promotional links, tip forms, and sponsor boilerplate from description
  const cleanDescription = (shortDescription || '')
    .split('\n')
    .filter((line) => {
      const l = line.trim().toLowerCase();
      if (!l) return false;
      if (l.startsWith('http://') || l.startsWith('https://')) return false;
      if (l.includes('clickup.com') || l.includes('safetyvid.org') || l.includes('patreon.com')) return false;
      if (l.startsWith('tips:') || l.startsWith('privacy') || l.startsWith('merch:') || l.startsWith('contact us:')) return false;
      if (l.startsWith('donate') || l.includes('cashapp') || l.includes('venmo') || l.includes('paypal')) return false;
      return true;
    })
    .join('\n')
    .trim();

  // Web search context fallback when captions are unavailable
  let webContext = '';
  if (segments.length === 0 && videoTitle) {
    try {
      const q1 = `${videoTitle} ${channel || ''}`.trim();
      const q2 = `${videoTitle} incident arrest police details`.trim();
      const [res1, res2] = await Promise.all([
        searchWeb(q1, 3),
        searchWeb(q2, 3),
      ]);
      const combined = [...(res1 || []), ...(res2 || [])];
      const seen = new Set();
      const unique = [];
      for (const r of combined) {
        if (!r.snippet || seen.has(r.title)) continue;
        seen.add(r.title);
        unique.push(r);
      }
      if (unique.length > 0) {
        webContext = unique
          .map((r) => `[Source: ${r.title}]\n${r.snippet}`)
          .join('\n\n');
      }
    } catch (e) {
      console.warn('[StudyEngine] Web context search warning:', e.message);
    }
  }

  let transcriptText = '';
  if (segments.length > 0) {
    transcriptText = buckets
      .slice(0, 40)
      .map((b) => `[${b.timeStr} | t=${b.seconds}s] ${b.texts ? b.texts.join(' ') : b.text}`)
      .join('\n\n')
      .substring(0, 14000);
  } else {
    const parts = [
      `Video Title: ${videoTitle || 'Untitled Video'}`,
      `Channel / Creator: ${channel || 'Unknown'}`,
      lengthSeconds > 0 ? `Duration: ${formatTimestamp(lengthSeconds)}` : '',
      keywords.length > 0 ? `Tags / Topics: ${keywords.slice(0, 15).join(', ')}` : '',
      buckets.length > 0
        ? `Video Chapters:\n` + buckets.map((b) => `[${b.timeStr} | t=${b.seconds}s] ${b.text}`).join('\n')
        : '',
      cleanDescription ? `Description Details:\n${cleanDescription.substring(0, 3000)}` : '',
      webContext ? `Incident & Reporting Context:\n${webContext.substring(0, 5000)}` : '',
    ].filter(Boolean);

    transcriptText = parts.join('\n\n');
  }

  return {
    success: true,
    videoId,
    title: videoTitle || 'YouTube Video',
    videoTitle: videoTitle || 'YouTube Video',
    channel: channel || 'YouTube Creator',
    url: watchUrl,
    watchUrl,
    durationStr: lengthSeconds > 0 ? formatTimestamp(lengthSeconds) : '',
    durationSeconds: lengthSeconds,
    hasCaptions: segments.length > 0,
    transcriptText,
    timestampedTranscript: transcriptText,
    description: cleanDescription || shortDescription,
    cleanDescription,
    webContext,
    buckets: buckets.map((b) => ({
      timeStr: b.timeStr,
      seconds: b.seconds,
      text: b.text || (b.texts ? b.texts.join(' ') : ''),
    })),
  };
}

/**
 * 3. FREE SYMBOLIC MATH & WIKIPEDIA KNOWLEDGE APIs
 * Uses Newton Symbolic Math API (https://newton.now.sh) & Wikipedia REST API v1
 */
async function solveSymbolicMathAndWiki({ operation, expression, wikiQuery }) {
  const outputs = [];

  // A. Symbolic Math via Newton API (derive, integrate, factor, zeroes, simplify, tangent, area)
  if (expression) {
    const opMap = {
      derivative: 'derive',
      differentiate: 'derive',
      derive: 'derive',
      integral: 'integrate',
      integrate: 'integrate',
      factor: 'factor',
      roots: 'zeroes',
      zeroes: 'zeroes',
      solve: 'zeroes',
      simplify: 'simplify',
      tangent: 'tangent',
      area: 'area',
    };
    const rawOp = String(operation || 'simplify').toLowerCase().trim();
    const newtonOp = opMap[rawOp] || 'simplify';
    try {
      const encodedExpr = encodeURIComponent(expression.trim());
      const url = `https://newton.now.sh/api/v2/${newtonOp}/${encodedExpr}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.result !== undefined) {
          const toLatex = (str) => String(str || '')
            .replace(/\*/g, ' \\cdot ')
            .replace(/sqrt\(([^)]+)\)/gi, '\\sqrt{$1}')
            .replace(/\bpi\b/gi, '\\pi')
            .replace(/\b(sin|cos|tan|ln|log)\b/gi, '\\$1');

          const inLatex = toLatex(expression.trim());
          const outLatex = toLatex(Array.isArray(data.result) ? data.result.join(', ') : data.result);

          let equationLatex = `${inLatex} = ${outLatex}`;
          if (newtonOp === 'derive') {
            equationLatex = `\\frac{d}{dx}\\left(${inLatex}\\right) = ${outLatex}`;
          } else if (newtonOp === 'integrate') {
            equationLatex = `\\int \\left(${inLatex}\\right) \\, dx = ${outLatex} + C`;
          } else if (newtonOp === 'zeroes') {
            equationLatex = `${inLatex} = 0 \\implies x \\in \\left\\{ ${outLatex} \\right\\}`;
          }

          outputs.push(`### 🧮 Symbolic Math Result (${newtonOp.toUpperCase()})
$$${equationLatex}$$
- **Input Expression**: $${inLatex}$
- **Exact Symbolic Result**: $$${outLatex}$$`);
        }
      }
    } catch (err) {
      console.warn('[StudyEngine] Newton Math API warning:', err.message);
    }
  }

  // B. Wikipedia Academic Knowledge Summary API
  const searchTopic = (wikiQuery || expression || '').trim();
  if (searchTopic && (!expression || wikiQuery)) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTopic)}&format=json&srlimit=1`;
      const sRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'GrokkiStudyAssistant/1.0' },
      });
      if (sRes.ok) {
        const sData = await sRes.json();
        const topHit = sData?.query?.search?.[0];
        if (topHit && topHit.title) {
          const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topHit.title)}`;
          const sumRes = await fetch(sumUrl, {
            headers: { 'User-Agent': 'GrokkiStudyAssistant/1.0' },
          });
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            const pageUrl = sumData?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(topHit.title)}`;
            outputs.push(`### 📚 Academic Encyclopedia: ${sumData.title}
${sumData.extract}

🔗 **[Read Full Article on Wikipedia](${pageUrl})**`);
          }
        }
      }
    } catch (err) {
      console.warn('[StudyEngine] Wikipedia API warning:', err.message);
    }
  }

  if (outputs.length === 0) {
    return {
      success: false,
      message: 'Could not compute symbolic expression or find encyclopedia entry.',
    };
  }

  return {
    success: true,
    message: outputs.join('\n\n'),
  };
}

/**
 * 4. ANKI FLASHCARD DECK GENERATOR (.csv + .md)
 */
function saveAnkiFlashcards(topic, flashcardsArray) {
  const safeTitle = (topic || 'Study_Flashcards')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .substring(0, 40);

  const targetDir = path.join(os.homedir(), 'Desktop', 'Grokki_Study_Notes');
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {}
  }

  const csvFilename = `${safeTitle}_Anki_Deck.csv`;
  const csvPath = path.join(targetDir, csvFilename);

  // Format as standard Anki Front;Back CSV
  const csvLines = flashcardsArray.map((card) => {
    const front = String(card.question || card.front || '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
    const back = String(card.answer || card.back || '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return `"${front}";"${back}"`;
  });

  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
  return {
    fullPath: csvPath,
    csvPath,
    filename: csvFilename,
    csvFilename,
    count: flashcardsArray.length,
  };
}

/**
 * 5. AUTO-DOWNLOAD RESEARCH PAPER PDFs TO DESKTOP
 */
async function downloadResearchPaperPDFs(query, maxCount = 3) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) {
    return { success: false, message: 'Please specify a research topic to download paper PDFs.' };
  }

  const count = Math.min(Math.max(Number(maxCount) || 3, 1), 6);
  const safeFolder = cleanQuery.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 35) || 'Research_Papers';
  const targetDir = path.join(os.homedir(), 'Desktop', 'Grokki_Study_Notes', 'Papers', safeFolder);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Fetch papers from arXiv (guaranteed direct PDF links) + OpenAlex Open Access
  const [arxivPapers, oaPapers] = await Promise.all([
    fetchArxivPapers(cleanQuery, count + 2).catch(() => []),
    fetchOpenAlexPapers(cleanQuery, count + 2).catch(() => []),
  ]);

  const candidates = [];
  for (const p of [...arxivPapers, ...oaPapers]) {
    if (p.pdfUrl && !candidates.some((c) => c.title.toLowerCase() === p.title.toLowerCase())) {
      candidates.push(p);
    }
  }

  if (candidates.length === 0) {
    return {
      success: false,
      message: `No direct Open-Access PDF papers found for **"${cleanQuery}"**.`,
    };
  }

  const downloaded = [];
  for (const paper of candidates) {
    if (downloaded.length >= count) break;
    try {
      const pdfUrl = paper.pdfUrl.replace(/^http:\/\//i, 'https://');
      const res = await fetch(pdfUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GrokkiAcademicBot/1.0',
          'Accept': 'application/pdf,*/*',
        },
        redirect: 'follow',
      });

      if (!res.ok) continue;
      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      // Verify PDF magic header (%PDF) and reasonable size (> 5KB)
      if (buffer.length > 5000 && buffer.slice(0, 5).toString('ascii').includes('%PDF')) {
        const safeTitle = paper.title
          .replace(/[^a-zA-Z0-9_\-\s]/g, '')
          .trim()
          .replace(/\s+/g, '_')
          .substring(0, 55);
        const filename = `${paper.year || 'Paper'}_${safeTitle}.pdf`;
        const fullPath = path.join(targetDir, filename);
        fs.writeFileSync(fullPath, buffer);

        downloaded.push({
          title: paper.title,
          authors: (paper.authors || []).slice(0, 3).join(', '),
          year: paper.year,
          filename,
          fullPath,
          pdfUrl: paper.pdfUrl,
          sizeKB: Math.round(buffer.length / 1024),
        });
      }
    } catch (e) {
      console.warn('[StudyEngine] PDF download warning:', e.message);
    }
  }

  if (downloaded.length === 0) {
    return {
      success: false,
      message: `Found papers on **"${cleanQuery}"**, but their publisher servers blocked direct PDF download. Try asking Grokki to search research papers for clickable web links instead!`,
    };
  }

  // Open the target folder in Windows Explorer so user immediately sees the PDFs
  try {
    exec(`explorer.exe "${targetDir}"`);
  } catch (e) {}

  const listMd = downloaded
    .map((d, i) => `**${i + 1}. ${d.title}** (${d.year})\n   - *Authors*: ${d.authors}\n   - 📄 Saved as: \`${d.filename}\` (${d.sizeKB} KB) — [View PDF Online](${d.pdfUrl})`)
    .join('\n\n');

  return {
    success: true,
    downloaded,
    folderPath: targetDir,
    message: `### 📥 Downloaded ${downloaded.length} Research Paper PDFs: "${cleanQuery}"\n📂 **Folder Opened**: \`Desktop/Grokki_Study_Notes/Papers/${safeFolder}\`\n\n${listMd}`,
  };
}

module.exports = {
  extractTextFromFile,
  buildStudyPrompt,
  saveStudyDocument,
  searchAcademicPapers,
  fetchYouTubeTranscript,
  solveSymbolicMathAndWiki,
  saveAnkiFlashcards,
  downloadResearchPaperPDFs,
  vivaState,
};
