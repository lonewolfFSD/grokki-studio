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
    let lastWheelTime = 0;
    let momentumFactor = 1;

    const smoothStep = () => {
      if (!currentTarget) {
        animId = null;
        return;
      }

      const current = currentTarget.scrollTop;
      const diff = targetScrollTop - current;

      // Settle immediately when close
      if (Math.abs(diff) < 1.5) {
        currentTarget.scrollTop = targetScrollTop;
        animId = null;
        currentTarget = null;
        momentumFactor = 1;
        return;
      }

      // Fast, instantaneous response: Level 1 = 0.92 (instant snap), Level 5 = 0.85, Level 10 = 0.70
      const currentIntensity = Math.max(1, Math.min(10, intensityRef.current || 5));
      const lerpFactor = 0.95 - (currentIntensity / 10) * 0.25;

      currentTarget.scrollTop = current + diff * lerpFactor;
      animId = requestAnimationFrame(smoothStep);
    };

    const handleWheel = (e: WheelEvent) => {
      // Don't interfere if user is pinch-zooming, horizontal scrolling, or using a precision trackpad (fractional delta)
      if (e.ctrlKey || Math.abs(e.deltaY) < 1) return;
      if (e.deltaMode === 0 && e.deltaY % 1 !== 0) return; // Native trackpad gesture

      const targetEl = getScrollParent(e.target as HTMLElement);
      if (!targetEl) return;

      const canScrollDown = e.deltaY > 0 && targetEl.scrollTop + targetEl.clientHeight < targetEl.scrollHeight - 1;
      const canScrollUp = e.deltaY < 0 && targetEl.scrollTop > 1;

      if (!canScrollDown && !canScrollUp) return;

      const now = performance.now();
      const timeSinceLast = now - lastWheelTime;
      lastWheelTime = now;

      // Wheel flick acceleration: if user spins the wheel rapidly (<110ms between clicks), accelerate speed
      if (timeSinceLast < 110) {
        momentumFactor = Math.min(2.8, momentumFactor + 0.35);
      } else {
        momentumFactor = 1;
      }

      // Generous, fast scroll distance (180px–240px base per notch)
      let baseDelta = e.deltaY;
      if (e.deltaMode === 1) {
        // Line mode: Windows notched wheel (deltaY = 3 lines) -> 3 * 60 = 180px base
        baseDelta = e.deltaY * 60;
      } else if (e.deltaMode === 2) {
        // Page mode
        baseDelta = e.deltaY * targetEl.clientHeight;
      } else {
        // Pixel mode
        baseDelta = Math.sign(baseDelta) * Math.max(140, Math.abs(baseDelta) * 1.8);
      }

      // Scale by intensity setting (higher level = faster & further)
      const currentIntensity = Math.max(1, Math.min(10, intensityRef.current || 5));
      const speedMultiplier = 0.85 + (currentIntensity / 10) * 0.7; // 0.92x at 1 to 1.55x at 10
      const finalDelta = baseDelta * momentumFactor * speedMultiplier;

      e.preventDefault();

      if (currentTarget !== targetEl) {
        currentTarget = targetEl;
        targetScrollTop = targetEl.scrollTop;
      }

      const maxScroll = targetEl.scrollHeight - targetEl.clientHeight;
      targetScrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop + finalDelta));

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
