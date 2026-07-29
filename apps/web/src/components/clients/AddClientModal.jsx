import React, { useState } from 'react';

export const AddClientModal = ({ open, onClose, onSubmit, formData, setFormData, editMode }) => {
  const [errors, setErrors] = useState({});

  if (!open) return null;

  const validateField = (name, value) => {
    let errorMsg = null;
    if (name === 'name') {
      if (/[0-9]/.test(value)) {
        errorMsg = "Name cannot contain numbers";
      }
    } else if (name === 'phone') {
      if (/[a-zA-Z]/.test(value)) {
        errorMsg = "Phone number cannot contain letters";
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
          <h2 className="font-title-md text-title-md font-bold text-primary">{editMode ? 'Edit Client' : 'Add New Client'}</h2>
          <button 
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <form className="space-y-5" id="add-client-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            {/* Client Type */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Client Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    className="text-primary focus:ring-primary h-4 w-4 border-outline-variant" 
                    name="clientType" 
                    type="radio" 
                    value="residential" 
                    checked={formData.client_type === 'residential'}
                    onChange={e => setFormData({...formData, client_type: e.target.value})}
                  />
                  <span className="text-body-md">Residential</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    className="text-primary focus:ring-primary h-4 w-4 border-outline-variant" 
                    name="clientType" 
                    type="radio" 
                    value="commercial" 
                    checked={formData.client_type === 'commercial'}
                    onChange={e => setFormData({...formData, client_type: e.target.value})}
                  />
                  <span className="text-body-md">Commercial</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    className="text-primary focus:ring-primary h-4 w-4 border-outline-variant" 
                    name="clientType" 
                    type="radio" 
                    value="property_manager" 
                    checked={formData.client_type === 'property_manager'}
                    onChange={e => setFormData({...formData, client_type: e.target.value})}
                  />
                  <span className="text-body-md">Property Manager</span>
                </label>
              </div>
            </div>
            
            {/* Full Name */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Full Name *</label>
                <input 
                  className={`w-full px-3 py-2 border rounded-md bg-surface text-on-surface focus:outline-none focus:ring-1 transition-shadow placeholder:text-on-surface-variant/50 ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-outline-variant focus:border-primary focus:ring-primary'}`}
                  placeholder="e.g. John Doe" 
                  name="name"
                  type="text" 
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            
            {/* Contact Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Email Address</label>
                <input 
                  className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50" 
                  placeholder="email@example.com" 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Phone Number *</label>
                <input 
                  className={`w-full px-3 py-2 border rounded-md bg-surface text-on-surface focus:outline-none focus:ring-1 transition-shadow placeholder:text-on-surface-variant/50 ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-outline-variant focus:border-primary focus:ring-primary'}`}
                  placeholder="(555) 000-0000" 
                  name="phone"
                  type="tel" 
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
            </div>
            
            {/* Address */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Physical Address</label>
              <input 
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50" 
                placeholder="123 Main St, City, State ZIP" 
                type="text" 
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
            
            {/* Notes */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Notes (Optional)</label>
              <textarea 
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50 resize-none h-24" 
                placeholder="Additional details about the client..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              ></textarea>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-outline-variant bg-surface flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors rounded-md font-title-md text-sm"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="add-client-form"
            className="px-5 py-2 bg-primary text-black hover:bg-opacity-90 transition-colors rounded font-body-md font-bold flex items-center justify-center shadow-sm disabled:opacity-50 cursor-pointer h-10"
            disabled={!formData.name || !formData.phone || Object.values(errors).some(Boolean)}
          >
            {editMode ? 'Save Changes' : 'Add Client'}
          </button>
        </div>
      </div>
    </div>
  );
};
