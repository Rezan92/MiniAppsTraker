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
    <div ref={ref} className="bg-white p-10 max-w-[800px] mx-auto shadow-sm border border-gray-200 printable-invoice font-sans text-gray-900">
      <style type="text/css" media="print">
        {`
          @page { size: letter; margin: 0.5in; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .printable-invoice { border: none !important; box-shadow: none !important; width: 100% !important; max-width: none !important; padding: 0 !important; }
        `}
      </style>

      {/* SECTION 1: Business Header */}
      <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-300">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{tenant.name || tenant.company_name}</h1>
          {tenant.business_tagline && (
            <p className="text-sm text-gray-500 mt-1">{tenant.business_tagline}</p>
          )}
          {tenant.phone && (
            <p className="text-sm text-gray-700 mt-2">Phone: {tenant.phone}</p>
          )}
        </div>
        <div>
          <h2 className="text-4xl font-semibold text-slate-700 tracking-widest uppercase">Invoice</h2>
        </div>
      </div>

      {/* SECTION 2: Bill To + Invoice Details */}
      <div className="flex justify-between items-start mb-10">
        <div className="w-1/2 pr-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
          <p className="font-bold text-gray-900 text-lg">{invoice.clients?.name}</p>
          {invoice.clients?.phone && <p className="text-sm text-gray-700 mt-1">Phone: {invoice.clients?.phone}</p>}
          {invoice.property_address && (
            <div className="mt-3">
              <p className="text-sm font-bold text-gray-900">Property Location:</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.property_address}</p>
            </div>
          )}
        </div>
        <div className="w-1/2 pl-4 flex justify-end">
          <div className="min-w-[200px]">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-right">Invoice Details</h3>
            <table className="w-full text-right text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-gray-600 font-medium pr-3">Invoice Number:</td>
                  <td className="py-1 text-gray-900 font-medium">#{invoice.invoice_number}</td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600 font-medium pr-3">Date:</td>
                  <td className="py-1 text-gray-900 font-medium">{formatDate(invoice.invoice_date)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600 font-medium pr-3">Due Date:</td>
                  <td className="py-1 text-gray-900 font-medium">
                    {invoice.due_date ? formatDate(invoice.due_date) : 'Upon Receipt'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: Description of Work & Materials */}
      <div className="mb-8 border border-slate-700">
        {/* Table Header */}
        <div className="bg-slate-800 text-white flex justify-between px-5 py-2.5">
          <span className="font-semibold uppercase tracking-wider text-sm">Description of Work & Materials</span>
          <span className="font-semibold uppercase tracking-wider text-sm">Amount</span>
        </div>

        {/* Labor Section */}
        <div className="px-5 py-5 flex justify-between items-start">
          <div className="flex-1 pr-6">
            <h4 className="font-bold text-gray-900 text-base">Labor: {invoice.labor_title || 'General'}</h4>
            {invoice.labor_notes && (
              <p className="italic text-gray-600 text-sm mt-1 mb-2">({invoice.labor_notes})</p>
            )}
            {laborItems.length > 0 && (
              <ul className="list-disc list-outside ml-5 mt-2 text-gray-700 space-y-1 text-sm">
                {laborItems.sort((a,b)=>a.sort_order - b.sort_order).map(item => (
                  <li key={item.id}>{item.description}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="font-medium text-gray-900 whitespace-nowrap text-base">
            {formatCurrency(laborAmount)}
          </div>
        </div>

        <div className="mx-5 border-t border-gray-200"></div>

        {/* Materials Section */}
        <div className="px-5 py-5 flex justify-between items-start">
          <div className="flex-1 pr-6">
            <h4 className="font-bold text-gray-900 text-base mb-2">Materials</h4>
            {materialItems.length > 0 ? (
              <ul className="list-disc list-outside ml-5 text-gray-700 space-y-1 text-sm">
                {materialItems.sort((a,b)=>a.sort_order - b.sort_order).map(item => (
                  <li key={item.id}>
                    {item.description} ({formatCurrency(item.total_price)})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="italic text-gray-500 text-sm">No materials for this job</p>
            )}
          </div>
          <div className="font-medium text-gray-900 whitespace-nowrap text-base">
            {formatCurrency(materialsAmount)}
          </div>
        </div>
      </div>

      {/* SECTION 4: Summary */}
      <div className="flex justify-end mb-10">
        <div className="w-[300px]">
          <table className="w-full text-right text-base">
            <tbody>
              <tr>
                <td className="py-1.5 text-gray-700 whitespace-nowrap">Labor Subtotal:</td>
                <td className="py-1.5 text-gray-900 whitespace-nowrap w-[120px]">{formatCurrency(laborAmount)}</td>
              </tr>
              <tr>
                <td className="py-1.5 text-gray-700 whitespace-nowrap">Materials Subtotal:</td>
                <td className="py-1.5 text-gray-900 whitespace-nowrap">{formatCurrency(materialsAmount)}</td>
              </tr>
              <tr>
                <td colSpan="2" className="pt-2 pb-1">
                  <div className="border-t-2 border-gray-300 w-full"></div>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-bold text-gray-900 text-lg whitespace-nowrap">Total Due:</td>
                <td className="py-2 font-bold text-gray-900 text-lg whitespace-nowrap">{formatCurrency(totalDue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: Payment Instructions */}
      <div className="border-l-4 border-slate-800 bg-slate-50 p-5 rounded-r">
        <h4 className="font-bold text-gray-900 text-sm mb-3">Payment Instructions</h4>
        {tenant.payment_method && tenant.payment_details && (
          <p className="text-sm text-gray-700 mb-2">
            Please send payment via {tenant.payment_method}: {tenant.payment_details}
          </p>
        )}
        <p className="text-sm font-medium text-red-600">Thank you for your business!</p>
      </div>

      {/* SECTION 6: Footer */}
      <div className="mt-12 text-center text-sm text-gray-500">
        Page 1 of 1 &bull; Invoice #{invoice.invoice_number}
      </div>
    </div>
  );
});
