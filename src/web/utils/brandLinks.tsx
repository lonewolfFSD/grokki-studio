import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  FaGithub,
  FaGitlab,
  FaYoutube,
  FaGoogleDrive,
  FaGoogle,
  FaXTwitter,
  FaDiscord,
  FaFigma,
  FaReddit,
  FaSpotify,
  FaLinkedin,
  FaStackOverflow,
  FaWhatsapp,
  FaTelegram,
  FaNpm,
  FaWikipediaW,
  FaAmazon,
  FaTwitch,
  FaMedium,
  FaDribbble,
  FaSlack,
  FaTrello,
  FaJira,
  FaBitbucket,
  FaDocker,
  FaPython,
  FaRust,
  FaNodeJs,
  FaApple,
  FaMicrosoft,
  FaInstagram,
  FaTiktok,
  FaFacebook,
  FaPinterest,
  FaThreads,
  FaBluesky,
} from 'react-icons/fa6';
import { Globe, FileSpreadsheet, FileText, BookOpen, Triangle } from 'lucide-react';

export const GROKKI_BLUE = '#38bdf8';

export interface BrandInfo {
  id: string;
  name: string;
  color: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  match: (url: string) => boolean;
}

export const BRANDS: BrandInfo[] = [
  {
    id: 'github',
    name: 'GitHub',
    color: GROKKI_BLUE,
    Icon: FaGithub,
    match: (u) =>
      /github\.com/i.test(u) ||
      /github\.io/i.test(u) ||
      /raw\.githubusercontent\.com/i.test(u) ||
      /gist\.github\.com/i.test(u),
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    color: GROKKI_BLUE,
    Icon: FaGitlab,
    match: (u) => /gitlab\.com/i.test(u),
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    color: GROKKI_BLUE,
    Icon: FaBitbucket,
    match: (u) => /bitbucket\.org/i.test(u),
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: GROKKI_BLUE,
    Icon: FaYoutube,
    match: (u) => /youtube\.com/i.test(u) || /youtu\.be/i.test(u),
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    color: GROKKI_BLUE,
    Icon: FileSpreadsheet,
    match: (u) => /docs\.google\.com\/spreadsheets/i.test(u) || /sheets\.google\.com/i.test(u),
  },
  {
    id: 'google-docs',
    name: 'Google Docs',
    color: GROKKI_BLUE,
    Icon: FileText,
    match: (u) => /docs\.google\.com\/document/i.test(u),
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    color: GROKKI_BLUE,
    Icon: FaGoogleDrive,
    match: (u) => /drive\.google\.com/i.test(u),
  },
  {
    id: 'google',
    name: 'Google',
    color: GROKKI_BLUE,
    Icon: FaGoogle,
    match: (u) => /google\.com/i.test(u) || /mail\.google\.com/i.test(u),
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    color: GROKKI_BLUE,
    Icon: FaXTwitter,
    match: (u) => /twitter\.com/i.test(u) || /(?:^|\/\/|\.)x\.com/i.test(u),
  },
  {
    id: 'discord',
    name: 'Discord',
    color: GROKKI_BLUE,
    Icon: FaDiscord,
    match: (u) => /discord\.com/i.test(u) || /discord\.gg/i.test(u),
  },
  {
    id: 'figma',
    name: 'Figma',
    color: GROKKI_BLUE,
    Icon: FaFigma,
    match: (u) => /figma\.com/i.test(u),
  },
  {
    id: 'notion',
    name: 'Notion',
    color: GROKKI_BLUE,
    Icon: BookOpen,
    match: (u) => /notion\.so/i.test(u) || /notion\.site/i.test(u),
  },
  {
    id: 'vercel',
    name: 'Vercel',
    color: GROKKI_BLUE,
    Icon: Triangle,
    match: (u) => /vercel\.com/i.test(u) || /vercel\.app/i.test(u),
  },
  {
    id: 'reddit',
    name: 'Reddit',
    color: GROKKI_BLUE,
    Icon: FaReddit,
    match: (u) => /reddit\.com/i.test(u) || /redd\.it/i.test(u),
  },
  {
    id: 'spotify',
    name: 'Spotify',
    color: GROKKI_BLUE,
    Icon: FaSpotify,
    match: (u) => /spotify\.com/i.test(u),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: GROKKI_BLUE,
    Icon: FaLinkedin,
    match: (u) => /linkedin\.com/i.test(u),
  },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    color: GROKKI_BLUE,
    Icon: FaStackOverflow,
    match: (u) => /stackoverflow\.com/i.test(u) || /stackexchange\.com/i.test(u),
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    color: GROKKI_BLUE,
    Icon: FaWhatsapp,
    match: (u) => /whatsapp\.com/i.test(u) || /wa\.me/i.test(u),
  },
  {
    id: 'telegram',
    name: 'Telegram',
    color: GROKKI_BLUE,
    Icon: FaTelegram,
    match: (u) => /t\.me/i.test(u) || /telegram\.me/i.test(u) || /telegram\.org/i.test(u),
  },
  {
    id: 'npm',
    name: 'npm',
    color: GROKKI_BLUE,
    Icon: FaNpm,
    match: (u) => /npmjs\.com/i.test(u),
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    color: GROKKI_BLUE,
    Icon: FaWikipediaW,
    match: (u) => /wikipedia\.org/i.test(u),
  },
  {
    id: 'amazon',
    name: 'Amazon',
    color: GROKKI_BLUE,
    Icon: FaAmazon,
    match: (u) => /amazon\.[a-z.]+/i.test(u) || /amzn\.to/i.test(u),
  },
  {
    id: 'twitch',
    name: 'Twitch',
    color: GROKKI_BLUE,
    Icon: FaTwitch,
    match: (u) => /twitch\.tv/i.test(u),
  },
  {
    id: 'medium',
    name: 'Medium',
    color: GROKKI_BLUE,
    Icon: FaMedium,
    match: (u) => /medium\.com/i.test(u),
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    color: GROKKI_BLUE,
    Icon: FaDribbble,
    match: (u) => /dribbble\.com/i.test(u),
  },
  {
    id: 'slack',
    name: 'Slack',
    color: GROKKI_BLUE,
    Icon: FaSlack,
    match: (u) => /slack\.com/i.test(u),
  },
  {
    id: 'trello',
    name: 'Trello',
    color: GROKKI_BLUE,
    Icon: FaTrello,
    match: (u) => /trello\.com/i.test(u),
  },
  {
    id: 'jira',
    name: 'Jira',
    color: GROKKI_BLUE,
    Icon: FaJira,
    match: (u) => /atlassian\.net/i.test(u) || /jira\.com/i.test(u),
  },
  {
    id: 'docker',
    name: 'Docker',
    color: GROKKI_BLUE,
    Icon: FaDocker,
    match: (u) => /docker\.com/i.test(u) || /hub\.docker\.com/i.test(u),
  },
  {
    id: 'python',
    name: 'Python / PyPI',
    color: GROKKI_BLUE,
    Icon: FaPython,
    match: (u) => /python\.org/i.test(u) || /pypi\.org/i.test(u),
  },
  {
    id: 'rust',
    name: 'Rust / Crates',
    color: GROKKI_BLUE,
    Icon: FaRust,
    match: (u) => /rust-lang\.org/i.test(u) || /crates\.io/i.test(u) || /docs\.rs/i.test(u),
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    color: GROKKI_BLUE,
    Icon: FaNodeJs,
    match: (u) => /nodejs\.org/i.test(u),
  },
  {
    id: 'apple',
    name: 'Apple',
    color: GROKKI_BLUE,
    Icon: FaApple,
    match: (u) => /apple\.com/i.test(u) || /icloud\.com/i.test(u),
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    color: GROKKI_BLUE,
    Icon: FaMicrosoft,
    match: (u) => /microsoft\.com/i.test(u) || /azure\.com/i.test(u) || /live\.com/i.test(u),
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: GROKKI_BLUE,
    Icon: FaInstagram,
    match: (u) => /instagram\.com/i.test(u),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: GROKKI_BLUE,
    Icon: FaTiktok,
    match: (u) => /tiktok\.com/i.test(u),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: GROKKI_BLUE,
    Icon: FaFacebook,
    match: (u) => /facebook\.com/i.test(u) || /fb\.watch/i.test(u),
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    color: GROKKI_BLUE,
    Icon: FaPinterest,
    match: (u) => /pinterest\.com/i.test(u) || /pin\.it/i.test(u),
  },
  {
    id: 'threads',
    name: 'Threads',
    color: GROKKI_BLUE,
    Icon: FaThreads,
    match: (u) => /threads\.net/i.test(u),
  },
  {
    id: 'bluesky',
    name: 'Bluesky',
    color: GROKKI_BLUE,
    Icon: FaBluesky,
    match: (u) => /bsky\.app/i.test(u),
  },
];

