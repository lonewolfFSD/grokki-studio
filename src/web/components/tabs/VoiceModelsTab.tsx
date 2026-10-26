import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Square,
  Volume2,
  Mic,
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  LayoutGrid,
  Disc3,
  Cpu,
  Globe,
} from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';

interface VoiceModelsTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
  playingVoice: string | null;
  onPreviewVoice: (
    voiceId: string,
    customText?: string,
    options?: { provider?: 'grokki' | 'elevenlabs'; apiKey?: string; previewUrl?: string }
  ) => void;
}

interface SphereStyle {
  base: string;
  light: string;
  mid: string;
  dark: string;
  accent: string;
  seed: number;
}

interface VoiceItem {
  id: string;
  name: string;
  style: string;
  tag: string;
  accent: 'us' | 'uk';
  gender: 'female' | 'male';
  sphere: SphereStyle;
  previewUrl?: string;
  category?: string;
}

// Palette for one voice sphere: a base color plus four soft blobs that drift around.
const sphere = (
  base: string,
  light: string,
  mid: string,
  dark: string,
  accent: string,
  seed: number
): SphereStyle => ({ base, light, mid, dark, accent, seed });

// Starting positions (in %) for the four blobs inside a sphere.
const BLOB_ANCHORS: [number, number][] = [
  [25, 28],
  [78, 24],
  [72, 80],
  [22, 76],
];

// Builds the inline style for each drifting blob (position, color, drift distance, speed, phase).
const blobStyles = (s: SphereStyle): React.CSSProperties[] => {
  const colors = [s.light, s.mid, s.dark, s.accent];
  return BLOB_ANCHORS.map(([x, y], i) => {
    const ox = ((s.seed * 37 + i * 53) % 31) - 15;
    const oy = ((s.seed * 61 + i * 29) % 31) - 15;
    const dx = ((s.seed * 17 + i * 41) % 61) - 30;
    const dy = ((s.seed * 23 + i * 47) % 61) - 30;
    const dur = 7 + ((s.seed + i * 3) % 5);
    const delay = -((s.seed * 7 + i * 5) % 9);
    return {
      left: `${x + ox}%`,
      top: `${y + oy}%`,
      background: `radial-gradient(circle at center, ${colors[i]} 0%, transparent 65%)`,
      '--dx': `${dx}%`,
      '--dy': `${dy}%`,
      '--dur': `${dur}s`,
      '--delay': `${delay}s`,
    } as React.CSSProperties;
  });
};

// Film grain / noise texture, blended over the gradient with mix-blend-mode.
const GRAIN_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Animations: drifting gradient blobs and equalizer bars.
const VOICE_STYLES = `
@keyframes vm-drift {
  0%, 100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
  33% { transform: translate(-50%, -50%) translate(var(--dx, 20%), var(--dy, -20%)) scale(1.15); }
  66% { transform: translate(-50%, -50%) translate(calc(var(--dy, -20%) * -1), var(--dx, 20%)) scale(0.95); }
}
@keyframes vm-eq {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}

.vm-blob {
  position: absolute;
  width: 95%;
  height: 95%;
  border-radius: 9999px;
  pointer-events: none;
  transform: translate(-50%, -50%);
  will-change: transform;
  animation: vm-drift var(--dur, 9s) ease-in-out var(--delay, 0s) infinite;
}

.vm-eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}
.vm-eq i {
  display: block;
  width: 2px;
  height: 100%;
  border-radius: 1px;
  background: currentColor;
  transform-origin: bottom;
  transform: scaleY(0.3);
}
.vm-eq.on i { animation: vm-eq 0.9s ease-in-out infinite; }
.vm-eq.on i:nth-child(2) { animation-delay: 0.15s; }
.vm-eq.on i:nth-child(3) { animation-delay: 0.3s; }

@media (prefers-reduced-motion: reduce) {
  .vm-blob, .vm-eq i { animation: none !important; }
}
`;

const SPHERE_PALETTES: SphereStyle[] = [
  sphere('#ff416c', '#ffd1c1', '#ff758c', '#990033', '#ff9a5a', 1),
  sphere('#0072ff', '#9fe0ff', '#4facfe', '#003399', '#7a5cff', 2),
  sphere('#8ec5fc', '#f3e1ff', '#e0c3fc', '#6a11cb', '#b3f0ff', 3),
  sphere('#8fd3f4', '#d4ffe6', '#84fab0', '#209cff', '#c2f0ff', 4),
  sphere('#fecfef', '#fff0f5', '#ff9a9e', '#f093fb', '#ffd6a5', 5),
  sphere('#c2e9fb', '#f0faff', '#a1c4fd', '#4a90e2', '#d9e4ff', 6),
  sphere('#a18cd1', '#ffd9f3', '#fbc2eb', '#6b117b', '#8fb3ff', 7),
  sphere('#fcb69f', '#fff3da', '#ffecd2', '#ff5722', '#ffd27a', 8),
  sphere('#96e6a1', '#f0ffb0', '#d4fc79', '#2e7d32', '#7fe0c8', 9),
  sphere('#f7971e', '#fff09a', '#ffd200', '#b85d19', '#ff7a3d', 10),
  sphere('#11998e', '#9dffc4', '#38ef7d', '#0c615a', '#4fd1d9', 11),
  sphere('#330867', '#5ef0ee', '#30cfd0', '#1a0338', '#6a4cff', 12),
  sphere('#764ba2', '#a8b6ff', '#667eea', '#301b52', '#c18bff', 13),
  sphere('#262626', '#6b6b6b', '#434343', '#000000', '#4d4d57', 14),
  sphere('#fee140', '#fff3a8', '#fa709a', '#d84315', '#ffb36b', 15),
  sphere('#313536', '#7b858a', '#596164', '#111213', '#475055', 16),
  sphere('#a6c1ee', '#ffe0f6', '#fbc2eb', '#764ba2', '#c3d9ff', 17),
  sphere('#fda085', '#fff0b8', '#f6d365', '#d46b4f', '#ffb199', 18),
  sphere('#fed6e3', '#d4fffb', '#a8edea', '#9c27b0', '#ffe9f1', 19),
  sphere('#cfc7f8', '#ffe3d6', '#ebbba7', '#5d48b6', '#e0d8ff', 20),
  sphere('#2c3e50', '#d5dbe0', '#bdc3c7', '#1a252f', '#6b8196', 21),
  sphere('#eacda3', '#fff0d6', '#e6b980', '#8d6e63', '#f3d9b1', 22),
  sphere('#0072ff', '#a8f0ff', '#00c6ff', '#0d47a1', '#5aa0ff', 23),
  sphere('#753a88', '#ff8fb8', '#cc2b5e', '#3e1b4c', '#a266c4', 24),
];

const getSphereForId = (id: string, index: number): SphereStyle => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const palette = SPHERE_PALETTES[(hash + index) % SPHERE_PALETTES.length];
  return { ...palette, seed: ((hash + index) % 29) + 1 };
};

