import React, { useEffect, useState } from 'react';
import { Folder, FolderOpen, Plus, Trash2, Check } from 'lucide-react';

interface SavedProject {
  path: string;
  name: string;
  lastUsed?: number;
}

const STORAGE_KEY = 'grokki_recent_projects';

const loadSavedProjects = (): SavedProject[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveProjectsList = (list: SavedProject[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {}
};

export const ProjectsTab: React.FC = () => {
  const [activeRoot, setActiveRoot] = useState<string>('');
  const [activeName, setActiveName] = useState<string>('');
  const [projects, setProjects] = useState<SavedProject[]>(() => loadSavedProjects());
  const [loading, setLoading] = useState(false);

  const upsertProject = (rootPath: string, folderName?: string) => {
    if (!rootPath) return;
    const name =
      folderName ||
      rootPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ||
      'Project';
    setProjects((prev) => {
      const next = [
        { path: rootPath, name, lastUsed: Date.now() },
        ...prev.filter((p) => p.path.toLowerCase() !== rootPath.toLowerCase()),
      ];
      saveProjectsList(next);
      return next;
    });
  };

  useEffect(() => {
    let mounted = true;
    window.jarvisAPI?.getWorkspaceRoot?.().then((res) => {
      if (!mounted || !res?.workspaceRoot) return;
      setActiveRoot(res.workspaceRoot);
      const name =
        res.folderName ||
        res.workspaceRoot.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ||
        'Project';
      setActiveName(name);
      upsertProject(res.workspaceRoot, name);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleAddOrChangeFolder = async () => {
    if (!window.jarvisAPI?.selectWorkspaceFolder) return;
    setLoading(true);
    try {
      const res = await window.jarvisAPI.selectWorkspaceFolder();
      if (res?.success && res.workspaceRoot) {
        setActiveRoot(res.workspaceRoot);
        const name =
          res.folderName ||
          res.workspaceRoot.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ||
          'Project';
        setActiveName(name);
        upsertProject(res.workspaceRoot, name);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchProject = async (proj: SavedProject) => {
    if (window.jarvisAPI?.setWorkspaceRoot) {
      const res = await window.jarvisAPI.setWorkspaceRoot(proj.path);
      if (res?.success) {
        setActiveRoot(res.workspaceRoot || proj.path);
        setActiveName(proj.name);
        upsertProject(res.workspaceRoot || proj.path, proj.name);
      }
    }
  };

  const handleRemoveProject = (pathToRemove: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.path !== pathToRemove);
      saveProjectsList(next);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Active Workspace */}
      <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1a1c24] border border-gray-200 dark:border-[#1e2029] flex items-center justify-center flex-shrink-0 text-gray-700 dark:text-zinc-200">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 truncate">
                {activeName || 'No active project'}
              </span>
              {activeRoot && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
                  Active
                </span>
              )}
            </div>
            <p className="text-[12px] font-mono text-gray-500 dark:text-zinc-400 truncate mt-0.5 mb-0">
              {activeRoot || 'Select a project folder for Grokki Agent'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleAddOrChangeFolder}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 border-none cursor-pointer transition-opacity flex-shrink-0 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{activeRoot ? 'Change folder' : 'Open project'}</span>
        </button>
      </div>

      {/* Recent Projects List */}
      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-1">
          Recent Projects
        </div>

        {projects.length === 0 ? (
          <div className="bg-white dark:bg-[#0f0f13] border border-dashed border-[#e4e4eb] dark:border-[#1f1f22] rounded-2xl p-8 text-center text-[12px] text-gray-500 dark:text-zinc-400">
            No recent projects yet. Click &ldquo;Open project&rdquo; to add a workspace folder.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#0f0f13] border border-[#e4e4eb] dark:border-[#1f1f22] rounded-2xl divide-y divide-[#e4e4eb] dark:divide-[#1f1f22] overflow-hidden">
            {projects.map((proj) => {
              const isCurrent =
                activeRoot && proj.path.toLowerCase() === activeRoot.toLowerCase();
              return (
                <div
                  key={proj.path}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#161822] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleSwitchProject(proj)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left bg-transparent border-none cursor-pointer p-0"
                  >
                    <Folder className="w-4 h-4 text-gray-400 dark:text-zinc-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-gray-900 dark:text-zinc-100 truncate">
                        {proj.name}
                      </div>
                      <div className="text-[11px] font-mono text-gray-500 dark:text-zinc-400 truncate">
                        {proj.path}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isCurrent && (
                      <Check className="w-4 h-4 text-emerald-500" aria-label="Active project" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(proj.path)}
                      title="Remove from recent projects"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 bg-transparent border-none cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
