import { useState, useEffect, useCallback, useMemo } from 'react';
import { Conversation, ChatMessage } from '../types/jarvis';

const STORAGE_KEY = 'grokki_conversations';
const ACTIVE_CONVO_KEY = 'grokki_active_convo_id';

function generateId(): string {
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

function deriveTitle(prompt: string, attachedFileName?: string): string {
  if (prompt && prompt.trim()) {
    const clean = prompt.trim().replace(/\n+/g, ' ');
    return clean.length > 28 ? clean.slice(0, 28) + '...' : clean;
  }
  if (attachedFileName) {
    return 'File: ' + attachedFileName;
  }
  return 'New Chat';
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
          const title = firstUserMsg ? deriveTitle(firstUserMsg.content) : 'Previous Chat';
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
            nextTitle = deriveTitle(firstUser.content, fileName);
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
    updateActiveMessages,
  };
}
