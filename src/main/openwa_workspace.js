const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const pino = require('pino');
const { getDataDir } = require('./data_dir');

// Safe, resilient loader for OpenWA SDK (remote gateway client)
let OpenWAClient = null;
try {
  const mod = require('@rmyndharis/openwa');
  OpenWAClient = mod.OpenWAClient || mod.default?.OpenWAClient || (typeof mod === 'function' ? mod : null);
} catch (e) {
  try {
    const directPath = path.resolve(__dirname, '../../node_modules/@rmyndharis/openwa/dist/cjs/index.js');
    if (fs.existsSync(directPath)) {
      const mod = require(directPath);
      OpenWAClient = mod.OpenWAClient || mod.default?.OpenWAClient || (typeof mod === 'function' ? mod : null);
    }
  } catch (e2) {
    OpenWAClient = null;
  }
}

// Safe loader for Baileys (embedded zero-config local engine)
let makeWASocket = null;
let useMultiFileAuthState = null;
let DisconnectReason = null;
let fetchLatestBaileysVersion = null;
let Browsers = null;
let downloadMediaMessage = null;
try {
  const baileys = require('@whiskeysockets/baileys');
  makeWASocket = baileys.default || baileys.makeWASocket || baileys;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  DisconnectReason = baileys.DisconnectReason;
  fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
  Browsers = baileys.Browsers;
  downloadMediaMessage = baileys.downloadMediaMessage;
} catch (err) {
  console.warn('[OpenWA/Local] Baileys library not available:', err.message);
}

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

function formatJid(target) {
  if (!target) return '';
  const clean = target.trim();
  if (clean.includes('@s.whatsapp.net') || clean.includes('@g.us') || clean.includes('@lid')) {
    return clean;
  }
  if (clean.includes('@c.us')) {
    return clean.replace('@c.us', '@s.whatsapp.net');
  }
  const digits = clean.replace(/[^\d]/g, '');
  return digits ? `${digits}@s.whatsapp.net` : clean;
}

