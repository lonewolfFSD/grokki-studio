import React, { useEffect } from 'react';
import { X, ExternalLink, ImageIcon, Download } from 'lucide-react';
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

interface ImageLightboxModalProps {
  isOpen: boolean;
  src: string;
  fileName: string;
  fileSize?: number;
  filePath?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  src,
  fileName,
  fileSize,
  filePath,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filePath && window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl(filePath).catch(() => {});
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-4 md:p-6 transition-all duration-200 select-none animate-fadeIn"
    >
      {/* Top Header Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#161822]/90 border border-white/10 shadow-lg text-white"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-gray-300">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-100 truncate max-w-sm md:max-w-xl">
              {fileName}
            </div>
            {fileSize ? (
              <div className="text-[10px] text-gray-400 font-mono">
                {formatFileSize(fileSize)}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {filePath && (
            <button
              type="button"
              onClick={handleOpenExternal}
              title="Open with default Windows app"
              className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open File</span>
            </button>
          )}

          <a
            href={src}
            download={fileName || 'image.png'}
            onClick={(e) => e.stopPropagation()}
            title="Download / Save Image"
            className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10 no-underline"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport (Big Scale) */}
      <div
        onClick={onClose}
        className="flex-1 flex items-center justify-center w-full min-h-0 my-3 p-2 overflow-hidden"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          <img
            src={src}
            alt={fileName}
            className="max-w-[90vw] max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/15 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] scale-100 cursor-default"
          />
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="text-[11px] text-gray-400/80 font-medium tracking-wide">
        Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-gray-300 font-mono text-[10px]">Esc</kbd> or click anywhere outside to close
      </div>
    </div>
  );
};

export default ImageLightboxModal;
