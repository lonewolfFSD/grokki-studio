import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit3,
  ExternalLink,
  RefreshCw,
  Download,
  AlertTriangle,
  Play,
  Info,
  Trash2,
  HardDrive,
  Zap,
  Terminal,
  Copy,
  Check,
  Sparkles,
  Plus,
  ChevronRight,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { JarvisConfig, AiProvider, ActiveModelPull } from '../../types/jarvis';
import GlideSelect, { GlideSelectOption } from './GlideSelect';

import geminiLogo from '../../assets/logos/gemini.png';
import groqLogo from '../../assets/logos/groq.png';
import ollamaLogo from '../../assets/logos/ollama.png';
import openrouterLogo from '../../assets/logos/openrouter.png';
import grokkiIcon from '../../assets/grokki_icon.svg';

export const GrokkiCloudLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <img src={grokkiIcon} alt="Grokki Cloud" className={`${className} object-contain`} />
);

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

// OmniRoute Unified Router Nexus Logo
export const OmniRouteLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="#10B981" />
    <path
      d="M6 18V15C6 13.3431 7.34315 12 9 12H15C16.6569 12 18 10.6569 18 9V6"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="6" cy="18" r="2" fill="white" />
    <circle cx="18" cy="6" r="2" fill="white" />
    <circle cx="12" cy="12" r="1.5" fill="white" />
  </svg>
);
export const OmniRouterLogo = OmniRouteLogo;

// Official LiteLLM Brand Logo (BerriAI)
export const LiteLLMLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 512 512" className={`${className} object-contain`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M511.9 82.5c-.8-.1-1.4-.1-1.9-.1-81.6 0-163.2 0-244.8.1-8.5 0-16.6 2-24.4 5.4-15.7 6.9-27.4 18.8-39 30.7 10.8 0 21.6.1 32.4.1h126.3c1.5 0 2.9 0 4.9 1l-11.7 11.7c-18.7 18.6-37.5 37.1-56.1 55.8-3.4 3.4-6.8 4.9-11.7 4.9-50.7-.2-101.3-.1-152-.1-1.8 0-3.6-.1-5.5-.1-18.4 9.3-36.9 18.7-55.3 28 0 49.8 0 99.7-.1 149.5 0 1.8-.1 3.6-.2 5.5 36.8 0 73.5-.1 110.3-.1 12.5-12.5 24.9-25.1 37.4-37.6 10.7-10.7 21.5-21.4 32.1-32.2 2.3-2.4 4.7-3.4 8.1-3.4 81.6.1 163.2 0 244.7 0 2.1 0 4.2-.1 6.3-.1.1-.8.1-1.7.1-2.5V85c.2-.8.1-1.6.1-2.5"
      fill="#d2d3d4"
    />
    <path
      d="M183.2 374.8c12.5-12.5 24.9-25.1 37.4-37.6 10.7-10.7 21.5-21.4 32.1-32.2 2.3-2.4 4.7-3.4 8.1-3.4 81.6.1 163.2 0 244.7 0 2.1 0 4.2-.1 6.3-.1 0 24.4.1 48.8.1 73.2-1.8 0-3.6.1-5.5.1H296.7c-19.8 0-39.6 0-59.4.1-18 0-36.1-.1-54.1-.1M30.5 243.1C4.4 260.5-4 286.2 1.7 316.2c6.5 34.3 36.1 58 71.2 58.7.1-1.8.2-3.6.2-5.5 0-49.8.1-99.7.1-149.5-14.4 7.6-29.3 14.3-42.7 23.2m137.9-91.5c-13.4 13.4-26.6 26.8-40 40.2 1.8 0 3.6.1 5.5.1 50.7 0 101.3-.1 152 .1 4.9 0 8.3-1.4 11.7-4.9 17.2-17.4 34.7-34.6 52.1-51.9H184.8z"
      fill="#6da7da"
    />
    <path
      d="M511.8 411.3c0 6.1 0 12.2.1 18.3H24c-1.7 0-3.4-.1-5-.1 18-18.2 35.9-36.4 53.9-54.6 36.8 0 73.6-.1 110.4-.1 18.1.1 36.1.1 54.2.2 19.8 0 39.6-.1 59.4-.1h209.7c1.8 0 3.6-.1 5.5-.1-.2 12.1-.2 24.3-.3 36.5M365.4 119.6c-2-1-3.4-1-4.9-1H234.2c-10.8 0-21.6-.1-32.4-.1-5.6 5.6-11.3 11.2-17 16.8h164.8c1.3-1.3 2.7-2.6 4-4 4-3.8 7.9-7.8 11.8-11.7"
      fill="#306599"
    />
  </svg>
);

// Official Bifrost Brand Icon (Maxim AI)
const BIFROST_OFFICIAL_ICON = 'data:image/webp;base64,UklGRkQBAABXRUJQVlA4WAoAAAAQAAAAVwAAbQAAQUxQSOEAAAABgBxb2/Lkk7hrAZ59OtBCGOqARrwBGoinCBwacI3bkjt5/+WfmYiYgK34dS+s2D0cXcfqU4/y25VCESxkY+Ljrfcf8rOrxJvaeEsuR/Js448Z7AXQ1JgZQZ5CES0YxFTvnh/B+ytGF15+0OsYomyMDUPF3y36DO20Ln4zj651T07ws179f72mtEWNgXKdfo88CSE6WW+gVUaZSBgNacTUP/7I7x6007Yx3pLLkRP8MQP3Oq94T2O8WoLzwYH8w9Nz8OLseCJ+3EkEUf9W/LofVqwD9Nz2ZuLnHepC/OVRAAIAVlA4IDwAAADwBACdASpYAG4APpFIoUylpCMiIMgAsBIJaQAABje6m+jahzjKAe6m+jahzjKAeeAA/vjO7u4AAAAAAAA=';
export const BifrostLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <img src={BIFROST_OFFICIAL_ICON} alt="Bifrost" className={`${className} object-contain rounded-sm`} />
);

// Official Portkey AI Gateway Brand Logo
export const PortkeyLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 32 32" className={`${className} object-contain`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="7" fill="#8B5CF6" />
    <path d="M16 6L24.6603 11V21L16 26L7.33975 21V11L16 6Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="16" cy="14" r="3.2" fill="white" />
    <path d="M14.5 15.5L13 22H19L17.5 15.5" fill="white" />
  </svg>
);

// Official Helicone 3D Observability Cube Prism Logo
export const HeliconeLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="620 450 595 600" className={`${className} object-contain`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#0ca4e8" d="M 913.5,458.5 C 917.247,458.392 920.914,458.892 924.5,460C 1017.83,501 1111.17,542 1204.5,583C 1205.46,584.419 1206.29,585.919 1207,587.5C 1207.67,695.167 1207.67,802.833 1207,910.5C 1204.54,919.631 1198.7,925.465 1189.5,928C 1098.82,966.227 1007.98,1004.06 917,1041.5C 822.603,1002.59 728.436,963.089 634.5,923C 630.619,920.072 628.119,916.239 627,911.5C 626.333,803.5 626.333,695.5 627,587.5C 627.667,586.167 628.333,584.833 629,583.5C 723.742,541.373 818.575,499.707 913.5,458.5 Z" />
    <path fill="#0ca4e8" d="M 914.5,479.5 C 919.428,480.128 924.095,481.628 928.5,484C 1009.65,519.409 1090.65,555.076 1171.5,591C 1087.05,627.725 1002.72,664.725 918.5,702C 833.045,665.614 747.712,628.614 662.5,591C 746.609,553.915 830.609,516.748 914.5,479.5 Z" />
    <path fill="#156082" d="M 647.5,606.5 C 709.626,633.397 771.626,660.563 833.5,688C 771.955,733.052 710.288,777.885 648.5,822.5C 647.501,750.669 647.167,678.669 647.5,606.5 Z" />
    <path fill="#c0faf4" d="M 1184.5,606.5 C 1185.5,606.5 1186.5,606.5 1187.5,606.5C 1187.67,622.17 1187.5,637.837 1187,653.5C 1115.5,767.833 1044,882.167 972.5,996.5C 957.418,1002.64 942.418,1008.97 927.5,1015.5C 926.334,990.507 926.167,965.507 927,940.5C 994.393,838.103 1061.39,735.437 1128,632.5C 1146.84,623.726 1165.67,615.059 1184.5,606.5 Z" />
    <path fill="#0ca4e8" d="M 928.5,902.5 C 927.501,841.669 927.168,780.669 927.5,719.5C 983.308,694.629 1039.31,670.462 1095.5,647C 1039.61,732.049 983.944,817.216 928.5,902.5 Z" />
  </svg>
);

// Official LMSYS RouteLLM Matrix-Factorization Router Logo
export const RouteLLMLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 32 32" className={`${className} object-contain`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="7" fill="#0F172A" />
    <path d="M8 16H14L19 9H24" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 16L19 23H24" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="8" cy="16" r="2.5" fill="#F97316" />
    <circle cx="24" cy="9" r="2.5" fill="#F97316" />
    <circle cx="24" cy="23" r="2.5" fill="#38BDF8" />
  </svg>
);

// Official New API Gateway Cubic Token Node Logo (Calcium-Ion / QuantumNous)
export const NewApiLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 32 32" className={`${className} object-contain`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="7" fill="#059669" />
    <path d="M16 7L24 11.5V20.5L16 25L8 20.5V11.5L16 7Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    <path d="M16 7V25M8 11.5L24 20.5M8 20.5L24 11.5" stroke="white" strokeWidth="1.2" strokeOpacity="0.75" />
    <circle cx="16" cy="16" r="3" fill="#34D399" />
  </svg>
);

// Official CNCF Higress Cloud-Native AI Gateway Logo
export const HigressLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 59.59 53.62" className={`${className} object-contain`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="higress-grad-color-1" x1=".06" y1="17.82" x2="29.43" y2="17.82" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#0418ff" />
        <stop offset="1" stopColor="#1e8cfe" />
      </linearGradient>
      <linearGradient id="higress-grad-color-2" x1="39.29" y1="35.8" x2="9.91" y2="35.8" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#0418ff" />
        <stop offset="1" stopColor="#1e8cfe" />
      </linearGradient>
    </defs>
    <path d="M29.43,35.4c-.79,.17-1.61,.25-2.46,.25h-7.27c-3.68,0-7.15-1.03-10.11-2.81-.53-.32-1.04-.65-1.53-1.01-2.72-2.02-4.91-4.71-6.31-7.83-.25-.57-.47-1.14-.68-1.74C.42,20.3,.06,18.19,.06,16V0H8.12V16c0,.38,.01,.74,.06,1.1,.04,.53,.12,1.03,.25,1.53,.74,3.16,2.78,5.84,5.52,7.41,1.68,.96,3.63,1.52,5.7,1.53h.06c4.75,.03,8.73,3.36,9.73,7.83Z" fill="url(#higress-grad-color-1)" />
    <path d="M8.06,33.66v19.96H0V23.23c.26,.97,.68,2.07,.9,2.5,1.65,3.22,4.14,5.95,7.16,7.94Z" fill="#1e8cfe" />
    <path d="M39.29,37.62v16h-8.06v-16c0-.38-.01-.75-.06-1.11-.04-.51-.13-1.03-.25-1.52-.74-3.17-2.77-5.84-5.51-7.42-1.7-.96-3.64-1.52-5.71-1.53h-.06c-4.74-.03-8.73-3.36-9.73-7.81,.79-.17,1.61-.25,2.46-.25h7.27c3.68,0,7.15,1.03,10.11,2.81,.53,.31,1.04,.65,1.53,1.01,2.72,2.02,4.91,4.7,6.3,7.83,.26,.56,.49,1.14,.68,1.72,.67,1.97,1.03,4.09,1.03,6.27Z" fill="url(#higress-grad-color-2)" />
    <path d="M49.42,7.12c0-1.37,.5-2.55,1.49-3.54,.99-1,2.19-1.49,3.58-1.49s2.62,.5,3.61,1.49c1,.97,1.49,2.17,1.49,3.58s-.5,2.62-1.49,3.61c-.97,1-2.16,1.49-3.58,1.49s-2.62-.5-3.61-1.49c-1-1-1.49-2.21-1.49-3.65Zm9.26,12.68V53.62h-8.34V19.79h8.34Z" fill="#0418ff" />
    <path d="M31.23,19.96V0h8.06V30.39c-.26-.97-.68-2.07-.9-2.5-1.65-3.22-4.14-5.95-7.16-7.94Z" fill="#1e8cfe" />
  </svg>
);

