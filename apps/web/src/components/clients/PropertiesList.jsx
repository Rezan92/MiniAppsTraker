import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

export const PropertiesList = ({ clientId }) => {
  const { session } = useAuth();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '', renter_name: '', renter_phone: '', notes: '' });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', clientId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/properties?client_id=${clientId}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch properties');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!session?.access_token && !!clientId
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: '', address: '', renter_name: '', renter_phone: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prop) => {
    setEditingId(prop.id);
    setFormData({ name: prop.name || '', address: prop.address || '', renter_name: prop.renter_name || '', renter_phone: prop.renter_phone || '', notes: prop.notes || '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/properties/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['properties', clientId] });
        showSuccess('Property deleted successfully!');
      } else {
        showError('Failed to delete property');
      }
    } catch (err) {
      showError('An error occurred');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/properties/${editingId}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/properties`;
      
      const method = editingId ? 'PUT' : 'POST';
      const payload = { ...formData, client_id: clientId };

      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['properties', clientId] });
        setIsModalOpen(false);
        showSuccess(`Property ${editingId ? 'updated' : 'added'} successfully!`);
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || errorData.message || 'Failed to save property');
      }
    } catch (err) {
      showError('An unexpected error occurred.');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col mt-6">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h3 className="font-headline-sm text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">real_estate_agent</span>
          Rental Properties
        </h3>
        <button 
          onClick={handleOpenAdd}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Property
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1F2937] text-white border-b border-surface-container-high font-label-caps text-label-caps whitespace-nowrap">
              <th className="p-4 font-semibold">Name / Alias</th>
              <th className="p-4 font-semibold">Address</th>
              <th className="p-4 font-semibold">Tenant Info</th>
              <th className="p-4 font-semibold">Notes</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="font-body-md text-gray-700">
            {isLoading ? (
              <tr><td colSpan="4" className="p-6 text-center">Loading properties...</td></tr>
            ) : properties.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-gray-500 italic">No rental properties added yet.</td>
              </tr>
            ) : (
              properties.map((prop) => (
                <tr 
                  key={prop.id} 
                  onClick={() => navigate(`/properties/${prop.id}`)}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="p-4 font-medium">{prop.name || '-'}</td>
                  <td className="p-4">{prop.address}</td>
                  <td className="p-4">
                    {prop.renter_name ? <div className="font-medium">{prop.renter_name}</div> : <div className="text-gray-400 italic">No tenant</div>}
                    {prop.renter_phone && <div className="text-sm text-gray-500">{prop.renter_phone}</div>}
                  </td>
                  <td className="p-4 max-w-xs truncate">{prop.notes || '-'}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenEdit(prop); }} 
                      className="text-black hover:opacity-80 transition-opacity p-1 cursor-pointer" 
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(prop.id); }} 
                      className="text-black hover:opacity-80 transition-opacity p-1 ml-2 cursor-pointer" 
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-[32rem] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
              <h2 className="font-title-md text-title-md font-bold text-primary">{editingId ? 'Edit Property' : 'Add Property'}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Property Name / Alias (Optional)</label>
                  <input 
                    className="w-full px-3 py-2 border rounded-md bg-surface text-on-surface border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Downtown Triplex" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Full Address *</label>
                  <input 
                    className="w-full px-3 py-2 border rounded-md bg-surface text-on-surface border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. 123 Main St, Apt 4B, City, ST 12345" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Tenant Name</label>
                    <input 
                      className="w-full px-3 py-2 border rounded-md bg-surface text-on-surface border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="e.g. Jane Smith" 
                      value={formData.renter_name}
                      onChange={(e) => setFormData({...formData, renter_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Tenant Phone</label>
                    <input 
                      className="w-full px-3 py-2 border rounded-md bg-surface text-on-surface border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="e.g. (555) 123-4567" 
                      value={formData.renter_phone}
                      onChange={(e) => setFormData({...formData, renter_phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Access Notes / Details</label>
                  <textarea 
                    className="w-full px-3 py-2 border rounded-md bg-surface text-on-surface border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y h-24"
                    placeholder="Gate code, tenant name, special instructions..." 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-on-surface-variant font-medium rounded hover:bg-surface-variant transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2 bg-primary text-black font-medium rounded hover:bg-opacity-90 transition-colors shadow-sm cursor-pointer">
                    {editingId ? 'Save Changes' : 'Add Property'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
