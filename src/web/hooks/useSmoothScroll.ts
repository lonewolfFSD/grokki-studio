import { useEffect } from 'react';
import Lenis from 'lenis';

export function useSmoothScroll(enabled: boolean = true, intensity: number = 5, activeTab?: string) {
  useEffect(() => {
    if (!enabled) return;

    // Small delay to ensure the DOM element is mounted when switching tabs
    const timer = setTimeout(() => {
      const scrollId = activeTab === 'chat' ? 'grokki-chat-scroll' : 'grokki-main-scroll';
      const wrapper = document.getElementById(scrollId);
      if (!wrapper) return;

      const content =
        activeTab === 'chat'
          ? ((wrapper.firstElementChild as HTMLElement) || wrapper)
          : (document.getElementById('grokki-tab-content') || wrapper);

      // Exact portfolio Lenis configuration & exponential easing:
      // duration ~1.0s to 1.3s based on intensity slider (default 5 = 1.1s)
      const speed = Math.max(1, Math.min(10, intensity || 5));
      const duration = 0.8 + (speed / 10) * 0.6;
      const wheelMultiplier = 0.9 + (speed / 10) * 0.4;

      const lenis = new Lenis({
        wrapper,
        content,
        duration,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier,
        touchMultiplier: 1.5,
        infinite: false,
        autoResize: true,
      });

      (window as any).__lenis = lenis;

      let lastScrollHeight = wrapper.scrollHeight;
      let lastClientHeight = wrapper.clientHeight;

      let rafId: number;
      function raf(time: number) {
        const currentScrollHeight = wrapper.scrollHeight;
        const currentClientHeight = wrapper.clientHeight;
        if (currentScrollHeight !== lastScrollHeight || currentClientHeight !== lastClientHeight) {
          lastScrollHeight = currentScrollHeight;
          lastClientHeight = currentClientHeight;
          lenis.resize();
        }
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);

      const handleResize = () => {
        lenis.resize();
      };

      const ro = new ResizeObserver(handleResize);
      ro.observe(wrapper);
      if (content && content !== wrapper) {
        ro.observe(content);
      }

      const mo = new MutationObserver(handleResize);
      mo.observe(wrapper, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });

      window.addEventListener('resize', handleResize);

      (wrapper as any).__cleanupLenis = () => {
        cancelAnimationFrame(rafId);
        ro.disconnect();
        mo.disconnect();
        window.removeEventListener('resize', handleResize);
        lenis.destroy();
        delete (window as any).__lenis;
      };
    }, 40);

    return () => {
      clearTimeout(timer);
      const scrollId = activeTab === 'chat' ? 'grokki-chat-scroll' : 'grokki-main-scroll';
      const wrapper = document.getElementById(scrollId);
      if (wrapper && (wrapper as any).__cleanupLenis) {
        (wrapper as any).__cleanupLenis();
        delete (wrapper as any).__cleanupLenis;
      }
      if ((window as any).__lenis) {
        (window as any).__lenis.destroy();
        delete (window as any).__lenis;
      }
    };
  }, [enabled, intensity, activeTab]);
}
