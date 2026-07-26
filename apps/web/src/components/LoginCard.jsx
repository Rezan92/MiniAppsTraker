import React from 'react';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../contexts/AuthContext';

export const LoginCard = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#f5f5f5">
      <Card elevation={3} sx={{ maxWidth: 400, width: '100%', p: 2, borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="primary">
            Welcome
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Sign in to access your Handyman SaaS dashboard.
          </Typography>
          
          <Button 
            variant="contained" 
            color="primary" 
            size="large" 
            fullWidth 
            startIcon={<GoogleIcon />}
            onClick={signInWithGoogle}
            sx={{ textTransform: 'none', py: 1.5, fontSize: '1.1rem' }}
          >
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};
