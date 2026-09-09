import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAiContext } from '../../contexts/AiContext';
import { useAi } from '../../hooks/api/useAi';
import { useDraggableResizableWindow } from '../../hooks/ui/useDraggableResizableWindow';
import { ChatMessage } from './ChatMessage';
import { SuggestionChips } from './SuggestionChips';
import { CameraCaptureModal } from './CameraCaptureModal';
import { compressImage } from '../../utils/imageCompressor';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

export const AiCopilotWidget = () => {
  const { isOpen, toggleDrawer, closeDrawer, screenContext } = useAiContext();
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearChat, 
    selectedModel, 
    setSelectedModel, 
    availableModels,
    selectedTier,
    setSelectedTier,
    aiConfig,
    transcribeSpeech,
    hasGroqKey
  } = useAi();

  const {
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
  } = useDraggableResizableWindow();

  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const [isAtScrollPoint, setIsAtScrollPoint] = useState(false);

  const windowRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  const SINGLE_LINE_HEIGHT = 24;
  const MAX_COLLAPSED_HEIGHT = 112; // Approx 4-5 lines of text
  const EXPANDED_HEIGHT = 220; // Height in expanded mode

  const showExpandButton = isInputExpanded || isAtScrollPoint;

  const handleAutoStopRef = useRef(null);
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording
  } = useAudioRecorder({
    maxDurationSeconds: 900, // 15 minutes limit
    onAutoStop: (payload) => handleAutoStopRef.current?.(payload)
  });

  const adjustTextareaHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;

    el.style.height = 'auto';
    const scrollH = el.scrollHeight;

    if (isInputExpanded) {
      const targetHeight = Math.min(Math.max(scrollH, EXPANDED_HEIGHT), 360);
      el.style.height = `${targetHeight}px`;
      el.style.overflowY = scrollH > 360 ? 'auto' : 'hidden';
      setIsAtScrollPoint(true);
    } else {
      if (!el.value) {
        el.style.height = `${SINGLE_LINE_HEIGHT}px`;
        el.style.overflowY = 'hidden';
        setIsAtScrollPoint(false);
        return;
      }

      const reachedScroll = scrollH >= MAX_COLLAPSED_HEIGHT;
      const targetHeight = Math.min(Math.max(scrollH, SINGLE_LINE_HEIGHT), MAX_COLLAPSED_HEIGHT);
      el.style.height = `${targetHeight}px`;
      el.style.overflowY = reachedScroll ? 'auto' : 'hidden';
      setIsAtScrollPoint(reachedScroll);
    }
  }, [isInputExpanded]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, isInputExpanded, adjustTextareaHeight]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let prevWidth = el.clientWidth;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width !== prevWidth) {
          prevWidth = entry.contentRect.width;
          adjustTextareaHeight();
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [adjustTextareaHeight]);

  const transcribeAudioPayload = async (base64, mimeType) => {
    try {
      setIsTranscribingAudio(true);
      setVoiceError(null);
      const text = await transcribeSpeech(base64, mimeType);
      if (text && text.trim()) {
        setInput((prev) => (prev.trim() ? `${prev.trim()} ${text.trim()}` : text.trim()));
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      console.error('Speech transcription error:', err);
      setVoiceError(err.message || 'Speech transcription failed');
      setTimeout(() => setVoiceError(null), 6000);
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  handleAutoStopRef.current = ({ base64, mimeType }) => {
    transcribeAudioPayload(base64, mimeType);
  };

  const handleFinishRecording = async () => {
    try {
      setIsTranscribingAudio(true);
      setVoiceError(null);
      const { base64, mimeType } = await stopRecording();
      await transcribeAudioPayload(base64, mimeType);
    } catch (err) {
      console.error('Speech recording error:', err);
      setVoiceError(err.message || 'Speech recording failed');
      setIsTranscribingAudio(false);
      setTimeout(() => setVoiceError(null), 6000);
    }
  };

  const handleToggleMic = async () => {
    setVoiceError(null);
    if (isRecording) {
      await handleFinishRecording();
    } else {
      try {
        await startRecording();
      } catch (err) {
        setVoiceError(err.message || 'Microphone access denied');
        setTimeout(() => setVoiceError(null), 6000);
      }
    }
  };

  const handleCancelVoice = () => {
    cancelRecording();
    setVoiceError(null);
  };

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
    if (!isCollapsed) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isCollapsed]);

  // Focus input when opened
  useEffect(() => {
    if (!isCollapsed) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isCollapsed]);

  // Escape key listener to collapse to circle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isCollapsed) {
        collapseToCircle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, collapseToCircle]);

  // Click anywhere outside on the screen -> collapse to circle
  useEffect(() => {
    if (isCollapsed) return;

    const handlePointerDownOutside = (e) => {
      if (isDragging || isResizing || isDraggingCircle) return;
      if (isCameraOpen) return;
      if (windowRef.current && windowRef.current.contains(e.target)) return;
      if (e.target.closest('[data-copilot-modal], .camera-modal-overlay')) return;

      collapseToCircle();
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [isCollapsed, isDragging, isResizing, isDraggingCircle, isCameraOpen, collapseToCircle]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !attachedImage) || isLoading) return;
    sendMessage(input, attachedImage);
    setInput('');
    setAttachedImage(null);
    setIsInputExpanded(false);
    setIsAtScrollPoint(false);
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
      {/* Collapsed State: Draggable Floating Circle (Orb) */}
      {isCollapsed && (
        <div
          style={{
            left: `${circlePosition.x}px`,
            top: `${circlePosition.y}px`
          }}
          onPointerDown={handleCirclePointerDown}
          onPointerMove={handleCirclePointerMove}
          onPointerUp={handleCirclePointerUp}
          onPointerCancel={handleCirclePointerUp}
          title="MiniApps Copilot • Click to expand • Drag to place anywhere"
          className={`fixed z-50 w-14 h-14 rounded-full bg-gray-950 text-white border-2 border-primary/60 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] flex items-center justify-center cursor-grab active:cursor-grabbing select-none hover:scale-105 active:scale-95 transition-transform duration-150 animate-in zoom-in-75 fade-in duration-200 group ${
            isDraggingCircle ? 'scale-105 shadow-3xl ring-2 ring-primary/60 cursor-grabbing' : ''
          }`}
        >
          {/* Inner Glowing AI Orb Icon */}
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black shadow-xs group-hover:rotate-6 transition-transform">
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
          </div>

          {/* Active Screen Context Pulse */}
          {screenContext?.screen && (
            <span
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-gray-950 animate-pulse"
              title={`Focus: ${screenContext.screen}`}
            />
          )}

          {/* Paid Tier Badge */}
          {selectedTier === 'paid' && (
            <span
              className="absolute -bottom-0.5 -right-0.5 text-[9px] bg-amber-400 text-black font-extrabold px-1 rounded-full border border-gray-950 shadow-xs"
              title="Paid Tier active"
            >
              ⚡
            </span>
          )}

          {/* Active Audio Transcription / AI Loading Spinner Ring */}
          {(isLoading || isTranscribingAudio) && (
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin pointer-events-none" />
          )}
        </div>
      )}

      {/* Backdrop for Mobile Screen Dismissal ONLY */}
      {!isCollapsed && isMobile && (
        <div
          onClick={collapseToCircle}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity sm:hidden"
          aria-hidden="true"
        />
      )}

      {/* Expanded Copilot Window */}
      {!isCollapsed && (
        <div
          ref={windowRef}
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
                  height: `${size.height}px`,
                  maxHeight: 'calc(100vh - 16px)'
                }
          }
          className={
            isMobile
              ? "fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white border-l border-gray-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
              : `fixed z-50 bg-white border border-gray-300 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200 ease-out transition-[box-shadow] ${
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
                collapseToCircle();
              }
            }}
            className={`p-3 sm:p-3.5 border-b border-gray-800 flex items-center justify-between bg-gray-900 text-white select-none ${
              !isMobile && !isMaximized ? 'cursor-move' : ''
            }`}
            title={!isMobile && !isMaximized ? "Click and drag to move • Double click to collapse to circle" : undefined}
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
                  onClick={collapseToCircle}
                  title="Collapse to circle"
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close_fullscreen
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
                    {isMaximized ? 'filter_none' : 'fullscreen'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={collapseToCircle}
                title="Collapse to circle"
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Body Section */}
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

              {/* Expand / Collapse Control (Appears above everything, even above suggestion responses, when text reaches scroll point or is expanded) */}
              {showExpandButton && (
                <div className="px-3 pt-2 pb-0.5 bg-white border-t border-gray-100 flex items-center justify-end animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => setIsInputExpanded((prev) => !prev)}
                    disabled={isLoading || isRecording || isTranscribingAudio}
                    title={isInputExpanded ? "Collapse text box" : "Expand text box"}
                    className="p-1.5 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100/80 border border-amber-300/80 hover:border-amber-400 shadow-xs transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={isInputExpanded ? "Collapse text box" : "Expand text box"}
                  >
                    {isInputExpanded ? (
                      /* Two arrows against each other to collapse */
                      <svg className="w-4 h-4 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 14 10 14 10 20" />
                        <polyline points="20 10 14 10 14 4" />
                        <line x1="14" y1="10" x2="21" y2="3" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    ) : (
                      /* An arrow opening away from each other to expand */
                      <svg className="w-4 h-4 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    )}
                  </button>
                </div>
              )}

              {/* Contextual Suggestion Chips */}
              <div className={`px-3 pt-1.5 bg-white ${showExpandButton ? '' : 'border-t border-gray-100'}`}>
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

                {/* Voice Dictation Error Alert */}
                {voiceError && (
                  <div className="mb-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="material-symbols-outlined text-[14px] text-red-500 shrink-0">error</span>
                      <span className="truncate">{voiceError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVoiceError(null)}
                      className="ml-1 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                )}

                <div className={`flex items-end gap-1 bg-gray-50 border rounded-xl px-2 py-1.5 transition-all ${
                  isRecording 
                    ? 'border-red-400 ring-1 ring-red-400 bg-red-50/40' 
                    : 'border-gray-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:bg-white'
                }`}>
                  {/* Left Action Buttons: Camera & File Upload */}
                  <div className="flex items-center gap-0.5 shrink-0 self-end mb-0.5">
                    {/* Camera Button */}
                    <button
                      type="button"
                      onClick={handleCameraClick}
                      disabled={isLoading || isRecording || isTranscribingAudio}
                      title="Take photo with camera"
                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[20px] block">photo_camera</span>
                    </button>

                    {/* Upload Image File Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || isRecording || isTranscribingAudio}
                      title="Upload image or receipt file"
                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[20px] block">attach_file</span>
                    </button>
                  </div>

                  {isRecording ? (
                    <div className="flex-1 flex items-center justify-between gap-2 px-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                        <span className="text-xs font-semibold text-red-600 shrink-0">
                          {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                        </span>
                        <span className="text-xs text-gray-500 truncate hidden sm:inline">
                          Listening...
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={handleCancelVoice}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
                          title="Discard recording"
                        >
                          <span className="material-symbols-outlined text-[18px] block">close</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleFinishRecording}
                          className="px-2 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Stop and transcribe speech"
                        >
                          <span className="material-symbols-outlined text-[16px]">done</span>
                          <span>Done</span>
                        </button>
                      </div>
                    </div>
                  ) : isTranscribingAudio ? (
                    <div className="flex-1 flex items-center gap-2 px-2 py-1 text-xs text-primary font-medium min-w-0">
                      <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                      <span className="truncate">Transcribing speech with Groq Whisper...</span>
                    </div>
                  ) : (
                    <textarea
                      ref={inputRef}
                      rows={1}
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
                      className="flex-1 bg-transparent border-0 border-none text-sm text-gray-800 focus:outline-none focus:ring-0 placeholder-gray-400 py-1 px-1 min-w-0 resize-none leading-5 transition-[height] duration-100 ease-out"
                    />
                  )}

                  {/* Right Action Group: Voice Dictation & Send Button */}
                  <div className="flex items-center gap-1 shrink-0 self-end mb-0.5">
                    <button
                      type="button"
                      onClick={handleToggleMic}
                      disabled={isLoading || isTranscribingAudio}
                      title={
                        isRecording
                          ? "Stop recording and transcribe"
                          : hasGroqKey
                          ? "Voice dictation (Groq Whisper)"
                          : "Voice dictation (Requires GROQ_API_KEY in apps/api/.env)"
                      }
                      className={`p-1 rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed ${
                        isRecording
                          ? 'text-red-600 bg-red-100 hover:bg-red-200 animate-pulse'
                          : hasGroqKey
                          ? 'text-gray-500 hover:text-primary hover:bg-gray-200/60'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/60'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px] block">
                        {isRecording ? 'mic' : 'mic_none'}
                      </span>
                    </button>

                    {!isRecording && (
                      <button
                        type="submit"
                        disabled={(!input.trim() && !attachedImage) || isLoading || isTranscribingAudio}
                        className="p-1.5 bg-primary text-black rounded-lg hover:bg-opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[18px]">send</span>
                      </button>
                    )}
                  </div>
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

          {/* Desktop Resize Handles (only when floating and not maximized) */}
          {!isMobile && !isMaximized && (
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
