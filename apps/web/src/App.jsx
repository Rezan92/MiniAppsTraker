import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminRoute } from './components/layout/AdminRoute';
import { ErrorBoundary } from './components/errors/ErrorBoundary';
import { NetworkBanner } from './components/layout/NetworkBanner';

// Route-Level Code Splitting (React.lazy)
const LoginCard = React.lazy(() => import('./components/LoginCard').then(m => ({ default: m.LoginCard })));
const ForgotPassword = React.lazy(() => import('./components/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const Join = React.lazy(() => import('./components/Join').then(m => ({ default: m.Join })));
const Onboarding = React.lazy(() => import('./components/Onboarding').then(m => ({ default: m.Onboarding })));
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const ClientList = React.lazy(() => import('./components/clients/ClientList').then(m => ({ default: m.ClientList })));
const ClientDetails = React.lazy(() => import('./components/clients/ClientDetails').then(m => ({ default: m.ClientDetails })));
const PropertyDetails = React.lazy(() => import('./components/properties/PropertyDetails').then(m => ({ default: m.PropertyDetails })));
const JobList = React.lazy(() => import('./components/jobs/JobList').then(m => ({ default: m.JobList })));
const JobDetails = React.lazy(() => import('./components/jobs/JobDetails').then(m => ({ default: m.JobDetails })));
const InvoiceList = React.lazy(() => import('./components/invoices/InvoiceList').then(m => ({ default: m.InvoiceList })));
const InvoiceBuilder = React.lazy(() => import('./components/invoices/InvoiceBuilder').then(m => ({ default: m.InvoiceBuilder })));
const InvoiceDetails = React.lazy(() => import('./components/invoices/InvoiceDetails').then(m => ({ default: m.InvoiceDetails })));
const SettingsLayout = React.lazy(() => import('./components/settings/SettingsLayout').then(m => ({ default: m.SettingsLayout })));
const CompanyProfile = React.lazy(() => import('./components/settings/CompanyProfile').then(m => ({ default: m.CompanyProfile })));
const TeamManagement = React.lazy(() => import('./components/settings/TeamManagement').then(m => ({ default: m.TeamManagement })));
const Unauthorized = React.lazy(() => import('./components/errors/Unauthorized').then(m => ({ default: m.Unauthorized })));
const NotFound = React.lazy(() => import('./components/errors/NotFound').then(m => ({ default: m.NotFound })));

const PageLoader = () => (
  <div className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center p-8">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-3"></div>
    <span className="text-body-sm text-gray-500 font-medium">Loading view...</span>
  </div>
);

const MainApp = () => {
  const { user } = useAuth();
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginCard />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPassword />} />
        <Route path="/join/:token" element={<Join />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<ClientList />} />
          <Route path="clients/:id" element={<ClientDetails />} />
          <Route path="properties/:id" element={<PropertyDetails />} />
          <Route path="jobs" element={<JobList />} />
          <Route path="jobs/:id" element={<JobDetails />} />
          <Route path="invoices" element={<InvoiceList />} />
          <Route path="invoices/new" element={<InvoiceBuilder />} />
          <Route path="invoices/:id" element={<InvoiceDetails />} />
          <Route path="invoices/:id/edit" element={<InvoiceBuilder />} />
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="company" replace />} />
            <Route path="company" element={<AdminRoute><CompanyProfile /></AdminRoute>} />
            <Route path="team" element={<AdminRoute><TeamManagement /></AdminRoute>} />
            <Route path="services" element={<AdminRoute><div className="p-8">Service Configuration UI Pending (Task 15.3)</div></AdminRoute>} />
          </Route>
          <Route path="profile" element={<div className="p-8">My Account UI Pending (Task 15.4)</div>} />
        </Route>
        
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <WorkspaceProvider>
            <BrowserRouter>
              <NetworkBanner />
              <MainApp />
            </BrowserRouter>
          </WorkspaceProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
