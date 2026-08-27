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
            {!isFlatRate && (
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
            )}
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
  );
};
