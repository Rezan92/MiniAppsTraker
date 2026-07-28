import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AddClientModal } from './AddClientModal';

export const ClientList = () => {
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ client_type: 'residential', name: '', email: '', phone: '', address: '', notes: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/clients', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/clients', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchClients();
        setOpen(false);
        setFormData({ client_type: 'residential', name: '', email: '', phone: '', address: '', notes: '' });
        showSuccess('Client successfully added!');
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || 'Failed to add client');
      }
    } catch (err) {
      console.error(err);
      showError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="font-headline-lg text-headline-lg font-bold text-primary">Client Management</h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full lg:w-72 shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-shadow font-body-md text-body-md placeholder:text-on-tertiary-container" 
              placeholder="Search clients..." 
              type="text" 
            />
          </div>
          <button 
            onClick={() => setOpen(true)}
            className="bg-primary-container text-on-primary whitespace-nowrap px-6 py-2 rounded font-title-md text-title-md hover:bg-primary transition-colors flex items-center justify-center gap-2 h-11 shrink-0 shadow-sm"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            Add Client
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-on-surface-variant font-body-md">Loading clients...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Client Name</th>
                    <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Contact Info</th>
                    <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider hidden sm:table-cell">Recent Job</th>
                    <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Total Revenue</th>
                    <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-table-data text-table-data text-on-surface divide-y divide-outline-variant">
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 px-6 text-center text-on-surface-variant">
                        No clients found.
                      </td>
                    </tr>
                  ) : (
                    clients.map((c, idx) => (
                      <tr key={c.id} className={`hover:bg-surface-container-lowest/50 transition-colors group ${idx % 2 !== 0 ? 'bg-surface-container-low/30' : ''}`}>
                        <td className="py-4 px-6">
                          <div className="font-title-md text-title-md text-primary">{c.name}</div>
                          {c.address && <div className="text-on-surface-variant text-xs mt-1">{c.address}</div>}
                        </td>
                        <td className="py-4 px-6">
                          <div>{c.email || 'No email'}</div>
                          <div className="text-on-surface-variant mt-1">{c.phone || 'No phone'}</div>
                        </td>
                        <td className="py-4 px-6 hidden sm:table-cell">
                          <div className="text-on-surface-variant text-xs italic">N/A</div>
                        </td>
                        <td className="py-4 px-6 text-right font-title-md text-title-md">
                          $0.00
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button aria-label="Edit Client" className="p-2 text-outline hover:text-primary transition-colors rounded hover:bg-surface-container-low">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-outline-variant bg-surface flex justify-between items-center text-sm text-on-surface-variant">
              <span>Showing {clients.length} clients</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 border border-outline-variant rounded hover:bg-surface-container-lowest transition-colors disabled:opacity-50" disabled>Prev</button>
                <button className="px-3 py-1 border border-outline-variant rounded hover:bg-surface-container-lowest transition-colors bg-surface-container-lowest text-primary">1</button>
                <button className="px-3 py-1 border border-outline-variant rounded hover:bg-surface-container-lowest transition-colors disabled:opacity-50" disabled>Next</button>
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
      />
    </>
  );
};
