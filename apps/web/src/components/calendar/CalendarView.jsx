import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react';
import {
  createViewMonthGrid,
  createViewWeek,
  createViewDay
} from '@schedule-x/calendar';
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop';
import { createResizePlugin } from '@schedule-x/resize';
import { createCurrentTimePlugin } from '@schedule-x/current-time';
import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls';
import '@schedule-x/theme-default/dist/index.css';
import { Temporal } from 'temporal-polyfill';

import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment
} from '../../hooks/api/useAppointments';
import { AddAppointmentModal } from './AddAppointmentModal';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { CalendarSidebar } from './CalendarSidebar';

// Converts an appointment DB record to Schedule-X v4 event with Temporal objects
function toScheduleXEvent(apt, timezone) {
  if (!apt || !apt.start_time) return null;
  try {
    const isAllDay = !!apt.all_day;
    let start;
    let end;

    if (isAllDay) {
      const startDateStr = String(apt.start_time).split('T')[0];
      const endDateStr = apt.end_time ? String(apt.end_time).split('T')[0] : startDateStr;
      start = Temporal.PlainDate.from(startDateStr);
      end = Temporal.PlainDate.from(endDateStr);
    } else {
      const startMs = new Date(apt.start_time).getTime();
      if (isNaN(startMs)) return null;
      const endMs = apt.end_time ? new Date(apt.end_time).getTime() : startMs + 60 * 60 * 1000;
      start = Temporal.Instant.fromEpochMilliseconds(startMs).toZonedDateTimeISO(timezone);
      end = Temporal.Instant.fromEpochMilliseconds(endMs).toZonedDateTimeISO(timezone);
    }

    // Dynamic color tag fallback based on status if not specified
    let calendarId = apt.color_tag;
    if (!calendarId) {
      if (apt.status === 'in_progress') calendarId = 'amber';
      else if (apt.status === 'completed') calendarId = 'green';
      else if (apt.status === 'cancelled') calendarId = 'red';
      else calendarId = 'blue';
    }

    return {
      id: String(apt.id),
      title: apt.title || 'Untitled',
      start,
      end,
      calendarId,
      _raw: apt
    };
  } catch (err) {
    console.error('Failed to convert appointment to Schedule-X format:', apt, err);
    return null;
  }
}

// Converts a Schedule-X date/time (Temporal object or string) to an ISO 8601 string, preserving original hours in date-only contexts
function parseScheduleXToIso(val, originalIso = null) {
  if (!val) return '';
  try {
    if (typeof val === 'object' && val !== null) {
      if (typeof val.toInstant === 'function') {
        return val.toInstant().toString();
      }
      const str = typeof val.toString === 'function' ? val.toString() : String(val);
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        if (originalIso) {
          const origDate = new Date(originalIso);
          const [y, m, d] = str.split('-').map(Number);
          const combined = new Date(origDate);
          combined.setFullYear(y, m - 1, d);
          return combined.toISOString();
        }
        return new Date(`${str}T00:00:00`).toISOString();
      }
      return new Date(str).toISOString();
    }
    if (typeof val === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        if (originalIso) {
          const origDate = new Date(originalIso);
          const [y, m, d] = val.split('-').map(Number);
          const combined = new Date(origDate);
          combined.setFullYear(y, m - 1, d);
          return combined.toISOString();
        }
        return new Date(`${val}T00:00:00`).toISOString();
      }
      if (val.includes(' ')) {
        const [date, time] = val.split(' ');
        return new Date(`${date}T${time}:00`).toISOString();
      }
      return new Date(val).toISOString();
    }
    return new Date(val).toISOString();
  } catch (err) {
    console.error('Failed to parse Schedule-X value to ISO:', val, err);
    return '';
  }
}

const VIEW_LABELS = {
  day: 'Day',
  week: 'Week',
  'month-grid': 'Month'
};

