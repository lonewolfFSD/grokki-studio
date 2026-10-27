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
    this.grokkiLocation = 'pc';
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

  getPocketUrl() {
    return `http://${this.localIp}:${this.port}`;
  }

  async start() {
    if (this.isRunning) {
      return this.getStatus();
    }

    this.localIp = this.detectLocalIp();
    const pocketUrl = this.getPocketUrl();

    try {
      this.qrDataUrl = await QRCode.toDataURL(pocketUrl, {
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
      grokkiLocation: this.grokkiLocation
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
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.getStatus()));
      return;
    }

    if (url.pathname === '/download') {
      this.handleFileDownload(req, res, url);
      return;
    }

    if (url.pathname === '/screen') {
      this.handleScreenCapture(req, res);
      return;
    }

    if (url.pathname === '/upload' && req.method === 'POST') {
      this.handleUpload(req, res);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(this.renderMobileAppHtml());
  }

  handleFileDownload(req, res, url) {
    const rawPath = url.searchParams.get('file');
    if (!rawPath) {
      res.writeHead(400);
      res.end('Missing file parameter');
      return;
    }

    try {
      const decodedPath = decodeURIComponent(rawPath);
      if (!fs.existsSync(decodedPath) || !fs.statSync(decodedPath).isFile()) {
        res.writeHead(404);
        res.end('File not found on PC');
        return;
      }

      const fileName = path.basename(decodedPath);
      const stat = fs.statSync(decodedPath);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': stat.size,
        'Access-Control-Allow-Origin': '*'
      });
      const stream = fs.createReadStream(decodedPath);
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
    const deviceType = isIOS ? 'iPhone' : (isAndroid ? 'Android' : 'Mobile Device');

    // Check if device is previously paired
    const pairedDevices = this.loadPairedDevices();
    const existingPair = pairedDevices.find(d => d.ip === clientIp);
    const isAlreadyPaired = !!existingPair;

    const deviceId = existingPair ? existingPair.id : `phone_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.connectedDevices.set(ws, { id: deviceId, type: deviceType, ip: clientIp, connectedAt: new Date().toLocaleTimeString() });

    console.log(`[Pocket Grokki] 📱 ${deviceType} (${clientIp}) connected. Known paired: ${isAlreadyPaired}`);

    // Persist or update paired device record
    this.savePairedDevice({
      id: deviceId,
      type: deviceType,
      ip: clientIp,
      name: `${deviceType} (${clientIp})`
    });

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('jarvis:pocket-device-connected', {
        deviceType,
        clientIp,
        totalConnected: this.activeSockets.size,
        isAutoConnected: isAlreadyPaired
      });
    }

    if (isAlreadyPaired) {
      // AUTO-CONNECT: Keep Grokki where he currently is (PC or phone)
      const currentLoc = this.grokkiLocation || 'pc';
      ws.send(JSON.stringify({
        type: 'welcome',
        deviceType,
        pcName: os.hostname(),
        grokkiLocation: currentLoc,
        isAutoConnected: true,
        localIp: this.localIp
      }));
    } else {
      // FIRST-TIME PAIRING: Celebrate with intro hop to phone!
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('jarvis:grokki-hopped-to-phone');
      }

      ws.send(JSON.stringify({
        type: 'welcome',
        deviceType,
        pcName: os.hostname(),
        grokkiLocation: 'transitioning',
        isAutoConnected: false,
        localIp: this.localIp
      }));

      setTimeout(() => {
        this.grokkiLocation = 'phone';
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'hop_land_on_phone',
            location: 'phone'
          }));
        }
      }, 1100);
    }

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        await this.processClientMessage(ws, msg);
      } catch (err) {
        console.warn('[Pocket Grokki WS] Message error:', err);
      }
    });

    ws.on('close', () => {
      this.activeSockets.delete(ws);
      this.connectedDevices.delete(ws);
      console.log(`[Pocket Grokki] 📱 ${deviceType} disconnected.`);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('jarvis:pocket-device-disconnected', {
          totalConnected: this.activeSockets.size
        });
      }
    });
  }

  async processClientMessage(ws, msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'client_handshake') {
      if (msg.deviceId) {
        this.savePairedDevice({
          id: msg.deviceId,
          type: msg.deviceType || 'Phone',
          ip: ws.clientIp || 'LAN',
          name: `${msg.deviceType || 'Phone'}`
        });
      }
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

      this.grokkiLocation = 'pc';
      this.broadcast({ type: 'grokki_location', location: 'pc' });

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
            const downloadUrl = `${this.getPocketUrl()}/download?file=${encodeURIComponent(topMatch.path)}`;

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
                  downloadUrl: `${this.getPocketUrl()}/download?file=${encodeURIComponent(possiblePath)}`
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
      this.grokkiLocation = 'pc';
      this.broadcast({ type: 'grokki_location', location: 'pc' });
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('jarvis:grokki-hopped-to-pc', {
          instruction: null,
          filePath: null,
          fileName: null
        });
      }
    }

    // 4. HOP TO PHONE (SUMMON GROKKI FROM PC BACK TO PHONE)
    else if (msg.type === 'hop_to_phone') {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('jarvis:grokki-hopped-to-phone');
      }
      setTimeout(() => {
        this.grokkiLocation = 'phone';
        this.broadcast({ type: 'grokki_location', location: 'phone' });
        this.broadcast({ type: 'hop_land_on_phone', location: 'phone' });
      }, 1100);
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

  beamFileToPhone(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const fileName = path.basename(filePath);
    const stat = fs.statSync(filePath);
    const downloadUrl = `${this.getPocketUrl()}/download?file=${encodeURIComponent(filePath)}`;

    this.broadcast({
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
    <div class="top-spacer"></div>
    <div class="status" id="statusPill">
      <div class="dot" id="dot"></div>
      <span id="statusText">Connecting</span>
    </div>
    <button class="top-btn" id="osControlBtn" aria-label="PC OS Controls" title="Direct PC OS Controls">
      <svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
    </button>
  </header>

  <main class="stage">
    <div class="grokki" id="grokki">
      <div class="orb" id="orb"></div>
      <canvas id="characterCanvas"></canvas>
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
      <button class="btn" id="micBtn" aria-label="Voice">
        <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>
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
    let isBlinking = false, isWinking = false;
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

      // Left pill
      drawPill(-gap / 2 - pw / 2, -ph1 / 2, pw, Math.max(3, ph1));

      // Right pill
      drawPill(gap / 2 - pw / 2, -ph2 / 2, pw, Math.max(3, ph2));

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

    let touchStartY = 0;
    creature.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      if (e.touches[0]) updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    creature.addEventListener('touchmove', (e) => {
      if (e.touches[0]) updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    creature.addEventListener('touchend', (e) => {
      if (touchStartY - e.changedTouches[0].clientY > 50) {
        if (grokkiLocation === 'phone') sendToPc();
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
    const micBtn = $('micBtn');
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

    let ws = null;
    let activeFile = null;
    let grokkiLocation = 'transitioning';
    let failedAttempts = 0;
    let isScanningSubnet = false;

    // Persistent Device ID across restarts & browser sessions
    let deviceId = localStorage.getItem('grokki_device_id');
    if (!deviceId) {
      deviceId = 'phone_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('grokki_device_id', deviceId);
    }

    if (window.location.host && !window.location.host.startsWith('localhost') && !window.location.host.startsWith('127.0.0.1')) {
      localStorage.setItem('grokki_last_host', window.location.host);
    }

    function updateLocation(loc) {
      grokkiLocation = loc;
      const onPhone = loc === 'phone';
      pcIcon.innerHTML = onPhone ? ICON_SEND : ICON_SUMMON;
      pcBtn.setAttribute('aria-label', onPhone ? 'Send to PC' : 'Summon to phone');

      // If Grokki is on PC, disable all buttons except Summon to Phone
      [kbBtn, micBtn, fileBtn].forEach(btn => {
        if (!btn) return;
        btn.disabled = !onPhone;
      });
      if (!onPhone) {
        inputBar.classList.remove('open');
        kbBtn.classList.remove('active');
        promptInput.blur();
      }
      promptInput.disabled = !onPhone;
      goBtn.disabled = !onPhone;
    }
    updateLocation('pc');

    function showGrokki() {
      creature.style.opacity = '1';
      creature.classList.remove('launching');
      creature.classList.add('landing');
    }

    function hideGrokki() {
      creature.style.opacity = '0';
      creature.classList.remove('landing');
    }

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
          ws.send(JSON.stringify({
            type: 'client_handshake',
            deviceId: deviceId,
            deviceType: /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'iPhone' : (/Android/i.test(navigator.userAgent) ? 'Android' : 'Phone')
          }));
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
        statusText.innerText = msg.pcName || 'Connected';
        originalPcName = msg.pcName || 'Connected';
        if (osSubtitleText) osSubtitleText.innerText = originalPcName;
        if (msg.grokkiLocation === 'pc') {
          updateLocation('pc');
          hideGrokki();
          subtitle.innerText = msg.isAutoConnected ? 'Auto-connected to ' + (msg.pcName || 'PC') : 'Grokki is on your PC';
        } else if (msg.grokkiLocation === 'phone') {
          updateLocation('phone');
          showGrokki();
          subtitle.innerText = 'I’m here';
        }
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
        if (msg.location === 'pc') {
          hideGrokki();
          subtitle.innerText = 'Grokki is on your PC';
        }
      } else if (msg.type === 'hop_land_on_phone') {
        updateLocation('phone');
        showGrokki();
        playChime();
        subtitle.innerText = 'I’m here';
        pokeCreature();
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
        playChime();
        sheetBody.innerText = 'Grokki brought ' + msg.fileName;
        sheetDownload.style.display = 'flex';
        sheetDownload.href = msg.downloadUrl;
        sheetDownload.innerText = 'Download ' + msg.fileName;
        sheetWrap.classList.add('open');
        updateLocation('phone');
        showGrokki();
        pokeCreature();
      }
    }

    // --- Actions ---
    function clearInputs() {
      activeFile = null;
      filePill.classList.remove('on', 'launching');
      promptInput.value = '';
    }

    function sendToPc() {
      const instruction = promptInput.value.trim();

      if (grokkiLocation !== 'phone' && !instruction && !activeFile) {
        playChirp();
        subtitle.innerText = 'Summoning Grokki…';
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'hop_to_phone' }));
        return;
      }

      playLaunch();
      reply.style.display = 'none';
      creature.classList.remove('landing');
      creature.classList.add('launching');

      // Carry file animation: File pill flies up into the sky together with Grokki!
      const fileDataToSend = activeFile;
      if (fileDataToSend) {
        filePill.classList.add('launching');
      }

      updateLocation('pc');
      subtitle.innerText = instruction || fileDataToSend ? 'Grokki hopped to your PC…' : 'Grokki is on your PC';

      if (ws && ws.readyState === WebSocket.OPEN) {
        if (!instruction && !fileDataToSend) {
          ws.send(JSON.stringify({ type: 'hop_to_pc' }));
        } else {
          ws.send(JSON.stringify({ type: 'dimension_hop_to_pc', instruction, fileData: fileDataToSend }));
        }
      }

      // After launch animation finishes, Grokki and file exit screen and stay on PC!
      setTimeout(() => {
        hideGrokki();
        clearInputs();
      }, 850);
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

    // --- Voice ---
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.onstart = () => micBtn.classList.add('listening');
      rec.onresult = (e) => {
        promptInput.value = e.results[0][0].transcript;
        handleSend();
      };
      rec.onerror = () => micBtn.classList.remove('listening');
      rec.onend = () => micBtn.classList.remove('listening');
      micBtn.addEventListener('click', () => {
        try { rec.start(); } catch (e) { rec.stop(); }
      });
    } else {
      micBtn.style.display = 'none';
    }
  </script>
</body>
</html>`;
  }
}

module.exports = PocketGrokkiServer;