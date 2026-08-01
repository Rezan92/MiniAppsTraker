import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const AdminRoute = ({ children }) => {
  const { userData } = useAuth();

  if (userData?.role !== 'admin') {
    return <Navigate to="/settings/account" replace />;
  }

  return children;
};
