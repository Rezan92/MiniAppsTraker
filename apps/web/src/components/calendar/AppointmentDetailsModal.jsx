import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseModal } from '../common/BaseModal';
import { ConfirmModal } from '../common/ConfirmModal';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', bg: 'bg-blue-100 text-blue-800 border-blue-200' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-100 text-amber-800 border-amber-200' },
  completed: { label: 'Completed', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-100 text-gray-800 border-gray-200' },
  rescheduled: { label: 'Rescheduled', bg: 'bg-purple-100 text-purple-800 border-purple-200' }
};

const ROLE_LABELS = {
  billing_client: 'Billing Client',
  site_resident: 'On-Site Resident',
  property_manager: 'Property Manager',
  custom: 'Contact'
};

function formatAppointmentDuration(startStr, endStr) {
  if (!startStr || !endStr) return '';
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

  const dateFormatted = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const startTimeStr = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endTimeStr = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const diffHours = (end - start) / (1000 * 60 * 60);
  const hoursFormatted = diffHours % 1 === 0 ? diffHours : diffHours.toFixed(1);

  return `${dateFormatted}, ${startTimeStr} - ${endTimeStr} (${hoursFormatted} hrs)`;
}

export const AppointmentDetailsModal = ({
  open,
  onClose,
  appointment,
  onEdit,
  onDelete,
  onUpdateStatus
}) => {
  const navigate = useNavigate();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  if (!appointment) return null;

  const statusStyle = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;
  const timingText = formatAppointmentDuration(appointment.start_time, appointment.end_time);

  const mapsUrl = appointment.location_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.location_address)}`
    : null;

  const footer = (
    <div className="flex items-center justify-between w-full">
      <button
        type="button"
        onClick={() => setDeleteConfirmOpen(true)}
        className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 font-medium rounded-lg transition-colors cursor-pointer"
      >
        Delete
      </button>
      <div className="flex items-center gap-2">
        {appointment.status !== 'completed' && (
          <button
            type="button"
            onClick={() => onUpdateStatus(appointment.id, 'completed')}
            className="px-3.5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Mark Completed
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(appointment)}
          className="px-4 py-2 bg-primary text-black text-sm font-bold rounded-lg hover:bg-opacity-90 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">edit</span>
          Edit
        </button>
      </div>
    </div>
  );

  return (
    <>
      <BaseModal
        open={open}
        onClose={onClose}
        title={appointment.title}
        subtitle={timingText}
        footer={footer}
        size="md"
      >
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle.bg}`}>
              {statusStyle.label}
            </span>
            {appointment.all_day && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                All Day
              </span>
            )}
          </div>

          {/* Location / Navigation */}
          {appointment.location_address ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-gray-500 mt-0.5 text-lg">location_on</span>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</div>
                  <div className="text-sm font-medium text-gray-900 mt-0.5">{appointment.location_address}</div>
                </div>
              </div>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded bg-white border border-gray-300 text-primary hover:bg-primary-50 transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-xs">directions</span>
                  Directions
                </a>
              )}
            </div>
          ) : null}

          {/* Contact Details */}
          {(appointment.contact_name || appointment.contact_phone) && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-gray-500 mt-0.5 text-lg">person</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {ROLE_LABELS[appointment.contact_role] || 'Contact'}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 mt-0.5">
                    {appointment.contact_name || 'Unnamed Contact'}
                  </div>
                  {appointment.contact_phone && (
                    <div className="text-xs text-gray-600 mt-0.5">{appointment.contact_phone}</div>
                  )}
                </div>
              </div>
              {appointment.contact_phone && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${appointment.contact_phone}`}
                    className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:text-blue-600 hover:border-blue-300 transition-colors"
                    title="Call Contact"
                  >
                    <span className="material-symbols-outlined text-base">call</span>
                  </a>
                  <a
                    href={`sms:${appointment.contact_phone}`}
                    className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:text-blue-600 hover:border-blue-300 transition-colors"
                    title="Text Contact"
                  >
                    <span className="material-symbols-outlined text-base">chat</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Linked Entities (Job / Client) */}
          <div className="flex flex-wrap gap-2 pt-1">
            {appointment.client && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/clients/${appointment.client.id}`);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">group</span>
                Client: {appointment.client.name}
              </button>
            )}

            {appointment.job && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/jobs/${appointment.job.id}`);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">work</span>
                Job: {appointment.job.title}
              </button>
            )}
          </div>

          {/* Notes / Description */}
          {appointment.description && (
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</div>
              <p className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-gray-200">
                {appointment.description}
              </p>
            </div>
          )}
        </div>
      </BaseModal>

      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          onDelete(appointment.id);
        }}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
        confirmText="Delete"
        danger
      />
    </>
  );
};
