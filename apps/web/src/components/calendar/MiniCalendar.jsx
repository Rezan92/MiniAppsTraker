import React, { useState, useEffect, useMemo } from 'react';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const str = typeof dateStr === 'string' ? dateStr : (dateStr.toString ? dateStr.toString() : '');
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

export const MiniCalendar = ({ selectedDate, onSelectDate }) => {
  const [viewDate, setViewDate] = useState(() => parseLocalDate(selectedDate));

  // Sync viewDate when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewDate(parseLocalDate(selectedDate));
    }
  }, [selectedDate]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const todayStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const selectedStr = useMemo(() => {
    if (!selectedDate) return '';
    if (typeof selectedDate === 'string') return selectedDate.split('T')[0];
    if (selectedDate.toString) return selectedDate.toString().split('T')[0];
    return '';
  }, [selectedDate]);

  // Generate calendar day cells
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        monthOffset: -1
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        monthOffset: 0
      });
    }

    // Next month leading days (fill up to multiple of 7, either 35 or 42)
    const remaining = (7 - (cells.length % 7)) % 7;
    const totalSlots = cells.length + remaining < 35 ? 35 : cells.length + remaining;
    const extraNeeded = totalSlots - cells.length;

    for (let d = 1; d <= extraNeeded; d++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: false,
        monthOffset: 1
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handleCellClick = (cell) => {
    if (cell.monthOffset !== 0) {
      setViewDate(new Date(viewYear, viewMonth + cell.monthOffset, 1));
    }
    onSelectDate?.(cell.dateStr);
  };

  const monthName = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full select-none py-2">
      {/* Month & Chevrons Navigation Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm font-semibold text-gray-800 tracking-tight">
          {monthName}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {DAYS_OF_WEEK.map((d, i) => (
          <div key={i} className="text-[11px] font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarCells.map((cell) => {
          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedStr && !isToday;

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => handleCellClick(cell)}
              className={`w-7 h-7 mx-auto flex items-center justify-center text-xs rounded-full transition-all cursor-pointer font-medium ${
                isToday
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : isSelected
                  ? 'bg-blue-100 text-blue-800 font-bold'
                  : cell.isCurrentMonth
                  ? 'text-gray-800 hover:bg-gray-100'
                  : 'text-gray-300 hover:bg-gray-50'
              }`}
            >
              {cell.dayNum}
            </button>
          );
        })}
      </div>
    </div>
  );
};
