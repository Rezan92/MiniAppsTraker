import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAi } from '../../hooks/api/useAi';

export const ActionConfirmationCard = ({ confirmationData, onComplete }) => {
  const { confirmPendingAction } = useAi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('pending'); // 'pending' | 'confirmed' | 'cancelled'
  const navigate = useNavigate();
  const location = useLocation();

  if (!confirmationData) return null;

  const { actionId, actionType, targetId, title, impactSummary, reason } = confirmationData;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await confirmPendingAction(actionId, true);
      setStatus('confirmed');
      if (onComplete) onComplete({ confirmed: true, actionId });

      // Clean post-deletion navigation: redirect if viewing the deleted entity
      if (actionType === 'delete_job' && location.pathname.includes(`/jobs/${targetId}`)) {
        navigate('/jobs', { replace: true });
      } else if (actionType === 'delete_client' && location.pathname.includes(`/clients/${targetId}`)) {
        navigate('/clients', { replace: true });
      } else if (actionType === 'delete_invoice' && location.pathname.includes(`/invoices/${targetId}`)) {
        navigate('/invoices', { replace: true });
      }
    } catch (err) {
      console.error('Failed to confirm action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      await confirmPendingAction(actionId, false);
      setStatus('cancelled');
      if (onComplete) onComplete({ confirmed: false, actionId });
    } catch (err) {
      console.error('Failed to cancel action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'confirmed') {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2 animate-in fade-in duration-200">
        <span className="material-symbols-outlined text-[18px] text-red-600">check_circle</span>
        <span className="font-semibold">Action Confirmed & Executed.</span>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 flex items-center gap-2 animate-in fade-in duration-200">
        <span className="material-symbols-outlined text-[18px]">cancel</span>
        <span>Deletion cancelled. No changes were made.</span>
      </div>
    );
  }

  return (
    <div className="mt-3 bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 shadow-sm">
      <div className="flex items-start gap-2.5">
        <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">warning</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-xs text-amber-900 uppercase tracking-wider">{title}</h4>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">{impactSummary}</p>
          {reason && (
            <p className="text-[11px] text-amber-700 mt-1 italic">Reason: {reason}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-3 pt-2.5 border-t border-amber-200/80">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-95 disabled:opacity-50 cursor-pointer transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
        >
          {isSubmitting ? (
            <span className="inline-block animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
            <span className="material-symbols-outlined text-[14px]">delete</span>
          )}
          Confirm Deletion
        </button>
      </div>
    </div>
  );
};
