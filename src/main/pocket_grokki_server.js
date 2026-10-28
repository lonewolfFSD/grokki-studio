/**
 * Pocket Grokki — Real Living Grokki Companion (Phone <-> PC Dimension Hop)
 *
 * Powered by WebGL2 Raymarched Fluid Shader Orb + Eye Physics Canvas.
 * Instant zero-install companion bridge.
 * Grokki is a living creature: touch-reactive, physics-driven, and travels
 * between your PC Dynamic Island and your Phone screen.
 */

const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { exec } = require('child_process');
const { clipboard, desktopCapturer, shell } = require('electron');
const powerTools = require('./power_tools');

class PocketGrokkiServer {
  constructor(options = {}) {
    this.port = options.port || 8765;
    this.server = null;
    this.wss = null;
    this.agentBrain = options.agentBrain || null;
    this.mainWindow = options.mainWindow || null;
    this.loadConfig = options.loadConfig || null;
    this.activeSockets = new Set();
    this.isRunning = false;
    this.qrDataUrl = null;
    this.localIp = this.detectLocalIp();
    this.connectedDevices = new Map();
    // Who currently holds Grokki: 'pc' | 'owner' | '<guest peerId>'
    this.grokkiHolder = 'pc';
    // Capability tokens for file downloads (token -> { path, expires })
    this.downloads = new Map();
    // One-time secret in the PC QR code URL that guarantees physical access to PC
    this.qrSecret = crypto.randomBytes(16).toString('hex');
  }

  // ---------------------------------------------------------------------------
  // Main device (owner) vs guest devices
  //  - Exactly ONE main device: full PC control, file transfer to PC, OS controls,
  //    and can shoot Grokki to any guest device on the LAN.
  //  - Any number of guests: can connect, but can't control the PC. They can only
  //    receive Grokki (+ files) from the main device and send him back (+ a file).
  // ---------------------------------------------------------------------------

  // Back-compat: "phone" always means the main device's phone.
  get grokkiLocation() {
    if (this.grokkiHolder === 'pc') return 'pc';
    return this.grokkiHolder === 'owner' ? 'phone' : 'guest';
  }

  set grokkiLocation(loc) {
    this.grokkiHolder = loc === 'phone' ? 'owner' : 'pc';
  }

  setLocation(loc) {
    this.grokkiLocation = loc;
    this.syncLocations();
  }

  getOwnerPath() {
    return path.join(path.dirname(this.getPairedDevicesPath()), 'pocket_owner.json');
  }

  loadOwner() {
    try {
      const p = this.getOwnerPath();
      if (fs.existsSync(p)) {
        const owner = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (owner && typeof owner.key === 'string' && owner.key.length >= 32) return owner;
      }
    } catch (e) {}
    return null;
  }

  saveOwner(owner) {
    try {
      fs.writeFileSync(this.getOwnerPath(), JSON.stringify(owner, null, 2), 'utf8');
    } catch (e) {
      console.warn('[Pocket Grokki] Failed to save main device:', e);
    }
  }

  // Forget the main device. The next phone that connects becomes the new main device.
  resetOwner() {
    try {
      const p = this.getOwnerPath();
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {}
    for (const ws of this.activeSockets) {
      if (ws.role === 'owner') {
        try { ws.close(4001, 'Main device reset'); } catch (e) {}
      }
    }
    if (this.grokkiHolder !== 'pc') this.grokkiHolder = 'pc';
    return true;
  }

  isOwnerKey(candidate) {
    const owner = this.loadOwner();
    if (!owner || typeof candidate !== 'string' || candidate.length !== owner.key.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(owner.key));
    } catch (e) {
      return false;
    }
  }

  isOwnerRequest(req, url) {
    return this.isOwnerKey(req.headers['x-grokki-key'] || url.searchParams.get('key') || '');
  }

