import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { BaseModal } from '../common/BaseModal';
import { apiClient } from '../../lib/apiClient';

export const DeleteWorkspaceModal = ({ isOpen, onClose, tenantName, tenantId }) => {
  const { refreshUserData } = useAuth();
  const { showError } = useToast();
  
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const isMatch = confirmText === tenantName;

  const handleDelete = async () => {
    if (!isMatch) return;
    setLoading(true);

    try {
      await apiClient.delete(`/api/auth/workspaces/${tenantId}`);
      await refreshUserData();
      onClose();
      // Hard redirect to clear cache and show toast
      window.location.href = '/?toast=workspace_deleted';
    } catch (err) {
      showError(err.message || 'Failed to delete workspace');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <button 
        type="button" 
        onClick={onClose}
        disabled={loading}
        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-body-md font-bold rounded-lg cursor-pointer hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        Cancel
      </button>
      <button 
        type="button"
        onClick={handleDelete}
        disabled={!isMatch || loading}
        className="px-5 py-2 bg-red-600 text-white font-body-md font-bold rounded-lg cursor-pointer hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
      >
        {loading ? 'Deleting...' : 'Delete Permanently'}
      </button>
    </>
  );

  return (
    <BaseModal
      open={isOpen}
      onClose={onClose}
      title="Delete Workspace?"
      footer={footer}
      size="md"
    >
      <div className="space-y-4">
        <p className="font-body-md text-body-md text-gray-600">
          This will permanently delete <strong>{tenantName}</strong>, including all clients, jobs, invoices, and team members. 
          This action <strong>cannot be undone</strong>.
        </p>

        <div>
          <label className="block font-label-md text-label-md text-gray-700 mb-2">
            Please type <strong>{tenantName}</strong> to confirm.
          </label>
          <input 
            type="text" 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg font-body-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all min-h-[44px]"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={tenantName}
            autoFocus
          />
        </div>
      </div>
    </BaseModal>
  );
};
