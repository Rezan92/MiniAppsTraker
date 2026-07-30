import React from 'react';
import { Link } from 'react-router-dom';

export const NotFound = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-on-surface p-4">
      <div className="w-full max-w-[400px] bg-surface-container-lowest shadow-sm rounded-xl p-8 text-center border border-outline-variant">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-primary text-on-primary rounded flex items-center justify-center mb-4">
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>error</span>
          </div>
          <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
          <h2 className="font-headline-md text-headline-md font-bold mb-2">Page Not Found</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <Link 
          to="/" 
          className="w-full bg-primary text-on-primary font-title-md text-title-md py-3 px-4 rounded hover:bg-primary-container transition-colors min-h-[44px] flex items-center justify-center cursor-pointer"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