export const DEFAULT_BRAND: BrandInfo = {
  id: 'generic',
  name: 'Web Link',
  color: GROKKI_BLUE,
  Icon: Globe,
  match: () => true,
};

const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+)/gi;
const URL_TEST_REGEX = /^https?:\/\/[^\s]+$/i;

/**
 * Detect brand info from a given URL string.
 */
export function detectBrand(url: string): BrandInfo {
  if (!url) return DEFAULT_BRAND;
  const match = BRANDS.find((b) => b.match(url));
  return match || DEFAULT_BRAND;
}

/**
 * Strip trailing punctuation from a URL.
 */
export function cleanUrl(raw: string): string {
  if (!raw) return '';
  return raw.replace(/[),.;:!]+$/, '').trim();
}

const brandSvgMarkupCache = new Map<string, string>();

function getBrandSvgMarkup(brand: BrandInfo): string {
  let cached = brandSvgMarkupCache.get(brand.id);
  if (!cached) {
    const IconComp = brand.Icon;
    cached = renderToStaticMarkup(
      <IconComp
        style={{
          width: '14px',
          height: '14px',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
    );
    brandSvgMarkupCache.set(brand.id, cached);
  }
  return cached;
}

function getTextNodes(root: Node): Text[] {
  const result: Text[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.getAttribute('data-brand-icon') === 'true') {
        return;
      }
    }
    if (node.nodeType === Node.TEXT_NODE) {
      result.push(node as Text);
      return;
    }
    node.childNodes.forEach(walk);
  };
  walk(root);
  return result;
}

