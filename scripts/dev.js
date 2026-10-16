const { spawn } = require('child_process');
const http = require('http');

console.log('⚡ Starting Vite React dev server with Hot Module Replacement...');
const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

let electronLaunched = false;

function checkReady() {
  if (electronLaunched) return;
  const req = http.get('http://127.0.0.1:5173/dashboard.html', (res) => {
    if (res.statusCode === 200 && !electronLaunched) {
      electronLaunched = true;
      console.log('✨ Vite ready! Launching Grokki with Live HMR...');
      launchElectron();
    } else {
      setTimeout(checkReady, 300);
    }
  });

  req.on('error', () => {
    setTimeout(checkReady, 300);
  });

  req.setTimeout(500, () => req.destroy());
}

function launchElectron() {
  const electron = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_DEV: 'true' },
  });

  electron.on('close', () => {
    try { vite.kill(); } catch (e) {}
    process.exit(0);
  });
}

setTimeout(checkReady, 500);

process.on('SIGINT', () => {
  try { vite.kill(); } catch (e) {}
  process.exit(0);
});
