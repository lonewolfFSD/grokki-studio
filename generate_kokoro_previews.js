const fs = require('fs');
const path = require('path');
const kokoro = require('./src/main/kokoro_tts.js');

const VOICES = [
  { id: 'af_bella', text: "Hey! I'm Bella. Everything you do on Grokki runs with zero cloud latency." },
  { id: 'af_heart', text: "Hello there! I'm Heart. Bringing warm, expressive conversations to your desktop." },
  { id: 'af_nicole', text: "Greetings. I am Nicole. Calibrated for concise summaries and analytical briefs." },
  { id: 'af_sky', text: "Hi, I'm Sky. Designed for serene, distraction-free focus sessions while you code." },
  { id: 'af_sarah', text: "Hello, I'm Sarah. Ready to help you write, create, and explore new ideas." },
  { id: 'af_alloy', text: "Hey! I'm Alloy. Crisp, balanced assistance for your everyday engineering workflow." },
  { id: 'af_aoede', text: "Hi there! I'm Aoede. Bringing a warm, melodic presence to your desktop." },
  { id: 'af_kore', text: "Hello! I'm Kore. Fast, radiant, and ready to tackle whatever you're building." },
  { id: 'af_jessica', text: "Hey, I'm Jessica! Just your friendly Windows companion, here to help." },
  { id: 'am_adam', text: "I'm Adam. Powering your system diagnostics and high-throughput command execution." },
  { id: 'am_michael', text: "Good day. I'm Michael, delivering clear and structured broadcast-grade responses." },
  { id: 'am_echo', text: "Hello. I am Echo. Delivering modern, resonant synthesis with zero cloud tokens." },
  { id: 'am_eric', text: "Hey, Eric here. Grounded and focused on solving technical desktop challenges." },
  { id: 'am_fenrir', text: "Fenrir standing by. Authoritative execution and deep cinematic resonance." },
  { id: 'am_liam', text: "Hey there! I'm Liam. Quick, energetic, and ready to dive into your next project." },
  { id: 'am_onyx', text: "Greetings. I am Onyx. Deep velvet bass for focused, late-night development." },
  { id: 'bf_emma', text: "Hello. I'm Emma, providing gentle, refined British assistance for your workflow." },
  { id: 'bf_isabella', text: "Good afternoon. I am Isabella, offering classical British poise and precision." },
  { id: 'bf_alice', text: "Hello! I'm Alice. Delivering clear, articulate commentary straight to your workspace." },
  { id: 'bf_lily', text: "Hello there. I'm Lily. Bringing a touch of warmth and poetry to your desktop." },
  { id: 'bm_george', text: "Good day to you. George here, at your service for any task at hand." },
  { id: 'bm_fable', text: "Greetings, traveler. I am Fable, your dramatic narrator for every journey." },
  { id: 'bm_lewis', text: "Hello. Lewis speaking. Professional executive correspondence, rendered locally." },
  { id: 'bm_daniel', text: "Good evening. I am Daniel, bringing deep authoritative newsreader delivery." },
];

const outDir = 'E:\\Grokki Website\\public\\audio\\voices';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log(`Starting generation for ${VOICES.length} voices...`);
  // Warm up TTS
  await kokoro.getTTS();
  console.log('Model ready!');

  for (let i = 0; i < VOICES.length; i++) {
    const item = VOICES[i];
    const targetFile = path.join(outDir, `${item.id}.wav`);
    if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 1000) {
      console.log(`[${i + 1}/${VOICES.length}] ${item.id} already exists, skipping.`);
      continue;
    }

    console.log(`[${i + 1}/${VOICES.length}] Generating ${item.id}...`);
    try {
      const res = await kokoro.synthesize(item.text, item.id);
      if (res && res.success && res.base64Audio) {
        const buf = Buffer.from(res.base64Audio, 'base64');
        fs.writeFileSync(targetFile, buf);
        console.log(`  -> Saved ${item.id}.wav (${buf.length} bytes, ${res.durationMs}ms)`);
      } else {
        console.error(`  -> Failed for ${item.id}:`, res.error);
      }
    } catch (e) {
      console.error(`  -> Error for ${item.id}:`, e);
    }
  }

  console.log('All Kokoro voice samples generated successfully!');
}

run();
