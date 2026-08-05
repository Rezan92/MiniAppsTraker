import React, { useState } from 'react';

export const DeleteInvoiceModal = ({ isOpen, onClose, onConfirm, invoiceNumber, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest border border-red-200 rounded-xl p-6 shadow-sm w-full max-w-[32rem] relative">
        <button 
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="mb-6">
          <h2 className="font-headline-sm text-headline-sm text-red-600 tracking-tight mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            Delete Invoice?
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Are you sure you want to delete invoice <strong>#{invoiceNumber}</strong>? 
            This action <strong>cannot be undone</strong> and all associated data will be lost.
          </p>
        </div>

        <div className="flex gap-4 mt-6 pt-4 border-t border-outline-variant">
          <button 
            type="button" 
            onClick={onClose}
            disabled={loading}
            className="w-1/2 text-on-surface border border-outline-variant hover:bg-surface-container-high transition-colors font-title-sm py-2 px-4 rounded-DEFAULT cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            disabled={loading}
            className="w-1/2 bg-red-600 text-white font-title-sm py-2 px-4 rounded-DEFAULT hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};
