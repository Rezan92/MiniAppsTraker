import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export const SmartDropdown = ({ jobId, session, onAddItems, filterType, existingItems = [], selectedJob }) => {
  const [showBilled, setShowBilled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    let amount = item.cost || 0;
    if (type === 'labor' && selectedJob?.rate_type === 'hourly') {
      amount = (item.hours || 0) * (selectedJob.hourly_rate || 0);
    }
    
    const isFlatRate = selectedJob?.rate_type === 'flat';

    onAddItems([{
      source_type: type,
      source_id: item.id,
      description: item.description || (type === 'labor' ? `${item.hours} hours logged` : 'Material'),
      amount: amount,
      service_date: type === 'labor' ? item.date : null,
      is_billable: !isFlatRate
    }]);
  };

  const handleAddAll = () => {
    const isFlatRate = selectedJob?.rate_type === 'flat';
    
    const includeMaterials = !filterType || filterType === 'material';
    const includeHours = !filterType || filterType === 'labor';
    
    const items = [];
    
    if (includeMaterials) {
      items.push(...materials.map(m => ({
        source_type: 'material',
        source_id: m.id,
        description: m.description || m.item_name || 'Material Item',
        amount: m.cost || 0,
        service_date: null,
        is_billable: !isFlatRate
      })));
    }
    
    if (includeHours) {
      items.push(...hours.map(h => ({
        source_type: 'labor',
        source_id: h.id,
        description: h.description || `${h.hours} hours logged`,
        amount: selectedJob?.rate_type === 'hourly' ? (h.hours || 0) * (selectedJob.hourly_rate || 0) : 0,
        service_date: h.date,
        is_billable: !isFlatRate
      })));
    }
    
    if (items.length > 0) {
      onAddItems(items);
    }
  };

  if (!jobId) return null;

  const includeMaterials = !filterType || filterType === 'material';
  const includeHours = !filterType || filterType === 'labor';
  const totalItems = (includeMaterials ? materials.length : 0) + (includeHours ? hours.length : 0);

  const isItemAdded = (id, type) => {
    return existingItems.some(i => i.source_id === id && i.source_type === type);
  };

  return (
    <div className="relative inline-block text-left w-full" ref={dropdownRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-between items-center w-full rounded-lg border border-primary shadow-sm px-4 py-3 bg-primary/5 text-sm font-bold text-primary hover:bg-primary/10 transition-colors focus:outline-none whitespace-nowrap gap-4"
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
        <div className="origin-top-right absolute right-0 mt-2 w-[90vw] sm:w-[500px] rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 p-4 border border-gray-200">
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
                {materials.length > 0 && (!filterType || filterType === 'material') && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Materials</h4>
                    <ul className="space-y-1">
                      {materials.map(m => {
                        const added = isItemAdded(m.id, 'material');
                        return (
                          <li 
                            key={m.id} 
                            className={`flex justify-between items-start text-sm p-2 rounded transition-colors ${added ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 group cursor-pointer'}`}
                            onClick={() => !added && handleAddItem(m, 'material')}
                          >
                            <div className="flex items-start flex-1 min-w-0 pr-3">
                              {added ? (
                                <span className="material-symbols-outlined text-green-500 mr-2 text-[18px] shrink-0 mt-0.5">check_circle</span>
                              ) : (
                                <span className="material-symbols-outlined text-gray-400 mr-2 text-[18px] group-hover:text-primary shrink-0 mt-0.5">add</span>
                              )}
                              <div className="flex flex-col sm:flex-row sm:items-center flex-1 min-w-0">
                                <span className="font-medium text-gray-900 break-words whitespace-normal">{m.description}</span>
                                <div className="shrink-0 mt-1 sm:mt-0 flex flex-wrap gap-1">
                                  {m.billing_status === 'billed' && !added && (
                                    <span className="sm:ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wide">
                                      Billed
                                    </span>
                                  )}
                                  {added && (
                                    <span className="sm:ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-wide">
                                      Added
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className="font-medium text-gray-700 shrink-0 mt-0.5">${m.cost?.toFixed(2)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                
                {hours.length > 0 && (!filterType || filterType === 'labor') && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Labor / Hours</h4>
                    <ul className="space-y-1">
                      {hours.map(h => {
                        const added = isItemAdded(h.id, 'labor');
                        return (
                          <li 
                            key={h.id} 
                            className={`flex justify-between items-start text-sm p-2 rounded transition-colors ${added ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 group cursor-pointer'}`}
                            onClick={() => !added && handleAddItem(h, 'labor')}
                          >
                            <div className="flex items-start flex-1 min-w-0 pr-3">
                              {added ? (
                                <span className="material-symbols-outlined text-green-500 mr-2 text-[18px] shrink-0 mt-0.5">check_circle</span>
                              ) : (
                                <span className="material-symbols-outlined text-gray-400 mr-2 text-[18px] group-hover:text-primary shrink-0 mt-0.5">add</span>
                              )}
                              <div className="flex flex-col sm:flex-row sm:items-center flex-1 min-w-0">
                                <span className="font-medium text-gray-900 break-words whitespace-normal">{h.description || `${h.hours} hrs on ${h.date}`}</span>
                                <div className="shrink-0 mt-1 sm:mt-0 flex flex-wrap gap-1">
                                  {h.billing_status === 'billed' && !added && (
                                    <span className="sm:ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wide">
                                      Billed
                                    </span>
                                  )}
                                  {added && (
                                    <span className="sm:ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-wide">
                                      Added
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className="text-gray-500 shrink-0 mt-0.5">{Number(h.hours).toFixed(2)} hrs</span>
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