const GROKKI_VOICES: VoiceItem[] = [
  { id: 'af_heart', name: 'Heart', style: 'Warm & Expressive', tag: 'US • Conversational', accent: 'us', gender: 'female', sphere: SPHERE_PALETTES[0] },
  { id: 'af_bella', name: 'Bella', style: 'Crisp & Playful', tag: 'US • High Energy', accent: 'us', gender: 'female', sphere: SPHERE_PALETTES[1] },
  { id: 'af_nicole', name: 'Nicole', style: 'Clear & Formal', tag: 'US • Studio Pro', accent: 'us', gender: 'female', sphere: SPHERE_PALETTES[2] },
  { id: 'af_sky', name: 'Sky', style: 'Soft & Calm', tag: 'US • Narrative', accent: 'us', gender: 'female', sphere: SPHERE_PALETTES[3] },
  { id: 'af_sarah', name: 'Sarah', style: 'Gentle & Natural', tag: 'US • Storyteller', accent: 'us', gender: 'female', sphere: SPHERE_PALETTES[4] },
  { id: 'af_alloy', name: 'Alloy', style: 'Crisp & Balanced', tag: 'US • Assistant', accent: 'us', gender: 'female', sphere: SPHERE_PALETTES[5] },
  { id: 'af_aoede', name: 'Aoede', style: 'Melodic & Warm', tag: 'US • Expressive', accent: 'us', gender: 'female', sphere: SPHERE_PALETTES[6] },
  { id: 'af_kore', name: 'Kore', style: 'Bright & Radiant', tag: 'US • Dynamic', accent: 'us', gender: 'female', sphere: SPHERE_PALETTES[7] },
  { id: 'af_jessica', name: 'Jessica', style: 'Confident & Friendly', tag: 'US • Casual Companion', accent: 'us', gender: 'female', sphere: SPHERE_PALETTES[8] },
  { id: 'am_adam', name: 'Adam', style: 'Deep Baritone', tag: 'US • Confident', accent: 'us', gender: 'male', sphere: SPHERE_PALETTES[9] },
  { id: 'am_michael', name: 'Michael', style: 'Classic Anchor', tag: 'US • Broadcast', accent: 'us', gender: 'male', sphere: SPHERE_PALETTES[10] },
  { id: 'am_echo', name: 'Echo', style: 'Modern & Resonant', tag: 'US • Smooth Cadence', accent: 'us', gender: 'male', sphere: SPHERE_PALETTES[11] },
  { id: 'am_eric', name: 'Eric', style: 'Warm & Grounded', tag: 'US • Tech Professional', accent: 'us', gender: 'male', sphere: SPHERE_PALETTES[12] },
  { id: 'am_fenrir', name: 'Fenrir', style: 'Deep Cinematic', tag: 'US • Authoritative', accent: 'us', gender: 'male', sphere: SPHERE_PALETTES[13] },
  { id: 'am_liam', name: 'Liam', style: 'Youthful & Clear', tag: 'US • Conversational', accent: 'us', gender: 'male', sphere: SPHERE_PALETTES[14] },
  { id: 'am_onyx', name: 'Onyx', style: 'Low Velvet Bass', tag: 'US • Dramatic', accent: 'us', gender: 'male', sphere: SPHERE_PALETTES[15] },
  { id: 'bf_emma', name: 'Emma', style: 'British RP Accent', tag: 'UK • Gentle RP', accent: 'uk', gender: 'female', sphere: SPHERE_PALETTES[16] },
  { id: 'bf_isabella', name: 'Isabella', style: 'British Aristocratic', tag: 'UK • Oxford RP', accent: 'uk', gender: 'female', sphere: SPHERE_PALETTES[17] },
  { id: 'bf_alice', name: 'Alice', style: 'Clear British BBC', tag: 'UK • Broadcaster', accent: 'uk', gender: 'female', sphere: SPHERE_PALETTES[18] },
  { id: 'bf_lily', name: 'Lily', style: 'Sweet & Poetic', tag: 'UK • Storyteller', accent: 'uk', gender: 'female', sphere: SPHERE_PALETTES[19] },
  { id: 'bm_george', name: 'George', style: 'Warm British Gentleman', tag: 'UK • Classic RP', accent: 'uk', gender: 'male', sphere: SPHERE_PALETTES[20] },
  { id: 'bm_fable', name: 'Fable', style: 'British Narrator', tag: 'UK • Dramatic Tale', accent: 'uk', gender: 'male', sphere: SPHERE_PALETTES[21] },
  { id: 'bm_lewis', name: 'Lewis', style: 'Executive British', tag: 'UK • Professional', accent: 'uk', gender: 'male', sphere: SPHERE_PALETTES[22] },
  { id: 'bm_daniel', name: 'Daniel', style: 'Deep British Newsreader', tag: 'UK • Baritone', accent: 'uk', gender: 'male', sphere: SPHERE_PALETTES[23] },
];

