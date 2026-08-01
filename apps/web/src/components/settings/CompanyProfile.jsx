import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DeleteWorkspaceModal } from './DeleteWorkspaceModal';

export const CompanyProfile = () => {
  const { userData } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Simple placeholder form for now
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline-md text-headline-md text-primary tracking-tight mb-2">Company Profile</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-6">Manage your business details and workspace settings.</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <h3 className="font-title-md text-title-md text-on-surface mb-4">Basic Information</h3>
        <p className="font-body-sm text-on-surface-variant">Functional form implementation pending Epic 15 setup.</p>
        <div className="mt-4">
          <label className="block font-label-md text-label-md text-on-surface mb-xs">Business Name</label>
          <input 
            type="text" 
            disabled 
            value={userData?.tenant_name || ''}
            className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-highest font-body-md text-on-surface min-h-[44px] opacity-70"
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-12 border border-red-200 rounded-xl overflow-hidden">
        <div className="bg-red-50 p-6">
          <h3 className="font-title-md text-title-md text-red-700 mb-2">Danger Zone</h3>
          <p className="font-body-sm text-red-600 mb-4">
            Permanently delete this workspace and all associated data. This action cannot be undone.
          </p>
          <button 
            onClick={() => setDeleteModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-title-sm py-2 px-4 rounded-DEFAULT transition-colors"
          >
            Delete Workspace
          </button>
        </div>
      </div>

      <DeleteWorkspaceModal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        tenantName={userData?.tenant_name}
        tenantId={userData?.tenant_id}
      />
    </div>
  );
};
