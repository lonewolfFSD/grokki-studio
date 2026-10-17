const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { shell, Notification } = require('electron');

class NotionWorkspaceManager {
  constructor() {
    this.tokenPath = path.resolve(__dirname, '../../data/notion_tokens.json');
    this.credentialsPath = path.resolve(__dirname, '../../data/notion_credentials.json');
    this.port = 8586;
    this.redirectUri = `http://127.0.0.1:${this.port}/notioncallback`;
    this.notionVersion = '2022-06-28';

    this.token = null;
    this.profile = null;
    this.authServer = null;

    this.loadSavedToken();
  }

  getClientCredentials() {
    // 1. From environment variables
    const envId = (process.env.NOTION_CLIENT_ID || '').trim();
    const envSecret = (process.env.NOTION_CLIENT_SECRET || '').trim();
    if (envId && envSecret) {
      return { clientId: envId, clientSecret: envSecret };
    }

    // 2. From data/notion_credentials.json
    if (fs.existsSync(this.credentialsPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
        const creds = raw.installed || raw.web || raw;
        if (creds.client_id && creds.client_secret) {
          return { clientId: creds.client_id, clientSecret: creds.client_secret };
        }
      } catch (e) {}
    }

    return null;
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

  loadSavedToken() {
    // 1. Check data/notion_tokens.json
    if (fs.existsSync(this.tokenPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
        if (data && data.token) {
          this.token = data.token;
          this.profile = data.profile || {
            workspaceName: data.workspaceName || 'Personal Workspace',
            botName: data.botName || 'Grokki Assistant',
          };
          return;
        }
      } catch (e) {
        console.warn('[Notion] Failed to parse saved token:', e.message);
      }
    }

    // 2. Fallback to process.env.NOTION_API_KEY
    if (process.env.NOTION_API_KEY) {
      this.token = process.env.NOTION_API_KEY.trim();
      this.profile = {
        workspaceName: 'Notion Workspace (Env)',
        botName: 'Grokki Assistant',
      };
    }
  }

  saveTokenData(token, profile) {
    this.token = token;
    this.profile = profile;
    try {
      const dir = path.dirname(this.tokenPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.tokenPath,
        JSON.stringify(
          {
            token,
            profile,
            connectedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (e) {
      console.warn('[Notion] Failed to save token to disk:', e.message);
    }
  }

  isConnected() {
    return !!this.token;
  }

  getProfile() {
    return this.profile || null;
  }

  async verifyToken(candidateToken) {
    if (!candidateToken || typeof candidateToken !== 'string') {
      throw new Error('A valid Notion token (starting with secret_ or ntn_) is required.');
    }

    const cleanToken = candidateToken.trim();

    // Query Notion's /v1/users/me endpoint to verify bot and workspace
    const res = await fetch('https://api.notion.com/v1/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Notion-Version': this.notionVersion,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      let parsed = null;
      try {
        parsed = JSON.parse(errText);
      } catch (e) {}
      const errMsg = parsed?.message || `Notion API rejected token with HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    const data = await res.json();
    const bot = data?.bot || {};
    const workspaceName =
      bot.workspace_name ||
      data?.name ||
      'Connected Workspace';

    const profile = {
      workspaceName,
      botName: data?.name || 'Grokki Integration',
      workspaceIcon: data?.avatar_url || null,
      ownerEmail: bot.owner?.user?.person?.email || null,
    };

    return { token: cleanToken, profile };
  }

  /**
   * 1-Click Interactive Notion OAuth 2.0 Flow
   */
  async startOAuthFlow(onSuccessCallback) {
    const creds = this.getClientCredentials();
    if (!creds) {
      return {
        success: false,
        needsCredentials: true,
        message: 'No Notion OAuth credentials configured yet. Enter client credentials or connect via Integration Token.',
      };
    }

    const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${encodeURIComponent(
      creds.clientId
    )}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(this.redirectUri)}`;

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
          if (reqUrl.pathname === '/notioncallback') {
            const code = reqUrl.query.code;
            if (code) {
              handled = true;

              // Exchange OAuth code for Notion access_token
              const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
              const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
                method: 'POST',
                headers: {
                  Authorization: `Basic ${basicAuth}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  grant_type: 'authorization_code',
                  code,
                  redirect_uri: this.redirectUri,
                }),
              });

              if (!tokenRes.ok) {
                const errBody = await tokenRes.text();
                throw new Error(`Token exchange failed: ${errBody}`);
              }

              const data = await tokenRes.json();
              const accessToken = data.access_token;
              const profile = {
                workspaceName: data.workspace_name || 'Notion Workspace',
                workspaceIcon: data.workspace_icon || null,
                botName: data.bot_id ? `Bot (${data.bot_id.slice(0, 8)})` : 'Grokki Assistant',
                ownerEmail: data.owner?.user?.person?.email || null,
              };

              this.saveTokenData(accessToken, profile);

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #08090d; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                    <div style="background: rgba(255,255,255,0.05); padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); text-align: center; max-width: 440px;">
                      <h2 style="margin: 0 0 12px 0; font-size: 20px;">Connected to Notion!</h2>
                      <p style="color: #9aa0a6; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">Grokki is now linked to <b>${profile.workspaceName}</b>. Pages, notes, and databases are ready to sync.</p>
                      <p style="color: #10b981; font-weight: 600; font-size: 13px;">You can close this tab and return to Grokki Studio.</p>
                    </div>
                  </body>
                </html>
              `);

              if (Notification.isSupported()) {
                new Notification({
                  title: 'Notion Connected',
                  body: `Grokki successfully linked to "${profile.workspaceName}"!`,
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
              try {
                this.authServer.close();
              } catch (e) {}
              this.authServer = null;
            }
          }
        } catch (err) {
          res.writeHead(500);
          res.end(`Error: ${err.message}`);
          try {
            this.authServer.close();
          } catch (e) {}
          this.authServer = null;
        }
      });

      this.authServer.listen(this.port, '127.0.0.1', () => {
        shell.openExternal(authUrl);
        resolve({
          success: true,
          mode: 'oauth',
          message: 'Notion Authorization opened in your browser! Authorize access to complete connection.',
        });
      });

      this.authServer.on('error', (err) => {
        resolve({ success: false, message: `Could not start local Notion auth server: ${err.message}` });
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
    try {
      // 1. If explicit token is provided, verify and link directly
      if (candidateToken && typeof candidateToken === 'string' && candidateToken.trim()) {
        const { token, profile } = await this.verifyToken(candidateToken);
        this.saveTokenData(token, profile);
        return {
          success: true,
          mode: 'token',
          message: `Successfully connected to Notion workspace: "${profile.workspaceName}"`,
          profile,
        };
      }

      // 2. If OAuth credentials exist, start 1-click OAuth in browser
      const creds = this.getClientCredentials();
      if (creds) {
        return await this.startOAuthFlow(onSuccessCallback);
      }

      // 3. If a saved token or process.env token exists, verify it
      if (this.token) {
        const { token, profile } = await this.verifyToken(this.token);
        this.saveTokenData(token, profile);
        return {
          success: true,
          mode: 'token',
          message: `Connected to saved Notion workspace: "${profile.workspaceName}"`,
          profile,
        };
      }

      return {
        success: false,
        needsInput: true,
        message: 'Configure Notion OAuth credentials or enter an Integration Token to link your workspace.',
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Failed to authenticate with Notion API',
      };
    }
  }

  disconnect() {
    this.token = null;
    this.profile = null;
    if (fs.existsSync(this.tokenPath)) {
      try {
        fs.unlinkSync(this.tokenPath);
      } catch (e) {}
    }
    return { success: true };
  }

  openNotionIntegrationsPortal() {
    shell.openExternal('https://www.notion.so/profile/integrations');
  }

  async search(query = '') {
    if (!this.token) throw new Error('Notion is not connected.');

    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': this.notionVersion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        page_size: 15,
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion Search Error: ${err}`);
    }

    return await res.json();
  }

  async createQuickNote(title, content) {
    if (!this.token) throw new Error('Notion is not connected.');

    const searchRes = await this.search('');
    const firstPage = (searchRes.results || []).find((r) => r.object === 'page');

    if (!firstPage) {
      throw new Error('No accessible Notion pages found. Please invite your integration to at least one page.');
    }

    const payload = {
      parent: { page_id: firstPage.id },
      properties: {
        title: [
          {
            text: {
              content: title || 'Quick Note from Grokki',
            },
          },
        ],
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: content || '',
                },
              },
            ],
          },
        },
      ],
    };

    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': this.notionVersion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion Create Page Error: ${err}`);
    }

    return await res.json();
  }
}

module.exports = new NotionWorkspaceManager();
