import React, { useRef, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { useToast } from '../../contexts/ToastContext';
import { InvoicePreview } from './InvoicePreview';
import { DeleteInvoiceModal } from './DeleteInvoiceModal';
import { formatDate } from '../../utils/formatters';
import { STATUS_COLORS } from '../../utils/constants';
import { useInvoice, useInvoiceLogs, useUpdateInvoiceStatus, useDeleteInvoice, useUpdateInvoiceInternalNotes } from '../../hooks/api/useInvoices';
import { ReasonModal } from './ReasonModal';
import { NotFound } from '../errors/NotFound';

export const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showError } = useToast();
  const location = useLocation();
  const fromJobId = location.state?.fromJob;
  const componentRef = useRef();

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState('');
  const [reasonText, setReasonText] = useState('');

  const { data: invoice, isLoading } = useInvoice(id);
  const { data: logs = [] } = useInvoiceLogs(id);
  const statusMutation = useUpdateInvoiceStatus(id);
  const deleteMutation = useDeleteInvoice(id);
  const notesMutation = useUpdateInvoiceInternalNotes(id);

  const generateFileName = () => {
    if (!invoice) return 'Invoice';
    const clientName = invoice.clients?.name || 'Client';
    const address = invoice.property_address || 'Address';
    const invNumber = invoice.invoice_number || 'Draft';
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    // Replace non-alphanumeric chars with underscores to ensure safe filename
    const sanitize = (str) => str.replace(/[^a-zA-Z0-9-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    
    return `${sanitize(clientName)}_${sanitize(address)}_${sanitize(invNumber)}_${date}_${time}`;
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: generateFileName(),
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
    statusMutation.mutate(
      { id, status: reasonAction, reason: reasonText.trim() },
      {
        onSuccess: () => {
          setReasonModalOpen(false);
          setReasonText('');
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
        <p className="text-body-md text-gray-500 font-medium">Loading invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return <NotFound />;
  }

  const isDraft = invoice.status === 'draft';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(fromJobId ? `/jobs/${fromJobId}` : '/invoices')} className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer" title={fromJobId ? "Back to Job" : "Back to Invoices"}>
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
              state={{ fromJob: fromJobId }}
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
              onClick={() => statusMutation.mutate({ status: 'ready_to_send' })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Mark as Ready to Send
            </button>
          )}

          {invoice.status === 'ready_to_send' && (
            <button 
              onClick={() => statusMutation.mutate({ status: 'sent' })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              Mark as Sent
            </button>
          )}
          
          {(invoice.status === 'ready_to_send' || invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'in_progress') && (
            <>
              <button 
                onClick={() => { setReasonAction('draft'); setReasonText(''); setReasonModalOpen(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">undo</span>
                Revert to Draft
              </button>
              {(invoice.status !== 'ready_to_send') && (
                <button 
                  onClick={() => statusMutation.mutate({ status: 'paid' })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Mark as Paid
                </button>
              )}
            </>
          )}

          {['ready_to_send', 'sent', 'in_progress', 'paid', 'overdue'].includes(invoice.status) && invoice.status !== 'voided' && (
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


      {/* Audit Logs Section */}
      {logs.length > 0 && (
        <details className="bg-white border border-gray-200 rounded-xl mb-8 shadow-sm group">
          <summary className="p-4 cursor-pointer font-bold text-gray-900 flex items-center gap-2 list-none hover:bg-gray-50 transition-colors rounded-xl outline-none">
            <span className="material-symbols-outlined text-gray-500">history</span>
            Invoice Audit Trail ({logs.length})
            <span className="material-symbols-outlined ml-auto text-gray-400 group-open:rotate-180 transition-transform">expand_more</span>
          </summary>
          <div className="p-6 border-t border-gray-100">
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {logs.map((log) => (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group/item is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]/item:bg-primary text-slate-500 group-[.is-active]/item:text-white shadow shrink-0 md:order-1 md:group-odd/item:-translate-x-1/2 md:group-even/item:translate-x-1/2">
                    <span className="material-symbols-outlined text-sm">
                      {log.action === 'Created' ? 'add' :
                       log.action === 'Sent' ? 'send' :
                       log.action === 'Paid' ? 'check_circle' :
                       log.action === 'Voided' ? 'cancel' :
                       log.action === 'Reverted' ? 'undo' : 
                       log.action === 'Updated' ? 'edit' :
                       log.action === 'Synced' ? 'sync' : 'history'}
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
            </div>
          </div>
        </details>
      )}

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
      <DeleteInvoiceModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        invoiceNumber={invoice.invoice_number}
        loading={deleteMutation.isPending}
      />

      <ReasonModal
        open={reasonModalOpen}
        onClose={() => setReasonModalOpen(false)}
        onSubmit={submitReasonAction}
        title={reasonAction === 'draft' ? 'Revert to Draft' : reasonAction === 'voided' ? 'Void Invoice' : `Reason for ${reasonAction?.replace(/_/g, ' ')}`}
        description={`Please provide a reason for this action. This will be permanently recorded in the audit trail.`}
        reasonText={reasonText}
        onReasonChange={setReasonText}
        isLoading={statusMutation.isPending}
        confirmText={reasonAction === 'voided' ? 'Void Invoice' : 'Confirm Action'}
        confirmColor={reasonAction === 'voided' ? 'red' : 'primary'}
      />
    </div>
  );
};
