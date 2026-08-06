import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800'
};

export const InvoiceList = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session
  });

  const filteredInvoices = filter === 'all' 
    ? invoices 
    : invoices.filter(inv => inv.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-gray-900">Invoices</h1>
          <p className="text-body-md text-gray-600 mt-1">Manage your billing and payments</p>
        </div>
        <Link 
          to="/invoices/new"
          className="inline-flex items-center gap-2 bg-primary text-black px-6 py-2.5 rounded-lg font-title-sm hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Create Invoice
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-2 overflow-x-auto">
          {['all', 'draft', 'sent', 'paid', 'overdue'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-title-sm capitalize whitespace-nowrap transition-colors ${
                filter === f 
                  ? 'bg-primary text-black' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-gray-400">receipt_long</span>
            </div>
            <h3 className="text-title-md font-bold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-body-md text-gray-500 mb-6">
              {filter === 'all' ? "You haven't created any invoices yet." : `No invoices matching status: ${filter}`}
            </p>
            {filter === 'all' && (
              <Link 
                to="/invoices/new"
                className="inline-flex items-center gap-2 text-primary hover:underline font-title-sm"
              >
                Create your first invoice
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1F2937] text-white border-b border-surface-container-high">
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Invoice</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Client</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Date</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Amount</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="font-body-md divide-y divide-surface-container-high">
                {filteredInvoices.map((invoice, idx) => (
                  <tr 
                    key={invoice.id} 
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                    className={`hover:bg-gray-100 cursor-pointer transition-colors group ${idx % 2 !== 0 ? 'bg-[#F9FAFB]' : 'bg-white'}`}
                  >
                    <td className="px-4 py-4">
                      <div className="font-title-sm text-gray-900 group-hover:text-primary transition-colors">#{invoice.invoice_number}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-title-sm text-gray-900">{invoice.clients?.name}</div>
                    </td>
                    <td className="px-4 py-4 text-body-md text-gray-600">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-4 py-4 font-title-sm text-gray-900">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-medium capitalize ${STATUS_COLORS[invoice.status] || 'bg-gray-100 text-gray-800'}`}>
                        {invoice.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
