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
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Plus,
  Minus,
  Move,
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

export interface TextAction {
  id: string;
  type: 'text';
  text: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  width: number; // normalized 0..1
  height: number; // normalized 0..1
  color: string;
  fontSize: number;
  fontFamily: 'sans' | 'serif' | 'mono';
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  hasBackground: boolean;
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
  // Annotation tool state
  const [activeTool, setActiveTool] = useState<'sketch' | 'text'>('sketch');
  const [activeColor, setActiveColor] = useState<string>('#ff5252');
  const [actions, setActions] = useState<AnnotationAction[]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationAction[]>([]);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Text state
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [dragBox, setDragBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Status toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const selectedText = actions.find(
    (a): a is TextAction => a.type === 'text' && a.id === selectedTextId
  );

  // Update a field on the currently selected text item
  const updateSelectedText = (updates: Partial<TextAction>) => {
    if (!selectedTextId) return;
    setActions((prev) =>
      prev.map((item) => {
        if (item.type === 'text' && item.id === selectedTextId) {
          return { ...item, ...updates };
        }
        return item;
      })
    );
  };

  const deleteSelectedText = () => {
    if (!selectedTextId) return;
    setActions((prev) => prev.filter((item) => item.type !== 'text' || item.id !== selectedTextId));
    setSelectedTextId(null);
  };

  // When active color is changed, also apply it to the selected text if any
  const handleColorChange = (col: string) => {
    setActiveColor(col);
    if (selectedTextId) {
      updateSelectedText({ color: col });
    }
  };

  // Keyboard shortcuts (Escape to close or deselect, Ctrl+Z for undo, Ctrl+Y for redo)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in inputs or textareas for undo/redo
      const isInputActive =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';

      if (e.key === 'Escape') {
        if (selectedTextId) {
          setSelectedTextId(null);
        } else {
          onClose();
        }
      } else if (!isInputActive && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (!isInputActive && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, actions, redoStack, selectedTextId]);

  // Redraw canvas on stroke actions or current stroke change
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw all committed stroke actions
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
      setSelectedTextId(null);
    } else if (activeTool === 'text') {
      // Start drag-to-create text box
      setSelectedTextId(null);
      setDragBox({
        startX: pt.x,
        startY: pt.y,
        currentX: pt.x,
        currentY: pt.y,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormCoords(e);
    if (!pt) return;

    if (activeTool === 'sketch' && isDrawing) {
      setCurrentStroke((prev) => [...prev, pt]);
    } else if (activeTool === 'text' && dragBox) {
      setDragBox((prev) => (prev ? { ...prev, currentX: pt.x, currentY: pt.y } : null));
    }
  };

  const handlePointerUp = () => {
    if (activeTool === 'sketch' && isDrawing) {
      setIsDrawing(false);
      if (currentStroke.length >= 2) {
        const newStroke: StrokeAction = {
          type: 'stroke',
          color: activeColor,
          width: 4,
          points: currentStroke,
        };
        setActions((prev) => [...prev, newStroke]);
        setRedoStack([]);
      }
      setCurrentStroke([]);
    } else if (activeTool === 'text' && dragBox) {
      const x = Math.min(dragBox.startX, dragBox.currentX);
      const y = Math.min(dragBox.startY, dragBox.currentY);
      const rawW = Math.abs(dragBox.currentX - dragBox.startX);
      const rawH = Math.abs(dragBox.currentY - dragBox.startY);

      // If user merely tapped/clicked without significant drag, give a nice default size
      const width = rawW < 0.04 ? 0.35 : Math.max(0.18, rawW);
      const height = rawH < 0.04 ? 0.12 : Math.max(0.08, rawH);

      const newId = Date.now().toString();
      const newTextAction: TextAction = {
        id: newId,
        type: 'text',
        text: '',
        x,
        y,
        width,
        height,
        color: activeColor,
        fontSize: 24,
        fontFamily: 'sans',
        bold: false,
        italic: false,
        align: 'left',
        hasBackground: false,
      };

      setActions((prev) => [...prev, newTextAction]);
      setRedoStack([]);
      setSelectedTextId(newId);
      setDragBox(null);

      setTimeout(() => {
        if (textareaRefs.current[newId]) {
          textareaRefs.current[newId]?.focus();
        }
      }, 50);
    }
  };

  const handleUndo = () => {
    if (actions.length === 0) return;
    const last = actions[actions.length - 1];
    setActions((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
    if (last.type === 'text' && last.id === selectedTextId) {
      setSelectedTextId(null);
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setActions((prev) => [...prev, last]);
  };

  // Repositioning an existing text box by dragging its handle
  const handleDragTextItem = (e: React.PointerEvent, textItem: TextAction) => {
    e.stopPropagation();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initialItemX = textItem.x;
    const initialItemY = textItem.y;

    const img = imageRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const onPointerMove = (ev: PointerEvent) => {
      const deltaX = (ev.clientX - startClientX) / rect.width;
      const deltaY = (ev.clientY - startClientY) / rect.height;
      const newX = Math.max(0, Math.min(1 - textItem.width, initialItemX + deltaX));
      const newY = Math.max(0, Math.min(1 - textItem.height, initialItemY + deltaY));
      updateSelectedText({ x: newX, y: newY });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Generate exported composite image (original image + sketches + text)
  const generateExportBlob = async (): Promise<Blob | null> => {
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

    // Scaling factor for strokes and fonts
    const scaleRatio = Math.max(1, width / 700);

    // 1. Draw strokes
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
      }
    }

    // 2. Draw text actions
    for (const action of actions) {
      if (action.type === 'text' && action.text.trim()) {
        const scaledFontSize = Math.round(action.fontSize * scaleRatio);
        const fontFamilies = {
          sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          serif: 'Georgia, Cambria, "Times New Roman", serif',
          mono: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
        };
        const fontFam = fontFamilies[action.fontFamily || 'sans'];
        const fontStyle = action.italic ? 'italic ' : '';
        const fontWeight = action.bold ? 'bold ' : 'normal ';

        ctx.font = `${fontStyle}${fontWeight}${scaledFontSize}px ${fontFam}`;
        ctx.textBaseline = 'top';

        const lines = action.text.split('\n');
        const lineHeight = scaledFontSize * 1.35;
        const boxX = action.x * width;
        const boxY = action.y * height;
        const boxW = action.width * width;

        // Draw background badge if enabled
        if (action.hasBackground) {
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          const pad = 12 * scaleRatio;
          const totalH = lines.length * lineHeight + pad * 2;
          let maxLineW = 0;
          for (const line of lines) {
            const m = ctx.measureText(line);
            if (m.width > maxLineW) maxLineW = m.width;
          }
          const badgeW = Math.max(boxW, maxLineW + pad * 2);
          const rad = 10 * scaleRatio;
          ctx.beginPath();
          if ('roundRect' in ctx) {
            (ctx as unknown as { roundRect: (...a: number[]) => void }).roundRect(
              boxX - pad / 2,
              boxY - pad / 2,
              badgeW,
              totalH,
              rad
            );
          } else {
            ctx.rect(boxX - pad / 2, boxY - pad / 2, badgeW, totalH);
          }
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = action.color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6 * scaleRatio;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let drawX = boxX;
          if (action.align === 'center') {
            ctx.textAlign = 'center';
            drawX = boxX + boxW / 2;
          } else if (action.align === 'right') {
            ctx.textAlign = 'right';
            drawX = boxX + boxW;
          } else {
            ctx.textAlign = 'left';
            drawX = boxX;
          }
          ctx.fillText(line, drawX, boxY + i * lineHeight);
        }
        ctx.shadowBlur = 0;
      }
    }

    return new Promise((resolve) => {
      exportCanvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  // Actions: Download
  const handleDownload = async () => {
    setSelectedTextId(null);
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
    setSelectedTextId(null);
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
    setSelectedTextId(null);
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
          onClick={() => {
            setSelectedTextId(null);
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

          {/* Center Image Viewport with Drawing Canvas and Interactive Text Boxes */}
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
              className="relative max-w-full max-h-full flex items-center justify-center select-none shadow-2xl rounded-2xl overflow-visible border border-white/10 bg-black/40"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Underlying Image */}
              <img
                ref={imageRef}
                src={src}
                alt={fileName}
                crossOrigin="anonymous"
                onLoad={syncCanvasSize}
                className="max-w-[85vw] max-h-[68vh] object-contain block select-none pointer-events-none rounded-2xl"
              />

              {/* Drawing / Interaction Canvas Overlay */}
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className={`absolute inset-0 z-10 touch-none rounded-2xl ${
                  activeTool === 'sketch'
                    ? 'cursor-crosshair'
                    : 'cursor-crosshair'
                }`}
              />

              {/* Dragging Selection Box Indicator when creating a text box */}
              {dragBox && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${Math.min(dragBox.startX, dragBox.currentX) * 100}%`,
                    top: `${Math.min(dragBox.startY, dragBox.currentY) * 100}%`,
                    width: `${Math.abs(dragBox.currentX - dragBox.startX) * 100}%`,
                    height: `${Math.abs(dragBox.currentY - dragBox.startY) * 100}%`,
                    zIndex: 25,
                  }}
                  className="border-2 border-dashed border-[#00b0ff] bg-[#00b0ff]/15 rounded-xl pointer-events-none flex items-center justify-center"
                >
                  <span className="text-[11px] font-medium text-white/90 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    Drag to size text
                  </span>
                </div>
              )}

              {/* Render All Text Elements Over Image */}
              {actions
                .filter((a): a is TextAction => a.type === 'text')
                .map((textItem) => {
                  const isSelected = textItem.id === selectedTextId;
                  const fontFamilies = {
                    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    serif: 'Georgia, Cambria, "Times New Roman", serif',
                    mono: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
                  };

                  return (
                    <div
                      key={textItem.id}
                      style={{
                        position: 'absolute',
                        left: `${textItem.x * 100}%`,
                        top: `${textItem.y * 100}%`,
                        width: `${textItem.width * 100}%`,
                        minHeight: `${textItem.height * 100}%`,
                        zIndex: isSelected ? 30 : 20,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTool('text');
                        setSelectedTextId(textItem.id);
                      }}
                      className={`group transition-all ${
                        isSelected
                          ? 'ring-2 ring-[#00b0ff] rounded-xl'
                          : 'hover:ring-1 hover:ring-white/40 rounded-xl'
                      }`}
                    >
                      {/* Floating Rich Formatting Toolbar above active text box */}
                      {isSelected && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute -top-12 left-0 flex items-center gap-1 p-1 bg-[#1e2029]/95 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl z-40 text-white whitespace-nowrap"
                        >
                          {/* Drag Handle to Reposition */}
                          <div
                            onPointerDown={(e) => handleDragTextItem(e, textItem)}
                            className="px-1.5 py-1 text-gray-400 hover:text-white cursor-grab active:cursor-grabbing rounded"
                            title="Drag to reposition text"
                          >
                            <Move className="w-3.5 h-3.5" />
                          </div>

                          <div className="w-px h-4 bg-white/15 mx-0.5" />

                          {/* Bold Toggle */}
                          <button
                            type="button"
                            onClick={() => updateSelectedText({ bold: !textItem.bold })}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                              textItem.bold
                                ? 'bg-white text-black font-black'
                                : 'hover:bg-white/10 text-gray-200'
                            }`}
                            title="Bold"
                          >
                            <Bold className="w-3.5 h-3.5" />
                          </button>

                          {/* Italic Toggle */}
                          <button
                            type="button"
                            onClick={() => updateSelectedText({ italic: !textItem.italic })}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                              textItem.italic
                                ? 'bg-white text-black font-bold'
                                : 'hover:bg-white/10 text-gray-200'
                            }`}
                            title="Italic"
                          >
                            <Italic className="w-3.5 h-3.5" />
                          </button>

                          <div className="w-px h-4 bg-white/15 mx-0.5" />

                          {/* Font Size Decrement */}
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedText({ fontSize: Math.max(12, textItem.fontSize - 4) })
                            }
                            className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-gray-300 cursor-pointer"
                            title="Smaller text"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] font-mono font-semibold px-1 min-w-[20px] text-center text-white">
                            {textItem.fontSize}
                          </span>
                          {/* Font Size Increment */}
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedText({ fontSize: Math.min(72, textItem.fontSize + 4) })
                            }
                            className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-gray-300 cursor-pointer"
                            title="Larger text"
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          <div className="w-px h-4 bg-white/15 mx-0.5" />

                          {/* Font Family Cycle */}
                          <button
                            type="button"
                            onClick={() => {
                              const fams: ('sans' | 'serif' | 'mono')[] = ['sans', 'serif', 'mono'];
                              const next = (fams.indexOf(textItem.fontFamily) + 1) % fams.length;
                              updateSelectedText({ fontFamily: fams[next] });
                            }}
                            className="px-2 h-7 rounded-lg hover:bg-white/10 text-[11px] font-medium text-gray-200 flex items-center gap-1 capitalize cursor-pointer"
                            title="Change font family"
                          >
                            <span>{textItem.fontFamily}</span>
                          </button>

                          <div className="w-px h-4 bg-white/15 mx-0.5" />

                          {/* Alignment Cycle */}
                          <button
                            type="button"
                            onClick={() => {
                              const aligns: ('left' | 'center' | 'right')[] = [
                                'left',
                                'center',
                                'right',
                              ];
                              const next = (aligns.indexOf(textItem.align) + 1) % aligns.length;
                              updateSelectedText({ align: aligns[next] });
                            }}
                            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-200 cursor-pointer"
                            title="Text alignment"
                          >
                            {textItem.align === 'center' ? (
                              <AlignCenter className="w-3.5 h-3.5" />
                            ) : textItem.align === 'right' ? (
                              <AlignRight className="w-3.5 h-3.5" />
                            ) : (
                              <AlignLeft className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Background Badge Toggle */}
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedText({ hasBackground: !textItem.hasBackground })
                            }
                            className={`px-2 h-7 rounded-lg flex items-center justify-center text-[11px] font-medium transition-colors cursor-pointer ${
                              textItem.hasBackground
                                ? 'bg-white text-black font-semibold'
                                : 'hover:bg-white/10 text-gray-200'
                            }`}
                            title="Toggle background badge"
                          >
                            Badge
                          </button>

                          <div className="w-px h-4 bg-white/15 mx-0.5" />

                          {/* Delete Text */}
                          <button
                            type="button"
                            onClick={deleteSelectedText}
                            className="w-7 h-7 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center justify-center cursor-pointer"
                            title="Delete text"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Done / Checkmark */}
                          <button
                            type="button"
                            onClick={() => setSelectedTextId(null)}
                            className="w-7 h-7 rounded-lg hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 flex items-center justify-center cursor-pointer"
                            title="Done editing"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Text Input / Display Area */}
                      <textarea
                        ref={(el) => {
                          textareaRefs.current[textItem.id] = el;
                        }}
                        value={textItem.text}
                        placeholder={isSelected ? 'Type text...' : ''}
                        onChange={(e) => updateSelectedText({ text: e.target.value })}
                        onFocus={() => {
                          setActiveTool('text');
                          setSelectedTextId(textItem.id);
                        }}
                        style={{
                          color: textItem.color,
                          fontSize: `${textItem.fontSize}px`,
                          fontFamily: fontFamilies[textItem.fontFamily || 'sans'],
                          fontWeight: textItem.bold ? 'bold' : 'normal',
                          fontStyle: textItem.italic ? 'italic' : 'normal',
                          textAlign: textItem.align || 'left',
                          backgroundColor: textItem.hasBackground
                            ? 'rgba(0, 0, 0, 0.7)'
                            : isSelected
                            ? 'rgba(0, 0, 0, 0.4)'
                            : 'transparent',
                          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                        }}
                        className={`w-full h-full min-h-[44px] p-2 resize-none outline-none rounded-xl leading-snug transition-all ${
                          isSelected
                            ? 'border border-[#00b0ff]/60 shadow-lg'
                            : 'border border-transparent'
                        }`}
                      />
                    </div>
                  );
                })}
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
                    onClick={() => handleColorChange(col)}
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
                    setSelectedTextId(null);
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
                    setActiveTool('text');
                  }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    activeTool === 'text'
                      ? 'bg-white text-black shadow-lg scale-105'
                      : 'bg-white/10 text-white/90 hover:bg-white/15'
                  }`}
                  title="Add / Drag Text Area"
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
