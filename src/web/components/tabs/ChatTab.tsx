import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Mic,
  Plus,
  Paperclip,
  Copy,
  Check,
  Volume2,
  Square,
  Terminal,
  RefreshCw,
  X,
  FileText,
  FileCode,
  Image as ImageIcon,
  File,
  HelpCircle,
  Target,
  Minimize2,
  Clock,
  Globe,
  ListOrdered,
  MessageSquareText,
  Users,
  Activity,
  Trash2,
  Camera,
  Lock,
} from 'lucide-react';
import { marked } from 'marked';
import { JarvisConfig, Conversation, ChatMessage, AttachedFileInfo } from '../../types/jarvis';
import PixelBlast from './PixelBlast';

import grokkiIcon from '../../assets/grokki_icon.svg';

interface ChatTabProps {
  config: JarvisConfig;
  userName: string;
  onNavigateTab: (tabId: any) => void;
  activeConversation: Conversation;
  onUpdateMessages: (updater: (prevMessages: ChatMessage[]) => ChatMessage[]) => void;
  onNewChat: () => void;
}

interface SlashCommand {
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  hasArg: boolean;
}

const STUDIO_SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'btw',
    desc: 'Ask a quick question without interrupting the main conversation.',
    icon: HelpCircle,
    hasArg: true,
  },
  {
    name: 'goal',
    desc: 'Run until the specified goal is completely finished.',
    icon: Target,
    hasArg: true,
  },
  {
    name: 'compact',
    desc: 'Compact the conversation now (summarize history to free up the context window).',
    icon: Minimize2,
    hasArg: false,
  },
  {
    name: 'schedule',
    desc: 'Run an instruction on a recurring schedule or as a one-time timer.',
    icon: Clock,
    hasArg: true,
  },
  {
    name: 'browser',
    desc: 'Invoke a browser agent for web tasks.',
    icon: Globe,
    hasArg: true,
  },
  {
    name: 'plan',
    desc: 'Plan carefully before executing a task.',
    icon: ListOrdered,
    hasArg: true,
  },
  {
    name: 'grill-me',
    desc: 'Interview me to align on a plan.',
    icon: MessageSquareText,
    hasArg: true,
  },
  {
    name: 'teamwork-preview',
    desc: 'Invoke a team of agents to autonomously tackle large projects.',
    icon: Users,
    hasArg: true,
  },
  {
    name: 'status',
    desc: 'Check live PC health, CPU load, RTX GPU temp, and memory usage.',
    icon: Activity,
    hasArg: false,
  },
  {
    name: 'clean',
    desc: 'Clear temporary junk cache files and purge recycle bin.',
    icon: Trash2,
    hasArg: false,
  },
  {
    name: 'screenshot',
    desc: 'Capture a clean fullscreen screenshot to Desktop and clipboard.',
    icon: Camera,
    hasArg: false,
  },
  {
    name: 'lock',
    desc: 'Immediately lock Windows workstation.',
    icon: Lock,
    hasArg: false,
  },
  {
    name: 'notes',
    desc: 'Generate study notes or meeting summary document to Desktop.',
    icon: FileText,
    hasArg: true,
  },
];

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getFileIcon(ext?: string) {
  const e = (ext || '').toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp'].includes(e)) {
    return <ImageIcon className="w-4 h-4 text-emerald-500" />;
  }
  if (['.js', '.ts', '.tsx', '.jsx', '.py', '.html', '.css', '.json', '.cpp', '.c', '.cs', '.java', '.go', '.rs'].includes(e)) {
    return <FileCode className="w-4 h-4 text-blue-500" />;
  }
  if (['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.csv', '.xlsx'].includes(e)) {
    return <FileText className="w-4 h-4 text-amber-500" />;
  }
  return <File className="w-4 h-4 text-gray-500" />;
}

