import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Keyboard,
  Volume2,
  VolumeX,
  Settings2,
  Send,
  Upload,
  FolderOpen,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';

interface AnimeCompanionTabProps {
  config: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
}

type EmotionPreset = 'neutral' | 'happy' | 'angry' | 'surprised' | 'relaxed';
type BackgroundTheme = 'obsidian' | 'tokyo' | 'sunset' | 'cyber' | 'light';

interface BackgroundOption {
  id: BackgroundTheme;
  name: string;
  classNames: string;
  preview: string;
}

const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Studio',
    classNames: 'bg-[radial-gradient(circle_at_50%_40%,rgba(30,41,59,0.3)_0%,rgba(7,8,11,0.98)_80%)] bg-[#07080b]',
    preview: '#0f172a',
  },
  {
    id: 'tokyo',
    name: 'Tokyo Neon',
    classNames: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/40 via-[#090514] to-[#030107] bg-[#030107]',
    preview: '#3b0764',
  },
  {
    id: 'cyber',
    name: 'Cyberpunk Grid',
    classNames: 'bg-[radial-gradient(circle_at_50%_35%,rgba(6,182,212,0.15)_0%,rgba(3,7,18,0.98)_75%)] bg-[#030712]',
    preview: '#083344',
  },
  {
    id: 'sunset',
    name: 'Anime Sunset',
    classNames: 'bg-gradient-to-b from-[#311827] via-[#1a0e1c] to-[#08040b]',
    preview: '#581c87',
  },
  {
    id: 'light',
    name: 'Daylight Paper',
    classNames: 'bg-gradient-to-b from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1]',
    preview: '#94a3b8',
  },
];

// Sentiment detector from AI reply and user chat
function detectEmotionFromText(text: string): EmotionPreset {
  const t = text.toLowerCase();
  if (/\b(haha|lol|yay|awesome|great|love|happy|glad|cool|perfect|amazing|wonderful|super|cheers|hehe)\b/i.test(t)) {
    return 'happy';
  }
  if (/\b(what|really|wow|whoa|huh|wait|seriously|omg|incredible|unbelievable)\b/i.test(t) || t.includes('?!') || t.includes('!')) {
    return 'surprised';
  }
  if (/\b(no|never|stop|hate|angry|mad|annoying|grr|pout|bad|worst|wrong)\b/i.test(t)) {
    return 'angry';
  }
  if (/\b(peace|calm|relax|sleep|rest|chill|sure|okay|alright|fine|gentle|soft)\b/i.test(t)) {
    return 'relaxed';
  }
  return 'relaxed';
}

