import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAiContext } from '../../contexts/AiContext';
import { translateApiError } from '../../utils/errorTranslator';

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

const INITIAL_ASSISTANT_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm your MiniApps Copilot. I can help you schedule jobs, log hours, record materials, look up client details, or summarize your dashboard. What would you like to do?",
  timestamp: new Date().toISOString()
};

export const useAi = () => {
  const queryClient = useQueryClient();
  const { screenContext } = useAiContext();

  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('miniapps_ai_model') || 'gemini-2.5-flash';
  });

  const handleSetModel = useCallback((modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('miniapps_ai_model', modelId);
  }, []);

  // Compute active session key based on current screen and entity ID
  const sessionKey = screenContext?.entityId
    ? `${screenContext.screen}:${screenContext.entityId}`
    : (screenContext?.screen || 'global');

  // Conversations stored per screen / entity context
  const [conversations, setConversations] = useState({
    global: [INITIAL_ASSISTANT_MESSAGE]
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const messages = conversations[sessionKey] || [
    {
      ...INITIAL_ASSISTANT_MESSAGE,
      content: screenContext?.screen === 'JobDetails'
        ? `Hello! I'm focused on ${screenContext.summary?.title || 'this job'}. You can ask me to log hours, record materials, or update status.`
        : screenContext?.screen === 'ClientDetails'
        ? `Hello! I'm focused on client ${screenContext.summary?.name || 'details'}. You can ask me to view their jobs or schedule new work.`
        : INITIAL_ASSISTANT_MESSAGE.content
    }
  ];

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
            queryClient.invalidateQueries({ queryKey: ['clients', entityId] });
          }
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'invoices':
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        default:
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;
      }
    }
  }, [queryClient]);

  const sendMessage = useCallback(async (content) => {
    if (!content || !content.trim() || isLoading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    const currentHistory = conversations[sessionKey] || [INITIAL_ASSISTANT_MESSAGE];
    const updatedHistory = [...currentHistory, userMsg];

    setConversations(prev => ({
      ...prev,
      [sessionKey]: updatedHistory
    }));

    setIsLoading(true);
    setError(null);

    try {
      // Format messages for backend API
      const apiMessages = updatedHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await apiClient.post('/api/ai/chat', {
        messages: apiMessages,
        screenContext: screenContext || null,
        model: selectedModel
      });

      const replyText = response?.reply || "I've completed that request.";
      const mutations = response?.triggered_mutations || [];

      // Trigger instant UI cache re-rendering
      handleTriggeredMutations(mutations);

      const assistantMsg = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toISOString(),
        mutations
      };

      setConversations(prev => ({
        ...prev,
        [sessionKey]: [...(prev[sessionKey] || updatedHistory), assistantMsg]
      }));
    } catch (err) {
      const errorMessage = translateApiError(err);
      setError(errorMessage);
      setConversations(prev => ({
        ...prev,
        [sessionKey]: [
          ...(prev[sessionKey] || updatedHistory),
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: errorMessage,
            isError: true,
            timestamp: new Date().toISOString()
          }
        ]
      }));
    } finally {
      setIsLoading(false);
    }
  }, [conversations, sessionKey, isLoading, screenContext, selectedModel, handleTriggeredMutations]);

  const clearChat = useCallback(() => {
    setConversations(prev => ({
      ...prev,
      [sessionKey]: [INITIAL_ASSISTANT_MESSAGE]
    }));
    setError(null);
  }, [sessionKey]);

  return {
    messages,
    isLoading,
    error,
    selectedModel,
    setSelectedModel: handleSetModel,
    availableModels: AVAILABLE_MODELS,
    sendMessage,
    clearChat
  };
};
