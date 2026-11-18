const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn, execFile } = require('child_process');
const { getDataDir } = require('./data_dir');

const DEFAULT_PORT = 11435;

class GrokkiLocalEngine {
  constructor() {
    this.serverProc = null;
    this.activeModelFile = null;
    this.port = DEFAULT_PORT;
    this.activeDownload = null;
  }

  getModelsDir() {
    const dir = path.join(getDataDir(), 'models', 'gguf');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  getRuntimeDir() {
    const dir = path.join(getDataDir(), 'local_engine');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  getServerBinaryPath() {
    const exeName = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';
    const localBin = path.join(this.getRuntimeDir(), exeName);
    if (fs.existsSync(localBin)) return localBin;
    // Also check nested bin folder if zip extracted into a subfolder
    try {
      const entries = fs.readdirSync(this.getRuntimeDir(), { withFileTypes: true });
      for (const ent of entries) {
        if (ent.isDirectory()) {
          const nested = path.join(this.getRuntimeDir(), ent.name, exeName);
          if (fs.existsSync(nested)) return nested;
        }
      }
    } catch (_) {}
    return null;
  }

  isRuntimeInstalled() {
    return Boolean(this.getServerBinaryPath());
  }

  isRunning() {
    return Boolean(this.serverProc && !this.serverProc.killed);
  }

  getExternalScanRoots() {
    const home = os.homedir();
    const candidates = [
      process.env.HUGGINGFACE_HUB_CACHE ? { dir: process.env.HUGGINGFACE_HUB_CACHE, source: 'HuggingFace Cache' } : null,
      process.env.HF_HOME ? { dir: path.join(process.env.HF_HOME, 'hub'), source: 'HuggingFace Cache' } : null,
      { dir: path.join(home, '.cache', 'huggingface', 'hub'), source: 'HuggingFace Cache' },
      { dir: path.join(home, '.lmstudio', 'models'), source: 'LM Studio' },
      { dir: path.join(home, '.cache', 'lm-studio', 'models'), source: 'LM Studio' },
      { dir: path.join(home, 'jan', 'models'), source: 'Jan' },
      { dir: path.join(home, '.jan', 'models'), source: 'Jan' },
    ].filter(Boolean);

    const seen = new Set();
    return candidates.filter((c) => {
      const resolved = path.resolve(c.dir);
      if (seen.has(resolved) || !fs.existsSync(resolved)) return false;
      seen.add(resolved);
      return true;
    });
  }

  scanDirectoryForGguf(rootDir, sourceLabel, maxDepth = 5) {
    const results = [];
    const skipDirs = new Set(['blobs', 'refs', '.no_exist', '.git', 'node_modules']);

    const walk = (dir, depth) => {
      if (depth > maxDepth) return;
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const ent of entries) {
        const fullPath = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (!skipDirs.has(ent.name)) walk(fullPath, depth + 1);
        } else if (ent.name.toLowerCase().endsWith('.gguf') && !ent.name.toLowerCase().endsWith('.part')) {
          try {
            const stat = fs.statSync(fullPath);
            if (!stat.isFile() || stat.size <= 0) continue;
            let repoId = null;
            const rel = path.relative(rootDir, fullPath);
            const hfMatch = rel.match(/^models--([^\\/]+)--([^\\/]+)/);
            if (hfMatch) {
              repoId = `${hfMatch[1]}/${hfMatch[2]}`;
            } else if (sourceLabel === 'LM Studio') {
              const parts = rel.split(path.sep);
              if (parts.length >= 3) repoId = `${parts[0]}/${parts[1]}`;
            } else if (sourceLabel === 'Grokki' && ent.name.includes('__')) {
              const prefix = ent.name.split('__')[0];
              const idx = prefix.indexOf('_');
              if (idx > 0) repoId = `${prefix.slice(0, idx)}/${prefix.slice(idx + 1)}`;
            }
            const sizeGb = (stat.size / (1024 * 1024 * 1024)).toFixed(2);
            results.push({
              fileName: ent.name,
              fullPath,
              sizeBytes: stat.size,
              sizeLabel: `${sizeGb} GB`,
              isActive: (this.activeModelFile === ent.name || this.activeModelFile === fullPath) && this.isRunning(),
              source: sourceLabel,
              repoId,
            });
          } catch (_) {}
        }
      }
    };

    walk(rootDir, 0);
    return results;
  }

