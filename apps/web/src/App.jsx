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

const AuthenticatedApp = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/clients" replace />} />
        <Route path="/clients" element={<ClientList />} />
        <Route path="/clients/:id" element={<ClientDetails />} />
        <Route path="/jobs" element={<JobList />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="*" element={<Navigate to="/clients" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

const MainApp = () => {
  const { user } = useAuth();
  return user ? <AuthenticatedApp /> : <LoginCard />;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <MainApp />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