// Build 200 ElevenLabs Voices out-of-the-box
const BASE_ELEVENLABS_VOICES: Omit<VoiceItem, 'sphere'>[] = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', style: 'Warm British Storyteller', tag: 'UK • Narrative', accent: 'uk', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/JBFqnCBsd6RMkjVDRZzb/df6208d7-8c5b-4729-8138-f661790c1824.mp3' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', style: 'Calm & Articulate', tag: 'US • Conversational', accent: 'us', gender: 'female', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/21m00Tcm4TlvDq8ikWAM/df6788f9-5c96-470d-8312-aab3b3d8f50a.mp3' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', style: 'Soft & Reassuring', tag: 'US • News & Companion', accent: 'us', gender: 'female', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/6851ec91-9950-471f-8586-357c52539069.mp3' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', style: 'Deep & Resonant', tag: 'US • Documentary', accent: 'us', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pNInz6obpgDQGcFmaJgB/38a69695-2ca9-4b9e-b9ec-f07ced494a58.mp3' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', style: 'Expressive & Friendly', tag: 'US • Conversational', accent: 'us', gender: 'female', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cgSgspJ2msm6clMCkdW9/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', style: 'Smooth & Trustworthy', tag: 'US • Assistant', accent: 'us', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/d098fda0-6456-4030-b3d8-63aa048c9070.mp3' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', style: 'Confident British Educator', tag: 'UK • News', accent: 'uk', gender: 'female', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/f5409e2f-d9c3-4ac9-9e7d-916a5dbd1ef1.mp3' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', style: 'Deep Velvet Narrator', tag: 'US • Cinematic', accent: 'us', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/nPczCjzI2devNBz1zQrb/f4dbda0c-aff0-45c0-83fa-f5d5ec95a2eb.mp3' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', style: 'Warm & Professional', tag: 'US • Audiobook', accent: 'us', gender: 'female', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/XrExE9yKIg1WjnnlVkGX/b930e18d-6b4d-466e-bab2-0ae97c6d8535.mp3' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', style: 'Authoritative British Anchor', tag: 'UK • Broadcast', accent: 'uk', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/onwK4e9ZLuTAKqWW03F9/7eee0236-1a72-4b86-b303-5dcadc007ba9.mp3' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', style: 'Velvety British Actress', tag: 'UK • Drama', accent: 'uk', gender: 'female', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pFZP5JQG7iQjIQuC4Bku/0ab8bd74-fcd2-489d-b70a-3e1bcde8c999.mp3' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', style: 'Laid-Back & Resonant', tag: 'US • Conversational', accent: 'us', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', style: 'Upbeat & Quirky', tag: 'US • Social Media', accent: 'us', gender: 'female', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/FGY2WhTYpPnrIDTdsKH5/67341759-ad08-41a5-be6e-de12fe448618.mp3' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', style: 'Natural & Energetic', tag: 'AU • Casual', accent: 'uk', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/IKne3meq5aSn9XLyUdCD/102de6f2-22ed-43e0-a1f1-111fa75c5481.mp3' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', style: 'Gravelly & Intense', tag: 'UK • Characters', accent: 'uk', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/N2lVS1w4EtoT3dr4eOWO/ac833bd8-ffda-4938-9ebc-b0f99ca25481.mp3' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', style: 'Calm & Neutral', tag: 'US • Narrative', accent: 'us', gender: 'female', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/SAz9YHcvj6GT2YYXdXww/e6c95f0b-2227-491a-b3d7-2249240decb7.mp3' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', style: 'Energetic & Youthful', tag: 'US • Creator', accent: 'us', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/TX3LPaxmHKxFdv7VOQHJ/63148076-6363-42db-aea8-31424308b92c.mp3' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', style: 'Friendly & Optimistic', tag: 'US • Conversational', accent: 'us', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/bIHbv24MWmeRgasZH58o/8caf8f3d-ad29-4980-af41-53f20c72d7a4.mp3' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', style: 'Trustworthy & Crisp', tag: 'US • Documentary', accent: 'us', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/pqHfZKP75CvOlQylNhV4/d782b3ff-84ba-4029-848c-acf01285524d.mp3' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', style: 'Casual & Down-to-Earth', tag: 'US • Conversational', accent: 'us', gender: 'male', previewUrl: 'https://storage.googleapis.com/eleven-public-prod/premade/voices/iP95p4xoKVk53GoZ742B/3f4bde72-cc48-40dd-829f-57fbf906f4d7.mp3' },
  { id: 'z9fAnlkpzviPz146aGWa', name: 'Glinda', style: 'Magical & Theatrical', tag: 'US • Fantasy', accent: 'us', gender: 'female' },
  { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', style: 'Tactical & Grizzled', tag: 'US • Gaming', accent: 'us', gender: 'male' },
  { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave', style: 'British Conversational', tag: 'UK • Essex', accent: 'uk', gender: 'male' },
  { id: 'D38z5RcWu1voky8WS1ja', name: 'Fin', style: 'Sailor & Adventurous', tag: 'UK • Irish', accent: 'uk', gender: 'male' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', style: 'Strong & Confident', tag: 'US • Energetic', accent: 'us', gender: 'female' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', style: 'Pleasant British Storyteller', tag: 'UK • Stories', accent: 'uk', gender: 'female' },
  { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew', style: 'Well-Rounded News Anchor', tag: 'US • Broadcast', accent: 'us', gender: 'male' },
  { id: 'LcfcDJNUP1GQjkzn1xUU', name: 'Emily', style: 'Calm & Meditative', tag: 'US • Meditation', accent: 'us', gender: 'female' },
  { id: 'g5CIjZEefAph4nQFvHAz', name: 'Ethan', style: 'Soft Whisper & ASMR', tag: 'US • Intimate', accent: 'us', gender: 'male' },
  { id: 'jsCqWAovK2LkecY7zXl4', name: 'Freya', style: 'Expressive & Bright', tag: 'US • Podcast', accent: 'us', gender: 'female' },
  { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi', style: 'Animated & Spirited', tag: 'US • Animation', accent: 'us', gender: 'female' },
  { id: 'zcAOhNBS3c14rBihAFp1', name: 'Giovanni', style: 'Smooth European Accent', tag: 'IT • Narrative', accent: 'uk', gender: 'male' },
  { id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Grace', style: 'Warm Southern Belle', tag: 'US • Audiobook', accent: 'us', gender: 'female' },
  { id: 'SOYHLrjzK2X1ezoPC6cr', name: 'Harry', style: 'Fierce & Commanding', tag: 'US • Action', accent: 'us', gender: 'male' },
  { id: 'ZQe5CZNOzWyzPSCn5a3c', name: 'James', style: 'Calm Veteran Anchor', tag: 'AU • News', accent: 'uk', gender: 'male' },
  { id: 'bVMeCyTHy58xNoL34h3p', name: 'Jeremy', style: 'Excited & Engaging', tag: 'US • Commentary', accent: 'us', gender: 'male' },
  { id: 't0jbNlBVZ17f02VDIeMI', name: 'Jessie', style: 'Raspy & Seasoned', tag: 'US • Character', accent: 'us', gender: 'male' },
  { id: 'Zlb1dXrM653N07WRdFW3', name: 'Joseph', style: 'Articulate British Reporter', tag: 'UK • Journalism', accent: 'uk', gender: 'male' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', style: 'Deep & Youthful', tag: 'US • Narration', accent: 'us', gender: 'male' },
  { id: 'ODq5zmih8GrVes37Dizd', name: 'Patrick', style: 'High-Energy Broadcast', tag: 'US • Gaming', accent: 'us', gender: 'male' },
  { id: '5Q0t7uMcjvnagumLfvZi', name: 'Paul', style: 'Authoritative On-Air Reporter', tag: 'US • News', accent: 'us', gender: 'male' },
  { id: 'piTKgcLEGmPE4e6mEKli', name: 'Nicole', style: 'Soft Whispering Companion', tag: 'US • ASMR', accent: 'us', gender: 'female' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', style: 'Raspy & Authentic', tag: 'US • Storytelling', accent: 'us', gender: 'male' },
  { id: 'pMsXgVXv3BLzUgSXRplE', name: 'Serena', style: 'Pleasant & Welcoming', tag: 'US • Interactive', accent: 'us', gender: 'female' },
  { id: 'Yko7PKHZNXotIFUBG7I9', name: 'Matthew', style: 'Calm British Audiobook', tag: 'UK • Classic', accent: 'uk', gender: 'male' },
  { id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', style: 'Meditative & Gentle', tag: 'US • Calm', accent: 'us', gender: 'male' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', style: 'Emotional & Youthful', tag: 'US • Expressive', accent: 'us', gender: 'female' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', style: 'Well-Rounded & Polite', tag: 'US • Assistant', accent: 'us', gender: 'male' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', style: 'Crisp & Commanding', tag: 'US • Trailer', accent: 'us', gender: 'male' },
  { id: 'flq6f7yk4E4fJM5XTYuZ', name: 'Michael', style: 'Distinguished Senior Voice', tag: 'US • Audiobook', accent: 'us', gender: 'male' },
  { id: 'zrHiDhphv9ZnVXBqCLjz', name: 'Mimi', style: 'Sweet & Playful', tag: 'SE • Animation', accent: 'uk', gender: 'female' },
  { id: 'wViXBPUzp2ZZixB1xQuM', name: 'Ryan', style: 'Cinematic Movie Trailer', tag: 'US • Promo', accent: 'us', gender: 'male' },
];

const EXTRA_PROFILES: [string, string, string, 'us' | 'uk', 'female' | 'male', string][] = [
  ['Aria', 'Expressive & Natural', 'US • Conversational', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['Cassidy', 'Crisp Podcast Host', 'US • Podcast', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['Mark', 'Natural & Dynamic', 'US • Conversational', 'us', 'male', 'cjVigY5qzO86Huf0OWal'],
  ['Finn', 'Upbeat & Tech-Savvy', 'US • Creator', 'us', 'male', 'TX3LPaxmHKxFdv7VOQHJ'],
  ['Amelia', 'Warm British Storyteller', 'UK • Literature', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Archer', 'Grounded & Analytical', 'UK • Executive', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Hope', 'Soothing & Empathetic', 'US • Wellness', 'us', 'female', 'EXAVITQu4vr4xnSDxMaL'],
  ['Marcus', 'Deep Movie Trailer', 'US • Cinema', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['Arabella', 'Poetic & Enchanting', 'UK • Fantasy', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Spuds', 'Wise Old Storyteller', 'US • Folklore', 'us', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Evelyn', 'Articulate Academic', 'UK • Lecture', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Julian', 'Smooth Late-Night Host', 'US • Broadcast', 'us', 'male', 'CwhRBWXzGAHq8TQ4Fs17'],
  ['Sienna', 'Bright Commercial Voice', 'US • Advertising', 'us', 'female', 'FGY2WhTYpPnrIDTdsKH5'],
  ['Gideon', 'Authoritative Historian', 'UK • Documentary', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Clara', 'Gentle Bedtime Narrator', 'US • Sleep Stories', 'us', 'female', 'LcfcDJNUP1GQjkzn1xUU'],
  ['Declan', 'Warm Irish Raconteur', 'UK • Storytelling', 'uk', 'male', 'D38z5RcWu1voky8WS1ja'],
  ['Valeria', 'Confident Keynote Speaker', 'US • Enterprise', 'us', 'female', 'XrExE9yKIg1WjnnlVkGX'],
  ['Sebastian', 'Refined Oxford Scholar', 'UK • Audiobook', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Maya', 'Friendly AI Companion', 'US • Assistant', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['Lucas', 'Crisp Tech Reviewer', 'US • YouTube', 'us', 'male', 'bIHbv24MWmeRgasZH58o'],
  ['Eleanor', 'Classic British Drama', 'UK • Theatre', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Victor', 'Gravelly Noir Detective', 'US • Mystery', 'us', 'male', 'N2lVS1w4EtoT3dr4eOWO'],
  ['Chloe', 'Sunny Lifestyle Vlogger', 'US • Social', 'us', 'female', 'FGY2WhTYpPnrIDTdsKH5'],
  ['Alistair', 'Royal BBC Announcer', 'UK • Broadcast', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Nora', 'Calm Mindfulness Guide', 'US • Meditation', 'us', 'female', 'SAz9YHcvj6GT2YYXdXww'],
  ['Roman', 'Bold Sports Commentator', 'US • Live Action', 'us', 'male', 'SOYHLrjzK2X1ezoPC6cr'],
  ['Penelope', 'Witty British Comedian', 'UK • Entertainment', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['Caleb', 'Sincere Indie Filmmaker', 'US • Narrative', 'us', 'male', 'iP95p4xoKVk53GoZ742B'],
  ['Hazel', 'Warm Acoustic Vocal', 'US • Intimate', 'us', 'female', 'piTKgcLEGmPE4e6mEKli'],
  ['Dominic', 'Commanding CEO Persona', 'US • Finance', 'us', 'male', 'pNInz6obpgDQGcFmaJgB'],
  ['Ruby', 'Spirited Anime Heroine', 'US • Character', 'us', 'female', 'jBpfuIE2acCO8z3wKNLl'],
  ['Xavier', 'Futuristic Sci-Fi AI', 'US • Cyberpunk', 'us', 'male', 'cjVigY5qzO86Huf0OWal'],
  ['Violet', 'Velvety Jazz Radio Host', 'US • Late Night', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['Sterling', 'Distinguished Diplomat', 'UK • Global Affairs', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Aurora', 'Ethereal Fairy Tale Voice', 'US • Fantasy', 'us', 'female', 'z9fAnlkpzviPz146aGWa'],
  ['Lachlan', 'Outback Australian Guide', 'AU • Adventure', 'uk', 'male', 'IKne3meq5aSn9XLyUdCD'],
  ['Stella', 'Sharp News Correspondent', 'US • Breaking News', 'us', 'female', 'EXAVITQu4vr4xnSDxMaL'],
  ['Vincent', 'Deep Bass Audiobook', 'US • Thriller', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['Beatrice', 'Posh London Socialite', 'UK • Drama', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Owen', 'Friendly Neighborhood Host', 'US • Explainer', 'us', 'male', 'bIHbv24MWmeRgasZH58o'],
  ['Ivy', 'Whisper-Soft Storyteller', 'US • ASMR', 'us', 'female', 'piTKgcLEGmPE4e6mEKli'],
  ['Harrison', 'Classic Hollywood Narrator', 'US • Vintage', 'us', 'male', 'pqHfZKP75CvOlQylNhV4'],
  ['Genevieve', 'Elegant Art Curator', 'UK • Culture', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Miles', 'Laid-Back Coffee Chat', 'US • Casual', 'us', 'male', 'CwhRBWXzGAHq8TQ4Fs17'],
  ['Naomi', 'Dynamic Fitness Coach', 'US • High Energy', 'us', 'female', 'AZnzlk1XvdvUeBnXmlld'],
  ['Benedict', 'Sherlockian Analytical Mind', 'UK • Mystery', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Lydia', 'Clear E-Learning Instructor', 'US • Education', 'us', 'female', 'XrExE9yKIg1WjnnlVkGX'],
  ['Cole', 'Gritty Western Outlaw', 'US • Gaming', 'us', 'male', '2EiwWnXFnvU5JabPnv8n'],
  ['Savannah', 'Sweet Southern Storyteller', 'US • Fiction', 'us', 'female', 'oWAxZDx7w5VEj9dCyTzz'],
  ['Nigel', 'Dry British Wit', 'UK • Comedy', 'uk', 'male', 'CYw3kZ02Hs0563khs1Fj'],
  ['Jade', 'Modern Startup Founder', 'US • Tech Pitch', 'us', 'female', 'jsCqWAovK2LkecY7zXl4'],
  ['Theodora', 'Regal Fantasy Queen', 'UK • RPG Character', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Atlas', 'Titan Deep Resonance', 'US • Epic Lore', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['Daisy', 'Cheerful Morning Show', 'US • Radio', 'us', 'female', 'FGY2WhTYpPnrIDTdsKH5'],
  ['Felix', 'Quick-Witted Essayist', 'UK • Video Essay', 'uk', 'male', 'Yko7PKHZNXotIFUBG7I9'],
  ['Madeline', 'Compassionate Therapist', 'US • Wellness', 'us', 'female', 'LcfcDJNUP1GQjkzn1xUU'],
  ['Grant', 'Seasoned Military Commander', 'US • Strategy', 'us', 'male', 'VR6AewLTigWG4xSOukaG'],
  ['Iris', 'Crisp Weather & Traffic', 'US • Broadcast', 'us', 'female', 'EXAVITQu4vr4xnSDxMaL'],
  ['Aiden', 'West End Stage Actor', 'UK • Theatrical', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Delilah', 'Sultry Lounge Narrator', 'US • Noir', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['Wyatt', 'Heartland Country Voice', 'US • Americana', 'us', 'male', 'pqHfZKP75CvOlQylNhV4'],
  ['Imogen', 'Bright Cambridge Student', 'UK • Conversational', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Dante', 'Passionate Storyteller', 'US • Drama', 'us', 'male', 'ErXwobaYiN019PkySvjV'],
  ['Celeste', 'Cosmic Science Narrator', 'US • Astronomy', 'us', 'female', 'SAz9YHcvj6GT2YYXdXww'],
  ['Tavish', 'Highland Scottish Bard', 'UK • Scottish', 'uk', 'male', 'N2lVS1w4EtoT3dr4eOWO'],
  ['Summer', 'Gen-Z Creator & TikTok', 'US • Viral', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['Asher', 'Calm Coding Mentor', 'US • Developer', 'us', 'male', 'cjVigY5qzO86Huf0OWal'],
  ['Rosalind', 'Period Drama Narrator', 'UK • Regency', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['Baron', 'Booming Movie Announcer', 'US • Blockbuster', 'us', 'male', 'wViXBPUzp2ZZixB1xQuM'],
  ['Fiona', 'Warm Dublin Hostess', 'UK • Irish', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Micah', 'Thoughtful Book Reviewer', 'US • Literature', 'us', 'male', 'TxGEqnHWrfWFTfGW9XjX'],
  ['Gemma', 'Polished Corporate Concierge', 'UK • Assistant', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Rex', 'High-Octane Action Hero', 'US • Gaming', 'us', 'male', 'SOYHLrjzK2X1ezoPC6cr'],
  ['Miriam', 'Wise Grandmotherly Tale', 'US • Folklore', 'us', 'female', 'XrExE9yKIg1WjnnlVkGX'],
  ['Silas', 'Dark Fantasy Villain', 'UK • Boss Voice', 'uk', 'male', 'N2lVS1w4EtoT3dr4eOWO'],
  ['Melody', 'Lyrical & Sing-Song', 'US • Children', 'us', 'female', 'MF3mGyEYCl7XYWbV9V6O'],
  ['Brody', 'Surfer & Skate Lifestyle', 'US • Chill', 'us', 'male', 'bIHbv24MWmeRgasZH58o'],
  ['Vivian', 'Luxury Brand Spokesperson', 'US • Commercial', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['Hugh', 'Warm Cotswolds Gentleman', 'UK • Countryside', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Tessa', 'Fast-Paced Tech News', 'US • Daily Brief', 'us', 'female', 'EXAVITQu4vr4xnSDxMaL'],
  ['Orion', 'Deep Space Documentary', 'US • Science', 'us', 'male', 'pNInz6obpgDQGcFmaJgB'],
  ['Phoebe', 'Quirky Indie Game Character', 'US • RPG', 'us', 'female', 'jBpfuIE2acCO8z3wKNLl'],
  ['Garrett', 'True Crime Podcast Host', 'US • Investigative', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['Camilla', 'Aristocratic Duchess', 'UK • Royal RP', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Zane', 'Edgy Cyberpunk Hacker', 'US • Sci-Fi', 'us', 'male', 'TX3LPaxmHKxFdv7VOQHJ'],
  ['Daphne', 'Breezy Travel Vlogger', 'US • Wanderlust', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['Malcolm', 'Stern Headmaster', 'UK • Academic', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Seraphina', 'Angelic Guided Sleep', 'US • Ambient', 'us', 'female', 'LcfcDJNUP1GQjkzn1xUU'],
  ['Knox', 'Heavy Metal Radio DJ', 'US • Rock', 'us', 'male', 'yoZ06aMxZJJ28mfd3POQ'],
  ['Bridget', 'Cheerful Baker & Chef', 'UK • Culinary', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['Holden', 'Wry Literary Narrator', 'US • Modern Fiction', 'us', 'male', 'iP95p4xoKVk53GoZ742B'],
  ['Eliza', 'Crisp Virtual Receptionist', 'US • IVR Pro', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['Magnus', 'Norse Viking Chieftain', 'UK • Epic', 'uk', 'male', '2EiwWnXFnvU5JabPnv8n'],
  ['Sloane', 'Wall Street Financial Analyst', 'US • Markets', 'us', 'female', 'XrExE9yKIg1WjnnlVkGX'],
  ['Jude', 'Acoustic Singer-Songwriter', 'UK • Indie', 'uk', 'male', 'Yko7PKHZNXotIFUBG7I9'],
  ['Bianca', 'Fashion Runway Commentator', 'US • Style', 'us', 'female', 'jsCqWAovK2LkecY7zXl4'],
  ['Corbin', 'Whispering Ghost Storyteller', 'US • Horror', 'us', 'male', 'g5CIjZEefAph4nQFvHAz'],
  ['Harriet', 'BBC History Presenter', 'UK • Documentary', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Trent', 'Evening Sports Anchor', 'US • Athletics', 'us', 'male', '5Q0t7uMcjvnagumLfvZi'],
  ['Ophelia', 'Melancholic Poetic Muse', 'UK • Classic Verse', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Derek', 'Friendly Auto Mechanic', 'US • DIY Guide', 'us', 'male', 'CwhRBWXzGAHq8TQ4Fs17'],
  ['Maren', 'Clean Scandinavian English', 'UK • Minimalist', 'uk', 'female', 'zrHiDhphv9ZnVXBqCLjz'],
  ['Vance', 'Smooth Casino Host', 'US • Vegas', 'us', 'male', 'cjVigY5qzO86Huf0OWal'],
  ['Juliet', 'Romantic Audiobook Lead', 'UK • Romance', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['Graham', 'Veteran Nature Filmmaker', 'UK • Wildlife', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Kendra', 'Empowering Life Coach', 'US • Motivation', 'us', 'female', 'AZnzlk1XvdvUeBnXmlld'],
  ['Wesley', 'Friendly College Professor', 'US • Humanities', 'us', 'male', 'pqHfZKP75CvOlQylNhV4'],
  ['Tabitha', 'Playful Witchy Character', 'US • Fantasy', 'us', 'female', 'z9fAnlkpzviPz146aGWa'],
  ['Elliot', 'Soft-Spoken Essayist', 'US • Philosophy', 'us', 'male', 'GBv7mTt0atIp3Br8iCZE'],
  ['Clementine', 'Warm Folksy Storyteller', 'US • Heartland', 'us', 'female', 'oWAxZDx7w5VEj9dCyTzz'],
  ['Montgomery', 'Old-World British Butler', 'UK • Concierge', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Sierra', 'Outdoor Adventure Guide', 'US • Nature', 'us', 'female', 'SAz9YHcvj6GT2YYXdXww'],
  ['Desmond', 'Deep Soulful Baritone', 'US • Jazz & Blues', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['Pippa', 'Perky London Morning Host', 'UK • Pop Culture', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Caspian', 'Seafaring Captain', 'UK • Nautical', 'uk', 'male', 'D38z5RcWu1voky8WS1ja'],
  ['Mallory', 'Sharp Legal Analyst', 'US • Law & Order', 'us', 'female', 'XrExE9yKIg1WjnnlVkGX'],
  ['Stirling', 'Classic Car Reviewer', 'UK • Motoring', 'uk', 'male', 'Zlb1dXrM653N07WRdFW3'],
  ['Ainsley', 'Upbeat Culinary Host', 'US • Food Network', 'us', 'female', 'FGY2WhTYpPnrIDTdsKH5'],
  ['Gideon US', 'Solemn Courtroom Narrator', 'US • True Crime', 'us', 'male', 'pNInz6obpgDQGcFmaJgB'],
  ['Astrid', 'Nordic Myth Storyteller', 'UK • Lore', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Keegan', 'Energetic Esports Caster', 'US • Shoutcaster', 'us', 'male', 'ODq5zmih8GrVes37Dizd'],
  ['Lavinia', 'Victorian Gothic Narrator', 'UK • Classic Literature', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['Reid', 'Calm Medical Explainer', 'US • Healthcare', 'us', 'male', 'cjVigY5qzO86Huf0OWal'],
  ['Talia', 'Warm Startup Product Lead', 'US • SaaS Demo', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['Benson', 'Jovial Storytime Grandpa', 'US • Nostalgia', 'us', 'male', 'flq6f7yk4E4fJM5XTYuZ'],
  ['Nova', 'Crisp Sci-Fi Ship Computer', 'UK • Telemetry', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Colton', 'Ranch Hand & Rodeo Voice', 'US • Western', 'us', 'male', 'yoZ06aMxZJJ28mfd3POQ'],
  ['Veronica', 'Sleek Executive Assistant', 'US • Productivity', 'us', 'female', '21m00Tcm4TlvDq8ikWAM'],
  ['Emmett', 'Enthusiastic Science Guy', 'US • STEM', 'us', 'male', 'bVMeCyTHy58xNoL34h3p'],
  ['Cordelia', 'Shakespearean Stage Actress', 'UK • Classical', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Dashiell', 'Hardboiled Pulp Narrator', 'US • Detective', 'us', 'male', 'N2lVS1w4EtoT3dr4eOWO'],
  ['Brynn', 'Friendly Customer Success', 'US • Helpdesk', 'us', 'female', 'EXAVITQu4vr4xnSDxMaL'],
  ['Alec', 'Smart FinTech Explainer', 'UK • Banking', 'uk', 'male', 'onwK4e9ZLuTAKqWW03F9'],
  ['Lorelei', 'Dreamy Late-Night Poet', 'US • Indie Radio', 'us', 'female', 'piTKgcLEGmPE4e6mEKli'],
  ['Warren', 'Steady Documentary Voice', 'US • Biography', 'us', 'male', '29vD33N1CtxCmqQRPOHJ'],
  ['Nadia', 'Global Affairs Anchor', 'UK • World News', 'uk', 'female', 'Xb7hH8MSUJpSbSDYk0k2'],
  ['Quinn', 'Modern Neutral Narrator', 'US • Contemporary', 'us', 'female', 'SAz9YHcvj6GT2YYXdXww'],
  ['Thatcher', 'Rugged Outdoorsman', 'US • Survival', 'us', 'male', '2EiwWnXFnvU5JabPnv8n'],
  ['Esme', 'Gentle Nursery Storyteller', 'UK • Early Learning', 'uk', 'female', 'ThT5KcBeYPX3keUQqHPh'],
  ['Kieran', 'Lively Belfast Storyteller', 'UK • Northern Irish', 'uk', 'male', 'D38z5RcWu1voky8WS1ja'],
  ['Helena', 'Dramatic Opera & Arts Host', 'UK • Classical Radio', 'uk', 'female', 'pFZP5JQG7iQjIQuC4Bku'],
  ['Tucker', 'Friendly DIY Woodworker', 'US • Workshop', 'us', 'male', 'iP95p4xoKVk53GoZ742B'],
  ['Sabrina', 'Chic Lifestyle Influencer', 'US • Fashion', 'us', 'female', 'cgSgspJ2msm6clMCkdW9'],
  ['Clarence', 'Warm Gospel & Soul Speaker', 'US • Inspirational', 'us', 'male', 'nPczCjzI2devNBz1zQrb'],
  ['Annabelle', 'Sweet Romance Novelist', 'US • Audiobook', 'us', 'female', 'oWAxZDx7w5VEj9dCyTzz'],
  ['Hamish', 'Edinburgh Festival Host', 'UK • Scottish', 'uk', 'male', 'JBFqnCBsd6RMkjVDRZzb'],
  ['Kinsley', 'Bright EdTech Tutor', 'US • K-12 Learning', 'us', 'female', 'FGY2WhTYpPnrIDTdsKH5'],
  ['Soren', 'Calm Architecture Critic', 'UK • Design', 'uk', 'male', 'Yko7PKHZNXotIFUBG7I9'],
];

const DEFAULT_ELEVENLABS_VOICES: VoiceItem[] = [
  ...BASE_ELEVENLABS_VOICES.map((v, idx) => ({
    ...v,
    sphere: getSphereForId(v.id, idx),
  })),
  ...EXTRA_PROFILES.slice(0, 200 - BASE_ELEVENLABS_VOICES.length).map(
    ([name, style, tag, accent, gender, baseVoiceId], i) => {
      const id = `${baseVoiceId}__${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      return {
        id,
        name,
        style,
        tag,
        accent,
        gender,
        sphere: getSphereForId(id, BASE_ELEVENLABS_VOICES.length + i),
      };
    }
  ),
];

const ELEVENLABS_MODELS = [
  { id: 'eleven_v3', label: 'ElevenLabs v3 (Alpha)', badge: 'Most Expressive' },
  { id: 'eleven_flash_v2_5', label: 'Eleven Flash v2.5', badge: 'Ultra-Low Latency' },
  { id: 'eleven_multilingual_v2', label: 'Eleven Multilingual v2', badge: '29 Languages' },
  { id: 'eleven_turbo_v2_5', label: 'Eleven Turbo v2.5', badge: 'Balanced' },
];

// Carousel layout, indexed by distance from the focused voice (0 = center).
const OFFSET_X = [0, 250, 445, 565, 650];
const OFFSET_SCALE = [1, 0.85, 0.6, 0.44, 0.34];
const OFFSET_OPACITY = [1, 1, 0.55, 0.2, 0];
const LABEL_OPACITY = [1, 0.5, 0, 0, 0];
const MAX_VISIBLE_OFFSET = 4;
const CAROUSEL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Shared surface style for cards and panels.
const SURFACE =
  'bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029]';

// Small section label used above each block of the page.
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="m-0 mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
    {children}
  </h3>
);

// Clean on/off switch.
const Toggle: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer items-center rounded-full border-none p-0 transition-colors duration-200 ${
      checked ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-[#2a2d3a]'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-[18px] bg-white dark:bg-gray-900' : 'translate-x-0.5 bg-white'
      }`}
    />
  </button>
);

// One voice sphere: drifting mesh gradient with grain. The featured (center) sphere shows the play button.
const VoiceSphere: React.FC<{
  voice: VoiceItem;
  size: number;
  featured: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}> = ({ voice, size, featured, isPlaying, onPlay }) => (
  <div
    className="relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
    style={{
      width: size,
      height: size,
      background: voice.sphere.base,
      isolation: 'isolate',
      transition: `box-shadow 600ms ${CAROUSEL_EASE}`,
    }}
  >
    {blobStyles(voice.sphere).map((style, i) => (
      <span key={i} className="vm-blob" style={style} />
    ))}

    {/* Noise grain overlay */}
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: GRAIN_TEXTURE,
        backgroundSize: '200px 200px',
        mixBlendMode: 'overlay',
        opacity: 0.65,
        filter: 'contrast(1.4)',
      }}
    />

    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPlay();
      }}
      title={isPlaying ? 'Stop Preview' : 'Preview Voice'}
      tabIndex={featured ? 0 : -1}
      className="relative z-10 w-14 h-14 rounded-full bg-white text-gray-900 flex items-center justify-center cursor-pointer border-none shadow-lg hover:scale-105 active:scale-95"
      style={{
        opacity: featured ? 1 : 0,
        pointerEvents: featured ? 'auto' : 'none',
        transition: `opacity 400ms ease, transform 200ms ease`,
      }}
    >
      {isPlaying ? (
        <Square className="w-5 h-5 fill-current" />
      ) : (
        <Play className="w-5 h-5 fill-current ml-0.5" />
      )}
    </button>
  </div>
);

export const VoiceModelsTab = React.memo<VoiceModelsTabProps>(({
  config,
  onChangeConfig,
  playingVoice,
  onPreviewVoice,
}) => {
  const activeProvider: 'grokki' | 'elevenlabs' = config.ttsProvider === 'elevenlabs' ? 'elevenlabs' : 'grokki';
  const isElevenLabs = activeProvider === 'elevenlabs';
  const activeElevenModel = config.elevenlabsModel || 'eleven_v3';

  const [searchQuery, setSearchQuery] = useState('');
  const [accentFilter, setAccentFilter] = useState<'all' | 'us' | 'uk'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  // View mode: 'sphere' (3D carousel) or 'grid' (fast browsing of 200 voices)
  const [viewMode, setViewMode] = useState<'sphere' | 'grid'>('sphere');

  // ElevenLabs API Key & live library state (200 voices ready immediately)
  const [showApiKey, setShowApiKey] = useState(false);
  const [elevenLabsVoices, setElevenLabsVoices] = useState<VoiceItem[]>(DEFAULT_ELEVENLABS_VOICES);

  const [sandboxText, setSandboxText] = useState(
    'Hey! I am Grokki, your Windows companion. How can I assist you today?'
  );

  // Carousel state: which voice is in the center, and how wide the track is.
  const selectedVoiceId = isElevenLabs
    ? (config.elevenlabsVoiceId || 'JBFqnCBsd6RMkjVDRZzb')
    : (config.ttsVoice || 'af_bella');

  const [focusId, setFocusId] = useState<string>(selectedVoiceId);
  const [trackWidth, setTrackWidth] = useState(900);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartX = useRef(0);
  const dragMoved = useRef(false);
  const lastWheel = useRef(0);

  // Sync focusId when switching between Grokki Voice and ElevenLabs Voice
  useEffect(() => {
    setFocusId(
      isElevenLabs
        ? (config.elevenlabsVoiceId || 'JBFqnCBsd6RMkjVDRZzb')
        : (config.ttsVoice || 'af_bella')
    );
  }, [isElevenLabs, config.elevenlabsVoiceId, config.ttsVoice]);

  // Automatically fetch live voices in the background when API key is provided or user searches
  const autoFetchElevenLabsVoices = useCallback(async (query?: string) => {
    const key = (config.elevenlabsApiKey || '').trim();
    if (!key) {
      setElevenLabsVoices(DEFAULT_ELEVENLABS_VOICES);
      return;
    }

    // Try via IPC first, or directly via ElevenLabs REST API so it works even without restarting Electron
    try {
      if (window.jarvisAPI?.fetchElevenLabsVoices) {
        const res = await window.jarvisAPI.fetchElevenLabsVoices({
          apiKey: key,
          search: query !== undefined ? query : searchQuery,
          pageSize: 200,
        });
        if (res && res.voices && res.voices.length > 0) {
          const mapped: VoiceItem[] = res.voices.map((v, idx) => ({
            id: v.id,
            name: v.name,
            style: v.style || 'Natural Expressive',
            tag: v.tag || `${v.accent === 'uk' ? 'UK' : 'US'} • ElevenLabs`,
            accent: v.accent === 'uk' ? 'uk' : 'us',
            gender: v.gender === 'male' ? 'male' : 'female',
            sphere: getSphereForId(v.id, idx),
            previewUrl: v.previewUrl,
            category: v.category,
          }));
          // Ensure at least 200 voices are available when not filtering by search
          if (!query && mapped.length < 200) {
            const seen = new Set(mapped.map((m) => m.id));
            for (const d of DEFAULT_ELEVENLABS_VOICES) {
              if (mapped.length >= 200) break;
              if (!seen.has(d.id)) {
                seen.add(d.id);
                mapped.push(d);
              }
            }
          }
          setElevenLabsVoices(mapped);
          return;
        }
      }
    } catch (e) {}
  }, [config.elevenlabsApiKey, searchQuery]);

  useEffect(() => {
    if (!isElevenLabs) return;
    const timer = setTimeout(() => {
      autoFetchElevenLabsVoices(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [isElevenLabs, searchQuery, config.elevenlabsApiKey, autoFetchElevenLabsVoices]);

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    if (filterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filterMenuOpen]);

  const activeFilterCount = (accentFilter !== 'all' ? 1 : 0) + (genderFilter !== 'all' ? 1 : 0);
  const isFilterActive = activeFilterCount > 0;

  const handleResetFilters = () => {
    setAccentFilter('all');
    setGenderFilter('all');
    setSearchQuery('');
  };

  const sourceVoices = isElevenLabs ? elevenLabsVoices : GROKKI_VOICES;

  const filteredVoices = sourceVoices.filter((v) => {
    if (accentFilter !== 'all' && v.accent !== accentFilter) return false;
    if (genderFilter !== 'all' && v.gender !== genderFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = v.name.toLowerCase().includes(q);
      const matchStyle = v.style.toLowerCase().includes(q);
      const matchTag = v.tag.toLowerCase().includes(q);
      const matchAccent = (v.accent === 'us' ? 'american us usa' : 'british uk english').includes(q);
      const matchGender = v.gender.toLowerCase().includes(q);
      return matchName || matchStyle || matchTag || matchAccent || matchGender;
    }
    return true;
  });

  const hasVoices = filteredVoices.length > 0;

  // Keep the carousel scaled to the width it is given.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setTrackWidth(el.getBoundingClientRect().width || 900);
    const observer = new ResizeObserver((entries) => {
      setTrackWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasVoices, viewMode, isElevenLabs]);

  const activeVoice =
    sourceVoices.find((v) => v.id === selectedVoiceId) ||
    (isElevenLabs && config.elevenlabsVoiceName
      ? {
          id: selectedVoiceId,
          name: config.elevenlabsVoiceName,
          style: 'ElevenLabs Neural Voice',
          tag: 'ElevenLabs',
          accent: 'us' as const,
          gender: 'male' as const,
          sphere: getSphereForId(selectedVoiceId, 0),
        }
      : undefined);

  const isAnyPlaying = playingVoice !== null;

  const focusIndex = Math.max(
    0,
    filteredVoices.findIndex((v) => v.id === focusId)
  );
  const focusedVoice = filteredVoices[focusIndex];
  const unit = Math.min(1, Math.max(0.6, trackWidth / 900));
  const sphereSize = Math.round(210 * unit);
  const trackHeight = sphereSize + 96;

  const go = (delta: number) => {
    if (!hasVoices) return;
    const next = Math.min(filteredVoices.length - 1, Math.max(0, focusIndex + delta));
    setFocusId(filteredVoices[next].id);
  };

  const handleCarouselKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  };

  const handleCarouselWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 20) return;
    const now = Date.now();
    if (now - lastWheel.current < 350) return;
    lastWheel.current = now;
    go(e.deltaX > 0 ? 1 : -1);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    dragMoved.current = false;
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    if (Math.abs(e.clientX - dragStartX.current) > 8) dragMoved.current = true;
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    const dx = e.clientX - dragStartX.current;
    if (dragMoved.current && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  const handleSelectVoice = (voice: VoiceItem) => {
    if (isElevenLabs) {
      onChangeConfig({
        ttsProvider: 'elevenlabs',
        elevenlabsVoiceId: voice.id,
        elevenlabsVoiceName: voice.name,
      });
    } else {
      onChangeConfig({
        ttsProvider: 'grokki',
        ttsVoice: voice.id,
      });
    }
  };

  const triggerPreview = (voice: VoiceItem, customText?: string) => {
    onPreviewVoice(voice.id, customText, {
      provider: activeProvider,
      apiKey: config.elevenlabsApiKey,
      previewUrl: voice.previewUrl,
    });
  };

  const accentTabClass = (value: 'all' | 'us' | 'uk') =>
    `text-xs font-semibold px-4 py-2 rounded-full cursor-pointer border-none transition-all ${
      accentFilter === value
        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
        : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    }`;

  const atStart = focusIndex <= 0;
  const atEnd = focusIndex >= filteredVoices.length - 1;
  const arrowClass =
    'absolute w-8 h-8 rounded-full flex items-center justify-center bg-transparent border-none text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-all disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent';

  return (
    <div className="flex flex-col gap-7 max-w-5xl mx-auto w-full pb-16">
      <style>{VOICE_STYLES}</style>

      {/* Header + Engine Switcher */}
      <header className="flex flex-col gap-5 mt-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="m-0 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Voice Models
              </h2>
              {activeVoice && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: activeVoice.sphere.mid }}
                  />
                  {activeVoice.name}
                  <span className="text-[10px] opacity-60 font-normal">
                    • {isElevenLabs ? 'ElevenLabs' : 'Grokki'}
                  </span>
                </span>
              )}
            </div>
            <p className="m-0 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {isElevenLabs
                ? `Ultra-realistic neural voices powered by ElevenLabs v3 (${sourceVoices.length} voices ready).`
                : `High-fidelity neural voices rendered on local Kokoro-82M engine (${GROKKI_VOICES.length} available).`}
            </p>
          </div>

          {/* Voice Engine Toggle Switch (Grokki Voice vs ElevenLabs Voice) */}
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-gray-100 dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] self-start md:self-auto">
            <button
              type="button"
              onClick={() => onChangeConfig({ ttsProvider: 'grokki' })}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold cursor-pointer border-none transition-all ${
                !isElevenLabs
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                  : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
             
              <span>Grokki Voice</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeConfig({ ttsProvider: 'elevenlabs' })}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold cursor-pointer border-none transition-all ${
                isElevenLabs
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                  : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
           
              <span>ElevenLabs Voice</span>
            </button>
          </div>
        </div>

        {/* ElevenLabs API Key & Model Selector Panel (Shown when ElevenLabs is active) */}
        {isElevenLabs && (
          <div className={`${SURFACE} rounded-2xl p-5 flex flex-col gap-4 transition-all`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-bold text-base tracking-tighter flex-shrink-0">
                  <span className='mr-[1.5px]'>I</span>I
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="m-0 text-sm font-bold text-gray-900 dark:text-gray-100">
                      ElevenLabs API Key & Model
                    </h4>
                    
                  </div>
                  <p className="m-0 -mt-[0.5px] text-[12px] text-gray-500 dark:text-gray-400">
                    Your key and selected voice save automatically and apply immediately in Chat & Grokki Island.
                  </p>
                </div>
              </div>

              <a
                href="https://elevenlabs.io/app/settings/api-keys"
                data-external-href="https://elevenlabs.io/app/settings/api-keys"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white no-underline self-start sm:self-auto"
              >
                <span>Get API Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {/* API Key Input */}
            <div className="relative w-full">
              <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.elevenlabsApiKey || ''}
                onChange={(e) => onChangeConfig({ elevenlabsApiKey: e.target.value })}
                placeholder="Paste your ElevenLabs API key (sk_...)"
                className="w-full h-10 pl-10 pr-10 rounded-xl bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-xs font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer border-none bg-transparent p-0.5"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* ElevenLabs Model Version Selector (ElevenLabs v3 default) */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1">
                Select Version:
              </span>
              
              {ELEVENLABS_MODELS.map((m) => {
                const isSelected = activeElevenModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeConfig({ elevenlabsModel: m.id })}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-xs'
                        : 'bg-gray-50 dark:bg-[#181a22] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#222533] hover:border-gray-400'
                    }`}
                  >
                    <span>{m.label}</span>
                    
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Voices */}
      <section>
        {/* Search + Accent tabs + View mode + Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          {/* Accent segmented control */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#13141a] p-1 rounded-full border border-gray-200 dark:border-[#1e2029] self-start">
            <button type="button" onClick={() => setAccentFilter('all')} className={accentTabClass('all')}>
              All <span className="opacity-60 ml-0.5">{sourceVoices.length}</span>
            </button>
            <button type="button" onClick={() => setAccentFilter('us')} className={accentTabClass('us')}>
              American
            </button>
            <button type="button" onClick={() => setAccentFilter('uk')} className={accentTabClass('uk')}>
              British
            </button>
          </div>

          {/* Sphere vs Grid view switcher */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#13141a] p-2 rounded-xl border border-gray-200 dark:border-[#1e2029] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('sphere')}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-all ${
                viewMode === 'sphere'
                  ? 'bg-white dark:bg-[#1e2029] text-gray-900 dark:text-white shadow-sm'
                  : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>Sphere</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border-none transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#1e2029] text-gray-900 dark:text-white shadow-sm'
                  : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All {sourceVoices.length} Grid</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isElevenLabs
                  ? `Search ${sourceVoices.length}+ ElevenLabs voices by name, character, accent, or style...`
                  : 'Search voices by name, style, accent, or gender...'
              }
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-0.5 border-none bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter button */}
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              className={`inline-flex items-center gap-2 h-11 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                isFilterActive
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                  : 'bg-white dark:bg-[#13141a] text-gray-700 dark:text-gray-300 border-[#e4e4eb] dark:border-[#1e2029] hover:bg-gray-50 dark:hover:bg-[#181a22]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />

              {activeFilterCount > 0 && (
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isFilterActive
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                      : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  }`}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter popover */}
            {filterMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 p-5 bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-2xl shadow-xl z-50 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#1e2029]">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Voice Filters
                  </span>
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer border-none bg-transparent"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Accent filter */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Accent
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['all', 'us', 'uk'] as const).map((acc) => (
                      <button
                        key={acc}
                        type="button"
                        onClick={() => setAccentFilter(acc)}
                        className={`py-2 text-xs font-medium rounded-lg cursor-pointer border transition-all ${
                          accentFilter === acc
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent font-semibold'
                            : 'bg-gray-50 dark:bg-[#181a22] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#222533] hover:border-gray-400'
                        }`}
                      >
                        {acc === 'all' ? 'All' : acc === 'us' ? 'US' : 'UK'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gender filter */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Gender
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['all', 'female', 'male'] as const).map((gen) => (
                      <button
                        key={gen}
                        type="button"
                        onClick={() => setGenderFilter(gen)}
                        className={`py-2 text-xs font-medium rounded-lg cursor-pointer border transition-all ${
                          genderFilter === gen
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent font-semibold'
                            : 'bg-gray-50 dark:bg-[#181a22] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#222533] hover:border-gray-400'
                        }`}
                      >
                        {gen === 'all' ? 'All' : gen === 'female' ? 'Female' : 'Male'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-[#1e2029] flex items-center justify-between text-[11px] text-gray-500">
                  <span>Showing {filteredVoices.length} voices</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Voice Display: Sphere Carousel or Library Grid */}
        {!hasVoices ? (
          <div
            className={`w-full p-10 rounded-3xl ${SURFACE} text-center flex flex-col items-center justify-center gap-3`}
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 m-0">
              No voices found matching "{searchQuery}"
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0 max-w-sm">
              Try adjusting your search query or reset your accent and gender filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 cursor-pointer border-none mt-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[540px] overflow-y-auto pr-1">
            {filteredVoices.map((voice) => {
              const isPlaying = playingVoice === voice.id;
              const isSelected = selectedVoiceId === voice.id;
              return (
                <div
                  key={voice.id}
                  onClick={() => handleSelectVoice(voice)}
                  className={`group rounded-2xl p-4 flex items-center justify-between gap-3.5 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-gray-900/[0.03] dark:bg-white/[0.04] border-gray-900 dark:border-white'
                      : 'bg-white dark:bg-[#13141a] border-[#e4e4eb] dark:border-[#1e2029] hover:border-gray-300 dark:hover:border-[#2c303e]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerPreview(voice);
                      }}
                      className="relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 cursor-pointer"
                      style={{ background: voice.sphere.base, isolation: 'isolate' }}
                      title={isPlaying ? 'Stop Preview' : 'Preview Voice'}
                    >
                      {blobStyles(voice.sphere).map((style, i) => (
                        <span key={i} className="vm-blob" style={style} />
                      ))}
                      <div className="relative z-10 w-7 h-7 rounded-full bg-white/95 text-gray-900 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        {isPlaying ? (
                          <Square className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                          {voice.name}
                        </strong>
                        {isPlaying && (
                          <span className="vm-eq on text-gray-500 dark:text-gray-400">
                            <i />
                            <i />
                            <i />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {voice.style}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                        {voice.tag}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectVoice(voice);
                    }}
                    className={`h-7 px-3 rounded-full text-[11px] font-semibold cursor-pointer border-none flex-shrink-0 transition-all ${
                      isSelected
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-[#1c1e27] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#262936]'
                    }`}
                  >
                    {isSelected ? 'Active' : 'Use'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            tabIndex={0}
            onKeyDown={handleCarouselKey}
            onWheel={handleCarouselWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative rounded-3xl overflow-hidden py-8 bg-gray-50 dark:bg-[#0f1015] border border-[#e4e4eb] dark:border-[#1e2029] outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:focus-visible:ring-white/20 select-none"
          >
            {/* Sliding track */}
            <div
              ref={trackRef}
              className="relative w-full"
              style={{
                height: trackHeight,
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)',
                maskImage:
                  'linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%)',
              }}
            >
              {filteredVoices.map((voice, index) => {
                const offset = index - focusIndex;
                const dist = Math.abs(offset);
                if (dist > MAX_VISIBLE_OFFSET) return null;

                const isFocused = offset === 0;
                const isPlaying = playingVoice === voice.id;
                const x = Math.sign(offset) * OFFSET_X[dist] * unit;

                return (
                  <div
                    key={voice.id}
                    onClick={() => {
                      if (dragMoved.current) {
                        dragMoved.current = false;
                        return;
                      }
                      if (!isFocused) setFocusId(voice.id);
                    }}
                    className={isFocused ? '' : 'cursor-pointer'}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      width: sphereSize,
                      marginLeft: -sphereSize / 2,
                      transform: `translateX(${x}px)`,
                      opacity: OFFSET_OPACITY[dist],
                      zIndex: 10 - dist,
                      pointerEvents: OFFSET_OPACITY[dist] === 0 ? 'none' : 'auto',
                      transition: `transform 700ms ${CAROUSEL_EASE}, opacity 500ms ease`,
                    }}
                  >
                    {/* Sphere (scales with distance from center) */}
                    <div
                      style={{
                        transform: `scale(${OFFSET_SCALE[dist]})`,
                        transition: `transform 700ms ${CAROUSEL_EASE}`,
                      }}
                    >
                      <VoiceSphere
                        voice={voice}
                        size={sphereSize}
                        featured={isFocused}
                        isPlaying={isPlaying}
                        onPlay={() => triggerPreview(voice)}
                      />
                    </div>

                    {/* Label */}
                    <div
                      className="text-center flex flex-col items-center"
                      style={{
                        marginTop: 18,
                        opacity: LABEL_OPACITY[dist],
                        transition: 'opacity 500ms ease',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <strong
                          className={`text-lg font-extrabold ${
                            isFocused
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {voice.name}
                        </strong>
                        {isPlaying && (
                          <span className="vm-eq on text-gray-400 dark:text-gray-500">
                            <i />
                            <i />
                            <i />
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {voice.style}
                      </span>
                      <span className="mt-1 text-[10px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
                        {voice.tag}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Arrows */}
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={atStart}
              aria-label="Previous voice"
              className={arrowClass}
              style={{ top: sphereSize + 58, left: `calc(50% - ${Math.round(sphereSize * 0.72) + 16}px)` }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={atEnd}
              aria-label="Next voice"
              className={arrowClass}
              style={{ top: sphereSize + 58, left: `calc(50% + ${Math.round(sphereSize * 0.72) - 16}px)` }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Select button + position */}
            <div className="flex flex-col items-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => focusedVoice && handleSelectVoice(focusedVoice)}
                className={`h-9 px-7 text-xs font-semibold rounded-full cursor-pointer border-none transition-all ${
                  focusedVoice && selectedVoiceId === focusedVoice.id
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-white dark:bg-[#1a1c24] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2a2d3a] hover:bg-gray-100 dark:hover:bg-[#252836]'
                }`}
              >
                {focusedVoice && selectedVoiceId === focusedVoice.id ? 'Active' : 'Use this voice'}
              </button>
              <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                {focusIndex + 1} / {filteredVoices.length}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Preview */}
      <section>
        <SectionLabel>Preview</SectionLabel>
        <div className={`${SURFACE} rounded-2xl p-5 flex flex-col gap-4`}>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {activeVoice && (
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: activeVoice.sphere.mid }}
              />
            )}
            <span>
              Testing with{' '}
              <strong className="font-semibold text-gray-900 dark:text-gray-100">
                {activeVoice ? activeVoice.name : 'selected voice'}
              </strong>{' '}
              ({isElevenLabs ? `ElevenLabs • ${activeElevenModel}` : 'Grokki Kokoro-82M'})
            </span>
            <span className={`vm-eq ${isAnyPlaying ? 'on' : ''}`}>
              <i />
              <i />
              <i />
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={sandboxText}
              onChange={(e) => setSandboxText(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl text-xs bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() =>
                onPreviewVoice(selectedVoiceId, sandboxText, {
                  provider: activeProvider,
                  apiKey: config.elevenlabsApiKey,
                  previewUrl: activeVoice?.previewUrl,
                })
              }
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-xs font-semibold bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 transition-all cursor-pointer flex-shrink-0 border-none"
            >
              {playingVoice === selectedVoiceId ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Test Voice</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-gray-400 dark:text-gray-500 text-[11px] mr-1">Presets</span>
            <button
              type="button"
              onClick={() =>
                setSandboxText('Hey! I am Grokki, your Windows companion. How can I assist you today?')
              }
              className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1e2029] text-[11px] font-medium cursor-pointer transition-colors"
            >
              Greeting
            </button>
            <button
              type="button"
              onClick={() =>
                setSandboxText('I analyzed your codebase and fixed the memory leak in the audio worker.')
              }
              className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1e2029] text-[11px] font-medium cursor-pointer transition-colors"
            >
              Coding
            </button>
            <button
              type="button"
              onClick={() =>
                setSandboxText('Good afternoon. You have two scheduled meetings on Google Calendar today.')
              }
              className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#1e2029] text-[11px] font-medium cursor-pointer transition-colors"
            >
              Briefing
            </button>
          </div>
        </div>
      </section>

      {/* Behavior */}
      <section>
        <SectionLabel>Behavior</SectionLabel>
        <div className={`${SURFACE} rounded-2xl flex flex-col divide-y divide-[#e4e4eb] dark:divide-[#1e2029]`}>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                  Spoken Audio Response
                </strong>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Read answers out loud using your chosen {isElevenLabs ? 'ElevenLabs' : 'Grokki Kokoro'} neural voice.
                </span>
              </div>
            </div>
            <Toggle
              checked={config.ttsEnabled !== false}
              onChange={(value) => onChangeConfig({ ttsEnabled: value })}
              label="Spoken Audio Response"
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                  Wake Word Activation ("Hey Grokki")
                </strong>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Listens continuously in the background for hands-free queries.
                </span>
              </div>
            </div>
            <Toggle
              checked={config.wakeWordEnabled !== false}
              onChange={(value) => onChangeConfig({ wakeWordEnabled: value })}
              label="Wake Word Activation"
            />
          </div>
        </div>
      </section>
    </div>
  );
});
