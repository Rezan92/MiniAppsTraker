import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'miniapps_copilot_window_state';
const STORAGE_CIRCLE_KEY = 'miniapps_copilot_circle_pos';

const DEFAULT_WIDTH = 440;
const DEFAULT_HEIGHT = 620;
const MIN_WIDTH = 340;
const MIN_HEIGHT = 380;
const CIRCLE_SIZE = 56;

/**
 * Custom hook providing draggable, resizable, collapsible, and maximizable window state
 * with viewport boundary clamping, floating circle state, and localStorage persistence.
 */
export function useDraggableResizableWindow({ onExpand } = {}) {
  const onExpandRef = useRef(onExpand);
  useEffect(() => {
    onExpandRef.current = onExpand;
  }, [onExpand]);

  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });

  const getDefaultPosition = useCallback((w = DEFAULT_WIDTH, h = DEFAULT_HEIGHT) => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    const x = Math.max(16, window.innerWidth - w - 24);
    const y = Math.max(16, window.innerHeight - h - 24);
    return { x, y };
  }, []);

  const getDefaultCirclePosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    const x = Math.max(16, window.innerWidth - CIRCLE_SIZE - 24);
    const y = Math.max(16, window.innerHeight - CIRCLE_SIZE - 24);
    return { x, y };
  }, []);

  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const w = typeof parsed.width === 'number' ? parsed.width : DEFAULT_WIDTH;
          const h = typeof parsed.height === 'number' ? parsed.height : DEFAULT_HEIGHT;
          const maxX = Math.max(16, window.innerWidth - w - 16);
          const maxY = Math.max(16, window.innerHeight - h - 16);
          const clampedX = Math.max(16, Math.min(maxX, parsed.x));
          const clampedY = Math.max(16, Math.min(maxY, parsed.y));
          return { x: clampedX, y: clampedY };
        }
      }
    } catch {}
    return getDefaultPosition();
  });

  const [circlePosition, setCirclePosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    try {
      const saved = localStorage.getItem(STORAGE_CIRCLE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const maxX = Math.max(16, window.innerWidth - CIRCLE_SIZE - 16);
          const maxY = Math.max(16, window.innerHeight - CIRCLE_SIZE - 16);
          const clampedX = Math.max(16, Math.min(maxX, parsed.x));
          const clampedY = Math.max(16, Math.min(maxY, parsed.y));
          return { x: clampedX, y: clampedY };
        }
      }
    } catch {}
    return getDefaultCirclePosition();
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
    } catch {}
    const maxAllowedHeight = typeof window !== 'undefined' ? Math.min(DEFAULT_HEIGHT, window.innerHeight - 60) : DEFAULT_HEIGHT;
    return { width: DEFAULT_WIDTH, height: Math.max(MIN_HEIGHT, maxAllowedHeight) };
  });

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.isCollapsed === 'boolean') {
          return parsed.isCollapsed;
        }
      }
    } catch {}
    return true; // Default to collapsed circle state
  });

  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDraggingCircle, setIsDraggingCircle] = useState(false);

  const preMaxStateRef = useRef({ position, size });
  const dragStateRef = useRef(null);
  const resizeStateRef = useRef(null);
  const circleDragRef = useRef(null);
  const circleMovedRef = useRef(false);

  // Persist window state to localStorage
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
    } catch {}
  }, []);

  const persistCirclePos = useCallback((cPos) => {
    try {
      localStorage.setItem(STORAGE_CIRCLE_KEY, JSON.stringify(cPos));
    } catch {}
  }, []);

  // Viewport resize handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      setCirclePosition(prev => {
        const maxX = Math.max(16, window.innerWidth - CIRCLE_SIZE - 16);
        const maxY = Math.max(16, window.innerHeight - CIRCLE_SIZE - 16);
        return {
          x: Math.max(16, Math.min(maxX, prev.x)),
          y: Math.max(16, Math.min(maxY, prev.y))
        };
      });

      if (!mobile) {
        setPosition(prev => {
          const maxX = Math.max(16, window.innerWidth - size.width - 16);
          const maxY = Math.max(16, window.innerHeight - size.height - 16);
          return {
            x: Math.max(16, Math.min(maxX, prev.x)),
            y: Math.max(16, Math.min(maxY, prev.y))
          };
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  // --- Expand / Collapse Actions ---
  const expandToWindow = useCallback(() => {
    if (isMaximized) setIsMaximized(false);

    if (!isMobile) {
      setPosition(prev => {
        const w = size.width;
        const h = size.height;
        const maxX = Math.max(16, window.innerWidth - w - 16);
        const maxY = Math.max(16, window.innerHeight - h - 16);

        let targetX = prev.x;
        let targetY = prev.y;

        // If circle was dragged to a new location, anchor window near circle
        if (circleMovedRef.current) {
          if (circlePosition.x > window.innerWidth / 2) {
            targetX = circlePosition.x + CIRCLE_SIZE - w;
          } else {
            targetX = circlePosition.x;
          }

          if (circlePosition.y > window.innerHeight / 2) {
            targetY = circlePosition.y + CIRCLE_SIZE - h;
          } else {
            targetY = circlePosition.y;
          }
          circleMovedRef.current = false;
        }

        targetX = Math.max(16, Math.min(maxX, targetX));
        targetY = Math.max(16, Math.min(maxY, targetY));

        const newPos = { x: targetX, y: targetY };
        persistState(newPos, size, false);
        return newPos;
      });
    } else {
      persistState(position, size, false);
    }

    setIsCollapsed(false);
  }, [isMaximized, isMobile, size, circlePosition, position, persistState]);

  const collapseToCircle = useCallback((clickPoint) => {
    if (isMaximized) setIsMaximized(false);
    circleMovedRef.current = false;

    if (!isMobile) {
      setCirclePosition(prev => {
        let cx;
        let cy;
        const maxCX = Math.max(16, window.innerWidth - CIRCLE_SIZE - 16);
        const maxCY = Math.max(16, window.innerHeight - CIRCLE_SIZE - 16);

        if (clickPoint && typeof clickPoint.x === 'number' && typeof clickPoint.y === 'number') {
          // Center circle directly where the user clicked to close
          cx = Math.max(16, Math.min(maxCX, clickPoint.x - CIRCLE_SIZE / 2));
          cy = Math.max(16, Math.min(maxCY, clickPoint.y - CIRCLE_SIZE / 2));
        } else {
          // Default: header top-right corner where close button resides
          cx = Math.max(16, Math.min(maxCX, position.x + size.width - CIRCLE_SIZE));
          cy = Math.max(16, Math.min(maxCY, position.y));
        }

        const newCirclePos = { x: cx, y: cy };
        persistCirclePos(newCirclePos);
        return newCirclePos;
      });
    }

    setIsCollapsed(true);
    persistState(position, size, true);
  }, [isMaximized, isMobile, position, size, persistState, persistCirclePos]);

  const toggleCollapse = useCallback(() => {
    if (isCollapsed) {
      expandToWindow();
    } else {
      collapseToCircle();
    }
  }, [isCollapsed, expandToWindow, collapseToCircle]);

  // --- Circle Drag Handling ---
  const handleCirclePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    circleDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: circlePosition.x,
      initialY: circlePosition.y,
      hasMoved: false
    };
  }, [circlePosition]);

  const handleCirclePointerMove = useCallback((e) => {
    if (!circleDragRef.current || circleDragRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - circleDragRef.current.startX;
    const dy = e.clientY - circleDragRef.current.startY;

    if (!circleDragRef.current.hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      circleDragRef.current.hasMoved = true;
      circleMovedRef.current = true;
      setIsDraggingCircle(true);
    }

    if (circleDragRef.current.hasMoved) {
      const maxX = Math.max(16, window.innerWidth - CIRCLE_SIZE - 16);
      const maxY = Math.max(16, window.innerHeight - CIRCLE_SIZE - 16);
      const newX = Math.max(16, Math.min(maxX, circleDragRef.current.initialX + dx));
      const newY = Math.max(16, Math.min(maxY, circleDragRef.current.initialY + dy));
      setCirclePosition({ x: newX, y: newY });
    }
  }, []);

  const handleCirclePointerUp = useCallback((e) => {
    if (!circleDragRef.current || circleDragRef.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const moved = circleDragRef.current.hasMoved;
    circleDragRef.current = null;
    setIsDraggingCircle(false);

    if (!moved) {
      // Tap / Click -> Expand to full window
      if (onExpandRef.current) {
        onExpandRef.current();
      } else {
        expandToWindow();
      }
    } else {
      // Drag release -> save circle position
      setCirclePosition(pos => {
        persistCirclePos(pos);
        return pos;
      });
    }
  }, [expandToWindow, persistCirclePos]);

  // --- Window Drag Handling ---
  const handleDragStart = useCallback((e) => {
    if (isMobile || isMaximized || e.button !== 0) return;
    if (e.target.closest('button, select, input, textarea, a, [data-no-drag]')) {
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

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

    const maxX = Math.max(0, window.innerWidth - size.width);
    const maxY = Math.max(0, window.innerHeight - size.height);

    const newX = Math.max(0, Math.min(maxX, dragStateRef.current.windowX + dx));
    const newY = Math.max(0, Math.min(maxY, dragStateRef.current.windowY + dy));

    setPosition({ x: newX, y: newY });
  }, [size]);

  const handleDragEnd = useCallback((e) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== e.pointerId) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

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
    } catch {}

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

    if (direction.includes('w')) {
      const rawW = width - dx;
      newWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, rawW));
      const actualDx = width - newWidth;
      newX = Math.max(0, windowX + actualDx);
    } else if (direction.includes('e')) {
      const rawW = width + dx;
      newWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, rawW));
    }

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
    } catch {}

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
    if (!isDragging && !isResizing && !isDraggingCircle) return;

    const onPointerMove = (e) => {
      if (isDraggingCircle) {
        handleCirclePointerMove(e);
      } else if (isDragging) {
        handleDragMove(e);
      } else if (isResizing) {
        handleResizeMove(e);
      }
    };

    const onPointerUp = (e) => {
      if (isDraggingCircle) {
        handleCirclePointerUp(e);
      } else if (isDragging) {
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
  }, [
    isDragging,
    isResizing,
    isDraggingCircle,
    handleCirclePointerMove,
    handleCirclePointerUp,
    handleDragMove,
    handleResizeMove,
    handleDragEnd,
    handleResizeEnd
  ]);

  const toggleMaximize = useCallback(() => {
    if (isCollapsed) setIsCollapsed(false);

    if (isMaximized) {
      setPosition(preMaxStateRef.current.position);
      setSize(preMaxStateRef.current.size);
      setIsMaximized(false);
    } else {
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
    const defaultCirclePos = getDefaultCirclePosition();
    setPosition(defaultPos);
    setSize(defaultSz);
    setCirclePosition(defaultCirclePos);
    setIsCollapsed(false);
    setIsMaximized(false);
    persistState(defaultPos, defaultSz, false);
    persistCirclePos(defaultCirclePos);
  }, [getDefaultPosition, getDefaultCirclePosition, persistState, persistCirclePos]);

  return {
    isMobile,
    position,
    size,
    isCollapsed,
    isMaximized,
    isDragging,
    isResizing,
    circlePosition,
    isDraggingCircle,
    handleCirclePointerDown,
    handleCirclePointerMove,
    handleCirclePointerUp,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    toggleCollapse,
    collapseToCircle,
    expandToWindow,
    toggleMaximize,
    resetPosition
  };
}
