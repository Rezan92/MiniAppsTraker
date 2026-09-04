import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { translateApiError } from '../utils/errorTranslator';

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' }
];

export const INITIAL_ASSISTANT_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm your MiniApps Copilot. I can help you schedule jobs, log hours, record materials, look up client details, or summarize your dashboard. What would you like to do?",
  timestamp: new Date().toISOString()
};

const AiContext = createContext(null);

export const AiContextProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [screenContext, setScreenContextState] = useState(null);

  // Single in-session thread: follows user across routes without wiping
  const [messages, setMessages] = useState([INITIAL_ASSISTANT_MESSAGE]);
  const [activeFocus, setActiveFocus] = useState(null);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('miniapps_ai_model') || 'gemini-2.5-flash';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Ref to always access latest screenContext in async callbacks
  const screenContextRef = useRef(screenContext);
  useEffect(() => {
    screenContextRef.current = screenContext;
  }, [screenContext]);

  const activeFocusRef = useRef(activeFocus);
  useEffect(() => {
    activeFocusRef.current = activeFocus;
  }, [activeFocus]);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen(prev => !prev), []);

  const handleSetModel = useCallback((modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('miniapps_ai_model', modelId);
  }, []);

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

  // Targeted cleanup: only clear if the unmounting screen matches the active context
  const clearScreenContext = useCallback((screenName) => {
    setScreenContextState(prev => {
      if (!screenName || prev?.screen === screenName) {
        return null;
      }
      return prev;
    });
  }, []);

  // Invalidate relevant React Query caches based on backend mutations
  const handleTriggeredMutations = useCallback((mutations = []) => {
    if (!Array.isArray(mutations) || mutations.length === 0) return;

    for (const mut of mutations) {
      const { type, entityId } = mut;
      switch (type) {
        case 'hours':
        case 'materials':
          if (entityId) {
            queryClient.invalidateQueries({ queryKey: ['hours', 'job', entityId] });
            queryClient.invalidateQueries({ queryKey: ['materials', 'job', entityId] });
            queryClient.invalidateQueries({ queryKey: ['job', entityId] });
          }
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'jobs':
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          if (entityId) {
            queryClient.invalidateQueries({ queryKey: ['job', entityId] });
          }
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'clients':
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          if (entityId) {
            queryClient.invalidateQueries({ queryKey: ['client', entityId] });
          }
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'invoices':
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          if (entityId) {
            queryClient.invalidateQueries({ queryKey: ['invoice', entityId] });
            queryClient.invalidateQueries({ queryKey: ['invoice-logs', entityId] });
          }
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        default:
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;
      }
    }
  }, [queryClient]);

  // Send message using current active screenContext and activeFocus
  const sendMessage = useCallback(async (content) => {
    if (!content || !content.trim()) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setIsLoading(true);
    setError(null);

    try {
      const apiMessages = updatedHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const currentScreen = screenContextRef.current;
      const currentFocus = activeFocusRef.current;

      const response = await apiClient.post('/api/ai/chat', {
        messages: apiMessages,
        screenContext: currentScreen || null,
        activeFocus: currentFocus || null,
        model: selectedModel
      });

      const replyText = response?.reply || "I've completed that request.";
      const mutations = response?.triggered_mutations || [];
      const confirmationData = response?.confirmationData || null;
      const invoiceData = response?.invoiceData || null;

      if (response?.activeFocus) {
        setActiveFocus(response.activeFocus);
      }

      handleTriggeredMutations(mutations);

      const assistantMsg = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toISOString(),
        mutations,
        confirmationData,
        invoiceData
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMessage = translateApiError(err);
      setError(errorMessage);
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: errorMessage,
          isError: true,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedModel, handleTriggeredMutations]);

  const confirmPendingAction = useCallback(async (actionId, confirmed) => {
    try {
      const response = await apiClient.post('/api/ai/confirm-action', { actionId, confirmed });
      if (response?.triggered_mutations) {
        handleTriggeredMutations(response.triggered_mutations);
      }
      return response;
    } catch (err) {
      throw err;
    }
  }, [handleTriggeredMutations]);

  const clearChat = useCallback(() => {
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
    setActiveFocus(null);
    setError(null);
  }, []);

  return (
    <AiContext.Provider value={{
      isOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      screenContext,
      setScreenContext,
      clearScreenContext,
      messages,
      isLoading,
      error,
      selectedModel,
      setSelectedModel: handleSetModel,
      activeFocus,
      availableModels: AVAILABLE_MODELS,
      sendMessage,
      confirmPendingAction,
      clearChat
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

  // Clear context ONLY when the screen unmounts, targeted to its own screen name
  useEffect(() => {
    return () => {
      if (envelope?.screen) {
        clearScreenContext(envelope.screen);
      }
    };
  }, [envelope?.screen]);
};
