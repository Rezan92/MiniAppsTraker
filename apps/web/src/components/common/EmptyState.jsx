import React from 'react';

export const EmptyState = ({
  icon = 'inbox',
  title = 'No items found',
  description = '',
  actionText,
  onActionClick
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center w-full">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <h3 className="font-headline-md text-base font-bold text-gray-800 mb-1">{title}</h3>
      {description && (
        <p className="font-body-sm text-sm text-gray-500 max-w-[420px] mx-auto mb-4">{description}</p>
      )}
      {actionText && onActionClick && (
        <button
          type="button"
          onClick={onActionClick}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-title-sm text-sm rounded-lg hover:opacity-90 transition-opacity cursor-pointer font-semibold shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {actionText}
        </button>
      )}
    </div>
  );
};
