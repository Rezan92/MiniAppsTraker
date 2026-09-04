import React, { useState, useRef, useEffect } from 'react';
import { useAiContext } from '../../contexts/AiContext';
import { useAi } from '../../hooks/api/useAi';
import { ChatMessage } from './ChatMessage';
import { SuggestionChips } from './SuggestionChips';

export const AiCopilotWidget = () => {
  const { isOpen, toggleDrawer, closeDrawer, screenContext } = useAiContext();
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearChat, 
    selectedModel, 
    setSelectedModel, 
    availableModels 
  } = useAi();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Escape key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDrawer]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const getScreenFocusLabel = (sc) => {
    if (!sc?.screen) return 'Global Workspace Mode';
    const { screen, summary, entityId } = sc;
    switch (screen) {
      case 'JobDetails':
        return `Focus: Job ${summary?.title ? `"${summary.title}"` : `#${entityId?.slice(0, 8)}`}`;
      case 'ClientDetails':
        return `Focus: Client ${summary?.name ? `"${summary.name}"` : `#${entityId?.slice(0, 8)}`}`;
      case 'InvoiceDetails':
        return `Focus: Invoice #${summary?.invoiceNumber || entityId?.slice(0, 8)}`;
      case 'InvoiceBuilder':
        return 'Focus: Invoice Builder';
      case 'JobList':
        return `Focus: Jobs (${summary?.totalJobs ?? 0})`;
      case 'ClientList':
        return `Focus: Clients (${summary?.totalClients ?? 0})`;
      case 'InvoiceList':
        return `Focus: Invoices (${summary?.totalInvoices ?? 0})`;
      case 'Dashboard':
        return 'Focus: Dashboard';
      default:
        return `Focus: ${screen}`;
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          onClick={toggleDrawer}
          aria-label="Open AI Copilot"
          className="fixed bottom-6 right-6 z-40 bg-black text-white p-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 flex items-center gap-2.5 border border-primary/40 cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-black">
            <span className="material-symbols-outlined text-[16px]">smart_toy</span>
          </div>
          <span className="font-bold text-sm text-white pr-1 group-hover:text-primary transition-colors">
            Copilot
          </span>
          {screenContext?.screen && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title={`Focusing on ${screenContext.screen}`}></span>
          )}
        </button>
      )}

      {/* Backdrop for Mobile Screen Dismissal */}
      {isOpen && (
        <div
          onClick={closeDrawer}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs sm:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Slide-out Copilot Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white border-l border-gray-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-900 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary text-black flex items-center justify-center shadow-xs shrink-0">
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm tracking-tight text-white shrink-0">MiniApps Copilot</h2>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    aria-label="Select Gemini Model"
                    className="text-[10px] bg-gray-800 text-primary border border-primary/40 rounded px-1.5 py-0.5 font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-gray-700 transition-colors"
                  >
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id} className="bg-gray-900 text-white font-normal">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 min-w-0">
                  {screenContext?.screen ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                      <span className="text-emerald-300 font-medium truncate" title={getScreenFocusLabel(screenContext)}>
                        {getScreenFocusLabel(screenContext)}
                      </span>
                    </>
                  ) : (
                    <span>🌐 Global Workspace Mode</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Clear conversation"
                className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
              </button>
              <button
                onClick={closeDrawer}
                title="Close Copilot"
                className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/60">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-black text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                </div>
                <div className="bg-white rounded-2xl rounded-bl-xs px-4 py-3 border border-gray-200 flex items-center gap-2 text-gray-500 text-xs shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1 font-medium text-gray-600">Executing action...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Contextual Suggestion Chips */}
          <div className="px-3 pt-2 bg-white border-t border-gray-100">
            <SuggestionChips
              screenContext={screenContext}
              onSelectPrompt={(prompt) => sendMessage(prompt)}
            />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-3 py-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={
                  screenContext?.screen === 'JobDetails'
                    ? "Ask about this job or log hours/materials..."
                    : "Ask Copilot to schedule, search, or summarize..."
                }
                disabled={isLoading}
                className="flex-1 bg-transparent border-none text-sm text-gray-800 focus:outline-none placeholder-gray-400 py-1"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-1.5 bg-primary text-black rounded-lg hover:bg-opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
            <div className="text-[10px] text-gray-400 text-center mt-1.5">
              AI operations automatically update your screen in real time.
            </div>
          </form>

        </div>
      )}
    </>
  );
};