const AnimatedMessageContent: React.FC<{
  content: string;
  isAnimated?: boolean;
  speed?: 'fast' | 'normal' | 'relaxed';
  onScroll?: () => void;
  onFinished?: () => void;
}> = ({ content, isAnimated, speed = 'fast', onScroll, onFinished }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rawHtml = marked.parse(content) as string;

    if (!isAnimated) {
      container.innerHTML = rawHtml;
      return;
    }

    // Parse HTML and wrap non-whitespace words in animated spans
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    let totalWords = 0;

    function walk(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text || !text.trim()) return;

        const frag = doc.createDocumentFragment();
        const tokens = text.split(/(\s+)/);
        for (const tok of tokens) {
          if (!tok) continue;
          if (/^\s+$/.test(tok)) {
            frag.appendChild(doc.createTextNode(tok));
          } else {
            const span = doc.createElement('span');
            span.className = 'grokki-typing-word grokki-word-hidden';
            span.textContent = tok;
            frag.appendChild(span);
            totalWords++;
          }
        }
        node.parentNode?.replaceChild(frag, node);
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (['SCRIPT', 'STYLE', 'SVG'].includes(el.tagName)) return;
        Array.from(node.childNodes).forEach(walk);
      }
    }

    Array.from(doc.body.childNodes).forEach(walk);

    if (totalWords === 0) {
      container.innerHTML = rawHtml;
      onFinished?.();
      return;
    }

    container.innerHTML = doc.body.innerHTML;
    container.classList.add('grokki-typing-active');

    const wordNodes = Array.from(container.querySelectorAll<HTMLElement>('.grokki-word-hidden'));
    const cursor = document.createElement('span');
    cursor.className = 'grokki-typing-cursor';

    let currentIndex = 0;
    const msPerWord = speed === 'relaxed' ? 36 : speed === 'normal' ? 22 : 12;
    const targetTotalTime = Math.min(3200, Math.max(350, totalWords * msPerWord));
    const tickInterval = 18;
    const totalTicks = targetTotalTime / tickInterval;
    const wordsPerTick = Math.max(1, Math.ceil(totalWords / totalTicks));

    let timer: any = null;
    let finished = false;

    const finishTyping = () => {
      if (finished) return;
      finished = true;
      if (timer) clearInterval(timer);
      timer = null;
      wordNodes.forEach((s) => {
        s.classList.remove('grokki-word-hidden');
        s.classList.add('grokki-word-fade');
      });
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      container.classList.remove('grokki-typing-active');
      onFinished?.();
    };

    const revealBatch = () => {
      const end = Math.min(currentIndex + wordsPerTick, totalWords);
      for (let i = currentIndex; i < end; i++) {
        const s = wordNodes[i];
        s.classList.remove('grokki-word-hidden');
        s.classList.add('grokki-word-fade');
      }
      if (end > 0 && end <= totalWords) {
        wordNodes[end - 1].after(cursor);
      }
      currentIndex = end;
      onScroll?.();

      if (currentIndex >= totalWords) {
        finishTyping();
      }
    };

    container.addEventListener('click', finishTyping, { once: true });
    timer = setInterval(revealBatch, tickInterval);
    revealBatch();

    return () => {
      if (timer) clearInterval(timer);
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
    };
  }, [content, isAnimated]);

  return (
    <div
      ref={containerRef}
      className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 text-sm leading-relaxed font-sans"
    />
  );
};

