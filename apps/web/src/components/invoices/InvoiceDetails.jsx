import React, { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';
import { InvoicePreview } from './InvoicePreview';
import { DeleteInvoiceModal } from './DeleteInvoiceModal';
import { formatDate } from '../../utils/formatters';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800'
};

export const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const componentRef = useRef();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState('');
  const [reasonText, setReasonText] = useState('');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/${id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['invoice_logs', id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/${id}/logs`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session && !!id
  });

  const generateFilename = () => {
    if (!invoice) return 'Invoice';
    
    const sanitize = (str) => str ? str.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_') : '';
    
    const clientName = sanitize(invoice.clients?.name);
    
    let propertyStr = '';
    if (invoice.property_address) {
      const firstLine = invoice.property_address.split('\n')[0];
      propertyStr = sanitize(firstLine);
    }
    
    const parts = [clientName];
    if (propertyStr) parts.push(propertyStr);
    parts.push(invoice.invoice_number);
    parts.push(Date.now());
    
    return parts.filter(Boolean).join('_');
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: generateFilename(),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ status, reason }) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status, reason })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      showSuccess("Status updated successfully");
      queryClient.invalidateQueries(['invoice', id]);
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['invoice_logs', id]);
    },
    onError: (err) => {
      showError(translateApiError(err));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      showSuccess("Invoice deleted successfully");
      queryClient.invalidateQueries(['invoices']);
      navigate('/invoices');
    },
    onError: (err) => {
      showError(translateApiError(err));
    }
  });

  const notesMutation = useMutation({
    mutationFn: async (notes) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/${id}/internal-notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ internal_notes: notes })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      showSuccess("Internal notes updated");
      setIsEditingNotes(false);
      queryClient.invalidateQueries(['invoice', id]);
    },
    onError: (err) => {
      showError(translateApiError(err));
    }
  });

  const handleEditNotes = () => {
    setDraftNotes(invoice?.internal_notes || '');
    setIsEditingNotes(true);
  };

  const submitReasonAction = () => {
    if (!reasonText.trim()) {
      showError("A reason is required");
      return;
    }
    statusMutation.mutate({ status: reasonAction, reason: reasonText });
    setReasonModalOpen(false);
    setReasonText('');
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading invoice details...</div>;
  }

  if (!invoice) {
    return <div className="p-8 text-center text-red-500">Invoice not found</div>;
  }

  const isDraft = invoice.status === 'draft';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-title-lg font-bold text-gray-900">Invoice #{invoice.invoice_number}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-medium capitalize mt-1 ${STATUS_COLORS[invoice.status] || 'bg-gray-100'}`}>
              {invoice.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {isDraft && (
            <Link 
              to={`/invoices/${id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit Draft
            </Link>
          )}

          <button 
            onClick={() => handlePrint()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print / PDF
          </button>

          {isDraft && (
            <button 
              onClick={() => statusMutation.mutate({ status: 'sent' })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              Mark as Sent
            </button>
          )}
          
          {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'in_progress') && (
            <>
              <button 
                onClick={() => { setReasonAction('draft'); setReasonText(''); setReasonModalOpen(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">undo</span>
                Revert to Draft
              </button>
              <button 
                onClick={() => statusMutation.mutate({ status: 'paid' })}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Mark as Paid
              </button>
            </>
          )}

          {['sent', 'in_progress', 'paid', 'overdue'].includes(invoice.status) && invoice.status !== 'voided' && (
            <button 
              onClick={() => { setReasonAction('voided'); setReasonText(''); setReasonModalOpen(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              Void Invoice
            </button>
          )}

          {isDraft && (
            <button 
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex items-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2 cursor-pointer"
              title="Delete Invoice"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Payment Summary */}
      {invoice.status === 'paid' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8 shadow-sm flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h3 className="text-title-sm font-bold text-green-800 flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-green-600">task_alt</span>
              Invoice Paid
            </h3>
            <p className="text-green-700 text-sm">
              <span className="font-medium">Billed To:</span> {invoice.billed_to_name || invoice.clients?.name || 'Unknown'}
            </p>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-green-600 font-medium">Created On</p>
              <p className="text-green-800 font-bold">{formatDate(invoice.created_at)}</p>
            </div>
            <div>
              <p className="text-green-600 font-medium">Paid On</p>
              <p className="text-green-800 font-bold">{invoice.paid_at ? formatDate(invoice.paid_at) : 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Internal Notes Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-title-sm font-bold text-yellow-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-yellow-600">note_alt</span>
            Internal Notes (Admin Only)
          </h3>
          {!isEditingNotes && (
            <button 
              onClick={handleEditNotes}
              className="text-sm font-medium text-yellow-700 hover:text-yellow-900 cursor-pointer"
            >
              Edit Notes
            </button>
          )}
        </div>
        
        {isEditingNotes ? (
          <div className="space-y-4">
            <textarea
              className="w-full p-3 border border-yellow-300 rounded-lg bg-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-body-sm"
              rows={4}
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Add private notes here..."
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsEditingNotes(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-yellow-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => notesMutation.mutate(draftNotes)}
                disabled={notesMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                {notesMutation.isPending ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-yellow-800 whitespace-pre-wrap font-body-sm">
            {invoice.internal_notes || <span className="italic text-yellow-600">No internal notes added yet.</span>}
          </p>
        )}
      </div>

      {/* PDF Preview Container */}
      <div className="overflow-x-auto pb-8">
        <div className="min-w-[800px]">
          <InvoicePreview ref={componentRef} invoice={invoice} tenant={invoice.tenants} />
        </div>
      </div>

      {/* Audit Logs Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-8">
        <h3 className="text-title-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-gray-500">history</span>
          Invoice Audit Trail
        </h3>
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
          {logs.map((log) => (
            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-primary text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <span className="material-symbols-outlined text-sm">
                  {log.action === 'Created' ? 'add' :
                   log.action === 'Sent' ? 'send' :
                   log.action === 'Paid' ? 'check_circle' :
                   log.action === 'Voided' ? 'cancel' :
                   log.action === 'Reverted' ? 'undo' : 'history'}
                </span>
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded border border-slate-200 shadow">
                <div className="flex items-center justify-between space-x-2 mb-1">
                  <div className="font-bold text-slate-900">{log.action}</div>
                  <time className="text-xs font-medium text-slate-500">{new Date(log.created_at).toLocaleString()}</time>
                </div>
                {log.reason && (
                  <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded mt-2 border border-slate-100 italic">
                    Reason: {log.reason}
                  </div>
                )}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center text-gray-500 italic py-4">No audit logs found.</p>
          )}
        </div>
      </div>

      <DeleteInvoiceModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        invoiceNumber={invoice.invoice_number}
        loading={deleteMutation.isPending}
      />

      {/* Reason Modal */}
      {reasonModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {reasonAction === 'draft' ? 'Revert to Draft' : 'Void Invoice'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for this action. This will be permanently recorded in the audit trail.
            </p>
            
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary mb-4 h-24 resize-none text-sm"
              placeholder="Enter reason..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
            />
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setReasonModalOpen(false)}
                className="px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReasonAction}
                disabled={statusMutation.isPending || !reasonText.trim()}
                className={`px-4 py-2 font-medium text-white rounded-lg transition-colors cursor-pointer ${
                  reasonAction === 'voided' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-opacity-90'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {statusMutation.isPending ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
