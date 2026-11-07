import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CornerDownLeft, Image as ImageIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { ChatMessage } from '../types/jarvis';
import { isImageAttachment } from './ChatImageAttachment';
import grokkiIcon from '../assets/grokki_icon.svg';

interface ConversationTimelineProps {
  messages: ChatMessage[];
  conversationTitle?: string;
  scrollContainerId: string;
}

interface ConversationMoment {
  id: string;
  userMsg: ChatMessage;
  assistantMsg?: ChatMessage;
  turnIndex: number;
}

export const ConversationTimeline: React.FC<ConversationTimelineProps> = ({
  messages,
  scrollContainerId,
}) => {
  const [scrollPercent, setScrollPercent] = useState(0);
  const [hoveredMoment, setHoveredMoment] = useState<ConversationMoment | null>(null);
  const [hoveredDotY, setHoveredDotY] = useState<number | null>(null);
  const railContainerRef = useRef<HTMLDivElement>(null);
  const dotsScrollRef = useRef<HTMLDivElement>(null);
  const dotElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const closeTimeoutRef = useRef<any>(null);

  // Group messages into distinct (User Prompt + Grokki Reply) moments
  const moments = useMemo<ConversationMoment[]>(() => {
    if (!messages || messages.length === 0) return [];

    const result: ConversationMoment[] = [];
    let turnCount = 0;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        turnCount++;
        // Find corresponding assistant reply immediately following this user message
        const nextMsg =
          i + 1 < messages.length && messages[i + 1].role === 'assistant'
            ? messages[i + 1]
            : undefined;

        result.push({
          id: msg.id,
          userMsg: msg,
          assistantMsg: nextMsg,
          turnIndex: turnCount,
        });
      }
    }

    return result;
  }, [messages]);

  // Determine if conversation is long enough to warrant overflow limit, chevrons, and fading
  const isOverflowing = moments.length > 32;

  // Active turn index calculated purely from scroll percentage
  const activeTurnIndex = useMemo(() => {
    if (moments.length === 0) return 0;
    const idx = Math.min(moments.length - 1, Math.floor(scrollPercent * moments.length));
    return idx;
  }, [scrollPercent, moments.length]);

  // Keep active dot in view if overflowing
  useEffect(() => {
    if (isOverflowing && dotElementsRef.current[activeTurnIndex]) {
      dotElementsRef.current[activeTurnIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [activeTurnIndex, isOverflowing]);

  // Listen to scroll events on chat container to sync active dot indicator
  useEffect(() => {
    const container = document.getElementById(scrollContainerId);
    if (!container) return;

    const handleScroll = () => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 0) {
        setScrollPercent(1);
      } else {
        const pct = Math.min(1, Math.max(0, container.scrollTop / maxScroll));
        setScrollPercent(pct);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerId, messages.length]);

  // Jump to specific message smoothly with subtle pulse
  const scrollToMoment = useCallback((msgId: string) => {
    const el = document.getElementById(`chat-msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('chat-turn-highlight');
      setTimeout(() => {
        el.classList.remove('chat-turn-highlight');
      }, 1600);
    }
  }, []);

  const handleScrollUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIdx = Math.max(0, activeTurnIndex - 1);
    if (moments[prevIdx]) {
      scrollToMoment(moments[prevIdx].id);
    }
  };

  const handleScrollDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = Math.min(moments.length - 1, activeTurnIndex + 1);
    if (moments[nextIdx]) {
      scrollToMoment(moments[nextIdx].id);
    }
  };

  const handleDotMouseEnter = (moment: ConversationMoment, e: React.MouseEvent<HTMLDivElement>) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (railContainerRef.current) {
      const railRect = railContainerRef.current.getBoundingClientRect();
      const dotRect = e.currentTarget.getBoundingClientRect();
      // Center Y of the hovered dot relative to the rail container
      const relativeCenterY = dotRect.top + dotRect.height / 2 - railRect.top;
      setHoveredDotY(relativeCenterY);
    }

    setHoveredMoment(moment);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredMoment(null);
      setHoveredDotY(null);
    }, 180);
  };

  const handleCardMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // Helper to clean markdown syntax for crisp single/multi-line previews
  const cleanSnippet = (content?: string) => {
    if (!content) return '';
    return content
      .replace(/```[\s\S]*?```/g, '[Code Snippet]')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~#]/g, '')
      .replace(/[\r\n]+/g, ' ')
      .trim();
  };

  if (moments.length === 0) return null;

  return (
    <div
      ref={railContainerRef}
      onMouseLeave={handleMouseLeave}
      className="fixed right-6 top-1/2 -translate-y-1/2 z-40 flex items-center select-none mr-2"
    >
      {/* Vertical Navigation & Dots Track Column */}
      <div className="flex flex-col items-center justify-center py-1">
        {/* Top Chevron Arrow (Visible only if chat is long enough) */}
        {isOverflowing && (
          <button
            type="button"
            onClick={handleScrollUp}
            className="text-gray-400 hover:text-gray-200 transition-colors p-0.5 mb-1 cursor-pointer bg-transparent border-0 flex items-center justify-center opacity-70 hover:opacity-100"
            title="Scroll up to earlier turn"
            aria-label="Previous turn"
          >
            <ChevronUp size={11} strokeWidth={2.5} />
          </button>
        )}

        {/* Dots Cluster (with fade mask if chat is long enough; no fade if few chats) */}
        <div
          ref={dotsScrollRef}
          style={
            isOverflowing
              ? {
                  maxHeight: 'min(72vh, 620px)',
                  maskImage:
                    'linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)',
                  WebkitMaskImage:
                    'linear-gradient(to bottom, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)',
                }
              : undefined
          }
          className={`flex flex-col items-center justify-center gap-[4px] py-1 cursor-pointer ${
            isOverflowing ? 'overflow-y-auto no-scrollbar' : ''
          }`}
        >
          {moments.map((m, idx) => {
            const isCurrent = idx === activeTurnIndex;
            const isHovered = hoveredMoment?.id === m.id;
            const distance = Math.abs(idx - activeTurnIndex);

            return (
              <div
                key={m.id}
                ref={(el) => (dotElementsRef.current[idx] = el)}
                onClick={() => scrollToMoment(m.id)}
                onMouseEnter={(e) => handleDotMouseEnter(m, e)}
                className={`rounded-full transition-all duration-200 cursor-pointer ${
                  isCurrent
                    ? 'w-[5px] h-[16px] bg-[#dcdce0]'
                    : isHovered
                    ? distance <= 14
                      ? 'w-[3.5px] h-[12px] bg-white/80'
                      : 'w-[3.5px] h-[7px] bg-white/80'
                    : distance <= 12
                    ? 'w-[3px] h-[10px] bg-white/25 hover:bg-white/55'
                    : distance <= 16
                    ? 'w-[3px] h-[6px] bg-white/25 hover:bg-white/55'
                    : 'w-[3px] h-[4px] bg-white/25 hover:bg-white/55'
                }`}
              />
            );
          })}
        </div>

        {/* Bottom Chevron Arrow (Visible only if chat is long enough) */}
        {isOverflowing && (
          <button
            type="button"
            onClick={handleScrollDown}
            className="text-gray-400 hover:text-gray-200 transition-colors p-0.5 mt-1 cursor-pointer bg-transparent border-0 flex items-center justify-center opacity-70 hover:opacity-100"
            title="Scroll down to later turn"
            aria-label="Next turn"
          >
            <ChevronDown size={11} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Moment Preview Card: User prompt + Grokki reply, positioned near current hovered dot */}
      {hoveredMoment && hoveredDotY !== null && (
        <div
          onMouseEnter={handleCardMouseEnter}
          onClick={() => scrollToMoment(hoveredMoment.id)}
          style={{
            top: `${hoveredDotY}px`,
            transform: 'translateY(-50%)',
          }}
          className="absolute right-7 w-[290px] rounded-xl bg-[#161618] text-gray-200 border border-white/[0.09] p-3 flex flex-col gap-2 cursor-pointer transition-all animate-in fade-in duration-100"
        >
          {/* User Prompt Portion */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="font-semibold text-gray-300">You</span>
              <span className="font-mono text-[10px] tabular-nums">
                {hoveredMoment.userMsg.timestamp || 'Turn ' + hoveredMoment.turnIndex}
              </span>
            </div>

            <div className="text-[12px] text-gray-200 line-clamp-2 leading-relaxed">
              {isImageAttachment(hoveredMoment.userMsg.attachedFile) && (
                <span className="inline-flex items-center gap-1 text-blue-400 mr-1.5 text-[11px]">
                  <ImageIcon size={11} />
                  <span>[Image]</span>
                </span>
              )}
              {cleanSnippet(hoveredMoment.userMsg.content) || '(No text prompt)'}
            </div>
          </div>

          {/* Grokki Reply Portion */}
          {hoveredMoment.assistantMsg && (
            <>
              <div className="h-[1px] bg-white/[0.07] w-full" />

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <img src={grokkiIcon} alt="Grokki" className="w-3 h-3 rounded-full" />
                    <span className="font-semibold text-gray-300">Grokki</span>
                  </div>
                  <span className="font-mono text-[10px] tabular-nums">
                    {hoveredMoment.assistantMsg.timestamp || ''}
                  </span>
                </div>

                <div className="text-[12px] text-gray-300 line-clamp-3 leading-relaxed">
                  {cleanSnippet(hoveredMoment.assistantMsg.content) || '...'}
                </div>
              </div>
            </>
          )}

          {/* Footer jump indicator */}
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.05] text-[10px] text-gray-400 select-none">
            <span>Turn {hoveredMoment.turnIndex} of {moments.length}</span>
            <span className="flex items-center gap-1 text-gray-300">
              <span>Jump to chat</span>
              <CornerDownLeft size={10} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
