import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit3,
  ExternalLink,
} from 'lucide-react';
import { JarvisConfig, AiProvider } from '../../types/jarvis';
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

// Official Grok (xAI) Minimalist Logo
export const GrokLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Official ChatGPT / OpenAI Rosette Logo
export const OpenAILogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.6669zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
);

// Official DeepSeek Logo
export const DeepSeekLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <path
      d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z"
      fill="#4D6BFE"
    />
  </svg>
);

// Official Qwen Logo (each instance gets its own gradient id so several can render at once)
let qwenGradientCount = 0;
export const QwenLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => {
  const gradientId = React.useMemo(() => `qwen-gradient-${++qwenGradientCount}`, []);
  return (
    <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#6336E7" stopOpacity=".84" />
          <stop offset="100%" stopColor="#6F69F7" stopOpacity=".84" />
        </linearGradient>
      </defs>
      <path
        d="M12.604 1.34c.393.69.784 1.382 1.174 2.075a.18.18 0 00.157.091h5.552c.174 0 .322.11.446.327l1.454 2.57c.19.337.24.478.024.837-.26.43-.513.864-.76 1.3l-.367.658c-.106.196-.223.28-.04.512l2.652 4.637c.172.301.111.494-.043.77-.437.785-.882 1.564-1.335 2.34-.159.272-.352.375-.68.37-.777-.016-1.552-.01-2.327.016a.099.099 0 00-.081.05 575.097 575.097 0 01-2.705 4.74c-.169.293-.38.363-.725.364-.997.003-2.002.004-3.017.002a.537.537 0 01-.465-.271l-1.335-2.323a.09.09 0 00-.083-.049H4.982c-.285.03-.553-.001-.805-.092l-1.603-2.77a.543.543 0 01-.002-.54l1.207-2.12a.198.198 0 000-.197 550.951 550.951 0 01-1.875-3.272l-.79-1.395c-.16-.31-.173-.496.095-.965.465-.813.927-1.625 1.387-2.436.132-.234.304-.334.584-.335a338.3 338.3 0 012.589-.001.124.124 0 00.107-.063l2.806-4.895a.488.488 0 01.422-.246c.524-.001 1.053 0 1.583-.006L11.704 1c.341-.003.724.032.9.34zm-3.432.403a.06.06 0 00-.052.03L6.254 6.788a.157.157 0 01-.135.078H3.253c-.056 0-.07.025-.041.074l5.81 10.156c.025.042.013.062-.034.063l-2.795.015a.218.218 0 00-.2.116l-1.32 2.31c-.044.078-.021.118.068.118l5.716.008c.046 0 .08.02.104.061l1.403 2.454c.046.081.092.082.139 0l5.006-8.76.783-1.382a.055.055 0 01.096 0l1.424 2.53a.122.122 0 00.107.062l2.763-.02a.04.04 0 00.035-.02.041.041 0 000-.04l-2.9-5.086a.108.108 0 010-.113l.293-.507 1.12-1.977c.024-.041.012-.062-.035-.062H9.2c-.059 0-.073-.026-.043-.077l1.434-2.505a.107.107 0 000-.114L9.225 1.774a.06.06 0 00-.053-.031zm6.29 8.02c.046 0 .058.02.034.06l-.832 1.465-2.613 4.585a.056.056 0 01-.05.029.058.058 0 01-.05-.029L8.498 9.841c-.02-.034-.01-.052.028-.054l.216-.012 6.722-.012z"
        fill={`url(#${gradientId})`}
        fillRule="nonzero"
      />
    </svg>
  );
};

// OmniRouter Unified Router Nexus Logo
export const OmniRouterLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <rect width="24" height="24" rx="6" fill="#10B981" />
    <path
      d="M13 3L4 14H12L11 21L20 10H12L13 3Z"
      fill="white"
      stroke="white"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
  </svg>
);

interface AiBrainTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
}

