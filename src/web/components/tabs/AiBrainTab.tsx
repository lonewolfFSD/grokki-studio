import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, RefreshCw, Edit3 } from 'lucide-react';
import { JarvisConfig } from '../../types/jarvis';
import GlideSelect, { GlideSelectOption } from './GlideSelect';

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

const CURATED_MODELS: Record<string, { value: string; label: string; tag?: string }[]> = {
  gemini: [
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash', tag: 'Primary Fast' },
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro', tag: 'Deep Reasoning' },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash', tag: 'Multimodal' },
    { value: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite', tag: 'Ultra-Fast' },
    { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro', tag: '2M Context' },
    { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash', tag: 'Standard' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile', tag: 'Recommended' },
    { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant', tag: '500+ T/s' },
    { value: 'deepseek-r1-distill-llama-70b', label: 'deepseek-r1-distill-llama-70b', tag: 'Reasoning' },
    { value: 'mixtral-8x7b-32768', label: 'mixtral-8x7b-32768', tag: '32k MoE' },
    { value: 'gemma2-9b-it', label: 'gemma2-9b-it', tag: 'Google' },
    { value: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b', tag: 'Groq OSS' },
  ],
  ollama: [
    { value: 'llama3.2', label: 'llama3.2', tag: 'Fast 3B' },
    { value: 'llama3.3', label: 'llama3.3', tag: 'Flagship 70B' },
    { value: 'llama3.1', label: 'llama3.1', tag: 'Balanced 8B' },
    { value: 'deepseek-r1', label: 'deepseek-r1', tag: 'Reasoning' },
    { value: 'qwen2.5-coder', label: 'qwen2.5-coder', tag: 'Coding' },
    { value: 'mistral', label: 'mistral', tag: 'Mistral 7B' },
    { value: 'phi4', label: 'phi4', tag: 'Microsoft 14B' },
    { value: 'gemma2', label: 'gemma2', tag: 'Google 9B' },
  ],
  openrouter: [
    { value: 'anthropic/claude-3.7-sonnet', label: 'anthropic/claude-3.7-sonnet', tag: 'Hybrid Thinking' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'anthropic/claude-3.5-sonnet', tag: 'Coding Champ' },
    { value: 'openai/gpt-4o', label: 'openai/gpt-4o', tag: 'Omni Flagship' },
    { value: 'openai/gpt-4o-mini', label: 'openai/gpt-4o-mini', tag: 'Affordable' },
    { value: 'deepseek/deepseek-r1', label: 'deepseek/deepseek-r1', tag: 'Open Reasoning' },
    { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'meta-llama/llama-3.3-70b-instruct:free', tag: 'Free Tier' },
    { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash', tag: 'Low Latency' },
  ],
};

export const AiBrainTab: React.FC<AiBrainTabProps> = ({ config, onChangeConfig }) => {
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: { success: boolean; message: string } }>({});

  const [fetchingModels, setFetchingModels] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<{ [provider: string]: string[] }>({});
  const [customInputMode, setCustomInputMode] = useState<{ [provider: string]: boolean }>({});

  const isDark =
    config.dashboardTheme === 'dark' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

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

  const handleFetchModels = async (provider: string) => {
    if (!window.jarvisAPI?.fetchProviderModels) return;
    setFetchingModels(provider);
    try {
      let key: string | undefined;
      let endpoint: string | undefined;
      if (provider === 'gemini') key = config.geminiApiKey;
      if (provider === 'groq') key = config.groqApiKey;
      if (provider === 'ollama') endpoint = config.ollamaEndpoint;
      if (provider === 'openrouter') key = config.openrouterApiKey;

      const res = await window.jarvisAPI.fetchProviderModels({ provider, key, endpoint });
      if (res && res.success && res.models && res.models.length > 0) {
        setFetchedModels((prev) => ({ ...prev, [provider]: res.models || [] }));
      } else if (res && !res.success && res.error) {
        setTestResult((prev) => ({
          ...prev,
          [provider]: { success: false, message: `Model fetch error: ${res.error}` },
        }));
      }
    } catch (err: any) {
      console.warn('Failed to fetch provider models:', err);
    } finally {
      setFetchingModels(null);
    }
  };

  const getOptionsForProvider = (providerId: string, currentVal?: string): GlideSelectOption[] => {
    const curated = CURATED_MODELS[providerId] || [];
    const fetched = fetchedModels[providerId] || [];
    const map = new Map<string, GlideSelectOption>();

    curated.forEach((c) => map.set(c.value, { value: c.value, label: c.label, tag: c.tag }));

    fetched.forEach((f) => {
      if (!map.has(f)) {
        map.set(f, { value: f, label: f, tag: 'Source' });
      }
    });

    if (currentVal && !map.has(currentVal)) {
      map.set(currentVal, { value: currentVal, label: currentVal, tag: 'Active' });
    }

    return Array.from(map.values());
  };

  const providers = [
    {
      id: 'gemini',
      label: 'Google Gemini',
      badge: config.geminiModel || 'gemini-2.5-flash',
      Logo: GeminiLogo,
    },
    {
      id: 'groq',
      label: 'Groq Cloud',
      badge: config.groqModel || 'llama-3.3-70b-versatile',
      Logo: GroqLogo,
    },
    {
      id: 'ollama',
      label: 'Ollama Local',
      badge: config.ollamaModel || 'llama3.2',
      Logo: OllamaLogo,
    },
    {
      id: 'openrouter',
      label: 'OpenRouter',
      badge: config.openrouterModel ? config.openrouterModel.split('/')[1] || config.openrouterModel : 'Multi-Model',
      Logo: OpenRouterLogo,
    },
  ];

  const renderModelDropdown = (
    providerId: string,
    currentValue: string,
    onSelect: (val: string) => void,
    defaultPlaceholder: string
  ) => {
    const options = getOptionsForProvider(providerId, currentValue);
    const isCustom = customInputMode[providerId];
    const isFetching = fetchingModels === providerId;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <span>Model Identifier</span>
            {options.length > (CURATED_MODELS[providerId]?.length || 0) && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                ({options.length} models synced)
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Fetch available models live from provider API"
              onClick={() => handleFetchModels(providerId)}
              disabled={isFetching}
              className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{isFetching ? 'Fetching...' : 'Fetch from source'}</span>
            </button>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <button
              type="button"
              title={isCustom ? 'Switch back to dropdown list' : 'Type a custom model string'}
              onClick={() =>
                setCustomInputMode((prev) => ({ ...prev, [providerId]: !prev[providerId] }))
              }
              className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isCustom ? 'Select list' : 'Custom'}</span>
            </button>
          </div>
        </div>

        {isCustom ? (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => onSelect(e.target.value)}
            placeholder={defaultPlaceholder}
            className="w-full h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none font-mono"
          />
        ) : (
          <div className="w-full">
            <GlideSelect
              options={options}
              value={currentValue}
              onChange={(val) => onSelect(val)}
              placeholder="Select a model..."
              size="md"
              radius={8}
              menuWidth={380}
              surfaceColor={isDark ? '#1a1c24' : '#ffffff'}
              highlightColor={isDark ? '#272a38' : '#f1f3f9'}
              textColor={isDark ? '#f3f4f6' : '#111827'}
              accentColor={isDark ? '#ffffff' : '#000000'}
              className="w-full [&>button]:w-full [&>button]:justify-between [&>button]:border [&>button]:border-gray-200 [&>button]:dark:border-[#1e2029] [&>button]:px-3 [&>button]:h-9 [&>button]:rounded-lg [&>button]:shadow-xs font-mono text-xs"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          AI Brain & Providers
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Configure primary intelligence engines, model identifiers, and credentials.
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
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                {p.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Provider Details Configuration Card */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-5">
        {/* Google Gemini Card */}
        {config.provider === 'gemini' && (
          <div className="flex flex-col gap-4">
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

            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="flex flex-col gap-1.5">
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

              {renderModelDropdown(
                'gemini',
                config.geminiModel || 'gemini-2.5-flash',
                (val) => onChangeConfig({ geminiModel: val }),
                'gemini-2.5-flash'
              )}
            </div>

            <button
              type="button"
              disabled={testing === 'gemini'}
              onClick={() => handleTestKey('gemini', config.geminiApiKey, config.geminiModel)}
              className="self-start px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-[#1a1c24] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#1e2029] hover:bg-gray-200 dark:hover:bg-[#252836] cursor-pointer transition-all flex items-center gap-1.5"
            >
              {testing === 'gemini' && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Test Gemini Key</span>
            </button>

            {testResult.gemini && (
              <div className="p-2.5 rounded-lg text-xs flex items-center gap-2 bg-gray-50 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-[#1e2029]">
                {testResult.gemini.success ? (
                  <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-500" />
                )}
                <span>{testResult.gemini.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Groq Cloud Card */}
        {config.provider === 'groq' && (
          <div className="flex flex-col gap-4">
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

              {renderModelDropdown(
                'groq',
                config.groqModel || 'llama-3.3-70b-versatile',
                (val) => onChangeConfig({ groqModel: val }),
                'llama-3.3-70b-versatile'
              )}
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
                {testResult.groq.success ? (
                  <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-500" />
                )}
                <span>{testResult.groq.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Ollama Local Card */}
        {config.provider === 'ollama' && (
          <div className="flex flex-col gap-4">
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

              {renderModelDropdown(
                'ollama',
                config.ollamaModel || 'llama3.2',
                (val) => onChangeConfig({ ollamaModel: val }),
                'llama3.2'
              )}
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
                {testResult.ollama.success ? (
                  <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-500" />
                )}
                <span>{testResult.ollama.message}</span>
              </div>
            )}
          </div>
        )}

        {/* OpenRouter Card */}
        {config.provider === 'openrouter' && (
          <div className="flex flex-col gap-4">
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

              {renderModelDropdown(
                'openrouter',
                config.openrouterModel || 'anthropic/claude-3.7-sonnet',
                (val) => onChangeConfig({ openrouterModel: val }),
                'anthropic/claude-3.7-sonnet'
              )}
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
                {testResult.openrouter.success ? (
                  <CheckCircle2 className="w-4 h-4 text-gray-900 dark:text-white" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-500" />
                )}
                <span>{testResult.openrouter.message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
