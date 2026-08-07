import React, { useState } from 'react';
import { DatePicker } from '../common/DatePicker';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';

export const AddJobModal = ({ open, onClose, onSubmit, formData, setFormData, clients }) => {
  const [errors, setErrors] = useState({});
  const { session } = useAuth();

  const selectedClient = clients.find(c => c.id === formData.client_id);
  
  const { data: properties = [] } = useQuery({
    queryKey: ['properties', 'client', formData.client_id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/properties?client_id=${formData.client_id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session && !!formData.client_id && selectedClient?.client_type === 'property_manager'
  });

  if (!open) return null;

  const validateField = (name, value) => {
    let errorMsg = null;
    if (name === 'title') {
      if (!value.trim()) errorMsg = "Title is required";
    } else if (name === 'hourly_rate' || name === 'flat_rate') {
      if (value && parseFloat(value) < 0) errorMsg = "Rate cannot be negative";
    } else if (name === 'end_date') {
      if (formData.start_date && value && new Date(value) < new Date(formData.start_date)) {
        errorMsg = "End date cannot be before start date";
      }
    }
    setErrors(prev => ({ ...prev, [name]: errorMsg }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/40 backdrop-blur-sm p-4"
      onMouseDown={onClose}
    >
      <div 
        className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-[32rem] overflow-hidden flex flex-col max-h-[90vh]"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
          <h2 className="font-title-md text-title-md font-bold text-primary">Add New Job</h2>
          <button 
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <form className="space-y-5" id="add-job-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            {/* Select Client */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Select Client *</label>
              <div className="relative">
                <select 
                  className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow appearance-none cursor-pointer" 
                  value={formData.client_id} 
                  onChange={e => setFormData({...formData, client_id: e.target.value})}
                  required
                >
                  <option value="" disabled>Select a client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
              </div>
            </div>

            {/* Select Property */}
            {selectedClient?.client_type === 'property_manager' && (
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Select Property (Optional)</label>
                <div className="relative">
                  <select 
                    className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow appearance-none cursor-pointer" 
                    value={formData.property_id || ''} 
                    onChange={e => setFormData({...formData, property_id: e.target.value})}
                  >
                    <option value="">None (Link to Client Only)</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name ? `${p.name} - ` : ''}{p.address}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                </div>
              </div>
            )}
            
            {/* Job Title */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Job Title *</label>
              <input 
                className={`w-full px-3 py-2 border rounded-md bg-surface text-on-surface focus:outline-none focus:ring-1 transition-shadow placeholder:text-on-surface-variant/50 ${errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-outline-variant focus:border-primary focus:ring-primary'}`} 
                placeholder="e.g. Kitchen Remodel Plumbing" 
                name="title"
                type="text" 
                value={formData.title}
                onChange={handleInputChange}
                required
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>
            
            {/* Rate Type and Hourly Rate Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Rate Type</label>
                <div className="relative">
                  <select 
                    className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow appearance-none cursor-pointer" 
                    value={formData.rate_type} 
                    onChange={e => setFormData({...formData, rate_type: e.target.value})}
                  >
                    <option value="flat">Flat Rate</option>
                    <option value="hourly">Hourly Rate</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                </div>
              </div>
              
              {formData.rate_type === 'hourly' && (
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Hourly Rate ($) *</label>
                  <input 
                    className={`w-full px-3 py-2 border rounded-md bg-surface text-on-surface focus:outline-none focus:ring-1 transition-shadow placeholder:text-on-surface-variant/50 ${errors.hourly_rate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-outline-variant focus:border-primary focus:ring-primary'}`} 
                    placeholder="e.g. 75.00" 
                    name="hourly_rate"
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.hourly_rate && <p className="text-red-500 text-xs mt-1">{errors.hourly_rate}</p>}
                </div>
              )}
              {formData.rate_type === 'flat' && (
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Flat Rate ($) *</label>
                  <input 
                    className={`w-full px-3 py-2 border rounded-md bg-surface text-on-surface focus:outline-none focus:ring-1 transition-shadow placeholder:text-on-surface-variant/50 ${errors.flat_rate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-outline-variant focus:border-primary focus:ring-primary'}`} 
                    placeholder="e.g. 500.00" 
                    name="flat_rate"
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formData.flat_rate}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.flat_rate && <p className="text-red-500 text-xs mt-1">{errors.flat_rate}</p>}
                </div>
              )}
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Start Date</label>
                <DatePicker
                  value={formData.start_date || ''}
                  onChange={(val) => setFormData({...formData, start_date: val})}
                  placeholder="Select start date"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">End Date</label>
                <DatePicker
                  value={formData.end_date || ''}
                  onChange={(val) => {
                    setFormData({...formData, end_date: val});
                    validateField('end_date', val);
                  }}
                  placeholder="Select end date"
                />
                {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Job Notes</label>
              <textarea 
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50 resize-none h-20" 
                placeholder="Initial assessment, scope details..."
                value={formData.notes || ''}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              ></textarea>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-outline-variant bg-surface flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-body-md font-bold rounded cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="add-job-form"
            disabled={!formData.client_id || !formData.title || !formData.rate_type || (formData.rate_type === 'hourly' && !formData.hourly_rate) || (formData.rate_type === 'flat' && !formData.flat_rate) || Object.values(errors).some(Boolean)}
            className="px-4 py-2 bg-primary text-black font-body-md font-bold rounded cursor-pointer hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            Create Job
          </button>
        </div>
      </div>
    </div>
  );
};
