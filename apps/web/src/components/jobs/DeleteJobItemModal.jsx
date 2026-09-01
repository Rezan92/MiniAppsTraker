import React from 'react';
import { ConfirmModal } from '../common/ConfirmModal';

export const DeleteJobItemModal = ({ open, onClose, onConfirm, type }) => {
  return (
    <ConfirmModal 
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${type === 'hour' ? 'Hour' : 'Material'} Entry?`}
      message={`Are you sure you want to delete this ${type === 'hour' ? 'hour' : 'material'} entry? This action is permanent.`}
      confirmText="Delete"
      confirmColor="red"
    />
  );
};
