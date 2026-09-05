import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../common/PageHeader';
import { DateRangeFilter } from '../common/DateRangeFilter';
import { DataTable } from '../common/DataTable';
import { INVOICE_STATUSES, INVOICE_FILTER_TABS } from '../../utils/constants';
import { StatusBadgeDropdown } from '../shared/StatusBadgeDropdown';
import { useInvoices, useUpdateInvoiceStatus } from '../../hooks/api/useInvoices';
import { useToast } from '../../contexts/ToastContext';
import { useScreenContext } from '../../contexts/AiContext';
import { ReasonModal } from './ReasonModal';

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

  // Register screen context for AI Copilot
  useScreenContext({
    screen: 'InvoiceList',
    entityId: null,
    summary: {
      totalInvoices: Array.isArray(invoices) ? invoices.length : 0,
      draftInvoices: Array.isArray(invoices) ? invoices.filter(i => i.status === 'draft').length : 0,
      paidInvoices: Array.isArray(invoices) ? invoices.filter(i => i.status === 'paid').length : 0,
      sentInvoices: Array.isArray(invoices) ? invoices.filter(i => i.status === 'sent').length : 0,
      overdueInvoices: Array.isArray(invoices) ? invoices.filter(i => i.status === 'overdue').length : 0
    }
  }, [invoices]);

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

  const columns = [
    {
      header: 'Invoice',
      key: 'invoice_number',
      render: (inv) => (
        <div className="font-title-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">
          #{inv.invoice_number}
        </div>
      )
    },
    {
      header: 'Client',
      key: 'client',
      render: (inv) => (
        <div className="font-title-sm text-gray-900">
          {inv.clients?.name || 'Unknown Client'}
        </div>
      )
    },
    {
      header: 'Created',
      key: 'created_at',
      render: (inv) => (
        <div className="text-body-md text-gray-600">
          {inv.created_at ? formatDate(inv.created_at) : 'N/A'}
        </div>
      )
    },
    {
      header: 'Paid',
      key: 'paid_at',
      render: (inv) => (
        <div className="text-body-md text-gray-600">
          {inv.paid_at ? formatDate(inv.paid_at) : '-'}
        </div>
      )
    },
    {
      header: 'Labor',
      key: 'labor_amount',
      align: 'right',
      render: (inv) => (
        <div className="font-title-sm text-gray-900">
          {formatCurrency(inv.labor_amount)}
        </div>
      )
    },
    {
      header: 'Materials',
      key: 'materials_amount',
      align: 'right',
      render: (inv) => (
        <div className="font-title-sm text-gray-900">
          {formatCurrency(inv.materials_amount)}
        </div>
      )
    },
    {
      header: 'Total Amount',
      key: 'total_amount',
      align: 'right',
      render: (inv) => (
        <div className="font-title-sm text-gray-900 font-bold">
          {formatCurrency(inv.total_amount)}
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      align: 'right',
      render: (inv) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <StatusBadgeDropdown
            currentStatus={inv.status}
            statuses={INVOICE_STATUSES}
            onStatusChange={(newStatus) => handleStatusChange(inv.id, newStatus)}
          />
        </div>
      )
    }
  ];

  const tableFooter = (
    <tr className="bg-[#1F2937] text-white">
      <td colSpan="4" className="px-4 py-3.5 text-right font-label-caps text-label-caps text-gray-300 tracking-wider">
        Totals · {filter === 'all' ? 'All Invoices' : filter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </td>
      <td className="px-4 py-3.5 text-right font-title-sm text-amber-400 font-semibold">{formatCurrency(laborTotal)}</td>
      <td className="px-4 py-3.5 text-right font-title-sm text-amber-400 font-semibold">{formatCurrency(materialTotal)}</td>
      <td className="px-4 py-3.5 text-right font-title-md font-bold text-white">{formatCurrency(invoiceTotal)}</td>
      <td className="bg-[#1F2937]"></td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Invoices"
        subtitle="Manage your billing, payments, and financial records."
        actionButtonText="Create Invoice"
        actionButtonIcon="add"
        actionLinkTo="/invoices/new"
        tabs={INVOICE_FILTER_TABS}
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

      <DataTable
        columns={columns}
        data={filteredInvoices}
        isLoading={isLoading}
        onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
        emptyIcon="receipt_long"
        emptyTitle="No invoices found"
        emptyDescription={
          search || filter !== 'all' || dateRange?.startDate || dateRange?.endDate
            ? 'No invoices match your current filters. Try adjusting your search, status, or date range.'
            : "You haven't created any invoices yet."
        }
        emptyActionText={!search && filter === 'all' && !dateRange?.startDate ? 'Create Invoice' : undefined}
        onEmptyAction={() => navigate('/invoices/new')}
        minWidth="1000px"
        footer={filteredInvoices.length > 0 ? tableFooter : null}
      />

      <ReasonModal
        open={reasonModalOpen}
        onClose={() => setReasonModalOpen(false)}
        onSubmit={submitReasonAction}
        title={reasonAction === 'draft' ? 'Revert to Draft' : reasonAction === 'voided' ? 'Void Invoice' : `Reason for ${reasonAction?.replace(/_/g, ' ')}`}
        description={`Please provide a reason for changing the invoice status to ${reasonAction?.replace(/_/g, ' ')}. This will be permanently recorded in the audit trail.`}
        reasonText={reasonText}
        onReasonChange={setReasonText}
        isLoading={statusMutation.isPending}
        confirmText={reasonAction === 'voided' ? 'Void Invoice' : 'Confirm Action'}
        confirmColor={reasonAction === 'voided' ? 'red' : 'primary'}
      />
    </div>
  );
};
