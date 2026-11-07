import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, MessageSquare, Pin, ArrowRight, CornerDownLeft } from 'lucide-react';
import { Conversation, TabId } from '../types/jarvis';

interface ChatSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onSelectTab: (tab: TabId) => void;
}

interface SearchResultItem {
  convo: Conversation;
  matchedText?: string;
  isSnippetMatch?: boolean;
  dateGroup: string;
  groupTimestamp: number;
}

export const ChatSearchModal: React.FC<ChatSearchModalProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onSelectTab,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened & reset state
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Compute date categories and filtered items
  const { groupedResults, flatResults } = useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return { groupedResults: new Map<string, SearchResultItem[]>(), flatResults: [] };
    }

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 86400000;
    const sevenDaysAgo = todayMidnight - 7 * 86400000;

    const trimmedQuery = query.trim().toLowerCase();

    const items: SearchResultItem[] = [];

    for (const convo of conversations) {
      const createdTs =
        (typeof convo.createdAt === 'number' && convo.createdAt > 0)
          ? convo.createdAt
          : (convo.id.startsWith('c_') ? parseInt(convo.id.split('_')[1], 36) : 0) || convo.updatedAt || Date.now();

      let dateGroup: string;
      let groupTimestamp: number;

      if (createdTs >= todayMidnight) {
        dateGroup = 'Today';
        groupTimestamp = todayMidnight;
      } else if (createdTs >= yesterdayMidnight) {
        dateGroup = 'Yesterday';
        groupTimestamp = yesterdayMidnight;
      } else if (createdTs >= sevenDaysAgo) {
        dateGroup = 'Previous 7 Days';
        groupTimestamp = sevenDaysAgo;
      } else {
        const convoDate = new Date(createdTs);
        const isSameYear = convoDate.getFullYear() === now.getFullYear();
        dateGroup = convoDate.toLocaleDateString(undefined, {
          month: 'long',
          ...(isSameYear ? {} : { year: 'numeric' }),
        });
        groupTimestamp = new Date(convoDate.getFullYear(), convoDate.getMonth(), 1).getTime();
      }

      if (!trimmedQuery) {
        // No query: show all recent chats with their latest message snippet
        const lastMsg = convo.messages && convo.messages.length > 0 ? convo.messages[convo.messages.length - 1].content : undefined;
        items.push({
          convo,
          matchedText: lastMsg,
          isSnippetMatch: false,
          dateGroup,
          groupTimestamp,
        });
      } else {
        // Query exists: search title and message contents
        const titleMatch = (convo.title || 'New Chat').toLowerCase().includes(trimmedQuery);
        let messageMatchSnippet: string | undefined;

        if (convo.messages && convo.messages.length > 0) {
          for (let i = convo.messages.length - 1; i >= 0; i--) {
            const content = convo.messages[i].content || '';
            const idx = content.toLowerCase().indexOf(trimmedQuery);
            if (idx !== -1) {
              const start = Math.max(0, idx - 30);
              const end = Math.min(content.length, idx + trimmedQuery.length + 50);
              const snippet = (start > 0 ? '...' : '') + content.slice(start, end).trim() + (end < content.length ? '...' : '');
              messageMatchSnippet = snippet;
              break;
            }
          }
        }

        if (titleMatch || messageMatchSnippet) {
          items.push({
            convo,
            matchedText: messageMatchSnippet || (convo.messages && convo.messages.length > 0 ? convo.messages[convo.messages.length - 1].content : undefined),
            isSnippetMatch: !!messageMatchSnippet,
            dateGroup,
            groupTimestamp,
          });
        }
      }
    }

    // Sort items: pinned first, then by date/activity descending
    items.sort((a, b) => {
      if (a.convo.isPinned && !b.convo.isPinned) return -1;
      if (!a.convo.isPinned && b.convo.isPinned) return 1;
      const tsA = a.convo.updatedAt || a.groupTimestamp;
      const tsB = b.convo.updatedAt || b.groupTimestamp;
      return tsB - tsA;
    });

    // Group by dateGroup preserving chronological order
    const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days'];
    const grouped = new Map<string, SearchResultItem[]>();

    for (const item of items) {
      if (!grouped.has(item.dateGroup)) {
        grouped.set(item.dateGroup, []);
      }
      grouped.get(item.dateGroup)!.push(item);
    }

    // Sort group keys
    const sortedGroups = new Map<string, SearchResultItem[]>();
    for (const g of groupOrder) {
      if (grouped.has(g)) {
        sortedGroups.set(g, grouped.get(g)!);
      }
    }
    for (const [key, val] of grouped.entries()) {
      if (!sortedGroups.has(key)) {
        sortedGroups.set(key, val);
      }
    }

    return { groupedResults: sortedGroups, flatResults: items };
  }, [conversations, query]);

  // Handle keyboard navigation inside the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (flatResults.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = flatResults[selectedIndex];
        if (selected) {
          handleSelect(selected.convo.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatResults, selectedIndex]);

  // Keep selected index in bounds when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = (convoId: string) => {
    onSelectConversation?.(convoId);
    onSelectTab('chat');
    onClose();
  };

  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="text-white font-semibold underline decoration-white/40">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  let runningIndex = 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10000] bg-black/65 backdrop-blur-md flex items-start justify-center pt-[12vh] px-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#19191c] border border-white/[0.08] shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[72vh] animate-in zoom-in-95 duration-150"
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] bg-transparent">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats, questions, and messages..."
            className="w-full bg-transparent text-[14px] text-gray-100 placeholder-gray-500 outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center"
            >
              <X size={15} />
            </button>
          ) : (
            <kbd className="text-[10px] font-mono text-gray-400 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded select-none">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-1.5 no-scrollbar">
          {flatResults.length === 0 ? (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3 text-gray-500">
                <Search size={18} />
              </div>
              <p className="text-[13.5px] font-medium text-gray-300">No chats found</p>
              <p className="text-[12px] text-gray-500 mt-1">
                {query ? `No conversations match "${query}"` : 'Start a new chat to begin'}
              </p>
            </div>
          ) : (
            Array.from(groupedResults.entries()).map(([dateLabel, items]) => (
              <div key={dateLabel} className="mb-2 last:mb-0">
                {/* Date Group Header */}
                <div className="px-3 pt-2 pb-1 text-[10.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider select-none">
                  {dateLabel}
                </div>

                {/* Items in this date group */}
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const currentIndex = runningIndex++;
                    const isSelected = currentIndex === selectedIndex;

                    return (
                      <div
                        key={item.convo.id}
                        data-index={currentIndex}
                        onClick={() => handleSelect(item.convo.id)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white/[0.035] text-white'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.025]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {item.convo.isPinned ? (
                            <Pin size={14} className={`rotate-45 flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`} />
                          ) : (
                            <MessageSquare
                              size={14}
                              className={`flex-shrink-0 ${
                                isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                              }`}
                            />
                          )}
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className={`text-[13px] font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                              {highlightMatch(item.convo.title || 'New Chat', query)}
                            </span>
                            {item.matchedText && (
                              <span className="text-[11.5px] text-gray-500 truncate mt-0.5">
                                {item.isSnippetMatch
                                  ? highlightMatch(item.matchedText, query)
                                  : item.matchedText}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isSelected && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400 font-normal">
                              <span>Open</span>
                              <CornerDownLeft size={11} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer with quick keyboard instructions */}
        <div className="px-4 py-2 bg-transparent border-t border-white/[0.06] flex items-center justify-between text-[11.5px] text-gray-500 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white/[0.04] border border-white/[0.06] px-1 py-0.5 rounded text-[10px]">↑</kbd>
              <kbd className="font-mono bg-white/[0.04] border border-white/[0.06] px-1 py-0.5 rounded text-[10px]">↓</kbd>
              <span className="ml-0.5">to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded text-[10px]">↵</kbd>
              <span className="ml-0.5">to select</span>
            </span>
          </div>
          <div>
            <span>{flatResults.length} {flatResults.length === 1 ? 'chat' : 'chats'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSearchModal;
