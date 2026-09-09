import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useJobs } from '../../hooks/api/useJobs';
import { apiClient } from '../../lib/apiClient';
import { formatCurrency, roundCurrency } from '../../utils/formatters';
import { invalidateJobCascade, invalidateJobWorkItemsCascade } from '../../lib/cacheInvalidator';

export const ReceiptActionCard = ({ receiptData }) => {
  const queryClient = useQueryClient();
  const { data: jobs = [], isLoading: loadingJobs } = useJobs();

  // Filter for active or accessible jobs
  const selectableJobs = useMemo(() => {
    return (jobs || []).filter(j => j.status !== 'cancelled');
  }, [jobs]);

  const [selectedJobId, setSelectedJobId] = useState(() => {
    return receiptData?.suggestedJobId || '';
  });
  const [store, setStore] = useState(receiptData?.store || '');
  const [purchaseDate, setPurchaseDate] = useState(() => {
    return receiptData?.date || new Date().toISOString().split('T')[0];
  });

  const [items, setItems] = useState(() => {
    return (receiptData?.items || []).map((it, idx) => ({
      id: `it_${idx}_${Date.now()}`,
      description: it.description || '',
      cost: roundCurrency(it.cost || 0),
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice ? roundCurrency(it.unitPrice) : null,
      included: true
    }));
  });

  const [status, setStatus] = useState('staging'); // 'staging' | 'submitting' | 'confirmed' | 'cancelled'
  const [errorMessage, setErrorMessage] = useState(null);
  const [committedData, setCommittedData] = useState(null);

  // Selected items calculation
  const selectedItems = useMemo(() => items.filter(it => it.included), [items]);
  const runningTotal = useMemo(() => {
    const sum = selectedItems.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
    return roundCurrency(sum);
  }, [selectedItems]);

  const handleToggleInclude = (id) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, included: !item.included } : item));
  };

  const handleDescriptionChange = (id, newDesc) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, description: newDesc } : item));
  };

  const handleCostChange = (id, newCostStr) => {
    const val = parseFloat(newCostStr);
    setItems(prev => prev.map(item => item.id === id ? { ...item, cost: isNaN(val) ? '' : val } : item));
  };

  const handleDeleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCommit = async () => {
    if (!selectedJobId) {
      setErrorMessage('Please select a target job for these materials.');
      return;
    }

    if (selectedItems.length === 0) {
      setErrorMessage('Please select at least one material item to log.');
      return;
    }

    // Validate descriptions and costs
    for (let i = 0; i < selectedItems.length; i++) {
      const it = selectedItems[i];
      if (!it.description || !it.description.trim()) {
        setErrorMessage(`Item #${i + 1} has an empty description.`);
        return;
      }
      const costNum = Number(it.cost);
      if (isNaN(costNum) || costNum < 0) {
        setErrorMessage(`Item #${i + 1} (${it.description}) has an invalid cost.`);
        return;
      }
    }

    setErrorMessage(null);
    setStatus('submitting');

    try {
      const payload = {
        jobId: selectedJobId,
        store: store.trim() || null,
        purchaseDate,
        items: selectedItems.map(it => ({
          description: it.description.trim(),
          cost: roundCurrency(Number(it.cost) || 0),
          notes: it.quantity > 1 ? `Qty: ${it.quantity}${it.unitPrice ? ` @ $${it.unitPrice}` : ''}` : null,
          is_from_stock: false
        }))
      };

      const res = await apiClient.post('/api/ai/receipt/commit', payload);

      // Invalidate relevant caches immediately
      invalidateJobWorkItemsCascade(queryClient, { jobId: selectedJobId });
      invalidateJobCascade(queryClient, { jobId: selectedJobId });

      const targetJob = selectableJobs.find(j => j.id === selectedJobId);

      setCommittedData({
        count: res?.count || selectedItems.length,
        total: runningTotal,
        jobId: selectedJobId,
        jobTitle: targetJob ? (targetJob.title || `Job #${targetJob.job_number || targetJob.id.slice(0, 6)}`) : 'Selected Job'
      });

      setStatus('confirmed');
    } catch (err) {
      console.error('Failed to commit receipt materials:', err);
      setErrorMessage(err.message || 'Failed to add materials to job.');
      setStatus('staging');
    }
  };

  if (status === 'confirmed' && committedData) {
    return (
      <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 shadow-sm animate-in fade-in duration-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
          <span className="font-bold text-sm">Materials Successfully Logged!</span>
        </div>
        <p className="text-emerald-800 leading-relaxed">
          Added <strong>{committedData.count} item{committedData.count !== 1 ? 's' : ''}</strong> totaling{' '}
          <strong>{formatCurrency(committedData.total)}</strong> to <strong>{committedData.jobTitle}</strong>.
        </p>
        <div className="mt-3 pt-2.5 border-t border-emerald-200/80 flex items-center justify-between">
          <span className="text-[11px] text-emerald-700">Status: Unbilled (ready for invoice)</span>
          <Link
            to={`/jobs/${committedData.jobId}`}
            className="inline-flex items-center gap-1 font-bold text-emerald-900 hover:text-black bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-md transition-colors"
          >
            <span>View Job</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 flex items-center gap-2 animate-in fade-in duration-200">
        <span className="material-symbols-outlined text-[18px]">block</span>
        <span>Receipt materials dismissed without saving.</span>
      </div>
    );
  }

  return (
    <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:border-primary/50 transition-all text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary text-[20px] shrink-0">receipt_long</span>
          <div className="truncate">
            <span className="font-bold text-gray-900 text-xs tracking-tight block truncate">
              {store || 'Supplier Receipt'}
            </span>
            <span className="text-[10px] text-gray-400 block">
              {purchaseDate ? `Date: ${purchaseDate}` : 'Receipt Review'}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded shrink-0">
          Staged ({selectedItems.length}/{items.length})
        </span>
      </div>

      {/* Target Job Selector */}
      <div className="my-2.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
          Target Job <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          disabled={status === 'submitting'}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-primary focus:bg-white transition-all cursor-pointer"
        >
          <option value="">-- Select a Job --</option>
          {selectableJobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title || `Job #${j.job_number || j.id.slice(0, 6)}`} {j.client?.name ? `(${j.client.name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Line Items Table */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 my-2 divide-y divide-gray-100">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pt-1.5 first:pt-0 flex items-center gap-2 transition-opacity ${
              item.included ? 'opacity-100' : 'opacity-40 line-through'
            }`}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={item.included}
              onChange={() => handleToggleInclude(item.id)}
              disabled={status === 'submitting'}
              className="rounded text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer shrink-0"
              title="Include or exclude this line item"
            />

            {/* Description Input */}
            <input
              type="text"
              value={item.description}
              onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
              disabled={status === 'submitting' || !item.included}
              placeholder="Item description..."
              className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:bg-gray-50/50 rounded px-1.5 py-0.5 text-xs text-gray-800 focus:outline-none truncate"
            />

            {/* Cost Input */}
            <div className="flex items-center gap-0.5 shrink-0 w-18">
              <span className="text-gray-400 text-[11px]">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.cost}
                onChange={(e) => handleCostChange(item.id, e.target.value)}
                disabled={status === 'submitting' || !item.included}
                className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:bg-gray-50/50 rounded px-1 py-0.5 text-xs font-semibold text-gray-900 text-right focus:outline-none"
              />
            </div>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => handleDeleteItem(item.id)}
              disabled={status === 'submitting'}
              title="Remove item"
              className="p-0.5 text-gray-300 hover:text-red-500 rounded transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
            </button>
          </div>
        ))}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Running Total & Actions Footer */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
        <div>
          <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Selected Total</span>
          <span className="font-bold text-gray-900 text-sm">
            {formatCurrency(runningTotal)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStatus('cancelled')}
            disabled={status === 'submitting'}
            className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={status === 'submitting' || selectedItems.length === 0 || !selectedJobId}
            className="px-3 py-1.5 text-xs font-bold text-black bg-primary rounded-lg hover:bg-opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            {status === 'submitting' ? (
              <>
                <span className="inline-block animate-spin w-3 h-3 border-2 border-black border-t-transparent rounded-full"></span>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[15px]">add_task</span>
                <span>Add {selectedItems.length} to Job</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
