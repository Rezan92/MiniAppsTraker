import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';
import { Tooltip } from '../common/Tooltip';
import { ConfirmModal } from '../common/ConfirmModal';
import { LaborCard } from './LaborCard';
import { MaterialCard } from './MaterialCard';
import { ClientDetailsForm } from './ClientDetailsForm';

export const InvoiceBuilder = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const fromJobId = location.state?.fromJob;
  const presetClientId = searchParams.get('client_id');
  const presetPropertyId = searchParams.get('property_id');
  const presetJobId = searchParams.get('job_id') || fromJobId;
  const [deleteItemId, setDeleteItemId] = useState(null);

  const handleBackNavigation = () => {
    if (fromJobId) {
      navigate(`/jobs/${fromJobId}`);
    } else {
      navigate('/invoices');
    }
  };

  const [formData, setFormData] = useState({
    client_id: presetClientId || '',
    job_id: presetJobId || '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    property_address: '',
    labor_title: 'Labor',
    labor_notes: '',
    labor_amount: 0,
    bill_to_type: 'client_name',
    billed_to_name: '',
    property_id: presetPropertyId || '',
    breakdown_by_days: false
  });

  const [hasAutoPopulatedJob, setHasAutoPopulatedJob] = useState(false);

  useEffect(() => {
    if (presetJobId && !isEditing && session && !hasAutoPopulatedJob) {
      const fetchPresetJob = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/from-job/${presetJobId}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          const json = await res.json();
          if (!res.ok || !json.success) return;
          
          const payload = json.data;
          setFormData(prev => ({
            ...prev,
            client_id: prev.client_id || payload.client_id,
            labor_title: payload.labor_title || 'Labor',
            labor_amount: payload.labor_amount || 0,
            property_id: payload.property_id || '',
            property_address: payload.property_address || prev.property_address
          }));
          setHasAutoPopulatedJob(true);
        } catch (err) {
          console.error(err);
        }
      };
      fetchPresetJob();
    }
  }, [presetJobId, isEditing, session, hasAutoPopulatedJob]);

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/clients`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session
  });

  // Fetch available jobs for selected client
  const { data: availableJobs = [] } = useQuery({
    queryKey: ['jobs', 'available', formData.client_id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs?client_id=${formData.client_id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session && !!formData.client_id
  });

  // Fetch properties for selected client
  const { data: properties = [] } = useQuery({
    queryKey: ['properties', formData.client_id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/properties?client_id=${formData.client_id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session && !!formData.client_id
  });

  // Fetch existing invoice if editing
  const { data: existingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/${id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session && isEditing
  });

  useEffect(() => {
    if (existingInvoice) {
      if (existingInvoice.status !== 'draft') {
        showError("Only draft invoices can be edited");
        navigate(`/invoices/${id}`);
        return;
      }
      const lineItems = existingInvoice.invoice_line_items || [];
      const billableLabor = lineItems.filter(i => (i.source_type === 'labor' || i.source_type === 'ad_hoc') && i.is_billable !== false).reduce((sum, i) => sum + Number(i.amount || 0), 0);
      const flatRate = Math.max(0, Number(existingInvoice.labor_amount || 0) - billableLabor);

      setFormData({
        client_id: existingInvoice.client_id,
        job_id: existingInvoice.job_id || '',
        invoice_date: existingInvoice.invoice_date,
        due_date: existingInvoice.due_date || '',
        property_address: existingInvoice.property_address || '',
        bill_to_type: existingInvoice.bill_to_type || 'client_name',
        billed_to_name: existingInvoice.billed_to_name || '',
        property_id: existingInvoice.property_id || '',
        labor_title: existingInvoice.labor_title || '',
        labor_notes: existingInvoice.labor_notes || '',
        labor_amount: flatRate,
        breakdown_by_days: existingInvoice.breakdown_by_days || false
      });
    }
  }, [existingInvoice, navigate, showError]);

  useEffect(() => {
    if (!isEditing && formData.client_id && !formData.billed_to_name) {
      const client = clients?.find(c => c.id === formData.client_id);
      const prop = properties?.find(p => p.id === formData.property_id) || (clients?.find(c => c.id === formData.client_id && c.address) ? {address: clients.find(c => c.id === formData.client_id).address} : null);
      if (client && prop && !formData.billed_to_name) {
        const type = client.company_name ? 'company_name' : 'client_name';
        const billedToName = client.company_name || client.name;
        
        setFormData(prev => ({
          ...prev,
          bill_to_type: type,
          billed_to_name: billedToName,
          property_address: prop.address
        }));
      }
    }
  }, [presetClientId, presetPropertyId, clients, properties, isEditing, formData.billed_to_name]);

  const handleJobSelect = async (e) => {
    const jobId = e.target.value;
    setFormData(prev => ({ ...prev, job_id: jobId }));
    if (!jobId) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/from-job/${jobId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      
      const payload = json.data;
      setFormData(prev => ({
        ...prev,
        labor_title: payload.labor_title || 'Labor',
        labor_amount: payload.labor_amount || 0,
        property_address: payload.property_address || prev.property_address,
        property_id: payload.property_id || prev.property_id
      }));
      showSuccess("Auto-populated from job");
    } catch (err) {
      showError(translateApiError(err));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let finalBilledToName = formData.billed_to_name;
      if (!finalBilledToName && formData.client_id) {
        const client = clients?.find(c => c.id === formData.client_id);
        if (formData.bill_to_type === 'company_name' && client?.company_name) {
          finalBilledToName = client.company_name;
        } else if (formData.bill_to_type === 'client_name' && client?.name) {
          finalBilledToName = client.name;
        } else if (formData.bill_to_type === 'renter_name' && formData.property_id) {
          const prop = properties?.find(p => p.id === formData.property_id);
          finalBilledToName = prop?.renter_name || 'Unknown Tenant';
        } else if (formData.bill_to_type === 'property_address' && formData.property_id) {
          const prop = properties?.find(p => p.id === formData.property_id);
          finalBilledToName = prop?.address || 'Unknown Address';
        }
      }

      const payload = {
        ...formData,
        job_id: formData.job_id || null,
        property_id: formData.property_id || null,
        billed_to_name: finalBilledToName,
        labor_amount: Number(formData.labor_amount) || 0
      };
      
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices${isEditing ? `/${id}` : ''}`;
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(typeof json.error === 'object' ? json.error.message : json.error);
      return json.data;
    },
    onSuccess: (data) => {
      showSuccess(`Invoice ${isEditing ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries(['invoices']);
      if (!isEditing) {
        navigate(`/invoices/${data.id}/edit`, { state: { fromJob: fromJobId } });
      } else {
        queryClient.invalidateQueries(['invoice', id]);
        navigate(`/invoices/${id}`, { state: { fromJob: fromJobId } });
      }
    },
    onError: (err) => {
      showError(translateApiError(err));
    }
  });

  // LINE ITEM MUTATIONS
  const addItemMutation = useMutation({
    mutationFn: async (items) => {
      for (const item of items) {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/${id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify(item)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice', id]);
      showSuccess('Items added to draft');
    },
    onError: (err) => showError(err.message)
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/${id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(updates)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    },
    onSuccess: () => queryClient.invalidateQueries(['invoice', id]),
    onError: (err) => showError(err.message)
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/${id}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invoice', id]);
      showSuccess('Item removed');
    },
    onError: (err) => showError(err.message)
  });

  const selectedJob = availableJobs.find(j => j.id === formData.job_id);
  const lineItems = existingInvoice?.invoice_line_items?.sort((a,b) => a.sort_order - b.sort_order) || [];
  const isFlatRate = selectedJob?.rate_type === 'flat';
  
  const laborLineItemsSubtotal = lineItems
    .filter(i => (i.source_type === 'labor' || i.source_type === 'ad_hoc') && i.is_billable !== false)
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);
    
  const materialsSubtotal = lineItems
    .filter(i => i.source_type === 'material' && i.is_billable !== false)
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  
  const laborTotal = (Number(formData.labor_amount) || 0) + laborLineItemsSubtotal;
  const totalDue = laborTotal + materialsSubtotal;

  // Auto-populate flat rate if it's 0 (fixes older drafts)
  useEffect(() => {
    if (selectedJob?.rate_type === 'flat' && selectedJob?.flat_rate && Number(formData.labor_amount) === 0) {
      setFormData(prev => ({ ...prev, labor_amount: selectedJob.flat_rate }));
    }
  }, [selectedJob, formData.labor_amount]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <button onClick={handleBackNavigation} className="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {fromJobId ? 'Back to Job' : 'Back to Invoices'}
          </button>
          <h1 className="text-headline-md font-bold text-gray-900">
            {isEditing ? `Edit Draft Invoice` : 'Create New Invoice'}
          </h1>
        </div>
          <div className="flex gap-4">
            {formData.job_id && (
              <button 
                type="button" 
                onClick={() => navigate(`/jobs/${formData.job_id}`)}
                className="px-6 py-2 border border-gray-300 rounded-lg font-title-sm text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">work</span>
                View Job
              </button>
            )}
            <button 
              type="button" 
              onClick={handleBackNavigation}
              className="px-6 py-2 border border-gray-300 rounded-lg font-title-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isLoading || !formData.client_id}
              className="px-6 py-2 bg-primary text-black rounded-lg font-title-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {saveMutation.isLoading ? 'Saving...' : (isEditing ? 'Save Details' : 'Create Draft Invoice')}
            </button>
          </div>
        </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-8 space-y-8">
          
          {/* Header Info */}
          <ClientDetailsForm 
            formData={formData}
            setFormData={setFormData}
            clients={clients}
            properties={properties}
            availableJobs={availableJobs}
            isEditing={isEditing}
            handleJobSelect={handleJobSelect}
          />

          {/* Labor Base Section */}
          <div className="pb-4">
            <h3 className="font-title-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4 flex items-center gap-3">
              Base Labor (Optional)
              {selectedJob?.rate_type === 'flat' && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Flat Rate Job (${Number(selectedJob.flat_rate || 0).toFixed(2)})
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="md:col-span-3">
                <label className="block text-label-md text-gray-700 mb-1">Labor Title</label>
                <input 
                  type="text" 
                  value={formData.labor_title}
                  onChange={(e) => setFormData({...formData, labor_title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-bold"
                  placeholder="e.g. Repairs & Installation"
                />
              </div>
              <div>
                <label className="block text-label-md text-gray-700 mb-1">Base Labor Amount ($)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.labor_amount}
                  onChange={(e) => setFormData({...formData, labor_amount: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-right font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-label-md text-gray-700 mb-1">Labor Notes (Optional)</label>
              <input 
                type="text" 
                value={formData.labor_notes}
                onChange={(e) => setFormData({...formData, labor_notes: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary italic text-sm"
                placeholder="e.g. Minimum 1-hour service charge applied"
              />
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.breakdown_by_days}
                  onChange={(e) => setFormData({...formData, breakdown_by_days: e.target.checked})}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2 cursor-pointer transition-colors"
                />
                <span className="font-bold text-gray-800 group-hover:text-primary transition-colors">Breakdown into days</span>
                <Tooltip content="When checked, the final invoice PDF will group labor items by their specific service date instead of one continuous list." />
              </label>
            </div>
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-8">
            <h3 className="font-title-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-6">Itemized Billing</h3>
            
            <div className="space-y-8 mt-6">
              <LaborCard 
                lineItems={lineItems}
                formData={formData}
                session={session}
                addItemMutation={addItemMutation}
                updateItemMutation={updateItemMutation}
                setDeleteItemId={setDeleteItemId}
                selectedJob={availableJobs.find(j => j.id === formData.job_id)}
              />
              
              <MaterialCard 
                lineItems={lineItems}
                formData={formData}
                session={session}
                addItemMutation={addItemMutation}
                updateItemMutation={updateItemMutation}
                setDeleteItemId={setDeleteItemId}
              />
            </div>

            {/* Totals Section */}
            <div className="mt-8 flex justify-end">
              <div className="w-72 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner">
                <div className="space-y-3 mb-4 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Labor Subtotal:</span>
                    <span>${laborTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Materials Subtotal:</span>
                    <span>${materialsSubtotal.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-xl border-t border-gray-200 pt-3">
                  <span>Total Due:</span>
                  <span>${totalDue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-blue-800 text-center shadow-sm">
          <span className="material-symbols-outlined text-[32px] mb-2 text-blue-500">info</span>
          <h3 className="font-bold text-lg mb-1">Almost there!</h3>
          <p>Please click <strong>"Create Draft Invoice"</strong> in the top right. Once the draft is saved, you will be able to add itemized charges from the job.</p>
        </div>
      )}

      <ConfirmModal 
        open={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => {
          if (deleteItemId) deleteItemMutation.mutate(deleteItemId);
        }}
        title="Delete Item"
        message="Are you sure you want to remove this item from the invoice? This cannot be undone."
        confirmText="Remove Item"
        confirmColor="red"
      />
    </div>
  );
};
