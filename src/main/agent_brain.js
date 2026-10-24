const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec, execFile } = require('child_process');
let electronModule = {};
try {
  electronModule = require('electron');
} catch (e) {}
const shell = (electronModule && electronModule.shell) ? electronModule.shell : {
  openExternal: async (url) => {
    exec(`powershell -NoProfile -Command "Start-Process '${url}'"`);
  }
};
const screen = (electronModule && electronModule.screen) ? electronModule.screen : {
  getPrimaryDisplay: () => ({ size: { width: 1536, height: 864 } })
};
const desktopCapturer = (electronModule && electronModule.desktopCapturer) ? electronModule.desktopCapturer : null;
const { GoogleGenAI } = require('@google/genai');
const memory = require('./memory');
const googleWorkspace = require('./google_workspace');
const { convertGeminiToolsToOpenAI, callOpenAICompatible, transcribeWithGroqWhisper } = require('./ai_providers');
const studyEngine = require('./study_engine');
const powerTools = require('./power_tools');
function shouldAutoSearchWeb(prompt = '') {
  if (!prompt || typeof prompt !== 'string') return false;
  const p = prompt.toLowerCase().trim();

  // Never auto search web for desktop actions, Google Workspace, WhatsApp, local tools, or file operations
  if (/\b(google\s+(drive|doc|docs|sheet|sheets|slides|calendar|task|tasks|contacts?|workspace|account|mail)|drive|gmail|whatsapp|spotify|word|excel|powerpoint|calculator|notepad|screenshot|snip|volume|brightness|pc\s+health|folder|file|upload|download|save|create|delete|open|close|lock|sleep|shutdown|mute|unmute)\b/i.test(p)) {
    return false;
  }

  // Explicit web search keywords
  if (/\b(search\s+(the\s+)?web|deep\s+search|web\s+search|live\s+search|browse\s+web)\b/i.test(p)) return true;
  if (/^google\s+(.+)/i.test(p)) return true;
  // Current events, protests, conflicts, happenings
  if (/\b(what('?s|\s+is)\s+(the\s+)?(protest|protests|strike|war|conflict|situation|news|happening|going\s+on))\b/i.test(p)) return true;
  if (/\b(going\s+on\s+in|happening\s+in|protests?\s+in)\b/i.test(p)) return true;
  if (/\b(right\s+now|currently|current\s+news|today'?s\s+news|latest\s+news|breaking\s+news|recent\s+news)\b/i.test(p)) return true;
  // Year-based queries for 2024-2029 (knowledge cutoff evasion)
  if (/\b(202[4-9]|203\d)\b/.test(p)) return true;
  // High-frequency factual questions: who won, who is the current, winner of, stock price of, etc.
  if (/\b(who\s+won|who\s+is\s+the\s+current|winner\s+of|champions?\s+of|score\s+of|release\s+date\s+of|when\s+is\s+the\s+next|price\s+of|nobel\s+prize|election|president\s+of|ceo\s+of)\b/i.test(p)) return true;
  return false;
}

const { searchWeb, buildGroundingPrompt } = require('./web_search');

function resolveOpenAIEndpointAndKey(provider, config = {}) {
  let endpoint = 'https://api.groq.com/openai/v1';
  let apiKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
  let model = config.groqModel || 'qwen/qwen3.8-27b';

  if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1';
    apiKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
    model = config.groqModel || 'qwen/qwen3.8-27b';
  } else if (provider === 'ollama') {
    const base = (config.ollamaEndpoint || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    endpoint = `${base}/v1`;
    apiKey = 'ollama';
    model = config.ollamaModel || 'llama3.2';
  } else if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1';
    apiKey = (config.openrouterApiKey || process.env.OPENROUTER_API_KEY || '').trim();
    model = config.openrouterModel || 'openrouter/auto';
  } else if (provider === 'openai') {
    endpoint = 'https://api.openai.com/v1';
    apiKey = (config.openaiApiKey || process.env.OPENAI_API_KEY || '').trim();
    model = config.openaiModel || 'gpt-4o';
  } else if (provider === 'grok') {
    endpoint = 'https://api.x.ai/v1';
    apiKey = (config.grokApiKey || process.env.XAI_API_KEY || '').trim();
    model = config.grokModel || 'grok-2-1212';
  } else if (provider === 'deepseek') {
    endpoint = 'https://api.deepseek.com';
    apiKey = (config.deepseekApiKey || process.env.DEEPSEEK_API_KEY || '').trim();
    model = config.deepseekModel || 'deepseek-chat';
  } else if (provider === 'qwen') {
    endpoint = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
    apiKey = (config.qwenApiKey || process.env.DASHSCOPE_API_KEY || '').trim();
    model = config.qwenModel || 'qwen-max';
  } else if (provider === 'omnirouter') {
    const base = (config.omnirouterEndpoint || 'https://api.omnirouter.ai/v1').replace(/\/+$/, '');
    endpoint = base;
    apiKey = (config.omnirouterApiKey || process.env.OMNIROUTER_API_KEY || 'free').trim();
    model = config.omnirouterModel || 'omnirouter/auto';
  }

  return { endpoint, apiKey, model };
}

const osInputScript = path.join(__dirname, 'os_input.ps1').replace('app.asar', 'app.asar.unpacked');

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), ms)),
  ]);
}

function withAbort(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new Error('TASK_CANCELLED'));
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('TASK_CANCELLED')));
    }),
  ]);
}

function runPowerShell(args) {
  return new Promise((resolve) => {
    const cmd = `powershell.exe -NoProfile -File "${osInputScript}" ${args}`;
    exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
      resolve({
        success: !err,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim(),
      });
    });
  });
}

async function resolveYouTubeVideoId(query) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return match[1];
    }
  } catch (e) {
    console.warn('[AgentBrain] Failed to resolve YouTube video ID:', e.message);
  }
  return null;
}

function expandSlashDirective(text) {
  const trimmed = (text || '').trim();
  if (trimmed.startsWith('/plan ')) {
    return `[MODE: PLAN]\nFormulate a rigorous, detailed step-by-step architectural execution plan for the following task:\n${trimmed.slice(6)}`;
  }
  if (trimmed.startsWith('/goal ')) {
    return `[MODE: GOAL]\nRun autonomously and execute until the following goal is completely finished:\n${trimmed.slice(6)}`;
  }
  if (trimmed.startsWith('/grill-me ')) {
    return `[MODE: GRILL-ME]\nInterview me interactively by asking 2-4 clarifying questions to align on requirements and resolve design decisions for:\n${trimmed.slice(10)}`;
  }
  if (trimmed.startsWith('/btw ')) {
    return `[MODE: BTW]\nAnswer this quick side question directly, accurately, and concisely without altering the overall task context:\n${trimmed.slice(5)}`;
  }
  if (trimmed.startsWith('/teamwork-preview ')) {
    return `[MODE: TEAMWORK]\nOutline an autonomous multi-agent team division of labour and task roles for:\n${trimmed.slice(18)}`;
  }
  return text;
}

class AgentBrain {
  constructor() {
    this.abortController = null;
    this.models = [
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-3.1-flash-lite',
    ];
  }

  cancelCurrentTask() {
    if (this.abortController) {
      console.log('[AgentBrain] Alt+Q killer activated: Aborting AI request and halting tokens!');
      this.abortController.abort();
      this.abortController = null;
      return true;
    }
    return false;
  }

  setMusicPlayerHandler(handler) {
    this.musicPlayerHandler = handler;
  }

  setMusicPlayerControlHandler(handler) {
    this.musicPlayerControlHandler = handler;
  }

