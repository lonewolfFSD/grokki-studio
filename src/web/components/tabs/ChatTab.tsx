import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Mic, Plus, Paperclip, Copy, Check, Volume2, Square, Sparkles, Terminal, FileText, CornerDownLeft, RefreshCw } from 'lucide-react';
import { marked } from 'marked';
import { JarvisConfig } from '../../types/jarvis';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionsExecuted?: any[];
  attachedFile?: string;
}

interface ChatTabProps {
  config: JarvisConfig;
  userName: string;
  onNavigateTab: (tabId: any) => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({ config, userName, onNavigateTab }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);
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
      if (!res.canceled && res.filePaths && res.filePaths.length > 0) {
        setAttachedFile(res.filePaths[0]);
      }
    } catch (err) {
      console.error('File select error:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text && !attachedFile) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFile: attachedFile || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    const currentAttachment = attachedFile;
    setAttachedFile(null);
    setLoading(true);

    try {
      if (window.jarvisAPI?.executeAI) {
        const context: any = {};
        if (currentAttachment) {
          context.filePath = currentAttachment;
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
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Fallback simulated response if running outside Electron
        setTimeout(() => {
          const assistantMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `I received your command: **"${text}"**.\n\nGrokki Studio is connected and ready to automate Windows, manage your workspace, and synthesize voices.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setLoading(false);
        }, 600);
        return;
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ **Execution Error**: ${err.message || 'Failed to communicate with Agent Brain.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
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

  const handleResetChat = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeakingId(null);
    setMessages([]);
    setAttachedFile(null);
  };

  const suggestions = [
    {
      title: 'Windows System Diagnostics',
      desc: 'Check storage drives, clean temporary cache, and empty recycle bin.',
      prompt: 'Check my drive storage status and clear temporary cache files.',
    },
    {
      title: 'Google Calendar & Agenda',
      desc: 'Retrieve today\'s schedule and pending deadlines.',
      prompt: 'What meetings and events do I have on Google Calendar today?',
    },
    {
      title: 'Kokoro Voiceover Synthesis',
      desc: 'Generate clean 24kHz neural speech sample.',
      prompt: 'Speak this phrase with your active neural voice: "Welcome to Grokki Studio. The multimodal interface is fully active."',
    },
    {
      title: 'Multimodal Desktop Automation',
      desc: 'Open applications, capture clean screenshots, or control volume.',
      prompt: 'Take a clean fullscreen screenshot and save it to Desktop.',
    },
  ];

  const renderMarkdown = (content: string) => {
    return { __html: marked.parse(content) as string };
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto justify-between relative pb-4">
      {/* Messages / Hero View */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-12 pb-6">
          {/* ElevenLabs Style Large Hero Title */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-8 font-sans">
            What would you like to create?
          </h1>

          {/* Centered Floating Input Pill (Hero State) */}
          <div className="w-full max-w-2xl bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-full p-2.5 px-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
            {/* Glowing Radial Gradient Avatar Sphere */}
            <div
              className="w-7 h-7 rounded-full shadow-xs flex-shrink-0 cursor-pointer border border-white/30"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #ff758c 0%, #ff416c 60%, #990033 100%)',
              }}
              title="Grokki Agent Core"
            />

            {/* Attach Tool Button */}
            <button
              type="button"
              onClick={handleSelectFile}
              title="Attach File or Context"
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center justify-center"
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
              placeholder="Create a product ad with voiceover..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 font-sans"
              autoFocus
            />

            {/* Attached file chip if any */}
            {attachedFile && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#1e2029] flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{attachedFile.split('\\').pop() || 'file'}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="hover:text-red-500 cursor-pointer ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            {/* Pill Badge */}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] font-mono select-none">
              Alpha
            </span>

            {/* Voice Dictate Button */}
            <button
              type="button"
              onClick={() => handleSendMessage('Hello Grokki!')}
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
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border-none shadow-xs flex-shrink-0 ${
                inputValue.trim() || attachedFile
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                  : 'bg-gray-200 dark:bg-[#1e2029] text-gray-400 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Suggestions Grid (ElevenLabs Style) */}
          <div className="w-full max-w-2xl mt-12 text-left">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 tracking-wider block mb-3">
              Suggestions
            </span>
            <div className="grid grid-cols-2 gap-3.5 w-full">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  className="p-4 rounded-xl bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer transition-all flex flex-col gap-1 shadow-xs hover:shadow-sm"
                >
                  <strong className="text-xs font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                    {item.title}
                  </strong>
                  <p className="text-xs text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active Conversation Thread */
        <div className="flex-1 flex flex-col overflow-y-auto px-2 py-4 space-y-6">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-[#1e2029]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                Conversation
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029]">
                {messages.length} messages
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetChat}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Messages List */}
          <div className="flex flex-col space-y-5">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full`}
                >
                  {isUser ? (
                    /* User Message */
                    <div className="max-w-[80%] bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl rounded-tr-sm px-4.5 py-3 shadow-xs">
                      {msg.attachedFile && (
                        <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1 pb-1 border-b border-white/20 dark:border-black/20 font-mono">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="truncate">{msg.attachedFile.split('\\').pop()}</span>
                        </div>
                      )}
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap m-0">
                        {msg.content}
                      </p>
                      <span className="block text-[10px] opacity-60 text-right mt-1 font-mono">
                        {msg.timestamp}
                      </span>
                    </div>
                  ) : (
                    /* Grokki Agent Message */
                    <div className="flex items-start gap-3.5 max-w-[90%]">
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full shadow-xs flex-shrink-0 border border-white/20 mt-0.5"
                        style={{
                          background: 'radial-gradient(circle at 35% 35%, #ff758c 0%, #ff416c 60%, #990033 100%)',
                        }}
                      />

                      {/* Content Card */}
                      <div className="flex-1 bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-2xl rounded-tl-sm p-4.5 shadow-xs text-gray-900 dark:text-gray-100">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-[#1e2029]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                              Grokki Agent
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029]">
                              {config.provider.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                            {msg.timestamp}
                          </span>
                        </div>

                        {/* Executed Tools Actions Pills */}
                        {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {msg.actionsExecuted.map((act, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-gray-100 dark:bg-[#1a1c24] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#1e2029]"
                              >
                                <Terminal className="w-3 h-3 text-gray-500" />
                                <span>{act.name}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Rendered Markdown Body */}
                        <div
                          className="prose dark:prose-invert text-sm leading-relaxed max-w-none font-sans"
                          dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                        />

                        {/* Action Toolbar */}
                        <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-100 dark:border-[#1e2029]">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            title="Copy to clipboard"
                            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border-none"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-gray-900 dark:text-white" />
                                <span className="text-[11px] font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-medium">Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSpeak(msg.id, msg.content)}
                            title="Read Aloud with Kokoro Voice"
                            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#1a1c24] transition-all cursor-pointer border-none"
                          >
                            {speakingId === msg.id ? (
                              <>
                                <Square className="w-3.5 h-3.5 fill-current text-gray-900 dark:text-white" />
                                <span className="text-[11px] font-medium">Stop Audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span className="text-[11px] font-medium">Listen ({config.ttsVoice || 'Bella'})</span>
                              </>
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
              <div className="flex items-start gap-3.5 max-w-[90%]">
                <div
                  className="w-8 h-8 rounded-full shadow-xs flex-shrink-0 border border-white/20 mt-0.5 animate-pulse"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, #ff758c 0%, #ff416c 60%, #990033 100%)',
                  }}
                />
                <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 font-mono">
                    Grokki is thinking & executing actions...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Pinned Bottom Input Bar (when in conversation mode) */}
      {messages.length > 0 && (
        <div className="w-full pt-3 bg-gradient-to-t from-[#f7f7fa] dark:from-[#0c0d12] to-transparent">
          <div className="w-full max-w-3xl mx-auto bg-white dark:bg-[#13141a] border border-gray-200 dark:border-[#1e2029] rounded-full p-2.5 px-4 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full shadow-xs flex-shrink-0 cursor-pointer border border-white/30"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #ff758c 0%, #ff416c 60%, #990033 100%)',
              }}
            />

            <button
              type="button"
              onClick={handleSelectFile}
              title="Attach File or Context"
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Grokki anything or give an action command..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 font-sans"
            />

            {attachedFile && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#1e2029] flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[90px]">{attachedFile.split('\\').pop()}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="hover:text-red-500 cursor-pointer ml-0.5"
                >
                  ×
                </button>
              </span>
            )}

            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] font-mono select-none">
              v2.5
            </span>

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() && !attachedFile}
              title="Send Message"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border-none shadow-xs flex-shrink-0 ${
                inputValue.trim() || attachedFile
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                  : 'bg-gray-200 dark:bg-[#1e2029] text-gray-400 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
