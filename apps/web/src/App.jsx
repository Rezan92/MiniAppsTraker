import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoginCard } from './components/LoginCard';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { ClientList } from './components/clients/ClientList';
import { JobList } from './components/jobs/JobList';
import { ClientDetails } from './components/clients/ClientDetails';
import { JobDetails } from './components/jobs/JobDetails';
import { InvoiceList } from './components/invoices/InvoiceList';
import { InvoiceBuilder } from './components/invoices/InvoiceBuilder';
import { InvoiceDetails } from './components/invoices/InvoiceDetails';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { NotFound } from './components/errors/NotFound';
import { Unauthorized } from './components/errors/Unauthorized';
import { ErrorBoundary } from './components/errors/ErrorBoundary';
import { NetworkBanner } from './components/layout/NetworkBanner';
import { Onboarding } from './components/Onboarding';
import { Join } from './components/Join';
import { ForgotPassword } from './components/ForgotPassword';
import { SettingsLayout } from './components/settings/SettingsLayout';
import { CompanyProfile } from './components/settings/CompanyProfile';
import { AdminRoute } from './components/layout/AdminRoute';

const MainApp = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginCard />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPassword />} />
      <Route path="/join/:token" element={<Join />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<ClientList />} />
        <Route path="clients/:id" element={<ClientDetails />} />
        <Route path="jobs" element={<JobList />} />
        <Route path="jobs/:id" element={<JobDetails />} />
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="invoices/new" element={<InvoiceBuilder />} />
        <Route path="invoices/:id" element={<InvoiceDetails />} />
        <Route path="invoices/:id/edit" element={<InvoiceBuilder />} />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="company" replace />} />
          <Route path="company" element={<AdminRoute><CompanyProfile /></AdminRoute>} />
          <Route path="team" element={<AdminRoute><div className="p-8">Team Management UI Pending (Task 15.2)</div></AdminRoute>} />
          <Route path="services" element={<AdminRoute><div className="p-8">Service Configuration UI Pending (Task 15.3)</div></AdminRoute>} />
          <Route path="account" element={<div className="p-8">My Account UI Pending (Task 15.4)</div>} />
        </Route>
      </Route>
      
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <NetworkBanner />
            <MainApp />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
