import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CreateClientModal } from '../shared/CreateClientModal';
import { CreateJobModal } from '../shared/CreateJobModal';

export const Dashboard = () => {
  const { session, userData } = useAuth();
  const navigate = useNavigate();

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [jobModalOpen, setJobModalOpen] = useState(false);

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardSummary', userData?.tenant_id],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/dashboard/summary`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch summary');
      return json.data;
    },
    enabled: !!session && !!userData?.tenant_id
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const map = {
      open: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    const label = status?.replace('_', ' ') || 'unknown';
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || map.open}`}>
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
    openJobs = 0,
    monthlyRevenue = 0,
    monthlyMaterialCosts = 0,
    activeJobs = [],
    upcomingJobs = [],
    recentActivity = []
  } = summary || {};

  // Empty State logic
  if (activeClients === 0 && openJobs === 0 && monthlyRevenue === 0 && activeJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-5xl">rocket_launch</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg font-bold text-gray-900 mb-4">Welcome to Your Workspace!</h1>
        <p className="font-body-lg text-gray-600 mb-8 max-w-lg">
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
            <h3 className="font-title-sm text-gray-500">Active Clients</h3>
            <span className="material-symbols-outlined text-blue-500 bg-blue-50 p-2 rounded-lg">group</span>
          </div>
          <div className="font-headline-lg font-bold text-gray-900">{activeClients}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-title-sm text-gray-500">Open Jobs</h3>
            <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-2 rounded-lg">construction</span>
          </div>
          <div className="font-headline-lg font-bold text-gray-900">{openJobs}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-title-sm text-gray-500">Revenue (This Month)</h3>
            <span className="material-symbols-outlined text-green-500 bg-green-50 p-2 rounded-lg">payments</span>
          </div>
          <div className="font-headline-lg font-bold text-gray-900">{formatCurrency(monthlyRevenue)}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-title-sm text-gray-500">Materials (This Month)</h3>
            <span className="material-symbols-outlined text-red-500 bg-red-50 p-2 rounded-lg">inventory</span>
          </div>
          <div className="font-headline-lg font-bold text-gray-900">{formatCurrency(monthlyMaterialCosts)}</div>
        </div>
      </div>

      {/* Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Jobs */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-title-md font-bold text-gray-900">Active Jobs</h3>
            <button onClick={() => navigate('/jobs')} className="text-sm font-medium text-primary hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto flex-1">
            {activeJobs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No active jobs found.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="font-label-md font-semibold text-gray-600 px-5 py-3">Job Title</th>
                    <th className="font-label-md font-semibold text-gray-600 px-5 py-3">Client</th>
                    <th className="font-label-md font-semibold text-gray-600 px-5 py-3">Start Date</th>
                    <th className="font-label-md font-semibold text-gray-600 px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeJobs.map(job => (
                    <tr 
                      key={job.id} 
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 font-body-md font-medium text-gray-900">{job.title}</td>
                      <td className="px-5 py-4 font-body-sm text-gray-600">{job.clients?.name || '—'}</td>
                      <td className="px-5 py-4 font-body-sm text-gray-500">{formatDate(job.start_date)}</td>
                      <td className="px-5 py-4 text-right">{getStatusBadge(job.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-title-md font-bold text-gray-900">Upcoming Schedule</h3>
            <p className="text-xs text-gray-500 mt-0.5">Next 7 days</p>
          </div>
          <div className="p-5 flex-1 overflow-y-auto max-h-[400px]">
            {upcomingJobs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-8">
                <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">event_available</span>
                <p className="font-body-sm">No upcoming jobs scheduled.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingJobs.map(job => (
                  <div key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="flex gap-4 p-3 rounded-lg border border-gray-100 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-gray-50 rounded-md shrink-0">
                      <span className="text-xs font-bold text-gray-500 uppercase">{new Date(job.start_date).toLocaleDateString('en-US', { month: 'short' })}</span>
                      <span className="text-lg font-bold text-gray-900">{new Date(job.start_date).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-title-sm text-gray-900 truncate">{job.title}</h4>
                      <p className="font-body-xs text-gray-500 truncate">{job.clients?.name || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row - Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-title-md font-bold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-5">
          {recentActivity.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No recent activity.</div>
          ) : (
            <div className="relative border-l border-gray-200 ml-3 md:ml-4 space-y-6 pb-4">
              {recentActivity.map((act, index) => (
                <div key={`${act.id}-${index}`} className="relative pl-6 md:pl-8">
                  <div className="absolute -left-[17px] md:-left-[17px] top-1 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-gray-500" style={{ fontSize: '16px' }}>{getActivityIcon(act.type)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
                    <div>
                      <h4 className="font-title-sm text-gray-900">{act.type}</h4>
                      <p className="font-body-sm text-gray-600 mt-1">{act.description}</p>
                    </div>
                    <span className="font-body-xs text-gray-400 whitespace-nowrap mt-1 sm:mt-0">
                      {new Date(act.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateClientModal open={clientModalOpen} onClose={() => { setClientModalOpen(false); refetch(); }} />
      <CreateJobModal open={jobModalOpen} onClose={() => { setJobModalOpen(false); refetch(); }} />
    </div>
  );
};