  listDownloadedModels() {
    const all = [];
    const seenPaths = new Set();

    const addItems = (items) => {
      for (const item of items) {
        const norm = path.resolve(item.fullPath);
        if (seenPaths.has(norm)) continue;
        seenPaths.add(norm);
        all.push(item);
      }
    };

    addItems(this.scanDirectoryForGguf(this.getModelsDir(), 'Grokki', 2));
    for (const ext of this.getExternalScanRoots()) {
      addItems(this.scanDirectoryForGguf(ext.dir, ext.source, 5));
    }

    return all.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }

  deleteModel(fileName) {
    if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return { success: false, error: 'Invalid model filename.' };
    }
    const target = path.join(this.getModelsDir(), fileName);
    if (!fs.existsSync(target)) {
      return { success: false, error: 'Model file not found.' };
    }
    if (this.activeModelFile === fileName && this.isRunning()) {
      this.stopModel();
    }
    fs.unlinkSync(target);
    return { success: true };
  }

  async getStatus() {
    return {
      runtimeInstalled: this.isRuntimeInstalled(),
      binaryPath: this.getServerBinaryPath(),
      running: this.isRunning(),
      port: this.port,
      endpoint: `http://127.0.0.1:${this.port}/v1`,
      activeModel: this.isRunning() ? this.activeModelFile : null,
      models: this.listDownloadedModels(),
    };
  }

  async searchHuggingFaceModels(query = '', limit = 30) {
    const q = (query || '').trim();
    const url = q
      ? `https://huggingface.co/api/models?search=${encodeURIComponent(q)}&filter=gguf&sort=downloads&direction=-1&limit=${limit}`
      : `https://huggingface.co/api/models?filter=gguf&sort=downloads&direction=-1&limit=${limit}`;

    const fetch = global.fetch || require('node-fetch');
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`HuggingFace API returned HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m) => {
      const id = m.id || m.modelId || '';
      const parts = id.split('/');
      return {
        id,
        author: parts.length > 1 ? parts[0] : '',
        name: parts.length > 1 ? parts.slice(1).join('/') : id,
        downloads: m.downloads || 0,
        likes: m.likes || 0,
        pipelineTag: m.pipeline_tag || 'text-generation',
        tags: Array.isArray(m.tags) ? m.tags.slice(0, 8) : [],
      };
    });
  }

  async getRepoGgufFiles(repoId) {
    if (!repoId || !repoId.includes('/')) {
      throw new Error('Invalid HuggingFace repo ID (expected owner/repo).');
    }
    const fetch = global.fetch || require('node-fetch');
    const url = `https://huggingface.co/api/models/${repoId}/tree/main`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`Failed to fetch files for ${repoId} (HTTP ${res.status})`);
    }
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    const ggufs = items
      .filter((it) => it.type === 'file' && typeof it.path === 'string' && it.path.toLowerCase().endsWith('.gguf'))
      .map((it) => {
        const sizeBytes = it.size || it.lfs?.size || 0;
        const sizeGb = sizeBytes > 0 ? (sizeBytes / (1024 * 1024 * 1024)).toFixed(2) : null;
        const quantMatch = it.path.match(/[-_.]((?:IQ|Q)[0-9]+(?:_[A-Z0-9]+)*|F16|F32|BF16)\.gguf$/i);
        const quant = quantMatch ? quantMatch[1].toUpperCase() : 'GGUF';
        return {
          path: it.path,
          quant,
          sizeBytes,
          sizeLabel: sizeGb ? `${sizeGb} GB` : 'Unknown size',
          downloadUrl: `https://huggingface.co/${repoId}/resolve/main/${encodeURIComponent(it.path)}?download=true`,
          isRecommended: /Q4_K_M/i.test(quant),
        };
      })
      .sort((a, b) => a.sizeBytes - b.sizeBytes);

    return ggufs;
  }

  downloadFileWithRedirects(url, destPath, onProgress, abortSignal) {
    return new Promise((resolve, reject) => {
      const doRequest = (targetUrl, redirectCount = 0) => {
        if (redirectCount > 8) {
          return reject(new Error('Too many redirects while downloading.'));
        }
        const client = targetUrl.startsWith('https:') ? https : http;
        const req = client.get(targetUrl, { headers: { 'User-Agent': 'Grokki-Studio/1.52' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, targetUrl).toString();
            res.resume();
            return doRequest(nextUrl, redirectCount + 1);
          }

          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
          let downloadedBytes = 0;
          const tempPath = `${destPath}.downloading`;
          const out = fs.createWriteStream(tempPath);

          const cleanup = () => {
            try { out.close(); } catch (_) {}
            try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
          };

          if (abortSignal) {
            abortSignal.addEventListener('abort', () => {
              req.destroy();
              cleanup();
              reject(new Error('Download cancelled.'));
            });
          }

          res.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (onProgress) {
              const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
              onProgress({ downloadedBytes, totalBytes, percent });
            }
          });

          res.pipe(out);
          out.on('finish', () => {
            out.close(() => {
              try {
                if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
                fs.renameSync(tempPath, destPath);
                resolve(destPath);
              } catch (e) {
                reject(e);
              }
            });
          });
          out.on('error', (err) => {
            cleanup();
            reject(err);
          });
        });

        req.on('error', (err) => reject(err));
      };

      doRequest(url);
    });
  }

  async downloadHuggingFaceModel(repoId, filePath, onProgress) {
    const safeRepo = repoId.replace(/[^a-zA-Z0-9._-]/g, '_');
    const baseName = path.basename(filePath);
    const localFileName = `${safeRepo}__${baseName}`;
    const destPath = path.join(this.getModelsDir(), localFileName);
    const downloadUrl = `https://huggingface.co/${repoId}/resolve/main/${filePath.split('/').map(encodeURIComponent).join('/')}?download=true`;

    const controller = new AbortController();
    this.activeDownload = { repoId, filePath, localFileName, controller };

    try {
      await this.downloadFileWithRedirects(
        downloadUrl,
        destPath,
        (prog) => {
          onProgress?.({
            type: 'model',
            repoId,
            fileName: localFileName,
            ...prog,
            status: prog.percent > 0 ? `Downloading ${prog.percent}%` : 'Downloading...',
          });
        },
        controller.signal
      );
      return { success: true, fileName: localFileName, fullPath: destPath };
    } finally {
      this.activeDownload = null;
    }
  }

  async installRuntime(onProgress) {
    if (process.platform !== 'win32') {
      throw new Error('Auto-installer currently supports Windows x64; install llama-server in PATH on macOS/Linux.');
    }
    const fetch = global.fetch || require('node-fetch');
    onProgress?.({ type: 'runtime', percent: 5, status: 'Checking latest llama.cpp releases...' });
    const res = await fetch('https://api.github.com/repos/ggml-org/llama.cpp/releases?per_page=8', {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Grokki-Studio' },
    });
    if (!res.ok) {
      throw new Error(`GitHub release lookup failed (HTTP ${res.status})`);
    }
    const releases = await res.json();
    const releaseList = Array.isArray(releases) ? releases : [];

    // Find the newest release with a complete Windows x64 llama-server binary zip (never cudart-only zips)
    let preferred = null;
    for (const rel of releaseList) {
      const assets = Array.isArray(rel?.assets) ? rel.assets : [];
      preferred =
        assets.find((a) => /^llama-.*-bin-win-vulkan-x64\.zip$/i.test(a.name)) ||
        assets.find((a) => /^llama-.*-bin-win-cpu-x64\.zip$/i.test(a.name)) ||
        assets.find((a) => /^llama-.*-bin-win-avx2-x64\.zip$/i.test(a.name));
      if (preferred) break;
    }

    if (!preferred) {
      throw new Error('Could not find Windows x64 llama.cpp binary asset in recent releases.');
    }

    const runtimeDir = this.getRuntimeDir();
    const zipPath = path.join(runtimeDir, preferred.name);
    await this.downloadFileWithRedirects(preferred.browser_download_url, zipPath, (prog) => {
      onProgress?.({
        type: 'runtime',
        percent: Math.max(10, Math.min(90, Math.round(prog.percent * 0.85) + 5)),
        status: `Downloading ${preferred.name} (${prog.percent}%)...`,
      });
    });

    onProgress?.({ type: 'runtime', percent: 94, status: 'Extracting llama-server...' });
    await new Promise((resolve, reject) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${runtimeDir.replace(/'/g, "''")}' -Force`],
        { timeout: 60000 },
        (err) => {
          try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath); } catch (_) {}
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const binPath = this.getServerBinaryPath();
    if (!binPath) {
      throw new Error('llama-server.exe was not found after extraction.');
    }
    onProgress?.({ type: 'runtime', percent: 100, status: 'Grokki Local Runtime ready!' });
    return { success: true, binaryPath: binPath };
  }

  async waitForHealth(timeoutMs = 30000) {
    const start = Date.now();
    const fetch = global.fetch || require('node-fetch');
    while (Date.now() - start < timeoutMs) {
      if (!this.isRunning()) {
        throw new Error('llama-server exited unexpectedly.');
      }
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/health`);
        if (res.ok) return true;
      } catch (_) {}
      await new Promise((r) => setTimeout(r, 400));
    }
    throw new Error('Timed out waiting for llama-server to load model.');
  }

  async startModel(fileName, options = {}) {
    const binPath = this.getServerBinaryPath();
    if (!binPath) {
      throw new Error('Grokki Local Runtime is not installed yet. Click "Install Runtime" first.');
    }
    const directPath = path.join(this.getModelsDir(), fileName);
    const matched = fs.existsSync(directPath)
      ? { fullPath: directPath, fileName }
      : this.listDownloadedModels().find((m) => m.fileName === fileName || m.fullPath === fileName);

    if (!matched || !fs.existsSync(matched.fullPath)) {
      throw new Error(`Model "${fileName}" not found locally.`);
    }
    const modelPath = matched.fullPath;

    if (this.isRunning() && this.activeModelFile === fileName) {
      return { success: true, endpoint: `http://127.0.0.1:${this.port}/v1`, fileName };
    }

    this.stopModel();

    const ctxSize = String(options.contextSize || 8192);
    const gpuLayers = String(options.gpuLayers ?? 'auto');
    const args = [
      '-m', modelPath,
      '--host', '127.0.0.1',
      '--port', String(this.port),
      '-c', ctxSize,
      '-ngl', gpuLayers,
    ];

    this.serverProc = spawn(binPath, args, {
      cwd: path.dirname(binPath),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.activeModelFile = fileName;

    this.serverProc.on('exit', () => {
      this.serverProc = null;
    });

    await this.waitForHealth(45000);
    return { success: true, endpoint: `http://127.0.0.1:${this.port}/v1`, fileName };
  }

  stopModel() {
    if (this.serverProc) {
      try {
        this.serverProc.kill();
      } catch (_) {}
      this.serverProc = null;
    }
    this.activeModelFile = null;
    return { success: true };
  }
}

module.exports = new GrokkiLocalEngine();
