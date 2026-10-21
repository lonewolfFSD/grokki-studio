import Prism from 'prismjs';

// Import essential Prism grammars
import 'prismjs/components/prism-markup'; // HTML, XML, SVG
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';

const LANGUAGE_MAP: Record<string, string> = {
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  mathml: 'markup',
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  golang: 'go',
  rs: 'rust',
  cplusplus: 'cpp',
  'c++': 'cpp',
  react: 'tsx',
  md: 'markdown',
};

/**
 * Highlights raw code with Prism syntax tokens.
 * Falls back safely to escaped HTML if language grammar is unavailable.
 */
export function highlightCode(code: string, language?: string): string {
  if (!code) return '';
  const cleanLang = (language || '').toLowerCase().trim();
  const grammarKey = LANGUAGE_MAP[cleanLang] || cleanLang;
  const grammar = Prism.languages[grammarKey];

  if (grammar) {
    try {
      return Prism.highlight(code, grammar, grammarKey);
    } catch (e) {
      console.warn('[SyntaxHighlight] Prism highlight failed for', grammarKey, e);
    }
  }

  // Fallback: safe HTML escaping
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
