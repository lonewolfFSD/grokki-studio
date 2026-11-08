import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { GroundingImage } from '../types/jarvis';

interface RelatedImagesCarouselProps {
  images: GroundingImage[];
  onOpenImage?: (
    src: string,
    alt: string,
    originRect?: { top: number; left: number; width: number; height: number },
    fallbackSrc?: string
  ) => void;
}

export const RelatedImagesCarousel: React.FC<RelatedImagesCarouselProps> = ({ images, onOpenImage }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());

  const validImages = images.filter((_, idx) => !failedIndices.has(idx));

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [validImages.length]);

  if (validImages.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -340 : 340;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleCardClick = (e: React.MouseEvent, img: GroundingImage) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    onOpenImage?.(
      img.image,
      img.title,
      {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      img.thumbnail || img.image
    );
  };

  return (
    <div className="relative group/carousel my-3.5 select-none font-sans">
      {/* Subtle Label */}
      <div className="flex items-center gap-1.5 mb-2 px-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        <ImageIcon className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
        <span>Related Photos & Views ({validImages.length})</span>
      </div>

      {/* Scroll Controls */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute left-2 top-[54%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 dark:bg-[#11131a]/95 backdrop-blur-md border border-gray-200 dark:border-white/15 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute right-2 top-[54%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 dark:bg-[#11131a]/95 backdrop-blur-md border border-gray-200 dark:border-white/15 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Horizontal Cards Reel */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 px-0.5"
      >
        {images.map((img, idx) => {
          if (failedIndices.has(idx)) return null;
          return (
            <div
              key={`${img.image}-${idx}`}
              onClick={(e) => handleCardClick(e, img)}
              className="relative shrink-0 snap-start w-64 sm:w-72 md:w-80 h-38 sm:h-44 md:h-48 rounded-2xl overflow-hidden border border-gray-200/90 dark:border-white/10 hover:border-sky-500/50 dark:hover:border-sky-400/50 bg-gray-100 dark:bg-white/[0.04] cursor-pointer group transition-all duration-200"
            >
              <img
                src={img.thumbnail || img.image}
                alt={img.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => {
                  setFailedIndices((prev) => new Set(prev).add(idx));
                }}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Gradient scrim with title */}
              <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex items-end justify-between gap-1.5 pointer-events-none">
                <span className="text-xs font-semibold text-white/95 truncate group-hover:text-sky-300 transition-colors">
                  {img.title}
                </span>
                <span className="shrink-0 p-1.5 rounded-lg bg-white/20 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
