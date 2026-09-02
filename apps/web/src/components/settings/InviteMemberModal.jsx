import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl max-w-lg w-full p-6 shadow-xl overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>person_add</span>
            </div>
            <div>
              <h3 className="font-title-md text-title-md text-on-surface">Invite Team Member</h3>
              <p className="text-xs text-on-surface-variant">Send a secure invitation to join your workspace</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleClose}
            className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {!createdInvite ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email Address" required error={errors.email}>
              <input 
                type="email" 
                placeholder="teammate@company.com"
                {...register('email')}
                className={`w-full px-4 py-3 border rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all ${
                  errors.email ? 'border-red-500' : 'border-outline-variant'
                }`}
              />
            </FormField>

            <FormField label="Role & Permissions" error={errors.role}>
              <select
                {...register('role')}
                className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="employee">Employee (Field technician — logs hours, materials, jobs)</option>
                <option value="admin">Admin (Full access — workspace settings, team, billing)</option>
              </select>
            </FormField>

            <div className="pt-4 border-t border-outline-variant flex justify-end gap-3">
              <button 
                type="button" 
                onClick={handleClose}
                disabled={isSubmitting || sendInviteMutation.isPending}
                className="px-5 py-2.5 border border-outline-variant text-on-surface font-title-sm rounded-DEFAULT hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting || sendInviteMutation.isPending}
                className="px-6 py-2.5 bg-primary text-on-primary font-title-sm rounded-DEFAULT hover:opacity-90 transition-opacity shadow-sm cursor-pointer flex items-center gap-2"
              >
                {(isSubmitting || sendInviteMutation.isPending) && (
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                )}
                <span>{isSubmitting || sendInviteMutation.isPending ? 'Sending...' : 'Send Invitation'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 text-green-900">
              <span className="material-symbols-outlined text-green-600 mt-0.5" style={{ fontSize: '20px' }}>check_circle</span>
              <div className="text-sm">
                <p className="font-semibold">Invitation created successfully!</p>
                <p className="text-green-800 text-xs mt-0.5">Share this link directly with your teammate:</p>
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2">Invitation Link</label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={createdInvite.joinUrl || ''} 
                  className="w-full px-4 py-2.5 border border-outline-variant rounded-DEFAULT bg-surface-container-high font-mono text-xs text-on-surface select-all cursor-text"
                />
                <button 
                  type="button"
                  onClick={() => copyToClipboard(createdInvite.joinUrl)}
                  className="px-4 py-2.5 bg-primary text-on-primary font-title-sm rounded-DEFAULT hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant flex justify-end">
              <button 
                type="button" 
                onClick={handleClose}
                className="px-6 py-2.5 bg-inverse-surface text-white font-title-sm rounded-DEFAULT hover:opacity-90 transition-opacity cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
