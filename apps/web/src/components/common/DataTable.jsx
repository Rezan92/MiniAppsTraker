import React from 'react';
import { EmptyState } from './EmptyState';

export const DataTable = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyIcon = 'inbox',
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records matching your current filter.',
  emptyActionText,
  onEmptyAction,
  onRowClick,
  minWidth = '800px',
  footer = null,
  skeletonRowCount = 5,
  renderMobileCard = null
}) => {
  // Find key column roles for mobile card mapping
  const primaryCol = columns[0];
  const statusCol = columns.find(c => c.key === 'status' || c.accessor === 'status');
  const actionCol = columns.find(c => c.key === 'actions' || c.accessor === 'actions');
  const secondaryCols = columns.filter(c => c !== primaryCol && c !== statusCol && c !== actionCol);

  return (
    <div className="bg-white border border-surface-container-high rounded-lg shadow-sm overflow-hidden flex flex-col">
      {/* Mobile Stacked Card View (< 768px) */}
      <div className="block md:hidden">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {Array.from({ length: skeletonRowCount }).map((_, rIdx) => (
              <div key={`skeleton-card-${rIdx}`} className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs animate-pulse space-y-3">
                <div className="flex justify-between items-start">
                  <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-5 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3.5 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            actionText={emptyActionText}
            onActionClick={onEmptyAction}
          />
        ) : (
          <div className="p-3 space-y-3 divide-y-0">
            {data.map((item, rowIdx) => {
              if (renderMobileCard) {
                return (
                  <div 
                    key={item.id || rowIdx}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={onRowClick ? 'cursor-pointer' : ''}
                  >
                    {renderMobileCard(item, rowIdx)}
                  </div>
                );
              }

              return (
                <div
                  key={item.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`bg-white border border-gray-200 rounded-xl p-4 shadow-xs transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100/70' : ''
                  }`}
                >
                  {/* Card Header: Primary Column & Status / Actions */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100">
                    <div className="min-w-0 flex-1">
                      {primaryCol && (
                        primaryCol.render 
                          ? primaryCol.render(item, rowIdx) 
                          : <span className="font-semibold text-gray-900">{item[primaryCol.accessor || primaryCol.key]}</span>
                      )}
                    </div>
                    {statusCol && (
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        {statusCol.render 
                          ? statusCol.render(item, rowIdx) 
                          : <span className="text-xs">{item[statusCol.accessor || statusCol.key]}</span>
                        }
                      </div>
                    )}
                  </div>

                  {/* Card Body: Secondary Details */}
                  {secondaryCols.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 py-3 text-xs">
                      {secondaryCols.map((col, colIdx) => (
                        <div key={col.key || colIdx} className="min-w-0">
                          <span className="text-gray-400 font-medium block truncate text-[11px] mb-0.5">
                            {col.header}
                          </span>
                          <div className="text-gray-800 font-medium truncate">
                            {col.render ? col.render(item, rowIdx) : item[col.accessor || col.key] || '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Card Footer: Quick Actions */}
                  {actionCol && (
                    <div 
                      className="pt-2.5 mt-1 border-t border-gray-100 flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actionCol.render 
                        ? actionCol.render(item, rowIdx) 
                        : item[actionCol.accessor || actionCol.key]
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {footer && (
          <div className="border-t border-gray-200 bg-gray-50 overflow-x-auto">
            {React.isValidElement(footer) && footer.type === 'tr' ? (
              <table className="w-full text-left border-collapse">
                <tbody>{footer}</tbody>
              </table>
            ) : (
              <div className="p-3">{footer}</div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Standard HTML Table (>= 768px) - 100% UNTOUCHED */}
      <div className="hidden md:block overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse" style={{ minWidth }}>
          <thead>
            <tr className="bg-[#1F2937] text-white border-b border-surface-container-high">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`py-3 px-4 font-label-caps text-label-caps whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.className || ''}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: skeletonRowCount }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="border-b border-surface-container-high animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-cell-${cIdx}`} className="py-4 px-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    actionText={emptyActionText}
                    onActionClick={onEmptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr
                  key={item.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`border-b border-surface-container-high transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-surface-container-low/60' : 'hover:bg-surface-container-low/40'
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`py-3.5 px-4 font-table-data text-table-data text-on-surface ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${col.cellClassName || ''}`}
                    >
                      {col.render ? col.render(item, rowIdx) : item[col.accessor || col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>
    </div>
  );
};
