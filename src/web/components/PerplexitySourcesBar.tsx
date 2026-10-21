import React, { useState } from 'react';
import { Globe, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { GroundingMetadata, GroundingSource } from '../types/jarvis';

interface PerplexitySourcesBarProps {
  grounding: GroundingMetadata;
}

export const PerplexitySourcesBar: React.FC<PerplexitySourcesBarProps> = ({ grounding }) => {
  const [expanded, setExpanded] = useState(false);
  const sources = grounding.sources || [];

  if (sources.length === 0) return null;

  const handleOpenSource = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="mb-3.5 select-none font-sans">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-100/70 dark:bg-[#12141c]/80 border border-gray-200/80 dark:border-white/[0.07] backdrop-blur-xs">
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-medium shrink-0">
            <Globe className="w-3.5 h-3.5" />
            <span>Searched {sources.length} sources</span>
          </div>

          {/* Quick domain badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {sources.slice(0, 4).map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={(e) => handleOpenSource(e, source.url)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/60 dark:bg-white/[0.05] hover:bg-sky-500/10 dark:hover:bg-sky-500/15 border border-gray-200 dark:border-white/[0.08] hover:border-sky-500/30 text-[11px] text-gray-700 dark:text-gray-300 hover:text-sky-400 transition-all cursor-pointer truncate max-w-[150px]"
                title={`${source.title} (${source.hostname})`}
              >
                {source.favicon ? (
                  <img
                    src={source.favicon}
                    alt=""
                    className="w-3 h-3 rounded-xs shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                )}
                <span className="truncate">{source.hostname}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Expand / Collapse Button */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
        >
          <span>{expanded ? 'Collapse' : 'View all'}</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Expanded Grid Cards */}
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2 pt-1 animate-in fade-in duration-150">
          {sources.map((source) => (
            <div
              key={source.id}
              onClick={(e) => handleOpenSource(e, source.url)}
              className="group p-2.5 rounded-xl bg-white dark:bg-[#11131a] hover:bg-gray-50 dark:hover:bg-[#161822] border border-gray-200/80 dark:border-white/[0.08] hover:border-sky-500/30 transition-all cursor-pointer flex flex-col justify-between gap-1.5 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-4 h-4 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                      {source.id}
                    </span>
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                      {source.hostname}
                    </span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-sky-400 shrink-0 transition-colors" />
                </div>
                <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-sky-400 transition-colors">
                  {source.title}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                  {source.snippet}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerplexitySourcesBar;
