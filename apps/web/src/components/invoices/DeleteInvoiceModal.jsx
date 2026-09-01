import React from 'react';
import { ConfirmModal } from '../common/ConfirmModal';

export const DeleteInvoiceModal = ({ isOpen, onClose, onConfirm, invoiceNumber, loading }) => {
  return (
    <ConfirmModal 
      open={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Invoice?"
      message={`Are you sure you want to delete invoice #${invoiceNumber}? This action cannot be undone and all associated data will be permanently deleted.`}
      confirmText={loading ? 'Deleting...' : 'Delete Permanently'}
      confirmColor="red"
    />
  );
};
