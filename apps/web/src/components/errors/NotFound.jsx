import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="w-full h-full min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-[600px] flex-grow flex flex-col items-center justify-center">
        {/* Centered Bento-box style card */}
        <div className="bg-surface-container-lowest w-full rounded-lg border border-surface-container-highest shadow-sm overflow-hidden flex flex-col p-8 relative">
          
          {/* Subtle accent top line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-primary-container"></div>
          
          <div className="flex flex-col items-center text-center">
            {/* 404 Header with Icon */}
            <div className="flex items-center justify-center gap-4 mb-4 text-error">
              <span className="material-symbols-outlined text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>link_off</span>
              <h1 className="font-headline-lg text-[64px] font-extrabold leading-none tracking-tighter">404</h1>
            </div>
            
            {/* Headline */}
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">System Location Unknown</h2>
            
            {/* Body */}
            <p className="font-body-lg text-body-lg text-secondary max-w-[400px] mx-auto mb-8">
              The requested directory or resource could not be found. Please verify the URL or return to the main dashboard.
            </p>
            
            {/* CTA Button */}
            <button 
              className="bg-primary text-[#000000] font-label-md text-label-md font-semibold py-3 px-8 rounded flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors shadow-[0_4px_14px_rgba(245,158,11,0.2)] w-full sm:w-auto cursor-pointer"
              onClick={() => navigate('/')}
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              Return to Dashboard
            </button>
          </div>
          
          <div className="mt-8 pt-4 border-t border-surface-container-high w-full text-center">
            {/* Technical String Footer */}
            <span className="font-label-caps text-label-caps text-tertiary">ERROR_REF: 404_LOC_NOT_FOUND</span>
          </div>
        </div>
      </main>
    </div>
  );
};
