import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AddJobModal } from './AddJobModal';
import { AddMaterialModal } from './AddMaterialModal';
import { AddJobHoursModal } from './AddJobHoursModal';
import { PageHeader } from '../common/PageHeader';
import { JOB_STATUSES } from '../../utils/constants';
import { StatusBadgeDropdown } from '../shared/StatusBadgeDropdown';
import { useJobs, useCreateJob, useUpdateJob, useUpdateJobStatus } from '../../hooks/api/useJobs';
import { useClients } from '../../hooks/api/useClients';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { JOB_QUERY_KEYS } from '../../hooks/api/useJobs';

export const JobList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ client_id: '', property_id: '', title: '', rate_type: 'flat', hourly_rate: '65.00', flat_rate: '', start_date: '', end_date: '', notes: '' });

  const [matOpen, setMatOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matData, setMatData] = useState({ description: '', cost: '20.00', is_from_stock: false, store: '', purchase_date: new Date().toISOString().split('T')[0], notes: '' });

  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursData, setHoursData] = useState({ date: new Date().toISOString().split('T')[0], hours: '' });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);

  const { data: jobs = [], isLoading: loading } = useJobs();
  const { data: clients = [] } = useClients();
  const createJobMutation = useCreateJob();
  const updateJobMutation = useUpdateJob();
  const updateJobStatusMutation = useUpdateJobStatus();

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setOpen(true);
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSaveJob = () => {
    const payload = {
      ...formData,
      property_id: formData.property_id || null,
      hourly_rate: formData.rate_type === 'hourly' ? parseFloat(formData.hourly_rate) : undefined,
      flat_rate: formData.rate_type === 'flat' ? parseFloat(formData.flat_rate) : undefined
    };

    if (formData.id) {
      updateJobMutation.mutate(payload, {
        onSuccess: () => {
          setOpen(false);
          setFormData({ client_id: '', property_id: '', title: '', rate_type: 'flat', hourly_rate: '65.00', flat_rate: '', start_date: '', end_date: '', notes: '' });
        }
      });
    } else {
      createJobMutation.mutate(payload, {
        onSuccess: () => {
          setOpen(false);
          setFormData({ client_id: '', property_id: '', title: '', rate_type: 'flat', hourly_rate: '65.00', flat_rate: '', start_date: '', end_date: '', notes: '' });
        }
      });
    }
  };

  const handleAddMaterial = async () => {
    try {
      const payload = { ...matData, cost: parseFloat(matData.cost) };
      await apiClient.post(`/api/jobs/${selectedJobId}/materials`, payload);
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.all });
      setMatOpen(false);
      setMatData({ description: '', cost: '20.00', is_from_stock: false, store: '', purchase_date: new Date().toISOString().split('T')[0], notes: '' });
      showSuccess('Material added successfully!');
    } catch (err) {
      showError(err.message || 'Failed to add material');
    }
  };

  const handleUpdateStatus = (jobId, newStatus) => {
    updateJobStatusMutation.mutate({ id: jobId, status: newStatus });
  };

  const handleLogHours = async () => {
    try {
      const payload = { ...hoursData, hours: parseFloat(hoursData.hours) };
      await apiClient.post(`/api/jobs/${selectedJobId}/hours`, payload);
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.all });
      setHoursOpen(false);
      setHoursData({ date: new Date().toISOString().split('T')[0], hours: '' });
      showSuccess('Hours logged successfully!');
    } catch (err) {
      showError(err.message || 'Failed to log hours');
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
      <PageHeader
        title="Job Tracking Engine"
        subtitle="Manage, filter, and track all active and historical jobs."
        actionButtonText="Add Job"
        actionButtonIcon="add"
        onActionClick={() => setOpen(true)}
        tabs={JOB_STATUSES}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchPlaceholder="Search jobs, clients..."
        search={search}
        onSearchChange={setSearch}
      />

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
                      <StatusBadgeDropdown
                        currentStatus={j.status}
                        statuses={JOB_STATUSES}
                        onStatusChange={(newStatus) => handleUpdateStatus(j.id, newStatus)}
                      />
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
                        onClick={() => {
                          setFormData({
                            id: j.id,
                            client_id: j.client_id,
                            property_id: j.property_id || '',
                            title: j.title,
                            rate_type: j.rate_type,
                            hourly_rate: j.hourly_rate || '',
                            flat_rate: j.flat_rate || '',
                            start_date: j.start_date || '',
                            end_date: j.end_date || '',
                            notes: j.notes || ''
                          });
                          setOpen(true);
                        }}
                        className="p-1 text-black hover:text-gray-600 transition-colors rounded hover:bg-gray-200"
                        title="Edit Job"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
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
        onClose={() => {
          setOpen(false);
          setFormData({ client_id: '', property_id: '', title: '', rate_type: 'flat', hourly_rate: '65.00', flat_rate: '', start_date: '', end_date: '', notes: '' });
        }}
        onSubmit={handleSaveJob}
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
      {/* Status Dropdown Portal */}

    </div>
  );
};
