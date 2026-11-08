import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Pin,
  Search,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  History,
  X,
  ChevronRight,
  FolderGit2,
} from 'lucide-react';
import { MemoryCategory, MemoryItem, ProjectItem, MemoryStats } from '../../types/jarvis';

interface MemoryTabProps {
  onNavigateTab?: (tab: string) => void;
  activeConversationId?: string;
  activeConversationTitle?: string;
}

const CATEGORIES: Array<{ id: 'all' | MemoryCategory; label: string; desc: string }> = [
  { id: 'all', label: 'All Memories', desc: 'Everything Grokki remembers' },
  { id: 'profile', label: 'Profile', desc: 'Your preferences, habits & working style' },
  { id: 'project', label: 'Projects', desc: 'Architectures, tech stack & project progress' },
  { id: 'episodic', label: 'Episodic', desc: 'Past discussions, decisions & resolved issues' },
  { id: 'knowledge', label: 'Knowledge', desc: 'Learned technical facts & connected concepts' },
];

export const MemoryTab: React.FC<MemoryTabProps> = ({
  activeConversationId,
}) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<'all' | MemoryCategory>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPinned, setFilterPinned] = useState(false);

  // Modals & Drawers
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formCategory, setFormCategory] = useState<MemoryCategory>('profile');
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formPinned, setFormPinned] = useState(false);
  const [formConfirmed, setFormConfirmed] = useState(true);
  const [formUpdateReason, setFormUpdateReason] = useState('');

  // Project Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectTech, setNewProjectTech] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.jarvisAPI?.getAllMemories) {
        const mems = await window.jarvisAPI.getAllMemories();
        setMemories(mems || []);
      }
      if (window.jarvisAPI?.getAllProjects) {
        const projs = await window.jarvisAPI.getAllProjects();
        setProjects(projs || []);
      }
      if (window.jarvisAPI?.getMemoryStats) {
        const s = await window.jarvisAPI.getMemoryStats();
        setStats(s || null);
      }
    } catch (err) {
      console.warn('[MemoryTab] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Handle Manual Memory Processing
  const handleProcessNow = async () => {
    setIsProcessing(true);
    try {
      if (window.jarvisAPI?.processMemoryNow) {
        await window.jarvisAPI.processMemoryNow({
          context: { conversationId: activeConversationId },
        });
      }
      await loadData();
      showNotice('Memories synced.');
    } catch (err) {
      console.warn('[MemoryTab] Process error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered Memories
  const filteredMemories = useMemo(() => {
    let result = memories;

    if (selectedCategory !== 'all') {
      result = result.filter((m) => m.category === selectedCategory);
    }
    if (selectedProjectId !== 'all') {
      result = result.filter((m) => m.projectId === selectedProjectId);
    }
    if (filterPinned) {
      result = result.filter((m) => m.pinned);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.content && m.content.toLowerCase().includes(q)) ||
          (m.projectName && m.projectName.toLowerCase().includes(q)) ||
          (Array.isArray(m.tags) && m.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    return result;
  }, [memories, selectedCategory, selectedProjectId, filterPinned, searchQuery]);

  // Pin Toggle
  const handleTogglePin = async (item: MemoryItem) => {
    const newPinned = !item.pinned;
    try {
      if (window.jarvisAPI?.pinMemory) {
        await window.jarvisAPI.pinMemory(item.id, newPinned);
      }
      setMemories((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, pinned: newPinned, updatedAt: new Date().toISOString() } : m))
      );
      showNotice(newPinned ? 'Pinned' : 'Unpinned');
    } catch (err) {
      console.warn('[MemoryTab] Pin error:', err);
    }
  };

  // Delete Memory
  const handleDeleteMemory = async (id: string) => {
    try {
      if (window.jarvisAPI?.deleteMemory) {
        await window.jarvisAPI.deleteMemory(id);
      }
      setMemories((prev) => prev.filter((m) => m.id !== id));
      showNotice('Memory deleted.');
    } catch (err) {
      console.warn('[MemoryTab] Delete error:', err);
    }
  };

  // Delete Project
  const handleDeleteProject = async (projId: string) => {
    try {
      if (window.jarvisAPI?.deleteProject) {
        await window.jarvisAPI.deleteProject(projId);
      }
      setProjects((prev) => prev.filter((p) => p.id !== projId));
      setMemories((prev) => prev.filter((m) => m.projectId !== projId));
      if (selectedProjectId === projId) setSelectedProjectId('all');
      showNotice('Project removed.');
    } catch (err) {
      console.warn('[MemoryTab] Delete project error:', err);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: MemoryItem) => {
    setEditingMemory(item);
    setFormCategory(item.category);
    setFormProjectId(item.projectId || '');
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormTags(Array.isArray(item.tags) ? item.tags.join(', ') : '');
    setFormPinned(!!item.pinned);
    setFormConfirmed(item.userConfirmed !== false);
    setFormUpdateReason('');
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingMemory(null);
    setFormCategory(selectedCategory !== 'all' ? selectedCategory : 'profile');
    setFormProjectId(selectedProjectId !== 'all' ? selectedProjectId : '');
    setFormTitle('');
    setFormContent('');
    setFormTags('');
    setFormPinned(false);
    setFormConfirmed(true);
    setFormUpdateReason('');
    setIsAddModalOpen(true);
  };

  // Save Add / Edit
  const handleSaveMemoryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const parsedTags = formTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      if (editingMemory) {
        if (window.jarvisAPI?.updateMemory) {
          const updated = await window.jarvisAPI.updateMemory(editingMemory.id, {
            category: formCategory,
            projectId: formProjectId || undefined,
            title: formTitle.trim(),
            content: formContent.trim(),
            tags: parsedTags,
            pinned: formPinned,
            userConfirmed: formConfirmed,
            reason: formUpdateReason.trim() || 'Updated via Memory settings',
          });
          if (updated) {
            setMemories((prev) => prev.map((m) => (m.id === editingMemory.id ? updated : m)));
            showNotice('Memory updated.');
          }
        }
        setEditingMemory(null);
      } else {
        if (window.jarvisAPI?.addMemory) {
          const created = await window.jarvisAPI.addMemory({
            category: formCategory,
            projectId: formProjectId || undefined,
            title: formTitle.trim(),
            content: formContent.trim(),
            tags: parsedTags,
            pinned: formPinned,
            userConfirmed: formConfirmed,
            confidence: 1.0,
            sourceConversationId: activeConversationId || undefined,
          });
          if (created) {
            setMemories((prev) => [created, ...prev]);
            showNotice('Memory added.');
          }
        }
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.warn('[MemoryTab] Save error:', err);
    }
  };

  // Save Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      if (window.jarvisAPI?.saveProject) {
        const p = await window.jarvisAPI.saveProject({
          name: newProjectName.trim(),
          description: newProjectDesc.trim(),
          techStack: newProjectTech
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          status: 'active',
        });
        if (p) {
          setProjects((prev) => [p, ...prev]);
          setNewProjectName('');
          setNewProjectDesc('');
          setNewProjectTech('');
          setIsProjectModalOpen(false);
          showNotice(`Project "${p.name}" created.`);
        }
      }
    } catch (err) {
      console.warn('[MemoryTab] Project creation error:', err);
    }
  };

  const getCategoryCount = (catId: 'all' | MemoryCategory) => {
    if (catId === 'all') return memories.length;
    return memories.filter((m) => m.category === catId).length;
  };

  const getCategoryLabel = (cat: MemoryCategory) => {
    switch (cat) {
      case 'profile':
        return 'Profile';
      case 'project':
        return 'Project';
      case 'episodic':
        return 'Episodic';
      case 'knowledge':
        return 'Knowledge';
      default:
        return 'Memory';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16 select-none">
      {/* Status Toast */}
      {statusNotice && (
        <div className="fixed top-5 right-5 z-[9999] px-3.5 py-2 rounded-lg bg-gray-900 dark:bg-[#1a1a1f] border border-gray-800 dark:border-white/10 text-white text-xs font-medium">
          {statusNotice}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Memory
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Persistent context across your profile, active projects, past conversations, and learned knowledge.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleProcessNow}
            disabled={isProcessing}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#16161c] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsProjectModalOpen(true)}
            className="h-8 px-3 rounded-lg text-xs font-medium bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#16161c] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Projects ({projects.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Memory</span>
          </button>
        </div>
      </div>

      {/* Clean Category Bar + Search */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl p-3 flex flex-col gap-3">
        {/* Category Tabs */}
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-gray-100 dark:border-[#1a1a1f] pb-2.5">
          <div className="flex items-center gap-1 flex-wrap">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              const count = getCategoryCount(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                    active
                      ? 'bg-gray-100 dark:bg-[#1f1f24] text-gray-900 dark:text-white font-semibold'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#16161a]'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded ${
                      active
                        ? 'bg-gray-200/80 dark:bg-white/10 text-gray-900 dark:text-white'
                        : 'bg-gray-100 dark:bg-[#18181d] text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setFilterPinned((prev) => !prev)}
            className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
              filterPinned
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white font-semibold'
                : 'bg-transparent border-gray-200 dark:border-[#1f1f22] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Pin className="w-3 h-3" />
            <span>Pinned</span>
          </button>
        </div>

        {/* Search & Project Filter Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029]">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories by title, content, project, or tag..."
              className="flex-1 bg-transparent border-0 outline-none text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {projects.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedProjectId('all')}
                className={`h-9 px-3 rounded-lg text-xs font-medium border transition-colors shrink-0 cursor-pointer ${
                  selectedProjectId === 'all'
                    ? 'bg-gray-100 dark:bg-[#1f1f24] border-gray-300 dark:border-[#2e2e36] text-gray-900 dark:text-white font-semibold'
                    : 'bg-gray-50 dark:bg-[#090a0d] border-gray-200 dark:border-[#1e2029] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                All Projects
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProjectId((prev) => (prev === p.id ? 'all' : p.id))}
                  className={`h-9 px-3 rounded-lg text-xs font-medium border transition-colors shrink-0 cursor-pointer ${
                    selectedProjectId === p.id
                      ? 'bg-gray-100 dark:bg-[#1f1f24] border-gray-300 dark:border-[#2e2e36] text-gray-900 dark:text-white font-semibold'
                      : 'bg-gray-50 dark:bg-[#090a0d] border-gray-200 dark:border-[#1e2029] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Memories List / Grid */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-xs">Loading memories...</span>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-xl py-16 px-6 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">No memories found</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
            {searchQuery
              ? `No entries matched "${searchQuery}".`
              : 'Grokki automatically extracts important preferences, project context, and decisions as you chat.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-2 h-8 px-3.5 rounded-lg text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Memory</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMemories.map((mem) => {
            const hasHistory = Array.isArray(mem.history) && mem.history.length > 0;
            const isHistoryExpanded = expandedHistoryId === mem.id;

            return (
              <div
                key={mem.id}
                className={`bg-white dark:bg-[#0f0f13] border rounded-xl p-4 flex flex-col justify-between gap-3 transition-colors ${
                  mem.pinned
                    ? 'border-gray-400 dark:border-[#34343e]'
                    : 'border-[#e4e4eb] dark:border-[#1f1f22] hover:border-gray-300 dark:hover:border-[#2a2a32]'
                }`}
              >
                <div className="flex flex-col gap-2">
                  {/* Top Row: Meta Badges & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-gray-100 dark:bg-[#1a1a20] text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-[#26262e]">
                        {getCategoryLabel(mem.category)}
                      </span>

                      {mem.projectName && (
                        <span className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-gray-50 dark:bg-[#141418] text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-[#222228] truncate max-w-[160px]">
                          {mem.projectName}
                        </span>
                      )}

                      <span className="text-[10.5px] text-gray-400 dark:text-gray-500">
                        {mem.userConfirmed ? '• Confirmed' : '• Auto'}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(mem)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          mem.pinned
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a1a20]'
                        }`}
                        title={mem.pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${mem.pinned ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(mem)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a20] transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Content */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                      {mem.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed whitespace-pre-wrap break-words">
                      {mem.content}
                    </p>
                  </div>

                  {/* Decision History Drawer */}
                  {hasHistory && (
                    <div className="pt-1.5 border-t border-gray-100 dark:border-[#1a1a20]">
                      <button
                        type="button"
                        onClick={() => setExpandedHistoryId((prev) => (prev === mem.id ? null : mem.id))}
                        className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 cursor-pointer"
                      >
                        <History className="w-3 h-3" />
                        <span>
                          {mem.history!.length} previous revision{mem.history!.length > 1 ? 's' : ''}
                        </span>
                        <ChevronRight
                          className={`w-3 h-3 transition-transform ${isHistoryExpanded ? 'rotate-90' : ''}`}
                        />
                      </button>

                      {isHistoryExpanded && (
                        <div className="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] flex flex-col gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                          {mem.history!.map((h, i) => (
                            <div key={i} className="flex flex-col gap-0.5 border-l-2 border-gray-300 dark:border-gray-700 pl-2">
                              <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(h.date).toLocaleDateString()}
                              </span>
                              <span>{h.previousContent}</span>
                              {h.reason && (
                                <span className="text-[10px] text-gray-400 italic">Reason: {h.reason}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer: Tags & Timestamp */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#18181d]">
                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                    {Array.isArray(mem.tags) &&
                      mem.tags.slice(0, 4).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#16161b] text-gray-500 dark:text-gray-400"
                        >
                          #{t}
                        </span>
                      ))}
                  </div>

                  <span className="text-[10.5px] text-gray-400 dark:text-gray-500 shrink-0">
                    {new Date(mem.updatedAt || mem.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Memory Modal */}
      {(isAddModalOpen || editingMemory) && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#121216] border border-gray-200 dark:border-[#24242c] rounded-2xl p-5 flex flex-col gap-4 text-gray-900 dark:text-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingMemory ? 'Edit Memory' : 'New Memory'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingMemory(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMemoryForm} className="flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700 dark:text-gray-300">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                    className="h-9 px-2.5 rounded-lg bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 outline-none"
                  >
                    <option value="profile">Profile</option>
                    <option value="project">Project</option>
                    <option value="episodic">Episodic</option>
                    <option value="knowledge">Knowledge</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700 dark:text-gray-300">Project (Optional)</label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="h-9 px-2.5 rounded-lg bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 outline-none"
                  >
                    <option value="">None</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-gray-700 dark:text-gray-300">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Preferred Framework, Database Choice, Bug Fix"
                  className="h-9 px-3 rounded-lg bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-900 dark:focus:border-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-gray-700 dark:text-gray-300">Details</label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write what Grokki should remember..."
                  className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 outline-none focus:border-gray-900 dark:focus:border-white resize-none leading-relaxed"
                  required
                />
              </div>

              {editingMemory && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700 dark:text-gray-300">
                    Reason for change (optional, logged in history)
                  </label>
                  <input
                    type="text"
                    value={formUpdateReason}
                    onChange={(e) => setFormUpdateReason(e.target.value)}
                    placeholder="e.g. Updated architecture requirement"
                    className="h-9 px-3 rounded-lg bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 outline-none"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-gray-700 dark:text-gray-300">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. react, architecture, preference"
                  className="h-9 px-3 rounded-lg bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 outline-none"
                />
              </div>

              <div className="flex items-center gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formPinned}
                    onChange={(e) => setFormPinned(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-700"
                  />
                  <span>Pin memory</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formConfirmed}
                    onChange={(e) => setFormConfirmed(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-700"
                  />
                  <span>Confirmed by user</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#1f1f26]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingMemory(null);
                  }}
                  className="h-8 px-3.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 cursor-pointer"
                >
                  {editingMemory ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-[#121216] border border-gray-200 dark:border-[#24242c] rounded-2xl p-5 flex flex-col gap-4 text-gray-900 dark:text-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Projects</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Each project keeps its own isolated memory document and folder.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {projects.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">No projects created yet.</div>
              ) : (
                projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{proj.name}</div>
                      {proj.description && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {proj.description}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(proj.id);
                          setSelectedCategory('project');
                          setIsProjectModalOpen(false);
                        }}
                        className="h-7 px-2.5 rounded-lg bg-white dark:bg-[#18181f] border border-gray-200 dark:border-[#26262f] text-gray-700 dark:text-gray-200 text-[11px] font-medium cursor-pointer"
                      >
                        Filter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCreateProject} className="flex flex-col gap-2.5 pt-3 border-t border-gray-100 dark:border-[#1f1f26] text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Add Project</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project Name"
                  className="h-9 px-3 rounded-lg bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 outline-none"
                  required
                />
                <input
                  type="text"
                  value={newProjectTech}
                  onChange={(e) => setNewProjectTech(e.target.value)}
                  placeholder="Tech Stack (comma-separated)"
                  className="h-9 px-3 rounded-lg bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 outline-none"
                />
              </div>
              <input
                type="text"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                placeholder="Description"
                className="h-9 px-3 rounded-lg bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 outline-none"
              />
              <button
                type="submit"
                className="self-end h-8 px-4 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 cursor-pointer"
              >
                Add Project
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
