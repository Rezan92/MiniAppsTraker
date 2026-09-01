import React from 'react';
import { useCreateClient } from '../../hooks/api/useClients';
import { AddClientModal } from '../clients/AddClientModal';

export const CreateClientModal = ({ open, onClose }) => {
  const createClientMutation = useCreateClient();

  const handleSubmit = (data) => {
    createClientMutation.mutate(data, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <AddClientModal
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      editMode={false}
    />
  );
};
