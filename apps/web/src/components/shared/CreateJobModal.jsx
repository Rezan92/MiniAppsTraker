import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AddJobModal } from '../jobs/AddJobModal';

export const CreateJobModal = ({ open, onClose }) => {
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const initialForm = {
    client_id: '',
    property_id: '',
    title: '',
    rate_type: 'flat',
    hourly_rate: '65.00',
    flat_rate: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    notes: ''
  };
  
  const [formData, setFormData] = useState(initialForm);

  // Fetch clients to populate the dropdown
  const { data: clientsData = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/clients`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: open && !!session
  });

  useEffect(() => {
    if (formData.client_id && clientsData.length > 0) {
      const selectedClient = clientsData.find(c => c.id === formData.client_id);
      if (selectedClient?.properties?.length === 1 && !formData.property_id) {
        setFormData(prev => ({ ...prev, property_id: selectedClient.properties[0].id }));
      }
    }
  }, [formData.client_id, clientsData]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showError("Job Title is required");
      return;
    }
    if (!formData.client_id) {
      showError("Please select a client");
      return;
    }
    
    // Clean up numeric fields
    const payload = { ...formData };
    delete payload.description; // Ensure it's not sent if accidentally present
    if (payload.rate_type === 'hourly') {
      payload.hourly_rate = payload.hourly_rate ? parseFloat(payload.hourly_rate) : undefined;
      payload.flat_rate = undefined;
    } else {
      payload.flat_rate = payload.flat_rate ? parseFloat(payload.flat_rate) : undefined;
      payload.hourly_rate = undefined;
    }
    
    if (!payload.property_id) {
      payload.property_id = null;
    }
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg = typeof json.error === 'object' ? (json.error.message || JSON.stringify(json.error)) : (json.error || 'Failed to create job');
        throw new Error(errorMsg);
      }
      
      showSuccess('Job created successfully');
      setFormData(initialForm);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      
      onClose();
    } catch (err) {
      showError(err.message);
    }
  };

  const handleClose = () => {
    setFormData(initialForm);
    onClose();
  };

  return (
    <AddJobModal
      open={open}
      onClose={handleClose}
      onSubmit={handleSubmit}
      formData={formData}
      setFormData={setFormData}
      clients={clientsData}
    />
  );
};
