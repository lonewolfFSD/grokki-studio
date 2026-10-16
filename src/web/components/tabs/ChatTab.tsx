import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Mic,
  Plus,
  Paperclip,
  Copy,
  Check,
  Volume2,
  Square,
  Terminal,
  RefreshCw,
  X,
  FileText,
  FileCode,
  Image as ImageIcon,
  File,
} from 'lucide-react';
import { marked } from 'marked';
import { JarvisConfig, Conversation, ChatMessage, AttachedFileInfo } from '../../types/jarvis';

const grokkiIcon = './assets/grokki_icon.svg';

interface ChatTabProps {
  config: JarvisConfig;
  userName: string;
  onNavigateTab: (tabId: any) => void;
  activeConversation: Conversation;
  onUpdateMessages: (updater: (prevMessages: ChatMessage[]) => ChatMessage[]) => void;
  onNewChat: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(ext?: string) {
  const e = (ext || '').toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp'].includes(e)) {
    return <ImageIcon className="w-4 h-4 text-emerald-500" />;
  }
  if (['.js', '.ts', '.tsx', '.jsx', '.py', '.html', '.css', '.json', '.cpp', '.c', '.cs', '.java', '.go', '.rs'].includes(e)) {
    return <FileCode className="w-4 h-4 text-blue-500" />;
  }
  if (['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.csv', '.xlsx'].includes(e)) {
    return <FileText className="w-4 h-4 text-amber-500" />;
  }
  return <File className="w-4 h-4 text-gray-500" />;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  config,
  userName,
  onNavigateTab,
  activeConversation,
  onUpdateMessages,
  onNewChat,
}) => {
  const messages = activeConversation.messages;
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFileInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading]);

  const handleSelectFile = async () => {
    if (!window.jarvisAPI?.selectFile) return;
    try {
      const res = await window.jarvisAPI.selectFile();
      if (!res.canceled && res.path) {
        setAttachedFile({
          path: res.path,
          name: res.name || res.path.split('\\').pop() || 'file',
          size: res.size,
          ext: res.ext || (res.path.includes('.') ? '.' + res.path.split('.').pop()?.toLowerCase() : ''),
        });
      } else if (!res.canceled && res.filePaths && res.filePaths.length > 0) {
        const p = res.filePaths[0];
        setAttachedFile({
          path: p,
          name: p.split('\\').pop() || 'file',
          ext: p.includes('.') ? '.' + p.split('.').pop()?.toLowerCase() : '',
        });
      }
    } catch (err) {
      console.error('File select error:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    let text = (textToSend || inputValue).trim();
    if (!text && !attachedFile) return;

    // If user sent a file without typing text, provide a natural prompt
    if (!text && attachedFile) {
      text = `Analyze and summarize this file: ${attachedFile.name}`;
    }

    const currentAttachment = attachedFile;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFile: currentAttachment || undefined,
    };

    onUpdateMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setAttachedFile(null);
    setLoading(true);

    try {
      if (window.jarvisAPI?.executeAI) {
        const context: any = {};
        if (currentAttachment) {
          context.filePath = currentAttachment.path;
          context.attachedFile = currentAttachment;
        }
        const res = await window.jarvisAPI.executeAI(text, context);
        const replyContent = res.reply || res.message || 'Action executed successfully.';

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: replyContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionsExecuted: res.actionsExecuted,
        };
        onUpdateMessages((prev) => [...prev, assistantMsg]);
      } else {
        setTimeout(() => {
          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I received your command: **"${text}"**${currentAttachment ? ` with attachment \`${currentAttachment.name}\`` : ''}.\n\nGrokki Studio is connected and ready to automate Windows, manage your workspace, and synthesize voices.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          onUpdateMessages((prev) => [...prev, assistantMsg]);
          setLoading(false);
        }, 500);
        return;
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Execution Error**: ${err.message || 'Failed to communicate with Agent Brain.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      onUpdateMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = async (id: string, text: string) => {
    if (speakingId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeakingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setSpeakingId(id);
    try {
      if (window.jarvisAPI?.speakText) {
        const cleanText = text.replace(/[*#`_~\[\]]/g, '').slice(0, 350);
        const res = await window.jarvisAPI.speakText(cleanText, config.ttsVoice || 'af_bella');
        if (res && res.success && res.base64Audio) {
          const audio = new Audio(`data:audio/wav;base64,${res.base64Audio}`);
          audioRef.current = audio;
          audio.onended = () => {
            setSpeakingId(null);
            audioRef.current = null;
          };
          audio.play();
        } else {
          setSpeakingId(null);
        }
      }
    } catch (e) {
      setSpeakingId(null);
    }
  };

  const suggestions = [
    {
      title: 'Windows Health & Diagnostics',
      desc: 'Check CPU load, NVIDIA GPU temp, and system memory.',
      prompt: 'Check PC battery, CPU, GPU, and memory load.',
    },
    {
      title: 'System Storage & Cleanup',
      desc: 'Clear temporary cache and check drive free space.',
      prompt: 'Check drive storage space and clear temporary cache files.',
    },
    {
      title: 'Google Calendar & Agenda',
      desc: "Retrieve today's schedule and pending deadlines.",
      prompt: 'What meetings and events do I have on Google Calendar today?',
    },
    {
      title: 'Clean Fullscreen Screenshot',
      desc: 'Capture screen directly to Desktop and Clipboard.',
      prompt: 'Take a clean fullscreen screenshot and copy to clipboard.',
    },
  ];

  const renderMarkdown = (content: string) => {
    return { __html: marked.parse(content) as string };
  };

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto justify-between relative pb-3">
      {/* Messages / Hero View */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-6 pb-4">
          {/* Grokki Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] text-[11px] font-semibold text-gray-800 dark:text-gray-200 mb-3 select-none">
            <img src={grokkiIcon} alt="Grokki" className="w-3.5 h-3.5 rounded-full" />
            <span>Grokki</span>
          </div>

          {/* Persona Heading */}
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-6 font-sans">
            Ready when you are. What are we executing today?
          </h1>

          {/* Staged File Preview Card */}
          {attachedFile && (
            <div className="w-full max-w-xl mx-auto mb-3 p-2.5 bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-2xl shadow-sm flex items-center justify-between text-left transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center flex-shrink-0 border border-gray-200/60 dark:border-[#252836]">
                  {getFileIcon(attachedFile.ext)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {attachedFile.name}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    {formatFileSize(attachedFile.size) ? `${formatFileSize(attachedFile.size)} • ` : ''}Ready to share with Grokki
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                title="Remove attachment"
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-[#1e2029] transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Centered Floating Input Pill */}
          <div className="w-full max-w-xl bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-full py-2 px-3.5 shadow-sm hover:shadow-md transition-all flex items-center gap-2.5">
            {/* Attach Tool Button */}
            <button
              type="button"
              onClick={handleSelectFile}
              title="Attach File or Context"
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={attachedFile ? `Ask Grokki about ${attachedFile.name}...` : "Ask Grokki to automate Windows, summarize, compose..."}
              className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 font-sans"
              autoFocus
            />

            {/* Pill Badge */}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] font-mono select-none">
              Alpha
            </span>

            {/* Voice Dictate Button */}
            <button
              type="button"
              onClick={() => handleSendMessage('Check PC battery and memory load.')}
              title="Voice Input"
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1 flex items-center justify-center"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send Arrow Button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() && !attachedFile}
              title="Send Message"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none shadow-xs flex-shrink-0 ${
                inputValue.trim() || attachedFile
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                  : 'bg-gray-200 dark:bg-[#1e2029] text-gray-400 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Suggestions Grid */}
          <div className="w-full max-w-xl mt-8 text-left">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 tracking-wider uppercase block mb-2.5">
              Suggestions
            </span>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="p-3 rounded-xl bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer transition-all flex flex-col gap-0.5 shadow-xs hover:shadow-sm"
                >
                  <strong className="text-xs font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                    {item.title}
                  </strong>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active Conversation Thread (Clean, Modern Chat Bubbles) */
        <div className="flex-1 flex flex-col overflow-y-auto px-1 py-3 space-y-5">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 dark:border-[#1e2029]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate max-w-xs">
                {activeConversation.title || 'Conversation'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029]">
                {messages.length} messages • saved locally
              </span>
            </div>
            <button
              type="button"
              onClick={onNewChat}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border-none bg-transparent"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Messages Flow */}
          <div className="flex flex-col space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}
                >
                  {isUser ? (
                    /* User Message: Clean Modern Rounded Bubble */
                    <div className="max-w-[75%] bg-gray-100 dark:bg-[#1a1c24] text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-2xl rounded-tr-xs text-sm font-medium leading-relaxed border border-gray-200/60 dark:border-[#1e2029] shadow-xs">
                      {msg.attachedFile && (
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/70 dark:bg-[#13141a]/70 border border-gray-200 dark:border-gray-700/60 mb-2 text-xs font-mono">
                          {getFileIcon(typeof msg.attachedFile === 'string' ? msg.attachedFile : msg.attachedFile.ext)}
                          <span className="truncate max-w-[200px] font-semibold text-gray-800 dark:text-gray-200">
                            {typeof msg.attachedFile === 'string' ? msg.attachedFile.split('\\').pop() : msg.attachedFile.name}
                          </span>
                          {typeof msg.attachedFile !== 'string' && msg.attachedFile.size ? (
                            <span className="text-[10px] text-gray-400">
                              ({formatFileSize(msg.attachedFile.size)})
                            </span>
                          ) : null}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap m-0 leading-relaxed text-[13.5px]">
                        {msg.content}
                      </p>
                    </div>
                  ) : (
                    /* Grokki Assistant Message: Natural Flow */
                    <div className="flex items-start gap-3 max-w-[92%] w-full">
                      {/* Real Grokki Orb Avatar */}
                      <img
                        src={grokkiIcon}
                        alt="Grokki"
                        className="w-6 h-6 rounded-full shadow-xs flex-shrink-0 mt-1 select-none"
                      />

                      {/* Content Area */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                            Grokki
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                            {msg.timestamp}
                          </span>
                        </div>

                        {/* Executed Tools Actions Pills */}
                        {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 my-1.5">
                            {msg.actionsExecuted.map((act, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#1e2029]"
                              >
                                <Terminal className="w-3 h-3 text-gray-500" />
                                <span>{act.name}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Rendered Markdown Body */}
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 text-sm leading-relaxed font-sans"
                          dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                        />

                        {/* Pure Icon-Only Actions */}
                        <div className="flex items-center gap-1 mt-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            title="Copy message"
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-colors cursor-pointer border-none bg-transparent"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-gray-900 dark:text-white" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSpeak(msg.id, msg.content)}
                            title="Read aloud"
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-colors cursor-pointer border-none bg-transparent"
                          >
                            {speakingId === msg.id ? (
                              <Square className="w-3.5 h-3.5 fill-current text-gray-900 dark:text-white" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking / Running Indicator */}
            {loading && (
              <div className="flex items-start gap-3 max-w-[92%] w-full">
                <img
                  src={grokkiIcon}
                  alt="Grokki"
                  className="w-6 h-6 rounded-full shadow-xs flex-shrink-0 mt-1 animate-pulse select-none"
                />
                <div className="flex items-center gap-2 py-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                  <span>Grokki is executing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Pinned Bottom Input Bar */}
      {messages.length > 0 && (
        <div className="w-full pt-2.5 bg-gradient-to-t from-[#f7f7fa] dark:from-[#0c0d12] to-transparent">
          {/* Staged File Preview Card */}
          {attachedFile && (
            <div className="w-full max-w-xl mx-auto mb-2 p-2.5 bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-2xl shadow-sm flex items-center justify-between text-left transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1c24] flex items-center justify-center flex-shrink-0 border border-gray-200/60 dark:border-[#252836]">
                  {getFileIcon(attachedFile.ext)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {attachedFile.name}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    {formatFileSize(attachedFile.size) ? `${formatFileSize(attachedFile.size)} • ` : ''}Ready to share with Grokki
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                title="Remove attachment"
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-[#1e2029] transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="w-full max-w-xl mx-auto bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-full py-2 px-3.5 shadow-sm hover:shadow-md transition-all flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSelectFile}
              title="Attach File or Context"
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-none p-1 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={attachedFile ? `Ask Grokki about ${attachedFile.name}...` : "Ask Grokki anything or give an action command..."}
              className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 font-sans"
            />

            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] font-mono select-none">
              v2.5
            </span>

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() && !attachedFile}
              title="Send Message"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border-none shadow-xs flex-shrink-0 ${
                inputValue.trim() || attachedFile
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                  : 'bg-gray-200 dark:bg-[#1e2029] text-gray-400 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
