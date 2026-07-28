import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AddJobModal } from './AddJobModal';
import { AddMaterialModal } from './AddMaterialModal';
import { AddJobHoursModal } from './AddJobHoursModal';

export const JobList = () => {
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ client_id: '', title: '', rate_type: 'flat', hourly_rate: '', start_date: '', end_date: '', notes: '' });

  const [matOpen, setMatOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matData, setMatData] = useState({ description: '', cost: '', is_from_stock: false, store: '', purchase_date: '', notes: '' });

  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursData, setHoursData] = useState({ date: new Date().toISOString().split('T')[0], hours: '' });

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
      showError('Failed to fetch jobs.');
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
      showError('Failed to fetch clients.');
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
        setFormData({ client_id: '', title: '', rate_type: 'flat', hourly_rate: '', start_date: '', end_date: '', notes: '' });
        showSuccess('Job successfully created!');
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || 'Failed to create job');
      }
    } catch (err) {
      console.error(err);
      showError('An unexpected error occurred.');
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
        setMatData({ description: '', cost: '', is_from_stock: false, store: '', purchase_date: '', notes: '' });
        showSuccess('Material added successfully!');
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || 'Failed to add material');
      }
    } catch (err) {
      console.error(err);
      showError('An unexpected error occurred.');
    }
  };

  const handleUpdateStatus = async (jobId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:4000/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchJobs();
        showSuccess('Job status updated!');
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      showError('An unexpected error occurred.');
    }
  };

  const handleLogHours = async () => {
    try {
      const payload = { ...hoursData, hours: parseFloat(hoursData.hours) };
      const res = await fetch(`http://localhost:4000/api/jobs/${selectedJobId}/hours`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setHoursOpen(false);
        setHoursData({ date: new Date().toISOString().split('T')[0], hours: '' });
        showSuccess('Hours logged successfully!');
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || 'Failed to log hours');
      }
    } catch (err) {
      console.error(err);
      showError('An unexpected error occurred.');
    }
  };

  return (
    <main className="flex-1 overflow-auto p-gutter bg-background">
      <div className="max-w-container-max mx-auto flex flex-col gap-lg">
        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary hidden md:block">Job Tracking Engine</h1>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary block md:hidden">Job Tracking Engine</h1>
            <p className="text-on-surface-variant font-body-md text-body-md mt-1">Manage, filter, and track all active and historical jobs.</p>
          </div>
          <button 
            onClick={() => setOpen(true)}
            className="bg-secondary-container text-on-secondary-container hover:bg-[#e09110] transition-colors font-title-md text-title-md px-6 py-3 rounded-lg flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span className="material-symbols-outlined">add</span>
            New Job
          </button>
        </div>

        {/* Filters & Search */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col lg:flex-row gap-4 justify-between items-center shadow-sm">
          <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-hide">
            <button className="px-4 py-2 rounded-lg bg-surface-container-high text-primary font-title-md text-title-md whitespace-nowrap border border-transparent">
                All Jobs
            </button>
            <button className="px-4 py-2 rounded-lg bg-transparent text-on-surface-variant hover:bg-surface-container-low border border-outline-variant transition-colors font-title-md text-title-md whitespace-nowrap">
                Open
            </button>
            <button className="px-4 py-2 rounded-lg bg-transparent text-on-surface-variant hover:bg-surface-container-low border border-outline-variant transition-colors font-title-md text-title-md whitespace-nowrap">
                In Progress
            </button>
            <button className="px-4 py-2 rounded-lg bg-transparent text-on-surface-variant hover:bg-surface-container-low border border-outline-variant transition-colors font-title-md text-title-md whitespace-nowrap">
                Completed
            </button>
          </div>
          <div className="relative w-full lg:w-72 shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-shadow font-body-md text-body-md placeholder:text-on-tertiary-container" 
              placeholder="Search jobs, clients..." 
              type="text" 
            />
          </div>
        </div>

        {/* Data Table Container */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Job Name & ID</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Client</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Rate Type</th>
                  <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-table-data text-table-data">
                {jobs.map(j => (
                  <tr key={j.id} className="hover:bg-surface-container-lowest transition-colors bg-white group">
                    <td className="py-4 px-4 align-top">
                      <div className="font-title-md text-title-md text-primary">{j.title}</div>
                      <div className="text-on-tertiary-container mt-1">#JOB-{j.id.split('-')[0].toUpperCase()}</div>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
                          {j.clients?.name?.substring(0, 2).toUpperCase() || 'NA'}
                        </div>
                        <div>
                          <div className="text-on-surface font-medium">{j.clients?.name || 'Unknown Client'}</div>
                          <div className="text-on-tertiary-container text-xs">{j.clients?.email || 'No email provided'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <div className="relative group/status w-max cursor-pointer">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-label-md text-label-md border ${
                          j.status === 'open' ? 'bg-[#fff3e0] text-[#e65100] border-[#ffe0b2]' :
                          j.status === 'in_progress' ? 'bg-[#e5f6fd] text-[#0288d1] border-[#b3e5fc]' :
                          'bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            j.status === 'open' ? 'bg-[#e65100]' :
                            j.status === 'in_progress' ? 'bg-[#0288d1]' :
                            'bg-[#2e7d32]'
                          }`}></span>
                          {j.status.replace('_', ' ').toUpperCase()}
                          <span className="material-symbols-outlined text-[14px]">expand_more</span>
                        </span>
                        
                        {/* Status Dropdown */}
                        <div className="absolute top-full left-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-md shadow-lg z-10 hidden group-hover/status:flex flex-col min-w-[120px] overflow-hidden">
                          <button onClick={() => handleUpdateStatus(j.id, 'open')} className="px-3 py-2 text-left font-body-md text-on-surface hover:bg-surface-container-low transition-colors">Open</button>
                          <button onClick={() => handleUpdateStatus(j.id, 'in_progress')} className="px-3 py-2 text-left font-body-md text-on-surface hover:bg-surface-container-low transition-colors">In Progress</button>
                          <button onClick={() => handleUpdateStatus(j.id, 'completed')} className="px-3 py-2 text-left font-body-md text-on-surface hover:bg-surface-container-low transition-colors">Completed</button>
                          <button onClick={() => handleUpdateStatus(j.id, 'cancelled')} className="px-3 py-2 text-left font-body-md text-on-surface hover:bg-surface-container-low transition-colors text-error">Cancelled</button>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <div className="text-on-surface font-medium capitalize">{j.rate_type} Rate</div>
                      {j.rate_type === 'hourly' && (
                        <div className="text-on-tertiary-container text-xs mt-1">${j.hourly_rate}/hr</div>
                      )}
                    </td>
                    <td className="py-4 px-4 align-top text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedJobId(j.id); setHoursOpen(true); }}
                          className="text-on-surface-variant hover:text-primary p-2 rounded-lg hover:bg-surface-container-low transition-colors"
                          title="Log Hours"
                        >
                          <span className="material-symbols-outlined">schedule</span>
                        </button>
                        <button 
                          onClick={() => { setSelectedJobId(j.id); setMatOpen(true); }}
                          className="text-on-surface-variant hover:text-primary p-2 rounded-lg hover:bg-surface-container-low transition-colors"
                          title="Add Material"
                        >
                          <span className="material-symbols-outlined">add_box</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {loading && jobs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-on-surface-variant font-body-md">Loading jobs...</td>
                  </tr>
                )}
                {!loading && jobs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-on-surface-variant font-body-md">No jobs found. Click "New Job" to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Footer */}
          <div className="border-t border-outline-variant p-4 flex justify-between items-center bg-surface-container-lowest">
            <span className="text-on-surface-variant font-body-md text-body-md">Showing {jobs.length} entries</span>
            <div className="flex gap-2">
              <button className="p-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50" disabled>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="p-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50" disabled>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Modals */}
        <AddJobModal 
          open={open} 
          onClose={() => setOpen(false)} 
          onSubmit={handleCreateJob} 
          formData={formData} 
          setFormData={setFormData} 
          clients={clients} 
        />
        <AddMaterialModal 
          open={matOpen} 
          onClose={() => setMatOpen(false)} 
          onSubmit={handleAddMaterial} 
          matData={matData} 
          setMatData={setMatData} 
        />
        <AddJobHoursModal 
          open={hoursOpen} 
          onClose={() => setHoursOpen(false)} 
          onSubmit={handleLogHours} 
          hoursData={hoursData} 
          setHoursData={setHoursData} 
        />
      </div>
    </main>
  );
};
