import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginCard } from './components/LoginCard';
import { ClientList } from './components/clients/ClientList';
import { JobList } from './components/jobs/JobList';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState(0);
  
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-on-primary py-4 px-6 flex justify-between items-center shadow">
        <h1 className="font-headline-md text-title-md font-bold tracking-tight">Handyman CRM</h1>
        <div className="flex items-center gap-4">
          <span className="font-body-md opacity-90">{user?.email}</span>
          <button 
            onClick={signOut}
            className="text-on-primary hover:text-primary-fixed-dim transition-colors font-label-md uppercase tracking-wider px-3 py-1 border border-on-primary/30 rounded"
          >
            Sign Out
          </button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-6 mt-4">
        <div className="flex gap-4 border-b border-outline-variant mb-6">
          <button 
            onClick={() => setTab(0)} 
            className={`pb-2 px-4 font-title-md transition-colors ${tab === 0 ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Clients
          </button>
          <button 
            onClick={() => setTab(1)} 
            className={`pb-2 px-4 font-title-md transition-colors ${tab === 1 ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Jobs
          </button>
        </div>
        
        {tab === 0 && <ClientList />}
        {tab === 1 && <JobList />}
      </main>
    </div>
  );
};

const MainApp = () => {
  const { user } = useAuth();
  return user ? <Dashboard /> : <LoginCard />;
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
