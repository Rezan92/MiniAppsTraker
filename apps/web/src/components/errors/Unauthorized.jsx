import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <div className="w-full h-full min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-[400px] bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm flex flex-col items-center text-center gap-8">
        
        {/* Header / Icon */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center shadow-[0_0_15px_rgba(186,26,26,0.1)]">
            <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1", fontSize: '32px' }}>
              lock
            </span>
          </div>
        </div>
        
        {/* Typography Block */}
        <div className="flex flex-col gap-2 w-full">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Access Denied
          </h1>
          <p className="font-body-lg text-body-lg text-secondary px-4">
            You do not have the required permissions to view this record or access this restricted directory.
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 w-full mt-4">
          <button 
            className="flex-1 bg-primary text-on-primary font-label-md text-label-md rounded-lg py-3 px-4 hover:bg-amber-600 hover:shadow-[0_4px_14px_rgba(245,158,11,0.2)] transition-all duration-200 cursor-pointer"
            onClick={() => navigate('/')}
          >
            Return to Dashboard
          </button>
          <button 
            className="flex-1 bg-surface border border-outline text-secondary font-label-md text-label-md rounded-lg py-3 px-4 hover:bg-surface-variant hover:text-on-surface transition-colors duration-200 cursor-pointer"
            onClick={() => {}}
          >
            Contact Admin
          </button>
        </div>
        
        {/* Footer / Technical String */}
        <div className="w-full pt-4 border-t border-outline-variant mt-2">
          <span className="font-label-caps text-label-caps text-tertiary">
            TRACE_ID: 88291
          </span>
        </div>
      </main>
    </div>
  );
};
