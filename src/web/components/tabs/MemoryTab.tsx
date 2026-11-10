import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Brain,
  Pin,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Check,
  Tag,
  Layers,
  BookOpen,
  User,
  FolderCode,
  ArrowLeft,
  Save,
  Edit3,
} from 'lucide-react';
import { MemoryCategory, MemoryItem } from '../../types/jarvis';
import GlideSelect from '../GlideSelect';

interface MemoryTabProps {
  onNavigateTab?: (tab: string) => void;
  activeConversationId?: string;
  activeConversationTitle?: string;
}

const CATEGORY_TABS: Array<{ id: 'all' | MemoryCategory | 'pinned'; label: string; icon: React.ReactNode }> = [
  { id: 'all', label: 'All', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'profile', label: 'Profile', icon: <User className="w-3.5 h-3.5" /> },
  { id: 'project', label: 'Projects', icon: <FolderCode className="w-3.5 h-3.5" /> },
  { id: 'knowledge', label: 'Knowledge', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'pinned', label: 'Pinned', icon: <Pin className="w-3.5 h-3.5" /> },
];

const CATEGORY_OPTIONS = [
  { value: 'profile', label: 'Profile & Preferences', tag: 'Profile' },
  { value: 'project', label: 'Project & Tech', tag: 'Project' },
  { value: 'knowledge', label: 'Knowledge', tag: 'Knowledge' },
  { value: 'episodic', label: 'Discussion Note', tag: 'Discussion' },
];

const CATEGORY_STYLES: Record<string, { label: string; badge: string }> = {
  profile: {
    label: 'Profile',
    badge: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  },
  project: {
    label: 'Project',
    badge: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  },
  knowledge: {
    label: 'Knowledge',
    badge: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  },
  episodic: {
    label: 'Discussion',
    badge: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  },
};

