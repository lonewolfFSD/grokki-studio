import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';

import geminiLogo from '../../assets/logos/gemini.png';
import groqLogo from '../../assets/logos/groq.png';
import ollamaLogo from '../../assets/logos/ollama.png';
import openrouterLogo from '../../assets/logos/openrouter.png';

// Official Authentic Google Gemini Brand Logo
export const GeminiLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <img src={geminiLogo} alt="Google Gemini" className={`${className} object-contain`} />
);

// Official Authentic Groq Cloud Brand Logo
export const GroqLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <img src={groqLogo} alt="Groq Cloud" className={`${className} object-contain`} />
);

// Official Authentic Ollama Brand Logo
export const OllamaLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <img src={ollamaLogo} alt="Ollama Local" className={`${className} object-contain`} />
);

// Official Authentic OpenRouter Brand Logo
export const OpenRouterLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <img src={openrouterLogo} alt="OpenRouter" className={`${className} object-contain`} />
);

interface AiBrainTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
}

export const AiBrainTab: React.FC<AiBrainTabProps> = ({ config, onChangeConfig }) => {
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: { success: boolean; message: string } }>({});

  const handleTestKey = async (provider: string, key?: string, model?: string, endpoint?: string) => {
    if (!window.jarvisAPI?.testAiKey) return;
    setTesting(provider);
    setTestResult((prev) => ({ ...prev, [provider]: undefined as any }));

    try {
      const res = await window.jarvisAPI.testAiKey({ provider, key, model, endpoint });
      if (res && res.success) {
        setTestResult((prev) => ({
          ...prev,
          [provider]: {
            success: true,
            message: `Verified in ${res.latencyMs}ms (${res.reply || 'Ready'})`,
          },
        }));
      } else {
        setTestResult((prev) => ({
          ...prev,
          [provider]: {
            success: false,
            message: res?.error || 'Invalid API Key or Provider offline',
          },
        }));
      }
    } catch (err: any) {
      setTestResult((prev) => ({
        ...prev,
        [provider]: {
          success: false,
          message: err.message || 'Connection failed',
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const providers = [
    { id: 'gemini', label: 'Gemini 3.5 Flash', badge: 'Primary Multimodal', Logo: GeminiLogo },
    { id: 'groq', label: 'Groq Cloud', badge: 'Ultra-Fast Llama 3.3', Logo: GroqLogo },
    { id: 'ollama', label: 'Ollama Local', badge: 'Offline Air-Gap', Logo: OllamaLogo },
    { id: 'openrouter', label: 'OpenRouter', badge: 'Multi-Model Pool', Logo: OpenRouterLogo },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          AI Brain & Providers
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Configure primary intelligence engines and credentials.
        </p>
      </div>

      {/* Provider Selector Cards */}
      <div className="grid grid-cols-4 gap-3 w-full">
        {providers.map((p) => {
          const isSelected = config.provider === p.id;
          const Logo = p.Logo;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChangeConfig({ provider: p.id as any })}
              className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border flex flex-col gap-2 shadow-xs ${
                isSelected
                  ? 'border-gray-900 dark:border-white bg-white dark:bg-[#13141a] ring-1 ring-gray-900/10 dark:ring-white/20'
                  : 'border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 shadow-xs">
                    <Logo className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                    {p.label}
                  </span>
                </div>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isSelected ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                />
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                {p.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Provider Details Configuration Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-5">
        {config.provider === 'gemini' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 shadow-xs">
                <GeminiLogo className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                  Google Gemini Configuration
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0">
                  Multimodal vision, function calling & live search grounding
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Gemini API Key
              </label>
              <div className="relative">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={config.geminiApiKey || ''}
                  onChange={(e) => onChangeConfig({ geminiApiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full h-9 px-3 pr-10 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer"
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={testing === 'gemini'}
              onClick={() => handleTestKey('gemini', config.geminiApiKey)}
              className="self-start px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-[#1a1c24] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#1e2029] hover:bg-gray-200 dark:hover:bg-[#252836] cursor-pointer transition-all flex items-center gap-1.5"
            >
              {testing === 'gemini' && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Test Gemini Key</span>
            </button>

            {testResult.gemini && (
              <div className="p-2.5 rounded-lg text-xs flex items-center gap-2 bg-gray-50 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-[#1e2029]">
                {testResult.gemini.success ? <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" /> : <XCircle className="w-4 h-4 text-gray-500" />}
                <span>{testResult.gemini.message}</span>
              </div>
            )}
          </div>
        )}

        {config.provider === 'groq' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 shadow-xs">
                <GroqLogo className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                  Groq Cloud Configuration
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0">
                  Ultra low-latency LPU inference with Llama 3.3 and Whisper audio
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  Groq API Key
                </label>
                <div className="relative">
                  <input
                    type={showGroqKey ? 'text' : 'password'}
                    value={config.groqApiKey || ''}
                    onChange={(e) => onChangeConfig({ groqApiKey: e.target.value })}
                    placeholder="gsk_..."
                    className="w-full h-9 px-3 pr-10 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer"
                  >
                    {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  Model Identifier
                </label>
                <input
                  type="text"
                  value={config.groqModel || 'openai/gpt-oss-120b'}
                  onChange={(e) => onChangeConfig({ groqModel: e.target.value })}
                  className="h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={testing === 'groq'}
              onClick={() => handleTestKey('groq', config.groqApiKey, config.groqModel)}
              className="self-start px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-[#1a1c24] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#1e2029] hover:bg-gray-200 dark:hover:bg-[#252836] cursor-pointer transition-all flex items-center gap-1.5"
            >
              {testing === 'groq' && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Test Groq Connection</span>
            </button>

            {testResult.groq && (
              <div className="p-2.5 rounded-lg text-xs flex items-center gap-2 bg-gray-50 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-[#1e2029]">
                {testResult.groq.success ? <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" /> : <XCircle className="w-4 h-4 text-gray-500" />}
                <span>{testResult.groq.message}</span>
              </div>
            )}
          </div>
        )}

        {config.provider === 'ollama' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 shadow-xs">
                <OllamaLogo className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                  Ollama Air-Gap (Local Daemon)
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0">
                  100% offline, private open-source models running directly on your CPU/GPU
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  Endpoint URL
                </label>
                <input
                  type="text"
                  value={config.ollamaEndpoint || 'http://127.0.0.1:11434'}
                  onChange={(e) => onChangeConfig({ ollamaEndpoint: e.target.value })}
                  className="h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  Model Name
                </label>
                <input
                  type="text"
                  value={config.ollamaModel || 'llama3.2'}
                  onChange={(e) => onChangeConfig({ ollamaModel: e.target.value })}
                  className="h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={testing === 'ollama'}
              onClick={() => handleTestKey('ollama', undefined, config.ollamaModel, config.ollamaEndpoint)}
              className="self-start px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-[#1a1c24] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#1e2029] hover:bg-gray-200 dark:hover:bg-[#252836] cursor-pointer transition-all flex items-center gap-1.5"
            >
              {testing === 'ollama' && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Test Local Ollama</span>
            </button>

            {testResult.ollama && (
              <div className="p-2.5 rounded-lg text-xs flex items-center gap-2 bg-gray-50 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-[#1e2029]">
                {testResult.ollama.success ? <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" /> : <XCircle className="w-4 h-4 text-gray-500" />}
                <span>{testResult.ollama.message}</span>
              </div>
            )}
          </div>
        )}

        {config.provider === 'openrouter' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 shadow-xs">
                <OpenRouterLogo className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                  OpenRouter Configuration
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0">
                  Universal gateway to hundreds of open-source and proprietary models
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  OpenRouter API Key
                </label>
                <div className="relative">
                  <input
                    type={showOpenRouterKey ? 'text' : 'password'}
                    value={config.openrouterApiKey || ''}
                    onChange={(e) => onChangeConfig({ openrouterApiKey: e.target.value })}
                    placeholder="sk-or-..."
                    className="w-full h-9 px-3 pr-10 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer"
                  >
                    {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  Model ID
                </label>
                <input
                  type="text"
                  value={config.openrouterModel || 'meta-llama/llama-3.3-70b-instruct:free'}
                  onChange={(e) => onChangeConfig({ openrouterModel: e.target.value })}
                  className="h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={testing === 'openrouter'}
              onClick={() => handleTestKey('openrouter', config.openrouterApiKey, config.openrouterModel)}
              className="self-start px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-[#1a1c24] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#1e2029] hover:bg-gray-200 dark:hover:bg-[#252836] cursor-pointer transition-all flex items-center gap-1.5"
            >
              {testing === 'openrouter' && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Test OpenRouter Key</span>
            </button>

            {testResult.openrouter && (
              <div className="p-2.5 rounded-lg text-xs flex items-center gap-2 bg-gray-50 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-[#1e2029]">
                {testResult.openrouter.success ? <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" /> : <XCircle className="w-4 h-4 text-gray-500" />}
                <span>{testResult.openrouter.message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
