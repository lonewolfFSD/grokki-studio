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

  setMentions(mentions = []) {
    this.activeMentions = Array.isArray(mentions) ? mentions : [];
  }

  syncContext(context = {}) {
    if (context && context.workspaceRoot) {
      this.setWorkspaceRoot(context.workspaceRoot);
    }
    if (context && context.permission) {
      this.setPermissionLevel(context.permission);
    }
    const mentions = [
      ...((context && context.projectMentions) || []),
      ...((context && context.workspaceContext) || []),
      ...((context && context.attachedFile) ? [context.attachedFile] : []),
    ];
    this.setMentions(mentions);
  }

  findFileInRoot(rootDir, targetName, maxDepth = 4, currentDepth = 0) {
    if (currentDepth > maxDepth || !fs.existsSync(rootDir)) return null;
    try {
      const entries = fs.readdirSync(rootDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build' || entry.name === 'AppData') continue;
        const full = path.join(rootDir, entry.name);
        if (entry.isFile() && entry.name.toLowerCase() === targetName.toLowerCase()) {
          return full;
        }
        if (entry.isDirectory()) {
          const found = this.findFileInRoot(full, targetName, maxDepth, currentDepth + 1);
          if (found) return found;
        }
      }
    } catch (_) {}
    return null;
  }

  resolvePath(targetPath) {
    if (!targetPath) return this.getWorkspaceRoot();
    let cleanPath = String(targetPath).trim();
    if (cleanPath.startsWith('@')) {
      cleanPath = cleanPath.slice(1).trim();
    }
    cleanPath = cleanPath.replace(/^['"]|['"]$/g, '');

    // 1. Check if an active mention matches this filename or relative path
    if (Array.isArray(this.activeMentions) && this.activeMentions.length > 0) {
      const baseClean = path.basename(cleanPath).toLowerCase();
      for (const m of this.activeMentions) {
        const full = m?.fullPath || (typeof m === 'string' ? m : m?.path);
        if (full && fs.existsSync(full)) {
          if (path.basename(full).toLowerCase() === baseClean || (m.name && m.name.toLowerCase() === baseClean)) {
            return path.normalize(full);
          }
        }
      }
    }

    // 2. Absolute path check
    if (path.isAbsolute(cleanPath)) return path.normalize(cleanPath);

    // 3. Direct path in workspace root
    const root = this.getWorkspaceRoot();
    const direct = path.normalize(path.join(root, cleanPath));
    if (fs.existsSync(direct)) return direct;

    // 4. Recursive lookup within workspace root if relative path wasn't found directly
    const base = path.basename(cleanPath);
    if (base && !cleanPath.includes('/') && !cleanPath.includes('\\')) {
      const foundInRoot = this.findFileInRoot(root, base);
      if (foundInRoot) return path.normalize(foundInRoot);
    }

    return direct;
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
      const existedBefore = fs.existsSync(fullPath);
      const originalContent = existedBefore ? fs.readFileSync(fullPath, 'utf8') : null;
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
        backup: {
          path: fullPath,
          relativePath: path.relative(this.getWorkspaceRoot(), fullPath),
          originalContent,
          existedBefore,
        },
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
  async editFile(args = {}) {
    const { path: filePath, target, multiple = false } = args;
    const rep = args.replacement !== undefined ? args.replacement : (args.content !== undefined ? args.content : (args.code || ''));

    try {
      const fullPath = this.resolvePath(filePath);
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }

      // Guard against dummy language mismatch placeholders (e.g. LLM inserting dummy JS in Python)
      if (fullPath.toLowerCase().endsWith('.py') && (/console\.log\s*\(/i.test(rep) || /\bfunction\s+[a-zA-Z0-9_]+\s*\(/i.test(rep))) {
        return { success: false, error: 'Rejected invalid JavaScript placeholder in Python file. Provide valid Python code implementation.' };
      }

      const original = fs.readFileSync(fullPath, 'utf8');
      const backup = {
        path: fullPath,
        relativePath: path.relative(this.getWorkspaceRoot(), fullPath),
        originalContent: original,
        existedBefore: true,
      };

      // Check if target is missing, empty, or equals original (full file rewrite)
      if (!target || target.trim() === '' || target.trim() === original.trim()) {
        fs.writeFileSync(fullPath, rep, 'utf8');
        const diff = this.generateUnifiedDiff(fullPath, original, rep);
        let addedLines = 0;
        let removedLines = 0;
        if (diff) {
          for (const line of diff.split(/\r?\n/)) {
            if (line.startsWith('+ ') || (line.startsWith('+') && !line.startsWith('+++'))) addedLines++;
            else if (line.startsWith('- ') || (line.startsWith('-') && !line.startsWith('---'))) removedLines++;
          }
        }
        return {
          success: true,
          path: fullPath,
          relativePath: path.relative(this.getWorkspaceRoot(), fullPath),
          replacementsCount: 1,
          diff,
          addedLines,
          removedLines,
          backup,
          message: `Successfully updated ${path.relative(this.getWorkspaceRoot(), fullPath)} (+${addedLines} -${removedLines} lines).\n\n\`\`\`diff\n${(diff || '').slice(0, 2000)}\n\`\`\``,
        };
      }

      // 1. Exact match attempt
      let updated = '';
      let matchCount = 0;

      if (original.includes(target)) {
        if (multiple) {
          const parts = original.split(target);
          matchCount = parts.length - 1;
          updated = parts.join(rep);
        } else {
          matchCount = 1;
          const idx = original.indexOf(target);
          updated = original.slice(0, idx) + rep + original.slice(idx + target.length);
        }
      } else {
        // 2. Whitespace-normalized fallback matching (CRLF vs LF)
        const normOriginal = original.replace(/\r\n/g, '\n');
        const normTarget = target.replace(/\r\n/g, '\n');
        const normRep = rep.replace(/\r\n/g, '\n');

        if (normOriginal.includes(normTarget)) {
          if (multiple) {
            const parts = normOriginal.split(normTarget);
            matchCount = parts.length - 1;
            updated = parts.join(normRep);
          } else {
            matchCount = 1;
            const idx = normOriginal.indexOf(normTarget);
            updated = normOriginal.slice(0, idx) + normRep + normOriginal.slice(idx + normTarget.length);
          }
        } else {
          // 3. Line-by-line trimmed comparison (tolerant to indentation/whitespace differences)
          const origLines = normOriginal.split('\n');
          const targetLines = normTarget.split('\n').filter(l => l.trim().length > 0);

          let foundStart = -1;
          let foundEnd = -1;

          if (targetLines.length > 0 && targetLines.length <= origLines.length) {
            for (let i = 0; i <= origLines.length - targetLines.length; i++) {
              let matches = true;
              for (let j = 0; j < targetLines.length; j++) {
                if (origLines[i + j].trim() !== targetLines[j].trim()) {
                  matches = false;
                  break;
                }
              }
              if (matches) {
                foundStart = i;
                foundEnd = i + targetLines.length;
                break;
              }
            }
          }

          if (foundStart >= 0) {
            matchCount = 1;
            const before = origLines.slice(0, foundStart).join('\n');
            const after = origLines.slice(foundEnd).join('\n');
            updated = (before ? before + '\n' : '') + normRep + (after ? '\n' + after : '');
          } else {
            // 4. Quote-and-punctuation insensitive line comparison (' vs " and spacing)
            const cleanLine = (l) => (l || '').replace(/['"`]/g, '"').replace(/\s+/g, ' ').trim();
            const cleanOrig = origLines.map(cleanLine);
            const cleanTarget = targetLines.map(cleanLine);

            let cleanStart = -1;
            let cleanEnd = -1;
            if (cleanTarget.length > 0 && cleanTarget.length <= cleanOrig.length) {
              for (let i = 0; i <= cleanOrig.length - cleanTarget.length; i++) {
                let matches = true;
                for (let j = 0; j < cleanTarget.length; j++) {
                  if (cleanOrig[i + j] !== cleanTarget[j]) {
                    matches = false;
                    break;
                  }
                }
                if (matches) {
                  cleanStart = i;
                  cleanEnd = i + cleanTarget.length;
                  break;
                }
              }
            }

            if (cleanStart >= 0) {
              matchCount = 1;
              const before = origLines.slice(0, cleanStart).join('\n');
              const after = origLines.slice(cleanEnd).join('\n');
              updated = (before ? before + '\n' : '') + normRep + (after ? '\n' + after : '');
            } else if (normRep.trim().length > 0 && (origLines.length <= 120 || normRep.split('\n').length >= origLines.length * 0.6)) {
              // 5. Smart rewrite fallback: if file is small (<120 lines) or replacement is substantial,
              // replace file content so agent improvements are reliably applied to disk
              console.log(`[CodingAgent] Target match fallback: rewriting full content of ${path.relative(this.getWorkspaceRoot(), fullPath)}`);
              matchCount = 1;
              updated = normRep;
            } else {
              console.error(`[CodingAgent] editFile failed: target string not found in ${fullPath}`);
              return {
                success: false,
                error: `Target string was not found in ${path.relative(this.getWorkspaceRoot(), fullPath)}. Please verify the exact lines and indentation.`,
              };
            }
          }
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
        backup,
        message: `Successfully edited ${path.relative(this.getWorkspaceRoot(), fullPath)} (${matchCount} occurrence${matchCount > 1 ? 's' : ''} replaced, +${addedLines} -${removedLines} lines).\n\n\`\`\`diff\n${diff.slice(0, 2000)}\n\`\`\``,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Applies reverse of a unified diff to a file on disk.
   */
  applyReverseDiff(fullPath, diffText) {
    try {
      if (!fs.existsSync(fullPath) || !diffText || typeof diffText !== 'string') return false;
      const curContent = fs.readFileSync(fullPath, 'utf8');
      const lines = diffText.split(/\r?\n/);
      const added = [];
      const removed = [];
      for (const line of lines) {
        if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) continue;
        if (line.startsWith('+')) added.push(line.slice(1));
        else if (line.startsWith('-')) removed.push(line.slice(1));
      }
      const addedBlock = added.join('\n');
      const removedBlock = removed.join('\n');
      if (addedBlock && curContent.includes(addedBlock)) {
        const restored = curContent.replace(addedBlock, removedBlock);
        fs.writeFileSync(fullPath, restored, 'utf8');
        return true;
      }
    } catch (_) {}
    return false;
  }

  /**
   * Reverts files back to their original state prior to tool modifications.
   */
  async revertFileBackups(backups = [], workspaceRoot = null) {
    if (workspaceRoot && typeof workspaceRoot === 'string') {
      this.setWorkspaceRoot(workspaceRoot);
    }
    const root = this.getWorkspaceRoot();
    const results = [];
    if (!Array.isArray(backups)) return results;

    for (const b of backups) {
      if (!b || !b.path) continue;
      try {
        let fullPath = path.isAbsolute(b.path) ? path.normalize(b.path) : path.normalize(path.join(root, b.path));
        if (!fs.existsSync(fullPath)) {
          const fileName = path.basename(b.path);
          const found = this.findFileInRoot(root, fileName);
          if (found) fullPath = path.normalize(found);
        }

        let restored = false;
        if (b.existedBefore && typeof b.originalContent === 'string') {
          fs.writeFileSync(fullPath, b.originalContent, 'utf8');
          console.log(`[CodingAgent] Restored file to original content: ${fullPath}`);
          results.push({ path: fullPath, success: true, action: 'reverted' });
          restored = true;
        } else if (b.existedBefore === false && fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`[CodingAgent] Deleted newly created file: ${fullPath}`);
          results.push({ path: fullPath, success: true, action: 'deleted' });
          restored = true;
        } else if (typeof b.originalContent === 'string') {
          fs.writeFileSync(fullPath, b.originalContent, 'utf8');
          console.log(`[CodingAgent] Restored file: ${fullPath}`);
          results.push({ path: fullPath, success: true, action: 'reverted' });
          restored = true;
        } else if (b.diff && typeof b.diff === 'string' && fs.existsSync(fullPath)) {
          const reversed = this.applyReverseDiff(fullPath, b.diff);
          if (reversed) {
            console.log(`[CodingAgent] Restored file via reverse diff: ${fullPath}`);
            results.push({ path: fullPath, success: true, action: 'reverted' });
            restored = true;
          }
        }

        // Only fallback to git checkout if not already restored
        if (!restored && fs.existsSync(fullPath)) {
          try {
            const fileDir = path.dirname(fullPath);
            const { execSync } = require('child_process');
            execSync(`git checkout -- "${path.basename(fullPath)}"`, { cwd: fileDir, stdio: 'ignore' });
            results.push({ path: fullPath, success: true, action: 'git_checkout' });
          } catch (_) {}
        }
      } catch (err) {
        console.error(`[CodingAgent] Failed to revert ${b.path}:`, err.message);
        results.push({ path: b.path, success: false, error: err.message });
      }
    }
    return results;
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
