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

  // Full in-chat message compact square thumbnail
  return (
    <div
      onClick={handleClick}
      className="mb-2 w-36 h-36 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border border-gray-300/80 dark:border-white/10 bg-black/5 dark:bg-black/30 shadow-xs cursor-pointer relative group flex-shrink-0"
      title="Click to view full image"
    >
      {imgSrc && !error ? (
        <>
          <img
            src={imgSrc}
            alt={fileName}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 block"
          />
          {/* Subtle fade-in Expand icon on hover */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-black/60 text-white backdrop-blur-sm flex items-center justify-center shadow-md transform scale-90 group-hover:scale-100 transition-transform duration-200">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>
        </>
      ) : loading ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-gray-400 text-xs">
          <ImageIcon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
};

export default ChatImageAttachment;
