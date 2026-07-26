import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginCard } from './components/LoginCard';
import { ClientList } from './components/clients/ClientList';
import { JobList } from './components/jobs/JobList';
import { Box, Typography, Button, CssBaseline, AppBar, Toolbar, Tabs, Tab } from '@mui/material';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState(0);
  
  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Handyman CRM</Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>{user?.email}</Typography>
          <Button color="inherit" onClick={signOut}>Sign Out</Button>
        </Toolbar>
      </AppBar>
      <Box p={4} maxWidth="1200px" mx="auto">
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 4 }}>
          <Tab label="Clients" />
          <Tab label="Jobs" />
        </Tabs>
        
        {tab === 0 && <ClientList />}
        {tab === 1 && <JobList />}
      </Box>
    </Box>
  );
};

const MainApp = () => {
  const { user } = useAuth();
  
  return (
    <>
      <CssBaseline />
      {user ? <Dashboard /> : <LoginCard />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
