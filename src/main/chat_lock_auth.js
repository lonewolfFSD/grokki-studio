const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { BrowserWindow } = require('electron');

class ChatLockAuth {
  constructor() {
    this.server = null;
    this.port = null;
    this.pendingPasskeyRequests = new Map(); // reqId -> { mode, credentialId, title, resolve, win }
  }

  /**
   * Verify Windows User Password or trigger native Windows Security / Windows Hello dialog.
   */
  verifyWindowsAuth({ password = '', useSystemDialog = false, reason = 'Verify Windows identity for Grokki Chat Lock' } = {}) {
    return new Promise((resolve) => {
      if (!useSystemDialog && password && password.trim().length > 0) {
        const psScript = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinAuth {
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool LogonUser(string lpszUsername, string lpszDomain, string lpszPassword, int dwLogonType, int dwLogonProvider, out IntPtr phToken);
    [DllImport("kernel32.dll", CharSet = CharSet.Auto)]
    public static extern bool CloseHandle(IntPtr handle);
    public static bool Verify(string user, string domain, string pass) {
        IntPtr token = IntPtr.Zero;
        bool ok = LogonUser(user, domain, pass, 3, 0, out token);
        if (!ok) {
            ok = LogonUser(user, domain, pass, 2, 0, out token);
        }
        if (token != IntPtr.Zero) CloseHandle(token);
        return ok;
    }
}
"@
$user = $env:USERNAME
$domain = $env:USERDOMAIN
$pass = $env:GROKKI_WIN_PASS
$ok = [WinAuth]::Verify($user, $domain, $pass)
if (-not $ok) {
    $ok = [WinAuth]::Verify($user, ".", $pass)
}
if (-not $ok) {
    $ok = [WinAuth]::Verify($user, "", $pass)
}
if ($ok) {
    Write-Output "VERIFIED"
} else {
    Write-Output "INVALID"
}
`;
        execFile(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-Command', psScript],
          {
            env: { ...process.env, GROKKI_WIN_PASS: password },
            windowsHide: true,
            timeout: 15000,
          },
          (err, stdout) => {
            const out = (stdout || '').trim();
            if (out.includes('VERIFIED')) {
              resolve({ success: true });
            } else {
              resolve({
                success: false,
                error: 'Incorrect Windows password. Or click "Use Windows Hello / PIN" above.',
              });
            }
          }
        );
        return;
      }

      const safeReason = (reason || 'Grokki Studio Chat Lock').replace(/["`$]/g, '');
      const psDialogScript = `
$ErrorActionPreference = 'SilentlyContinue'
try {
    $null = [Windows.Security.Credentials.UI.UserConsentVerifier, Windows.Security.Credentials.UI, ContentType = WindowsRuntime]
    $availOp = [Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()
    while ($availOp.Status -eq 0) { Start-Sleep -Milliseconds 50 }
    if ($availOp.GetResults() -eq [Windows.Security.Credentials.UI.UserConsentVerifierAvailability]::Available) {
        $reqOp = [Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync("${safeReason}")
        while ($reqOp.Status -eq 0) { Start-Sleep -Milliseconds 80 }
        if ($reqOp.GetResults() -eq [Windows.Security.Credentials.UI.UserConsentVerificationResult]::Verified) {
            Write-Output "VERIFIED"
            exit 0
        } else {
            Write-Output "CANCELED"
            exit 0
        }
    }
} catch {}

Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class CredUI {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDUI_INFO {
        public int cbSize;
        public IntPtr hwndParent;
        public string pszMessageText;
        public string pszCaptionText;
        public IntPtr hbmBanner;
    }
    [DllImport("credui.dll", CharSet = CharSet.Unicode)]
    public static extern int CredUIPromptForWindowsCredentials(
        ref CREDUI_INFO notUsedHere,
        int authError,
        ref uint authPackage,
        IntPtr InAuthBuffer,
        uint InAuthBufferSize,
        out IntPtr refOutAuthBuffer,
        out uint refOutAuthBufferSize,
        ref bool fSave,
        int flags
    );
}
"@
$info = New-Object CredUI+CREDUI_INFO
$info.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($info)
$info.pszCaptionText = "Grokki Studio Security"
$info.pszMessageText = "${safeReason}"
$authPkg = [uint32]0
$outBuf = [IntPtr]::Zero
$outSize = [uint32]0
$save = $false
$res = [CredUI]::CredUIPromptForWindowsCredentials([ref]$info, 0, [ref]$authPkg, [IntPtr]::Zero, 0, [ref]$outBuf, [ref]$outSize, [ref]$save, 0x1)
if ($res -eq 0) {
    Write-Output "VERIFIED"
} else {
    Write-Output "CANCELED"
}
`;
      execFile(
        'powershell.exe',
        ['-NoProfile', '-Command', psDialogScript],
        { windowsHide: true, timeout: 60000 },
        (err, stdout) => {
          const out = (stdout || '').trim();
          if (out.includes('VERIFIED')) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'Windows Security verification was canceled.' });
          }
        }
      );
    });
  }

  async ensureLocalhostServer() {
    if (this.server && this.port) {
      return this.port;
    }

    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        this.port = typeof address === 'object' && address ? address.port : 8792;
        this.server = server;
        resolve(this.port);
      });

      server.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Triggers native FIDO2 / WebAuthn Cross-Device Bluetooth Passkey (caBLE / hybrid transport)
   * on a secure http://localhost origin attached to the main studio window.
   */
  async triggerBluetoothPasskey({ parentWindow, mode = 'setup', credentialId = '', title = 'Chat' } = {}) {
    const port = await this.ensureLocalhostServer();
    const reqId = crypto.randomBytes(12).toString('hex');

    return new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        const entry = this.pendingPasskeyRequests.get(reqId);
        this.pendingPasskeyRequests.delete(reqId);
        if (entry && entry.win && !entry.win.isDestroyed()) {
          try {
            entry.win.close();
          } catch (_) {}
        }
        resolve(result);
      };

      const win = new BrowserWindow({
        width: 1,
        height: 1,
        x: -10000,
        y: -10000,
        parent: parentWindow && !parentWindow.isDestroyed() ? parentWindow : undefined,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        resizable: false,
        show: true,
        focusable: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      this.pendingPasskeyRequests.set(reqId, {
        mode,
        credentialId: credentialId || '',
        title,
        resolve: finish,
        win,
      });

      win.on('closed', () => {
        finish({ success: false, error: 'Passkey verification canceled.' });
      });

      const url = `http://localhost:${port}/fido2/${reqId}`;
      win.loadURL(url).catch((err) => {
        finish({ success: false, error: err?.message || 'Failed to start FIDO2 passkey.' });
      });
    });
  }

  handleRequest(req, res) {
    const urlParts = (req.url || '').split('?')[0].split('/').filter(Boolean);

    if (urlParts[0] === 'fido2' && urlParts[1]) {
      const reqId = urlParts[1];
      const entry = this.pendingPasskeyRequests.get(reqId);

      if (!entry) {
        res.writeHead(404);
        res.end();
        return;
      }

      if (req.method === 'POST' && urlParts[2] === 'result') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
          try {
            const parsed = JSON.parse(body || '{}');
            entry.resolve(parsed);
          } catch (e) {
            entry.resolve({ success: false, error: 'Invalid passkey response.' });
          }
        });
        return;
      }

      const isVerify = entry.mode !== 'setup' && Boolean(entry.credentialId);
      const credIdSafe = String(entry.credentialId || '').replace(/[^A-Za-z0-9+/=_-]/g, '');

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Grokki Passkey</title></head>
<body style="margin:0;background:transparent;">
<script>
function bufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64) {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(norm);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function runFido2() {
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const isVerify = ${isVerify ? 'true' : 'false'};
    const savedCredId = "${credIdSafe}";

    if (isVerify && savedCredId) {
      // Authenticate with existing mobile passkey over Bluetooth / FIDO2 hybrid transport
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: 'localhost',
          allowCredentials: [
            {
              type: 'public-key',
              id: base64ToBuffer(savedCredId),
              transports: ['hybrid', 'ble', 'internal', 'usb']
            }
          ],
          userVerification: 'required',
          timeout: 120000
        }
      });

      await fetch('/fido2/${reqId}/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          credentialId: bufferToBase64(assertion.rawId)
        })
      });
      return;
    }

    // Create / link a cross-platform mobile passkey over Bluetooth (FIDO2 caBLE / hybrid)
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Grokki Studio',
          id: 'localhost'
        },
        user: {
          id: userId,
          name: 'grokki-chat-lock',
          displayName: 'Grokki Chat Lock'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'cross-platform',
          residentKey: 'preferred',
          userVerification: 'required'
        },
        hints: ['hybrid'],
        timeout: 120000
      }
    });

    await fetch('/fido2/${reqId}/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        credentialId: bufferToBase64(cred.rawId)
      })
    });
  } catch (err) {
    await fetch('/fido2/${reqId}/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: err && err.name === 'NotAllowedError'
          ? 'Bluetooth passkey verification was canceled.'
          : (err && err.message ? err.message : 'Passkey verification failed.')
      })
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(runFido2, 40);
});
</script>
</body>
</html>`;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    res.writeHead(404);
    res.end();
  }
}

module.exports = new ChatLockAuth();
