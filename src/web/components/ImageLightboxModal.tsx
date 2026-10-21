import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Share2,
  Copy,
  Download,
  Undo2,
  Redo2,
  Check,
  X,
  Type,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

interface Point {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
}

interface StrokeAction {
  type: 'stroke';
  color: string;
  width: number;
  points: Point[];
}

interface TextAction {
  id: string;
  type: 'text';
  text: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  color: string;
  fontSize: number;
}

type AnnotationAction = StrokeAction | TextAction;

const PALETTE_COLORS = [
  '#000000', // Black
  '#ff5252', // Coral Red
  '#ffbb00', // Amber Yellow
  '#00c853', // Emerald Green
  '#00b0ff', // Sky Blue
  '#e040fb', // Magenta Violet
  '#ffffff', // Pure White
];

// Custom Sketch Squiggle Icon matching the screenshot
const SketchSquiggleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4.5 19c2.8-3.2 4.2-8.5 7.5-9.5 3.5-1 5.2 2.2 7.2 2.2 2 0 3-1.8 3-3.2" />
    <path d="M7.5 16c2-2.2 4.2-5.5 7.2-5.5 2.5 0 3.5 2 5.2 1" />
  </svg>
);

// Custom Text Icon with dashed/framed box matching the screenshot
const TextFrameIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" strokeDasharray="2.5 2.5" />
    <path d="M8 8.5h8" />
    <path d="M12 8.5v7" />
    <path d="M10 15.5h4" />
  </svg>
);

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  src,
  fileName,
  fileSize,
  filePath,
  originRect,
  onClose,
}) => {
  // Annotation state
  const [activeTool, setActiveTool] = useState<'sketch' | 'text'>('sketch');
  const [activeColor, setActiveColor] = useState<string>('#ff5252');
  const [actions, setActions] = useState<AnnotationAction[]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationAction[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Text input state
  const [editingText, setEditingText] = useState<{
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
    isNew?: boolean;
  } | null>(null);

  // Status toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // Keyboard shortcuts (Escape to close, Ctrl+Z for undo, Ctrl+Y for redo)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingText) {
          setEditingText(null);
        } else {
          onClose();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, actions, redoStack, editingText]);

  // Focus text input when editing starts
  useEffect(() => {
    if (editingText && textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, [editingText]);

  // Redraw canvas on actions or current stroke change
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw all committed actions
    for (const action of actions) {
      if (action.type === 'stroke') {
        if (action.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = action.color;
        ctx.lineWidth = action.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(action.points[0].x * width, action.points[0].y * height);
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x * width, action.points[i].y * height);
        }
        ctx.stroke();
      } else if (action.type === 'text') {
        ctx.font = `bold ${action.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = action.color;
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 6;
        ctx.fillText(action.text, action.x * width, action.y * height);
        ctx.shadowBlur = 0;
      }
    }

    // Draw live stroke being drawn right now
    if (currentStroke.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(currentStroke[0].x * width, currentStroke[0].y * height);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x * width, currentStroke[i].y * height);
      }
      ctx.stroke();
    }
  }, [actions, currentStroke, activeColor]);

  // Resize canvas to match display size of image
  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const rect = img.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) {
        canvas.width = Math.round(rect.width);
        canvas.height = Math.round(rect.height);
        redrawCanvas();
      }
    }
  }, [redrawCanvas]);

  useEffect(() => {
    syncCanvasSize();
    redrawCanvas();
  }, [syncCanvasSize, redrawCanvas, isOpen, src]);

  // Handle window resize
  useEffect(() => {
    const onResize = () => {
      syncCanvasSize();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncCanvasSize]);

  // Pointer drawing handlers
  const getNormCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const pt = getNormCoords(e);
    if (!pt) return;

    if (activeTool === 'sketch') {
      setIsDrawing(true);
      setCurrentStroke([pt]);
    } else if (activeTool === 'text') {
      // Commit pending text if any
      commitCurrentText();
      // Start a new text entry at clicked spot
      setEditingText({
        id: Date.now().toString(),
        text: '',
        x: pt.x,
        y: pt.y,
        color: activeColor,
        isNew: true,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== 'sketch') return;
    const pt = getNormCoords(e);
    if (!pt) return;

    setCurrentStroke((prev) => {
      const next = [...prev, pt];
      return next;
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing || activeTool !== 'sketch') return;
    setIsDrawing(false);

    if (currentStroke.length >= 2) {
      const newStroke: StrokeAction = {
        type: 'stroke',
        color: activeColor,
        width: 4,
        points: currentStroke,
      };
      setActions((prev) => [...prev, newStroke]);
      setRedoStack([]); // clear redo stack on new action
    }
    setCurrentStroke([]);
  };

  const commitCurrentText = () => {
    if (editingText && editingText.text.trim()) {
      const newTextAction: TextAction = {
        id: editingText.id,
        type: 'text',
        text: editingText.text.trim(),
        x: editingText.x,
        y: editingText.y,
        color: editingText.color,
        fontSize: 24,
      };
      setActions((prev) => [...prev, newTextAction]);
      setRedoStack([]);
    }
    setEditingText(null);
  };

  const handleUndo = () => {
    commitCurrentText();
    if (actions.length === 0) return;
    const last = actions[actions.length - 1];
    setActions((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
  };

  const handleRedo = () => {
    commitCurrentText();
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setActions((prev) => [...prev, last]);
  };

  // Generate exported composite image (original image + sketches + text)
  const generateExportBlob = async (): Promise<Blob | null> => {
    commitCurrentText();
    const img = imageRef.current;
    if (!img) return null;

    const exportCanvas = document.createElement('canvas');
    const width = img.naturalWidth || 1200;
    const height = img.naturalHeight || 900;
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    // Draw background original image
    ctx.drawImage(img, 0, 0, width, height);

    // Scaling factor for stroke width and font size
    const scaleRatio = Math.max(1, width / 700);

    // Draw actions
    for (const action of actions) {
      if (action.type === 'stroke') {
        if (action.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = action.color;
        ctx.lineWidth = action.width * scaleRatio;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.moveTo(action.points[0].x * width, action.points[0].y * height);
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x * width, action.points[i].y * height);
        }
        ctx.stroke();
      } else if (action.type === 'text') {
        const scaledFontSize = Math.round(action.fontSize * scaleRatio);
        ctx.font = `bold ${scaledFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = action.color;
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 6 * scaleRatio;
        ctx.fillText(action.text, action.x * width, action.y * height);
        ctx.shadowBlur = 0;
      }
    }

    return new Promise((resolve) => {
      exportCanvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  // Actions: Download
  const handleDownload = async () => {
    const blob = await generateExportBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotated_${fileName || 'image.png'}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Image downloaded');
  };

  // Actions: Copy
  const handleCopy = async () => {
    const blob = await generateExportBlob();
    if (!blob) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Copied image to clipboard');
      } else {
        showToast('Clipboard not supported');
      }
    } catch {
      showToast('Could not copy image');
    }
  };

  // Actions: Save
  const handleSave = async () => {
    await handleDownload();
    showToast('Saved to your device');
  };

  // Actions: Share
  const handleShare = async () => {
    const blob = await generateExportBlob();
    if (!blob) return;
    try {
      const file = new File([blob], fileName || 'image.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName || 'Annotated Image',
        });
      } else {
        await handleCopy();
      }
    } catch {
      await handleCopy();
    }
  };

  // Coordinates calculation for smooth spring transition from thumbnail
  const hasOrigin = !!originRect && originRect.width > 0 && originRect.height > 0;
  const initialX = hasOrigin
    ? originRect.left + originRect.width / 2 - window.innerWidth / 2
    : 0;
  const initialY = hasOrigin
    ? originRect.top + originRect.height / 2 - window.innerHeight / 2
    : 0;
  const initialScale = hasOrigin
    ? Math.max(0.06, Math.min(originRect.width, originRect.height) / 440)
    : 0.8;

  return (
    <AnimatePresence>
      {isOpen && src && (
        <motion.div
          key="image-markup-modal"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-[99999] bg-[#16171b] flex flex-col justify-between select-none overflow-hidden"
          onClick={(e) => {
            // Click outside image canvas commits text
            commitCurrentText();
          }}
        >
          {/* Top Bar: Back arrow on left, Action buttons on right */}
          <div className="w-full flex items-center justify-between px-6 py-4 z-20">
            {/* Back Arrow button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Right Action Icons & Save button */}
            <div className="flex items-center gap-4 text-white/90">
              {/* Share */}
              <button
                type="button"
                onClick={handleShare}
                title="Share image"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {/* Copy */}
              <button
                type="button"
                onClick={handleCopy}
                title="Copy image to clipboard"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
              </button>

              {/* Download */}
              <button
                type="button"
                onClick={handleDownload}
                title="Download image"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Undo */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={actions.length === 0}
                title="Undo (Ctrl+Z)"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  actions.length === 0
                    ? 'opacity-35 cursor-not-allowed text-white/50'
                    : 'hover:bg-white/10 hover:text-white cursor-pointer text-white/90'
                }`}
              >
                <Undo2 className="w-4 h-4" />
              </button>

              {/* Redo */}
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                title="Redo (Ctrl+Y)"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  redoStack.length === 0
                    ? 'opacity-35 cursor-not-allowed text-white/50'
                    : 'hover:bg-white/10 hover:text-white cursor-pointer text-white/90'
                }`}
              >
                <Redo2 className="w-4 h-4" />
              </button>

              {/* Save Button (Pill) */}
              <button
                type="button"
                onClick={handleSave}
                className="ml-1 px-5 py-1.5 rounded-full bg-white text-black font-semibold text-xs tracking-tight hover:bg-gray-100 transition-colors shadow-sm cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>

          {/* Toast feedback pill */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-medium shadow-lg border border-white/10 flex items-center gap-1.5 pointer-events-none"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center Image Viewport with Drawing Canvas */}
          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center w-full min-h-0 px-4 py-2 overflow-hidden relative"
          >
            <motion.div
              initial={{
                x: initialX,
                y: initialY,
                scale: initialScale,
                opacity: 0.9,
              }}
              animate={{
                x: 0,
                y: 0,
                scale: 1,
                opacity: 1,
              }}
              exit={{
                x: initialX,
                y: initialY,
                scale: initialScale,
                opacity: 0,
              }}
              transition={{
                type: 'spring',
                damping: 28,
                stiffness: 300,
                mass: 0.8,
              }}
              className="relative max-w-full max-h-full flex items-center justify-center select-none shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-black/40"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Underlying Image */}
              <img
                ref={imageRef}
                src={src}
                alt={fileName}
                crossOrigin="anonymous"
                onLoad={syncCanvasSize}
                className="max-w-[85vw] max-h-[68vh] object-contain block select-none pointer-events-none"
              />

              {/* Drawing / Interaction Canvas Overlay */}
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className={`absolute inset-0 z-10 touch-none ${
                  activeTool === 'sketch' ? 'cursor-crosshair' : 'cursor-text'
                }`}
              />

              {/* Live Text Editing Box */}
              {editingText && canvasRef.current && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${editingText.x * 100}%`,
                    top: `${editingText.y * 100}%`,
                    transform: 'translate(-4px, -18px)',
                    zIndex: 20,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={textInputRef}
                    type="text"
                    value={editingText.text}
                    placeholder="Type text..."
                    onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        commitCurrentText();
                      }
                    }}
                    onBlur={commitCurrentText}
                    style={{ color: editingText.color }}
                    className="bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-lg text-lg font-bold border border-white/20 outline-none shadow-lg min-w-[120px]"
                  />
                </div>
              )}
            </motion.div>
          </div>

          {/* Bottom Bar: Palette + Sketch / Text Tool Selectors */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full flex flex-col items-center justify-center pb-6 pt-3 gap-4 z-20"
          >
            {/* Color Dots Row */}
            <div className="flex items-center gap-3">
              {PALETTE_COLORS.map((col) => {
                const isSelected = activeColor.toLowerCase() === col.toLowerCase();
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setActiveColor(col)}
                    aria-label={`Color ${col}`}
                    style={{ backgroundColor: col }}
                    className={`w-6 h-6 rounded-full transition-all duration-150 cursor-pointer ${
                      col === '#000000' ? 'border border-white/25' : ''
                    } ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#16171b] scale-125 shadow-md'
                        : 'hover:scale-110 opacity-90'
                    }`}
                  />
                );
              })}
            </div>

            {/* Tool Selectors Row: Sketch & Text */}
            <div className="flex items-center gap-6">
              {/* Sketch Tool */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    commitCurrentText();
                    setActiveTool('sketch');
                  }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    activeTool === 'sketch'
                      ? 'bg-white text-black shadow-lg scale-105'
                      : 'bg-white/10 text-white/90 hover:bg-white/15'
                  }`}
                  title="Sketch / Freehand Draw"
                >
                  <SketchSquiggleIcon className="w-5 h-5" />
                </button>
                <span className="text-[11px] font-medium text-gray-300 tracking-tight">Sketch</span>
              </div>

              {/* Text Tool */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    commitCurrentText();
                    setActiveTool('text');
                  }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    activeTool === 'text'
                      ? 'bg-white text-black shadow-lg scale-105'
                      : 'bg-white/10 text-white/90 hover:bg-white/15'
                  }`}
                  title="Add Text"
                >
                  <TextFrameIcon className="w-5 h-5" />
                </button>
                <span className="text-[11px] font-medium text-gray-300 tracking-tight">Text</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageLightboxModal;
