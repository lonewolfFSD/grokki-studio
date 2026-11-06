const fs = require('fs');
const path = require('path');
const { OpenWAClient } = require('@rmyndharis/openwa');
const QRCode = require('qrcode');
const { getDataDir } = require('./data_dir');

// MIME types lookup table for WhatsApp media sends
const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mp3',
  '.ogg': 'audio/ogg; codecs=opus',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.json': 'application/json',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function getOrGenerateUserSessionId(dataDir) {
  const sessionFilePath = path.join(dataDir, 'openwa_user_session.json');
  if (fs.existsSync(sessionFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
      if (data.sessionId) return data.sessionId;
    } catch (e) {}
  }
  // Generate a stable unique session ID for this user installation
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const sessionId = `grokki-user-${randomSuffix}`;
  try {
    fs.writeFileSync(sessionFilePath, JSON.stringify({ sessionId }, null, 2), 'utf8');
  } catch (e) {}
  return sessionId;
}

class OpenWAWorkspaceManager {
  constructor() {
    this.dataDir = getDataDir();
    this.credentialsPath = path.join(this.dataDir, 'openwa_credentials.json');
    this.client = null;
    this.lastStatus = null;
    this.lastStatusCheck = 0;
    this.userSessionId = getOrGenerateUserSessionId(this.dataDir);
    this.initClient();
  }

  /**
   * Resolves developer's master OpenWA API key & Gateway URL
   * 1. Environment variables (process.env.OPENWA_API_KEY, process.env.OPENWA_URL)
   * 2. openwa_credentials.json in Grokki data dir
   */
  getCredentials() {
    let apiKey = (process.env.OPENWA_API_KEY || '').trim();
    let baseUrl = (process.env.OPENWA_URL || 'http://localhost:2785').replace(/\/+$/, '').trim();

    if (!apiKey && fs.existsSync(this.credentialsPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
        if (raw.apiKey) apiKey = raw.apiKey.trim();
        if (raw.baseUrl) baseUrl = raw.baseUrl.replace(/\/+$/, '').trim();
      } catch (e) {}
    }

    return { apiKey, baseUrl };
  }

  saveCredentials({ apiKey, baseUrl }) {
    try {
      const current = this.getCredentials();
      const updated = {
        apiKey: (apiKey !== undefined ? apiKey : current.apiKey).trim(),
        baseUrl: (baseUrl !== undefined ? baseUrl : current.baseUrl).trim(),
      };
      fs.writeFileSync(this.credentialsPath, JSON.stringify(updated, null, 2), 'utf8');
      this.initClient();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  initClient() {
    this.client = null;
    const { apiKey, baseUrl } = this.getCredentials();
    if (apiKey && baseUrl) {
      try {
        this.client = new OpenWAClient({ baseUrl, apiKey });
      } catch (e) {
        console.warn('[OpenWA] Client init failed:', e.message);
        this.client = null;
      }
    }
  }

  getClient() {
    if (!this.client) {
      this.initClient();
    }
    return this.client;
  }

  /**
   * Checks if OpenWA Gateway server is reachable
   */
  async checkGatewayReachable() {
    const { baseUrl } = this.getCredentials();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${baseUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        return { reachable: true, version: body.version || '1.0' };
      }
      return { reachable: res.status !== 404, status: res.status };
    } catch (e) {
      return { reachable: false, error: e.message };
    }
  }

  /**
   * Retrieves or auto-provisions the user's personal session on developer's OpenWA gateway
   */
  async getOrCreateSession(client) {
    try {
      const listRes = await client.sessions.list();
      const sessions = Array.isArray(listRes) ? listRes : listRes.sessions || [];
      let session = sessions.find((s) => s.id === this.userSessionId || s.name === this.userSessionId);

      if (!session) {
        // Auto-create private session for this user installation
        session = await client.sessions.create({
          name: this.userSessionId,
          engine: 'whatsapp-web.js',
        });
        await client.sessions.start(session.id).catch(() => {});
      } else if (session.status === 'stopped' || session.status === 'disconnected') {
        // Auto-start session if it was stopped
        await client.sessions.start(session.id).catch(() => {});
      }

      return session;
    } catch (e) {
      console.warn('[OpenWA] getOrCreateSession error:', e.message);
      return null;
    }
  }

  /**
   * High-level user status check
   * The end-user simply sees whether their WhatsApp is connected or needs a QR scan.
   */
  async getStatus(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.lastStatus && now - this.lastStatusCheck < 3000) {
      return this.lastStatus;
    }

    const { apiKey, baseUrl } = this.getCredentials();
    const gatewayCheck = await this.checkGatewayReachable();

    const result = {
      connected: false,
      isGateway: false,
      sessionStatus: 'desktop_ready', // 'ready' | 'qr_ready' | 'starting' | 'desktop_ready'
      userPhone: null,
      userName: null,
      qrDataUrl: null,
      sessionId: this.userSessionId,
      gatewayOnline: gatewayCheck.reachable,
      error: null,
    };

    // If OpenWA Gateway is online and developer key is present, use OpenWA Gateway!
    if (gatewayCheck.reachable && apiKey) {
      const client = this.getClient();
      if (client) {
        try {
          await client.auth();
          const session = await this.getOrCreateSession(client);

          if (session) {
            result.isGateway = true;
            result.sessionStatus = session.status || 'starting';

            if (session.status === 'ready' || session.status === 'authenticated') {
              result.connected = true;
              result.sessionStatus = 'ready';
              result.userPhone = session.me?.phone || session.me?.id || null;
              result.userName = session.me?.pushName || session.me?.name || null;
            } else if (session.status === 'qr_ready' || session.status === 'scan_qr' || session.status === 'starting') {
              result.sessionStatus = 'qr_ready';
              const qrRes = await this.getQrCode();
              if (qrRes && qrRes.qrDataUrl) {
                result.qrDataUrl = qrRes.qrDataUrl;
              }
            }
          }
        } catch (e) {
          console.warn('[OpenWA] Gateway query error, falling back to desktop:', e.message);
          result.error = e.message;
        }
      }
    }

    // If OpenWA is not linked or offline, Grokki Studio uses the Desktop Bridge!
    if (!result.connected && result.sessionStatus === 'desktop_ready') {
      result.connected = true; // Desktop bridge is auto-connected
    }

    this.lastStatus = result;
    this.lastStatusCheck = now;
    return result;
  }

