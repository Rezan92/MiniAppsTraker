import React, { forwardRef } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import './InvoicePreview.css';

export const InvoicePreview = forwardRef(({ invoice, tenant }, ref) => {
  if (!invoice || !tenant) return null;

  const laborAmount = invoice.labor_amount || 0;
  const materialsAmount = invoice.materials_amount || 0;
  const totalDue = invoice.total_amount || 0;

  const laborItems = invoice.invoice_items?.filter(i => i.type === 'labor_detail') || [];
  const materialItems = invoice.invoice_items?.filter(i => i.type === 'material') || [];

  return (
    <div className="invoice-preview-container">
      <div ref={ref} className="invoice-preview-paper">
        <div className="invoice-content">
          <table className="header-table">
            <tbody>
              <tr>
                <td style={{ width: '60%' }}>
                  <div className="header-title">{tenant.name || tenant.company_name}</div>
                  {tenant.business_tagline && (
                    <div className="header-subtitle">{tenant.business_tagline}</div>
                  )}
                  {tenant.phone && (
                    <div className="header-contact">Phone: {tenant.phone}</div>
                  )}
                </td>
                <td style={{ width: '40%', textAlign: 'right' }}>
                  <div style={{ fontSize: '24pt', fontWeight: 'bold', color: '#1a365d', letterSpacing: '1px' }}>INVOICE</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="divider"></div>

          <table className="meta-table">
            <tbody>
              <tr>
                <td>
                  <div className="section-title">Bill To</div>
                  <div className="meta-box">
                    <p><strong>{invoice.clients?.name}</strong></p>
                    {invoice.clients?.phone && (
                      <p>Phone: {invoice.clients?.phone}</p>
                    )}
                    {invoice.property_address && (
                      <>
                        <p><strong>Property Location:</strong></p>
                        {invoice.property_address.split('\n').map((line, index) => (
                          <p key={index}>{line}</p>
                        ))}
                      </>
                    )}
                  </div>
                </td>
                <td>
                  <div className="section-title">Invoice Details</div>
                  <div className="meta-box">
                    <p><strong>Invoice Number:</strong> #{invoice.invoice_number}</p>
                    <p><strong>Date:</strong> {formatDate(invoice.invoice_date)}</p>
                    <p><strong>Due Date:</strong> {invoice.due_date ? formatDate(invoice.due_date) : 'Upon Receipt'}</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="items-table">
            <thead>
              <tr>
                <th>Description of Work & Materials</th>
                <th className="amount-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="item-name">Labor: {invoice.labor_title || 'General'}</div>
                  {invoice.labor_notes && (
                    <div style={{ fontStyle: 'italic', fontSize: '9.5pt', color: '#4a5568', marginTop: '2px' }}>
                      ({invoice.labor_notes})
                    </div>
                  )}
                  {laborItems.length > 0 && (
                    <ul className="bullet-list">
                      {laborItems.sort((a,b)=>a.sort_order - b.sort_order).map(item => {
                        const sentences = item.description 
                          ? item.description.split('.').map(s => s.trim()).filter(s => s.length > 0).map(s => s + '.')
                          : [];
                        return sentences.map((sentence, idx) => (
                          <li key={`${item.id}-${idx}`}>{sentence}</li>
                        ));
                      })}
                    </ul>
                  )}
                </td>
                <td className="amount-val">{formatCurrency(laborAmount)}</td>
              </tr>
              <tr>
                <td>
                  <div className="item-name">Materials</div>
                  {materialItems.length > 0 ? (
                    <ul className="bullet-list">
                      {materialItems.sort((a,b)=>a.sort_order - b.sort_order).map(item => (
                        <li key={item.id}>
                          {item.description} &mdash; {formatCurrency(item.total_price)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontStyle: 'italic', fontSize: '9.5pt', color: '#4a5568', marginTop: '4px' }}>
                      No materials for this job
                    </div>
                  )}
                </td>
                <td className="amount-val">{formatCurrency(materialsAmount)}</td>
              </tr>
            </tbody>
          </table>

          <table className="summary-table">
            <tbody>
              <tr>
                <td style={{ width: '55%' }}>
                  <div className="payment-box">
                    <h4>Payment Instructions</h4>
                    <p>Thank you for your business!</p>
                    {tenant.payment_method && tenant.payment_details && (
                      <p style={{ marginTop: '4px' }}>
                        Please send payment via <strong>{tenant.payment_method}: {tenant.payment_details}</strong>
                      </p>
                    )}
                  </div>
                </td>
                <td style={{ width: '45%', verticalAlign: 'top' }}>
                  <table className="totals-table">
                    <tbody>
                      <tr>
                        <td className="label">Labor Subtotal:</td>
                        <td className="value">{formatCurrency(laborAmount)}</td>
                      </tr>
                      <tr>
                        <td className="label">Materials Subtotal:</td>
                        <td className="value">{formatCurrency(materialsAmount)}</td>
                      </tr>
                      <tr className="grand-total">
                        <td className="label">Total Due:</td>
                        <td className="value">{formatCurrency(totalDue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="footer">
            Page 1 of 1 &bull; Invoice #{invoice.invoice_number}
          </div>
        </div>
      </div>
    </div>
  );
});
