import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { STATUS_COLORS } from '../../utils/constants';

export const StatusBadgeDropdown = ({ currentStatus, statuses, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen) {
      const handler = (e) => {
        if (e.target.closest('.status-dropdown-menu')) return;
        setIsOpen(false);
      };
      document.addEventListener('mousedown', handler, true);
      return () => document.removeEventListener('mousedown', handler, true);
    }
  }, [isOpen]);

  const handleStatusClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuCoords({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX
    });
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative w-max cursor-pointer">
      <button 
        onClick={handleStatusClick}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors hover:opacity-80 ${
          STATUS_COLORS[currentStatus] || STATUS_COLORS.open || 'bg-gray-100 text-gray-800 border-gray-200'
        }`}
      >
        <span className="capitalize">{currentStatus?.replace(/_/g, ' ') || 'unknown'}</span>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>expand_more</span>
      </button>

      {isOpen && createPortal(
        <div 
          className="status-dropdown-menu absolute bg-white border border-gray-200 rounded shadow-lg z-[9999] py-1 w-36"
          style={{ top: menuCoords.top, left: menuCoords.left }}
          onClick={e => e.stopPropagation()}
        >
          {statuses.filter(s => s.value !== 'all').map(status => (
            <button 
              key={status.value}
              onClick={(e) => { 
                e.stopPropagation(); 
                onStatusChange(status.value); 
                setIsOpen(false); 
              }} 
              className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 cursor-pointer ${STATUS_COLORS[status.value] || 'text-gray-800'}`}
            >
              {status.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
