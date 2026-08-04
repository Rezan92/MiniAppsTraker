import React, { useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { translateApiError } from '../../utils/errorTranslator';
import { InvoicePreview } from './InvoicePreview';

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

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: invoice ? `Invoice_${invoice.invoice_number}` : 'Invoice',
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invoices/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      showSuccess("Status updated successfully");
      queryClient.invalidateQueries(['invoice', id]);
      queryClient.invalidateQueries(['invoices']);
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
          <button onClick={() => navigate('/invoices')} className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-title-lg font-bold text-gray-900">Invoice {invoice.invoice_number}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-medium capitalize mt-1 ${STATUS_COLORS[invoice.status] || 'bg-gray-100'}`}>
              {invoice.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {isDraft && (
            <Link 
              to={`/invoices/${id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit Draft
            </Link>
          )}

          <button 
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print / PDF
          </button>

          {isDraft && (
            <button 
              onClick={() => statusMutation.mutate('sent')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              Mark as Sent
            </button>
          )}
          
          {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'in_progress') && (
            <button 
              onClick={() => statusMutation.mutate('paid')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Mark as Paid
            </button>
          )}

          {isDraft && (
            <button 
              onClick={() => {
                if(window.confirm('Are you sure you want to delete this draft invoice?')) {
                  deleteMutation.mutate();
                }
              }}
              className="inline-flex items-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
              title="Delete Invoice"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* PDF Preview Container */}
      <div className="overflow-x-auto pb-8">
        <div className="min-w-[800px]">
          <InvoicePreview ref={componentRef} invoice={invoice} tenant={invoice.tenants} />
        </div>
      </div>
    </div>
  );
};
