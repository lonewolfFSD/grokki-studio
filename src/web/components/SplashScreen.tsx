import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import splashImg from '../assets/grokki_splash.jpg';

const TECHNICAL_STEPS = [
  'Calibrating multimodal neural engine...',
  'Initializing Whisper audio synthesizer...',
  'Mounting local memory architecture...',
  'Binding Windows OS automation drivers...',
  'Indexing study workspace & environment...',
  'Synchronizing local AI models...',
  'Launching Grokki Studio...',
];

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Cycle through technical words ending with "Launching Grokki Studio..."
    const interval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < TECHNICAL_STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 320);

    // When all steps are done, pause briefly on "Launching Grokki Studio..." then fade out
    const totalTime = (TECHNICAL_STEPS.length - 1) * 320 + 450;
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        onFinish();
      }, 500);
    }, totalTime);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
    };
  }, [onFinish]);

  return (
    <div
      onClick={() => {
        setIsFadingOut(true);
        setTimeout(onFinish, 200);
      }}
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden select-none transition-opacity duration-500 ease-out cursor-default ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Aspect-locked container matching the 1024x682 splash image */}
      <div className="relative aspect-[1024/682] w-full max-h-full max-w-[1024px] flex items-center justify-center shadow-2xl">
        <img
          src={splashImg}
          alt="Grokki Splash"
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Dynamic Technical Words & Small Loading Circle below the description text */}
        <div
          className="absolute flex items-center gap-2.5"
          style={{
            left: '11.3%',
            top: '84.8%',
          }}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white/90 flex-shrink-0" />
          <span className="text-xs font-mono text-gray-300 font-medium tracking-wide animate-in fade-in duration-150">
            {TECHNICAL_STEPS[stepIndex]}
          </span>
        </div>
      </div>
    </div>
  );
};