export const AnimeCompanionTab: React.FC<AnimeCompanionTabProps> = ({ config }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const vrmRef = useRef<VRM | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const lookAtTargetRef = useRef<THREE.Object3D | null>(null);

  // Audio Analyser for Lip Sync
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Speech Recognition
  const recognitionRef = useRef<any>(null);

  // Dynamic Neural Emotion state
  const targetEmotionRef = useRef<EmotionPreset>('neutral');
  const currentEmotionWeightsRef = useRef<Record<string, number>>({
    happy: 0,
    angry: 0,
    surprised: 0,
    relaxed: 0,
  });

  // UI State
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [avatarName, setAvatarName] = useState<string>('Aiko');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [showInput, setShowInput] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('obsidian');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [currentSpeech, setCurrentSpeech] = useState<string>('');
  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(false);
  const [modelUrl, setModelUrl] = useState<string>('/assets/avatars/alicia.vrm');

  // Smooth lerp utility
  const smoothLerp = (current: number, target: number, speed: number, delta: number) => {
    return THREE.MathUtils.lerp(current, target, Math.min(1.0, delta * speed));
  };

  // Ultra-Smooth Humanoid Gesture & Arm Posture System (No Snapping, No Jerks)
  const applyHumanoidGestures = (vrm: VRM, elapsed: number, delta: number) => {
    if (!vrm.humanoid) return;

    const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
    const rightLowerArm = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');
    const leftHand = vrm.humanoid.getNormalizedBoneNode('leftHand');
    const rightHand = vrm.humanoid.getNormalizedBoneNode('rightHand');
    const chest = vrm.humanoid.getNormalizedBoneNode('chest');
    const spine = vrm.humanoid.getNormalizedBoneNode('spine');
    const head = vrm.humanoid.getNormalizedBoneNode('head');

    // Calm, slow, natural breathing rhythm (1.1 rad/s ~ 10 breaths/min)
    const breath = Math.sin(elapsed * 1.1) * 0.015;
    const bodySway = Math.sin(elapsed * 0.7) * 0.008;

    if (chest) {
      chest.rotation.x = smoothLerp(chest.rotation.x, breath, 3.0, delta);
    }
    if (spine) {
      spine.rotation.x = smoothLerp(spine.rotation.x, breath * 0.5, 3.0, delta);
      spine.rotation.y = smoothLerp(spine.rotation.y, bodySway, 2.0, delta);
    }

    const isSpeaking = isSpeakingRef.current;
    const isHappy = targetEmotionRef.current === 'happy';

    // Target bone rotations (Euler)
    let targetLUArm = { x: 0.06, y: 0.04, z: 1.25 + breath };
    let targetRUArm = { x: 0.06, y: -0.04, z: -1.25 - breath };
    let targetLLArm = { x: 0.08, y: 0.16, z: 0.0 };
    let targetRLArm = { x: 0.08, y: -0.16, z: 0.0 };
    let targetLHand = { x: 0.0, y: 0.0, z: 0.0 };
    let targetRHand = { x: 0.0, y: 0.0, z: 0.0 };
    let targetHead = { x: breath * 0.6, y: 0.0, z: 0.0 };

    if (isHappy && isSpeaking) {
      // Gentle Happy Expression: subtle cute lift of hands, soft bounce
      const cheerWave = Math.sin(elapsed * 2.5) * 0.05;
      targetLUArm = { x: 0.18, y: 0.12, z: 0.85 + cheerWave };
      targetRUArm = { x: 0.18, y: -0.12, z: -0.85 - cheerWave };
      targetLLArm = { x: 0.15, y: 0.35, z: 0.0 };
      targetRLArm = { x: 0.15, y: -0.35, z: 0.0 };
      targetHead.z = Math.sin(elapsed * 2.0) * 0.04;
    } else if (isSpeaking) {
      // Natural Conversational Hand Gesture: right arm articulates smoothly
      const gestureSway = Math.sin(elapsed * 1.8) * 0.06;
      const elbowSway = Math.cos(elapsed * 1.8) * 0.08;

      // Right arm gestures gently toward chest/torso
      targetRUArm = { x: 0.28, y: -0.18, z: -0.72 + gestureSway };
      targetRLArm = { x: 0.18, y: -0.7 + elbowSway, z: 0.05 };
      targetRHand = { x: 0.05, y: -0.1, z: 0.05 };

      // Left arm rests gently at side with subtle breathing
      targetLUArm = { x: 0.06, y: 0.04, z: 1.25 + breath };
      targetLLArm = { x: 0.1, y: 0.14, z: 0.0 };
      targetHead.x = breath * 1.2 + Math.sin(elapsed * 1.8) * 0.02;
    } else if (isThinking) {
      // Thoughtful gesture: one hand raised toward chin, curious head tilt
      targetRUArm = { x: 0.42, y: -0.22, z: -0.55 };
      targetRLArm = { x: 0.22, y: -1.05, z: 0.12 };
      targetHead.z = 0.08;
      targetHead.x = -0.04;
    }

    // Apply smoothly via lerp (damping factor 4.0 ensures 0 snapping, buttery transitions)
    const smoothSpeed = 3.8;
    if (leftUpperArm) {
      leftUpperArm.rotation.x = smoothLerp(leftUpperArm.rotation.x, targetLUArm.x, smoothSpeed, delta);
      leftUpperArm.rotation.y = smoothLerp(leftUpperArm.rotation.y, targetLUArm.y, smoothSpeed, delta);
      leftUpperArm.rotation.z = smoothLerp(leftUpperArm.rotation.z, targetLUArm.z, smoothSpeed, delta);
    }
    if (rightUpperArm) {
      rightUpperArm.rotation.x = smoothLerp(rightUpperArm.rotation.x, targetRUArm.x, smoothSpeed, delta);
      rightUpperArm.rotation.y = smoothLerp(rightUpperArm.rotation.y, targetRUArm.y, smoothSpeed, delta);
      rightUpperArm.rotation.z = smoothLerp(rightUpperArm.rotation.z, targetRUArm.z, smoothSpeed, delta);
    }
    if (leftLowerArm) {
      leftLowerArm.rotation.x = smoothLerp(leftLowerArm.rotation.x, targetLLArm.x, smoothSpeed, delta);
      leftLowerArm.rotation.y = smoothLerp(leftLowerArm.rotation.y, targetLLArm.y, smoothSpeed, delta);
      leftLowerArm.rotation.z = smoothLerp(leftLowerArm.rotation.z, targetLLArm.z, smoothSpeed, delta);
    }
    if (rightLowerArm) {
      rightLowerArm.rotation.x = smoothLerp(rightLowerArm.rotation.x, targetRLArm.x, smoothSpeed, delta);
      rightLowerArm.rotation.y = smoothLerp(rightLowerArm.rotation.y, targetRLArm.y, smoothSpeed, delta);
      rightLowerArm.rotation.z = smoothLerp(rightLowerArm.rotation.z, targetRLArm.z, smoothSpeed, delta);
    }
    if (leftHand) {
      leftHand.rotation.z = smoothLerp(leftHand.rotation.z, targetLHand.z, smoothSpeed, delta);
    }
    if (rightHand) {
      rightHand.rotation.z = smoothLerp(rightHand.rotation.z, targetRHand.z, smoothSpeed, delta);
    }
    if (head) {
      head.rotation.x = smoothLerp(head.rotation.x, targetHead.x, smoothSpeed, delta);
      head.rotation.y = smoothLerp(head.rotation.y, targetHead.y, smoothSpeed, delta);
      head.rotation.z = smoothLerp(head.rotation.z, targetHead.z, smoothSpeed, delta);
    }
  };

  // 1. Initialize Scene & Locked Camera (Positioned to bring avatar down with generous headroom)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Three.js Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera: Positioned perfectly to bring avatar down into view with clean headroom
    const camera = new THREE.PerspectiveCamera(28.0, width / height, 0.1, 20.0);
    // Target is chest/collarbone level (1.08m), camera positioned at (0, 1.08, 2.65)
    camera.position.set(0.0, 1.08, 2.65);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls: LOCKED ROTATION AND ZOOMING
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; // Rotation disabled per user requirement
    controls.enableZoom = false; // Zoom disabled per user requirement
    controls.enablePan = false; // Pan disabled
    controls.target.set(0.0, 1.02, 0.0);
    controls.update();

    // LookAt Target
    const lookAtTarget = new THREE.Object3D();
    lookAtTarget.position.set(0.0, 1.3, 1.2);
    scene.add(lookAtTarget);
    lookAtTargetRef.current = lookAtTarget;

    // Lighting
    const keyLight = new THREE.DirectionalLight(0xfff6ec, 1.6);
    keyLight.position.set(1.0, 2.0, 1.4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.8);
    rimLight.position.set(-1.2, 1.6, -1.2);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xfdf2f8, 0.7);
    fillLight.position.set(-1.0, 0.9, 1.2);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    // Subtle Eye Cursor Tracking
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (lookAtTargetRef.current) {
        lookAtTargetRef.current.position.set(x * 0.65, 1.25 + y * 0.3, 1.1);
      }
    };
    window.addEventListener('pointermove', handlePointerMove);

    // Responsive Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // 60 FPS Animation Loop
    const clock = new THREE.Clock();
    let blinkTimer = 0;
    let isBlinking = false;
    let blinkProgress = 0;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      const currentVrm = vrmRef.current;
      if (currentVrm) {
        // 1. Fluid, non-jerky gesture and breathing system
        applyHumanoidGestures(currentVrm, elapsed, delta);

        // 2. Procedural Eyelid Blinking
        blinkTimer += delta;
        if (blinkTimer > 3.4 && !isBlinking) {
          isBlinking = true;
          blinkProgress = 0;
          blinkTimer = (Math.random() - 0.5) * 1.8;
        }

        if (isBlinking) {
          blinkProgress += delta * 12.0;
          const blinkWeight = Math.sin(Math.min(blinkProgress, Math.PI));
          currentVrm.expressionManager?.setValue('blink', blinkWeight);
          if (blinkProgress >= Math.PI) {
            isBlinking = false;
            currentVrm.expressionManager?.setValue('blink', 0.0);
          }
        }

        // 3. Dynamic Emotion Blendshape Lerping
        const activeTarget = targetEmotionRef.current;
        const emotions: EmotionPreset[] = ['happy', 'angry', 'surprised', 'relaxed'];
        emotions.forEach((emo) => {
          const targetWeight = emo === activeTarget ? 1.0 : 0.0;
          const currentWeight = currentEmotionWeightsRef.current[emo] || 0.0;
          const nextWeight = smoothLerp(currentWeight, targetWeight, 3.5, delta);
          currentEmotionWeightsRef.current[emo] = nextWeight;
          currentVrm.expressionManager?.setValue(emo, nextWeight);
        });

        // 4. Audio-Driven Lip-Sync Processing
        if (analyserRef.current && isSpeakingRef.current) {
          const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(freqData);

          const lowEnergy = (freqData[2] + freqData[3] + freqData[4]) / 3 / 255;
          const midEnergy = (freqData[8] + freqData[10] + freqData[12]) / 3 / 255;
          const highEnergy = (freqData[20] + freqData[24] + freqData[28]) / 3 / 255;

          const aaVal = Math.min(1.0, lowEnergy * 1.7);
          const ohVal = Math.min(1.0, midEnergy * 1.4);
          const eeVal = Math.min(1.0, highEnergy * 1.3);

          currentVrm.expressionManager?.setValue('aa', aaVal);
          currentVrm.expressionManager?.setValue('oh', ohVal);
          currentVrm.expressionManager?.setValue('ee', eeVal);
        } else {
          // Decay mouth smoothly to rest
          const currentAa = currentVrm.expressionManager?.getValue('aa') || 0;
          const currentOh = currentVrm.expressionManager?.getValue('oh') || 0;
          const currentEe = currentVrm.expressionManager?.getValue('ee') || 0;
          currentVrm.expressionManager?.setValue('aa', smoothLerp(currentAa, 0.0, 7.0, delta));
          currentVrm.expressionManager?.setValue('oh', smoothLerp(currentOh, 0.0, 7.0, delta));
          currentVrm.expressionManager?.setValue('ee', smoothLerp(currentEe, 0.0, 7.0, delta));
        }

        // 5. Update VRM Physics & LookAt
        currentVrm.update(delta);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      ro.disconnect();
      renderer.dispose();
      if (container) container.innerHTML = '';
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // 2. Load VRM Model
  const loadVRM = useCallback((url: string) => {
    setLoading(true);
    setLoadError(null);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      url,
      (gltf) => {
        const vrm: VRM = gltf.userData.vrm;
        if (!vrm) {
          setLoadError('Failed to parse VRM metadata from file.');
          setLoading(false);
          return;
        }

        if (vrmRef.current && sceneRef.current) {
          sceneRef.current.remove(vrmRef.current.scene);
          VRMUtils.deepDispose(vrmRef.current.scene);
        }

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);
        VRMUtils.rotateVRM0(vrm);

        if (lookAtTargetRef.current) {
          vrm.lookAt.target = lookAtTargetRef.current;
        }

        // Position avatar centered on floor
        vrm.scene.position.set(0, 0, 0);

        vrmRef.current = vrm;
        if (sceneRef.current) {
          sceneRef.current.add(vrm.scene);
        }

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('[LiveAvatar] VRM load error:', err);
        setLoadError('Could not load avatar. Please check the model file.');
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    loadVRM(modelUrl);
  }, [modelUrl, loadVRM]);

  // 3. Audio & Voice Speech Synthesis
  const speakSpeech = useCallback(
    async (text: string) => {
      setCurrentSpeech(text);
      setShowSpeechBubble(true);
      if (!voiceEnabled || !text.trim()) return;

      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
        currentAudioElementRef.current = null;
      }

      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
        }
      }

      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const voice = config.grokkiVoiceId || config.ttsVoice || 'expr-voice-3-f';

      try {
        let hasSpoken = false;

        if (window.jarvisAPI?.speakText) {
          const res = await window.jarvisAPI.speakText(text, voice);
          if (res && res.success && res.base64Audio) {
            hasSpoken = true;
            isSpeakingRef.current = true;
            const audio = new Audio(`data:${res.mimeType || 'audio/mpeg'};base64,${res.base64Audio}`);
            currentAudioElementRef.current = audio;

            if (audioContextRef.current && analyserRef.current) {
              const source = audioContextRef.current.createMediaElementSource(audio);
              source.connect(analyserRef.current);
              analyserRef.current.connect(audioContextRef.current.destination);
            }

            audio.onended = () => {
              isSpeakingRef.current = false;
              targetEmotionRef.current = 'neutral';
            };
            audio.onerror = () => {
              isSpeakingRef.current = false;
              targetEmotionRef.current = 'neutral';
            };

            await audio.play();
          }
        }

        // Web Speech Fallback
        if (!hasSpoken && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.05;
          utterance.pitch = 1.15;

          const voices = window.speechSynthesis.getVoices();
          const naturalVoice =
            voices.find((v) => /natural|jenny|aria|samantha|zira|female/i.test(v.name)) ||
            voices.find((v) => v.lang.startsWith('en')) ||
            voices[0];
          if (naturalVoice) utterance.voice = naturalVoice;

          utterance.onstart = () => {
            isSpeakingRef.current = true;
          };
          utterance.onend = () => {
            isSpeakingRef.current = false;
            targetEmotionRef.current = 'neutral';
          };
          utterance.onerror = () => {
            isSpeakingRef.current = false;
            targetEmotionRef.current = 'neutral';
          };

          window.speechSynthesis.speak(utterance);
        }
      } catch (err) {
        console.warn('[LiveAvatar] Speech playback error:', err);
        isSpeakingRef.current = false;
      }
    },
    [config.ttsVoice, config.grokkiVoiceId, voiceEnabled]
  );

  // 4. Send Message & Connect to Real AI Brain
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt !== undefined ? customPrompt : inputMessage).trim();
    if (!promptToSend || isThinking) return;

    setInputMessage('');
    setIsThinking(true);
    targetEmotionRef.current = 'relaxed';

    try {
      let replyText = '';

      if (window.jarvisAPI?.executeAI) {
        const res = await window.jarvisAPI.executeAI(promptToSend, {
          systemPrompt:
            'You are Aiko, an intelligent, engaging 3D desktop companion in Grokki Studio. Keep answers concise (1 to 3 sentences), conversational, natural, and direct.',
        });

        if (res && res.reply) {
          replyText = res.reply.trim();
        } else if (res && res.message) {
          replyText = res.message.trim();
        } else if (res && res.error) {
          replyText = `Error: ${res.error}`;
        }
      }

      if (!replyText) {
        replyText = "I'm here. What would you like to explore or work on?";
      }

      // Dynamic emotion from text
      const dynamicEmotion = detectEmotionFromText(replyText);
      targetEmotionRef.current = dynamicEmotion;

      // Speak and lip-sync
      await speakSpeech(replyText);
    } catch (err: any) {
      console.error('[LiveAvatar] AI Brain execution failed:', err);
      targetEmotionRef.current = 'surprised';
      await speakSpeech(err?.message || 'Sorry, I had trouble reaching the AI brain.');
    } finally {
      setIsThinking(false);
    }
  };

  // 5. Speech-to-Text Microphone Handler
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRec) {
      alert('Speech recognition is not supported in this environment.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[LiveAvatar] Speech recognition start error:', err);
      setIsListening(false);
    }
  };

  // Custom VRM File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setModelUrl(objectUrl);
      const name = file.name.replace(/\.vrm$/i, '');
      setAvatarName(name.charAt(0).toUpperCase() + name.slice(1));
      setShowSettings(false);
    }
  };

  // Open Avatar Folder in Explorer
  const handleOpenFolder = () => {
    if (window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl('file:///E:/Assistant%20AI/public/assets/avatars/');
    } else {
      navigator.clipboard?.writeText('E:\\Assistant AI\\public\\assets\\avatars\\');
      alert('Path copied to clipboard:\nE:\\Assistant AI\\public\\assets\\avatars\\');
    }
  };

  const activeBg = BACKGROUND_OPTIONS.find((b) => b.id === backgroundTheme) || BACKGROUND_OPTIONS[0];

  return (
    <div className={`relative w-full h-full flex-1 min-h-0 flex flex-col ${activeBg.classNames} overflow-hidden select-none transition-colors duration-500`}>
      {/* 3D WebGL Viewport */}
      <div
        ref={mountRef}
        className="relative flex-1 w-full h-full z-10"
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md gap-2.5">
          <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          <p className="text-xs font-medium text-gray-300 tracking-wide">
            Loading Avatar...
          </p>
        </div>
      )}

      {/* Error Toast */}
      {loadError && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs backdrop-blur-md shadow-lg">
          {loadError}
        </div>
      )}

      {/* Top Header Status Pill */}
      <div className="absolute top-4 left-4 z-20 flex items-center pointer-events-none">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-lg pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-white tracking-tight">
            {avatarName}
          </span>
          <span className="text-[10px] text-gray-400 font-mono pl-1 border-l border-white/10">
            60 FPS
          </span>
        </div>
      </div>

      {/* Clean Subtitle / Speech Display Floating with clear headroom */}
      <AnimatePresence>
        {showSpeechBubble && currentSpeech && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-20 max-w-lg w-[90%] px-5 py-3 rounded-2xl bg-black/75 backdrop-blur-2xl border border-white/15 text-white shadow-2xl pointer-events-auto"
          >
            <p className="text-xs sm:text-sm font-normal leading-relaxed text-gray-200 m-0 text-center">
              {currentSpeech}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Keyboard Input (Toggled by Keyboard Button) */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[92%] pointer-events-auto"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center w-full rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/20 focus-within:border-white/40 shadow-2xl p-1.5 transition-all"
            >
              <input
                type="text"
                autoFocus
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Talk to ${avatarName}...`}
                disabled={isThinking}
                className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-xs sm:text-sm text-white placeholder-gray-400 font-sans"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isThinking}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/10 cursor-pointer disabled:opacity-30 transition-all shrink-0 shadow-sm"
              >
                {isThinking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-300" />
                ) : (
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Four Circle Floating Action Buttons */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3.5 p-2 rounded-full bg-black/50 backdrop-blur-2xl border border-white/15 shadow-2xl pointer-events-auto">
        {/* 1. Mic Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`relative flex items-center justify-center w-11 h-11 rounded-full border transition-all cursor-pointer shadow-md ${
            isListening
              ? 'bg-rose-500 border-rose-400 text-white animate-pulse'
              : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
          }`}
          title={isListening ? 'Stop Listening' : 'Voice Input (Mic)'}
        >
          {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-gray-300" />}
        </button>

        {/* 2. Keyboard Button (Toggle Input) */}
        <button
          type="button"
          onClick={() => setShowInput(!showInput)}
          className={`flex items-center justify-center w-11 h-11 rounded-full border transition-all cursor-pointer shadow-md ${
            showInput
              ? 'bg-sky-500/25 border-sky-400/50 text-sky-300'
              : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
          }`}
          title={showInput ? 'Hide Keyboard Input' : 'Show Keyboard Input'}
        >
          <Keyboard className="w-5 h-5" />
        </button>

        {/* 3. Speaker Button (Mute / Unmute) */}
        <button
          type="button"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`flex items-center justify-center w-11 h-11 rounded-full border transition-all cursor-pointer shadow-md ${
            voiceEnabled
              ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
              : 'bg-white/5 border-white/10 text-gray-500'
          }`}
          title={voiceEnabled ? 'Mute Avatar Voice' : 'Enable Avatar Voice'}
        >
          {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {/* 4. Settings Button */}
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center justify-center w-11 h-11 rounded-full border transition-all cursor-pointer shadow-md ${
            showSettings
              ? 'bg-white/30 border-white/40 text-white'
              : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
          }`}
          title="Avatar Settings & Background"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Modal Drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="absolute bottom-24 right-6 z-30 max-w-sm w-[90%] p-5 rounded-2xl bg-black/85 backdrop-blur-2xl border border-white/20 shadow-2xl text-white pointer-events-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-sm font-semibold tracking-wide">Avatar Studio Settings</span>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Background Theme Switcher */}
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-300 block mb-2">
                Studio Background
              </label>
              <div className="grid grid-cols-5 gap-2">
                {BACKGROUND_OPTIONS.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setBackgroundTheme(bg.id)}
                    className={`h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      backgroundTheme === bg.id
                        ? 'border-sky-400 ring-2 ring-sky-400/40'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    style={{ backgroundColor: bg.preview }}
                    title={bg.name}
                  >
                    {backgroundTheme === bg.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Model Source */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <label className="text-xs font-medium text-gray-300 block mb-1">
                Custom Avatar Models (.VRM)
              </label>
              <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                Place any VRoid Studio or VRM 3D avatar directly into your avatars directory or upload one on the fly.
              </p>

              <div className="flex items-center gap-2">
                {/* File picker */}
                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 transition-all cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose .VRM</span>
                  <input
                    type="file"
                    accept=".vrm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Open Folder */}
                <button
                  type="button"
                  onClick={handleOpenFolder}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 transition-all cursor-pointer"
                  title="Open avatar folder or copy path"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Avatars Path</span>
                </button>
              </div>

              <div className="mt-2.5 p-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400 truncate">
                E:\Assistant AI\public\assets\avatars\
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimeCompanionTab;
