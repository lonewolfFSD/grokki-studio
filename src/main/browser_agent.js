/**
 * Grokki Autonomous Browser Agent
 * Inspired by browser-use (https://github.com/browser-use/browser-use)
 *
 * Implements an autonomous browser agent that navigates the web, inspects interactive DOM elements,
 * clicks, fills forms, extracts structured information, and completes user goals with full vision & DOM grounding.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { BrowserWindow } = require('electron');

class BrowserAgent {
  constructor() {
    this.isRunning = false;
    this.activeGoal = null;
    this.step = 0;
    this.maxSteps = 15;
    this.cdpPort = 9222;
    this.cdpWsUrl = null;
    this.history = [];
  }

  broadcastProgress(step, maxSteps, actionDesc) {
    try {
      const payload = {
        action: 'start',
        kind: 'stopwatch',
        icon: 'fa-solid fa-globe',
        title: `Browser • Step ${step}/${maxSteps}`,
        subtitle: actionDesc,
      };
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send('island:activity', payload);
        }
      });
    } catch (_) {}
  }

  broadcastFinished(summary, success = true) {
    try {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send('island:activity', { action: 'stop', kind: 'stopwatch' });
          win.webContents.send('island:notification', {
            source: 'browser',
            sender: success ? 'Browser Task Done' : 'Browser Task Stopped',
            message: summary,
            icon: 'browser',
            timestamp: Date.now(),
          });
        }
      });
    } catch (_) {}
  }

  // Locate any installed Chromium browser (Brave, Edge, Chrome, Arc, Vivaldi)
  findChromiumBrowser() {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    const candidates = [
      // 1. Brave Browser (User's preferred browser)
      path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(programFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),

      // 2. Microsoft Edge (Built into Windows 10/11)
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),

      // 3. Google Chrome (if present)
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),

      // 4. Arc Browser
      path.join(localAppData, 'Arc', 'Application', 'arc.exe'),

      // 5. Vivaldi
      path.join(localAppData, 'Vivaldi', 'Application', 'vivaldi.exe'),
      path.join(programFiles, 'Vivaldi', 'Application', 'vivaldi.exe'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return 'msedge';
  }

  // Check if browser with remote debugging is already running or launch it
  async ensureBrowserReady() {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${this.cdpPort}/json/version`, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            this.cdpWsUrl = data.webSocketDebuggerUrl;
            resolve({ ready: true, cdpWsUrl: this.cdpWsUrl });
          } catch (_) {
            resolve({ ready: false });
          }
        });
      });

      req.on('error', () => {
        const browserPath = this.findChromiumBrowser();
        const profileDir = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Grokki', 'BrowserAgentProfile');
        try {
          if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
        } catch (_) {}

        console.log(`[BrowserAgent] Launching browser "${browserPath}" with --remote-debugging-port=${this.cdpPort}...`);
        const cmd = `start "" "${browserPath}" --remote-debugging-port=${this.cdpPort} --user-data-dir="${profileDir}" "about:blank"`;
        exec(cmd, (err) => {
          if (err) {
            resolve({ ready: false, error: err.message });
            return;
          }
          // Poll for CDP endpoint
          let attempts = 0;
          const poll = setInterval(() => {
            attempts++;
            http.get(`http://127.0.0.1:${this.cdpPort}/json/version`, (pollRes) => {
              let pData = '';
              pollRes.on('data', (c) => (pData += c));
              pollRes.on('end', () => {
                try {
                  const parsed = JSON.parse(pData);
                  clearInterval(poll);
                  this.cdpWsUrl = parsed.webSocketDebuggerUrl;
                  resolve({ ready: true, cdpWsUrl: this.cdpWsUrl });
                } catch (_) {}
              });
            }).on('error', () => {
              if (attempts >= 15) {
                clearInterval(poll);
                resolve({ ready: false, error: 'Could not connect to Browser DevTools Protocol port.' });
              }
            });
          }, 400);
        });
      });
    });
  }

  async sendCdpCommand(method, params = {}) {
    return new Promise(async (resolve, reject) => {
      // Get active tab list
      http.get(`http://127.0.0.1:${this.cdpPort}/json`, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const tabs = JSON.parse(raw);
            const pageTab = tabs.find((t) => t.type === 'page') || tabs[0];
            if (!pageTab || !pageTab.webSocketDebuggerUrl) {
              reject(new Error('No active browser tab found via CDP.'));
              return;
            }

            const WebSocket = require('ws') || null;
            if (!WebSocket) {
              reject(new Error('WebSocket client not available'));
              return;
            }

            const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
            const id = Math.floor(Math.random() * 100000);

            ws.on('open', () => {
              ws.send(JSON.stringify({ id, method, params }));
            });

            ws.on('message', (msg) => {
              try {
                const response = JSON.parse(msg.toString());
                if (response.id === id) {
                  ws.close();
                  if (response.error) reject(new Error(response.error.message));
                  else resolve(response.result);
                }
              } catch (_) {}
            });

            ws.on('error', (err) => {
              reject(err);
            });
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (err) => reject(err));
    });
  }

  // Extracts interactive DOM elements formatted like browser-use: [1] <button> Submit, [2] <input> Search + Key Page Content
  async getInteractiveDomTree() {
    const jsScript = `
      (() => {
        const interactive = [];
        let counter = 1;
        const elements = document.querySelectorAll('button, a, input, textarea, select, [role="button"], [onclick]');
        
        elements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden') {
            const tag = el.tagName.toLowerCase();
            const text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 80);
            if (text || tag === 'input') {
              interactive.push({
                index: counter++,
                tag,
                text,
                type: el.type || '',
                id: el.id || '',
              });
            }
          }
        });

        // Key headlines & content snippets so the agent can extract facts directly without endless clicking
        const contentSnippets = Array.from(document.querySelectorAll('h1, h2, h3, h4, #mp-tfa, .mp-h2, [id*="featured"], [class*="featured"], main p, article p'))
          .slice(0, 10)
          .map((el) => (el.innerText || '').trim().replace(/\\s+/g, ' '))
          .filter((t) => t.length > 12)
          .join(' | ');

        return {
          title: document.title,
          url: window.location.href,
          contentSummary: contentSnippets,
          elements: interactive.slice(0, 45),
        };
      })()
    `;

    try {
      const res = await this.sendCdpCommand('Runtime.evaluate', {
        expression: jsScript,
        returnByValue: true,
      });
      return res?.result?.value || null;
    } catch (err) {
      console.warn('[BrowserAgent] Could not evaluate DOM via CDP:', err.message);
      return null;
    }
  }

  parseBrowserAction(modelText, pageContent = '') {
    const text = String(modelText || '').trim();

    // 1. Explicit done action
    if (/done\s*\(/i.test(text) || /^done\b/i.test(text)) {
      const m = text.match(/done\s*\(\s*(?:result\s*=\s*)?["']?([^"')]+)["']?\s*\)/i) ||
                text.match(/^done:?\s*(.+)$/im);
      return { type: 'done', summary: m ? m[1].trim() : text.replace(/^done:?\s*/i, '').trim() || 'Task completed.' };
    }

    // 2. Explicit navigate action
    const navMatch = text.match(/navigate\s*\(\s*(?:url\s*=\s*)?["']([^"']+)["']\s*\)/i) ||
                     text.match(/(?:navigate|go|browse)\s+(?:to\s+)?(https?:\/\/[^\s"'<>]+)/i);
    if (navMatch) return { type: 'navigate', url: navMatch[1] };

    // 3. Explicit click action
    const clickMatch = text.match(/click\s*\(\s*(?:index\s*=\s*)?(\d+)\s*\)/i) ||
                       text.match(/click\s+(?:element\s+)?\[?(\d+)\]?/i);
    if (clickMatch) return { type: 'click', index: parseInt(clickMatch[1], 10) };

    // 4. Explicit type action
    const typeMatch = text.match(/type\s*\(\s*(?:index\s*=\s*)?(\d+)\s*,\s*(?:text\s*=\s*)?["']([^"']+)["']\s*\)/i) ||
                      text.match(/type\s+["']([^"']+)["']\s+(?:in|into)\s+\[?(\d+)\]?/i);
    if (typeMatch) {
      const idx = isNaN(parseInt(typeMatch[1], 10)) ? parseInt(typeMatch[2], 10) : parseInt(typeMatch[1], 10);
      const val = isNaN(parseInt(typeMatch[1], 10)) ? typeMatch[1] : typeMatch[2];
      return { type: 'type', index: idx, text: val };
    }

    // 5. Explicit scroll action
    const scrollMatch = text.match(/scroll\s*\(\s*(?:direction\s*=\s*)?["']?(down|up)["']?\s*\)/i) ||
                        text.match(/scroll\s+(down|up)/i);
    if (scrollMatch) return { type: 'scroll', direction: scrollMatch[1].toLowerCase() };

    // 6. Direct Answer / Informative Conclusion (Model answered user's goal directly)
    if (text.length > 15 && !/i cannot|i can't|as an ai/i.test(text)) {
      return { type: 'done', summary: text };
    }

    // 7. URL detected in response
    const urlInText = text.match(/https?:\/\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+/i);
    if (urlInText) {
      return { type: 'navigate', url: urlInText[0] };
    }

    return null;
  }

  async executeBrowserAction(action) {
    switch (action.type) {
      case 'navigate': {
        const targetUrl = action.url.startsWith('http') ? action.url : `https://${action.url}`;
        await this.sendCdpCommand('Page.navigate', { url: targetUrl });
        await new Promise((r) => setTimeout(r, 2200));
        return { success: true, message: `Navigated to ${targetUrl}` };
      }

      case 'click': {
        const script = `
          (() => {
            const elements = Array.from(document.querySelectorAll('button, a, input, textarea, select, [role="button"], [onclick]'))
              .filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
              });
            const target = elements[${action.index - 1}];
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              target.click();
              return true;
            }
            return false;
          })()
        `;
        const res = await this.sendCdpCommand('Runtime.evaluate', { expression: script, returnByValue: true });
        return { success: !!res?.result?.value };
      }

      case 'type': {
        const escaped = action.text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const script = `
          (() => {
            const elements = Array.from(document.querySelectorAll('button, a, input, textarea, select, [role="button"], [onclick]'))
              .filter(el => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
              });
            const target = elements[${action.index - 1}];
            if (target) {
              target.focus();
              target.value = "${escaped}";
              target.dispatchEvent(new Event('input', { bubbles: true }));
              target.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
            return false;
          })()
        `;
        const res = await this.sendCdpCommand('Runtime.evaluate', { expression: script, returnByValue: true });
        return { success: !!res?.result?.value };
      }

      case 'scroll': {
        const delta = action.direction === 'up' ? -500 : 500;
        await this.sendCdpCommand('Runtime.evaluate', {
          expression: `window.scrollBy({ top: ${delta}, behavior: 'smooth' })`,
        });
        await new Promise((r) => setTimeout(r, 600));
        return { success: true };
      }

      default:
        return { success: false };
    }
  }

  async runGoal(goal, llmCallable) {
    if (this.isRunning) {
      return { success: false, message: 'Browser agent is already running a task.' };
    }

    this.isRunning = true;
    this.activeGoal = goal;
    this.step = 0;
    this.history = [];

    this.broadcastProgress(1, this.maxSteps, 'Launching browser...');
    const readyRes = await this.ensureBrowserReady();
    if (!readyRes.ready) {
      this.isRunning = false;
      this.broadcastFinished('Could not connect to Browser DevTools Protocol.', false);
      return { success: false, error: readyRes.error || 'Browser not ready' };
    }

    // Auto-detect target domain in goal and immediately navigate there on step 1 to bypass empty about:blank
    const domainMatch = goal.match(/\b(?:https?:\/\/)?([a-zA-Z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)/i);
    if (domainMatch) {
      const rawUrl = domainMatch[0];
      const targetUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
      this.broadcastProgress(1, this.maxSteps, `Navigating to ${targetUrl}...`);
      await this.executeBrowserAction({ type: 'navigate', url: targetUrl });
      await new Promise((r) => setTimeout(r, 2200));
    }

    const systemPrompt = `You are Grokki Autonomous Browser Agent (inspired by browser-use).
Your goal is: "${goal}".
You operate the active browser tab via Chrome DevTools Protocol.
You MUST output EXACTLY ONE action line in this format:
Action: navigate(url='https://example.com')
Action: click(index=1)
Action: type(index=2, text='query')
Action: scroll(direction='down' or 'up')
Action: done(result='Answer to user goal based on page content')

IMPORTANT:
- Do not say you cannot browse or that you lack capabilities. You ARE the browser driver.
- If you see the answer to the user's goal in the Page Title or Page Content, immediately output Action: done(result='Your complete answer').`;

    let consecutiveErrors = 0;

    try {
      while (this.step < this.maxSteps && this.isRunning) {
        this.step++;

        // 1. Inspect DOM & Content
        const domTree = await this.getInteractiveDomTree();
        const pageTitle = domTree ? domTree.title : 'Browser Page';
        const pageUrl = domTree ? domTree.url : 'about:blank';
        const contentSummary = domTree?.contentSummary || '';
        const elementsList = domTree && Array.isArray(domTree.elements)
          ? domTree.elements.map((e) => `[${e.index}] <${e.tag}> ${e.text}`).join('\n')
          : 'No interactive elements detected.';

        this.broadcastProgress(this.step, this.maxSteps, `${pageTitle.slice(0, 24)}...`);

        // 2. Build user prompt
        const userPrompt = `Goal: ${goal}
Current URL: ${pageUrl}
Page Title: ${pageTitle}

Page Content Snippets:
${contentSummary || 'None extracted.'}

Interactive Elements:
${elementsList}

Previous Actions:
${this.history.map((h, i) => `${i + 1}. ${h}`).join('\n') || 'None'}

What is your next action? Return exactly one Action line.`;

        // 3. Ask LLM
        const responseText = await llmCallable(systemPrompt, userPrompt);
        console.log(`[BrowserAgent] Step ${this.step} Action:`, responseText);

        // 4. Parse & execute
        const action = this.parseBrowserAction(responseText, contentSummary);
        if (!action) {
          consecutiveErrors++;
          this.history.push(`Could not parse action from "${responseText}"`);
          if (consecutiveErrors >= 2 && contentSummary) {
            // Conclude with extracted page content rather than spinning indefinitely
            const fallbackAnswer = `Completed browser exploration on **${pageTitle}** (${pageUrl}).\n\n**Extracted Content:**\n${contentSummary}`;
            this.broadcastFinished(fallbackAnswer, true);
            return {
              success: true,
              steps: this.step,
              summary: fallbackAnswer,
              history: this.history,
            };
          }
          continue;
        }

        consecutiveErrors = 0;

        if (action.type === 'done') {
          this.broadcastFinished(action.summary, true);
          return {
            success: true,
            steps: this.step,
            summary: action.summary,
            history: this.history,
          };
        }

        if (action.type === 'navigate') {
          const normTarget = action.url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '').toLowerCase();
          const normCurrent = pageUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '').toLowerCase();
          if (normTarget === normCurrent) {
            if (normCurrent === 'wikipedia.org') {
              action.url = 'https://en.wikipedia.org';
            } else {
              action = { type: 'scroll', direction: 'down' };
            }
          }
        }

        const actionDesc = `${action.type.toUpperCase()}${action.url ? ` ${action.url}` : ''}${action.index ? ` element [${action.index}]` : ''}${action.text ? ` "${action.text}"` : ''}`;
        this.broadcastProgress(this.step, this.maxSteps, actionDesc);
        this.history.push(actionDesc);

        await this.executeBrowserAction(action);
        await new Promise((r) => setTimeout(r, 1200));
      }

      this.broadcastFinished('Reached maximum browser step limit.', false);
      return { success: false, message: 'Reached max step limit', history: this.history };
    } catch (err) {
      console.error('[BrowserAgent] Error:', err);
      this.broadcastFinished(`Browser error: ${err.message}`, false);
      return { success: false, error: err.message };
    } finally {
      this.isRunning = false;
      this.activeGoal = null;
    }
  }

  cancel() {
    this.isRunning = false;
    this.broadcastFinished('Browser task cancelled by user.', false);
  }
}

module.exports = new BrowserAgent();