// Official ClawRouter Lobster Claw Smart Router Logo (BlockRun.AI)
export const ClawRouterLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 32 32" className={`${className} object-contain`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="7" fill="#CC2028" />
    <path d="M9 11C11.5 8 16 8 18 10C18 12 16 14 14 14.5L11 15.5C9.5 16 9 14 9 11Z" fill="white" />
    <path d="M23 11C20.5 8 16 8 14 10C14 12 16 14 18 14.5L21 15.5C22.5 16 23 14 23 11Z" fill="white" />
    <path d="M16 14V25M16 25L12 21M16 25L20 21" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Official FreeLLMAPI Aggregator Logo (Tashfeen Ahmed)
export const FreeLLMAPILogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 32 32" className={`${className} object-contain`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="7" fill="url(#freellm-grad)" />
    <defs>
      <linearGradient id="freellm-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
    <path
      d="M10 13C8.34 13 7 14.34 7 16C7 17.66 8.34 19 10 19C12.2 19 13.8 16 16 16C18.2 16 19.8 19 22 19C23.66 19 25 17.66 25 16C25 14.34 23.66 13 22 13C19.8 13 18.2 16 16 16C13.8 16 12.2 13 10 13Z"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="16" r="1.5" fill="white" />
    <circle cx="22" cy="16" r="1.5" fill="white" />
  </svg>
);

export const AnthropicLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <rect width="24" height="24" rx="6" fill="#D97757" />
    <path d="M14.7 6.5h-2.1l4.1 11h2.1l-4.1-11zm-5.4 0L5.2 17.5h2.1l.8-2.3h4.1l.8 2.3h2.1L11 6.5H9.3zm-.5 6.8l1.4-4.1 1.4 4.1H8.8z" fill="white" />
  </svg>
);

export const KimiLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <rect width="24" height="24" rx="6" fill="#18181B" />
    <path d="M7.5 6.5v11M16.5 6.5l-6 5.5 6 5.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="16.5" cy="6.5" r="1.3" fill="#38BDF8" />
  </svg>
);

export const MistralLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <rect width="24" height="24" rx="6" fill="#18181B" />
    <rect x="5" y="6" width="3" height="3" fill="#F7D046" />
    <rect x="16" y="6" width="3" height="3" fill="#F7D046" />
    <rect x="5" y="9" width="6" height="3" fill="#F2A73B" />
    <rect x="13" y="9" width="6" height="3" fill="#F2A73B" />
    <rect x="5" y="12" width="14" height="3" fill="#EE792F" />
    <rect x="5" y="15" width="3" height="3" fill="#EB5829" />
    <rect x="10.5" y="15" width="3" height="3" fill="#EB5829" />
    <rect x="16" y="15" width="3" height="3" fill="#EB5829" />
  </svg>
);

export const PerplexityLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <rect width="24" height="24" rx="6" fill="#20808D" />
    <path d="M12 5v14M7 9l5 3 5-3M7 15l5-3 5 3M7 9v6M17 9v6" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CohereLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <rect width="24" height="24" rx="6" fill="#39594D" />
    <circle cx="9.5" cy="9.5" r="3" fill="#D18EE2" />
    <path d="M12.5 14.5a3.5 3.5 0 1 1 0-5h3.5a3 3 0 0 1 0 6h-3.5z" fill="#FF7759" />
  </svg>
);

export const GlmLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <rect width="24" height="24" rx="6" fill="#2563EB" />
    <path d="M6.5 7.5h11l-11 9h11" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MiniMaxLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <rect width="24" height="24" rx="6" fill="#E11D48" />
    <path d="M6 16.5v-9l4 4.5 4-4.5v9M16 10.5l2 3-2 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TogetherLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <rect width="24" height="24" rx="6" fill="#0F62FE" />
    <circle cx="9" cy="12" r="3.2" stroke="white" strokeWidth="2" />
    <circle cx="15" cy="12" r="3.2" stroke="white" strokeWidth="2" />
  </svg>
);

export const MetaLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <path
      d="M5.5 16.5C3.8 16.5 2.5 14.8 2.5 12.2C2.5 9.2 4.4 7 6.8 7C8.6 7 10.1 8.4 12 11.4C13.9 8.4 15.4 7 17.2 7C19.6 7 21.5 9.2 21.5 12.2C21.5 14.8 20.2 16.5 18.5 16.5C16.6 16.5 15.1 14.6 13.1 11.3L12 9.5L10.9 11.3C8.9 14.6 7.4 16.5 5.5 16.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const MicrosoftLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} object-contain`} fill="none">
    <rect x="3" y="3" width="8.5" height="8.5" rx="1.2" fill="#F25022" />
    <rect x="12.5" y="3" width="8.5" height="8.5" rx="1.2" fill="#7FBA00" />
    <rect x="3" y="12.5" width="8.5" height="8.5" rx="1.2" fill="#00A4EF" />
    <rect x="12.5" y="12.5" width="8.5" height="8.5" rx="1.2" fill="#FFB900" />
  </svg>
);

interface OllamaCatalogItem {
  tag: string;
  name: string;
  brand: string;
  category: 'General' | 'Coding' | 'Reasoning' | 'Vision';
  params: string;
  minVramGb: number;
  size: string;
  desc: string;
  Logo: React.FC<{ className?: string }>;
}

const OLLAMA_MODEL_CATALOG: OllamaCatalogItem[] = [
  { tag: 'llama3.2:1b', name: 'Llama 3.2 1B', brand: 'Meta', category: 'General', params: '1B', minVramGb: 2, size: '1.3 GB', desc: 'Ultra-lightweight edge assistant for low-RAM systems', Logo: MetaLogo },
  { tag: 'llama3.2', name: 'Llama 3.2 3B', brand: 'Meta', category: 'General', params: '3B', minVramGb: 4, size: '2.0 GB', desc: 'Fast, lightweight daily assistant by Meta', Logo: MetaLogo },
  { tag: 'llama3.1:8b', name: 'Llama 3.1 8B', brand: 'Meta', category: 'General', params: '8B', minVramGb: 8, size: '4.9 GB', desc: 'Versatile 128K context general-purpose model', Logo: MetaLogo },
  { tag: 'llama3.3:70b', name: 'Llama 3.3 70B', brand: 'Meta', category: 'General', params: '70B', minVramGb: 48, size: '43 GB', desc: 'Flagship open-weights model for workstation GPUs', Logo: MetaLogo },
  { tag: 'qwen2.5:3b', name: 'Qwen 2.5 3B', brand: 'Qwen', category: 'General', params: '3B', minVramGb: 4, size: '1.9 GB', desc: 'Compact multilingual model with strong instruction following', Logo: QwenLogo },
  { tag: 'qwen2.5:7b', name: 'Qwen 2.5 7B', brand: 'Qwen', category: 'General', params: '7B', minVramGb: 8, size: '4.7 GB', desc: 'Balanced 7B model with strong tool-use & JSON output', Logo: QwenLogo },
  { tag: 'qwen2.5:14b', name: 'Qwen 2.5 14B', brand: 'Qwen', category: 'General', params: '14B', minVramGb: 16, size: '9.0 GB', desc: 'High-accuracy mid-size model for 16 GB+ systems', Logo: QwenLogo },
  { tag: 'qwen2.5:32b', name: 'Qwen 2.5 32B', brand: 'Qwen', category: 'General', params: '32B', minVramGb: 24, size: '20 GB', desc: 'Near-flagship local intelligence for 24 GB+ VRAM', Logo: QwenLogo },
  { tag: 'qwen2.5-coder:1.5b', name: 'Qwen 2.5 Coder 1.5B', brand: 'Qwen', category: 'Coding', params: '1.5B', minVramGb: 2, size: '1.0 GB', desc: 'Instant autocomplete and lightweight code helper', Logo: QwenLogo },
  { tag: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder 7B', brand: 'Qwen', category: 'Coding', params: '7B', minVramGb: 8, size: '4.7 GB', desc: 'Coding, refactoring & syntax specialist', Logo: QwenLogo },
  { tag: 'qwen2.5-coder:14b', name: 'Qwen 2.5 Coder 14B', brand: 'Qwen', category: 'Coding', params: '14B', minVramGb: 16, size: '9.0 GB', desc: 'Strong multi-file code generation & debugging', Logo: QwenLogo },
  { tag: 'qwen2.5-coder:32b', name: 'Qwen 2.5 Coder 32B', brand: 'Qwen', category: 'Coding', params: '32B', minVramGb: 24, size: '20 GB', desc: 'Top-tier local coding model rivaling cloud APIs', Logo: QwenLogo },
  { tag: 'deepseek-r1:1.5b', name: 'DeepSeek R1 1.5B', brand: 'DeepSeek', category: 'Reasoning', params: '1.5B', minVramGb: 2, size: '1.1 GB', desc: 'Tiny chain-of-thought reasoning distillation', Logo: DeepSeekLogo },
  { tag: 'deepseek-r1:7b', name: 'DeepSeek R1 7B', brand: 'DeepSeek', category: 'Reasoning', params: '7B', minVramGb: 8, size: '4.7 GB', desc: 'Compact step-by-step math & logic reasoning', Logo: DeepSeekLogo },
  { tag: 'deepseek-r1:8b', name: 'DeepSeek R1 8B', brand: 'DeepSeek', category: 'Reasoning', params: '8B', minVramGb: 8, size: '4.9 GB', desc: 'Step-by-step reasoning & math specialist (Llama distill)', Logo: DeepSeekLogo },
  { tag: 'deepseek-r1:14b', name: 'DeepSeek R1 14B', brand: 'DeepSeek', category: 'Reasoning', params: '14B', minVramGb: 16, size: '9.0 GB', desc: 'Deep chain-of-thought reasoning for 16 GB+ machines', Logo: DeepSeekLogo },
  { tag: 'deepseek-r1:32b', name: 'DeepSeek R1 32B', brand: 'DeepSeek', category: 'Reasoning', params: '32B', minVramGb: 24, size: '20 GB', desc: 'Heavyweight local reasoning & algorithm design', Logo: DeepSeekLogo },
  { tag: 'gemma3:4b', name: 'Gemma 3 4B', brand: 'Google', category: 'General', params: '4B', minVramGb: 6, size: '3.3 GB', desc: 'Fast multimodal-ready model by Google DeepMind', Logo: GeminiLogo },
  { tag: 'gemma3:12b', name: 'Gemma 3 12B', brand: 'Google', category: 'General', params: '12B', minVramGb: 12, size: '8.1 GB', desc: 'Strong reasoning & writing in 12 GB VRAM/RAM', Logo: GeminiLogo },
  { tag: 'gemma3:27b', name: 'Gemma 3 27B', brand: 'Google', category: 'General', params: '27B', minVramGb: 24, size: '17 GB', desc: 'Flagship Gemma 3 open weights', Logo: GeminiLogo },
  { tag: 'mistral', name: 'Mistral 7B', brand: 'Mistral', category: 'General', params: '7B', minVramGb: 8, size: '4.1 GB', desc: 'Balanced reasoning & instruction following', Logo: MistralLogo },
  { tag: 'codestral', name: 'Codestral 22B', brand: 'Mistral', category: 'Coding', params: '22B', minVramGb: 16, size: '13 GB', desc: 'Mistral dedicated 80+ language code model', Logo: MistralLogo },
  { tag: 'phi4-mini', name: 'Phi-4 Mini 3.8B', brand: 'Microsoft', category: 'Reasoning', params: '3.8B', minVramGb: 4, size: '2.5 GB', desc: 'Compact Microsoft reasoning & STEM model', Logo: MicrosoftLogo },
  { tag: 'phi4', name: 'Phi-4 14B', brand: 'Microsoft', category: 'Reasoning', params: '14B', minVramGb: 16, size: '9.1 GB', desc: 'Microsoft advanced reasoning & math', Logo: MicrosoftLogo },
  { tag: 'command-r', name: 'Command R 35B', brand: 'Cohere', category: 'General', params: '35B', minVramGb: 24, size: '20 GB', desc: 'Enterprise RAG & tool-calling specialist', Logo: CohereLogo },
  { tag: 'moondream', name: 'Moondream 2', brand: 'Moondream', category: 'Vision', params: '1.8B', minVramGb: 2, size: '1.7 GB', desc: 'Ultra-fast local vision model for image inspection', Logo: OllamaLogo },
  { tag: 'llava', name: 'LLaVA 7B', brand: 'LLaVA', category: 'Vision', params: '7B', minVramGb: 8, size: '4.7 GB', desc: 'General-purpose local vision-language assistant', Logo: OllamaLogo },
];

interface AiBrainTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
  activeModelPull?: ActiveModelPull | null;
  onPullModel?: (modelTag: string) => Promise<void>;
}

