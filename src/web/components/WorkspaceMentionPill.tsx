import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { WorkspaceMention } from '../types/jarvis';
import { getFileExtIcon, formatFileSize } from './WorkspaceMentionMenu';
import WarmTooltip from '@/effects/WarmTooltip';

export interface WorkspaceMentionPillProps {
  mention: WorkspaceMention;
  onRemove?: () => void;
  compact?: boolean;
}

export const WorkspaceMentionPill: React.FC<WorkspaceMentionPillProps> = ({
  mention,
  onRemove,
  compact = false,
}) => {
  const isDir = mention.type === 'folder';
  const isWorkspace = mention.type === 'workspace';

  return (
    <WarmTooltip
      content={
        <div className="flex flex-col gap-0.5 text-left">
          <div className="font-semibold text-xs text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            {getFileExtIcon(mention.ext, isDir)}
            <span>{mention.name}</span>
          </div>
          <div className="text-[10px] text-gray-500 font-mono truncate max-w-xs">
            {mention.path || mention.fullPath || 'Workspace root'}
          </div>
          {mention.size ? (
            <div className="text-[9.5px] text-gray-400 font-mono">
              Size: {formatFileSize(mention.size)}
            </div>
          ) : null}
        </div>
      }
      side="top"
      size="sm"
    >
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-mono text-[11px] font-medium transition-all select-none ${
          isWorkspace
            ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300'
            : isDir
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300'
            : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300'
        }`}
      >
        {getFileExtIcon(mention.ext, isDir)}
        <span className="truncate max-w-[160px] font-sans font-semibold">
          @{mention.name}
        </span>
        {mention.size && !compact ? (
          <span className="text-[9px] opacity-60">({formatFileSize(mention.size)})</span>
        ) : null}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-3.5 h-3.5 rounded flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer border-none bg-transparent -mr-0.5"
            aria-label="Remove mention"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </span>
    </WarmTooltip>
  );
};
