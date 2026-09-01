import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { BaseModal } from '../common/BaseModal';
import { apiClient } from '../../lib/apiClient';

export const CreateWorkspaceModal = ({ isOpen, onClose }) => {
  const { refreshUserData } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.post('/api/auth/onboarding', formData);
      await refreshUserData();
      onClose();
      // Hard redirect to clear cache and switch to new workspace
      window.location.href = '/?toast=workspace_created';
    } catch (err) {
      showError(err.message || 'Failed to create workspace');
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
        type="submit" 
        form="create-workspace-form"
        disabled={loading || !formData.name}
        className="px-5 py-2 bg-primary text-black font-body-md font-bold rounded-lg cursor-pointer hover:bg-opacity-90 disabled:opacity-50 transition-colors shadow-sm"
      >
        {loading ? 'Creating...' : 'Create Workspace'}
      </button>
    </>
  );

  return (
    <BaseModal
      open={isOpen}
      onClose={onClose}
      title="Create New Workspace"
      subtitle="Set up a new business profile."
      footer={footer}
      size="md"
    >
      <form id="create-workspace-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-label-md text-label-md text-on-surface mb-1" htmlFor="name">Business Name *</label>
          <input 
            id="name" 
            name="name" 
            type="text" 
            required 
            placeholder="e.g. ProFix Handyman LLC"
            className="w-full px-4 py-3 border border-outline-variant rounded-md bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all min-h-[44px]"
            value={formData.name}
            onChange={handleChange}
          />
        </div>
        
        <div>
          <label className="block font-label-md text-label-md text-on-surface mb-1" htmlFor="phone">Business Phone</label>
          <input 
            id="phone" 
            name="phone" 
            type="tel" 
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 border border-outline-variant rounded-md bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all min-h-[44px]"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block font-label-md text-label-md text-on-surface mb-1" htmlFor="address">Business Address</label>
          <input 
            id="address" 
            name="address" 
            type="text" 
            placeholder="123 Main St, City, ST"
            className="w-full px-4 py-3 border border-outline-variant rounded-md bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all min-h-[44px]"
            value={formData.address}
            onChange={handleChange}
          />
        </div>
      </form>
    </BaseModal>
  );
};