export const ChatTab: React.FC<ChatTabProps> = ({
  config,
  userName,
  onNavigateTab,
  activeConversation,
  onUpdateMessages,
  onNewChat,
}) => {
  const messages = activeConversation.messages;
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFileInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Slash Commands state
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);

  const isSlashMode = inputValue.startsWith('/') && !inputValue.includes(' ') && !slashDismissed;
  const slashQuery = isSlashMode ? inputValue.slice(1).toLowerCase().trim() : '';
  const filteredSlashCommands = isSlashMode
    ? STUDIO_SLASH_COMMANDS.filter(
        (c) => c.name.toLowerCase().includes(slashQuery) || c.desc.toLowerCase().includes(slashQuery)
      )
    : [];

  useEffect(() => {
    if (!inputValue.startsWith('/')) {
      setSlashDismissed(false);
      setSlashIndex(0);
    }
  }, [inputValue]);

  useEffect(() => {
    if (slashIndex >= filteredSlashCommands.length) {
      setSlashIndex(0);
    }
  }, [filteredSlashCommands.length]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Voice Synthesizer & Speech-to-Text State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecRef = useRef<any | null>(null);
  const timerRef = useRef<any | null>(null);

  const playSynthSound = (type: 'start' | 'stop') => {
    if (config.soundEffectsEnabled === false) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch (err) {
      console.warn('Audio feedback error:', err);
    }
  };

  const startVoiceRecording = async () => {
    playSynthSound('start');
    setIsRecording(true);
    setRecordingDuration(0);
    setInterimTranscript('');
    audioChunksRef.current = [];

    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufferLength);
      const numBars = 48;
      const barWidth = 4;
      const spacing = 4;
      const smoothedHeights = new Float32Array(numBars).fill(4);

      const drawBars = () => {
        animationFrameRef.current = requestAnimationFrame(drawBars);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyser.getByteFrequencyData(freqData);

        // Detect light vs dark theme: solid black bars on light mode, white on dark mode
        const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
        const barColor = isDark ? '#f3f4f6' : '#111827';

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = barColor;

        const totalWidth = numBars * barWidth + (numBars - 1) * spacing;
        const startX = (canvas.width - totalWidth) / 2;
        const centerY = canvas.height / 2;

        for (let i = 0; i < numBars; i++) {
          // Symmetric distribution for aesthetic vocal waveform curve
          const normIdx = i < numBars / 2 ? i / (numBars / 2) : (numBars - 1 - i) / (numBars / 2);
          const binIndex = Math.min(freqData.length - 1, Math.floor(normIdx * 34));
          const val = freqData[binIndex] || 0;

          // Target height between 4px (idle pill dot) and 34px (active speech)
          const targetH = 4 + (val / 255) * 30;

          // Smooth spring damping for ultra-fluid motion
          smoothedHeights[i] = smoothedHeights[i] * 0.72 + targetH * 0.28;
          const h = Math.max(4, Math.min(34, smoothedHeights[i]));

          const x = startX + i * (barWidth + spacing);
          const y = centerY - h / 2;

          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, barWidth, h, barWidth / 2);
          } else {
            ctx.rect(x, y, barWidth, h);
          }
          ctx.fill();
        }
      };

      drawBars();

      // Native Web Speech Recognition for Realtime Voice-to-Text
      const SpeechRecClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecClass) {
        try {
          const recognition = new SpeechRecClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                final += event.results[i][0].transcript;
              } else {
                interim += event.results[i][0].transcript;
              }
            }
            if (final.trim()) {
              setInputValue((prev) => (prev ? `${prev} ${final.trim()}` : final.trim()));
            }
            setInterimTranscript(interim.trim() || final.trim());
          };

          recognition.onerror = (err: any) => {
            console.warn('[SpeechRec] Recognition notice:', err?.error);
          };

          recognition.start();
          speechRecRef.current = recognition;
        } catch (e) {
          console.warn('SpeechRecognition initialization notice:', e);
        }
      }

      // MediaRecorder fallback / multi-modal audio chunk collection
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      console.error('Failed to access microphone for synthesizer recording:', err);
      stopVoiceRecording();
    }
  };

  const stopVoiceRecording = async () => {
    playSynthSound('stop');
    setIsRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch (e) {}
      speechRecRef.current = null;
    }

    let recordedBlob: Blob | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        if (audioChunksRef.current.length > 0) {
          recordedBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType || 'audio/webm' });
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // Multimodal Gemini Audio Fallback if speech recognition returned empty
    if ((!inputValue.trim() || interimTranscript) && recordedBlob && window.jarvisAPI?.executeAIAudio) {
      try {
        const arrayBuffer = await recordedBlob.arrayBuffer();
        const base64Audio = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const res = await window.jarvisAPI.executeAIAudio({
          base64Audio,
          mimeType: recordedBlob.type || 'audio/webm',
        });
        if (res && res.transcript && res.transcript !== 'Voice command') {
          setInputValue((prev) => (prev ? `${prev} ${res.transcript}` : res.transcript));
        }
      } catch (e) {
        console.warn('AI audio transcription fallback notice:', e);
      }
    }

    setInterimTranscript('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (speechRecRef.current) {
        try { speechRecRef.current.stop(); } catch (e) {}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading]);

  const handleSelectFile = async () => {
    if (!window.jarvisAPI?.selectFile) return;
    try {
      const res = await window.jarvisAPI.selectFile();
      if (!res.canceled && res.path) {
        setAttachedFile({
          path: res.path,
          name: res.name || res.path.split('\\').pop() || 'file',
          size: res.size,
          ext: res.ext || (res.path.includes('.') ? '.' + res.path.split('.').pop()?.toLowerCase() : ''),
        });
      } else if (!res.canceled && res.filePaths && res.filePaths.length > 0) {
        const p = res.filePaths[0];
        setAttachedFile({
          path: p,
          name: p.split('\\').pop() || 'file',
          ext: p.includes('.') ? '.' + p.split('.').pop()?.toLowerCase() : '',
        });
      }
    } catch (err) {
      console.error('File select error:', err);
    }
  };

  const handleSelectSlashCommand = (cmd: SlashCommand) => {
    if (cmd.hasArg) {
      setInputValue(`/${cmd.name} `);
      setSlashDismissed(true);
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setInputValue('');
      setSlashDismissed(true);
      handleSendMessage(`/${cmd.name}`);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    if (isRecording) {
      stopVoiceRecording();
    }
    let text = (textToSend || inputValue).trim();
    if (!text && !attachedFile) return;

    if (!text && attachedFile) {
      text = `Analyze and summarize this file: ${attachedFile.name}`;
    }

    const currentAttachment = attachedFile;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFile: currentAttachment || undefined,
    };

    onUpdateMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setAttachedFile(null);
    setSlashDismissed(false);
    setLoading(true);

    try {
      if (window.jarvisAPI?.executeAI) {
        const context: any = {};
        if (currentAttachment) {
          context.filePath = currentAttachment.path;
          context.attachedFile = currentAttachment;
        }
        const res = await window.jarvisAPI.executeAI(text, context);
        const replyContent = res.reply || res.message || 'Action executed successfully.';

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: replyContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionsExecuted: res.actionsExecuted,
          isAnimated: true,
        };
        onUpdateMessages((prev) => [...prev, assistantMsg]);
      } else {
        setTimeout(() => {
          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I received your command: **"${text}"**${currentAttachment ? ` with attachment \`${currentAttachment.name}\`` : ''}.\n\nGrokki Studio is connected and ready to automate Windows, manage your workspace, and synthesize voices.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isAnimated: true,
          };
          onUpdateMessages((prev) => [...prev, assistantMsg]);
          setLoading(false);
        }, 500);
        return;
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Execution Error**: ${err.message || 'Failed to communicate with Agent Brain.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAnimated: true,
      };
      onUpdateMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSlashMode && filteredSlashCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredSlashCommands[slashIndex] || filteredSlashCommands[0];
        if (selected) {
          handleSelectSlashCommand(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashDismissed(true);
        return;
      }
    }

    const sendOnEnter = config.sendOnEnter !== false;
    if (e.key === 'Enter') {
      if (sendOnEnter && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      } else if (!sendOnEnter && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = async (id: string, text: string) => {
    if (speakingId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeakingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setSpeakingId(id);
    try {
      if (window.jarvisAPI?.speakText) {
        const cleanText = text.replace(/[*#`_~\[\]]/g, '').slice(0, 350);
        const res = await window.jarvisAPI.speakText(cleanText, config.ttsVoice || 'af_bella');
        if (res && res.success && res.base64Audio) {
          const audio = new Audio(`data:audio/wav;base64,${res.base64Audio}`);
          audioRef.current = audio;
          audio.onended = () => {
            setSpeakingId(null);
            audioRef.current = null;
          };
          audio.play();
        } else {
          setSpeakingId(null);
        }
      }
    } catch (e) {
      setSpeakingId(null);
    }
  };

  const suggestions = [
    {
      title: 'Windows Health & Diagnostics',
      desc: 'Check CPU load, NVIDIA GPU temp, and system memory.',
      prompt: '/status',
    },
    {
      title: 'System Storage & Cleanup',
      desc: 'Clear temporary cache and check drive free space.',
      prompt: '/clean',
    },
    {
      title: 'Google Calendar & Agenda',
      desc: "Retrieve today's schedule and pending deadlines.",
      prompt: 'What meetings and events do I have on Google Calendar today?',
    },
    {
      title: 'Clean Fullscreen Screenshot',
      desc: 'Capture screen directly to Desktop and Clipboard.',
      prompt: '/screenshot',
    },
  ];

  const renderMarkdown = (content: string) => {
    return { __html: marked.parse(content) as string };
  };

  const handleMessageFinished = (id: string) => {
    onUpdateMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isAnimated: false } : m))
    );
  };

  const renderSlashMenu = () => {
    if (!isSlashMode || filteredSlashCommands.length === 0) return null;

    return (
      <div className="absolute top-full mt-4 left-0 right-0 mb-2 p-1.5 bg-white/95 dark:bg-[#12131a]/95 backdrop-blur-xl border border-gray-200 dark:border-[#202330] rounded-2xl z-50 max-h-64 overflow-y-auto flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
        <div className="flex items-center justify-between px-2.5 py-1.5 text-[10.5px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-[#1e2029]">
          <span className='text-[10px]'>Direct Actions & Slash Commands</span>
          <span className="font-mono text-[9px] lowercase bg-gray-100 dark:bg-[#1a1c24] px-1.5 py-0.5 rounded text-gray-500">
            ↑↓ navigate • enter select
          </span>
        </div>
        <div className="flex flex-col gap-0.5 pt-1">
          {filteredSlashCommands.map((cmd, idx) => {
            const Icon = cmd.icon;
            const isSelected = idx === slashIndex;
            return (
              <div
                key={cmd.name}
                onClick={() => handleSelectSlashCommand(cmd)}
                onMouseEnter={() => setSlashIndex(idx)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-[#1f212d] text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#161822]'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-[#1a1c24] text-gray-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  <span className="font-mono font-bold text-xs text-gray-900 dark:text-white flex-shrink-0">
                    /{cmd.name}
                  </span>
                  <span className="text-[11.5px] text-gray-500 dark:text-gray-400 truncate">
                    {cmd.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSynthesizerVisualizer = () => {
    if (!isRecording) return null;

    return (
      <div className="w-full max-w-xl mx-auto mb-2 p-3 rounded-2xl bg-white/95 dark:bg-[#13141a]/95 backdrop-blur-md border border-gray-200 dark:border-[#202330] shadow-md shadow-black/5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[11px] font-bold tracking-wider text-gray-900 dark:text-gray-100 uppercase font-mono">
              REC {formatRecordingTime(recordingDuration)}
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
              • Listening
            </span>
          </div>

          <span className="text-[10.5px] font-mono text-gray-400 dark:text-gray-500 select-none">
            Click ■ to finish
          </span>
        </div>

        {/* Smooth Vertical Bars Waveform */}
        <div className="w-full h-11 rounded-xl bg-gray-50 dark:bg-[#0c0d12] border border-gray-200/60 dark:border-[#1e2029] flex items-center justify-center overflow-hidden px-2 relative">
          <canvas
            ref={canvasRef}
            width={480}
            height={44}
            className="w-full h-full block"
          />
        </div>

        {/* Interim Transcript Live Stream */}
        <div className="mt-2 text-[10px] text-gray-700 dark:text-gray-300 italic truncate font-sans">
          {interimTranscript ? (
            <span>"{interimTranscript}"</span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 not-italic">
              Speak into your microphone... speech-to-text is live.
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full w-full justify-between pb-3 px-6 pt-4">
      {/* Background PixelBlast Effect */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden z-0"
        style={{ width: '100%', height: '100%', position: 'absolute' }}
      >
        <PixelBlast
          variant="square"
          pixelSize={3}
          color="#000"
          patternScale={2}
          patternDensity={1}
          softness={0.6}
          glow={0.4}
          twinkle={0.25}
          drift={0.2}
          hoverEffect="reveal"
          enableRipples
          edgeFade={0.25}
          accentColor="#B497CF"
          pixelSizeJitter={0}
          smoothing={1}
          speed={0.5}
          driftAngle={30}
          hoverRadius={140}
          rippleSpeed={0.3}
          rippleThickness={0.1}
          rippleIntensityScale={1}
          autoRipple={0}
          tiltX={0}
          tiltY={0}
          intro
          lightMode={false}
          transparent={false}
        />
      </div>

      {/* Main Content Column */}
      <div className="flex flex-col h-full w-full max-w-3xl mx-auto justify-between relative z-10 min-h-0">
      {/* Messages / Hero View */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-6 pb-4">
          {/* Grokki Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-[11px] font-semibold text-gray-800 dark:text-gray-200 mb-3 select-none">
            <img src={grokkiIcon} alt="Grokki" className="w-3.5 h-3.5 rounded-full" />
            <span>Grokki</span>
          </div>

          {/* Persona Heading */}
          <h1 className="text-2xl font-bold tracking-tight text-white mb-6 font-sans drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            Ready when you are. What are we executing today?
          </h1>

          {/* Staged File Preview Card */}
          {attachedFile && (
            <div className="w-full max-w-xl mx-auto mb-3 p-2.5 bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-2xl shadow-sm flex items-center justify-between text-left transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center flex-shrink-0 border border-gray-200/60 dark:border-[#252836]">
                  {getFileIcon(attachedFile.ext)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {attachedFile.name}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    {formatFileSize(attachedFile.size) ? `${formatFileSize(attachedFile.size)} • ` : ''}Ready to share with Grokki
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                title="Remove attachment"
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-[#1e2029] transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Centered Floating Input Pill with Slash Command Palette */}
          <div className="w-full max-w-xl mx-auto relative">
            {renderSlashMenu()}
            {renderSynthesizerVisualizer()}

            <div className="w-full bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-full py-2 px-3.5 shadow-sm hover:shadow-md transition-all flex items-center gap-2.5">
              {/* Attach Tool Button */}
              <button
                type="button"
                onClick={handleSelectFile}
                title="Attach File or Context"
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1 flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Input Field */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRecording
                    ? "Listening... speaking your prompt"
                    : attachedFile
                    ? `Ask Grokki about ${attachedFile.name}...`
                    : "Type / for slash commands, or ask Grokki anything..."
                }
                className="flex-1 bg-transparent border-none outline-none text-xs md:text-[12px] text-gray-900 dark:text-gray-100 placeholder-gray-400 font-sans"
                autoFocus
              />

              {/* Pill Badge */}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] font-mono select-none">
                Beta
              </span>

              {/* Voice-to-Text Button: Mic when idle, Square Stop when recording */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                title={isRecording ? "Stop voice recording" : "Voice to text"}
                className={`transition-all cursor-pointer border-none flex items-center justify-center rounded-full ${
                  isRecording
                    ? 'w-7 h-7 bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30 animate-pulse flex-shrink-0'
                    : 'p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-transparent'
                }`}
              >
                {isRecording ? (
                  <Square className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {/* Send Arrow Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() && !attachedFile}
                title="Send Message"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none shadow-xs flex-shrink-0 ${
                  inputValue.trim() || attachedFile
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                    : 'bg-gray-200 dark:bg-[#1e2029] text-gray-400 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Suggestions Grid */}
          <div className="w-full max-w-xl mt-8 text-left">
            <span className="text-[11px] font-semibold text-gray-300 tracking-wider uppercase block mb-2.5">
              Suggestions & Commands
            </span>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="p-3 rounded-xl bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer transition-all flex flex-col gap-0.5 shadow-xs hover:shadow-sm"
                >
                  <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                    {item.title}
                  </strong>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active Conversation Thread (Clean, Modern Chat Bubbles) */
        <div className="flex-1 flex flex-col overflow-y-auto px-1 py-3 space-y-5">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 dark:border-[#1e2029]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate max-w-xs">
                {activeConversation.title || 'Conversation'}
              </span>
              <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029]">
                {messages.length} messages • saved locally
              </span>
            </div>
            {/* <button
              type="button"
              onClick={onNewChat}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border-none bg-transparent"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button> */}
          </div>

          {/* Messages Flow */}
          <div className="flex flex-col space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}
                >
                  {isUser ? (
                    /* User Message: Clean Modern Rounded Bubble */
                    <div className="max-w-[75%] bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-2xl rounded-tr-xs text-sm font-medium leading-relaxed border border-gray-300/80 dark:border-[#1e2029]">
                      {msg.attachedFile && (
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/70 dark:bg-[#13141a]/70 border border-gray-200 dark:border-gray-700/60 mb-2 text-xs font-mono">
                          {getFileIcon(typeof msg.attachedFile === 'string' ? msg.attachedFile : msg.attachedFile.ext)}
                          <span className="truncate max-w-[200px] font-semibold text-gray-800 dark:text-gray-200">
                            {typeof msg.attachedFile === 'string' ? msg.attachedFile.split('\\').pop() : msg.attachedFile.name}
                          </span>
                          {typeof msg.attachedFile !== 'string' && msg.attachedFile.size ? (
                            <span className="text-[10px] text-gray-400">
                              ({formatFileSize(msg.attachedFile.size)})
                            </span>
                          ) : null}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap m-0 leading-relaxed text-[13px]">
                        {msg.content}
                      </p>
                    </div>
                  ) : (
                    /* Grokki Assistant Message: Natural Flow */
                    <div className="flex items-start gap-3 max-w-[92%] w-full">
                      {/* Real Grokki Orb Avatar */}
                      <img
                        src={grokkiIcon}
                        alt="Grokki"
                        className="w-6 h-6 rounded-full shadow-xs flex-shrink-0 mt-1 select-none"
                      />

                      {/* Content Area */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                            Grokki
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                            {msg.timestamp}
                          </span>
                        </div>

                        {/* Executed Tools Actions Pills */}
                        {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 my-1.5">
                            {msg.actionsExecuted.map((act, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#1e2029]"
                              >
                                <Terminal className="w-3 h-3 text-gray-500" />
                                <span>{act.name}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Rendered Markdown Body with Per-Word Fade-In Typing */}
                        <AnimatedMessageContent
                          content={msg.content}
                          isAnimated={config.streamingAnimation !== false && msg.isAnimated}
                          speed={config.streamingSpeed}
                          onScroll={scrollToBottom}
                          onFinished={() => handleMessageFinished(msg.id)}
                        />

                        {/* Pure Icon-Only Actions */}
                        <div className="flex items-center gap-1 mt-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            title="Copy message"
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-colors cursor-pointer border-none bg-transparent"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-gray-900 dark:text-white" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSpeak(msg.id, msg.content)}
                            title="Read aloud"
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-colors cursor-pointer border-none bg-transparent"
                          >
                            {speakingId === msg.id ? (
                              <Square className="w-3.5 h-3.5 fill-current text-gray-900 dark:text-white" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking / Running Indicator */}
            {loading && (
              <div className="flex items-start gap-3 max-w-[92%] w-full">
                <img
                  src={grokkiIcon}
                  alt="Grokki"
                  className="w-6 h-6 rounded-full shadow-xs flex-shrink-0 mt-1 animate-pulse select-none"
                />
                <div className="flex items-center gap-2 py-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                  <span>Grokki is executing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Pinned Bottom Input Bar */}
      {messages.length > 0 && (
        <div className="w-full pt-2.5 bg-gradient-to-t from-[#f7f7fa] dark:from-[#0c0d12] to-transparent">
          {/* Staged File Preview Card */}
          {attachedFile && (
            <div className="w-full max-w-xl mx-auto mb-2 p-2.5 bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-2xl  flex items-center justify-between text-left transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center flex-shrink-0 border border-gray-200/60 dark:border-[#252836]">
                  {getFileIcon(attachedFile.ext)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {attachedFile.name}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    {formatFileSize(attachedFile.size) ? `${formatFileSize(attachedFile.size)} • ` : ''}Ready to share with Grokki
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                title="Remove attachment"
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-[#1e2029] transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Floating Slash Command Menu & Synthesizer Visualizer for Bottom Bar */}
          <div className="w-full max-w-xl mx-auto relative">
            {renderSlashMenu()}
            {renderSynthesizerVisualizer()}

            <div className="w-full bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-full py-2 px-3.5 shadow-sm hover:shadow-md transition-all flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSelectFile}
                title="Attach File or Context"
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1 flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRecording
                    ? "Listening... speaking your prompt"
                    : attachedFile
                    ? `Ask Grokki about ${attachedFile.name}...`
                    : "Type / for direct slash commands, or ask anything..."
                }
                className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 font-sans"
              />

              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] font-mono select-none">
                v2.5
              </span>

              {/* Voice-to-Text Button: Mic when idle, Square Stop when recording */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                title={isRecording ? "Stop voice recording" : "Voice to text"}
                className={`transition-all cursor-pointer border-none flex items-center justify-center rounded-full ${
                  isRecording
                    ? 'w-7 h-7 bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/30 animate-pulse flex-shrink-0'
                    : 'p-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-transparent'
                }`}
              >
                {isRecording ? (
                  <Square className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() && !attachedFile}
                title="Send Message"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none shadow-xs flex-shrink-0 ${
                  inputValue.trim() || attachedFile
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                    : 'bg-gray-200 dark:bg-[#1e2029] text-gray-400 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
