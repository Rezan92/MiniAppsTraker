import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'miniapps_copilot_window_state';

const DEFAULT_WIDTH = 440;
const DEFAULT_HEIGHT = 620;
const MIN_WIDTH = 340;
const MIN_HEIGHT = 380;
const COLLAPSED_HEIGHT = 54;

/**
 * Custom hook providing draggable, resizable, collapsible, and maximizable window state
 * with viewport boundary clamping and localStorage persistence.
 */
export function useDraggableResizableWindow() {
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 640 : false;
  });

  const getDefaultPosition = useCallback((w = DEFAULT_WIDTH, h = DEFAULT_HEIGHT) => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    const x = Math.max(16, window.innerWidth - w - 24);
    const y = Math.max(16, window.innerHeight - h - 24);
    return { x, y };
  }, []);

  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          // Clamp inside current screen
          const clampedX = Math.max(0, Math.min(window.innerWidth - 100, parsed.x));
          const clampedY = Math.max(0, Math.min(window.innerHeight - 60, parsed.y));
          return { x: clampedX, y: clampedY };
        }
      }
    } catch {
      // Fallback on corrupt JSON
    }
    return getDefaultPosition();
  });

  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined') return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          const w = Math.max(MIN_WIDTH, Math.min(window.innerWidth - 16, parsed.width));
          const h = Math.max(MIN_HEIGHT, Math.min(window.innerHeight - 16, parsed.height));
          return { width: w, height: h };
        }
      }
    } catch {
      // Fallback
    }
    const maxAllowedHeight = typeof window !== 'undefined' ? Math.min(DEFAULT_HEIGHT, window.innerHeight - 60) : DEFAULT_HEIGHT;
    return { width: DEFAULT_WIDTH, height: Math.max(MIN_HEIGHT, maxAllowedHeight) };
  });

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.isCollapsed);
      }
    } catch {
      // Ignore
    }
    return false;
  });

  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Pre-maximized cache to restore when unmaximizing
  const preMaxStateRef = useRef({ position, size });

  const dragStateRef = useRef(null);
  const resizeStateRef = useRef(null);

  // Persist state to localStorage
  const persistState = useCallback((pos, sz, collapsed) => {
    try {
      const toSave = {
        x: pos.x,
        y: pos.y,
        width: sz.width,
        height: sz.height,
        isCollapsed: Boolean(collapsed)
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Ignore localStorage errors (e.g. quota/private mode)
    }
  }, []);

  // Update mobile status and clamp on viewport resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);

      if (!mobile) {
        setPosition(prev => {
          const currentH = isCollapsed ? COLLAPSED_HEIGHT : size.height;
          const maxX = Math.max(0, window.innerWidth - size.width);
          const maxY = Math.max(0, window.innerHeight - currentH);
          return {
            x: Math.max(0, Math.min(maxX, prev.x)),
            y: Math.max(0, Math.min(maxY, prev.y))
          };
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size, isCollapsed]);

  // --- Drag Handling ---
  const handleDragStart = useCallback((e) => {
    if (isMobile || isMaximized || e.button !== 0) return;
    // Don't initiate drag if clicking interactive child elements in header
    if (e.target.closest('button, select, input, textarea, a, [data-no-drag]')) {
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors
    }

    dragStateRef.current = {
      pointerId: e.pointerId,
      pointerX: e.clientX,
      pointerY: e.clientY,
      windowX: position.x,
      windowY: position.y
    };
    setIsDragging(true);
  }, [isMobile, isMaximized, position]);

  const handleDragMove = useCallback((e) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragStateRef.current.pointerX;
    const dy = e.clientY - dragStateRef.current.pointerY;
    const currentH = isCollapsed ? COLLAPSED_HEIGHT : size.height;

    const maxX = Math.max(0, window.innerWidth - size.width);
    const maxY = Math.max(0, window.innerHeight - currentH);

    const newX = Math.max(0, Math.min(maxX, dragStateRef.current.windowX + dx));
    const newY = Math.max(0, Math.min(maxY, dragStateRef.current.windowY + dy));

    setPosition({ x: newX, y: newY });
  }, [isCollapsed, size]);

  const handleDragEnd = useCallback((e) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    dragStateRef.current = null;
    setIsDragging(false);

    setPosition(pos => {
      persistState(pos, size, isCollapsed);
      return pos;
    });
  }, [size, isCollapsed, persistState]);

  // --- Resize Handling ---
  const handleResizeStart = useCallback((direction, e) => {
    if (isMobile || isMaximized || isCollapsed || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    resizeStateRef.current = {
      direction,
      pointerId: e.pointerId,
      pointerX: e.clientX,
      pointerY: e.clientY,
      windowX: position.x,
      windowY: position.y,
      width: size.width,
      height: size.height
    };
    setIsResizing(true);
  }, [isMobile, isMaximized, isCollapsed, position, size]);

  const handleResizeMove = useCallback((e) => {
    if (!resizeStateRef.current || resizeStateRef.current.pointerId !== e.pointerId) return;

    const { direction, pointerX, pointerY, windowX, windowY, width, height } = resizeStateRef.current;
    const dx = e.clientX - pointerX;
    const dy = e.clientY - pointerY;

    let newWidth = width;
    let newHeight = height;
    let newX = windowX;
    let newY = windowY;

    const maxWidth = window.innerWidth - 16;
    const maxHeight = window.innerHeight - 16;

    // Horizontal resizing
    if (direction.includes('w')) {
      const rawW = width - dx;
      newWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, rawW));
      const actualDx = width - newWidth;
      newX = Math.max(0, windowX + actualDx);
    } else if (direction.includes('e')) {
      const rawW = width + dx;
      newWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, rawW));
    }

    // Vertical resizing
    if (direction.includes('n')) {
      const rawH = height - dy;
      newHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, rawH));
      const actualDy = height - newHeight;
      newY = Math.max(0, windowY + actualDy);
    } else if (direction.includes('s')) {
      const rawH = height + dy;
      newHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, rawH));
    }

    setSize({ width: newWidth, height: newHeight });
    setPosition({ x: newX, y: newY });
  }, []);

  const handleResizeEnd = useCallback((e) => {
    if (!resizeStateRef.current || resizeStateRef.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    resizeStateRef.current = null;
    setIsResizing(false);

    setSize(sz => {
      setPosition(pos => {
        persistState(pos, sz, isCollapsed);
        return pos;
      });
      return sz;
    });
  }, [isCollapsed, persistState]);

  // Window-level safety listeners during active dragging or resizing
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const onPointerMove = (e) => {
      if (isDragging) {
        handleDragMove(e);
      } else if (isResizing) {
        handleResizeMove(e);
      }
    };

    const onPointerUp = (e) => {
      if (isDragging) {
        handleDragEnd(e);
      } else if (isResizing) {
        handleResizeEnd(e);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [isDragging, isResizing, handleDragMove, handleResizeMove, handleDragEnd, handleResizeEnd]);

  // --- Window Actions ---
  const toggleCollapse = useCallback(() => {
    if (isMaximized) setIsMaximized(false);
    setIsCollapsed(prev => {
      const next = !prev;
      persistState(position, size, next);
      return next;
    });
  }, [isMaximized, position, size, persistState]);

  const toggleMaximize = useCallback(() => {
    if (isCollapsed) setIsCollapsed(false);

    if (isMaximized) {
      // Restore previous position and size
      setPosition(preMaxStateRef.current.position);
      setSize(preMaxStateRef.current.size);
      setIsMaximized(false);
    } else {
      // Save current state and maximize
      preMaxStateRef.current = { position, size };
      const maxW = Math.max(MIN_WIDTH, window.innerWidth - 32);
      const maxH = Math.max(MIN_HEIGHT, window.innerHeight - 32);
      setPosition({ x: 16, y: 16 });
      setSize({ width: maxW, height: maxH });
      setIsMaximized(true);
    }
  }, [isCollapsed, isMaximized, position, size]);

  const resetPosition = useCallback(() => {
    const defaultPos = getDefaultPosition(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    const defaultSz = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    setPosition(defaultPos);
    setSize(defaultSz);
    setIsCollapsed(false);
    setIsMaximized(false);
    persistState(defaultPos, defaultSz, false);
  }, [getDefaultPosition, persistState]);

  return {
    isMobile,
    position,
    size,
    isCollapsed,
    isMaximized,
    isDragging,
    isResizing,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    toggleCollapse,
    toggleMaximize,
    resetPosition
  };
}
