import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export const SmartDropdown = ({ jobId, session, onAddItems, filterType, existingItems = [] }) => {
  const [showBilled, setShowBilled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch unbilled/billed items
  const { data: materials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: ['job_materials', jobId, showBilled],
    queryFn: async () => {
      const statusList = showBilled ? 'unbilled,on_draft,billed' : 'unbilled';
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${jobId}/materials?billing_status=${statusList}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session && !!jobId && isOpen && (!filterType || filterType === 'material')
  });

  const { data: hours = [], isLoading: loadingHours } = useQuery({
    queryKey: ['job_hours', jobId, showBilled],
    queryFn: async () => {
      const statusList = showBilled ? 'unbilled,on_draft,billed' : 'unbilled';
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs/${jobId}/hours?billing_status=${statusList}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session && !!jobId && isOpen && (!filterType || filterType === 'labor')
  });

  const handleAddItem = (item, type) => {
    onAddItems([{
      source_type: type,
      source_id: item.id,
      description: item.description || (type === 'labor' ? `${item.hours} hours logged` : 'Material'),
      amount: item.cost || 0
    }]);
  };

  const handleAddAll = () => {
    const items = [
      ...materials.map(m => ({
        source_type: 'material',
        source_id: m.id,
        description: m.description,
        amount: m.cost || 0
      })),
      ...hours.map(h => ({
        source_type: 'labor',
        source_id: h.id,
        description: h.description || `${h.hours} hours logged`,
        amount: 0
      }))
    ];
    if (items.length > 0) {
      onAddItems(items);
    }
  };

  if (!jobId) return null;

  const totalItems = materials.length + hours.length;

  const isItemAdded = (id, type) => {
    return existingItems.some(i => i.source_id === id && i.source_type === type);
  };

  return (
    <div className="relative inline-block text-left w-full mb-4">
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-between w-full rounded-lg border border-primary shadow-sm px-4 py-3 bg-primary/5 text-sm font-bold text-primary hover:bg-primary/10 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            {filterType === 'labor' ? 'Add Labor from Job' : filterType === 'material' ? 'Add Materials from Job' : 'Add items from Job'}
          </div>
          <span className="material-symbols-outlined text-[20px]">
            {isOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <label className="flex items-center text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showBilled}
                onChange={(e) => setShowBilled(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
              />
              Show Already Billed
            </label>
            <button
              onClick={handleAddAll}
              disabled={totalItems === 0}
              className="text-primary hover:text-primary-dark text-sm font-bold disabled:opacity-50"
            >
              + Include All ({totalItems})
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto pr-2">
            {(loadingMaterials || loadingHours) ? (
              <p className="text-sm text-gray-500 text-center py-4">Loading items...</p>
            ) : totalItems === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No unbilled items found for this job.</p>
            ) : (
              <div className="space-y-6">
                {materials.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Materials</h4>
                    <ul className="space-y-1">
                      {materials.map(m => {
                        const added = isItemAdded(m.id, 'material');
                        return (
                          <li 
                            key={m.id} 
                            className={`flex justify-between items-center text-sm p-2 rounded transition-colors ${added ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 group cursor-pointer'}`}
                            onClick={() => !added && handleAddItem(m, 'material')}
                          >
                            <div className="flex items-center">
                              {added ? (
                                <span className="material-symbols-outlined text-green-500 mr-2 text-[18px]">check_circle</span>
                              ) : (
                                <span className="material-symbols-outlined text-gray-400 mr-2 text-[18px] group-hover:text-primary">add</span>
                              )}
                              <span className="font-medium text-gray-900">{m.description}</span>
                              {m.billing_status === 'billed' && !added && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wide">
                                  Billed
                                </span>
                              )}
                              {added && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-wide">
                                  Added
                                </span>
                              )}
                            </div>
                            <span className="font-medium text-gray-700">${m.cost?.toFixed(2)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                
                {hours.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Labor / Hours</h4>
                    <ul className="space-y-1">
                      {hours.map(h => {
                        const added = isItemAdded(h.id, 'labor');
                        return (
                          <li 
                            key={h.id} 
                            className={`flex justify-between items-center text-sm p-2 rounded transition-colors ${added ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 group cursor-pointer'}`}
                            onClick={() => !added && handleAddItem(h, 'labor')}
                          >
                            <div className="flex items-center">
                              {added ? (
                                <span className="material-symbols-outlined text-green-500 mr-2 text-[18px]">check_circle</span>
                              ) : (
                                <span className="material-symbols-outlined text-gray-400 mr-2 text-[18px] group-hover:text-primary">add</span>
                              )}
                              <span className="font-medium text-gray-900">{h.description || `${h.hours} hrs on ${h.date}`}</span>
                              {h.billing_status === 'billed' && !added && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wide">
                                  Billed
                                </span>
                              )}
                              {added && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-wide">
                                  Added
                                </span>
                              )}
                            </div>
                            <span className="text-gray-500">{h.hours} hrs</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <button 
              onClick={() => setIsOpen(false)}
              className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Close Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
