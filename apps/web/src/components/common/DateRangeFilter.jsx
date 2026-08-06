import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toDateStr = (d) => {
  if (!d) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (a, b) => a && b && toDateStr(a) === toDateStr(b);
const isInRange = (day, start, end) => {
  if (!start || !end) return false;
  const t = day.getTime();
  return t > start.getTime() && t < end.getTime();
};

// Generate a range of years around the current year
const getYearRange = () => {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current - 10; y <= current + 5; y++) {
    years.push(y);
  }
  return years;
};

export const DateRangeFilter = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [pickStart, setPickStart] = useState(null);
  const [pickEnd, setPickEnd] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const ref = useRef(null);

  // Sync internal state when value changes externally
  useEffect(() => {
    if (value?.startDate) {
      const [y, m, d] = value.startDate.split('-');
      setPickStart(new Date(y, m - 1, d));
    } else setPickStart(null);
    if (value?.endDate) {
      const [y, m, d] = value.endDate.split('-');
      setPickEnd(new Date(y, m - 1, d));
    } else setPickEnd(null);
  }, [value?.startDate, value?.endDate]);

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = dropdownRef.current ? dropdownRef.current.offsetHeight : 340;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      let top = rect.bottom + window.scrollY + 8;
      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        top = rect.top + window.scrollY - dropdownHeight - 8;
      }

      setCoords({
        top,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

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
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleDayClick = (day) => {
    if (!pickStart || (pickStart && pickEnd)) {
      setPickStart(day);
      setPickEnd(null);
    } else {
      if (day < pickStart) {
        setPickEnd(pickStart);
        setPickStart(day);
      } else {
        setPickEnd(day);
      }
    }
  };

  const handleMonthSelect = (m) => {
    setViewDate(new Date(year, m, 1));
    setShowMonthYearPicker(false);
  };

  const handleYearChange = (newYear) => {
    setViewDate(new Date(newYear, month, 1));
  };

  const handleApply = () => {
    onChange({
      startDate: pickStart ? toDateStr(pickStart) : null,
      endDate: pickEnd ? toDateStr(pickEnd) : null,
    });
    setIsOpen(false);
    setShowMonthYearPicker(false);
  };

  const handleClear = () => {
    setPickStart(null);
    setPickEnd(null);
    onChange({ startDate: null, endDate: null });
    setIsOpen(false);
    setShowMonthYearPicker(false);
  };

  // For hover preview
  const effectiveEnd = pickEnd || hoverDate;
  const rangeStart = pickStart && effectiveEnd && effectiveEnd < pickStart ? effectiveEnd : pickStart;
  const rangeEnd = pickStart && effectiveEnd && effectiveEnd < pickStart ? pickStart : effectiveEnd;

  const formatDisplay = () => {
    if (value?.startDate && value?.endDate) {
      const [sY, sM, sD] = value.startDate.split('-');
      const [eY, eM, eD] = value.endDate.split('-');
      return `${parseInt(sM)}/${parseInt(sD)}/${sY} - ${parseInt(eM)}/${parseInt(eD)}/${eY}`;
    }
    return '';
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-9 w-9" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month, d);
    const isStart = isSameDay(day, rangeStart);
    const isEnd = isSameDay(day, rangeEnd);
    const inRange = isInRange(day, rangeStart, rangeEnd);
    const isToday = isSameDay(day, new Date());

    let bgClass = 'hover:bg-gray-100';
    let textClass = 'text-gray-700';
    let ringClass = '';

    if (isStart || isEnd) {
      bgClass = 'bg-amber-500';
      textClass = 'text-white';
      ringClass = 'ring-2 ring-amber-500 ring-offset-1';
    } else if (inRange) {
      bgClass = 'bg-amber-100';
      textClass = 'text-amber-900';
    } else if (isToday) {
      ringClass = 'ring-1 ring-gray-300';
    }

    cells.push(
      <button
        key={d}
        type="button"
        onClick={() => handleDayClick(day)}
        onMouseEnter={() => setHoverDate(day)}
        onMouseLeave={() => setHoverDate(null)}
        className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors cursor-pointer ${bgClass} ${textClass} ${ringClass}`}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="relative w-full sm:w-72 z-20">
      {/* Input Trigger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { setIsOpen(!isOpen); setShowMonthYearPicker(false); }}
        className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow cursor-pointer"
      >
        <span className={formatDisplay() ? 'text-gray-900' : 'text-gray-400'}>
          {formatDisplay() || 'Select date range'}
        </span>
        <span className="material-symbols-outlined text-gray-400 text-xl">calendar_today</span>
      </button>

      {/* Calendar Dropdown */}
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          style={{ top: coords.top, left: coords.left, position: 'absolute' }}
          className="w-[320px] bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-[9999]"
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
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-gray-500 text-xl">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-gray-500 text-xl">chevron_right</span>
                </button>
              </div>
            )}
          </div>

          {showMonthYearPicker ? (
            /* Month & Year Picker View */
            <div>
              {/* Year Selector */}
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  type="button"
                  onClick={() => handleYearChange(year - 1)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-gray-500 text-xl">chevron_left</span>
                </button>
                <span className="text-sm font-bold text-gray-900">{year}</span>
                <button
                  type="button"
                  onClick={() => handleYearChange(year + 1)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
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
                      idx === month
                        ? 'bg-amber-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Calendar Day View */
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS.map((d, i) => (
                  <div key={i} className="h-9 w-9 flex items-center justify-center text-xs font-medium text-gray-400">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-1">
                {cells}
              </div>
            </>
          )}

          {/* Footer Buttons */}
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
              onClick={handleApply}
              disabled={!pickStart}
              className="px-4 py-1.5 text-sm font-semibold bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  );
};
