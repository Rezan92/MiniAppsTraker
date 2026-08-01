import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { DeleteWorkspaceModal } from './DeleteWorkspaceModal';

export const CompanyProfile = () => {
  const { userData, session, refreshUserData } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    timezone: 'UTC'
  });

  const isAdmin = userData?.role === 'admin';

  useEffect(() => {
    const fetchWorkspace = async () => {
      if (!userData?.tenant_id) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/workspaces/${userData.tenant_id}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setFormData({
            name: json.data.name || '',
            address: json.data.address || '',
            phone: json.data.phone || '',
            timezone: json.data.timezone || 'UTC'
          });
        }
      } catch (err) {
        console.error('Failed to load workspace:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [userData?.tenant_id, session]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/workspaces/${userData.tenant_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update workspace');
      }
      showSuccess('Company profile updated');
      await refreshUserData();
    } catch (err) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (loading) {
    return <div className="p-8 text-on-surface-variant">Loading profile...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="font-headline-md text-headline-md text-primary tracking-tight mb-2">Company Profile</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-6">Manage your business details and workspace settings.</p>
      </div>

      <form onSubmit={handleSave} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
        <h3 className="font-title-md text-title-md text-on-surface mb-6 border-b border-outline-variant pb-4">Basic Information</h3>
        
        <div className="space-y-6">
          {/* Logo Placeholder */}
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-2">Business Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-surface-container-high border-2 border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined">image</span>
              </div>
              <div className="text-sm text-on-surface-variant">
                <p>Upload functionality coming soon.</p>
                {/* // TODO: Wire to Supabase Storage — Epic TBD */}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs">Business Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="name"
                required
                disabled={!isAdmin}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-60"
              />
            </div>
            
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs">Phone Number</label>
              <input 
                type="tel" 
                name="phone"
                disabled={!isAdmin}
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-60"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-label-md text-label-md text-on-surface mb-xs">Address</label>
              <input 
                type="text" 
                name="address"
                disabled={!isAdmin}
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs">Timezone</label>
              <select
                name="timezone"
                disabled={!isAdmin}
                value={formData.timezone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all disabled:opacity-60"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="America/Chicago">Central Time (US & Canada)</option>
                <option value="America/Denver">Mountain Time (US & Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
              </select>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-outline-variant">
            <button 
              type="button" 
              onClick={() => fetchWorkspace()}
              disabled={saving}
              className="px-6 py-2 border border-outline-variant text-on-surface font-title-sm rounded-DEFAULT hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="px-6 py-2 bg-primary text-on-primary font-title-sm rounded-DEFAULT hover:opacity-90 transition-opacity shadow-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>

      {/* Danger Zone (Admin Only) */}
      {isAdmin && (
        <div className="mt-12 border border-red-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-red-50/50 p-6">
            <h3 className="font-title-md text-title-md text-red-700 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600" style={{ fontSize: '20px' }}>warning</span>
              Danger Zone
            </h3>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
              <div>
                <h4 className="font-title-sm text-on-surface mb-1">Delete Workspace</h4>
                <p className="font-body-sm text-on-surface-variant max-w-xl">
                  Permanently delete this workspace and all associated data. This action is irreversible and affects all members.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-title-sm py-2.5 px-6 rounded-DEFAULT transition-colors whitespace-nowrap shadow-sm cursor-pointer"
              >
                Delete Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <DeleteWorkspaceModal 
          isOpen={deleteModalOpen} 
          onClose={() => setDeleteModalOpen(false)} 
          tenantName={formData.name || userData?.tenant_name}
          tenantId={userData?.tenant_id}
        />
      )}
    </div>
  );
};
