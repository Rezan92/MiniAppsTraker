import React from 'react';
import { DatePicker } from '../common/DatePicker';
import { Tooltip } from '../common/Tooltip';

export const ClientDetailsForm = ({
  formData,
  setFormData,
  clients,
  properties,
  availableJobs,
  isEditing,
  handleJobSelect
}) => {
  return (
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
            <div className="flex items-center gap-1.5 mb-1">
              <label className="block text-label-md text-gray-700">
                Property Address {!formData.job_id && "(Optional)"}
              </label>
              {formData.job_id && (
                <Tooltip text="To change this address, please update it on the job." position="top">
                  <span className="material-symbols-outlined text-[16px] text-gray-400 cursor-help hover:text-gray-600">
                    info
                  </span>
                </Tooltip>
              )}
            </div>
            
            {formData.job_id ? (
              <Tooltip text="To change this address, please update it on the job." position="top" className="w-full block">
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed">
                  {formData.property_address || availableJobs?.find(j => j.id === formData.job_id)?.rental_properties?.address || 'No property assigned to job'}
                </div>
              </Tooltip>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white disabled:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
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
  );
};