function extractPlainText(root: HTMLElement): string {
  return getTextNodes(root)
    .map((t) => t.nodeValue || '')
    .join('')
    .replace(/\u00A0/g, ' ')
    .replace(/[\r\n]+/g, ' ');
}

function getCaretOffset(root: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.endContainer)) return extractPlainText(root).length;

  const textNodes = getTextNodes(root);
  let offset = 0;
  for (const t of textNodes) {
    if (range.endContainer === t) {
      return offset + range.endOffset;
    }
    offset += (t.nodeValue || '').length;
  }

  const preRange = range.cloneRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.endContainer, range.endOffset);
  const fragment = preRange.cloneContents();
  fragment.querySelectorAll?.('[data-brand-icon="true"]').forEach((el) => el.remove());
  return (fragment.textContent || '').length;
}

function setCaretOffset(root: HTMLElement, targetOffset: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const textNodes = getTextNodes(root);
  if (textNodes.length === 0) {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }

  let remaining = Math.max(0, targetOffset);
  for (const t of textNodes) {
    const len = (t.nodeValue || '').length;
    if (remaining <= len) {
      const range = document.createRange();
      range.setStart(t, remaining);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    remaining -= len;
  }

  const last = textNodes[textNodes.length - 1];
  const range = document.createRange();
  range.setStart(last, (last.nodeValue || '').length);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function toDomText(str: string, isVeryEnd: boolean): string {
  let res = str.replace(/  /g, ' \u00A0');
  if (isVeryEnd && res.endsWith(' ')) {
    res = res.slice(0, -1) + '\u00A0';
  }
  return res;
}

export function openExternalBrowserUrl(url: string) {
  if (!url) return;
  if ((window as any).jarvisAPI?.openUrl) {
    (window as any).jarvisAPI.openUrl(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function buildRichDom(el: HTMLElement, text: string) {
  el.innerHTML = '';
  if (!text) return;

  const parts = text.split(URL_SPLIT_REGEX);
  parts.forEach((part, idx) => {
    if (!part) return;
    const isLastPart = idx === parts.length - 1;

    if (URL_TEST_REGEX.test(part)) {
      const clean = cleanUrl(part);
      const rawTrailing = part.slice(clean.length);
      const brand = detectBrand(clean);

      const urlSpan = document.createElement('span');
      urlSpan.setAttribute('data-brand-url', clean);
      urlSpan.setAttribute('title', `Ctrl + Click to open ${clean}`);
      urlSpan.className =
        'text-sky-600 dark:text-[#38bdf8] bg-sky-500/10 dark:bg-[#38bdf8]/[0.12] hover:bg-sky-500/15 dark:hover:bg-[#38bdf8]/[0.18] rounded-md px-1.5 py-0.5 transition-colors';

      const iconWrapper = document.createElement('span');
      iconWrapper.setAttribute('data-brand-icon', 'true');
      iconWrapper.setAttribute('contenteditable', 'false');
      iconWrapper.className = 'text-sky-600 dark:text-[#38bdf8]';
      iconWrapper.style.cssText =
        'display:inline-flex;align-items:center;vertical-align:-2.5px;margin-right:4px;user-select:none;';
      iconWrapper.innerHTML = getBrandSvgMarkup(brand);

      urlSpan.appendChild(iconWrapper);
      urlSpan.appendChild(document.createTextNode(clean));
      el.appendChild(urlSpan);

      if (rawTrailing) {
        el.appendChild(document.createTextNode(toDomText(rawTrailing, isLastPart)));
      }
    } else {
      el.appendChild(document.createTextNode(toDomText(part, isLastPart)));
    }
  });
}

export interface RichBrandInputProps {
  inputRef?: React.MutableRefObject<HTMLElement | null>;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * ChatGPT-style inline rich input that automatically detects URLs anywhere in the text
 * (before text, between text, or after text) and renders the recognizable brand icon
 * inline right before each URL in Grokki Blue (#38bdf8) with a low-opacity rounded background.
 */
export const RichBrandInput: React.FC<RichBrandInputProps> = ({
  inputRef,
  value,
  onChange,
  onKeyDown,
  placeholder,
  className = '',
  autoFocus = false,
}) => {
  const localRef = useRef<HTMLDivElement | null>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const isInternalInputRef = useRef(false);
  const [isCtrlHeld, setIsCtrlHeld] = useState(false);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (inputRef) {
        inputRef.current = node;
      }
    },
    [inputRef]
  );

  useEffect(() => {
    const onKeyDownWin = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') setIsCtrlHeld(true);
    };
    const onKeyUpWin = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') setIsCtrlHeld(false);
    };
    const onBlurWin = () => setIsCtrlHeld(false);

    window.addEventListener('keydown', onKeyDownWin);
    window.addEventListener('keyup', onKeyUpWin);
    window.addEventListener('blur', onBlurWin);
    return () => {
      window.removeEventListener('keydown', onKeyDownWin);
      window.removeEventListener('keyup', onKeyUpWin);
      window.removeEventListener('blur', onBlurWin);
    };
  }, []);

  useEffect(() => {
    if (autoFocus && localRef.current) {
      localRef.current.focus();
    }
  }, [autoFocus]);

  useLayoutEffect(() => {
    const el = localRef.current;
    if (!el) return;

    const currentDomText = extractPlainText(el);
    const hasUrlInValue = /(https?:\/\/[^\s]+)/i.test(value);
    const hasRichElementsInDom = !!el.querySelector(
      '[data-brand-icon="true"], [data-brand-url], span, font, b, i, u, a'
    );

    // If plain text with no URLs and no rich spans/elements already matches DOM, avoid touching DOM
    if (!hasUrlInValue && !hasRichElementsInDom && currentDomText === value && value !== '') {
      isInternalInputRef.current = false;
      pendingCaretRef.current = null;
      return;
    }

    const isFocused = document.activeElement === el;
    const targetCaret =
      pendingCaretRef.current !== null
        ? pendingCaretRef.current
        : isInternalInputRef.current && isFocused
        ? getCaretOffset(el)
        : value.length;

    buildRichDom(el, value);

    if (isFocused && value.length > 0) {
      setCaretOffset(el, targetCaret);
    }

    isInternalInputRef.current = false;
    pendingCaretRef.current = null;
  }, [value]);

  const handleInput = () => {
    const el = localRef.current;
    if (!el) return;
    isInternalInputRef.current = true;
    const caret = getCaretOffset(el);
    pendingCaretRef.current = caret;
    const nextText = extractPlainText(el);

    // If no URL remains in the text (or text is empty) and the browser left behind
    // any styled/colored span from the deleted link, immediately scrub the DOM clean
    if (!/(https?:\/\/[^\s]+)/i.test(nextText)) {
      const hasLeftoverMarkup = !!el.querySelector(
        '[data-brand-icon="true"], [data-brand-url], span, font, b, i, u, a, br'
      );
      if (hasLeftoverMarkup || nextText === '') {
        buildRichDom(el, nextText);
        if (document.activeElement === el && nextText.length > 0) {
          setCaretOffset(el, caret);
        }
      }
    }

    onChange(nextText);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pasted = e.clipboardData.getData('text/plain');
    if (!pasted) return;
    e.preventDefault();
    const cleanPasted = pasted.replace(/[\r\n]+/g, ' ');

    const el = localRef.current;
    if (!el) return;

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      // Calculate start and end offsets in plain text
      const startPre = range.cloneRange();
      startPre.selectNodeContents(el);
      startPre.setEnd(range.startContainer, range.startOffset);
      const startFrag = startPre.cloneContents();
      startFrag.querySelectorAll?.('[data-brand-icon="true"]').forEach((n) => n.remove());
      const startOffset = (startFrag.textContent || '').length;

      const endPre = range.cloneRange();
      endPre.selectNodeContents(el);
      endPre.setEnd(range.endContainer, range.endOffset);
      const endFrag = endPre.cloneContents();
      endFrag.querySelectorAll?.('[data-brand-icon="true"]').forEach((n) => n.remove());
      const endOffset = (endFrag.textContent || '').length;

      const currentText = extractPlainText(el);
      const nextText =
        currentText.slice(0, startOffset) + cleanPasted + currentText.slice(endOffset);
      isInternalInputRef.current = true;
      pendingCaretRef.current = startOffset + cleanPasted.length;
      onChange(nextText);
    } else {
      const currentText = extractPlainText(el);
      const nextText = currentText + cleanPasted;
      isInternalInputRef.current = true;
      pendingCaretRef.current = nextText.length;
      onChange(nextText);
    }
  };

  const handleMouseDownInternal = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const target = e.target as HTMLElement | null;
      const linkSpan = target?.closest?.('[data-brand-url]') as HTMLElement | null;
      const url = linkSpan?.getAttribute('data-brand-url');
      if (url) {
        e.preventDefault();
        e.stopPropagation();
        openExternalBrowserUrl(url);
      }
    }
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = localRef.current;
    if (el && e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (
          range.startContainer.nodeType === Node.TEXT_NODE &&
          range.startOffset === 0 &&
          range.startContainer.previousSibling &&
          (range.startContainer.previousSibling as HTMLElement).getAttribute?.(
            'data-brand-icon'
          ) === 'true'
        ) {
          const curOffset = getCaretOffset(el);
          if (curOffset > 0) {
            e.preventDefault();
            const currentText = extractPlainText(el);
            const nextText =
              currentText.slice(0, curOffset - 1) + currentText.slice(curOffset);
            isInternalInputRef.current = true;
            pendingCaretRef.current = curOffset - 1;
            onChange(nextText);
            return;
          }
        }
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className="relative w-full flex items-center min-h-[24px] text-left" style={{ textAlign: 'left' }}>
      {!value && placeholder && (
        <div
          aria-hidden="true"
          className="absolute inset-x-1 inset-y-0 flex items-center justify-start text-left pointer-events-none select-none text-xs md:text-[13px] text-gray-400 font-sans truncate"
          style={{ textAlign: 'left' }}
        >
          {placeholder}
        </div>
      )}
      <div
        ref={setRefs}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="false"
        spellCheck={false}
        onInput={handleInput}
        onPaste={handlePaste}
        onMouseDown={handleMouseDownInternal}
        onKeyDown={handleKeyDownInternal}
        style={{ textAlign: 'left' }}
        className={`w-full text-left bg-transparent border-none outline-none text-xs md:text-[13px] text-gray-900 dark:text-gray-100 font-sans px-1 pt-0.5 pb-0.5 whitespace-pre-wrap break-all max-h-28 overflow-y-auto ${
          isCtrlHeld ? '[&_[data-brand-url]]:cursor-pointer [&_[data-brand-url]:hover]:underline' : ''
        } ${className}`}
      />
    </div>
  );
};

/**
 * Renders chat message content with recognized brand links highlighted in Grokki Blue with their brand icon.
 */
export function renderContentWithBrandLinks(content: string): React.ReactNode {
  if (!content) return null;
  const parts = content.split(URL_SPLIT_REGEX);

  return parts.map((part, index) => {
    if (URL_TEST_REGEX.test(part)) {
      const clean = cleanUrl(part);
      const trailing = part.slice(clean.length);
      const brand = detectBrand(clean);
      const IconComp = brand.Icon;
      return (
        <React.Fragment key={index}>
          <a
            href={clean}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              openExternalBrowserUrl(clean);
            }}
            className="inline-flex items-center gap-1.5 text-sky-600 dark:text-[#38bdf8] bg-sky-500/10 dark:bg-[#38bdf8]/[0.12] hover:bg-sky-500/15 dark:hover:bg-[#38bdf8]/[0.18] rounded-md px-1.5 py-0.5 transition-colors hover:underline decoration-sky-400/40 underline-offset-2 align-baseline cursor-pointer"
          >
            <IconComp className="w-3.5 h-3.5 flex-shrink-0 inline self-center text-sky-600 dark:text-[#38bdf8]" />
            <span>{clean}</span>
          </a>
          {trailing}
        </React.Fragment>
      );
    }
    return part;
  });
}