  /**
   * Fetches QR code for user to scan with their phone
   */
  async getQrCode() {
    const client = this.getClient();
    if (!client) return { success: false, error: 'OpenWA not connected' };

    try {
      const qrRes = await client.sessions.getQrCode(this.userSessionId);
      let rawQr = null;

      if (typeof qrRes === 'string') rawQr = qrRes;
      else if (qrRes && typeof qrRes.qr === 'string') rawQr = qrRes.qr;
      else if (qrRes && qrRes.data) rawQr = qrRes.data;

      if (rawQr) {
        if (rawQr.startsWith('data:image/')) {
          return { success: true, qrDataUrl: rawQr };
        }
        const qrDataUrl = await QRCode.toDataURL(rawQr, {
          margin: 2,
          width: 320,
          color: { dark: '#111827', light: '#ffffff' },
        });
        return { success: true, qrDataUrl };
      }
      return { success: false, error: 'QR code not ready yet' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Unlinks / logs out the current user session
   */
  async disconnectSession() {
    const client = this.getClient();
    if (!client) return { success: false };

    try {
      await client.sessions.logout(this.userSessionId);
      this.lastStatus = null;
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Formats phone numbers to standard WhatsApp format (digits + @c.us)
   */
  formatChatId(target) {
    if (!target) return '';
    const clean = target.trim();
    if (clean.includes('@c.us') || clean.includes('@g.us') || clean.includes('@lid')) {
      return clean;
    }
    const digits = clean.replace(/[^\d]/g, '');
    return digits ? `${digits}@c.us` : target;
  }

  /**
   * Sends text or file message silently via OpenWA Gateway API
   */
  async sendWhatsAppMessage({ to, message, filePath = null }) {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Gateway not connected' };

    const chatId = this.formatChatId(to);
    if (!chatId) return { success: false, error: 'Recipient is missing' };

    const idempotencyKey = `grokki-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      // 1. Media Send
      if (filePath && fs.existsSync(filePath)) {
        const absPath = path.resolve(filePath);
        const fileBuffer = fs.readFileSync(absPath);
        const base64Data = fileBuffer.toString('base64');
        const mimeType = getMimeType(absPath);
        const fileName = path.basename(absPath);

        let sendRes;
        if (mimeType.startsWith('image/')) {
          sendRes = await client.messages.sendImage(
            this.userSessionId,
            { chatId, base64: base64Data, mimetype: mimeType, caption: message || undefined },
            idempotencyKey
          );
        } else if (mimeType.startsWith('audio/')) {
          sendRes = await client.messages.sendAudio(
            this.userSessionId,
            { chatId, base64: base64Data, mimetype: mimeType, ptt: false },
            idempotencyKey
          );
        } else if (mimeType.startsWith('video/')) {
          sendRes = await client.messages.sendVideo(
            this.userSessionId,
            { chatId, base64: base64Data, mimetype: mimeType, caption: message || undefined },
            idempotencyKey
          );
        } else {
          sendRes = await client.messages.sendDocument(
            this.userSessionId,
            { chatId, base64: base64Data, mimetype: mimeType, filename: fileName, caption: message || undefined },
            idempotencyKey
          );
        }

        return {
          success: true,
          messageId: sendRes?.messageId || sendRes?.id || 'sent',
          fileName,
        };
      }

      // 2. Pure Text Send
      const sendRes = await client.messages.sendText(
        this.userSessionId,
        { chatId, text: (message || '').trim() },
        idempotencyKey
      );

      return {
        success: true,
        messageId: sendRes?.messageId || sendRes?.id || 'sent',
      };
    } catch (e) {
      console.error('[OpenWA] sendWhatsAppMessage error:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Fetches recent WhatsApp chats
   */
  async getRecentChats(limit = 5) {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Gateway not connected' };

    try {
      const chats = await client.chats.list(this.userSessionId, { limit });
      return { success: true, chats: Array.isArray(chats) ? chats : chats.chats || [] };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  isReady() {
    return !!(this.client && this.lastStatus && this.lastStatus.isGateway && this.lastStatus.connected);
  }
}

module.exports = new OpenWAWorkspaceManager();
