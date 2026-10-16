import { useState, useEffect, useCallback, useMemo } from 'react';
import { Conversation, ChatMessage } from '../types/jarvis';

const STORAGE_KEY = 'grokki_conversations';
const ACTIVE_CONVO_KEY = 'grokki_active_convo_id';

function generateId(): string {
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

export function deriveSmartTitle(prompt: string, attachedFileName?: string): string {
  if (!prompt || !prompt.trim()) {
    return attachedFileName ? `File: ${attachedFileName}` : 'New Chat';
  }

  let text = prompt.trim().replace(/\n+/g, ' ');

  // 1. Handle Direct Slash Commands
  if (text.startsWith('/')) {
    const parts = text.slice(1).split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();
    const cmdTitles: Record<string, string> = {
      status: 'System Diagnostics',
      clean: 'Disk Cleanup',
      screenshot: 'Screen Capture',
      lock: 'Lock PC',
      compact: 'Compacted Context',
      btw: arg ? `Quick: ${arg}` : 'Quick Inquiry',
      goal: arg ? `Goal: ${arg}` : 'Autonomous Goal',
      plan: arg ? `Plan: ${arg}` : 'Execution Plan',
      browser: arg ? `Browse: ${arg}` : 'Web Search',
      notes: arg ? `Notes: ${arg}` : 'Study Notes',
      schedule: arg ? `Schedule: ${arg}` : 'Task Schedule',
      'grill-me': arg ? `Interview: ${arg}` : 'Plan Alignment',
      'teamwork-preview': arg ? `Team: ${arg}` : 'Agent Team',
    };
    if (cmdTitles[cmd]) {
      const res = cmdTitles[cmd];
      return res.length > 26 ? res.slice(0, 24) + '...' : res;
    }
  }

  // 2. Filter out single greetings so title isn't literally "hi"
  const lower = text.toLowerCase().replace(/[!.,?]+$/, '').trim();
  const simpleGreetings = ['hi', 'hello', 'hey', 'yo', 'sup', 'grokki', 'hey grokki', 'hi grokki', 'hello grokki', 'test'];
  if (simpleGreetings.includes(lower)) {
    return 'General Chat';
  }

  // 3. Clean up common conversational prefixes
  const prefixes = [
    /^(can you\s+(please\s+)?(help me\s+with|explain|write|create|make|show me|build))\s+/i,
    /^(could you\s+(please\s+)?(help me\s+with|explain|write|create|make|show me|build))\s+/i,
    /^(how do i|how to|how can i|what is|what are|tell me about|explain to me|write a|create a)\s+/i,
    /^(i need to|i want to|help me with)\s+/i,
  ];

  let cleaned = text;
  for (const p of prefixes) {
    if (p.test(cleaned)) {
      cleaned = cleaned.replace(p, '');
      break;
    }
  }

  cleaned = cleaned.trim();
  if (cleaned) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } else {
    cleaned = text;
  }

  if (cleaned.length > 26) {
    const truncated = cleaned.slice(0, 26);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 14) {
      return truncated.slice(0, lastSpace) + '...';
    }
    return truncated + '...';
  }

  return cleaned;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // Check legacy chat history
      const legacy = localStorage.getItem('grokki_chat_history');
      if (legacy) {
        const legacyMsgs: ChatMessage[] = JSON.parse(legacy);
        if (Array.isArray(legacyMsgs) && legacyMsgs.length > 0) {
          const firstUserMsg = legacyMsgs.find((m) => m.role === 'user');
          const title = firstUserMsg ? deriveSmartTitle(firstUserMsg.content) : 'Previous Chat';
          return [
            {
              id: generateId(),
              title,
              updatedAt: Date.now(),
              messages: legacyMsgs,
            },
          ];
        }
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
    // Default initial conversation
    return [
      {
        id: generateId(),
        title: 'New Chat',
        updatedAt: Date.now(),
        messages: [],
      },
    ];
  });

  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const savedActive = localStorage.getItem(ACTIVE_CONVO_KEY);
      if (savedActive) return savedActive;
    } catch (e) {}
    return '';
  });

  // Ensure activeId points to a valid conversation
  useEffect(() => {
    if (!conversations.some((c) => c.id === activeId)) {
      const fallbackId = conversations[0]?.id || generateId();
      setActiveId(fallbackId);
      try {
        localStorage.setItem(ACTIVE_CONVO_KEY, fallbackId);
      } catch (e) {}
    }
  }, [conversations, activeId]);

  // Sync conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.error('Failed to persist conversations:', e);
    }
  }, [conversations]);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
    try {
      localStorage.setItem(ACTIVE_CONVO_KEY, id);
    } catch (e) {}
  }, []);

  const createConversation = useCallback(() => {
    const newConvo: Conversation = {
      id: generateId(),
      title: 'New Chat',
      updatedAt: Date.now(),
      messages: [],
    };
    setConversations((prev) => [newConvo, ...prev]);
    setActiveId(newConvo.id);
    try {
      localStorage.setItem(ACTIVE_CONVO_KEY, newConvo.id);
    } catch (e) {}
    return newConvo.id;
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        // Create a blank conversation if all were deleted
        const brandNew: Conversation = {
          id: generateId(),
          title: 'New Chat',
          updatedAt: Date.now(),
          messages: [],
        };
        setActiveId(brandNew.id);
        try {
          localStorage.setItem(ACTIVE_CONVO_KEY, brandNew.id);
        } catch (e) {}
        return [brandNew];
      }
      return filtered;
    });

    setActiveId((currActive) => {
      if (currActive === id) {
        // Switch to the first available remaining conversation
        setConversations((latest) => {
          const remaining = latest.filter((c) => c.id !== id);
          const nextId = remaining[0]?.id || '';
          try {
            if (nextId) localStorage.setItem(ACTIVE_CONVO_KEY, nextId);
          } catch (e) {}
          return latest;
        });
      }
      return currActive;
    });
  }, []);

  const renameConversation = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c))
    );
  }, []);

  const updateActiveMessages = useCallback((updater: (prevMessages: ChatMessage[]) => ChatMessage[]) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.id !== activeId) return convo;
        const nextMsgs = updater(convo.messages);
        let nextTitle = convo.title;
        // If title is default 'New Chat', derive from first user message
        if (convo.title === 'New Chat') {
          const firstUser = nextMsgs.find((m) => m.role === 'user');
          if (firstUser) {
            const fileName = typeof firstUser.attachedFile === 'string'
              ? firstUser.attachedFile.split('\\').pop()
              : firstUser.attachedFile?.name;
            nextTitle = deriveSmartTitle(firstUser.content, fileName);
          }
        }
        return {
          ...convo,
          title: nextTitle,
          updatedAt: Date.now(),
          messages: nextMsgs,
        };
      })
    );
  }, [activeId]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeId) || conversations[0] || {
      id: 'default',
      title: 'New Chat',
      updatedAt: Date.now(),
      messages: [],
    };
  }, [conversations, activeId]);

  return {
    conversations,
    activeConversation,
    activeConversationId: activeConversation.id,
    selectConversation,
    createConversation,
    deleteConversation,
    renameConversation,
    updateActiveMessages,
  };
}
