import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const SIZE_MAP = {
  sm: 'max-w-[400px]',
  md: 'max-w-[520px]',
  lg: 'max-w-[680px]',
  xl: 'max-w-[840px]',
  '2xl': 'max-w-[1040px]'
};

export const BaseModal = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  maxWidth,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = ''
}) => {
  // Lock body scroll and handle escape key
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  const widthClass = maxWidth || SIZE_MAP[size] || SIZE_MAP.md;

  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center bg-gray-900/60 backdrop-blur-sm p-0 md:p-4 animate-[modalFadeIn_0.15s_ease-out]"
      onMouseDown={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white border-t md:border border-gray-200 rounded-t-2xl md:rounded-xl w-full md:w-[90vw] ${widthClass} shadow-2xl flex flex-col max-h-[90dvh] md:max-h-[90vh] overflow-hidden animate-[modalSlideUpMobile_0.25s_ease-out] md:animate-[modalScaleIn_0.2s_ease-out] ${className}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle indicator */}
        <div className="md:hidden flex justify-center pt-2.5 pb-1 bg-white shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-gray-300" />
        </div>

        {/* Header if title provided */}
        {(title || showCloseButton) && (
          <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
            <div>
              {title && (
                <h2 className="font-title-md text-title-md font-bold text-gray-900">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="font-body-sm text-body-sm text-gray-500 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer ml-auto"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            )}
          </div>
        )}

        {/* Content / Body with overscroll containment */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {/* Footer if provided */}
        {footer && (
          <div className="px-4 py-3 md:px-6 md:py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 md:gap-3 shrink-0 pb-[calc(0.75rem+var(--sab,0px))] md:pb-4">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalScaleIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes modalSlideUpMobile {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
};
