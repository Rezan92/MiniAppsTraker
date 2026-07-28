import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const JobList = () => {
  const { session } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ client_id: '', title: '', rate_type: 'flat', hourly_rate: 0 });

  const [matOpen, setMatOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matData, setMatData] = useState({ description: '', cost: 0, is_from_stock: false });

  useEffect(() => {
    fetchJobs();
    fetchClients();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/jobs', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (data.success) setJobs(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/clients', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (data.success) setClients(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateJob = async () => {
    try {
      const payload = {
        ...formData,
        hourly_rate: formData.rate_type === 'hourly' ? parseFloat(formData.hourly_rate) : undefined
      };
      const res = await fetch('http://localhost:4000/api/jobs', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchJobs();
        setOpen(false);
        setFormData({ client_id: '', title: '', rate_type: 'flat', hourly_rate: 0 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMaterial = async () => {
    try {
      const payload = { ...matData, cost: parseFloat(matData.cost) };
      const res = await fetch(`http://localhost:4000/api/jobs/${selectedJobId}/materials`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setMatOpen(false);
        setMatData({ description: '', cost: 0, is_from_stock: false });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-headline-md font-semibold text-on-surface">Jobs</h2>
        <button 
          onClick={() => setOpen(true)}
          className="bg-primary text-on-primary px-4 py-2 rounded font-title-md hover:bg-primary-container transition-colors"
        >
          Add Job
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-on-surface-variant font-body-md">Loading...</div>
      ) : (
        <div className="overflow-x-auto border border-outline-variant rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="p-3 font-title-md text-on-surface">Title</th>
                <th className="p-3 font-title-md text-on-surface">Client</th>
                <th className="p-3 font-title-md text-on-surface">Status</th>
                <th className="p-3 font-title-md text-on-surface">Rate Type</th>
                <th className="p-3 font-title-md text-on-surface">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {jobs.map(j => (
                <tr key={j.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-3 font-body-md text-on-surface">{j.title}</td>
                  <td className="p-3 font-body-md text-on-surface-variant">{j.clients?.name}</td>
                  <td className="p-3 font-body-md text-on-surface-variant capitalize">{j.status.replace('_', ' ')}</td>
                  <td className="p-3 font-body-md text-on-surface-variant capitalize">{j.rate_type}</td>
                  <td className="p-3 font-body-md text-on-surface">
                    <button 
                      className="text-primary hover:text-primary-container hover:underline font-label-md uppercase tracking-wider" 
                      onClick={() => { setSelectedJobId(j.id); setMatOpen(true); }}
                    >
                      Add Material
                    </button>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-on-surface-variant font-body-md">No jobs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Job Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-level-3 w-full max-w-md border border-outline-variant">
            <h3 className="text-title-md font-semibold mb-4 text-on-surface">Add New Job</h3>
            <div className="space-y-3 mb-6">
              <select className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                <option value="" disabled>Select Client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" placeholder="Job Title" className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <select className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={formData.rate_type} onChange={e => setFormData({...formData, rate_type: e.target.value})}>
                <option value="flat">Flat Rate</option>
                <option value="hourly">Hourly Rate</option>
              </select>
              {formData.rate_type === 'hourly' && (
                <input type="number" placeholder="Hourly Rate ($)" className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={formData.hourly_rate} onChange={e => setFormData({...formData, hourly_rate: e.target.value})} />
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="px-4 py-2 font-title-md text-primary hover:bg-surface-container-low rounded transition-colors">Cancel</button>
              <button onClick={handleCreateJob} disabled={!formData.client_id || !formData.title} className="px-4 py-2 font-title-md bg-primary text-on-primary rounded hover:bg-primary-container disabled:opacity-50 transition-colors">Save Job</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {matOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-level-3 w-full max-w-md border border-outline-variant">
            <h3 className="text-title-md font-semibold mb-4 text-on-surface">Add Material to Job</h3>
            <div className="space-y-3 mb-6">
              <input type="text" placeholder="Description" className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={matData.description} onChange={e => setMatData({...matData, description: e.target.value})} />
              <input type="number" placeholder="Cost ($)" className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" value={matData.cost} onChange={e => setMatData({...matData, cost: e.target.value})} />
              <label className="flex items-center gap-2 cursor-pointer mt-2 text-on-surface font-body-md">
                <input type="checkbox" checked={matData.is_from_stock} onChange={e => setMatData({...matData, is_from_stock: e.target.checked})} className="rounded text-primary focus:ring-primary h-4 w-4" />
                Pulled From Stock Inventory?
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setMatOpen(false)} className="px-4 py-2 font-title-md text-primary hover:bg-surface-container-low rounded transition-colors">Cancel</button>
              <button onClick={handleAddMaterial} disabled={!matData.description || matData.cost < 0} className="px-4 py-2 font-title-md bg-primary text-on-primary rounded hover:bg-primary-container disabled:opacity-50 transition-colors">Add Material</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
