import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { InvoicesWidget } from '../common/InvoicesWidget';
import { AddJobModal } from '../jobs/AddJobModal';
import { NotFound } from '../errors/NotFound';
import { translateApiError } from '../../utils/errorTranslator';

export const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobFormData, setJobFormData] = useState({ client_id: '', property_id: '', title: '', rate_type: 'flat', hourly_rate: '', flat_rate: '', start_date: '', end_date: '', notes: '' });

  const { data: property, isLoading, error } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/properties/${id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session && !!id
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs', 'property', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs?property_id=${id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!session?.access_token && !!id
  });



  const handleSaveJob = async () => {
    try {
      const payload = {
        ...jobFormData,
        property_id: jobFormData.property_id || null,
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
        queryClient.invalidateQueries({ queryKey: ['jobs', 'property', id] });
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        setJobModalOpen(false);
        setJobFormData({ client_id: '', property_id: '', title: '', rate_type: 'flat', hourly_rate: '', flat_rate: '', start_date: '', end_date: '', notes: '' });
        showSuccess('Job successfully created!');
      } else {
        const errorData = await res.json();
        showError(translateApiError(errorData.error?.message || errorData.message || 'Failed to save job'));
      }
    } catch (err) {
      console.error(err);
      showError(translateApiError(err));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !property) {
    return <NotFound />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to={`/clients/${property.client_id}`} className="text-gray-500 hover:text-primary transition-colors flex items-center text-sm font-medium">
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span className="ml-1">Back to Manager ({property.clients?.name})</span>
              </Link>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <h1 className="font-headline-lg text-headline-lg font-bold text-gray-900">
                {property.name || 'Rental Property'}
              </h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-label-caps uppercase tracking-wide border bg-indigo-100 text-indigo-800 border-indigo-200">
                Active
              </span>
            </div>
            <p className="font-body-md text-gray-500 mt-1">{property.address}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setJobFormData({ ...jobFormData, client_id: property.client_id, property_id: property.id });
                setJobModalOpen(true);
              }}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-body-md font-bold rounded hover:bg-gray-50 cursor-pointer transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">engineering</span>
              Add Job
            </button>
            <button 
              onClick={() => navigate(`/invoices/new?client_id=${property.client_id}&property_id=${property.id}`)}
              className="px-4 py-2 bg-primary text-black font-body-md font-bold rounded hover:bg-opacity-90 cursor-pointer transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Invoice
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tenant Details Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-gray-900">Tenant Info</h3>
              <span className="material-symbols-outlined text-gray-400">person</span>
            </div>
            <div className="space-y-4 font-body-md text-gray-700">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-gray-400 mt-0.5 text-[20px]">badge</span>
                <div>
                  <p className="font-medium text-gray-900">Name</p>
                  <p className="text-gray-600">{property.renter_name || <span className="italic text-gray-400">No tenant name on file</span>}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-gray-400 mt-0.5 text-[20px]">phone</span>
                <div>
                  <p className="font-medium text-gray-900">Phone</p>
                  <p className="text-gray-600">{property.renter_phone || <span className="italic text-gray-400">No phone on file</span>}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Access Notes Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-gray-900">Access Notes & Details</h3>
              <span className="material-symbols-outlined text-gray-400">note_alt</span>
            </div>
            <div className="flex-1">
              <textarea 
                readOnly
                className="w-full h-full min-h-[100px] resize-none bg-gray-50 border border-gray-200 rounded p-3 text-gray-700 font-body-md focus:outline-none"
                value={property.notes || 'No notes available.'}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Related Jobs */}
          <div className="xl:col-span-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-gray-900">Related Jobs</h3>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-label-sm font-label-sm text-gray-500 uppercase tracking-wider">
                    <th className="p-4 font-medium">Job ID</th>
                    <th className="p-4 font-medium">Title</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-body-md text-gray-700 divide-y divide-gray-100 bg-white">
                  {loadingJobs ? (
                    <tr>
                      <td colSpan="3" className="p-6 text-center text-gray-500">Loading jobs...</td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="p-6 text-center text-gray-500 italic">No related jobs found.</td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr 
                        key={job.id}
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="xl:col-span-6 h-full">
            <InvoicesWidget propertyId={property.id} variant="table" />
          </div>
        </div>

      </div>

      <AddJobModal 
        open={jobModalOpen}
        onClose={() => setJobModalOpen(false)}
        onSubmit={handleSaveJob}
        formData={jobFormData}
        setFormData={setJobFormData}
        clients={[{ id: property?.client_id, name: property?.clients?.name, client_type: 'property_manager' }]}
      />
    </div>
  );
};
