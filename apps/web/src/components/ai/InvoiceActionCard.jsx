import React from 'react';
import { Link } from 'react-router-dom';

export const InvoiceActionCard = ({ invoiceData }) => {
  if (!invoiceData) return null;

  const { invoiceId, invoiceNumber, clientName, totalAmount, subtotal, taxAmount } = invoiceData;

  return (
    <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:border-primary/60 transition-all animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
          <span className="font-bold text-xs text-gray-900 tracking-tight">Invoice #{invoiceNumber} Drafted</span>
        </div>
        <span className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
          Draft
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 my-2.5 text-xs">
        <div>
          <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Client</span>
          <span className="font-semibold text-gray-800 truncate block">{clientName}</span>
        </div>
        <div>
          <span className="text-gray-400 block text-[10px] uppercase tracking-wider">Total</span>
          <span className="font-bold text-gray-900 text-sm">${Number(totalAmount || 0).toFixed(2)}</span>
        </div>
      </div>

      <Link
        to={`/invoices/${invoiceId}`}
        className="w-full flex items-center justify-center gap-1.5 bg-primary text-black font-bold text-xs py-2 rounded-lg hover:bg-opacity-90 active:scale-[0.99] transition-all shadow-xs cursor-pointer"
      >
        <span>View Draft Invoice</span>
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </Link>
    </div>
  );
};
