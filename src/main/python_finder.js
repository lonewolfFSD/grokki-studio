const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let cachedPython = null;

function resolveScriptPath(fileName) {
  let p = path.join(__dirname, fileName);
  if (p.includes('app.asar')) {
    const unpacked = p.replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(unpacked)) {
      return unpacked;
    }
  }
  return p;
}

function getPythonPath() {
  if (cachedPython && fs.existsSync(cachedPython)) {
    return cachedPython;
  }

  // 1. Explicit env var
  if (process.env.PYTHON && fs.existsSync(process.env.PYTHON)) {
    cachedPython = process.env.PYTHON;
    return cachedPython;
  }

  // 2. Scan LocalAppData Python installations (e.g. Python311, Python312, Python310)
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const pyFolder = path.join(localAppData, 'Programs', 'Python');
    if (fs.existsSync(pyFolder)) {
      try {
        const subdirs = fs.readdirSync(pyFolder);
        for (const dir of subdirs) {
          const candidate = path.join(pyFolder, dir, 'python.exe');
          if (fs.existsSync(candidate)) {
            cachedPython = candidate;
            return cachedPython;
          }
        }
      } catch (_) {}
    }
  }

  // 3. Scan ProgramFiles Python installations
  const progFiles = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean);
  for (const pf of progFiles) {
    try {
      if (fs.existsSync(pf)) {
        const subdirs = fs.readdirSync(pf);
        for (const dir of subdirs) {
          if (/^python\d+/i.test(dir)) {
            const candidate = path.join(pf, dir, 'python.exe');
            if (fs.existsSync(candidate)) {
              cachedPython = candidate;
              return cachedPython;
            }
          }
        }
      }
    } catch (_) {}
  }

  // 4. Test where.exe python / py on Windows
  if (process.platform === 'win32') {
    try {
      const out = execSync('where.exe python', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      const firstLine = out.split(/\r?\n/)[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        cachedPython = firstLine;
        return cachedPython;
      }
    } catch (_) {}

    try {
      const out = execSync('where.exe py', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
      const firstLine = out.split(/\r?\n/)[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        cachedPython = firstLine;
        return cachedPython;
      }
    } catch (_) {}
  }

  // 5. Fallback command string
  cachedPython = process.platform === 'win32' ? 'python' : 'python3';
  return cachedPython;
}

module.exports = { getPythonPath, resolveScriptPath };
