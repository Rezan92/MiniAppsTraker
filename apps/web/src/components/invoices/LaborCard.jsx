import React from 'react';
import { SmartDropdown } from './SmartDropdown';

export const LaborCard = ({
  lineItems,
  formData,
  session,
  addItemMutation,
  updateItemMutation,
  setDeleteItemId,
  selectedJob
}) => {
  const isFlatRate = selectedJob?.rate_type === 'flat';

  return (
    <div className="border border-gray-200 rounded-xl bg-white">
      <div className="bg-gray-50 border-b border-gray-200 p-4 rounded-t-xl flex justify-between items-center gap-4">
        <h4 className="font-bold text-gray-900 text-lg whitespace-nowrap">Labor & Services</h4>
        <div className="w-auto flex-shrink-0 relative whitespace-nowrap">
          <SmartDropdown 
            jobId={formData.job_id} 
            session={session} 
            filterType="labor"
            existingItems={lineItems}
            onAddItems={(items) => addItemMutation.mutate(items)} 
            selectedJob={selectedJob}
          />
        </div>
      </div>
      <div className="p-4 space-y-3">
        {lineItems.filter(i => i.source_type === 'labor' || i.source_type === 'ad_hoc').map(item => (
          <div key={item.id} className="flex gap-4 items-start bg-gray-50 p-4 rounded-lg border border-gray-100 relative group">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {item.source_type === 'ad_hoc' ? 'Custom Labor' : (item.source_id ? 'Logged Hours' : 'Labor')}
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date:</label>
                  <input
                    type="date"
                    defaultValue={item.service_date ? item.service_date.split('T')[0] : ''}
                    onBlur={(e) => updateItemMutation.mutate({ itemId: item.id, updates: { service_date: e.target.value || null } })}
                    className="text-xs px-2 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
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
            <div className="flex gap-2 shrink-0 items-center mt-6">
              <label className="flex items-center gap-1 cursor-pointer mr-2" title="Include in Invoice Total">
                <input
                  type="checkbox"
                  checked={item.is_billable !== false}
                  onChange={(e) => updateItemMutation.mutate({ itemId: item.id, updates: { is_billable: e.target.checked } })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-500 uppercase">Charge</span>
              </label>
              <button 
                onClick={() => updateItemMutation.mutate({ itemId: item.id, updates: { is_hidden: !item.is_hidden } })}
                className={`transition-colors ${item.is_hidden ? 'text-gray-400' : 'text-primary'}`}
                title={item.is_hidden ? "Hidden from Invoice PDF" : "Visible on Invoice PDF"}
              >
                <span className="material-symbols-outlined text-[20px]">{item.is_hidden ? 'visibility_off' : 'visibility'}</span>
              </button>
              <button 
                onClick={() => setDeleteItemId(item.id)}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Remove Item"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
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
  );
};
