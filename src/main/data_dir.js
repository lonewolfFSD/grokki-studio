const { app } = require('electron');
const path = require('path');
const fs = require('fs');

let hasSynced = false;

function getDataDir() {
  let dir;
  try {
    if (app && app.isPackaged) {
      dir = app.getPath('userData');
    } else {
      dir = path.resolve(__dirname, '../../data');
    }
  } catch (e) {
    dir = path.resolve(__dirname, '../../data');
  }
  
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.warn('[DataDir] Failed to ensure directory:', err.message);
    }
  }

  if (app && app.isPackaged && !hasSynced) {
    hasSynced = true;
    syncPackagedUserData(dir);
  }

  return dir;
}

function syncPackagedUserData(targetDir) {
  const sourceCandidates = [
    'E:\\Grokki Studio\\data',
    path.resolve(__dirname, '../../data'),
    process.resourcesPath ? path.join(process.resourcesPath, 'data') : null,
  ].filter(Boolean);

  for (const src of sourceCandidates) {
    if (fs.existsSync(src)) {
      try {
        const items = fs.readdirSync(src);
        for (const item of items) {
          const srcItem = path.join(src, item);
          const tgtItem = path.join(targetDir, item);
          try {
            const stat = fs.statSync(srcItem);
            if (stat.isFile() && item.endsWith('.json')) {
              if (!fs.existsSync(tgtItem)) {
                fs.copyFileSync(srcItem, tgtItem);
              }
            } else if (stat.isDirectory() && item === 'whatsapp_auth') {
              if (!fs.existsSync(tgtItem)) {
                fs.mkdirSync(tgtItem, { recursive: true });
              }
              if (fs.readdirSync(tgtItem).length === 0) {
                fs.cpSync(srcItem, tgtItem, { recursive: true, force: false });
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
  }
}

module.exports = { getDataDir };
