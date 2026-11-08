/**
 * Grokki UI-TARS Vision Desktop Agent
 * Inspired by ByteDance UI-TARS (https://github.com/bytedance/UI-TARS-desktop)
 *
 * Implements an autonomous vision-language computer-use perception-action loop:
 * Screenshot -> Visual Element Grounding -> Coordinate Calculation -> Native OS Input -> Verification
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { app, screen, BrowserWindow } = require('electron');

class UiTarsAgent {
  constructor() {
    this.isRunning = false;
    this.currentTask = null;
    this.stepCount = 0;
    this.maxSteps = 12;
    this.actionHistory = [];
    this.abortController = null;
    const tempDir = (app && app.getPath) ? app.getPath('temp') : require('os').tmpdir();
    this.tempScreenshotPath = path.join(tempDir, 'grokki_uitars_vision.png');
  }

  broadcastProgress(step, maxSteps, actionDesc) {
    try {
      const payload = {
        action: 'start',
        kind: 'stopwatch',
        icon: 'fa-solid fa-crosshairs',
        title: `UI-TARS • Step ${step}/${maxSteps}`,
        subtitle: actionDesc,
      };
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send('island:activity', payload);
        }
      });
    } catch (_) {}
  }

  broadcastFinished(summary, success = true) {
    try {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send('island:activity', { action: 'stop', kind: 'stopwatch' });
          win.webContents.send('island:notification', {
            source: 'desktop',
            sender: success ? 'UI-TARS Completed' : 'UI-TARS Stopped',
            message: summary,
            icon: 'desktop',
            timestamp: Date.now(),
          });
        }
      });
    } catch (_) {}
  }

  async captureScreen() {
    try {
      const electron = require('electron');
      const desktopCapturer = electron.desktopCapturer;
      const screen = electron.screen;
      if (desktopCapturer && screen) {
        const primary = screen.getPrimaryDisplay();
        const { width, height } = primary.size;
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: Math.round(width), height: Math.round(height) },
        });
        if (sources && sources.length > 0) {
          const buffer = sources[0].thumbnail.toJPEG(85);
          fs.writeFileSync(this.tempScreenshotPath, buffer);
          return this.tempScreenshotPath;
        }
      }
    } catch (e) {
      console.warn('[UI-TARS] desktopCapturer fallback:', e.message);
    }

    return new Promise((resolve) => {
      const fallbackPs = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
        $bmp.Save("${this.tempScreenshotPath.replace(/\\/g, '/')}", [System.Drawing.Imaging.ImageFormat]::Jpeg)
        $g.Dispose()
        $bmp.Dispose()
        Write-Output "${this.tempScreenshotPath.replace(/\\/g, '/')}"
      `;
      exec(`powershell.exe -NoProfile -Command "${fallbackPs.replace(/\n/g, ' ')}"`, (err2) => {
        if (!err2 && fs.existsSync(this.tempScreenshotPath)) {
          resolve(this.tempScreenshotPath);
        } else {
          resolve(null);
        }
      });
    });
  }

  getScreenDimensions() {
    try {
      const primary = screen.getPrimaryDisplay();
      return {
        width: primary.size.width,
        height: primary.size.height,
        scaleFactor: primary.scaleFactor || 1,
      };
    } catch (_) {
      return { width: 1920, height: 1080, scaleFactor: 1 };
    }
  }

  parseAction(responseContent) {
    // UI-TARS action grammar:
    // Action: click(point=[500, 250])
    // Action: double_click(point=[500, 250])
    // Action: right_click(point=[500, 250])
    // Action: type(content='Hello World')
    // Action: press(key='Enter')
    // Action: hotkey(key='ctrl+c')
    // Action: scroll(direction='down')
    // Action: drag(start=[100, 200], end=[300, 400])
    // Action: wait(seconds=2)
    // Action: finished(result='Task done')
    const text = String(responseContent || '').trim();

    // 1. Check finished
    const finishMatch = text.match(/finished\s*\(\s*(?:result\s*=\s*)?["']?([^"')]+)["']?\s*\)/i);
    if (finishMatch) {
      return { type: 'finished', result: finishMatch[1] };
    }

    // 2. Check click / double_click / right_click
    const clickMatch = text.match(/(double_click|right_click|click)\s*\(\s*(?:point\s*=\s*)?\[\s*(\d+)\s*,\s*(\d+)\s*\]\s*\)/i);
    if (clickMatch) {
      return {
        type: clickMatch[1].toLowerCase(),
        x: parseInt(clickMatch[2], 10),
        y: parseInt(clickMatch[3], 10),
      };
    }

    // 3. Check type
    const typeMatch = text.match(/type\s*\(\s*(?:content\s*=\s*)?["']([^"']+)["']\s*\)/i);
    if (typeMatch) {
      return { type: 'type', content: typeMatch[1] };
    }

    // 4. Check press / hotkey
    const pressMatch = text.match(/(press|hotkey)\s*\(\s*(?:key\s*=\s*)?["']([^"']+)["']\s*\)/i);
    if (pressMatch) {
      return { type: pressMatch[1].toLowerCase(), key: pressMatch[2] };
    }

    // 5. Check scroll
    const scrollMatch = text.match(/scroll\s*\(\s*(?:direction\s*=\s*)?["']?(up|down|left|right)["']?\s*\)/i);
    if (scrollMatch) {
      return { type: 'scroll', direction: scrollMatch[1].toLowerCase() };
    }

    // 6. Check wait
    const waitMatch = text.match(/wait\s*\(\s*(?:seconds\s*=\s*)?(\d+)/i);
    if (waitMatch) {
      return { type: 'wait', seconds: parseInt(waitMatch[1], 10) };
    }

    return null;
  }

  async executePhysicalAction(action, screenDim) {
    return new Promise((resolve) => {
      // Normalize coordinate: UI-TARS uses 0..1000 scale
      const toActualX = (nx) => Math.round((nx / 1000) * screenDim.width);
      const toActualY = (ny) => Math.round((ny / 1000) * screenDim.height);

      let psCommand = '';

      switch (action.type) {
        case 'click': {
          const px = toActualX(action.x);
          const py = toActualY(action.y);
          psCommand = `
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${px}, ${py})
            Start-Sleep -Milliseconds 60
            $sim = '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);'
            Add-Type -MemberDefinition $sim -Namespace Win32 -Name MouseClick
            [Win32.MouseClick]::mouse_event(0x02, 0, 0, 0, 0)
            Start-Sleep -Milliseconds 40
            [Win32.MouseClick]::mouse_event(0x04, 0, 0, 0, 0)
          `;
          break;
        }

        case 'double_click': {
          const px = toActualX(action.x);
          const py = toActualY(action.y);
          psCommand = `
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${px}, ${py})
            Start-Sleep -Milliseconds 60
            $sim = '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);'
            Add-Type -MemberDefinition $sim -Namespace Win32 -Name MouseClick2
            [Win32.MouseClick2]::mouse_event(0x02, 0, 0, 0, 0)
            [Win32.MouseClick2]::mouse_event(0x04, 0, 0, 0, 0)
            Start-Sleep -Milliseconds 70
            [Win32.MouseClick2]::mouse_event(0x02, 0, 0, 0, 0)
            [Win32.MouseClick2]::mouse_event(0x04, 0, 0, 0, 0)
          `;
          break;
        }

        case 'right_click': {
          const px = toActualX(action.x);
          const py = toActualY(action.y);
          psCommand = `
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${px}, ${py})
            Start-Sleep -Milliseconds 60
            $sim = '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);'
            Add-Type -MemberDefinition $sim -Namespace Win32 -Name MouseRight
            [Win32.MouseRight]::mouse_event(0x08, 0, 0, 0, 0)
            Start-Sleep -Milliseconds 40
            [Win32.MouseRight]::mouse_event(0x10, 0, 0, 0, 0)
          `;
          break;
        }

        case 'type': {
          const escaped = action.content.replace(/[`"$]/g, '`$1');
          psCommand = `
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.SendKeys]::SendWait("${escaped}")
          `;
          break;
        }

        case 'press': {
          const k = action.key.toLowerCase();
          const keyMap = {
            enter: '{ENTER}',
            esc: '{ESC}',
            escape: '{ESC}',
            tab: '{TAB}',
            backspace: '{BACKSPACE}',
            delete: '{DELETE}',
            up: '{UP}',
            down: '{DOWN}',
            left: '{LEFT}',
            right: '{RIGHT}',
            space: ' ',
          };
          const mapped = keyMap[k] || `{${action.key.toUpperCase()}}`;
          psCommand = `
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.SendKeys]::SendWait("${mapped}")
          `;
          break;
        }

        case 'hotkey': {
          const raw = action.key.toLowerCase();
          let keysStr = '';
          if (raw.includes('ctrl') || raw.includes('control')) keysStr += '^';
          if (raw.includes('alt')) keysStr += '%';
          if (raw.includes('shift')) keysStr += '+';
          const lastChar = raw.split('+').pop().trim();
          keysStr += lastChar;
          psCommand = `
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.SendKeys]::SendWait("${keysStr}")
          `;
          break;
        }

        case 'scroll': {
          const delta = action.direction === 'up' ? 360 : -360;
          psCommand = `
            $sim = '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);'
            Add-Type -MemberDefinition $sim -Namespace Win32 -Name MouseScroll
            [Win32.MouseScroll]::mouse_event(0x0800, 0, 0, ${delta}, 0)
          `;
          break;
        }

        case 'wait': {
          setTimeout(resolve, (action.seconds || 1) * 1000);
          return;
        }

        default:
          resolve({ success: false, error: `Unsupported action type: ${action.type}` });
          return;
      }

      exec(`powershell.exe -NoProfile -Command "${psCommand.replace(/\n/g, ' ')}"`, (err) => {
        setTimeout(() => resolve({ success: !err }), 350);
      });
    });
  }

  async runTask(userGoal, llmVisionCallable) {
    if (this.isRunning) {
      return { success: false, message: 'UI-TARS task is already running. Please cancel or wait for it to finish.' };
    }

    this.isRunning = true;
    this.currentTask = userGoal;
    this.stepCount = 0;
    this.actionHistory = [];
    this.abortController = new AbortController();

    const screenDim = this.getScreenDimensions();
    console.log(`[UI-TARS] Starting vision desktop automation task: "${userGoal}" (Screen: ${screenDim.width}x${screenDim.height})`);

    const systemPrompt = `You are UI-TARS, an autonomous vision-driven desktop GUI agent for Windows.
Your goal is: "${userGoal}".
The user interface screen dimensions are normalized to a coordinate grid from [0, 0] (top-left) to [1000, 1000] (bottom-right).

Analyze the attached screenshot and select EXACTLY ONE atomic action per step using the following syntax:
- Action: click(point=[x, y])
- Action: double_click(point=[x, y])
- Action: right_click(point=[x, y])
- Action: type(content='text to type')
- Action: press(key='Enter')
- Action: hotkey(key='ctrl+c')
- Action: scroll(direction='down' or 'up')
- Action: wait(seconds=1)
- Action: finished(result='Explanation of why goal is completed')

First write 1 concise sentence of Thought explaining what visual element you see and what you will do.
Then on a new line write:
Action: <action_syntax>
Do not hallucinate coordinates. Look closely at the screenshot.`;

    try {
      while (this.stepCount < this.maxSteps && this.isRunning) {
        this.stepCount++;
        this.broadcastProgress(this.stepCount, this.maxSteps, 'Analyzing screen...');

        // 1. Take fresh screen capture
        const screenshotPath = await this.captureScreen();
        if (!screenshotPath || !fs.existsSync(screenshotPath)) {
          throw new Error('Failed to capture desktop screenshot for UI-TARS perception.');
        }

        // 2. Read image as base64
        const imageBase64 = fs.readFileSync(screenshotPath).toString('base64');
        const historyText = this.actionHistory.map((h, i) => `Step ${i + 1}: ${h}`).join('\n') || 'None';
        const userPrompt = `Task: ${userGoal}\nCurrent Step: ${this.stepCount} of ${this.maxSteps}\nAction History:\n${historyText}\n\nWhat is your next action?`;

        // 3. Call Vision Model
        const modelResponse = await llmVisionCallable(systemPrompt, userPrompt, imageBase64);
        console.log(`[UI-TARS] Step ${this.stepCount} LLM Response:`, modelResponse);

        // 4. Parse action
        const action = this.parseAction(modelResponse);
        if (!action) {
          console.warn(`[UI-TARS] Could not parse valid action from response: "${modelResponse}"`);
          this.actionHistory.push(`Thought: Could not parse action. Retrying visual check.`);
          continue;
        }

        // 5. If finished, end loop
        if (action.type === 'finished') {
          this.broadcastFinished(action.result || 'Task completed successfully', true);
          return {
            success: true,
            steps: this.stepCount,
            summary: action.result || 'Task completed successfully.',
            history: this.actionHistory,
          };
        }

        // 6. Execute action
        const actionDesc = `${action.type.toUpperCase()}${action.x !== undefined ? ` at [${action.x}, ${action.y}]` : ''}${action.content ? ` "${action.content}"` : ''}${action.key ? ` "${action.key}"` : ''}`;
        this.broadcastProgress(this.stepCount, this.maxSteps, actionDesc);
        this.actionHistory.push(actionDesc);

        await this.executePhysicalAction(action, screenDim);
        await new Promise((r) => setTimeout(r, 600)); // Short pause for UI to settle
      }

      this.broadcastFinished(`Reached maximum ${this.maxSteps} steps limit.`, false);
      return {
        success: false,
        steps: this.stepCount,
        message: `Reached step limit (${this.maxSteps} steps).`,
        history: this.actionHistory,
      };
    } catch (err) {
      console.error('[UI-TARS] Execution error:', err);
      this.broadcastFinished(`Error: ${err.message}`, false);
      return {
        success: false,
        error: err.message,
      };
    } finally {
      this.isRunning = false;
      this.currentTask = null;
    }
  }

  cancel() {
    this.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.broadcastFinished('Task was cancelled by user.', false);
  }
}

module.exports = new UiTarsAgent();
