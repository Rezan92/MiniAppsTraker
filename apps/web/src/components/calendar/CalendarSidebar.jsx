import React, { useState } from 'react';
import { MiniCalendar } from './MiniCalendar';

const STATUS_ITEMS = [
  { id: 'scheduled', label: 'Scheduled', color: '#2563eb', bgCheck: 'bg-blue-600' },
  { id: 'in_progress', label: 'In Progress', color: '#d97706', bgCheck: 'bg-amber-600' },
  { id: 'completed', label: 'Completed', color: '#059669', bgCheck: 'bg-emerald-600' },
  { id: 'cancelled', label: 'Cancelled', color: '#dc2626', bgCheck: 'bg-rose-600' }
];

export const CalendarSidebar = ({
  open,
  selectedDate,
  onSelectDate,
  onOpenCreate,
  activeStatuses = ['scheduled', 'in_progress', 'completed'],
  onToggleStatus
}) => {
  const [calendarsSectionOpen, setCalendarsSectionOpen] = useState(true);

  return (
    <aside
      className={`shrink-0 overflow-hidden transition-all duration-300 ease-in-out select-none ${
        open
          ? 'w-[256px] opacity-100 mr-4'
          : 'w-0 opacity-0 mr-0 pointer-events-none'
      }`}
    >
      <div className="w-[256px] flex flex-col">
        {/* Google-Style "+ Create" Pill Button */}
        <div className="py-2 mb-2">
        <button
          type="button"
          onClick={onOpenCreate}
          className="flex items-center gap-3 px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-full shadow-md hover:shadow-lg border border-gray-200 transition-all cursor-pointer active:scale-95 duration-150"
        >
          {/* Google Plus Icon */}
          <svg className="w-6 h-6 shrink-0" viewBox="0 0 36 36">
            <path fill="#4285F4" d="M16 16v14h4V20z"></path>
            <path fill="#34A853" d="M30 16H20l-4 4h14z"></path>
            <path fill="#FBBC05" d="M6 16h10l4-4H6z"></path>
            <path fill="#EA4335" d="M20 16V6h-4v10z"></path>
          </svg>
          <span className="text-sm font-semibold tracking-wide">Create</span>
        </button>
      </div>

      {/* Mini Month Calendar Datepicker */}
      <div className="mb-4">
        <MiniCalendar
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />
      </div>

      {/* "My Calendars" / Status Filter Accordion Section */}
      <div className="border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={() => setCalendarsSectionOpen(prev => !prev)}
          className="w-full flex items-center justify-between py-2 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <span>My Calendars</span>
          <span className={`material-symbols-outlined text-base transition-transform duration-200 ${calendarsSectionOpen ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {calendarsSectionOpen && (
          <div className="mt-1 space-y-1">
            {STATUS_ITEMS.map((item) => {
              const isChecked = activeStatuses.includes(item.id);

              return (
                <label
                  key={item.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-100/70 transition-colors cursor-pointer text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleStatus?.(item.id)}
                    className="sr-only"
                  />
                  {/* Custom Colored Checkbox Swatch */}
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                      isChecked ? item.bgCheck : 'border-2 border-gray-300 bg-white'
                    }`}
                  >
                    {isChecked && (
                      <span className="material-symbols-outlined text-white text-xs font-bold">
                        check
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-800">
                    {item.label}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </aside>
  );
};
