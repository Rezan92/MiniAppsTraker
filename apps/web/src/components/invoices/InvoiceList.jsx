import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../common/PageHeader';

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
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const filteredInvoices = invoices.filter(inv => {
    // 1. Status Filter
    if (filter !== 'all' && inv.status !== filter) return false;
    
    // 2. Search Filter
    if (search) {
      const s = search.toLowerCase();
      const matchesInvoiceNum = inv.invoice_number?.toLowerCase().includes(s);
      const matchesClientName = inv.clients?.name?.toLowerCase().includes(s);
      if (!matchesInvoiceNum && !matchesClientName) return false;
    }

    // 3. Date Range Filter
    if (startDate || endDate) {
      // Use paid_at for paid invoices, otherwise created_at
      const dateToCompare = (inv.status === 'paid' && inv.paid_at) ? inv.paid_at : inv.created_at;
      if (dateToCompare) {
        const d = new Date(dateToCompare).toISOString().split('T')[0];
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }
    }
    
    return true;
  });

  const laborTotal = filteredInvoices.reduce((sum, inv) => sum + Number(inv.labor_amount || 0), 0);
  const materialTotal = filteredInvoices.reduce((sum, inv) => sum + Number(inv.materials_amount || 0), 0);
  const invoiceTotal = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Invoices"
        subtitle="Manage your billing, payments, and financial records."
        actionButtonText="Create Invoice"
        actionButtonIcon="add"
        actionLinkTo="/invoices/new"
        tabs={[
          { value: 'all', label: 'All Invoices' },
          { value: 'draft', label: 'Draft' },
          { value: 'sent', label: 'Sent' },
          { value: 'paid', label: 'Paid' },
          { value: 'overdue', label: 'Overdue' }
        ]}
        activeTab={filter}
        onTabChange={setFilter}
        searchPlaceholder="Search invoices, clients..."
        search={search}
        onSearchChange={setSearch}
      >
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            title="Start Date"
          />
          <span className="text-gray-500 text-sm">to</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            title="End Date"
          />
        </div>
      </PageHeader>

      <div className="bg-white border border-surface-container-high rounded-lg shadow-sm overflow-hidden flex flex-col">
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
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left min-w-[1000px] border-collapse relative">
              <thead className="sticky top-0 bg-[#1F2937] text-white z-10 border-b border-surface-container-high">
                <tr>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Invoice</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Client</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Created</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Paid</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Labor</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Materials</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Total Amount</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Status</th>
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
                      {invoice.created_at ? formatDate(invoice.created_at) : 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-body-md text-gray-600">
                      {invoice.paid_at ? formatDate(invoice.paid_at) : '-'}
                    </td>
                    <td className="px-4 py-4 text-right font-title-sm text-gray-900">
                      {formatCurrency(invoice.labor_amount)}
                    </td>
                    <td className="px-4 py-4 text-right font-title-sm text-gray-900">
                      {formatCurrency(invoice.materials_amount)}
                    </td>
                    <td className="px-4 py-4 text-right font-title-sm text-gray-900 font-bold">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-medium capitalize ${STATUS_COLORS[invoice.status] || 'bg-gray-100 text-gray-800'}`}>
                        {invoice.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-white border-t-2 border-gray-200 z-10">
                <tr>
                  <td colSpan="4" className="px-4 py-3 text-right font-title-sm text-gray-700">Totals ({filter === 'all' ? 'All Invoices' : filter})</td>
                  <td className="px-4 py-3 text-right font-title-sm text-gray-900">{formatCurrency(laborTotal)}</td>
                  <td className="px-4 py-3 text-right font-title-sm text-gray-900">{formatCurrency(materialTotal)}</td>
                  <td className="px-4 py-3 text-right font-title-md font-bold text-gray-900">{formatCurrency(invoiceTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
