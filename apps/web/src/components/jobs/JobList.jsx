import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { AddJobModal } from './AddJobModal';
import { AddMaterialModal } from './AddMaterialModal';
import { AddJobHoursModal } from './AddJobHoursModal';

export const JobList = () => {
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  
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
          className="flex items-center justify-center gap-2 bg-primary text-black px-4 py-2 rounded font-body-md font-bold cursor-pointer hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_10px_rgba(245,158,11,0.15)] h-11"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Add Job
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex space-x-1 p-1 bg-gray-100 rounded-xl border border-gray-200 inline-flex overflow-x-auto scrollbar-hide w-full md:w-auto">
          <button 
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent'}`}
          >
            All Jobs
          </button>
          <button 
            onClick={() => setStatusFilter('open')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${statusFilter === 'open' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent'}`}
          >
            Open
          </button>
          <button 
            onClick={() => setStatusFilter('in_progress')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${statusFilter === 'in_progress' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent'}`}
          >
            In Progress
          </button>
          <button 
            onClick={() => setStatusFilter('completed')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${statusFilter === 'completed' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent'}`}
          >
            Completed
          </button>
        </div>
        
        {/* Table Search */}
        <div className="relative w-full md:w-80 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
          </div>
          <input 
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-shadow shadow-sm" 
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
                <tr key={j.id} onClick={() => navigate(`/jobs/${j.id}`)} className={`hover:bg-gray-50 transition-colors group cursor-pointer ${idx % 2 !== 0 ? 'bg-[#F9FAFB]' : 'bg-white'}`}>
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
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === j.id ? null : j.id); }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                            j.status === 'open' ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200' :
                            j.status === 'in_progress' ? 'bg-sky-100 text-sky-800 border border-sky-200 hover:bg-sky-200' :
                            j.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200' :
                            'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          <span className="capitalize">{j.status.replace('_', ' ')}</span>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>expand_more</span>
                        </button>
                        
                        {/* Status Dropdown */}
                        {openMenuId === j.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                            <div className="absolute left-0 mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg z-50 py-1" onClick={e => e.stopPropagation()}>
                              <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(j.id, 'open'); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Open
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(j.id, 'in_progress'); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-50 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                In Progress
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(j.id, 'completed'); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Completed
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(j.id, 'cancelled'); }} className="w-full text-left px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                Cancelled
                              </button>
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
                  <td className="py-4 px-4 align-top text-center" onClick={e => e.stopPropagation()}>
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
