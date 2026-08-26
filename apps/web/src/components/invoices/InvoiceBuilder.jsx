import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';
import { DatePicker } from '../common/DatePicker';
import { Tooltip } from '../common/Tooltip';
import { SmartDropdown } from './SmartDropdown';
import { ConfirmModal } from '../common/ConfirmModal';

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
    due_date: '',
    property_address: '',
    labor_title: 'Labor',
    labor_notes: '',
    labor_amount: 0,
    bill_to_type: 'client_name',
    billed_to_name: '',
    property_id: presetPropertyId || ''
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
        labor_amount: existingInvoice.labor_amount || 0
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
        property_address: payload.property_address || prev.property_address
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

  const lineItems = existingInvoice?.invoice_line_items?.sort((a,b) => a.sort_order - b.sort_order) || [];
  const lineItemsSubtotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalDue = (Number(formData.labor_amount) || 0) + lineItemsSubtotal;

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
          <button 
            type="button" 
            onClick={handleBackNavigation}
            className="px-6 py-2 border border-gray-300 rounded-lg font-title-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isLoading || !formData.client_id}
            className="px-6 py-2 bg-primary text-black rounded-lg font-title-sm hover:opacity-90 disabled:opacity-50"
          >
            {saveMutation.isLoading ? 'Saving...' : (isEditing ? 'Save Details' : 'Create Draft Invoice')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-8 space-y-8">
          
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-100 pb-8">
            <div className="space-y-4">
              <h3 className="font-title-lg font-bold text-gray-900 border-b border-gray-200 pb-2">Client Details</h3>
              <div>
                <label className="block text-label-md text-gray-700 mb-1">Select Client *</label>
                <select 
                  value={formData.client_id}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const client = clients?.find(c => c.id === cid);
                    setFormData({
                      ...formData, 
                      client_id: cid, 
                      job_id: '',
                      bill_to_type: 'client_name',
                      billed_to_name: client?.name || '',
                      property_address: client?.address || ''
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                  required
                >
                  <option value="">Select a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              </div>

              {formData.client_id && (
                <div>
                  <label className="block text-label-md text-gray-700 mb-1">Bill To</label>
                  <select 
                    value={formData.bill_to_type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const client = clients.find(c => c.id === formData.client_id);
                      let billedToName = client?.name || '';
                      if (type === 'company_name' && client?.company_name) billedToName = client.company_name;
                      setFormData({...formData, bill_to_type: type, billed_to_name: billedToName});
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white mb-3"
                  >
                    <option value="client_name">Client Name ({clients.find(c => c.id === formData.client_id)?.name})</option>
                    {clients.find(c => c.id === formData.client_id)?.company_name && (
                      <option value="company_name">Company Name ({clients.find(c => c.id === formData.client_id)?.company_name})</option>
                    )}
                    {clients.find(c => c.id === formData.client_id)?.client_type === 'property_manager' && (
                      <option value="renter_name">Tenant (Renter)</option>
                    )}
                  </select>
                </div>
              )}
              {formData.client_id && (
                <div>
                  <label className="block text-label-md text-gray-700 mb-1">
                    Property Address {!formData.job_id && "(Optional)"}
                  </label>
                  
                  {formData.job_id ? (
                    <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed">
                      {formData.property_address || 'No property assigned to job'}
                    </div>
                  ) : (
                    (clients.find(c => c.id === formData.client_id)?.address || properties.length > 0) ? (
                      <select
                        value={formData.property_address}
                        onChange={(e) => {
                           const val = e.target.value;
                           const prop = properties.find(p => p.address === val);
                           let newBilledToName = formData.billed_to_name;
                           if (formData.bill_to_type === 'renter_name') {
                             newBilledToName = prop?.renter_name || 'Unknown Tenant';
                           }
                           setFormData({
                             ...formData, 
                             property_address: val, 
                             property_id: prop ? prop.id : '',
                             billed_to_name: newBilledToName
                           });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                      >
                        <option value="">Leave blank</option>
                        {clients.find(c => c.id === formData.client_id)?.address && (
                          <option value={clients.find(c => c.id === formData.client_id)?.address}>
                            [Primary Address] {clients.find(c => c.id === formData.client_id)?.address}
                          </option>
                        )}
                        {properties.map(p => (
                          <option key={p.id} value={p.address}>
                            {p.name ? `${p.name} - ` : ''}{p.address}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <textarea 
                        value={formData.property_address}
                        onChange={(e) => setFormData({...formData, property_address: e.target.value, property_id: ''})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        rows="2"
                        placeholder="e.g. 123 Main St, Apt 4B"
                      />
                    )
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-title-lg font-bold text-gray-900 border-b border-gray-200 pb-2">Invoice Details</h3>
              
              <div>
                <label className="block text-label-md text-gray-700 mb-1 flex justify-between">
                  <span>Linked Job (Optional)</span>
                  {formData.job_id && <span className="text-green-600 text-xs font-bold">Linked</span>}
                </label>
                <Tooltip text={isEditing ? "An invoice is permanently linked to its parent job. To bill a different job, delete this draft and create a new one." : ""} position="top">
                  <div className="w-full">
                    <select 
                      value={formData.job_id}
                      onChange={handleJobSelect}
                      disabled={!formData.client_id || isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white disabled:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                    <option value="">Select an available job...</option>
                    {availableJobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                    </select>
                  </div>
                </Tooltip>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md text-gray-700 mb-1">Invoice Date *</label>
                  <DatePicker
                    value={formData.invoice_date}
                    onChange={(val) => setFormData({...formData, invoice_date: val})}
                    placeholder="Select date"
                  />
                </div>
                <div>
                  <label className="block text-label-md text-gray-700 mb-1">Due Date</label>
                  <DatePicker
                    value={formData.due_date}
                    onChange={(val) => setFormData({...formData, due_date: val})}
                    placeholder="Upon Receipt"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank for "Upon Receipt"</p>
                </div>
              </div>
            </div>
          </div>

          {/* Labor Base Section */}
          <div className="pb-4">
            <h3 className="font-title-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Base Labor (Optional)</h3>
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
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-8">
            <h3 className="font-title-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-6">Itemized Billing</h3>
            
            <div className="space-y-8 mt-6">
              {/* Labor Section */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                  <h4 className="font-bold text-gray-900 text-lg">Labor & Services</h4>
                  <div className="w-1/2 max-w-sm">
                    <SmartDropdown 
                      jobId={formData.job_id} 
                      session={session} 
                      filterType="labor"
                      existingItems={lineItems}
                      onAddItems={(items) => addItemMutation.mutate(items)} 
                    />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {lineItems.filter(i => i.source_type === 'labor' || i.source_type === 'ad_hoc').map(item => (
                    <div key={item.id} className="flex gap-4 items-start bg-gray-50 p-4 rounded-lg border border-gray-100 relative group">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          {item.source_type === 'ad_hoc' ? 'Custom Labor' : (item.source_id ? 'Logged Hours' : 'Labor')}
                        </label>
                        <textarea 
                          defaultValue={item.description}
                          onBlur={(e) => updateItemMutation.mutate({ itemId: item.id, updates: { description: e.target.value } })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                          rows="2"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Amount ($)</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          defaultValue={item.amount}
                          onBlur={(e) => updateItemMutation.mutate({ itemId: item.id, updates: { amount: Number(e.target.value) } })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary text-right font-medium text-sm"
                        />
                      </div>
                      <button 
                        onClick={() => setDeleteItemId(item.id)}
                        className="mt-6 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove Item"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  ))}
                  {lineItems.filter(i => i.source_type === 'labor' || i.source_type === 'ad_hoc').length === 0 && (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                      <p className="text-gray-500 font-medium">No labor items added.</p>
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => addItemMutation.mutate([{ source_type: 'labor', description: 'Custom Labor Charge', amount: 0 }])}
                      className="text-primary font-bold text-sm hover:text-primary-dark flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Add Custom Labor
                    </button>
                  </div>
                </div>
              </div>

              {/* Materials Section */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                  <h4 className="font-bold text-gray-900 text-lg">Materials & Parts</h4>
                  <div className="w-1/2 max-w-sm">
                    <SmartDropdown 
                      jobId={formData.job_id} 
                      session={session} 
                      filterType="material"
                      existingItems={lineItems}
                      onAddItems={(items) => addItemMutation.mutate(items)} 
                    />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {lineItems.filter(i => i.source_type === 'material').map(item => (
                    <div key={item.id} className="flex gap-4 items-start bg-gray-50 p-4 rounded-lg border border-gray-100 relative group">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          {item.source_id ? 'Material (Linked)' : 'Material (Custom)'}
                        </label>
                        <textarea 
                          defaultValue={item.description}
                          onBlur={(e) => updateItemMutation.mutate({ itemId: item.id, updates: { description: e.target.value } })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                          rows="2"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Amount ($)</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          defaultValue={item.amount}
                          onBlur={(e) => updateItemMutation.mutate({ itemId: item.id, updates: { amount: Number(e.target.value) } })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary text-right font-medium text-sm"
                        />
                      </div>
                      <button 
                        onClick={() => setDeleteItemId(item.id)}
                        className="mt-6 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove Item"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  ))}
                  {lineItems.filter(i => i.source_type === 'material').length === 0 && (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                      <p className="text-gray-500 font-medium">No materials added.</p>
                    </div>
                  )}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => addItemMutation.mutate([{ source_type: 'material', description: 'Custom Material Charge', amount: 0 }])}
                      className="text-primary font-bold text-sm hover:text-primary-dark flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Add Custom Material
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Totals Section */}
            <div className="mt-8 flex justify-end">
              <div className="w-72 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner">
                <div className="space-y-3 mb-4 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Base Labor:</span>
                    <span>${(Number(formData.labor_amount) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Itemized Line Items:</span>
                    <span>${lineItemsSubtotal.toFixed(2)}</span>
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