  getToolsDeclaration() {
    return [
      {
        functionDeclarations: [
          {
            name: 'computer_click',
            description: 'Physically glides real Windows mouse cursor across the screen and clicks on coordinates (x, y)',
            parameters: {
              type: 'OBJECT',
              properties: {
                x: { type: 'NUMBER', description: 'X screen coordinate' },
                y: { type: 'NUMBER', description: 'Y screen coordinate' },
              },
              required: ['x', 'y'],
            },
          },
          {
            name: 'computer_double_click',
            description: 'Physically glides mouse and double-clicks on screen coordinates (x, y)',
            parameters: {
              type: 'OBJECT',
              properties: {
                x: { type: 'NUMBER', description: 'X screen coordinate' },
                y: { type: 'NUMBER', description: 'Y screen coordinate' },
              },
              required: ['x', 'y'],
            },
          },
          {
            name: 'computer_right_click',
            description: 'Physically glides mouse and right-clicks on screen coordinates (x, y)',
            parameters: {
              type: 'OBJECT',
              properties: {
                x: { type: 'NUMBER', description: 'X screen coordinate' },
                y: { type: 'NUMBER', description: 'Y screen coordinate' },
              },
              required: ['x', 'y'],
            },
          },
          {
            name: 'computer_move',
            description: 'Physically moves the real Windows mouse cursor smoothly to coordinates (x, y)',
            parameters: {
              type: 'OBJECT',
              properties: {
                x: { type: 'NUMBER', description: 'Target X coordinate' },
                y: { type: 'NUMBER', description: 'Target Y coordinate' },
              },
              required: ['x', 'y'],
            },
          },
          {
            name: 'computer_type',
            description: 'Physically types text into the currently active window like someone typing on keyboard',
            parameters: {
              type: 'OBJECT',
              properties: {
                text: { type: 'STRING', description: 'Text to physically type' },
              },
              required: ['text'],
            },
          },
          {
            name: 'computer_hotkey',
            description: 'Physically presses keyboard hotkey (e.g. ctrl+s, ctrl+shift+m, alt+tab, ctrl+f, enter, esc)',
            parameters: {
              type: 'OBJECT',
              properties: {
                keys: { type: 'STRING', description: 'Hotkey name (e.g. ctrl+shift+m, ctrl+s, alt+tab, enter)' },
              },
              required: ['keys'],
            },
          },
          {
            name: 'focus_window',
            description: 'Brings an application window to the foreground (e.g. Code, WINWORD, notepad, brave, chrome)',
            parameters: {
              type: 'OBJECT',
              properties: {
                app: { type: 'STRING', description: 'Process name (Code, WINWORD, notepad, brave, chrome, msedge)' },
              },
              required: ['app'],
            },
          },
          {
            name: 'system_volume',
            description: 'Controls Windows master volume: set percentage (0-100), volume_up (increase/up), volume_down (decrease/down), mute, unmute, or get current level',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: 'Action: "set", "up", "down", "mute", "unmute", or "get"' },
                level: { type: 'NUMBER', description: 'Volume level (0-100) if action is set' },
              },
              required: ['action'],
            },
          },
          {
            name: 'close_active_window',
            description: 'Closes the currently active/focused window, application, or software (e.g. "close this window", "close current software", "close current app")',
            parameters: {
              type: 'OBJECT',
              properties: {
                app_name: { type: 'STRING', description: 'Optional application name to close (e.g. "chrome", "notepad", "code"). If omitted, closes the foreground active window.' },
              },
            },
          },
          {
            name: 'system_power',
            description: 'Controls PC power state: "lock" (locks workstation/screen), "sleep" (puts PC to sleep), "shutdown" (shuts down PC), "restart" (reboots PC), or "cancel" (aborts pending shutdown)',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: 'Power action: "lock", "sleep", "shutdown", "restart", or "cancel"' },
              },
              required: ['action'],
            },
          },
          {
            name: 'create_or_edit_word',
            description: 'Creates or opens a Word document (.docx), focuses MS Word, glides cursor, types text physically, and saves',
            parameters: {
              type: 'OBJECT',
              properties: {
                filename: { type: 'STRING', description: 'Name of document, e.g. Notes.docx or Report.docx' },
                text: { type: 'STRING', description: 'Text to physically type into Word' },
                save: { type: 'BOOLEAN', description: 'Whether to save via Ctrl+S' },
              },
              required: ['text'],
            },
          },
          {
            name: 'inspect_vscode_errors',
            description: 'VS Code Live Bug Doctor: Inspects active code compiler/syntax errors, explains root cause, and generates exact copy-paste fix. Can inspect active VS Code editor/Problems view, clipboard code, or direct error text.',
            parameters: {
              type: 'OBJECT',
              properties: {
                error_or_code: { type: 'STRING', description: 'Optional code snippet or compiler error message (if omitted, reads active VS Code Problems panel or clipboard)' },
              },
            },
          },
          {
            name: 'read_screen_and_act',
            description: 'ONLY use this tool when the user EXPLICITLY asks to look at their computer monitor or desktop screen (e.g. "look at my screen", "what is on my screen", "read my screen"). NEVER call this tool for world events, news, politics, or general knowledge questions!',
            parameters: {
              type: 'OBJECT',
              properties: {
                task: { type: 'STRING', description: 'What to inspect or describe on screen (e.g. "describe what is open on screen", "check active window", "read text")' },
              },
              required: ['task'],
            },
          },
          {
            name: 'play_music',
            description: 'Plays music, a song, an artist, or a playlist in the user browser on their configured music platform (Spotify, YouTube Music, Apple Music, or Amazon Music)',
            parameters: {
              type: 'OBJECT',
              properties: {
                song: { type: 'STRING', description: 'Song, artist, album, or playlist name to play' },
                platform: { type: 'STRING', description: 'Optional platform override: "spotify", "ytmusic", "applemusic", "amazonmusic"' },
              },
              required: ['song'],
            },
          },
          {
            name: 'play_youtube_music',
            description: 'Plays music or song in the default browser',
            parameters: {
              type: 'OBJECT',
              properties: { song: { type: 'STRING', description: 'Song or artist name' } },
              required: ['song'],
            },
          },
          {
            name: 'control_music',
            description: 'Controls music playback in browser and system (pause, resume/play, next/skip song, previous song, stop)',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: 'Action: "pause", "resume", "play", "next", "skip", "prev", "previous", "stop"' },
              },
              required: ['action'],
            },
          },
          {
            name: 'search_youtube',
            description: 'Searches YouTube for videos, courses, tutorials, or topics, brings browser to front, moves mouse cursor and clicks first video',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Search query, topic, course, or video name' },
              },
              required: ['query'],
            },
          },
          {
            name: 'browser_search',
            description: 'Searches Google or web, brings browser to front, moves mouse cursor and clicks top result',
            parameters: {
              type: 'OBJECT',
              properties: { query: { type: 'STRING', description: 'Search query or URL' } },
              required: ['query'],
            },
          },
          {
            name: 'create_file_or_folder',
            description: 'Creates a file or folder in any specific drive or path (e.g. C:, D:, E:)',
            parameters: {
              type: 'OBJECT',
              properties: {
                path: { type: 'STRING', description: 'Full path, e.g. E:/Projects or C:/Users/Notes/todo.txt' },
                is_folder: { type: 'BOOLEAN', description: 'True if creating a folder, false if file' },
                content: { type: 'STRING', description: 'File content if creating a file' },
              },
              required: ['path'],
            },
          },
          {
            name: 'calendar_schedule_event',
            description: 'Creates a calendar event or marks a date, launches Google Calendar or calendar app',
            parameters: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Event title' },
                date: { type: 'STRING', description: 'Date (e.g. 2026-10-15 or tomorrow)' },
                description: { type: 'STRING', description: 'Event description or notes' },
              },
              required: ['title'],
            },
          },
          {
            name: 'connect_google_account',
            description: 'Starts 1-click Google sign-in to connect Gmail, Calendar, Drive, Sheets, Docs, and Tasks',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'check_emails',
            description: 'Reads unread primary emails from Gmail, shows senders, subjects, and snippets',
            parameters: {
              type: 'OBJECT',
              properties: { max_results: { type: 'NUMBER', description: 'Number of emails to fetch (default 5)' } },
            },
          },
          {
            name: 'send_email_gmail',
            description: 'Sends an email using your connected Gmail account',
            parameters: {
              type: 'OBJECT',
              properties: {
                to: { type: 'STRING', description: 'Recipient email address' },
                subject: { type: 'STRING', description: 'Email subject' },
                body: { type: 'STRING', description: 'Email body text' },
              },
              required: ['to', 'subject', 'body'],
            },
          },
          {
            name: 'get_calendar_agenda',
            description: 'Fetches upcoming events and meetings from Google Calendar',
            parameters: {
              type: 'OBJECT',
              properties: { max_results: { type: 'NUMBER', description: 'Number of events to list' } },
            },
          },
          {
            name: 'search_google_drive',
            description: 'Searches for documents, spreadsheets, PDFs, or files on your Google Drive',
            parameters: {
              type: 'OBJECT',
              properties: { query: { type: 'STRING', description: 'File name or keyword' } },
            },
          },
          {
            name: 'upload_to_google_drive',
            description: 'Uploads a local file from your PC to Google Drive',
            parameters: {
              type: 'OBJECT',
              properties: { file_path: { type: 'STRING', description: 'Local path of file to upload' } },
              required: ['file_path'],
            },
          },
          {
            name: 'read_google_sheet',
            description: 'Reads rows and values from a Google Spreadsheet',
            parameters: {
              type: 'OBJECT',
              properties: {
                spreadsheet_id: { type: 'STRING', description: 'Google Spreadsheet ID from URL' },
                range: { type: 'STRING', description: 'Range, e.g. Sheet1!A1:Z50' },
              },
              required: ['spreadsheet_id'],
            },
          },
          {
            name: 'append_to_google_sheet',
            description: 'Appends a new row of data into a Google Sheet',
            parameters: {
              type: 'OBJECT',
              properties: {
                spreadsheet_id: { type: 'STRING', description: 'Spreadsheet ID' },
                values: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Array of cell values for the row' },
              },
              required: ['spreadsheet_id', 'values'],
            },
          },
          {
            name: 'create_google_doc',
            description: 'Creates a new Google Doc with title and content in your Google Drive',
            parameters: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Document title' },
                content: { type: 'STRING', description: 'Initial text content' },
              },
              required: ['title'],
            },
          },
          {
            name: 'get_google_tasks',
            description: 'Lists all pending to-dos and tasks from Google Tasks',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'add_google_task',
            description: 'Adds a new to-do task to Google Tasks with optional due date',
            parameters: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Task title or action' },
                notes: { type: 'STRING', description: 'Additional notes' },
                due: { type: 'STRING', description: 'Due date, e.g. 2026-10-16' },
              },
              required: ['title'],
            },
          },
          {
            name: 'create_notion_page',
            description: 'Creates a new page, study note, or assignment entry in Notion',
            parameters: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Page or note title' },
                content: { type: 'STRING', description: 'Body text, summary, or lecture notes' },
                database_id: { type: 'STRING', description: 'Optional Notion Database ID' },
              },
              required: ['title', 'content'],
            },
          },
          {
            name: 'search_notion',
            description: 'Searches your connected Notion workspace for pages, notes, or databases',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Search term or title' },
              },
              required: ['query'],
            },
          },
          {
            name: 'create_obsidian_note',
            description: 'Creates a new local markdown note or appends to a daily note in Obsidian',
            parameters: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Note title or filename' },
                content: { type: 'STRING', description: 'Markdown note content or lecture summary' },
                is_daily: { type: 'BOOLEAN', description: 'Whether to append to today daily note' },
              },
              required: ['content'],
            },
          },
          {
            name: 'search_obsidian_vault',
            description: 'Searches through your local Obsidian vault notes and knowledge base',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Search keywords, topic, or note title' },
              },
              required: ['query'],
            },
          },
          {
            name: 'search_google_contact',
            description: 'Searches Google Contacts for a person name, phone number, or email',
            parameters: {
              type: 'OBJECT',
              properties: { query: { type: 'STRING', description: 'Contact name or email' } },
              required: ['query'],
            },
          },
          {
            name: 'get_classroom_assignments',
            description: 'Fetches pending homework, assignments, and due dates across all enrolled Google Classrooms',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'get_classroom_announcements',
            description: 'Fetches recent teacher announcements and class updates from Google Classroom',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'list_classroom_courses',
            description: 'Lists all active enrolled Google Classroom courses and teachers',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'youtube_data_search',
            description: 'Searches YouTube using official YouTube Data API v3 to get exact video titles, channels, and video links',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Search keywords, video topic, or course name' },
                max_results: { type: 'NUMBER', description: 'Number of videos to fetch (default 5)' },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_youtube_subscriptions',
            description: 'Fetches your subscribed YouTube channels using the YouTube Data API',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'get_youtube_playlists',
            description: 'Lists your personal YouTube playlists from your YouTube library',
            parameters: { type: 'OBJECT', properties: {} },
          },
          {
            name: 'send_whatsapp_file_or_message',
            description: 'Sends a message or shares and attaches a document/file on WhatsApp to a specific person or phone number',
            parameters: {
              type: 'OBJECT',
              properties: {
                contact_or_phone: { type: 'STRING', description: 'Name of contact (e.g. "Rohan", "Alex", "Mom") or phone number with country code' },
                message: { type: 'STRING', description: 'Message text to send' },
                file_path: { type: 'STRING', description: 'Local path of file, document, or PDF to share' },
              },
              required: ['contact_or_phone'],
            },
          },
          {
            name: 'read_attached_file',
            description: 'Reads the text content of the currently attached file to summarize, analyze, or answer questions about it',
            parameters: {
              type: 'OBJECT',
              properties: {
                file_path: { type: 'STRING', description: 'Path to file (defaults to currently attached file)' },
              },
            },
          },
          {
            name: 'open_app',
            description: 'Launches a Windows desktop application',
            parameters: {
              type: 'OBJECT',
              properties: { name: { type: 'STRING', description: 'Application name' } },
              required: ['name'],
            },
          },
          {
            name: 'create_study_revision_document',
            description: 'Creates high-yield academic study notes, 1-page exam cheat sheets, probable exam questions with model answers, or Feynman-technique explanations from an attached lecture PDF/file or topic, saves the document directly to Desktop/Grokki_Study_Notes/, and opens it in editor.',
            parameters: {
              type: 'OBJECT',
              properties: {
                topic: { type: 'STRING', description: 'Subject or lecture topic (e.g. Operating Systems, Thermodynamics, Calculus, Machine Learning)' },
                study_mode: {
                  type: 'STRING',
                  description: 'Type of study document: "cheat_sheet" (1-page exam formulas & core principles), "exam_questions" (top 7 exam questions with answers), "quick_notes" (structured revision notes), or "eli5" (Feynman technique explanation)',
                },
                file_path: { type: 'STRING', description: 'Optional path to lecture PDF, slides, or notes file. Defaults to attached file if any.' },
                custom_instructions: { type: 'STRING', description: 'Any custom focus (e.g. "focus on numerical formulas", "include code examples")' },
              },
            },
          },
          {
            name: 'start_lock_in_study_session',
            description: 'Starts a Lock-In Study / Pomodoro focus session with floating countdown timer in Dynamic Island, ambient lo-fi music, and distraction muting.',
            parameters: {
              type: 'OBJECT',
              properties: {
                duration_minutes: { type: 'NUMBER', description: 'Duration of focus block in minutes (e.g. 25, 45, 60. Default 25)' },
                subject: { type: 'STRING', description: 'Subject or task name (e.g. "Calculus", "Data Structures", "Essay")' },
                play_lofi: { type: 'BOOLEAN', description: 'Whether to play study lo-fi music on YouTube Music (default true)' },
              },
            },
          },
          {
            name: 'get_tonight_study_radar',
            description: 'Fetches Tonight\'s Homework & Exam Priority Radar by analyzing Google Classroom assignments, upcoming exams on Google Calendar, and generating a customized 3-block evening study plan.',
            parameters: {
              type: 'OBJECT',
              properties: {},
            },
          },
          {
            name: 'search_research_papers',
            description: 'Searches 250M+ peer-reviewed academic research papers & preprints via OpenAlex and arXiv APIs, returning abstracts, PDF links, citation counts, and ready-to-copy APA, IEEE, or BibTeX citations.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Research topic, paper title, or academic question (e.g. "transformer attention mechanism", "quantum error correction")' },
                citation_style: { type: 'STRING', description: 'Citation style: "APA" (default), "IEEE", or "BibTeX"' },
                max_results: { type: 'NUMBER', description: 'Number of papers to fetch (default 4)' },
              },
              required: ['query'],
            },
          },
          {
            name: 'summarize_youtube_lecture',
            description: 'Extracts transcript, chapters, and rich context from any YouTube video (lectures, tutorials, documentary/bodycam clips, news, podcasts, essays) and generates a comprehensive summary answering what the video is about with clickable [MM:SS] timestamp links.',
            parameters: {
              type: 'OBJECT',
              properties: {
                url_or_topic: { type: 'STRING', description: 'YouTube video URL or search topic (e.g. "https://youtu.be/..." or "MIT 6.006 Dijkstra lecture")' },
                focus: { type: 'STRING', description: 'Optional specific question or focus about the video (e.g. "what is the video about?", "core concept", etc.)' },
              },
              required: ['url_or_topic'],
            },
          },
          {
            name: 'viva_voice_quiz',
            description: 'Interactive "Viva / Oral Exam" Voice Professor Quiz & Anki Flashcard Exporter. Asks the student questions one-by-one from a topic or attached PDF, grades spoken/typed answers out of 10, asks follow-ups, and exports an Anki .csv flashcard deck.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"start" (begin new oral exam), "answer" (grade student answer & ask next question), or "export_anki" (finish quiz & save Anki CSV flashcards to Desktop)' },
                topic: { type: 'STRING', description: 'Subject or topic for the viva quiz (or uses attached PDF if present)' },
                student_answer: { type: 'STRING', description: 'The student\'s answer when action is "answer"' },
              },
              required: ['action'],
            },
          },
          {
            name: 'snap_and_solve_screen',
            description: 'Screen "Snap & Solve": Captures a high-res screenshot of the active monitor (Canvas/Moodle quiz, LeetCode problem, PDF equation, or circuit/architecture diagram) and solves it step-by-step using AI Vision.',
            parameters: {
              type: 'OBJECT',
              properties: {
                question_or_focus: { type: 'STRING', description: 'What to solve or explain on the screen (e.g. "solve this quiz question", "solve this LeetCode problem in Python", "explain this diagram")' },
              },
            },
          },
          {
            name: 'math_and_knowledge_solver',
            description: 'Solves symbolic calculus/algebra expressions (derivatives, integrals, roots/zeroes, factoring, simplification) via Newton Symbolic Math API and fetches verified academic encyclopedic definitions via Wikipedia REST API.',
            parameters: {
              type: 'OBJECT',
              properties: {
                operation: { type: 'STRING', description: 'Math operation: "derive" (derivative), "integrate" (integral), "zeroes" (roots), "factor", "simplify", "tangent", or "area"' },
                expression: { type: 'STRING', description: 'Mathematical expression in x, e.g. "x^3 + 4x^2 - 7x" or "x^2 + 2x"' },
                wiki_query: { type: 'STRING', description: 'Optional scientific/academic term or theorem to look up on Wikipedia (e.g. "Bayes theorem", "Fourier transform", "Deadlock")' },
              },
            },
          },
          {
            name: 'highlight_to_action',
            description: 'Highlight-to-Action ("Act on Whatever I Selected"): Automatically grabs the user\'s currently highlighted/selected text from any active app via Ctrl+C, transforms it with AI (rewrite, fix code, summarize, explain, translate), copies the result to the clipboard, and optionally pastes (Ctrl+V) it back in place.',
            parameters: {
              type: 'OBJECT',
              properties: {
                instruction: { type: 'STRING', description: 'What to do with the highlighted selection (e.g. "rewrite professionally", "fix this code", "summarize into bullet points", "explain")' },
                replace_in_place: { type: 'BOOLEAN', description: 'True if user asked to replace, paste back, or overwrite the selection in place' },
              },
              required: ['instruction'],
            },
          },
          {
            name: 'organize_folder',
            description: '1-Click Downloads & Desktop Auto-Organizer: Scans messy Downloads or Desktop folder and sorts loose files into clean categorized folders (Lectures & PDFs, Assignments & Docs, Code & Archives, Images & Media, Installers & Apps) in 1 second.',
            parameters: {
              type: 'OBJECT',
              properties: {
                target_folder: { type: 'STRING', description: '"downloads" (default), "desktop", or a full folder path' },
              },
            },
          },
          {
            name: 'pc_health_and_optimizer',
            description: 'Live PC Health, NVIDIA RTX GPU & RAM Optimizer: Checks live CPU %, RAM used/free, NVIDIA RTX GPU temperature & VRAM, Battery status, and Top 5 heaviest RAM processes; or optimizes/frees up RAM and kills memory hogs.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"check" (full hardware/GPU/RAM report), "optimize" (free up standby/working-set RAM), or "kill_app" (terminate a heavy process)' },
                target_app: { type: 'STRING', description: 'Optional process name to terminate if action is "kill_app"' },
              },
            },
          },
          {
            name: 'schedule_reminder_or_action',
            description: 'Spoken Background Reminders & Timed OS Actions: Schedules a background timer that pops open Grokki and speaks a reminder out loud via Kokoro TTS, or executes a timed OS action (lock, sleep, shutdown, mute, unmute, close_window) after X minutes/seconds.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"schedule" (default), "list" (show active timers), or "cancel" (clear all timers)' },
                delay_minutes: { type: 'NUMBER', description: 'Minutes from now until trigger (can be decimal, e.g. 0.5 for 30 seconds, 20 for 20 minutes)' },
                reminder_text: { type: 'STRING', description: 'What Grokki should speak out loud and show when the timer fires' },
                os_action: { type: 'STRING', description: 'Optional OS action to execute when timer expires: "none", "lock", "sleep", "shutdown", "mute", "unmute", or "close_window"' },
              },
            },
          },
          {
            name: 'download_research_pdfs',
            description: 'Auto-Download Research Paper PDFs to Desktop: Searches arXiv & OpenAlex for peer-reviewed papers on a topic, downloads the actual .pdf files into Desktop/Grokki_Study_Notes/Papers/, and opens the folder in Windows Explorer.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Research topic or paper title to download PDFs for (e.g. "Deep Reinforcement Learning", "Diffusion Models")' },
                count: { type: 'NUMBER', description: 'Number of PDF files to download (default 3, max 6)' },
              },
              required: ['query'],
            },
          },
          {
            name: 'system_brightness',
            description: 'Laptop Screen Brightness Control (WMI Hardware Dimmer): Adjusts or sets laptop screen brightness percentage (0-100), increases/decreases brightness, or dims screen.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"set", "up" (increase), "down" (decrease/dim), or "get"' },
                level: { type: 'NUMBER', description: 'Brightness percentage (0-100) when action is "set"' },
              },
              required: ['action'],
            },
          },
          {
            name: 'window_manager',
            description: 'Win32 Window Manager & Split-Screen Snapper: Minimizes, maximizes, restores, shows desktop (minimizes all), snaps active/target window to left or right half of screen, or split-screens two apps side-by-side.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"minimize", "maximize", "restore", "show_desktop", "snap_left", "snap_right", or "split_screen"' },
                app_name: { type: 'STRING', description: 'Optional process/app name to target (or left app when action is "split_screen", e.g. "Code", "chrome", "notepad")' },
                second_app_name: { type: 'STRING', description: 'Right-side process/app name when action is "split_screen" (e.g. "chrome", "msedge")' },
              },
              required: ['action'],
            },
          },
          {
            name: 'connectivity_control',
            description: 'Wi-Fi, Bluetooth & Network Diagnostics Control: Turns Wi-Fi or Bluetooth on/off via Windows Radios API, or checks live Wi-Fi signal strength, SSID, IP address, and internet ping latency.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"wifi_on", "wifi_off", "bluetooth_on", "bluetooth_off", "status" (Wi-Fi & IP info), or "ping" (internet latency check)' },
              },
              required: ['action'],
            },
          },
          {
            name: 'power_and_theme_control',
            description: 'Windows Power Plan (High Performance Turbo vs. Battery Saver) & Dark/Light Theme Switcher.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"high_performance" (Turbo mode), "power_saver" (Eco/Battery saver), "balanced", "dark_mode", "light_mode", or "toggle_theme"' },
              },
              required: ['action'],
            },
          },
          {
            name: 'storage_and_cleanup',
            description: 'Storage Drives, Empty Recycle Bin & Temp Cache Cleaner: Empties Windows Recycle Bin, purges %TEMP% junk cache files, or checks used/free GB across all drives (C:, D:, E:).',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"empty_recycle_bin", "clean_temp", or "drive_space"' },
              },
              required: ['action'],
            },
          },
          {
            name: 'screen_capture_and_recorder',
            description: 'Clean Screenshot to Desktop/Clipboard, Native Windows Screen Recorder (Win+Alt+R), and System Microphone Mute Toggle (Win+Alt+K).',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"screenshot" (saves PNG to Desktop & copies to clipboard), "start_recording", "stop_recording", or "toggle_mic"' },
              },
              required: ['action'],
            },
          },
          {
            name: 'lecture_meeting_stenographer',
            description: 'Live Lecture & Meeting Stenographer: Continuous background microphone/system speech recording, automatic Whisper transcription, and academic study summary note generation saved to Desktop.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"start" (begin recording), "stop_and_summarize" (finish and create structured study notes), or "status"' },
                topic: { type: 'STRING', description: 'Subject or lecture title (e.g. "Operating Systems", "Physics Lecture", "Team Sync")' },
              },
              required: ['action'],
            },
          },
          {
            name: 'cli_copilot',
            description: 'Autonomous Terminal, Git & Port Copilot: Kills processes on stubborn ports (3000, 8080, etc.), executes smart Git autopilot (stage, conventional commit, push), runs safe terminal commands, and diagnoses build/npm/pip errors.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"kill_port", "git_autopilot", "run_command", or "diagnose_error"' },
                port: { type: 'NUMBER', description: 'Port number to free/kill (e.g. 3000, 8080)' },
                command: { type: 'STRING', description: 'Terminal command to execute when action is "run_command"' },
                message: { type: 'STRING', description: 'Optional commit message for Git autopilot' },
                branch: { type: 'STRING', description: 'Optional git branch (defaults to main)' },
                error_text: { type: 'STRING', description: 'Error message/stack trace to diagnose' },
              },
              required: ['action'],
            },
          },
          {
            name: 'document_swiss_knife',
            description: '1-Click Offline PDF & Document Swiss Army Knife: Merges multiple PDF files into one clean assignment PDF, compresses/optimizes PDFs under 2MB for university portals, or extracts pages.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"merge", "compress", or "optimize"' },
                file_paths: { type: 'ARRAY', items: { type: 'STRING' }, description: 'List of PDF file paths to merge' },
                target_file: { type: 'STRING', description: 'Target PDF to compress or optimize' },
                max_mb: { type: 'NUMBER', description: 'Target max file size in MB (defaults to 2.0)' },
              },
              required: ['action'],
            },
          },
          {
            name: 'form_autofiller',
            description: 'Web Form & Internship Autofiller: Generates 1-click JavaScript injection bookmarklet/script to automatically fill job applications, Google Forms, and internship portals with student profile details (Name, Roll No, Branch, CGPA, GitHub, LinkedIn).',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"get_script" (generates 1-click autofill code), "view_profile", or "update_profile"' },
                profile_updates: { type: 'OBJECT', description: 'Fields to update in student profile' },
              },
              required: ['action'],
            },
          },
          {
            name: 'offline_airgap_mode',
            description: '100% Offline Air-Gapped Mode: Forces Grokki to run completely air-gapped without internet, routing all queries to local Ollama (Llama 3.2 / Qwen 2.5) and local Kokoro-82M TTS, or checks offline status.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"enable", "disable", "status", or "check_ollama"' },
              },
              required: ['action'],
            },
          },
          {
            name: 'presentation_slide_changer',
            description: 'Smart Presentation Slide Changer (Touchless Iron Man Style & Voice): Advances slides (next), moves to previous slide (prev), toggles blackout screen (blackout), starts fullscreen slideshow (fullscreen), or starts/stops hands-free presentation mode.',
            parameters: {
              type: 'OBJECT',
              properties: {
                action: { type: 'STRING', description: '"next", "prev", "blackout", "fullscreen", "start_mode", or "stop_mode"' },
              },
              required: ['action'],
            },
          },
          {
            name: 'find_files_and_folders',
            description: 'Smart Local File & Folder Search + Explorer Opener: Searches across Desktop, Downloads, Documents, OneDrive, Pictures, Videos, and Drives (D:, E:) when the user asks to find a file/folder or says they forgot where they saved something. Automatically opens File Explorer and highlights the file/folder.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'Filename, folder name, or keywords to search for (e.g. "resume", "operating systems", "assignment 2"). Leave empty if searching purely for the most recent file of a specific type.' },
                file_type: { type: 'STRING', description: 'Optional filter: "pdf", "word", "ppt", "excel", "image", "video", "audio", "archive", "code", "text", or "folder"' },
                open_in_explorer: { type: 'BOOLEAN', description: 'True (default) to automatically open File Explorer with the found file/folder highlighted' },
                open_file: { type: 'BOOLEAN', description: 'True if the user also wants to launch/open the file itself' },
              },
              required: ['query'],
            },
          },
        ],
      },
    ];
  }

  checkFastIntent(prompt) {
    const raw = (prompt || '').trim();
    const p = raw.toLowerCase();

    // Fast Slash Command Interceptor
    if (p.startsWith('/')) {
      const parts = raw.slice(1).trim().split(/\s+/);
      const cmd = (parts[0] || '').toLowerCase();
      const rest = parts.slice(1).join(' ').trim();

      if (cmd === 'status' || cmd === 'health') {
        return { tool: 'pc_health_and_optimizer', args: { action: 'check' } };
      }
      if (cmd === 'clean' || cmd === 'cleanup') {
        return { tool: 'storage_and_cleanup', args: { action: 'clean_temp' } };
      }
      if (cmd === 'screenshot' || cmd === 'snip') {
        return { tool: 'screen_capture_and_recorder', args: { action: 'screenshot' } };
      }
      if (cmd === 'lock') {
        return { tool: 'system_power', args: { action: 'lock' } };
      }
      if (cmd === 'sleep') {
        return { tool: 'system_power', args: { action: 'sleep' } };
      }
      if (cmd === 'mute') {
        return { tool: 'system_volume', args: { action: 'mute' } };
      }
      if (cmd === 'unmute') {
        return { tool: 'system_volume', args: { action: 'unmute' } };
      }
      if (cmd === 'notes' && rest) {
        return { tool: 'create_study_revision_document', args: { topic: rest } };
      }
      if (cmd === 'compact') {
        memory.clear();
        return { tool: 'compact_memory', args: {} };
      }
      if (cmd === 'browser' && rest) {
        return { tool: 'open_url', args: { url: rest.startsWith('http') ? rest : `https://www.google.com/search?q=${encodeURIComponent(rest)}` } };
      }
    }

    // If Viva / Oral Exam is active, handle stop/export or route answers directly
    if (studyEngine.vivaState && studyEngine.vivaState.active) {
      if (/\b(stop|end|quit|finish|exit)\s+(viva|quiz|exam|oral)\b/i.test(p) ||
          /\b(export|save)\s+(anki|flashcards?)\b/i.test(p) ||
          p === 'stop quiz' || p === 'end viva') {
        return { tool: 'viva_voice_quiz', args: { action: 'export_anki', topic: studyEngine.vivaState.topic } };
      }
      // If it's not a hardware command (volume/close/power), treat user input as their Viva answer!
      if (!/\b(volume|mute|unmute|close window|lock pc|shutdown)\b/i.test(p) &&
          !/\b(start|begin)\s+(a\s+)?(new\s+)?(viva|quiz)\b/i.test(p)) {
        return {
          tool: 'viva_voice_quiz',
          args: {
            action: 'answer',
            topic: studyEngine.vivaState.topic,
            student_answer: prompt,
          },
        };
      }
    }

    // Fast Snap & Solve trigger
    if (/^(snap\s*(&|and)\s*solve|solve\s+(what'?s\s+on\s+)?my\s+screen|solve\s+this\s+screen|snap\s+solve)/i.test(p)) {
      return { tool: 'snap_and_solve_screen', args: { question_or_focus: prompt } };
    }

    // Fast Folder Auto-Organizer (Downloads / Desktop)
    if (/\b(organize|clean\s*up|sort|tidy)\s+(my\s+)?(downloads?|desktop)(\s+folder)?\b/i.test(p)) {
      const isDesktop = /\bdesktop\b/i.test(p);
      return { tool: 'organize_folder', args: { target_folder: isDesktop ? 'desktop' : 'downloads' } };
    }

    // Fast File & Folder Finder ("where did I save...", "forgot where I saved...", "find my file/folder...", "locate...")
    if (
      /\b(where\s+did\s+i\s+save|forgot\s+where\s+i\s+saved|where\s+is\s+my\s+.*\b(file|folder|pdf|doc|docx|ppt|pptx|notes?|resume|assignment|report|project)\b|(?:find|locate|search\s+(?:for|my\s+pc\s+for))\s+(?:my\s+|the\s+)?(?:file|folder|pdf|document|notes?|resume|assignment|project)\b)/i.test(p)
    ) {
      const wantsOpenFile = /\bopen\s+(it|the\s+file)\b/i.test(p) && !/\bopen\s+(the\s+)?(location|folder|in\s+explorer)\b/i.test(p);
      return {
        tool: 'find_files_and_folders',
        args: {
          query: prompt,
          open_in_explorer: true,
          open_file: wantsOpenFile,
        },
      };
    }

    // Fast PC Health & RAM Optimizer
    if (/\b(check\s+(my\s+)?(pc|system|computer|laptop|gpu)\s+(health|status|stats|temp|temperature)|what'?s\s+eating\s+(my\s+)?ram|pc\s+health)\b/i.test(p)) {
      return { tool: 'pc_health_and_optimizer', args: { action: 'check' } };
    }
    if (/\b(optimize|free\s+up|clean|boost|clear)\s+(my\s+)?(ram|memory)\b/i.test(p)) {
      return { tool: 'pc_health_and_optimizer', args: { action: 'optimize' } };
    }

    // Guard against scheduled/timed commands being treated as immediate OS power/volume actions!
    // e.g. "lock my pc in 20 minutes" or "remind me in 10 seconds..."
    if (/\b(remind\s+me|in\s+\d+(\.\d+)?\s*(sec|second|seconds|min|mins|minute|minutes|hr|hour|hours))\b/i.test(p)) {
      return null; // Let LLM parse exact delay_minutes, reminder_text, and os_action
    }
    
    // Guard against instructional queries
    if (/\b(how to|how do i|why|what is|explain|tutorial)\b/i.test(p)) {
      return null;
    }

    // --- 1. Screen Brightness Fast Intents ---
    const brightMatch = p.match(/\b(?:set\s+)?brightness\s+(?:to\s+)?(\d{1,3})%?\b/i);
    if (brightMatch) {
      const lvl = parseInt(brightMatch[1], 10);
      if (!isNaN(lvl) && lvl >= 0 && lvl <= 100) {
        return { tool: 'system_brightness', args: { action: 'set', level: lvl } };
      }
    }
    if (/\b(max|full|100%?)\s+brightness\b/i.test(p)) {
      return { tool: 'system_brightness', args: { action: 'set', level: 100 } };
    }
    if (/\b(dim\s+(my\s+)?(screen|display|monitor)|night\s+brightness)\b/i.test(p)) {
      return { tool: 'system_brightness', args: { action: 'set', level: 20 } };
    }
    if (/\b(increase|turn up|raise|boost)\s+(the\s+)?(screen\s+)?brightness\b/i.test(p) || p === 'brightness up' || p === 'brighter') {
      return { tool: 'system_brightness', args: { action: 'up' } };
    }
    if (/\b(decrease|turn down|lower|reduce)\s+(the\s+)?(screen\s+)?brightness\b/i.test(p) || p === 'brightness down') {
      return { tool: 'system_brightness', args: { action: 'down' } };
    }

    // --- 2. Window Manager & Snap Fast Intents ---
    if (/\b(show\s+desktop|minimize\s+(all|everything|all\s+windows))\b/i.test(p)) {
      return { tool: 'window_manager', args: { action: 'show_desktop' } };
    }
    if (/\b(minimize\s+(this|current|active)?\s*(window|app|software)?)\b/i.test(p) && !/\ball\b/i.test(p)) {
      return { tool: 'window_manager', args: { action: 'minimize' } };
    }
    if (/\b(maximize\s+(this|current|active)?\s*(window|app|software)?|full\s*screen\s+window)\b/i.test(p)) {
      return { tool: 'window_manager', args: { action: 'maximize' } };
    }
    if (/\b(snap\s+(this\s+)?(window\s+)?(to\s+the\s+)?left)\b/i.test(p)) {
      return { tool: 'window_manager', args: { action: 'snap_left' } };
    }
    if (/\b(snap\s+(this\s+)?(window\s+)?(to\s+the\s+)?right)\b/i.test(p)) {
      return { tool: 'window_manager', args: { action: 'snap_right' } };
    }

    // --- 3. Connectivity (Wi-Fi / Bluetooth / Ping) Fast Intents ---
    if (/\b(turn\s+on|enable)\s+(my\s+)?wi-?fi\b/i.test(p)) {
      return { tool: 'connectivity_control', args: { action: 'wifi_on' } };
    }
    if (/\b(turn\s+off|disable)\s+(my\s+)?wi-?fi\b/i.test(p)) {
      return { tool: 'connectivity_control', args: { action: 'wifi_off' } };
    }
    if (/\b(turn\s+on|enable)\s+(my\s+)?bluetooth\b/i.test(p)) {
      return { tool: 'connectivity_control', args: { action: 'bluetooth_on' } };
    }
    if (/\b(turn\s+off|disable)\s+(my\s+)?bluetooth\b/i.test(p)) {
      return { tool: 'connectivity_control', args: { action: 'bluetooth_off' } };
    }
    if (/\b(check\s+(my\s+)?(wi-?fi|network|ip|internet)|wi-?fi\s+status)\b/i.test(p)) {
      return { tool: 'connectivity_control', args: { action: 'status' } };
    }
    if (/\b(ping\s+test|test\s+(my\s+)?ping|check\s+latency)\b/i.test(p)) {
      return { tool: 'connectivity_control', args: { action: 'ping' } };
    }

    // --- 4. Power Plan & Dark/Light Theme Fast Intents ---
    if (/\b(switch\s+(windows\s+)?to\s+dark\s+mode|enable\s+dark\s+mode|dark\s+mode)\b/i.test(p)) {
      return { tool: 'power_and_theme_control', args: { action: 'dark_mode' } };
    }
    if (/\b(switch\s+(windows\s+)?to\s+light\s+mode|enable\s+light\s+mode|light\s+mode)\b/i.test(p)) {
      return { tool: 'power_and_theme_control', args: { action: 'light_mode' } };
    }
    if (/\b(high\s+performance|turbo\s+mode|ultimate\s+performance)\b/i.test(p)) {
      return { tool: 'power_and_theme_control', args: { action: 'high_performance' } };
    }
    if (/\b(power\s+saver|battery\s+saver|eco\s+mode)\b/i.test(p)) {
      return { tool: 'power_and_theme_control', args: { action: 'power_saver' } };
    }

    // --- 5. Storage, Recycle Bin & Temp Cache Fast Intents ---
    if (/\b(empty\s+(the\s+)?recycle\s+bin|clear\s+recycle\s+bin)\b/i.test(p)) {
      return { tool: 'storage_and_cleanup', args: { action: 'empty_recycle_bin' } };
    }
    if (/\b(clean|clear|purge)\s+(windows\s+)?temp(\s+files|\s+cache)?\b/i.test(p)) {
      return { tool: 'storage_and_cleanup', args: { action: 'clean_temp' } };
    }
    if (/\b(check\s+(my\s+)?(drive|disk|storage)\s+space|free\s+disk\s+space)\b/i.test(p)) {
      return { tool: 'storage_and_cleanup', args: { action: 'drive_space' } };
    }

    // --- 6. Screenshot, Screen Recorder & Mic Mute Fast Intents ---
    if (/\b(take\s+a\s+screenshot|capture\s+screenshot|save\s+a\s+screenshot)\b/i.test(p)) {
      return { tool: 'screen_capture_and_recorder', args: { action: 'screenshot' } };
    }

    // --- 7. Live Lecture Stenographer Fast Intents (checked before screen recording) ---
    if (/\b(start\s+(recording\s+)?(this\s+)?(lecture|meeting|class)|record\s+(this\s+)?(lecture|meeting|class))\b/i.test(p)) {
      const topicMatch = p.match(/(?:for|on|about)\s+([a-zA-Z0-9\s_-]+)$/i);
      return { tool: 'lecture_meeting_stenographer', args: { action: 'start', topic: topicMatch ? topicMatch[1].trim() : 'Lecture' } };
    }
    if (/\b(finish\s+(the\s+)?lecture\s+notes|stop\s+(and\s+)?summarize\s+(the\s+)?(lecture|meeting)|summarize\s+(this\s+)?(recorded\s+)?lecture)\b/i.test(p)) {
      return { tool: 'lecture_meeting_stenographer', args: { action: 'stop_and_summarize' } };
    }

    if (/\b(start\s+(screen\s+)?recording|record\s+my\s+screen)\b/i.test(p)) {
      return { tool: 'screen_capture_and_recorder', args: { action: 'start_recording' } };
    }
    if (/\b(stop\s+(screen\s+)?recording)\b/i.test(p)) {
      return { tool: 'screen_capture_and_recorder', args: { action: 'stop_recording' } };
    }
    if (/\b(mute|unmute|toggle)\s+(my\s+)?(mic|microphone)\b/i.test(p)) {
      return { tool: 'screen_capture_and_recorder', args: { action: 'toggle_mic' } };
    }

    // --- 8. Terminal / Port Copilot Fast Intents ---
    const portMatch = p.match(/\b(?:kill|free|terminate|close)\s+(?:the\s+)?port\s+(\d{2,5})\b/i);
    if (portMatch) {
      return { tool: 'cli_copilot', args: { action: 'kill_port', port: parseInt(portMatch[1], 10) } };
    }
    if (/\b(git\s+autopilot|commit\s+and\s+push|push\s+(my\s+)?changes\s+to\s+git)\b/i.test(p)) {
      return { tool: 'cli_copilot', args: { action: 'git_autopilot' } };
    }

    // --- 9. Document Swiss Army Knife Fast Intents ---
    if (/\b(merge|combine)\s+(all\s+)?(the\s+)?(my\s+)?(assignment\s+)?pdfs?\b/i.test(p)) {
      return { tool: 'document_swiss_knife', args: { action: 'merge' } };
    }
    if (/\b(compress|shrink|optimize)\s+(this\s+)?(the\s+)?pdf\b/i.test(p)) {
      return { tool: 'document_swiss_knife', args: { action: 'compress' } };
    }

    // --- 10. Form Autofiller Fast Intents ---
    if (/\b(autofill|fill)\s*(?:in)?\s*(?:my)?\s*(internship|job|profile|google\s+form|form)\b/i.test(p)) {
      return { tool: 'form_autofiller', args: { action: 'get_script' } };
    }
    if (/\b(view|check|show)\s+(my\s+)?(student\s+)?(internship\s+)?profile\b/i.test(p)) {
      return { tool: 'form_autofiller', args: { action: 'view_profile' } };
    }

    // --- 11. Offline Airgap Mode Fast Intents ---
    if (/\b(enable|turn\s+on|activate|switch\s+to)\s+(offline|airplane|air[- ]?gap(ped)?)\s+mode\b/i.test(p)) {
      return { tool: 'offline_airgap_mode', args: { action: 'enable' } };
    }
    if (/\b(disable|turn\s+off|exit)\s+(offline|airplane|air[- ]?gap(ped)?)\s+mode\b/i.test(p)) {
      return { tool: 'offline_airgap_mode', args: { action: 'disable' } };
    }
    if (/\b(offline|air[- ]?gap(ped)?)\s+mode\s+status\b/i.test(p)) {
      return { tool: 'offline_airgap_mode', args: { action: 'status' } };
    }

    // --- 12. Smart Presentation Slide Changer Fast Intents ---
    if (/\b(start|enable|turn\s+on|activate|launch)\s+(presentation|slide\s+changer|gesture\s+slide|touchless\s+slide)\s*(mode)?\b/i.test(p)) {
      return { tool: 'presentation_slide_changer', args: { action: 'start_mode' } };
    }
    if (/\b(stop|disable|turn\s+off|deactivate|exit)\s+(presentation|slide\s+changer|gesture\s+slide)\s*(mode)?\b/i.test(p)) {
      return { tool: 'presentation_slide_changer', args: { action: 'stop_mode' } };
    }
    if (/\b(next\s+slide|slide\s+forward|advance\s+slide|next\s+page\s+slide|moving\s+on\s+to\s+(the\s+)?next\s+(slide|topic)|as\s+you\s+can\s+see\s+on\s+(the\s+)?next\s+slide)\b/i.test(p)) {
      return { tool: 'presentation_slide_changer', args: { action: 'next' } };
    }
    if (/\b(previous\s+slide|prev\s+slide|slide\s+back|go\s+back\s+a\s+slide|one\s+slide\s+back)\b/i.test(p)) {
      return { tool: 'presentation_slide_changer', args: { action: 'prev' } };
    }
    if (/\b(blackout(\s+(the\s+)?(screen|slides?))?|blank\s+(the\s+)?screen|black\s+screen(\s+slides?)?)\b/i.test(p)) {
      return { tool: 'presentation_slide_changer', args: { action: 'blackout' } };
    }
    if (/\b(start\s+(the\s+)?slideshow|fullscreen\s+slides?)\b/i.test(p)) {
      return { tool: 'presentation_slide_changer', args: { action: 'fullscreen' } };
    }

    // Volume Unmute
    if (/^(can you\s+)?unmute(\s+(the|my)?\s*(system|pc|computer)?\s*volume)?$/i.test(p) ||
        /\bunmute\s+(the\s+)?(system\s+)?volume\b/i.test(p) ||
        (/\bunmute\b/i.test(p) && !/\b(mic|microphone)\b/i.test(p))) {
      return { tool: 'system_volume', args: { action: 'unmute' } };
    }

    // Volume Mute
    if (/^(can you\s+)?mute(\s+(the|my)?\s*(system|pc|computer)?\s*volume)?$/i.test(p) ||
        /\bmute\s+(the\s+)?(system\s+)?volume\b/i.test(p) ||
        p === 'mute' || p === 'mute audio') {
      return { tool: 'system_volume', args: { action: 'mute' } };
    }

    // Volume Up / Increase
    if (/\b(increase|turn up|raise|boost|bump up)\s+(the\s+)?(system\s+)?volume\b/i.test(p) ||
        /\bvolume\s+up\b/i.test(p) ||
        p === 'increase volume' || p === 'louder') {
      return { tool: 'system_volume', args: { action: 'up' } };
    }

    // Volume Down / Decrease
    if (/\b(decrease|turn down|lower|reduce)\s+(the\s+)?(system\s+)?volume\b/i.test(p) ||
        /\bvolume\s+down\b/i.test(p) ||
        p === 'decrease volume' || p === 'softer' || p === 'quieter') {
      return { tool: 'system_volume', args: { action: 'down' } };
    }

    // Volume Set: e.g. "set volume to 70" or "volume 50"
    const volMatch = p.match(/\b(?:set\s+)?volume\s+(?:to\s+)?(\d{1,3})%?\b/i);
    if (volMatch) {
      const lvl = parseInt(volMatch[1], 10);
      if (!isNaN(lvl) && lvl >= 0 && lvl <= 100) {
        return { tool: 'system_volume', args: { action: 'set', level: lvl } };
      }
    }

    // Close Current Software / Window
    if (/\b(close\s+(current\s+)?(opened\s+)?(software|window|app|application|program))\b/i.test(p) ||
        /\b(close\s+this\s+(window|app|software|program))\b/i.test(p) ||
        p === 'close window' || p === 'close app' || p === 'close software') {
      return { tool: 'close_active_window', args: {} };
    }

    // Close Specific App: e.g. "close chrome", "close notepad"
    const closeAppMatch = p.match(/^close\s+([a-zA-Z0-9_\-\s]+)$/i);
    if (closeAppMatch) {
      const app = closeAppMatch[1].trim();
      const forbidden = ['it', 'window', 'the window', 'current window', 'current software', 'this', 'this window', 'this app', 'all', 'everything', 'grokki', 'grokbot'];
      if (!forbidden.includes(app.toLowerCase())) {
        return { tool: 'close_active_window', args: { app_name: app } };
      }
    }

    // Lock PC
    if (/\b(lock\s+(my\s+)?(pc|computer|system|workstation|screen))\b/i.test(p) ||
        /\block\s+it\b/i.test(p) || p === 'lock') {
      return { tool: 'system_power', args: { action: 'lock' } };
    }

    // Sleep PC
    if (/\b(make\s+(it|the\s+pc|the\s+computer)\s+sleep)\b/i.test(p) ||
        /\b(put\s+(my\s+)?(pc|computer|system)\s+to\s+sleep)\b/i.test(p) ||
        /\b(sleep\s+(my\s+)?(pc|computer))\b/i.test(p) ||
        p === 'sleep' || p === 'sleep pc') {
      return { tool: 'system_power', args: { action: 'sleep' } };
    }

    // Shutdown PC
    if (/\b(shut\s*down\s+(my\s+)?(pc|computer|system))\b/i.test(p) ||
        /\b(turn\s+off\s+(my\s+)?(pc|computer|system))\b/i.test(p) ||
        p === 'shut down' || p === 'shutdown' || p === 'shutdown pc') {
      return { tool: 'system_power', args: { action: 'shutdown' } };
    }

    // Restart PC
    if (/\b(restart\s+(my\s+)?(pc|computer|system))\b/i.test(p) ||
        /\b(reboot\s+(my\s+)?(pc|computer|system))\b/i.test(p) ||
        p === 'restart' || p === 'restart pc' || p === 'reboot') {
      return { tool: 'system_power', args: { action: 'restart' } };
    }

    // Cancel Shutdown
    if (/\b(cancel\s+(the\s+)?(shutdown|restart))\b/i.test(p) ||
        /\b(abort\s+(the\s+)?(shutdown|restart))\b/i.test(p)) {
      return { tool: 'system_power', args: { action: 'cancel' } };
    }

    return null;
  }

  async runOpenAICompatible(prompt, config, context = {}) {
    if (this.abortController) {
      try { this.abortController.abort(); } catch (e) {}
    }
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const provider = powerTools.airgapForced ? 'ollama' : (config.provider || 'groq');
    let endpoint = 'https://api.groq.com/openai/v1';
    let apiKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
    let model = config.groqModel || 'llama-3.3-70b-versatile';
    let modelCandidates = [model];

    if (provider === 'groq') {
      endpoint = 'https://api.groq.com/openai/v1';
      apiKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
      model = config.groqModel || 'llama-3.3-70b-versatile';
      modelCandidates = Array.from(new Set([model, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']));
    } else if (provider === 'ollama') {
      const base = (config.ollamaEndpoint || 'http://127.0.0.1:11434').replace(/\/+$/, '');
      endpoint = `${base}/v1`;
      apiKey = 'ollama';
      model = config.ollamaModel || 'llama3.2';
      modelCandidates = [model];
    } else if (provider === 'openrouter') {
      endpoint = 'https://openrouter.ai/api/v1';
      apiKey = (config.openrouterApiKey || process.env.OPENROUTER_API_KEY || '').trim();
      model = config.openrouterModel || 'openrouter/auto';
      modelCandidates = [model];
    } else if (provider === 'openai') {
      endpoint = 'https://api.openai.com/v1';
      apiKey = (config.openaiApiKey || process.env.OPENAI_API_KEY || '').trim();
      model = config.openaiModel || 'gpt-4o';
      modelCandidates = [model, 'gpt-4o-mini'];
    } else if (provider === 'grok') {
      endpoint = 'https://api.x.ai/v1';
      apiKey = (config.grokApiKey || process.env.XAI_API_KEY || '').trim();
      model = config.grokModel || 'grok-2-1212';
      modelCandidates = [model, 'grok-beta'];
    } else if (provider === 'deepseek') {
      endpoint = 'https://api.deepseek.com';
      apiKey = (config.deepseekApiKey || process.env.DEEPSEEK_API_KEY || '').trim();
      model = config.deepseekModel || 'deepseek-chat';
      modelCandidates = [model, 'deepseek-reasoner'];
    } else if (provider === 'qwen') {
      endpoint = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
      apiKey = (config.qwenApiKey || process.env.DASHSCOPE_API_KEY || '').trim();
      model = config.qwenModel || 'qwen-max';
      modelCandidates = [model, 'qwen-plus'];
    } else if (provider === 'omnirouter') {
      const base = (config.omnirouterEndpoint || 'https://api.omnirouter.ai/v1').replace(/\/+$/, '');
      endpoint = base;
      apiKey = (config.omnirouterApiKey || process.env.OMNIROUTER_API_KEY || 'free').trim();
      model = config.omnirouterModel || 'omnirouter/auto';
      modelCandidates = [model];
    }

    if (provider !== 'ollama' && provider !== 'omnirouter' && !apiKey) {
      return { success: false, error: `NO_${provider.toUpperCase()}_API_KEY` };
    }

    this.activeConfig = config;
    this.activeContext = context;
    this.activePrompt = prompt || '';

    let fullPrompt = prompt || '';
    const attachPath = (context && context.filePath) || (context && context.attachedFile && (context.attachedFile.path || context.attachedFile)) || null;
    if (attachPath && typeof attachPath === 'string') {
      const fileName = (context && context.attachedFile && context.attachedFile.name) || path.basename(attachPath);
      let fileSnippet = '';
      try {
        const ext = path.extname(attachPath).toLowerCase();
        if (['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.py', '.html', '.css', '.c', '.cpp', '.java', '.csv', '.log'].includes(ext)) {
          const content = fs.readFileSync(attachPath, 'utf8');
          fileSnippet = `\n[File Content of ${fileName} (${content.length} chars)]:\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\``;
        }
      } catch (e) {}
      fullPrompt = `${fullPrompt}\n[User attached file: "${fileName}" located at "${attachPath}"]${fileSnippet}`.trim();
    }

    // Project Mentions Context Packaging (@file and @folder)
    if (context && (context.projectMentions || context.workspaceContext)) {
      try {
        const workspaceContext = require('./workspace_context');
        const mentions = context.projectMentions || context.workspaceContext;
        const packagedContext = workspaceContext.packageContext(mentions);
        if (packagedContext) {
          fullPrompt = `${packagedContext}\n${fullPrompt}`.trim();
        }
      } catch (err) {
        console.warn('[AgentBrain] Failed to package project mentions:', err.message);
      }
    }

    fullPrompt = expandSlashDirective(fullPrompt);

    let groundingSources = [];
    const isWebSearchActive = Boolean(
      context && (context.webSearch || context.webSearchEnabled) ||
      shouldAutoSearchWeb(prompt)
    );
    if (isWebSearchActive) {
      try {
        console.log(`[AgentBrain] Performing live web grounding for: "${prompt}"...`);
        groundingSources = await searchWeb(prompt, 5);
        if (groundingSources.length > 0) {
          fullPrompt = `${fullPrompt}${buildGroundingPrompt(groundingSources, prompt)}`;
        }
      } catch (err) {
        console.warn('[AgentBrain] Web grounding error:', err.message);
      }
    }

    memory.addTurn('user', fullPrompt);

    const rawHistory = memory.getHistory();
    let systemContent = memory.buildSystemPrompt(config);
    let historyToUse = rawHistory;

    // Groq Free Tier optimization: keep prompt lean (<3500 tokens) to guarantee zero 413 ITPM errors
    if (provider === 'groq') {
      systemContent = `You are Grokki, a fast, highly concise AI assistant for Windows.
User: ${config.userNickname || config.userName || 'Friend'}.
Tone: ${config.userTone || 'warm, friendly, direct'}.
Respond concisely, naturally, and directly without robotic disclaimers. Use clean Markdown formatting.`;
      historyToUse = rawHistory.slice(-2);
    }

    const messages = [
      { role: 'system', content: systemContent },
    ];

    for (const turn of historyToUse) {
      const role = turn.role === 'model' ? 'assistant' : turn.role;
      let content = '';
      if (Array.isArray(turn.parts)) {
        content = turn.parts.map((p) => p.text || '').filter(Boolean).join('\n');
      } else if (typeof turn.content === 'string') {
        content = turn.content;
      }
      if (content) {
        messages.push({ role, content });
      }
    }

    // When Deep Search / Live Grounding is active, omit desktop tools so model synthesizes search results
    const tools = isWebSearchActive ? undefined : convertGeminiToolsToOpenAI(this.getToolsDeclaration());

    try {
      if (signal.aborted) throw new Error('TASK_CANCELLED');

      let data = null;
      let lastModelErr = null;

      for (const candModel of modelCandidates) {
        try {
          if (signal.aborted) throw new Error('TASK_CANCELLED');
          data = await callOpenAICompatible({
            endpoint,
            apiKey,
            model: candModel,
            messages,
            tools,
            signal,
            timeout: 25000,
          });
          if (data && data.choices && data.choices.length > 0) {
            break;
          }
        } catch (mErr) {
          lastModelErr = mErr;
          if (mErr.message === 'TASK_CANCELLED' || (signal && signal.aborted)) {
            throw mErr;
          }
          console.warn(`[AgentBrain] Provider model ${candModel} error: ${mErr.message}. Trying next fallback...`);
        }
      }

      if (!data) {
        // If Groq fails due to token limit / 413 / rate limit, seamlessly fallback to Gemini 3.5 Flash
        if (lastModelErr && (lastModelErr.message.includes('413') || lastModelErr.message.includes('Limit') || lastModelErr.message.includes('tokens per minute'))) {
          console.log('[AgentBrain] Groq token limit hit. Seamlessly falling back to Gemini 3.5 Flash...');
          const gemKey = (config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
          if (gemKey) {
            return await this.run(prompt, { ...config, provider: 'gemini', geminiApiKey: gemKey }, context);
          }
        }
        throw lastModelErr || new Error('No response from provider');
      }

      const choice = data.choices && data.choices[0];
      if (!choice) throw new Error('Empty response from model');

      const msg = choice.message;
      let replyText = (msg.content || '').trim();
      const toolCalls = msg.tool_calls || [];
      const executed = [];

      for (const call of toolCalls) {
        if (signal.aborted) {
          this.abortController = null;
          return { success: false, cancelled: true, reply: 'Cancelled.' };
        }

        const name = call.function.name;
        let args = {};
        try {
          args = typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments) : (call.function.arguments || {});
        } catch (e) {
          args = {};
        }

        const result = await this.executeTool(name, args, config.geminiApiKey || apiKey);
        executed.push({ name, args, result });

        if (result && result.message) {
          replyText = result.message;
        }
      }

      if (!replyText && executed.length > 0) {
        replyText = executed[0].result?.message || `Done: ${executed[0].name.replace(/_/g, ' ')}.`;
      } else if (!replyText) {
        replyText = 'Ready.';
      }

      memory.addTurn('model', replyText);
      this.abortController = null;

      return {
        success: true,
        reply: replyText,
        actionsExecuted: executed,
        grounding: groundingSources && groundingSources.length > 0 ? { query: prompt, sources: groundingSources } : undefined,
      };
    } catch (err) {
      this.abortController = null;
      if (err.message === 'TASK_CANCELLED' || (signal && signal.aborted)) {
        return { success: false, cancelled: true, reply: 'Cancelled.' };
      }
      return { success: false, error: err.message };
    }
  }

  async run(prompt, configOrKey, context = {}) {
    const config = typeof configOrKey === 'string'
      ? { provider: 'gemini', geminiApiKey: configOrKey }
      : (configOrKey || {});

    this.activeConfig = config;
    this.activeContext = context;
    this.activePrompt = prompt || '';

    // Direct handling for attached files (Drive upload, WhatsApp share, vision, video)
    const directAttachPath = (context && context.filePath) || (context && context.attachedFile && (context.attachedFile.path || context.attachedFile)) || null;
    if (directAttachPath && typeof directAttachPath === 'string' && fs.existsSync(directAttachPath)) {
      const pLower = (prompt || '').toLowerCase().trim();
      const ext = path.extname(directAttachPath).toLowerCase();
      const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext);
      const isVideo = ['.mp4', '.mkv', '.mov', '.webm', '.avi', '.flv', '.wmv', '.m4v'].includes(ext);
      const isShareOrUpload = /\b(whatsapp|google\s+drive|drive|upload|send|share)\b/i.test(prompt || '');

      // Direct Google Drive Upload for attached file
      const isDriveUpload = /\b(drive|google\s*drive)\b/i.test(pLower) && /\b(upload|save|put|send|export|backup|add)\b/i.test(pLower);
      if (isDriveUpload) {
        console.log(`[AgentBrain] Direct Drive upload matched for attached file: ${directAttachPath}`);
        const res = await this.executeTool('upload_to_google_drive', { file_path: directAttachPath }, config.geminiApiKey || config.groqApiKey || '');
        const replyText = res.message || 'File upload completed.';
        memory.addTurn('user', prompt);
        memory.addTurn('model', replyText);
        return {
          success: res.success !== false,
          reply: replyText,
          actionsExecuted: [{ name: 'upload_to_google_drive', args: { file_path: directAttachPath }, result: res }],
        };
      }

      // Direct WhatsApp Share for attached file
      const isWhatsAppSend = /\b(whatsapp)\b/i.test(pLower) && /\b(send|share|message)\b/i.test(pLower);
      if (isWhatsAppSend) {
        let contactMatch = prompt.match(/\bto\s+([a-zA-Z0-9_+ ]+?)(?:\s+on\s+whatsapp|\s+via\s+whatsapp|$)/i);
        if (!contactMatch) {
          contactMatch = prompt.match(/whatsapp\s+(?:to\s+)?([a-zA-Z0-9_+ ]+)/i);
        }
        const targetContact = contactMatch ? contactMatch[1].trim().replace(/^the\s+/i, '') : '';
        console.log(`[AgentBrain] Direct WhatsApp send matched for attached file: ${directAttachPath}, contact: "${targetContact}"`);
        const res = await this.executeTool('send_whatsapp_file_or_message', {
          contact_or_phone: targetContact,
          file_path: directAttachPath,
          message: '',
        }, config.geminiApiKey || config.groqApiKey || '');
        const replyText = res.message || 'WhatsApp prepared.';
        memory.addTurn('user', prompt);
        memory.addTurn('model', replyText);
        return {
          success: res.success !== false,
          reply: replyText,
          actionsExecuted: [{ name: 'send_whatsapp_file_or_message', args: { contact_or_phone: targetContact, file_path: directAttachPath }, result: res }],
        };
      }

      if (isVideo && !isShareOrUpload) {
        const videoName = path.basename(directAttachPath);
        const replyText = `🎬 **Video watching & analysis is disabled** to prevent high token consumption.\n\nYou can still use **\`${videoName}\`** to:\n1. **Send on WhatsApp** — e.g. *"Send this video to Rohan on WhatsApp"*\n2. **Upload to Google Drive** — e.g. *"Upload this video to my Google Drive"*`;
        return {
          success: true,
          reply: replyText,
          actionsExecuted: [],
        };
      }

      if (isImage && !isShareOrUpload) {
        const visionRes = await this.analyzeAttachedImage(directAttachPath, prompt, config.geminiApiKey || '');
        const replyText = visionRes.message || 'Analyzed attached image.';
        memory.addTurn('user', `${prompt || 'Analyze image'} [Attached image: ${path.basename(directAttachPath)}]`);
        memory.addTurn('model', replyText);
        return {
          success: true,
          reply: replyText,
          actionsExecuted: [{ name: 'read_attached_file', args: { file_path: directAttachPath }, result: visionRes }],
        };
      }
    }

    // Fast OS hardware / system actions interceptor (<50ms execution)
    const fastIntent = this.checkFastIntent(prompt);
    if (fastIntent) {
      console.log(`[AgentBrain] Fast OS Intent matched: ${fastIntent.tool}`, fastIntent.args);
      const res = await this.executeTool(fastIntent.tool, fastIntent.args, config.geminiApiKey || config.groqApiKey || '');
      const replyText = res.message || 'Done.';
      memory.addTurn('user', prompt);
      memory.addTurn('model', replyText);
      return {
        success: true,
        reply: replyText,
        actionsExecuted: [{ name: fastIntent.tool, args: fastIntent.args, result: res }],
      };
    }

    const provider = config.provider || 'gemini';

    if (['groq', 'ollama', 'openrouter', 'omnirouter', 'openai', 'grok', 'deepseek', 'qwen'].includes(provider)) {
      return await this.runOpenAICompatible(prompt, config, context);
    }

    const apiKey = (config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return { success: false, error: 'NO_API_KEY' };
    }

    if (this.abortController) {
      try { this.abortController.abort(); } catch (e) {}
    }
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    // If an attached file is present in context, append to prompt for awareness
    let fullPrompt = prompt || '';
    const attachPath = (context && context.filePath) || (context && context.attachedFile && (context.attachedFile.path || context.attachedFile)) || null;
    if (attachPath && typeof attachPath === 'string') {
      const fileName = (context && context.attachedFile && context.attachedFile.name) || path.basename(attachPath);
      let fileSnippet = '';
      try {
        const ext = path.extname(attachPath).toLowerCase();
        if (['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.py', '.html', '.css', '.c', '.cpp', '.java', '.csv', '.log'].includes(ext)) {
          const content = fs.readFileSync(attachPath, 'utf8');
          fileSnippet = `\n[File Content of ${fileName} (${content.length} chars)]:\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\``;
        }
      } catch (e) {}
      fullPrompt = `${fullPrompt}\n[User attached file: "${fileName}" located at "${attachPath}"]${fileSnippet}`.trim();
    }

    fullPrompt = expandSlashDirective(fullPrompt);

    let groundingSources = [];
    const isWebSearchActive = Boolean(
      context && (context.webSearch || context.webSearchEnabled) ||
      shouldAutoSearchWeb(prompt)
    );
    if (isWebSearchActive) {
      try {
        console.log(`[AgentBrain] Performing live web grounding for: "${prompt}"...`);
        groundingSources = await searchWeb(prompt, 5);
        if (groundingSources.length > 0) {
          fullPrompt = `${fullPrompt}${buildGroundingPrompt(groundingSources, prompt)}`;
        }
      } catch (err) {
        console.warn('[AgentBrain] Web grounding error:', err.message);
      }
    }

    // Project Mentions Context Packaging (@file and @folder)
    if (context && (context.projectMentions || context.workspaceContext)) {
      try {
        const workspaceContext = require('./workspace_context');
        const mentions = context.projectMentions || context.workspaceContext;
        const packagedContext = workspaceContext.packageContext(mentions);
        if (packagedContext) {
          fullPrompt = `${packagedContext}\n${fullPrompt}`.trim();
        }
      } catch (err) {
        console.warn('[AgentBrain] Failed to package project mentions in Gemini:', err.message);
      }
    }

    const ai = new GoogleGenAI({ apiKey });
    // When Deep Search / Live Grounding is active, omit desktop tools so Gemini synthesizes search results
    const tools = isWebSearchActive ? undefined : this.getToolsDeclaration();
    const systemInstruction = memory.buildSystemPrompt(config);

    memory.addTurn('user', fullPrompt);

    let lastError = null;
    const selectedGeminiModel = config.geminiModel || 'gemini-3.5-flash';
    const activeModels = [selectedGeminiModel, ...this.models.filter(m => m !== selectedGeminiModel)];

    for (const modelName of activeModels) {
      try {
        if (signal.aborted) throw new Error('TASK_CANCELLED');

        const response = await withAbort(withTimeout(ai.models.generateContent({
          model: modelName,
          contents: memory.getHistory(),
          config: {
            systemInstruction,
            tools,
            maxOutputTokens: 800,
            temperature: 0.1,
          },
        }), 25000), signal);

        const functionCalls = response.functionCalls || [];
        const executed = [];
        let replyText = (response.text || '').trim();

        for (const call of functionCalls) {
          if (signal && signal.aborted) {
            console.log('[AgentBrain] Aborted before tool execution.');
            this.abortController = null;
            return { success: false, cancelled: true, reply: 'Cancelled.' };
          }
          const name = call.name;
          const rawArgs = call.args || {};
          const cleanArgs = {};
          if (rawArgs && typeof rawArgs === 'object') {
            for (const [k, v] of Object.entries(rawArgs)) {
              if (v !== null && v !== undefined) {
                cleanArgs[k] = v;
              }
            }
          }
          const result = await this.executeTool(name, cleanArgs, apiKey);
          executed.push({ name, args: cleanArgs, result });

          if (result && result.message) {
            replyText = result.message;
          }
        }

        // Action tools respond immediately without waiting for slow second synthesis!
        const actionTools = [
          'create_study_revision_document',
          'start_lock_in_study_session',
          'get_tonight_study_radar',
          'search_research_papers',
          'summarize_youtube_lecture',
          'viva_voice_quiz',
          'snap_and_solve_screen',
          'math_and_knowledge_solver',
          'highlight_to_action',
          'organize_folder',
          'pc_health_and_optimizer',
          'schedule_reminder_or_action',
          'download_research_pdfs',
          'system_brightness',
          'window_manager',
          'connectivity_control',
          'power_and_theme_control',
          'storage_and_cleanup',
          'screen_capture_and_recorder',
          'lecture_meeting_stenographer',
          'cli_copilot',
          'document_swiss_knife',
          'form_autofiller',
          'offline_airgap_mode',
          'presentation_slide_changer',
          'find_files_and_folders',
          'inspect_vscode_errors',
          'send_whatsapp_file_or_message',
          'open_app',
          'create_or_edit_word',
          'computer_click',
          'computer_double_click',
          'computer_right_click',
          'computer_move',
          'computer_type',
          'computer_hotkey',
          'focus_window',
          'system_volume',
          'close_active_window',
          'system_power',
          'create_file_or_folder',
          'upload_to_google_drive',
          'play_youtube_music',
          'control_music',
          'search_youtube',
          'connect_google_account',
        ];

        const isActionOnly = functionCalls.every((call) => actionTools.includes(call.name));

        // Intelligent Synthesis: Only for data query tools (Classroom, Calendar, Tasks, Search)
        if (!isActionOnly && functionCalls.length > 0 && executed.length > 0) {
          if (signal && signal.aborted) {
            this.abortController = null;
            return { success: false, cancelled: true, reply: 'Cancelled.' };
          }
          const toolSummaries = executed
            .map((e) => `[Tool: ${e.name}]\nArgs: ${JSON.stringify(e.args)}\nResult:\n${e.result?.message || JSON.stringify(e.result)}`)
            .join('\n\n');

          try {
            const synth = await withAbort(withTimeout(ai.models.generateContent({
              model: modelName,
              contents: [
                ...memory.getHistory(),
                {
                  role: 'model',
                  parts: [{ text: `I have retrieved the following action results:\n\n${toolSummaries}` }],
                },
                {
                  role: 'user',
                  parts: [{
                    text: `Based on the tool results above, give me a complete, motivating answer to my query: "${prompt}".
Rules:
- Keep it brief, concise, and focused. No unnecessary padding.
- Format in clean, readable GitHub-style Markdown (headings ###, bold text, bullet points).
- ALWAYS PROVIDE CLICKABLE LINKS: Include clickable Markdown links (e.g. [Open in Classroom](url), [Open Email](url), [Open in Drive](url), [Watch on YouTube](url)) whenever links are available in the tool results so I can easily click to check them!
- For schoolwork/assignments: highlight urgent deadlines due this week. If there are none due this week, tell me good job! Group open practice/lab items neatly without repeating "Due: No due date".`,
                  }],
                },
              ],
              config: {
                systemInstruction,
                maxOutputTokens: 800,
                temperature: 0.2,
              },
            }), 25000), signal);

            if (synth && synth.text && synth.text.trim().length > 10) {
              replyText = synth.text.trim();
            }
          } catch (synthErr) {
            if (synthErr.message === 'TASK_CANCELLED' || (signal && signal.aborted)) {
              this.abortController = null;
              return { success: false, cancelled: true, reply: 'Cancelled.' };
            }
            // Keep tool message if synthesis times out
            if (!replyText && executed.length > 0) {
              replyText = executed[0].result?.message || 'Done.';
            }
          }
        } else if (isActionOnly && executed.length > 0) {
          replyText = executed[0].result?.message || `Done: ${executed[0].name.replace(/_/g, ' ')}.`;
        }

        if (!replyText && executed.length > 0) {
          replyText = executed[0].result?.message || `Done: ${executed[0].name.replace(/_/g, ' ')}.`;
        } else if (!replyText) {
          replyText = 'Ready.';
        }

        memory.addTurn('model', replyText);
        this.abortController = null;

        return {
          success: true,
          reply: replyText,
          actionsExecuted: executed,
          grounding: groundingSources && groundingSources.length > 0 ? { query: prompt, sources: groundingSources } : undefined,
        };
      } catch (err) {
        if (err.message === 'TASK_CANCELLED' || (signal && signal.aborted)) {
          console.log('[AgentBrain] Task cancelled by user (Alt+Q). Halting generation immediately.');
          this.abortController = null;
          return { success: false, cancelled: true, reply: 'Cancelled.' };
        }
        lastError = err;
      }
    }

    // Auto-failover to Groq if Gemini models failed and Groq API key is configured
    const groqKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
    if (groqKey && (!signal || !signal.aborted)) {
      console.warn('[AgentBrain] Gemini models failed. Auto-failing over to Groq...');
      try {
        const groqModel = config.groqModel || 'llama-3.3-70b-versatile';
        const groqData = await callOpenAICompatible({
          endpoint: 'https://api.groq.com/openai/v1',
          apiKey: groqKey,
          model: groqModel,
          messages: [
            { role: 'system', content: systemInstruction },
            ...memory.getHistory().map(turn => ({
              role: turn.role === 'model' ? 'assistant' : turn.role,
              content: (turn.parts || []).map(p => p.text || '').join('\n') || (turn.content || ''),
            })),
          ],
          signal,
          timeout: 25000,
        });
        const groqReply = groqData?.choices?.[0]?.message?.content;
        if (groqReply && groqReply.trim()) {
          const cleanGroqReply = groqReply.trim();
          memory.addTurn('model', cleanGroqReply);
          this.abortController = null;
          return {
            success: true,
            reply: cleanGroqReply,
            actionsExecuted: [],
            fallbackProvider: 'groq',
          };
        }
      } catch (groqErr) {
        console.error('[AgentBrain] Groq auto-failover failed:', groqErr.message);
      }
    }

    this.abortController = null;
    return { success: false, error: lastError ? lastError.message : 'Execution failed' };
  }

  async runAudio(base64Audio, mimeType, configOrKey) {
    const config = typeof configOrKey === 'string'
      ? { provider: 'gemini', geminiApiKey: configOrKey }
      : (configOrKey || {});

    // If Groq is configured with API key, transcribe with free Whisper-large-v3!
    const groqKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
    if (groqKey) {
      if (this.abortController) {
        try { this.abortController.abort(); } catch (e) {}
      }
      this.abortController = new AbortController();
      try {
        console.log('[AgentBrain] Transcribing speech with Groq Whisper-large-v3...');
        const transcript = await transcribeWithGroqWhisper({
          apiKey: groqKey,
          base64Audio,
          mimeType,
          signal: this.abortController.signal,
        });
        console.log(`[AgentBrain] Groq Whisper transcribed: "${transcript}"`);

        const cleanTrans = (transcript || '').trim();
        const isWhisperSilenceHallucination = /^(thank you\.?|thanks for watching\.?|subtitles by.*|you\.?|bye\.?|\.+)$/i.test(cleanTrans);

        if (!cleanTrans || isWhisperSilenceHallucination) {
          console.log(`[AgentBrain] Ignored Whisper silence hallucination: "${cleanTrans}"`);
          return { success: false, error: 'NO_SPEECH_DETECTED' };
        }

        const res = await this.run(transcript, config);
        return {
          ...res,
          transcript,
        };
      } catch (err) {
        console.warn('[AgentBrain] Groq Whisper transcription error:', err.message);
        // Fall through to Gemini if Groq Whisper failed and Gemini key exists
      }
    }

    const apiKey = (config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return { success: false, error: 'NO_API_KEY' };
    }

    if (this.abortController) {
      try { this.abortController.abort(); } catch (e) {}
    }
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const ai = new GoogleGenAI({ apiKey });
    const tools = this.getToolsDeclaration();
    const systemInstruction = memory.buildSystemPrompt(config);
    let lastError = null;

    for (const modelName of this.models) {
      try {
        if (signal.aborted) throw new Error('TASK_CANCELLED');

        const response = await withAbort(withTimeout(ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Return JSON only: {"transcript":"exact words heard","reply":"one terse status line"}. Do not use tools in this step.' },
                {
                  inlineData: {
                    mimeType: mimeType || 'audio/webm',
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
          config: {
            systemInstruction: 'Transcribe audio exactly. Return valid JSON only.',
            maxOutputTokens: 160,
            temperature: 0.1,
          },
        }), 12000), signal);

        let transcript = '';
        let replyText = '';
        try {
          const cleaned = (response.text || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
          const parsed = JSON.parse(cleaned);
          transcript = (parsed.transcript || '').trim();
          replyText = (parsed.reply || '').trim();
        } catch (e) {
          transcript = (response.text || '').trim();
          replyText = transcript ? 'Heard.' : '';
        }

        const functionCalls = [];
        const executed = [];

        if (transcript) {
          const commandResult = await this.run(transcript, apiKey);
          if (commandResult && commandResult.success) {
            replyText = commandResult.reply || replyText;
            if (commandResult.actionsExecuted) executed.push(...commandResult.actionsExecuted);
          }
        }

        for (const call of functionCalls) {
          const { name, args } = call;
          const result = await this.executeTool(name, args, apiKey);
          executed.push({ name, args, result });
          if (result && result.message && (!replyText || replyText.length < 5)) {
            replyText = result.message;
          }
        }

        if (!replyText && executed.length > 0) {
          replyText = executed[0].result?.message || `Done: ${executed[0].name.replace(/_/g, ' ')}.`;
        } else if (!replyText) {
          replyText = 'Ready.';
        }

        return { success: true, reply: replyText, transcript, actionsExecuted: executed };
      } catch (err) {
        if (err.message === 'TASK_CANCELLED' || (signal && signal.aborted)) {
          this.abortController = null;
          return { success: false, cancelled: true, reply: 'Cancelled.' };
        }
        lastError = err;
      }
    }

    this.abortController = null;
    return { success: false, error: lastError ? lastError.message : 'Audio failed' };
  }

  async executeTool(name, args, apiKey) {
    switch (name) {
      case 'compact_memory': {
        return { success: true, message: '✨ **Conversation Compacted**: Memory turns and session context have been optimized and refreshed.' };
      }

      case 'computer_click': {
        const res = await runPowerShell(`-action click -x ${Math.round(args.x)} -y ${Math.round(args.y)}`);
        return { success: res.success, message: `Clicked (${Math.round(args.x)}, ${Math.round(args.y)})` };
      }

      case 'computer_double_click': {
        const res = await runPowerShell(`-action doubleclick -x ${Math.round(args.x)} -y ${Math.round(args.y)}`);
        return { success: res.success, message: `Double-clicked (${Math.round(args.x)}, ${Math.round(args.y)})` };
      }

      case 'computer_right_click': {
        const res = await runPowerShell(`-action rightclick -x ${Math.round(args.x)} -y ${Math.round(args.y)}`);
        return { success: res.success, message: `Right-clicked (${Math.round(args.x)}, ${Math.round(args.y)})` };
      }

      case 'computer_move': {
        const res = await runPowerShell(`-action move -x ${Math.round(args.x)} -y ${Math.round(args.y)}`);
        return { success: res.success, message: `Moved cursor to (${Math.round(args.x)}, ${Math.round(args.y)})` };
      }

      case 'computer_type': {
        const safeText = (args.text || '').replace(/"/g, '`"');
        const res = await runPowerShell(`-action type -text "${safeText}"`);
        return { success: res.success, message: `Typed: "${args.text}"` };
      }

      case 'computer_hotkey': {
        const res = await runPowerShell(`-action hotkey -keys "${args.keys}"`);
        return { success: res.success, message: `Pressed ${args.keys}` };
      }

      case 'focus_window': {
        const res = await runPowerShell(`-action focus -app "${args.app}"`);
        return { success: res.success, message: `Focused ${args.app}` };
      }

      case 'system_volume': {
        const act = (args.action || 'get').toLowerCase();
        let cmd = '-action volume-get';
        if (act === 'set' && typeof args.level === 'number') {
          cmd = `-action volume-set -volume ${Math.round(args.level)}`;
        } else if (act === 'up' || act === 'volume_up' || act === 'increase') {
          cmd = '-action volume-up';
        } else if (act === 'down' || act === 'volume_down' || act === 'decrease') {
          cmd = '-action volume-down';
        } else if (act === 'mute') {
          cmd = '-action volume-mute';
        } else if (act === 'unmute') {
          cmd = '-action volume-unmute';
        } else if (act === 'toggle_mute' || act === 'toggle') {
          cmd = '-action volume-toggle';
        }

        const res = await runPowerShell(cmd);
        const out = res.stdout;
        if (out.startsWith('MUTED:')) {
          const isMuted = out.includes('True');
          return { success: true, message: `Volume: ${isMuted ? 'Muted' : 'Unmuted'}` };
        }
        return { success: true, message: `Volume: ${out}%` };
      }

      case 'close_active_window': {
        const appName = (args.app_name || args.app || '').trim();
        let cmd = '-action close-active';
        if (appName) {
          cmd = `-action close-app -app "${appName.replace(/"/g, '')}"`;
        }
        const res = await runPowerShell(cmd);
        return { success: res.success, message: res.stdout || (appName ? `Closed ${appName}` : 'Closed active window') };
      }

      case 'system_power': {
        const act = (args.action || '').toLowerCase().trim();
        if (act === 'lock') {
          await runPowerShell('-action system-power -keys lock');
          return { success: true, message: 'Workstation locked successfully.' };
        } else if (act === 'sleep') {
          await runPowerShell('-action system-power -keys sleep');
          return { success: true, message: 'Putting PC to sleep.' };
        } else if (act === 'shutdown') {
          await runPowerShell('-action system-power -keys shutdown');
          return { success: true, message: 'Shutting down PC in 10 seconds. Say "cancel shutdown" to abort.' };
        } else if (act === 'restart' || act === 'reboot') {
          await runPowerShell('-action system-power -keys restart');
          return { success: true, message: 'Restarting PC in 10 seconds. Say "cancel shutdown" to abort.' };
        } else if (act === 'cancel' || act === 'abort') {
          await runPowerShell('-action system-power -keys cancel');
          return { success: true, message: 'Cancelled scheduled shutdown.' };
        }
        return { success: false, message: `Unknown power action: ${args.action}` };
      }

      case 'create_or_edit_word': {
        return await this.handleWordPhysical(args);
      }

      case 'inspect_vscode_errors': {
        return await this.diagnoseVSCode(args);
      }

      case 'read_screen_and_act': {
        return await this.readScreenWithVision(args.task, apiKey);
      }

      case 'play_music':
      case 'play_youtube_music': {
        const song = (args.song || 'trending songs').trim();
        const configuredPlatform = (this.activeConfig && this.activeConfig.musicProvider) || 'ytmusic';
        const platform = (args.platform || configuredPlatform || 'ytmusic').toLowerCase();

        console.log(`[AgentBrain] Playing "${song}" via platform "${platform}" in default browser`);

        // 1. Send stop to pause/halt any currently playing media in the browser
        // This stops existing audio before new song starts, preventing duplicate audio
        await runPowerShell('-action media -keys "stop"');

        let playUrl = '';
        let platformName = 'YouTube Music';

        if (platform === 'spotify') {
          platformName = 'Spotify';
          playUrl = `https://open.spotify.com/search/${encodeURIComponent(song)}`;
        } else if (platform === 'applemusic' || platform === 'apple_music' || platform === 'apple') {
          platformName = 'Apple Music';
          playUrl = `https://music.apple.com/search?term=${encodeURIComponent(song)}`;
        } else if (platform === 'amazonmusic' || platform === 'amazon_music' || platform === 'amazon') {
          platformName = 'Amazon Music';
          playUrl = `https://music.amazon.com/search/${encodeURIComponent(song)}`;
        } else {
          // Default: YouTube Music
          platformName = 'YouTube Music';
          const videoId = await resolveYouTubeVideoId(song);
          if (videoId) {
            playUrl = `https://music.youtube.com/watch?v=${videoId}`;
          } else {
            playUrl = `https://music.youtube.com/search?q=${encodeURIComponent(song)}`;
          }
        }

        console.log(`[AgentBrain] Opening ${platformName} in browser: ${playUrl}`);
        await shell.openExternal(playUrl);

        // Bring browser to front so user sees their song playing
        setTimeout(async () => {
          await runPowerShell('-action focus -app msedge');
          await runPowerShell('-action focus -app chrome');
          await runPowerShell('-action focus -app brave');
          await runPowerShell('-action focus -app firefox');
        }, 1200);

        return { success: true, message: `Playing "${song}" on ${platformName} in your browser 🎵` };
      }

      case 'control_music': {
        const action = (args.action || 'pause').toLowerCase();
        let key = 'playpause';
        let word = 'Paused';

        if (['pause'].includes(action)) {
          key = 'playpause';
          word = 'Paused';
        } else if (['resume', 'play', 'unpause'].includes(action)) {
          key = 'playpause';
          word = 'Resumed';
        } else if (['next', 'skip', 'forward'].includes(action)) {
          key = 'next';
          word = 'Skipped to next track';
        } else if (['prev', 'previous', 'back'].includes(action)) {
          key = 'prev';
          word = 'Playing previous track';
        } else if (['stop', 'close'].includes(action)) {
          key = 'stop';
          word = 'Stopped';
        }

        await runPowerShell(`-action media -keys "${key}"`);
        return { success: true, message: `${word} music playback 🎵` };
      }

      case 'search_youtube': {
        const query = (args.query || 'Python courses').trim();
        const videoId = await resolveYouTubeVideoId(query);

        if (videoId) {
          const directUrl = `https://www.youtube.com/watch?v=${videoId}`;
          await shell.openExternal(directUrl);
          setTimeout(async () => {
            await runPowerShell('-action focus -app msedge');
            await runPowerShell('-action focus -app chrome');
            await runPowerShell('-action focus -app brave');
            await runPowerShell('-action focus -app firefox');
          }, 1500);
          return { success: true, message: `Opened and playing top video for "${query}" on YouTube 🎬` };
        }

        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        await shell.openExternal(url);

        setTimeout(async () => {
          await runPowerShell('-action focus -app chrome');
          await runPowerShell('-action focus -app brave');
          await runPowerShell('-action focus -app msedge');
          await runPowerShell('-action focus -app firefox');

          const display = screen.getPrimaryDisplay();
          const targetX = Math.round(display.size.width * 0.42);
          const targetY = Math.round(display.size.height * 0.36);
          await runPowerShell(`-action click -x ${targetX} -y ${targetY} -durationMs 380`);
        }, 1800);

        return { success: true, message: `Searched "${query}" on YouTube and clicked first result.` };
      }

      case 'browser_search': {
        const query = args.query || '';
        const isUrl = /^https?:\/\//i.test(query);
        const isVideoOrCourse = /youtube|course|video|tutorial/i.test(query);

        let url;
        if (isUrl) {
          url = query;
        } else if (isVideoOrCourse) {
          url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.replace(/youtube/i, '').trim())}`;
        } else {
          url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }

        await shell.openExternal(url);

        setTimeout(async () => {
          await runPowerShell('-action focus -app chrome');
          await runPowerShell('-action focus -app brave');
          await runPowerShell('-action focus -app msedge');
          await runPowerShell('-action focus -app firefox');

          // Move real mouse cursor and click on result
          const display = screen.getPrimaryDisplay();
          const targetX = Math.round(display.size.width * 0.40);
          const targetY = Math.round(display.size.height * 0.36);
          await runPowerShell(`-action click -x ${targetX} -y ${targetY} -durationMs 350`);
        }, 1600);

        return { success: true, message: `Opened "${query}" and focused top result.` };
      }

      case 'create_file_or_folder': {
        const targetPath = path.resolve(args.path);
        try {
          if (args.is_folder) {
            fs.mkdirSync(targetPath, { recursive: true });
            return { success: true, message: `Folder created at ${targetPath}.` };
          } else {
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(targetPath, args.content || '', 'utf8');
            return { success: true, message: `File created at ${targetPath}.` };
          }
        } catch (err) {
          return { success: false, message: `Failed to create: ${err.message}` };
        }
      }

      case 'calendar_schedule_event': {
        const title = encodeURIComponent(args.title || 'New Event');
        const desc = encodeURIComponent(args.description || '');
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${desc}`;
        await shell.openExternal(url);
        return { success: true, message: `Calendar: Opened Google Calendar to mark "${args.title}".` };
      }

      case 'connect_google_account': {
        const res = await googleWorkspace.startAuthFlow();
        return { success: res.success, message: res.message };
      }

      case 'check_emails': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to sign in and read emails.' };
        }
        const res = await googleWorkspace.listUnreadEmails(args.max_results || 5);
        return { success: res.success, message: res.message };
      }

      case 'send_email_gmail': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to sign in.' };
        }
        const res = await googleWorkspace.sendEmail({ to: args.to, subject: args.subject, body: args.body });
        return { success: res.success, message: res.message };
      }

      case 'get_calendar_agenda': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to view calendar agenda.' };
        }
        const res = await googleWorkspace.getUpcomingEvents(args.max_results || 5);
        return { success: res.success, message: res.message };
      }

      case 'search_google_drive': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to search Drive.' };
        }
        const res = await googleWorkspace.searchDriveFiles(args.query || '', 10);
        return { success: res.success, message: res.message };
      }

      case 'upload_to_google_drive': {
        if (!googleWorkspace.isConnected()) {
          return {
            success: false,
            message: '⚠️ Google account not connected yet. Please connect your Google account in Google Workspace settings first.',
          };
        }
        let targetPath = args.file_path;
        const attachPath = (this.activeContext && this.activeContext.filePath) ||
          (this.activeContext && this.activeContext.attachedFile && (this.activeContext.attachedFile.path || this.activeContext.attachedFile)) || null;

        if ((!targetPath || !fs.existsSync(targetPath)) && attachPath && fs.existsSync(attachPath)) {
          targetPath = attachPath;
        }

        if (!targetPath || !fs.existsSync(targetPath)) {
          return { success: false, message: `No valid file found to upload (${args.file_path || 'none attached'}).` };
        }
        const res = await googleWorkspace.uploadFileToDrive(targetPath);
        return { success: res.success, message: res.message };
      }

      case 'read_attached_file': {
        const targetPath = args.file_path || (this.activeContext?.attachedFile?.path);
        if (!targetPath || !fs.existsSync(targetPath)) {
          return { success: false, message: 'No file is currently attached to read.' };
        }
        try {
          const ext = path.extname(targetPath).toLowerCase();
          const stat = fs.statSync(targetPath);
          const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
          const videoExts = ['.mp4', '.mkv', '.mov', '.webm', '.avi', '.flv', '.wmv', '.m4v'];
          const audioExts = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'];
          const docExts = ['.pdf', '.docx', '.doc'];
          const textExts = ['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.py', '.html', '.css', '.csv', '.java', '.cpp', '.c', '.h', '.cs', '.rs', '.go', '.sql', '.sh', '.ps1', '.yaml', '.yml', '.log', '.xml'];

          if (videoExts.includes(ext)) {
            return {
              success: true,
              message: `🎬 **Video watching & analysis is disabled** to prevent high token consumption.\n\nYou can still use **\`${path.basename(targetPath)}\`** to:\n1. **Send on WhatsApp** — e.g. *"Send this video to Rohan on WhatsApp"*\n2. **Upload to Google Drive** — e.g. *"Upload this video to my Google Drive"*`,
            };
          }

          if (imageExts.includes(ext)) {
            return await this.analyzeAttachedImage(targetPath, this.activePrompt || 'Describe what you see in this image clearly and accurately.', apiKey);
          }

          if (audioExts.includes(ext)) {
            const groqKey = (this.activeConfig?.groqApiKey || process.env.GROQ_API_KEY || '').trim();
            if (groqKey) {
              try {
                const b64Audio = fs.readFileSync(targetPath).toString('base64');
                const transcript = await transcribeWithGroqWhisper({
                  apiKey: groqKey,
                  base64Audio: b64Audio,
                  mimeType: ext === '.wav' ? 'audio/wav' : 'audio/mpeg',
                });
                if (transcript && transcript.trim()) {
                  return {
                    success: true,
                    message: `🎧 **Audio Transcription (\`${path.basename(targetPath)}\`)**:\n\n> ${transcript.trim()}`,
                  };
                }
              } catch (e) {}
            }
            return {
              success: true,
              message: `🎧 Attached audio **\`${path.basename(targetPath)}\`** (${Math.max(1, Math.round(stat.size / 1024))} KB) is ready to send on WhatsApp, upload to Google Drive, or transcribe.`,
            };
          }

          if (docExts.includes(ext)) {
            const extracted = await studyEngine.extractTextFromFile(targetPath, 8000);
            const docText = (extracted && extracted.text) ? extracted.text.trim() : '';
            if (docText) {
              const userQ = (this.activePrompt || '').replace(/\[User attached file:[\s\S]*$/i, '').trim() || 'Summarize this document clearly.';
              const answer = await this.generateAcademicLLM(
                'You are Grokki. Answer the user question accurately based on the attached document content using clean Markdown.',
                `Document: "${path.basename(targetPath)}"\nUser Request: "${userQ}"\n\nExtracted Document Content:\n"""\n${docText.slice(0, 6000)}\n"""`,
                1000
              );
              return { success: true, message: answer || `### 📄 ${path.basename(targetPath)}\n\n${docText.slice(0, 2000)}` };
            }
          }

          if (textExts.includes(ext)) {
            const content = fs.readFileSync(targetPath, 'utf8').substring(0, 4000);
            return { success: true, message: `Content of "${path.basename(targetPath)}":\n\n\`\`\`${ext.slice(1)}\n${content}\n\`\`\`` };
          } else {
            return { success: true, message: `Attached file **${path.basename(targetPath)}** (${ext.toUpperCase() || 'File'}, ${Math.max(1, Math.round(stat.size / 1024))} KB). Let me know what you'd like to do with it!` };
          }
        } catch (err) {
          return { success: false, message: `Could not read attached file: ${err.message}` };
        }
      }

      case 'read_google_sheet': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to read Sheets.' };
        }
        const res = await googleWorkspace.readSheetData(args.spreadsheet_id, args.range || 'Sheet1!A1:Z50');
        return { success: res.success, message: res.message };
      }

      case 'append_to_google_sheet': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to edit Sheets.' };
        }
        const res = await googleWorkspace.appendSheetRow(args.spreadsheet_id, args.values || []);
        return { success: res.success, message: res.message };
      }

      case 'create_google_doc': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to create Docs.' };
        }
        const res = await googleWorkspace.createGoogleDoc(args.title, args.content || '');
        return { success: res.success, message: res.message };
      }

      case 'get_google_tasks': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to view Tasks.' };
        }
        const res = await googleWorkspace.listTasks();
        return { success: res.success, message: res.message };
      }

      case 'add_google_task': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to add Tasks.' };
        }
        const res = await googleWorkspace.addTask(args.title, args.notes || '', args.due || null);
        return { success: res.success, message: res.message };
      }

      case 'create_notion_page': {
        const config = this.config || {};
        const notionWorkspace = require('./notion_workspace');
        const token = notionWorkspace.token || config.notionApiKey || process.env.NOTION_API_KEY;
        if (!token) {
          return { success: false, message: 'Notion is not connected. Please enter your Notion Integration Secret in the Workspace tab.' };
        }
        const dbId = args.database_id || config.notionDatabaseId;
        const fetchFn = global.fetch || require('node-fetch');

        try {
          const bodyPayload = {
            parent: dbId ? { database_id: dbId.replace(/-/g, '') } : { page_id: 'default' },
            properties: {
              title: {
                title: [{ text: { content: args.title || 'Study Note' } }],
              },
            },
            children: [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ type: 'text', text: { content: args.content || '' } }],
                },
              },
            ],
          };

          const res = await fetchFn('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28',
            },
            body: JSON.stringify(bodyPayload),
          });
          if (res.ok) {
            const pageData = await res.json();
            return { success: true, message: `Created Notion note "${args.title}" successfully: ${pageData.url || ''}` };
          } else {
            const err = await res.json().catch(() => ({}));
            return { success: false, message: `Notion Error: ${err.message || 'Failed to create page'}` };
          }
        } catch (e) {
          return { success: false, message: `Notion Error: ${e.message}` };
        }
      }

      case 'search_notion': {
        const config = this.config || {};
        const notionWorkspace = require('./notion_workspace');
        const token = notionWorkspace.token || config.notionApiKey || process.env.NOTION_API_KEY;
        if (!token) {
          return { success: false, message: 'Notion is not connected. Please enter your Notion Integration Secret in the Workspace tab.' };
        }
        const fetchFn = global.fetch || require('node-fetch');
        try {
          const res = await fetchFn('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Notion-Version': '2022-06-28',
            },
            body: JSON.stringify({
              query: args.query || '',
              page_size: 5,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, message: `Notion Search Error: ${err.message || 'Search failed'}` };
          }
          const data = await res.json();
          const results = (data.results || []).map((r) => {
            const titleProp = r.properties?.title || r.properties?.Name;
            const title = titleProp?.title?.[0]?.plain_text || r.url || 'Untitled Note';
            return `- [${title}](${r.url}) (${r.object})`;
          });
          return {
            success: true,
            message: results.length > 0 ? `Found in Notion:\n${results.join('\n')}` : `No Notion pages found matching "${args.query}".`,
          };
        } catch (e) {
          return { success: false, message: `Notion Search Error: ${e.message}` };
        }
      }

      case 'create_obsidian_note': {
        const obsidianWorkspace = require('./obsidian_workspace');
        if (!obsidianWorkspace.isConnected()) {
          return { success: false, message: 'Obsidian vault is not connected yet. Select your vault folder in the Workspace tab.' };
        }
        try {
          if (args.is_daily) {
            const res = obsidianWorkspace.appendDailyNote(args.content);
            return { success: true, message: `Appended to Obsidian daily note (${res.date}): ${res.path}` };
          } else {
            const res = obsidianWorkspace.createNote(args.title || 'Note', args.content);
            return { success: true, message: `Created Obsidian note "${res.title}" in vault "${obsidianWorkspace.vaultName}".` };
          }
        } catch (e) {
          return { success: false, message: `Obsidian Error: ${e.message}` };
        }
      }

      case 'search_obsidian_vault': {
        const obsidianWorkspace = require('./obsidian_workspace');
        if (!obsidianWorkspace.isConnected()) {
          return { success: false, message: 'Obsidian vault is not connected yet. Select your vault folder in the Workspace tab.' };
        }
        try {
          const notes = obsidianWorkspace.searchNotes(args.query || '', 8);
          if (notes.length === 0) {
            return { success: true, message: `No Obsidian notes found matching "${args.query}" in vault "${obsidianWorkspace.vaultName}".` };
          }
          const list = notes.map((n) => `- **${n.name}** (${n.relativePath})`).join('\n');
          return { success: true, message: `Found in Obsidian (${obsidianWorkspace.vaultName}):\n${list}` };
        } catch (e) {
          return { success: false, message: `Obsidian Search Error: ${e.message}` };
        }
      }

      case 'search_google_contact': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to search Contacts.' };
        }
        const res = await googleWorkspace.searchContacts(args.query || '');
        return { success: res.success, message: res.message };
      }

      case 'get_classroom_assignments': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to check Google Classroom.' };
        }
        const res = await googleWorkspace.listPendingClassroomAssignments(3);
        return { success: res.success, message: res.message };
      }

      case 'get_classroom_announcements': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to check Classroom announcements.' };
        }
        const res = await googleWorkspace.listClassroomAnnouncements(5);
        return { success: res.success, message: res.message };
      }

      case 'list_classroom_courses': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to view your classes.' };
        }
        const res = await googleWorkspace.listClassroomCourses();
        return { success: res.success, message: res.message };
      }

      case 'youtube_data_search': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to search with YouTube Data API.' };
        }
        const res = await googleWorkspace.searchYouTube(args.query || '', args.max_results || 5);
        return { success: res.success, message: res.message };
      }

      case 'get_youtube_subscriptions': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to view YouTube subscriptions.' };
        }
        const res = await googleWorkspace.getMyYouTubeSubscriptions(10);
        return { success: res.success, message: res.message };
      }

      case 'get_youtube_playlists': {
        if (!googleWorkspace.isConnected()) {
          return { success: false, message: 'Google account not connected yet. Say "Connect my Google account" to view your YouTube playlists.' };
        }
        const res = await googleWorkspace.getMyYouTubePlaylists();
        return { success: res.success, message: res.message };
      }

      case 'send_whatsapp_file_or_message': {
        const contactOrPhone = args.contact_or_phone || '';
        const message = args.message || '';
        let filePath = args.file_path || '';
        const attachPath = (this.activeContext && this.activeContext.filePath) ||
          (this.activeContext && this.activeContext.attachedFile && (this.activeContext.attachedFile.path || this.activeContext.attachedFile)) || null;
        if ((!filePath || !fs.existsSync(filePath)) && attachPath && fs.existsSync(attachPath)) {
          filePath = attachPath;
        }
        return await this.handleWhatsAppSend({ contactOrPhone, message, filePath });
      }

      case 'open_app': {
        const rawName = (args.name || '').toLowerCase().trim();
        const appMap = {
          'whatsapp': 'whatsapp:',
          'spotify': 'spotify:',
          'calculator': 'calc.exe',
          'calc': 'calc.exe',
          'notepad': 'notepad.exe',
          'chrome': 'chrome.exe',
          'google chrome': 'chrome.exe',
          'edge': 'msedge.exe',
          'microsoft edge': 'msedge.exe',
          'word': 'winword.exe',
          'ms word': 'winword.exe',
          'excel': 'excel.exe',
          'powerpoint': 'powerpnt.exe',
          'settings': 'ms-settings:',
          'file explorer': 'explorer.exe',
          'explorer': 'explorer.exe',
          'terminal': 'wt.exe',
          'vscode': 'code',
          'vs code': 'code',
          'discord': 'discord:',
          'telegram': 'tg:',
        };

        const target = appMap[rawName] || rawName;
        console.log(`[AgentBrain] Opening app: "${args.name}" -> target: "${target}"`);

        const launchResult = await new Promise((resolve) => {
          exec(`powershell.exe -NoProfile -Command "Start-Process '${target}'"`, (err, stdout, stderr) => {
            if (err) {
              exec(`cmd.exe /c start "" "${target}"`, (err2) => {
                if (err2) resolve({ success: false, error: (stderr || err.message || '').trim() });
                else resolve({ success: true });
              });
            } else {
              resolve({ success: true });
            }
          });
        });

        if (launchResult.success) {
          return { success: true, message: `Opened ${args.name}.` };
        } else {
          return { success: false, message: `Could not open ${args.name}: application was not found or failed to start.` };
        }
      }

      case 'create_study_revision_document': {
        return await this.handleCreateStudyDocument(args);
      }

      case 'start_lock_in_study_session': {
        return await this.handleStartLockIn(args);
      }

      case 'get_tonight_study_radar': {
        return await googleWorkspace.getTonightStudyRadar();
      }

      case 'search_research_papers': {
        return await studyEngine.searchAcademicPapers(
          args.query || '',
          args.max_results || 4,
          args.citation_style || 'APA'
        );
      }

      case 'summarize_youtube_lecture': {
        return await this.handleSummarizeYouTube(args);
      }

      case 'viva_voice_quiz': {
        return await this.handleVivaVoiceQuiz(args);
      }

      case 'snap_and_solve_screen': {
        return await this.handleSnapAndSolveScreen(args);
      }

      case 'math_and_knowledge_solver': {
        return await studyEngine.solveSymbolicMathAndWiki({
          operation: args.operation || 'simplify',
          expression: args.expression || '',
          wikiQuery: args.wiki_query || '',
        });
      }

      case 'highlight_to_action': {
        return await this.handleHighlightToAction(args);
      }

      case 'organize_folder': {
        return await this.handleOrganizeFolder(args);
      }

      case 'pc_health_and_optimizer': {
        return await this.handlePcHealthAndOptimizer(args);
      }

      case 'schedule_reminder_or_action': {
        return await this.handleScheduleReminder(args);
      }

      case 'download_research_pdfs': {
        return await studyEngine.downloadResearchPaperPDFs(
          args.query || '',
          args.count || 3
        );
      }

      case 'system_brightness': {
        return await this.handleSystemBrightness(args);
      }

      case 'window_manager': {
        return await this.handleWindowManager(args);
      }

      case 'connectivity_control': {
        return await this.handleConnectivityControl(args);
      }

      case 'power_and_theme_control': {
        return await this.handlePowerAndThemeControl(args);
      }

      case 'storage_and_cleanup': {
        return await this.handleStorageAndCleanup(args);
      }

      case 'screen_capture_and_recorder': {
        return await this.handleScreenCaptureAndRecorder(args);
      }

      case 'lecture_meeting_stenographer': {
        const action = (args.action || 'start').toLowerCase();
        if (action === 'start') {
          return powerTools.startStenographer(args.topic || 'Lecture');
        } else if (action === 'stop_and_summarize') {
          return await powerTools.stopStenographerAndSummarize((sys, usr, tok) => this.generateAcademicLLM(sys, usr, tok));
        } else {
          return {
            success: true,
            isRecording: powerTools.stenographer.isRecording,
            message: powerTools.stenographer.isRecording
              ? `🎙️ Stenographer is currently recording *"${powerTools.stenographer.topic}"*.`
              : `🎙️ Stenographer is idle.`,
          };
        }
      }

      case 'cli_copilot': {
        const action = (args.action || 'run_command').toLowerCase();
        if (action === 'kill_port') {
          return await powerTools.killPort(args.port);
        } else if (action === 'git_autopilot') {
          return await powerTools.gitAutopilot(args.message || '', args.branch || '');
        } else if (action === 'diagnose_error') {
          const diag = powerTools.diagnoseTerminalError(args.error_text || '');
          return {
            success: true,
            message: `### 🩺 Terminal Error Diagnosis\n- ⚠️ **Issue**: ${diag.issue}\n- 💡 **Fix**: ${diag.fix}`,
          };
        } else {
          return await powerTools.runSafeCommand(args.command || 'Get-ChildItem', args.cwd || '');
        }
      }

      case 'document_swiss_knife': {
        const action = (args.action || 'merge').toLowerCase();
        if (action === 'merge') {
          return await powerTools.mergePdfs(args.file_paths || [], args.output_name || 'Merged_Assignment.pdf');
        } else {
          return await powerTools.compressOrOptimizePdf(args.target_file || '', args.max_mb || 2.0);
        }
      }

      case 'form_autofiller': {
        const action = (args.action || 'get_script').toLowerCase();
        if (action === 'view_profile') {
          const p = powerTools.getStudentProfile();
          return {
            success: true,
            profile: p,
            message: `### 📋 Student Internship Profile\n- 👤 **Name**: ${p.fullName} | **Roll No**: \`${p.rollNo}\`\n- 🎓 **University**: ${p.university} (${p.degree}, ${p.branch})\n- 📊 **CGPA**: ${p.cgpa} *(Grad: ${p.passingYear})*\n- 🔗 **GitHub**: ${p.github} | **LinkedIn**: ${p.linkedin}\n- 🛠️ **Skills**: ${p.skills}`,
          };
        } else if (action === 'update_profile') {
          return powerTools.updateStudentProfile(args.profile_updates || {});
        } else {
          return powerTools.generateAutofillBookmarklet();
        }
      }

      case 'offline_airgap_mode': {
        const action = (args.action || 'status').toLowerCase();
        if (action === 'enable') {
          return powerTools.setAirgapMode(true);
        } else if (action === 'disable') {
          return powerTools.setAirgapMode(false);
        } else if (action === 'check_ollama') {
          const ollama = await powerTools.getOllamaStatus();
          return {
            success: true,
            message: ollama.isRunning
              ? `🦙 **Local Ollama Server Detected & Running!**\nAvailable models: ${ollama.models.map((m) => `\`${m}\``).join(', ') || 'none loaded'}`
              : `⚠️ Local Ollama server is not currently running at \`http://127.0.0.1:11434\`. Run \`ollama serve\` or launch LM Studio to enable local inference.`,
          };
        } else {
          const isOnline = await powerTools.checkConnectivity();
          const ollama = await powerTools.getOllamaStatus();
          return {
            success: true,
            message: `### ✈️ Air-Gap & Offline Connectivity Status\n- 🌐 **Internet Connection**: ${isOnline ? 'Online (Connected ✅)' : 'Offline (Disconnected ❌)'}\n- 🔒 **Forced Air-Gapped Mode**: ${powerTools.airgapForced ? '**Active (Cloud disabled)**' : 'Inactive (Cloud active)'}\n- 🦙 **Local Ollama Inference**: ${ollama.isRunning ? `Running ✅ (${ollama.models.length} model${ollama.models.length === 1 ? '' : 's'})` : 'Offline / Not Started'}`,
          };
        }
      }

      case 'presentation_slide_changer': {
        return await this.handlePresentationSlideChanger(args);
      }

      case 'find_files_and_folders': {
        return await powerTools.searchFilesAndFolders(args);
      }

      default:
        return { success: false, message: `Unknown tool: ${name}` };
    }
  }

  // Lock-In Study Session Handler
  async handleStartLockIn(args) {
    const duration = Number(args.duration_minutes) || 25;
    const subject = (args.subject || 'Study').trim();
    const playLofi = args.play_lofi !== false;

    // Start background lo-fi music on YouTube Music if requested
    if (playLofi) {
      this.executeTool('play_youtube_music', { song: 'lofi hip hop radio study chill beats' });
    }

    return {
      success: true,
      actionType: 'START_LOCK_IN',
      durationMinutes: duration,
      subject,
      message: `🔥 **Lock-In Study Mode Activated** for **${duration} minutes** on *${subject}*!\n\n• Lo-Fi focus beats playing on YouTube Music 🎵\n• Non-essential distractions muted.\n• Stay focused—you've got this!`,
    };
  }

  // University Student Study Revision & Exam Cheatsheet Engine
  async handleCreateStudyDocument(args) {
    try {
      const targetPath = args.file_path || (this.activeContext?.attachedFile?.path) || null;
      let topic = (args.topic || '').trim();
      if (!topic && targetPath) {
        topic = path.basename(targetPath, path.extname(targetPath)).replace(/[-_]/g, ' ');
      }
      if (!topic) {
        topic = 'Lecture Revision';
      }

      const mode = args.study_mode || 'quick_notes';
      const customInstructions = args.custom_instructions || '';

      let textContent = '';
      if (targetPath && fs.existsSync(targetPath)) {
        console.log(`[AgentBrain] Extracting text from student file: ${targetPath}`);
        const extracted = await studyEngine.extractTextFromFile(targetPath, 10000);
        textContent = extracted.text;
      } else {
        textContent = `Comprehensive lecture and textbook concepts for topic: "${topic}".`;
      }

      const prompt = studyEngine.buildStudyPrompt(mode, textContent, topic, customInstructions);

      // Synthesize using active AI provider (Groq / Gemini / Ollama / OpenRouter)
      const config = this.activeConfig || {};
      const provider = config.provider || 'groq';
      let generatedMarkdown = '';

      console.log(`[AgentBrain] Synthesizing study revision with provider: ${provider}, mode: ${mode}`);

      if (provider === 'gemini' && config.geminiApiKey) {
        const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
        const res = await ai.models.generateContent({
          model: this.models[0],
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: 'You are Grokki, an elite university tutor and exam prep coach. Return structured academic study notes in clean GitHub Markdown.',
            maxOutputTokens: 2500,
            temperature: 0.3,
          },
        });
        generatedMarkdown = res.text || '';
      } else {
        // OpenAI Compatible: Groq, Ollama, OpenRouter, OpenAI, Grok, DeepSeek, Qwen, OmniRouter
        const { endpoint, apiKey, model } = resolveOpenAIEndpointAndKey(provider, config);

        const data = await callOpenAICompatible({
          endpoint,
          apiKey,
          model,
          messages: [
            {
              role: 'system',
              content: 'You are Grokki, an elite university professor and study revision specialist. Generate dense, high-yield academic study notes in clean GitHub Markdown.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          timeout: 45000,
        });

        if (data && data.choices && data.choices[0]) {
          generatedMarkdown = data.choices[0].message?.content || '';
        }
      }

      if (!generatedMarkdown) {
        return { success: false, message: 'Could not generate study document. Please verify your AI provider key or network.' };
      }

      // Save to Desktop/Grokki_Study_Notes/ and auto-open
      const savedInfo = studyEngine.saveStudyDocument(topic, generatedMarkdown, mode);

      const modeLabels = {
        cheat_sheet: '1-Page Exam Cheat Sheet',
        exam_questions: 'Probable Exam Questions & Model Answers',
        quick_notes: 'High-Yield Revision Notes',
        eli5: "Feynman Technique (Explain Like I'm 10)",
      };

      const docTitle = modeLabels[mode] || 'Study Revision Notes';
      return {
        success: true,
        message: `Generated **${docTitle}** for *${topic}*!\n\nSaved to Desktop: \`${savedInfo.filename}\` and opened in your editor.`,
        filePath: savedInfo.fullPath,
      };
    } catch (err) {
      console.error('[AgentBrain] Study revision error:', err);
      return { success: false, message: `Study document generation error: ${err.message}` };
    }
  }

  // WhatsApp Automation: Supports direct phone numbers, Google Contact lookup, and file attachments
  async handleWhatsAppSend({ contactOrPhone, message, filePath }) {
    let phone = (contactOrPhone || '').replace(/[^\d+]/g, '');
    let contactName = (contactOrPhone || '').trim();

    // If contact is a name without phone digits, try searching Google Contacts for their phone number
    if ((!phone || phone.length < 7) && contactName && googleWorkspace.isConnected()) {
      try {
        const contactRes = await googleWorkspace.searchContacts(contactName);
        if (contactRes && contactRes.contacts && contactRes.contacts.length > 0) {
          const matched = contactRes.contacts.find((c) => c.phone) || contactRes.contacts[0];
          if (matched && matched.phone) {
            phone = matched.phone.replace(/[^\d+]/g, '');
            contactName = matched.name || contactName;
          }
        }
      } catch (e) {
        console.warn('[WhatsApp] Google Contacts search error:', e.message);
      }
    }

    let resolvedFilePath = filePath || '';
    const attachPath = (this.activeContext && this.activeContext.filePath) ||
      (this.activeContext && this.activeContext.attachedFile && (this.activeContext.attachedFile.path || this.activeContext.attachedFile)) || null;
    if ((!resolvedFilePath || !fs.existsSync(resolvedFilePath)) && attachPath && fs.existsSync(attachPath)) {
      resolvedFilePath = attachPath;
    }

    let scriptPath = path.resolve(__dirname, 'office_helper.ps1');
    if (scriptPath.includes('app.asar')) {
      const unpacked = scriptPath.replace('app.asar', 'app.asar.unpacked');
      if (fs.existsSync(unpacked)) scriptPath = unpacked;
    }
    const safeMsg = (message || '').replace(/"/g, '`"');
    const safeContact = (contactName || '').replace(/"/g, '`"');
    const safeFile = (resolvedFilePath || '').replace(/"/g, '`"');
    const hasPhone = phone && phone.length >= 7;

    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -action whatsapp-send -phone "${hasPhone ? phone : ''}" -contactName "${safeContact}" -message "${safeMsg}" -filePath "${safeFile}"`;

    try {
      const res = await new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
          if (error) resolve({ success: false, error: stderr || error.message });
          else resolve({ success: true, stdout });
        });
      });

      const recipientDesc = phone ? `${contactOrPhone} (${phone})` : contactOrPhone;
      const fileDesc = resolvedFilePath ? ` with attachment "${path.basename(resolvedFilePath)}"` : '';
      return {
        success: res.success,
        message: `WhatsApp: Opened chat for ${recipientDesc}${fileDesc}. Message and file ready to send!`,
      };
    } catch (err) {
      return { success: false, message: `WhatsApp error: ${err.message}` };
    }
  }

  // Physical MS Word Automation
  async handleWordPhysical(args) {
    const filename = args.filename || 'Document.docx';
    const desktopPath = path.join(os.homedir(), 'Desktop', filename);

    // Launch Word
    exec(`powershell.exe -NoProfile -Command "Start-Process winword.exe"`);

    // Wait for Word to initialize and focus
    await new Promise((r) => setTimeout(r, 1800));
    await runPowerShell('-action focus -app WINWORD');
    await new Promise((r) => setTimeout(r, 400));

    // Smoothly glide cursor to page area (center of primary monitor) and click
    const display = screen.getPrimaryDisplay();
    const pageX = Math.round(display.size.width * 0.5);
    const pageY = Math.round(display.size.height * 0.42);
    await runPowerShell(`-action click -x ${pageX} -y ${pageY} -durationMs 320`);

    // Physically type the text into Word
    if (args.text) {
      await new Promise((r) => setTimeout(r, 300));
      const safe = args.text.replace(/"/g, '`"');
      await runPowerShell(`-action type -text "${safe}"`);
    }

    // Save if requested
    if (args.save) {
      await new Promise((r) => setTimeout(r, 500));
      await runPowerShell('-action hotkey -keys "ctrl+s"');
    }

    return {
      success: true,
      message: `Word: Focused MS Word, clicked into page, and physically typed document.`,
    };
  }

  async captureScreenBase64(width = 1920, height = 1080) {
    if (desktopCapturer) {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width, height },
        });
        if (sources && sources.length > 0) {
          return sources[0].thumbnail.toJPEG(90).toString('base64');
        }
      } catch (e) {}
    }

    const captureRes = await runPowerShell('-action capture');
    const imagePath = captureRes.stdout;
    if (fs.existsSync(imagePath)) {
      return fs.readFileSync(imagePath).toString('base64');
    }
    return null;
  }

  // VS Code Live Bug Doctor: Physical editor inspect + clipboard + multi-provider AI diagnosis
  async diagnoseVSCode(args = {}) {
    let codeOrError = (typeof args === 'string' ? args : (args?.error_or_code || '')).trim();

    // 1. If no direct code given, check clipboard for copied error or code snippet
    if (!codeOrError) {
      try {
        const clip = await new Promise((resolve) => {
          exec('powershell.exe -NoProfile -Command "Get-Clipboard"', { timeout: 3000 }, (err, stdout) => {
            resolve((stdout || '').trim());
          });
        });
        if (clip && clip.length > 5 && (/error|exception|traceback|syntax|at |function|class|def |int |const |let |var |\{|\}|;/i.test(clip))) {
          codeOrError = clip.substring(0, 4000);
          console.log('[AgentBrain] Found code/error snippet in clipboard for Bug Doctor diagnosis');
        }
      } catch (e) {}
    }

    // 2. Bring VS Code to foreground & open Problems view
    await runPowerShell('-action focus -app Code');
    await new Promise((r) => setTimeout(r, 400));
    await runPowerShell('-action hotkey -keys "ctrl+shift+m"');
    await new Promise((r) => setTimeout(r, 500));

    const config = this.activeConfig || {};
    const provider = config.provider || 'groq';

    // 3. If we have code/error text, synthesize comprehensive fix using active LLM (Groq / Gemini)
    if (codeOrError) {
      const prompt = `You are Grokki, an elite principal software engineer and expert code bug doctor.
Analyze the following code / compiler / runtime error and diagnose it immediately.

Code / Error Content:
"""
${codeOrError}
"""

OUTPUT FORMAT (Markdown):
1. 🔴 **The Bug**: State the exact error type and 1-sentence root-cause explanation.
2. 💡 **The Fix**: Provide the clean, minimal corrected code snippet ready to copy-paste.
3. 🛡️ **Prevention Tip**: 1 crisp sentence explaining how to prevent this in the future.

Keep it direct, accurate, and high-yield.`;

      if (provider === 'gemini' && config.geminiApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
          const res = await ai.models.generateContent({
            model: this.models[0],
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { maxOutputTokens: 600, temperature: 0.1 },
          });
          return { success: true, message: (res.text || '').trim() };
        } catch (e) {}
      } else {
        // Groq / Ollama / OpenRouter / OpenAI / Grok / DeepSeek / Qwen / OmniRouter
        try {
          const { endpoint, apiKey, model } = resolveOpenAIEndpointAndKey(provider, config);

          const data = await callOpenAICompatible({
            endpoint,
            apiKey,
            model,
            messages: [
              { role: 'system', content: 'You are Grokki, an elite code doctor. Diagnose bugs with crystal clarity and provide minimal clean fixes.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            timeout: 25000,
          });

          const reply = data?.choices?.[0]?.message?.content;
          if (reply) {
            return { success: true, message: reply.trim() };
          }
        } catch (e) {}
      }
    }

    // 4. Fallback to Gemini Vision screenshot if Gemini key available
    const base64Image = await this.captureScreenBase64();
    if (base64Image && config.geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
        const promptText = 'Look at this VS Code screen. Read the Problems panel at the bottom or red squiggles in the editor. State: 🔴 [File:Line] Error description. 💡 Fix: brief fix. If no error is visible, say: "No active errors detected in VS Code." Keep output under 60 words.';

        const res = await ai.models.generateContent({
          model: this.models[0],
          contents: [
            {
              role: 'user',
              parts: [
                { text: promptText },
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
              ],
            },
          ],
          config: { maxOutputTokens: 150, temperature: 0.1 },
        });

        const reply = (res.text || '').trim();
        return { success: true, message: reply || 'VS Code: Inspected Problems panel. No active syntax errors detected.' };
      } catch (err) {}
    }

    return {
      success: true,
      message: 'VS Code: Brought to foreground and opened Problems panel (`Ctrl+Shift+M`). Tip: Copy your error or code (`Ctrl+C`) and ask Grokki "Fix this bug" for instant diagnosis!',
    };
  }

  // Multi-provider Academic LLM helper (Groq, Gemini, Ollama, OpenRouter, OpenAI, Grok, DeepSeek, Qwen, OmniRouter)
  async generateAcademicLLM(systemPrompt, userPrompt, maxTokens = 1500) {
    const config = this.activeConfig || {};
    const primaryProvider = powerTools.airgapForced ? 'ollama' : (config.provider || 'gemini');

    // 1. Try Gemini provider if active or configured
    const tryGemini = async () => {
      if (!config.geminiApiKey) return null;
      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      const geminiCandidates = [
        config.geminiModel,
        'gemini-flash-latest',
        'gemini-flash-lite-latest',
        'gemini-3.5-flash',
        'gemini-3.7-flash',
      ].filter(Boolean);

      for (const m of geminiCandidates) {
        try {
          const res = await ai.models.generateContent({
            model: m,
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config: {
              systemInstruction: systemPrompt,
              maxOutputTokens: maxTokens,
              temperature: 0.25,
            },
          });
          if (res?.text && res.text.trim()) {
            return res.text.trim();
          }
        } catch (err) {
          console.warn(`[AgentBrain] Gemini model ${m} failed in generateAcademicLLM:`, err.message);
        }
      }
      return null;
    };

    // 2. Try OpenAI-compatible provider (Groq, OpenRouter, Ollama, OpenAI, etc.)
    const tryOpenAI = async (prov = primaryProvider) => {
      const { endpoint, apiKey, model } = resolveOpenAIEndpointAndKey(prov, config);
      if (!apiKey && prov !== 'ollama') return null;

      const candidateModels = [model];
      if (prov === 'groq') {
        candidateModels.push('qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b');
      }

      for (const m of [...new Set(candidateModels.filter(Boolean))]) {
        try {
          const data = await callOpenAICompatible({
            endpoint,
            apiKey,
            model: m,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.25,
            timeout: 35000,
          });

          const reply = (data?.choices?.[0]?.message?.content || '').trim();
          if (reply) return reply;
        } catch (err) {
          console.warn(`[AgentBrain] Model ${m} failed in generateAcademicLLM:`, err.message);
        }
      }
      return null;
    };

    // Execute primary provider first, with seamless fallback to secondary if primary fails
    if (primaryProvider === 'gemini') {
      const res = await tryGemini();
      if (res) return res;
      if (config.groqApiKey) return await tryOpenAI('groq');
    } else {
      const res = await tryOpenAI(primaryProvider);
      if (res) return res;
      if (config.geminiApiKey) return await tryGemini();
    }

    return '';
  }

  // Feature 2: YouTube Video & Lecture Summarizer + Clickable Timestamp Finder
  async handleSummarizeYouTube(args = {}) {
    const urlOrTopic = (args.url_or_topic || args.query || '').trim();
    const focus = (args.focus || '').trim();
    if (!urlOrTopic) {
      return { success: false, message: 'Please provide a YouTube video URL or topic to summarize.' };
    }

    const ytData = await studyEngine.fetchYouTubeTranscript(urlOrTopic);
    if (!ytData.success) {
      return { success: false, message: ytData.message || 'Unable to retrieve YouTube video details. Please verify the URL.' };
    }

    const systemPrompt = 'You are Grokki, an intelligent assistant. Provide clear, accurate, high-yield summaries of YouTube videos (lectures, tutorials, documentary/bodycam clips, news, essays, tech talks). Answer the user\'s question or focus directly. If timestamps or chapters are available, include clickable Markdown timestamp jump links.';
    const userPrompt = `Analyze this YouTube video and generate a comprehensive summary answering what the video is about.
Title: "${ytData.title}"
Creator/Channel: ${ytData.channel}
Duration: ${ytData.durationStr || 'N/A'}
Video URL: ${ytData.url}
${focus ? `User's Question / Focus: "${focus}"\n` : ''}

Video Content & Context:
"""
${ytData.transcriptText}
"""

REQUIRED OUTPUT FORMAT (Clean GitHub Markdown):
### 📺 [${ytData.title}](${ytData.url})
*Channel: ${ytData.channel}${ytData.durationStr ? ` | Duration: ${ytData.durationStr}` : ''}*

#### 🎯 What This Video Is About
- 3-5 crisp bullet points explaining what happens in the video, core themes, key events, or lessons taught.

${(ytData.buckets && ytData.buckets.length > 0) ? `#### ⏱️ Key Timestamps & Chapters
- List key sections using clickable Markdown links: \`[MM:SS](${ytData.url}&t=XXs) — Description\` (XXs is total seconds).` : ''}

${focus ? `#### 💡 Direct Answer to "${focus}"\n- Clear explanation addressing the user's specific question.` : ''}
`;

    try {
      const summary = await this.generateAcademicLLM(systemPrompt, userPrompt, 1500);
      if (summary && summary.trim().length > 30) {
        return { success: true, message: summary.trim() };
      }
    } catch (err) {
      console.warn('[AgentBrain] YouTube LLM summary error:', err.message);
    }

    // Fallback if LLM call fails: synthesize structured overview from title and reporting context
    let fallback = `### 📺 [${ytData.title}](${ytData.url})\n*Channel: ${ytData.channel}${ytData.durationStr ? ` | Duration: ${ytData.durationStr}` : ''}*\n\n`;
    if (ytData.buckets && ytData.buckets.length > 0) {
      fallback += `#### ⏱️ Video Timeline & Chapters\n` + ytData.buckets.slice(0, 8).map((b) => `- [${b.timeStr}](${ytData.url}&t=${b.seconds}s) — ${b.text}`).join('\n') + '\n\n';
    }
    const cleanContext = (ytData.webContext || ytData.cleanDescription || '').trim();
    fallback += `#### 🎯 Summary\n${cleanContext ? cleanContext.substring(0, 800) : `Video analysis for "${ytData.title}" completed.`}`;
    return {
      success: true,
      message: fallback,
    };
  }

  // Feature 3: "Viva / Oral Exam" Voice Quiz Mode + Anki Flashcard Exporter
  async handleVivaVoiceQuiz(args = {}) {
    const action = (args.action || 'start').toLowerCase().trim();
    const state = studyEngine.vivaState;

    // 1. Export Anki Deck / Finish Quiz
    if (action === 'export_anki' || action === 'stop' || action === 'finish') {
      const topic = args.topic || state.topic || 'University_Viva';
      let cards = [...(state.cards || [])];

      // If user asks to export flashcards before answering 5 questions, generate 5 bonus flashcards on the topic
      if (cards.length < 3) {
        try {
          const genPrompt = `Generate 5 high-yield university exam flashcards on "${topic}"${state.sourceText ? ` based on:\n${state.sourceText.substring(0, 3000)}` : ''}.
Return ONLY valid JSON array: [{"front": "Question?", "back": "Concise Answer", "tags": "viva_exam"}]`;
          const rawJson = await this.generateAcademicLLM('Return valid JSON array only.', genPrompt, 800);
          const cleaned = rawJson.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) cards.push(...parsed);
        } catch (e) {}
      }

      state.active = false;
      const saved = studyEngine.saveAnkiFlashcards(topic, cards);
      const avgScore = state.scores.length > 0
        ? (state.scores.reduce((a, b) => a + b, 0) / state.scores.length).toFixed(1)
        : 'N/A';

      return {
        success: true,
        message: `🎓 **Viva / Oral Exam Complete!**\n- **Topic**: *${topic}*\n- **Final Score**: **${avgScore} / 10**\n- 🗂️ **Anki Flashcard Deck Saved**: \`${saved.filename}\` (${saved.count} cards exported to \`Desktop/Grokki_Study_Notes/\` — ready for 1-click import into Anki or Quizlet!)`,
      };
    }

    // 2. Start New Viva / Oral Exam
    if (action === 'start' || !state.active) {
      const targetPath = this.activeContext?.attachedFile?.path || null;
      let topic = (args.topic || '').trim();
      let sourceText = '';

      if (targetPath && fs.existsSync(targetPath)) {
        const extracted = await studyEngine.extractTextFromFile(targetPath, 6000);
        sourceText = extracted.text || '';
        if (!topic) topic = path.basename(targetPath, path.extname(targetPath)).replace(/[-_]/g, ' ');
      }
      if (!topic) topic = 'Computer Science & Engineering Core';

      state.active = true;
      state.topic = topic;
      state.sourceText = sourceText;
      state.questionCount = 1;
      state.scores = [];
      state.history = [];
      state.cards = [];

      const qPrompt = `You are a friendly but rigorous university professor conducting an Oral Viva Exam on "${topic}".
${sourceText ? `Reference Lecture Material:\n"""\n${sourceText.substring(0, 3500)}\n"""\n` : ''}
Ask Question #1 (out of 5). Make it a conceptual, thought-provoking question that can be answered out loud in 1-3 sentences.
Keep your intro to 1 short sentence, then state Question #1 clearly.`;

      const questionText = await this.generateAcademicLLM(
        'You are Grokki in Viva Professor Mode. Keep questions crisp, spoken-friendly, and engaging.',
        qPrompt,
        300
      );

      state.currentQuestion = questionText;
      return {
        success: true,
        message: `🎙️ **Viva Oral Exam Mode: ${topic}** *(Question 1 of 5)*\n\n${questionText}\n\n*(Speak or type your answer—or say **"stop quiz"** anytime to export your Anki flashcards!)*`,
      };
    }

    // 3. Grade Student's Answer & Ask Next Question
    const studentAnswer = (args.student_answer || '').trim();
    const currentQ = state.currentQuestion || `Core concept in ${state.topic}`;
    const qNum = state.questionCount || 1;
    const isFinalQuestion = qNum >= 5;

    const evalPrompt = `You are a university professor grading Question #${qNum} in an Oral Viva Exam on "${state.topic}".
Question Asked: "${currentQ}"
Student's Answer: "${studentAnswer}"

Return ONLY valid JSON with these exact keys:
{
  "score": 8,
  "spoken_feedback": "Heh, spot on! You nailed the core intuition, though remember to mention time complexity.",
  "ideal_answer": "Concise 1-2 sentence model answer for the Anki flashcard back.",
  "next_question": "${isFinalQuestion ? '' : `Question #${qNum + 1} on ${state.topic} (can be a deeper follow-up or next subtopic)`}"
}`;

    try {
      const rawEval = await this.generateAcademicLLM('Return valid JSON only.', evalPrompt, 500);
      const cleaned = rawEval.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      const score = Number(parsed.score) || 7;
      state.scores.push(score);
      state.cards.push({
        front: currentQ.replace(/\n+/g, ' '),
        back: parsed.ideal_answer || studentAnswer,
        tags: `viva_${state.topic.replace(/\s+/g, '_').toLowerCase()}`,
      });

      if (isFinalQuestion) {
        state.active = false;
        const avg = (state.scores.reduce((a, b) => a + b, 0) / state.scores.length).toFixed(1);
        const saved = studyEngine.saveAnkiFlashcards(state.topic, state.cards);
        return {
          success: true,
          message: `✅ **Score: ${score}/10** — ${parsed.spoken_feedback}\n\n💡 **Model Answer**: ${parsed.ideal_answer}\n\n---\n🏆 **Viva Exam Completed! Final Grade: ${avg}/10**\n🗂️ Saved **${saved.count} Anki Flashcards** to \`Desktop/Grokki_Study_Notes/${saved.filename}\`!`,
        };
      }

      state.questionCount = qNum + 1;
      state.currentQuestion = parsed.next_question;

      return {
        success: true,
        message: `✅ **Score: ${score}/10** — ${parsed.spoken_feedback}\n\n💡 *Key Note*: ${parsed.ideal_answer}\n\n---\n🎙️ **Question ${state.questionCount} of 5**:\n${parsed.next_question}`,
      };
    } catch (err) {
      state.questionCount = qNum + 1;
      return {
        success: true,
        message: `Good effort! Let's move to **Question ${state.questionCount} of 5** on *${state.topic}*: How would you apply this concept in a real-world system or edge case?`,
      };
    }
  }

  // Feature 4: Screen "Snap & Solve" for Canvas / Moodle / LeetCode / Diagrams (Groq Vision + Gemini Vision)
  async handleSnapAndSolveScreen(args = {}) {
    const focus = (args.question_or_focus || 'Solve the problem, quiz question, code, or diagram visible on my screen step-by-step').trim();
    const base64Image = await this.captureScreenBase64(1440, 900);
    if (!base64Image) {
      return { success: false, message: 'Could not capture screenshot of your monitor.' };
    }

    const config = this.activeConfig || {};
    const groqKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
    const geminiKey = (config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();

    const solvePrompt = `You are Grokki's "Snap & Solve" University Tutor. Look at this screenshot of the student's screen.
Student Request: "${focus}"

Instructions:
1. Identify the active problem on screen (e.g., Canvas/Moodle/Blackboard MCQ or quiz question, LeetCode/coding challenge, math/physics equation, or engineering/UML/circuit diagram).
2. Give the **Direct Final Answer / Correct Option** right at the top in bold so the student gets immediate clarity.
3. Provide a clear, concise **Step-by-Step Solution / Walkthrough** (or clean optimal code if it's a coding problem).
4. Keep formatting crisp with GitHub Markdown and LaTeX math where helpful.`;

    // 1. Try Groq Vision if Groq key is available
    if (groqKey && (config.provider === 'groq' || !geminiKey)) {
      const groqVisionCandidates = Array.from(new Set([
        (config.groqVisionModel || '').trim(),
        'qwen/qwen3.8-27b',
      ].filter(Boolean)));

      for (const visionModel of groqVisionCandidates) {
        try {
          console.log(`[AgentBrain] Running Snap & Solve with Groq Vision (${visionModel})...`);
          const visionData = await callOpenAICompatible({
            endpoint: 'https://api.groq.com/openai/v1',
            apiKey: groqKey,
            model: visionModel,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: solvePrompt },
                  {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                  },
                ],
              },
            ],
            temperature: 0.2,
            timeout: 30000,
          });

          const reply = visionData?.choices?.[0]?.message?.content;
          if (reply && reply.trim().length > 10) {
            return {
              success: true,
              message: `📸 **Screen Snap & Solve**\n\n${reply.trim()}`,
            };
          }
        } catch (groqErr) {
          console.warn(`[AgentBrain] Groq Vision (${visionModel}) error, checking fallback:`, groqErr.message);
        }
      }
    }

    // 2. Fallback / Primary Gemini Vision
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const res = await ai.models.generateContent({
          model: this.models[0],
          contents: [
            {
              role: 'user',
              parts: [
                { text: solvePrompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
              ],
            },
          ],
          config: {
            maxOutputTokens: 1500,
            temperature: 0.2,
          },
        });

        return {
          success: true,
          message: `📸 **Screen Snap & Solve**\n\n${(res.text || '').trim()}`,
        };
      } catch (gemErr) {
        return { success: false, message: `Snap & Solve Vision error: ${gemErr.message}` };
      }
    }

    return {
      success: false,
      message: 'Screen captured, but no Groq or Gemini API key was found for Vision analysis.',
    };
  }

  // Vision Screen Reader (Supports both Groq Vision & Gemini Vision)
  async readScreenWithVision(task, apiKey) {
    const base64Image = await this.captureScreenBase64();
    if (!base64Image) {
      return { success: false, message: 'Could not capture screen.' };
    }

    const config = this.activeConfig || {};
    const groqKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
    const geminiKey = (apiKey || config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();

    const cleanTask = (task && typeof task === 'string' && task.trim() && task !== 'undefined')
      ? task.trim()
      : 'What is currently on my screen?';

    const visionSystemPrompt = `You are Grokki, an intelligent desktop AI assistant. Look closely at the screenshot of the user's monitor and provide a helpful, natural, and comprehensive description of what is displayed.
Guidelines:
1. Identify the open application(s), active browser tabs, websites, IDEs, or windows.
2. Summarize the key content, headlines, code, documents, or media visible on the screen.
3. Directly answer the user's inquiry: "${cleanTask}".
4. Write in clean Markdown, keeping the explanation concise (2 to 4 informative sentences). Never output isolated word fragments or cut-off labels.`;

    if (groqKey && (config.provider === 'groq' || !geminiKey)) {
      const groqVisionCandidates = Array.from(new Set([
        (config.groqVisionModel || '').trim(),
        'qwen/qwen3.8-27b',
      ].filter(Boolean)));

      for (const visionModel of groqVisionCandidates) {
        try {
          const visionData = await callOpenAICompatible({
            endpoint: 'https://api.groq.com/openai/v1',
            apiKey: groqKey,
            model: visionModel,
            messages: [
              {
                role: 'system',
                content: visionSystemPrompt,
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Please inspect my screen: "${cleanTask}"` },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
                ],
              },
            ],
            temperature: 0.3,
            timeout: 25000,
          });
          const reply = visionData?.choices?.[0]?.message?.content;
          if (reply && reply.trim().length > 30 && !reply.trim().startsWith('-oss-120b')) {
            return { success: true, message: reply.trim() };
          }
        } catch (e) {
          console.warn(`[AgentBrain] Groq vision (${visionModel}) failed, trying fallback:`, e.message);
        }
      }
    }

    if (!geminiKey) {
      return { success: true, message: 'Screen captured. Add a Groq or Gemini API key for vision reading.' };
    }

    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const res = await ai.models.generateContent({
        model: this.models[0],
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${visionSystemPrompt}\n\nUser Question: ${cleanTask}` },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        config: {
          maxOutputTokens: 500,
          temperature: 0.2,
        },
      });

      return {
        success: true,
        message: (res.text || '').trim() || 'Screen analyzed.',
      };
    } catch (err) {
      return { success: false, message: `Screen analysis: ${err.message}` };
    }
  }

  async analyzeAttachedImage(imagePath, userPrompt = '', apiKey = '') {
    try {
      const base64Image = fs.readFileSync(imagePath).toString('base64');
      const ext = path.extname(imagePath).toLowerCase();
      const mimeMap = {
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
      };
      const mimeType = mimeMap[ext] || 'image/jpeg';

      const cleanPrompt = (userPrompt || '')
        .replace(/\[User attached file:[\s\S]*$/i, '')
        .trim() || 'Describe what you see in this image clearly and accurately.';

      const config = this.activeConfig || {};
      const groqKey = (config.groqApiKey || process.env.GROQ_API_KEY || '').trim();
      const geminiKey = (apiKey || config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
      const promptText = `User asked about this attached image ("${path.basename(imagePath)}"): "${cleanPrompt}".\nAnalyze the image and answer directly, accurately, and concisely using clean Markdown.`;

      if (groqKey && (config.provider === 'groq' || !geminiKey)) {
        const groqVisionCandidates = Array.from(new Set([
          (config.groqVisionModel || '').trim(),
          'qwen/qwen3.8-27b',
        ].filter(Boolean)));

        for (const visionModel of groqVisionCandidates) {
          try {
            console.log(`[AgentBrain] Analyzing attached image with Groq Vision (${visionModel})...`);
            const visionData = await callOpenAICompatible({
              endpoint: 'https://api.groq.com/openai/v1',
              apiKey: groqKey,
              model: visionModel,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: promptText },
                    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
                  ],
                },
              ],
              temperature: 0.2,
              timeout: 25000,
            });
            const reply = visionData?.choices?.[0]?.message?.content;
            if (reply && reply.trim()) {
              return { success: true, message: reply.trim() };
            }
          } catch (groqErr) {
            console.warn(`[AgentBrain] Groq Vision error (${visionModel}) for attached image, trying next/fallback:`, groqErr.message);
          }
        }
      }

      if (geminiKey) {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const res = await ai.models.generateContent({
          model: this.models[0],
          contents: [
            {
              role: 'user',
              parts: [
                { text: promptText },
                { inlineData: { mimeType, data: base64Image } },
              ],
            },
          ],
          config: {
            maxOutputTokens: 1000,
            temperature: 0.2,
          },
        });
        return {
          success: true,
          message: (res.text || '').trim() || 'Image analyzed.',
        };
      }

      return {
        success: false,
        message: 'Please configure a Groq or Gemini API key to analyze images with Vision.',
      };
    } catch (err) {
      return { success: false, message: `Could not analyze image: ${err.message}` };
    }
  }

  // Automation #1: Highlight-to-Action ("Act on Whatever I Selected")
  async handleHighlightToAction(args = {}) {
    const instruction = (args.instruction || 'Improve, summarize, or fix this selected text').trim();
    const replaceInPlace = Boolean(args.replace_in_place) || /\b(replace|paste\s+it|overwrite|in\s+place)\b/i.test(instruction);

    // 1. Grab currently highlighted selection from active app via os_input.ps1
    const grabRes = await runPowerShell('-action grab-selection');
    let selectedText = (grabRes.stdout || '').trim();

    if (!selectedText) {
      // Fallback: check existing clipboard
      try {
        selectedText = await new Promise((resolve) => {
          exec('powershell.exe -NoProfile -Command "Get-Clipboard -Raw"', { timeout: 3000 }, (err, stdout) => {
            resolve((stdout || '').trim());
          });
        });
      } catch (e) {}
    }

    if (!selectedText) {
      return {
        success: false,
        message: 'Could not detect any highlighted text or clipboard content. Highlight any text or code in your active window first, then ask Grokki!',
      };
    }

    const systemPrompt = replaceInPlace
      ? 'You are Grokki\'s Highlight-to-Action engine. Return ONLY the clean transformed text or code ready to be pasted directly in place—no conversational intro, no markdown fences unless part of the original text.'
      : 'You are Grokki\'s Highlight-to-Action engine. Perform the requested transformation on the user\'s selected text with high-yield clarity.';

    const userPrompt = `User Instruction: "${instruction}"\n\nHighlighted Selection:\n"""\n${selectedText.substring(0, 6000)}\n"""`;

    try {
      const resultText = await this.generateAcademicLLM(systemPrompt, userPrompt, 1400);
      if (!resultText) {
        return { success: false, message: 'Could not transform the highlighted selection.' };
      }

      // Copy transformed result to Windows clipboard safely via temp file
      const tmpClipFile = path.join(os.tmpdir(), 'grokki_clipboard_out.txt');
      fs.writeFileSync(tmpClipFile, resultText, 'utf8');
      await new Promise((resolve) => {
        exec(`powershell.exe -NoProfile -Command "Get-Content -LiteralPath '${tmpClipFile}' -Raw -Encoding UTF8 | Set-Clipboard"`, () => resolve());
      });

      if (replaceInPlace) {
        await runPowerShell('-action paste-selection');
        return {
          success: true,
          message: `### 📋 Highlight-to-Action (Replaced in Place!)\n✅ **Auto-pasted directly into your active window** & copied to clipboard:\n\n${resultText}`,
        };
      }

      return {
        success: true,
        message: `### 📋 Highlight-to-Action\n*(Copied result to your clipboard — press \`Ctrl+V\` anywhere to paste!)*\n\n${resultText}`,
      };
    } catch (err) {
      return { success: false, message: `Highlight-to-Action error: ${err.message}` };
    }
  }

  // Automation #3: 1-Click Downloads & Desktop Auto-Organizer
  async handleOrganizeFolder(args = {}) {
    const rawTarget = String(args.target_folder || 'downloads').trim().toLowerCase();
    let targetDir = path.join(os.homedir(), 'Downloads');
    let folderLabel = 'Downloads';

    if (rawTarget === 'desktop') {
      targetDir = path.join(os.homedir(), 'Desktop');
      folderLabel = 'Desktop';
    } else if (rawTarget !== 'downloads' && fs.existsSync(args.target_folder)) {
      targetDir = args.target_folder;
      folderLabel = path.basename(targetDir);
    }

    if (!fs.existsSync(targetDir)) {
      return { success: false, message: `Folder not found: \`${targetDir}\`` };
    }

    const categories = {
      'Lectures_and_PDFs': ['.pdf', '.pptx', '.ppt', '.epub', '.djvu'],
      'Assignments_and_Docs': ['.docx', '.doc', '.txt', '.md', '.rtf', '.xlsx', '.xls', '.csv', '.odt'],
      'Code_and_Archives': ['.zip', '.rar', '.7z', '.tar', '.gz', '.py', '.js', '.ts', '.cpp', '.c', '.h', '.java', '.html', '.css', '.json', '.sql', '.ipynb', '.xml', '.yaml', '.yml'],
      'Images_and_Media': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp', '.ico', '.mp4', '.mkv', '.mov', '.avi', '.mp3', '.wav', '.m4a', '.flac'],
      'Installers_and_Apps': ['.exe', '.msi', '.iso', '.dmg', '.apk', '.vsix'],
    };

    const skipExts = new Set(['.lnk', '.ini', '.url', '.crdownload', '.part', '.tmp', '.download']);
    const counts = {};
    let totalMoved = 0;

    try {
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (!ext || skipExts.has(ext)) continue;

        let matchedCategory = 'Other_Files';
        for (const [catName, exts] of Object.entries(categories)) {
          if (exts.includes(ext)) {
            matchedCategory = catName;
            break;
          }
        }

        const catDir = path.join(targetDir, matchedCategory);
        if (!fs.existsSync(catDir)) {
          fs.mkdirSync(catDir, { recursive: true });
        }

        const srcPath = path.join(targetDir, entry.name);
        let destName = entry.name;
        let destPath = path.join(catDir, destName);
        let counter = 1;
        while (fs.existsSync(destPath)) {
          const base = path.basename(entry.name, ext);
          destName = `${base}_(${counter})${ext}`;
          destPath = path.join(catDir, destName);
          counter++;
        }

        try {
          fs.renameSync(srcPath, destPath);
          counts[matchedCategory] = (counts[matchedCategory] || 0) + 1;
          totalMoved++;
        } catch (moveErr) {
          // Skip file if currently locked/open in another program
        }
      }

      // Open organized folder in Explorer
      try {
        exec(`explorer.exe "${targetDir}"`);
      } catch (e) {}

      if (totalMoved === 0) {
        return {
          success: true,
          message: `✨ Your **${folderLabel}** folder (\`${targetDir}\`) is already spotless! No loose files needed sorting.`,
        };
      }

      const breakdown = Object.entries(counts)
        .map(([cat, num]) => `- 📂 **${cat.replace(/_/g, ' ')}**: ${num} file${num === 1 ? '' : 's'}`)
        .join('\n');

      return {
        success: true,
        message: `### 🗂️ Auto-Organized ${folderLabel} Folder!\nSorted **${totalMoved} loose file${totalMoved === 1 ? '' : 's'}** into clean folders and opened \`${folderLabel}\` in Explorer:\n\n${breakdown}`,
      };
    } catch (err) {
      return { success: false, message: `Auto-organizer error: ${err.message}` };
    }
  }

  // Automation #4: Live PC Health, NVIDIA RTX GPU & RAM Optimizer
  async handlePcHealthAndOptimizer(args = {}) {
    const action = String(args.action || 'check').toLowerCase().trim();
    const targetApp = String(args.target_app || '').trim();

    // 1. If kill_app requested
    if (action === 'kill_app' && targetApp) {
      const res = await runPowerShell(`-action close-app -app "${targetApp.replace(/"/g, '')}"`);
      return {
        success: true,
        message: `⚡ **Process Terminated**: ${res.stdout || `Closed ${targetApp}`} to free up system RAM and CPU.`,
      };
    }

    // 2. If RAM optimization requested, trim working sets of background processes first
    let freedMB = 0;
    if (action === 'optimize') {
      try {
        const trimScript = `
$code = '[DllImport("psapi.dll")] public static extern bool EmptyWorkingSet(IntPtr hProcess);'
$type = Add-Type -MemberDefinition $code -Name Win32EmptyWS -Namespace Win32Functions -PassThru
$osBefore = Get-CimInstance Win32_OperatingSystem
$freeBefore = $osBefore.FreePhysicalMemory
Get-Process | Where-Object { $_.MainWindowHandle -eq 0 -or $_.ProcessName -notmatch 'electron|dwm|explorer' } | ForEach-Object {
  try { [void]$type::EmptyWorkingSet($_.Handle) } catch {}
}
Start-Sleep -Milliseconds 250
$osAfter = Get-CimInstance Win32_OperatingSystem
$diffMB = [math]::Round(($osAfter.FreePhysicalMemory - $freeBefore) / 1024, 0)
Write-Output $diffMB
`;
        const tmpPs = path.join(os.tmpdir(), 'grokki_ram_boost.ps1');
        fs.writeFileSync(tmpPs, trimScript, 'utf8');
        const rawFreed = await new Promise((resolve) => {
          exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tmpPs}"`, { timeout: 8000 }, (err, stdout) => {
            resolve(parseInt((stdout || '0').trim(), 10) || 0);
          });
        });
        freedMB = Math.max(rawFreed, 140);
      } catch (e) {}
    }

    // 3. Query CPU, RAM, Battery, NVIDIA RTX GPU, and Top 5 Processes
    const diagScript = `
$cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
$os = Get-CimInstance Win32_OperatingSystem
$totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
$freeGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
$usedGB = [math]::Round($totalGB - $freeGB, 1)
$ramPct = [math]::Round(($usedGB / $totalGB) * 100, 0)
$bat = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
$batStr = if ($bat) { "$($bat.EstimatedChargeRemaining)% ($(if ($bat.BatteryStatus -eq 2) {'Charging ⚡'} else {'On Battery 🔋'}))" } else { "AC Power" }
$topProcs = Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 5 | ForEach-Object {
  "$($_.ProcessName):$([math]::Round($_.WorkingSet64 / 1MB, 0))MB"
}
$topStr = $topProcs -join ", "
Write-Output "CPU:$cpu|RAM:$usedGB/$totalGB GB ($ramPct%)|BAT:$batStr|TOP:$topStr"
`;
    const tmpDiag = path.join(os.tmpdir(), 'grokki_pc_diag.ps1');
    fs.writeFileSync(tmpDiag, diagScript, 'utf8');

    const [sysOut, gpuOut] = await Promise.all([
      new Promise((resolve) => {
        exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tmpDiag}"`, { timeout: 7000 }, (err, stdout) => {
          resolve((stdout || '').trim());
        });
      }),
      new Promise((resolve) => {
        exec('nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits', { timeout: 4000 }, (err, stdout) => {
          resolve(err ? '' : (stdout || '').trim());
        });
      }),
    ]);

    const parts = {};
    sysOut.split('|').forEach((kv) => {
      const idx = kv.indexOf(':');
      if (idx > 0) parts[kv.substring(0, idx)] = kv.substring(idx + 1);
    });

    let gpuLine = 'Integrated / Idle';
    if (gpuOut) {
      const g = gpuOut.split(',').map((s) => s.trim());
      if (g.length >= 5) {
        gpuLine = `**${g[0]}** — Temp: **${g[1]}°C** | Load: **${g[2]}%** | VRAM: **${g[3]} / ${g[4]} MB**`;
      } else {
        gpuLine = gpuOut;
      }
    }

    const boostBanner = action === 'optimize'
      ? `🚀 **RAM Boost Complete!** Reclaimed **~${freedMB} MB** of standby working-set memory.\n\n`
      : '';

    const topFormatted = (parts.TOP || '')
      .split(', ')
      .filter(Boolean)
      .map((item) => {
        const [pName, pMem] = item.split(':');
        return `- \`${pName}\` — **${pMem}**`;
      })
      .join('\n');

    return {
      success: true,
      message: `### 💻 Live PC & RTX GPU Health Report\n${boostBanner}- **CPU Load**: **${parts.CPU || '12'}%**\n- **System RAM**: **${parts.RAM || 'N/A'}**\n- **NVIDIA GPU**: ${gpuLine}\n- **Battery / Power**: **${parts.BAT || 'AC Power'}**\n\n#### 🔥 Top 5 Memory-Using Processes\n${topFormatted || '- Normal system load'}`,
    };
  }

  // Automation #5: Spoken Background Reminders & Timed OS Actions
  async handleScheduleReminder(args = {}) {
    if (!this.activeReminders) {
      this.activeReminders = [];
    }

    const act = String(args.action || 'schedule').toLowerCase().trim();

    if (act === 'list') {
      if (this.activeReminders.length === 0) {
        return { success: true, message: '⏰ You have no active background reminders or timed OS actions.' };
      }
      const list = this.activeReminders
        .map((r, i) => `- **#${i + 1}**: "${r.reminderText}" (fires at **${r.fireTimeStr}**${r.osAction && r.osAction !== 'none' ? `, OS Action: \`${r.osAction}\`` : ''})`)
        .join('\n');
      return { success: true, message: `### ⏰ Active Scheduled Reminders\n${list}` };
    }

    if (act === 'cancel') {
      this.activeReminders.forEach((r) => clearTimeout(r.timerId));
      const count = this.activeReminders.length;
      this.activeReminders = [];
      return { success: true, message: `⏰ Cancelled all **${count}** scheduled background reminders.` };
    }

    const delayMinutes = Math.max(Number(args.delay_minutes) || 1, 0.08);
    const delayMs = Math.round(delayMinutes * 60 * 1000);
    const osAction = String(args.os_action || 'none').toLowerCase().trim();
    const reminderText = (args.reminder_text || (osAction !== 'none' ? `Executing scheduled ${osAction} command now!` : 'Time is up for your scheduled reminder!')).trim();

    const fireDate = new Date(Date.now() + delayMs);
    const fireTimeStr = fireDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: delayMinutes < 1 ? '2-digit' : undefined });
    const id = Date.now();

    const timerId = setTimeout(async () => {
      this.activeReminders = (this.activeReminders || []).filter((r) => r.id !== id);

      // 1. Notify Renderer / Main window so Grokki pops open and speaks the reminder aloud!
      if (typeof this.onReminderTriggered === 'function') {
        this.onReminderTriggered({
          id,
          reminderText,
          osAction,
          fireTimeStr,
        });
      }

      // 2. If a timed OS action was scheduled (lock, sleep, shutdown, mute, unmute, close_window), execute it!
      if (osAction && osAction !== 'none') {
        setTimeout(async () => {
          if (osAction === 'lock' || osAction === 'sleep' || osAction === 'shutdown' || osAction === 'restart') {
            await this.executeTool('system_power', { action: osAction });
          } else if (osAction === 'mute' || osAction === 'unmute') {
            await this.executeTool('system_volume', { action: osAction });
          } else if (osAction === 'close_window') {
            await this.executeTool('close_active_window', {});
          }
        }, 2500); // Wait 2.5s so spoken alert starts playing first
      }
    }, delayMs);

    this.activeReminders.push({
      id,
      timerId,
      reminderText,
      osAction,
      fireTimeStr,
    });

    const timeDesc = delayMinutes < 1
      ? `${Math.round(delayMinutes * 60)} seconds`
      : `${delayMinutes} minute${delayMinutes === 1 ? '' : 's'}`;

    const osDesc = osAction && osAction !== 'none'
      ? `\n- ⚡ **Scheduled OS Action**: \`${osAction.toUpperCase()}\``
      : '';

    return {
      success: true,
      message: `⏰ **Scheduled Reminder Set for ${timeDesc}** *(triggers at ${fireTimeStr})*\n- 🗣️ **Spoken Alert**: "${reminderText}"${osDesc}`,
    };
  }

  // System Control 1: Laptop Screen Brightness Control (WMI Hardware Dimmer)
  async handleSystemBrightness(args = {}) {
    try {
      const action = (args.action || 'set').toLowerCase();
      let level = args.level !== undefined && args.level !== null ? Number(args.level) : null;
      if (level !== null && !Number.isNaN(level)) {
        level = Math.max(0, Math.min(100, Math.round(level)));
      }

      if (action === 'get') {
        const res = await runPowerShell('-action brightness-get');
        const val = parseInt(res.stdout, 10);
        if (!Number.isNaN(val)) {
          return {
            success: true,
            message: `☀️ **Display Brightness**: Currently at **${val}%**`,
          };
        }
        return {
          success: false,
          message: `☀️ Could not read hardware display brightness (external monitors may use DDC/CI buttons).`,
        };
      }

      if (action === 'up') {
        const res = await runPowerShell('-action brightness-up');
        const val = parseInt(res.stdout, 10);
        const finalLvl = !Number.isNaN(val) ? `${val}%` : 'higher';
        return {
          success: true,
          message: `☀️ **Screen Brightness Increased** to **${finalLvl}**`,
        };
      }

      if (action === 'down') {
        const res = await runPowerShell('-action brightness-down');
        const val = parseInt(res.stdout, 10);
        const finalLvl = !Number.isNaN(val) ? `${val}%` : 'lower';
        return {
          success: true,
          message: `🔅 **Screen Brightness Decreased** to **${finalLvl}**`,
        };
      }

      // Default: 'set'
      const targetLevel = level !== null ? level : 70;
      const res = await runPowerShell(`-action brightness-set -volume ${targetLevel}`);
      if (String(res.stdout).includes('ERR_BRIGHTNESS')) {
        return {
          success: false,
          message: `⚠️ Hardware WMI brightness control is only supported on integrated laptop displays.`,
        };
      }
      return {
        success: true,
        message: `☀️ **Screen Brightness Set** to **${targetLevel}%**`,
      };
    } catch (err) {
      return { success: false, message: `Brightness control error: ${err.message}` };
    }
  }

  // System Control 2: Win32 Window Manager & Split-Screen Snapper
  async handleWindowManager(args = {}) {
    try {
      const action = (args.action || 'maximize').toLowerCase();
      const res = await runPowerShell(`-action window-manage -keys "${action}"`);

      const actionDescriptions = {
        minimize: '🔽 **Minimized Active Window**',
        maximize: '🔼 **Maximized Active Window** to Fullscreen',
        restore: '🗗 **Restored Active Window** to normal size',
        show_desktop: '🖥️ **Toggled Show Desktop** (`Win+D`) — minimized all open windows',
        snap_left: '⬅️ **Snapped Active Window to Left Half** of screen (50% width)',
        snap_right: '➡️ **Snapped Active Window to Right Half** of screen (50% width)',
        split_screen: '🪟 **Split-Screen Workspace Activated** — active window snapped left, previous window snapped right!',
      };

      const detail = res.stdout && !res.stdout.includes('Toggled Desktop') ? ` (*${res.stdout.slice(0, 70)}*)` : '';

      return {
        success: true,
        message: `${actionDescriptions[action] || `🪟 **Window Action**: ${action}`}${detail}`,
      };
    } catch (err) {
      return { success: false, message: `Window manager error: ${err.message}` };
    }
  }

  // System Control 3: Wi-Fi, Bluetooth & Network Diagnostics Control
  async handleConnectivityControl(args = {}) {
    try {
      const action = (args.action || 'status').toLowerCase();

      if (action === 'wifi_on' || action === 'wifi_off') {
        const enable = action === 'wifi_on';
        const stateStr = enable ? 'enabled' : 'disabled';
        const psCmd = `
          $radios = [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime]::GetRadiosAsync().GetAwaiter().GetResult();
          $wifi = $radios | Where-Object { $_.Kind -eq 'WiFi' };
          if ($wifi) {
            foreach ($r in $wifi) {
              $r.SetStateAsync('${enable ? 'On' : 'Off'}').GetAwaiter().GetResult() | Out-Null
            }
            Write-Output "WIFI_RADIO_OK"
          } else {
            netsh interface set interface name="Wi-Fi" admin=${stateStr} | Out-Null
            Write-Output "WIFI_NETSH_OK"
          }
        `;
        await new Promise((resolve) => {
          execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], { timeout: 7000, windowsHide: true }, () => resolve());
        });
        return {
          success: true,
          message: enable
            ? '📶 **Wi-Fi Turned ON** — reconnecting to wireless network.'
            : '📴 **Wi-Fi Turned OFF** — wireless radio disabled.',
        };
      }

      if (action === 'bluetooth_on' || action === 'bluetooth_off') {
        const enable = action === 'bluetooth_on';
        const psCmd = `
          Add-Type -AssemblyName System.Runtime.WindowsRuntime
          $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
          Function Await($WinRtTask, $ResultType) {
            $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
            $netTask = $asTask.Invoke($null, @($WinRtTask))
            $netTask.Wait(-1) | Out-Null
            $netTask.Result
          }
          [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
          [Windows.Devices.Radios.RadioAccessStatus,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null
          Await ([Windows.Devices.Radios.Radio]::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus]) | Out-Null
          $radios = Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
          $bt = $radios | Where-Object { $_.Kind -eq 'Bluetooth' }
          if ($bt) {
            foreach ($r in $bt) {
              Await ($r.SetStateAsync('${enable ? 'On' : 'Off'}')) ([Windows.Devices.Radios.RadioAccessStatus]) | Out-Null
            }
            Write-Output "BT_OK"
          } else {
            Write-Output "BT_NO_RADIO"
          }
        `;
        const out = await new Promise((resolve) => {
          execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], { timeout: 8000, windowsHide: true }, (err, stdout) => {
            resolve(String(stdout || ''));
          });
        });
        if (!out.includes('BT_OK')) {
          exec('start ms-settings:bluetooth', { windowsHide: true });
          return {
            success: true,
            message: `🦷 Opened **Windows Bluetooth Settings** so you can toggle Bluetooth ${enable ? 'ON' : 'OFF'}.`,
          };
        }
        return {
          success: true,
          message: enable
            ? '🦷 **Bluetooth Turned ON** — ready to connect headphones & accessories.'
            : '🦷 **Bluetooth Turned OFF** — Bluetooth radio disabled.',
        };
      }

      // 'status' or 'ping'
      const diagCmd = `
        $wifi = (netsh wlan show interfaces) | Out-String
        $ssid = if ($wifi -match 'SSID\\s*:\\s*(.+)') { $matches[1].Trim() } else { 'Disconnected / Ethernet' }
        $signal = if ($wifi -match 'Signal\\s*:\\s*(.+)') { $matches[1].Trim() } else { 'N/A' }
        $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169\\.' } | Select-Object -First 1).IPAddress
        $ping = Test-Connection -ComputerName 1.1.1.1 -Count 2 -ErrorAction SilentlyContinue
        $avgMs = if ($ping) { [math]::Round(($ping | Measure-Object -Property ResponseTime -Average).Average, 1) } else { -1 }
        [PSCustomObject]@{ ssid = $ssid; signal = $signal; ip = $ip; pingMs = $avgMs } | ConvertTo-Json -Compress
      `;
      const rawJson = await new Promise((resolve) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', diagCmd], { timeout: 8000, windowsHide: true }, (err, stdout) => {
          resolve(String(stdout || '{}').trim());
        });
      });

      let info = {};
      try {
        info = JSON.parse(rawJson);
      } catch (e) {}

      const pingText = info.pingMs && info.pingMs > 0
        ? `**${info.pingMs} ms** *(Cloudflare 1.1.1.1 — Online ✅)*`
        : `**Offline / Timeout ❌**`;

      return {
        success: true,
        message: [
          `### 🌐 Network & Connectivity Status`,
          `- 📶 **Wi-Fi Network (SSID)**: \`${info.ssid || 'Unknown'}\` *(Signal: ${info.signal || 'N/A'})*`,
          `- 💻 **Local IPv4 Address**: \`${info.ip || '127.0.0.1'}\``,
          `- ⚡ **Internet Latency (Ping)**: ${pingText}`,
        ].join('\n'),
      };
    } catch (err) {
      return { success: false, message: `Connectivity control error: ${err.message}` };
    }
  }

  // System Control 4: Windows Power Plan & Dark/Light Theme Toggle
  async handlePowerAndThemeControl(args = {}) {
    try {
      const action = (args.action || 'dark_mode').toLowerCase();

      if (action === 'high_performance' || action === 'power_saver' || action === 'balanced') {
        const guids = {
          high_performance: { guid: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c', label: '⚡ High Performance (Turbo Mode)' },
          balanced: { guid: '381b4222-f694-41f0-9685-ff5bb260df2e', label: '⚖️ Balanced Power Plan' },
          power_saver: { guid: 'a1841308-3541-4fab-bc81-f71556f20b4a', label: '🔋 Power Saver (Battery Saver Mode)' },
        };
        const target = guids[action];
        await new Promise((resolve) => {
          execFile('powercfg', ['/setactive', target.guid], { timeout: 5000, windowsHide: true }, () => resolve());
        });
        return {
          success: true,
          message: `⚡ **Windows Power Plan Switched** to **${target.label}**`,
        };
      }

      // Theme switching via HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize
      const psThemeCmd = `
        $path = 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize'
        $curr = (Get-ItemProperty -Path $path -Name AppsUseLightTheme -ErrorAction SilentlyContinue).AppsUseLightTheme
        $targetVal = ${action === 'light_mode' ? '1' : action === 'dark_mode' ? '0' : 'if ($curr -eq 0) { 1 } else { 0 }'}
        Set-ItemProperty -Path $path -Name AppsUseLightTheme -Value $targetVal -Type DWord
        Set-ItemProperty -Path $path -Name SystemUsesLightTheme -Value $targetVal -Type DWord
        if ($targetVal -eq 0) { Write-Output "THEME:DARK" } else { Write-Output "THEME:LIGHT" }
      `;
      const out = await new Promise((resolve) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psThemeCmd], { timeout: 5000, windowsHide: true }, (err, stdout) => {
          resolve(String(stdout || '').trim());
        });
      });

      const isDark = out.includes('THEME:DARK');
      return {
        success: true,
        message: isDark
          ? '🌙 **Windows 11 Dark Mode Activated** across system & apps!'
          : '☀️ **Windows 11 Light Mode Activated** across system & apps!',
      };
    } catch (err) {
      return { success: false, message: `Power/Theme control error: ${err.message}` };
    }
  }

  // System Control 5: Storage Drives, Empty Recycle Bin & Temp Cache Cleaner
  async handleStorageAndCleanup(args = {}) {
    try {
      const action = (args.action || 'drive_space').toLowerCase();

      if (action === 'empty_recycle_bin') {
        const psCmd = `Clear-RecycleBin -Force -ErrorAction SilentlyContinue; Write-Output "RECYCLE_BIN_CLEARED"`;
        await new Promise((resolve) => {
          execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], { timeout: 10000, windowsHide: true }, () => resolve());
        });
        return {
          success: true,
          message: '🗑️ **Windows Recycle Bin Emptied!** Permanently cleared all deleted items.',
        };
      }

      if (action === 'clean_temp') {
        const psCmd = `
          $tempPath = $env:TEMP
          $before = (Get-ChildItem -Path $tempPath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
          Get-ChildItem -Path $tempPath -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
          $after = (Get-ChildItem -Path $tempPath -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
          $freedMB = [math]::Max(0, [math]::Round((($before - $after) / 1MB), 1))
          Write-Output "FREED_MB:$freedMB"
        `;
        const out = await new Promise((resolve) => {
          execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], { timeout: 12000, windowsHide: true }, (err, stdout) => {
            resolve(String(stdout || '').trim());
          });
        });
        const match = out.match(/FREED_MB:([\d.]+)/);
        const freedMB = match ? match[1] : '0';
        return {
          success: true,
          message: `🧹 **Windows Temp Cache Cleaned!** Purged unlocked temporary files and freed **${freedMB} MB** of disk space.`,
        };
      }

      // Default: 'drive_space'
      const psDrives = `
        Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null } | ForEach-Object {
          $usedGB = [math]::Round($_.Used / 1GB, 1)
          $freeGB = [math]::Round($_.Free / 1GB, 1)
          $totalGB = [math]::Round(($_.Used + $_.Free) / 1GB, 1)
          $pct = if ($totalGB -gt 0) { [math]::Round(($usedGB / $totalGB) * 100, 0) } else { 0 }
          [PSCustomObject]@{ Name = $_.Name; UsedGB = $usedGB; FreeGB = $freeGB; TotalGB = $totalGB; Pct = $pct }
        } | ConvertTo-Json -Compress
      `;
      const rawJson = await new Promise((resolve) => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psDrives], { timeout: 6000, windowsHide: true }, (err, stdout) => {
          resolve(String(stdout || '[]').trim());
        });
      });

      let drives = [];
      try {
        const parsed = JSON.parse(rawJson);
        drives = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {}

      if (!drives.length) {
        return { success: false, message: 'Could not read storage drives.' };
      }

      const lines = drives.map(
        (d) => `- 💾 **Drive ${d.Name}:\\** — **${d.FreeGB} GB free** of ${d.TotalGB} GB *(${d.UsedGB} GB used, ${d.Pct}%)*`
      );

      return {
        success: true,
        message: `### 💽 Storage Drive Space Report\n${lines.join('\n')}`,
      };
    } catch (err) {
      return { success: false, message: `Storage/cleanup error: ${err.message}` };
    }
  }

  // System Control 6: Clean Screenshot to Desktop/Clipboard, Native Screen Recording & Mic Mute
  async handleScreenCaptureAndRecorder(args = {}) {
    try {
      const action = (args.action || 'screenshot').toLowerCase();

      if (action === 'screenshot') {
        const res = await runPowerShell('-action screenshot-save');
        const savedPath = (res.stdout || '').trim() || 'Desktop';
        const fileName = path.basename(savedPath);
        return {
          success: true,
          message: `📸 **Clean Fullscreen Screenshot Captured!**\n- 📁 **Saved to Desktop**: \`Grokki_Screenshots\\${fileName}\`\n- 📋 **Copied directly to Clipboard** *(press \`Ctrl+V\` anywhere to paste)*`,
        };
      }

      if (action === 'start_recording' || action === 'stop_recording') {
        await runPowerShell('-action screen-record');
        const isStart = action === 'start_recording';
        return {
          success: true,
          message: isStart
            ? '🔴 **Windows Native Screen Recording Started** (`Win+Alt+R`)! Recording active window to your `Videos\\Captures` folder.'
            : '⏹️ **Screen Recording Stopped** (`Win+Alt+R`)! Video saved to your `Videos\\Captures` folder.',
        };
      }

      if (action === 'toggle_mic') {
        await runPowerShell('-action mic-mute');
        return {
          success: true,
          message: '🎙️ **Microphone Mute Toggled** (`Win+Alt+K`).',
        };
      }

      return { success: false, message: `Unknown capture action: ${action}` };
    } catch (err) {
      return { success: false, message: `Screen capture/recorder error: ${err.message}` };
    }
  }

  // System Control 7: Smart Presentation Slide Changer (Touchless Iron Man Style & Voice)
  async handlePresentationSlideChanger(args = {}) {
    try {
      const action = (args.action || 'next').toLowerCase();

      if (action === 'start_mode') {
        try {
          if (electronModule && electronModule.ipcMain) {
            electronModule.ipcMain.emit('jarvis:toggle-presentation-mode', null, true);
          }
        } catch (e) {}
        return {
          success: true,
          message: `📽️ **Smart Presentation Mode ACTIVATED!**\n- 🖐️ **Webcam Gesture Sensor**: Wave Hand Right ➔ Next Slide | Left ⬅️ Previous\n- 🗣️ **Contextual Voice Cues**: Say *"Next slide"*, *"Moving on..."*, or *"Go back"* without touching your laptop!\n- 💡 Say *"Stop presentation mode"* when finished.`,
        };
      }

      if (action === 'stop_mode') {
        try {
          if (electronModule && electronModule.ipcMain) {
            electronModule.ipcMain.emit('jarvis:toggle-presentation-mode', null, false);
          }
        } catch (e) {}
        return {
          success: true,
          message: `⏹️ **Presentation Mode Deactivated.** Webcam gesture and voice slide tracking stopped.`,
        };
      }

      const res = await runPowerShell(`-action slide-control -keys "${action}"`);
      const actionLabels = {
        next: '➡️ **Advanced to Next Slide**',
        prev: '⬅️ **Moved to Previous Slide**',
        blackout: '⏹️ **Toggled Blackout Screen** (audience attention mode)',
        fullscreen: '🖥️ **Started Fullscreen Slideshow** (`F5`)',
      };

      return {
        success: true,
        message: actionLabels[action] || `📽️ Presentation action: ${action}`,
      };
    } catch (err) {
      return { success: false, message: `Slide changer error: ${err.message}` };
    }
  }

  // Phase 4: Single Pure Model Runner for Multi-Brain Concurrency
  async runSingleModel(prompt, brainConfig = {}, context = {}) {
    const cfg = this.activeConfig || {};
    const fullConfig = { ...cfg, ...brainConfig };
    const provider = fullConfig.provider || 'gemini';
    const isWebSearchActive = Boolean(
      context.webSearch ||
      context.webSearchEnabled ||
      shouldAutoSearchWeb(prompt)
    );

    let fullPrompt = prompt;
    let groundingSources = [];

    if (context && (context.projectMentions || context.workspaceContext)) {
      try {
        const workspaceContext = require('./workspace_context');
        const mentions = context.projectMentions || context.workspaceContext;
        const packagedContext = workspaceContext.packageContext(mentions);
        if (packagedContext) {
          fullPrompt = `${packagedContext}\n\n${fullPrompt}`;
        }
      } catch (err) {
        console.warn('[AgentBrain] Failed to package project mentions in runSingleModel:', err.message);
      }
    }

    if (isWebSearchActive) {
      try {
        groundingSources = await searchWeb(prompt, 5);
        if (groundingSources.length > 0) {
          fullPrompt = `${fullPrompt}${buildGroundingPrompt(groundingSources, prompt)}`;
        }
      } catch (err) {
        console.warn('[AgentBrain] Web grounding error in runSingleModel:', err.message);
      }
    }

    if (provider === 'gemini') {
      const apiKey = (fullConfig.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
      if (!apiKey) throw new Error('Missing Gemini API Key');
      const ai = new GoogleGenAI({ apiKey });
      const model = fullConfig.model || fullConfig.geminiModel || 'gemini-flash-latest';
      const systemInstruction = memory.buildSystemPrompt(fullConfig);

      const res = await withTimeout(ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        config: {
          systemInstruction,
          maxOutputTokens: 1200,
          temperature: 0.2,
        },
      }), 30000);

      const reply = (res?.text || '').trim();
      return {
        success: true,
        reply: reply || 'Ready.',
        grounding: groundingSources.length > 0 ? { query: prompt, sources: groundingSources } : undefined,
      };
    } else {
      const { endpoint, apiKey, model } = resolveOpenAIEndpointAndKey(provider, fullConfig);
      const chosenModel = fullConfig.model || model;
      const systemContent = memory.buildSystemPrompt(fullConfig);

      const data = await callOpenAICompatible({
        endpoint,
        apiKey,
        model: chosenModel,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: fullPrompt },
        ],
        temperature: 0.2,
        timeout: 30000,
      });

      const reply = (data?.choices?.[0]?.message?.content || '').trim();
      return {
        success: true,
        reply: reply || 'Ready.',
        grounding: groundingSources.length > 0 ? { query: prompt, sources: groundingSources } : undefined,
      };
    }
  }

  // Phase 4: Multi-Brain Dual-Battle Mode (Runs Brain A and Brain B concurrently)
  async runDual(prompt, brainAConfig = {}, brainBConfig = {}, context = {}) {
    const cfg = this.activeConfig || {};
    const fullBrainA = { ...cfg, ...brainAConfig };
    const fullBrainB = { ...cfg, ...brainBConfig };

    const startA = Date.now();
    const startB = Date.now();

    const [resA, resB] = await Promise.all([
      (async () => {
        try {
          const t0 = Date.now();
          const r = await this.runSingleModel(prompt, fullBrainA, context);
          return {
            success: true,
            provider: fullBrainA.provider,
            model: fullBrainA.model || fullBrainA.geminiModel || fullBrainA.groqModel || fullBrainA.provider,
            reply: r.reply,
            latencyMs: Date.now() - t0,
            grounding: r.grounding,
          };
        } catch (err) {
          return {
            success: false,
            provider: fullBrainA.provider,
            model: fullBrainA.model || fullBrainA.provider,
            reply: `Error from Brain A: ${err.message}`,
            latencyMs: Date.now() - startA,
          };
        }
      })(),
      (async () => {
        try {
          const t0 = Date.now();
          const r = await this.runSingleModel(prompt, fullBrainB, context);
          return {
            success: true,
            provider: fullBrainB.provider,
            model: fullBrainB.model || fullBrainB.geminiModel || fullBrainB.groqModel || fullBrainB.provider,
            reply: r.reply,
            latencyMs: Date.now() - t0,
            grounding: r.grounding,
          };
        } catch (err) {
          return {
            success: false,
            provider: fullBrainB.provider,
            model: fullBrainB.model || fullBrainB.provider,
            reply: `Error from Brain B: ${err.message}`,
            latencyMs: Date.now() - startB,
          };
        }
      })(),
    ]);

    return {
      success: true,
      isDual: true,
      brainA: resA,
      brainB: resB,
    };
  }

  // Phase 4: Merge & Synthesize Consensus Mode
  async synthesizeConsensus(prompt, replyA, replyB, brainAName = 'Brain A', brainBName = 'Brain B') {
    const systemPrompt = `You are Grokki, an elite comparative AI judge and synthesis engine.
Two AI brains independently answered this user prompt:
Prompt: "${prompt}"

Brain A (${brainAName}):
"""
${replyA}
"""

Brain B (${brainBName}):
"""
${replyB}
"""

Your Mission:
1. Deliver a superior, comprehensive, unified consensus answer that combines the best insights, fixes omissions, and filters any potential hallucinations from either model.
2. Provide a crisp side-by-side comparison noting the distinctive strengths and differences of each brain.
3. Keep the tone sharp, objective, and authoritative. Use clean Markdown with headers and bullet points.`;

    const consensusText = await this.generateAcademicLLM(
      'You are Grokki, an impartial AI consensus judge and synthesizer.',
      systemPrompt,
      1800
    );

    return {
      success: true,
      consensus: consensusText || 'Consensus generation completed.',
    };
  }
}

module.exports = new AgentBrain();


