import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../common/PageHeader';
import { DateRangeFilter } from '../common/DateRangeFilter';
import { INVOICE_STATUSES, STATUS_COLORS } from '../../utils/constants';
import { StatusBadgeDropdown } from '../shared/StatusBadgeDropdown';
import { useInvoices, useUpdateInvoiceStatus } from '../../hooks/api/useInvoices';
import { useToast } from '../../contexts/ToastContext';

export const InvoiceList = () => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  const { data: invoices = [], isLoading } = useInvoices();
  const statusMutation = useUpdateInvoiceStatus();

  const handleStatusChange = (invoiceId, newStatus) => {
    if (['draft', 'voided', 'disputed'].includes(newStatus)) {
      setSelectedInvoiceId(invoiceId);
      setReasonAction(newStatus);
      setReasonText('');
      setReasonModalOpen(true);
    } else {
      statusMutation.mutate({ id: invoiceId, status: newStatus });
    }
  };

  const submitReasonAction = () => {
    if (!reasonText.trim()) {
      showError("A reason is required");
      return;
    }
    statusMutation.mutate(
      { id: selectedInvoiceId, status: reasonAction, reason: reasonText.trim() },
      {
        onSuccess: () => {
          setReasonModalOpen(false);
          setReasonText('');
          setSelectedInvoiceId(null);
        }
      }
    );
  };

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

    // 3. Date Range Filter — always uses created_at
    if (dateRange?.startDate || dateRange?.endDate) {
      if (inv.created_at) {
        const d = new Date(inv.created_at).toISOString().split('T')[0];
        if (dateRange.startDate && d < dateRange.startDate) return false;
        if (dateRange.endDate && d > dateRange.endDate) return false;
      } else {
        return false;
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
        tabs={INVOICE_STATUSES}
        activeTab={filter}
        onTabChange={setFilter}
        searchPlaceholder="Search invoices, clients..."
        search={search}
        onSearchChange={setSearch}
      >
        <DateRangeFilter 
          value={dateRange}
          onChange={setDateRange}
        />
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
              {(search || filter !== 'all' || dateRange?.startDate || dateRange?.endDate)
                ? 'No invoices match your current filters. Try adjusting your search, status, or date range.'
                : "You haven't created any invoices yet."
              }
            </p>
            {!search && filter === 'all' && !dateRange?.startDate && !dateRange?.endDate && (
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
                      <StatusBadgeDropdown
                        currentStatus={invoice.status}
                        statuses={INVOICE_STATUSES}
                        onStatusChange={(newStatus) => handleStatusChange(invoice.id, newStatus)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 z-10">
                <tr className="bg-[#1F2937]">
                  <td colSpan="4" className="px-4 py-3.5 text-right font-label-caps text-label-caps text-gray-300 tracking-wider">
                    Totals · {filter === 'all' ? 'All Invoices' : filter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                  <td className="px-4 py-3.5 text-right font-title-sm text-amber-400">{formatCurrency(laborTotal)}</td>
                  <td className="px-4 py-3.5 text-right font-title-sm text-amber-400">{formatCurrency(materialTotal)}</td>
                  <td className="px-4 py-3.5 text-right font-title-md font-bold text-white">{formatCurrency(invoiceTotal)}</td>
                  <td className="bg-[#1F2937]"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Reason Modal */}
      {reasonModalOpen && (
        <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Reason for {reasonAction.replace(/_/g, ' ')}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for changing the invoice status to {reasonAction.replace(/_/g, ' ')}. This will be saved in the logs.
              </p>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                rows="4"
                placeholder="Enter reason..."
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                autoFocus
              ></textarea>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setReasonModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReasonAction}
                disabled={statusMutation.isLoading || !reasonText.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
