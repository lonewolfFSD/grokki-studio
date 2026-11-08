const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const jscriptPath = path.join(__dirname, 'get_explorer_selection.js');

/**
 * Returns an array of absolute file/folder paths currently selected
 * in any open Windows File Explorer window or on the Windows Desktop.
 * 
 * @returns {string[]} Array of existing file paths
 */
function getSelectedExplorerFiles() {
  if (process.platform !== 'win32') return [];

  // 1. Primary: Fast Windows COM query via WSH (cscript.exe) ~60-100ms
  if (fs.existsSync(jscriptPath)) {
    try {
      const output = execSync(`cscript.exe //nologo "${jscriptPath}"`, {
        timeout: 2000,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString().trim();

      if (output) {
        const paths = output.split('|||').map((p) => p.trim()).filter((p) => p && fs.existsSync(p));
        if (paths.length > 0) {
          return paths;
        }
      }
    } catch (_) {}
  }

  // 2. Fallback: Direct PowerShell COM automation
  try {
    const psCmd = `
      $ErrorActionPreference = 'SilentlyContinue'
      $shell = New-Object -ComObject Shell.Application
      $paths = @()
      foreach ($w in $shell.Windows()) {
        $sel = $w.Document.SelectedItems()
        if ($sel) { foreach ($i in $sel) { if ($i.Path) { $paths += $i.Path } } }
      }
      try {
        $d = $shell.Windows().FindWindowSW(0, 0, 8, 0, 1)
        if ($d -and $d.Document) {
          $dsel = $d.Document.SelectedItems()
          if ($dsel) { foreach ($i in $dsel) { if ($i.Path) { $paths += $i.Path } } }
        }
      } catch {}
      if ($paths.Count -gt 0) { [Console]::Out.WriteLine(($paths -join '|||')) }
    `.replace(/\r?\n\s*/g, ' ');

    const psOut = execSync(`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psCmd}"`, {
      timeout: 3000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();

    if (psOut) {
      const paths = psOut.split('|||').map((p) => p.trim()).filter((p) => p && fs.existsSync(p));
      if (paths.length > 0) {
        return paths;
      }
    }
  } catch (_) {}

  return [];
}

module.exports = {
  getSelectedExplorerFiles,
};