  sendTo(ws, obj) {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    } catch (e) {}
  }

  getOwnerSockets() {
    return Array.from(this.activeSockets).filter(ws => ws.role === 'owner' && ws.readyState === WebSocket.OPEN);
  }

  getPeerSockets(peerId) {
    return Array.from(this.activeSockets).filter(ws => ws.peerId === peerId && ws.readyState === WebSocket.OPEN);
  }

  sendToOwner(obj) {
    this.getOwnerSockets().forEach(ws => this.sendTo(ws, obj));
  }

  sendToPeer(peerId, obj) {
    this.getPeerSockets(peerId).forEach(ws => this.sendTo(ws, obj));
  }

  getGuestList() {
    const seen = new Map();
    for (const ws of this.activeSockets) {
      if ((ws.role !== 'sub' && ws.role !== 'guest') || ws.readyState !== WebSocket.OPEN || seen.has(ws.peerId)) continue;
      seen.set(ws.peerId, { id: ws.peerId, name: ws.deviceName, type: ws.deviceType });
    }
    return Array.from(seen.values());
  }

  getHolderName() {
    if (this.grokkiHolder === 'pc') return os.hostname();
    if (this.grokkiHolder === 'owner') return 'Main device';
    const sock = this.getPeerSockets(this.grokkiHolder)[0];
    return sock ? sock.deviceName : 'another device';
  }

  locationFor(ws) {
    if (this.grokkiHolder === 'pc') return 'pc';
    return this.grokkiHolder === ws.peerId ? 'phone' : 'away';
  }

  syncLocations() {
    const holderName = this.getHolderName();
    for (const ws of this.activeSockets) {
      if (!ws.role || ws.role === 'pending') continue;
      this.sendTo(ws, { type: 'grokki_location', location: this.locationFor(ws), holderName });
    }
  }

  pushDeviceList() {
    this.sendToOwner({ type: 'device_list', devices: this.getGuestList() });
  }

  killSubSessions() {
    console.log('[Pocket Grokki] 🛑 Host activated Session Killer — kicking all sub-devices!');
    let killedCount = 0;

    // 1. If Grokki was currently visiting any sub-device, bring Grokki home to Host immediately
    if (this.grokkiHolder !== 'owner' && this.grokkiHolder !== 'pc') {
      console.log(`[Pocket Grokki] Recalling Grokki from guest holder ${this.grokkiHolder} back to Host`);
      this.grokkiHolder = 'owner';
      this.sendToOwner({
        type: 'hop_land_on_phone',
        location: 'phone',
        fromName: 'Sub-Device (Terminated)'
      });
    }

    // 2. Disconnect and close all sub-device sockets
    for (const ws of Array.from(this.activeSockets)) {
      if (ws.role === 'sub' || ws.role === 'guest') {
        killedCount++;
        try {
          ws.send(JSON.stringify({
            type: 'session_terminated',
            message: 'Session terminated by Host'
          }));
        } catch (e) {}
        try {
          ws.close(4003, 'Terminated by Host');
        } catch (e) {}
        this.connectedDevices.delete(ws);
        this.activeSockets.delete(ws);
      }
    }

    // 3. Sync and push empty device list to Host
    this.syncLocations();
    this.pushDeviceList();

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('jarvis:pocket-device-disconnected', {
        totalConnected: this.activeSockets.size,
        role: 'sub_all_killed'
      });
    }

    return killedCount;
  }

  // Issue a short-lived capability URL for a single file (no raw path exposure on the LAN).
  registerDownload(filePath) {
    const now = Date.now();
    for (const [t, d] of this.downloads) {
      if (d.expires < now) this.downloads.delete(t);
    }
    const token = crypto.randomBytes(18).toString('hex');
    this.downloads.set(token, { path: filePath, expires: now + 6 * 60 * 60 * 1000 });
    return `${this.getPocketUrl()}/download?t=${token}`;
  }

  writeSharedTempFile(fileData) {
    if (!fileData || typeof fileData.base64 !== 'string') return null;
    const dir = path.join(os.tmpdir(), 'grokki_share');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const safeName = path.basename(String(fileData.name || 'file.dat')).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'file.dat';
    const target = path.join(dir, `${Date.now()}_${safeName}`);
    fs.writeFileSync(target, Buffer.from(fileData.base64.replace(/^data:.*?base64,/, ''), 'base64'));
    return { path: target, name: safeName, size: fs.statSync(target).size };
  }

  getPairedDevicesPath() {
    try {
      const { getDataDir } = require('./data_dir');
      const dir = getDataDir();
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return path.join(dir, 'pocket_paired_devices.json');
    } catch (e) {
      return path.join(os.homedir(), '.grokki_paired_devices.json');
    }
  }

  loadPairedDevices() {
    try {
      const p = this.getPairedDevicesPath();
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {}
    return [];
  }

  savePairedDevice(device) {
    if (!device || (!device.id && !device.ip)) return;
    try {
      const devices = this.loadPairedDevices();
      const idx = devices.findIndex(d => (device.id && d.id === device.id) || (device.ip && d.ip === device.ip));
      if (idx >= 0) {
        devices[idx] = { ...devices[idx], ...device, lastSeen: Date.now() };
      } else {
        devices.push({ ...device, pairedAt: Date.now(), lastSeen: Date.now() });
      }
      fs.writeFileSync(this.getPairedDevicesPath(), JSON.stringify(devices, null, 2), 'utf8');
    } catch (e) {
      console.warn('[Pocket Grokki] Failed to save paired device:', e);
    }
  }

  async checkLanForPairedDevices() {
    const pairedDevices = this.loadPairedDevices();
    if (!pairedDevices || pairedDevices.length === 0) return;

    const localSubnet = this.localIp.split('.').slice(0, 3).join('.');
    for (const dev of pairedDevices) {
      if (!dev.ip || dev.ip === '127.0.0.1' || dev.ip === 'LAN') continue;
      const devSubnet = dev.ip.split('.').slice(0, 3).join('.');
      if (localSubnet !== devSubnet) continue;

      // Fast ping check on Windows (500ms timeout)
      exec(`ping -n 1 -w 500 ${dev.ip}`, (err, stdout) => {
        const isOnline = !err && (stdout.includes('TTL=') || stdout.includes('Reply from'));
        if (isOnline) {
          console.log(`[Pocket Grokki] 📱 Found paired ${dev.type || 'device'} (${dev.ip}) online on same LAN.`);
          dev.lastSeen = Date.now();
          this.savePairedDevice(dev);

          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('jarvis:pocket-device-connected', {
              deviceType: dev.type || 'Phone',
              clientIp: dev.ip,
              deviceName: dev.name || dev.type,
              isAutoConnected: true,
              totalConnected: this.activeSockets.size
            });
          }
        }
      });
    }
  }

  detectLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const lowerName = name.toLowerCase();
          if (!lowerName.includes('virtual') && !lowerName.includes('vethernet') && !lowerName.includes('wsl')) {
            return iface.address;
          }
        }
      }
    }
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  getPocketUrl(withClaim = false) {
    const base = `http://${this.localIp}:${this.port}`;
    if (withClaim && this.qrSecret) {
      return `${base}/?claim=${this.qrSecret}&summon=1`;
    }
    return base;
  }

  async regenerateQr() {
    this.qrSecret = crypto.randomBytes(16).toString('hex');
    const qrTargetUrl = this.getPocketUrl(true);
    try {
      this.qrDataUrl = await QRCode.toDataURL(qrTargetUrl, {
        margin: 1.5,
        width: 280,
        color: {
          dark: '#030712',
          light: '#f8fafc'
        }
      });
    } catch (e) {
      this.qrDataUrl = null;
    }
    return this.qrDataUrl;
  }

  async start() {
    if (this.isRunning) {
      return this.getStatus();
    }

    this.localIp = this.detectLocalIp();
    if (!this.qrSecret) {
      this.qrSecret = crypto.randomBytes(16).toString('hex');
    }
    const pocketUrl = this.getPocketUrl();
    const qrTargetUrl = this.getPocketUrl(true);

    try {
      this.qrDataUrl = await QRCode.toDataURL(qrTargetUrl, {
        margin: 1.5,
        width: 280,
        color: {
          dark: '#030712',
          light: '#f8fafc'
        }
      });
    } catch (e) {
      console.warn('[Pocket Grokki] Failed to generate QR code data URL:', e);
      this.qrDataUrl = null;
    }

    this.server = http.createServer((req, res) => this.handleHttpRequest(req, res));
    this.wss = new WebSocket.Server({ noServer: true });

    this.server.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });

    this.wss.on('connection', (ws, req) => this.handleWsConnection(ws, req));

    return new Promise((resolve) => {
      this.server.listen(this.port, '0.0.0.0', () => {
        this.isRunning = true;
        console.log(`[Pocket Grokki] 🛸 Dimension Hop server running at ${pocketUrl}`);
        // Auto-check LAN for previously paired devices on launch
        this.checkLanForPairedDevices();
        resolve(this.getStatus());
      });

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          this.port += 1;
          this.server.listen(this.port, '0.0.0.0');
        } else {
          console.error('[Pocket Grokki] Server error:', err);
        }
      });
    });
  }

  stop() {
    if (!this.isRunning) return;
    try {
      for (const ws of this.activeSockets) {
        try { ws.close(); } catch (e) {}
      }
      this.activeSockets.clear();
      this.connectedDevices.clear();
      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }
      if (this.server) {
        this.server.close();
        this.server = null;
      }
      this.isRunning = false;
      console.log('[Pocket Grokki] Dimension Hop Server stopped.');
    } catch (e) {
      console.warn('[Pocket Grokki] Error stopping server:', e);
    }
  }

  getStatus() {
    return {
      active: this.isRunning,
      grokki: true,
      pcName: os.hostname(),
      localIp: this.localIp,
      port: this.port,
      url: this.getPocketUrl(),
      qrDataUrl: this.qrDataUrl,
      connectedCount: this.activeSockets.size,
      connectedDevices: Array.from(this.connectedDevices.values()),
      pairedDevices: this.loadPairedDevices(),
      grokkiLocation: this.grokkiLocation,
      hasMainDevice: !!this.loadOwner(),
      mainDeviceOnline: this.getOwnerSockets().length > 0,
      guestDevices: this.getGuestList()
    };
  }

  broadcast(msgObj) {
    const payload = JSON.stringify(msgObj);
    for (const ws of this.activeSockets) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      } catch (e) {}
    }
  }

  handleHttpRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (url.pathname === '/status') {
      // Public discovery ping only — never leak device lists / QR / IPs to the LAN.
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ grokki: true, active: this.isRunning, pcName: os.hostname() }));
      return;
    }

    if (url.pathname === '/download') {
      this.handleFileDownload(req, res, url);
      return;
    }

    // PC screen + PC upload are main-device only
    if (url.pathname === '/screen' || (url.pathname === '/upload' && req.method === 'POST')) {
      if (!this.isOwnerRequest(req, url)) {
        res.writeHead(403);
        res.end('Main device only');
        return;
      }
      if (url.pathname === '/screen') this.handleScreenCapture(req, res);
      else this.handleUpload(req, res);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(this.renderMobileAppHtml());
  }

  handleFileDownload(req, res, url) {
    const token = url.searchParams.get('t');
    const legacyFile = url.searchParams.get('file');

    let filePath = null;
    if (token) {
      const entry = this.downloads.get(token);
      if (!entry || entry.expires < Date.now()) {
        res.writeHead(404);
        res.end('Link expired');
        return;
      }
      filePath = entry.path;
    } else if (legacyFile) {
      filePath = decodeURIComponent(legacyFile);
    }

    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end('File not found on PC');
      return;
    }

    try {
      const fileName = path.basename(filePath);
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': stat.size,
        'Access-Control-Allow-Origin': '*'
      });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  }

  async handleScreenCapture(req, res) {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1280, height: 720 }
      });
      if (sources && sources.length > 0) {
        const imgBuffer = sources[0].thumbnail.toJPEG(75);
        res.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'Content-Length': imgBuffer.length,
          'Cache-Control': 'no-cache'
        });
        res.end(imgBuffer);
        return;
      }
      res.writeHead(500);
      res.end('Screen capture failed');
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  }

  handleUpload(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (payload.base64) {
          const buffer = Buffer.from(payload.base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
          const tempPath = path.join(os.tmpdir(), `pocket_grokki_${Date.now()}_${payload.name || 'photo.jpg'}`);
          fs.writeFileSync(tempPath, buffer);

          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('jarvis:pocket-photo-received', {
              path: tempPath,
              name: payload.name || 'Phone Camera Photo',
              prompt: payload.prompt || 'Solve and explain this photo from my phone camera'
            });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, path: tempPath }));
          return;
        }
        res.writeHead(400);
        res.end('Missing base64 data');
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });
  }

  handleWsConnection(ws, req) {
    this.activeSockets.add(ws);
    const userAgent = req.headers['user-agent'] || 'Phone';
    const rawIp = req.socket.remoteAddress || 'LAN';
    const clientIp = rawIp.replace(/^::ffff:/, '');
    ws.clientIp = clientIp;
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    ws.deviceType = isIOS ? 'iPhone' : (isAndroid ? 'Android' : 'Phone');
    // Role is decided in the handshake (main device proves itself with its secret key)
    ws.role = 'pending';

    console.log(`[Pocket Grokki] 📱 ${ws.deviceType} (${clientIp}) connecting…`);

    // Drop sockets that never identify themselves
    ws.handshakeTimer = setTimeout(() => {
      if (ws.role === 'pending') {
        try { ws.close(4000, 'Handshake timeout'); } catch (e) {}
      }
    }, 10000);

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        await this.processClientMessage(ws, msg);
      } catch (err) {
        console.warn('[Pocket Grokki WS] Message error:', err);
      }
    });

    ws.on('close', () => {
      clearTimeout(ws.handshakeTimer);
      this.activeSockets.delete(ws);
      this.connectedDevices.delete(ws);
      console.log(`[Pocket Grokki] 📱 ${ws.deviceName || ws.deviceType} (${ws.role}) disconnected.`);

      // A sub-device left while hosting Grokki -> he flies home to the host device (or PC)
      if ((ws.role === 'sub' || ws.role === 'guest') && this.grokkiHolder === ws.peerId && this.getPeerSockets(ws.peerId).length === 0) {
        if (this.getOwnerSockets().length > 0) {
          this.grokkiHolder = 'owner';
          this.sendToOwner({ type: 'hop_land_on_phone', location: 'phone', fromName: ws.deviceName });
        } else {
          this.grokkiHolder = 'pc';
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('jarvis:grokki-hopped-to-pc', { instruction: null, filePath: null, fileName: null });
          }
        }
        this.syncLocations();
      }
      if (ws.role === 'sub' || ws.role === 'guest') this.pushDeviceList();

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('jarvis:pocket-device-disconnected', {
          totalConnected: this.activeSockets.size,
          role: ws.role
        });
      }
    });
  }

  handleHandshake(ws, msg) {
    if (ws.role !== 'pending') return;
    clearTimeout(ws.handshakeTimer);

    const rawId = typeof msg.deviceId === 'string' ? msg.deviceId : '';
    const deviceId = rawId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || `phone_${crypto.randomBytes(6).toString('hex')}`;
    if (msg.deviceType && /^(iPhone|Android|Phone)$/.test(msg.deviceType)) ws.deviceType = msg.deviceType;

    let owner = this.loadOwner();
    let issuedKey = null;
    let shouldSummon = false;

    const hasValidClaim = Boolean(msg.claim && typeof msg.claim === 'string' && this.qrSecret && msg.claim === this.qrSecret);
    const isHostKey = this.isOwnerKey(msg.ownerKey);
    const isHostDevice = Boolean(owner && ((owner.deviceId && owner.deviceId === deviceId) || (owner.ip && owner.ip === ws.clientIp)));

    if (!owner || hasValidClaim) {
      // 1. FIRST PERSON TO SCAN OR PHYSICAL QR SCANNER BECOMES HOST!
      issuedKey = owner?.key || crypto.randomBytes(32).toString('hex');
      owner = { key: issuedKey, deviceId, type: ws.deviceType, ip: ws.clientIp, claimedAt: Date.now() };
      this.saveOwner(owner);

      ws.role = 'owner';
      ws.peerId = 'owner';
      ws.deviceName = `${ws.deviceType} (Host)`;
      shouldSummon = true;
      this.regenerateQr().catch(() => {});
      console.log(`[Pocket Grokki] 👑 Claimed permanent HOST by ${ws.deviceName}`);
    } else if (isHostKey || isHostDevice) {
      // 2. EXISTING HOST RECONNECTING
      ws.role = 'owner';
      ws.peerId = 'owner';
      ws.deviceName = `${ws.deviceType} (Host)`;
      issuedKey = owner.key;
      shouldSummon = Boolean(msg.summon === true || msg.summon === '1');
    } else {
      // 3. ANY OTHER PHONE CONNECTING OVER LAN IS A SUB-DEVICE!
      ws.role = 'sub';
      ws.peerId = `g_${deviceId}`;
      const lastOctet = (ws.clientIp || '').split('.').pop();
      ws.deviceName = `${ws.deviceType}${lastOctet && /^\d+$/.test(lastOctet) ? ' · ' + lastOctet : ''}`;
      shouldSummon = false;
    }

    if (ws.role === 'owner') {
      this.savePairedDevice({ id: deviceId, type: ws.deviceType, ip: ws.clientIp, name: ws.deviceName });
    }

    this.connectedDevices.set(ws, {
      id: ws.peerId, type: ws.deviceType, ip: ws.clientIp, role: ws.role, connectedAt: new Date().toLocaleTimeString()
    });

    console.log(`[Pocket Grokki] 📱 ${ws.deviceName} joined as ${ws.role.toUpperCase()}`);

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('jarvis:pocket-device-connected', {
        deviceType: ws.deviceType,
        clientIp: ws.clientIp,
        role: ws.role,
        totalConnected: this.activeSockets.size,
        isAutoConnected: !shouldSummon
      });
    }

    if (ws.role === 'owner') {
      // ONLY trigger departure from PC if Grokki was summoned AND is currently on PC
      const shouldHopFromPc = shouldSummon && (this.grokkiHolder !== 'owner');

      this.sendTo(ws, {
        type: 'welcome',
        role: 'owner',
        ownerKey: issuedKey || owner?.key || undefined,
        deviceType: ws.deviceType,
        deviceName: ws.deviceName,
        pcName: os.hostname(),
        grokkiLocation: shouldHopFromPc ? 'phone' : (this.grokkiHolder === 'owner' ? 'phone' : 'pc'),
        holderName: this.getHolderName(),
        isAutoConnected: !shouldSummon
      });

      this.pushDeviceList();

      if (shouldHopFromPc) {
        this.grokkiHolder = 'owner';
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('jarvis:grokki-hopped-to-phone');
        }
        setTimeout(() => {
          this.sendTo(ws, { type: 'hop_land_on_phone', location: 'phone' });
          this.syncLocations();
          this.pushDeviceList();
        }, 450);
      }
    } else {
      const isHolder = (this.grokkiHolder === ws.peerId);
      this.sendTo(ws, {
        type: 'welcome',
        role: 'sub',
        deviceType: ws.deviceType,
        deviceName: ws.deviceName,
        pcName: os.hostname(),
        grokkiLocation: isHolder ? 'phone' : 'away',
        holderName: this.getHolderName(),
        isAutoConnected: true
      });
      this.pushDeviceList();
    }
  }

  denied(ws, action, message) {
    this.sendTo(ws, { type: 'access_denied', action, message });
  }

  async handleSendToDevice(ws, msg) {
    if (ws.role !== 'owner') {
      this.denied(ws, 'send_to_device', 'Only the main device can send Grokki to other devices');
      return;
    }
    const targetPeerId = msg.targetDeviceId;
    if (!targetPeerId) return;

    const guestSockets = this.getPeerSockets(targetPeerId);
    if (guestSockets.length === 0) {
      this.sendTo(ws, { type: 'error_toast', message: 'Target device is no longer online' });
      return;
    }
    const guestWs = guestSockets[0];

    let sharedFile = null;
    let dlUrl = null;
    if (msg.fileData) {
      try {
        sharedFile = this.writeSharedTempFile(msg.fileData);
        if (sharedFile) {
          dlUrl = this.registerDownload(sharedFile.path);
        }
      } catch (e) {
        console.warn('[Pocket Grokki] Failed to write shared file:', e);
      }
    }

    // 1. Main phone: Grokki launches
    this.sendTo(ws, {
      type: 'grokki_dispatched_to_guest',
      targetName: guestWs.deviceName || 'Guest Device'
    });

    // 2. Flight duration 1100ms
    setTimeout(() => {
      this.grokkiHolder = targetPeerId;
      this.syncLocations();
      this.pushDeviceList();

      // 3. Guest phone: Grokki lands!
      this.sendToPeer(targetPeerId, {
        type: 'hop_land_on_phone',
        location: 'phone',
        fromName: ws.deviceName || 'Main Device',
        file: sharedFile ? {
          name: sharedFile.name,
          size: sharedFile.size,
          downloadUrl: dlUrl
        } : null
      });
    }, 1100);
  }

  async handleGuestReturn(ws, msg) {
    if ((ws.role !== 'sub' && ws.role !== 'guest') || this.grokkiHolder !== ws.peerId) {
      return;
    }

    let sharedFile = null;
    let dlUrl = null;
    if (msg.fileData) {
      try {
        sharedFile = this.writeSharedTempFile(msg.fileData);
        if (sharedFile) {
          dlUrl = this.registerDownload(sharedFile.path);
        }
      } catch (e) {
        console.warn('[Pocket Grokki] Failed to write guest shared file:', e);
      }
    }

    this.sendTo(ws, { type: 'grokki_returned_home' });

    const ownerOnline = this.getOwnerSockets().length > 0;

    setTimeout(() => {
      if (ownerOnline) {
        this.grokkiHolder = 'owner';
        this.syncLocations();
        this.pushDeviceList();
        this.sendToOwner({
          type: 'hop_land_on_phone',
          location: 'phone',
          fromName: ws.deviceName || 'Guest Device',
          file: sharedFile ? {
            name: sharedFile.name,
            size: sharedFile.size,
            downloadUrl: dlUrl
          } : null
        });
      } else {
        // Owner phone not connected -> fly back to PC!
        this.grokkiHolder = 'pc';
        this.syncLocations();
        this.pushDeviceList();
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('jarvis:grokki-hopped-to-pc', {
            instruction: null,
            filePath: sharedFile ? sharedFile.path : null,
            fileName: sharedFile ? sharedFile.name : null
          });
        }
      }
    }, 1100);
  }

  transferBetweenPhones(fromWs, toWs, fileData) {
    if (!fromWs || !toWs || fromWs === toWs) return;

    let sharedFile = null;
    let dlUrl = null;
    if (fileData) {
      try {
        sharedFile = this.writeSharedTempFile(fileData);
        if (sharedFile) dlUrl = this.registerDownload(sharedFile.path);
      } catch (e) {
        console.warn('[Pocket Grokki] Failed to write top transfer file:', e);
      }
    }

    console.log(`[Pocket Grokki] 💫 Top-touch transfer: Grokki passing from ${fromWs.deviceName} to ${toWs.deviceName}`);

    // 1. Source phone: Grokki exits out the top edge!
    this.sendTo(fromWs, {
      type: 'grokki_top_exit',
      targetName: toWs.deviceName || 'Phone'
    });

    // 2. Flight transition across touching tops (650ms)
    setTimeout(() => {
      this.grokkiHolder = toWs.peerId;
      this.syncLocations();
      this.pushDeviceList();

      // 3. Destination phone: Grokki enters through the top edge!
      this.sendTo(toWs, {
        type: 'grokki_top_enter',
        location: 'phone',
        fromName: fromWs.deviceName || 'Phone',
        file: sharedFile ? {
          name: sharedFile.name,
          size: sharedFile.size,
          downloadUrl: dlUrl
        } : null
      });
    }, 650);
  }

  handlePhoneBump(ws, msg) {
    const now = Date.now();
    ws.lastBumpTime = now;

    // Check if another phone bumped within ±700ms
    let matchedPeer = null;
    for (const sock of this.activeSockets) {
      if (sock !== ws && sock.readyState === WebSocket.OPEN) {
        if (sock.lastBumpTime && (now - sock.lastBumpTime < 700)) {
          matchedPeer = sock;
          break;
        }
      }
    }

    // If no recent bump match, but there is 1 other phone connected on LAN:
    if (!matchedPeer) {
      const otherSockets = Array.from(this.activeSockets).filter(s => s !== ws && s.readyState === WebSocket.OPEN && (s.role === 'owner' || s.role === 'sub' || s.role === 'guest'));
      if (otherSockets.length === 1) {
        matchedPeer = otherSockets[0];
      }
    }

    if (!matchedPeer) {
      console.log(`[Pocket Grokki] 📱 Top contact registered from ${ws.deviceName}, waiting for matching phone...`);
      return;
    }

    console.log(`[Pocket Grokki] ⚡ Top touch contact between ${ws.deviceName} and ${matchedPeer.deviceName}!`);

    // The phone that currently has Grokki gives him to the other phone!
    if (this.grokkiHolder === ws.peerId) {
      this.transferBetweenPhones(ws, matchedPeer, msg.fileData);
    } else if (this.grokkiHolder === matchedPeer.peerId) {
      this.transferBetweenPhones(matchedPeer, ws, msg.fileData);
    } else {
      // Grokki was on PC or transitioning: Host phone gets priority
      if (ws.role === 'owner') {
        this.transferBetweenPhones(ws, matchedPeer, msg.fileData);
      } else if (matchedPeer.role === 'owner') {
        this.transferBetweenPhones(matchedPeer, ws, msg.fileData);
      }
    }
  }

  handleTopEdgeTransfer(ws, msg) {
    let targetWs = null;
    if (ws.role === 'owner') {
      const guestSocks = Array.from(this.activeSockets).filter(s => (s.role === 'sub' || s.role === 'guest') && s.readyState === WebSocket.OPEN);
      if (guestSocks.length > 0) targetWs = guestSocks[0];
    } else {
      const ownerSocks = this.getOwnerSockets();
      if (ownerSocks.length > 0) targetWs = ownerSocks[0];
    }

    if (targetWs) {
      this.transferBetweenPhones(ws, targetWs, msg.fileData);
    } else {
      this.sendTo(ws, { type: 'error_toast', message: 'No other phone connected on LAN' });
    }
  }

  async processClientMessage(ws, msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'client_handshake') {
      this.handleHandshake(ws, msg);
      return;
    }

    if (ws.role === 'pending') return;

    const isOwner = ws.role === 'owner';
    const OWNER_ONLY = new Set([
      'dimension_hop_to_pc', 'hop_to_pc', 'hop_to_phone',
      'direct_os_control', 'send_to_device', 'list_devices',
      'kill_sub_sessions'
    ]);
    const GUEST_ONLY = new Set(['guest_return']);

    if (OWNER_ONLY.has(msg.type) && !isOwner) {
      this.denied(ws, msg.type, 'Only the main device can do that');
      return;
    }
    if (GUEST_ONLY.has(msg.type) && isOwner) return;

    if (msg.type === 'kill_sub_sessions') {
      const count = this.killSubSessions();
      ws.send(JSON.stringify({
        type: 'sub_sessions_killed',
        count,
        message: count > 0 ? `Disconnected ${count} sub-device${count === 1 ? '' : 's'}` : 'No sub-devices connected'
      }));
      return;
    }

    // Grokki is visiting a guest — the main device must summon him back before PC tasks
    if (isOwner && ['mobile_chat', 'dimension_hop_to_pc', 'hop_to_pc'].includes(msg.type) &&
        this.grokkiHolder !== 'owner' && this.grokkiHolder !== 'pc') {
      this.denied(ws, msg.type, `Grokki is visiting ${this.getHolderName()}`);
      return;
    }

    if (msg.type === 'list_devices') {
      this.pushDeviceList();
      return;
    }

    if (msg.type === 'send_to_device') {
      await this.handleSendToDevice(ws, msg);
      return;
    }

    if (msg.type === 'guest_return') {
      await this.handleGuestReturn(ws, msg);
      return;
    }

    // Top-to-top phone physical bump / contact transfer
    if (msg.type === 'phone_bump') {
      this.handlePhoneBump(ws, msg);
      return;
    }

    if (msg.type === 'top_edge_transfer') {
      this.handleTopEdgeTransfer(ws, msg);
      return;
    }

    // 1. MOBILE CHAT (Grokki stays on phone and replies directly)
    if (msg.type === 'mobile_chat') {
      const text = (msg.text || '').trim();
      if (!text) return;

      if (this.agentBrain && (typeof this.agentBrain.run === 'function' || typeof this.agentBrain.process === 'function')) {
        try {
          const config = typeof this.loadConfig === 'function' ? this.loadConfig() : {};
          const runner = this.agentBrain.run || this.agentBrain.process;
          const res = await runner.call(this.agentBrain, text, config, { source: 'pocket_mobile_chat' });
          const reply = res?.reply || res?.text || 'Done!';

          ws.send(JSON.stringify({
            type: 'mobile_chat_reply',
            reply
          }));
        } catch (e) {
          ws.send(JSON.stringify({
            type: 'mobile_chat_reply',
            reply: `Error: ${e.message}`
          }));
        }
      } else {
        ws.send(JSON.stringify({
          type: 'mobile_chat_reply',
          reply: `Grokki: "${text}"`
        }));
      }
    }

    // 2. DIMENSION TASK: GROKKI FLIES TO PC CARRYING FILE / INSTRUCTION
    else if (msg.type === 'dimension_hop_to_pc') {
      const instruction = (msg.instruction || '').trim();
      const fileData = msg.fileData || null;

      this.grokkiHolder = 'pc';
      this.syncLocations();

      // If no task or file was provided, simply return Grokki to PC with ZERO task execution
      if (!instruction && !fileData) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('jarvis:grokki-hopped-to-pc', {
            instruction: null,
            filePath: null,
            fileName: null
          });
        }
        return;
      }

      let tempPath = null;
      if (fileData && fileData.base64) {
        try {
          const buffer = Buffer.from(fileData.base64.replace(/^data:.*base64,/, ''), 'base64');
          tempPath = path.join(os.tmpdir(), `pocket_${Date.now()}_${fileData.name || 'file.dat'}`);
          fs.writeFileSync(tempPath, buffer);
        } catch (e) {
          console.warn('[Pocket Grokki] Temp file write error:', e);
        }
      }

      // Check if user asked to save / store file on PC (NEVER trigger vision or AI analysis when saving!)
      if (fileData && fileData.base64) {
        const isExplicitSave = /\b(save|put|store|move|copy|download|keep|transfer|export)\b/i.test(instruction) ||
          /\b(desktop|downloads?|documents?|pictures?|videos?)\b/i.test(instruction) ||
          !instruction;
        const isAnalysisPrompt = /\b(what|explain|describe|solve|read|analyze|inspect|ocr|transcribe|summarize|detail|who|where)\b|\?/i.test(instruction);

        if (isExplicitSave && !isAnalysisPrompt) {
          let targetDir = path.join(os.homedir(), 'Desktop');
          const lower = (instruction || '').toLowerCase();
          if (/\bdownload(s)?\b/i.test(lower)) targetDir = path.join(os.homedir(), 'Downloads');
          else if (/\bdocument(s)?\b/i.test(lower)) targetDir = path.join(os.homedir(), 'Documents');
          else if (/\b(picture|photo)(s)?\b/i.test(lower)) targetDir = path.join(os.homedir(), 'Pictures');
          else if (/\bvideo(s)?\b/i.test(lower)) targetDir = path.join(os.homedir(), 'Videos');
          const driveMatch = (instruction || '').match(/\b([a-z]:\\[^ "']+)/i);
          if (driveMatch) targetDir = driveMatch[1];

          try {
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            let savePath = path.join(targetDir, fileData.name || 'file.dat');
            if (fs.existsSync(savePath)) {
              const ext = path.extname(fileData.name || '');
              const base = path.basename(fileData.name || 'file', ext);
              savePath = path.join(targetDir, `${base}_${Date.now()}${ext}`);
            }

            const buffer = Buffer.from(fileData.base64.replace(/^data:.*base64,/, ''), 'base64');
            fs.writeFileSync(savePath, buffer);

            // Highlight saved file in Windows Explorer!
            try {
              shell.showItemInFolder(savePath);
            } catch (err) {}

            const replyMsg = `✅ Grokki saved **\`${path.basename(savePath)}\`** to your PC at:\n\`${savePath}\``;

            ws.send(JSON.stringify({
              type: 'dimension_task_complete',
              reply: replyMsg
            }));

            // Spawn Grokki on PC with pure confirmation — DO NOT EXECUTE PROMPT OR ACTIVATE VISION!
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send('jarvis:grokki-hopped-to-pc', {
                action: 'file_saved',
                instruction: null, // DO NOT EXECUTE AS PROMPT!
                filePath: null,    // DO NOT ATTACH AS INPUT BAR ATTACHMENT!
                savePath: savePath,
                fileName: path.basename(savePath),
                targetDir: targetDir
              });
            }
            return;
          } catch (err) {
            console.warn('[Pocket Grokki] Error saving file to folder:', err);
          }
        }
      }

      // Notify PC Dynamic Island to spawn Grokki back
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('jarvis:grokki-hopped-to-pc', {
          instruction,
          filePath: tempPath,
          fileName: fileData ? fileData.name : null
        });
      }

      // Check if user is asking to grab / fetch a file from PC to phone
      const grabRegex = /\b(grab|fetch|get|bring|transfer|send|download|beam)\s+(.+?)(?:\s+from\s+(?:my\s+)?pc|\s+from\s+(?:my\s+)?desktop|\s+from\s+(?:my\s+)?downloads|\s+from\s+(?:my\s+)?documents|$)/i;
      const grabMatch = instruction.match(grabRegex);
      const isGrabRequest = !!grabMatch && !fileData;

      if (isGrabRequest) {
        const queryTerm = (grabMatch[2] || '').trim();
        console.log(`[Pocket Grokki] Searching PC for file: "${queryTerm}"`);

        try {
          const searchRes = await powerTools.searchFilesAndFolders({
            query: queryTerm,
            open_in_explorer: false,
            open_file: false
          });

          if (searchRes && searchRes.topMatches && searchRes.topMatches.length > 0) {
            const topMatch = searchRes.topMatches[0];
            const downloadUrl = this.registerDownload(topMatch.path);

            ws.send(JSON.stringify({
              type: 'dimension_task_complete',
              reply: `Grokki retrieved **${topMatch.name}** (${Math.round((topMatch.size || 0) / 1024)} KB) from your PC!`,
              file: {
                name: topMatch.name,
                path: topMatch.path,
                size: topMatch.size,
                downloadUrl
              }
            }));

            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send('jarvis:pocket-task-completed', {
                reply: `Beamed \`${topMatch.name}\` to phone.`,
                fileName: topMatch.name
              });
            }
            return;
          }
        } catch (err) {
          console.warn('[Pocket Grokki] Error searching for file:', err);
        }
      }

      // Normal execution via AgentBrain
      if (this.agentBrain && (typeof this.agentBrain.run === 'function' || typeof this.agentBrain.process === 'function')) {
        try {
          const config = typeof this.loadConfig === 'function' ? this.loadConfig() : {};
          const runner = this.agentBrain.run || this.agentBrain.process;

          const promptToRun = instruction || (tempPath ? 'Please analyze, summarize, or explain this file in detail.' : 'Ready for orders.');
          const res = await runner.call(this.agentBrain, promptToRun, config, {
            attachedFile: tempPath ? { path: tempPath, name: fileData.name } : null,
            source: 'pocket_phone'
          });

          const reply = res?.reply || res?.text || 'Task finished on PC!';

          let outputFile = null;
          if (res.actionsExecuted && res.actionsExecuted.length > 0) {
            for (const act of res.actionsExecuted) {
              const resObj = act.result || {};
              const possiblePath = resObj.filePath || resObj.targetPath || resObj.savedPath || resObj.path;
              if (possiblePath && fs.existsSync(possiblePath)) {
                outputFile = {
                  name: path.basename(possiblePath),
                  path: possiblePath,
                  downloadUrl: this.registerDownload(possiblePath)
                };
                break;
              }
            }
          }

          ws.send(JSON.stringify({
            type: 'dimension_task_complete',
            reply,
            file: outputFile
          }));

          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('jarvis:pocket-task-completed', { reply, outputFile });
          }
        } catch (e) {
          ws.send(JSON.stringify({
            type: 'dimension_task_complete',
            reply: `Error running task on PC: ${e.message}`,
            error: true
          }));
        }
      } else {
        ws.send(JSON.stringify({
          type: 'dimension_task_complete',
          reply: `Received: "${instruction}"`
        }));
      }
    }

    // 3. HOP BACK TO PC DIRECTLY (PURE RETURN, NO INSTRUCTION)
    else if (msg.type === 'hop_to_pc') {
      this.grokkiHolder = 'pc';
      this.syncLocations();
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('jarvis:grokki-hopped-to-pc', {
          instruction: null,
          filePath: null,
          fileName: null
        });
      }
    }

    // 4. SUMMON GROKKI BACK TO THE MAIN PHONE (from PC or from a guest device)
    else if (msg.type === 'hop_to_phone') {
      const from = this.grokkiHolder;

      if (from === 'pc') {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('jarvis:grokki-hopped-to-phone');
        }
      } else if (from && from !== 'owner') {
        // Recall from a guest: Grokki takes off from their screen first
        this.sendToPeer(from, { type: 'grokki_recalled' });
      }

      this.grokkiHolder = 'owner';
      this.syncLocations();
      setTimeout(() => {
        this.sendToOwner({ type: 'hop_land_on_phone', location: 'phone' });
      }, 450);
    }

    // 5. DIRECT OS CONTROL (Volume, Sleep, Sign out, Power, Media, Mic, Screenshot)
    else if (msg.type === 'direct_os_control') {
      try {
        const result = await this.executeDirectOsControl(msg.action, msg.value);
        ws.send(JSON.stringify({
          type: 'os_control_result',
          action: msg.action,
          ...result
        }));
      } catch (err) {
        ws.send(JSON.stringify({
          type: 'os_control_result',
          action: msg.action,
          success: false,
          message: err.message
        }));
      }
    }
  }

  async executeDirectOsControl(action, value) {
    const scriptPath = path.join(__dirname, 'os_input.ps1').replace('app.asar', 'app.asar.unpacked');
    const runPs = (args) => {
      return new Promise((resolve) => {
        exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" ${args}`, { timeout: 10000 }, (err, stdout, stderr) => {
          if (err) {
            console.warn(`[Pocket OS Control] ${args} error:`, err.message);
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, output: (stdout || '').trim() });
          }
        });
      });
    };

    switch (action) {
      case 'volume_get': {
        const res = await runPs('-action volume-get');
        const vol = parseInt(res.output, 10);
        return { success: res.success, volume: isNaN(vol) ? 50 : vol, message: `Volume: ${isNaN(vol) ? 50 : vol}%` };
      }
      case 'volume_set': {
        const v = Math.max(0, Math.min(100, parseInt(value, 10) || 50));
        const res = await runPs(`-action volume-set -volume ${v}`);
        return { success: res.success, volume: v, message: `Volume set to ${v}%` };
      }
      case 'volume_up': {
        const res = await runPs('-action volume-up');
        const vol = parseInt(res.output, 10);
        return { success: res.success, volume: isNaN(vol) ? undefined : vol, message: `Volume raised${!isNaN(vol) ? ' to ' + vol + '%' : ''}` };
      }
      case 'volume_down': {
        const res = await runPs('-action volume-down');
        const vol = parseInt(res.output, 10);
        return { success: res.success, volume: isNaN(vol) ? undefined : vol, message: `Volume lowered${!isNaN(vol) ? ' to ' + vol + '%' : ''}` };
      }
      case 'volume_mute': {
        const res = await runPs('-action volume-toggle');
        const isMuted = (res.output || '').toLowerCase().includes('true');
        return { success: res.success, muted: isMuted, message: isMuted ? 'Muted audio' : 'Unmuted audio' };
      }
      case 'media_play': {
        await runPs('-action media -keys play');
        return { success: true, message: 'Media Play/Pause toggled' };
      }
      case 'media_next': {
        await runPs('-action media -keys next');
        return { success: true, message: 'Next track' };
      }
      case 'media_prev': {
        await runPs('-action media -keys prev');
        return { success: true, message: 'Previous track' };
      }
      case 'mic_mute': {
        await runPs('-action mic-mute');
        return { success: true, message: 'Microphone mute toggled' };
      }
      case 'lock': {
        await runPs('-action system-power -keys lock');
        return { success: true, message: 'PC locked' };
      }
      case 'sleep': {
        setTimeout(() => {
          runPs('-action system-power -keys sleep');
        }, 500);
        return { success: true, message: 'Putting PC to sleep...' };
      }
      case 'signout': {
        setTimeout(() => {
          exec('shutdown.exe /l', (err) => {
            if (err) console.warn('[Pocket OS Control] Sign out error:', err);
          });
        }, 800);
        return { success: true, message: 'Signing out of Windows...' };
      }
      case 'shutdown': {
        exec('shutdown.exe /s /t 15 /c "Shutdown scheduled by Grokki Mobile Companion (15s to cancel)"');
        return { success: true, message: 'PC shutdown in 15s. Click Cancel Power to abort.' };
      }
      case 'restart': {
        exec('shutdown.exe /r /t 15 /c "Restart scheduled by Grokki Mobile Companion (15s to cancel)"');
        return { success: true, message: 'PC restart in 15s. Click Cancel Power to abort.' };
      }
      case 'cancel_power': {
        exec('shutdown.exe /a');
        return { success: true, message: 'Shutdown/Restart cancelled!' };
      }
      case 'screenshot': {
        try {
          const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 }
          });
          if (sources && sources.length > 0) {
            const imgBuffer = sources[0].thumbnail.toJPEG(85);
            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            const target = path.join(os.tmpdir(), `PC_Screenshot_${stamp}.jpg`);
            fs.writeFileSync(target, imgBuffer);
            this.beamFileToPhone(target);
            return { success: true, message: 'PC screenshot captured and beamed to phone!' };
          }
        } catch (e) {
          console.warn('[Pocket OS Control] Screenshot error:', e);
        }
        return { success: false, message: 'Screenshot capture failed' };
      }
      default:
        return { success: false, message: `Unknown OS action: ${action}` };
    }
  }

  hopToPhone() {
    this.grokkiHolder = 'owner';
    this.syncLocations();
    this.sendToOwner({ type: 'hop_land_on_phone', location: 'phone' });
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('jarvis:grokki-hopped-to-phone');
    }
    return true;
  }

  hopToPc() {
    this.grokkiHolder = 'pc';
    this.syncLocations();
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('jarvis:grokki-hopped-to-pc', {
        instruction: null,
        filePath: null,
        fileName: null
      });
    }
    return true;
  }

  beamFileToPhone(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const fileName = path.basename(filePath);
    const stat = fs.statSync(filePath);
    const downloadUrl = this.registerDownload(filePath);

    this.sendToOwner({
      type: 'file_beamed_to_phone',
      fileName,
      fileSize: stat.size,
      downloadUrl
    });
    return true;
  }

  renderMobileAppHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#000000">
  <title>Grokki</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    }

    html, body {
      background: #000;
      color: #fff;
      height: 100%;
      width: 100%;
      overflow: hidden;
      position: fixed;
      user-select: none;
      -webkit-user-select: none;
    }

    body {
      display: flex;
      flex-direction: column;
      height: 100dvh;
    }

    .ambient {
      position: fixed;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at 50% 42%, rgba(156, 67, 254, 0.20) 0%, rgba(76, 194, 233, 0.07) 38%, rgba(0, 0, 0, 0) 68%);
    }

    /* Top Bar & Status */
    .top-bar {
      position: relative;
      z-index: 30;
      padding: max(env(safe-area-inset-top), 14px) 18px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
    }
    .top-spacer {
      width: 38px;
      height: 38px;
      visibility: hidden;
      flex-shrink: 0;
    }
    .status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.55);
      letter-spacing: -0.1px;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #30d158;
      transition: background 0.3s ease;
    }
    .dot.off { background: #ff453a; }

    .top-btn {
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 0.5px solid rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(25px) saturate(160%);
      -webkit-backdrop-filter: blur(25px) saturate(160%);
      color: rgba(255, 255, 255, 0.88);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.16s ease, background 0.2s ease;
    }
    .top-btn:active {
      transform: scale(0.92);
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    .top-btn svg {
      width: 19px;
      height: 19px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .shoot-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      background: #60a5fa;
      color: #000;
      font-size: 10px;
      font-weight: 700;
      border-radius: 99px;
      padding: 1px 5px;
      min-width: 14px;
      text-align: center;
      line-height: 14px;
    }

    /* Stage */
    .stage {
      position: relative;
      z-index: 2;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0 24px;
    }

    /* Dimensional Top Portal - Liquid Light Horizon (Completely invisible at rest) */
    .top-portal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 140px;
      pointer-events: none;
      z-index: 50;
      overflow: hidden;
      opacity: 0;
      transform: translateY(-20px);
      transition: opacity 0.35s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .top-portal.active,
    .top-portal.flaring {
      opacity: 1;
      transform: translateY(0);
    }
    .portal-fluid {
      position: absolute;
      top: -80px;
      left: 50%;
      transform: translateX(-50%);
      width: 140%;
      height: 160px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 35%, rgba(255, 255, 255, 0.4) 0%, rgba(147, 197, 253, 0.22) 28%, rgba(192, 132, 252, 0.12) 55%, transparent 75%);
      filter: blur(16px);
    }
    .portal-glow {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: min(84vw, 320px);
      height: 2.5px;
      border-radius: 0 0 99px 99px;
      background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%);
      box-shadow: 0 0 16px rgba(255, 255, 255, 0.6), 0 0 35px rgba(147, 197, 253, 0.4);
    }
    .top-portal.flaring .portal-fluid {
      transform: translateX(-50%) scaleY(1.35);
      background: radial-gradient(ellipse at 50% 35%, rgba(255, 255, 255, 0.65) 0%, rgba(147, 197, 253, 0.38) 32%, rgba(192, 132, 252, 0.2) 60%, transparent 80%);
      filter: blur(20px);
    }
    .top-portal.flaring .portal-glow {
      width: min(92vw, 360px);
      height: 3.5px;
      box-shadow: 0 0 24px rgba(255, 255, 255, 0.9), 0 0 45px rgba(147, 197, 253, 0.6);
    }

    /* Grokki Frosted Letter Folio (Human-crafted Envelope Animation) */
    .envelope-pod {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 164px;
      height: 110px;
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
      pointer-events: none;
      z-index: 25;
      perspective: 700px;
      transition: transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
    }
    .envelope-pod.visible {
      transform: translate(-50%, calc(-50% + 54px)) scale(1);
      opacity: 1;
    }
    .env-letter {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 18px;
    }
    .env-sheet {
      position: absolute;
      top: 10px;
      left: 12px;
      right: 12px;
      height: 76px;
      background: #ffffff;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 6px 10px;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
      transition: transform 0.44s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      z-index: 2;
    }
    .env-sheet.tucked {
      transform: translateY(22px) scale(0.92);
      opacity: 0.9;
    }
    .env-sheet.ejected {
      transform: translateY(-56px) scale(1.08);
      box-shadow: 0 14px 32px rgba(0, 0, 0, 0.45), 0 0 24px rgba(96, 165, 250, 0.4);
      opacity: 1;
    }
    .env-file-icon {
      width: 24px;
      height: 24px;
      color: #3b82f6;
    }
    .env-file-icon svg {
      width: 100%;
      height: 100%;
      stroke: currentColor;
      fill: none;
      stroke-width: 2.2;
    }
    .env-file-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 120px;
    }
    .env-file-name {
      font-size: 11.5px;
      font-weight: 700;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
      width: 100%;
    }
    .env-file-tag {
      font-size: 9.5px;
      font-weight: 500;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .env-body {
      position: absolute;
      inset: 0;
      border-radius: 18px;
      overflow: hidden;
      z-index: 3;
      pointer-events: none;
    }
    .env-seam-svg {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 18px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65), 0 0 20px rgba(96, 165, 250, 0.12);
    }
    .env-flap-wrap {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      transform-origin: top center;
      transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 4;
      pointer-events: none;
    }
    .env-flap-wrap.closed {
      transform: rotateX(180deg);
      z-index: 5;
    }
    .env-flap-svg {
      width: 100%;
      height: 100%;
      display: block;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
    }
    .env-stamp {
      position: absolute;
      top: 48px;
      left: 50%;
      transform: translateX(-50%) scale(0);
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%);
      border: 1.5px solid rgba(255, 255, 255, 0.85);
      box-shadow: 0 4px 14px rgba(217, 119, 6, 0.55), 0 0 10px rgba(252, 211, 77, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 6;
      transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .env-stamp.sealed {
      transform: translateX(-50%) scale(1);
    }
    .env-stamp-gem {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1.5px solid rgba(255, 255, 255, 0.7);
    }

    .grokki {
      position: relative;
      width: min(78vw, 42vh, 340px);
      height: min(78vw, 42vh, 340px);
      touch-action: none;
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .orb {
      position: absolute;
      inset: 0;
      pointer-events: none;
      filter: drop-shadow(0 0 36px rgba(156, 67, 254, 0.45));
    }
    .orb canvas {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }

    #characterCanvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .subtitle {
      margin-top: 26px;
      font-size: 17px;
      font-weight: 500;
      letter-spacing: -0.3px;
      color: rgba(255, 255, 255, 0.8);
      text-align: center;
      max-width: 320px;
      line-height: 1.35;
      min-height: 23px;
    }

    .reply {
      display: none;
      margin-top: 14px;
      max-width: 100%;
      width: 100%;
      max-width: 400px;
      max-height: 22vh;
      overflow-y: auto;
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.08);
      border: 0.5px solid rgba(255, 255, 255, 0.14);
      backdrop-filter: blur(30px) saturate(160%);
      -webkit-backdrop-filter: blur(30px) saturate(160%);
      border-radius: 22px;
      font-size: 15px;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.92);
      user-select: text;
      -webkit-user-select: text;
      animation: pop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .file-pill {
      display: none;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      max-width: 300px;
      padding: 8px 8px 8px 14px;
      background: rgba(255, 255, 255, 0.1);
      border: 0.5px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      font-size: 14px;
      font-weight: 500;
      animation: pop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .file-pill.on { display: flex; }
    .file-pill span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file-pill button {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
      font-size: 11px;
      cursor: pointer;
    }

    @keyframes pop {
      from { opacity: 0; transform: scale(0.96) translateY(6px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* Dock */
    .dock {
      position: relative;
      z-index: 10;
      flex-shrink: 0;
      padding: 0 20px max(env(safe-area-inset-bottom), 18px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .input-bar {
      display: none;
      width: 100%;
      max-width: 420px;
      align-items: center;
      padding: 5px 5px 5px 20px;
      background: rgba(255, 255, 255, 0.1);
      border: 0.5px solid rgba(255, 255, 255, 0.16);
      backdrop-filter: blur(30px) saturate(160%);
      -webkit-backdrop-filter: blur(30px) saturate(160%);
      border-radius: 999px;
      animation: pop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .input-bar.open { display: flex; }
    .input-bar input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
      color: #fff;
      font-size: 16px;
      padding: 10px 0;
      user-select: text;
      -webkit-user-select: text;
    }
    .input-bar input::placeholder { color: rgba(255, 255, 255, 0.38); }

    .go {
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: none;
      background: #fff;
      color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    .go:active { transform: scale(0.9); }

    .row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .btn {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      border: 0.5px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.09);
      backdrop-filter: blur(30px) saturate(160%);
      -webkit-backdrop-filter: blur(30px) saturate(160%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease;
    }
    .btn:active {
      transform: scale(0.9);
      background: rgba(255, 255, 255, 0.2);
    }
    .btn.active { background: rgba(255, 255, 255, 0.22); }
    .btn.primary {
      background: #fff;
      color: #000;
      border-color: transparent;
    }
    .btn.primary:active { background: #e5e5ea; }
    .btn.listening {
      background: #ff453a;
      border-color: transparent;
      animation: breathe 1.1s infinite ease-in-out;
    }
    .btn:disabled {
      opacity: 0.25 !important;
      cursor: not-allowed !important;
      pointer-events: none !important;
      filter: grayscale(1);
    }
    .btn:disabled:active {
      transform: none !important;
    }
    @keyframes breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
    .btn svg, .go svg {
      width: 24px;
      height: 24px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .go svg { width: 20px; height: 20px; stroke-width: 2.2; }

    /* Result sheet */
    .sheet-wrap {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      align-items: flex-end;
      justify-content: center;
    }
    .sheet-wrap.open { display: flex; }
    .sheet {
      width: 100%;
      max-width: 480px;
      background: rgba(28, 28, 32, 0.96);
      border-top: 0.5px solid rgba(255, 255, 255, 0.14);
      border-radius: 28px 28px 0 0;
      padding: 10px 22px max(env(safe-area-inset-bottom), 22px);
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 75vh;
      animation: up 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .grab {
      width: 36px;
      height: 5px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.25);
      margin: 0 auto 4px;
    }
    .sheet-body {
      font-size: 16px;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.92);
      overflow-y: auto;
      white-space: pre-wrap;
      max-height: 42vh;
      user-select: text;
      -webkit-user-select: text;
    }
    .sheet-btn {
      display: none;
      align-items: center;
      justify-content: center;
      padding: 15px;
      border-radius: 16px;
      background: #fff;
      color: #000;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
    }
    .sheet-btn:active { background: #e5e5ea; }
    .sheet-close {
      padding: 15px;
      border-radius: 16px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Control Center — Pure Apple Fluid Motion & Matte Dark Glass */
    .os-sheet {
      background: rgba(22, 22, 24, 0.92);
      backdrop-filter: blur(50px) saturate(200%);
      -webkit-backdrop-filter: blur(50px) saturate(200%);
      border-top: 0.5px solid rgba(255, 255, 255, 0.14);
      border-radius: 34px 34px 0 0;
      padding: 12px 18px max(env(safe-area-inset-bottom), 22px);
      max-height: 88vh;
      width: 100%;
      max-width: 440px;
      margin: 0 auto;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: none;
      transform-origin: bottom center;
    }
    .os-sheet::-webkit-scrollbar { display: none; }

    /* Fluid Spring Sheet Entrance */
    .sheet-wrap.open .os-sheet {
      transform: translateY(0);
      animation: appleSheetSpring 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes appleSheetSpring {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    /* Staggered Apple Cascade for Sheet Elements */
    .sheet-wrap.open .os-sheet > * {
      animation: appleCascadeIn 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .sheet-wrap.open .os-sheet > *:nth-child(1) { animation-delay: 0.03s; }
    .sheet-wrap.open .os-sheet > *:nth-child(2) { animation-delay: 0.06s; }
    .sheet-wrap.open .os-sheet > *:nth-child(3) { animation-delay: 0.09s; }
    .sheet-wrap.open .os-sheet > *:nth-child(4) { animation-delay: 0.12s; }
    .sheet-wrap.open .os-sheet > *:nth-child(5) { animation-delay: 0.15s; }
    .sheet-wrap.open .os-sheet > *:nth-child(6) { animation-delay: 0.18s; }
    @keyframes appleCascadeIn {
      0% { opacity: 0; transform: translateY(14px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    /* Header & Dynamic Island Capsule */
    .os-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2px;
    }
    .os-island-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px 5px 9px;
      border-radius: 99px;
      background: rgba(255, 255, 255, 0.08);
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      font-size: 12.5px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      letter-spacing: -0.2px;
      transition: transform 0.36s cubic-bezier(0.34, 1.56, 0.64, 1),
                  background 0.25s ease,
                  border-color 0.25s ease,
                  color 0.2s ease;
      will-change: transform;
    }
    .os-island-pill.pulse {
      transform: scale(1.06);
      background: rgba(255, 255, 255, 0.16);
      border-color: rgba(255, 255, 255, 0.3);
      color: #ffffff;
    }
    .os-island-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #30d158;
      box-shadow: 0 0 8px rgba(48, 209, 88, 0.7);
      transition: transform 0.25s ease;
    }
    .os-island-pill.pulse .os-island-dot {
      transform: scale(1.35);
    }
    .os-close-x {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
    }
    .os-close-x:active {
      transform: scale(0.86);
      background: rgba(255, 255, 255, 0.22);
      color: #ffffff;
    }

    /* Chunky iOS Volume Slider Capsule with Spring Scrub */
    .os-vol-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .os-mute {
      flex-shrink: 0;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.34s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
    }
    .os-mute:active {
      transform: scale(0.88);
      background: rgba(255, 255, 255, 0.2);
    }
    .os-mute svg {
      width: 22px;
      height: 22px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .os-vol-capsule {
      position: relative;
      flex: 1;
      height: 54px;
      border-radius: 27px;
      background: rgba(255, 255, 255, 0.08);
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      transition: transform 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .os-vol-capsule:active {
      transform: scale(1.02);
    }
    .os-vol-fill {
      position: absolute;
      inset: 0 auto 0 0;
      background: #ffffff;
      border-radius: 27px;
      transition: width 0.35s cubic-bezier(0.34, 1.25, 0.64, 1);
      pointer-events: none;
    }
    .os-vol-capsule:active .os-vol-fill {
      transition: none;
    }
    .os-vol-val {
      position: absolute;
      right: 18px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14.5px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: #ffffff;
      mix-blend-mode: difference;
      pointer-events: none;
      letter-spacing: -0.2px;
    }
    .os-vol-slider {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      margin: 0;
      -webkit-appearance: none;
    }

    /* Subdued Segmented Level Presets */
    .os-preset-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 7px;
    }
    .os-preset-btn {
      padding: 8px 0;
      border-radius: 12px;
      border: 0.5px solid rgba(255, 255, 255, 0.07);
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      text-align: center;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  background 0.2s ease,
                  color 0.15s ease;
    }
    .os-preset-btn:active {
      transform: scale(0.91);
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
    }

    /* Native iOS Media Capsule */
    .os-media-capsule {
      height: 48px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.08);
      border: 0.5px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 12px;
    }
    .os-media-btn {
      flex: 1;
      height: 100%;
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.88);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.18s ease;
    }
    .os-media-btn:active {
      transform: scale(0.82);
      opacity: 0.5;
    }
    .os-media-btn svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
      fill: currentColor;
      stroke-width: 1.5;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    /* Native Apple 4-Wide Squircle Action Grid */
    .os-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .os-tile {
      aspect-ratio: 1;
      border-radius: 20px;
      border: 0.5px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.07);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: transform 0.36s cubic-bezier(0.34, 1.56, 0.64, 1),
                  background 0.2s ease,
                  box-shadow 0.25s ease;
      will-change: transform;
    }
    .os-tile:active {
      transform: scale(0.88);
      background: rgba(255, 255, 255, 0.18);
    }
    .os-tile svg {
      width: 23px;
      height: 23px;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .os-tile:active svg {
      transform: scale(0.92);
    }
    .os-tile.warm {
      color: rgba(255, 255, 255, 0.9);
    }
    .os-tile.danger {
      color: rgba(255, 255, 255, 0.9);
    }

    /* Spring Flash Gleam on Action */
    @keyframes appleGleam {
      0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.45); }
      100% { box-shadow: 0 0 0 18px rgba(255, 255, 255, 0); }
    }
    .os-tile.gleam, .os-mute.gleam {
      animation: appleGleam 0.42s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Hop animations */
    .grokki.launching { animation: launch 0.85s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
    @keyframes launch {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      35% { transform: translateY(30px) scale(1.15, 0.85); }
      100% { transform: translateY(-800px) scale(0.2, 3); opacity: 0; }
    }
    .file-pill.launching { animation: fileCarryLaunch 0.85s cubic-bezier(0.7, 0, 0.84, 0) forwards; }
    @keyframes fileCarryLaunch {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      35% { transform: translateY(30px) scale(1.1, 0.88); opacity: 1; }
      100% { transform: translateY(-800px) scale(0.3); opacity: 0; }
    }
    .grokki.landing { animation: land 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes land {
      0% { transform: translateY(-420px) scale(0.3, 2.2); opacity: 0; }
      70% { transform: translateY(12px) scale(1.15, 0.88); opacity: 1; }
      100% { transform: translateY(0) scale(1); }
    }

    /* Top-to-top fluid exit and enter animations */
    .grokki.top-exit { animation: topExit 0.65s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
    @keyframes topExit {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      40% { transform: translateY(-30px) scale(0.9, 1.15); opacity: 0.9; }
      100% { transform: translateY(-480px) scale(0.35, 2); opacity: 0; }
    }
    .grokki.top-enter { animation: topEnter 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes topEnter {
      0% { transform: translateY(-450px) scale(0.35, 2); opacity: 0; }
      65% { transform: translateY(14px) scale(1.12, 0.88); opacity: 1; }
      85% { transform: translateY(-5px) scale(0.97, 1.03); }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }

    /* Grokki Portal Leap & Arrive with Envelope */
    .grokki.portal-leap {
      animation: grokkiPortalLeap 0.75s cubic-bezier(0.7, 0, 0.84, 0) forwards;
    }
    @keyframes grokkiPortalLeap {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      25% { transform: translateY(32px) scale(1.18, 0.82); }
      100% { transform: translateY(-750px) scale(0.25, 2.5); opacity: 0; }
    }
    .grokki.portal-arrive {
      animation: grokkiPortalArrive 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes grokkiPortalArrive {
      0% { transform: translateY(-500px) scale(0.3, 2.2); opacity: 0; }
      60% { transform: translateY(18px) scale(1.18, 0.84); opacity: 1; }
      80% { transform: translateY(-8px) scale(0.95, 1.05); }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }

    /* File Delivery Sheet / Offer Card */
    .delivery-sheet {
      text-align: center;
      gap: 16px;
    }
    .delivery-hero {
      margin-top: 4px;
    }
    .delivery-badge {
      font-size: 19px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.3px;
    }
    .delivery-sender {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 4px;
    }
    .delivery-file-box {
      background: rgba(255, 255, 255, 0.08);
      border: 0.5px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      text-align: left;
    }
    .delivery-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
    }
    .delivery-icon svg {
      width: 24px;
      height: 24px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
    }
    .delivery-meta {
      flex: 1;
      min-width: 0;
    }
    .delivery-name {
      font-size: 15px;
      font-weight: 600;
      color: #ffffff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .delivery-size {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 3px;
    }
    .delivery-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 15px 20px;
      border-radius: 99px;
      background: #ffffff;
      color: #000000;
      font-size: 15.5px;
      font-weight: 650;
      text-decoration: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.2);
      transition: transform 0.18s ease, background 0.18s ease;
    }
    .delivery-btn:active {
      transform: scale(0.97);
      background: rgba(255, 255, 255, 0.9);
    }

    /* Host Session Killer Buttons */
    .os-killer-btn, .os-killer-action-btn {
      width: 100%;
      padding: 13px 18px;
      border-radius: 18px;
      border: 0.5px solid rgba(255, 69, 58, 0.35);
      background: rgba(255, 69, 58, 0.12);
      color: #ff6961;
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: -0.2px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      cursor: pointer;
      box-sizing: border-box;
      transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, border-color 0.2s ease;
      margin-top: 8px;
    }
    .os-killer-btn:active, .os-killer-action-btn:active {
      transform: scale(0.95);
      background: rgba(255, 69, 58, 0.25);
      border-color: rgba(255, 69, 58, 0.6);
    }
    .os-killer-btn svg, .os-killer-action-btn svg {
      width: 17px;
      height: 17px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .os-killer-row {
      margin-top: 4px;
      width: 100%;
    }

    #filePicker { display: none; }

    @media (max-height: 640px) {
      .subtitle { margin-top: 14px; font-size: 15px; }
      .btn { width: 50px; height: 50px; }
    }
  </style>
</head>
<body>

  <div class="ambient"></div>

  <header class="top-bar">
    <button class="top-btn" id="shootBtn" aria-label="Shoot Grokki" title="Shoot Grokki to LAN Device" style="display: none; position: relative;">
      <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      <span class="shoot-badge" id="guestBadge" style="display: none;">0</span>
    </button>
    <div class="top-spacer" id="topSpacer"></div>
    <div class="status" id="statusPill">
      <div class="dot" id="dot"></div>
      <span id="statusText">Connecting</span>
    </div>
    <button class="top-btn" id="osControlBtn" aria-label="PC OS Controls" title="Direct PC OS Controls">
      <svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
    </button>
  </header>

  <!-- Dimensional Top Portal (Liquid Light Horizon) -->
  <div class="top-portal" id="topPortal">
    <div class="portal-fluid"></div>
    <div class="portal-glow"></div>
  </div>

  <main class="stage" id="stage">

    <div class="grokki" id="grokki">
      <div class="orb" id="orb"></div>
      <canvas id="characterCanvas"></canvas>
    </div>

    <!-- Grokki Frosted Letter Folio (Human-crafted Envelope Animation) -->
    <div class="envelope-pod" id="envelopePod">
      <div class="env-letter">
        <div class="env-sheet" id="envCard">
          <div class="env-file-icon">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="env-file-meta">
            <div class="env-file-name" id="envCardName">Document</div>
            <div class="env-file-tag">Attached File</div>
          </div>
        </div>
        <div class="env-body">
          <svg class="env-seam-svg" viewBox="0 0 160 108" fill="none">
            <rect width="160" height="108" rx="16" fill="rgba(20, 22, 34, 0.94)" stroke="rgba(255, 255, 255, 0.14)" stroke-width="1"/>
            <path d="M0 108L68 54M160 108L92 54" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1.2"/>
            <path d="M0 108L80 44L160 108" fill="rgba(28, 31, 48, 0.85)" stroke="rgba(255, 255, 255, 0.16)" stroke-width="1"/>
          </svg>
        </div>
        <div class="env-flap-wrap" id="envFlap">
          <svg class="env-flap-svg" viewBox="0 0 160 62" fill="none">
            <path d="M2 2L80 58L158 2" fill="rgba(34, 38, 58, 0.96)" stroke="rgba(255, 255, 255, 0.18)" stroke-width="1"/>
          </svg>
        </div>
        <div class="env-stamp" id="envSeal">
          <div class="env-stamp-gem"></div>
        </div>
      </div>
    </div>

    <div class="file-pill" id="filePill">
      <span id="fileName">file</span>
      <button id="removeFile" aria-label="Remove file">✕</button>
    </div>

    <div class="reply" id="reply"></div>
    <div class="subtitle" id="subtitle">Summoning Grokki…</div>
  </main>

  <footer class="dock">
    <div class="input-bar" id="inputBar">
      <input type="text" id="promptInput" placeholder="Message Grokki" enterkeyhint="send" autocomplete="off" />
      <button class="go" id="goBtn" aria-label="Send">
        <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>
    </div>

    <div class="row">
      <button class="btn" id="kbBtn" aria-label="Keyboard">
        <svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="3"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/></svg>
      </button>
      <button class="btn" id="fileBtn" aria-label="Attach file">
        <svg viewBox="0 0 24 24"><path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10 17.5a2 2 0 0 1-3-3l7.5-7.5"/></svg>
      </button>
      <button class="btn primary" id="pcBtn" aria-label="Send to PC">
        <svg id="pcIcon" viewBox="0 0 24 24"><path d="M7 17L17 7M8 7h9v9"/></svg>
      </button>
    </div>
  </footer>

  <div class="sheet-wrap" id="sheetWrap">
    <div class="sheet">
      <div class="grab"></div>
      <div class="sheet-body" id="sheetBody"></div>
      <a href="#" class="sheet-btn" id="sheetDownload" download>Download</a>
      <button class="sheet-close" id="sheetClose">Done</button>
    </div>
  </div>

  <!-- File Delivery Sheet / Offer Card -->
  <div class="sheet-wrap" id="fileOfferWrap">
    <div class="sheet delivery-sheet">
      <div class="grab"></div>
      <div class="delivery-hero">
        <div class="delivery-badge">Grokki Delivered a File!</div>
        <div class="delivery-sender" id="deliverySender">From Connected Device</div>
      </div>
      <div class="delivery-file-box">
        <div class="delivery-icon">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="delivery-meta">
          <div class="delivery-name" id="deliveryFileName">filename.dat</div>
          <div class="delivery-size" id="deliveryFileSize">0 KB</div>
        </div>
      </div>
      <a href="#" class="delivery-btn" id="deliveryDownloadBtn" download>Download File</a>
      <button class="sheet-close" id="deliveryCloseBtn">Done</button>
    </div>
  </div>

  <!-- Control Center -->
  <div class="sheet-wrap" id="osSheetWrap">
    <div class="sheet os-sheet">
      <div class="grab"></div>

      <div class="os-header">
        <div class="os-island-pill" id="osStatusPill">
          <span class="os-island-dot"></span>
          <span id="osSubtitleText">LonewolfFSD-LAPTOP</span>
        </div>
        <button class="os-close-x" id="osSheetClose" aria-label="Close">✕</button>
      </div>

      <div class="os-vol-row">
        <button class="os-mute" data-action="volume_mute" id="osMuteBtn" aria-label="Mute">
          <svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        </button>
        <div class="os-vol-capsule">
          <div class="os-vol-fill" id="osVolFill" style="width: 50%;"></div>
          <span class="os-vol-val" id="osVolVal">50%</span>
          <input type="range" class="os-vol-slider" id="osVolSlider" min="0" max="100" value="50" step="2" />
        </div>
      </div>

      <div class="os-preset-row">
        <button class="os-preset-btn" data-action="volume_set" data-val="25">25</button>
        <button class="os-preset-btn" data-action="volume_set" data-val="50">50</button>
        <button class="os-preset-btn" data-action="volume_set" data-val="75">75</button>
        <button class="os-preset-btn" data-action="volume_set" data-val="100">MAX</button>
      </div>

      <div class="os-media-capsule">
        <button class="os-media-btn" data-action="media_prev" aria-label="Previous">
          <svg viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" fill="none"/></svg>
        </button>
        <button class="os-media-btn" data-action="media_play" aria-label="Play / Pause">
          <svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></svg>
        </button>
        <button class="os-media-btn" data-action="media_next" aria-label="Next">
          <svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" fill="none"/></svg>
        </button>
      </div>

      <div class="os-grid">
        <button class="os-tile" data-action="lock" aria-label="Lock PC">
          <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </button>
        <button class="os-tile" data-action="sleep" aria-label="Sleep Mode">
          <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <button class="os-tile" data-action="screenshot" aria-label="Screenshot">
          <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </button>
        <button class="os-tile" data-action="mic_mute" aria-label="Mute Mic">
          <svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
        </button>

        <button class="os-tile" data-action="signout" aria-label="Sign Out">
          <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
        <button class="os-tile warm" data-action="restart" aria-label="Restart">
          <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
        <button class="os-tile danger" data-action="shutdown" aria-label="Shutdown">
          <svg viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
        </button>
        <button class="os-tile" data-action="cancel_power" aria-label="Cancel">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </button>
      </div>

      <div class="os-killer-row" id="osKillerRow" style="display: none;">
        <button class="os-killer-action-btn" id="osKillAllBtn" aria-label="Disconnect All Sub-Devices">
          <svg viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
          <span>Disconnect All Sub-Devices</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Shoot Grokki Sheet -->
  <div class="sheet-wrap" id="shootSheetWrap">
    <div class="sheet os-sheet">
      <div class="grab"></div>
      <div class="os-header">
        <div class="os-island-pill">
          <svg style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          <span>Shoot Grokki to LAN Device</span>
        </div>
        <button class="os-close-x" id="shootSheetClose" aria-label="Close">✕</button>
      </div>
      <div id="guestDeviceList" style="display: flex; flex-direction: column; gap: 8px; margin: 10px 0;"></div>
      <button class="os-killer-btn" id="killAllSessionsBtn" aria-label="Disconnect All Sub-Devices" style="display: none;">
        <svg viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
        <span>Disconnect All Sub-Devices</span>
      </button>
    </div>
  </div>

  <input type="file" id="filePicker" />

  <script>
    // --- Audio ---
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    function getAudioCtx() {
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }

    function playChirp() {
      try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch (e) {}
    }

    function playLaunch() {
      try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch (e) {}
    }

    function playChime() {
      try {
        const ctx = getAudioCtx();
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const start = ctx.currentTime + (i * 0.08);
          gain.gain.setValueAtTime(0.18, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.25);
        });
      } catch (e) {}
    }

    // --- WebGL2 Fluid Orb & Obsidian Character Engine ---
    const VERTEX_SRC = \`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}\`;

    const FRAGMENT_SRC = \`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uRotation;
uniform vec2 uReach;
uniform float uNear;
uniform float uAwake;
uniform vec3 uBackground;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uScale;
uniform float uWobble;
uniform float uGlow;
uniform float uBleed;
uniform float uHighlight;
uniform float uSwirl;
uniform float uOrbit;
uniform vec2 uEcho;
uniform float uReveal;
uniform float uOpacity;
uniform float uTrail;
uniform vec2 uTilt;
out vec4 outColor;

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += vec3(dot(p3, p3.yxz + 19.19));
  return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
  return dot(vec4(31.316), n);
}

float light1(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * attenuation);
}

float light2(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * dist * attenuation);
}

vec4 draw(vec2 uv) {
  float rawLen = length(uv);
  vec2 dir = rawLen > 0.0001 ? uv / rawLen : vec2(1.0, 0.0);
  float reachAmount = length(uReach);
  vec2 reachDir = reachAmount > 0.00001 ? uReach / reachAmount : vec2(1.0, 0.0);
  float facing = exp((dot(dir, reachDir) - 1.0) * 3.2);
  float len = max(rawLen - reachAmount * facing * smoothstep(0.25, 0.65, rawLen), 0.0);
  uv = dir * len;
  float ang = atan(dir.y, dir.x);
  float invLen = len > 0.0 ? 1.0 / len : 0.0;
  float near = facing * uNear;
  float bgLuminance = dot(uBackground, vec3(0.299, 0.587, 0.114));

  float n0 = snoise3(vec3(uv * 0.65, uTime * 0.5)) * 0.5 + 0.5;
  float r0 = mix(0.8 - 0.04 * uWobble, 0.8 + 0.04 * uWobble, n0);
  float d0 = distance(uv, (r0 * invLen) * uv);
  float v0 = light1(1.0, 10.0 / uGlow, d0);
  v0 *= smoothstep(r0 * 1.05, r0, len);
  float reach = max(uBleed, 0.04);
  float innerFade = smoothstep(r0 * (1.0 - 0.2 * reach), r0 * (1.0 - 0.05 * reach), len);
  v0 *= mix(innerFade, 1.0, bgLuminance * 0.7 * min(uBleed, 1.0));
  float body = smoothstep(0.8 - 0.2 * reach, 0.8, len);
  float cl = cos(ang + uSwirl) * 0.5 + 0.5;

  vec2 pos = vec2(cos(uOrbit), sin(uOrbit)) * r0;
  float d = distance(uv, pos);
  vec2 head = vec2(cos(uOrbit), sin(uOrbit));
  float lag = atan(head.x * dir.y - head.y * dir.x, dot(dir, head));
  float trail = uTrail > 0.0 ? smoothstep(0.0, 0.35, lag) * exp(-max(lag, 0.0) * 2.6 / uTrail) : 0.0;
  float v1 = (light2(1.5, 5.0, d) + trail * 0.6) * uHighlight;
  v1 *= light1(1.0, 50.0, d0);
  float band = v0 * smoothstep(1.0, mix(0.6, 1.0, n0 * 0.5), len) * body;
  float heat = pow(clamp(band / 0.82, 0.0, 1.0), 3.0);
  float bloom = light2(1.0, 160.0 / uGlow, max(len - r0, 0.0)) * smoothstep(0.4, 0.0, len - r0) * step(r0, len);

  float v2 = smoothstep(1.0, mix(0.6, 1.0, n0 * 0.5), len);
  float v3 = body;

  vec3 colBase = mix(uColor1, uColor2, cl);
  float fadeAmount = mix(1.0, 0.1, bgLuminance);

  float echoD = abs(len - r0 - uEcho.x);
  float echo = light1(1.0, 60.0, echoD) * smoothstep(0.12, 0.0, echoD) * uEcho.y;

  vec3 darkCol = mix(uColor3, colBase, v0);
  darkCol = (darkCol + v1) * v2 * v3 * (1.0 + uAwake + near * 0.35) + mix(colBase, vec3(1.0), 0.25) * heat * (0.28 + near * 0.3);
  darkCol = clamp(darkCol + colBase * (bloom * 0.1 + echo), 0.0, 1.0);

  vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount);
  lightCol = mix(uBackground, lightCol, clamp(v0 + echo, 0.0, 1.0));
  lightCol = mix(lightCol, colBase, clamp(v0, 0.0, 1.0) * clamp(near * 0.4 + uAwake, 0.0, 0.6));
  lightCol = clamp(mix(lightCol, vec3(1.0), clamp(v1 * 0.35, 0.0, 0.6)), 0.0, 1.0);

  vec3 finalCol = mix(darkCol, lightCol, bgLuminance);
  float alpha = max(max(finalCol.r, finalCol.g), finalCol.b);
  return vec4(finalCol / (alpha + 1e-5), alpha);
}

vec2 toPlane(vec2 p, out float hit) {
  float cx = cos(uTilt.x);
  float sx = sin(uTilt.x);
  float cy = cos(uTilt.y);
  float sy = sin(uTilt.y);
  vec3 ex = vec3(cy, 0.0, -sy);
  vec3 ey = vec3(sy * sx, cx, cy * sx);
  vec3 normal = vec3(sy * cx, -sx, cy * cx);
  vec3 origin = vec3(0.0, 0.0, 3.2);
  vec3 ray = vec3(p, -3.2);
  float denom = dot(normal, ray);
  float t = -dot(normal, origin) / (abs(denom) > 0.00001 ? denom : -0.00001);
  hit = t > 0.0 ? 1.0 : 0.0;
  vec3 q = origin + ray * t;
  return vec2(dot(q, ex), dot(q, ey));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y) * 2.0;
  uv *= uScale;
  float hit = 1.0;
  if (abs(uTilt.x) + abs(uTilt.y) > 0.0001) uv = toPlane(uv, hit);

  float s = sin(uRotation);
  float c = cos(uRotation);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

  vec4 col = draw(uv);
  float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  float alpha = clamp(col.a * hit * uReveal * uOpacity + dither, 0.0, 1.0);
  outColor = vec4(col.rgb * alpha * alpha, alpha);
}\`;

    class WebGLOrb {
      constructor(container) {
        this.container = container;
        const canvas = document.createElement('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        container.appendChild(canvas);
        this.canvas = canvas;

        this.gl = canvas.getContext('webgl2', {
          alpha: true,
          premultipliedAlpha: true,
          depth: false,
          stencil: false,
          antialias: false
        });
        if (!this.gl) return;

        const gl = this.gl;
        const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SRC);
        const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
        if (!vs || !fs) { this.gl = null; return; }

        this.prog = gl.createProgram();
        gl.attachShader(this.prog, vs);
        gl.attachShader(this.prog, fs);
        gl.bindAttribLocation(this.prog, 0, 'aPosition');
        gl.linkProgram(this.prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);

        if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
          this.gl = null;
          return;
        }

        this.buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        this.uniforms = {};
        const count = gl.getProgramParameter(this.prog, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
          const info = gl.getActiveUniform(this.prog, i);
          this.uniforms[info.name] = gl.getUniformLocation(this.prog, info.name);
        }

        this.state = {
          time: 0,
          orbit: 0,
          swirl: 0,
          pulse: 0,
          pulseSpeed: 0,
          echo: 1,
          rotation: 0,
          hover: 0,
          near: 0,
          reachX: 0,
          reachY: 0
        };

        this.resize();
        this.frame = this.frame.bind(this);
        requestAnimationFrame(this.frame);
      }

      compileShader(type, src) {
        const gl = this.gl;
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          gl.deleteShader(s);
          return null;
        }
        return s;
      }

      pulse() {
        this.state.pulseSpeed += 0.95;
        this.state.echo = 0;
      }

      resize() {
        const size = this.container.clientWidth || 260;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(size * dpr);
        this.canvas.height = Math.round(size * dpr);
      }

      frame() {
        const gl = this.gl;
        if (!gl) return;
        const dt = 0.016;

        this.state.time += dt;
        this.state.orbit -= dt * 1.1;
        this.state.swirl += dt * 1.8;
        this.state.echo = Math.min(1, this.state.echo + dt * 0.9);

        this.state.pulseSpeed += (-170 * this.state.pulse - 11 * this.state.pulseSpeed) * dt;
        this.state.pulse += this.state.pulseSpeed * dt;

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.prog);
        gl.bindVertexArray(this.vao);

        const u = this.uniforms;
        gl.uniform2f(u.uResolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(u.uTime, this.state.time);
        gl.uniform2f(u.uReach, this.state.reachX, this.state.reachY);
        gl.uniform1f(u.uNear, this.state.near);
        gl.uniform1f(u.uAwake, this.state.hover * 0.18);
        gl.uniform1f(u.uRotation, this.state.rotation);
        gl.uniform3f(u.uBackground, 0, 0, 0);
        gl.uniform3f(u.uColor1, 0.612, 0.263, 0.996);
        gl.uniform3f(u.uColor2, 0.298, 0.761, 0.914);
        gl.uniform3f(u.uColor3, 0.063, 0.078, 0.6);
        gl.uniform1f(u.uScale, 1.0 / (1.18 * (1.0 + this.state.pulse) * 0.88));
        gl.uniform1f(u.uWobble, 1.15);
        gl.uniform1f(u.uGlow, 0.95);
        gl.uniform1f(u.uBleed, 3.0);
        gl.uniform1f(u.uHighlight, 0.85);
        gl.uniform2f(u.uEcho, this.state.echo * 0.55, this.state.echo < 1 ? (1 - this.state.echo) * (1 - this.state.echo) : 0);
        gl.uniform1f(u.uSwirl, this.state.swirl);
        gl.uniform1f(u.uOrbit, this.state.orbit);
        gl.uniform1f(u.uReveal, 1.0);
        gl.uniform1f(u.uOpacity, 1.0);
        gl.uniform1f(u.uTrail, 1.4);
        gl.uniform2f(u.uTilt, -0.017, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
        requestAnimationFrame(this.frame);
      }
    }

    // --- 2D Obsidian Grokki Creature Engine (With Fallback) ---
    const charCanvas = document.getElementById('characterCanvas');
    const charCtx = charCanvas.getContext('2d');

    let eyeTargetX = 0.2, eyeTargetY = -0.15;
    let eyeCurrentX = 0.2, eyeCurrentY = -0.15;
    let eyeVelX = 0, eyeVelY = 0;
    let eyeTilt = 0, targetTilt = 0;
    let eyeScaleX = 1, eyeScaleY = 1;
    let eyeScaleVelX = 0, eyeScaleVelY = 0;
    let eyeHopY = 0, eyeHopVelY = 0;
    let isBlinking = false, isWinking = false, isHappy = false;
    let blinkProgress = 0;
    let nextBlink = Date.now() + 2000;
    let blinkStart = 0;
    let lastGlance = Date.now();
    let plasmaAnimTime = 0;

    function resizeCharacter() {
      const rect = charCanvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      charCanvas.width = Math.round(rect.width * dpr);
      charCanvas.height = Math.round(rect.height * dpr);
    }

    function updatePhysics() {
      const now = Date.now();
      const springK = 0.22;
      const friction = 0.74;

      eyeVelX = (eyeVelX + (eyeTargetX - eyeCurrentX) * springK) * friction;
      eyeCurrentX += eyeVelX;
      eyeVelY = (eyeVelY + (eyeTargetY - eyeCurrentY) * springK) * friction;
      eyeCurrentY += eyeVelY;

      eyeTilt += (targetTilt - eyeTilt) * 0.16;

      const jellyK = 0.24;
      const jellyDamp = 0.72;
      eyeScaleVelX = (eyeScaleVelX + (1 - eyeScaleX) * jellyK) * jellyDamp;
      eyeScaleX += eyeScaleVelX;
      eyeScaleVelY = (eyeScaleVelY + (1 - eyeScaleY) * jellyK) * jellyDamp;
      eyeScaleY += eyeScaleVelY;

      eyeHopY += eyeHopVelY;
      if (eyeHopY < 0) {
        eyeHopVelY += 0.6;
      } else {
        eyeHopY = 0;
        eyeHopVelY = 0;
      }

      if (now - lastGlance > 1800 && Math.random() < 0.04) {
        lastGlance = now;
        eyeTargetX = 0.2 + (Math.random() - 0.5) * 0.6;
        eyeTargetY = -0.1 + (Math.random() - 0.5) * 0.5;
      }

      if (!isBlinking && now > nextBlink) {
        isBlinking = true;
        blinkStart = now;
        isWinking = Math.random() < 0.14;
      }

      if (isBlinking) {
        const p = (now - blinkStart) / 160;
        if (p >= 1) {
          isBlinking = false;
          isWinking = false;
          blinkProgress = 0;
          nextBlink = now + 2000 + Math.random() * 2600;
        } else {
          blinkProgress = Math.sin(p * Math.PI);
        }
      }
    }

    function renderGrokkiCharacter() {
      const w = charCanvas.width;
      const h = charCanvas.height;
      if (!w || !h) return;
      const cx = w / 2;
      const cy = h / 2;
      const sf = w / 60;

      charCtx.clearRect(0, 0, w, h);
      charCtx.save();
      charCtx.translate(cx, cy + eyeHopY * sf);
      charCtx.rotate(eyeTilt);
      charCtx.scale(eyeScaleX, eyeScaleY);

      // If WebGL failed to initialize (e.g. Brave Shields / no WebGL2), draw animated fluid 2D plasma aura
      const hasWebGL = window.grokkiOrb && window.grokkiOrb.gl;
      if (!hasWebGL) {
        plasmaAnimTime += 0.03;
        const haloR = 26 * sf;
        const hx = Math.cos(plasmaAnimTime) * 3 * sf;
        const hy = Math.sin(plasmaAnimTime) * 3 * sf;
        const halo = charCtx.createRadialGradient(hx, hy, 16 * sf, 0, 0, haloR);
        halo.addColorStop(0, 'rgba(156, 67, 254, 0.85)');
        halo.addColorStop(0.38, 'rgba(76, 194, 233, 0.75)');
        halo.addColorStop(0.75, 'rgba(16, 20, 153, 0.3)');
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        charCtx.fillStyle = halo;
        charCtx.beginPath();
        charCtx.arc(0, 0, haloR, 0, Math.PI * 2);
        charCtx.fill();
      }

      // Expressive Grokki Eyes (Scaled accurately from PC island grokbot.js, completely transparent body)
      const baseOffsetX = 6.8 * sf;
      const baseOffsetY = -4.2 * sf;
      const gazeX = eyeCurrentX * 7.5 * sf;
      const gazeY = eyeCurrentY * 6.5 * sf;

      charCtx.translate(baseOffsetX + gazeX, baseOffsetY + gazeY);

      const eyeAngle = -0.38;
      charCtx.rotate(eyeAngle);

      const pw = 5.2 * sf;
      const ph1 = 15.5 * sf * (1 - (isBlinking && !isWinking ? blinkProgress * 0.9 : 0));
      const ph2 = 18.5 * sf * (1 - (isBlinking ? blinkProgress * 0.9 : 0));
      const gap = 7.5 * sf;

      function drawPill(px, py, width, height) {
        charCtx.save();
        charCtx.fillStyle = '#ffffff';
        charCtx.shadowColor = 'rgba(255, 255, 255, 0.95)';
        charCtx.shadowBlur = 10 * (w / 260);
        const radius = Math.min(width, height) / 2;
        charCtx.beginPath();
        if (charCtx.roundRect) {
          charCtx.roundRect(px, py, width, height, radius);
        } else {
          charCtx.rect(px, py, width, height);
        }
        charCtx.fill();
        charCtx.restore();
      }

      if (isHappy) {
        function drawHappyArc(px, py, width, height) {
          charCtx.save();
          charCtx.strokeStyle = '#ffffff';
          charCtx.shadowColor = 'rgba(255, 255, 255, 0.95)';
          charCtx.shadowBlur = 12 * (w / 260);
          charCtx.lineWidth = 4.6 * sf;
          charCtx.lineCap = 'round';
          charCtx.beginPath();
          charCtx.arc(px + width / 2, py + height * 0.45, width * 0.9, Math.PI * 1.15, Math.PI * 1.85, false);
          charCtx.stroke();
          charCtx.restore();
        }
        drawHappyArc(-gap / 2 - pw / 2, -ph1 / 2, pw * 1.6, ph1 * 0.8);
        drawHappyArc(gap / 2 - pw / 2, -ph2 / 2, pw * 1.6, ph2 * 0.8);
      } else {
        // Left pill
        drawPill(-gap / 2 - pw / 2, -ph1 / 2, pw, Math.max(3, ph1));

        // Right pill
        drawPill(gap / 2 - pw / 2, -ph2 / 2, pw, Math.max(3, ph2));
      }

      charCtx.restore();
    }

    function characterLoop() {
      updatePhysics();
      renderGrokkiCharacter();
      requestAnimationFrame(characterLoop);
    }

    window.grokkiOrb = new WebGLOrb(document.getElementById('orb'));
    resizeCharacter();
    requestAnimationFrame(characterLoop);

    window.addEventListener('resize', () => {
      resizeCharacter();
      if (window.grokkiOrb) window.grokkiOrb.resize();
    });

    function pokeCreature() {
      playChirp();
      if (window.grokkiOrb && window.grokkiOrb.pulse) window.grokkiOrb.pulse();
      eyeScaleX = 1.36;
      eyeScaleY = 0.65;
      eyeScaleVelX = -0.32;
      eyeScaleVelY = 0.45;
      eyeHopVelY = -7.2;
      targetTilt = (Math.random() > 0.5 ? 1 : -1) * 0.28;
      isWinking = Math.random() > 0.25;
      isBlinking = true;
      blinkStart = Date.now();
      setTimeout(() => {
        targetTilt = 0;
        isWinking = false;
      }, 1200);
    }

    const creature = document.getElementById('grokki');
    creature.addEventListener('click', (e) => {
      e.stopPropagation();
      pokeCreature();
    });

    function updatePointerPos(clientX, clientY) {
      const rect = creature.getBoundingClientRect();
      const nx = (clientX - (rect.left + rect.width / 2)) / (rect.width * 0.6);
      const ny = (clientY - (rect.top + rect.height / 2)) / (rect.height * 0.6);
      eyeTargetX = Math.max(-0.75, Math.min(0.75, nx));
      eyeTargetY = Math.max(-0.65, Math.min(0.7, ny));
      if (window.grokkiOrb && window.grokkiOrb.state) {
        window.grokkiOrb.state.reachX = nx * 0.1;
        window.grokkiOrb.state.reachY = -ny * 0.1;
        window.grokkiOrb.state.near = Math.hypot(nx, ny) < 1.0 ? 1 : 0;
      }
    }

    window.addEventListener('pointermove', (e) => {
      updatePointerPos(e.clientX, e.clientY);
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let isDraggingGrokki = false;

    creature.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDraggingGrokki = true;
      }
      if (e.touches[0]) updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    creature.addEventListener('touchmove', (e) => {
      if (e.touches[0]) {
        const curX = e.touches[0].clientX;
        const curY = e.touches[0].clientY;
        updatePointerPos(curX, curY);

        if (isDraggingGrokki && grokkiLocation === 'phone') {
          const deltaY = curY - touchStartY;
          const deltaX = curX - touchStartX;

          if (deltaY < -15) {
            creature.style.transform = 'translate(' + (deltaX * 0.3) + 'px, ' + (deltaY * 0.3) + 'px)';
            // If dragging near the very top edge where phones touch:
            if (curY <= 70) {
              activatePortal(true);
            } else {
              deactivatePortal();
            }
          }
        }
      }
    }, { passive: true });

    creature.addEventListener('touchend', (e) => {
      if (!isDraggingGrokki) return;
      isDraggingGrokki = false;
      creature.style.transform = '';
      deactivatePortal(200);

      const curY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - curY;

      // 1. Dragged all the way to top edge: transfer to phone touching the top!
      if (curY <= 70 && grokkiLocation === 'phone') {
        triggerTopEdgeTransfer();
        return;
      }

      // 2. Normal upward swipe / flick (towards PC): ALWAYS sends to PC!
      if (deltaY > 50 && grokkiLocation === 'phone') {
        sendToPc();
      }
    });

    // --- Intent ---
    function isPcTaskIntent(text, hasFile) {
      if (hasFile) return true;
      const p = (text || '').toLowerCase().trim();
      if (!p) return false;

      if (/\\b(save|put|store|move|copy|transfer|download|beam|export)\\b.*\\b(to|in|into|on)\\b.*\\b(pc|desktop|downloads?|documents?|pictures?|videos?|folder|drive)/i.test(p) ||
          /\\b(grab|fetch|get|bring|find|locate|search)\\b.*\\b(from|on)\\b.*\\b(pc|desktop|downloads?|documents?)/i.test(p) ||
          /\\b(grab|fetch|get)\\s+[a-z0-9_-]+\\.[a-z0-9]{2,4}\\b/i.test(p)) {
        return true;
      }
      if (/\\b(on|to|in|from)\\s+(my\\s+)?pc\\b/i.test(p)) return true;
      if (/\\b(lock|sleep|shutdown|restart)\\s+(pc|computer|laptop|workstation|windows)\\b/i.test(p) ||
          /\\b(take|capture)\\s+(a\\s+)?(screenshot|screen)\\b/i.test(p) ||
          /\\b(mute|unmute|volume\\s+up|volume\\s+down)\\b/i.test(p) ||
          /\\b(open|launch)\\s+(youtube|chrome|spotify|vs\\s*code|vscode|notepad|word|excel|terminal|cmd|powershell|calculator)\\b/i.test(p)) {
        return true;
      }
      if (/\\bwhatsapp\\b/i.test(p)) return true;
      if (/\\b(summarize|organize|clean)\\b.*\\b(desktop|downloads?|pc)\\b/i.test(p)) return true;
      return false;
    }

    // --- Elements ---
    const $ = (id) => document.getElementById(id);
    const dot = $('dot');
    const statusText = $('statusText');
    const subtitle = $('subtitle');
    const reply = $('reply');
    const filePill = $('filePill');
    const fileNameEl = $('fileName');
    const inputBar = $('inputBar');
    const promptInput = $('promptInput');
    const kbBtn = $('kbBtn');
    const fileBtn = $('fileBtn');
    const pcBtn = $('pcBtn');
    const pcIcon = $('pcIcon');
    const goBtn = $('goBtn');
    const filePicker = $('filePicker');
    const sheetWrap = $('sheetWrap');
    const sheetBody = $('sheetBody');
    const sheetDownload = $('sheetDownload');

    // OS Control Elements (Apple Control Center)
    const osControlBtn = $('osControlBtn');
    const osSheetWrap = $('osSheetWrap');
    const osSheetClose = $('osSheetClose');
    const osStatusPill = $('osStatusPill');
    const osSubtitleText = $('osSubtitleText');
    const osStatusDot = $('osStatusDot');
    const osVolSlider = $('osVolSlider');
    const osVolFill = $('osVolFill');
    const osVolVal = $('osVolVal');
    let originalPcName = 'LonewolfFSD-LAPTOP';
    let osSubTimer = null;

    function setOsStatus(text) {
      if (!osSubtitleText) return;
      osSubtitleText.innerText = text;
      if (osStatusPill) {
        osStatusPill.classList.remove('pulse');
        void osStatusPill.offsetWidth;
        osStatusPill.classList.add('pulse');
      }
      clearTimeout(osSubTimer);
      osSubTimer = setTimeout(() => {
        if (osSubtitleText) osSubtitleText.innerText = originalPcName;
        if (osStatusPill) osStatusPill.classList.remove('pulse');
      }, 2400);
    }

    function setVolumeDisplay(vol) {
      const v = Math.max(0, Math.min(100, Math.round(vol)));
      if (osVolSlider) osVolSlider.value = v;
      if (osVolFill) osVolFill.style.width = v + '%';
      if (osVolVal) osVolVal.innerText = v + '%';
    }

    const ICON_SEND = '<path d="M7 17L17 7M8 7h9v9"/>';
    const ICON_SUMMON = '<path d="M17 7L7 17M16 17H7V8"/>';

    const shootBtn = $('shootBtn');
    const shootSheetWrap = $('shootSheetWrap');
    const shootSheetClose = $('shootSheetClose');
    const guestBadge = $('guestBadge');
    const topSpacer = $('topSpacer');
    const killAllSessionsBtn = $('killAllSessionsBtn');
    const osKillAllBtn = $('osKillAllBtn');
    const osKillerRow = $('osKillerRow');

    // Dimensional Top Portal & Envelope Elements
    const stage = $('stage');
    const topPortal = $('topPortal');
    const envelopePod = $('envelopePod');
    const envCard = $('envCard');
    const envCardName = $('envCardName');
    const envFlap = $('envFlap');
    const envSeal = $('envSeal');
    const fileOfferWrap = $('fileOfferWrap');
    const deliverySender = $('deliverySender');
    const deliveryFileName = $('deliveryFileName');
    const deliveryFileSize = $('deliveryFileSize');
    const deliveryDownloadBtn = $('deliveryDownloadBtn');
    const deliveryCloseBtn = $('deliveryCloseBtn');



    let portalTimer = null;
    function activatePortal(flare = false) {
      if (!topPortal) return;
      topPortal.classList.add('active');
      if (flare) topPortal.classList.add('flaring');
      clearTimeout(portalTimer);
    }

    function deactivatePortal(delay = 0) {
      clearTimeout(portalTimer);
      if (delay > 0) {
        portalTimer = setTimeout(() => {
          if (topPortal) topPortal.classList.remove('active', 'flaring');
        }, delay);
      } else {
        if (topPortal) topPortal.classList.remove('active', 'flaring');
      }
    }

    function triggerPortalFlare() {
      activatePortal(true);
      playLaunch();
      deactivatePortal(1100);
    }

    function packFileAndLaunch(targetCallback) {
      if (!activeFile) {
        triggerPortalFlare();
        creature.classList.remove('landing', 'portal-arrive');
        creature.classList.add('portal-leap');
        updateLocation('away');
        setTimeout(() => {
          targetCallback(null);
          hideGrokki();
          clearInputs();
        }, 650);
        return;
      }

      const fileDataToSend = activeFile;
      if (envCardName) envCardName.innerText = fileDataToSend.name || 'File';

      envelopePod.classList.add('visible');
      envFlap.classList.remove('closed');
      envSeal.classList.remove('sealed');
      envCard.classList.remove('tucked', 'ejected');

      filePill.classList.remove('on');
      subtitle.innerText = 'Packing ' + (fileDataToSend.name || 'file') + '…';
      playChirp();

      // Step 1: Slide card down into envelope (320ms)
      setTimeout(() => {
        envCard.classList.add('tucked');
      }, 320);

      // Step 2: Flap snaps shut and seal sparkles (650ms)
      setTimeout(() => {
        envFlap.classList.add('closed');
        envSeal.classList.add('sealed');
        playChirp();
      }, 650);

      // Step 3: Grokki gets super happy! ^ ^ (950ms)
      setTimeout(() => {
        isHappy = true;
        eyeScaleX = 1.35;
        eyeScaleY = 0.65;
        eyeHopVelY = -6.5;
        subtitle.innerText = 'Delivering file!';
        activatePortal(true);
      }, 950);

      // Step 4: Happy jump off screen into portal! (1250ms)
      setTimeout(() => {
        creature.classList.remove('landing', 'portal-arrive');
        creature.classList.add('portal-leap');
        envelopePod.style.transform = 'translate(-50%, -750px) scale(0.25)';
        envelopePod.style.opacity = '0';
        updateLocation('away');
      }, 1250);

      // Step 5: Send payload (1850ms)
      setTimeout(() => {
        targetCallback(fileDataToSend);
        hideGrokki();
        clearInputs();
        envelopePod.classList.remove('visible');
        envelopePod.style.transform = '';
        envelopePod.style.opacity = '';
        envFlap.classList.remove('closed');
        envSeal.classList.remove('sealed');
        envCard.classList.remove('tucked');
        isHappy = false;
        deactivatePortal(400);
      }, 1850);
    }

    function arriveWithEnvelope(file, fromName) {
      updateLocation('phone');
      creature.classList.remove('launching', 'portal-leap', 'portal-arrive', 'top-exit', 'top-enter', 'landing');
      creature.style.transform = '';
      void creature.offsetWidth;
      activatePortal(true);
      creature.classList.add('portal-arrive');
      creature.style.opacity = '1';
      isHappy = true;
      playChime();

      if (envCardName) envCardName.innerText = file.name || 'File';
      envelopePod.classList.add('visible');
      envFlap.classList.add('closed');
      envSeal.classList.add('sealed');
      envCard.classList.add('tucked');
      envCard.classList.remove('ejected');

      subtitle.innerText = (fromName ? fromName + ' sent a file!' : 'Grokki brought an envelope!');

      // Step 1: Unseal and open flap (750ms)
      setTimeout(() => {
        envSeal.classList.remove('sealed');
        envFlap.classList.remove('closed');
        playChirp();
      }, 750);

      // Step 2: Card slides up from envelope! (1100ms)
      setTimeout(() => {
        envCard.classList.remove('tucked');
        envCard.classList.add('ejected');
        playChime();
        try { if (navigator.vibrate) navigator.vibrate([40, 60, 40]); } catch (e) {}
      }, 1100);

      // Step 3: Present file delivery sheet (1600ms)
      setTimeout(() => {
        if (deliverySender) deliverySender.innerText = fromName ? 'From ' + fromName : 'From Connected Device';
        if (deliveryFileName) deliveryFileName.innerText = file.name || 'file.dat';
        if (deliveryFileSize) {
          const sz = file.size ? Math.round(file.size / 1024) + ' KB' : 'Ready to download';
          deliveryFileSize.innerText = sz;
        }
        if (deliveryDownloadBtn) {
          deliveryDownloadBtn.href = file.downloadUrl || '#';
          deliveryDownloadBtn.setAttribute('download', file.name || 'file.dat');
        }

        if (fileOfferWrap) fileOfferWrap.classList.add('open');
        envelopePod.classList.remove('visible');
        isHappy = false;
        pokeCreature();
        deactivatePortal(800);
      }, 1600);
    }

    if (deliveryCloseBtn && fileOfferWrap) {
      deliveryCloseBtn.addEventListener('click', () => {
        fileOfferWrap.classList.remove('open');
      });
    }
    if (fileOfferWrap) {
      fileOfferWrap.addEventListener('click', (e) => {
        if (e.target === fileOfferWrap) fileOfferWrap.classList.remove('open');
      });
    }

    function triggerTopEdgeTransfer() {
      if (grokkiLocation !== 'phone') return;
      try { if (navigator.vibrate) navigator.vibrate([30, 50, 30]); } catch (e) {}

      packFileAndLaunch((fileToSend) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'top_edge_transfer',
            fileData: fileToSend
          }));
        }
      });
    }



    let ws = null;
    let activeFile = null;
    let grokkiLocation = 'transitioning';
    let failedAttempts = 0;
    let isScanningSubnet = false;
    let userRole = 'pending';
    let connectedGuests = [];

    // Persistent Device ID across restarts & browser sessions
    let deviceId = localStorage.getItem('grokki_device_id');
    if (!deviceId) {
      deviceId = 'phone_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('grokki_device_id', deviceId);
    }

    if (window.location.host && !window.location.host.startsWith('localhost') && !window.location.host.startsWith('127.0.0.1')) {
      localStorage.setItem('grokki_last_host', window.location.host);
    }

    function applyRoleUi(role) {
      userRole = role;
      if (role === 'sub' || role === 'guest') {
        if (osControlBtn) osControlBtn.style.display = 'none';
        if (shootBtn) shootBtn.style.display = 'none';
        if (topSpacer) topSpacer.style.display = 'block';
        if (killAllSessionsBtn) killAllSessionsBtn.style.display = 'none';
        if (osKillerRow) osKillerRow.style.display = 'none';
        statusText.innerText = 'Sub-Device · ' + originalPcName;
      } else {
        if (osControlBtn) osControlBtn.style.display = 'flex';
        if (osKillerRow) osKillerRow.style.display = 'block';
        statusText.innerText = originalPcName;
        updateShootBtnVisibility();
      }
      updateLocation(grokkiLocation);
    }

    function updateShootBtnVisibility() {
      if (userRole === 'owner') {
        const hasGuests = connectedGuests.length > 0;
        if (killAllSessionsBtn) killAllSessionsBtn.style.display = hasGuests ? 'flex' : 'none';
        if (hasGuests && grokkiLocation === 'phone') {
          if (shootBtn) shootBtn.style.display = 'flex';
          if (topSpacer) topSpacer.style.display = 'none';
          if (guestBadge) {
            guestBadge.style.display = 'block';
            guestBadge.innerText = connectedGuests.length;
          }
        } else {
          if (shootBtn) shootBtn.style.display = 'none';
          if (topSpacer) topSpacer.style.display = 'block';
        }
      } else {
        if (shootBtn) shootBtn.style.display = 'none';
        if (topSpacer) topSpacer.style.display = 'block';
        if (killAllSessionsBtn) killAllSessionsBtn.style.display = 'none';
      }
    }

    function updateLocation(loc) {
      grokkiLocation = loc;
      const onPhone = (loc === 'phone');
      const isOnPc = (loc === 'pc');
      const isAway = (loc === 'away');

      if (userRole === 'owner') {
        if (isOnPc) {
          pcIcon.innerHTML = ICON_SUMMON;
          pcBtn.setAttribute('aria-label', 'Summon to phone');
          pcBtn.disabled = false;
          [kbBtn, fileBtn].forEach(b => { if (b) b.disabled = true; });
        } else if (isAway) {
          pcIcon.innerHTML = ICON_SUMMON;
          pcBtn.setAttribute('aria-label', 'Recall Grokki');
          pcBtn.disabled = false;
          [kbBtn, fileBtn].forEach(b => { if (b) b.disabled = true; });
        } else {
          pcIcon.innerHTML = ICON_SEND;
          pcBtn.setAttribute('aria-label', 'Send to PC');
          pcBtn.disabled = false;
          [kbBtn, fileBtn].forEach(b => { if (b) b.disabled = false; });
        }
      } else {
        // Sub-connected device
        if (onPhone) {
          pcIcon.innerHTML = ICON_SEND;
          pcBtn.setAttribute('aria-label', 'Send Grokki Back to Host');
          pcBtn.disabled = false;
          [kbBtn, fileBtn].forEach(b => { if (b) b.disabled = false; });
        } else {
          pcBtn.disabled = true;
          [kbBtn, fileBtn].forEach(b => { if (b) b.disabled = true; });
        }
      }

      if (!onPhone) {
        inputBar.classList.remove('open');
        kbBtn.classList.remove('active');
        promptInput.blur();
      }
      promptInput.disabled = !onPhone;
      goBtn.disabled = !onPhone;
      updateShootBtnVisibility();
    }
    updateLocation('pc');

    function showGrokki() {
      creature.classList.remove('launching', 'portal-leap', 'portal-arrive', 'top-exit', 'top-enter', 'landing');
      creature.style.transform = '';
      void creature.offsetWidth;
      creature.classList.add('landing');
      creature.style.opacity = '1';
    }

    function hideGrokki() {
      creature.classList.remove('landing', 'portal-arrive', 'top-enter');
      creature.style.opacity = '0';
    }

    creature.addEventListener('animationend', (e) => {
      if (e.animationName === 'land' || e.animationName === 'grokkiPortalArrive' || e.animationName === 'topEnter') {
        creature.classList.remove('landing', 'portal-arrive', 'top-enter');
        creature.style.transform = '';
        creature.style.opacity = '1';
      } else if (e.animationName === 'launch' || e.animationName === 'grokkiPortalLeap' || e.animationName === 'topExit') {
        creature.classList.remove('launching', 'portal-leap', 'top-exit');
        creature.style.transform = '';
        creature.style.opacity = '0';
      }
    });

    // --- WebSocket & LAN Auto-Connect ---
    function connectWs() {
      const targetHost = window.location.host || localStorage.getItem('grokki_last_host') || '127.0.0.1:8765';
      try {
        ws = new WebSocket('ws://' + targetHost + '/ws');
      } catch (e) {
        setTimeout(connectWs, 2000);
        return;
      }

      ws.onopen = () => {
        dot.classList.remove('off');
        failedAttempts = 0;
        isScanningSubnet = false;
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const claimToken = urlParams.get('claim') || '';
          const shouldSummon = urlParams.get('summon') === '1';
          const savedOwnerKey = localStorage.getItem('grokki_owner_key') || '';

          ws.send(JSON.stringify({
            type: 'client_handshake',
            deviceId: deviceId,
            deviceType: /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'iPhone' : (/Android/i.test(navigator.userAgent) ? 'Android' : 'Phone'),
            ownerKey: savedOwnerKey,
            claim: claimToken,
            summon: shouldSummon
          }));

          // Clean URL parameters after claiming without page refresh
          if (claimToken || shouldSummon) {
            try {
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {}
          }
        } catch (e) {}
      };

      ws.onmessage = (event) => {
        try { handleServerMessage(JSON.parse(event.data)); } catch (e) {}
      };

      ws.onclose = () => {
        dot.classList.add('off');
        statusText.innerText = 'Searching PC…';
        failedAttempts++;
        if (failedAttempts >= 3 && !isScanningSubnet) {
          scanSubnetForGrokki();
        }
        setTimeout(connectWs, 2000);
      };
    }
    connectWs();

    // Auto-discover PC if LAN IP changed on router / DHCP
    async function scanSubnetForGrokki() {
      isScanningSubnet = true;
      const currentHost = window.location.hostname;
      const parts = currentHost.split('.');
      if (parts.length !== 4) return;
      const subnet = parts.slice(0, 3).join('.');
      const currentLast = parseInt(parts[3], 10) || 1;

      const candidates = [];
      for (let offset = -15; offset <= 15; offset++) {
        const octet = currentLast + offset;
        if (octet > 1 && octet < 255 && offset !== 0) {
          candidates.push(subnet + '.' + octet);
        }
      }

      for (const ip of candidates) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 500);
          const res = await fetch('http://' + ip + ':8765/status', { signal: controller.signal, mode: 'cors' });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data && (data.grokki || data.active)) {
              localStorage.setItem('grokki_last_host', ip + ':8765');
              window.location.href = 'http://' + ip + ':8765';
              return;
            }
          }
        } catch (e) {}
      }
      isScanningSubnet = false;
    }

    // Instant auto-reconnect on phone unlock or tab focus
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && (!ws || ws.readyState === WebSocket.CLOSED)) {
        connectWs();
      }
    });
    window.addEventListener('online', () => {
      if (!ws || ws.readyState === WebSocket.CLOSED) connectWs();
    });

    function handleServerMessage(msg) {
      if (msg.type === 'welcome') {
        if (msg.ownerKey) {
          localStorage.setItem('grokki_owner_key', msg.ownerKey);
        }
        userRole = msg.role || 'guest';
        statusText.innerText = (userRole === 'guest' ? 'Guest · ' : '') + (msg.pcName || 'Connected');
        originalPcName = msg.pcName || 'Connected';
        if (osSubtitleText) osSubtitleText.innerText = originalPcName;

        applyRoleUi(userRole);

        if (msg.grokkiLocation === 'pc') {
          updateLocation('pc');
          hideGrokki();
          subtitle.innerText = userRole === 'owner' ? 'Grokki is on your PC · Tap to summon' : 'Grokki is on Host PC';
        } else if (msg.grokkiLocation === 'phone') {
          updateLocation('phone');
          showGrokki();
          subtitle.innerText = userRole === 'owner' ? 'I’m here' : 'Grokki is visiting from Host!';
        } else if (msg.grokkiLocation === 'away') {
          updateLocation('away');
          hideGrokki();
          subtitle.innerText = (userRole === 'sub' || userRole === 'guest')
            ? 'Sub-Device · Waiting for Host to send Grokki…'
            : 'Grokki is visiting ' + (msg.holderName || 'another device');
        }
      } else if (msg.type === 'device_list') {
        connectedGuests = msg.devices || [];
        renderGuestList();
        updateShootBtnVisibility();
      } else if (msg.type === 'grokki_dispatched_to_guest') {
        playLaunch();
        creature.classList.add('launching');
        if (activeFile) filePill.classList.add('launching');
        subtitle.innerText = 'Grokki is flying to ' + msg.targetName + '…';
        updateLocation('away');
        setTimeout(() => { hideGrokki(); clearInputs(); }, 850);
        if (shootSheetWrap) shootSheetWrap.classList.remove('open');
      } else if (msg.type === 'grokki_returned_home') {
        playLaunch();
        creature.classList.add('launching');
        if (activeFile) filePill.classList.add('launching');
        subtitle.innerText = 'Grokki is flying back home…';
        updateLocation('away');
        setTimeout(() => { hideGrokki(); clearInputs(); }, 850);
      } else if (msg.type === 'grokki_recalled') {
        playLaunch();
        creature.classList.add('launching');
        subtitle.innerText = 'Grokki flew back to Host Phone';
        updateLocation('away');
        setTimeout(() => { hideGrokki(); }, 850);
      } else if (msg.type === 'access_denied') {
        subtitle.innerText = msg.message || 'Access denied';
        playChirp();
      } else if (msg.type === 'error_toast') {
        subtitle.innerText = msg.message || 'Error';
      } else if (msg.type === 'os_control_result') {
        playChirp();
        try { if (navigator.vibrate) navigator.vibrate(25); } catch (e) {}
        if (msg.volume !== undefined) {
          setVolumeDisplay(msg.volume);
        }
        if (msg.message) {
          setOsStatus(msg.message);
        }
      } else if (msg.type === 'grokki_location') {
        updateLocation(msg.location);
        if (msg.location === 'phone') {
          showGrokki();
          subtitle.innerText = userRole === 'owner' ? 'I’m here' : 'Grokki is visiting from Host!';
        } else if (msg.location === 'pc') {
          hideGrokki();
          subtitle.innerText = userRole === 'owner' ? 'Grokki is on your PC' : 'Grokki is on Host PC';
        } else if (msg.location === 'away') {
          hideGrokki();
          subtitle.innerText = (userRole === 'sub' || userRole === 'guest')
            ? 'Sub-Device · Waiting for Host to send Grokki…'
            : 'Grokki is visiting ' + (msg.holderName || 'another device');
        }
      } else if (msg.type === 'hop_land_on_phone') {
        if (msg.file && msg.file.downloadUrl) {
          arriveWithEnvelope(msg.file, msg.fromName);
        } else {
          updateLocation('phone');
          showGrokki();
          triggerPortalFlare();
          playChime();
          if (msg.fromName) {
            subtitle.innerText = 'Grokki visited from ' + msg.fromName + '!';
          } else {
            subtitle.innerText = 'I’m here';
          }
          pokeCreature();
          updateShootBtnVisibility();
        }
      } else if (msg.type === 'mobile_chat_reply') {
        playChime();
        targetTilt = 0;
        subtitle.innerText = '';
        reply.style.display = 'block';
        reply.innerText = msg.reply;
        pokeCreature();
      } else if (msg.type === 'dimension_task_complete') {
        playChime();
        sheetBody.innerText = msg.reply;
        if (msg.file && msg.file.downloadUrl) {
          sheetDownload.style.display = 'flex';
          sheetDownload.href = msg.file.downloadUrl;
          sheetDownload.innerText = 'Download ' + msg.file.name;
        } else {
          sheetDownload.style.display = 'none';
        }
        sheetWrap.classList.add('open');
        // Grokki stays on PC!
        updateLocation('pc');
        hideGrokki();
        subtitle.innerText = 'Grokki is on your PC';
      } else if (msg.type === 'file_beamed_to_phone') {
        if (msg.downloadUrl) {
          arriveWithEnvelope({ name: msg.fileName, downloadUrl: msg.downloadUrl }, 'Host PC');
        } else {
          playChime();
          sheetBody.innerText = 'Grokki brought ' + msg.fileName;
          sheetWrap.classList.add('open');
          updateLocation('phone');
          showGrokki();
          pokeCreature();
        }
      } else if (msg.type === 'grokki_top_exit') {
        triggerPortalFlare();
        creature.classList.remove('landing', 'portal-arrive');
        creature.classList.add('portal-leap');
        if (activeFile) filePill.classList.add('launching');
        subtitle.innerText = 'Flowing to ' + (msg.targetName || 'Phone') + '…';
        updateLocation('away');
        setTimeout(() => { hideGrokki(); clearInputs(); }, 650);
      } else if (msg.type === 'grokki_top_enter') {
        if (msg.file && msg.file.downloadUrl) {
          arriveWithEnvelope(msg.file, msg.fromName);
        } else {
          updateLocation('phone');
          showGrokki();
          triggerPortalFlare();
          playChime();
          try { if (navigator.vibrate) navigator.vibrate([40, 70, 40]); } catch (e) {}
          subtitle.innerText = msg.fromName ? 'Grokki arrived from ' + msg.fromName + '!' : 'I’m here';
          pokeCreature();
          updateShootBtnVisibility();
        }
      } else if (msg.type === 'sub_sessions_killed') {
        playChirp();
        connectedGuests = [];
        renderGuestList();
        updateShootBtnVisibility();
        subtitle.innerText = msg.message || 'Sub-devices disconnected';
        if (osSubtitleText) setOsStatus(msg.message || 'Sessions killed');
        try { if (navigator.vibrate) navigator.vibrate([30, 50, 30]); } catch (e) {}
      } else if (msg.type === 'session_terminated') {
        updateLocation('away');
        hideGrokki();
        subtitle.innerText = 'Session terminated by Host.';
        statusText.innerText = 'Disconnected';
        dot.classList.add('off');
        try { if (ws) ws.close(); } catch (e) {}
      }
    }

    // --- Actions ---
    function clearInputs() {
      activeFile = null;
      filePill.classList.remove('on', 'launching');
      promptInput.value = '';
    }

    function sendToPc() {
      if (userRole === 'sub' || userRole === 'guest') {
        if (grokkiLocation === 'phone') {
          if (!activeFile) {
            playLaunch();
            creature.classList.remove('landing', 'portal-arrive', 'top-enter');
            creature.classList.add('launching');
            updateLocation('away');
            subtitle.innerText = 'Grokki is flying back to Host…';
            setTimeout(() => {
              hideGrokki();
              clearInputs();
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'guest_return', fileData: null }));
              }
            }, 750);
          } else {
            packFileAndLaunch((fileToSend) => {
              subtitle.innerText = 'Grokki is flying back to Host…';
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'guest_return', fileData: fileToSend }));
              }
            });
          }
        }
        return;
      }

      // Owner device: if Grokki is visiting a sub-device, recall him!
      if (grokkiLocation === 'away') {
        playChirp();
        subtitle.innerText = 'Recalling Grokki from Sub-Device…';
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'hop_to_phone' }));
        }
        return;
      }

      const instruction = promptInput.value.trim();

      if (grokkiLocation !== 'phone' && !instruction && !activeFile) {
        playChirp();
        subtitle.innerText = 'Summoning Grokki…';
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'hop_to_phone' }));
        return;
      }

      // If sending Grokki to PC without a file, use the clean launching animation
      if (!activeFile) {
        playLaunch();
        creature.classList.remove('landing', 'portal-arrive', 'top-enter');
        creature.classList.add('launching');
        updateLocation('away');
        subtitle.innerText = instruction ? 'Grokki hopped to your PC…' : 'Grokki is on your PC';
        setTimeout(() => {
          hideGrokki();
          clearInputs();
          if (ws && ws.readyState === WebSocket.OPEN) {
            if (!instruction) {
              ws.send(JSON.stringify({ type: 'hop_to_pc' }));
            } else {
              ws.send(JSON.stringify({ type: 'dimension_hop_to_pc', instruction, fileData: null }));
            }
          }
        }, 750);
        return;
      }

      // With file: pack into envelope and launch
      packFileAndLaunch((fileToSend) => {
        subtitle.innerText = instruction || fileToSend ? 'Grokki hopped to your PC…' : 'Grokki is on your PC';
        if (ws && ws.readyState === WebSocket.OPEN) {
          if (!instruction && !fileToSend) {
            ws.send(JSON.stringify({ type: 'hop_to_pc' }));
          } else {
            ws.send(JSON.stringify({ type: 'dimension_hop_to_pc', instruction, fileData: fileToSend }));
          }
        }
      });
    }

    function handleSend() {
      const text = promptInput.value.trim();
      if (!text && !activeFile) return;

      if (isPcTaskIntent(text, !!activeFile)) {
        sendToPc();
        return;
      }

      promptInput.value = '';
      subtitle.innerText = 'Thinking…';
      targetTilt = -0.22;
      playChirp();
      reply.style.display = 'none';

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'mobile_chat', text }));
      }
    }

    goBtn.addEventListener('click', handleSend);
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });
    pcBtn.addEventListener('click', sendToPc);

    kbBtn.addEventListener('click', () => {
      const open = inputBar.classList.toggle('open');
      kbBtn.classList.toggle('active', open);
      if (open) promptInput.focus(); else promptInput.blur();
    });

    // --- File ---
    fileBtn.addEventListener('click', () => filePicker.click());
    filePicker.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        activeFile = { name: file.name, size: file.size, base64: ev.target.result };
        fileNameEl.innerText = file.name;
        filePill.classList.add('on');
        subtitle.innerText = 'What should I do with it?';
        if (!inputBar.classList.contains('open')) kbBtn.click();
        pokeCreature();
      };
      reader.readAsDataURL(file);
      filePicker.value = '';
    });

    $('removeFile').addEventListener('click', (e) => {
      e.stopPropagation();
      activeFile = null;
      filePill.classList.remove('on', 'launching');
      subtitle.innerText = '';
    });

    $('sheetClose').addEventListener('click', () => sheetWrap.classList.remove('open'));

    // --- Direct OS Controls ---
    if (osControlBtn && osSheetWrap) {
      osControlBtn.addEventListener('click', () => {
        osSheetWrap.classList.add('open');
        playChirp();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'direct_os_control', action: 'volume_get' }));
        }
      });
    }

    if (osSheetClose && osSheetWrap) {
      osSheetClose.addEventListener('click', () => {
        osSheetWrap.classList.remove('open');
      });
    }

    // Close sheets on backdrop click outside .sheet
    if (osSheetWrap) {
      osSheetWrap.addEventListener('click', (e) => {
        if (e.target === osSheetWrap) osSheetWrap.classList.remove('open');
      });
    }
    if (sheetWrap) {
      sheetWrap.addEventListener('click', (e) => {
        if (e.target === sheetWrap) sheetWrap.classList.remove('open');
      });
    }

    // --- Shoot to LAN Device Sheet ---
    if (shootBtn && shootSheetWrap) {
      shootBtn.addEventListener('click', () => {
        renderGuestList();
        shootSheetWrap.classList.add('open');
        playChirp();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'list_devices' }));
        }
      });
    }

    if (shootSheetClose && shootSheetWrap) {
      shootSheetClose.addEventListener('click', () => {
        shootSheetWrap.classList.remove('open');
      });
    }

    if (shootSheetWrap) {
      shootSheetWrap.addEventListener('click', (e) => {
        if (e.target === shootSheetWrap) shootSheetWrap.classList.remove('open');
      });
    }

    function renderGuestList() {
      const listEl = $('guestDeviceList');
      if (!listEl) return;
      if (connectedGuests.length === 0) {
        listEl.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:13.5px;text-align:center;padding:24px 0;line-height:1.5;">No other phones on LAN right now.<br><span style="font-size:11.5px;opacity:0.75;">Have another device scan the QR code to join!</span></div>';
        return;
      }
      let html = '';
      for (let i = 0; i < connectedGuests.length; i++) {
        const dev = connectedGuests[i];
        const devName = dev.name || 'Phone';
        const devType = dev.type || 'LAN Device';
        html += '<div class="guest-card-item" data-dev-id="' + dev.id + '" style="background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.1);padding:14px 16px;border-radius:20px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:transform 0.16s ease, background 0.16s ease;">'
          + '<div style="display:flex;align-items:center;gap:12px;">'
          + '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;">'
          + '<svg style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>'
          + '</div>'
          + '<div>'
          + '<div style="font-weight:600;font-size:15px;color:#fff;">' + devName + '</div>'
          + '<div style="font-size:12px;color:rgba(255,255,255,0.45);">' + devType + '</div>'
          + '</div>'
          + '</div>'
          + '<button style="border:none;background:#60a5fa;color:#000;font-weight:600;font-size:13px;padding:8px 14px;border-radius:99px;cursor:pointer;display:flex;align-items:center;gap:5px;pointer-events:none;">'
          + '<span>Shoot</span>'
          + '<svg style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.2;" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>'
          + '</button>'
          + '</div>';
      }
      listEl.innerHTML = html;
      listEl.querySelectorAll('.guest-card-item').forEach(card => {
        card.addEventListener('click', () => {
          const targetId = card.getAttribute('data-dev-id');
          if (targetId) shootGrokkiTo(targetId);
        });
      });
    }

    function shootGrokkiTo(targetId) {
      if (ws && ws.readyState === WebSocket.OPEN && grokkiLocation === 'phone') {
        const found = connectedGuests.find(d => d.id === targetId);
        if (shootSheetWrap) shootSheetWrap.classList.remove('open');

        packFileAndLaunch((fileToSend) => {
          subtitle.innerText = 'Grokki hopped to ' + (found ? found.name : 'Sub-Device') + '…';
          ws.send(JSON.stringify({
            type: 'send_to_device',
            targetDeviceId: targetId,
            fileData: fileToSend
          }));
        });
      }
    }

    function triggerSessionKiller() {
      if (userRole !== 'owner') return;
      playLaunch();
      try { if (navigator.vibrate) navigator.vibrate([40, 60, 40]); } catch (e) {}
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'kill_sub_sessions' }));
      }
      subtitle.innerText = 'Disconnecting all sub-devices…';
      setOsStatus('Disconnecting sub-devices…');
      if (shootSheetWrap) shootSheetWrap.classList.remove('open');
    }

    if (killAllSessionsBtn) killAllSessionsBtn.addEventListener('click', triggerSessionKiller);
    if (osKillAllBtn) osKillAllBtn.addEventListener('click', triggerSessionKiller);

    let volDebounce = null;
    if (osVolSlider) {
      osVolSlider.addEventListener('input', (e) => {
        const v = parseInt(e.target.value, 10);
        setVolumeDisplay(v);
        clearTimeout(volDebounce);
        volDebounce = setTimeout(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'direct_os_control', action: 'volume_set', value: v }));
          }
        }, 65);
      });
    }

    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const act = btn.getAttribute('data-action');
        const val = btn.getAttribute('data-val');
        if (!act) return;

        btn.classList.remove('gleam');
        void btn.offsetWidth;
        btn.classList.add('gleam');

        playChirp();
        try { if (navigator.vibrate) navigator.vibrate(20); } catch (err) {}

        if (act === 'volume_set' && val !== null) {
          setVolumeDisplay(parseInt(val, 10));
        }

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'direct_os_control', action: act, value: val }));
          setOsStatus(act.replace(/_/g, ' ') + '…');
        } else {
          setOsStatus('Disconnected');
        }
      });
    });

  </script>
</body>
</html>`;
  }
}

module.exports = PocketGrokkiServer;