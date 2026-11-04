const { app } = require('electron');
const agentDesktop = require('../src/main/agent_desktop');
const agentBrain = require('../src/main/agent_brain');

app.whenReady().then(async () => {
  console.log('--- Testing Grokki Agent Desktop Integration ---');

  // 1. Check version & availability
  const isAvail = await agentDesktop.isAvailable();
  console.log('1. Bridge Available:', isAvail);

  // 2. Test executeTool('open_app') with text_to_type
  console.log('2. Testing agentBrain.executeTool("open_app") with text_to_type...');
  const openRes = await agentBrain.executeTool('open_app', {
    name: 'notepad',
    text_to_type: 'Hello from Grokki Smart Desktop Automation!'
  });
  console.log('Open & Type result:', openRes);

  // 3. Test smartClick (finding "File" or "Edit" menu in Notepad)
  console.log('3. Testing smartClick on "File" menu...');
  const clickRes = await agentDesktop.smartClick({
    app: 'notepad.exe',
    target: 'File',
    headed: true,
  });
  console.log('Click result:', clickRes);

  console.log('--- Test Complete! ---');
  setTimeout(() => {
    app.quit();
    process.exit(0);
  }, 1200);
});
