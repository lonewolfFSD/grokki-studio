import React, { useState, useEffect } from 'react';
import { Maximize2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { AttachedFileInfo } from '../types/jarvis';
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

interface ChatImageAttachmentProps {
  file: AttachedFileInfo | string;
  onZoom: (src: string, name: string, size?: number, path?: string) => void;
  compact?: boolean;
}

export function isImageAttachment(file?: AttachedFileInfo | string | null): boolean {
  if (!file) return false;
  const ext = (typeof file === 'string'
    ? (file.includes('.') ? '.' + file.split('.').pop()!.toLowerCase() : '')
    : (file.ext || (file.name.includes('.') ? '.' + file.name.split('.').pop()!.toLowerCase() : ''))
  ).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'].includes(ext);
}

export const ChatImageAttachment: React.FC<ChatImageAttachmentProps> = ({
  file,
  onZoom,
  compact = false,
}) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fileName = typeof file === 'string' ? (file.split(/[\\/]/).pop() || 'image.png') : file.name;
  const filePath = typeof file === 'string' ? file : file.path;
  const fileSize = typeof file !== 'string' ? file.size : undefined;
  const existingPreview = typeof file !== 'string' ? file.previewUrl : undefined;

  useEffect(() => {
    let cancelled = false;

    // 1. Direct Data / Blob URL
    if (existingPreview) {
      setImgSrc(existingPreview);
      setLoading(false);
      return;
    }

    if (filePath && (filePath.startsWith('data:') || filePath.startsWith('blob:') || filePath.startsWith('http'))) {
      setImgSrc(filePath);
      setLoading(false);
      return;
    }

    // 2. Local File in Electron: read base64 via IPC
    if (filePath && window.jarvisAPI?.readImageDataUrl) {
      setLoading(true);
      window.jarvisAPI.readImageDataUrl(filePath)
        .then((dataUrl) => {
          if (cancelled) return;
          if (dataUrl) {
            setImgSrc(dataUrl);
            setError(false);
          } else {
            setError(true);
          }
        })
        .catch(() => {
          if (!cancelled) setError(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      setLoading(false);
      setError(true);
    }

    return () => {
      cancelled = true;
    };
  }, [filePath, existingPreview]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imgSrc) {
      onZoom(imgSrc, fileName, fileSize, filePath);
    }
  };

  if (compact) {
    // Compact thumbnail used in the staged input card before sending
    return (
      <div
        onClick={handleClick}
        className="w-11 h-11 rounded-xl overflow-hidden bg-gray-900/5 dark:bg-white/5 border border-gray-200/90 dark:border-white/10 flex items-center justify-center flex-shrink-0 cursor-pointer relative group"
        title="Click to zoom image"
      >
        {imgSrc && !error ? (
          <img
            src={imgSrc}
            alt={fileName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <ImageIcon className="w-4 h-4 text-gray-400" />
        )}
      </div>
    );
  }

  // Full in-chat message card (like ChatGPT / Claude / Grok)
  return (
    <div className="mb-2.5 w-64 sm:w-72 rounded-xl overflow-hidden border border-gray-300/80 dark:border-[#2a2d3a] bg-gray-50/80 dark:bg-[#12141c]/90 shadow-2xs group flex flex-col">
      <div
        onClick={handleClick}
        className="relative overflow-hidden cursor-zoom-in bg-black/5 dark:bg-black/30 w-full h-48 sm:h-52 flex items-center justify-center"
      >
        {imgSrc && !error ? (
          <>
            <img
              src={imgSrc}
              alt={fileName}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 block"
            />
            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-sans font-medium flex items-center gap-1.5 backdrop-blur-xs shadow-md">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Click to zoom</span>
              </span>
            </div>
          </>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading image...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-gray-400 text-xs">
            <ImageIcon className="w-6 h-6" />
            <span>Image preview unavailable</span>
          </div>
        )}
      </div>

      {/* Info bar below image */}
      <div className="px-3 py-1.5 flex items-center justify-between text-xs font-mono bg-white/70 dark:bg-[#151722]/80 border-t border-gray-200/80 dark:border-white/5">
        <span className="truncate max-w-[190px] font-semibold text-gray-900 dark:text-gray-100">
          {fileName}
        </span>
        {fileSize ? (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
            {formatFileSize(fileSize)}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default ChatImageAttachment;
