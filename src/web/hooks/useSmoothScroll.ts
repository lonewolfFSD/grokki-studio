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

      // Intensity scale (1 = snappy/fast, 10 = ultra smooth/cinematic)
      // Range: 0.55 (level 1) down to 0.16 (level 10). Default level 5 is 0.38 (snappy & fluid)
      const currentIntensity = Math.max(1, Math.min(10, intensityRef.current || 5));
      const lerpFactor = 0.60 - (currentIntensity / 10) * 0.44;

      currentTarget.scrollTop = current + diff * lerpFactor;
      animId = requestAnimationFrame(smoothStep);
    };

    const handleWheel = (e: WheelEvent) => {
      // Don't interfere if user is using pinch-zoom or horizontal trackpad gestures
      if (e.ctrlKey || Math.abs(e.deltaY) < 1) return;

      const targetEl = getScrollParent(e.target as HTMLElement);
      if (!targetEl) return;

      const canScrollDown = e.deltaY > 0 && targetEl.scrollTop + targetEl.clientHeight < targetEl.scrollHeight - 1;
      const canScrollUp = e.deltaY < 0 && targetEl.scrollTop > 1;

      if (!canScrollDown && !canScrollUp) return;

      e.preventDefault();

      if (currentTarget !== targetEl) {
        currentTarget = targetEl;
        targetScrollTop = targetEl.scrollTop;
      }

      const maxScroll = targetEl.scrollHeight - targetEl.clientHeight;
      targetScrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop + e.deltaY));

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
