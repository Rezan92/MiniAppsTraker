import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { InvoicesWidget } from '../common/InvoicesWidget';
import { NotFound } from '../errors/NotFound';

export const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();

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
              onClick={() => navigate('/invoices/new')}
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

        <InvoicesWidget propertyId={property.id} />

      </div>
    </div>
  );
};
