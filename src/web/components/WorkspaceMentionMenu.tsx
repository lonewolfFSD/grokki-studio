import React from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Code2,
  Terminal,
  Shapes,
  File,
  Layers,
  Sparkles,
  Settings,
} from 'lucide-react';
import { WorkspaceMention } from '../types/jarvis';

export interface WorkspaceMentionMenuProps {
  items: WorkspaceMention[];
  selectedIndex: number;
  workspaceRoot: string;
  folderName: string;
  totalMatches: number;
  placement?: 'top' | 'bottom';
  onSelect: (item: WorkspaceMention | 'select_folder' | 'workspace_map') => void;
  onSelectFolder: () => void;
  onHoverIndex: (idx: number) => void;
}

export function getFileExtIcon(ext?: string, isDir?: boolean) {
  if (isDir) {
    return <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20 flex-shrink-0" />;
  }
  const clean = (ext || '').toLowerCase();
  if (['.ts', '.tsx', '.js', '.jsx'].includes(clean)) {
    return <Code2 className="w-4 h-4 text-cyan-500 flex-shrink-0" />;
  }
  if (['.py'].includes(clean)) {
    return <Terminal className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
  }
  if (['.md', '.txt', '.doc', '.pdf'].includes(clean)) {
    return <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />;
  }
  if (['.css', '.scss', '.sass', '.less'].includes(clean)) {
    return <Shapes className="w-4 h-4 text-pink-500 flex-shrink-0" />;
  }
  if (['.json', '.yml', '.yaml', '.toml', '.env'].includes(clean)) {
    return <FileCode className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  }
  return <File className="w-4 h-4 text-gray-400 flex-shrink-0" />;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const WorkspaceMentionMenu: React.FC<WorkspaceMentionMenuProps> = ({
  items,
  selectedIndex,
  workspaceRoot,
  folderName,
  totalMatches,
  placement = 'top',
  onSelect,
  onSelectFolder,
  onHoverIndex,
}) => {
  const positionClasses =
    placement === 'top'
      ? 'bottom-full mb-3 origin-bottom'
      : 'top-full mt-3 origin-top';

  return (
    <div
      className={`absolute left-0 right-0 z-50 ${positionClasses} bg-white/95 dark:bg-[#12141c]/95 backdrop-blur-xl border border-gray-200/90 dark:border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 select-none max-h-80 flex flex-col`}
      style={{ boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)' }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-white/5 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <FolderOpen className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
            {folderName || 'Workspace'}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectFolder();
            }}
            className="text-[10px] text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer border-none bg-transparent ml-1 px-1 py-0.5"
          >
            Change
          </button>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
          <span>{totalMatches} items</span>
          <span className="hidden sm:inline bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-[9px]">
            ↑↓ navigate • ↵ insert
          </span>
        </div>
      </div>

      {/* Scrollable Items List */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-1 space-y-0.5 min-h-0">
        {/* Special Action: @folder */}
        <div
          onClick={() => onSelect('select_folder')}
          className={`flex items-center justify-between px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
            selectedIndex === -1
              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold">@folder</span>
              <span className="text-[10px] text-gray-400 truncate">Select or switch active workspace folder...</span>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            Switch
          </span>
        </div>

        {items.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-gray-400">
            No matching files or folders found in workspace
          </div>
        ) : (
          items.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const isDir = item.type === 'folder';
            const splitPath = item.path.split('/');
            const fileName = splitPath.pop() || item.name;
            const parentDir = splitPath.join('/');

            return (
              <div
                key={`${item.path}-${idx}`}
                onClick={() => onSelect(item)}
                onMouseEnter={() => onHoverIndex(idx)}
                className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {getFileExtIcon(item.ext, isDir)}
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-xs font-semibold truncate text-gray-900 dark:text-gray-100">
                      {fileName}
                    </span>
                    {parentDir && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate font-mono">
                        {parentDir}/
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {item.size ? (
                    <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                      {formatFileSize(item.size)}
                    </span>
                  ) : null}
                  <span
                    className={`text-[9.5px] px-1.5 py-0.5 rounded font-mono font-medium ${
                      isDir
                        ? 'bg-amber-100/70 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {isDir ? 'folder' : (item.ext ? item.ext.slice(1) : 'file')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
