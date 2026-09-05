import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AddJobModal } from './AddJobModal';
import { AddMaterialModal } from './AddMaterialModal';
import { AddJobHoursModal } from './AddJobHoursModal';
import { PageHeader } from '../common/PageHeader';
import { DataTable } from '../common/DataTable';
import { JOB_STATUSES, JOB_FILTER_TABS } from '../../utils/constants';
import { StatusBadgeDropdown } from '../shared/StatusBadgeDropdown';
import { useJobs, useCreateJob, useUpdateJob, useUpdateJobStatus } from '../../hooks/api/useJobs';
import { useClients } from '../../hooks/api/useClients';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { JOB_QUERY_KEYS } from '../../hooks/api/useJobs';
import { useScreenContext } from '../../contexts/AiContext';

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

  const { data: jobs = [], isLoading: loading } = useJobs();
  const { data: clients = [] } = useClients();
  const createJobMutation = useCreateJob();
  const updateJobMutation = useUpdateJob();
  const updateJobStatusMutation = useUpdateJobStatus();

  // Register screen context for AI Copilot
  useScreenContext({
    screen: 'JobList',
    entityId: null,
    summary: {
      totalJobs: Array.isArray(jobs) ? jobs.length : 0,
      openJobs: Array.isArray(jobs) ? jobs.filter(j => j.status === 'open').length : 0,
      inProgressJobs: Array.isArray(jobs) ? jobs.filter(j => j.status === 'in_progress').length : 0,
      completedJobs: Array.isArray(jobs) ? jobs.filter(j => j.status === 'completed').length : 0
    }
  }, [jobs]);

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setOpen(true);
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSaveJob = (submittedData) => {
    const dataToUse = submittedData || formData;
    const payload = {
      ...dataToUse,
      property_id: dataToUse.property_id || null,
      hourly_rate: dataToUse.rate_type === 'hourly' ? parseFloat(dataToUse.hourly_rate) : undefined,
      flat_rate: dataToUse.rate_type === 'flat' ? parseFloat(dataToUse.flat_rate) : undefined
    };

    if (dataToUse.id) {
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

  const handleAddMaterial = async (submittedData) => {
    try {
      const dataToUse = submittedData || matData;
      const payload = { ...dataToUse, cost: parseFloat(dataToUse.cost) };
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

  const handleLogHours = async (submittedData) => {
    try {
      const dataToUse = submittedData || hoursData;
      const payload = { ...dataToUse, hours: parseFloat(dataToUse.hours) };
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

  const columns = [
    {
      header: 'Job Name & ID',
      key: 'title',
      render: (j) => (
        <div>
          <div className="font-medium text-gray-900">{j.title}</div>
          <div className="text-gray-500 font-label-caps text-[10px] mt-1">
            #JOB-{j.id?.split('-')[0].toUpperCase()}
          </div>
        </div>
      )
    },
    {
      header: 'Client',
      key: 'client',
      render: (j) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 font-bold border border-gray-200 shrink-0">
            {j.clients?.name?.substring(0, 2).toUpperCase() || 'NA'}
          </div>
          <div>
            <div className="font-medium text-gray-900">{j.clients?.name || 'Unknown Client'}</div>
            <div className="text-gray-500 text-xs">{j.clients?.email || 'No email provided'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (j) => (
        <div onClick={(e) => e.stopPropagation()}>
          <StatusBadgeDropdown
            currentStatus={j.status}
            statuses={JOB_STATUSES}
            onStatusChange={(newStatus) => handleUpdateStatus(j.id, newStatus)}
          />
        </div>
      )
    },
    {
      header: 'Rate Type',
      key: 'rate_type',
      render: (j) => (
        <div>
          <div className="text-gray-900 font-medium capitalize">{j.rate_type} Rate</div>
          {j.rate_type === 'hourly' && (
            <div className="text-gray-500 text-xs mt-1 font-label-caps">${j.hourly_rate}/hr</div>
          )}
          {j.rate_type === 'flat' && j.flat_rate && (
            <div className="text-gray-500 text-xs mt-1 font-label-caps">${j.flat_rate} Total</div>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'center',
      width: '120px',
      render: (j) => (
        <div className="flex justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
            className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 cursor-pointer"
            title="Edit Job"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button 
            onClick={() => { setSelectedJobId(j.id); setHoursOpen(true); }}
            className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 cursor-pointer"
            title="Log Hours"
          >
            <span className="material-symbols-outlined text-[18px]">schedule</span>
          </button>
          <button 
            onClick={() => { setSelectedJobId(j.id); setMatOpen(true); }}
            className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 cursor-pointer"
            title="Add Material"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
          </button>
        </div>
      )
    }
  ];

  const tableFooter = (
    <tr>
      <td colSpan={columns.length} className="bg-gray-50 border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
        <div className="flex items-center justify-between">
          <div>Showing {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}</div>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Job Tracking Engine"
        subtitle="Manage, filter, and track all active and historical jobs."
        actionButtonText="Add Job"
        actionButtonIcon="add"
        onActionClick={() => setOpen(true)}
        tabs={JOB_FILTER_TABS}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        searchPlaceholder="Search jobs, clients..."
        search={search}
        onSearchChange={setSearch}
      />

      <DataTable
        columns={columns}
        data={filteredJobs}
        isLoading={loading}
        onRowClick={(j) => navigate(`/jobs/${j.id}`)}
        emptyIcon="work_off"
        emptyTitle="No jobs found"
        emptyDescription="There are no jobs matching your selected filter."
        emptyActionText="Add Job"
        onEmptyAction={() => setOpen(true)}
        footer={tableFooter}
      />

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
    </div>
  );
};