export const CURATED_MODELS: Record<string, { value: string; label: string; tag?: string }[]> = {
  gemini: [
    { value: 'gemini-3.5-flash', label: 'gemini-3.5-flash', tag: 'Fast & Free' },
    { value: 'gemini-3.8-flash', label: 'gemini-3.8-flash', tag: 'Next-Gen Fast' },
    { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite', tag: 'Ultra-Fast' },
    { value: 'gemini-3.1-pro-preview', label: 'gemini-3.1-pro-preview', tag: 'Deep Reasoning' },
    { value: 'gemini-flash-latest', label: 'gemini-flash-latest', tag: 'Latest Auto' },
    { value: 'gemini-pro-latest', label: 'gemini-pro-latest', tag: 'Latest Pro' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash', tag: 'Legacy' },
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
    { value: 'openrouter/auto', label: 'openrouter/auto', tag: 'Auto-Routing' },
    { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'meta-llama/llama-3.3-70b-instruct:free', tag: 'Free 70B' },
    { value: 'deepseek/deepseek-r1:free', label: 'deepseek/deepseek-r1:free', tag: 'Free Reasoning' },
    { value: 'google/gemini-2.0-flash-lite-preview-02-05:free', label: 'google/gemini-2.0-flash-lite-preview-02-05:free', tag: 'Free Google' },
    { value: 'qwen/qwen-2.5-coder-32b-instruct:free', label: 'qwen/qwen-2.5-coder-32b-instruct:free', tag: 'Free Coder' },
    { value: 'mistralai/mistral-small-24b-instruct-2501:free', label: 'mistralai/mistral-small-24b-instruct-2501:free', tag: 'Free Mistral' },
    { value: 'anthropic/claude-3.7-sonnet', label: 'anthropic/claude-3.7-sonnet', tag: 'Hybrid Thinking' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'anthropic/claude-3.5-sonnet', tag: 'Coding Champ' },
    { value: 'openai/gpt-4o', label: 'openai/gpt-4o', tag: 'Omni Flagship' },
    { value: 'deepseek/deepseek-r1', label: 'deepseek/deepseek-r1', tag: 'Full Reasoning' },
  ],
  omnirouter: [
    { value: 'omnirouter/auto', label: 'omnirouter/auto', tag: 'Smart Route' },
    { value: 'deepseek/deepseek-r1', label: 'deepseek/deepseek-r1', tag: 'Uncensored CoT' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'meta-llama/llama-3.3-70b-instruct', tag: 'Meta 70B' },
    { value: 'mistralai/mistral-large-2411', label: 'mistralai/mistral-large-2411', tag: 'Mistral 128k' },
    { value: 'qwen/qwen-2.5-72b-instruct', label: 'qwen/qwen-2.5-72b-instruct', tag: 'Qwen Open 72B' },
    { value: 'google/gemini-2.0-flash-exp:free', label: 'google/gemini-2.0-flash-exp:free', tag: 'Free Flash' },
  ],
  grok: [
    { value: 'grok-2-1212', label: 'grok-2-1212', tag: 'Flagship Grok 2' },
    { value: 'grok-2-vision-1212', label: 'grok-2-vision-1212', tag: 'Vision & Multimodal' },
    { value: 'grok-beta', label: 'grok-beta', tag: 'Fast Grok Beta' },
    { value: 'grok-vision-beta', label: 'grok-vision-beta', tag: 'Vision Beta' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'gpt-4o', tag: 'Flagship Omni' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini', tag: 'Fast & Affordable' },
    { value: 'o1', label: 'o1', tag: 'Deep Reasoning' },
    { value: 'o3-mini', label: 'o3-mini', tag: 'Fast STEM CoT' },
    { value: 'gpt-4.5-preview', label: 'gpt-4.5-preview', tag: 'Next-Gen Research' },
    { value: 'gpt-4-turbo', label: 'gpt-4-turbo', tag: '128k Turbo' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'deepseek-chat', tag: 'DeepSeek-V3 Official' },
    { value: 'deepseek-reasoner', label: 'deepseek-reasoner', tag: 'DeepSeek-R1 CoT' },
  ],
  qwen: [
    { value: 'qwen-max', label: 'qwen-max', tag: 'Flagship Qwen 2.5' },
    { value: 'qwen-plus', label: 'qwen-plus', tag: 'Balanced Power' },
    { value: 'qwen-turbo', label: 'qwen-turbo', tag: 'Ultra Fast' },
    { value: 'qwen2.5-coder-32b-instruct', label: 'qwen2.5-coder-32b-instruct', tag: 'Coding Master' },
    { value: 'qwen2.5-72b-instruct', label: 'qwen2.5-72b-instruct', tag: 'Open Weight 72B' },
    { value: 'qwq-32b-preview', label: 'qwq-32b-preview', tag: 'Reasoning Preview' },
  ],
};

type Category = 'paid' | 'free';

interface ProviderCardInfo {
  id: AiProvider;
  label: string;
  subLabel: string;
  badge: string;
  tag: string;
  Logo: React.FC<{ className?: string }>;
}

interface ProviderDetail {
  title: string;
  description: string;
  // Gemini appears in both categories with different wording.
  variants?: Record<Category, { title: string; description: string }>;
  keyField?: string;
  keyLabel?: string;
  keyPlaceholder?: string;
  keyLink?: { label: string; url: string };
  endpointField?: string;
  endpointLabel?: string;
  endpointPlaceholder?: string;
  endpointDefault?: string;
  endpointHint?: string;
  modelField: string;
  defaultModel: string;
  links: { label: string; url: string }[];
}

// Everything the configuration card needs for each provider.
const PROVIDER_DETAILS: Record<string, ProviderDetail> = {
  grok: {
    title: 'xAI Grok',
    description: 'Grok 2 and Grok 2 Vision with real-time intelligence.',
    keyField: 'grokApiKey',
    keyLabel: 'API key',
    keyPlaceholder: 'xai-...',
    keyLink: { label: 'Get key', url: 'https://console.x.ai/' },
    modelField: 'grokModel',
    defaultModel: 'grok-2-1212',
    links: [],
  },
  openai: {
    title: 'ChatGPT / OpenAI',
    description: 'GPT-4o multimodal, o1 reasoning, and o3-mini for STEM work.',
    keyField: 'openaiApiKey',
    keyLabel: 'API key',
    keyPlaceholder: 'sk-proj-...',
    keyLink: { label: 'Get key', url: 'https://platform.openai.com/api-keys' },
    modelField: 'openaiModel',
    defaultModel: 'gpt-4o',
    links: [],
  },
  gemini: {
    title: 'Google Gemini',
    description: 'Multimodal vision, function calling, and search grounding.',
    variants: {
      paid: {
        title: 'Google Gemini (pay-as-you-go)',
        description: '2M context window with Gemini 2.5 Pro reasoning and higher rate limits.',
      },
      free: {
        title: 'Google Gemini (AI Studio free tier)',
        description: 'Multimodal vision, function calling, and search grounding on the free AI Studio tier.',
      },
    },
    keyField: 'geminiApiKey',
    keyLabel: 'API key',
    keyPlaceholder: 'AIzaSy...',
    keyLink: { label: 'Google AI Studio', url: 'https://aistudio.google.com/app/apikey' },
    modelField: 'geminiModel',
    defaultModel: 'gemini-2.5-flash',
    links: [],
  },
  deepseek: {
    title: 'DeepSeek',
    description: 'Official deepseek-chat (V3) and deepseek-reasoner (R1) API.',
    keyField: 'deepseekApiKey',
    keyLabel: 'API key',
    keyPlaceholder: 'sk-...',
    keyLink: { label: 'Create key', url: 'https://platform.deepseek.com/api_keys' },
    modelField: 'deepseekModel',
    defaultModel: 'deepseek-chat',
    links: [],
  },
  qwen: {
    title: 'Qwen (Alibaba Cloud)',
    description: 'Qwen 2.5 series, Qwen Coder, and QwQ-32B reasoning through DashScope.',
    keyField: 'qwenApiKey',
    keyLabel: 'DashScope API key',
    keyPlaceholder: 'sk-...',
    keyLink: { label: 'Get key', url: 'https://bailian.console.aliyun.com/' },
    modelField: 'qwenModel',
    defaultModel: 'qwen-max',
    links: [{ label: 'Alibaba Model Studio', url: 'https://www.alibabacloud.com/product/model-studio' }],
  },
  groq: {
    title: 'Groq Cloud',
    description: 'Very low-latency inference with Llama 3.3 and DeepSeek R1 distillation.',
    keyField: 'groqApiKey',
    keyLabel: 'API key',
    keyPlaceholder: 'gsk_...',
    keyLink: { label: 'Groq Console', url: 'https://console.groq.com/keys' },
    modelField: 'groqModel',
    defaultModel: 'llama-3.3-70b-versatile',
    links: [],
  },
  ollama: {
    title: 'Ollama (local)',
    description: 'Private, offline open-source models running on your own CPU or GPU.',
    endpointField: 'ollamaEndpoint',
    endpointLabel: 'Endpoint URL',
    endpointPlaceholder: 'http://127.0.0.1:11434',
    endpointDefault: 'http://127.0.0.1:11434',
    endpointHint: 'Default: 127.0.0.1:11434',
    modelField: 'ollamaModel',
    defaultModel: 'llama3.2',
    links: [
      { label: 'Install Ollama', url: 'https://ollama.com/download' },
      { label: 'Model library', url: 'https://ollama.com/library' },
    ],
  },
  openrouter: {
    title: 'OpenRouter',
    description: 'Over 470 models with automatic failover and free community tiers.',
    keyField: 'openrouterApiKey',
    keyLabel: 'API key',
    keyPlaceholder: 'sk-or-...',
    keyLink: { label: 'Create key', url: 'https://openrouter.ai/keys' },
    modelField: 'openrouterModel',
    defaultModel: 'openrouter/auto',
    links: [{ label: 'Explore models', url: 'https://openrouter.ai/models' }],
  },
  omnirouter: {
    title: 'OmniRouter',
    description: 'A free universal router that brings together open-source models, community nodes, and proxies.',
    endpointField: 'omnirouterEndpoint',
    endpointLabel: 'Endpoint',
    endpointPlaceholder: 'https://api.omnirouter.ai/v1',
    endpointDefault: 'https://api.omnirouter.ai/v1',
    endpointHint: 'Default: api.omnirouter.ai/v1',
    keyField: 'omnirouterApiKey',
    keyLabel: 'API key (optional)',
    keyPlaceholder: 'omni-... (leave blank for default free access)',
    modelField: 'omnirouterModel',
    defaultModel: 'omnirouter/auto',
    links: [{ label: 'OmniRouter portal', url: 'https://omnirouter.ai' }],
  },
};

const SURFACE = 'bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029]';

const INPUT_CLASS =
  'w-full h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none font-mono';

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="m-0 mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
    {children}
  </h3>
);

export const AiBrainTab = React.memo<AiBrainTabProps>(({ config, onChangeConfig }) => {
  // Category toggle: 'paid' vs 'free'
  const [category, setCategory] = useState<Category>(() => {
    if (['grok', 'openai', 'deepseek', 'qwen'].includes(config.provider)) return 'paid';
    if (['groq', 'ollama', 'openrouter', 'omnirouter'].includes(config.provider)) return 'free';
    if (config.provider === 'gemini') {
      return (config.geminiModel && config.geminiModel.includes('pro')) ? 'paid' : 'free';
    }
    return 'free';
  });

  const [showKeys, setShowKeys] = useState<{ [provider: string]: boolean }>({});

  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: { success: boolean; message: string } }>({});

  const [fetchingModels, setFetchingModels] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<{ [provider: string]: string[] }>({});
  const [customInputMode, setCustomInputMode] = useState<{ [provider: string]: boolean }>({});
  const [modelFilter, setModelFilter] = useState<{ [provider: string]: string }>({});

  const isDark =
    config.dashboardTheme === 'dark' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  // Loose view of the config so provider fields can be read and written by name.
  const cfg = config as unknown as Record<string, string | undefined>;
  const setField = (field: string, value: string) =>
    onChangeConfig({ [field]: value } as unknown as Partial<JarvisConfig>);

  const handleOpenExternal = (url: string) => {
    if (window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

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

  const getOptionsForProvider = (providerId: string, currentValue?: string): GlideSelectOption[] => {
    const curated = CURATED_MODELS[providerId] || [];
    const fetched = fetchedModels[providerId] || [];
    const map = new Map<string, GlideSelectOption>();

    curated.forEach((c) => map.set(c.value, { value: c.value, label: c.label, tag: c.tag }));

    fetched.forEach((f) => {
      if (!map.has(f)) {
        let tag = 'Source';
        if (f.includes(':free') || f.includes('free')) tag = 'Free';
        map.set(f, { value: f, label: f, tag });
      }
    });

    if (currentValue && !map.has(currentValue)) {
      map.set(currentValue, { value: currentValue, label: currentValue, tag: 'Active' });
    }

    const allOptions = Array.from(map.values());
    const filter = (modelFilter[providerId] || '').trim().toLowerCase();

    if (!filter) return allOptions;

    return allOptions.filter((opt) => {
      const v = opt.value.toLowerCase();
      const l = typeof opt.label === 'string' ? opt.label.toLowerCase() : '';
      const t = opt.tag ? opt.tag.toLowerCase() : '';
      return v.includes(filter) || l.includes(filter) || t.includes(filter);
    });
  };

  // Paid Category Providers (5 models/providers)
  const paidProviders: ProviderCardInfo[] = [
    {
      id: 'grok',
      label: 'Grok (xAI)',
      subLabel: 'Elon Musk / xAI',
      badge: config.grokModel || 'grok-2-1212',
      tag: 'Paid Official',
      Logo: GrokLogo,
    },
    {
      id: 'openai',
      label: 'ChatGPT (OpenAI)',
      subLabel: 'GPT-4o & o-Series',
      badge: config.openaiModel || 'gpt-4o',
      tag: 'Paid Official',
      Logo: OpenAILogo,
    },
    {
      id: 'gemini',
      label: 'Google Gemini Pro',
      subLabel: 'Deep Reasoning 2M',
      badge: config.geminiModel || 'gemini-2.5-pro',
      tag: 'Pay-As-You-Go',
      Logo: GeminiLogo,
    },
    {
      id: 'deepseek',
      label: 'DeepSeek Official',
      subLabel: 'Direct Official API',
      badge: config.deepseekModel || 'deepseek-chat',
      tag: 'Paid API',
      Logo: DeepSeekLogo,
    },
    {
      id: 'qwen',
      label: 'Qwen (Alibaba)',
      subLabel: 'DashScope Cloud',
      badge: config.qwenModel || 'qwen-max',
      tag: 'Paid Official',
      Logo: QwenLogo,
    },
  ];

  // Free Category Providers (Current providers + OmniRouter)
  const freeProviders: ProviderCardInfo[] = [
    {
      id: 'gemini',
      label: 'Google Gemini',
      subLabel: 'AI Studio Free Tier',
      badge: config.geminiModel || 'gemini-2.5-flash',
      tag: 'Free Quota',
      Logo: GeminiLogo,
    },
    {
      id: 'groq',
      label: 'Groq Cloud',
      subLabel: 'Ultra-Fast LPU',
      badge: config.groqModel || 'llama-3.3-70b-versatile',
      tag: 'Free High-Speed',
      Logo: GroqLogo,
    },
    {
      id: 'ollama',
      label: 'Ollama Local',
      subLabel: 'Private Local Daemon',
      badge: config.ollamaModel || 'llama3.2',
      tag: '100% Free Air-Gap',
      Logo: OllamaLogo,
    },
    {
      id: 'openrouter',
      label: 'OpenRouter',
      subLabel: 'Multi-Model Free Tier',
      badge: config.openrouterModel || 'openrouter/auto',
      tag: 'Free Tier',
      Logo: OpenRouterLogo,
    },
    {
      id: 'omnirouter',
      label: 'OmniRouter',
      subLabel: 'Unified Open Router',
      badge: config.omnirouterModel || 'omnirouter/auto',
      tag: 'Unified Free',
      Logo: OmniRouterLogo,
    },
  ];

  const currentProviders = category === 'paid' ? paidProviders : freeProviders;

  const handleSelectProvider = (providerId: AiProvider) => {
    const patch: Partial<JarvisConfig> = { provider: providerId };
    if (providerId === 'gemini') {
      if (category === 'paid' && (!config.geminiModel || !config.geminiModel.includes('pro'))) {
        patch.geminiModel = 'gemini-2.5-pro';
      } else if (category === 'free' && (!config.geminiModel || config.geminiModel.includes('pro'))) {
        patch.geminiModel = 'gemini-2.5-flash';
      }
    } else if (providerId === 'grok' && !config.grokModel) {
      patch.grokModel = 'grok-2-1212';
    } else if (providerId === 'openai' && !config.openaiModel) {
      patch.openaiModel = 'gpt-4o';
    } else if (providerId === 'deepseek' && !config.deepseekModel) {
      patch.deepseekModel = 'deepseek-chat';
    } else if (providerId === 'qwen' && !config.qwenModel) {
      patch.qwenModel = 'qwen-max';
    } else if (providerId === 'omnirouter' && !config.omnirouterModel) {
      patch.omnirouterModel = 'omnirouter/auto';
    }
    onChangeConfig(patch);
  };

  const renderModelDropdown = (
    providerId: string,
    currentValue: string,
    onSelect: (val: string) => void,
    defaultPlaceholder: string
  ) => {
    const options = getOptionsForProvider(providerId, currentValue);
    const totalCount =
      (fetchedModels[providerId]?.length || 0) > 0
        ? fetchedModels[providerId].length
        : CURATED_MODELS[providerId]?.length || 0;
    const isCustom = customInputMode[providerId];

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between h-5">
          <label className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <span>Model</span>
            <span className="text-[11px] text-gray-400 font-normal">
              {totalCount} available
            </span>
          </label>
          <button
            type="button"
            title={isCustom ? 'Switch to dropdown list' : 'Type a custom model string'}
            onClick={() =>
              setCustomInputMode((prev) => ({ ...prev, [providerId]: !prev[providerId] }))
            }
            className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            <span>{isCustom ? 'Curated list' : 'Custom'}</span>
          </button>
        </div>

        {isCustom ? (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => onSelect(e.target.value)}
            placeholder={defaultPlaceholder}
            className={INPUT_CLASS}
          />
        ) : (
          <div className="w-full">
            <GlideSelect
              options={options.length > 0 ? options : [{ value: currentValue, label: currentValue, tag: 'Current' }]}
              value={currentValue}
              onChange={(val) => onSelect(val)}
              placeholder="Select a model..."
              size="md"
              radius={8}
              menuWidth={400}
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

  // Check if active config provider is present in current category
  const isActiveInCurrentCategory = currentProviders.some((p) => p.id === config.provider);
  const otherCategory: Category = category === 'paid' ? 'free' : 'paid';
  const activeInOther = (category === 'paid' ? freeProviders : paidProviders).find(
    (p) => p.id === config.provider
  );

  // Configuration card for the active provider
  const detail = PROVIDER_DETAILS[config.provider];
  const activeCard = [...currentProviders, ...paidProviders, ...freeProviders].find(
    (p) => p.id === config.provider
  );
  const ActiveLogo = activeCard?.Logo;

  const renderConfigCard = () => {
    if (!detail) return null;

    const providerId = config.provider as string;
    const copy = detail.variants ? detail.variants[category] : detail;
    const modelDefault =
      providerId === 'gemini'
        ? category === 'paid'
          ? 'gemini-2.5-pro'
          : 'gemini-2.5-flash'
        : detail.defaultModel;

    const result = testResult[providerId];
    const showKey = Boolean(showKeys[providerId]);

    const endpointField = detail.endpointField ? (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between h-5">
          <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            {detail.endpointLabel}
          </label>
          {detail.endpointHint && (
            <span className="text-[11px] text-gray-400">{detail.endpointHint}</span>
          )}
        </div>
        <input
          type="text"
          value={cfg[detail.endpointField] || detail.endpointDefault || ''}
          onChange={(e) => setField(detail.endpointField as string, e.target.value)}
          placeholder={detail.endpointPlaceholder}
          className={INPUT_CLASS}
        />
      </div>
    ) : null;

    const keyField = detail.keyField ? (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between h-5">
          <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            {detail.keyLabel}
          </label>
          {detail.keyLink && (
            <button
              type="button"
              onClick={() => handleOpenExternal(detail.keyLink!.url)}
              className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-colors"
            >
              <span>{detail.keyLink.label}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={cfg[detail.keyField] || ''}
            onChange={(e) => setField(detail.keyField as string, e.target.value)}
            placeholder={detail.keyPlaceholder}
            className={`${INPUT_CLASS} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }))}
            aria-label={showKey ? 'Hide key' : 'Show key'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    ) : null;

    // Endpoint first when a provider has one, otherwise the API key, then the model.
    const primaryField = endpointField || keyField;
    const secondaryField = endpointField && keyField ? keyField : null;

    return (
      <div className={`${SURFACE} rounded-2xl p-6 flex flex-col gap-6`}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 text-gray-900 dark:text-gray-100">
              {ActiveLogo && <ActiveLogo className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="m-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {copy.title}
              </h3>
              <p className="m-0 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {copy.description}
              </p>
            </div>
          </div>

          {detail.links.length > 0 && (
            <div className="flex items-center gap-2">
              {detail.links.map((link) => (
                <button
                  key={link.url}
                  type="button"
                  onClick={() => handleOpenExternal(link.url)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium cursor-pointer border border-gray-200 dark:border-[#1e2029] bg-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all"
                >
                  <span>{link.label}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          {primaryField}
          {renderModelDropdown(
            providerId,
            cfg[detail.modelField] || modelDefault,
            (val) => setField(detail.modelField, val),
            modelDefault
          )}
          {secondaryField}
        </div>

        {/* Test connection */}
        <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-[#e4e4eb] dark:border-[#1e2029]">
          <button
            type="button"
            disabled={testing === providerId}
            onClick={() =>
              handleTestKey(
                providerId,
                detail.keyField ? cfg[detail.keyField] : undefined,
                cfg[detail.modelField],
                detail.endpointField ? cfg[detail.endpointField] : undefined
              )
            }
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 border-none cursor-pointer transition-all disabled:opacity-50"
          >
            {testing === providerId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Test connection</span>
          </button>

          {result && (
            <span className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 min-w-0">
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              )}
              <span className="break-words">{result.message}</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  const categoryTabClass = (value: Category) =>
    `inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full cursor-pointer border-none transition-all ${
      category === value
        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
        : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    }`;

  return (
    <div className="flex flex-col  gap-8 max-w-5xl mx-auto w-full pb-16">
      {/* Header */}
      <header className="flex flex-col mt-16 sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            AI Models
          </h2>
          <p className="m-0 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Choose the provider and model Grokki uses. Switch between paid flagship models and free or open-source options.
          </p>
        </div>

        {/* Paid vs Free segmented control */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#13141a] p-1 rounded-full border border-gray-200 dark:border-[#1e2029] self-start sm:self-auto">
          <button type="button" onClick={() => setCategory('paid')} className={categoryTabClass('paid')}>
            <span>Paid</span>
          </button>
          <button type="button" onClick={() => setCategory('free')} className={categoryTabClass('free')}>
            <span>Free & Open Source</span>
          </button>
        </div>
      </header>

      {/* Provider list */}
      <section>
        <SectionLabel>Provider</SectionLabel>

        {/* Notice when the active engine lives in the other category */}
        {!isActiveInCurrentCategory && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 mb-3 rounded-xl bg-gray-50 dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] text-xs text-gray-600 dark:text-gray-300">
            <span>
              Active engine is{' '}
              <strong className="font-semibold text-gray-900 dark:text-gray-100">
                {activeInOther?.label || config.provider}
              </strong>
              , in the {otherCategory === 'paid' ? 'Paid' : 'Free & Open Source'} list.
            </span>
            <button
              type="button"
              onClick={() => setCategory(otherCategory)}
              className="text-[11px] font-semibold text-gray-900 dark:text-white hover:underline cursor-pointer bg-transparent border-none p-0 flex-shrink-0"
            >
              Show
            </button>
          </div>
        )}

        <div
          role="radiogroup"
          aria-label="AI provider"
          className={`${SURFACE} rounded-2xl overflow-hidden flex flex-col divide-y divide-[#e4e4eb] dark:divide-[#1e2029]`}
        >
          {currentProviders.map((p) => {
            const isSelected = config.provider === p.id;
            const Logo = p.Logo;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectProvider(p.id)}
                className={`w-full flex items-center gap-3.5 px-5 py-3.5 text-left cursor-pointer border-none transition-colors ${
                  isSelected
                    ? 'bg-gray-50 dark:bg-[#161822]'
                    : 'bg-transparent hover:bg-gray-50 dark:hover:bg-[#161822]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 text-gray-900 dark:text-gray-100">
                  <Logo className="w-[18px] h-[18px]" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {p.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-[10px] font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {p.tag}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {p.subLabel}
                  </span>
                </div>

                <span className="hidden sm:block text-[11px] font-mono text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
                  {p.badge}
                </span>

                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'border-gray-900 dark:border-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Configuration */}
      {detail && (
        <section>
          <SectionLabel>Configuration</SectionLabel>
          {renderConfigCard()}
        </section>
      )}
    </div>
  );
});