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
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ client_id: '', title: '', rate_type: 'flat', hourly_rate: '', flat_rate: '', start_date: '', end_date: '', notes: '' });

  const [matOpen, setMatOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matData, setMatData] = useState({ description: '', cost: '', is_from_stock: false, store: '', purchase_date: '', notes: '' });

  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursData, setHoursData] = useState({ date: new Date().toISOString().split('T')[0], hours: '' });

  const [openMenuId, setOpenMenuId] = useState(null);

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
        hourly_rate: formData.rate_type === 'hourly' ? parseFloat(formData.hourly_rate) : undefined,
        flat_rate: formData.rate_type === 'flat' ? parseFloat(formData.flat_rate) : undefined
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
        setFormData({ client_id: '', title: '', rate_type: 'flat', hourly_rate: '', flat_rate: '', start_date: '', end_date: '', notes: '' });
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
        setOpenMenuId(null);
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

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.title.toLowerCase().includes(search.toLowerCase()) || 
                          (j.clients?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">Job Tracking Engine</h1>
          <p className="font-body-md text-gray-500 mt-1">Manage, filter, and track all active and historical jobs.</p>
        </div>
        <button 
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 bg-primary text-black px-4 py-2 rounded font-body-md font-bold hover:bg-opacity-90 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.15)] h-11"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          New Job
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col lg:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-hide">
          <button 
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded font-body-md font-medium whitespace-nowrap transition-colors border ${statusFilter === 'all' ? 'bg-[#F9FAFB] border-gray-300 text-gray-700' : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-100'}`}
          >
              All Jobs
          </button>
          <button 
            onClick={() => setStatusFilter('open')}
            className={`px-4 py-2 rounded font-body-md font-medium whitespace-nowrap transition-colors border ${statusFilter === 'open' ? 'bg-[#F9FAFB] border-gray-300 text-gray-700' : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-100'}`}
          >
              Open
          </button>
          <button 
            onClick={() => setStatusFilter('in_progress')}
            className={`px-4 py-2 rounded font-body-md font-medium whitespace-nowrap transition-colors border ${statusFilter === 'in_progress' ? 'bg-[#F9FAFB] border-gray-300 text-gray-700' : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-100'}`}
          >
              In Progress
          </button>
          <button 
            onClick={() => setStatusFilter('completed')}
            className={`px-4 py-2 rounded font-body-md font-medium whitespace-nowrap transition-colors border ${statusFilter === 'completed' ? 'bg-[#F9FAFB] border-gray-300 text-gray-700' : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-100'}`}
          >
              Completed
          </button>
        </div>
          <div className="relative w-full lg:w-72 shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-shadow font-body-md text-body-md placeholder:text-on-tertiary-container" 
              placeholder="Search jobs, clients..." 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

      {/* Data Table Container */}
      <div className="bg-white border border-surface-container-high rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left min-w-[800px] border-collapse">
            <thead>
              <tr className="bg-[#1F2937] text-white border-b border-surface-container-high">
                <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Job Name & ID</th>
                <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Client</th>
                <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Status</th>
                <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Rate Type</th>
                <th className="py-3 px-4 font-label-caps text-label-caps text-center whitespace-nowrap w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high font-body-md">
              {filteredJobs.map((j, idx) => (
                <tr key={j.id} className={`hover:bg-gray-50 transition-colors group ${idx % 2 !== 0 ? 'bg-[#F9FAFB]' : 'bg-white'}`}>
                  <td className="py-4 px-4 align-top">
                    <div className="font-medium text-on-surface">{j.title}</div>
                    <div className="text-gray-500 font-label-caps text-[10px] mt-1">#JOB-{j.id.split('-')[0].toUpperCase()}</div>
                  </td>
                  <td className="py-4 px-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 font-bold border border-gray-200">
                        {j.clients?.name?.substring(0, 2).toUpperCase() || 'NA'}
                      </div>
                      <div>
                        <div className="font-medium text-on-surface">{j.clients?.name || 'Unknown Client'}</div>
                        <div className="text-gray-500 text-xs">{j.clients?.email || 'No email provided'}</div>
                      </div>
                    </div>
                  </td>
                    <td className="py-4 px-4 align-top">
                      <div className="relative w-max cursor-pointer">
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === j.id ? null : j.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-label-md text-label-md border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${
                            j.status === 'open' ? 'bg-[#fff3e0] text-[#e65100] border-[#ffe0b2]' :
                            j.status === 'in_progress' ? 'bg-[#e5f6fd] text-[#0288d1] border-[#b3e5fc]' :
                            'bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            j.status === 'open' ? 'bg-[#e65100]' :
                            j.status === 'in_progress' ? 'bg-[#0288d1]' :
                            'bg-[#2e7d32]'
                          }`}></span>
                          {j.status.replace('_', ' ').toUpperCase()}
                          <span className="material-symbols-outlined text-[14px]">expand_more</span>
                        </button>
                        
                        {/* Status Dropdown */}
                        {openMenuId === j.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                            <div className="absolute top-full left-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-md shadow-lg z-50 flex flex-col min-w-[120px] overflow-hidden">
                              <button onClick={() => handleUpdateStatus(j.id, 'open')} className="px-3 py-2 text-left font-body-md text-on-surface hover:bg-surface-container-low transition-colors">Open</button>
                              <button onClick={() => handleUpdateStatus(j.id, 'in_progress')} className="px-3 py-2 text-left font-body-md text-on-surface hover:bg-surface-container-low transition-colors">In Progress</button>
                              <button onClick={() => handleUpdateStatus(j.id, 'completed')} className="px-3 py-2 text-left font-body-md text-on-surface hover:bg-surface-container-low transition-colors">Completed</button>
                              <button onClick={() => handleUpdateStatus(j.id, 'cancelled')} className="px-3 py-2 text-left font-body-md text-on-surface hover:bg-surface-container-low transition-colors text-error">Cancelled</button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  <td className="py-4 px-4 align-top">
                    <div className="text-on-surface font-medium capitalize">{j.rate_type} Rate</div>
                    {j.rate_type === 'hourly' && (
                      <div className="text-gray-500 text-xs mt-1 font-label-caps">${j.hourly_rate}/hr</div>
                    )}
                    {j.rate_type === 'flat' && j.flat_rate && (
                      <div className="text-gray-500 text-xs mt-1 font-label-caps">${j.flat_rate} Total</div>
                    )}
                  </td>
                  <td className="py-4 px-4 align-top text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => { setSelectedJobId(j.id); setHoursOpen(true); }}
                        className="p-1 text-black hover:text-gray-600 transition-colors rounded hover:bg-gray-200"
                        title="Log Hours"
                      >
                        <span className="material-symbols-outlined text-[20px]">schedule</span>
                      </button>
                      <button 
                        onClick={() => { setSelectedJobId(j.id); setMatOpen(true); }}
                        className="p-1 text-black hover:text-gray-600 transition-colors rounded hover:bg-gray-200"
                        title="Add Material"
                      >
                        <span className="material-symbols-outlined text-[20px]">add_box</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && filteredJobs.length === 0 && (
                <tr className="bg-white">
                  <td colSpan="5" className="py-8 px-6 text-center text-on-surface-variant">Loading jobs...</td>
                </tr>
              )}
              {!loading && filteredJobs.length === 0 && (
                <tr className="bg-white">
                  <td colSpan="5" className="py-8 px-6 text-center text-on-surface-variant">No jobs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#F9FAFB] border-t border-surface-container-high text-sm text-gray-500">
          <div>Showing {filteredJobs.length} jobs</div>
          <div className="flex gap-2">
            <button className="px-2 py-1 border border-surface-container-high rounded bg-white hover:bg-gray-50 disabled:opacity-50" disabled>Prev</button>
            <button className="px-2 py-1 border border-surface-container-high rounded bg-white hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
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
  );
};
