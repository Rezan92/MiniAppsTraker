import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  }, []);

  const showSuccess = useCallback((message) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message) => showToast(message, 'error'), [showToast]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[250px] max-w-sm ${
            toast.type === 'success' ? 'bg-green-100 text-green-900 border border-green-200' :
            toast.type === 'error' ? 'bg-red-100 text-red-900 border border-red-200' :
            'bg-surface text-on-surface border border-outline-variant'
          }`}>
            {toast.type === 'success' && (
              <span className="material-symbols-outlined text-green-600">check_circle</span>
            )}
            {toast.type === 'error' && (
              <span className="material-symbols-outlined text-red-600">error</span>
            )}
            <p className="font-body-md text-sm leading-tight flex-1">{toast.message}</p>
            <button onClick={() => setToast(null)} className="text-current opacity-70 hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
