import React, { useEffect } from 'react';
import { X, ExternalLink, ImageIcon, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export interface OriginRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ImageLightboxModalProps {
  isOpen: boolean;
  src: string;
  fileName: string;
  fileSize?: number;
  filePath?: string;
  originRect?: OriginRect;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  src,
  fileName,
  fileSize,
  filePath,
  originRect,
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

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (filePath && window.jarvisAPI?.openUrl) {
      window.jarvisAPI.openUrl(filePath).catch(() => {});
    }
  };

  const hasOrigin = !!originRect && originRect.width > 0 && originRect.height > 0;
  const initialX = hasOrigin
    ? (originRect.left + originRect.width / 2) - window.innerWidth / 2
    : 0;
  const initialY = hasOrigin
    ? (originRect.top + originRect.height / 2) - window.innerHeight / 2
    : 0;
  const initialScale = hasOrigin
    ? Math.max(0.06, Math.min(originRect.width, originRect.height) / 420)
    : 0.8;

  return (
    <AnimatePresence>
      {isOpen && src && (
        <motion.div
          key="lightbox-modal"
          role="dialog"
          aria-modal="true"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-4 md:p-6 select-none"
        >
          {/* Top Header Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
          </motion.div>

          {/* Main Image Viewport (Smooth Zoom from Origin to Center) */}
          <div
            onClick={onClose}
            className="flex-1 flex items-center justify-center w-full min-h-0 my-3 p-2 overflow-hidden"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-full max-h-full flex items-center justify-center"
            >
              <motion.img
                key={src}
                src={src}
                alt={fileName}
                initial={{
                  x: initialX,
                  y: initialY,
                  scale: initialScale,
                  opacity: 0.9,
                  borderRadius: '16px',
                }}
                animate={{
                  x: 0,
                  y: 0,
                  scale: 1,
                  opacity: 1,
                  borderRadius: '16px',
                }}
                exit={{
                  x: initialX,
                  y: initialY,
                  scale: initialScale,
                  opacity: 0,
                  borderRadius: '16px',
                }}
                transition={{
                  type: 'spring',
                  damping: 26,
                  stiffness: 300,
                  mass: 0.8,
                }}
                className="max-w-[90vw] max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/15 cursor-default"
              />
            </div>
          </div>

          {/* Bottom Hint */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-[11px] text-gray-400/80 font-medium tracking-wide"
          >
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-gray-300 font-mono text-[10px]">Esc</kbd> or click anywhere outside to close
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageLightboxModal;