function getOrGenerateUserSessionId(dataDir) {
  const sessionFilePath = path.join(dataDir, 'openwa_user_session.json');
  if (fs.existsSync(sessionFilePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
      if (data.sessionId) return data.sessionId;
    } catch (e) {}
  }
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
    this.localAuthDir = path.join(this.dataDir, 'whatsapp_auth');
    this.recentChatsFile = path.join(this.dataDir, 'whatsapp_recent_chats.json');
    this.groupsFile = path.join(this.dataDir, 'whatsapp_groups.json');
    this.contactsFile = path.join(this.dataDir, 'whatsapp_contacts.json');

    this.groupNames = this.loadGroupNames();
    this.contacts = this.loadContacts();

    // Remote Gateway state
    this.client = null;
    this.userSessionId = getOrGenerateUserSessionId(this.dataDir);

    // Embedded Local Baileys state
    this.localSock = null;
    this.localStatus = 'idle'; // 'idle' | 'starting' | 'qr_ready' | 'ready' | 'disconnected' | 'error'
    this.localQr = null;
    this.localQrDataUrl = null;
    this.localQrTimestamp = 0;
    this.localUserPhone = null;
    this.localUserName = null;
    this.isStartingLocal = false;
    this.qrResolvers = [];

    // Cache recent chats
    this.recentChats = this.loadRecentChats();

    this.lastStatus = null;
    this.lastStatusCheck = 0;

    // Check remote gateway credentials
    this.initClient();

    // Auto-reconnect local engine if previous session auth exists on disk
    this.checkAutoReconnect();
  }

  hasLocalAuth() {
    try {
      const credsFile = path.join(this.localAuthDir, 'creds.json');
      if (!fs.existsSync(credsFile)) return false;
      const stat = fs.statSync(credsFile);
      if (stat.size < 50) return false;
      const raw = fs.readFileSync(credsFile, 'utf8');
      const parsed = JSON.parse(raw);
      return !!(parsed && (parsed.registered || parsed.me));
    } catch (e) {
      return false;
    }
  }

  getSavedUserPhone() {
    try {
      const credsFile = path.join(this.localAuthDir, 'creds.json');
      if (fs.existsSync(credsFile)) {
        const parsed = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
        const phone = parsed?.me?.id ? parsed.me.id.split(':')[0] : null;
        if (phone) return phone;
      }
    } catch (e) {}
    return null;
  }

  loadGroupNames() {
    try {
      if (fs.existsSync(this.groupsFile)) {
        const raw = JSON.parse(fs.readFileSync(this.groupsFile, 'utf8'));
        if (typeof raw === 'object' && raw !== null) return raw;
      }
    } catch (e) {}
    return {};
  }

  saveGroupNames() {
    try {
      fs.writeFileSync(this.groupsFile, JSON.stringify(this.groupNames, null, 2), 'utf8');
    } catch (e) {}
  }

  loadContacts() {
    try {
      if (fs.existsSync(this.contactsFile)) {
        const raw = JSON.parse(fs.readFileSync(this.contactsFile, 'utf8'));
        if (typeof raw === 'object' && raw !== null) return raw;
      }
    } catch (e) {}
    return {};
  }

  saveContacts() {
    try {
      fs.writeFileSync(this.contactsFile, JSON.stringify(this.contacts, null, 2), 'utf8');
    } catch (e) {}
  }

  formatPhoneNumber(digits) {
    if (!digits) return '';
    const clean = String(digits).replace(/[^\d]/g, '');
    if (clean.startsWith('91') && clean.length === 12) {
      return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
    }
    if (clean.startsWith('1') && clean.length === 11) {
      return `+1 (${clean.slice(1, 4)}) ${clean.slice(4, 7)}-${clean.slice(7)}`;
    }
    if (clean.startsWith('62')) {
      return `+62 ${clean.slice(2, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
    }
    return `+${clean}`;
  }

  resolveLidToPhone(jid) {
    if (!jid || !jid.endsWith('@lid')) return null;
    try {
      const lidNum = jid.replace(/@lid$/, '').split(':')[0];
      const revFile = path.join(this.localAuthDir, `lid-mapping-${lidNum}_reverse.json`);
      if (fs.existsSync(revFile)) {
        const phone = JSON.parse(fs.readFileSync(revFile, 'utf8'));
        if (phone && /^\d+$/.test(String(phone))) {
          return `${phone}@s.whatsapp.net`;
        }
      }
    } catch (e) {}
    return null;
  }

  formatChatName(chatOrJid) {
    let jid = '';
    let fromMe = false;
    let fallbackName = null;

    if (typeof chatOrJid === 'string') {
      jid = chatOrJid;
    } else if (chatOrJid && typeof chatOrJid === 'object') {
      jid = chatOrJid.jid || chatOrJid.id || '';
      fromMe = !!chatOrJid.fromMe;
      fallbackName = chatOrJid.name || chatOrJid.formattedTitle || null;
    }

    if (!jid) return fallbackName || 'Unknown';

    // Group chat (@g.us)
    if (jid.endsWith('@g.us')) {
      const subject = this.groupNames[jid];
      if (subject) return `👥 ${subject}`;
      return '👥 Group Chat';
    }

    // Bot (@bot)
    if (jid.endsWith('@bot')) {
      return '🤖 Meta AI';
    }

    // Outgoing from user
    if (fromMe) {
      return 'You';
    }

    // Saved contact name (direct or via LID->Phone reverse mapping)
    if (this.contacts[jid]) {
      return this.contacts[jid];
    }
    const phoneJid = jid.endsWith('@lid') ? this.resolveLidToPhone(jid) : null;
    if (phoneJid && this.contacts[phoneJid]) {
      return this.contacts[phoneJid];
    }

    // If a human name was supplied (not a formatted or raw phone number)
    if (fallbackName && !fallbackName.startsWith('+') && !/^\d+$/.test(fallbackName) && fallbackName !== 'Contact' && fallbackName !== 'You') {
      return fallbackName;
    }

    // Standard phone number format (prefer resolved phone number if JID is @lid)
    const targetForDigits = phoneJid || jid;
    const digits = targetForDigits.replace(/@.*$/, '').replace(/[^\d]/g, '');
    return this.formatPhoneNumber(digits);
  }

  loadRecentChats() {
    try {
      if (fs.existsSync(this.recentChatsFile)) {
        const raw = JSON.parse(fs.readFileSync(this.recentChatsFile, 'utf8'));
        if (Array.isArray(raw)) {
          raw.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          return raw;
        }
      }
    } catch (e) {}
    return [];
  }

  saveRecentChats() {
    try {
      this.recentChats.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      fs.writeFileSync(this.recentChatsFile, JSON.stringify(this.recentChats.slice(0, 50), null, 2), 'utf8');
    } catch (e) {}
  }

  checkAutoReconnect() {
    try {
      if (this.hasLocalAuth()) {
        console.log('[OpenWA/Local] Saved WhatsApp session credentials found, auto-connecting...');
        this.startLocalEngine().catch((err) => {
          console.warn('[OpenWA/Local] Auto-reconnect failed:', err.message);
        });
      }
    } catch (e) {}
  }

  // ==========================================
  // EMBEDDED LOCAL BAILEYS ENGINE
  // ==========================================

  async processMessage(m, type = 'notify') {
    if (!m || !m.message) return;
    const rawJid = m.key?.remoteJid;
    if (!rawJid || rawJid.endsWith('@broadcast') || rawJid === 'status@broadcast') return;

    // Resolve LID to phone JID if available via Baileys key fields or reverse mapping
    const altJid = m.key?.remoteJidAlt || m.key?.senderPn || null;
    const mappedPhoneJid = rawJid.endsWith('@lid') ? (altJid || this.resolveLidToPhone(rawJid)) : null;
    const jid = mappedPhoneJid || rawJid;

    // Unwrap ephemeral / view once / document wrapper
    let msg = m.message;
    if (msg.ephemeralMessage?.message) msg = msg.ephemeralMessage.message;
    if (msg.viewOnceMessage?.message) msg = msg.viewOnceMessage.message;
    if (msg.viewOnceMessageV2?.message) msg = msg.viewOnceMessageV2.message;
    if (msg.documentWithCaptionMessage?.message) msg = msg.documentWithCaptionMessage.message;

    // Filter out internal protocol, reactions, or key exchange messages
    if (msg.protocolMessage || msg.senderKeyDistributionMessage || msg.peerDataOperationRequestMessage || msg.reactionMessage) {
      return;
    }

    let savedMediaFilePath = null;
    const isMedia = !!(msg.imageMessage || msg.videoMessage || msg.audioMessage || msg.documentMessage);
    if (isMedia && typeof downloadMediaMessage === 'function' && this.localSock) {
      try {
        const mediaBuffer = await downloadMediaMessage(
          m,
          'buffer',
          {},
          {
            logger: pino({ level: 'silent' }),
            reuploadRequest: this.localSock.updateMediaMessage,
          }
        );
        if (mediaBuffer && mediaBuffer.length > 0) {
          const mediaDir = path.join(this.dataDir, 'media');
          if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
          let ext = 'bin';
          if (msg.imageMessage) ext = 'jpg';
          else if (msg.audioMessage) ext = 'ogg';
          else if (msg.videoMessage) ext = 'mp4';
          else if (msg.documentMessage) {
            const origExt = path.extname(msg.documentMessage.fileName || '').replace('.', '');
            ext = origExt || 'pdf';
          }
          const fname = `${m.key.id || Date.now()}.${ext}`;
          savedMediaFilePath = path.join(mediaDir, fname);
          fs.writeFileSync(savedMediaFilePath, mediaBuffer);
        }
      } catch (err) {
        console.warn('[OpenWA/Local] Media download error:', err.message);
      }
    }

    const text = (
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      (msg.imageMessage ? '📷 [Photo]' : null) ||
      (msg.audioMessage ? '🎤 [Voice message]' : null) ||
      (msg.documentMessage ? `📄 [File: ${msg.documentMessage.fileName || 'Document'}]` : null) ||
      (msg.locationMessage ? '📍 [Location]' : null) ||
      (msg.contactMessage ? '👤 [Contact Card]' : null) ||
      ''
    ).trim();

    // If there is no real user text or media content, do not log a dummy entry
    if (!text) return;

    const isFromMe = !!m.key?.fromMe;
    let sender = m.pushName;
    if (sender) sender = sender.replace(/[\u200E\u200F]/g, '').trim();
    if (!sender) {
      sender = this.contacts[rawJid] || this.contacts[jid] || null;
    }

    if (!isFromMe && sender && !jid.endsWith('@g.us')) {
      this.contacts[rawJid] = sender;
      this.contacts[jid] = sender;
      this.saveContacts();
    }

    if (jid.endsWith('@g.us') && !this.groupNames[jid] && this.localSock) {
      this.localSock.groupMetadata(jid).then((meta) => {
        if (meta && meta.subject) {
          this.groupNames[jid] = meta.subject;
          this.saveGroupNames();
        }
      }).catch(() => {});
    }

    const title = this.formatChatName({ jid, fromMe: isFromMe, name: sender });

    // Robust timestamp extraction supporting protobuf Long, Number, and BigInt
    const rawTs = m.messageTimestamp;
    let timestamp = Date.now();
    if (typeof rawTs === 'number') {
      timestamp = rawTs > 1e11 ? rawTs : rawTs * 1000;
    } else if (typeof rawTs === 'string') {
      const n = Number(rawTs);
      if (!isNaN(n) && n > 0) timestamp = n > 1e11 ? n : n * 1000;
    } else if (typeof rawTs === 'object' && rawTs !== null) {
      if (typeof rawTs.toNumber === 'function') {
        const n = rawTs.toNumber();
        if (!isNaN(n) && n > 0) timestamp = n > 1e11 ? n : n * 1000;
      } else if (rawTs.low !== undefined) {
        const n = Number(rawTs.low);
        if (!isNaN(n) && n > 0) timestamp = n > 1e11 ? n : n * 1000;
      }
    }
    if (isNaN(timestamp) || timestamp <= 0) {
      timestamp = Date.now();
    }

    const existingIdx = this.recentChats.findIndex((c) => c.id === jid || c.jid === jid);

    const chatItem = {
      id: jid,
      jid,
      name: title,
      formattedTitle: title,
      lastMessage: { body: text, type: isMedia ? 'media' : 'chat', filePath: savedMediaFilePath },
      timestamp,
      fromMe: isFromMe,
      unreadCount: 0,
      filePath: savedMediaFilePath,
    };

    if (existingIdx >= 0) {
      this.recentChats.splice(existingIdx, 1);
    }
    this.recentChats.unshift(chatItem);
    this.recentChats.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (this.recentChats.length > 50) this.recentChats.pop();

    // Trigger Dynamic Island notification if message is fresh or real-time notify event
    const isNotifyType = type === 'notify';
    const msgAge = Math.abs(Date.now() - timestamp);
    const isFresh = isNaN(msgAge) || msgAge < 180000;

    if (!isFromMe && (isNotifyType || isFresh)) {
      const notifSender = jid.endsWith('@g.us')
        ? `${title}${sender ? ` (${sender})` : ''}`
        : (sender || title || 'WhatsApp');
      this.broadcastIncomingNotification({
        source: 'whatsapp',
        sender: notifSender,
        message: text,
        icon: 'whatsapp',
        jid,
        filePath: savedMediaFilePath,
      });
    }
  }

  broadcastIncomingNotification({ source, sender, message, icon, jid, filePath }) {
    try {
      const electron = require('electron');
      const BrowserWindow = electron.BrowserWindow;
      const Notification = electron.Notification;

      console.log(`[OpenWA] 🔔 Incoming WhatsApp alert from "${sender}": "${message}"`);

      // 1. Broadcast to Dynamic Island & all Electron windows
      if (BrowserWindow) {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed() && win.webContents) {
            win.webContents.send('island:notification', {
              source: source || 'whatsapp',
              sender,
              message,
              icon: icon || 'whatsapp',
              jid,
              filePath,
              timestamp: Date.now(),
            });
          }
        });
      }

      // 2. Windows Native Notification
      if (Notification && Notification.isSupported()) {
        const sysNotif = new Notification({
          title: `${sender} (WhatsApp)`,
          body: message,
          silent: false,
        });
        sysNotif.show();
      }
    } catch (e) {
      console.warn('[OpenWA] Notification broadcast error:', e.message);
    }
  }

  broadcastStatus(status) {
    try {
      const electron = require('electron');
      const BrowserWindow = electron.BrowserWindow;
      if (BrowserWindow) {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed() && win.webContents) {
            win.webContents.send('openwa-status-changed', status);
          }
        });
      }
    } catch (e) {}
  }

  async startLocalEngine(forceFresh = false) {
    if (!makeWASocket || !useMultiFileAuthState) {
      console.warn('[OpenWA/Local] Baileys is not available.');
      return;
    }
    const now = Date.now();
    const qrAge = this.localQrTimestamp ? now - this.localQrTimestamp : 999999;
    if (!forceFresh && this.localSock && (this.localStatus === 'ready' || (this.localStatus === 'qr_ready' && qrAge < 25000))) {
      return;
    }
    if (this.isStartingLocal && !forceFresh) return;
    this.isStartingLocal = true;

    // Cleanly terminate previous socket before starting fresh pairing
    if (this.localSock) {
      try {
        this.localSock.ev.removeAllListeners();
        this.localSock.end(new Error('Refreshing WhatsApp QR Pairing'));
      } catch (e) {}
      this.localSock = null;
    }
    this.localQr = null;
    this.localQrDataUrl = null;
    this.localStatus = 'starting';

    try {
      if (!fs.existsSync(this.localAuthDir)) {
        fs.mkdirSync(this.localAuthDir, { recursive: true });
      }

      // If forceFresh is requested and we are not linked yet, remove stale key files
      if (forceFresh && !this.isLocalReady()) {
        try {
          const files = fs.readdirSync(this.localAuthDir);
          for (const file of files) {
            fs.unlinkSync(path.join(this.localAuthDir, file));
          }
        } catch (e) {}
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.localAuthDir);

      let waVersion;
      try {
        if (typeof fetchLatestBaileysVersion === 'function') {
          const vRes = await fetchLatestBaileysVersion();
          waVersion = vRes?.version;
        }
      } catch (e) {
        console.warn('[OpenWA/Local] Failed to fetch latest WA version, using default:', e.message);
      }

      const browserSignature = (Browsers && typeof Browsers.windows === 'function')
        ? Browsers.windows('Desktop')
        : ['Windows', 'Desktop', '10.0.22631'];

      const sock = makeWASocket({
        version: waVersion,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: browserSignature,
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        generateHighQualityLinkPreview: true,
      });

      this.localSock = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.localQr = qr;
            this.localQrTimestamp = Date.now();
            this.localQrDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              width: 360,
              color: { dark: '#0b141a', light: '#ffffff' },
              errorCorrectionLevel: 'M',
            });
            this.localStatus = 'qr_ready';
            console.log('[OpenWA/Local] Fresh WhatsApp Web pairing QR code generated successfully.');

            this.broadcastStatus({
              connected: false,
              isGateway: false,
              isLocal: true,
              sessionStatus: 'qr_ready',
              userPhone: null,
              userName: null,
              qrDataUrl: this.localQrDataUrl,
              sessionId: this.userSessionId,
              gatewayOnline: true,
              error: null,
            });

            while (this.qrResolvers.length > 0) {
              const res = this.qrResolvers.shift();
              res({ success: true, qrDataUrl: this.localQrDataUrl });
            }
          } catch (e) {
            console.warn('[OpenWA/Local] QR encode error:', e);
          }
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;
          console.log(`[OpenWA/Local] WhatsApp connection closed (${statusCode}), shouldReconnect: ${shouldReconnect}`);

          this.localStatus = 'disconnected';
          this.localSock = null;

          if (statusCode === DisconnectReason?.loggedOut) {
            this.clearLocalAuth();
            this.localStatus = 'idle';
            this.broadcastStatus({
              connected: false,
              isGateway: false,
              isLocal: true,
              sessionStatus: 'disconnected',
              userPhone: null,
              userName: null,
              qrDataUrl: null,
              sessionId: this.userSessionId,
              gatewayOnline: false,
              error: null,
            });
          } else if (shouldReconnect) {
            setTimeout(() => {
              this.startLocalEngine().catch(() => {});
            }, 3000);
          }
        } else if (connection === 'open') {
          console.log('[OpenWA/Local] Connected to WhatsApp Web successfully!');
          this.localStatus = 'ready';
          this.localQr = null;
          this.localQrDataUrl = null;
          this.localUserPhone = sock.user?.id ? sock.user.id.split(':')[0] : null;
          let rawName = sock.user?.name || '';
          this.localUserName = rawName.replace(/[\u200E\u200F]/g, '').trim() || null;

          this.broadcastStatus({
            connected: true,
            isGateway: false,
            isLocal: true,
            sessionStatus: 'ready',
            userPhone: this.localUserPhone,
            userName: this.localUserName,
            qrDataUrl: null,
            sessionId: this.userSessionId,
            gatewayOnline: true,
            error: null,
          });

          while (this.qrResolvers.length > 0) {
            const res = this.qrResolvers.shift();
            res({ success: true, connected: true });
          }
        }
      });

      // Handle message events
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        try {
          if (!Array.isArray(messages)) return;
          for (const m of messages) {
            await this.processMessage(m, type);
          }
          this.saveRecentChats();
        } catch (err) {
          console.warn('[OpenWA/Local] messages.upsert handling error:', err.message);
        }
      });

      sock.ev.on('messaging-history.set', async ({ messages }) => {
        try {
          if (Array.isArray(messages)) {
            for (const m of messages) {
              await this.processMessage(m, 'history');
            }
            this.saveRecentChats();
          }
        } catch (err) {}
      });

      // Handle contacts updates
      sock.ev.on('contacts.upsert', (newContacts) => {
        try {
          if (Array.isArray(newContacts)) {
            let changed = false;
            for (const c of newContacts) {
              const name = c.notify || c.name || c.verifiedName;
              if (c.id && name) {
                this.contacts[c.id] = name;
                changed = true;
              }
            }
            if (changed) this.saveContacts();
          }
        } catch (e) {}
      });

      sock.ev.on('contacts.update', (updates) => {
        try {
          if (Array.isArray(updates)) {
            let changed = false;
            for (const c of updates) {
              const name = c.notify || c.name || c.verifiedName;
              if (c.id && name) {
                this.contacts[c.id] = name;
                changed = true;
              }
            }
            if (changed) this.saveContacts();
          }
        } catch (e) {}
      });

      // Handle group updates
      sock.ev.on('groups.update', (groups) => {
        try {
          if (Array.isArray(groups)) {
            let changed = false;
            for (const g of groups) {
              if (g.id && g.subject) {
                this.groupNames[g.id] = g.subject;
                changed = true;
              }
            }
            if (changed) this.saveGroupNames();
          }
        } catch (e) {}
      });
    } catch (err) {
      console.error('[OpenWA/Local] Failed to start local WhatsApp engine:', err);
      this.localStatus = 'error';
    } finally {
      this.isStartingLocal = false;
    }
  }

  clearLocalAuth() {
    try {
      if (fs.existsSync(this.localAuthDir)) {
        fs.rmSync(this.localAuthDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn('[OpenWA/Local] Error clearing local auth:', e.message);
    }
  }

  // ==========================================
  // REMOTE OPENWA GATEWAY CLIENT (HYBRID FALLBACK)
  // ==========================================

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

  saveConfig({ baseUrl, apiKey, sessionId, engine, enabled, preferOpenWA }) {
    try {
      const current = this.getCredentials();
      const updated = {
        apiKey: apiKey !== undefined ? apiKey.trim() : current.apiKey,
        baseUrl: baseUrl !== undefined ? baseUrl.trim() : current.baseUrl,
        sessionId: sessionId || this.userSessionId,
        engine: engine || 'whatsapp-web.js',
        enabled: enabled !== undefined ? enabled : true,
        preferOpenWA: preferOpenWA !== undefined ? preferOpenWA : true,
      };
      fs.writeFileSync(this.credentialsPath, JSON.stringify(updated, null, 2), 'utf8');
      this.initClient();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  saveCredentials(creds) {
    return this.saveConfig(creds);
  }

  initClient() {
    this.client = null;
    if (!OpenWAClient) return;
    const { apiKey, baseUrl } = this.getCredentials();
    if (apiKey && baseUrl) {
      try {
        this.client = new OpenWAClient({ baseUrl, apiKey });
      } catch (e) {
        console.warn('[OpenWA] Gateway Client init failed:', e.message);
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

  async checkGatewayReachable() {
    const { baseUrl } = this.getCredentials();
    if (!baseUrl || baseUrl === 'http://localhost:2785') {
      return { reachable: false };
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
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

  // ==========================================
  // UNIFIED STATUS & QR INTERFACES
  // ==========================================

  isLocalReady() {
    return !!(this.localSock && this.localStatus === 'ready');
  }

  isGatewayReady() {
    return !!(this.client && this.lastStatus && this.lastStatus.isGateway && this.lastStatus.connected);
  }

  isReady() {
    return this.isLocalReady() || this.isGatewayReady();
  }

  async ensureReady(timeoutMs = 4000) {
    if (this.isReady()) return true;

    if (this.hasLocalAuth()) {
      if (!this.localSock && !this.isStartingLocal) {
        this.startLocalEngine().catch(() => {});
      }

      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        if (this.isReady()) return true;
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return this.isReady();
  }

  async getStatus(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.lastStatus && now - this.lastStatusCheck < 2000) {
      return this.lastStatus;
    }

    // 1. Check Embedded Local Engine first (zero config, client-friendly)
    if (this.isLocalReady() || this.hasLocalAuth()) {
      const isConnected = this.isLocalReady();
      const res = {
        connected: true,
        isGateway: false,
        isLocal: true,
        sessionStatus: isConnected ? 'ready' : (this.localStatus || 'starting'),
        userPhone: this.localUserPhone || this.getSavedUserPhone(),
        userName: this.localUserName,
        qrDataUrl: null,
        sessionId: this.userSessionId,
        gatewayOnline: true,
        error: null,
      };
      this.lastStatus = res;
      this.lastStatusCheck = now;
      return res;
    }

    if (this.localStatus === 'qr_ready' && this.localQrDataUrl) {
      const res = {
        connected: false,
        isGateway: false,
        isLocal: true,
        sessionStatus: 'qr_ready',
        userPhone: null,
        userName: null,
        qrDataUrl: this.localQrDataUrl,
        sessionId: this.userSessionId,
        gatewayOnline: true,
        error: null,
      };
      this.lastStatus = res;
      this.lastStatusCheck = now;
      return res;
    }

    // 2. Check Remote OpenWA Gateway if configured
    const gatewayCheck = await this.checkGatewayReachable();
    const { apiKey } = this.getCredentials();

    if (gatewayCheck.reachable && apiKey) {
      const client = this.getClient();
      if (client) {
        try {
          await client.auth();
          const listRes = await client.sessions.list();
          const sessions = Array.isArray(listRes) ? listRes : listRes.sessions || [];
          const session = sessions.find((s) => s.id === this.userSessionId || s.name === this.userSessionId);

          if (session && (session.status === 'ready' || session.status === 'authenticated')) {
            const res = {
              connected: true,
              isGateway: true,
              isLocal: false,
              sessionStatus: 'ready',
              userPhone: session.me?.phone || session.me?.id || null,
              userName: session.me?.pushName || session.me?.name || null,
              qrDataUrl: null,
              sessionId: this.userSessionId,
              gatewayOnline: true,
              error: null,
            };
            this.lastStatus = res;
            this.lastStatusCheck = now;
            return res;
          }
        } catch (e) {
          console.warn('[OpenWA] Gateway check failed:', e.message);
        }
      }
    }

    // 3. Not linked yet
    const res = {
      connected: false,
      isGateway: false,
      isLocal: true,
      sessionStatus: this.localStatus === 'starting' ? 'starting' : 'disconnected',
      userPhone: null,
      userName: null,
      qrDataUrl: this.localQrDataUrl || null,
      sessionId: this.userSessionId,
      gatewayOnline: false,
      error: null,
    };
    this.lastStatus = res;
    this.lastStatusCheck = now;
    return res;
  }

  async getQrCode(forceFresh = false) {
    if (this.isReady()) {
      return { success: true, connected: true };
    }

    const qrAge = Date.now() - (this.localQrTimestamp || 0);
    if (!forceFresh && this.localQrDataUrl && this.localStatus === 'qr_ready' && qrAge < 25000) {
      return { success: true, qrDataUrl: this.localQrDataUrl };
    }

    this.startLocalEngine(forceFresh || qrAge >= 25000).catch(() => {});

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          success: !!this.localQrDataUrl,
          qrDataUrl: this.localQrDataUrl,
          error: this.localQrDataUrl ? null : 'Preparing QR code, please scan once visible...',
        });
      }, 12000);

      this.qrResolvers.push((res) => {
        clearTimeout(timer);
        resolve(res);
      });
    });
  }

  async disconnectSession() {
    console.log('[OpenWA] Unlinking WhatsApp session...');
    if (this.localSock) {
      try {
        await this.localSock.logout().catch(() => {});
        this.localSock.end(undefined);
      } catch (e) {}
      this.localSock = null;
    }
    this.clearLocalAuth();
    this.localStatus = 'idle';
    this.localQr = null;
    this.localQrDataUrl = null;
    this.localQrTimestamp = 0;
    this.localUserPhone = null;
    this.localUserName = null;
    this.lastStatus = null;
    this.recentChats = [];
    try {
      if (fs.existsSync(this.recentChatsFile)) {
        fs.unlinkSync(this.recentChatsFile);
      }
    } catch (e) {}

    if (this.client) {
      try {
        await this.client.sessions.logout(this.userSessionId).catch(() => {});
      } catch (e) {}
    }

    return { success: true };
  }

  // ==========================================
  // MESSAGING (SEND & RECEIVE)
  // ==========================================

  resolveTargetJid(target) {
    if (!target) return null;
    const clean = String(target).trim();
    if (clean.includes('@s.whatsapp.net') || clean.includes('@g.us') || clean.includes('@lid')) {
      return clean;
    }
    if (clean.includes('@c.us')) {
      return clean.replace('@c.us', '@s.whatsapp.net');
    }

    const lower = clean.toLowerCase();

    // 1. Check known WhatsApp groups
    for (const [jid, groupTitle] of Object.entries(this.groupNames || {})) {
      if (groupTitle && (groupTitle.toLowerCase() === lower || groupTitle.toLowerCase().includes(lower))) {
        return jid;
      }
    }

    // 2. Check known contacts
    for (const [jid, contactName] of Object.entries(this.contacts || {})) {
      if (contactName && (contactName.toLowerCase() === lower || contactName.toLowerCase().includes(lower))) {
        return this.resolveLidToPhone(jid) || jid;
      }
    }

    // 3. Check recent chats by title
    for (const c of (this.recentChats || [])) {
      const cName = (c.name || c.formattedTitle || '').toLowerCase();
      if (cName && (cName === lower || cName.includes(lower))) {
        return c.jid || c.id;
      }
    }

    // 4. Check phone number digits
    const digits = clean.replace(/[^\d]/g, '');
    if (digits.length >= 7) {
      const normalized = digits.length === 10 ? `91${digits}` : digits;
      return `${normalized}@s.whatsapp.net`;
    }

    return null;
  }

  async sendWhatsAppMessage({ to, message, filePath = null }) {
    await this.ensureReady(4000);

    const jid = this.resolveTargetJid(to);
    if (!jid) {
      return {
        success: false,
        notFound: true,
        error: `Could not find contact or phone number for "${to}". Please provide their phone number.`,
      };
    }

    // 1. Primary: Send via Embedded Local Baileys
    if (this.isLocalReady()) {

      try {
        if (filePath && fs.existsSync(filePath)) {
          const absPath = path.resolve(filePath);
          const mimeType = getMimeType(absPath);
          const fileName = path.basename(absPath);
          const fileBuffer = fs.readFileSync(absPath);

          let payload;
          if (mimeType.startsWith('image/')) {
            payload = { image: fileBuffer, caption: message || undefined };
          } else if (mimeType.startsWith('video/')) {
            payload = { video: fileBuffer, caption: message || undefined };
          } else if (mimeType.startsWith('audio/')) {
            payload = { audio: fileBuffer, mimetype: mimeType };
          } else {
            payload = { document: fileBuffer, mimetype: mimeType, fileName, caption: message || undefined };
          }

          const res = await this.localSock.sendMessage(jid, payload);
          return {
            success: true,
            messageId: res?.key?.id || 'sent',
            fileName,
          };
        }

        // Pure text
        const res = await this.localSock.sendMessage(jid, { text: (message || '').trim() });
        return {
          success: true,
          messageId: res?.key?.id || 'sent',
        };
      } catch (e) {
        console.error('[OpenWA/Local] sendWhatsAppMessage error:', e);
        return { success: false, error: e.message };
      }
    }

    // 2. Fallback: Send via Remote OpenWA Gateway Client
    const client = this.getClient();
    if (client && this.isGatewayReady()) {
      const chatId = to.includes('@') ? to : `${to.replace(/[^\d]/g, '')}@c.us`;
      const idempotencyKey = `grokki-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      try {
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

          return { success: true, messageId: sendRes?.messageId || sendRes?.id || 'sent', fileName };
        }

        const sendRes = await client.messages.sendText(
          this.userSessionId,
          { chatId, text: (message || '').trim() },
          idempotencyKey
        );
        return { success: true, messageId: sendRes?.messageId || sendRes?.id || 'sent' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    return {
      success: false,
      fallbackToDesktop: true,
      error: 'WhatsApp is not linked. Use desktop fallback or scan QR in Workspace.',
    };
  }

  async getRecentChats(limit = 5) {
    if (!Array.isArray(this.recentChats) || this.recentChats.length === 0) {
      this.recentChats = this.loadRecentChats();
    }
    if (this.recentChats.length > 0) {
      this.recentChats.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      for (const c of this.recentChats) {
        c.name = this.formatChatName(c);
        c.formattedTitle = c.name;
      }
      return { success: true, chats: this.recentChats.slice(0, limit) };
    }

    await this.ensureReady(2000);

    if (this.recentChats.length > 0) {
      this.recentChats.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      for (const c of this.recentChats) {
        c.name = this.formatChatName(c);
        c.formattedTitle = c.name;
      }
      return { success: true, chats: this.recentChats.slice(0, limit) };
    }

    const client = this.getClient();
    if (client && this.isGatewayReady()) {
      try {
        const chats = await client.chats.list(this.userSessionId, { limit });
        return { success: true, chats: Array.isArray(chats) ? chats : chats.chats || [] };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    if (this.hasLocalAuth()) {
      return {
        success: true,
        chats: [],
        message: 'WhatsApp is connected. No incoming messages have arrived since connection.',
      };
    }

    return {
      success: false,
      error: 'WhatsApp is not linked. Please click "Link WhatsApp" in the Workspace tab to connect.',
    };
  }
}

module.exports = new OpenWAWorkspaceManager();
