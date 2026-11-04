/**
 * Grokki Agent Desktop — Native UI Automation Bridge
 * Powered by vercel-labs/agent-desktop
 * 
 * Provides zero-token accessibility tree inspection, background programmatic
 * interactions, and deterministic ref-based control for Windows apps.
 */

const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

class AgentDesktop {
  constructor() {
    this.binaryPath = this._locateBinary();
    this.lastSnapshotId = null;
    this.lastSnapshotTimestamp = 0;
  }

  _locateBinary() {
    const isWin = process.platform === 'win32';
    const isArm = process.arch === 'arm64';
    const binName = isWin
      ? (isArm ? 'agent-desktop-win32-arm64.exe' : 'agent-desktop-win32-x64.exe')
      : (process.platform === 'darwin'
          ? (isArm ? 'agent-desktop-darwin-arm64' : 'agent-desktop-darwin-x64')
          : (isArm ? 'agent-desktop-linux-arm64' : 'agent-desktop-linux-x64'));

    const candidates = [
      path.join(__dirname, '../../node_modules/agent-desktop/bin', binName),
      path.join(__dirname, '../node_modules/agent-desktop/bin', binName),
      path.join(process.resourcesPath || '', 'app.asar.unpacked/node_modules/agent-desktop/bin', binName),
      path.join(process.resourcesPath || '', 'bin', binName),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }

    const cmdBin = path.join(__dirname, '../../node_modules/.bin/agent-desktop.cmd');
    if (fs.existsSync(cmdBin)) return cmdBin;

    return 'agent-desktop';
  }

  async isAvailable() {
    try {
      const res = await this.runCommand('version');
      return !!(res && res.ok);
    } catch {
      return false;
    }
  }

