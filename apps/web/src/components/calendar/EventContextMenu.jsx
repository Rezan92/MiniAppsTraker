import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GOOGLE_CALENDAR_COLORS, DEFAULT_CALENDAR_COLOR_ID } from './calendarColors';

/**
 * Google Calendar Event Context Menu
 * Matches Google Calendar's Material 3 right-click popover:
 * - Delete action row with trash icon
 * - Divider line
 * - Circular pencil edit button
 * - 3-row grid of 24 circular color swatches
 * - Default button with blue checkmark badge
 */
export const EventContextMenu = ({
  open,
  x,
  y,
  appointment,
  onClose,
  onEdit,
  onDelete,
  onColorSelect
}) => {
  const menuRef = useRef(null);

  // Close on outside click, Escape key, or window scroll
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, onClose]);

  if (!open || !appointment) return null;

  // Approximate dimensions for clamping to viewport
  const menuWidth = 276;
  const menuHeight = 240;
  const padding = 12;

  const clampedX = Math.max(padding, Math.min(x, window.innerWidth - menuWidth - padding));
  const clampedY = Math.max(padding, Math.min(y, window.innerHeight - menuHeight - padding));

  const currentColor = appointment.color_tag || DEFAULT_CALENDAR_COLOR_ID;
  const isDefault = currentColor === DEFAULT_CALENDAR_COLOR_ID;

  // Split the 24 colors into Google Calendar's 3 rows (9 + 9 + 6)
  const row1 = GOOGLE_CALENDAR_COLORS.filter(c => c.row === 1);
  const row2 = GOOGLE_CALENDAR_COLORS.filter(c => c.row === 2);
  const row3 = GOOGLE_CALENDAR_COLORS.filter(c => c.row === 3);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onClose();
    onDelete(appointment.id);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onClose();
    onEdit(appointment);
  };

  const handleColorClick = (e, colorId) => {
    e.stopPropagation();
    onClose();
    onColorSelect(appointment.id, colorId);
  };

  const handleDefaultClick = (e) => {
    e.stopPropagation();
    onClose();
    onColorSelect(appointment.id, DEFAULT_CALENDAR_COLOR_ID);
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Event actions"
      className="fixed z-[9999] w-[276px] bg-[#f0f4f9] rounded-2xl border border-[#e1e3e1] shadow-2xl p-3 select-none animate-in fade-in zoom-in-95 duration-100 ease-out"
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Row: Delete Action */}
      <button
        type="button"
        onClick={handleDeleteClick}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#1f1f1f] hover:bg-[#e1e3e1]/70 transition-colors text-left cursor-pointer group"
      >
        <span className="material-symbols-outlined text-[20px] text-[#444746] group-hover:text-red-600 transition-colors">
          delete
        </span>
        <span className="text-[14px] font-medium text-[#1f1f1f] group-hover:text-red-600 transition-colors">
          Delete
        </span>
      </button>

      {/* Horizontal Divider Line */}
      <div className="h-[1px] bg-[#e1e3e1] my-2" />

      {/* Edit Pencil Circular Button */}
      <div className="px-1 mb-2">
        <button
          type="button"
          onClick={handleEditClick}
          title="Edit appointment"
          aria-label="Edit appointment"
          className="w-9 h-9 rounded-full border border-[#c4c7c5] bg-[#f0f4f9] hover:bg-[#e1e3e1] flex items-center justify-center text-[#444746] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
      </div>

      {/* Google Calendar 24-Color Grid (3 Rows) */}
      <div className="flex flex-col gap-1.5 px-1 mb-3">
        {/* Row 1: 9 Colors */}
        <div className="flex items-center justify-between">
          {row1.map((color) => {
            const isSelected = currentColor === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={(e) => handleColorClick(e, color.id)}
                title={color.name}
                aria-label={color.name}
                style={{ backgroundColor: color.hex }}
                className="w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-125 cursor-pointer shadow-xs focus:outline-hidden relative"
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 drop-shadow-xs"
                    style={{ color: color.textColor }}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Row 2: 9 Colors */}
        <div className="flex items-center justify-between">
          {row2.map((color) => {
            const isSelected = currentColor === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={(e) => handleColorClick(e, color.id)}
                title={color.name}
                aria-label={color.name}
                style={{ backgroundColor: color.hex }}
                className="w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-125 cursor-pointer shadow-xs focus:outline-hidden relative"
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 drop-shadow-xs"
                    style={{ color: color.textColor }}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Row 3: 6 Colors */}
        <div className="flex items-center gap-[9.5px]">
          {row3.map((color) => {
            const isSelected = currentColor === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={(e) => handleColorClick(e, color.id)}
                title={color.name}
                aria-label={color.name}
                style={{ backgroundColor: color.hex }}
                className="w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-125 cursor-pointer shadow-xs focus:outline-hidden relative"
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 drop-shadow-xs"
                    style={{ color: color.textColor }}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Pill: Default Button */}
      <button
        type="button"
        onClick={handleDefaultClick}
        className="w-full py-2 px-4 rounded-xl bg-[#dde3ea] hover:bg-[#d2d8e0] transition-colors flex items-center justify-center gap-2 cursor-pointer text-[#444746] text-sm font-medium"
      >
        {isDefault && (
          <span className="w-4 h-4 rounded-full bg-[#0b57d0] flex items-center justify-center text-white shrink-0">
            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </span>
        )}
        <span>Default</span>
      </button>
    </div>,
    document.body
  );
};

export default EventContextMenu;
