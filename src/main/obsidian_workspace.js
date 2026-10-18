const fs = require('fs');
const path = require('path');
const { dialog, shell } = require('electron');
const { getDataDir } = require('./data_dir');

class ObsidianWorkspaceManager {
  constructor() {
    this.storagePath = path.join(getDataDir(), 'obsidian_vault.json');
    this.vaultPath = null;
    this.vaultName = null;
    this.loadSavedVault();
  }

  loadSavedVault() {
    if (fs.existsSync(this.storagePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
        if (data && data.vaultPath && fs.existsSync(data.vaultPath)) {
          this.vaultPath = data.vaultPath;
          this.vaultName = data.vaultName || path.basename(data.vaultPath);
          return;
        }
      } catch (e) {
        console.warn('[Obsidian] Failed to load saved vault:', e.message);
      }
    }

    // Fallback: Check standard Obsidian config in AppData
    this.detectDefaultVault();
  }

  detectDefaultVault() {
    try {
      const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : '');
      if (appData) {
        const obsidianConfig = path.join(appData, 'obsidian', 'obsidian.json');
        if (fs.existsSync(obsidianConfig)) {
          const cfg = JSON.parse(fs.readFileSync(obsidianConfig, 'utf8'));
          if (cfg && cfg.vaults) {
            const firstVault = Object.values(cfg.vaults).find((v) => v.path && fs.existsSync(v.path));
            if (firstVault) {
              this.vaultPath = firstVault.path;
              this.vaultName = path.basename(firstVault.path);
              this.saveVault(this.vaultPath, this.vaultName);
            }
          }
        }
      }
    } catch (e) {}
  }

  saveVault(vaultPath, vaultName) {
    this.vaultPath = vaultPath;
    this.vaultName = vaultName || path.basename(vaultPath);
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        this.storagePath,
        JSON.stringify(
          {
            vaultPath: this.vaultPath,
            vaultName: this.vaultName,
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (e) {
      console.warn('[Obsidian] Failed to save vault to disk:', e.message);
    }
  }

  isConnected() {
    return !!(this.vaultPath && fs.existsSync(this.vaultPath));
  }

  countNotes(dir = this.vaultPath, maxDepth = 4) {
    if (!dir || !fs.existsSync(dir)) return 0;
    let count = 0;

    const walk = (current, depth) => {
      if (depth > maxDepth) return;
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.trash') continue;
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walk(full, depth + 1);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            count++;
          }
        }
      } catch (e) {}
    };

    walk(dir, 0);
    return count;
  }

  getStatus() {
    const connected = this.isConnected();
    if (!connected) {
      return {
        connected: false,
        vaultPath: null,
        vaultName: null,
        notesCount: 0,
      };
    }

    const notesCount = this.countNotes();
    return {
      connected: true,
      vaultPath: this.vaultPath,
      vaultName: this.vaultName,
      notesCount,
    };
  }

  async selectVault(browserWindow) {
    const res = await dialog.showOpenDialog(browserWindow || undefined, {
      title: 'Select Obsidian Vault Directory',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Select Vault',
    });

    if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
      return { canceled: true };
    }

    const chosenPath = res.filePaths[0];
    const name = path.basename(chosenPath);
    this.saveVault(chosenPath, name);

    return {
      success: true,
      vaultPath: chosenPath,
      vaultName: name,
      notesCount: this.countNotes(chosenPath),
    };
  }

  disconnect() {
    this.vaultPath = null;
    this.vaultName = null;
    if (fs.existsSync(this.storagePath)) {
      try {
        fs.unlinkSync(this.storagePath);
      } catch (e) {}
    }
    return { success: true };
  }

  openVaultInObsidian(noteRelativePath = '') {
    if (!this.vaultName) return;
    const uri = noteRelativePath
      ? `obsidian://open?vault=${encodeURIComponent(this.vaultName)}&file=${encodeURIComponent(noteRelativePath.replace(/\.md$/, ''))}`
      : `obsidian://open?vault=${encodeURIComponent(this.vaultName)}`;
    shell.openExternal(uri);
  }

  searchNotes(query, max = 8) {
    if (!this.isConnected()) throw new Error('No Obsidian vault connected.');

    const q = (query || '').toLowerCase().trim();
    const results = [];

    const walk = (current, depth = 0) => {
      if (depth > 5 || results.length >= max) return;
      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          if (results.length >= max) break;
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.trash') continue;

          const fullPath = path.join(current, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath, depth + 1);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            const rel = path.relative(this.vaultPath, fullPath);
            const nameWithoutExt = entry.name.replace(/\.md$/, '');

            if (!q || nameWithoutExt.toLowerCase().includes(q)) {
              results.push({
                name: nameWithoutExt,
                relativePath: rel,
                fullPath,
              });
            } else {
              // Search snippet in content
              try {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.toLowerCase().includes(q)) {
                  results.push({
                    name: nameWithoutExt,
                    relativePath: rel,
                    fullPath,
                  });
                }
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    };

    walk(this.vaultPath);
    return results;
  }

  createNote(title, content, subfolder = '') {
    if (!this.isConnected()) throw new Error('No Obsidian vault connected.');

    const cleanTitle = (title || 'Untitled Note').replace(/[/\\?%*:|"<>]/g, '-').trim();
    const targetDir = subfolder ? path.join(this.vaultPath, subfolder) : this.vaultPath;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, `${cleanTitle}.md`);
    fs.writeFileSync(filePath, content || '', 'utf8');

    return {
      success: true,
      title: cleanTitle,
      path: filePath,
      relativePath: path.relative(this.vaultPath, filePath),
    };
  }

  appendDailyNote(content) {
    if (!this.isConnected()) throw new Error('No Obsidian vault connected.');

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Common Daily Notes folders: root or "Daily Notes" or "Journal"
    let dailyDir = this.vaultPath;
    const candidates = ['Daily Notes', 'daily notes', 'Daily', 'Journal'];
    for (const c of candidates) {
      const p = path.join(this.vaultPath, c);
      if (fs.existsSync(p)) {
        dailyDir = p;
        break;
      }
    }

    const filePath = path.join(dailyDir, `${todayStr}.md`);
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedAppend = `\n\n### ${timeStr}\n${content || ''}\n`;

    if (fs.existsSync(filePath)) {
      fs.appendFileSync(filePath, formattedAppend, 'utf8');
    } else {
      fs.writeFileSync(filePath, `# Daily Note - ${todayStr}${formattedAppend}`, 'utf8');
    }

    return {
      success: true,
      date: todayStr,
      path: filePath,
    };
  }
}

module.exports = new ObsidianWorkspaceManager();
