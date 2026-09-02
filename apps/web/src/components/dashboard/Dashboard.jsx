import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AddClientModal } from '../clients/AddClientModal';
import { AddJobModal } from '../jobs/AddJobModal';
import { useClients, useCreateClient } from '../../hooks/api/useClients';
import { useCreateJob } from '../../hooks/api/useJobs';
import { useDashboardSummary } from '../../hooks/api/useDashboard';
import { INVOICE_STATUSES, JOB_STATUSES, STATUS_COLORS } from '../../utils/constants';

export const Dashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [jobTab, setJobTab] = useState('all');

  const createClientMutation = useCreateClient();
  const createJobMutation = useCreateJob();
  const { data: clientsData = [] } = useClients();

  const { data: summary, isLoading, error, refetch } = useDashboardSummary(userData?.tenant_id);

  const handleCreateClient = (data) => {
    createClientMutation.mutate(data, {
      onSuccess: () => {
        setClientModalOpen(false);
        refetch();
      }
    });
  };

  const handleCreateJob = (data) => {
    createJobMutation.mutate(data, {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}
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

        <CreateClientModal open={clientModalOpen} onClose={() => { setClientModalOpen(false); refetch(); }} />
        <CreateJobModal open={jobModalOpen} onClose={() => { setJobModalOpen(false); refetch(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="font-body-md text-gray-500">Welcome back, {userData?.full_name?.split(' ')[0] || 'User'}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setClientModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 bg-white font-title-sm rounded-DEFAULT hover:bg-gray-50 transition-colors cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
            New Client
          </button>
          <button 
            onClick={() => setJobModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-black font-title-sm rounded-DEFAULT hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            New Job
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-title-sm text-gray-500">Total Revenue (This Month)</h3>
            <span className="material-symbols-outlined text-green-500 bg-green-50 p-2 rounded-lg">payments</span>
          </div>
          <div className="font-headline-lg font-bold text-gray-900">{formatCurrency(revenueThisMonth)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-title-sm text-gray-500">Labor Revenue</h3>
            <span className="material-symbols-outlined text-blue-500 bg-blue-50 p-2 rounded-lg">engineering</span>
          </div>
          <div className="font-headline-lg font-bold text-gray-900">{formatCurrency(laborRevenueThisMonth)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-title-sm text-gray-500">Material Costs</h3>
            <span className="material-symbols-outlined text-red-500 bg-red-50 p-2 rounded-lg">inventory</span>
          </div>
          <div className="font-headline-lg font-bold text-gray-900">{formatCurrency(materialCostThisMonth)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-title-sm text-gray-500">Total Jobs (This Month)</h3>
            <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-lg">work</span>
          </div>
          <div className="font-headline-lg font-bold text-gray-900">{jobsThisMonth || 0}</div>
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

          <div className="overflow-x-auto max-h-[400px] flex-1">
            <table className="w-full text-left border-collapse min-w-[600px] relative">
              <thead className="sticky top-0 bg-[#1F2937] text-white z-10 border-b border-surface-container-high">
                <tr>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Invoice #</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Client</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Due Date</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Status</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Labor</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Materials</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Total</th>
                </tr>
              </thead>
              <tbody className="font-body-md divide-y divide-surface-container-high">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan="7" className="px-5 py-8 text-center text-gray-500">No invoices found for this filter.</td></tr>
                ) : (
                  filteredInvoices.map((inv, idx) => (
                    <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className={`hover:bg-gray-100 cursor-pointer transition-colors group ${idx % 2 !== 0 ? 'bg-[#F9FAFB]' : 'bg-white'}`}>
                      <td className="px-4 py-4 font-body-sm font-medium text-gray-900 group-hover:text-primary transition-colors">{inv.invoice_number}</td>
                      <td className="px-4 py-4 font-body-sm text-gray-600">{inv.clients?.name}</td>
                      <td className="px-4 py-4 font-body-sm text-gray-500">{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-4 text-right">{getStatusBadge(inv.status)}</td>
                      <td className="px-4 py-4 text-right font-body-sm text-gray-900 font-medium">{formatCurrency(inv.labor_amount)}</td>
                      <td className="px-4 py-4 text-right font-body-sm text-gray-900 font-medium">{formatCurrency(inv.materials_amount)}</td>
                      <td className="px-4 py-4 text-right font-body-sm text-gray-900 font-medium">{formatCurrency(inv.total_amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="sticky bottom-0 bg-white border-t-2 border-gray-200 z-10">
                <tr>
                  <td colSpan="4" className="px-5 py-3 text-right font-title-sm text-gray-700">Total ({INVOICE_STATUSES.find(s => s.value === activeTab)?.label || 'All'})</td>
                  <td className="px-5 py-3 text-right font-title-sm text-gray-900">{formatCurrency(laborTotal)}</td>
                  <td className="px-5 py-3 text-right font-title-sm text-gray-900">{formatCurrency(materialTotal)}</td>
                  <td className="px-5 py-3 text-right font-title-md font-bold text-gray-900">{formatCurrency(invoiceTotal)}</td>
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

          <div className="overflow-x-auto max-h-[400px] flex-1">
            <table className="w-full text-left border-collapse min-w-[600px] relative">
              <thead className="sticky top-0 bg-[#1F2937] text-white z-10 border-b border-surface-container-high">
                <tr>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Job Title</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Client</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap">Start Date</th>
                  <th className="py-3 px-4 font-label-caps text-label-caps whitespace-nowrap text-right">Status</th>
                </tr>
              </thead>
              <tbody className="font-body-md divide-y divide-surface-container-high">
                {filteredJobs.length === 0 ? (
                  <tr><td colSpan="4" className="px-5 py-8 text-center text-gray-500">No jobs found for this filter.</td></tr>
                ) : (
                  filteredJobs.map((job, idx) => (
                    <tr key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className={`hover:bg-gray-100 cursor-pointer transition-colors group ${idx % 2 !== 0 ? 'bg-[#F9FAFB]' : 'bg-white'}`}>
                      <td className="px-4 py-4 font-body-sm font-medium text-gray-900 group-hover:text-primary transition-colors">{job.title}</td>
                      <td className="px-4 py-4 font-body-sm text-gray-600">{job.clients?.name}</td>
                      <td className="px-4 py-4 font-body-sm text-gray-500">{formatDate(job.start_date)}</td>
                      <td className="px-4 py-4 text-right">{getStatusBadge(job.status)}</td>
                    </tr>
                  ))
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
