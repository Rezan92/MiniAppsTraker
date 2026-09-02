import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BaseModal } from '../common/BaseModal';
import { FormField } from '../common/FormField';
import { inviteSchema } from '../../schemas/inviteSchema';
import { useSendInvitation } from '../../hooks/api/useTeam';
import { useToast } from '../../contexts/ToastContext';

export const InviteMemberModal = ({ isOpen, onClose }) => {
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copied, setCopied] = useState(false);
  const { showSuccess } = useToast();
  const sendInviteMutation = useSendInvitation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(inviteSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      role: 'employee'
    }
  });

  const handleClose = () => {
    reset();
    setCreatedInvite(null);
    setCopied(false);
    onClose();
  };

  const onSubmit = async (data) => {
    sendInviteMutation.mutate(data, {
      onSuccess: (response) => {
        setCreatedInvite(response);
      }
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showSuccess('Invitation link copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const footer = !createdInvite ? (
    <>
      <button 
        type="button" 
        onClick={handleClose}
        disabled={isSubmitting || sendInviteMutation.isPending}
        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-body-md font-bold rounded-lg cursor-pointer hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        Cancel
      </button>
      <button 
        type="submit" 
        form="invite-member-form"
        disabled={isSubmitting || sendInviteMutation.isPending}
        className="px-5 py-2 bg-primary text-black font-body-md font-bold rounded-lg cursor-pointer hover:bg-opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        {(isSubmitting || sendInviteMutation.isPending) && (
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
        )}
        <span>{isSubmitting || sendInviteMutation.isPending ? 'Sending...' : 'Send Invitation'}</span>
      </button>
    </>
  ) : (
    <button 
      type="button" 
      onClick={handleClose}
      className="px-5 py-2 bg-inverse-surface text-white font-body-md font-bold rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
    >
      Done
    </button>
  );

  return (
    <BaseModal
      open={isOpen}
      onClose={handleClose}
      size="md"
      title={createdInvite ? "Invitation Created" : "Invite Team Member"}
      subtitle={createdInvite ? "Share this link directly with your teammate" : "Send a secure invitation link to join your workspace"}
      footer={footer}
    >
      {!createdInvite ? (
        <form id="invite-member-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormField label="Email Address" required error={errors.email}>
            <input 
              type="email" 
              placeholder="teammate@company.com"
              {...register('email')}
              className={`w-full px-4 py-2.5 border rounded-lg bg-white font-body-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </FormField>

          <FormField 
            label="Role & Permissions" 
            error={errors.role} 
            helpText="Employees can log jobs, hours, and materials. Admins have full access to workspace settings and billing."
          >
            <select
              {...register('role')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white font-body-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="employee">Employee (Field technician)</option>
              <option value="admin">Administrator (Full workspace management)</option>
            </select>
          </FormField>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 text-green-900">
            <span className="material-symbols-outlined text-green-600 mt-0.5" style={{ fontSize: '20px' }}>check_circle</span>
            <div className="text-sm">
              <p className="font-semibold">Invitation link ready!</p>
              <p className="text-green-800 text-xs mt-0.5">Your teammate can accept this invitation using the link below:</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Join Link</label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={createdInvite.joinUrl || ''} 
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg bg-gray-50 font-mono text-xs text-gray-800 select-all cursor-text focus:outline-none"
              />
              <button 
                type="button"
                onClick={() => copyToClipboard(createdInvite.joinUrl)}
                className="px-4 py-2.5 bg-primary text-black font-body-md font-bold rounded-lg hover:bg-opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
};