export const MemoryTab: React.FC<MemoryTabProps> = ({
  activeConversationId,
}) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | MemoryCategory | 'pinned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // View Mode: 'list' (shows search bar + memory cards) or 'editor' (shows manual rewrite card)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Editor Draft Form
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftCategory, setDraftCategory] = useState<MemoryCategory>('profile');
  const [draftTags, setDraftTags] = useState('');
  const [draftPinned, setDraftPinned] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 2500);
  };

  const loadMemories = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.jarvisAPI?.getAllMemories) {
        const list = await window.jarvisAPI.getAllMemories();
        setMemories(list || []);
      }
    } catch (err) {
      console.warn('[MemoryTab] Failed to load memories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Filtered List
  const filteredMemories = useMemo(() => {
    let result = memories;

    if (activeFilter === 'pinned') {
      result = result.filter((m) => m.pinned);
    } else if (activeFilter !== 'all') {
      result = result.filter((m) => m.category === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.content && m.content.toLowerCase().includes(q)) ||
          (Array.isArray(m.tags) && m.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    return result;
  }, [memories, activeFilter, searchQuery]);

  // Open existing memory for viewing/rewriting
  const handleOpenMemory = (mem: MemoryItem) => {
    setSelectedId(mem.id);
    setIsCreatingNew(false);
    setDraftTitle(mem.title || '');
    setDraftContent(mem.content || '');
    setDraftCategory(mem.category || 'profile');
    setDraftTags(Array.isArray(mem.tags) ? mem.tags.join(', ') : '');
    setDraftPinned(Boolean(mem.pinned));
    setIsDirty(false);
    setIsEditorOpen(true);
  };

  // Click New Memory: hide list card and open manual writer card
  const handleStartNew = () => {
    setSelectedId(null);
    setIsCreatingNew(true);
    setDraftTitle('');
    setDraftContent('');
    setDraftCategory(activeFilter !== 'all' && activeFilter !== 'pinned' ? activeFilter : 'profile');
    setDraftTags('');
    setDraftPinned(false);
    setIsDirty(false);
    setIsEditorOpen(true);
  };

  // Close editor and return to list card
  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedId(null);
    setIsCreatingNew(false);
    setIsDirty(false);
  };

  // Toggle Pin on item from list or editor
  const handleTogglePin = async (e: React.MouseEvent, id: string, currentState: boolean) => {
    e.stopPropagation();
    const nextState = !currentState;
    try {
      if (window.jarvisAPI?.pinMemory) {
        await window.jarvisAPI.pinMemory(id, nextState);
        setMemories((prev) =>
          prev.map((m) => (m.id === id ? { ...m, pinned: nextState } : m))
        );
        if (selectedId === id) {
          setDraftPinned(nextState);
        }
        showNotice(nextState ? 'Pinned to top' : 'Unpinned');
      }
    } catch (err) {
      console.error('[MemoryTab] Pin error:', err);
    }
  };

  // Delete Memory
  const handleDelete = async (e?: React.MouseEvent, targetId?: string) => {
    if (e) e.stopPropagation();
    const idToDelete = targetId || selectedId;
    if (!idToDelete) return;

    const item = memories.find((m) => m.id === idToDelete);
    const title = item?.title || 'this memory';
    if (!window.confirm(`Delete "${title}"?`)) return;

    try {
      if (window.jarvisAPI?.deleteMemory) {
        await window.jarvisAPI.deleteMemory(idToDelete);
        setMemories((prev) => prev.filter((m) => m.id !== idToDelete));
        if (selectedId === idToDelete) {
          handleCloseEditor();
        }
        showNotice('Memory deleted');
      }
    } catch (err) {
      console.error('[MemoryTab] Delete error:', err);
    }
  };

  // Save changes or create new manual memory
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draftTitle.trim() || !draftContent.trim()) return;

    const tagsArr = draftTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      if (isCreatingNew) {
        if (window.jarvisAPI?.addMemory) {
          const created = await window.jarvisAPI.addMemory({
            title: draftTitle.trim(),
            content: draftContent.trim(),
            category: draftCategory,
            tags: tagsArr,
            pinned: draftPinned,
            confidence: 1.0,
            userConfirmed: true,
            sourceConversationId: activeConversationId || undefined,
          });
          if (created) {
            setMemories((prev) => [created, ...prev]);
            showNotice('Memory created');
            handleCloseEditor();
          }
        }
      } else if (selectedId) {
        if (window.jarvisAPI?.updateMemory) {
          const updated = await window.jarvisAPI.updateMemory(selectedId, {
            title: draftTitle.trim(),
            content: draftContent.trim(),
            category: draftCategory,
            tags: tagsArr,
            pinned: draftPinned,
            reason: 'User edited memory in tab',
          });
          if (updated) {
            setMemories((prev) => prev.map((m) => (m.id === selectedId ? updated : m)));
            showNotice('Changes saved');
            handleCloseEditor();
          }
        }
      }
    } catch (err) {
      console.error('[MemoryTab] Save error:', err);
    }
  };

  const getCount = (filterId: 'all' | MemoryCategory | 'pinned') => {
    if (filterId === 'all') return memories.length;
    if (filterId === 'pinned') return memories.filter((m) => m.pinned).length;
    return memories.filter((m) => m.category === filterId).length;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto w-full select-none">
      {/* Toast Notice */}
      {statusNotice && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-medium border border-zinc-700/50 dark:border-zinc-300 shadow-md">
          <Check className="w-3.5 h-3.5" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200 dark:border-[#1e2029] flex-shrink-0">
        <div className="flex items-center gap-2">
          {isEditorOpen ? (
            <button
              type="button"
              onClick={handleCloseEditor}
              className="h-8 px-2.5 -ml-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-[#151720] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to memories</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
              <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Memory
              </h2>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isEditorOpen && (
            <>
              <button
                type="button"
                onClick={loadMemories}
                disabled={isLoading}
                className="h-8 px-2.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0f1015] border border-zinc-200 dark:border-[#222530] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                title="Reload memories"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>

              <button
                type="button"
                onClick={handleStartNew}
                className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Memory</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area: Switch between List Card and Editor Card */}
      {!isEditorOpen ? (
        /* CARD 1: Memory List Card (with Search Bar, Category Filters & Memory List) */
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0c0d12] border border-zinc-200 dark:border-[#1e2029] rounded-xl overflow-hidden shadow-xs">
          {/* Top Controls: Search Bar & Categories */}
          <div className="p-3 border-b border-zinc-200 dark:border-[#1e2029] flex flex-col md:flex-row items-stretch md:items-center gap-2.5 justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories, content, or tags..."
                className="w-full h-8 pl-8 pr-7 rounded-lg text-xs bg-zinc-50 dark:bg-[#13151d] border border-zinc-200 dark:border-[#222634] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {CATEGORY_TABS.map((tab) => {
                const count = getCount(tab.id);
                const active = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      active
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#161822]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1 rounded ${
                        active
                          ? 'bg-white/20 dark:bg-zinc-900/20 text-current'
                          : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Memory List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-[#161822]">
            {filteredMemories.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500">
                <Brain className="w-8 h-8 mb-2 opacity-40 text-zinc-500" />
                <p className="text-xs mb-3">
                  {searchQuery ? 'No memories match your search query.' : 'No memories saved in this view yet.'}
                </p>
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="h-7 px-3 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  + Write a Memory
                </button>
              </div>
            ) : (
              filteredMemories.map((mem) => {
                const badge = CATEGORY_STYLES[mem.category] || CATEGORY_STYLES.profile;
                return (
                  <div
                    key={mem.id}
                    onClick={() => handleOpenMemory(mem)}
                    className="p-4 transition-colors cursor-pointer text-left flex flex-col gap-1.5 hover:bg-zinc-50/80 dark:hover:bg-[#11131a] group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(e, mem.id, Boolean(mem.pinned))}
                          className={`p-1 -ml-1 rounded transition-colors cursor-pointer ${
                            mem.pinned
                              ? 'text-amber-500 hover:text-amber-600'
                              : 'text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100'
                          }`}
                          title={mem.pinned ? 'Unpin' : 'Pin to top'}
                        >
                          <Pin className={`w-3.5 h-3.5 ${mem.pinned ? 'fill-current' : ''}`} />
                        </button>

                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {mem.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[9.5px] uppercase font-mono px-2 py-0.5 rounded border font-semibold ${badge.badge}`}
                        >
                          {badge.label}
                        </span>

                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMemory(mem);
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Edit memory"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, mem.id)}
                            className="p-1 rounded text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {mem.content}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10.5px] text-zinc-400 dark:text-zinc-500 font-mono">
                      <span>{new Date(mem.updatedAt || mem.createdAt).toLocaleDateString()}</span>
                      {Array.isArray(mem.tags) && mem.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {mem.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-zinc-400 dark:text-zinc-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* CARD 2: Manual Memory Rewriter / Editor Card (Full Size, replaces list card) */
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0c0d12] border border-zinc-200 dark:border-[#1e2029] rounded-xl overflow-hidden shadow-xs">
          <form onSubmit={handleSave} className="flex flex-col h-full">
            {/* Editor Top Bar */}
            <div className="flex items-center justify-between p-3.5 border-b border-zinc-200 dark:border-[#1e2029] bg-zinc-50/50 dark:bg-[#0e1017]">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Category:</span>
                <GlideSelect
                  options={CATEGORY_OPTIONS}
                  value={draftCategory}
                  onChange={(val) => {
                    setDraftCategory(val as MemoryCategory);
                    setIsDirty(true);
                  }}
                  size="sm"
                  radius={6}
                  menuWidth={210}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftPinned(!draftPinned);
                    setIsDirty(true);
                  }}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer border ${
                    draftPinned
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
                      : 'border-zinc-200 dark:border-[#222634] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                  title="Pin memory to prioritize in Grokki's context"
                >
                  <Pin className={`w-3 h-3 ${draftPinned ? 'fill-current' : ''}`} />
                  <span>{draftPinned ? 'Pinned' : 'Pin'}</span>
                </button>

                {!isCreatingNew && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e)}
                    className="h-7 px-2.5 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-800/30 transition-colors cursor-pointer flex items-center gap-1"
                    title="Delete memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inputs Area */}
            <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                  Title / Subject
                </label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => {
                    setDraftTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="e.g. Always Use TypeScript & Strict Mode"
                  className="w-full text-sm font-bold bg-zinc-50 dark:bg-[#13151d] border border-zinc-200 dark:border-[#222634] rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                />
              </div>

              <div className="flex-1 flex flex-col min-h-[220px]">
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                  Memory Instructions & Knowledge
                </label>
                <textarea
                  value={draftContent}
                  onChange={(e) => {
                    setDraftContent(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Write what Grokki should permanently remember. For example: In all coding tasks, prefer writing clean modular functions, avoid useless boilerplate, and use strict types."
                  className="flex-1 w-full p-3 rounded-lg bg-zinc-50 dark:bg-[#13151d] border border-zinc-200 dark:border-[#222634] text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none resize-none leading-relaxed font-sans focus:border-zinc-400 dark:focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
                  Tags
                </label>
                <div className="relative flex items-center">
                  <Tag className="w-3.5 h-3.5 absolute left-3 text-zinc-400" />
                  <input
                    type="text"
                    value={draftTags}
                    onChange={(e) => {
                      setDraftTags(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Comma-separated tags (e.g. coding, typescript, preferences)"
                    className="w-full text-xs bg-zinc-50 dark:bg-[#13151d] border border-zinc-200 dark:border-[#222634] rounded-lg pl-8 pr-3 py-2 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                  />
                </div>
              </div>
            </div>

            {/* Editor Footer Actions */}
            <div className="p-3.5 border-t border-zinc-200 dark:border-[#1e2029] bg-zinc-50/50 dark:bg-[#0a0b10] flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                {isCreatingNew ? 'New Memory Draft' : isDirty ? 'Unsaved edits' : 'Saved'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseEditor}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!draftTitle.trim() || !draftContent.trim()}
                  className="h-8 px-4 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isCreatingNew ? 'Create Memory' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
export default MemoryTab;
