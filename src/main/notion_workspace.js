const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

class NotionWorkspaceManager {
  constructor() {
    this.tokenPath = path.resolve(__dirname, '../../data/notion_tokens.json');
    this.token = null;
    this.profile = null;
    this.notionVersion = '2022-06-28';
    this.loadSavedToken();
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
      throw new Error('A valid Notion Integration Secret (starting with secret_ or ntn_) is required.');
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

  async connect(candidateToken) {
    try {
      let tokenToTry = candidateToken;

      // If no token was passed, check if one already exists in saved tokens or env
      if (!tokenToTry) {
        if (this.token) {
          tokenToTry = this.token;
        } else if (process.env.NOTION_API_KEY) {
          tokenToTry = process.env.NOTION_API_KEY;
        }
      }

      if (!tokenToTry) {
        return {
          success: false,
          needsInput: true,
          message: 'No Notion token provided. Please enter your Notion Internal Integration Token.',
        };
      }

      const { token, profile } = await this.verifyToken(tokenToTry);
      this.saveTokenData(token, profile);

      return {
        success: true,
        message: `Successfully connected to Notion workspace: "${profile.workspaceName}"`,
        profile,
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

  // Quick API tool helpers for Grokki
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

    // Search for a suitable parent page or return error if none accessible
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
