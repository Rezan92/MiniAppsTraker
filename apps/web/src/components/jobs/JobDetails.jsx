import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AddMaterialModal } from './AddMaterialModal';
import { AddJobHoursModal } from './AddJobHoursModal';
import { AddJobModal } from './AddJobModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NotFound } from '../errors/NotFound';
import { translateApiError } from '../../utils/errorTranslator';

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
  const [matData, setMatData] = useState({ description: '', cost: '', is_from_stock: false, store: '', purchase_date: '', notes: '' });
  
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursData, setHoursData] = useState({ date: new Date().toISOString().split('T')[0], hours: '', description: '', start_time: '', end_time: '' });

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

  const { data: invoice } = useQuery({
    queryKey: ['invoice', 'job', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices?job_id=${id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const json = await res.json();
      return json.data?.[0] || null;
    },
    enabled: !!session?.access_token && !!id
  });

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

  const handleAddMaterial = async () => {
    try {
      const payload = { ...matData, cost: parseFloat(matData.cost) };
      const method = matData.id ? 'PATCH' : 'POST';
      const url = matData.id 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/materials/${matData.id}`
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
        setMatData({ description: '', cost: '', is_from_stock: false, store: '', purchase_date: '', notes: '' });
        showSuccess(`Material ${matData.id ? 'updated' : 'added'} successfully!`);
        queryClient.invalidateQueries({ queryKey: ['materials', 'job', id] });
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || `Failed to ${matData.id ? 'update' : 'add'} material`);
      }
    } catch (err) {
      console.error(err);
      showError('An unexpected error occurred.');
    }
  };

  const handleLogHours = async () => {
    try {
      const payload = { ...hoursData, hours: parseFloat(hoursData.hours) };
      const method = hoursData.id ? 'PATCH' : 'POST';
      const url = hoursData.id 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/hours/${hoursData.id}`
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
        showSuccess(`Hours ${hoursData.id ? 'updated' : 'logged'} successfully!`);
        queryClient.invalidateQueries({ queryKey: ['hours', 'job', id] });
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || `Failed to ${hoursData.id ? 'update' : 'log'} hours`);
      }
    } catch (err) {
      console.error(err);
      showError('An unexpected error occurred.');
    }
  };

  const handleDeleteHour = async (hourId) => {
    if (!window.confirm("Are you sure you want to delete this hour entry?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/hours/${hourId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        showSuccess('Hour entry deleted successfully!');
        queryClient.invalidateQueries({ queryKey: ['hours', 'job', id] });
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || 'Failed to delete hour entry');
      }
    } catch (err) {
      showError('An unexpected error occurred.');
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm("Are you sure you want to delete this material entry?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${id}/materials/${materialId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        showSuccess('Material entry deleted successfully!');
        queryClient.invalidateQueries({ queryKey: ['materials', 'job', id] });
      } else {
        const errorData = await res.json();
        showError(errorData.error?.message || 'Failed to delete material entry');
      }
    } catch (err) {
      showError('An unexpected error occurred.');
    }
  };

  const handleEditJob = async () => {
    try {
      const payload = {
        ...editFormData,
        property_id: editFormData.property_id || null,
        hourly_rate: editFormData.rate_type === 'hourly' ? parseFloat(editFormData.hourly_rate) : undefined,
        flat_rate: editFormData.rate_type === 'flat' ? parseFloat(editFormData.flat_rate) : undefined
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
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-label-caps text-[10px] uppercase font-bold border ${
              job.status === 'open' ? 'bg-amber-100 text-amber-800 border-amber-200' :
              job.status === 'in_progress' ? 'bg-sky-100 text-sky-800 border-sky-200' :
              job.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
              'bg-gray-100 text-gray-800 border-gray-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                job.status === 'open' ? 'bg-amber-500 animate-pulse' :
                job.status === 'in_progress' ? 'bg-sky-500 animate-pulse' :
                job.status === 'completed' ? 'bg-emerald-500' : 'bg-gray-500'
              }`}></span>
              {job.status.replace('_', ' ')}
            </div>
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

          {invoice ? (
            <button 
              onClick={() => navigate(`/invoices/${invoice.id}`)}
              className="px-4 py-2 bg-primary text-black rounded font-body-md font-bold hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">receipt</span>
              View Invoice
            </button>
          ) : (
            <button 
              onClick={() => navigate(`/invoices/new?job_id=${job.id}&client_id=${job.client_id}`)}
              className="px-4 py-2 bg-primary text-black rounded font-body-md font-bold hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Generate Invoice
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

        {/* Job Notes */}
        <div className="xl:col-span-8 bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow flex flex-col">
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
                  hours.map(h => (
                    <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                      <td className="p-3 font-medium">{new Date(h.date).toLocaleDateString()}</td>
                      <td className="p-3">
                        {h.start_time && h.end_time && (
                          <div className="text-xs text-gray-500">{h.start_time} - {h.end_time}</div>
                        )}
                        <div>{h.description || '-'}</div>
                      </td>
                      <td className="p-3 text-right font-medium">{h.hours} hrs</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setHoursData(h); setHoursOpen(true); }} className="text-black hover:text-primary cursor-pointer transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDeleteHour(h.id)} className="text-black hover:text-red-600 cursor-pointer transition-colors" title="Delete">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center pt-3 mt-auto border-t border-gray-100">
            <span className="font-label-md text-xs font-bold text-gray-500 uppercase tracking-widest">Total Hours</span>
            <span className="font-headline-sm text-lg font-bold text-gray-900">{totalHours} hrs</span>
          </div>
        </div>

        {/* Materials & Expenses (Span 6) */}
        <div className="xl:col-span-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
            <h3 className="font-label-caps text-xs tracking-wider text-gray-500 uppercase flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
              Materials & Expenses
            </h3>
            <button onClick={() => { setMatData({ description: '', cost: '', is_from_stock: false, store: '', purchase_date: '', notes: '' }); setMatOpen(true); }} className="px-3 py-1.5 bg-primary text-black font-body-md font-bold rounded cursor-pointer hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-1">
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
                  materials.map(m => (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                      <td className="p-3 font-medium">{m.description}</td>
                      <td className="p-3">
                        <div className="text-xs text-gray-500">{m.is_from_stock ? 'Stock' : m.store}</div>
                        <div className="text-xs">{m.purchase_date ? new Date(m.purchase_date).toLocaleDateString() : '-'}</div>
                      </td>
                      <td className="p-3 text-right font-medium">${Number(m.cost).toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setMatData(m); setMatOpen(true); }} className="text-black hover:text-primary cursor-pointer transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDeleteMaterial(m.id)} className="text-black hover:text-red-600 cursor-pointer transition-colors" title="Delete">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
    </div>
  );
};
