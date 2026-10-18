const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { exec } = require('child_process');
const { dialog, shell, Notification } = require('electron');

class GitHubWorkspaceManager {
  constructor() {
    this.storagePath = path.resolve(__dirname, '../../data/github_tokens.json');
    this.credentialsPath = path.resolve(__dirname, '../../data/github_credentials.json');
    this.port = 8587;
    this.redirectUri = `http://localhost:${this.port}/githubcallback`;
    this.token = null;
    this.profile = null;
    this.authServer = null;
    this.cachedRepos = [];
    this.loadSavedToken();
  }

  getClientCredentials() {
    // 1. From environment variables
    const envId = (process.env.GITHUB_CLIENT_ID || '').trim();
    const envSecret = (process.env.GITHUB_CLIENT_SECRET || '').trim();
    if (envId && envSecret) {
      return { clientId: envId, clientSecret: envSecret };
    }

    // 2. From data/github_credentials.json
    if (fs.existsSync(this.credentialsPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
        const creds = raw.installed || raw.web || raw;
        if (creds.client_id && creds.client_secret) {
          return { clientId: creds.client_id, clientSecret: creds.client_secret };
        }
      } catch (e) {}
    }

    // 3. Built-in default OAuth application credentials (FOR ALL USERS)
    return {
      clientId: 'Iv23li2d4mthyD4gFupe',
      clientSecret: '3413f0010ec856360de4d2b07edd828bf08467a8',
    };
  }

  saveCredentials(clientId, clientSecret) {
    try {
      const dir = path.dirname(this.credentialsPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        this.credentialsPath,
        JSON.stringify({ client_id: clientId.trim(), client_secret: clientSecret.trim() }, null, 2),
        'utf8'
      );
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  openOAuthPortal() {
    const params = new URLSearchParams({
      'oauth_application[name]': 'Grokki Studio',
      'oauth_application[url]': 'http://localhost:8587',
      'oauth_application[callback_url]': this.redirectUri,
    });
    shell.openExternal(`https://github.com/settings/applications/new?${params.toString()}`);
  }

  loadSavedToken() {
    if (fs.existsSync(this.storagePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
        if (data && data.token) {
          this.token = data.token;
          this.profile = data.profile || null;
          return;
        }
      } catch (e) {
        console.warn('[GitHub] Failed to load saved token:', e.message);
      }
    } else if (process.env.GITHUB_TOKEN) {
      this.token = process.env.GITHUB_TOKEN.trim();
      return;
    }

    // Clean initial state: not connected until user authorizes
    this.token = null;
    this.profile = null;
  }

  saveToken(token, profile) {
    this.token = token;
    this.profile = profile || null;
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        this.storagePath,
        JSON.stringify({ token, profile, connectedAt: new Date().toISOString() }, null, 2),
        'utf8'
      );
    } catch (e) {
      console.warn('[GitHub] Failed to save token:', e.message);
    }
  }

  isConnected() {
    return Boolean(this.token);
  }

  getProfile() {
    return this.profile;
  }

