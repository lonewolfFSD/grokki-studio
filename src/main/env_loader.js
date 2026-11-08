const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let isLoaded = false;

function loadEnv() {
  let userDataDir = '';
  try {
    const { app } = require('electron');
    if (app && typeof app.getPath === 'function') {
      userDataDir = app.getPath('userData');
    }
  } catch (_) {}

  const candidatePaths = [
    // 1. UserData directory (e.g. %APPDATA%/grokki-studio/.env)
    userDataDir ? path.join(userDataDir, '.env') : null,
    userDataDir ? path.join(userDataDir, 'data', '.env') : null,

    // 2. Application resources (packaged electron)
    process.resourcesPath ? path.join(process.resourcesPath, '.env') : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', '.env') : null,

    // 3. App bundle root / relative to __dirname
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),

    // 4. Working directory / Next to executable
    path.join(process.cwd(), '.env'),
    process.execPath ? path.join(path.dirname(process.execPath), '.env') : null,

    // 5. Standard user profile & AppData locations
    process.env.APPDATA ? path.join(process.env.APPDATA, 'grokki-studio', '.env') : null,
    process.env.APPDATA ? path.join(process.env.APPDATA, 'Grokki Studio', '.env') : null,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.grokki', '.env') : null,

    // 6. Project source directory on local machine
    'E:\\Grokki Studio\\.env',
    'E:\\Grokki Studio\\data\\.env',
  ].filter(Boolean);

  let loadedPath = null;
  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const parsed = dotenv.config({ path: envPath });
        if (parsed && parsed.parsed && Object.keys(parsed.parsed).length > 0) {
          loadedPath = envPath;
          break;
        }
      } catch (_) {}
    }
  }

  // Auto-sync into userData if found elsewhere so future packaged runs always have it
  if (loadedPath && userDataDir) {
    try {
      const userEnvPath = path.join(userDataDir, '.env');
      if (!fs.existsSync(userEnvPath)) {
        fs.copyFileSync(loadedPath, userEnvPath);
      }
    } catch (_) {}
  }

  // Ensure JSON credential files exist in userData and data/ for Google, GitHub, Notion
  syncJsonCredentials(userDataDir);

  isLoaded = true;
}

function syncJsonCredentials(userDataDir) {
  const gId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const gSec = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const ghId = (process.env.GITHUB_CLIENT_ID || '').trim();
  const ghSec = (process.env.GITHUB_CLIENT_SECRET || '').trim();
  const notId = (process.env.NOTION_CLIENT_ID || '').trim();
  const notSec = (process.env.NOTION_CLIENT_SECRET || '').trim();

  const targetDirs = [
    userDataDir,
    path.resolve(__dirname, '../../data'),
    path.join(process.cwd(), 'data'),
  ].filter(Boolean);

  for (const dir of targetDirs) {
    if (!dir) continue;
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Google
      if (gId && gSec) {
        const p = path.join(dir, 'google_credentials.json');
        if (!fs.existsSync(p)) {
          fs.writeFileSync(
            p,
            JSON.stringify(
              {
                installed: {
                  client_id: gId,
                  client_secret: gSec,
                  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
                  token_uri: 'https://oauth2.googleapis.com/token',
                },
              },
              null,
              2
            ),
            'utf8'
          );
        }
      }

      // GitHub
      if (ghId && ghSec) {
        const p = path.join(dir, 'github_credentials.json');
        if (!fs.existsSync(p)) {
          fs.writeFileSync(p, JSON.stringify({ client_id: ghId, client_secret: ghSec }, null, 2), 'utf8');
        }
      }

      // Notion
      if (notId && notSec) {
        const p = path.join(dir, 'notion_credentials.json');
        if (!fs.existsSync(p)) {
          fs.writeFileSync(p, JSON.stringify({ client_id: notId, client_secret: notSec }, null, 2), 'utf8');
        }
      }
    } catch (_) {}
  }
}

// Initial invocation
loadEnv();

module.exports = { loadEnv, syncJsonCredentials };
