import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginCard } from './components/LoginCard';
import { Box, Typography, Button, CssBaseline } from '@mui/material';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  
  return (
    <Box p={4} textAlign="center">
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      <Typography variant="body1" gutterBottom>Logged in as: {user?.email}</Typography>
      <Button variant="outlined" color="error" onClick={signOut} sx={{ mt: 2 }}>
        Sign Out
      </Button>
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
