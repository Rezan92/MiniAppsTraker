import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { AddJobModal } from '../jobs/AddJobModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NotFound } from '../errors/NotFound';
import { PropertiesList } from './PropertiesList';
import { InvoicesWidget } from '../common/InvoicesWidget';

export const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showError } = useToast();
  const queryClient = useQueryClient();

  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobFormData, setJobFormData] = useState({ client_id: '', title: '', rate_type: 'flat', hourly_rate: '', flat_rate: '', start_date: '', end_date: '', notes: '' });

  const { data: client, isLoading: loadingClient, isError: errorClient } = useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/clients/${id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch client details');
      const data = await res.json();
      return data.data;
    },
    enabled: !!session?.access_token && !!id
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs', 'client', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs?client_id=${id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!session?.access_token && !!id
  });

  const handleCreateJob = async () => {
    try {
      const payload = {
        ...jobFormData,
        hourly_rate: jobFormData.rate_type === 'hourly' ? parseFloat(jobFormData.hourly_rate) : undefined,
        flat_rate: jobFormData.rate_type === 'flat' ? parseFloat(jobFormData.flat_rate) : undefined
      };
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        setJobModalOpen(false);
        setJobFormData({ client_id: '', title: '', rate_type: 'flat', hourly_rate: '', flat_rate: '', start_date: '', end_date: '', notes: '' });
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

  if (loadingClient) {
    return <div className="p-8 text-center text-gray-500">Loading client details...</div>;
  }

  if (errorClient || !client) {
    return <NotFound />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/clients" className="text-gray-500 hover:text-primary transition-colors flex items-center text-sm font-medium">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span className="ml-1">Back to Clients</span>
            </Link>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <h1 className="font-headline-lg text-headline-lg font-bold text-gray-900">{client.name}</h1>
            <span className={`px-2.5 py-0.5 rounded text-xs font-label-caps uppercase tracking-wide border ${client.status === 'inactive' ? 'bg-gray-100 text-gray-800 border-gray-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
              {client.status}
            </span>
          </div>
          <p className="font-body-md text-gray-500 mt-1 capitalize">
            {client.client_type} Client {client.company_name ? ` • ${client.company_name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-body-md font-bold rounded hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
            Edit Details
          </button>
          <button 
            onClick={() => {
              setJobFormData({ ...jobFormData, client_id: client.id });
              setJobModalOpen(true);
            }}
            className="px-4 py-2 bg-primary text-black font-body-md font-bold rounded hover:bg-opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Job
          </button>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Contact Details Card */}
        <div className="xl:col-span-4 bg-white border border-gray-200 rounded-lg p-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h3 className="font-headline-sm text-headline-sm font-semibold text-gray-900">Contact Info</h3>
            <span className="material-symbols-outlined text-gray-400">contact_page</span>
          </div>
          <div className="space-y-4 flex-1 font-body-md text-gray-700">
            {client.address && (
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-gray-400 mt-0.5 text-[20px]">business</span>
                <div>
                  <p className="font-medium text-gray-900">Address</p>
                  <p className="text-gray-500">{client.address}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-400 text-[20px]">mail</span>
              {client.email ? (
                <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
              ) : (
                <span className="text-gray-400 italic">No email provided</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-400 text-[20px]">call</span>
              <p className="text-gray-600">{client.phone || 'No phone provided'}</p>
            </div>
          </div>
        </div>

        {/* Client Notes Card */}
        <div className="xl:col-span-4 bg-white border border-gray-200 rounded-lg p-6 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h3 className="font-headline-sm text-headline-sm font-semibold text-gray-900">Client Notes</h3>
            <span className="material-symbols-outlined text-gray-400">note_alt</span>
          </div>
          <div className="flex-1">
            <textarea 
              readOnly
              className="w-full h-full min-h-[120px] resize-none bg-gray-50 border border-gray-200 rounded p-3 text-gray-700 font-body-md focus:outline-none"
              value={client.notes || 'No notes available.'}
            />
          </div>
        </div>

        {/* Financial Stats Card */}
        <div className="xl:col-span-4 h-full">
          <InvoicesWidget clientId={client.id} variant="stats" />
        </div>

        {/* Side-by-Side Tables Row */}
        <div className="xl:col-span-6 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h3 className="font-headline-sm text-lg font-semibold text-gray-900">Recent Jobs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1F2937] text-white border-b border-surface-container-high font-label-caps text-label-caps whitespace-nowrap">
                  <th className="p-4 font-semibold">Job ID</th>
                  <th className="p-4 font-semibold">Title</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Rate Type</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-gray-700">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-gray-500 italic">No recent jobs found for this client.</td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="p-4 font-label-caps text-primary">#JOB-{job.id.split('-')[0].toUpperCase()}</td>
                      <td className="p-4 font-medium">{job.title}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          job.status === 'open' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          job.status === 'in_progress' ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                          job.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          <span className="capitalize">{job.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="p-4 capitalize">{job.rate_type} Rate</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-6 h-full">
          <InvoicesWidget clientId={client.id} variant="table" />
        </div>
      </div>

      {client.client_type === 'property_manager' && (
        <PropertiesList clientId={client.id} />
      )}

      <AddJobModal 
        open={jobModalOpen}
        onClose={() => setJobModalOpen(false)}
        onSubmit={handleCreateJob}
        formData={jobFormData}
        setFormData={setJobFormData}
        clients={[{ id: client.id, name: client.name }]}
      />
    </div>
  );
};
