import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Upload01Icon,
  Tick02Icon,
  Cancel01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  Copy01Icon,
  ChevronRightIcon,
  Add01Icon,
  ArrowLeft01Icon,
  Loading03Icon,
} from '@hugeicons/core-free-icons';
import grokkiIcon from '../../assets/grokki_icon.svg';
import { GrokkiSkill } from '../../types/jarvis';
import { SkillWritingState } from '../SkillWritingToast';

interface SkillsTabProps {
  onNavigateTab?: (tab: string) => void;
  activeConversationId?: string;
  activeConversationTitle?: string;
  skillWritingState?: SkillWritingState;
  onStartSkillGeneration?: (prompt: string) => void;
  onDismissSkillWriting?: () => void;
  pendingSkillMarkdown?: string | null;
  onClearPendingSkillMarkdown?: () => void;
}

export const SkillsTab: React.FC<SkillsTabProps> = ({
  onNavigateTab,
  activeConversationId,
  activeConversationTitle,
  skillWritingState,
  onStartSkillGeneration,
  onDismissSkillWriting,
  pendingSkillMarkdown,
  onClearPendingSkillMarkdown,
}) => {
  const [skills, setSkills] = useState<GrokkiSkill[]>([]);
  const [filterView, setFilterView] = useState<'all' | 'custom'>('all');
  const [inspectSkill, setInspectSkill] = useState<GrokkiSkill | null>(null);
  const [copiedPlaybook, setCopiedPlaybook] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // In-tab view transition: 'list', 'editor', or 'details'
  const [currentView, setCurrentView] = useState<'list' | 'editor' | 'details'>('list');
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editorMarkdown, setEditorMarkdown] = useState('');
  const [editorError, setEditorError] = useState<string | null>(null);

  // Write with Grokki Modal State
  const [isGrokkiModalOpen, setIsGrokkiModalOpen] = useState(false);
  const [grokkiPrompt, setGrokkiPrompt] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSkills = useCallback(async () => {
    try {
      if (window.jarvisAPI?.getSkills) {
        const res = await window.jarvisAPI.getSkills();
        if (res && Array.isArray(res.skills)) {
          setSkills(res.skills);
        }
      }
    } catch (err) {
      console.warn('[SkillsTab] Fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    if (currentView === 'details' && !inspectSkill) {
      setCurrentView('list');
    }
  }, [currentView, inspectSkill]);

  // Listen for externally injected pending markdown (e.g. user clicked "Open in Skill Editor" on the toast)
  useEffect(() => {
    if (pendingSkillMarkdown) {
      setEditingSkillId(null);
      setEditorError(null);
      setEditorMarkdown(pendingSkillMarkdown);
      setCurrentView('editor');
      onClearPendingSkillMarkdown?.();
    }
  }, [pendingSkillMarkdown, onClearPendingSkillMarkdown]);

  const showNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleToggle = async (skill: GrokkiSkill, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !skill.isEnabled;
    setSkills((prev) =>
      prev.map((s) => (s.id === skill.id ? { ...s, isEnabled: nextState } : s))
    );
    if (inspectSkill?.id === skill.id) {
      setInspectSkill({ ...inspectSkill, isEnabled: nextState });
    }

    try {
      if (window.jarvisAPI?.toggleSkill) {
        await window.jarvisAPI.toggleSkill(skill.id, nextState);
      }
    } catch (err) {
      console.error('[SkillsTab] Toggle failed:', err);
      fetchSkills();
    }
  };

  const handleOpenAddCustomSkill = () => {
    setEditingSkillId(null);
    setEditorError(null);
    setEditorMarkdown('');
    onClearPendingSkillMarkdown?.();
    onDismissSkillWriting?.();
    setCurrentView('editor');
  };

  const handleCancelEditor = () => {
    setEditorMarkdown('');
    setEditingSkillId(null);
    setEditorError(null);
    onClearPendingSkillMarkdown?.();
    onDismissSkillWriting?.();
    if (editingSkillId && inspectSkill && inspectSkill.id === editingSkillId) {
      setCurrentView('details');
    } else {
      setCurrentView('list');
    }
  };

  const handleGenerateWithGrokki = () => {
    const trimmed = grokkiPrompt.trim();
    if (!trimmed) {
      setGenerateError('Please describe the skill you want Grokki to create.');
      return;
    }

    // Immediately close modal so user can work unimpeded
    setIsGrokkiModalOpen(false);
    setGrokkiPrompt('');
    setGenerateError(null);

    if (onStartSkillGeneration) {
      onStartSkillGeneration(trimmed);
    }
  };

  const handleOpenEdit = (skill: GrokkiSkill, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSkillId(skill.id);
    setEditorError(null);
    setEditorMarkdown(skill.rawMarkdown || `---
name: ${skill.name}
description: ${skill.description}
---

${skill.instructions}
`);
    setCurrentView('editor');
  };

  const handleSaveSkill = async () => {
    if (!editorMarkdown.trim()) {
      setEditorError('Skill markdown cannot be empty.');
      return;
    }

    try {
      if (window.jarvisAPI?.saveSkill) {
        const res = await window.jarvisAPI.saveSkill({
          id: editingSkillId || undefined,
          rawMarkdown: editorMarkdown.trim(),
        });

        if (res.success && res.skill) {
          showNotice(`Saved "${res.skill.name}"`);
          await fetchSkills();
          setEditorMarkdown('');
          setEditingSkillId(null);
          setEditorError(null);
          onClearPendingSkillMarkdown?.();
          onDismissSkillWriting?.();
          setInspectSkill(res.skill);
          setCurrentView('list');
        } else {
          setEditorError(res.error || 'Failed to save skill.');
        }
      }
    } catch (err: any) {
      setEditorError(err.message || 'An unexpected error occurred.');
    }
  };

  const handleDelete = async (skillId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Delete custom skill "${skillId}"?`)) return;
    try {
      if (window.jarvisAPI?.deleteSkill) {
        await window.jarvisAPI.deleteSkill(skillId);
        showNotice(`Deleted ${skillId}`);
        if (inspectSkill?.id === skillId) {
          setInspectSkill(null);
          setCurrentView('list');
        }
        await fetchSkills();
      }
    } catch (err) {
      console.error('[SkillsTab] Delete failed:', err);
    }
  };

  const handleFileImport = async (file: File) => {
    if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
      alert('Please select a Markdown file (.md) following the SKILL.md format.');
      return;
    }

    try {
      const text = await file.text();
      if (window.jarvisAPI?.importSkillFile) {
        const res = await window.jarvisAPI.importSkillFile({
          content: text,
          fileName: file.name,
        });
        if (res && res.success && res.skill) {
          showNotice(`Imported "${res.skill.name}" successfully!`);
          await fetchSkills();
        } else if (res && res.error) {
          alert(`Failed to import skill: ${res.error}`);
        }
      }
    } catch (err: any) {
      alert(`Error reading file: ${err.message}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileImport(e.dataTransfer.files[0]);
    }
  };

  const filteredSkills = useMemo(() => {
    if (filterView === 'custom') {
      return skills.filter((s) => !s.isBuiltIn);
    }
    return skills;
  }, [skills, filterView]);

  return (
    <div className="flex-1 w-full min-h-full bg-[#f7f7fa] dark:bg-[#070709] text-gray-900 dark:text-zinc-100 font-sans select-none px-8 py-10 overflow-y-auto">
      {/* Floating Notification */}
      {feedbackNotice && (
        <div className="fixed top-6 right-8 z-50 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-medium shadow-xl flex items-center gap-2 animate-in fade-in duration-150">
          <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.2} />
          <span>{feedbackNotice}</span>
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {currentView === 'list' && (
          /* ============================================================== */
          /* VIEW 1: MAIN SKILLS LIST VIEW                                  */
          /* ============================================================== */
          <motion.div
            key="skills-list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto w-full flex flex-col gap-6"
          >
            {/* 1. Heading Row: Title & Description on Left, "Add Custom Skill" Button on Right */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-white">Skills</h1>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                  Modular execution playbooks and procedural instructions for Grokki Agent.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddCustomSkill}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors shadow-xs shrink-0 cursor-pointer"
              >
                <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2.2} />
                <span>Add Custom Skill</span>
              </button>
            </div>

            {/* 2. Full-width Drag & Drop Dotted Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-gray-500 dark:border-zinc-400 bg-white/90 dark:bg-zinc-800/40'
                  : 'border-[#d0d0dc] dark:border-zinc-800 hover:border-gray-400 dark:hover:border-zinc-600 bg-white/70 dark:bg-[#0b0c10] hover:bg-white dark:hover:bg-[#0e0f14]'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".md,.markdown"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileImport(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />
              <HugeiconsIcon
                icon={Upload01Icon}
                size={22}
                strokeWidth={1.75}
                className={`mb-2.5 transition-colors ${
                  isDragging ? 'text-gray-950 dark:text-white' : 'text-gray-400 dark:text-zinc-500'
                }`}
              />
              <p className="text-sm font-medium text-gray-800 dark:text-zinc-200 text-center">
                Drag and drop your skill file or{' '}
                <span className="text-gray-950 dark:text-zinc-100 underline decoration-gray-400 dark:decoration-zinc-500 underline-offset-4">
                  click here to browse
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                Supports standard .md files with YAML frontmatter
              </p>
            </div>

            {/* 3. Filters: "All Skills" and "Custom" */}
            <div className="flex items-center gap-2 pt-1 border-b border-gray-200 dark:border-zinc-800/80 pb-3">
              <button
                type="button"
                onClick={() => setFilterView('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filterView === 'all'
                    ? 'bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-900/60'
                }`}
              >
                All Skills <span className="opacity-60 ml-1">({skills.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterView('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filterView === 'custom'
                    ? 'bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-xs'
                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-900/60'
                }`}
              >
                Custom <span className="opacity-60 ml-1">({skills.filter((s) => !s.isBuiltIn).length})</span>
              </button>
            </div>

            {/* 4. List of Skills */}
            <div className="flex flex-col gap-2.5 pb-12">
              {filteredSkills.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-zinc-500 text-xs">
                  No skills found. Click "Add Custom Skill" or drop a .md file above.
                </div>
              ) : (
                filteredSkills.map((skill) => (
                  <div
                    key={skill.id}
                    onClick={() => {
                      setInspectSkill(skill);
                      setCurrentView('details');
                    }}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                      skill.isEnabled
                        ? 'bg-white dark:bg-[#0d0e12] border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-gray-50/70 dark:hover:bg-[#111216]'
                        : 'bg-gray-50/50 dark:bg-[#070709] border-gray-200/60 dark:border-zinc-800 opacity-60 hover:opacity-80'
                    }`}
                  >
                    {/* Left: Command, Title, Description */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold text-gray-900 dark:text-zinc-100 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-gray-300 dark:border-zinc-700">
                          /{skill.id}
                        </span>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
                          {skill.title || skill.name}
                        </h3>
                        {skill.isBuiltIn ? (
                          <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700">
                            builtin
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700">
                            custom
                          </span>
                        )}
                      </div>
                      {skill.description && skill.description !== '>' && skill.description !== '|' ? (
                        <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-1 leading-relaxed">
                          {skill.description.replace(/^[>|]-?\s*/, '')}
                        </p>
                      ) : null}
                    </div>

                    {/* Right: Actions & Black/White Switch */}
                    <div className="flex items-center gap-3 shrink-0">
                      {!skill.isBuiltIn && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(skill, e)}
                          className="p-1.5 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                          title="Edit SKILL.md"
                        >
                          <HugeiconsIcon icon={PencilEdit01Icon} size={13} strokeWidth={1.75} />
                        </button>
                      )}

                      {!skill.isBuiltIn && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(skill.id, e)}
                          className="p-1.5 rounded-lg text-gray-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete Skill"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.75} />
                        </button>
                      )}

                      {/* Clean Hardware Toggle: Pure Black & White Contrast */}
                      <button
                        type="button"
                        onClick={(e) => handleToggle(skill, e)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors relative shrink-0 focus:outline-none cursor-pointer ${
                          skill.isEnabled
                            ? 'bg-gray-950 dark:bg-white text-white dark:text-gray-950'
                            : 'bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700'
                        }`}
                        title={skill.isEnabled ? 'Disable skill' : 'Enable skill'}
                      >
                        <div
                          className={`w-4 h-4 rounded-full transition-transform shadow-xs ${
                            skill.isEnabled
                              ? 'translate-x-4 bg-white dark:bg-zinc-950'
                              : 'translate-x-0 bg-white dark:bg-zinc-400'
                          }`}
                        />
                      </button>

                      <div className="text-gray-400 dark:text-zinc-500">
                        <HugeiconsIcon icon={ChevronRightIcon} size={14} strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {currentView === 'editor' && (
          /* ============================================================== */
          /* VIEW 2: IN-TAB SKILL EDITOR VIEW                               */
          /* ============================================================== */
          <motion.div
            key="skills-editor"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto w-full flex flex-col gap-6"
          >
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-zinc-800/80 pb-4">
              <button
                type="button"
                onClick={handleCancelEditor}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={15} strokeWidth={2} />
                <span>{editingSkillId && inspectSkill && inspectSkill.id === editingSkillId ? 'Back to Details' : 'Back to Skills'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEditor}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSkill}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors shadow-xs cursor-pointer"
                >
                  <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.2} />
                  <span>Save Skill</span>
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
                {editingSkillId ? `Edit Skill (/${editingSkillId})` : 'Add Custom Skill'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Define the YAML frontmatter (`name` and `description`) and markdown procedures for Grokki Agent.
              </p>
            </div>

            {/* Error Banner */}
            {editorError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono">
                {editorError}
              </div>
            )}

            {/* Editor Textarea Container */}
            <div className="relative flex flex-col gap-2">
              {/* "Write with Grokki" Button: Visible ONLY when input is empty */}
              {!editorMarkdown.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setGrokkiPrompt('');
                    setGenerateError(null);
                    setIsGrokkiModalOpen(true);
                  }}
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900/95 hover:bg-black dark:bg-zinc-800/90 dark:hover:bg-zinc-700 text-white dark:text-zinc-100 text-xs font-medium border border-gray-700/80 dark:border-zinc-700 shadow-sm transition-all cursor-pointer backdrop-blur-xs select-none"
                >
                  <img src={grokkiIcon} alt="" className="w-3.5 h-3.5 object-contain" />
                  <span>Write with Grokki</span>
                </button>
              )}

              <textarea
                rows={16}
                value={editorMarkdown}
                onChange={(e) => setEditorMarkdown(e.target.value)}
                placeholder="---&#10;name: my-skill&#10;description: When to execute this skill...&#10;---&#10;&#10;# Instructions..."
                className="w-full bg-white dark:bg-[#0c0d10] border border-[#d0d0dc] dark:border-zinc-800 focus:border-gray-500 dark:focus:border-zinc-600 rounded-xl p-4 font-mono text-xs text-gray-900 dark:text-zinc-200 outline-none resize-none leading-relaxed select-text shadow-xs"
                spellCheck={false}
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 dark:text-zinc-500 px-1">
                <span>Standard format: YAML frontmatter (`--- name, description ---`) followed by markdown body</span>
                <span>Saved as SKILL.md</span>
              </div>
            </div>
          </motion.div>
        )}

        {currentView === 'details' && inspectSkill && (
          /* ============================================================== */
          /* VIEW 3: IN-TAB SKILL DETAILS VIEW                              */
          /* ============================================================== */
          <motion.div
            key="skills-details"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto w-full flex flex-col gap-6"
          >
            {/* Top Navigation & Action Row */}
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-zinc-800/80 pb-4 select-none">
              <button
                type="button"
                onClick={() => setCurrentView('list')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={15} strokeWidth={2} />
                <span>Back to Skills</span>
              </button>

              <div className="flex items-center gap-2">
                {!inspectSkill.isBuiltIn && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(inspectSkill, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 hover:text-black dark:hover:text-white bg-gray-100 hover:bg-gray-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-gray-200 dark:border-zinc-700 shadow-2xs"
                  >
                    <HugeiconsIcon icon={PencilEdit01Icon} size={13} strokeWidth={1.8} />
                    <span>Edit Skill</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inspectSkill.rawMarkdown || inspectSkill.instructions);
                    setCopiedPlaybook(true);
                    setTimeout(() => setCopiedPlaybook(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-200 hover:text-black dark:hover:text-white bg-gray-100 hover:bg-gray-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-gray-200 dark:border-zinc-700 shadow-2xs"
                >
                  {copiedPlaybook ? (
                    <HugeiconsIcon icon={Tick02Icon} size={13} className="text-black dark:text-white" />
                  ) : (
                    <HugeiconsIcon icon={Copy01Icon} size={13} strokeWidth={1.8} />
                  )}
                  <span>{copiedPlaybook ? 'Copied' : 'Copy Playbook'}</span>
                </button>

                {!inspectSkill.isBuiltIn && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(inspectSkill.id, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border border-red-500/20 shadow-2xs"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={1.8} />
                    <span>Delete</span>
                  </button>
                )}

                {/* Pure Black/White Toggle Switch */}
                <div className="flex items-center gap-2 pl-3 ml-1 border-l border-gray-200 dark:border-zinc-800">
                  <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                    {inspectSkill.isEnabled ? 'Active' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleToggle(inspectSkill, e)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors relative shrink-0 focus:outline-none cursor-pointer ${
                      inspectSkill.isEnabled
                        ? 'bg-gray-950 dark:bg-white text-white dark:text-gray-950'
                        : 'bg-gray-200 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700'
                    }`}
                    title={inspectSkill.isEnabled ? 'Disable skill' : 'Enable skill'}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-transform shadow-xs ${
                        inspectSkill.isEnabled
                          ? 'translate-x-4 bg-white dark:bg-zinc-950'
                          : 'translate-x-0 bg-white dark:bg-zinc-400'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Title & Command Meta */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-gray-900 dark:text-zinc-100 bg-gray-200/80 dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-gray-300 dark:border-zinc-700">
                  /{inspectSkill.id}
                </span>
                {inspectSkill.isBuiltIn ? (
                  <span className="text-[11px] font-mono text-gray-500 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-900 px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-800">
                    builtin
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-700">
                    custom
                  </span>
                )}
                {inspectSkill.version && (
                  <span className="text-[11px] font-mono text-gray-400 dark:text-zinc-500">
                    v{inspectSkill.version}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
                {inspectSkill.title || inspectSkill.name}
              </h1>
            </div>

            {/* Description Section */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-500 select-none">
                Description
              </span>
              <div className="p-4 rounded-xl bg-white dark:bg-[#0c0d10] border border-[#d0d0dc] dark:border-zinc-800 text-xs text-gray-800 dark:text-zinc-300 leading-relaxed shadow-xs select-text">
                {inspectSkill.description || 'No description provided.'}
              </div>
            </div>

            {/* Playbook Instructions Section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between select-none">
                <span className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-500">
                  Playbook Instructions
                </span>
                <span className="text-[11px] font-mono text-gray-400 dark:text-zinc-500">
                  Standard SKILL.md format
                </span>
              </div>

              <div className="rounded-xl border border-[#d0d0dc] dark:border-zinc-800 bg-white dark:bg-[#070709] p-5 font-mono text-xs text-gray-900 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed overflow-x-auto shadow-xs select-text">
                {inspectSkill.rawMarkdown || inspectSkill.instructions}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Write with Grokki Skill Generator Modal */}
      {isGrokkiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#0c0d10] border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center border border-gray-200 dark:border-zinc-700">
                  <img src={grokkiIcon} alt="" className="w-4 h-4 object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-950 dark:text-white">
                    Write Skill with Grokki
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                    Describe what you want Grokki to do and generate a standard SKILL.md
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGrokkiModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4">
              {generateError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono">
                  {generateError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                  What should this skill do?
                </label>
                <textarea
                  rows={4}
                  value={grokkiPrompt}
                  onChange={(e) => setGrokkiPrompt(e.target.value)}
                  placeholder="e.g. Lazy senior developer mode that solves the problem with the least code, or surgical bug doctor that traces root causes..."
                  className="w-full bg-gray-50 dark:bg-[#111216] border border-gray-200 dark:border-zinc-800 focus:border-gray-500 dark:focus:border-zinc-600 rounded-xl p-3 text-xs text-gray-900 dark:text-zinc-100 outline-none resize-none leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleGenerateWithGrokki();
                    }
                  }}
                />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">Quick suggestions:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Pull request reviewer with clean code checks',
                    'Tailwind CSS v4 migration auditor',
                    'Docker containerization & deployment playbook',
                    'Database schema design & query optimizer',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setGrokkiPrompt(suggestion)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1a1b22] dark:hover:bg-[#252630] text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 font-medium transition-colors text-left cursor-pointer shadow-2xs"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 dark:border-zinc-800/80 bg-gray-50/60 dark:bg-[#101116]/60">
              <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 text-[10px] font-mono text-gray-700 dark:text-zinc-300">Ctrl+Enter</kbd> to generate
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGrokkiModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!grokkiPrompt.trim()}
                  onClick={handleGenerateWithGrokki}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer border select-none ${
                    grokkiPrompt.trim()
                      ? 'bg-zinc-950 text-white hover:bg-black border-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:border-white'
                      : 'bg-zinc-200 text-zinc-400 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  <img src={grokkiIcon} alt="" className="w-4 h-4 object-contain" />
                  <span>Generate Skill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
