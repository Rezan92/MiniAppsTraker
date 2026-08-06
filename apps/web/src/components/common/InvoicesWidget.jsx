import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  sent: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  overdue: 'bg-red-100 text-red-800 border-red-200'
};

export const InvoicesWidget = ({ clientId, propertyId, variant = 'all', className = '' }) => {
  const { session } = useAuth();
  const navigate = useNavigate();

  // Construct query string based on provided props
  const queryParams = new URLSearchParams();
  if (clientId) queryParams.append('client_id', clientId);
  if (propertyId) queryParams.append('property_id', propertyId);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', { clientId, propertyId }],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session && (!!clientId || !!propertyId)
  });

  const totalInvoiced = invoices
    .filter(inv => inv.status !== 'draft')
    .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  const outstandingBalance = invoices
    .filter(inv => ['sent', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  const totalCount = invoices.length;

  return (
    <div className={`flex flex-col gap-6 ${variant === 'all' ? 'mt-6' : ''} ${className}`}>
      {/* Financial Summary Cards */}
      {(variant === 'all' || variant === 'stats') && (
        <div className={`grid ${variant === 'stats' ? 'grid-cols-2 grid-rows-2' : 'grid-cols-1 md:grid-cols-3'} gap-4 h-full`}>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col justify-center">
            <p className="font-label-caps text-xs tracking-wider text-gray-500 mb-1">Total Invoiced</p>
            <p className="font-headline-sm text-xl font-bold text-gray-900">{formatCurrency(totalInvoiced)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col justify-center">
            <p className="font-label-caps text-xs tracking-wider text-gray-500 mb-1">Total Paid</p>
            <p className="font-headline-sm text-xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 shadow-sm flex flex-col justify-center">
            <p className="font-label-caps text-xs tracking-wider text-red-700 mb-1">Balance</p>
            <p className="font-headline-sm text-xl font-bold text-red-700">{formatCurrency(outstandingBalance)}</p>
          </div>
          {variant === 'stats' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col justify-center">
              <p className="font-label-caps text-xs tracking-wider text-gray-500 mb-1">Total Invoices</p>
              <p className="font-headline-sm text-xl font-bold text-gray-900">{totalCount}</p>
            </div>
          )}
        </div>
      )}

      {/* Invoices Data Table */}
      {(variant === 'all' || variant === 'table') && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="font-headline-sm text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">receipt_long</span>
            Related Invoices
          </h3>
          <button 
            onClick={() => navigate('/invoices/new')}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Invoice
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1F2937] text-white border-b border-surface-container-high font-label-caps text-label-caps whitespace-nowrap">
                <th className="p-4 font-semibold">Invoice #</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Billed To</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-gray-700">
              {isLoading ? (
                <tr><td colSpan="5" className="p-6 text-center">Loading invoices...</td></tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-500 italic">No invoices found.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr 
                    key={inv.id} 
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="p-4 font-label-caps text-primary font-medium">#{inv.invoice_number}</td>
                    <td className="p-4">{formatDate(inv.invoice_date)}</td>
                    <td className="p-4">
                      {inv.billed_to_name || inv.clients?.name || 'Unknown'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${STATUS_COLORS[inv.status] || STATUS_COLORS.draft}`}>
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium">{formatCurrency(inv.total_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
};
