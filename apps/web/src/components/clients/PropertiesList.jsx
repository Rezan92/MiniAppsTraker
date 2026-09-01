import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from '../common/Tooltip';
import { ConfirmModal } from '../common/ConfirmModal';
import { BaseModal } from '../common/BaseModal';
import { DataTable } from '../common/DataTable';
import { apiClient } from '../../lib/apiClient';

export const PropertiesList = ({ clientId }) => {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [propToDelete, setPropToDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '', renter_name: '', renter_phone: '', notes: '' });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', clientId],
    queryFn: () => apiClient.get(`/api/properties?client_id=${clientId}`),
    enabled: !!clientId
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

  const confirmDelete = (id) => {
    setPropToDelete(id);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!propToDelete) return;
    try {
      await apiClient.delete(`/api/properties/${propToDelete}`);
      queryClient.invalidateQueries({ queryKey: ['properties', clientId] });
      showSuccess('Property deleted successfully!');
    } catch (err) {
      showError(err.message || 'Failed to delete property');
    } finally {
      setDeleteModalOpen(false);
      setPropToDelete(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, client_id: clientId };
      if (editingId) {
        await apiClient.put(`/api/properties/${editingId}`, payload);
      } else {
        await apiClient.post('/api/properties', payload);
      }

      queryClient.invalidateQueries({ queryKey: ['properties', clientId] });
      setIsModalOpen(false);
      showSuccess(`Property ${editingId ? 'updated' : 'added'} successfully!`);
    } catch (err) {
      showError(err.message || 'Failed to save property');
    }
  };

  const columns = [
    {
      header: 'Name / Alias',
      key: 'name',
      render: (prop) => <div className="font-medium text-gray-900">{prop.name || '-'}</div>
    },
    {
      header: 'Address',
      key: 'address',
      render: (prop) => <div className="text-gray-700">{prop.address}</div>
    },
    {
      header: 'Tenant Info',
      key: 'tenant',
      render: (prop) => (
        <div>
          {prop.renter_name ? <div className="font-medium text-gray-900">{prop.renter_name}</div> : <div className="text-gray-400 italic">No tenant</div>}
          {prop.renter_phone && <div className="text-xs text-gray-500">{prop.renter_phone}</div>}
        </div>
      )
    },
    {
      header: 'Notes',
      key: 'notes',
      render: (prop) => <div className="max-w-xs truncate text-gray-600">{prop.notes || '-'}</div>
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right',
      width: '100px',
      render: (prop) => (
        <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Tooltip text="Edit" position="top">
            <button 
              onClick={() => handleOpenEdit(prop)} 
              className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 cursor-pointer" 
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </Tooltip>
          <Tooltip text="Delete" position="top">
            <button 
              onClick={() => confirmDelete(prop.id)} 
              className="p-1.5 text-red-600 hover:text-red-800 transition-colors rounded-lg hover:bg-red-50 cursor-pointer ml-1" 
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </Tooltip>
        </div>
      )
    }
  ];

  const modalFooter = (
    <>
      <button 
        type="button" 
        onClick={() => setIsModalOpen(false)} 
        className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      >
        Cancel
      </button>
      <button 
        type="submit" 
        form="property-form"
        className="px-5 py-2 bg-primary text-black font-bold rounded-lg hover:bg-opacity-90 transition-colors shadow-sm cursor-pointer"
      >
        {editingId ? 'Save Changes' : 'Add Property'}
      </button>
    </>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col mt-6">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h3 className="font-headline-sm text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">real_estate_agent</span>
          Rental Properties
        </h3>
        <button 
          onClick={handleOpenAdd}
          className="text-sm font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Property
        </button>
      </div>

      <DataTable
        columns={columns}
        data={properties}
        isLoading={isLoading}
        onRowClick={(prop) => navigate(`/properties/${prop.id}`)}
        emptyIcon="home_work"
        emptyTitle="No properties found"
        emptyDescription="No rental properties have been linked to this client yet."
        emptyActionText="Add Property"
        onEmptyAction={handleOpenAdd}
      />

      <BaseModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Property' : 'Add Property'}
        footer={modalFooter}
        size="md"
      >
        <form id="property-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-label-md text-label-md text-gray-700 mb-1">Property Name / Alias (Optional)</label>
            <input 
              className="w-full px-3 py-2 border rounded-md bg-surface text-gray-900 border-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="e.g. Downtown Triplex" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block font-label-md text-label-md text-gray-700 mb-1">Full Address *</label>
            <input 
              className="w-full px-3 py-2 border rounded-md bg-surface text-gray-900 border-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="e.g. 123 Main St, Apt 4B, City, ST 12345" 
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-gray-700 mb-1">Tenant Name</label>
              <input 
                className="w-full px-3 py-2 border rounded-md bg-surface text-gray-900 border-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="e.g. Jane Smith" 
                value={formData.renter_name}
                onChange={(e) => setFormData({...formData, renter_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-gray-700 mb-1">Tenant Phone</label>
              <input 
                className="w-full px-3 py-2 border rounded-md bg-surface text-gray-900 border-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="e.g. (555) 123-4567" 
                value={formData.renter_phone}
                onChange={(e) => setFormData({...formData, renter_phone: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block font-label-md text-label-md text-gray-700 mb-1">Access Notes / Details</label>
            <textarea 
              className="w-full px-3 py-2 border rounded-md bg-surface text-gray-900 border-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y h-24"
              placeholder="Gate code, special instructions..." 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </form>
      </BaseModal>

      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setPropToDelete(null); }}
        onConfirm={executeDelete}
        title="Delete Property?"
        message="Are you sure you want to delete this property? All associated records will be permanently removed."
        confirmText="Delete Property"
        confirmColor="red"
      />
    </div>
  );
};
