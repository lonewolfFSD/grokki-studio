import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Send,
  Upload,
  RotateCcw,
  Camera,
  Loader2,
} from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';

interface AnimeCompanionTabProps {
  config: JarvisConfig;
  onChangeConfig?: (patch: Partial<JarvisConfig>) => void;
}

type EmotionPreset = 'neutral' | 'happy' | 'angry' | 'surprised' | 'relaxed';

// Dynamic emotion analyzer from conversational text
function detectEmotionFromText(text: string): EmotionPreset {
  const t = text.toLowerCase();
  if (/\b(haha|lol|yay|awesome|great|love|happy|glad|cool|perfect|amazing|wonderful|excellent|super)\b/i.test(t)) {
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
  const controlsRef = useRef<OrbitControls | null>(null);
  const lookAtTargetRef = useRef<THREE.Object3D | null>(null);

  // Audio Analyser for Lip Sync
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Dynamic emotion interpolation state
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
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [currentSpeech, setCurrentSpeech] = useState<string>('');
  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(false);
  const [modelUrl, setModelUrl] = useState<string>('/assets/avatars/alicia.vrm');

  // Smooth lerp helper
  const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
  };

  // Helper to set humanoid natural arm rest pose
  const applyRestingArmPose = (vrm: VRM, elapsed: number) => {
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

    // Subtle natural breathing oscillation
    const breath = Math.sin(elapsed * 1.6) * 0.018;
    const armSway = Math.sin(elapsed * 1.6) * 0.012;

    if (chest) chest.rotation.x = breath;
    if (spine) spine.rotation.x = breath * 0.6;

    // Subtle curious head tilt when thinking
    if (head && isThinking) {
      head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, 0.08, 0.05);
    }

    // Natural arm resting angles down by the sides (NEVER T-Pose)
    if (leftUpperArm) {
      leftUpperArm.rotation.set(0.08, 0.08, -1.24 + armSway);
    }
    if (rightUpperArm) {
      rightUpperArm.rotation.set(0.08, -0.08, 1.24 - armSway);
    }
    if (leftLowerArm) {
      leftLowerArm.rotation.set(0.12, 0.22, -0.1);
    }
    if (rightLowerArm) {
      rightLowerArm.rotation.set(0.12, -0.22, 0.1);
    }
    if (leftHand) {
      leftHand.rotation.set(0.0, 0.0, -0.05);
    }
    if (rightHand) {
      rightHand.rotation.set(0.0, 0.0, 0.05);
    }
  };

  // 1. Initialize Three.js WebGL Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera: Portrait view centered on avatar head & upper body
    const camera = new THREE.PerspectiveCamera(28.0, width / height, 0.1, 20.0);
    camera.position.set(0.0, 1.34, 1.15);
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

    // Controls: OrbitControls with constrained bounds
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0.0, 1.22, 0.0);
    controls.minDistance = 0.6;
    controls.maxDistance = 2.4;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.minPolarAngle = Math.PI / 4;
    controlsRef.current = controls;

    // Cursor tracking target object
    const lookAtTarget = new THREE.Object3D();
    lookAtTarget.position.set(0.0, 1.3, 1.0);
    scene.add(lookAtTarget);
    lookAtTargetRef.current = lookAtTarget;

    // Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.6);
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

    // Smooth Cursor LookAt Handler
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (lookAtTargetRef.current) {
        lookAtTargetRef.current.position.set(x * 0.75, 1.28 + y * 0.35, 1.1);
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

    // Main 60 FPS Render Loop
    const clock = new THREE.Clock();
    let blinkTimer = 0;
    let isBlinking = false;
    let blinkProgress = 0;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      controls.update();

      const currentVrm = vrmRef.current;
      if (currentVrm) {
        // 1. Maintain natural arm posture and breathing
        applyRestingArmPose(currentVrm, elapsed);

        // 2. Procedural Poisson Blinking
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
          const nextWeight = lerp(currentWeight, targetWeight, Math.min(1.0, delta * 4.0));
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
          // Smoothly return mouth to rest
          const currentAa = currentVrm.expressionManager?.getValue('aa') || 0;
          const currentOh = currentVrm.expressionManager?.getValue('oh') || 0;
          const currentEe = currentVrm.expressionManager?.getValue('ee') || 0;
          currentVrm.expressionManager?.setValue('aa', lerp(currentAa, 0.0, delta * 8.0));
          currentVrm.expressionManager?.setValue('oh', lerp(currentOh, 0.0, delta * 8.0));
          currentVrm.expressionManager?.setValue('ee', lerp(currentEe, 0.0, delta * 8.0));
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

        // Clean up previous VRM from scene
        if (vrmRef.current && sceneRef.current) {
          sceneRef.current.remove(vrmRef.current.scene);
          VRMUtils.deepDispose(vrmRef.current.scene);
        }

        // Clean up unnecessary meshes and joints for performance
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        // Rotate VRM 0.0 models if needed
        VRMUtils.rotateVRM0(vrm);

        // Bind lookAt target
        if (lookAtTargetRef.current) {
          vrm.lookAt.target = lookAtTargetRef.current;
        }

        // Immediately apply natural resting arm angles
        applyRestingArmPose(vrm, 0);

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

      // Stop any prior playback
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
        currentAudioElementRef.current = null;
      }

      // Initialize Web Audio API Analyser
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

        // Try native IPC Grokki Voice / ElevenLabs TTS
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

        // Seamless fallback to browser Web Speech API if native audio worker is unavailable
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
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isThinking) return;

    const userPrompt = inputMessage.trim();
    setInputMessage('');
    setIsThinking(true);
    targetEmotionRef.current = 'relaxed';

    try {
      let replyText = '';

      // Direct connection to Grokki AI Brain
      if (window.jarvisAPI?.executeAI) {
        const res = await window.jarvisAPI.executeAI(userPrompt, {
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

      // Dynamically detect emotion from the actual AI reply
      const dynamicEmotion = detectEmotionFromText(replyText);
      targetEmotionRef.current = dynamicEmotion;

      // Speak and sync mouth visemes
      await speakSpeech(replyText);
    } catch (err: any) {
      console.error('[LiveAvatar] AI Brain execution failed:', err);
      targetEmotionRef.current = 'surprised';
      await speakSpeech(err?.message || 'Sorry, I had trouble reaching the AI model.');
    } finally {
      setIsThinking(false);
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
    }
  };

  // Camera Reset
  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0.0, 1.34, 1.15);
      controlsRef.current.target.set(0.0, 1.22, 0.0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-full flex-1 min-h-0 flex flex-col bg-[#07080b] overflow-hidden select-none">
      {/* Subtle Studio Radial Vignette */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_50%_35%,rgba(30,41,59,0.35)_0%,rgba(7,8,11,0.95)_75%)]" />

      {/* 3D WebGL Viewport */}
      <div
        ref={mountRef}
        className="relative flex-1 w-full h-full z-10 cursor-grab active:cursor-grabbing"
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

      {/* Top Header HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Name & Status Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-white tracking-tight">
            {avatarName}
          </span>
          <span className="text-[10px] text-gray-400 font-mono pl-1 border-l border-white/10">
            60 FPS
          </span>
        </div>

        {/* Clean Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Custom VRM Upload */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-sm">
            <Upload className="w-3.5 h-3.5 text-gray-300" />
            <span>Load .VRM</span>
            <input
              type="file"
              accept=".vrm"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Camera Reset */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-sm"
            title="Reset View"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Voice Audio Toggle */}
          <button
            type="button"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer shadow-sm ${
              voiceEnabled
                ? 'bg-white/15 border-white/20 text-white'
                : 'bg-white/5 border-white/10 text-gray-500'
            }`}
            title={voiceEnabled ? 'Mute Speech' : 'Enable Speech'}
          >
            {voiceEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Clean Subtitle / Speech Display */}
      <AnimatePresence>
        {showSpeechBubble && currentSpeech && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-20 max-w-lg w-[90%] px-4 py-3 rounded-2xl bg-black/70 backdrop-blur-2xl border border-white/15 text-white shadow-2xl pointer-events-auto"
          >
            <p className="text-xs sm:text-sm font-normal leading-relaxed text-gray-200 m-0 text-center">
              {currentSpeech}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Chat Input */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[92%] pointer-events-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center w-full rounded-2xl bg-black/65 backdrop-blur-2xl border border-white/15 focus-within:border-white/35 shadow-2xl p-1.5 transition-all"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Talk to ${avatarName}...`}
            disabled={isThinking}
            className="flex-1 bg-transparent border-none outline-none px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 font-sans"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isThinking}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border border-white/10 cursor-pointer disabled:opacity-30 transition-all shrink-0 shadow-sm"
          >
            {isThinking ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
            ) : (
              <Send className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AnimeCompanionTab;
