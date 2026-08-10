import React from 'react';

export const Tooltip = ({ children, text, position = 'top' }) => {
  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent'
  };

  if (!text) return <>{children}</>;

  return (
    <div className="relative group inline-block">
      {children}
      <div className={`absolute ${positionClasses[position]} hidden group-hover:block z-50 animate-[fadeIn_0.15s_ease-out] w-max max-w-[250px]`}>
        <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded shadow-lg whitespace-normal text-center">
          {text}
        </div>
        <div className={`absolute border-4 ${arrowClasses[position]}`}></div>
      </div>
    </div>
  );
};
