import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAiContext } from '../../contexts/AiContext';
import { useAi } from '../../hooks/api/useAi';
import { useDraggableResizableWindow } from '../../hooks/ui/useDraggableResizableWindow';
import { ChatMessage } from './ChatMessage';
import { SuggestionChips } from './SuggestionChips';
import { CameraCaptureModal } from './CameraCaptureModal';
import { compressImage } from '../../utils/imageCompressor';

export const AiCopilotWidget = () => {
  const { isOpen, toggleDrawer, closeDrawer, screenContext } = useAiContext();
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    uploadReceipt,
    clearChat, 
    selectedModel, 
    setSelectedModel, 
    availableModels,
    selectedTier,
    setSelectedTier,
    aiConfig
  } = useAi();

  const {
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
    toggleCollapse,
    toggleMaximize,
    resetPosition
  } = useDraggableResizableWindow();

  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  const processAndStageImage = async (file) => {
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WebP, HEIC).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('Image file exceeds 15MB limit. Please choose a smaller photo.');
      return;
    }

    try {
      const compressed = await compressImage(file, 1920, 0.85);
      setAttachedImage(compressed);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      console.error('Failed to compress image:', err);
      alert('Failed to process image file. Please try another image.');
    }
  };

  const handleCameraClick = () => {
    if (isMobile) {
      nativeCameraInputRef.current?.click();
    } else {
      setIsCameraOpen(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processAndStageImage(file);
    }
  };

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen && !isCollapsed) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen, isCollapsed]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isCollapsed) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isCollapsed]);

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
    if ((!input.trim() && !attachedImage) || isLoading) return;
    sendMessage(input, attachedImage);
    setInput('');
    setAttachedImage(null);
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

  if (typeof document === 'undefined') return null;

  return createPortal(
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
          {selectedTier === 'paid' && (
            <span className="text-[10px] bg-amber-400 text-black font-extrabold px-1.5 py-0.5 rounded shadow-xs">
              ⚡ PAID
            </span>
          )}
          {screenContext?.screen && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title={`Focusing on ${screenContext.screen}`}></span>
          )}
        </button>
      )}

      {/* Backdrop for Mobile Screen Dismissal ONLY (never on desktop so user can see & interact behind window) */}
      {isOpen && isMobile && (
        <div
          onClick={closeDrawer}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity sm:hidden"
          aria-hidden="true"
        />
      )}

      {/* Copilot Window (Floating on Desktop, Docked Drawer on Mobile) */}
      {isOpen && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={
            isMobile
              ? undefined
              : {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  width: `${size.width}px`,
                  height: isCollapsed ? 'auto' : `${size.height}px`,
                  maxHeight: isCollapsed ? 'auto' : 'calc(100vh - 16px)'
                }
          }
          className={
            isMobile
              ? "fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white border-l border-gray-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
              : `fixed z-50 bg-white border border-gray-300 shadow-2xl rounded-2xl flex flex-col overflow-hidden transition-[box-shadow] duration-150 ${
                  isDragging || isResizing ? 'select-none shadow-3xl ring-2 ring-primary/40' : ''
                }`
          }
        >
          {/* Drag & Drop File Overlay */}
          {isDraggingFile && (
            <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-xs border-2 border-dashed border-primary flex flex-col items-center justify-center p-6 text-center text-white pointer-events-none rounded-2xl animate-in fade-in duration-100">
              <span className="material-symbols-outlined text-[48px] text-primary mb-2 animate-bounce">cloud_upload</span>
              <p className="font-bold text-base">Drop receipt or photo here</p>
              <p className="text-xs text-gray-400 mt-1">Image will be staged for your next message</p>
            </div>
          )}

          {/* Live Camera Snapshot Modal */}
          <CameraCaptureModal
            isOpen={isCameraOpen}
            onClose={() => setIsCameraOpen(false)}
            onCapture={(compressed) => {
              setAttachedImage(compressed);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
          />
          {/* Header Bar */}
          <div
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            onDoubleClick={(e) => {
              if (!isMobile && !e.target.closest('button, select, input, textarea, a, [data-no-drag]')) {
                toggleCollapse();
              }
            }}
            className={`p-3 sm:p-3.5 border-b border-gray-800 flex items-center justify-between bg-gray-900 text-white select-none ${
              !isMobile && !isMaximized ? 'cursor-move' : ''
            }`}
            title={!isMobile && !isMaximized ? "Click and drag to move • Double click to collapse/expand" : undefined}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-black flex items-center justify-center shadow-xs shrink-0">
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="font-bold text-sm tracking-tight text-white shrink-0">MiniApps Copilot</h2>
                  
                  {/* Tier Toggle Switch */}
                  <div className="flex items-center bg-gray-800 p-0.5 rounded-md border border-gray-700" data-no-drag>
                    <button
                      type="button"
                      onClick={() => setSelectedTier('free')}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition-all flex items-center gap-1 cursor-pointer ${
                        selectedTier === 'free'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                      title="Free Tier (GEMINI_API_KEY)"
                    >
                      <span>🌱</span> Free
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTier('paid')}
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition-all flex items-center gap-1 cursor-pointer ${
                        selectedTier === 'paid'
                          ? 'bg-amber-400 text-black shadow-xs'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                      title={aiConfig?.hasPaidKey ? "Paid Tier (GEMINI_API_KEY_PAID configured)" : "Paid Tier (Configure GEMINI_API_KEY_PAID in .env)"}
                    >
                      <span>⚡</span> Paid
                      {aiConfig && !aiConfig.hasPaidKey && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Paid key not configured yet in .env" />
                      )}
                    </button>
                  </div>

                  {/* Model Selector */}
                  <select
                    data-no-drag
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    aria-label="Select Gemini Model"
                    className="text-[10px] bg-gray-800 text-primary border border-primary/40 rounded px-1.5 py-0.5 font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-gray-700 transition-colors shrink-0"
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

            {/* Window Controls */}
            <div className="flex items-center gap-0.5 shrink-0" data-no-drag>
              <button
                type="button"
                onClick={clearChat}
                title="Clear conversation"
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
              </button>

              {!isMobile && (
                <button
                  type="button"
                  onClick={resetPosition}
                  title="Reset window size and position"
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                </button>
              )}

              {!isMobile && (
                <button
                  type="button"
                  onClick={toggleCollapse}
                  title={isCollapsed ? "Expand window" : "Minimize / Collapse window"}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isCollapsed ? 'expand_more' : 'remove'}
                  </span>
                </button>
              )}

              {!isMobile && (
                <button
                  type="button"
                  onClick={toggleMaximize}
                  title={isMaximized ? "Restore window size" : "Maximize window"}
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isMaximized ? 'close_fullscreen' : 'fullscreen'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={closeDrawer}
                title="Close Copilot"
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Body Section (Hidden when collapsed on desktop) */}
          {(!isCollapsed || isMobile) && (
            <>
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/60 min-h-0">
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
              <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 relative">
                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={nativeCameraInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) processAndStageImage(e.target.files[0]);
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/heic,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) processAndStageImage(e.target.files[0]);
                    e.target.value = '';
                  }}
                />

                {/* Staged Image Thumbnail Chip */}
                {attachedImage && (
                  <div className="mb-2 px-2.5 py-1.5 flex items-center justify-between bg-gray-100 border border-gray-200 rounded-xl shadow-xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={attachedImage.dataUrl}
                        alt="Staged receipt"
                        className="w-9 h-9 object-cover rounded-lg border border-gray-300 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate max-w-[180px]">
                          {attachedImage.name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {(attachedImage.size / 1024).toFixed(0)} KB • Ready to send
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedImage(null)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-200 transition-colors cursor-pointer shrink-0"
                      title="Remove image"
                    >
                      <span className="material-symbols-outlined text-[16px] block">close</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1 bg-gray-50 border border-gray-300 rounded-xl px-2 py-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:bg-white transition-all">
                  {/* Camera Button */}
                  <button
                    type="button"
                    onClick={handleCameraClick}
                    disabled={isLoading}
                    title="Take photo with camera"
                    className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[20px] block">photo_camera</span>
                  </button>

                  {/* Upload Image File Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    title="Upload image or receipt file"
                    className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[20px] block">attach_file</span>
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder={
                      attachedImage
                        ? "Add instructions for this photo (optional)..."
                        : screenContext?.screen === 'JobDetails'
                        ? "Ask about this job, log hours, or snap receipt..."
                        : "Ask Copilot or drop receipt to log materials..."
                    }
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none text-sm text-gray-800 focus:outline-none placeholder-gray-400 py-1 min-w-0"
                  />

                  <button
                    type="submit"
                    disabled={(!input.trim() && !attachedImage) || isLoading}
                    className="p-1.5 bg-primary text-black rounded-lg hover:bg-opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </button>
                </div>
                <div className="text-[10px] text-gray-400 text-center mt-1.5 flex items-center justify-center gap-2">
                  <span>AI operations automatically update your screen</span>
                  <span>•</span>
                  <span className="font-semibold text-gray-500">
                    {selectedTier === 'paid' ? '⚡ Paid Tier' : '🌱 Free Tier'}
                  </span>
                </div>
              </form>
            </>
          )}

          {/* Desktop Resize Handles (only when floating, not maximized, not collapsed) */}
          {!isMobile && !isMaximized && !isCollapsed && (
            <>
              {/* Edges */}
              <div
                onPointerDown={(e) => handleResizeStart('w', e)}
                className="absolute top-2 bottom-2 left-0 w-2 cursor-ew-resize hover:bg-primary/20 transition-colors"
                title="Resize width"
              />
              <div
                onPointerDown={(e) => handleResizeStart('e', e)}
                className="absolute top-2 bottom-2 right-0 w-2 cursor-ew-resize hover:bg-primary/20 transition-colors"
                title="Resize width"
              />
              <div
                onPointerDown={(e) => handleResizeStart('n', e)}
                className="absolute top-0 left-2 right-2 h-2 cursor-ns-resize hover:bg-primary/20 transition-colors"
                title="Resize height"
              />
              <div
                onPointerDown={(e) => handleResizeStart('s', e)}
                className="absolute bottom-0 left-2 right-2 h-2 cursor-ns-resize hover:bg-primary/20 transition-colors"
                title="Resize height"
              />

              {/* Corners */}
              <div
                onPointerDown={(e) => handleResizeStart('nw', e)}
                className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-10"
              />
              <div
                onPointerDown={(e) => handleResizeStart('ne', e)}
                className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-10"
              />
              <div
                onPointerDown={(e) => handleResizeStart('sw', e)}
                className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-10"
              />
              <div
                onPointerDown={(e) => handleResizeStart('se', e)}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10 flex items-end justify-end p-0.5 opacity-40 hover:opacity-100 transition-opacity"
                title="Drag to resize"
              >
                <svg className="w-2.5 h-2.5 text-gray-500" viewBox="0 0 6 6" fill="currentColor">
                  <circle cx="5" cy="5" r="0.8" />
                  <circle cx="5" cy="2.5" r="0.8" />
                  <circle cx="2.5" cy="5" r="0.8" />
                </svg>
              </div>
            </>
          )}
        </div>
      )}
    </>,
    document.body
  );
};
