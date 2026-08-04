import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { AddClientModal } from '../clients/AddClientModal';

export const CreateClientModal = ({ open, onClose }) => {
  const { session } = useAuth();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const initialForm = { client_type: 'residential', name: '', email: '', phone: '', address: '' };
  const [formData, setFormData] = useState(initialForm);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showError("Name is required");
      return;
    }
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg = typeof json.error === 'object' ? (json.error.message || JSON.stringify(json.error)) : (json.error || 'Failed to create client');
        throw new Error(errorMsg);
      }
      
      showSuccess('Client created successfully');
      setFormData(initialForm);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['clients'] });
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
    <AddClientModal
      open={open}
      onClose={handleClose}
      onSubmit={handleSubmit}
      formData={formData}
      setFormData={setFormData}
      editMode={false}
    />
  );
};
