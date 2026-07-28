import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoginCard } from './components/LoginCard';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ClientList } from './components/clients/ClientList';
import { JobList } from './components/jobs/JobList';

const AuthenticatedApp = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/clients" replace />} />
        <Route path="/clients" element={<ClientList />} />
        <Route path="/jobs" element={<JobList />} />
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
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
