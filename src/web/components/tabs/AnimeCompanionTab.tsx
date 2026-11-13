import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMLoaderPlugin, VRMUtils, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Send,
  Upload,
  RefreshCw,
  Camera,
  Smile,
  Frown,
  Meh,
  Heart,
  MessageSquare,
  HelpCircle,
  Eye,
  Settings2,
} from 'lucide-react';
import { JarvisConfig, AiProvider } from '../../types/jarvis';
import Threads from './Threads';

interface AnimeCompanionTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
  onSendChatPrompt?: (prompt: string) => Promise<string | void>;
}

type Emotion = 'neutral' | 'happy' | 'angry' | 'surprised' | 'relaxed';

interface VisemeFrequencies {
  aa: number;
  ih: number;
  ou: number;
  ee: number;
  oh: number;
}

export const AnimeCompanionTab: React.FC<AnimeCompanionTabProps> = ({
  config,
  onChangeConfig,
}) => {
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
  const audioSourceRef = useRef<AudioNode | null>(null);
  const isSpeakingRef = useRef<boolean>(false);

  // Component UI State
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [companionName, setCompanionName] = useState<string>('Ani');
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [lastSpeech, setLastSpeech] = useState<string>(
    "Konichiwa! I'm Ani, your 3D live desktop companion. Talk to me or choose an emotion!"
  );
  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(true);
  const [modelUrl, setModelUrl] = useState<string>('/assets/avatars/default.vrm');
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // 1. Initialize Three.js Scene, Camera, Lighting, and Controls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera: Portrait view framing head and upper torso
    const camera = new THREE.PerspectiveCamera(30.0, width / height, 0.1, 20.0);
    camera.position.set(0.0, 1.38, 1.45);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls: OrbitControls with constrained angles
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0.0, 1.28, 0.0);
    controls.minDistance = 0.7;
    controls.maxDistance = 2.8;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.minPolarAngle = Math.PI / 4;
    controlsRef.current = controls;

    // Cursor tracking target object
    const lookAtTarget = new THREE.Object3D();
    lookAtTarget.position.set(0.0, 1.3, 1.0);
    scene.add(lookAtTarget);
    lookAtTargetRef.current = lookAtTarget;

    // Lighting (Anime Studio Setup)
    // Key Light
    const keyLight = new THREE.DirectionalLight(0xfff6ea, 1.6);
    keyLight.position.set(1.2, 2.0, 1.5);
    scene.add(keyLight);

    // Cool Back/Rim Light (Grokki Blue Glow)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    rimLight.position.set(-1.2, 1.8, -1.2);
    scene.add(rimLight);

    // Warm Fill Light
    const fillLight = new THREE.DirectionalLight(0xf472b6, 0.8);
    fillLight.position.set(-1.0, 0.8, 1.2);
    scene.add(fillLight);

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Cursor move handler for smooth procedural LookAt
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (lookAtTargetRef.current) {
        lookAtTargetRef.current.position.set(x * 0.8, 1.3 + y * 0.4, 1.2);
      }
    };
    window.addEventListener('pointermove', handlePointerMove);

    // Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // Animation Loop
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
        // 1. Procedural Natural Breathing
        const chest = currentVrm.humanoid?.getNormalizedBoneNode('chest');
        const spine = currentVrm.humanoid?.getNormalizedBoneNode('spine');
        const breath = Math.sin(elapsed * 1.8) * 0.015;
        if (chest) chest.rotation.x = breath;
        if (spine) spine.rotation.x = breath * 0.5;

        // 2. Procedural Eyelid Blinking
        blinkTimer += delta;
        if (blinkTimer > 3.2 && !isBlinking) {
          isBlinking = true;
          blinkProgress = 0;
          blinkTimer = (Math.random() - 0.5) * 1.5; // Randomize next blink
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

        // 3. Audio Lip-Sync Processing
        if (analyserRef.current && isSpeakingRef.current) {
          const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(freqData);

          // Calculate energy across frequency bands
          const lowEnergy = (freqData[2] + freqData[3] + freqData[4]) / 3 / 255;
          const midEnergy = (freqData[8] + freqData[10] + freqData[12]) / 3 / 255;
          const highEnergy = (freqData[20] + freqData[24] + freqData[28]) / 3 / 255;

          // Drive visemes with smooth decay
          const aaVal = Math.min(1.0, lowEnergy * 1.6);
          const ohVal = Math.min(1.0, midEnergy * 1.4);
          const eeVal = Math.min(1.0, highEnergy * 1.3);

          currentVrm.expressionManager?.setValue('aa', aaVal);
          currentVrm.expressionManager?.setValue('oh', ohVal);
          currentVrm.expressionManager?.setValue('ee', eeVal);
        } else {
          // Decay mouth to rest position
          currentVrm.expressionManager?.setValue('aa', 0.0);
          currentVrm.expressionManager?.setValue('oh', 0.0);
          currentVrm.expressionManager?.setValue('ee', 0.0);
          currentVrm.expressionManager?.setValue('ih', 0.0);
          currentVrm.expressionManager?.setValue('ou', 0.0);
        }

        // Update VRM (Expression manager, spring bones physics, LookAt)
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
    };
  }, []);

  // 2. Load VRM Model (Default or Custom File)
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

        // Clean up unnecessary meshes and joints
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        // Rotate VRM0 models to face the camera properly
        VRMUtils.rotateVRM0(vrm);

        // Bind lookAt target
        if (lookAtTargetRef.current) {
          vrm.lookAt.target = lookAtTargetRef.current;
        }

        vrmRef.current = vrm;
        if (sceneRef.current) {
          sceneRef.current.add(vrm.scene);
        }

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('[AnimeCompanion] VRM load error:', err);
        setLoadError('Could not load VRM avatar. Please select a valid .vrm file.');
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    loadVRM(modelUrl);
  }, [modelUrl, loadVRM]);

  // 3. Set Avatar Facial Expression
  const applyEmotion = useCallback((emotion: Emotion) => {
    const vrm = vrmRef.current;
    if (!vrm || !vrm.expressionManager) return;

    setCurrentEmotion(emotion);
    const presets: Emotion[] = ['happy', 'angry', 'surprised', 'relaxed'];
    presets.forEach((p) => vrm.expressionManager?.setValue(p, 0.0));

    if (emotion !== 'neutral') {
      vrm.expressionManager.setValue(emotion, 1.0);
    }
  }, []);

  // 4. Lip-Sync & Voice Audio Playback
  const speakText = useCallback(async (text: string) => {
    setLastSpeech(text);
    setShowSpeechBubble(true);
    if (!voiceEnabled) return;

    try {
      if (window.jarvisAPI?.ttsSpeak) {
        isSpeakingRef.current = true;
        // Connect Web Audio API Analyser to capture speaker waveform
        if (!audioContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioContextRef.current = new AudioContextClass();
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;
          }
        }

        const res = await window.jarvisAPI.ttsSpeak({
          text,
          voice: config.ttsVoice || 'expr-voice-2-f',
          provider: (config.ttsProvider as any) || 'grokki_voice',
        });

        if (res && res.success && res.base64Audio) {
          const audio = new Audio(`data:audio/mp3;base64,${res.base64Audio}`);
          if (audioContextRef.current && analyserRef.current) {
            if (audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
            }
            const source = audioContextRef.current.createMediaElementSource(audio);
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
          }

          audio.onended = () => {
            isSpeakingRef.current = false;
          };
          audio.onerror = () => {
            isSpeakingRef.current = false;
          };
          await audio.play();
        } else {
          // Fallback simulation of mouth movement if native audio playback fails
          let ticks = 0;
          const interval = setInterval(() => {
            ticks++;
            const vrm = vrmRef.current;
            if (vrm) {
              const mouth = Math.sin(ticks * 0.8) > 0.2 ? 0.6 : 0.0;
              vrm.expressionManager?.setValue('aa', mouth);
            }
            if (ticks > 25) {
              clearInterval(interval);
              vrmRef.current?.expressionManager?.setValue('aa', 0.0);
              isSpeakingRef.current = false;
            }
          }, 100);
        }
      }
    } catch (err) {
      console.warn('[AnimeCompanion] Voice playback failed:', err);
      isSpeakingRef.current = false;
    }
  }, [config.ttsVoice, config.ttsProvider, voiceEnabled]);

  // 5. Send Prompt & Conversational Interaction
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isThinking) return;

    const userPrompt = inputMessage.trim();
    setInputMessage('');
    setIsThinking(true);

    try {
      let replyText = '';
      if (window.jarvisAPI?.streamChat) {
        const stream = window.jarvisAPI.streamChat({
          prompt: `You are Ani, an adorable, witty anime 3D companion living inside Grokki Studio. Keep answers punchy, expressive, and fun in 1-3 sentences. User says: "${userPrompt}"`,
          config,
        });

        // Collect reply
        for await (const chunk of stream) {
          if (chunk?.content) replyText += chunk.content;
        }
      }

      if (!replyText) {
        replyText = `Hehe, I heard you say "${userPrompt}"! Let's explore together! ✨`;
      }

      // Sentiment analysis for emotion triggers
      const lower = replyText.toLowerCase();
      if (lower.includes('happy') || lower.includes('great') || lower.includes('love') || lower.includes('yay') || lower.includes('awesome')) {
        applyEmotion('happy');
      } else if (lower.includes('what') || lower.includes('really') || lower.includes('wow') || lower.includes('amazing')) {
        applyEmotion('surprised');
      } else if (lower.includes('no') || lower.includes('bad') || lower.includes('stop') || lower.includes('grr')) {
        applyEmotion('angry');
      } else {
        applyEmotion('relaxed');
      }

      await speakText(replyText);
    } catch (err: any) {
      const fallback = "Oopsie! I had a little hiccup connecting to the AI brain, but I'm still here!";
      applyEmotion('surprised');
      await speakText(fallback);
    } finally {
      setIsThinking(false);
    }
  };

  // 6. Custom VRM Avatar File Drop / Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setModelUrl(objectUrl);
      setCompanionName(file.name.replace(/\.vrm$/i, ''));
    }
  };

  // Reset Camera View
  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0.0, 1.38, 1.45);
      controlsRef.current.target.set(0.0, 1.28, 0.0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col bg-[#07080b] overflow-hidden select-none">
      {/* Dynamic Background Shader Threads */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
        <Threads
          color="#3b82f6"
          accentColor="#ec4899"
          amplitude={1.2}
          distance={0.3}
          enableMouseInteraction={false}
        />
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        className="relative flex-1 w-full h-full z-10 cursor-grab active:cursor-grabbing"
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md gap-3">
          <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-sm font-semibold text-white tracking-wide">
            Summoning 3D Avatar...
          </p>
        </div>
      )}

      {/* Error Toast */}
      {loadError && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2 backdrop-blur-md shadow-lg">
          <span>{loadError}</span>
        </div>
      )}

      {/* Top Floating Glass Header HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Avatar Status Pill */}
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white tracking-tight">
            {companionName}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono">
            60 FPS Live
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Custom VRM Upload */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-md">
            <Upload className="w-3.5 h-3.5" />
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
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all cursor-pointer shadow-md"
            title="Reset Camera View"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Voice Toggle */}
          <button
            type="button"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer shadow-md ${
              voiceEnabled
                ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                : 'bg-white/10 border-white/10 text-gray-400'
            }`}
            title={voiceEnabled ? 'Mute Companion' : 'Enable Speech'}
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Floating Speech Bubble */}
      <AnimatePresence>
        {showSpeechBubble && lastSpeech && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-20 max-w-md w-[90%] px-5 py-3.5 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/15 text-white shadow-2xl pointer-events-auto"
          >
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium leading-relaxed tracking-wide text-gray-100 m-0">
                {lastSpeech}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Interaction HUD */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[92%] flex flex-col gap-2.5 pointer-events-auto">
        {/* Quick Emotion Reaction Bar */}
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1 px-3 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 w-fit mx-auto shadow-lg">
          <button
            type="button"
            onClick={() => applyEmotion('happy')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 border-none ${
              currentEmotion === 'happy' ? 'bg-amber-400/20 text-amber-300' : 'text-gray-300 hover:text-white'
            }`}
          >
            <span>😊 Happy</span>
          </button>
          <button
            type="button"
            onClick={() => applyEmotion('surprised')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 border-none ${
              currentEmotion === 'surprised' ? 'bg-sky-400/20 text-sky-300' : 'text-gray-300 hover:text-white'
            }`}
          >
            <span>😮 Wow</span>
          </button>
          <button
            type="button"
            onClick={() => applyEmotion('angry')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 border-none ${
              currentEmotion === 'angry' ? 'bg-rose-400/20 text-rose-300' : 'text-gray-300 hover:text-white'
            }`}
          >
            <span>😤 Pout</span>
          </button>
          <button
            type="button"
            onClick={() => applyEmotion('relaxed')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 border-none ${
              currentEmotion === 'relaxed' ? 'bg-emerald-400/20 text-emerald-300' : 'text-gray-300 hover:text-white'
            }`}
          >
            <span>✨ Relaxed</span>
          </button>
          <button
            type="button"
            onClick={() => applyEmotion('neutral')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${
              currentEmotion === 'neutral' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Reset</span>
          </button>
        </div>

        {/* Chat Prompt Floating Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center w-full rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/20 focus-within:border-sky-400/80 shadow-2xl p-1.5 transition-all"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Talk to ${companionName}... (e.g. "Tell me a joke", "How are you?")`}
            disabled={isThinking}
            className="flex-1 bg-transparent border-none outline-none px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-400 font-sans"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isThinking}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white border-none cursor-pointer disabled:opacity-40 transition-all shrink-0 shadow-md"
          >
            {isThinking ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AnimeCompanionTab;
