const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');
const { getDataDir } = require('./data_dir');

class WorkspaceContextManager {
  constructor() {
    this.dataDir = getDataDir();
    this.configPath = path.join(this.dataDir, 'workspace_config.json');
    this.workspaceRoot = this.loadSavedRoot() || process.cwd();
    this.cache = {
      files: [],
      timestamp: 0,
      root: null,
    };
  }

  loadSavedRoot() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        if (raw && raw.workspaceRoot && fs.existsSync(raw.workspaceRoot)) {
          return raw.workspaceRoot;
        }
      }
    } catch (e) {}
    return null;
  }

  saveRoot(newRoot) {
    this.workspaceRoot = newRoot;
    this.cache.timestamp = 0; // invalidate cache
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify({ workspaceRoot: newRoot }, null, 2), 'utf8');
      return { success: true, workspaceRoot: newRoot };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  getWorkspaceRoot() {
    return {
      workspaceRoot: this.workspaceRoot,
      folderName: path.basename(this.workspaceRoot) || this.workspaceRoot,
    };
  }

  async selectWorkspaceFolder() {
    const result = await dialog.showOpenDialog({
      title: 'Select Project Workspace Folder',
      properties: ['openDirectory'],
      defaultPath: this.workspaceRoot || process.cwd(),
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const selected = result.filePaths[0];
    this.saveRoot(selected);
    return {
      success: true,
      workspaceRoot: selected,
      folderName: path.basename(selected),
    };
  }

  scanWorkspaceFiles({ query = '', maxResults = 30 } = {}) {
    const root = this.workspaceRoot;
    if (!root || !fs.existsSync(root)) {
      return { success: false, items: [], error: 'Workspace folder does not exist' };
    }

    const now = Date.now();
    // Cache directory tree for 10 seconds unless root changed
    if (this.cache.root !== root || now - this.cache.timestamp > 10000 || this.cache.files.length === 0) {
      const scanned = [];
      const ignoredDirs = new Set([
        '.git',
        'node_modules',
        'dist',
        'build',
        '.next',
        '.gemini',
        'coverage',
        '.cache',
        '.vscode',
        'tmp',
        'temp',
        'out',
        'data',
        'release',
        '.system_generated',
      ]);

      const ignoredExts = new Set([
        '.exe',
        '.dll',
        '.bin',
        '.iso',
        '.zip',
        '.tar',
        '.gz',
        '.7z',
        '.rar',
        '.mp4',
        '.mov',
        '.avi',
        '.mkv',
        '.wav',
        '.mp3',
        '.woff',
        '.woff2',
        '.ttf',
        '.eot',
        '.ico',
        '.lock',
      ]);

      const walk = (current, depth = 0) => {
        if (depth > 8 || scanned.length > 10000) return;
        try {
          const entries = fs.readdirSync(current, { withFileTypes: true });
          // Sort so directories like 'src' or code files are scanned reliably
          entries.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
          });

          for (const entry of entries) {
            if (entry.name.startsWith('.') && entry.name !== '.env.example' && entry.name !== '.gitignore') continue;
            if (ignoredDirs.has(entry.name)) continue;

            const fullPath = path.join(current, entry.name);
            const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

            if (entry.isDirectory()) {
              scanned.push({
                name: entry.name,
                path: relPath,
                fullPath,
                type: 'folder',
                ext: '',
                size: 0,
              });
              walk(fullPath, depth + 1);
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase();
              if (ignoredExts.has(ext)) continue;
              let size = 0;
              try {
                size = fs.statSync(fullPath).size;
              } catch (e) {}

              scanned.push({
                name: entry.name,
                path: relPath,
                fullPath,
                type: 'file',
                ext,
                size,
              });
            }
          }
        } catch (e) {}
      };

      walk(root, 0);
      this.cache = {
        files: scanned,
        timestamp: now,
        root,
      };
    }

    const all = this.cache.files;
    const cleanQuery = (query || '').toLowerCase().trim();

    let matched = all;
    if (cleanQuery) {
      matched = all.filter((item) => {
        const nameLower = item.name.toLowerCase();
        const pathLower = item.path.toLowerCase();
        return nameLower.includes(cleanQuery) || pathLower.includes(cleanQuery);
      }).sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStarts = aName.startsWith(cleanQuery);
        const bStarts = bName.startsWith(cleanQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        if (a.type !== b.type) {
          return a.type === 'file' ? -1 : 1;
        }
        return a.path.length - b.path.length;
      });
    }

    return {
      success: true,
      workspaceRoot: root,
      folderName: path.basename(root),
      items: matched.slice(0, maxResults),
      totalMatches: matched.length,
    };
  }

  readWorkspaceItem(relOrFullPath) {
    const root = this.workspaceRoot;
    const fullPath = path.isAbsolute(relOrFullPath)
      ? relOrFullPath
      : path.join(root, relOrFullPath);

    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File or folder does not exist: ' + relOrFullPath };
    }

    try {
      const stat = fs.statSync(fullPath);
      const isDir = stat.isDirectory();
      const relPath = path.relative(root, fullPath).replace(/\\/g, '/');

      if (isDir) {
        const treeLines = [];
        const walkDir = (cur, prefix = '', d = 0) => {
          if (d > 3 || treeLines.length > 80) return;
          try {
            const list = fs.readdirSync(cur, { withFileTypes: true });
            for (const item of list) {
              if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist' || item.name === 'data') continue;
              const isChildDir = item.isDirectory();
              treeLines.push(`${prefix}${isChildDir ? '📁 ' : '📄 '}${item.name}`);
              if (isChildDir) {
                walkDir(path.join(cur, item.name), prefix + '  ', d + 1);
              }
            }
          } catch (e) {}
        };
        walkDir(fullPath, '', 0);

        return {
          success: true,
          type: 'folder',
          name: path.basename(fullPath),
          path: relPath,
          fullPath,
          tree: treeLines.join('\n'),
        };
      }

      // File
      const ext = path.extname(fullPath).toLowerCase();
      const MAX_BYTES = 60 * 1024;
      const buffer = fs.readFileSync(fullPath);
      const isTruncated = buffer.length > MAX_BYTES;
      const content = buffer.slice(0, MAX_BYTES).toString('utf8');
      const lines = content.split('\n').length;

      return {
        success: true,
        type: 'file',
        name: path.basename(fullPath),
        path: relPath,
        fullPath,
        ext,
        size: stat.size,
        lines,
        content,
        isTruncated,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  packageContext(mentions = []) {
    if (!Array.isArray(mentions) || mentions.length === 0) return '';
    const parts = [];

    for (const mention of mentions) {
      if (!mention) continue;
      const targetPath = typeof mention === 'string' ? mention : (mention.path || mention.fullPath);
      if (!targetPath) continue;

      // Special mention: @workspace or @codebase
      if (targetPath === '@workspace' || targetPath === '@codebase' || targetPath === 'workspace' || targetPath === 'codebase') {
        const scan = this.scanWorkspaceFiles({ query: '', maxResults: 120 });
        if (scan.success) {
          const fileList = scan.items.map(it => `- ${it.type === 'folder' ? '📁 ' : '📄 '}${it.path}`).join('\n');
          parts.push(
            `\n================================================================\n` +
            `WORKSPACE PROJECT MAP: ${this.workspaceRoot} (${scan.totalMatches} files & folders)\n` +
            `================================================================\n` +
            `${fileList}\n` +
            `================================================================\n`
          );
        }
        continue;
      }

      const readRes = this.readWorkspaceItem(targetPath);
      if (!readRes || !readRes.success) continue;

      if (readRes.type === 'file') {
        const lang = (readRes.ext || '').replace('.', '') || 'text';
        parts.push(
          `\n================================================================\n` +
          `PROJECT FILE: @${readRes.path} (${readRes.size} bytes, ${readRes.lines} lines)\n` +
          `================================================================\n` +
          `\`\`\`${lang}\n${readRes.content}\n\`\`\`\n` +
          (readRes.isTruncated ? `[...file truncated due to size limit...]\n` : '') +
          `================================================================\n`
        );
      } else if (readRes.type === 'folder') {
        parts.push(
          `\n================================================================\n` +
          `PROJECT FOLDER: @${readRes.path}\n` +
          `================================================================\n` +
          `Folder structure:\n${readRes.tree}\n` +
          `================================================================\n`
        );
      }
    }

    return parts.join('\n');
  }
}

module.exports = new WorkspaceContextManager();
