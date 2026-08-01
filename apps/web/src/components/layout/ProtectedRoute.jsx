import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { session, userData } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but has no tenant_id, they must onboard
  // (unless they are already on the onboarding or join page)
  if (userData && !userData.tenant_id && location.pathname !== '/onboarding' && !location.pathname.startsWith('/join/')) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};
