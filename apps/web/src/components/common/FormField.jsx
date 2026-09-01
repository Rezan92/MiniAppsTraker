import React from 'react';

export const FormField = ({
  label,
  error,
  required = false,
  helpText,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block font-label-md text-label-md text-gray-700 font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1 animate-[fadeIn_0.15s_ease-out]">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {typeof error === 'string' ? error : error?.message}
        </p>
      )}
    </div>
  );
};
