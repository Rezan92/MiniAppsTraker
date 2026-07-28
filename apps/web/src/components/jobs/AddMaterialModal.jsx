import React from 'react';

export const AddMaterialModal = ({ open, onClose, onSubmit, matData, setMatData }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-[32rem] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
          <h2 className="font-title-md text-title-md font-bold text-primary">Add Material to Job</h2>
          <button 
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <form className="space-y-5" id="add-material-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            {/* Description */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Description *</label>
              <input 
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50" 
                placeholder="e.g. Copper pipes" 
                type="text" 
                value={matData.description}
                onChange={e => setMatData({...matData, description: e.target.value})}
                required
              />
            </div>
            
            {/* Cost */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Cost ($) *</label>
              <input 
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50" 
                placeholder="e.g. 45.00" 
                type="number" 
                min="0"
                step="0.01"
                value={matData.cost}
                onChange={e => setMatData({...matData, cost: e.target.value})}
                required
              />
            </div>
            
            {/* Inventory Checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <input 
                  type="checkbox" 
                  className="text-primary focus:ring-primary h-5 w-5 border-outline-variant rounded transition-colors" 
                  checked={matData.is_from_stock}
                  onChange={e => setMatData({...matData, is_from_stock: e.target.checked})}
                />
                <span className="font-body-md text-on-surface group-hover:text-primary transition-colors">
                  Pulled From Stock Inventory?
                </span>
              </label>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-outline-variant bg-surface flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors rounded-md font-title-md text-sm"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="add-material-form"
            disabled={!matData.description || matData.cost < 0}
            className="px-5 py-2 bg-primary-container text-on-primary hover:bg-primary transition-colors rounded-md font-title-md text-sm flex items-center justify-center shadow-sm disabled:opacity-50"
          >
            Add Material
          </button>
        </div>
      </div>
    </div>
  );
};
