import React from 'react';

export const AddJobModal = ({ open, onClose, onSubmit, formData, setFormData, clients }) => {
  if (!open) return null;

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
            
            {/* Job Title */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Job Title *</label>
              <input 
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50" 
                placeholder="e.g. Kitchen Remodel Plumbing" 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                required
              />
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
                    className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50" 
                    placeholder="e.g. 75.00" 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={e => setFormData({...formData, hourly_rate: e.target.value})}
                    required
                  />
                </div>
              )}
              {formData.rate_type === 'flat' && (
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Flat Rate ($) *</label>
                  <input 
                    className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50" 
                    placeholder="e.g. 500.00" 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={formData.flat_rate}
                    onChange={e => setFormData({...formData, flat_rate: e.target.value})}
                    required
                  />
                </div>
              )}
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Start Date</label>
                <input 
                  className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" 
                  type="date" 
                  value={formData.start_date || ''}
                  onChange={e => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">End Date</label>
                <input 
                  className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" 
                  type="date" 
                  value={formData.end_date || ''}
                  onChange={e => setFormData({...formData, end_date: e.target.value})}
                />
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
            disabled={!formData.client_id || !formData.title || !formData.rate_type || (formData.rate_type === 'hourly' && !formData.hourly_rate) || (formData.rate_type === 'flat' && !formData.flat_rate)}
            className="px-4 py-2 bg-primary text-black font-body-md font-bold rounded cursor-pointer hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            {loading ? 'Saving...' : 'Create Job'}
          </button>
        </div>
      </div>
    </div>
  );
};
