import React from 'react';

export const ConfirmModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  confirmColor = 'red' 
}) => {
  if (!open) return null;

  const colorStyles = {
    red: {
      bg: 'bg-red-100',
      text: 'text-red-600',
      icon: 'warning',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-600 shadow-[0_2px_10px_rgba(220,38,38,0.3)] hover:shadow-[0_4px_14px_rgba(220,38,38,0.4)]'
    },
    amber: {
      bg: 'bg-amber-100',
      text: 'text-amber-600',
      icon: 'warning',
      button: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 shadow-[0_2px_10px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_14px_rgba(245,158,11,0.4)]'
    }
  };

  const style = colorStyles[confirmColor] || colorStyles.red;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
      onMouseDown={onClose}
    >
      <div 
        className="bg-white border border-gray-200 rounded-xl w-[90vw] max-w-[400px] shadow-2xl flex flex-col overflow-hidden animate-[fadeInUp_0.2s_ease-out]"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Modal Header / Content */}
        <div className="p-6 flex flex-col items-center text-center gap-4">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-full ${style.bg} flex items-center justify-center mb-2`}>
            <span className={`material-symbols-outlined text-[32px] ${style.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>
              {style.icon}
            </span>
          </div>
          
          {/* Text */}
          <div>
            <h2 className="font-headline-md text-headline-md text-gray-900 mb-2 font-bold">{title}</h2>
            <div className="font-body-md text-body-md text-gray-600">
              {message}
            </div>
          </div>
        </div>
        
        {/* Modal Actions */}
        <div className="bg-gray-50 p-4 flex gap-3 border-t border-gray-200">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded bg-white border border-gray-300 text-gray-700 font-label-md text-label-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 px-4 py-3 rounded text-white font-label-md text-label-md transition-colors focus:outline-none focus:ring-2 cursor-pointer ${style.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(10px) scale(0.98);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
      `}</style>
    </div>
  );
};
