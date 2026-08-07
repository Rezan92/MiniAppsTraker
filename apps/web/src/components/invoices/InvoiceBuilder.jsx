import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';
import { DatePicker } from '../common/DatePicker';

export const InvoiceBuilder = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    client_id: '',
    job_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    property_address: '',
    labor_title: 'Labor',
    labor_notes: '',
    labor_amount: 0,
    labor_details: [{ id: Date.now(), description: '' }],
    materials: [],
    bill_to_type: 'client_name',
    billed_to_name: '',
    property_id: ''
  });

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

  // Fetch completed jobs for selected client
  const { data: completedJobs = [] } = useQuery({
    queryKey: ['jobs', 'completed', formData.client_id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs?client_id=${formData.client_id}&status=completed`, {
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
        labor_amount: existingInvoice.labor_amount || 0,
        labor_details: (existingInvoice.invoice_items || [])
          .filter(i => i.type === 'labor_detail')
          .sort((a,b) => a.sort_order - b.sort_order)
          .map(i => ({ id: i.id, description: i.description })),
        materials: (existingInvoice.invoice_items || [])
          .filter(i => i.type === 'material')
          .sort((a,b) => a.sort_order - b.sort_order)
          .map(i => ({ id: i.id, description: i.description, cost: i.total_price }))
      });
    }
  }, [existingInvoice, id, navigate, showError]);

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
        labor_details: payload.labor_details.map((d, i) => ({ id: Date.now() + i, description: d.description })),
        materials: payload.materials.map((m, i) => ({ id: Date.now() + 1000 + i, description: m.description, cost: m.cost })),
        property_address: payload.property_address || prev.property_address
      }));
      showSuccess("Auto-populated from job");
    } catch (err) {
      showError(translateApiError(err));
    }
  };

  const handleLaborDetailChange = (index, value) => {
    const newList = [...formData.labor_details];
    newList[index].description = value;
    setFormData(prev => ({ ...prev, labor_details: newList }));
  };

  const addLaborDetail = () => {
    setFormData(prev => ({
      ...prev,
      labor_details: [...prev.labor_details, { id: Date.now(), description: '' }]
    }));
  };

  const removeLaborDetail = (index) => {
    const newList = formData.labor_details.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, labor_details: newList }));
  };

  const handleMaterialChange = (index, field, value) => {
    const newList = [...formData.materials];
    newList[index][field] = field === 'cost' ? (value === '' ? '' : parseFloat(value)) : value;
    setFormData(prev => ({ ...prev, materials: newList }));
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, { id: Date.now(), description: '', cost: 0 }]
    }));
  };

  const removeMaterial = (index) => {
    const newList = formData.materials.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, materials: newList }));
  };

  const materialsSubtotal = formData.materials.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
  const totalDue = (Number(formData.labor_amount) || 0) + materialsSubtotal;

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
        labor_amount: Number(formData.labor_amount) || 0,
        labor_details: formData.labor_details.filter(d => d.description.trim()),
        materials: formData.materials.filter(m => m.description.trim()).map(m => ({ ...m, cost: Number(m.cost) || 0 }))
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
      navigate(`/invoices/${data.id}`);
    },
    onError: (err) => {
      showError(translateApiError(err));
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <button onClick={() => navigate('/invoices')} className="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Invoices
          </button>
          <h1 className="text-headline-md font-bold text-gray-900">
            {isEditing ? `Edit Invoice` : 'Create Invoice'}
          </h1>
        </div>
        <div className="flex gap-4">
          <button 
            type="button" 
            onClick={() => navigate('/invoices')}
            className="px-6 py-2 border border-gray-300 rounded-lg font-title-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isLoading || !formData.client_id}
            className="px-6 py-2 bg-primary text-black rounded-lg font-title-sm hover:opacity-90 disabled:opacity-50"
          >
            {saveMutation.isLoading ? 'Saving...' : 'Save as Draft'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                      billed_to_name: client?.name || ''
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
                      setFormData({...formData, bill_to_type: type, billed_to_name: billedToName, property_id: '', property_address: ''});
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white mb-3"
                  >
                    <option value="client_name">Client Name ({clients.find(c => c.id === formData.client_id)?.name})</option>
                    {clients.find(c => c.id === formData.client_id)?.company_name && (
                      <option value="company_name">Company Name ({clients.find(c => c.id === formData.client_id)?.company_name})</option>
                    )}
                    <option value="property_address">Rental Property Address</option>
                    <option value="renter_name">Tenant (Renter)</option>
                  </select>

                  {(formData.bill_to_type === 'property_address' || formData.bill_to_type === 'renter_name') && (
                    <div>
                      <select
                        value={formData.property_id}
                        onChange={(e) => {
                          const propId = e.target.value;
                          const prop = properties.find(p => p.id === propId);
                          const billedToName = formData.bill_to_type === 'renter_name' 
                            ? (prop?.renter_name || 'Unknown Tenant') 
                            : (prop?.address || '');
                          setFormData({...formData, property_id: propId, property_address: prop?.address || '', billed_to_name: billedToName});
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                        required
                      >
                        <option value="">Select a property...</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name ? `${p.name} - ` : ''}{p.address} {formData.bill_to_type === 'renter_name' && p.renter_name ? `(${p.renter_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              {formData.bill_to_type !== 'property_address' && formData.bill_to_type !== 'renter_name' && (
                <div>
                  <label className="block text-label-md text-gray-700 mb-1">Property Address (Optional)</label>
                  {(clients.find(c => c.id === formData.client_id)?.client_type === 'property_manager' || properties.length > 0) ? (
                    <select
                      value={formData.property_address}
                      onChange={(e) => {
                         const val = e.target.value;
                         const prop = properties.find(p => p.address === val);
                         setFormData({
                           ...formData, 
                           property_address: val, 
                           property_id: prop ? prop.id : ''
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
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-title-lg font-bold text-gray-900 border-b border-gray-200 pb-2">Invoice Details</h3>
              
              <div>
                <label className="block text-label-md text-gray-700 mb-1 flex justify-between">
                  <span>Auto-populate from Job (Optional)</span>
                  {formData.job_id && <span className="text-green-600 text-xs font-bold">Linked</span>}
                </label>
                <select 
                  value={formData.job_id}
                  onChange={handleJobSelect}
                  disabled={!formData.client_id}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white disabled:bg-gray-50"
                >
                  <option value="">Select a completed job...</option>
                  {completedJobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">This will overwrite the labor and materials below.</p>
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

          {/* Labor Section */}
          <div className="border-b border-gray-100 pb-8">
            <h3 className="font-title-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Labor & Services</h3>
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
                <label className="block text-label-md text-gray-700 mb-1">Labor Amount ($)</label>
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

            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-label-md text-gray-700 mb-1">Labor Notes (Optional)</label>
                <input 
                  type="text" 
                  value={formData.labor_notes}
                  onChange={(e) => setFormData({...formData, labor_notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary italic text-sm"
                  placeholder="e.g. Minimum 1-hour service charge applied"
                />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary focus:ring-primary rounded border-gray-300 cursor-pointer"
                    onChange={(e) => {
                      const amount = Number(formData.labor_amount || 0);
                      setFormData(prev => ({
                        ...prev,
                        labor_amount: e.target.checked ? amount + 30 : amount - 30
                      }));
                    }}
                  />
                  <span>Add $30 Service Fee</span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-label-md text-gray-700">Detailed Descriptions (Bullet Points)</label>
              {formData.labor_details.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <span className="material-symbols-outlined text-gray-400 text-sm">fiber_manual_record</span>
                  <input 
                    type="text" 
                    value={item.description}
                    onChange={(e) => handleLaborDetailChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Describe work performed..."
                  />
                  <button 
                    onClick={() => removeLaborDetail(index)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))}
              <button 
                onClick={addLaborDetail}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-2"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Bullet Point
              </button>
            </div>
          </div>

          {/* Materials Section */}
          <div className="border-b border-gray-100 pb-8">
            <h3 className="font-title-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">Materials</h3>
            
            <div className="space-y-3">
              {formData.materials.map((item, index) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={item.description}
                      onChange={(e) => handleMaterialChange(index, 'description', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Material description..."
                    />
                  </div>
                  <div className="w-32 relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={item.cost}
                      onChange={(e) => handleMaterialChange(index, 'cost', e.target.value)}
                      className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-right"
                    />
                  </div>
                  <button 
                    onClick={() => removeMaterial(index)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))}
              
              <button 
                onClick={addMaterial}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-2"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Material
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-72 space-y-3">
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Labor Subtotal:</span>
                <span>${Number(formData.labor_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Materials Subtotal:</span>
                <span>${materialsSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-xl border-t border-gray-200 pt-3">
                <span>Total Due:</span>
                <span>${totalDue.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
