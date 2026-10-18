const { app } = require('electron');
const path = require('path');
const fs = require('fs');

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
  return dir;
}

module.exports = { getDataDir };
