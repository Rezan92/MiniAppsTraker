import React from 'react';
import { SmartDropdown } from './SmartDropdown';

export const LaborCard = ({
  lineItems = [],
  formData,
  session,
  onAddItems,
  onUpdateItem,
  onDeleteItem,
  selectedJob
}) => {
  const isFlatRate = selectedJob?.rate_type === 'flat';
  const laborItems = lineItems.filter(i => i.source_type === 'labor' || i.source_type === 'ad_hoc');

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
            onAddItems={onAddItems} 
            selectedJob={selectedJob}
          />
        </div>
      </div>
      <div className="p-4 space-y-3">
        {laborItems.map(item => (
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
                    value={item.service_date ? item.service_date.split('T')[0] : ''}
                    onChange={(e) => onUpdateItem(item.id, { service_date: e.target.value || null })}
                    className="text-xs px-2 py-0.5 border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              <textarea 
                value={item.description || ''}
                onChange={(e) => onUpdateItem(item.id, { description: e.target.value })}
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
                value={item.amount !== undefined && item.amount !== null ? item.amount : ''}
                onChange={(e) => onUpdateItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-primary text-right font-medium text-sm"
              />
            </div>
            <div className="flex gap-2 shrink-0 items-center mt-6">
              <label className="flex items-center gap-1 cursor-pointer mr-2" title="Include in Invoice Total">
                <input
                  type="checkbox"
                  checked={item.is_billable !== false}
                  onChange={(e) => onUpdateItem(item.id, { is_billable: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-500 uppercase">Charge</span>
              </label>
              <button 
                type="button"
                onClick={() => onUpdateItem(item.id, { is_hidden: !item.is_hidden })}
                className={`transition-colors ${item.is_hidden ? 'text-gray-400' : 'text-primary'}`}
                title={item.is_hidden ? "Hidden from Invoice PDF" : "Visible on Invoice PDF"}
              >
                <span className="material-symbols-outlined text-[20px]">{item.is_hidden ? 'visibility_off' : 'visibility'}</span>
              </button>
              <button 
                type="button"
                onClick={() => onDeleteItem(item.id)}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Remove Item"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          </div>
        ))}
        {laborItems.length === 0 && (
          <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
            <p className="text-gray-500 font-medium">No labor items added.</p>
          </div>
        )}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onAddItems([{ source_type: 'labor', description: 'Custom Labor Charge', amount: 0, is_billable: true, is_hidden: false }])}
            className="text-primary font-bold text-sm hover:text-primary-dark flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Custom Labor
          </button>
        </div>
      </div>
    </div>
  );
};
