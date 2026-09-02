import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { FormField } from './common/FormField';
import { apiClient } from '../lib/apiClient';
import { onboardingSchema } from '../schemas/onboardingSchema';
import { translateApiError } from '../utils/errorTranslator';

export const Onboarding = () => {
  const { userData, refreshUserData, signOut } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  const pendingInvites = userData?.pending_invitations || [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      phone: '',
      address: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      await apiClient.post('/api/auth/onboarding', data);
      showSuccess('Your business profile has been successfully set up.');
      await refreshUserData();
      navigate('/');
    } catch (err) {
      showError(translateApiError(err));
    }
  };

  const handleAcceptInvite = async (token, tenantName) => {
    setAcceptingInvite(true);
    try {
      await apiClient.post(`/api/invitations/${token}/accept`);
      showSuccess(`Successfully joined ${tenantName}!`);
      await refreshUserData();
      navigate('/');
    } catch (err) {
      showError(translateApiError(err));
    } finally {
      setAcceptingInvite(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center relative overflow-hidden font-sans antialiased text-on-surface p-4">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-20 pointer-events-none" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCDC784Zr_DabjzbUHfBfQXKGVxcVgU4KL7VZU9haoKQpKkB30Oh1HqVckdIcbEHIvsPxzWiMMMIf5m6F8RsRzbpKkOB1A_I3beRYM2oyPpOn69kPUAE1cQxbRua1b3RrWZgnkmNogP8EAs8VKQU_2XFUrw7sllGFhtgQSUR2t2YLjKpG2JjH2QpqI7Ri3JT0ieArMB2lbpieuP8qfZKaFRA_3tH2-CMvNjQ9N5ulTCzigmFdghrTQqAQ')" }}
      ></div>
      
      <main className="w-full max-w-[32rem] z-10 relative">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-level-3">
          
          {/* Pending Invitations Banner */}
          {pendingInvites.length > 0 && (
            <div className="mb-8 p-5 bg-primary/10 border-2 border-primary rounded-xl shadow-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="flex items-start gap-3 mb-3">
                <span className="material-symbols-outlined text-primary text-[28px]">mark_email_unread</span>
                <div>
                  <h3 className="font-title-md text-on-surface font-bold">Workspace Invitation Found!</h3>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">
                    You have been invited to join <strong>{pendingInvites[0].tenant_name}</strong> as an {pendingInvites[0].role}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleAcceptInvite(pendingInvites[0].token, pendingInvites[0].tenant_name)}
                disabled={acceptingInvite}
                className="w-full bg-primary text-black font-body-md font-bold py-2.5 px-4 rounded-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {acceptingInvite ? (
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">login</span>
                )}
                <span>{acceptingInvite ? 'Joining...' : `Accept & Join ${pendingInvites[0].tenant_name}`}</span>
              </button>
            </div>
          )}

          <div className="mb-6">
            <h1 className="font-headline-md text-headline-md text-primary tracking-tight mb-2">
              {pendingInvites.length > 0 ? 'Or Create Your Own Workspace' : 'Create Workspace'}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {pendingInvites.length > 0 
                ? 'If you run your own independent business, you can create a new workspace below.' 
                : 'Set up your business profile to get started.'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Business Name" required error={errors.name}>
              <input 
                id="name" 
                type="text" 
                placeholder="e.g. ProFix Handyman LLC"
                {...register('name')}
                className={`w-full px-4 py-3 border rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px] ${
                  errors.name ? 'border-red-500' : 'border-outline-variant'
                }`}
              />
            </FormField>
            
            <FormField label="Business Phone" error={errors.phone}>
              <input 
                id="phone" 
                type="tel" 
                placeholder="(555) 123-4567"
                {...register('phone')}
                className={`w-full px-4 py-3 border rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px] ${
                  errors.phone ? 'border-red-500' : 'border-outline-variant'
                }`}
              />
            </FormField>

            <FormField label="Business Address" error={errors.address} className="mb-6">
              <input 
                id="address" 
                type="text" 
                placeholder="123 Main St, City, ST"
                {...register('address')}
                className={`w-full px-4 py-3 border rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px] ${
                  errors.address ? 'border-red-500' : 'border-outline-variant'
                }`}
              />
            </FormField>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-primary text-on-primary font-title-md text-title-md py-3 px-4 rounded-DEFAULT hover:bg-primary-container transition-colors min-h-[44px] flex items-center justify-center disabled:opacity-50 mt-4 cursor-pointer gap-2"
            >
              {isSubmitting && (
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
              )}
              <span>{isSubmitting ? 'Creating...' : 'Create Workspace'}</span>
            </button>
          </form>

          {/* Escape Hatch for Employees */}
          <div className="mt-8 pt-6 border-t border-outline-variant">
            <div className="bg-surface-container p-4 rounded-lg text-center">
              <h3 className="font-title-sm text-on-surface mb-2">Need to switch accounts?</h3>
              <p className="font-body-sm text-on-surface-variant mb-4">
                If you were invited under a different email, sign out and use the invited email address.
              </p>
              <button 
                type="button"
                onClick={async () => {
                  await signOut();
                  window.location.href = '/login';
                }}
                className="w-full text-on-surface border border-outline-variant hover:bg-surface-container-high transition-colors font-title-sm py-2 px-4 rounded-DEFAULT flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
                Log Out
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
