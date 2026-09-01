import React, { forwardRef } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import './InvoicePreview.css';

export const InvoicePreview = forwardRef(({ invoice, tenant }, ref) => {
  if (!invoice || !tenant) return null;

  const laborAmount = Number(invoice.labor_amount) || 0;
  const materialsAmount = Number(invoice.materials_amount) || 0;
  const totalDue = Number(invoice.total_amount) || 0;

  // Merge ad_hoc into laborItems for logical grouping
  const laborItems = invoice.invoice_line_items?.filter(i => i.source_type === 'labor' || i.source_type === 'ad_hoc') || [];
  const materialItems = invoice.invoice_line_items?.filter(i => i.source_type === 'material') || [];

  // Filter out hidden and non-billable items for display purposes
  const visibleLaborItems = laborItems.filter(i => !i.is_hidden && i.is_billable !== false);
  const visibleMaterialItems = materialItems.filter(i => !i.is_hidden && i.is_billable !== false);

  const propertyLocation = invoice.property_address || invoice.jobs?.rental_properties?.address || '';

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
                    <p><strong>{invoice.billed_to_name || invoice.clients?.name}</strong></p>
                    {invoice.clients?.phone && (
                      <p>Phone: {invoice.clients?.phone}</p>
                    )}
                    {propertyLocation && (
                      <>
                        <p><strong>Property Location:</strong></p>
                        {propertyLocation.split('\n').map((line, index) => (
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
                  {(() => {
                    if (invoice.breakdown_by_days && visibleLaborItems.length > 0) {
                      const grouped = {};
                      visibleLaborItems.forEach(item => {
                        const dateKey = item.service_date ? item.service_date.split('T')[0] : 'Unspecified Date';
                        if (!grouped[dateKey]) grouped[dateKey] = [];
                        grouped[dateKey].push(item);
                      });
                      
                      const sortedDates = Object.keys(grouped).sort((a, b) => {
                        if (a === 'Unspecified Date') return 1;
                        if (b === 'Unspecified Date') return -1;
                        return new Date(a) - new Date(b);
                      });

                      return sortedDates.map(date => {
                        const dayItems = grouped[date].sort((a,b)=>a.sort_order - b.sort_order);
                        const dayAmount = dayItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
                        let formattedDate = date;
                        if (date !== 'Unspecified Date') {
                          // Using a UTC parse approach to avoid off-by-one timezone issues with raw yyyy-mm-dd
                          const [y, m, d] = date.split('-');
                          formattedDate = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                        }
                        
                        return (
                          <div key={date} style={{ marginTop: '10px', marginBottom: '6px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '10pt', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{formattedDate}</span>
                              <span style={{ fontSize: '9pt', color: '#718096', fontWeight: 'normal' }}>{formatCurrency(dayAmount)}</span>
                            </div>
                            <ul className="bullet-list" style={{ marginTop: '4px', marginBottom: '0' }}>
                              {dayItems.map(item => {
                                const sentences = item.description 
                                  ? item.description.split('.').map(s => s.trim()).filter(s => s.length > 0).map(s => s + '.')
                                  : [];
                                return sentences.map((sentence, idx) => (
                                  <li key={`${item.id}-${idx}`}>{sentence}</li>
                                ));
                              })}
                            </ul>
                          </div>
                        );
                      });
                    } else if (visibleLaborItems.length > 0) {
                      return (
                        <ul className="bullet-list">
                          {visibleLaborItems.sort((a,b)=>a.sort_order - b.sort_order).map(item => {
                            const sentences = item.description 
                              ? item.description.split('.').map(s => s.trim()).filter(s => s.length > 0).map(s => s + '.')
                              : [];
                            return sentences.map((sentence, idx) => (
                              <li key={`${item.id}-${idx}`}>{sentence}</li>
                            ));
                          })}
                        </ul>
                      );
                    }
                    return null;
                  })()}
                </td>
                <td className="amount-val">{formatCurrency(laborAmount)}</td>
              </tr>
              <tr>
                <td>
                  <div className="item-name">Materials</div>
                  {visibleMaterialItems.length > 0 ? (
                    <ul className="bullet-list">
                      {visibleMaterialItems.sort((a,b)=>a.sort_order - b.sort_order).map(item => (
                        <li key={item.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ paddingRight: '15px' }}>{item.description}</span>
                            <span style={{ color: '#718096', whiteSpace: 'nowrap' }}>{formatCurrency(item.amount)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontStyle: 'italic', fontSize: '9.5pt', color: '#4a5568', marginTop: '4px' }}>
                      No materials for this job
                    </div>
                  )}
                </td>
                <td className="amount-val">
                  {formatCurrency(materialsAmount)}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="summary-table">
            <tbody>
              <tr>
                <td style={{ width: '50%', paddingRight: '30px', verticalAlign: 'top' }}>
                  <div className="payment-box">
                    <h4>Payment Instructions</h4>
                    <p>Thank you for your business!</p>
                    {tenant.payment_method && tenant.payment_details && (
                      <p style={{ marginTop: '4px' }}>
                        Please send payment via <strong>{tenant.payment_method}</strong>: <strong>{tenant.payment_details}</strong>
                      </p>
                    )}
                  </div>
                </td>
                <td style={{ width: '50%', verticalAlign: 'top' }}>
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