  async getStatus() {
    if (this.token && !this.profile) {
      try {
        this.profile = await this.verifyToken(this.token);
        this.saveToken(this.token, this.profile);
      } catch (e) {
        console.warn('[GitHub] Auto-verify token failed:', e.message);
        this.token = null;
        this.profile = null;
      }
    }
    const creds = this.getClientCredentials();
    return {
      connected: this.isConnected(),
      profile: this.getProfile(),
      hasCredentials: Boolean(creds),
    };
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

  /**
   * 1-Click Interactive GitHub OAuth 2.0 Flow via browser on port 8587
   */
  async startOAuthFlow(onSuccessCallback) {
    const creds = this.getClientCredentials();
    if (!creds) {
      return {
        success: false,
        needsCredentials: true,
        message: 'GitHub OAuth credentials (Client ID & Secret) are not yet configured.',
      };
    }

    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
      creds.clientId
    )}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=repo,read:user,user:email&state=${state}`;

    if (this.authServer) {
      try {
        this.authServer.close();
      } catch (e) {}
      this.authServer = null;
    }

    return new Promise((resolve) => {
      let handled = false;

      this.authServer = http.createServer(async (req, res) => {
        try {
          const reqUrl = url.parse(req.url, true);
          if (reqUrl.pathname === '/githubcallback') {
            const code = reqUrl.query.code;
            const error = reqUrl.query.error;
            const errorDescription = reqUrl.query.error_description;

            if (error) {
              handled = true;
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #08090d; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                    <div style="background: rgba(255,255,255,0.05); padding: 40px; border-radius: 16px; border: 1px solid rgba(239,68,68,0.3); text-align: center; max-width: 440px;">
                      <h2 style="color: #ef4444; margin: 0 0 12px 0; font-size: 20px;">GitHub Authorization Cancelled</h2>
                      <p style="color: #9aa0a6; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">${errorDescription || error}</p>
                      <p style="color: #9aa0a6; font-size: 13px;">You can close this tab and return to Grokki Studio.</p>
                    </div>
                  </body>
                </html>
              `);
              try { this.authServer.close(); } catch (e) {}
              this.authServer = null;
              return;
            }

            if (code) {
              handled = true;
              const fetch = global.fetch || require('node-fetch');
              const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                  'User-Agent': 'Grokki-Studio-Desktop',
                },
                body: JSON.stringify({
                  client_id: creds.clientId,
                  client_secret: creds.clientSecret,
                  code,
                  redirect_uri: this.redirectUri,
                }),
              });

              const tokenData = await tokenRes.json();
              if (tokenData.error || !tokenData.access_token) {
                throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code for access token');
              }

              const accessToken = tokenData.access_token;
              const profile = await this.verifyToken(accessToken);
              this.saveToken(accessToken, profile);

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #08090d; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                    <div style="background: rgba(255,255,255,0.05); padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); text-align: center; max-width: 440px;">
                      <img src="${profile.avatar_url || ''}" style="width: 64px; height: 64px; border-radius: 50%; margin-bottom: 16px; border: 2px solid #10b981;" />
                      <h2 style="margin: 0 0 12px 0; font-size: 20px;">Connected to GitHub!</h2>
                      <p style="color: #9aa0a6; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">Grokki is now linked to <b>@${profile.login}</b> (${profile.name || profile.login}). Git repositories and push/pull sync are ready.</p>
                      <p style="color: #10b981; font-weight: 600; font-size: 13px;">You can close this tab and return to Grokki Studio.</p>
                    </div>
                  </body>
                </html>
              `);

              if (Notification.isSupported()) {
                new Notification({
                  title: 'GitHub Connected',
                  body: `Grokki successfully linked to @${profile.login}!`,
                }).show();
              }

              if (typeof onSuccessCallback === 'function') {
                onSuccessCallback(profile);
              }

              try {
                this.authServer.close();
              } catch (e) {}
              this.authServer = null;
            } else {
              res.writeHead(400);
              res.end('Authorization code missing.');
              try { this.authServer.close(); } catch (e) {}
              this.authServer = null;
            }
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #08090d; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                <div style="background: rgba(255,255,255,0.05); padding: 40px; border-radius: 16px; border: 1px solid rgba(239,68,68,0.3); text-align: center; max-width: 440px;">
                  <h2 style="color: #ef4444; margin: 0 0 12px 0; font-size: 20px;">Connection Error</h2>
                  <p style="color: #9aa0a6; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">${err.message}</p>
                </div>
              </body>
            </html>
          `);
          try { this.authServer.close(); } catch (e) {}
          this.authServer = null;
        }
      });

      this.authServer.listen(this.port, () => {
        shell.openExternal(authUrl);
        resolve({
          success: true,
          mode: 'oauth',
          message: 'GitHub Authorization opened in your browser! Authorize access to complete connection.',
        });
      });

      this.authServer.on('error', (err) => {
        resolve({ success: false, message: `Could not start local GitHub auth server on port ${this.port}: ${err.message}` });
      });

      // 5-minute cleanup timeout
      setTimeout(() => {
        if (!handled && this.authServer) {
          try {
            this.authServer.close();
          } catch (e) {}
          this.authServer = null;
        }
      }, 300000);
    });
  }

  async connect(candidateToken, onSuccessCallback) {
    if (candidateToken && typeof candidateToken === 'string' && candidateToken.trim()) {
      try {
        const clean = candidateToken.trim();
        const profile = await this.verifyToken(clean);
        this.saveToken(clean, profile);
        return {
          success: true,
          mode: 'token',
          profile,
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // Interactive OAuth 2.0 Flow
    return this.startOAuthFlow(onSuccessCallback);
  }

  async restoreDefaultOAuth() {
    return this.startOAuthFlow();
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
      const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
      if (this.token) {
        env.GITHUB_TOKEN = this.token;
        env.GH_TOKEN = this.token;
      }
      exec(command, { cwd, timeout: 30000, env }, (err, stdout, stderr) => {
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
