import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAiContext } from '../../contexts/AiContext';
import { translateApiError } from '../../utils/errorTranslator';

const INITIAL_ASSISTANT_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: "Hello! I'm your MiniApps Copilot. I can help you schedule jobs, log hours, record materials, look up client details, or summarize your dashboard. What would you like to do?",
  timestamp: new Date().toISOString()
};

export const useAi = () => {
  const queryClient = useQueryClient();
  const { screenContext } = useAiContext();

  const [messages, setMessages] = useState([INITIAL_ASSISTANT_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
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
        screenContext: screenContext || null
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
  }, [messages, isLoading, screenContext, handleTriggeredMutations]);

  const clearChat = useCallback(() => {
    setMessages([INITIAL_ASSISTANT_MESSAGE]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat
  };
};
