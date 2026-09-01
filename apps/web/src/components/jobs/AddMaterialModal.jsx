import React from 'react';
import { DatePicker } from '../common/DatePicker';
import { BaseModal } from '../common/BaseModal';

export const AddMaterialModal = ({ open, onClose, onSubmit, matData, setMatData }) => {
  const footer = (
    <>
      <button 
        type="button"
        onClick={onClose}
        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-body-md font-bold rounded-lg cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        Cancel
      </button>
      <button 
        type="button"
        onClick={onSubmit}
        disabled={!matData.description || !matData.cost}
        className="px-4 py-2 bg-primary text-black font-body-md font-bold rounded-lg cursor-pointer hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
      >
        {matData.id ? 'Save Changes' : 'Add Material'}
      </button>
    </>
  );

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={matData.id ? 'Edit Material' : 'Add Material to Job'}
      footer={footer}
      size="md"
    >
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
        
        {/* Cost and Purchase Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Purchase Date</label>
            <DatePicker
              value={matData.purchase_date || ''}
              onChange={(val) => setMatData({...matData, purchase_date: val})}
              placeholder="Select date"
            />
          </div>
        </div>

        {/* Store */}
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Store / Supplier</label>
          <div className="space-y-2">
            <div className="relative">
              <select
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow appearance-none cursor-pointer"
                value={['Home Depot', "Lowe's", 'Menards', 'Ace Hardware', 'Amazon', 'Walmart'].includes(matData.store) ? matData.store : (matData.store ? 'Other' : '')}
                onChange={(e) => {
                  if (e.target.value !== 'Other') {
                    setMatData({...matData, store: e.target.value});
                  } else {
                    setMatData({...matData, store: 'Other_custom'});
                  }
                }}
              >
                <option value="" disabled>Select Store</option>
                <option value="Home Depot">Home Depot</option>
                <option value="Lowe's">Lowe's</option>
                <option value="Menards">Menards</option>
                <option value="Ace Hardware">Ace Hardware</option>
                <option value="Amazon">Amazon</option>
                <option value="Walmart">Walmart</option>
                <option value="Other">Other</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
            </div>
            
            {(!['Home Depot', "Lowe's", 'Menards', 'Ace Hardware', 'Amazon', 'Walmart', ''].includes(matData.store)) && (
              <input 
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50" 
                placeholder="Enter custom store name" 
                type="text" 
                value={matData.store === 'Other_custom' ? '' : (matData.store || '')}
                onChange={e => setMatData({...matData, store: e.target.value})}
                autoFocus
              />
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Notes</label>
          <textarea 
            className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50 resize-none h-16" 
            placeholder="Receipt number, warranty info..."
            value={matData.notes || ''}
            onChange={e => setMatData({...matData, notes: e.target.value})}
          ></textarea>
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
    </BaseModal>
  );
};
