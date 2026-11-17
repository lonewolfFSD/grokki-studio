import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  FileDiff,
  FileCode2,
  Terminal as TerminalIcon,
  Globe,
  Puzzle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  RotateCw,
  FolderOpen,
  Folder,
  FileText,
  X,
  Loader2,
  Plus,
  Lock,
  Maximize2,
  Minimize2,
  AlignJustify,
  Copy,
  Check,
} from 'lucide-react';
import {
  SiHtml5,
  SiCss,
  SiJavascript,
  SiTypescript,
  SiReact,
  SiPython,
  SiJson,
  SiMarkdown,
  SiGnubash,
  SiRust,
  SiGo,
  SiYaml,
  SiCplusplus,
  SiC,
} from 'react-icons/si';
import { WorkspaceMention, GitStatusResponse } from '../types/jarvis';
import { highlightCode } from '../utils/syntaxHighlight';

type PaneTool = 'menu' | 'terminal' | 'browser' | 'files' | 'review';

interface TerminalEntry {
  id: string;
  cwd: string;
  cmd: string;
  stdout: string;
  stderr: string;
}

interface TerminalSession {
  id: string;
  title: string;
  cwd: string;
  history: TerminalEntry[];
  cmdHistory: string[];
}

interface BrowserTabItem {
  id: string;
  title: string;
  url: string;
  inputUrl: string;
  loading: boolean;
  favicon?: string;
}

interface OpenFileTab {
  id: string;
  path: string;
  name: string;
  ext: string;
  content: string;
  lines?: number;
}

interface WorkspaceTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  mention?: WorkspaceMention;
  children: WorkspaceTreeNode[];
}

const buildWorkspaceTree = (items: WorkspaceMention[]): WorkspaceTreeNode[] => {
  const root: WorkspaceTreeNode[] = [];
  const nodeMap = new Map<string, WorkspaceTreeNode>();

  for (const item of items) {
    const cleanPath = (item.path || item.name).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!cleanPath) continue;
    const parts = cleanPath.split('/');
    let currentChildren = root;
    let accumPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumPath = accumPath ? `${accumPath}/${part}` : part;
      const isLast = i === parts.length - 1;
      const isFolder = isLast ? item.type === 'folder' : true;

      let existing = nodeMap.get(accumPath);
      if (!existing) {
        existing = {
          name: part,
          path: accumPath,
          isFolder,
          mention: isLast && !isFolder ? item : undefined,
          children: [],
        };
        nodeMap.set(accumPath, existing);
        currentChildren.push(existing);
      } else if (isLast && !isFolder && !existing.mention) {
        existing.mention = item;
      }
      currentChildren = existing.children;
    }
  }

  const sortNodes = (nodes: WorkspaceTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) {
      if (n.children.length > 0) sortNodes(n.children);
    }
  };
  sortNodes(root);
  return root;
};

const getExtMeta = (filename: string, explicitExt?: string): { lang: string; Icon: React.ComponentType<{ className?: string }>; color: string } => {
  const ext = (explicitExt || filename.split('.').pop() || '').replace(/^\./, '').toLowerCase();
  const map: Record<string, { lang: string; Icon: React.ComponentType<{ className?: string }>; color: string }> = {
    js: { lang: 'javascript', Icon: SiJavascript, color: 'text-[#F7DF1E]' },
    mjs: { lang: 'javascript', Icon: SiJavascript, color: 'text-[#F7DF1E]' },
    cjs: { lang: 'javascript', Icon: SiJavascript, color: 'text-[#F7DF1E]' },
    jsx: { lang: 'jsx', Icon: SiReact, color: 'text-[#61DAFB]' },
    ts: { lang: 'typescript', Icon: SiTypescript, color: 'text-[#3178C6]' },
    tsx: { lang: 'tsx', Icon: SiReact, color: 'text-[#61DAFB]' },
    py: { lang: 'python', Icon: SiPython, color: 'text-[#3776AB]' },
    html: { lang: 'html', Icon: SiHtml5, color: 'text-[#E34F26]' },
    htm: { lang: 'html', Icon: SiHtml5, color: 'text-[#E34F26]' },
    css: { lang: 'css', Icon: SiCss, color: 'text-[#1572B6]' },
    json: { lang: 'json', Icon: SiJson, color: 'text-[#29A86B]' },
    md: { lang: 'markdown', Icon: SiMarkdown, color: 'text-zinc-300' },
    sh: { lang: 'bash', Icon: SiGnubash, color: 'text-emerald-400' },
    bash: { lang: 'bash', Icon: SiGnubash, color: 'text-emerald-400' },
    rs: { lang: 'rust', Icon: SiRust, color: 'text-orange-400' },
    go: { lang: 'go', Icon: SiGo, color: 'text-[#00ADD8]' },
    yaml: { lang: 'yaml', Icon: SiYaml, color: 'text-rose-400' },
    yml: { lang: 'yaml', Icon: SiYaml, color: 'text-rose-400' },
    cpp: { lang: 'cpp', Icon: SiCplusplus, color: 'text-[#00599C]' },
    c: { lang: 'c', Icon: SiC, color: 'text-[#A8B9CC]' },
  };
  return map[ext] || { lang: ext, Icon: FileText, color: 'text-zinc-400' };
};

interface ChatRightPaneProps {
  agentRoot?: string;
  agentRootName?: string;
  onOpenPlugins: () => void;
  onClose: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  isResizing: boolean;
  onResizingChange: (resizing: boolean) => void;
}