  runCommand(command, args = [], options = {}) {
    const bin = this.binaryPath;
    const timeout = options.timeout || 15000;
    const fullArgs = [command, ...args];

    return new Promise((resolve) => {
      execFile(bin, fullArgs, { timeout, windowsHide: true }, (error, stdout, stderr) => {
        const raw = (stdout || '').trim();
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            return resolve(parsed);
          } catch (e) {
            return resolve({ ok: !error, output: raw, error: stderr || error?.message });
          }
        }
        if (error) {
          return resolve({ ok: false, error: { message: error.message, stderr } });
        }
        resolve({ ok: true, output: '' });
      });
    });
  }

  /**
   * Captures accessibility snapshot of an application or desktop
   */
  async snapshot(options = {}) {
    const args = [];
    if (options.app) args.push('--app', options.app);
    if (options.windowId) args.push('--window-id', options.windowId);
    if (options.surface) args.push('--surface', options.surface);
    if (options.interactiveOnly !== false) args.push('-i');
    if (options.compact !== false) args.push('--compact');
    if (options.skeleton) args.push('--skeleton');
    if (options.maxDepth) args.push('--max-depth', String(options.maxDepth));
    if (options.timeoutMs) args.push('--timeout-ms', String(options.timeoutMs));

    const res = await this.runCommand('snapshot', args, { timeout: options.timeoutMs ? options.timeoutMs + 5000 : 20000 });
    if (res.ok && res.data) {
      if (res.data.snapshot_id) {
        this.lastSnapshotId = res.data.snapshot_id;
        this.lastSnapshotTimestamp = Date.now();
      }
      // Return a concise, LLM-friendly summary alongside the raw data
      const interactiveElements = this._flattenTree(res.data.tree);
      return {
        ok: true,
        app: res.data.app || options.app || 'desktop',
        window: res.data.window,
        snapshot_id: res.data.snapshot_id,
        elements_count: interactiveElements.length,
        elements: interactiveElements.slice(0, 45), // Keep top 45 elements to conserve tokens
      };
    }

    return res;
  }

  _flattenTree(node, list = []) {
    if (!node) return list;
    if (node.ref_id) {
      list.push({
        ref: node.ref_id,
        role: node.role || 'element',
        name: node.name || '',
        value: node.value || undefined,
        actions: node.available_actions || [],
      });
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        this._flattenTree(child, list);
      }
    }
    return list;
  }

  /**
   * Search for specific elements matching role, name, or text
   */
  async find(options = {}) {
    const args = [];
    if (options.app) args.push('--app', options.app);
    if (options.windowId) args.push('--window-id', options.windowId);
    if (options.role) args.push('--role', options.role);
    if (options.name) args.push('--name', options.name);
    if (options.text) args.push('--text', options.text);
    if (options.value) args.push('--value', options.value);

    const res = await this.runCommand('find', args);
    if (res.ok && res.data && Array.isArray(res.data.matches)) {
      return {
        ok: true,
        matches: res.data.matches.map(m => ({
          ref: m.ref_id,
          role: m.role,
          name: m.name,
          value: m.value
        }))
      };
    }
    return res;
  }

  /**
   * Click an element by reference ID
   */
  async click(ref, options = {}) {
    if (!ref) return { ok: false, message: 'Ref ID is required' };
    const args = [ref];
    if (options.headed) args.push('--headed');
    return await this.runCommand('click', args);
  }

  /**
   * Double-click an element (uses --headed)
   */
  async doubleClick(ref) {
    if (!ref) return { ok: false, message: 'Ref ID is required' };
    return await this.runCommand('double-click', [ref, '--headed']);
  }

  /**
   * Right-click an element
   */
  async rightClick(ref, options = {}) {
    if (!ref) return { ok: false, message: 'Ref ID is required' };
    const args = [ref];
    if (options.headed !== false) args.push('--headed');
    return await this.runCommand('right-click', args);
  }

  /**
   * Set value or type text into an element
   */
  async type(ref, text, options = {}) {
    if (!ref) return { ok: false, message: 'Ref ID is required' };
    // On Windows, set-value works headlessly via UI Automation.
    // type requires --headed.
    if (!options.headed) {
      const setValRes = await this.runCommand('set-value', [ref, text]);
      if (setValRes.ok) return setValRes;
    }
    // Fallback or explicit headed typing:
    return await this.runCommand('type', [ref, text, '--headed']);
  }

  /**
   * Send keyboard hotkeys (e.g. enter, escape, ctrl+c, alt+tab)
   */
  async press(keyCombo) {
    if (!keyCombo) return { ok: false, message: 'Key combination is required' };
    return await this.runCommand('press', [keyCombo]);
  }

  /**
   * Focus a target element
   */
  async focus(ref) {
    if (!ref) return { ok: false, message: 'Ref ID is required' };
    return await this.runCommand('focus', [ref, '--headed']);
  }

  /**
   * List all running GUI apps
   */
  async listApps(filterApp) {
    const args = filterApp ? ['--app', filterApp] : [];
    return await this.runCommand('list-apps', args);
  }

  /**
   * List all visible windows
   */
  async listWindows(filterApp) {
    const args = filterApp ? ['--app', filterApp] : [];
    return await this.runCommand('list-windows', args);
  }

  /**
   * Bring a window to foreground
   */
  async focusWindow(windowId) {
    if (!windowId) return { ok: false, message: 'Window ID is required' };
    return await this.runCommand('focus-window', [windowId]);
  }

  /**
   * Launch application
   */
  async launch(appName) {
    if (!appName) return { ok: false, message: 'App name is required' };
    return await this.runCommand('launch', [appName]);
  }

  /**
   * Close application
   */
  async closeApp(appName, force = false) {
    if (!appName) return { ok: false, message: 'App name is required' };
    const args = [appName];
    if (force) args.push('--force');
    return await this.runCommand('close-app', args);
  }

  /**
   * Helper to locate an element in an app by name, role, or text
   */
  async findOrSnapshotElement(app, target) {
    const cleanTarget = (target || '').toLowerCase().trim();
    const appQuery = app || undefined;

    // 1. Try quick find by role or name
    try {
      const findRes = await this.find({ app: appQuery, name: target });
      if (findRes.ok && findRes.matches && findRes.matches.length > 0) {
        return findRes.matches[0];
      }
    } catch (e) {}

    // 2. Try snapshot and inspect elements
    try {
      const snap = await this.snapshot({ app: appQuery, interactiveOnly: true });
      if (snap.ok && Array.isArray(snap.elements) && snap.elements.length > 0) {
        // If looking for an edit/document/text field
        if (!cleanTarget || ['document', 'edit', 'text', 'textfield', 'input', 'editor'].includes(cleanTarget)) {
          const textEl = snap.elements.find(e => ['document', 'edit', 'textfield', 'combobox'].includes((e.role || '').toLowerCase()));
          if (textEl) return textEl;
        }

        // Exact or substring match on element name
        const nameMatch = snap.elements.find(e => (e.name || '').toLowerCase().includes(cleanTarget));
        if (nameMatch) return nameMatch;

        // Substring match on element role
        const roleMatch = snap.elements.find(e => (e.role || '').toLowerCase().includes(cleanTarget));
        if (roleMatch) return roleMatch;

        // Substring match on element value
        const valMatch = snap.elements.find(e => String(e.value || '').toLowerCase().includes(cleanTarget));
        if (valMatch) return valMatch;

        // If target was empty or generic, return first interactive element
        return snap.elements[0];
      }
    } catch (e) {}

    return null;
  }

  /**
   * Intelligent click by element ref OR visible name/target
   */
  async smartClick(options = {}) {
    let ref = options.ref;
    let target = options.target || options.name || options.label || options.text;

    if (!ref && target) {
      const found = await this.findOrSnapshotElement(options.app, target);
      if (found && found.ref) {
        ref = found.ref;
        target = found.name || target;
      }
    }

    if (!ref) {
      return { ok: false, message: `Could not find clickable element "${target || 'target'}" in ${options.app || 'window'}.` };
    }

    if (options.doubleClick) {
      return await this.doubleClick(ref);
    }
    if (options.rightClick) {
      return await this.rightClick(ref, { headed: options.headed });
    }

    // Try semantic headless click first (instant, zero mouse hijacking, no focus requirement)
    let res = await this.click(ref, { headed: false });
    if (res.ok) {
      return { ok: true, message: `Clicked "${target || ref}" successfully.`, ref };
    }

    // If semantic click requires focus or was refused, focus element and retry headed
    try {
      await this.focus(ref);
    } catch (e) {}
    res = await this.click(ref, { headed: true });
    if (res.ok) {
      return { ok: true, message: `Clicked "${target || ref}" successfully.`, ref };
    }
    return res;
  }

  /**
   * Intelligent typing into an element by ref OR target field/app
   */
  async smartType(options = {}) {
    let ref = options.ref;
    const text = options.text;
    if (text === undefined || text === null) {
      return { ok: false, message: 'Text to type is required.' };
    }

    if (!ref) {
      const found = await this.findOrSnapshotElement(options.app, options.target || 'document');
      if (found && found.ref) {
        ref = found.ref;
      }
    }

    if (!ref) {
      return { ok: false, message: `Could not locate text field to type into in ${options.app || 'window'}.` };
    }

    // Try headless UI Automation set-value first
    let res = await this.type(ref, text, { headed: false });
    if (res.ok) {
      return { ok: true, message: `Typed into text area (${ref}).`, ref };
    }

    // Fallback to headed typing
    try {
      await this.focus(ref);
    } catch (e) {}
    res = await this.type(ref, text, { headed: true });
    if (res.ok) {
      return { ok: true, message: `Typed into text area (${ref}).`, ref };
    }
    return res;
  }
}

module.exports = new AgentDesktop();
