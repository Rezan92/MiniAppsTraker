import React from 'react';
import { Link } from 'react-router-dom';

export const PageHeader = ({
  title,
  subtitle,
  actionButtonText,
  actionButtonIcon,
  onActionClick,
  actionLinkTo,
  tabs = [],
  activeTab,
  onTabChange,
  searchPlaceholder = "Search...",
  search,
  onSearchChange,
  children
}) => {
  return (
    <>
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">{title}</h1>
          <p className="font-body-md text-gray-500 mt-1">{subtitle}</p>
        </div>
        
        {actionButtonText && (
          actionLinkTo ? (
            <Link 
              to={actionLinkTo}
              className="flex items-center justify-center gap-2 bg-primary text-black px-4 py-2 rounded font-body-md font-bold cursor-pointer hover:bg-opacity-90 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.15)] h-11 whitespace-nowrap w-full sm:w-auto shrink-0"
            >
              {actionButtonIcon && <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{actionButtonIcon}</span>}
              {actionButtonText}
            </Link>
          ) : (
            <button 
              onClick={onActionClick}
              className="flex items-center justify-center gap-2 bg-primary text-black px-4 py-2 rounded font-body-md font-bold cursor-pointer hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_10px_rgba(245,158,11,0.15)] h-11 whitespace-nowrap w-full sm:w-auto shrink-0"
            >
              {actionButtonIcon && <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{actionButtonIcon}</span>}
              {actionButtonText}
            </button>
          )
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        {/* Tabs */}
        {tabs.length > 0 && (
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none w-[calc(100%+2rem)] sm:w-auto shrink-0">
            <div className="flex space-x-1 p-1 bg-gray-100 rounded-xl border border-gray-200 inline-flex">
              {tabs.map(tab => (
                <button 
                  key={tab.value}
                  onClick={() => onTabChange(tab.value)}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${activeTab === tab.value ? 'bg-white text-gray-900 shadow-sm border border-gray-200 font-semibold' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Consolidated Search & Actions Toolbar */}
        {(onSearchChange || children) && (
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-1 md:justify-end">
            {/* Table Search */}
            {onSearchChange && (
              <div className="relative flex-1 sm:w-72 md:w-64 lg:w-72">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
                </div>
                <input 
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm transition-shadow shadow-xs h-10" 
                  placeholder={searchPlaceholder} 
                  type="text" 
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                />
              </div>
            )}

            {/* Extra Filters (like Date Range) */}
            {children && (
              <div className="flex items-center gap-2 shrink-0">
                {children}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
