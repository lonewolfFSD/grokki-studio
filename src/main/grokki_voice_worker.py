import sys
import os
import json
import base64
import time
import asyncio

# Configure UTF-8 for stdio
sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')

try:
    import edge_tts
    EDGE_AVAILABLE = True
except Exception:
    EDGE_AVAILABLE = False

VOICE_MAP = {
    # Primary Grokki Voices
    'bella': 'en-US-JennyNeural',
    'jasper': 'en-US-GuyNeural',
    'luna': 'en-US-AriaNeural',
    'bruno': 'en-US-ChristopherNeural',
    'rosie': 'en-US-AvaNeural',
    'hugo': 'en-GB-RyanNeural',
    'kiki': 'en-GB-LibbyNeural',
    'leo': 'en-GB-ThomasNeural',

    # KittenTTS mappings
    'expr-voice-2-f': 'en-US-JennyNeural',
    'expr-voice-2-m': 'en-US-GuyNeural',
    'expr-voice-3-f': 'en-US-AriaNeural',
    'expr-voice-3-m': 'en-US-ChristopherNeural',
    'expr-voice-4-f': 'en-US-AvaNeural',
    'expr-voice-4-m': 'en-GB-RyanNeural',
    'expr-voice-5-f': 'en-GB-LibbyNeural',
    'expr-voice-5-m': 'en-GB-ThomasNeural',

    # Classic American & British aliases
    'heart': 'en-US-JennyNeural',
    'nicole': 'en-US-MichelleNeural',
    'adam': 'en-US-EricNeural',
    'george': 'en-GB-RyanNeural',
    'emma': 'en-GB-SoniaNeural',
    'vs_en_heart': 'en-US-JennyNeural',
    'vs_en_bella': 'en-US-JennyNeural',
    'vs_en_nicole': 'en-US-MichelleNeural',
    'vs_en_adam': 'en-US-EricNeural',
    'vs_en_george': 'en-GB-RyanNeural',
    'vs_en_emma': 'en-GB-SoniaNeural',
    'af_bella': 'en-US-JennyNeural',
    'af_heart': 'en-US-JennyNeural',
    'am_adam': 'en-US-EricNeural',
    'bm_george': 'en-GB-RyanNeural',
    'bf_emma': 'en-GB-SoniaNeural',
}

def resolve_voice(v_name):
    if not v_name:
        return 'en-US-JennyNeural'
    v_clean = str(v_name).strip()
    if v_clean in VOICE_MAP:
        return VOICE_MAP[v_clean]
    v_lower = v_clean.lower()
    if v_lower in VOICE_MAP:
        return VOICE_MAP[v_lower]
    # Check if directly an edge voice identifier (e.g. en-US-JennyNeural)
    if 'neural' in v_lower or 'en-' in v_lower:
        return v_clean
    for k, val in VOICE_MAP.items():
        if k in v_lower:
            return val
    return 'en-US-JennyNeural'

async def synthesize_edge(text, voice_name, speed=1.0):
    rate_str = "+0%"
    if speed != 1.0:
        pct = int(round((speed - 1.0) * 100))
        rate_str = f"+{pct}%" if pct >= 0 else f"{pct}%"

    comm = edge_tts.Communicate(text, voice=voice_name, rate=rate_str)
    chunks = []
    async for chunk in comm.stream():
        if chunk['type'] == 'audio':
            chunks.append(chunk['data'])
    return b''.join(chunks)

async def main():
    sys.stdout.write(json.dumps({'status': 'ready'}) + '\n')
    sys.stdout.flush()

    loop = asyncio.get_event_loop()

    while True:
        line = await loop.run_in_executor(None, sys.stdin.readline)
        if not line:
            break
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            cmd = req.get('command', 'generate')
            if cmd == 'ping':
                sys.stdout.write(json.dumps({'pong': True}) + '\n')
                sys.stdout.flush()
                continue

            text = req.get('text', '').strip()
            voice_raw = req.get('voice', 'bella')
            speed = float(req.get('speed', 1.0))
            target_voice = resolve_voice(voice_raw)

            if not text:
                sys.stdout.write(json.dumps({'success': False, 'error': 'Empty text'}) + '\n')
                sys.stdout.flush()
                continue

            t0 = time.time()
            audio_bytes = await synthesize_edge(text, target_voice, speed)
            elapsed = time.time() - t0

            if not audio_bytes:
                sys.stdout.write(json.dumps({'success': False, 'error': 'No audio returned'}) + '\n')
                sys.stdout.flush()
                continue

            base64_audio = base64.b64encode(audio_bytes).decode('utf-8')
            res = {
                'success': True,
                'base64Audio': base64_audio,
                'mimeType': 'audio/mpeg',
                'voice': target_voice,
                'inferenceMs': round(elapsed * 1000, 1),
                'byteLength': len(audio_bytes),
            }
            sys.stdout.write(json.dumps(res) + '\n')
            sys.stdout.flush()
        except Exception as err:
            sys.stdout.write(json.dumps({'success': False, 'error': str(err)}) + '\n')
            sys.stdout.flush()

if __name__ == '__main__':
    asyncio.run(main())