const isLikelyUrl = (raw: string): boolean => {
  const s = raw.trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s) || /^localhost(:\d+)?/i.test(s)) return true;
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(s);
};

const normalizeUrl = (raw: string): string => {
  const s = raw.trim();
  if (!s) return 'https://www.google.com';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^localhost/i.test(s) || /^127\.0\.0\.1/.test(s)) return `http://${s}`;
  if (!s.includes('.') || s.includes(' ')) {
    return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
  }
  return `https://${s}`;
};

export const ChatRightPane: React.FC<ChatRightPaneProps> = ({
  agentRoot,
  agentRootName,
  onOpenPlugins,
  onClose,
  width,
  onWidthChange,
  isResizing,
  onResizingChange,
}) => {
  const [activeTool, setActiveTool] = useState<PaneTool>('menu');
  const [topInput, setTopInput] = useState('');

  // Multi-tab Terminal state
  const defaultCwd = agentRoot || 'C:\\Users';
  const [terminals, setTerminals] = useState<TerminalSession[]>([
    {
      id: 'term-1',
      title: 'powershell.exe',
      cwd: defaultCwd,
      history: [],
      cmdHistory: [],
    },
  ]);
  const [activeTermId, setActiveTermId] = useState('term-1');
  const [termCmd, setTermCmd] = useState('');
  const [cmdHistIdx, setCmdHistIdx] = useState(-1);
  const [termRunning, setTermRunning] = useState(false);
  const termInputRef = useRef<HTMLInputElement | null>(null);
  const termEndRef = useRef<HTMLDivElement | null>(null);

  // Multi-tab Browser state
  const [browserTabs, setBrowserTabs] = useState<BrowserTabItem[]>([
    {
      id: 'tab-1',
      title: 'Google',
      url: 'https://www.google.com',
      inputUrl: 'www.google.com',
      loading: false,
    },
  ]);
  const [activeBrowserTabId, setActiveBrowserTabId] = useState('tab-1');
  const webviewRefs = useRef<Record<string, any>>({});

  // Open File state
  const [fileQuery, setFileQuery] = useState('');
  const [files, setFiles] = useState<WorkspaceMention[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [openFiles, setOpenFiles] = useState<OpenFileTab[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState(false);
  const [isTreeOpen, setIsTreeOpen] = useState(false);
  const [isRootExpanded, setIsRootExpanded] = useState(true);
  const [treeWidth, setTreeWidth] = useState(220);
  const [isTreeResizing, setIsTreeResizing] = useState(false);
  const [treeItems, setTreeItems] = useState<WorkspaceMention[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());

  const activeFile = openFiles.find((f) => f.id === activeFileId) || null;
  const workspaceTree = React.useMemo(() => buildWorkspaceTree(treeItems), [treeItems]);

  // Review / Git Status state
  const [gitStatus, setGitStatus] = useState<GitStatusResponse | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const activeTerm = terminals.find((t) => t.id === activeTermId) || terminals[0];
  const activeBrowserTab =
    browserTabs.find((t) => t.id === activeBrowserTabId) || browserTabs[0];

  useEffect(() => {
    if (agentRoot) {
      setTerminals((prev) =>
        prev.map((t) => (t.history.length === 0 ? { ...t, cwd: agentRoot } : t))
      );
    }
  }, [agentRoot]);

  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTerm?.history.length, termRunning]);

  // Attach Electron <webview> event listeners for active tab
  useEffect(() => {
    if (activeTool !== 'browser' || !activeBrowserTab) return;
    const wv = webviewRefs.current[activeBrowserTab.id];
    if (!wv) return;

    const handleNavigate = (e: any) => {
      const nextUrl = e?.url || wv.getURL?.();
      if (!nextUrl) return;
      setBrowserTabs((prev) =>
        prev.map((t) =>
          t.id === activeBrowserTab.id
            ? { ...t, url: nextUrl, inputUrl: nextUrl.replace(/^https?:\/\//, '') }
            : t
        )
      );
    };
    const handleTitle = (e: any) => {
      if (!e?.title) return;
      setBrowserTabs((prev) =>
        prev.map((t) => (t.id === activeBrowserTab.id ? { ...t, title: e.title } : t))
      );
    };
    const handleFavicon = (e: any) => {
      const iconUrl = Array.isArray(e?.favicons) && e.favicons.length > 0 ? e.favicons[0] : undefined;
      if (!iconUrl) return;
      setBrowserTabs((prev) =>
        prev.map((t) => (t.id === activeBrowserTab.id ? { ...t, favicon: iconUrl } : t))
      );
    };
    const handleStart = () => {
      setBrowserTabs((prev) =>
        prev.map((t) => (t.id === activeBrowserTab.id ? { ...t, loading: true } : t))
      );
    };
    const handleStop = () => {
      setBrowserTabs((prev) =>
        prev.map((t) => (t.id === activeBrowserTab.id ? { ...t, loading: false } : t))
      );
    };

    wv.addEventListener('did-navigate', handleNavigate);
    wv.addEventListener('did-navigate-in-page', handleNavigate);
    wv.addEventListener('page-title-updated', handleTitle);
    wv.addEventListener('page-favicon-updated', handleFavicon);
    wv.addEventListener('did-start-loading', handleStart);
    wv.addEventListener('did-stop-loading', handleStop);

    return () => {
      wv.removeEventListener('did-navigate', handleNavigate);
      wv.removeEventListener('did-navigate-in-page', handleNavigate);
      wv.removeEventListener('page-title-updated', handleTitle);
      wv.removeEventListener('page-favicon-updated', handleFavicon);
      wv.removeEventListener('did-start-loading', handleStart);
      wv.removeEventListener('did-stop-loading', handleStop);
    };
  }, [activeTool, activeBrowserTab?.id]);

  const loadWorkspaceFiles = async (query = '') => {
    setFilesLoading(true);
    try {
      const res = await window.jarvisAPI?.scanWorkspaceFiles?.({
        query,
        maxResults: 60,
      });
      if (res?.success && Array.isArray(res.items)) {
        setFiles(res.items);
      } else {
        setFiles([]);
      }
    } catch {
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const loadWorkspaceTree = async () => {
    setTreeLoading(true);
    try {
      const res = await window.jarvisAPI?.scanWorkspaceFiles?.({
        query: '',
        maxResults: 500,
      });
      if (res?.success && Array.isArray(res.items)) {
        setTreeItems(res.items);
      } else {
        setTreeItems([]);
      }
    } catch {
      setTreeItems([]);
    } finally {
      setTreeLoading(false);
    }
  };

  const toggleTreeFolder = async (folderNode: WorkspaceTreeNode) => {
    const isCurrentlyOpen = expandedFolders.has(folderNode.path);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (isCurrentlyOpen) next.delete(folderNode.path);
      else next.add(folderNode.path);
      return next;
    });

    if (!isCurrentlyOpen && folderNode.children.length === 0) {
      try {
        const res = await window.jarvisAPI?.scanWorkspaceFiles?.({
          query: folderNode.path,
          maxResults: 200,
        });
        if (res?.success && Array.isArray(res.items) && res.items.length > 0) {
          setTreeItems((prev) => {
            const seen = new Set(prev.map((i) => i.path));
            const additions = res.items.filter((i) => !seen.has(i.path));
            return additions.length > 0 ? [...prev, ...additions] : prev;
          });
        }
      } catch {}
    }
  };

  const handleStartTreeResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsTreeResizing(true);
    const startX = e.clientX;
    const startW = treeWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      const next = Math.min(440, Math.max(150, startW + delta));
      setTreeWidth(next);
    };
    const onUp = () => {
      setIsTreeResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const renderTreeNodes = (nodes: WorkspaceTreeNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      if (node.isFolder) {
        return (
          <div key={node.path}>
            <button
              type="button"
              onClick={() => toggleTreeFolder(node)}
              style={{ paddingLeft: `${8 + depth * 12}px` }}
              className="w-full flex items-center gap-1.5 pr-2 py-1 rounded-md text-left text-[12px] text-zinc-300 hover:bg-white/[0.05] bg-transparent border-none cursor-pointer transition-colors"
            >
              <ChevronRight
                className={`w-3 h-3 text-zinc-500 flex-shrink-0 transition-transform duration-150 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              )}
              <span className="truncate">{node.name}</span>
            </button>
            <AnimatePresence initial={false}>
              {isExpanded && node.children.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  {renderTreeNodes(node.children, depth + 1)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      }

      const meta = getExtMeta(node.name, node.mention?.ext);
      const LangIcon = meta.Icon;
      const isActive = activeFile?.path.replace(/\\/g, '/') === node.path;

      return (
        <button
          key={node.path}
          type="button"
          onClick={() => {
            if (node.mention) {
              handleOpenFile(node.mention);
            } else {
              handleOpenFile({
                name: node.name,
                path: node.path,
                type: 'file',
              });
            }
          }}
          style={{ paddingLeft: `${22 + depth * 12}px` }}
          className={`w-full flex items-center gap-2 pr-2 py-1 rounded-md text-left text-[12px] border-none cursor-pointer transition-colors ${
            isActive
              ? 'bg-white/[0.08] text-zinc-100 font-medium'
              : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
          }`}
        >
          <LangIcon className={`w-3.5 h-3.5 ${meta.color} flex-shrink-0`} />
          <span className="truncate">{node.name}</span>
        </button>
      );
    });

  const handleOpenFile = async (item: WorkspaceMention) => {
    const existing = openFiles.find((f) => f.path === item.path);
    if (existing) {
      setActiveFileId(existing.id);
      onWidthChange(Math.max(width, Math.min(780, Math.round(window.innerWidth * 0.48))));
      return;
    }
    try {
      const res = await window.jarvisAPI?.readWorkspaceItem?.(item.path);
      if (res?.success) {
        const newTab: OpenFileTab = {
          id: `file-${Date.now()}-${Math.random()}`,
          path: res.path || item.path,
          name: res.name || item.name,
          ext: res.ext || (item.name.split('.').pop() || ''),
          content: res.content || res.tree || '(Empty or binary file)',
          lines: res.lines,
        };
        setOpenFiles((prev) => [...prev, newTab]);
        setActiveFileId(newTab.id);
        onWidthChange(Math.max(width, Math.min(780, Math.round(window.innerWidth * 0.48))));
      }
    } catch {}
  };

  const handleReloadActiveFile = async () => {
    if (!activeFile) return;
    try {
      const res = await window.jarvisAPI?.readWorkspaceItem?.(activeFile.path);
      if (res?.success) {
        setOpenFiles((prev) =>
          prev.map((f) =>
            f.id === activeFile.id
              ? { ...f, content: res.content || res.tree || f.content, lines: res.lines }
              : f
          )
        );
      }
    } catch {}
  };

  const handleCloseFileTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = openFiles.filter((f) => f.id !== id);
    setOpenFiles(next);
    if (activeFileId === id) {
      setActiveFileId(next.length > 0 ? next[next.length - 1].id : null);
    }
  };

  const loadGitReview = async () => {
    setReviewLoading(true);
    try {
      const res = await window.jarvisAPI?.getGitStatus?.(agentRoot || undefined);
      setGitStatus(res || null);
    } catch {
      setGitStatus(null);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleTopSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = topInput.trim();
    if (!q) return;
    if (isLikelyUrl(q)) {
      const normalized = normalizeUrl(q);
      setBrowserTabs((prev) =>
        prev.map((t) =>
          t.id === activeBrowserTabId
            ? { ...t, url: normalized, inputUrl: normalized.replace(/^https?:\/\//, '') }
            : t
        )
      );
      setActiveTool('browser');
      onWidthChange(Math.max(width, Math.min(780, Math.round(window.innerWidth * 0.48))));
    } else {
      setFileQuery(q);
      setActiveFileId(null);
      setActiveTool('files');
      loadWorkspaceFiles(q);
    }
  };

  const handleRunTerminalCmd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = termCmd.trim();
    if (!activeTerm || termRunning) return;

    if (!raw) {
      setTerminals((prev) =>
        prev.map((t) =>
          t.id === activeTerm.id
            ? {
                ...t,
                history: [
                  ...t.history,
                  { id: `${Date.now()}`, cwd: activeTerm.cwd, cmd: '', stdout: '', stderr: '' },
                ],
              }
            : t
        )
      );
      return;
    }

    setCmdHistIdx(-1);
    setTermCmd('');

    if (raw.toLowerCase() === 'cls' || raw.toLowerCase() === 'clear') {
      setTerminals((prev) =>
        prev.map((t) =>
          t.id === activeTerm.id
            ? { ...t, history: [], cmdHistory: [raw, ...t.cmdHistory.slice(0, 49)] }
            : t
        )
      );
      return;
    }

    setTermRunning(true);
    try {
      const cdPrefix = activeTerm.cwd ? `cd /d "${activeTerm.cwd}" && ` : '';
      const res = await window.jarvisAPI?.runCommand?.(`${cdPrefix}${raw}`);
      setTerminals((prev) =>
        prev.map((t) =>
          t.id === activeTerm.id
            ? {
                ...t,
                cmdHistory: [raw, ...t.cmdHistory.slice(0, 49)],
                history: [
                  ...t.history,
                  {
                    id: `${Date.now()}-${Math.random()}`,
                    cwd: activeTerm.cwd,
                    cmd: raw,
                    stdout: res?.stdout || '',
                    stderr: res?.stderr || '',
                  },
                ],
              }
            : t
        )
      );
    } catch (err: any) {
      setTerminals((prev) =>
        prev.map((t) =>
          t.id === activeTerm.id
            ? {
                ...t,
                history: [
                  ...t.history,
                  {
                    id: `${Date.now()}-${Math.random()}`,
                    cwd: activeTerm.cwd,
                    cmd: raw,
                    stdout: '',
                    stderr: err?.message || 'Command failed',
                  },
                ],
              }
            : t
        )
      );
    } finally {
      setTermRunning(false);
      setTimeout(() => termInputRef.current?.focus(), 20);
    }
  };

  const handleAddTerminalTab = () => {
    const id = `term-${Date.now()}`;
    setTerminals((prev) => [
      ...prev,
      {
        id,
        title: 'powershell.exe',
        cwd: agentRoot || defaultCwd,
        history: [],
        cmdHistory: [],
      },
    ]);
    setActiveTermId(id);
  };

  const handleCloseTerminalTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (terminals.length === 1) {
      setActiveTool('menu');
      return;
    }
    const next = terminals.filter((t) => t.id !== id);
    setTerminals(next);
    if (activeTermId === id) {
      setActiveTermId(next[next.length - 1].id);
    }
  };

  const handleAddBrowserTab = () => {
    const id = `tab-${Date.now()}`;
    setBrowserTabs((prev) => [
      ...prev,
      {
        id,
        title: 'Google',
        url: 'https://www.google.com',
        inputUrl: 'www.google.com',
        loading: false,
      },
    ]);
    setActiveBrowserTabId(id);
  };

  const handleCloseBrowserTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (browserTabs.length === 1) {
      setActiveTool('menu');
      return;
    }
    const next = browserTabs.filter((t) => t.id !== id);
    setBrowserTabs(next);
    if (activeBrowserTabId === id) {
      setActiveBrowserTabId(next[next.length - 1].id);
    }
  };

  const handleBrowserGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrowserTab) return;
    const normalized = normalizeUrl(activeBrowserTab.inputUrl);
    setBrowserTabs((prev) =>
      prev.map((t) =>
        t.id === activeBrowserTab.id
          ? { ...t, url: normalized, inputUrl: normalized.replace(/^https?:\/\//, '') }
          : t
      )
    );
    const wv = webviewRefs.current[activeBrowserTab.id];
    if (wv?.loadURL) {
      wv.loadURL(normalized);
    }
  };

  const openTool = (tool: PaneTool) => {
    setActiveTool(tool);
    if (tool === 'terminal' || tool === 'browser') {
      onWidthChange(Math.max(width, Math.min(780, Math.round(window.innerWidth * 0.48))));
    }
    if (tool === 'files') {
      if (openFiles.length > 0 && activeFileId) {
        onWidthChange(Math.max(width, Math.min(780, Math.round(window.innerWidth * 0.48))));
      }
      loadWorkspaceFiles(fileQuery);
    } else if (tool === 'review') {
      loadGitReview();
    }
  };

  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    onResizingChange(true);
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      const maxW = Math.max(420, Math.round(window.innerWidth * 0.72));
      const next = Math.min(maxW, Math.max(320, startWidth + delta));
      onWidthChange(next);
    };

    const onMouseUp = () => {
      onResizingChange(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const isWide = width >= 560;

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={
        isResizing
          ? { duration: 0 }
          : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
      }
      className="fixed top-[52px] right-0 bottom-0 z-[70] border-l border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0b0b0e] flex flex-col overflow-hidden shadow-2xl select-none"
    >
      {/* Left Edge Drag-to-Resize Handle */}
      <div
        onMouseDown={handleStartResize}
        title="Drag to resize"
        className={`absolute left-0 top-0 bottom-0 w-1.5 z-50 cursor-col-resize transition-colors ${
          isResizing
            ? 'bg-blue-500/70'
            : 'hover:bg-blue-500/40 bg-transparent'
        }`}
      />
      {/* Overlay over webview while dragging so mousemove doesn't get captured */}
      {isResizing && <div className="fixed inset-0 z-40 cursor-col-resize" />}
      {/* MENU VIEW */}
      {activeTool === 'menu' && (
        <>
          <div className="py-0.5 border-b border-gray-200/70 dark:border-white/[0.06] flex items-center gap-2">
            <form onSubmit={handleTopSearchSubmit} className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={topInput}
                onChange={(e) => setTopInput(e.target.value)}
                placeholder="Search or enter a URL"
                className="w-full h-10 pl-8 pr-3 rounded-lg text-[13px] text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none transition-colors"
              />
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => openTool('review')}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] bg-transparent border-none cursor-pointer text-left transition-colors"
            >
              <FileDiff className="w-4 h-4 text-gray-400 dark:text-zinc-400" />
              <span>Review</span>
            </button>

            <button
              type="button"
              onClick={() => openTool('files')}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] bg-transparent border-none cursor-pointer text-left transition-colors"
            >
              <FileCode2 className="w-4 h-4 text-gray-400 dark:text-zinc-400" />
              <span>Open File</span>
            </button>

            <button
              type="button"
              onClick={() => openTool('terminal')}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] bg-transparent border-none cursor-pointer text-left transition-colors"
            >
              <TerminalIcon className="w-4 h-4 text-gray-400 dark:text-zinc-400" />
              <span>Terminal</span>
            </button>

            <button
              type="button"
              onClick={() => openTool('browser')}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] bg-transparent border-none cursor-pointer text-left transition-colors"
            >
              <Globe className="w-4 h-4 text-gray-400 dark:text-zinc-400" />
              <span>Browser</span>
            </button>

            <button
              type="button"
              onClick={onOpenPlugins}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/[0.05] bg-transparent border-none cursor-pointer text-left transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Puzzle className="w-4 h-4 text-gray-400 dark:text-zinc-400" />
                <span>Plugins</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
            </button>
          </div>
        </>
      )}

      {/* TERMINAL VIEW (Authentic PowerShell look) */}
      {activeTool === 'terminal' && activeTerm && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c0e] text-zinc-200">
          {/* Top Tab Bar */}
          <div className="h-10 px-2 border-b border-white/[0.07] bg-[#0b0b0e] flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
              <button
                type="button"
                onClick={() => {
                  onWidthChange(360);
                  setActiveTool('menu');
                }}
                title="Back to tools"
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer flex-shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              {terminals.map((t) => {
                const isAct = t.id === activeTerm.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTermId(t.id)}
                    className={`group flex items-center gap-2 px-2.5 py-1 rounded-md text-[12px] cursor-pointer transition-colors ${
                      isAct
                        ? 'bg-white/[0.08] text-zinc-100 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <TerminalIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{t.title}</span>
                    <button
                      type="button"
                      onClick={(e) => handleCloseTerminalTab(t.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleAddTerminalTab}
                title="New terminal tab"
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onWidthChange(width >= 560 ? 380 : Math.min(820, Math.round(window.innerWidth * 0.5)))}
                title={isWide ? 'Compact width' : 'Expand width'}
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
              >
                {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Close panel"
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-header */}
          <div className="h-9 px-4 border-b border-white/[0.05] flex items-center justify-between text-[12px] font-medium text-zinc-200 flex-shrink-0">
            <span>{activeTerm.title}</span>
            <button
              type="button"
              onClick={() =>
                setTerminals((prev) =>
                  prev.map((t) => (t.id === activeTerm.id ? { ...t, history: [] } : t))
                )
              }
              title="Clear terminal"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Authentic Inline PowerShell Surface */}
          <div
            onClick={() => termInputRef.current?.focus()}
            style={{
              fontFamily: "'Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', Consolas, monospace",
              fontWeight: 600,
            }}
            className="flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-[1.6] text-zinc-200 cursor-text select-text"
          >
            <div className="text-zinc-300 mb-3">
              <div>Windows PowerShell</div>
              <div>Copyright (C) Microsoft Corporation. All rights reserved.</div>
            </div>

            {activeTerm.history.map((item) => (
              <div key={item.id} className="mb-2">
                <div className="text-zinc-100">
                  <span className="text-zinc-300">PS {item.cwd}&gt; </span>
                  <span>{item.cmd}</span>
                </div>
                {item.stdout && (
                  <pre
                    style={{
                      fontFamily: "'Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', Consolas, monospace",
                      fontWeight: 600,
                    }}
                    className="m-0 whitespace-pre-wrap break-words text-zinc-300 text-[13px] leading-[1.55]"
                  >
                    {item.stdout}
                  </pre>
                )}
                {item.stderr && (
                  <pre
                    style={{
                      fontFamily: "'Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', Consolas, monospace",
                      fontWeight: 600,
                    }}
                    className="m-0 whitespace-pre-wrap break-words text-rose-400 text-[13px] leading-[1.55]"
                  >
                    {item.stderr}
                  </pre>
                )}
              </div>
            ))}

            {termRunning ? (
              <div className="flex items-center gap-2 text-zinc-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing...</span>
              </div>
            ) : (
              <form onSubmit={handleRunTerminalCmd} className="flex items-center">
                <span className="text-zinc-300 whitespace-pre">
                  PS {activeTerm.cwd}&gt;{' '}
                </span>
                <input
                  ref={termInputRef}
                  type="text"
                  value={termCmd}
                  onChange={(e) => setTermCmd(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' && activeTerm.cmdHistory.length > 0) {
                      e.preventDefault();
                      const nextIdx = Math.min(cmdHistIdx + 1, activeTerm.cmdHistory.length - 1);
                      setCmdHistIdx(nextIdx);
                      setTermCmd(activeTerm.cmdHistory[nextIdx]);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (cmdHistIdx <= 0) {
                        setCmdHistIdx(-1);
                        setTermCmd('');
                      } else {
                        const nextIdx = cmdHistIdx - 1;
                        setCmdHistIdx(nextIdx);
                        setTermCmd(activeTerm.cmdHistory[nextIdx]);
                      }
                    }
                  }}
                  style={{
                    fontFamily: "'Cascadia Code', 'Cascadia Mono', 'JetBrains Mono', Consolas, monospace",
                    fontWeight: 600,
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-zinc-100 text-[13px] caret-white p-0 m-0"
                  autoFocus
                />
              </form>
            )}
            <div ref={termEndRef} />
          </div>
        </div>
      )}

      {/* BROWSER VIEW (Authentic Multi-Tab Browser with Electron Webview) */}
      {activeTool === 'browser' && activeBrowserTab && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0b0b0e]">
          {/* Browser Tab Strip */}
          <div className="h-10 px-2 border-b border-white/[0.07] flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
              <button
                type="button"
                onClick={() => {
                  onWidthChange(360);
                  setActiveTool('menu');
                }}
                title="Back to tools"
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer flex-shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              {browserTabs.map((tab) => {
                const isAct = tab.id === activeBrowserTab.id;
                let fallbackFavicon: string | undefined;
                try {
                  const u = new URL(tab.url);
                  if (u.protocol === 'http:' || u.protocol === 'https:') {
                    fallbackFavicon = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
                  }
                } catch {}
                const iconSrc = tab.favicon || fallbackFavicon;
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveBrowserTabId(tab.id)}
                    className={`group flex items-center gap-2 px-2.5 py-1 rounded-md text-[12px] cursor-pointer transition-colors ${
                      isAct
                        ? 'bg-white/[0.08] text-zinc-100 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    {iconSrc ? (
                      <img
                        src={iconSrc}
                        alt=""
                        className="w-3.5 h-3.5 rounded-xs object-contain flex-shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                    )}
                    <span className="truncate max-w-[130px]">{tab.title || 'New Tab'}</span>
                    <button
                      type="button"
                      onClick={(e) => handleCloseBrowserTab(tab.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleAddBrowserTab}
                title="New browser tab"
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onWidthChange(width >= 560 ? 380 : Math.min(820, Math.round(window.innerWidth * 0.5)))}
                title={isWide ? 'Compact width' : 'Expand width'}
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
              >
                {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Close panel"
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Browser Navigation & Address Bar */}
          <div className="h-11 px-3 border-b border-white/[0.06] bg-[#111216] flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => webviewRefs.current[activeBrowserTab.id]?.goBack?.()}
              title="Back"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => webviewRefs.current[activeBrowserTab.id]?.goForward?.()}
              title="Forward"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => webviewRefs.current[activeBrowserTab.id]?.reload?.()}
              title="Reload"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${activeBrowserTab.loading ? 'animate-spin' : ''}`} />
            </button>

            <form
              onSubmit={handleBrowserGo}
              className="flex-1 h-7 px-3 rounded-full bg-[#1a1b22] border border-white/[0.08] focus-within:border-blue-500/60 flex items-center gap-2"
            >
              <Lock className="w-3 h-3 text-zinc-400 flex-shrink-0" />
              <input
                type="text"
                value={activeBrowserTab.inputUrl}
                onChange={(e) =>
                  setBrowserTabs((prev) =>
                    prev.map((t) =>
                      t.id === activeBrowserTab.id ? { ...t, inputUrl: e.target.value } : t
                    )
                  )
                }
                placeholder="Search or enter URL..."
                className="flex-1 bg-transparent border-none outline-none text-[12px] text-zinc-200 placeholder:text-zinc-500"
              />
            </form>

            <button
              type="button"
              onClick={() => window.jarvisAPI?.openUrl?.(activeBrowserTab.url)}
              title="Open in external browser"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Native Electron Webview Viewport */}
          <div className="flex-1 min-h-0 relative bg-white overflow-hidden">
            {browserTabs.map((tab) => (
              <webview
                key={tab.id}
                ref={(el: any) => {
                  if (el) webviewRefs.current[tab.id] = el;
                }}
                src={tab.url}
                partition="persist:grokki-browser"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  display: tab.id === activeBrowserTab.id ? 'inline-flex' : 'none',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* OPEN FILE VIEW (IDE-Style Multi-Tab + Breadcrumb + Line Numbers + Syntax Highlighting) */}
      {activeTool === 'files' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0b0b0e] text-zinc-200">
          {/* File Tab Strip */}
          <div className="h-10 px-2 border-b border-white/[0.07] bg-[#0b0b0e] flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0">
              <button
                type="button"
                onClick={() => {
                  onWidthChange(360);
                  setActiveTool('menu');
                }}
                title="Back to tools"
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer flex-shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>

              {openFiles.map((tab) => {
                const isAct = tab.id === activeFileId;
                const meta = getExtMeta(tab.name, tab.ext);
                const LangIcon = meta.Icon;
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      setActiveFileId(tab.id);
                      onWidthChange(Math.max(width, Math.min(780, Math.round(window.innerWidth * 0.48))));
                    }}
                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] cursor-pointer transition-colors ${
                      isAct
                        ? 'bg-white/[0.08] text-zinc-100 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <LangIcon className={`w-3.5 h-3.5 ${meta.color} flex-shrink-0`} />
                    <span className="truncate max-w-[140px]">{tab.name}</span>
                    <button
                      type="button"
                      onClick={(e) => handleCloseFileTab(tab.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setActiveFileId(null);
                  loadWorkspaceFiles(fileQuery);
                }}
                title="Open another file"
                className={`p-1 rounded-md hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer ${
                  activeFileId === null ? 'text-white bg-white/[0.08]' : 'text-zinc-400'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onWidthChange(width >= 560 ? 380 : Math.min(820, Math.round(window.innerWidth * 0.5)))}
                title={isWide ? 'Compact width' : 'Expand width'}
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
              >
                {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Close panel"
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {activeFile ? (
            <div className="flex-1 flex flex-col min-h-0 bg-[#09090c]">
              {/* IDE Breadcrumb & Actions Bar */}
              <div className="h-9 px-3.5 border-b border-white/[0.05] bg-[#0b0b0e] flex items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-[11.5px] text-zinc-400 min-w-0 overflow-hidden">
                  {activeFile.path
                    .replace(/\\/g, '/')
                    .split('/')
                    .filter(Boolean)
                    .map((seg, idx, arr) => {
                      const isLast = idx === arr.length - 1;
                      const meta = getExtMeta(activeFile.name, activeFile.ext);
                      const LangIcon = meta.Icon;
                      return (
                        <React.Fragment key={`${seg}-${idx}`}>
                          {idx > 0 && <ChevronRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />}
                          {isLast ? (
                            <span className="inline-flex items-center gap-1.5 text-zinc-100 font-medium truncate">
                              <LangIcon className={`w-3.5 h-3.5 ${meta.color} flex-shrink-0`} />
                              <span className="truncate">{seg}</span>
                            </span>
                          ) : (
                            <span className="truncate hover:text-zinc-200 transition-colors">{seg}</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(activeFile.content);
                      setCopiedFile(true);
                      setTimeout(() => setCopiedFile(false), 1800);
                    }}
                    title="Copy file contents"
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
                  >
                    {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleReloadActiveFile}
                    title="Reload from disk"
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isTreeOpen;
                      setIsTreeOpen(next);
                      if (next && treeItems.length === 0) {
                        loadWorkspaceTree();
                      }
                    }}
                    title="Toggle workspace explorer"
                    className={`p-1 rounded hover:text-white hover:bg-white/[0.06] border-none cursor-pointer transition-colors ${
                      isTreeOpen ? 'text-white bg-white/[0.08]' : 'text-zinc-400 bg-transparent'
                    }`}
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Code Body + Sliding Workspace Explorer Tree */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {(() => {
                  const meta = getExtMeta(activeFile.name, activeFile.ext);
                  const rawLines = activeFile.content.split('\n');
                  const highlightedHtml = highlightCode(activeFile.content, meta.lang);
                  return (
                    <div className="flex-1 min-w-0 overflow-auto flex font-mono text-[12.5px] leading-[1.6] select-text py-3">
                      {/* Line Number Gutter */}
                      <div
                        aria-hidden="true"
                        className="select-none text-right pl-3 pr-4 text-zinc-600 flex-shrink-0 border-r border-white/[0.04]"
                      >
                        {rawLines.map((_, i) => (
                          <div key={i} className="leading-[1.6]">
                            {i + 1}
                          </div>
                        ))}
                      </div>

                      {/* Highlighted Code */}
                      <pre className="m-0 px-4 flex-1 min-w-0 overflow-visible bg-transparent leading-[1.6] text-zinc-200">
                        <code
                          className={`language-${meta.lang} block leading-[1.6]`}
                          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                        />
                      </pre>
                    </div>
                  );
                })()}

                <AnimatePresence initial={false}>
                  {isTreeOpen && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: treeWidth, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={
                        isTreeResizing
                          ? { duration: 0 }
                          : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
                      }
                      className="relative h-full border-l border-white/[0.06] bg-[#0b0b0e] flex flex-col overflow-hidden flex-shrink-0"
                    >
                      {/* Drag-to-resize handle on left edge of Workspace Tree */}
                      <div
                        onMouseDown={handleStartTreeResize}
                        title="Drag to resize workspace tree"
                        className={`absolute left-0 top-0 bottom-0 w-1.5 z-20 cursor-col-resize transition-colors ${
                          isTreeResizing
                            ? 'bg-blue-500/70'
                            : 'hover:bg-blue-500/40 bg-transparent'
                        }`}
                      />
                      <div className="h-8 px-3 border-b border-white/[0.05] flex items-center justify-between text-[11.5px] font-medium text-zinc-400 flex-shrink-0">
                        <span>Workspace</span>
                        <button
                          type="button"
                          onClick={loadWorkspaceTree}
                          title="Refresh workspace tree"
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] bg-transparent border-none cursor-pointer"
                        >
                          <RotateCw className={`w-3 h-3 ${treeLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => setIsRootExpanded((v) => !v)}
                          className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-left text-[12px] font-medium text-zinc-200 hover:bg-white/[0.05] bg-transparent border-none cursor-pointer transition-colors"
                        >
                          <ChevronRight
                            className={`w-3 h-3 text-zinc-500 flex-shrink-0 transition-transform duration-150 ${
                              isRootExpanded ? 'rotate-90' : ''
                            }`}
                          />
                          {isRootExpanded ? (
                            <FolderOpen className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                          ) : (
                            <Folder className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{agentRootName || 'Workspace'}</span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isRootExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              {treeLoading && workspaceTree.length === 0 ? (
                                <div className="p-4 flex items-center justify-center text-xs text-zinc-500 gap-2">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Loading...</span>
                                </div>
                              ) : workspaceTree.length === 0 ? (
                                <div className="px-3 py-4 text-[11px] text-zinc-500">
                                  No files in workspace.
                                </div>
                              ) : (
                                renderTreeNodes(workspaceTree, 1)
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <>
              <div className="p-2.5 border-b flex items-center gap-2 border-white/[0.06]">
                <Search className="w-3.5 h-3.5 text-zinc-500 ml-1 pointer-events-none flex-shrink-0" />
                <input
                  type="text"
                  value={fileQuery}
                  onChange={(e) => {
                    setFileQuery(e.target.value);
                    loadWorkspaceFiles(e.target.value);
                  }}
                  placeholder="Filter workspace files..."
                  className="w-full h-7 bg-transparent border-none text-[12px] text-zinc-100 placeholder:text-zinc-500 outline-none"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {filesLoading ? (
                  <div className="p-4 flex items-center justify-center text-xs text-zinc-400 gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Scanning files...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                    <FolderOpen className="w-5 h-5 opacity-60" />
                    <span>No matching files in workspace.</span>
                  </div>
                ) : (
                  files.map((f) => {
                    const meta = getExtMeta(f.name);
                    const LangIcon = meta.Icon;
                    return (
                      <button
                        key={f.path}
                        type="button"
                        onClick={() => handleOpenFile(f)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left hover:bg-white/[0.05] bg-transparent border-none cursor-pointer transition-colors"
                      >
                        <LangIcon className={`w-4 h-4 ${meta.color} flex-shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-zinc-200 truncate">
                            {f.name}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 truncate">
                            {f.path}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* REVIEW / GIT STATUS VIEW */}
      {activeTool === 'review' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-10 px-3 border-b border-gray-200 dark:border-white/[0.07] flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTool('menu')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white bg-transparent border-none cursor-pointer p-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
              Review Changes
            </span>
            <button
              type="button"
              onClick={loadGitReview}
              className="p-1 rounded text-gray-400 hover:text-white bg-transparent border-none cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${reviewLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {reviewLoading ? (
              <div className="p-6 flex items-center justify-center text-xs text-gray-400 gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking git status...</span>
              </div>
            ) : !gitStatus?.success ? (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-xs text-gray-500 dark:text-zinc-400">
                {gitStatus?.error || 'Not a git repository or no active project selected.'}
              </div>
            ) : (
              <>
                <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/[0.04] text-xs font-mono text-gray-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Branch: {gitStatus.branch || 'HEAD'}</span>
                  <span>{gitStatus.changedFiles?.length || 0} changed</span>
                </div>
                {Array.isArray(gitStatus.changedFiles) && gitStatus.changedFiles.length > 0 ? (
                  <div className="space-y-1">
                    {gitStatus.changedFiles.map((file: any, idx: number) => {
                      const filePath = typeof file === 'string' ? file : file.path || file.file;
                      const status = typeof file === 'string' ? 'M' : file.status || 'M';
                      return (
                        <div
                          key={`${filePath}-${idx}`}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] text-[11px] font-mono"
                        >
                          <span className="truncate text-gray-800 dark:text-zinc-200">{filePath}</span>
                          <span className="text-amber-500 font-semibold flex-shrink-0">{status}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-zinc-400 px-1">
                    Working tree is clean.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </motion.aside>
  );
};
