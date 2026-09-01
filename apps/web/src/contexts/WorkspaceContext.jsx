import React, { createContext, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { apiClient } from '../lib/apiClient';

const WorkspaceContext = createContext(null);

export const WORKSPACE_QUERY_KEYS = {
  list: ['workspaces'],
  detail: (id) => ['workspace', id]
};

export const WorkspaceProvider = ({ children }) => {
  const { session, userData, refreshUserData } = useAuth();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const [isSwitching, setIsSwitching] = useState(false);

  // Fetch workspaces via TanStack Query
  const { data: workspaces = [], isLoading: isLoadingWorkspaces, refetch: refetchWorkspaces } = useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.list,
    queryFn: () => apiClient.get('/api/auth/workspaces'),
    enabled: !!session?.access_token
  });

  const activeTenantId = userData?.tenant_id;
  const currentWorkspace = workspaces.find(w => w.tenant_id === activeTenantId) || null;

  // In-Memory Fast Workspace Switcher
  const switchWorkspace = async (targetTenantId) => {
    if (!targetTenantId || targetTenantId === activeTenantId) return;
    setIsSwitching(true);

    try {
      await apiClient.post('/api/auth/switch-workspace', { target_tenant_id: targetTenantId });
      
      // 1. Update Auth Context in memory
      await refreshUserData();

      // 2. Refetch workspaces query
      await refetchWorkspaces();

      // 3. Clear and reset all domain queries without page reload
      queryClient.removeQueries({ queryKey: ['clients'] });
      queryClient.removeQueries({ queryKey: ['jobs'] });
      queryClient.removeQueries({ queryKey: ['invoices'] });
      queryClient.removeQueries({ queryKey: ['properties'] });
      queryClient.removeQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries();

      const target = workspaces.find(w => w.tenant_id === targetTenantId);
      showSuccess(`Switched to ${target?.name || 'workspace'}`);
    } catch (err) {
      showError(err.message || 'Failed to switch workspace');
    } finally {
      setIsSwitching(false);
    }
  };

  // In-Memory Workspace Creation
  const createWorkspace = async (formData) => {
    try {
      const res = await apiClient.post('/api/auth/onboarding', formData);
      
      await refreshUserData();
      await refetchWorkspaces();

      queryClient.removeQueries({ queryKey: ['clients'] });
      queryClient.removeQueries({ queryKey: ['jobs'] });
      queryClient.removeQueries({ queryKey: ['invoices'] });
      queryClient.removeQueries({ queryKey: ['properties'] });
      queryClient.removeQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries();

      showSuccess(`Workspace "${formData.name}" created successfully!`);
      return res;
    } catch (err) {
      showError(err.message || 'Failed to create workspace');
      throw err;
    }
  };

  // In-Memory Workspace Deletion
  const deleteWorkspace = async (tenantId) => {
    try {
      await apiClient.delete(`/api/auth/workspaces/${tenantId}`);
      await refreshUserData();
      await refetchWorkspaces();

      queryClient.removeQueries({ queryKey: ['clients'] });
      queryClient.removeQueries({ queryKey: ['jobs'] });
      queryClient.removeQueries({ queryKey: ['invoices'] });
      queryClient.removeQueries({ queryKey: ['properties'] });
      queryClient.removeQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries();

      showSuccess('Workspace deleted successfully.');
    } catch (err) {
      showError(err.message || 'Failed to delete workspace');
      throw err;
    }
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      currentWorkspace,
      activeTenantId,
      isLoadingWorkspaces,
      isSwitching,
      switchWorkspace,
      createWorkspace,
      deleteWorkspace,
      refetchWorkspaces
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