export const CURATED_MODELS: Record<string, { value: string; label: string; tag?: string }[]> = {
  grokki_free: [
    { value: 'auto', label: 'Auto (Smart Free Rotator)', tag: 'Auto' },
    { value: 'openrouter:deepseek/deepseek-r1:free', label: 'DeepSeek R1', tag: 'Free' },
    { value: 'openrouter:qwen/qwen-2.5-coder-32b-instruct:free', label: 'Qwen 2.5 Coder 32B', tag: 'Free' },
    { value: 'openrouter:meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B Instruct', tag: 'Free' },
    { value: 'openrouter:mistralai/mistral-small-24b-instruct-2501:free', label: 'Mistral Small 24B', tag: 'Free' },
    { value: 'openrouter:google/gemini-2.0-flash-lite-preview-02-05:free', label: 'Gemini 2.0 Flash Lite', tag: 'Free' },
    { value: 'groq:openai/gpt-oss-120b', label: 'GPT-OSS 120B (Groq)', tag: 'Free' },
    { value: 'groq:llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Groq)', tag: 'Free' },
    { value: 'groq:deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B (Groq)', tag: 'Free' },
    { value: 'groq:meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B (Groq)', tag: 'Free' },
    { value: 'gemini:gemini-2.5-flash', label: 'Gemini 2.5 Flash (Google)', tag: 'Free' },
    { value: 'gemini:gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Google)', tag: 'Free' },
  ],
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
    { value: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b', tag: 'Recommended 120B' },
    { value: 'openai/gpt-oss-20b', label: 'openai/gpt-oss-20b', tag: 'Ultra-Fast 20B' },
    { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'meta-llama/llama-4-scout-17b-16e-instruct', tag: 'Llama 4 Scout' },
    { value: 'deepseek-r1-distill-llama-70b', label: 'deepseek-r1-distill-llama-70b', tag: 'Reasoning' },
    { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile', tag: 'Llama 3.3 70B' },
    { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant', tag: '500+ T/s' },
  ],
  ollama: [],
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
  anthropic: [
    { value: 'claude-sonnet-4-5', label: 'claude-sonnet-4-5', tag: 'Best Coding & Agents' },
    { value: 'claude-opus-4-1', label: 'claude-opus-4-1', tag: 'Flagship Reasoning' },
    { value: 'claude-3-7-sonnet-latest', label: 'claude-3-7-sonnet-latest', tag: 'Hybrid Thinking' },
    { value: 'claude-3-5-haiku-latest', label: 'claude-3-5-haiku-latest', tag: 'Fast & Affordable' },
  ],
  kimi: [
    { value: 'kimi-k2-0711-preview', label: 'kimi-k2-0711-preview', tag: 'K2 Flagship Agent' },
    { value: 'kimi-latest', label: 'kimi-latest', tag: 'Auto Context' },
    { value: 'moonshot-v1-128k', label: 'moonshot-v1-128k', tag: '128K Context' },
    { value: 'moonshot-v1-32k', label: 'moonshot-v1-32k', tag: 'Fast 32K' },
  ],
  mistral: [
    { value: 'mistral-large-latest', label: 'mistral-large-latest', tag: 'Flagship' },
    { value: 'codestral-latest', label: 'codestral-latest', tag: 'Code Specialist' },
    { value: 'mistral-medium-latest', label: 'mistral-medium-latest', tag: 'Balanced' },
    { value: 'pixtral-large-latest', label: 'pixtral-large-latest', tag: 'Vision' },
  ],
  perplexity: [
    { value: 'sonar-pro', label: 'sonar-pro', tag: 'Live Web Pro' },
    { value: 'sonar-reasoning-pro', label: 'sonar-reasoning-pro', tag: 'Deep Research' },
    { value: 'sonar', label: 'sonar', tag: 'Fast Search' },
  ],
  cohere: [
    { value: 'command-a-03-2025', label: 'command-a-03-2025', tag: 'Flagship Agent' },
    { value: 'command-r-plus-08-2024', label: 'command-r-plus-08-2024', tag: 'RAG & Tools' },
    { value: 'command-r7b-12-2024', label: 'command-r7b-12-2024', tag: 'Fast 7B' },
  ],
  glm: [
    { value: 'glm-4.5', label: 'glm-4.5', tag: 'Flagship Reasoning' },
    { value: 'glm-4.5-air', label: 'glm-4.5-air', tag: 'Fast & Light' },
    { value: 'glm-4-plus', label: 'glm-4-plus', tag: 'General Pro' },
  ],
  minimax: [
    { value: 'MiniMax-M1', label: 'MiniMax-M1', tag: 'Reasoning 1M' },
    { value: 'MiniMax-Text-01', label: 'MiniMax-Text-01', tag: '4M Context' },
  ],
  together: [
    { value: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', label: 'Llama-4-Maverick-17B', tag: 'Llama 4' },
    { value: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1', tag: 'Reasoning' },
    { value: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen2.5-Coder-32B', tag: 'Coding' },
  ],
  omniroute: [
    { value: 'auto', label: 'auto (Smart Route)', tag: 'Auto' },
    { value: 'anthropic/claude-3.7-sonnet', label: 'anthropic/claude-3.7-sonnet', tag: 'Hybrid Thinking' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'anthropic/claude-3.5-sonnet', tag: 'Coding Champ' },
    { value: 'openai/gpt-4o', label: 'openai/gpt-4o', tag: 'Flagship' },
    { value: 'deepseek/deepseek-r1', label: 'deepseek/deepseek-r1', tag: 'Reasoning' },
    { value: 'deepseek/deepseek-chat', label: 'deepseek/deepseek-chat', tag: 'Fast Chat' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'meta-llama/llama-3.3-70b-instruct', tag: 'Meta 70B' },
    { value: 'qwen/qwen-2.5-72b-instruct', label: 'qwen/qwen-2.5-72b-instruct', tag: 'Qwen 72B' },
    { value: 'google/gemini-2.5-pro', label: 'google/gemini-2.5-pro', tag: '2M Context' },
    { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash', tag: 'Fast Flash' },
  ],
  omnirouter: [
    { value: 'auto', label: 'auto (Smart Route)', tag: 'Auto' },
    { value: 'anthropic/claude-3.7-sonnet', label: 'anthropic/claude-3.7-sonnet', tag: 'Hybrid Thinking' },
    { value: 'openai/gpt-4o', label: 'openai/gpt-4o', tag: 'Flagship' },
    { value: 'deepseek/deepseek-r1', label: 'deepseek/deepseek-r1', tag: 'Reasoning' },
  ],
  litellm: [
    { value: 'gpt-4o', label: 'gpt-4o (Proxy)', tag: 'OpenAI' },
    { value: 'claude-3-7-sonnet', label: 'claude-3-7-sonnet', tag: 'Anthropic' },
    { value: 'deepseek-r1', label: 'deepseek-r1', tag: 'Reasoning' },
    { value: 'llama3.3', label: 'llama3.3', tag: 'Meta' },
    { value: 'qwen2.5-coder-32b', label: 'qwen2.5-coder-32b', tag: 'Coding' },
  ],
  bifrost: [
    { value: 'auto', label: 'auto (Fast Route)', tag: 'Smart Route' },
    { value: 'gpt-4o', label: 'gpt-4o', tag: 'Flagship' },
    { value: 'deepseek-chat', label: 'deepseek-chat', tag: 'DeepSeek' },
    { value: 'llama-3.3-70b', label: 'llama-3.3-70b', tag: 'Open Weight' },
  ],
  portkey: [
    { value: 'auto', label: 'auto (Gateway Route)', tag: 'Gateway Config' },
    { value: 'gpt-4o', label: 'gpt-4o', tag: 'OpenAI' },
    { value: 'claude-3-5-sonnet', label: 'claude-3-5-sonnet', tag: 'Anthropic' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash', tag: 'Google' },
  ],
  helicone: [
    { value: 'gpt-4o', label: 'gpt-4o (Observed)', tag: 'Monitored' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini', tag: 'Fast' },
    { value: 'o3-mini', label: 'o3-mini', tag: 'Reasoning' },
    { value: 'claude-3-5-sonnet', label: 'claude-3-5-sonnet', tag: 'Anthropic' },
  ],
  routellm: [
    { value: 'router-mf', label: 'router-mf (Matrix Factorization)', tag: 'Recommended' },
    { value: 'router-bert', label: 'router-bert (BERT Classifier)', tag: 'Fast Classifier' },
    { value: 'router-causal-llm', label: 'router-causal-llm (LLM Judge)', tag: 'LLM Evaluator' },
    { value: 'gpt-4o', label: 'gpt-4o (Direct Fallback)', tag: 'Strong Model' },
  ],
  newapi: [
    { value: 'auto', label: 'auto (Dynamic Channel)', tag: 'Channel Route' },
    { value: 'gpt-4o', label: 'gpt-4o', tag: 'Channel' },
    { value: 'claude-3-7-sonnet', label: 'claude-3-7-sonnet', tag: 'Channel' },
    { value: 'deepseek-r1', label: 'deepseek-r1', tag: 'Reasoning' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash', tag: 'Channel' },
  ],
  higress: [
    { value: 'auto', label: 'auto (CNCF AI Gateway)', tag: 'Cloud-Native' },
    { value: 'qwen-max', label: 'qwen-max', tag: 'Alibaba Cloud' },
    { value: 'deepseek-chat', label: 'deepseek-chat', tag: 'DeepSeek' },
    { value: 'gpt-4o', label: 'gpt-4o', tag: 'OpenAI' },
  ],
  clawrouter: [
    { value: 'auto', label: 'auto (Intelligent Multi-Route)', tag: 'Smart Route' },
    { value: 'deepseek-r1', label: 'deepseek-r1', tag: 'DeepSeek' },
    { value: 'claude-3-7-sonnet', label: 'claude-3-7-sonnet', tag: 'Anthropic' },
    { value: 'gpt-4o', label: 'gpt-4o', tag: 'OpenAI' },
  ],
  freellmapi: [
    { value: 'auto', label: 'auto (Free Smart Router)', tag: 'Recommended' },
    { value: 'free/gemini-2.5-flash', label: 'free/gemini-2.5-flash', tag: 'Fast Multimodal' },
    { value: 'free/deepseek-r1', label: 'free/deepseek-r1', tag: 'Reasoning' },
    { value: 'free/llama-3.3-70b-instruct', label: 'free/llama-3.3-70b-instruct', tag: 'High Intelligence' },
    { value: 'free/qwen-2.5-coder-32b', label: 'free/qwen-2.5-coder-32b', tag: 'Coding' },
    { value: 'free/mistral-large-2411', label: 'free/mistral-large-2411', tag: 'Flagship' },
    { value: 'free/cerebras-llama3.1-70b', label: 'free/cerebras-llama3.1-70b', tag: 'Sub-second Speed' },
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
  isGateway?: boolean;
  quickstartCmd?: string;
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
  anthropic: {
    title: 'Claude (Anthropic)',
    description: 'Claude Opus 4.1, Sonnet 4.5, and Haiku direct from Anthropic.',
    keyField: 'anthropicApiKey',
    keyLabel: 'Anthropic API key',
    keyPlaceholder: 'sk-ant-...',
    keyLink: { label: 'Anthropic Console', url: 'https://console.anthropic.com/settings/keys' },
    modelField: 'anthropicModel',
    defaultModel: 'claude-sonnet-4-5',
    links: [{ label: 'Pricing & Models', url: 'https://docs.anthropic.com/en/docs/about-claude/models' }],
  },
  kimi: {
    title: 'Kimi (Moonshot AI)',
    description: 'Kimi K2 agentic coding & long-context 128K models from Moonshot AI.',
    keyField: 'kimiApiKey',
    keyLabel: 'Moonshot API key',
    keyPlaceholder: 'sk-...',
    keyLink: { label: 'Moonshot Platform', url: 'https://platform.moonshot.ai/console/api-keys' },
    modelField: 'kimiModel',
    defaultModel: 'kimi-k2-0711-preview',
    links: [{ label: 'Kimi API Docs', url: 'https://platform.moonshot.ai/docs' }],
  },
  mistral: {
    title: 'Mistral AI',
    description: 'Mistral Large, Codestral for code generation, and Pixtral vision.',
    keyField: 'mistralApiKey',
    keyLabel: 'Mistral API key',
    keyPlaceholder: 'Enter Mistral API key',
    keyLink: { label: 'La Plateforme', url: 'https://console.mistral.ai/api-keys' },
    modelField: 'mistralModel',
    defaultModel: 'mistral-large-latest',
    links: [],
  },
  perplexity: {
    title: 'Perplexity (Sonar)',
    description: 'Real-time web-grounded Sonar Pro and Sonar Reasoning Pro models.',
    keyField: 'perplexityApiKey',
    keyLabel: 'Perplexity API key',
    keyPlaceholder: 'pplx-...',
    keyLink: { label: 'API Settings', url: 'https://www.perplexity.ai/settings/api' },
    modelField: 'perplexityModel',
    defaultModel: 'sonar-pro',
    links: [],
  },
  cohere: {
    title: 'Cohere',
    description: 'Command A & Command R+ enterprise RAG, tool-use, and agent models.',
    keyField: 'cohereApiKey',
    keyLabel: 'Cohere API key',
    keyPlaceholder: 'Enter Cohere API key',
    keyLink: { label: 'Cohere Dashboard', url: 'https://dashboard.cohere.com/api-keys' },
    modelField: 'cohereModel',
    defaultModel: 'command-a-03-2025',
    links: [],
  },
  glm: {
    title: 'Zhipu GLM (Z.ai)',
    description: 'GLM-4.5 flagship reasoning and fast agentic models from Zhipu AI.',
    keyField: 'glmApiKey',
    keyLabel: 'Z.ai API key',
    keyPlaceholder: 'Enter Z.ai API key',
    keyLink: { label: 'Z.ai Console', url: 'https://z.ai/manage-apikey/apikey-list' },
    modelField: 'glmModel',
    defaultModel: 'glm-4.5',
    links: [],
  },
  minimax: {
    title: 'MiniMax',
    description: 'MiniMax-M1 1M-context reasoning and MiniMax-Text-01 models.',
    keyField: 'minimaxApiKey',
    keyLabel: 'MiniMax API key',
    keyPlaceholder: 'Enter MiniMax API key',
    keyLink: { label: 'MiniMax Platform', url: 'https://www.minimax.io/platform' },
    modelField: 'minimaxModel',
    defaultModel: 'MiniMax-M1',
    links: [],
  },
  together: {
    title: 'Together AI',
    description: 'Dedicated high-throughput hosting for Llama 4, DeepSeek R1 & Qwen.',
    keyField: 'togetherApiKey',
    keyLabel: 'Together API key',
    keyPlaceholder: 'Enter Together API key',
    keyLink: { label: 'Together Console', url: 'https://api.together.xyz/settings/api-keys' },
    modelField: 'togetherModel',
    defaultModel: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
    links: [],
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
  grokki_free: {
    title: 'Grokki Cloud (Free)',
    description: 'Automatic multi-provider free-tier rotator & failover across Groq, Gemini, OpenRouter :free, OmniRoute & Ollama.',
    endpointField: 'grokkiFreeProxyUrl',
    endpointLabel: 'Optional Zero-Key Proxy URL',
    endpointPlaceholder: 'https://your-worker.workers.dev/v1 (optional)',
    endpointDefault: '',
    endpointHint: 'Optional shared proxy',
    modelField: 'grokkiFreeModel',
    defaultModel: 'auto',
    links: [],
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
  omniroute: {
    title: 'OmniRoute',
    description: 'High-performance unified AI gateway & router (local/remote). Supports 100+ providers and 1000+ models with smart auto-fallback and token caching.',
    endpointField: 'omnirouteEndpoint',
    endpointLabel: 'Gateway Endpoint',
    endpointPlaceholder: 'http://localhost:20128/v1',
    endpointDefault: 'http://localhost:20128/v1',
    endpointHint: 'Default local port: 20128 (http://localhost:20128/v1)',
    keyField: 'omnirouteApiKey',
    keyLabel: 'API key (optional for local gateway)',
    keyPlaceholder: 'Leave empty for local OmniRoute or enter gateway token',
    modelField: 'omnirouteModel',
    defaultModel: 'auto',
    isGateway: true,
    quickstartCmd: 'omniroute start --port 20128',
    links: [
      { label: 'OmniRoute GitHub', url: 'https://github.com/cheaper-inference/OmniRoute' },
      { label: 'Docs / Portal', url: 'https://omniroute.online' },
    ],
  },
  omnirouter: {
    title: 'OmniRoute',
    description: 'High-performance unified AI gateway & router (local/remote).',
    endpointField: 'omnirouteEndpoint',
    endpointLabel: 'Gateway Endpoint',
    endpointPlaceholder: 'http://localhost:20128/v1',
    endpointDefault: 'http://localhost:20128/v1',
    endpointHint: 'Default local port: 20128 (http://localhost:20128/v1)',
    keyField: 'omnirouteApiKey',
    keyLabel: 'API key (optional for local gateway)',
    keyPlaceholder: 'Leave empty for local OmniRoute or enter gateway token',
    modelField: 'omnirouteModel',
    defaultModel: 'auto',
    isGateway: true,
    quickstartCmd: 'omniroute start --port 20128',
    links: [
      { label: 'OmniRoute GitHub', url: 'https://github.com/cheaper-inference/OmniRoute' },
    ],
  },
  litellm: {
    title: 'LiteLLM',
    description: 'Lightweight OpenAI-compatible proxy gateway for 100+ LLMs with unified input/output formatting.',
    endpointField: 'litellmEndpoint',
    endpointLabel: 'Proxy Endpoint',
    endpointPlaceholder: 'http://localhost:4000/v1',
    endpointDefault: 'http://localhost:4000/v1',
    endpointHint: 'Default local port: 4000 (http://localhost:4000/v1)',
    keyField: 'litellmApiKey',
    keyLabel: 'API key (optional for local proxy)',
    keyPlaceholder: 'sk-litellm... or master key',
    modelField: 'litellmModel',
    defaultModel: 'gpt-4o',
    isGateway: true,
    quickstartCmd: 'pip install litellm && litellm --port 4000',
    links: [
      { label: 'LiteLLM GitHub', url: 'https://github.com/BerriAI/litellm' },
      { label: 'Documentation', url: 'https://docs.litellm.ai/' },
    ],
  },
  bifrost: {
    title: 'Bifrost',
    description: 'Blazing-fast open-source LLM router & reverse proxy with sub-millisecond overhead and load balancing.',
    endpointField: 'bifrostEndpoint',
    endpointLabel: 'Gateway Endpoint',
    endpointPlaceholder: 'http://localhost:8080/v1',
    endpointDefault: 'http://localhost:8080/v1',
    endpointHint: 'Default local port: 8080 (http://localhost:8080/v1)',
    keyField: 'bifrostApiKey',
    keyLabel: 'API key (optional for local gateway)',
    keyPlaceholder: 'Leave empty for local Bifrost or enter gateway token',
    modelField: 'bifrostModel',
    defaultModel: 'auto',
    isGateway: true,
    quickstartCmd: 'docker run -d -p 8080:8080 maximai/bifrost',
    links: [
      { label: 'Bifrost GitHub', url: 'https://github.com/maximhq/bifrost' },
    ],
  },
  portkey: {
    title: 'Portkey',
    description: 'Production-ready open-source AI gateway with intelligent routing, load balancing, and multi-provider fallbacks.',
    endpointField: 'portkeyEndpoint',
    endpointLabel: 'Gateway Endpoint',
    endpointPlaceholder: 'https://api.portkey.ai/v1 or http://localhost:8787/v1',
    endpointDefault: 'https://api.portkey.ai/v1',
    endpointHint: 'Cloud: https://api.portkey.ai/v1 | Local docker: http://localhost:8787/v1',
    keyField: 'portkeyApiKey',
    keyLabel: 'Portkey API key / Gateway Token',
    keyPlaceholder: 'pk-... or leave empty for local container',
    modelField: 'portkeyModel',
    defaultModel: 'auto',
    isGateway: true,
    quickstartCmd: 'npx @portkey-ai/gateway',
    links: [
      { label: 'Portkey Gateway GitHub', url: 'https://github.com/Portkey-AI/gateway' },
      { label: 'Portkey App', url: 'https://portkey.ai/' },
    ],
  },
  helicone: {
    title: 'Helicone',
    description: 'Open-source LLM observability, caching proxy, and routing gateway.',
    endpointField: 'heliconeEndpoint',
    endpointLabel: 'Helicone Proxy Endpoint',
    endpointPlaceholder: 'https://oai.helicone.ai/v1',
    endpointDefault: 'https://oai.helicone.ai/v1',
    endpointHint: 'Default: https://oai.helicone.ai/v1',
    keyField: 'heliconeApiKey',
    keyLabel: 'Helicone API key / Upstream Token',
    keyPlaceholder: 'sk-helicone-... or upstream OpenAI key',
    modelField: 'heliconeModel',
    defaultModel: 'gpt-4o',
    isGateway: true,
    links: [
      { label: 'Helicone GitHub', url: 'https://github.com/Helicone/helicone' },
      { label: 'Helicone Console', url: 'https://www.helicone.ai/' },
    ],
  },
  routellm: {
    title: 'RouteLLM',
    description: 'LMSYS open-source cost & quality routing framework using trained matrix-factorization classifiers.',
    endpointField: 'routellmEndpoint',
    endpointLabel: 'RouteLLM Server Endpoint',
    endpointPlaceholder: 'http://localhost:6060/v1',
    endpointDefault: 'http://localhost:6060/v1',
    endpointHint: 'Default local server: http://localhost:6060/v1',
    keyField: 'routellmApiKey',
    keyLabel: 'API key (optional)',
    keyPlaceholder: 'Optional router bearer token',
    modelField: 'routellmModel',
    defaultModel: 'router-mf',
    isGateway: true,
    quickstartCmd: 'pip install routellm && routellm --port 6060',
    links: [
      { label: 'RouteLLM GitHub', url: 'https://github.com/lmsys/routellm' },
    ],
  },
  newapi: {
    title: 'New API',
    description: 'Next-generation unified multi-provider AI gateway and token management system supporting all major LLMs.',
    endpointField: 'newapiEndpoint',
    endpointLabel: 'New API Endpoint',
    endpointPlaceholder: 'http://localhost:3000/v1',
    endpointDefault: 'http://localhost:3000/v1',
    endpointHint: 'Default: http://localhost:3000/v1 or custom domain',
    keyField: 'newapiApiKey',
    keyLabel: 'Access Token / API Key',
    keyPlaceholder: 'sk-... (Token created in New API console)',
    modelField: 'newapiModel',
    defaultModel: 'auto',
    isGateway: true,
    quickstartCmd: 'docker run -d -p 3000:3000 calciumion/new-api',
    links: [
      { label: 'New API GitHub', url: 'https://github.com/Calcium-Ion/new-api' },
    ],
  },
  higress: {
    title: 'Higress',
    description: 'Cloud-native AI gateway and reverse proxy built on Envoy and WebAssembly (CNCF/Alibaba).',
    endpointField: 'higressEndpoint',
    endpointLabel: 'Gateway Endpoint',
    endpointPlaceholder: 'http://localhost:8080/v1',
    endpointDefault: 'http://localhost:8080/v1',
    endpointHint: 'Default local port: 8080 (http://localhost:8080/v1)',
    keyField: 'higressApiKey',
    keyLabel: 'API key (optional for local gateway)',
    keyPlaceholder: 'Leave empty for local instance or enter API key',
    modelField: 'higressModel',
    defaultModel: 'auto',
    isGateway: true,
    quickstartCmd: 'docker run -d -p 8080:8080 higress-registry.cn-hangzhou.cr.aliyuncs.com/higress/all-in-one',
    links: [
      { label: 'Higress GitHub', url: 'https://github.com/alibaba/higress' },
      { label: 'Higress AI', url: 'https://higress.ai/' },
    ],
  },
  clawrouter: {
    title: 'ClawRouter',
    description: 'Intelligent multi-model AI routing engine with dynamic load-balancing and auto-failover.',
    endpointField: 'clawrouterEndpoint',
    endpointLabel: 'Router Endpoint',
    endpointPlaceholder: 'http://localhost:8000/v1',
    endpointDefault: 'http://localhost:8000/v1',
    endpointHint: 'Default local server: http://localhost:8000/v1',
    keyField: 'clawrouterApiKey',
    keyLabel: 'API key (optional)',
    keyPlaceholder: 'ClawRouter bearer token',
    modelField: 'clawrouterModel',
    defaultModel: 'auto',
    isGateway: true,
    quickstartCmd: 'pip install clawrouter && clawrouter --port 8000',
    links: [
      { label: 'ClawRouter GitHub', url: 'https://github.com/ClawRouter' },
    ],
  },
  freellmapi: {
    title: 'FreeLLMAPI Gateway',
    description: 'Self-hosted AI aggregator by Tashfeen Ahmed. Pools permanent free developer allowances from 80+ AI providers (Gemini, Groq, Cerebras, GitHub Models, NVIDIA, Mistral) behind a single OpenAI-compatible endpoint with automatic quota failover.',
    endpointField: 'freellmapiEndpoint',
    endpointLabel: 'FreeLLMAPI Endpoint',
    endpointPlaceholder: 'http://localhost:3001/v1',
    endpointDefault: 'http://localhost:3001/v1',
    endpointHint: 'Default local server: http://localhost:3001/v1 (or port 31415 for desktop app)',
    keyField: 'freellmapiApiKey',
    keyLabel: 'API key (optional)',
    keyPlaceholder: 'Master API key (leave empty if local without auth)',
    modelField: 'freellmapiModel',
    defaultModel: 'auto',
    isGateway: true,
    quickstartCmd: 'git clone https://github.com/tashfeenahmed/freellmapi.git && cd freellmapi && npm install && npm run dev',
    links: [
      { label: 'FreeLLMAPI GitHub', url: 'https://github.com/tashfeenahmed/freellmapi' },
      { label: 'Quickstart & Setup', url: 'https://github.com/tashfeenahmed/freellmapi#quick-installation' },
    ],
  },
};

const SURFACE = 'bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22]';

const INPUT_CLASS =
  'w-full h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none font-mono';

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="m-0 mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
    {children}
  </h3>
);

export const AiBrainTab = React.memo<AiBrainTabProps>(({ config, onChangeConfig, activeModelPull, onPullModel }) => {
  // Auto-fetch models on mount for dynamic providers if not cached yet
  React.useEffect(() => {
    const p = config.provider;
    const dynamicGateways = [
      'omniroute', 'omnirouter', 'litellm', 'bifrost', 'portkey', 'helicone',
      'routellm', 'newapi', 'higress', 'clawrouter', 'freellmapi', 'ollama', 'openrouter'
    ];
    if (dynamicGateways.includes(p)) {
      const cached = config.cachedProviderModels?.[p] || [];
      if (cached.length === 0 && window.jarvisAPI?.fetchProviderModels) {
        const detail = PROVIDER_DETAILS[p];
        const ep = detail?.endpointField
          ? ((config as any)[detail.endpointField] || detail.endpointDefault)
          : undefined;
        const k = detail?.keyField ? ((config as any)[detail.keyField] as string) : undefined;
        window.jarvisAPI.fetchProviderModels({ provider: p, endpoint: ep, key: k })
          .then((res) => {
            if (res?.success && Array.isArray(res.models) && res.models.length > 0) {
              setFetchedModels((prev) => ({ ...prev, [p]: res.models || [] }));
              const updatedCache = { ...(config.cachedProviderModels || {}), [p]: res.models };
              onChangeConfig({ cachedProviderModels: updatedCache });
              window.jarvisAPI?.saveConfig?.({ cachedProviderModels: updatedCache });
            }
          })
          .catch(() => {});
      }
    }
  }, [config.provider, config.omnirouteEndpoint, config.omnirouteApiKey]);
  // Category toggle: 'paid' vs 'free'
  const [category, setCategory] = useState<Category>(() => {
    if (['grok', 'openai', 'deepseek', 'qwen', 'anthropic', 'kimi', 'mistral', 'perplexity', 'cohere', 'glm', 'minimax', 'together'].includes(config.provider)) return 'paid';
    if (config.provider === 'gemini') {
      return (config.geminiModel && config.geminiModel.includes('pro')) ? 'paid' : 'free';
    }
    return 'free';
  });
  const [configuringProvider, setConfiguringProvider] = useState<AiProvider | null>(null);
  const [systemRamGb, setSystemRamGb] = useState<number>(16);
  const [ollamaSearch, setOllamaSearch] = useState('');
  const [ollamaCategoryFilter, setOllamaCategoryFilter] = useState<'All' | 'General' | 'Coding' | 'Reasoning' | 'Vision'>('All');
  const [ollamaHardwareFilter, setOllamaHardwareFilter] = useState<'all' | 'fits' | '4' | '8' | '16' | '32'>('all');

  useEffect(() => {
    window.jarvisAPI?.getSystemInfo?.().then((info) => {
      const parsed = parseFloat(String(info?.totalMemGb || ''));
      if (Number.isFinite(parsed) && parsed > 0) {
        setSystemRamGb(Math.round(parsed));
      }
    }).catch(() => {});
  }, []);

  const [showKeys, setShowKeys] = useState<{ [provider: string]: boolean }>({});

  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: { success: boolean; message: string } }>({});

  const [fetchingModels, setFetchingModels] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<{ [provider: string]: string[] }>(() => config.cachedProviderModels || {});
  const [customInputMode, setCustomInputMode] = useState<{ [provider: string]: boolean }>({});
  const [modelFilter, setModelFilter] = useState<{ [provider: string]: string }>({});
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const isDark =
    config.dashboardTheme === 'dark' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  // Loose view of the config so provider fields can be read and written by name.
  const cfg = config as unknown as Record<string, string | undefined>;
  const setField = (field: string, value: string) =>
    onChangeConfig({ [field]: value } as unknown as Partial<JarvisConfig>);

  const [ollamaStatus, setOllamaStatus] = useState<{
    loading: boolean;
    checked: boolean;
    installed: boolean;
    running: boolean;
    models: string[];
    detailedModels?: Array<{
      name: string;
      size?: number;
      modifiedAt?: string;
      parameterSize?: string;
      family?: string;
      quantization?: string;
    }>;
    exePath?: string;
  }>({
    loading: false,
    checked: false,
    installed: true,
    running: false,
    models: [],
    detailedModels: [],
  });

  const [localPullingModel, setLocalPullingModel] = useState<string | null>(null);
  const [localPullProgress, setLocalPullProgress] = useState<{ status: string; percent: number }>({ status: '', percent: 0 });
  const [customModelInput, setCustomModelInput] = useState('');
  const [deletingModel, setDeletingModel] = useState<string | null>(null);
  const [turboOptimized, setTurboOptimized] = useState<boolean>(true);
  const [turboApplying, setTurboApplying] = useState<boolean>(false);

  // Hugging Face Direct Importer State
  const [hfInput, setHfInput] = useState('');
  const [hfLoading, setHfLoading] = useState(false);
  const [hfResolvedRepo, setHfResolvedRepo] = useState<string | null>(null);
  const [hfGgufFiles, setHfGgufFiles] = useState<Array<{ name: string; size: string; quant: string; isRecommended: boolean }>>([]);
  const [selectedHfFile, setSelectedHfFile] = useState<string>('');
  const [hfError, setHfError] = useState<string | null>(null);

  useEffect(() => {
    if (window.jarvisAPI?.getOllamaHardwareStatus) {
      window.jarvisAPI.getOllamaHardwareStatus().then((res) => {
        if (res) setTurboOptimized(res.flashAttention);
      }).catch(() => {});
    }
  }, []);

  const handleToggleTurbo = async () => {
    setTurboApplying(true);
    try {
      if (window.jarvisAPI?.optimizeOllamaHardware) {
        const next = !turboOptimized;
        await window.jarvisAPI.optimizeOllamaHardware(next);
        setTurboOptimized(next);
      }
    } catch (_) {}
    setTurboApplying(false);
  };

  const checkOllama = useCallback(async () => {
    setOllamaStatus((prev) => ({ ...prev, loading: true }));
    try {
      if (window.jarvisAPI?.checkOllamaStatus) {
        const res = await window.jarvisAPI.checkOllamaStatus(config.ollamaEndpoint);
        const modelsList = res?.models || [];
        setOllamaStatus({
          loading: false,
          checked: true,
          installed: Boolean(res?.installed),
          running: Boolean(res?.running),
          models: modelsList,
          detailedModels: res?.detailedModels || [],
          exePath: res?.exePath,
        });
        if (Array.isArray(modelsList)) {
          const prev = config.cachedProviderModels?.ollama;
          const isSame = Array.isArray(prev) &&
            prev.length === modelsList.length &&
            prev.every((m, idx) => m === modelsList[idx]);
          if (!isSame) {
            onChangeConfig({
              cachedProviderModels: {
                ...(config.cachedProviderModels || {}),
                ollama: modelsList,
              },
            });
          }
        }
      } else {
        const ep = (config.ollamaEndpoint || 'http://127.0.0.1:11434').replace(/\/+$/, '');
        const res = await fetch(`${ep}/api/tags`, { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
          setOllamaStatus({
            loading: false,
            checked: true,
            installed: true,
            running: true,
            models: (data.models || []).map((m: any) => m.name || m.model),
          });
        } else {
          setOllamaStatus({
            loading: false,
            checked: true,
            installed: false,
            running: false,
            models: [],
          });
        }
      }
    } catch (_) {
      setOllamaStatus({
        loading: false,
        checked: true,
        installed: false,
        running: false,
        models: [],
      });
    }
  }, [config.ollamaEndpoint, config.cachedProviderModels, onChangeConfig]);

  const activePullingModel = activeModelPull?.modelName || localPullingModel;
  const activePullProgress = activeModelPull
    ? { status: activeModelPull.status, percent: activeModelPull.percent }
    : localPullProgress;

  useEffect(() => {
    if (activeModelPull?.completed && activeModelPull?.status === 'success') {
      checkOllama();
    }
  }, [activeModelPull?.completed, activeModelPull?.status, checkOllama]);

  useEffect(() => {
    if (window.jarvisAPI?.getActiveOllamaPull) {
      window.jarvisAPI.getActiveOllamaPull().then((active) => {
        if (active && !active.completed) {
          setLocalPullingModel(active.modelName);
          setLocalPullProgress({ status: active.status, percent: active.percent });
        } else if (!activeModelPull) {
          setLocalPullingModel(null);
          setLocalPullProgress({ status: '', percent: 0 });
        }
      }).catch(() => {});
    }
  }, [activeModelPull]);

  useEffect(() => {
    if (window.jarvisAPI?.onOllamaPullProgress) {
      const unsub = window.jarvisAPI.onOllamaPullProgress((data) => {
        if (!data) return;
        if (data.status === 'success' || data.percent >= 100 || data.completed === true) {
          setLocalPullingModel(null);
          setLocalPullProgress({ status: '', percent: 0 });
          checkOllama();
        } else if (data.status === 'error' || data.error) {
          setLocalPullingModel(null);
          setLocalPullProgress({ status: '', percent: 0 });
        } else {
          setLocalPullingModel(data.modelName);
          setLocalPullProgress({
            status: data.status,
            percent: data.percent,
          });
        }
      });
      return () => unsub();
    }
  }, [checkOllama]);

  const handlePullModel = async (modelTag: string) => {
    const target = modelTag.trim();
    if (!target) return;
    if (onPullModel) {
      await onPullModel(target);
      return;
    }
    setLocalPullingModel(target);
    setLocalPullProgress({ status: 'Starting pull...', percent: 0 });

    try {
      if (window.jarvisAPI?.pullOllamaModel) {
        const res = await window.jarvisAPI.pullOllamaModel({
          modelName: target,
          endpoint: config.ollamaEndpoint,
        });
        if (res?.success) {
          await checkOllama();
          onChangeConfig({ ollamaModel: target });
          setCustomModelInput('');
        }
      }
    } catch (err: any) {
      console.error('Failed to pull model:', err);
    } finally {
      setLocalPullingModel(null);
      setLocalPullProgress({ status: '', percent: 0 });
    }
  };

  const handleDeleteModel = async (modelTag: string) => {
    if (!confirm(`Are you sure you want to delete "${modelTag}" from local Ollama?`)) return;
    setDeletingModel(modelTag);
    try {
      if (window.jarvisAPI?.deleteOllamaModel) {
        await window.jarvisAPI.deleteOllamaModel({
          modelName: modelTag,
          endpoint: config.ollamaEndpoint,
        });
        await checkOllama();
      }
    } catch (err) {
      console.error('Failed to delete model:', err);
    } finally {
      setDeletingModel(null);
    }
  };

  const parseHfRepo = (input: string): string | null => {
    let clean = input.trim();
    if (!clean) return null;
    clean = clean.replace(/^https?:\/\/(www\.)?(huggingface\.co|hf\.co)\//i, '');
    clean = clean.replace(/\/(tree|blob)\/[^/]+.*$/i, '');
    clean = clean.replace(/\/+$/, '');
    const parts = clean.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null;
  };

  const extractQuant = (filename: string): string => {
    const match = filename.match(/[-._]([iI]?[qQ]\d+[_A-Za-z\d]*|f16|f32|bf16)\.gguf$/i);
    if (match) return match[1].toUpperCase();
    return filename.replace(/\.gguf$/i, '');
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || isNaN(bytes)) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  const handleResolveHfRepo = async (rawInput?: string) => {
    const text = rawInput !== undefined ? rawInput : hfInput;
    const repo = parseHfRepo(text);
    if (!repo) {
      setHfError('Enter a valid Hugging Face repository (e.g. bartowski/Llama-3.2-3B-Instruct-GGUF).');
      return;
    }

    setHfLoading(true);
    setHfError(null);
    setHfGgufFiles([]);
    setHfResolvedRepo(null);

    try {
      const res = await fetch(`https://huggingface.co/api/models/${repo}/tree/main`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Repository "${repo}" was not found or is private.`);
        }
        throw new Error(`Hugging Face API returned HTTP ${res.status}`);
      }

      const files = await res.json();
      if (!Array.isArray(files)) {
        throw new Error('Unexpected response format from Hugging Face.');
      }

      const ggufs = files
        .filter((f: any) => f.type === 'file' && f.path && f.path.toLowerCase().endsWith('.gguf'))
        .map((f: any) => {
          const quant = extractQuant(f.path);
          const isRecommended = /q4_k_m/i.test(quant) || /q4_k/i.test(quant);
          return {
            name: f.path,
            size: formatFileSize(f.size),
            quant,
            isRecommended,
          };
        });

      if (ggufs.length === 0) {
        throw new Error(`No .gguf files found in "${repo}". This repository might contain unquantized PyTorch/Safetensors weights instead.`);
      }

      ggufs.sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;
        return a.name.localeCompare(b.name);
      });

      setHfResolvedRepo(repo);
      setHfGgufFiles(ggufs);
      setSelectedHfFile(ggufs[0].name);
    } catch (err: any) {
      setHfError(err.message || 'Failed to inspect Hugging Face repository.');
    } finally {
      setHfLoading(false);
    }
  };

  const handleImportHfModel = async () => {
    if (!hfResolvedRepo || !selectedHfFile) return;
    const fileObj = hfGgufFiles.find(f => f.name === selectedHfFile);
    const tag = fileObj?.quant ? fileObj.quant : selectedHfFile;
    const modelTarget = `hf.co/${hfResolvedRepo}:${tag}`;
    await handlePullModel(modelTarget);
  };

  const handleCustomPull = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (trimmed.includes('huggingface.co') || trimmed.startsWith('hf.co/')) {
      setHfInput(trimmed);
      handleResolveHfRepo(trimmed);
      return;
    }
    handlePullModel(trimmed);
  };

  useEffect(() => {
    if (config.provider === 'ollama') {
      checkOllama();
    }
  }, [config.provider, checkOllama]);

  const handleLaunchOllama = async () => {
    if (window.jarvisAPI?.launchOllama) {
      await window.jarvisAPI.launchOllama();
      setTimeout(checkOllama, 2000);
    }
  };

  const handleOpenExternal = (url: string) => {
    if (window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const testGatewayDirectly = async (provider: string, key?: string, model?: string, endpoint?: string) => {
    const detail = PROVIDER_DETAILS[provider];
    const ep = (endpoint || detail?.endpointDefault || 'http://localhost:8080/v1').replace(/\/+$/, '');
    const apiKey = (key || '').trim();
    const startTime = Date.now();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    if (provider === 'portkey' || ep.includes('portkey.ai')) {
      if (apiKey) headers['x-portkey-api-key'] = apiKey;
      headers['x-portkey-provider'] = 'openai';
    }
    if (provider === 'helicone' || ep.includes('helicone.ai')) {
      if (apiKey) headers['Helicone-Auth'] = `Bearer ${apiKey}`;
    }

    const chosenModel = model || detail?.defaultModel || 'auto';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(`${ep}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: chosenModel,
          messages: [{ role: 'user', content: 'Respond with ONLY "READY".' }],
          max_tokens: 10,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!resp.ok) {
        const errText = await resp.text();
        return { success: false, error: `${detail?.title || provider} error (${resp.status}): ${errText.slice(0, 150)}` };
      }
      const data = await resp.json();
      const latencyMs = Date.now() - startTime;
      return { success: true, latencyMs, reply: data.choices?.[0]?.message?.content?.trim() || 'READY' };
    } catch (err: any) {
      clearTimeout(timeout);
      let errMsg = err.message || '';
      if (errMsg === 'fetch failed' || errMsg.includes('fetch failed') || errMsg.includes('Failed to fetch')) {
        return {
          success: false,
          error: `Could not reach ${detail?.title || provider} at ${ep}. Gateway is offline or not running.`,
        };
      }
      return {
        success: false,
        error: `Could not reach ${detail?.title || provider} at ${ep}. Ensure the router/gateway is running. (${err.message})`,
      };
    }
  };

  const fetchModelsDirectly = async (providerId: string, endpoint?: string, key?: string) => {
    const detail = PROVIDER_DETAILS[providerId];
    const ep = (endpoint || detail?.endpointDefault || 'http://localhost:8080/v1').replace(/\/+$/, '');
    const apiKey = (key || '').trim();
    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    if (providerId === 'portkey' || ep.includes('portkey.ai')) {
      if (apiKey) headers['x-portkey-api-key'] = apiKey;
      headers['x-portkey-provider'] = 'openai';
    }
    if (providerId === 'helicone' || ep.includes('helicone.ai')) {
      if (apiKey) headers['Helicone-Auth'] = `Bearer ${apiKey}`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetch(`${ep}/models`, { headers, signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      let models: string[] = [];
      if (Array.isArray(data.data)) {
        models = data.data.map((m: any) => (typeof m === 'string' ? m : (m.id || m.name || m.model)));
      } else if (Array.isArray(data.models)) {
        models = data.models.map((m: any) => (typeof m === 'string' ? m : (m.id || m.name || m.model)));
      } else if (Array.isArray(data)) {
        models = data.map((m: any) => (typeof m === 'string' ? m : (m.id || m.name || m.model)));
      }
      return { success: true, models: models.filter(Boolean) };
    } catch (err: any) {
      clearTimeout(timeout);
      let errMsg = err.message || '';
      if (errMsg === 'fetch failed' || errMsg.includes('fetch failed') || errMsg.includes('Failed to fetch')) {
        return { success: false, error: `Could not reach ${detail?.title || providerId} at ${ep}. Gateway is offline or not running.` };
      }
      return { success: false, error: `Discovery failed at ${ep}: ${err.message}` };
    }
  };

  const handleTestKey = async (provider: string, key?: string, model?: string, endpoint?: string) => {
    setTesting(provider);
    setTestResult((prev) => ({ ...prev, [provider]: undefined as any }));

    try {
      let res: any = null;
      if (window.jarvisAPI?.testAiKey) {
        res = await window.jarvisAPI.testAiKey({ provider, key, model, endpoint });
      }
      // If Electron IPC returned "Unknown provider" or IPC wasn't present, fall back to direct fetch
      if (!res || (!res.success && (res.error?.includes('Unknown provider') || !window.jarvisAPI?.testAiKey))) {
        res = await testGatewayDirectly(provider, key, model, endpoint);
      }
      if (res && res.success) {
        setTestResult((prev) => ({
          ...prev,
          [provider]: {
            success: true,
            message: `Verified in ${res.latencyMs}ms (${res.reply || 'Ready'})`,
          },
        }));
      } else {
        const detail = PROVIDER_DETAILS[provider];
        let errMsg = res?.error || 'Invalid API Key or Provider offline';
        if (errMsg === 'fetch failed' || errMsg.includes('fetch failed') || errMsg.includes('Unknown provider')) {
          errMsg = `Could not reach ${detail?.title || provider} at ${endpoint || detail?.endpointDefault || 'gateway endpoint'}. Gateway server is offline or not running.`;
        }
        setTestResult((prev) => ({
          ...prev,
          [provider]: {
            success: false,
            message: errMsg,
          },
        }));
      }
    } catch (err: any) {
      const detail = PROVIDER_DETAILS[provider];
      let errMsg = err.message || 'Connection failed';
      if (errMsg === 'fetch failed' || errMsg.includes('fetch failed') || errMsg.includes('Failed to fetch')) {
        errMsg = `Could not reach ${detail?.title || provider} at ${endpoint || detail?.endpointDefault || 'gateway endpoint'}. Gateway server is offline or not running.`;
      }
      setTestResult((prev) => ({
        ...prev,
        [provider]: {
          success: false,
          message: errMsg,
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleFetchModels = async (providerId: string, endpoint?: string, key?: string) => {
    setFetchingModels(providerId);
    setTestResult((prev) => ({ ...prev, [providerId]: undefined as any }));

    try {
      let res: any = null;
      if (window.jarvisAPI?.fetchProviderModels) {
        res = await window.jarvisAPI.fetchProviderModels({ provider: providerId, key, endpoint });
      }
      // Fallback to direct fetch if IPC returns unknown provider
      if (!res || (!res.success && (res.error?.includes('Unknown provider') || !window.jarvisAPI?.fetchProviderModels))) {
        res = await fetchModelsDirectly(providerId, endpoint, key);
      }
      if (res && res.success && Array.isArray(res.models)) {
        setFetchedModels((prev) => ({ ...prev, [providerId]: res.models || [] }));
        const updatedCache = {
          ...(config.cachedProviderModels || {}),
          [providerId]: res.models || [],
        };
        onChangeConfig({ cachedProviderModels: updatedCache });
        if (window.jarvisAPI?.saveConfig) {
          window.jarvisAPI.saveConfig({ cachedProviderModels: updatedCache });
        }
        setTestResult((prev) => ({
          ...prev,
          [providerId]: {
            success: true,
            message: `Discovered ${res.models?.length || 0} models from gateway.`,
          },
        }));
        const detail = PROVIDER_DETAILS[providerId];
        if (detail?.modelField) {
          const cur = (cfg[detail.modelField] as string) || '';
          if ((!cur || cur === 'auto' || cur === 'omnirouter/auto') && res.models.length > 0) {
            const hasAuto = res.models.some((m) => m === 'auto' || m.includes('/auto'));
            if (!hasAuto) {
              setField(detail.modelField, res.models[0]);
            }
          }
        }
      } else {
        const detail = PROVIDER_DETAILS[providerId];
        let errMsg = res?.error || 'Failed to fetch models from provider.';
        if (errMsg === 'fetch failed' || errMsg.includes('fetch failed') || errMsg.includes('Failed to fetch')) {
          errMsg = `Could not reach ${detail?.title || providerId} at ${endpoint || detail?.endpointDefault || 'gateway endpoint'}. Gateway server is offline or not running.`;
        }
        setTestResult((prev) => ({
          ...prev,
          [providerId]: {
            success: false,
            message: errMsg,
          },
        }));
      }
    } catch (err: any) {
      const detail = PROVIDER_DETAILS[providerId];
      let errMsg = err.message || 'Model discovery failed';
      if (errMsg === 'fetch failed' || errMsg.includes('fetch failed') || errMsg.includes('Failed to fetch')) {
        errMsg = `Could not reach ${detail?.title || providerId} at ${endpoint || detail?.endpointDefault || 'gateway endpoint'}. Gateway server is offline or not running.`;
      }
      setTestResult((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          message: errMsg,
        },
      }));
    } finally {
      setFetchingModels(null);
    }
  };


  const getOptionsForProvider = (providerId: string, currentValue?: string): GlideSelectOption[] => {
    if (providerId === 'ollama') {
      const installed = (ollamaStatus.models || []).filter(Boolean);
      if (installed.length === 0) {
        return [
          {
            value: '',
            label: 'No models installed (install below)',
            tag: 'Empty',
          },
        ];
      }
      return installed.map((m) => {
        let tag = 'Installed';
        const lower = m.toLowerCase();
        if (lower.includes('coder') || lower.includes('qwen')) tag = 'Coding';
        else if (lower.includes('deepseek')) tag = 'Reasoning';
        else if (lower.includes('llama')) tag = 'Meta';
        else if (lower.includes('mistral')) tag = 'Mistral';
        else if (lower.includes('phi')) tag = 'Microsoft';
        else if (lower.includes('moondream')) tag = 'Vision';
        return { value: m, label: m, tag };
      });
    }

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
    {
      id: 'anthropic',
      label: 'Claude (Anthropic)',
      subLabel: 'Opus 4.1 & Sonnet 4.5',
      badge: config.anthropicModel || 'claude-sonnet-4-5',
      tag: 'Paid Official',
      Logo: AnthropicLogo,
    },
    {
      id: 'kimi',
      label: 'Kimi (Moonshot AI)',
      subLabel: 'Kimi K2 & 128K Context',
      badge: config.kimiModel || 'kimi-k2-0711-preview',
      tag: 'Paid Official',
      Logo: KimiLogo,
    },
    {
      id: 'mistral',
      label: 'Mistral AI',
      subLabel: 'Mistral Large & Codestral',
      badge: config.mistralModel || 'mistral-large-latest',
      tag: 'Paid Official',
      Logo: MistralLogo,
    },
    {
      id: 'perplexity',
      label: 'Perplexity (Sonar)',
      subLabel: 'Live Web Search Models',
      badge: config.perplexityModel || 'sonar-pro',
      tag: 'Paid Official',
      Logo: PerplexityLogo,
    },
    {
      id: 'cohere',
      label: 'Cohere',
      subLabel: 'Command A & R+',
      badge: config.cohereModel || 'command-a-03-2025',
      tag: 'Paid Official',
      Logo: CohereLogo,
    },
    {
      id: 'glm',
      label: 'Zhipu GLM (Z.ai)',
      subLabel: 'GLM-4.5 Reasoning',
      badge: config.glmModel || 'glm-4.5',
      tag: 'Paid Official',
      Logo: GlmLogo,
    },
    {
      id: 'minimax',
      label: 'MiniMax',
      subLabel: 'MiniMax-M1 1M Context',
      badge: config.minimaxModel || 'MiniMax-M1',
      tag: 'Paid Official',
      Logo: MiniMaxLogo,
    },
    {
      id: 'together',
      label: 'Together AI',
      subLabel: 'Dedicated Cloud Inference',
      badge: config.togetherModel || 'Llama-4-Maverick-17B',
      tag: 'Pay-As-You-Go',
      Logo: TogetherLogo,
    },
  ];

  // Free Category Providers (Current providers + Grokki Cloud Free)
  const freeProviders: ProviderCardInfo[] = [
    {
      id: 'grokki_free',
      label: 'Grokki Cloud (Free)',
      subLabel: 'Automatic Free-Tier Rotator & Failover',
      badge: 'auto',
      tag: 'Auto-Rotator',
      Logo: GrokkiCloudLogo,
    },
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
      id: 'openrouter',
      label: 'OpenRouter',
      subLabel: 'Multi-Model Free Tier',
      badge: config.openrouterModel || 'openrouter/auto',
      tag: 'Free Tier',
      Logo: OpenRouterLogo,
    },
    {
      id: 'omniroute',
      label: 'OmniRoute',
      subLabel: 'Universal AI Gateway',
      badge: config.omnirouteModel || config.omnirouterModel || 'auto',
      tag: 'Local / Remote Gateway',
      Logo: OmniRouteLogo,
    },
  ];

  // Local Providers (Air-gapped / on-device)
  const localProviders: ProviderCardInfo[] = [
    {
      id: 'ollama',
      label: 'Ollama Local',
      subLabel: !ollamaStatus.installed && ollamaStatus.checked
        ? 'Not Installed'
        : ollamaStatus.models.length === 0
        ? '0 Models Installed'
        : `${ollamaStatus.models.length} model${ollamaStatus.models.length === 1 ? '' : 's'} ready`,
      badge: !ollamaStatus.installed && ollamaStatus.checked
        ? 'Download Required'
        : ollamaStatus.models.length === 0
        ? 'Install Required'
        : (config.ollamaModel || ollamaStatus.models[0] || 'llama3.2'),
      tag: '100% Free Air-Gap',
      Logo: OllamaLogo,
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
    } else if (providerId === 'anthropic' && !config.anthropicModel) {
      patch.anthropicModel = 'claude-sonnet-4-5';
    } else if (providerId === 'kimi' && !config.kimiModel) {
      patch.kimiModel = 'kimi-k2-0711-preview';
    } else if (providerId === 'mistral' && !config.mistralModel) {
      patch.mistralModel = 'mistral-large-latest';
    } else if (providerId === 'perplexity' && !config.perplexityModel) {
      patch.perplexityModel = 'sonar-pro';
    } else if (providerId === 'cohere' && !config.cohereModel) {
      patch.cohereModel = 'command-a-03-2025';
    } else if (providerId === 'glm' && !config.glmModel) {
      patch.glmModel = 'glm-4.5';
    } else if (providerId === 'minimax' && !config.minimaxModel) {
      patch.minimaxModel = 'MiniMax-M1';
    } else if (providerId === 'together' && !config.togetherModel) {
      patch.togetherModel = 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8';
    } else if ((providerId === 'omniroute' || providerId === 'omnirouter') && !config.omnirouteModel) {
      patch.omnirouteModel = config.omnirouterModel || 'auto';
    } else if (providerId === 'litellm' && !config.litellmModel) {
      patch.litellmModel = 'gpt-4o';
    } else if (providerId === 'bifrost' && !config.bifrostModel) {
      patch.bifrostModel = 'auto';
    } else if (providerId === 'portkey' && !config.portkeyModel) {
      patch.portkeyModel = 'auto';
    } else if (providerId === 'helicone' && !config.heliconeModel) {
      patch.heliconeModel = 'gpt-4o';
    } else if (providerId === 'routellm' && !config.routellmModel) {
      patch.routellmModel = 'router-mf';
    } else if (providerId === 'newapi' && !config.newapiModel) {
      patch.newapiModel = 'auto';
    } else if (providerId === 'higress' && !config.higressModel) {
      patch.higressModel = 'auto';
    } else if (providerId === 'clawrouter' && !config.clawrouterModel) {
      patch.clawrouterModel = 'auto';
    } else if (providerId === 'freellmapi' && !config.freellmapiModel) {
      patch.freellmapiModel = 'auto';
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
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={fetchingModels === providerId}
              onClick={() => {
                const detail = PROVIDER_DETAILS[providerId];
                const ep = detail?.endpointField ? cfg[detail.endpointField] : undefined;
                const k = detail?.keyField ? cfg[detail.keyField] : undefined;
                handleFetchModels(providerId, ep, k);
              }}
              className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 transition-colors disabled:opacity-50"
              title="Fetch latest models directly from gateway"
            >
              <RefreshCw className={`w-3 h-3 ${fetchingModels === providerId ? 'animate-spin' : ''}`} />
              <span>{fetchingModels === providerId ? 'Fetching...' : 'Fetch models'}</span>
            </button>
            <span className="text-gray-300 dark:text-[#252836] select-none">|</span>
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

  // Check if active config provider is present in current category or local section
  const isActiveInCurrentCategory =
    currentProviders.some((p) => p.id === config.provider) ||
    localProviders.some((p) => p.id === config.provider);
  const otherCategory: Category = category === 'paid' ? 'free' : 'paid';
  const activeInOther = (category === 'paid' ? freeProviders : paidProviders).find(
    (p) => p.id === config.provider
  );

  // Check if a provider is already configured with keys / local setup
  const isProviderConfigured = (providerId: AiProvider): boolean => {
    if (providerId === 'grokki_free') {
      return Boolean(
        (cfg.grokkiFreeProxyUrl || '').trim() ||
        (cfg.groqApiKey || '').trim() ||
        (cfg.geminiApiKey || '').trim() ||
        (cfg.openrouterApiKey || '').trim() ||
        (ollamaStatus.installed && ollamaStatus.models.length > 0)
      );
    }
    if (providerId === 'ollama') {
      return Boolean(ollamaStatus.installed && ollamaStatus.models.length > 0);
    }
    const meta = PROVIDER_DETAILS[providerId];
    if (!meta) return false;
    if (meta.keyField && String(cfg[meta.keyField] || '').trim()) return true;
    if (!meta.keyField && meta.endpointField && String(cfg[meta.endpointField] || '').trim()) return true;
    return false;
  };

  // Configuration card for the selected provider
  const activeConfigId = configuringProvider || config.provider;
  const detail = PROVIDER_DETAILS[activeConfigId];
  const activeCard = [...currentProviders, ...paidProviders, ...freeProviders, ...localProviders].find(
    (p) => p.id === activeConfigId
  );
  const ActiveLogo = activeCard?.Logo;

  const renderConfigCard = () => {
    if (!detail) return null;

    const providerId = activeConfigId as string;
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

        {/* Ollama installation / status alert */}
        {providerId === 'ollama' && (
          <div>
            {!ollamaStatus.checked || ollamaStatus.loading ? (
              <div className="rounded-xl p-3.5 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Checking local Ollama installation...
                </span>
              </div>
            ) : !ollamaStatus.installed ? (
              <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="m-0 text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      Ollama is not installed on this PC
                    </h4>
                    <p className="m-0 mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                      To run models locally without an API key, download and install Ollama.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleOpenExternal('https://ollama.com/download')}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white border-none cursor-pointer shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Ollama</span>
                  </button>
                  <button
                    type="button"
                    onClick={checkOllama}
                    disabled={ollamaStatus.loading}
                    title="Check again"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${ollamaStatus.loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            ) : !ollamaStatus.running ? (
              <div className="rounded-xl p-4 border border-gray-200 dark:border-white/[0.08] bg-gray-100/70 dark:bg-[#14151a] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/[0.08] text-gray-800 dark:text-zinc-200 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                    <Play className="w-4 h-4 ml-0.5" />
                  </div>
                  <div>
                    <h4 className="m-0 text-xs font-semibold text-gray-900 dark:text-gray-100">
                      Ollama is installed, but daemon is stopped
                    </h4>
                    <p className="m-0 mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                      Start Ollama to serve local model completions.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleLaunchOllama}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-gray-900 border-none cursor-pointer shadow-sm transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Start Ollama</span>
                  </button>
                  <button
                    type="button"
                    onClick={checkOllama}
                    disabled={ollamaStatus.loading}
                    title="Check again"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${ollamaStatus.loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl py-3 px-6 border border-gray-500/20 bg-gray-500/10 dark:bg-gray-500/[0.08] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-300 truncate">
                    Ollama is running & connected {ollamaStatus.models.length > 0 ? `â€¢ ${ollamaStatus.models.length} model${ollamaStatus.models.length === 1 ? '' : 's'} available` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={checkOllama}
                  disabled={ollamaStatus.loading}
                  title="Re-check"
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-500/20 bg-gray-500/10 hover:bg-gray-500/20 text-gray-700 dark:text-gray-300 transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${ollamaStatus.loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gateway Service Setup & Command Helper */}
        {detail.isGateway && (
          <div className="rounded-xl p-3.5 border border-sky-500/20 bg-sky-500/5 dark:bg-sky-500/[0.04] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Local Gateway Service</span>
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                {detail.endpointDefault || 'http://localhost'}
              </span>
            </div>
            <p className="m-0 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {detail.title} runs locally on your PC. If test connection or model fetch fails, start the gateway server using the command below:
            </p>
            {detail.quickstartCmd && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#12141a] border border-gray-200 dark:border-[#1e2029]">
                <code className="text-[11px] font-mono text-gray-800 dark:text-gray-200 truncate select-all">
                  {detail.quickstartCmd}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(detail.quickstartCmd!);
                    setCopiedCmd(providerId);
                    setTimeout(() => setCopiedCmd(null), 2000);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-white dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10 cursor-pointer shrink-0 transition-all"
                >
                  {copiedCmd === providerId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd === providerId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Grokki Cloud (Free) Rotation Pool & Mode */}
        {providerId === 'grokki_free' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gray-50 dark:bg-[#14151a] border border-gray-200 dark:border-white/[0.08]">
              <div>
                <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                  Rotation Mode
                </div>
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                  Failover uses providers in priority order; Round-Robin balances across all ready providers.
                </div>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-200/70 dark:bg-black/40 border border-gray-200 dark:border-white/[0.06] self-start sm:self-auto">
                {(['failover', 'round-robin'] as const).map((mode) => {
                  const active = (config.grokkiFreeRotationMode || 'failover') === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onChangeConfig({ grokkiFreeRotationMode: mode })}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold border-none cursor-pointer transition-colors ${
                        active
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                          : 'bg-transparent text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {mode === 'failover' ? 'Smart Failover' : 'Round-Robin'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-200 dark:divide-white/[0.06] overflow-hidden">
              {[
                { id: 'groq' as AiProvider, label: 'Groq Cloud', ready: Boolean((cfg.groqApiKey || '').trim()) },
                { id: 'gemini' as AiProvider, label: 'Google Gemini (Free Tier)', ready: Boolean((cfg.geminiApiKey || '').trim()) },
                { id: 'openrouter' as AiProvider, label: 'OpenRouter (:free)', ready: Boolean((cfg.openrouterApiKey || '').trim()) },
                { id: 'ollama' as AiProvider, label: 'Ollama Local (Fallback)', ready: Boolean(ollamaStatus.installed && ollamaStatus.models.length > 0) },
              ].map((poolItem) => (
                <div
                  key={poolItem.id}
                  className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[#0f0f13] text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        poolItem.ready ? 'bg-zinc-900 dark:bg-white' : 'bg-gray-300 dark:bg-zinc-700'
                      }`}
                    />
                    <span className="font-medium text-gray-800 dark:text-zinc-200">{poolItem.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                      {poolItem.ready ? 'Ready in pool' : 'Not configured'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfiguringProvider(poolItem.id)}
                      className="text-[11px] font-medium text-gray-700 dark:text-zinc-300 hover:underline bg-transparent border-none cursor-pointer p-0"
                    >
                      {poolItem.ready ? 'Edit' : 'Add'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

          <button
            type="button"
            disabled={fetchingModels === providerId}
            onClick={() => {
              const ep = detail.endpointField ? cfg[detail.endpointField] : undefined;
              const k = detail.keyField ? cfg[detail.keyField] : undefined;
              handleFetchModels(providerId, ep, k);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-[#1a1c24] dark:hover:bg-[#222530] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#252836] cursor-pointer transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingModels === providerId ? 'animate-spin' : ''}`} />
            <span>Fetch all models</span>
          </button>

          {result && (
            <span className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 min-w-0">
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-white flex-shrink-0" />
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

  const renderOllamaLibrarySection = () => {
    const filteredCatalog = OLLAMA_MODEL_CATALOG.filter((item) => {
      if (ollamaCategoryFilter !== 'All' && item.category !== ollamaCategoryFilter) return false;
      if (ollamaHardwareFilter === 'fits' && item.minVramGb > systemRamGb) return false;
      if (ollamaHardwareFilter === '4' && item.minVramGb > 4) return false;
      if (ollamaHardwareFilter === '8' && item.minVramGb > 8) return false;
      if (ollamaHardwareFilter === '16' && item.minVramGb > 16) return false;
      if (ollamaHardwareFilter === '32' && item.minVramGb < 24) return false;
      if (ollamaSearch.trim()) {
        const q = ollamaSearch.toLowerCase();
        if (
          !item.name.toLowerCase().includes(q) &&
          !item.tag.toLowerCase().includes(q) &&
          !item.brand.toLowerCase().includes(q) &&
          !item.desc.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    return (
      <section className="flex flex-col gap-5 mt-2">
        {/* Hardware Turbo Boost Card (Monochrome) */}
        <div className="p-4 rounded-2xl border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#0f0f13] flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Ollama Hardware Turbo Mode
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              Cuts VRAM usage by ~50%, accelerates token replies, and unloads idle models automatically.
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleTurbo}
            disabled={turboApplying}
            className={`px-4 py-2 rounded-lg text-xs font-semibold border-none cursor-pointer shrink-0 transition-all disabled:opacity-50 ${
              turboOptimized
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-white/[0.08] text-gray-800 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-white/[0.14]'
            }`}
          >
            {turboApplying ? 'Applying...' : turboOptimized ? 'Turbo Active' : 'Enable Turbo'}
          </button>
        </div>

        {/* Installed Local Models */}
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SectionLabel>Installed Local Models</SectionLabel>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-zinc-300 -mt-2">
                {ollamaStatus.models.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleOpenExternal('https://ollama.com/library')}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white bg-transparent border-none cursor-pointer p-0"
            >
              <span>Browse Ollama Library</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {ollamaStatus.models.length > 0 ? (
            <div className={`${SURFACE} rounded-2xl overflow-hidden flex flex-col divide-y divide-[#e4e4eb] dark:divide-[#1e2029]`}>
              {ollamaStatus.models.map((m) => {
                const isActive = (cfg.ollamaModel || 'llama3.2') === m;
                return (
                  <div
                    key={m}
                    onClick={() => setField('ollamaModel', m)}
                    className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isActive ? 'bg-gray-50 dark:bg-[#161822]' : 'hover:bg-gray-50 dark:hover:bg-[#161822]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <OllamaLogo className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100 truncate">
                        {m}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900">
                          Active
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOllamaModel(m);
                      }}
                      title="Delete model"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 bg-transparent border-none cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-4 rounded-2xl border border-dashed border-[#e4e4eb] dark:border-[#1e2029] text-xs text-gray-500 dark:text-zinc-400">
              No models installed yet. Pick any model below to download.
            </div>
          )}
        </div>

        {/* Active Pull Progress Banner (Monochrome) */}
        {activePullingModel && (
          <div className="rounded-2xl p-4 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f0f13] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-700 dark:text-zinc-200" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Downloading {activePullingModel}...
                </span>
              </div>
              <span className="font-mono text-gray-700 dark:text-zinc-300 text-[11px]">
                {activePullProgress.percent > 0 ? `${activePullProgress.percent}%` : activePullProgress.status || 'Starting...'}
              </span>
            </div>
            {activePullProgress.percent > 0 && (
              <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gray-900 dark:bg-white transition-all duration-300 rounded-full"
                  style={{ width: `${activePullProgress.percent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Downloadable Models List Column with Hardware (VRAM/RAM) & Category Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <SectionLabel>Download Models ({filteredCatalog.length})</SectionLabel>
            <span className="text-[11px] font-mono text-gray-500 dark:text-zinc-400">
              Detected RAM: {systemRamGb} GB
            </span>
          </div>

          {/* Search + Hardware + Category Filters */}
          <div className="flex flex-col gap-2.5">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={ollamaSearch}
                onChange={(e) => setOllamaSearch(e.target.value)}
                placeholder="Search models (Llama, Qwen, DeepSeek, Gemma, Mistral, Phi...)"
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 dark:border-[#1e2029] bg-white dark:bg-[#0f0f13] text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none focus:border-gray-400 dark:focus:border-white/25"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* VRAM / RAM Filter */}
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'all', label: 'All Sizes' },
                    { id: 'fits', label: `Fits My PC (${systemRamGb}GB)` },
                    { id: '4', label: 'â‰¤ 4 GB' },
                    { id: '8', label: 'â‰¤ 8 GB' },
                    { id: '16', label: 'â‰¤ 16 GB' },
                    { id: '32', label: '24+ GB' },
                  ] as const
                ).map((hw) => (
                  <button
                    key={hw.id}
                    type="button"
                    onClick={() => setOllamaHardwareFilter(hw.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                      ollamaHardwareFilter === hw.id
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                        : 'bg-transparent border-gray-200 dark:border-white/[0.08] text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {hw.label}
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap items-center gap-1">
                {(['All', 'General', 'Coding', 'Reasoning', 'Vision'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setOllamaCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                      ollamaCategoryFilter === cat
                        ? 'bg-gray-200 dark:bg-white/[0.14] text-gray-900 dark:text-white border-transparent'
                        : 'bg-transparent border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List Column of All Models */}
          <div className={`${SURFACE} rounded-2xl overflow-hidden flex flex-col divide-y divide-[#e4e4eb] dark:divide-[#1e2029]`}>
            {filteredCatalog.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 dark:text-zinc-400">
                No models match your current hardware/search filter.
              </div>
            ) : (
              filteredCatalog.map((item) => {
                const isInstalled = ollamaStatus.models.some(
                  (m) => m === item.tag || m.startsWith(`${item.tag}:`)
                );
                const isThisPulling =
                  !!activePullingModel &&
                  (activePullingModel === item.tag ||
                    activePullingModel.split(':')[0] === item.tag.split(':')[0]);
                const BrandLogo = item.Logo;

                return (
                  <div
                    key={item.tag}
                    className="flex items-center justify-between gap-3.5 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-[#161822] transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 text-gray-900 dark:text-gray-100">
                        <BrandLogo className="w-[18px] h-[18px]" />
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-zinc-300">
                            {item.size}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-zinc-400">
                            {item.minVramGb}GB+ RAM/VRAM
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-zinc-400">
                            {item.category}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                          {item.brand} Â· <span className="font-mono">{item.tag}</span> â€” {item.desc}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isInstalled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Installed</span>
                        </span>
                      ) : isThisPulling ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{activePullProgress.percent > 0 ? `${activePullProgress.percent}%` : 'Pulling...'}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePullModel(item.tag)}
                          disabled={!!activePullingModel}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 dark:bg-white hover:opacity-90 text-white dark:text-gray-900 border-none cursor-pointer transition-opacity disabled:opacity-40"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Install</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Custom Model Pull Input */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <input
              type="text"
              value={customModelInput}
              onChange={(e) => setCustomModelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomPull(customModelInput);
                }
              }}
              placeholder="Or pull any custom Ollama tag (e.g. llama3.2:latest, hf.co/...)"
              disabled={!!activePullingModel}
              className="flex-1 w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-[#252836] bg-white dark:bg-[#0f0f13] text-xs font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-gray-400 dark:focus:border-white/25 transition-all"
            />
            <button
              type="button"
              onClick={() => handleCustomPull(customModelInput)}
              disabled={!customModelInput.trim() || !!activePullingModel}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 border-none cursor-pointer transition-opacity disabled:opacity-40 whitespace-nowrap w-full sm:w-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pull Model</span>
            </button>
          </div>
        </div>
      </section>
    );
  };

  const categoryTabClass = (value: Category) =>
    `inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer border-none transition-all ${
      category === value
        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
        : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    }`;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <AnimatePresence mode="wait">
        {configuringProvider === null ? (
          <motion.div
            key="provider-list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            {/* Header */}
            <header className="flex flex-col mt-6 sm:flex-row sm:items-end justify-between gap-4">

              {/* Paid vs Free segmented control */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#13141a] p-1.5 rounded-xl border border-gray-200 dark:border-[#1e2029] self-start sm:self-auto">
                <button type="button" onClick={() => setCategory('paid')} className={categoryTabClass('paid')}>
                  <span>Paid Providers (BYOK)</span>
                </button>
                <button type="button" onClick={() => setCategory('free')} className={categoryTabClass('free')}>
                  <span>Free Providers</span>
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
                aria-label="AI provider"
                className={`${SURFACE} rounded-2xl overflow-hidden flex flex-col divide-y divide-[#e4e4eb] dark:divide-[#1e2029]`}
              >
                {currentProviders.map((p) => {
                  const isSelected = config.provider === p.id;
                  const configured = isProviderConfigured(p.id);
                  const Logo = p.Logo;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        handleSelectProvider(p.id);
                        setConfiguringProvider(p.id);
                      }}
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

                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-zinc-400 flex-shrink-0"
                        aria-hidden="true"
                      >
                        {configured ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Local Provider Section */}
            <section>
              <SectionLabel>Local Provider</SectionLabel>
              <div
                aria-label="Local AI provider"
                className={`${SURFACE} rounded-2xl overflow-hidden flex flex-col divide-y divide-[#e4e4eb] dark:divide-[#1e2029]`}
              >
                {localProviders.map((p) => {
                  const isSelected = config.provider === p.id;
                  const configured = isProviderConfigured(p.id);
                  const Logo = p.Logo;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        handleSelectProvider(p.id);
                        setConfiguringProvider(p.id);
                      }}
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

                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-zinc-400 flex-shrink-0"
                        aria-hidden="true"
                      >
                        {configured ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key={`provider-config-${configuringProvider}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex flex-col gap-4 mt-2"
          >
            <button
              type="button"
              onClick={() => setConfiguringProvider(null)}
              className="inline-flex items-center gap-2 w-fit px-1 py-1 text-[13px] text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white bg-transparent border-none cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to providers</span>
            </button>

            {detail && renderConfigCard()}
            {activeConfigId === 'ollama' && ollamaStatus.installed && renderOllamaLibrarySection()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
