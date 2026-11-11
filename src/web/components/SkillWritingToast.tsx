import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2 } from 'lucide-react';

export interface SkillWritingState {
  status: 'idle' | 'generating' | 'ready' | 'error';
  prompt?: string;
  markdown?: string;
  error?: string;
}

interface SkillWritingToastProps {
  state: SkillWritingState;
  onOpenInEditor: () => void;
  onDismiss: () => void;
  bottomOffsetClass?: string;
}

export const SkillWritingToast: React.FC<SkillWritingToastProps> = ({
  state,
  onOpenInEditor,
  onDismiss,
  bottomOffsetClass = 'bottom-6',
}) => {
  if (state.status === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        key="grokki-skill-toast"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`fixed right-6 z-50 flex flex-col gap-2.5 p-3.5 w-[360px] max-w-[calc(100vw-3rem)] rounded-xl bg-white dark:bg-[#121318] border border-gray-200 dark:border-[#22232b] shadow-2xl select-none pointer-events-auto ${bottomOffsetClass}`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {state.status === 'error' ? (
              <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                <X className="w-3.5 h-3.5 text-red-500 stroke-[2.5]" />
              </div>
            ) : state.status === 'generating' ? (
              <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-[#1c1d24] flex items-center justify-center shrink-0 border border-gray-200 dark:border-zinc-800">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-700 dark:text-zinc-300" />
              </div>
            ) : null}

            <div className="flex flex-col min-w-0">
              <span className="text-[12.5px] font-semibold text-gray-950 dark:text-white truncate">
                {state.status === 'ready'
                  ? 'Skill written by Grokki'
                  : state.status === 'error'
                  ? 'Failed to write skill'
                  : 'Writing skill with Grokki'}
              </span>
              {state.prompt && (
                <span className="text-[11px] text-gray-500 dark:text-zinc-400 truncate max-w-[240px]">
                  {state.prompt}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* When generating: animated sweep progress bar */}
        {state.status === 'generating' && (
          <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-[#20222b] overflow-hidden relative">
            <div className="h-full bg-gray-950 dark:bg-white rounded-full animate-pulse w-full" />
          </div>
        )}

        {/* When error: show error details */}
        {state.status === 'error' && state.error && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-mono leading-tight">
            {state.error}
          </div>
        )}

        {/* When ready: action button on the left without arrow, hides toast on click */}
        {state.status === 'ready' && (
          <div className="pt-2 flex items-center justify-start border-t border-gray-100 dark:border-zinc-800/80 mt-0.5">
            <button
              type="button"
              onClick={() => {
                onOpenInEditor();
                onDismiss();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors shadow-xs cursor-pointer select-none"
            >
              Open in Skill Editor
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
