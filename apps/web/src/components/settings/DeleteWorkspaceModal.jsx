import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const DeleteWorkspaceModal = ({ isOpen, onClose, tenantName, tenantId }) => {
  const { session, refreshUserData } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isMatch = confirmText === tenantName;

  const handleDelete = async () => {
    if (!isMatch) return;
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/workspaces/${tenantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete workspace');
      }

      await refreshUserData();
      onClose();
      // Hard redirect to clear cache and show toast
      window.location.href = '/?toast=workspace_deleted';
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest border border-red-200 rounded-xl p-lg shadow-level-3 w-full max-w-[32rem] relative">
        <button 
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="mb-6">
          <h2 className="font-headline-sm text-headline-sm text-red-600 tracking-tight mb-2">Delete Workspace?</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            This will permanently delete <strong>{tenantName}</strong>, including all clients, jobs, invoices, and team members. 
            This action <strong>cannot be undone</strong>.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-xs">
              Please type <strong>{tenantName}</strong> to confirm.
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-red-500 focus:border-[2px] transition-all min-h-[44px]"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={tenantName}
            />
          </div>

          <div className="flex gap-4 mt-6 pt-4 border-t border-outline-variant">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="w-1/2 text-on-surface border border-outline-variant hover:bg-surface-container-high transition-colors font-title-sm py-2 px-4 rounded-DEFAULT cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleDelete}
              disabled={!isMatch || loading}
              className="w-1/2 bg-red-600 text-white font-title-md text-title-md py-3 px-4 rounded-DEFAULT hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
