import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoginCard } from './components/LoginCard';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ClientList } from './components/clients/ClientList';
import { JobList } from './components/jobs/JobList';
import { ClientDetails } from './components/clients/ClientDetails';
import { JobDetails } from './components/jobs/JobDetails';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { NotFound } from './components/errors/NotFound';
import { Unauthorized } from './components/errors/Unauthorized';
import { ErrorBoundary } from './components/errors/ErrorBoundary';
import { NetworkBanner } from './components/layout/NetworkBanner';
import { Onboarding } from './components/Onboarding';
import { Join } from './components/Join';
import { ForgotPassword } from './components/ForgotPassword';

const MainApp = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/clients" replace /> : <LoginCard />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/clients" replace /> : <ForgotPassword />} />
      <Route path="/join/:token" element={<Join />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/clients" replace />} />
        <Route path="clients" element={<ClientList />} />
        <Route path="clients/:id" element={<ClientDetails />} />
        <Route path="jobs" element={<JobList />} />
        <Route path="jobs/:id" element={<JobDetails />} />
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
