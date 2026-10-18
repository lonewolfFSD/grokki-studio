const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { dialog, shell } = require('electron');

class GitHubWorkspaceManager {
  constructor() {
    this.storagePath = path.resolve(__dirname, '../../data/github_tokens.json');
    this.token = null;
    this.profile = null;
    this.cachedRepos = [];
    this.loadSavedToken();
  }

  loadSavedToken() {
    if (fs.existsSync(this.storagePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
        if (data && data.token) {
          this.token = data.token;
          this.profile = data.profile || null;
        }
      } catch (e) {
        console.warn('[GitHub] Failed to load saved token:', e.message);
      }
    } else if (process.env.GITHUB_TOKEN) {
      this.token = process.env.GITHUB_TOKEN.trim();
    }
  }

  saveToken(token, profile) {
    this.token = token;
    this.profile = profile || null;
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storagePath, JSON.stringify({ token, profile }, null, 2), 'utf8');
    } catch (e) {
      console.warn('[GitHub] Failed to save token:', e.message);
    }
  }

  isConnected() {
    return Boolean(this.token && this.profile);
  }

  getProfile() {
    return this.profile;
  }

  async verifyToken(token) {
    const fetch = global.fetch || require('node-fetch');
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Grokki-Studio-Desktop',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub Authentication failed (${res.status}): ${text}`);
    }
    const user = await res.json();
    return {
      login: user.login,
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
      bio: user.bio || '',
      public_repos: user.public_repos || 0,
      total_private_repos: user.total_private_repos || 0,
      followers: user.followers || 0,
      following: user.following || 0,
      email: user.email || '',
      company: user.company || '',
      location: user.location || '',
    };
  }

  async connect(token) {
    try {
      const cleaned = (token || '').trim();
      if (!cleaned) throw new Error('Personal Access Token is empty');
      const profile = await this.verifyToken(cleaned);
      this.saveToken(cleaned, profile);
      return { success: true, profile };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  disconnect() {
    this.token = null;
    this.profile = null;
    this.cachedRepos = [];
    try {
      if (fs.existsSync(this.storagePath)) {
        fs.unlinkSync(this.storagePath);
      }
    } catch (e) {}
    return { success: true };
  }

  async getRepos({ perPage = 50, page = 1, sort = 'updated' } = {}) {
    if (!this.token) {
      return { success: false, error: 'Not connected to GitHub' };
    }
    try {
      const fetch = global.fetch || require('node-fetch');
      const res = await fetch(`https://api.github.com/user/repos?sort=${sort}&per_page=${perPage}&page=${page}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Grokki-Studio-Desktop',
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch repositories (${res.status})`);
      }
      const data = await res.json();
      const repos = (data || []).map((r) => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        description: r.description || '',
        html_url: r.html_url,
        clone_url: r.clone_url,
        ssh_url: r.ssh_url,
        default_branch: r.default_branch || 'main',
        private: Boolean(r.private),
        stargazers_count: r.stargazers_count || 0,
        forks_count: r.forks_count || 0,
        language: r.language || 'Code',
        updated_at: r.updated_at,
        pushed_at: r.pushed_at,
        open_issues_count: r.open_issues_count || 0,
      }));
      this.cachedRepos = repos;
      return { success: true, repos };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  execGit(command, cwd = process.cwd()) {
    return new Promise((resolve) => {
      exec(command, { cwd, timeout: 30000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (err, stdout, stderr) => {
        resolve({
          success: !err,
          stdout: (stdout || '').trim(),
          stderr: (stderr || '').trim(),
          error: err ? (stderr || stdout || err.message).trim() : null,
        });
      });
    });
  }

  async getGitStatus(cwd = process.cwd()) {
    try {
      const targetDir = cwd || process.cwd();

      // Check git installed
      const versionRes = await this.execGit('git --version', targetDir);
      if (!versionRes.success) {
        return { success: false, gitInstalled: false, error: 'Git CLI not found' };
      }
      const gitVersion = versionRes.stdout;

      // Check if git repo
      const isRepoRes = await this.execGit('git rev-parse --is-inside-work-tree', targetDir);
      if (!isRepoRes.success || isRepoRes.stdout !== 'true') {
        return {
          success: true,
          gitInstalled: true,
          gitVersion,
          isRepo: false,
          cwd: targetDir,
        };
      }

      // Branch
      const branchRes = await this.execGit('git branch --show-current', targetDir);
      const branch = branchRes.stdout || 'HEAD';

      // Remote URL
      const remoteUrlRes = await this.execGit('git config --get remote.origin.url', targetDir);
      const remoteUrl = remoteUrlRes.stdout || '';

      // Remote tracking branch
      const trackingRes = await this.execGit('git rev-parse --abbrev-ref --symbolic-full-name @{u}', targetDir);
      const remoteBranch = trackingRes.success ? trackingRes.stdout : null;

      // Ahead / behind count
      let ahead = 0;
      let behind = 0;
      if (remoteBranch) {
        const countsRes = await this.execGit(`git rev-list --left-right --count HEAD...${remoteBranch}`, targetDir);
        if (countsRes.success && countsRes.stdout) {
          const parts = countsRes.stdout.split(/\s+/);
          ahead = parseInt(parts[0], 10) || 0;
          behind = parseInt(parts[1], 10) || 0;
        }
      }

      // Status porcelain
      const statusRes = await this.execGit('git status --porcelain', targetDir);
      const rawLines = statusRes.stdout ? statusRes.stdout.split('\n') : [];
      let modifiedCount = 0;
      let stagedCount = 0;
      let untrackedCount = 0;
      const files = [];

      for (const line of rawLines) {
        if (!line.trim()) continue;
        const indexStatus = line[0];
        const worktreeStatus = line[1];
        const filePath = line.slice(3).trim();

        if (indexStatus === '?' && worktreeStatus === '?') {
          untrackedCount++;
          files.push({ path: filePath, status: 'untracked' });
        } else {
          if (indexStatus !== ' ' && indexStatus !== '?') stagedCount++;
          if (worktreeStatus !== ' ' && worktreeStatus !== '?') modifiedCount++;
          files.push({
            path: filePath,
            status: indexStatus !== ' ' ? 'staged' : 'modified',
            code: line.slice(0, 2),
          });
        }
      }

      // Recent 5 commits
      const logRes = await this.execGit('git log -n 5 --format="%h|%an|%ar|%s"', targetDir);
      const recentCommits = logRes.success && logRes.stdout
        ? logRes.stdout.split('\n').filter(Boolean).map((line) => {
            const [hash, author, date, message] = line.split('|');
            return { hash, author, date, message };
          })
        : [];

      return {
        success: true,
        gitInstalled: true,
        gitVersion,
        isRepo: true,
        cwd: targetDir,
        branch,
        remoteUrl,
        remoteBranch,
        ahead,
        behind,
        modifiedCount,
        stagedCount,
        untrackedCount,
        files: files.slice(0, 50),
        recentCommits,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async gitFetch(cwd = process.cwd()) {
    const res = await this.execGit('git fetch', cwd);
    return {
      success: res.success,
      output: res.stdout || res.stderr || 'Fetch completed successfully',
      error: res.error,
    };
  }

  async gitPull(cwd = process.cwd()) {
    const res = await this.execGit('git pull', cwd);
    return {
      success: res.success,
      output: res.stdout || res.stderr || 'Pull completed successfully',
      error: res.error,
    };
  }

  async gitPush(cwd = process.cwd(), { branch } = {}) {
    let cmd = 'git push';
    if (branch) {
      cmd = `git push -u origin ${branch}`;
    }
    const res = await this.execGit(cmd, cwd);
    return {
      success: res.success,
      output: res.stdout || res.stderr || 'Push completed successfully',
      error: res.error,
    };
  }

  async gitCommit(cwd = process.cwd(), { message, stageAll = true }) {
    if (!message || !message.trim()) {
      return { success: false, error: 'Commit message is required' };
    }
    if (stageAll) {
      const addRes = await this.execGit('git add -A', cwd);
      if (!addRes.success) return { success: false, error: addRes.error };
    }
    const escapedMsg = message.replace(/"/g, '\\"');
    const commitRes = await this.execGit(`git commit -m "${escapedMsg}"`, cwd);
    return {
      success: commitRes.success,
      output: commitRes.stdout || commitRes.stderr,
      error: commitRes.error,
    };
  }

  async gitClone(cloneUrl, targetPath) {
    let destination = targetPath;
    if (!destination) {
      const result = await dialog.showOpenDialog({
        title: 'Select Destination Folder to Clone Repository',
        properties: ['openDirectory', 'createDirectory'],
      });
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      destination = result.filePaths[0];
    }
    const repoName = path.basename(cloneUrl, '.git');
    const fullDest = path.join(destination, repoName);
    const res = await this.execGit(`git clone "${cloneUrl}" "${fullDest}"`, destination);
    return {
      success: res.success,
      targetPath: fullDest,
      output: res.stdout || res.stderr,
      error: res.error,
    };
  }

  async selectDirectory() {
    const result = await dialog.showOpenDialog({
      title: 'Select Git Repository Directory',
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true };
    }
    const selected = result.filePaths[0];
    const status = await this.getGitStatus(selected);
    return { success: true, path: selected, status };
  }
}

module.exports = new GitHubWorkspaceManager();
