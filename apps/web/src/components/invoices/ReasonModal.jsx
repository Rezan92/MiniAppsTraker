import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export const ReasonModal = ({
  open,
  onClose,
  onSubmit,
  title,
  description,
  reasonText,
  onReasonChange,
  isLoading = false,
  confirmText = 'Confirm Action',
  confirmColor = 'primary'
}) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!open) return null;

  const colorStyles = {
    primary: 'bg-primary hover:bg-opacity-90 text-black shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    red: 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.2)]'
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]"
      onMouseDown={onClose}
    >
      <div 
        className="bg-white border border-gray-200 rounded-xl w-[90vw] max-w-[480px] shadow-2xl flex flex-col overflow-hidden animate-[fadeInUp_0.2s_ease-out]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-headline-md text-lg font-bold text-gray-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {description}
            </p>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              ref={textareaRef}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-shadow shadow-inner"
              placeholder="Provide context or explanation for this action..."
              value={reasonText}
              onChange={(e) => onReasonChange(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading || !reasonText?.trim()}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${colorStyles[confirmColor] || colorStyles.primary}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};
