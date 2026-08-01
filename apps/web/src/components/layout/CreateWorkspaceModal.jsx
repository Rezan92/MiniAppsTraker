import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const CreateWorkspaceModal = ({ isOpen, onClose }) => {
  const { session, refreshUserData } = useAuth();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create workspace');
      }

      addToast('success', 'Workspace Created', 'Your new business profile is ready.');
      await refreshUserData();
      onClose();
      // Hard redirect to clear cache and switch to new workspace
      window.location.href = '/';
    } catch (err) {
      addToast('error', 'Creation Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-level-3 w-full max-w-[32rem] relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="mb-lg">
          <h2 className="font-headline-sm text-headline-sm text-primary tracking-tight mb-2">Create New Workspace</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Set up a new business profile.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="name">Business Name *</label>
            <input 
              id="name" 
              name="name" 
              type="text" 
              required 
              placeholder="e.g. ProFix Handyman LLC"
              className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px]"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="phone">Business Phone</label>
            <input 
              id="phone" 
              name="phone" 
              type="tel" 
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px]"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="mb-6">
            <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="address">Business Address</label>
            <input 
              id="address" 
              name="address" 
              type="text" 
              placeholder="123 Main St, City, ST"
              className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px]"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="flex gap-4 mt-6 pt-4 border-t border-outline-variant">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="w-1/2 text-on-surface border border-outline-variant hover:bg-surface-container-high transition-colors font-title-sm py-2 px-4 rounded-DEFAULT"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !formData.name}
              className="w-1/2 bg-primary text-on-primary font-title-md text-title-md py-3 px-4 rounded-DEFAULT hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
