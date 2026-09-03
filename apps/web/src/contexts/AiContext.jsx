import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AiContext = createContext(null);

export const AiContextProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [screenContext, setScreenContextState] = useState(null);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen(prev => !prev), []);

  // Avoid redundant state updates and infinite re-render loops
  const setScreenContext = useCallback((contextEnvelope) => {
    setScreenContextState(prev => {
      if (!contextEnvelope && !prev) return prev;
      if (JSON.stringify(prev) === JSON.stringify(contextEnvelope)) {
        return prev;
      }
      return contextEnvelope;
    });
  }, []);

  const clearScreenContext = useCallback(() => {
    setScreenContextState(prev => (prev === null ? prev : null));
  }, []);

  return (
    <AiContext.Provider value={{
      isOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      screenContext,
      setScreenContext,
      clearScreenContext
    }}>
      {children}
    </AiContext.Provider>
  );
};

export const useAiContext = () => {
  const context = useContext(AiContext);
  if (!context) {
    throw new Error('useAiContext must be used within an AiContextProvider');
  }
  return context;
};

/**
 * Hook to register screen context automatically on mount and clean up on unmount.
 * @param {Object} envelope - { screen: string, entityId?: string, summary?: object }
 * @param {Array} deps - Dependency array to trigger updates
 */
export const useScreenContext = (envelope, deps = []) => {
  const { setScreenContext, clearScreenContext } = useAiContext();

  // Update context when envelope or deps change
  useEffect(() => {
    if (envelope && envelope.screen) {
      setScreenContext(envelope);
    }
  }, deps);

  // Clear context ONLY when the screen unmounts
  useEffect(() => {
    return () => clearScreenContext();
  }, []);
};