export const CalendarView = () => {
  const [calendarSidebarOpen, setCalendarSidebarOpen] = useState(true);
  const [activeStatuses, setActiveStatuses] = useState(['scheduled', 'in_progress', 'completed']);
  const [currentView, setCurrentView] = useState('week');
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [currentRange, setCurrentRange] = useState(null);

  const userTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    []
  );

  const todayPlainDate = useMemo(
    () => Temporal.Now.plainDateISO(userTimezone),
    [userTimezone]
  );

  const [selectedDateStr, setSelectedDateStr] = useState(() => todayPlainDate.toString());

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [clickedDate, setClickedDate] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);

  const viewDropdownRef = useRef(null);
  const isCancelledByEscape = useRef(false);

  // TanStack Queries & Mutations (fetch all workspace appointments, filter locally)
  const { data: appointments = [], isLoading } = useAppointments();
  const createAppointmentMutation = useCreateAppointment();
  const updateAppointmentMutation = useUpdateAppointment();
  const deleteAppointmentMutation = useDeleteAppointment();

  // Dynamic callbacks ref to prevent stale closures
  const callbacksRef = useRef({});
  callbacksRef.current = {
    onBeforeEventUpdate: (oldEvent, newEvent) => {
      if (isCancelledByEscape.current) {
        isCancelledByEscape.current = false;
        return false; // Abort drag/resize and restore original event position
      }
      return true;
    },
    onEventUpdate: (updatedEvent) => {
      const originalApt = appointments.find(a => String(a.id) === String(updatedEvent.id));
      const origStartIso = originalApt?.start_time || null;
      const origEndIso = originalApt?.end_time || null;

      const newStartIso = parseScheduleXToIso(updatedEvent.start, origStartIso);
      let newEndIso = parseScheduleXToIso(updatedEvent.end, origEndIso);

      // Defensively ensure end_time > start_time preserving original duration
      if (newStartIso && (!newEndIso || newEndIso <= newStartIso)) {
        if (origStartIso && origEndIso) {
          const originalDurationMs = new Date(origEndIso).getTime() - new Date(origStartIso).getTime();
          newEndIso = new Date(new Date(newStartIso).getTime() + (originalDurationMs > 0 ? originalDurationMs : 3600000)).toISOString();
        } else {
          newEndIso = new Date(new Date(newStartIso).getTime() + 3600000).toISOString();
        }
      }

      updateAppointmentMutation.mutate({
        id: updatedEvent.id,
        start_time: newStartIso,
        end_time: newEndIso
      });
    },
    onEventClick: (calendarEvent) => {
      const apt = appointments.find(a => String(a.id) === String(calendarEvent.id)) || calendarEvent._raw;
      if (apt) {
        setSelectedAppointment(apt);
        setDetailsModalOpen(true);
      }
    },
    onClickDate: (date) => {
      const dateStr = date ? (typeof date.toString === 'function' ? date.toString() : String(date)) : null;
      setClickedDate(dateStr);
      setEditingAppointment(null);
      setAddModalOpen(true);
    },
    onClickDateTime: (dateTime) => {
      const dtStr = dateTime ? (typeof dateTime.toString === 'function' ? dateTime.toString() : String(dateTime)) : null;
      setClickedDate(dtStr);
      setEditingAppointment(null);
      setAddModalOpen(true);
    },
    onRangeUpdate: (range) => {
      setCurrentRange(range);
    },
    onSelectedDateUpdate: (date) => {
      const dStr = date ? (typeof date.toString === 'function' ? date.toString() : String(date)) : null;
      if (dStr) {
        setSelectedDateStr(dStr);
      }
    }
  };

  // Color mappings for Schedule-X
  const calendars = useMemo(() => ({
    blue: {
      colorName: 'blue',
      lightColors: { main: '#1a73e8', container: '#e8f0fe', onContainer: '#1967d2' },
      darkColors: { main: '#8ab4f8', container: '#174ea6', onContainer: '#e8f0fe' },
    },
    amber: {
      colorName: 'amber',
      lightColors: { main: '#f29900', container: '#fef7e0', onContainer: '#b06000' },
      darkColors: { main: '#fdd663', container: '#7c4d00', onContainer: '#feefe3' },
    },
    green: {
      colorName: 'green',
      lightColors: { main: '#188038', container: '#e6f4ea', onContainer: '#137333' },
      darkColors: { main: '#81c995', container: '#0d652d', onContainer: '#e6f4ea' },
    },
    purple: {
      colorName: 'purple',
      lightColors: { main: '#a142f4', container: '#f3e8fd', onContainer: '#8430ce' },
      darkColors: { main: '#c58af9', container: '#681da8', onContainer: '#f3e8fd' },
    },
    red: {
      colorName: 'red',
      lightColors: { main: '#d93025', container: '#fce8e6', onContainer: '#c5221f' },
      darkColors: { main: '#f28b82', container: '#a50e0e', onContainer: '#fce8e6' },
    },
    indigo: {
      colorName: 'indigo',
      lightColors: { main: '#3f51b5', container: '#e8eaf6', onContainer: '#283593' },
      darkColors: { main: '#7986cb', container: '#1a237e', onContainer: '#e8eaf6' },
    },
    gray: {
      colorName: 'gray',
      lightColors: { main: '#5f6368', container: '#f1f3f4', onContainer: '#3c4043' },
      darkColors: { main: '#9aa0a6', container: '#3c4043', onContainer: '#f1f3f4' },
    }
  }), []);

  // Initialize plugins with Schedule-X v4 API compatibility bridge
  const dragAndDropPlugin = useMemo(() => {
    const plugin = createDragAndDropPlugin(15);
    // Bridge Schedule-X v4 calendar core method names to drag-and-drop plugin
    if (plugin && typeof plugin.createTimeGridDragHandler === 'function') {
      plugin.startTimeGridDrag = plugin.createTimeGridDragHandler.bind(plugin);
    }
    if (plugin && typeof plugin.createDateGridDragHandler === 'function') {
      plugin.startDateGridDrag = plugin.createDateGridDragHandler.bind(plugin);
    }
    if (plugin && typeof plugin.createMonthGridDragHandler === 'function') {
      plugin.startMonthGridDrag = plugin.createMonthGridDragHandler.bind(plugin);
    }
    return plugin;
  }, []);
  const resizePlugin = useMemo(() => createResizePlugin(15), []);
  const currentTimePlugin = useMemo(() => createCurrentTimePlugin(), []);
  const calendarControlsPlugin = useMemo(() => createCalendarControlsPlugin(), []);

  const plugins = useMemo(
    () => [dragAndDropPlugin, resizePlugin, currentTimePlugin, calendarControlsPlugin],
    [dragAndDropPlugin, resizePlugin, currentTimePlugin, calendarControlsPlugin]
  );

  // Initialize Schedule-X instance
  const calendar = useCalendarApp({
    views: [createViewWeek(), createViewMonthGrid(), createViewDay()],
    defaultView: 'week',
    timezone: userTimezone,
    calendars,
    callbacks: {
      onBeforeEventUpdate: (oldEvent, newEvent, $app) => callbacksRef.current.onBeforeEventUpdate?.(oldEvent, newEvent, $app),
      onEventUpdate: (event) => callbacksRef.current.onEventUpdate?.(event),
      onEventClick: (event) => callbacksRef.current.onEventClick?.(event),
      onClickDate: (date) => callbacksRef.current.onClickDate?.(date),
      onClickDateTime: (dateTime) => callbacksRef.current.onClickDateTime?.(dateTime),
      onRangeUpdate: (range) => callbacksRef.current.onRangeUpdate?.(range),
      onSelectedDateUpdate: (date) => callbacksRef.current.onSelectedDateUpdate?.(date)
    }
  }, plugins);

  // In-memory status filtering
  const filteredAppointments = useMemo(() => {
    if (!appointments || !Array.isArray(appointments)) return [];
    return appointments.filter(apt => {
      const status = (apt.status || 'scheduled').toLowerCase();
      return activeStatuses.includes(status);
    });
  }, [appointments, activeStatuses]);

  // Sync filtered appointments into Schedule-X
  useEffect(() => {
    if (!calendar?.events) return;
    const sxEvents = filteredAppointments
      .map(apt => toScheduleXEvent(apt, userTimezone))
      .filter(Boolean);
    calendar.events.set(sxEvents);
  }, [calendar, filteredAppointments, userTimezone]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target)) {
        setViewDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  // Escape key abort handler for active drag-and-drop or resize operations
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        const hasActiveDrag = !!document.querySelector(
          '.is-event-copy, [id^="time-grid-event-copy-"], .sx__date-grid-event--copy, .sx__month-grid-day--dragover'
        );
        const hasActiveResize = document.body.style.cursor === 'ns-resize' || document.body.style.cursor === 'ew-resize';

        if (hasActiveDrag || hasActiveResize) {
          e.preventDefault();
          e.stopPropagation();
          isCancelledByEscape.current = true;
          document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Auto-scroll to near current time (or 8 AM) in Day and Week views
  useEffect(() => {
    if (currentView === 'day' || currentView === 'week') {
      const timer = setTimeout(() => {
        const viewContainer = document.querySelector('.sx__view-container');
        if (viewContainer) {
          const now = new Date();
          const hour = now.getHours();
          const targetHour = Math.max(0, hour > 8 ? hour - 1 : 7);
          const targetScroll = (1600 / 24) * targetHour;
          viewContainer.scrollTop = targetScroll;
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  // Programmatic Date Navigation
  const jumpToDate = (targetDate) => {
    try {
      const plainDate = targetDate instanceof Temporal.PlainDate
        ? targetDate
        : Temporal.PlainDate.from(String(targetDate).split('T')[0]);

      calendarControlsPlugin.setDate(plainDate);
      if (calendarControlsPlugin.$app?.calendarState?.setRange) {
        calendarControlsPlugin.$app.calendarState.setRange(plainDate);
      }
      setSelectedDateStr(plainDate.toString());
    } catch (err) {
      console.error('Failed to jump to date:', err);
    }
  };

  const handleJumpToToday = () => {
    const today = Temporal.Now.plainDateISO(userTimezone);
    jumpToDate(today);
  };

  const handlePrevPeriod = () => {
    try {
      let baseDate;
      try {
        baseDate = calendarControlsPlugin.getDate() || Temporal.PlainDate.from(selectedDateStr);
      } catch {
        baseDate = Temporal.Now.plainDateISO(userTimezone);
      }

      let newDate;
      if (currentView === 'day') {
        newDate = baseDate.subtract({ days: 1 });
      } else if (currentView === 'month-grid') {
        newDate = baseDate.subtract({ months: 1 });
      } else {
        newDate = baseDate.subtract({ days: 7 });
      }
      jumpToDate(newDate);
    } catch (err) {
      console.error('Failed to navigate previous period:', err);
    }
  };

  const handleNextPeriod = () => {
    try {
      let baseDate;
      try {
        baseDate = calendarControlsPlugin.getDate() || Temporal.PlainDate.from(selectedDateStr);
      } catch {
        baseDate = Temporal.Now.plainDateISO(userTimezone);
      }

      let newDate;
      if (currentView === 'day') {
        newDate = baseDate.add({ days: 1 });
      } else if (currentView === 'month-grid') {
        newDate = baseDate.add({ months: 1 });
      } else {
        newDate = baseDate.add({ days: 7 });
      }
      jumpToDate(newDate);
    } catch (err) {
      console.error('Failed to navigate next period:', err);
    }
  };

  const handleSelectView = (viewName) => {
    try {
      calendarControlsPlugin.setView(viewName);
      setCurrentView(viewName);
      setViewDropdownOpen(false);
    } catch (err) {
      console.error('Failed to set view:', err);
    }
  };

  const handleSelectDateFromMini = (dateStr) => {
    jumpToDate(dateStr);
  };

  const handleToggleStatus = (statusId) => {
    setActiveStatuses(prev => {
      if (prev.includes(statusId)) {
        return prev.filter(s => s !== statusId);
      }
      return [...prev, statusId];
    });
  };

  const toggleCalendarSidebar = () => {
    setCalendarSidebarOpen(prev => !prev);
    // Dispatch window resize event so Schedule-X recalculates time grid width smoothly
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 320);
  };

  // Dynamic Google Calendar Period Title
  const periodTitle = useMemo(() => {
    try {
      const plainDate = Temporal.PlainDate.from(selectedDateStr);

      if (currentView === 'month-grid') {
        const d = new Date(plainDate.year, plainDate.month - 1, 1);
        return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }

      if (currentView === 'day') {
        const d = new Date(plainDate.year, plainDate.month - 1, plainDate.day);
        return d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }

      // Week view
      if (currentRange && currentRange.start && currentRange.end) {
        const startZoned = currentRange.start;
        const endZoned = currentRange.end;
        const startMonth = new Date(startZoned.year, startZoned.month - 1, 1).toLocaleString('en-US', { month: 'long' });
        const endMonth = new Date(endZoned.year, endZoned.month - 1, 1).toLocaleString('en-US', { month: 'long' });

        if (startZoned.month === endZoned.month && startZoned.year === endZoned.year) {
          return `${startMonth} ${startZoned.year}`;
        } else if (startZoned.year === endZoned.year) {
          return `${startMonth.slice(0, 3)} – ${endMonth.slice(0, 3)} ${startZoned.year}`;
        } else {
          return `${startMonth.slice(0, 3)} ${startZoned.year} – ${endMonth.slice(0, 3)} ${endZoned.year}`;
        }
      }

      const d = new Date(plainDate.year, plainDate.month - 1, plainDate.day);
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'Calendar';
    }
  }, [currentRange, selectedDateStr, currentView]);

  // Modal actions
  const handleOpenNewAppointment = () => {
    setClickedDate(null);
    setEditingAppointment(null);
    setAddModalOpen(true);
  };

  const handleEditAppointment = (apt) => {
    setDetailsModalOpen(false);
    setEditingAppointment(apt);
    setAddModalOpen(true);
  };

  const handleModalSubmit = async (formData) => {
    try {
      if (formData.id) {
        await updateAppointmentMutation.mutateAsync(formData);
      } else {
        await createAppointmentMutation.mutateAsync(formData);
      }
      setAddModalOpen(false);
      setEditingAppointment(null);
    } catch (err) {
      console.error('Failed to submit appointment:', err);
    }
  };

  const handleDeleteAppointment = async (id) => {
    await deleteAppointmentMutation.mutateAsync(id);
    setDetailsModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleUpdateStatus = async (id, status) => {
    await updateAppointmentMutation.mutateAsync({ id, status });
    setSelectedAppointment(prev => prev ? { ...prev, status } : null);
  };

  const todayDayNum = todayPlainDate.day;

  return (
    <div
      className="flex flex-col flex-1 w-full h-full min-h-0 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden select-none"
      data-view={currentView}
    >
      {/* Schedule-X Style Overrides & Google Calendar Theme Styles */}
      <style>{`
        /* Hide default Schedule-X header */
        .sx__calendar-header {
          display: none !important;
        }

        /* Full height and flex chain to guarantee vertical scrolling */
        .sx-react-calendar-wrapper {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 !important;
          min-height: 0 !important;
          overflow: hidden !important;
        }
        .sx__calendar-wrapper {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 !important;
          min-height: 0 !important;
          overflow: hidden !important;
          border: none !important;
        }
        .sx__calendar {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          flex: 1 !important;
          min-height: 0 !important;
          overflow: hidden !important;
          border: none !important;
          background-color: #ffffff !important;
        }
        .sx__view-container {
          flex: 1 !important;
          height: 100% !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          scroll-behavior: smooth !important;
        }

        /* Google Calendar Grid Borders & Typography */
        .sx__week-grid {
          width: 100% !important;
        }
        .sx__week-grid__hour {
          border-top: 1px solid #dadce0 !important;
        }
        .sx__week-grid__hour-text {
          font-size: 11px !important;
          color: #70757a !important;
          font-weight: 500 !important;
        }
        .sx__time-grid-day {
          border-left: 1px solid #dadce0 !important;
        }
        :root,
        .sx__calendar-wrapper,
        .sx__calendar {
          --sx-z-index-week-header: 1 !important;
        }
        .sx__week-header {
          z-index: 1 !important;
          border-bottom: 1px solid #dadce0 !important;
          background-color: #ffffff !important;
        }
        .sx__week-header-border {
          display: none !important;
        }
        .sx__week-grid__day-name {
          font-size: 11px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          color: #70757a !important;
          letter-spacing: 0.5px !important;
        }
        .sx__week-grid__date-number {
          font-size: 22px !important;
          font-weight: 500 !important;
          color: #3c4043 !important;
          width: 36px !important;
          height: 36px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .sx__week-grid__date--is-today .sx__week-grid__day-name {
          color: #1a73e8 !important;
          font-weight: 700 !important;
        }
        .sx__week-grid__date--is-today .sx__week-grid__date-number {
          background-color: #1a73e8 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
        }

        /* Day View: align day header on the left side over the time column */
        .is-day-view .sx__week-grid__date,
        [data-view="day"] .sx__week-grid__date {
          align-items: flex-start !important;
          padding-left: 2rem !important;
        }
        .is-day-view .sx__week-grid__day-name,
        [data-view="day"] .sx__week-grid__day-name {
          padding-left: 4px !important;
          font-size: 11px !important;
          color: #70757a !important;
          font-weight: 600 !important;
          letter-spacing: 0.5px !important;
        }
        .is-day-view .sx__week-grid__date-number,
        [data-view="day"] .sx__week-grid__date-number {
          font-size: 24px !important;
          font-weight: 600 !important;
        }

        /* Month View: Full-width crisp Google Calendar grid */
        .sx__month-grid-wrapper {
          width: 100% !important;
          height: 100% !important;
          background-color: #ffffff !important;
          border: none !important;
        }
        .sx__month-grid-week {
          border-top: 1px solid #dadce0 !important;
          min-height: 0 !important;
          flex: 1 !important;
        }
        .sx__month-grid-day {
          border-inline-end: 1px solid #dadce0 !important;
          padding: 6px 4px !important;
          transition: background-color 0.15s ease !important;
        }
        .sx__month-grid-day:hover {
          background-color: #f8fafd !important;
        }
        .sx__month-grid-day__header-day-name {
          font-size: 11px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          color: #70757a !important;
          letter-spacing: 0.5px !important;
          margin-bottom: 2px !important;
        }
        .sx__month-grid-day__header-date {
          font-size: 12px !important;
          font-weight: 500 !important;
          color: #3c4043 !important;
          width: 24px !important;
          height: 24px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin-bottom: 4px !important;
        }
        .sx__month-grid-day__header-date.sx__is-today {
          background-color: #1a73e8 !important;
          color: #ffffff !important;
          font-weight: 700 !important;
        }
        .sx__month-grid-event {
          border-radius: 4px !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          padding: 2px 6px !important;
          margin-bottom: 2px !important;
          box-shadow: 0 1px 2px rgba(60, 64, 67, 0.1) !important;
        }

        /* Live Current Time Red Indicator Line */
        .sx__current-time-indicator {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #ea4335;
          z-index: 25;
          pointer-events: none;
        }
        .sx__current-time-indicator::before {
          content: '';
          position: absolute;
          left: -5px;
          top: -4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #ea4335;
          box-shadow: 0 0 3px rgba(234, 67, 53, 0.4);
        }

        /* Event Hover & Pointer Cursor */
        .sx__time-grid-event,
        .sx__date-grid-event,
        .sx__month-grid-event,
        .sx__list-event,
        .sx__event,
        .sx__month-grid-day__events-more {
          cursor: pointer !important;
          transition: filter 0.15s ease, box-shadow 0.15s ease !important;
        }
        .sx__time-grid-event:hover,
        .sx__date-grid-event:hover,
        .sx__month-grid-event:hover,
        .sx__list-event:hover,
        .sx__month-grid-day__events-more:hover {
          filter: brightness(0.95) !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
        }

        /* Dragging & Resizing Visual Polish */
        /* 1. Dragged copy event card styling */
        .sx__time-grid-event.is-event-copy,
        .sx__date-grid-event.sx__date-grid-event--copy,
        [id^="time-grid-event-copy-"] {
          opacity: 0.95 !important;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.12) !important;
          cursor: grabbing !important;
          z-index: 50 !important;
          transition: none !important;
        }

        /* 2. Ghost placeholder in the original slot */
        body:has(.is-event-copy) .sx__time-grid-event:not(.is-event-copy),
        body:has([id^="time-grid-event-copy-"]) .sx__time-grid-event:not([id^="time-grid-event-copy-"]) {
          opacity: 0.35 !important;
          filter: grayscale(0.5) !important;
          border: 2px dashed #94a3b8 !important;
        }

        /* 3. Month grid day dragover highlight */
        .sx__month-grid-day--dragover {
          background-color: #e8f0fe !important;
          outline: 2px dashed #1a73e8 !important;
          outline-offset: -2px !important;
        }

        /* 4. Event Resize Drag Handles with Grip Indicator */
        .sx__time-grid-event-resize-handle {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 8px;
          cursor: ns-resize !important;
          z-index: 15;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.15s ease;
        }
        .sx__time-grid-event:hover .sx__time-grid-event-resize-handle {
          background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.1));
        }
        .sx__time-grid-event-resize-handle::after {
          content: '';
          width: 24px;
          height: 2px;
          border-radius: 1px;
          background-color: rgba(0, 0, 0, 0.35);
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .sx__time-grid-event:hover .sx__time-grid-event-resize-handle::after {
          opacity: 1;
        }
        .sx__date-grid-event-resize-handle {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          width: 8px;
          cursor: ew-resize !important;
          z-index: 15;
        }
      `}</style>

      {/* Google Calendar Top Navigation Header Bar */}
      <header className="h-16 border-b border-gray-200 bg-white px-4 flex items-center justify-between shrink-0 relative z-20">
        {/* Left cluster: Hamburger, Badge, Today, < >, Dynamic Period */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={toggleCalendarSidebar}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
            aria-label="Toggle calendar sidebar"
            title={calendarSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>

          {/* Calendar Badge */}
          <div className="flex items-center gap-2.5 mr-2">
            <div className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex flex-col items-center justify-center shadow-xs overflow-hidden">
              <div className="w-full h-2.5 bg-blue-600"></div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600 leading-none">
                  {todayDayNum}
                </span>
              </div>
            </div>
            <span className="text-xl font-semibold text-gray-800 tracking-tight hidden sm:inline">
              Calendar
            </span>
          </div>

          {/* Today Button */}
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Today
          </button>

          {/* Previous / Next Chevrons */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={handlePrevPeriod}
              aria-label="Previous period"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={handleNextPeriod}
              aria-label="Next period"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>

          {/* Period Title */}
          <h2 className="text-base sm:text-xl font-semibold text-gray-800 tracking-tight truncate max-w-[180px] sm:max-w-none">
            {periodTitle}
          </h2>
        </div>

        {/* Right cluster: Loading indicator, View Dropdown, New Appointment */}
        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="hidden md:flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
              Syncing
            </div>
          )}

          {/* View Selector Dropdown */}
          <div className="relative z-30" ref={viewDropdownRef}>
            <button
              type="button"
              onClick={() => setViewDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span>{VIEW_LABELS[currentView] || 'Week'}</span>
              <span className="material-symbols-outlined text-base">expand_more</span>
            </button>

            {viewDropdownOpen && (
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-30">
                <button
                  type="button"
                  onClick={() => handleSelectView('day')}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                    currentView === 'day' ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-gray-700'
                  }`}
                >
                  <span>Day</span>
                  {currentView === 'day' && <span className="material-symbols-outlined text-sm">check</span>}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectView('week')}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                    currentView === 'week' ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-gray-700'
                  }`}
                >
                  <span>Week</span>
                  {currentView === 'week' && <span className="material-symbols-outlined text-sm">check</span>}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectView('month-grid')}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                    currentView === 'month-grid' ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-gray-700'
                  }`}
                >
                  <span>Month</span>
                  {currentView === 'month-grid' && <span className="material-symbols-outlined text-sm">check</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Calendar Body: Collapsible Sidebar + Calendar Viewport */}
      <div className="flex-1 flex overflow-hidden relative p-3 gap-3 min-h-0 z-0">
        {/* Collapsible Left Sidebar */}
        <CalendarSidebar
          open={calendarSidebarOpen}
          selectedDate={selectedDateStr}
          onSelectDate={handleSelectDateFromMini}
          onOpenCreate={handleOpenNewAppointment}
          activeStatuses={activeStatuses}
          onToggleStatus={handleToggleStatus}
        />

        {/* Main Calendar Viewport Wrapper */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col relative min-h-0">
          {/* Floating "+ Create" FAB Button in Collapsed Mode */}
          {!calendarSidebarOpen && (
            <button
              type="button"
              onClick={handleOpenNewAppointment}
              title="Create appointment"
              className="absolute top-3 left-3 z-30 flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-full shadow-md hover:shadow-lg border border-gray-200 transition-all cursor-pointer active:scale-95 duration-150"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 36 36">
                <path fill="#4285F4" d="M16 16v14h4V20z"></path>
                <path fill="#34A853" d="M30 16H20l-4 4h14z"></path>
                <path fill="#FBBC05" d="M6 16h10l4-4H6z"></path>
                <path fill="#EA4335" d="M20 16V6h-4v10z"></path>
              </svg>
              <span className="text-sm font-semibold tracking-wide hidden sm:inline">Create</span>
            </button>
          )}

          {/* Schedule-X Calendar Canvas */}
          <div className="flex-1 w-full h-full min-h-0 overflow-hidden flex flex-col">
            <ScheduleXCalendar calendarApp={calendar} />
          </div>
        </div>
      </div>

      {/* Creation / Edit Modal */}
      <AddAppointmentModal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setEditingAppointment(null);
        }}
        onSubmit={handleModalSubmit}
        initialData={editingAppointment}
        defaultDate={clickedDate}
      />

      {/* Details & Quick Action Inspection Modal */}
      <AppointmentDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onEdit={handleEditAppointment}
        onDelete={handleDeleteAppointment}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};

export default CalendarView;
