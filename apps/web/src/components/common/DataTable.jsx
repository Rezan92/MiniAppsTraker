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
  skeletonRowCount = 5
}) => {
  return (
    <div className="bg-white border border-surface-container-high rounded-lg shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto min-h-[300px]">
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
