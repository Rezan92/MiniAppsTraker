import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react';
import {
  createViewMonthGrid,
  createViewWeek,
  createViewDay
} from '@schedule-x/calendar';
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop';
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

    return {
      id: String(apt.id),
      title: apt.title || 'Untitled',
      start,
      end,
      calendarId: apt.color_tag || 'blue',
      _raw: apt
    };
  } catch (err) {
    console.error('Failed to convert appointment to Schedule-X format:', apt, err);
    return null;
  }
}

// Converts a Schedule-X date/time (Temporal object or string) to an ISO 8601 string
function fromScheduleXFormat(val) {
  if (!val) return '';
  try {
    if (typeof val === 'object' && val !== null) {
      if (typeof val.toInstant === 'function') {
        return val.toInstant().toString();
      }
      if (typeof val.toString === 'function') {
        const str = val.toString();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return new Date(`${str}T00:00:00`).toISOString();
        }
        return new Date(str).toISOString();
      }
    }
    if (typeof val === 'string') {
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

const STATUS_FILTERS = [
  { id: 'all', label: 'All Events' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' }
];

export const CalendarView = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [clickedDate, setClickedDate] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);

  // Stable filters object for TanStack Query
  const queryFilters = useMemo(
    () => (statusFilter === 'all' ? {} : { status: statusFilter }),
    [statusFilter]
  );

  // Queries & Mutations
  const { data: appointments = [], isLoading } = useAppointments(queryFilters);
  const createAppointmentMutation = useCreateAppointment();
  const updateAppointmentMutation = useUpdateAppointment();
  const deleteAppointmentMutation = useDeleteAppointment();

  // Dynamic callbacks ref to prevent stale closures
  const callbacksRef = useRef({});
  callbacksRef.current = {
    onEventUpdate: (updatedEvent) => {
      const newStartIso = fromScheduleXFormat(updatedEvent.start);
      const newEndIso = fromScheduleXFormat(updatedEvent.end);
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
    }
  };

  // Color mappings for Schedule-X
  const calendars = useMemo(() => ({
    blue: {
      colorName: 'blue',
      lightColors: { main: '#2563eb', container: '#eff6ff', onContainer: '#1e40af' },
      darkColors: { main: '#60a5fa', container: '#1e3a8a', onContainer: '#dbeafe' },
    },
    amber: {
      colorName: 'amber',
      lightColors: { main: '#d97706', container: '#fffbeb', onContainer: '#92400e' },
      darkColors: { main: '#fbbf24', container: '#78350f', onContainer: '#fef3c7' },
    },
    green: {
      colorName: 'green',
      lightColors: { main: '#059669', container: '#ecfdf5', onContainer: '#065f46' },
      darkColors: { main: '#34d399', container: '#064e3b', onContainer: '#d1fae5' },
    },
    purple: {
      colorName: 'purple',
      lightColors: { main: '#7c3aed', container: '#f5f3ff', onContainer: '#5b21b6' },
      darkColors: { main: '#a78bfa', container: '#4c1d95', onContainer: '#ede9fe' },
    },
    red: {
      colorName: 'red',
      lightColors: { main: '#dc2626', container: '#fef2f2', onContainer: '#991b1b' },
      darkColors: { main: '#f87171', container: '#7f1d1d', onContainer: '#fee2e2' },
    },
    indigo: {
      colorName: 'indigo',
      lightColors: { main: '#4f46e5', container: '#eef2ff', onContainer: '#3730a3' },
      darkColors: { main: '#818cf8', container: '#312e81', onContainer: '#e0e7ff' },
    },
    gray: {
      colorName: 'gray',
      lightColors: { main: '#4b5563', container: '#f9fafb', onContainer: '#1f2937' },
      darkColors: { main: '#9ca3af', container: '#374151', onContainer: '#f3f4f6' },
    }
  }), []);

  const userTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    []
  );

  // Initialize plugins
  const dragAndDropPlugin = useMemo(() => createDragAndDropPlugin(15), []);

  // Initialize Schedule-X instance with config and plugins array as second arg
  const calendar = useCalendarApp({
    views: [createViewWeek(), createViewMonthGrid(), createViewDay()],
    defaultView: 'week',
    timezone: userTimezone,
    calendars,
    callbacks: {
      onEventUpdate: (event) => callbacksRef.current.onEventUpdate?.(event),
      onEventClick: (event) => callbacksRef.current.onEventClick?.(event),
      onClickDate: (date) => callbacksRef.current.onClickDate?.(date),
      onClickDateTime: (dateTime) => callbacksRef.current.onClickDateTime?.(dateTime)
    }
  }, [dragAndDropPlugin]);

  // Sync React TanStack Query appointments into Schedule-X
  useEffect(() => {
    if (!calendar?.events) return;
    const sxEvents = appointments
      .map(apt => toScheduleXEvent(apt, userTimezone))
      .filter(Boolean);
    calendar.events.set(sxEvents);
  }, [calendar, appointments, userTimezone]);

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

  return (
    <div className="flex flex-col h-full space-y-4 p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Calendar & Scheduling</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage field appointments, walkthroughs, and scheduled job timelines
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Status Filter Pills */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* New Appointment Button */}
          <button
            type="button"
            onClick={handleOpenNewAppointment}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-opacity-90 text-black font-body-md font-bold rounded-lg transition-all shadow-sm active:scale-95 duration-150 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-black" style={{ fontSize: '18px' }}>add</span>
            New Appointment
          </button>
        </div>
      </div>

      {/* Schedule-X Calendar Viewport Wrapper */}
      <div className="flex-1 min-h-[700px] bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col isolate relative">
        {isLoading && (
          <div className="w-full bg-blue-50 text-blue-700 text-xs px-4 py-1.5 flex items-center gap-2">
            <div className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
            Syncing appointments...
          </div>
        )}
        <div className="flex-1 p-2 md:p-4">
          <ScheduleXCalendar calendarApp={calendar} />
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
