import { useState, useEffect } from 'react';

/**
 * Custom hook to evaluate CSS media queries in React.
 * Supports modern addEventListener and legacy addListener fallbacks.
 *
 * @param {string} query - Media query string, e.g. '(max-width: 767px)'
 * @returns {boolean} Whether the media query currently matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);
    const updateMatch = (e) => setMatches(e.matches);

    // Initial check
    setMatches(mediaQueryList.matches);

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', updateMatch);
      return () => mediaQueryList.removeEventListener('change', updateMatch);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(updateMatch);
      return () => mediaQueryList.removeListener(updateMatch);
    }
  }, [query]);

  return matches;
}

/**
 * Convenient hook to determine if viewport is mobile (< breakpoint, default 768px).
 *
 * @param {number} [breakpoint=768]
 * @returns {boolean}
 */
export function useIsMobile(breakpoint = 768) {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}

/**
 * Convenient hook to detect if primary input mechanism is touch (coarse pointer).
 *
 * @returns {boolean}
 */
export function useIsTouchDevice() {
  return useMediaQuery('(pointer: coarse)');
}

/**
 * Convenient hook to detect user preference for reduced motion.
 *
 * @returns {boolean}
 */
export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
