import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-on-surface p-4">
          <div className="w-full max-w-[400px] bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm flex flex-col items-center text-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-error"></div>
            
            <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1", fontSize: '32px' }}>
                warning
              </span>
            </div>
            
            <div className="flex flex-col gap-2 w-full">
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
                Something went wrong
              </h1>
              <p className="font-body-md text-body-md text-secondary">
                An unexpected error occurred in the application. Please reload the page to try again.
              </p>
            </div>
            
            <button 
              className="w-full bg-primary text-on-primary font-label-md text-label-md rounded-lg py-3 px-4 hover:bg-amber-600 transition-colors duration-200 cursor-pointer shadow-sm flex items-center justify-center gap-2"
              onClick={() => window.location.reload()}
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
