import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AddMaterialModal } from './AddMaterialModal';
import { AddJobHoursModal } from './AddJobHoursModal';
import { AddJobModal } from './AddJobModal';
import { DeleteJobItemModal } from './DeleteJobItemModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotFound } from '../errors/NotFound';
import { translateApiError } from '../../utils/errorTranslator';
import { STATUS_COLORS, JOB_STATUSES } from '../../utils/constants';
import { StatusBadgeDropdown } from '../shared/StatusBadgeDropdown';
import { useScreenContext } from '../../contexts/AiContext';

export const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ id: '', client_id: '', property_id: '', title: '', rate_type: 'flat', hourly_rate: '', flat_rate: '', start_date: '', end_date: '', notes: '' });

  // Modals state
  const [matOpen, setMatOpen] = useState(false);
  const [matData, setMatData] = useState({ description: '', cost: '20.00', is_from_stock: false, store: '', purchase_date: new Date().toISOString().split('T')[0], notes: '' });
  
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursData, setHoursData] = useState({ date: new Date().toISOString().split('T')[0], hours: '', description: '', start_time: '', end_time: '' });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const { data: job, isLoading: loadingJob, isError: errorJob } = useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch job details');
      const data = await res.json();
      return data.data;
    },
    enabled: !!session?.access_token && !!id
  });

  const rawInvoices = job?.invoices;
  const invoices = Array.isArray(rawInvoices) ? rawInvoices : (rawInvoices ? [rawInvoices] : []);
  const draftInvoice = invoices.find(inv => inv.status === 'draft');

  const { data: materials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: ['materials', 'job', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/materials`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch materials');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!session?.access_token && !!id
  });

  const { data: hours = [], isLoading: loadingHours } = useQuery({
    queryKey: ['hours', 'job', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/hours`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch hours');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!session?.access_token && !!id
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/clients`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to fetch clients');
      return data.data;
    },
    enabled: !!session?.access_token
  });

  // Register screen context envelope for AI Copilot
  useScreenContext({
    screen: 'JobDetails',
    entityId: id,
    summary: {
      title: job?.title,
      clientName: job?.clients?.name,
      clientId: job?.client_id,
      status: job?.status,
      rateType: job?.rate_type,
      hourlyRate: job?.hourly_rate,
      flatRate: job?.flat_rate,
      totalHours: hours?.reduce((acc, h) => acc + Number(h.hours || 0), 0) || 0,
      totalMaterialsCost: materials?.reduce((acc, m) => acc + Number(m.cost || 0), 0) || 0
    }
  }, [job, hours, materials, id]);

  const handleAddMaterial = async (submittedData) => {
    try {
      const dataToUse = submittedData || matData;
      const payload = { ...dataToUse, cost: parseFloat(dataToUse.cost) };
      if (!dataToUse.id && draftInvoice) {
        payload.invoice_id = draftInvoice.id;
      }
      const method = dataToUse.id ? 'PATCH' : 'POST';
      const url = dataToUse.id 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/materials/${dataToUse.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/materials`;

      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setMatOpen(false);
        setMatData({ description: '', cost: '20.00', is_from_stock: false, store: '', purchase_date: new Date().toISOString().split('T')[0], notes: '' });
        showSuccess(`Material ${dataToUse.id ? 'updated' : 'added'} successfully!`);
        queryClient.invalidateQueries({ queryKey: ['materials', 'job', id] });
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || `Failed to ${dataToUse.id ? 'update' : 'add'} material`);
      }
    } catch (err) {
      console.error(err);
      showError('An unexpected error occurred.');
    }
  };

  const handleLogHours = async (submittedData) => {
    try {
      const dataToUse = submittedData || hoursData;
      const payload = { ...dataToUse, hours: parseFloat(dataToUse.hours) };
      if (!dataToUse.id && draftInvoice) {
        payload.invoice_id = draftInvoice.id;
      }
      const method = dataToUse.id ? 'PATCH' : 'POST';
      const url = dataToUse.id 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/hours/${dataToUse.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/hours`;

      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setHoursOpen(false);
        setHoursData({ date: new Date().toISOString().split('T')[0], hours: '', description: '', start_time: '', end_time: '' });
        showSuccess(`Hours ${dataToUse.id ? 'updated' : 'logged'} successfully!`);
        queryClient.invalidateQueries({ queryKey: ['hours', 'job', id] });
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || `Failed to ${dataToUse.id ? 'update' : 'log'} hours`);
      }
    } catch (err) {
      console.error(err);
      showError('An unexpected error occurred.');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['job', id] });
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

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const { id: itemId, type } = itemToDelete;
    const endpoint = type === 'hour' ? 'hours' : 'materials';
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/${endpoint}/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        showSuccess(`${type === 'hour' ? 'Hour' : 'Material'} entry deleted successfully!`);
        queryClient.invalidateQueries({ queryKey: [endpoint, 'job', id] });
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || `Failed to delete ${type} entry`);
      }
    } catch (err) {
      showError('An unexpected error occurred.');
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleEditJob = async (submittedData) => {
    try {
      const dataToUse = submittedData || editFormData;
      const payload = {
        ...dataToUse,
        property_id: dataToUse.property_id || null,
        hourly_rate: dataToUse.rate_type === 'hourly' ? parseFloat(dataToUse.hourly_rate) : undefined,
        flat_rate: dataToUse.rate_type === 'flat' ? parseFloat(dataToUse.flat_rate) : undefined
      };
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['job', id] });
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        setEditOpen(false);
        showSuccess('Job successfully updated!');
      } else {
        const errorData = await res.json();
        showError(translateApiError(errorData.error?.message || errorData.message || 'Failed to update job'));
      }
    } catch (err) {
      console.error(err);
      showError(translateApiError(err));
    }
  };

  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: job.client_id,
        job_id: job.id,
        labor_title: job.title,
        property_id: job.property_id || null,
        property_address: job.rental_properties?.address || null,
        labor_amount: 0,
        invoice_date: new Date().toISOString().split('T')[0]
      };
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || json.error || 'Failed to create draft');
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['jobs', id]);
      navigate(`/invoices/${data.id}/edit`, { state: { fromJob: id } });
    },
    onError: (err) => {
      showError(translateApiError(err));
    }
  });

  if (loadingJob) {
    return <div className="p-8 text-center text-gray-500">Loading job details...</div>;
  }

  if (errorJob || !job) {
    return <NotFound />;
  }

  const totalMaterialsCost = materials.reduce((acc, m) => acc + Number(m.cost), 0);
  const totalHours = hours.reduce((acc, h) => acc + Number(h.hours), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/jobs" className="text-gray-500 font-label-md text-sm hover:text-primary transition-colors flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to Jobs
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500 font-label-caps text-xs tracking-widest uppercase">
              #JOB-{job.id.split('-')[0]}
            </span>
          </div>
          <h1 className="font-headline-lg text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
          <div className="flex items-center gap-4">
            <Link to={`/clients/${job.client_id}`} className="flex items-center gap-1 text-primary font-body-md hover:underline font-medium">
              <span className="material-symbols-outlined text-[18px]">domain</span>
              {job.clients?.name || 'Unknown Client'}
            </Link>
            <StatusBadgeDropdown
              currentStatus={job.status}
              statuses={JOB_STATUSES}
              onStatusChange={(newStatus) => handleUpdateStatus(newStatus)}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setEditFormData({
                id: job.id,
                client_id: job.client_id,
                property_id: job.property_id || '',
                title: job.title,
                rate_type: job.rate_type,
                hourly_rate: job.hourly_rate || '',
                flat_rate: job.flat_rate || '',
                start_date: job.start_date || '',
                end_date: job.end_date || '',
                notes: job.notes || ''
              });
              setEditOpen(true);
            }}
            className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 font-body-md font-bold hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit Job
          </button>

          {draftInvoice ? (
            <button 
              onClick={() => navigate(`/invoices/${draftInvoice.id}`, { state: { fromJob: id } })}
              className="px-4 py-2 bg-primary text-black rounded font-body-md font-bold hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">receipt</span>
              View Draft Invoice
            </button>
          ) : (
            <button 
              onClick={() => generateInvoiceMutation.mutate()}
              disabled={generateInvoiceMutation.isPending}
              className="px-4 py-2 bg-primary text-black rounded font-body-md font-bold hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              {generateInvoiceMutation.isPending ? 'Generating...' : 'Generate Invoice'}
            </button>
          )}
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Job Overview */}
        <div className="xl:col-span-4 bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
            <h3 className="font-label-caps text-xs tracking-wider text-gray-500 uppercase flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-[18px]">info</span>
              Job Overview
            </h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-label-caps uppercase tracking-wide">Start Date</p>
                <p className="text-gray-900 font-medium">{job.start_date ? new Date(job.start_date).toLocaleDateString() : 'TBD'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-label-caps uppercase tracking-wide">End Date</p>
                <p className="text-gray-900 font-medium">{job.end_date ? new Date(job.end_date).toLocaleDateString() : 'TBD'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
              <div>
                <p className="text-xs text-gray-500 font-label-caps uppercase tracking-wide">Rate Type</p>
                <p className="text-gray-900 font-medium capitalize">{job.rate_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-label-caps uppercase tracking-wide">Rate</p>
                <p className="text-gray-900 font-medium">
                  {job.rate_type === 'hourly' ? `$${job.hourly_rate}/hr` : `$${job.flat_rate}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Invoices */}
        <div className="xl:col-span-4 bg-white border border-gray-200 rounded-lg p-6 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
            <h3 className="font-label-caps text-xs tracking-wider text-gray-500 uppercase flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              Related Invoices
            </h3>
          </div>
          <div className="flex-1 space-y-3">
            {invoices.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No invoices generated yet.</p>
            ) : (
              invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 border border-gray-100 rounded bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Link to={`/invoices/${inv.id}`} className="font-body-md font-bold text-gray-900 hover:text-primary transition-colors">
                    #{inv.invoice_number}
                  </Link>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[inv.status] || STATUS_COLORS.draft}`}>
                    {inv.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Job Notes */}
        <div className="xl:col-span-4 bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
            <h3 className="font-label-caps text-xs tracking-wider text-gray-500 uppercase flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-[18px]">note_alt</span>
              Scope & Notes
            </h3>
          </div>
          <div className="flex-1">
            <textarea 
              readOnly
              className="w-full h-full min-h-[120px] p-3 bg-gray-50 border border-gray-200 rounded text-gray-700 focus:outline-none resize-none" 
              value={job.notes || 'No scope notes provided.'}
            />
          </div>
        </div>

        {/* Labor & Time (Span 6) */}
        <div className="xl:col-span-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
            <h3 className="font-label-caps text-xs tracking-wider text-gray-500 uppercase flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              Labor & Time
            </h3>
            <button onClick={() => { setHoursData({ date: new Date().toISOString().split('T')[0], hours: '', description: '', start_time: '', end_time: '' }); setHoursOpen(true); }} className="px-3 py-1.5 bg-primary text-black font-body-md font-bold rounded cursor-pointer hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Time
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left font-body-md text-sm">
              <thead className="bg-[#1F2937] text-white border-b border-surface-container-high font-label-caps text-label-caps whitespace-nowrap">
                <tr>
                  <th className="p-3 border-b border-gray-200">Date</th>
                  <th className="p-3 border-b border-gray-200">Time / Desc</th>
                  <th className="p-3 border-b border-gray-200 text-center">Status</th>
                  <th className="p-3 border-b border-gray-200 text-right">Hours</th>
                  <th className="p-3 border-b border-gray-200 text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {loadingHours ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-500">Loading hours...</td>
                  </tr>
                ) : hours.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-400 italic">No hours logged yet.</td>
                  </tr>
                ) : (
                  hours.map(h => {
                    const isLocked = h.billing_status === 'billed' || h.billing_status === 'on_draft';
                    return (
                    <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                      <td className="p-3 font-medium">{new Date(h.date).toLocaleDateString()}</td>
                      <td className="p-3">
                        {h.start_time && h.end_time && (
                          <div className="text-xs text-gray-500">{h.start_time} - {h.end_time}</div>
                        )}
                        <div>{h.description || '-'}</div>
                      </td>
                      <td className="p-3 text-center">
                        {h.billing_status === 'billed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🟢 Billed
                          </span>
                        ) : h.billing_status === 'on_draft' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            🔵 On Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                            🔴 Unbilled
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">{Number(h.hours).toFixed(2)} hrs</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { setHoursData(h); setHoursOpen(true); }} 
                            className={`transition-colors ${isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-black hover:text-primary cursor-pointer'}`}
                            disabled={isLocked}
                            title={isLocked ? "This item is linked to a finalized invoice. To bill for additional work, please add a new unbilled item." : "Edit"}
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button 
                            onClick={() => { setItemToDelete({ id: h.id, type: 'hour' }); setDeleteModalOpen(true); }} 
                            className={`transition-colors ${isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-black hover:text-red-600 cursor-pointer'}`}
                            disabled={isLocked}
                            title={isLocked ? "This item is linked to a finalized invoice and cannot be deleted." : "Delete"}
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center pt-3 mt-auto border-t border-gray-100">
            <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-widest">Total Hours</span>
            <span className="font-headline-sm text-lg font-bold text-gray-900">{Number(totalHours).toFixed(2)} hrs</span>
          </div>
        </div>

        {/* Materials & Expenses (Span 6) */}
        <div className="xl:col-span-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
            <h3 className="font-label-caps text-xs tracking-wider text-gray-500 uppercase flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
              Materials & Expenses
            </h3>
            <button onClick={() => { setMatData({ description: '', cost: '20.00', is_from_stock: false, store: '', purchase_date: new Date().toISOString().split('T')[0], notes: '' }); setMatOpen(true); }} className="px-3 py-1.5 bg-primary text-black font-body-md font-bold rounded cursor-pointer hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Material
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left font-body-md text-sm">
              <thead className="bg-[#1F2937] text-white border-b border-surface-container-high font-label-caps text-label-caps whitespace-nowrap">
                <tr>
                  <th className="p-3 border-b border-gray-200">Item</th>
                  <th className="p-3 border-b border-gray-200">Source / Date</th>
                  <th className="p-3 border-b border-gray-200 text-center">Status</th>
                  <th className="p-3 border-b border-gray-200 text-right">Cost</th>
                  <th className="p-3 border-b border-gray-200 text-right w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {loadingMaterials ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-500">Loading materials...</td>
                  </tr>
                ) : materials.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-400 italic">No materials added yet.</td>
                  </tr>
                ) : (
                  materials.map(m => {
                    const isLocked = m.billing_status === 'billed' || m.billing_status === 'on_draft';
                    return (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{m.description}</div>
                        {m.notes && <div className="text-xs text-gray-500 mt-1">{m.notes}</div>}
                      </td>
                      <td className="p-3">
                        {m.is_from_stock ? (
                          <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold font-label-caps uppercase">Stock</span>
                        ) : (
                          <div className="text-sm">
                            <div className="font-medium">{m.store || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{m.purchase_date ? new Date(m.purchase_date).toLocaleDateString() : 'No date'}</div>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {m.billing_status === 'billed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🟢 Billed
                          </span>
                        ) : m.billing_status === 'on_draft' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            🔵 On Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                            🔴 Unbilled
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">${Number(m.cost).toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { setMatData(m); setMatOpen(true); }} 
                            className={`transition-colors ${isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-black hover:text-primary cursor-pointer'}`}
                            disabled={isLocked}
                            title={isLocked ? "This item is linked to a finalized invoice. To bill for additional work, please add a new unbilled item." : "Edit"}
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button 
                            onClick={() => { setItemToDelete({ id: m.id, type: 'material' }); setDeleteModalOpen(true); }} 
                            className={`transition-colors ${isLocked ? 'text-gray-300 cursor-not-allowed' : 'text-black hover:text-red-600 cursor-pointer'}`}
                            disabled={isLocked}
                            title={isLocked ? "This item is linked to a finalized invoice and cannot be deleted." : "Delete"}
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center pt-3 mt-auto border-t border-gray-100">
            <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-widest">Total Materials</span>
            <span className="font-headline-sm text-lg font-bold text-gray-900">${totalMaterialsCost.toFixed(2)}</span>
          </div>
        </div>

      </div>

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
        formData={hoursData} 
        setFormData={setHoursData} 
      />
      <AddJobModal 
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditJob}
        formData={editFormData}
        setFormData={setEditFormData}
        clients={clients}
      />
      <DeleteJobItemModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={confirmDelete}
        type={itemToDelete?.type}
      />
    </div>
  );
};
