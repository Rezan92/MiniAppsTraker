import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AddClientModal } from './AddClientModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { useDebounce } from '../../hooks/useDebounce';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '../../hooks/api/useClients';

export const ClientList = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [formData, setFormData] = useState({ client_type: 'residential', company_name: '', name: '', email: '', phone: '', address: '', notes: '', status: 'active' });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 });

  const { data: clients = [], isLoading: loading } = useClients(debouncedSearch);
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();

  useEffect(() => {
    if (openMenuId) {
      const handler = (e) => {
        if (e.target.closest('.status-dropdown-menu')) return;
        setOpenMenuId(null);
      };
      document.addEventListener('mousedown', handler, true);
      return () => document.removeEventListener('mousedown', handler, true);
    }
  }, [openMenuId]);

  const handleStatusClick = (e, id) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuCoords({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX
    });
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleCreate = () => {
    if (editMode && editingId) {
      updateClientMutation.mutate({ id: editingId, ...formData }, {
        onSuccess: () => {
          setOpen(false);
          setEditMode(false);
          setEditingId(null);
          setFormData({ client_type: 'residential', company_name: '', name: '', email: '', phone: '', address: '', notes: '', status: 'active' });
        }
      });
    } else {
      createClientMutation.mutate(formData, {
        onSuccess: () => {
          setOpen(false);
          setFormData({ client_type: 'residential', company_name: '', name: '', email: '', phone: '', address: '', notes: '', status: 'active' });
        }
      });
    }
  };

  const handleUpdateStatus = (client, newStatus) => {
    updateClientMutation.mutate({ id: client.id, ...client, status: newStatus }, {
      onSuccess: () => setOpenMenuId(null)
    });
  };

  const confirmDelete = (client) => {
    setClientToDelete(client);
    setDeleteModalOpen(true);
  };

  const executeDelete = () => {
    if (!clientToDelete) return;
    deleteClientMutation.mutate(clientToDelete.id, {
      onSuccess: () => {
        setDeleteModalOpen(false);
        setClientToDelete(null);
      }
    });
  };

  const openAddClient = () => {
    setEditMode(false);
    setEditingId(null);
    setFormData({ client_type: 'residential', company_name: '', name: '', email: '', phone: '', address: '', notes: '' });
    setOpen(true);
  };

  const openEditClient = (client) => {
    setEditMode(true);
    setEditingId(client.id);
    setFormData({ 
      client_type: client.client_type || 'residential', 
      company_name: client.company_name || '',
      name: client.name || '', 
      email: client.email || '', 
      phone: client.phone || '', 
      address: client.address || '', 
      notes: client.notes || '',
      status: client.status || 'active'
    });
    setOpen(true);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">Clients</h1>
          <p className="font-body-md text-gray-500 mt-1">Manage active contracts, billing, and contact information.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full lg:w-72 shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-shadow font-body-md text-body-md placeholder:text-on-tertiary-container" 
              placeholder="Search clients..." 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="flex items-center justify-center gap-2 bg-[#F9FAFB] border border-outline-variant text-on-surface-variant px-4 py-2 rounded font-body-md font-medium hover:bg-surface-container-low transition-colors h-11">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>filter_list</span>
            Filter
          </button>
          <button 
            onClick={openAddClient}
            className="flex items-center justify-center gap-2 bg-primary text-black px-4 py-2 rounded font-body-md font-bold cursor-pointer hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_10px_rgba(245,158,11,0.15)] h-11"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
            Add Client
          </button>
        </div>
      </div>

      <div className="bg-white border border-surface-container-high rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-on-surface-variant font-body-md">Loading clients...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1F2937] text-white border-b border-surface-container-high">
                    <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Client Name</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Address</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Contact Info</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-center whitespace-nowrap w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-body-md divide-y divide-surface-container-high">
                  {clients.length === 0 ? (
                    <tr className="bg-white">
                      <td colSpan="5" className="py-8 px-6 text-center text-on-surface-variant">
                        No clients found.
                      </td>
                    </tr>
                  ) : (
                    clients.map((c, idx) => (
                      <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className={`hover:bg-gray-100 transition-colors group cursor-pointer ${idx % 2 !== 0 ? 'bg-[#F9FAFB]' : 'bg-white'}`}>
                        <td className="py-3 px-4 rounded-l-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 font-bold border border-gray-200">
                              {(c.name || 'C').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-on-surface">{c.name}</div>
                              <div className="text-xs text-gray-500 capitalize">{c.client_type?.replace('_', ' ')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-on-surface text-sm truncate max-w-[200px]">{c.address || 'No address'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-on-surface">{c.email || 'No email'}</div>
                          <div className="text-xs text-gray-500">{c.phone || 'No phone'}</div>
                        </td>
                        <td className="py-3 px-4 relative">
                          <button 
                            onClick={(e) => handleStatusClick(e, c.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                              c.status === 'inactive' ? 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                            }`}
                          >
                            <span>{c.status === 'inactive' ? 'Inactive' : 'Active'}</span>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>expand_more</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); openEditClient(c); }} aria-label="Edit Client" className="p-1 text-black hover:text-gray-600 transition-colors rounded hover:bg-gray-200">
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); confirmDelete(c); }} aria-label="Delete Client" className="p-1 text-black hover:text-gray-600 transition-colors rounded hover:bg-gray-200">
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between px-4 py-3 bg-[#F9FAFB] border-t border-surface-container-high text-sm text-gray-500">
              <div>Showing {clients.length} clients</div>
              <div className="flex gap-2">
                <button className="px-2 py-1 border border-surface-container-high rounded bg-white hover:bg-gray-50 disabled:opacity-50" disabled>Prev</button>
                <button className="px-2 py-1 border border-surface-container-high rounded bg-white hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      <AddClientModal 
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
        formData={formData}
        setFormData={setFormData}
        editMode={editMode}
      />
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setClientToDelete(null); }}
        onConfirm={executeDelete}
        title="Delete Client?"
        message={`Are you sure you want to delete ${clientToDelete?.name || 'this client'}? This action is permanent and will remove all associated job history and invoices.`}
        confirmText="Delete Client"
        confirmColor="red"
      />
      
      {/* Status Dropdown Portal */}
      {openMenuId && createPortal(
        <div 
          className="status-dropdown-menu absolute bg-white border border-gray-200 rounded shadow-lg z-[9999] py-1 w-32"
          style={{ top: menuCoords.top, left: menuCoords.left }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus({ id: openMenuId }, 'active'); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Active
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus({ id: openMenuId }, 'inactive'); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            Inactive
          </button>
        </div>,
        document.body
      )}
    </>
  );
};
