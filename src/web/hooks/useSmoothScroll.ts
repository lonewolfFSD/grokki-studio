import { useEffect, useRef } from 'react';

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight;
    if (isScrollable) return node;
    node = node.parentElement;
  }
  return null;
}

export function useSmoothScroll(enabled: boolean = true, intensity: number = 5) {
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    if (!enabled) {
      document.documentElement.classList.remove('smooth-scroll');
      document.documentElement.classList.add('normal-scroll');
      return;
    }

    document.documentElement.classList.remove('normal-scroll');
    document.documentElement.classList.add('smooth-scroll');

    let currentTarget: HTMLElement | null = null;
    let targetScrollTop = 0;
    let animId: number | null = null;

    const smoothStep = () => {
      if (!currentTarget) {
        animId = null;
        return;
      }

      const current = currentTarget.scrollTop;
      const diff = targetScrollTop - current;

      if (Math.abs(diff) < 0.5) {
        currentTarget.scrollTop = targetScrollTop;
        animId = null;
        currentTarget = null;
        return;
      }

      // Snappy responsiveness: Level 1 = 0.75 (almost instant), Level 5 = 0.50 (crisp glide), Level 10 = 0.25 (soft float)
      const currentIntensity = Math.max(1, Math.min(10, intensityRef.current || 5));
      const lerpFactor = 0.80 - (currentIntensity / 10) * 0.55;

      currentTarget.scrollTop = current + diff * lerpFactor;
      animId = requestAnimationFrame(smoothStep);
    };

    const handleWheel = (e: WheelEvent) => {
      // Don't interfere if user is pinch-zooming, horizontal scrolling, or on a precision trackpad (fractional delta)
      if (e.ctrlKey || Math.abs(e.deltaY) < 1) return;
      if (e.deltaMode === 0 && e.deltaY % 1 !== 0) return; // Native trackpad gesture

      const targetEl = getScrollParent(e.target as HTMLElement);
      if (!targetEl) return;

      const canScrollDown = e.deltaY > 0 && targetEl.scrollTop + targetEl.clientHeight < targetEl.scrollHeight - 1;
      const canScrollUp = e.deltaY < 0 && targetEl.scrollTop > 1;

      if (!canScrollDown && !canScrollUp) return;

      // Normalize delta into standard comfortable pixel scroll distance (100–120px per wheel click)
      let delta = e.deltaY;
      if (e.deltaMode === 1) {
        // DOM_DELTA_LINE: Windows notched mouse wheel (e.g. deltaY = 3 lines).
        // 3 lines * 36px = 108px per notch!
        delta = e.deltaY * 36;
      } else if (e.deltaMode === 2) {
        // DOM_DELTA_PAGE
        delta = e.deltaY * targetEl.clientHeight;
      } else if (Math.abs(delta) < 40) {
        // Small pixel increments (some mice report 10-20px), scale to standard comfortable notch
        delta = Math.sign(delta) * Math.max(80, Math.abs(delta) * 3);
      }

      e.preventDefault();

      if (currentTarget !== targetEl) {
        currentTarget = targetEl;
        targetScrollTop = targetEl.scrollTop;
      }

      const maxScroll = targetEl.scrollHeight - targetEl.clientHeight;
      targetScrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop + delta));

      if (animId === null) {
        animId = requestAnimationFrame(smoothStep);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (animId !== null) cancelAnimationFrame(animId);
      document.documentElement.classList.remove('smooth-scroll', 'normal-scroll');
    };
  }, [enabled]);
}
