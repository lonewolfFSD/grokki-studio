const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const workspaceContext = require('./workspace_context');

/**
 * DeepSeek Harness - Inspired Coding Agent Engine for Grokki
 * Provides high-precision coding tools, sandbox boundaries, multi-turn tool loops,
 * and unified diff calculations.
 */
class CodingAgentHarness {
  constructor() {
    this.maxCommandTimeout = 45000;
    this.maxFileSize = 2 * 1024 * 1024; // 2MB read limit
    this.customWorkspaceRoot = null;
    this.permissionLevel = 'turbo'; // 'review' | 'default' | 'auto' | 'turbo'
  }

  setPermissionLevel(level) {
    if (['review', 'default', 'auto', 'turbo'].includes(level)) {
      this.permissionLevel = level;
    }
  }

  setWorkspaceRoot(root) {
    if (root && fs.existsSync(root)) {
      this.customWorkspaceRoot = root;
    }
  }

  getWorkspaceRoot() {
    if (this.customWorkspaceRoot && fs.existsSync(this.customWorkspaceRoot)) {
      return this.customWorkspaceRoot;
    }
    if (workspaceContext && typeof workspaceContext.getRoot === 'function') {
      const root = workspaceContext.getRoot();
      if (root && fs.existsSync(root)) return root;
    }
    return process.cwd();
  }

  resolvePath(targetPath) {
    if (!targetPath) return this.getWorkspaceRoot();
    if (path.isAbsolute(targetPath)) return path.normalize(targetPath);
    return path.normalize(path.join(this.getWorkspaceRoot(), targetPath));
  }

