import React, { useState } from 'react';
import { EmptyState } from './EmptyState';
import { useIsMobile } from '../../hooks/ui/useMediaQuery';

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
  const isMobile = useIsMobile(768);
  const [expandedRows, setExpandedRows] = useState(() => new Set());

  const toggleRow = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Determine mobile visible columns vs hidden (expandable) columns
  // Priority:
  // 1. Explicit `hideOnMobile: true` -> hidden on mobile
  // 2. Explicit `showOnMobile: true` -> visible on mobile
  // 3. Fallback smart defaults if no columns have explicit mobile config:
  //    - First column (columns[0]) is always visible
  //    - Status column (key === 'status') is visible
  //    - Total / Amount column (key === 'total_amount') is visible
  const hasExplicitMobileConfig = columns.some(c => c.showOnMobile !== undefined);

  const isColVisibleOnMobile = (col, idx) => {
    if (col.hideOnMobile) return false;
    if (col.showOnMobile) return true;
    if (hasExplicitMobileConfig) return false;

    // Smart defaults
    if (idx === 0) return true;
    if (col.key === 'status' || col.accessor === 'status') return true;
    if (col.key === 'total_amount' || col.accessor === 'total_amount') return true;
    return false;
  };

  const hiddenColsMobile = columns.filter((col, idx) => !isColVisibleOnMobile(col, idx));
  const hasExpandableColumns = hiddenColsMobile.length > 0;
  const mobileColSpan = columns.filter((col, idx) => isColVisibleOnMobile(col, idx)).length + (hasExpandableColumns ? 1 : 0);

  return (
    <div className="bg-white border border-surface-container-high rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto min-h-[300px]">
        <table
          className="w-full text-left border-collapse"
          style={{ minWidth: isMobile ? '100%' : minWidth }}
        >
          <thead>
            <tr className="bg-[#1F2937] text-white border-b border-surface-container-high">
              {columns.map((col, idx) => {
                const visibleOnMobile = isColVisibleOnMobile(col, idx);
                return (
                  <th
                    key={col.key || idx}
                    className={`py-3 px-3 sm:px-4 font-label-caps text-label-caps whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${visibleOnMobile ? '' : 'hidden md:table-cell'} ${col.className || ''}`}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.header}
                  </th>
                );
              })}
              {/* Expand chevron header (mobile only) */}
              {hasExpandableColumns && (
                <th className="md:hidden w-10 px-2 py-3 text-center font-label-caps text-label-caps"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: skeletonRowCount }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="border-b border-surface-container-high animate-pulse">
                  {columns.map((col, cIdx) => {
                    const visibleOnMobile = isColVisibleOnMobile(col, cIdx);
                    return (
                      <td
                        key={`skeleton-cell-${cIdx}`}
                        className={`py-3.5 px-3 sm:px-4 ${visibleOnMobile ? '' : 'hidden md:table-cell'}`}
                      >
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </td>
                    );
                  })}
                  {hasExpandableColumns && (
                    <td className="md:hidden px-2 py-3.5">
                      <div className="h-4 bg-gray-200 rounded w-4 mx-auto"></div>
                    </td>
                  )}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasExpandableColumns ? 1 : 0)} className="p-0">
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
              data.map((item, rowIdx) => {
                const rowId = item.id || `row-${rowIdx}`;
                const isExpanded = expandedRows.has(rowId);

                const handleRowClick = () => {
                  if (isMobile && hasExpandableColumns) {
                    toggleRow(rowId);
                  } else if (onRowClick) {
                    onRowClick(item);
                  }
                };

                return (
                  <React.Fragment key={rowId}>
                    <tr
                      onClick={handleRowClick}
                      className={`border-b border-surface-container-high transition-colors ${
                        onRowClick || (isMobile && hasExpandableColumns)
                          ? 'cursor-pointer hover:bg-surface-container-low/60 active:bg-surface-container-low/80'
                          : 'hover:bg-surface-container-low/40'
                      } ${isExpanded ? 'bg-amber-50/40 md:bg-transparent' : ''}`}
                    >
                      {columns.map((col, colIdx) => {
                        const visibleOnMobile = isColVisibleOnMobile(col, colIdx);
                        return (
                          <td
                            key={col.key || colIdx}
                            className={`py-3 px-3 sm:px-4 font-table-data text-table-data text-on-surface ${
                              col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                            } ${visibleOnMobile ? '' : 'hidden md:table-cell'} ${col.cellClassName || ''}`}
                          >
                            {col.render ? col.render(item, rowIdx) : item[col.accessor || col.key]}
                          </td>
                        );
                      })}

                      {/* Mobile Expand Chevron Cell */}
                      {hasExpandableColumns && (
                        <td
                          className="md:hidden px-2 py-3 text-center shrink-0"
                          onClick={(e) => toggleRow(rowId, e)}
                        >
                          <button
                            type="button"
                            className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-400 cursor-pointer"
                            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                          >
                            <span
                              className={`material-symbols-outlined text-[20px] transition-transform duration-200 block ${
                                isExpanded ? 'rotate-180 text-amber-600' : ''
                              }`}
                            >
                              expand_more
                            </span>
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* Mobile Expandable Sub-Row */}
                    {hasExpandableColumns && isExpanded && (
                      <tr className="md:hidden bg-gray-50/95 border-b border-surface-container-high transition-all">
                        <td colSpan={mobileColSpan} className="p-3.5 sm:p-4 text-xs">
                          {/* 2-Column Grid of Hidden Columns */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                            {hiddenColsMobile.map((col, cIdx) => (
                              <div key={col.key || cIdx} className="min-w-0">
                                <span className="text-gray-400 font-medium block text-[11px] uppercase tracking-wider mb-0.5">
                                  {col.header}
                                </span>
                                <div className="text-gray-900 font-medium text-xs break-words">
                                  {col.render ? col.render(item, rowIdx) : item[col.accessor || col.key] || '—'}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Navigation & Details Link */}
                          {onRowClick && (
                            <div className="pt-2.5 mt-2.5 border-t border-gray-200/80 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => onRowClick(item)}
                                className="text-amber-600 hover:text-amber-700 font-semibold text-xs flex items-center gap-1 cursor-pointer py-1"
                              >
                                <span>View full details</span>
                                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>
    </div>
  );
};
