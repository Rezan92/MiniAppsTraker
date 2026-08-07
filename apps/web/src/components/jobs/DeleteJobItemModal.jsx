import React from 'react';

export const DeleteJobItemModal = ({ open, onClose, onConfirm, type }) => {
  if (!open) return null;

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
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-[32px] text-red-600" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          </div>
          
          {/* Text */}
          <div>
            <h2 className="font-headline-md text-headline-md text-gray-900 mb-2 font-bold">
              Delete {type === 'hour' ? 'Hour' : 'Material'} Entry?
            </h2>
            <p className="font-body-md text-body-md text-gray-600">
              Are you sure you want to delete this {type === 'hour' ? 'hour' : 'material'} entry? This action is permanent.
            </p>
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
            className="flex-1 px-4 py-3 rounded bg-red-600 text-white font-label-md text-label-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 shadow-[0_2px_10px_rgba(220,38,38,0.3)] hover:shadow-[0_4px_14px_rgba(220,38,38,0.4)] cursor-pointer"
          >
            Delete
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
