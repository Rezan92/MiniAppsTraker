import { useAiContext, AVAILABLE_MODELS, INITIAL_ASSISTANT_MESSAGE } from '../../contexts/AiContext';

export { AVAILABLE_MODELS, INITIAL_ASSISTANT_MESSAGE };

/**
 * Domain Hook for AI Copilot
 * Consumes the persistent in-session conversation thread from AiContext.
 * The conversation follows the user across all screens and route changes without wiping.
 */
export const useAi = () => {
  const context = useAiContext();

  return {
    messages: context.messages,
    isLoading: context.isLoading,
    error: context.error,
    selectedModel: context.selectedModel,
    setSelectedModel: context.setSelectedModel,
    activeFocus: context.activeFocus,
    availableModels: context.availableModels,
    sendMessage: context.sendMessage,
    confirmPendingAction: context.confirmPendingAction,
    clearChat: context.clearChat
  };
};
