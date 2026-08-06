import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toDateStr = (d) => {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (a, b) => a && b && toDateStr(a) === toDateStr(b);

const formatForDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}/${y}`;
};

export const DatePicker = ({ value, onChange, placeholder = 'Select date', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Sync viewDate when value changes
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      setViewDate(new Date(y, m - 1, d));
    }
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(e.target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(e.target);
      
      if (isOutsideButton && isOutsideDropdown) {
        setIsOpen(false);
        setShowMonthYearPicker(false);
      }
    };
    document.addEventListener('mousedown', handler, true); // Use capture phase
    return () => document.removeEventListener('mousedown', handler, true);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleDayClick = (day) => {
    onChange(toDateStr(day));
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    onChange(toDateStr(today));
    setViewDate(today);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const handleMonthSelect = (m) => {
    setViewDate(new Date(year, m, 1));
    setShowMonthYearPicker(false);
  };

  const handleYearChange = (newYear) => {
    setViewDate(new Date(newYear, month, 1));
  };

  const selectedDate = value ? (() => {
    const [y, m, d] = value.split('-');
    return new Date(y, m - 1, d);
  })() : null;

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-9 w-9" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month, d);
    const isSelected = isSameDay(day, selectedDate);
    const isToday = isSameDay(day, new Date());

    let bgClass = 'hover:bg-gray-100';
    let textClass = 'text-gray-700';
    let ringClass = '';

    if (isSelected) {
      bgClass = 'bg-amber-500';
      textClass = 'text-white';
      ringClass = 'ring-2 ring-amber-500 ring-offset-1';
    } else if (isToday) {
      ringClass = 'ring-1 ring-gray-300';
    }

    cells.push(
      <button
        key={d}
        type="button"
        onClick={() => handleDayClick(day)}
        className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors cursor-pointer ${bgClass} ${textClass} ${ringClass}`}
      >
        {d}
      </button>
    );
  }

  return (
    <div className={`relative w-full z-20 ${className}`}>
      {/* Input Trigger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { setIsOpen(!isOpen); setShowMonthYearPicker(false); }}
        className="w-full flex items-center justify-between px-3 py-2 border border-outline-variant rounded-md bg-surface text-sm text-on-surface shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow cursor-pointer"
      >
        <span className={value ? 'text-on-surface' : 'text-on-surface-variant/50'}>
          {value ? formatForDisplay(value) : placeholder}
        </span>
        <span className="material-symbols-outlined text-on-surface-variant text-xl">calendar_today</span>
      </button>

      {/* Calendar Dropdown */}
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          style={{ top: coords.top, left: coords.left, position: 'absolute' }}
          className="w-[300px] bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-[9999]"
        >
          {/* Month/Year Nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setShowMonthYearPicker(!showMonthYearPicker)}
              className="flex items-center gap-1 text-sm font-semibold text-gray-900 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              {MONTHS[month]} {year}
              <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '16px' }}>
                {showMonthYearPicker ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {!showMonthYearPicker && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={prevMonth} className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-gray-500 text-xl">chevron_left</span>
                </button>
                <button type="button" onClick={nextMonth} className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-gray-500 text-xl">chevron_right</span>
                </button>
              </div>
            )}
          </div>

          {showMonthYearPicker ? (
            <div>
              {/* Year Selector */}
              <div className="flex items-center justify-between mb-3 px-1">
                <button type="button" onClick={() => handleYearChange(year - 1)} className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-gray-500 text-xl">chevron_left</span>
                </button>
                <span className="text-sm font-bold text-gray-900">{year}</span>
                <button type="button" onClick={() => handleYearChange(year + 1)} className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-gray-500 text-xl">chevron_right</span>
                </button>
              </div>
              {/* Month Grid */}
              <div className="grid grid-cols-3 gap-2">
                {MONTHS_SHORT.map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMonthSelect(idx)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      idx === month ? 'bg-amber-500 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS.map((d, i) => (
                  <div key={i} className="h-9 w-9 flex items-center justify-center text-xs font-medium text-gray-400">{d}</div>
                ))}
              </div>
              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-1">
                {cells}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-4 py-1.5 text-sm font-semibold bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  );
};
