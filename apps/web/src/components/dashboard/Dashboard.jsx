import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AddClientModal } from '../clients/AddClientModal';
import { AddJobModal } from '../jobs/AddJobModal';
import { useClients, useCreateClient } from '../../hooks/api/useClients';
import { useCreateJob } from '../../hooks/api/useJobs';
import { useDashboardSummary } from '../../hooks/api/useDashboard';
import { INVOICE_STATUSES, JOB_STATUSES, STATUS_COLORS } from '../../utils/constants';
import { useScreenContext } from '../../contexts/AiContext';

export const Dashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [jobTab, setJobTab] = useState('all');
  const [expandedInvoices, setExpandedInvoices] = useState(() => new Set());
  const [expandedJobs, setExpandedJobs] = useState(() => new Set());

  const toggleInvoice = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedInvoices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleJob = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedJobs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInvoiceRowClick = (inv) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      toggleInvoice(inv.id);
    } else {
      navigate(`/invoices/${inv.id}`);
    }
  };

  const handleJobRowClick = (job) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      toggleJob(job.id);
    } else {
      navigate(`/jobs/${job.id}`);
    }
  };

  const createClientMutation = useCreateClient();
  const createJobMutation = useCreateJob();
  const { data: clientsData = [] } = useClients();

  const { data: summary, isLoading, error, refetch } = useDashboardSummary(userData?.tenant_id);

  // Register screen context envelope for AI Copilot
  useScreenContext({
    screen: 'Dashboard',
    summary: {
      activeClients: summary?.active_clients_count || 0,
      totalRevenue: summary?.monthly_revenue || 0,
      openJobsCount: summary?.open_jobs_count || 0
    }
  }, [summary]);

  const handleCreateClient = (data) => {
    createClientMutation.mutate(data, {
      onSuccess: () => {
        setClientModalOpen(false);
        refetch();
      }
    });
  };

  const handleCreateJob = (data) => {
    const { id: _ignoredId, ...cleanData } = data;
    createJobMutation.mutate(cleanData, {
      onSuccess: () => {
        setJobModalOpen(false);
        refetch();
      }
    });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const label = status?.replace(/_/g, ' ') || 'unknown';
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[status] || STATUS_COLORS.open}`}>
        {label}
      </span>
    );
  };

  const getActivityIcon = (type) => {
    switch(type) {
      case 'New Client Added': return 'person_add';
      case 'Job Created': return 'work';
      case 'Material Logged': return 'inventory_2';
      default: return 'info';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded w-32"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-24 sm:h-28 bg-gray-200 rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>Error loading dashboard: {error.message}</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-primary text-black rounded hover:opacity-90">Retry</button>
      </div>
    );
  }

  const {
    activeClients = 0,
    revenueThisMonth = 0,
    laborRevenueThisMonth = 0,
    materialCostThisMonth = 0,
    jobsThisMonth = 0,
    invoices = [],
    jobs = []
  } = summary || {};

  // Filters
  const filteredInvoices = invoices.filter(inv => {
    if (activeTab === 'all') return true;
    return inv.status === activeTab;
  });
  const invoiceTotal = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const laborTotal = filteredInvoices.reduce((sum, inv) => sum + Number(inv.labor_amount || 0), 0);
  const materialTotal = filteredInvoices.reduce((sum, inv) => sum + Number(inv.materials_amount || 0), 0);

  const filteredJobs = jobs.filter(job => {
    if (jobTab === 'all') return true;
    return job.status === jobTab;
  });

  // Empty State logic
  // If a workspace has 0 clients, they definitely have 0 jobs and 0 invoices.
  if (activeClients === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl">rocket_launch</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-gray-900 mb-4">Welcome to Your Workspace!</h1>
        <p className="font-body-lg text-gray-600 mb-8 w-full max-w-[500px]">
          You have no active clients or jobs yet. Let's get started by creating your first client and setting up your first job.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => setClientModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black font-title-md rounded-lg hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined">person_add</span>
            Add First Client
          </button>
          <button 
            onClick={() => setJobModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 bg-white font-title-md rounded-lg hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined">work</span>
            Create First Job
          </button>
        </div>

        <AddClientModal 
          open={clientModalOpen} 
          onClose={() => setClientModalOpen(false)} 
          onSubmit={handleCreateClient}
        />
        <AddJobModal 
          open={jobModalOpen} 
          onClose={() => setJobModalOpen(false)} 
          onSubmit={handleCreateJob}
          clients={clientsData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">Dashboard</h1>
          <p className="font-body-md text-gray-500 mt-1">Welcome back, {userData?.full_name?.split(' ')[0] || 'User'}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setClientModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 border border-gray-300 text-gray-700 bg-white px-4 py-2 rounded font-body-md font-bold cursor-pointer hover:bg-gray-50 transition-colors shadow-sm h-11"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            New Client
          </button>
          <button 
            onClick={() => setJobModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-black px-4 py-2 rounded font-body-md font-bold cursor-pointer hover:bg-opacity-90 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.15)] h-11"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Job
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2 sm:mb-4 gap-1">
            <h3 className="font-title-sm text-xs sm:text-sm text-gray-500 truncate" title="Total Revenue (This Month)">Total Revenue</h3>
            <span className="material-symbols-outlined text-green-500 bg-green-50 p-1.5 sm:p-2 rounded-lg text-[18px] sm:text-[24px] shrink-0">payments</span>
          </div>
          <div className="font-headline-lg text-base sm:text-headline-lg font-bold text-gray-900 truncate">{formatCurrency(revenueThisMonth)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2 sm:mb-4 gap-1">
            <h3 className="font-title-sm text-xs sm:text-sm text-gray-500 truncate" title="Labor Revenue">Labor Revenue</h3>
            <span className="material-symbols-outlined text-blue-500 bg-blue-50 p-1.5 sm:p-2 rounded-lg text-[18px] sm:text-[24px] shrink-0">engineering</span>
          </div>
          <div className="font-headline-lg text-base sm:text-headline-lg font-bold text-gray-900 truncate">{formatCurrency(laborRevenueThisMonth)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2 sm:mb-4 gap-1">
            <h3 className="font-title-sm text-xs sm:text-sm text-gray-500 truncate" title="Material Costs">Material Costs</h3>
            <span className="material-symbols-outlined text-red-500 bg-red-50 p-1.5 sm:p-2 rounded-lg text-[18px] sm:text-[24px] shrink-0">inventory</span>
          </div>
          <div className="font-headline-lg text-base sm:text-headline-lg font-bold text-gray-900 truncate">{formatCurrency(materialCostThisMonth)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2 sm:mb-4 gap-1">
            <h3 className="font-title-sm text-xs sm:text-sm text-gray-500 truncate" title="Total Jobs (This Month)">Total Jobs</h3>
            <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-1.5 sm:p-2 rounded-lg text-[18px] sm:text-[24px] shrink-0">work</span>
          </div>
          <div className="font-headline-lg text-base sm:text-headline-lg font-bold text-gray-900 truncate">{jobsThisMonth || 0}</div>
        </div>
      </div>

      {/* Tables Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        
        {/* Invoices Board */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full">
          <div className="border-b border-gray-100 px-5 pt-4">
            <h2 className="font-title-md font-bold text-gray-900 mb-4">Financial Tracking (Invoices)</h2>
            <div className="flex gap-6 overflow-x-auto no-scrollbar">
              {INVOICE_STATUSES.map(status => (
                <button 
                  key={status.value}
                  onClick={() => setActiveTab(status.value)}
                  className={`pb-4 font-title-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === status.value ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[420px] flex-1">
            <table className="w-full text-left border-collapse min-w-full md:min-w-[600px] relative">
              <thead className="sticky top-0 bg-[#1F2937] text-white z-10 border-b border-surface-container-high">
                <tr>
                  <th className="py-3 px-3 sm:px-4 font-label-caps text-label-caps whitespace-nowrap">Invoice #</th>
                  <th className="hidden md:table-cell py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Client</th>
                  <th className="hidden md:table-cell py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Due Date</th>
                  <th className="py-3 px-3 sm:px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Status</th>
                  <th className="hidden md:table-cell py-3 px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Labor</th>
                  <th className="hidden md:table-cell py-3 px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Materials</th>
                  <th className="py-3 px-3 sm:px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Total</th>
                  <th className="md:hidden w-8 px-2 py-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="font-body-md divide-y divide-surface-container-high">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan="8" className="px-5 py-8 text-center text-gray-500">No invoices found for this filter.</td></tr>
                ) : (
                  filteredInvoices.map((inv, idx) => {
                    const isExpanded = expandedInvoices.has(inv.id);
                    return (
                      <React.Fragment key={inv.id}>
                        <tr 
                          onClick={() => handleInvoiceRowClick(inv)} 
                          className={`hover:bg-gray-100 cursor-pointer transition-colors group ${
                            isExpanded ? 'bg-amber-50/40 md:bg-white' : (idx % 2 !== 0 ? 'bg-[#F9FAFB]' : 'bg-white')
                          }`}
                        >
                          <td className="px-3 sm:px-4 py-3 sm:py-4 font-body-sm font-medium text-gray-900 group-hover:text-primary transition-colors">
                            <div className="font-semibold">{inv.invoice_number}</div>
                            <div className="md:hidden text-xs text-gray-500 font-normal truncate max-w-[130px]">{inv.clients?.name}</div>
                          </td>
                          <td className="hidden md:table-cell px-4 py-4 font-body-sm text-gray-600">{inv.clients?.name}</td>
                          <td className="hidden md:table-cell px-4 py-4 font-body-sm text-gray-500">{formatDate(inv.due_date)}</td>
                          <td className="px-3 sm:px-4 py-3 sm:py-4 text-right whitespace-nowrap">{getStatusBadge(inv.status)}</td>
                          <td className="hidden md:table-cell px-4 py-4 text-right font-body-sm text-gray-900 font-medium">{formatCurrency(inv.labor_amount)}</td>
                          <td className="hidden md:table-cell px-4 py-4 text-right font-body-sm text-gray-900 font-medium">{formatCurrency(inv.materials_amount)}</td>
                          <td className="px-3 sm:px-4 py-3 sm:py-4 text-right font-body-sm text-gray-900 font-semibold">{formatCurrency(inv.total_amount)}</td>
                          
                          {/* Mobile Expand Chevron */}
                          <td 
                            className="md:hidden px-2 py-3 text-center shrink-0" 
                            onClick={(e) => toggleInvoice(inv.id, e)}
                          >
                            <button
                              type="button"
                              className="p-1 rounded-full hover:bg-gray-200 transition-colors text-gray-400 cursor-pointer"
                              aria-label={isExpanded ? 'Collapse invoice details' : 'Expand invoice details'}
                            >
                              <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 block ${isExpanded ? 'rotate-180 text-amber-600' : ''}`}>
                                expand_more
                              </span>
                            </button>
                          </td>
                        </tr>

                        {/* Mobile Expandable Sub-Row */}
                        {isExpanded && (
                          <tr className="md:hidden bg-gray-50/95 border-b border-surface-container-high transition-all">
                            <td colSpan="4" className="p-3.5 text-xs">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                                <div>
                                  <span className="text-gray-400 font-medium block text-[10px] uppercase tracking-wider mb-0.5">Due Date</span>
                                  <span className="text-gray-800 font-medium">{formatDate(inv.due_date)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-medium block text-[10px] uppercase tracking-wider mb-0.5">Labor Amount</span>
                                  <span className="text-gray-800 font-medium">{formatCurrency(inv.labor_amount)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-medium block text-[10px] uppercase tracking-wider mb-0.5">Materials Amount</span>
                                  <span className="text-gray-800 font-medium">{formatCurrency(inv.materials_amount)}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/invoices/${inv.id}`)}
                                className="w-full py-1.5 px-3 bg-white border border-gray-200 rounded-lg text-primary font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 cursor-pointer text-xs shadow-2xs"
                              >
                                <span>View Full Invoice</span>
                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                              </button>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-white border-t-2 border-gray-200 z-10">
                <tr>
                  <td colSpan="4" className="hidden md:table-cell px-5 py-3 text-right font-title-sm text-gray-700">Total ({INVOICE_STATUSES.find(s => s.value === activeTab)?.label || 'All'})</td>
                  <td className="hidden md:table-cell px-5 py-3 text-right font-title-sm text-gray-900">{formatCurrency(laborTotal)}</td>
                  <td className="hidden md:table-cell px-5 py-3 text-right font-title-sm text-gray-900">{formatCurrency(materialTotal)}</td>
                  <td className="hidden md:table-cell px-5 py-3 text-right font-title-md font-bold text-gray-900">{formatCurrency(invoiceTotal)}</td>

                  {/* Mobile Tfoot */}
                  <td colSpan="2" className="md:hidden px-3 py-2.5 text-left font-title-sm text-gray-700">
                    Total ({INVOICE_STATUSES.find(s => s.value === activeTab)?.label || 'All'})
                  </td>
                  <td className="md:hidden px-3 py-2.5 text-right font-title-sm font-bold text-gray-900">
                    {formatCurrency(invoiceTotal)}
                  </td>
                  <td className="md:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Jobs Board */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full">
          <div className="border-b border-gray-100 px-5 pt-4">
            <h2 className="font-title-md font-bold text-gray-900 mb-4">Operational Tracking (Jobs)</h2>
            <div className="flex gap-6 overflow-x-auto no-scrollbar">
              {JOB_STATUSES.map(status => (
                <button 
                  key={status.value}
                  onClick={() => setJobTab(status.value)}
                  className={`pb-4 font-title-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${jobTab === status.value ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[420px] flex-1">
            <table className="w-full text-left border-collapse min-w-full md:min-w-[600px] relative">
              <thead className="sticky top-0 bg-[#1F2937] text-white z-10 border-b border-surface-container-high">
                <tr>
                  <th className="py-3 px-3 sm:px-4 font-label-caps text-label-caps whitespace-nowrap">Job Title</th>
                  <th className="hidden md:table-cell py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Client</th>
                  <th className="hidden md:table-cell py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Start Date</th>
                  <th className="py-3 px-3 sm:px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Status</th>
                  <th className="md:hidden w-8 px-2 py-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="font-body-md divide-y divide-surface-container-high">
                {filteredJobs.length === 0 ? (
                  <tr><td colSpan="5" className="px-5 py-8 text-center text-gray-500">No jobs found for this filter.</td></tr>
                ) : (
                  filteredJobs.map((job, idx) => {
                    const isExpanded = expandedJobs.has(job.id);
                    return (
                      <React.Fragment key={job.id}>
                        <tr 
                          onClick={() => handleJobRowClick(job)} 
                          className={`hover:bg-gray-100 cursor-pointer transition-colors group ${
                            isExpanded ? 'bg-amber-50/40 md:bg-white' : (idx % 2 !== 0 ? 'bg-[#F9FAFB]' : 'bg-white')
                          }`}
                        >
                          <td className="px-3 sm:px-4 py-3 sm:py-4 font-body-sm font-medium text-gray-900 group-hover:text-primary transition-colors">
                            <div className="font-semibold">{job.title}</div>
                            <div className="md:hidden text-xs text-gray-500 font-normal truncate max-w-[150px]">{job.clients?.name}</div>
                          </td>
                          <td className="hidden md:table-cell px-4 py-4 font-body-sm text-gray-600">{job.clients?.name}</td>
                          <td className="hidden md:table-cell px-4 py-4 font-body-sm text-gray-500">{formatDate(job.start_date)}</td>
                          <td className="px-3 sm:px-4 py-3 sm:py-4 text-right whitespace-nowrap">{getStatusBadge(job.status)}</td>

                          {/* Mobile Expand Chevron */}
                          <td 
                            className="md:hidden px-2 py-3 text-center shrink-0" 
                            onClick={(e) => toggleJob(job.id, e)}
                          >
                            <button
                              type="button"
                              className="p-1 rounded-full hover:bg-gray-200 transition-colors text-gray-400 cursor-pointer"
                              aria-label={isExpanded ? 'Collapse job details' : 'Expand job details'}
                            >
                              <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 block ${isExpanded ? 'rotate-180 text-amber-600' : ''}`}>
                                expand_more
                              </span>
                            </button>
                          </td>
                        </tr>

                        {/* Mobile Expandable Sub-Row */}
                        {isExpanded && (
                          <tr className="md:hidden bg-gray-50/95 border-b border-surface-container-high transition-all">
                            <td colSpan="3" className="p-3.5 text-xs">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                                <div>
                                  <span className="text-gray-400 font-medium block text-[10px] uppercase tracking-wider mb-0.5">Client</span>
                                  <span className="text-gray-800 font-medium">{job.clients?.name || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-medium block text-[10px] uppercase tracking-wider mb-0.5">Start Date</span>
                                  <span className="text-gray-800 font-medium">{formatDate(job.start_date)}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/jobs/${job.id}`)}
                                className="w-full py-1.5 px-3 bg-white border border-gray-200 rounded-lg text-primary font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 cursor-pointer text-xs shadow-2xs"
                              >
                                <span>View Full Job</span>
                                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                              </button>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddClientModal 
        open={clientModalOpen} 
        onClose={() => setClientModalOpen(false)} 
        onSubmit={handleCreateClient}
      />
      <AddJobModal 
        open={jobModalOpen} 
        onClose={() => setJobModalOpen(false)} 
        onSubmit={handleCreateJob}
        clients={clientsData}
      />
    </div>
  );
};
