import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const ClientList = () => {
  const { session } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', notes: '' });

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
        setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-headline-md font-semibold text-on-surface">Clients</h2>
        <button 
          onClick={() => setOpen(true)}
          className="bg-primary text-on-primary px-4 py-2 rounded font-title-md hover:bg-primary-container transition-colors"
        >
          Add Client
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-on-surface-variant font-body-md">Loading...</div>
      ) : (
        <div className="overflow-x-auto border border-outline-variant rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="p-3 font-title-md text-on-surface">Name</th>
                <th className="p-3 font-title-md text-on-surface">Email</th>
                <th className="p-3 font-title-md text-on-surface">Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-3 font-body-md text-on-surface">{c.name}</td>
                  <td className="p-3 font-body-md text-on-surface-variant">{c.email}</td>
                  <td className="p-3 font-body-md text-on-surface-variant">{c.phone}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-6 text-center text-on-surface-variant font-body-md">No clients found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Simple Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-level-3 w-full max-w-md border border-outline-variant">
            <h3 className="text-title-md font-semibold mb-4 text-on-surface">Add New Client</h3>
            <div className="space-y-3 mb-6">
              <input type="text" placeholder="Name" className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="email" placeholder="Email" className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="text" placeholder="Phone" className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <input type="text" placeholder="Address" className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              <textarea placeholder="Notes" rows="3" className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="px-4 py-2 font-title-md text-primary hover:bg-surface-container-low rounded transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={!formData.name} className="px-4 py-2 font-title-md bg-primary text-on-primary rounded hover:bg-primary-container disabled:opacity-50 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