  /**
   * Reads file content with optional line range and byte offset.
   */
  async readFile({ path: filePath, start_line, end_line, byte_offset = 0 }) {
    try {
      const fullPath = this.resolvePath(filePath);
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        return { success: false, error: `Target path is a directory, not a file: ${filePath}` };
      }
      if (stat.size > this.maxFileSize && !start_line && !end_line) {
        return {
          success: false,
          error: `File size (${(stat.size / 1024).toFixed(1)} KB) exceeds limit. Specify start_line and end_line to inspect chunks.`,
        };
      }

      let content = fs.readFileSync(fullPath, 'utf8');
      if (byte_offset > 0) {
        content = content.slice(byte_offset);
      }

      const allLines = content.split(/\r?\n/);
      const totalLines = allLines.length;

      let resultLines = allLines;
      let startIdx = 1;
      let endIdx = totalLines;

      if (start_line !== undefined && start_line !== null) {
        startIdx = Math.max(1, parseInt(start_line, 10) || 1);
      }
      if (end_line !== undefined && end_line !== null) {
        endIdx = Math.min(totalLines, parseInt(end_line, 10) || totalLines);
      }

      let truncationNotice = '';
      if (start_line !== undefined || end_line !== undefined) {
        resultLines = allLines.slice(startIdx - 1, endIdx);
      } else if (allLines.length > 250) {
        resultLines = allLines.slice(0, 250);
        endIdx = 250;
        truncationNotice = `\n\n[... Truncated: Showing first 250 of ${totalLines} lines. Call read_file with start_line and end_line to inspect specific ranges ...]`;
      }

      // Add line numbers for high-precision model context
      const numberedContent = resultLines
        .map((line, idx) => {
          const lineNum = startIdx + idx;
          return `${String(lineNum).padStart(4, ' ')} | ${line}`;
        })
        .join('\n') + truncationNotice;

      return {
        success: true,
        path: fullPath,
        relativePath: path.relative(this.getWorkspaceRoot(), fullPath),
        totalLines,
        displayedLines: resultLines.length,
        startLine: startIdx,
        endLine: endIdx,
        content: numberedContent,
        rawContent: resultLines.join('\n'),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Writes or appends file content, creating directories if needed.
   */
  async writeFile({ path: filePath, content = '', overwrite = true, append = false }) {
    try {
      const fullPath = this.resolvePath(filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(fullPath) && !overwrite && !append) {
        return { success: false, error: `File already exists and overwrite is false: ${filePath}` };
      }

      if (append) {
        fs.appendFileSync(fullPath, content, 'utf8');
      } else {
        fs.writeFileSync(fullPath, content, 'utf8');
      }

      const stat = fs.statSync(fullPath);
      const lineCount = content.split(/\r?\n/).length;

      return {
        success: true,
        path: fullPath,
        relativePath: path.relative(this.getWorkspaceRoot(), fullPath),
        bytesWritten: stat.size,
        linesCount: lineCount,
        addedLines: lineCount,
        removedLines: 0,
        action: append ? 'appended' : 'written',
        message: `Successfully ${append ? 'appended to' : 'wrote'} ${path.relative(this.getWorkspaceRoot(), fullPath)} (${lineCount} lines, ${stat.size} bytes).`,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Generates a unified diff string between old and new text.
   */
  generateUnifiedDiff(filePath, oldStr, newStr) {
    const oldLines = oldStr.split(/\r?\n/);
    const newLines = newStr.split(/\r?\n/);
    const rel = path.relative(this.getWorkspaceRoot(), filePath).replace(/\\/g, '/');

    const diffLines = [
      `--- a/${rel}`,
      `+++ b/${rel}`,
    ];

    // Simple line-level diff presentation
    let i = 0;
    let j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        i++;
        j++;
      } else {
        const chunkOld = [];
        const chunkNew = [];
        while (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
          chunkOld.push(`- ${oldLines[i]}`);
          i++;
        }
        while (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
          chunkNew.push(`+ ${newLines[j]}`);
          j++;
        }
        diffLines.push(...chunkOld, ...chunkNew);
      }
    }

    return diffLines.join('\n');
  }

  /**
   * Surgical target-replacement file editor with diff generation.
   */
  async editFile({ path: filePath, target, replacement = '', multiple = false }) {
    try {
      const fullPath = this.resolvePath(filePath);
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }

      const original = fs.readFileSync(fullPath, 'utf8');

      // 1. Exact match attempt
      let updated = '';
      let matchCount = 0;

      if (original.includes(target)) {
        if (multiple) {
          const parts = original.split(target);
          matchCount = parts.length - 1;
          updated = parts.join(replacement);
        } else {
          matchCount = 1;
          const idx = original.indexOf(target);
          updated = original.slice(0, idx) + replacement + original.slice(idx + target.length);
        }
      } else {
        // 2. Whitespace-normalized fallback matching (CRLF vs LF)
        const normOriginal = original.replace(/\r\n/g, '\n');
        const normTarget = target.replace(/\r\n/g, '\n');

        if (normOriginal.includes(normTarget)) {
          if (multiple) {
            const parts = normOriginal.split(normTarget);
            matchCount = parts.length - 1;
            updated = parts.join(replacement.replace(/\r\n/g, '\n'));
          } else {
            matchCount = 1;
            const idx = normOriginal.indexOf(normTarget);
            updated = normOriginal.slice(0, idx) + replacement.replace(/\r\n/g, '\n') + normOriginal.slice(idx + normTarget.length);
          }
        } else {
          return {
            success: false,
            error: `Target string was not found in ${path.relative(this.getWorkspaceRoot(), fullPath)}. Please verify the exact lines and indentation.`,
          };
        }
      }

      fs.writeFileSync(fullPath, updated, 'utf8');
      const diff = this.generateUnifiedDiff(fullPath, original, updated);

      let addedLines = 0;
      let removedLines = 0;
      if (diff) {
        for (const line of diff.split(/\r?\n/)) {
          if (line.startsWith('+ ') || (line.startsWith('+') && !line.startsWith('+++'))) {
            addedLines++;
          } else if (line.startsWith('- ') || (line.startsWith('-') && !line.startsWith('---'))) {
            removedLines++;
          }
        }
      }

      return {
        success: true,
        path: fullPath,
        relativePath: path.relative(this.getWorkspaceRoot(), fullPath),
        replacementsCount: matchCount,
        diff,
        addedLines,
        removedLines,
        message: `Successfully edited ${path.relative(this.getWorkspaceRoot(), fullPath)} (${matchCount} occurrence${matchCount > 1 ? 's' : ''} replaced, +${addedLines} -${removedLines} lines).\n\n\`\`\`diff\n${diff.slice(0, 2000)}\n\`\`\``,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sandboxed command execution in active workspace root.
   */
  async runCommand({ command, cwd, timeout = 30000 }) {
    if (!command || typeof command !== 'string') {
      return { success: false, error: 'No command provided.' };
    }

    const workingDir = cwd ? this.resolvePath(cwd) : this.getWorkspaceRoot();

    // Guard against destructive system-level commands
    if (/(?:rmdir\s+\/s\s+[a-z]:\\|format\s+[a-z]:|diskpart|del\s+\/f\s+\/s\s+\/q\s+[a-z]:\\)/i.test(command)) {
      return {
        success: false,
        error: '⚠️ Command blocked by Grokki Harness sandbox: Destructive disk format or recursive root deletion is not allowed.',
      };
    }

    const startTime = Date.now();
    const effectiveTimeout = Math.min(timeout || 30000, this.maxCommandTimeout);

    return new Promise((resolve) => {
      const isWin = process.platform === 'win32';
      const shellCmd = isWin ? 'powershell.exe' : '/bin/bash';
      const shellArgs = isWin
        ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]
        : ['-c', command];

      const child = spawn(shellCmd, shellArgs, {
        cwd: workingDir,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      const timer = setTimeout(() => {
        isTimedOut = true;
        try { child.kill('SIGTERM'); } catch (_) {}
      }, effectiveTimeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > 500000) stdout = stdout.slice(-500000); // cap buffer
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > 500000) stderr = stderr.slice(-500000);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        const cleanOut = stdout.trim();
        const cleanErr = stderr.trim();

        if (isTimedOut) {
          resolve({
            success: false,
            exitCode: -1,
            stdout: cleanOut,
            stderr: cleanErr || `Command timed out after ${effectiveTimeout / 1000}s.`,
            durationMs,
            message: `⚠️ Command timed out after ${effectiveTimeout / 1000}s.`,
          });
          return;
        }

        const combined = cleanOut ? (cleanErr ? `${cleanOut}\n\n[stderr]\n${cleanErr}` : cleanOut) : (cleanErr || '(No output)');
        const summary = `\`\`\`bash\n$ ${command}\n\n${combined.slice(0, 4000)}\n\`\`\``;

        resolve({
          success: code === 0,
          exitCode: code || 0,
          stdout: cleanOut,
          stderr: cleanErr,
          durationMs,
          message: summary,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          exitCode: 1,
          stdout,
          stderr: err.message,
          durationMs: Date.now() - startTime,
          message: `Failed to spawn command: ${err.message}`,
        });
      });
    });
  }

  /**
   * Lists files and folders in a directory with depth limit.
   */
  async listDirectory({ path: dirPath, depth = 2, include_hidden = false }) {
    try {
      const fullPath = this.resolvePath(dirPath);
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `Directory not found: ${dirPath}` };
      }

      const ignoredNames = new Set([
        '.git', 'node_modules', 'dist', 'build', '.next', '.nuxt', '__pycache__',
        '.venv', 'venv', '.idea', '.vscode', '.gemini'
      ]);

      const items = [];

      const walk = (currentDir, currentDepth) => {
        if (currentDepth > depth) return;
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          if (!include_hidden && entry.name.startsWith('.')) continue;
          if (ignoredNames.has(entry.name)) continue;

          const itemPath = path.join(currentDir, entry.name);
          const relPath = path.relative(this.getWorkspaceRoot(), itemPath);

          if (entry.isDirectory()) {
            items.push({
              name: entry.name,
              relativePath: relPath,
              type: 'directory',
              depth: currentDepth,
            });
            walk(itemPath, currentDepth + 1);
          } else {
            let size = 0;
            try { size = fs.statSync(itemPath).size; } catch (_) {}
            items.push({
              name: entry.name,
              relativePath: relPath,
              type: 'file',
              size,
              depth: currentDepth,
            });
          }
        }
      };

      walk(fullPath, 1);

      return {
        success: true,
        root: fullPath,
        relativePath: path.relative(this.getWorkspaceRoot(), fullPath) || '.',
        totalItems: items.length,
        items: items.slice(0, 200),
        message: `Found ${items.length} items in \`${path.relative(this.getWorkspaceRoot(), fullPath) || '.'}\`:\n` +
          items.slice(0, 50).map(i => `${i.type === 'directory' ? '📁' : '📄'} ${i.relativePath} ${i.size ? `(${i.size}B)` : ''}`).join('\n') +
          (items.length > 50 ? `\n...and ${items.length - 50} more items.` : ''),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Fast text/regex search across codebase files.
   */
  async searchCode({ query, path: searchPath, file_pattern, is_regex = false, max_results = 40 }) {
    try {
      const root = this.resolvePath(searchPath);
      if (!fs.existsSync(root)) {
        return { success: false, error: `Search path does not exist: ${searchPath}` };
      }

      const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'build', '__pycache__', '.venv']);
      const results = [];
      let matcher;
      try {
        matcher = is_regex ? new RegExp(query, 'g') : null;
      } catch (e) {
        return { success: false, error: `Invalid regular expression: ${e.message}` };
      }

      const walk = (dir) => {
        if (results.length >= max_results) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (results.length >= max_results) break;
          if (ignoredDirs.has(entry.name) || entry.name.startsWith('.')) continue;

          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (entry.isFile()) {
            if (file_pattern && !entry.name.includes(file_pattern)) continue;
            // Only search text-based source files
            const ext = path.extname(entry.name).toLowerCase();
            const textExts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md', '.py', '.rs', '.go', '.java', '.c', '.cpp', '.h', '.sh', '.yaml', '.yml'];
            if (!textExts.includes(ext)) continue;

            try {
              const content = fs.readFileSync(full, 'utf8');
              const lines = content.split(/\r?\n/);
              for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                if (results.length >= max_results) break;
                const line = lines[lineIdx];
                const isMatch = matcher ? matcher.test(line) : line.toLowerCase().includes(query.toLowerCase());
                if (isMatch) {
                  results.push({
                    file: path.relative(this.getWorkspaceRoot(), full),
                    line: lineIdx + 1,
                    text: line.trim(),
                  });
                }
              }
            } catch (_) {}
          }
        }
      };

      walk(root);

      const formatted = results
        .map(r => `📄 ${r.file}:${r.line} -> ${r.text}`)
        .join('\n');

      return {
        success: true,
        query,
        count: results.length,
        results,
        message: results.length > 0
          ? `Found ${results.length} matches for "${query}":\n\n${formatted}`
          : `No matches found for "${query}" in workspace.`,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Git operations helper (status, diff, log, branch, add, commit).
   */
  async gitOperations({ action = 'status', args = {} }) {
    const cwd = this.getWorkspaceRoot();
    let cmd = 'git status -s';

    switch (action.toLowerCase()) {
      case 'status':
        cmd = 'git status -s';
        break;
      case 'diff':
        cmd = args.file ? `git diff -- "${args.file}"` : 'git diff';
        break;
      case 'log':
        cmd = 'git log -n 5 --oneline';
        break;
      case 'branch':
        cmd = 'git branch -a';
        break;
      case 'add':
        cmd = args.file ? `git add -- "${args.file}"` : 'git add .';
        break;
      case 'commit':
        if (!args.message) return { success: false, error: 'Commit message is required.' };
        cmd = `git commit -m "${args.message.replace(/"/g, '\\"')}"`;
        break;
      default:
        cmd = 'git status -s';
    }

    return await this.runCommand({ command: cmd, cwd });
  }
}

module.exports = new CodingAgentHarness();
