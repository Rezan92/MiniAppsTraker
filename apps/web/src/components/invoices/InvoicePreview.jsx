import React, { forwardRef } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const InvoicePreview = forwardRef(({ invoice, tenant }, ref) => {
  if (!invoice || !tenant) return null;

  const laborAmount = invoice.labor_amount || 0;
  const materialsAmount = invoice.materials_amount || 0;
  const totalDue = invoice.total_amount || 0;

  const laborItems = invoice.invoice_items?.filter(i => i.type === 'labor_detail') || [];
  const materialItems = invoice.invoice_items?.filter(i => i.type === 'material') || [];

  return (
    <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto shadow-sm border border-gray-200 printable-invoice">
      <style type="text/css" media="print">
        {`
          @page { size: letter; margin: 0.5in; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .printable-invoice { border: none !important; box-shadow: none !important; width: 100% !important; max-width: none !important; padding: 0 !important; }
        `}
      </style>

      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{tenant.company_name}</h1>
          {tenant.business_tagline && (
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mt-1">
              {tenant.business_tagline}
            </p>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-light text-[#1F2937] tracking-wider mb-2">INVOICE</h2>
          <p className="text-gray-600 font-medium">{tenant.payment_details}</p>
        </div>
      </div>

      {/* Bill To & Details */}
      <div className="flex justify-between items-start mb-12 border-t border-gray-100 pt-8">
        <div className="w-1/2 pr-8">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
          <p className="font-bold text-gray-900 text-lg">{invoice.clients?.name}</p>
          {invoice.clients?.phone && <p className="text-gray-600 mt-1">{invoice.clients?.phone}</p>}
          {invoice.property_address && (
            <p className="text-gray-600 mt-1">{invoice.property_address}</p>
          )}
        </div>
        <div className="w-1/2 pl-8 text-right">
          <table className="w-full text-right ml-auto">
            <tbody>
              <tr>
                <td className="py-1 text-sm font-bold text-gray-400 uppercase tracking-wider pr-4">Invoice #</td>
                <td className="py-1 font-medium text-gray-900">{invoice.invoice_number}</td>
              </tr>
              <tr>
                <td className="py-1 text-sm font-bold text-gray-400 uppercase tracking-wider pr-4">Date</td>
                <td className="py-1 font-medium text-gray-900">{formatDate(invoice.invoice_date)}</td>
              </tr>
              <tr>
                <td className="py-1 text-sm font-bold text-gray-400 uppercase tracking-wider pr-4">Due Date</td>
                <td className="py-1 font-medium text-gray-900">
                  {invoice.due_date ? formatDate(invoice.due_date) : 'Upon Receipt'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Table */}
      <div className="mb-8">
        {/* Table Header */}
        <div className="bg-[#1F2937] text-white flex justify-between px-6 py-3 rounded-t-sm">
          <span className="font-semibold uppercase tracking-wider text-sm">Description of Work & Materials</span>
          <span className="font-semibold uppercase tracking-wider text-sm">Amount</span>
        </div>

        {/* Labor Section */}
        <div className="border border-t-0 border-gray-200 px-6 py-6 flex justify-between items-start group">
          <div className="flex-1 pr-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1">{invoice.labor_title || 'Labor'}</h3>
            {invoice.labor_notes && (
              <p className="italic text-gray-600 text-sm mb-3">{invoice.labor_notes}</p>
            )}
            {laborItems.length > 0 && (
              <ul className="list-disc list-outside ml-5 text-gray-700 space-y-1">
                {laborItems.sort((a,b)=>a.sort_order - b.sort_order).map(item => (
                  <li key={item.id} className="text-base">{item.description}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="font-medium text-gray-900 whitespace-nowrap text-lg">
            {formatCurrency(laborAmount)}
          </div>
        </div>

        {/* Materials Section */}
        {materialItems.length > 0 ? (
          <div className="border border-t-0 border-gray-200 px-6 py-6 flex justify-between items-start">
            <div className="flex-1 pr-6">
              <h3 className="font-bold text-gray-900 mb-3">Materials</h3>
              <ul className="list-disc list-outside ml-5 text-gray-700 space-y-1">
                {materialItems.sort((a,b)=>a.sort_order - b.sort_order).map(item => (
                  <li key={item.id} className="text-base">
                    {item.description} ({formatCurrency(item.total_price)})
                  </li>
                ))}
              </ul>
            </div>
            <div className="font-medium text-gray-900 whitespace-nowrap pt-9">
              {formatCurrency(materialsAmount)}
            </div>
          </div>
        ) : (
          <div className="border border-t-0 border-gray-200 px-6 py-6 flex justify-between items-center text-gray-500">
            <span>Materials</span>
            <span>$0.00</span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex justify-end mb-12">
        <div className="w-1/2 max-w-sm">
          <table className="w-full text-right">
            <tbody>
              {materialItems.length > 0 && (
                <>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 text-gray-600">Labor Subtotal</td>
                    <td className="py-3 font-medium text-gray-900">{formatCurrency(laborAmount)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 text-gray-600">Materials Subtotal</td>
                    <td className="py-3 font-medium text-gray-900">{formatCurrency(materialsAmount)}</td>
                  </tr>
                </>
              )}
              <tr>
                <td className="py-4 font-bold text-gray-900 text-lg uppercase tracking-wider">Total Due</td>
                <td className="py-4 font-bold text-gray-900 text-xl">{formatCurrency(totalDue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer / Payment Instructions */}
      <div className="border-l-4 border-[#1F2937] bg-gray-50 p-6 rounded-r-sm">
        <h4 className="font-bold text-gray-900 uppercase tracking-wider mb-2">Payment Instructions</h4>
        <p className="text-gray-700 mb-3 whitespace-pre-line">
          {tenant.payment_method && tenant.payment_details 
            ? `Please send payment via ${tenant.payment_method}: ${tenant.payment_details}` 
            : 'Payment due upon receipt.'}
        </p>
        <p className="font-medium text-[#1F2937]">Thank you for your business!</p>
      </div>

      {/* Print Footer */}
      <div className="mt-16 text-center text-sm text-gray-400 font-medium">
        Page 1 of 1 &bull; Invoice {invoice.invoice_number}
      </div>
    </div>
  );
});
