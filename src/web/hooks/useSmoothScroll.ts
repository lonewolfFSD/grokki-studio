import { useEffect } from 'react';

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

export function useSmoothScroll(enabled: boolean = true) {
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

      currentTarget.scrollTop = current + diff * 0.18;
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
