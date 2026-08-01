import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const Onboarding = () => {
  const { session, userData, refreshUserData, signOut } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);

  // If they already have a tenant, redirect to dashboard
  if (userData?.tenant_id) {
    navigate('/', { replace: true });
    return null;
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete onboarding');
      }

      addToast('success', 'Workspace Created', 'Your business profile has been successfully set up.');
      await refreshUserData();
      navigate('/');
    } catch (err) {
      addToast('error', 'Onboarding Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center relative overflow-hidden font-sans antialiased text-on-surface">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-20 pointer-events-none" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCDC784Zr_DabjzbUHfBfQXKGVxcVgU4KL7VZU9haoKQpKkB30Oh1HqVckdIcbEHIvsPxzWiMMMIf5m6F8RsRzbpKkOB1A_I3beRYM2oyPpOn69kPUAE1cQxbRua1b3RrWZgnkmNogP8EAs8VKQU_2XFUrw7sllGFhtgQSUR2t2YLjKpG2JjH2QpqI7Ri3JT0ieArMB2lbpieuP8qfZKaFRA_3tH2-CMvNjQ9N5ulTCzigmFdghrTQqAQ')" }}
      ></div>
      
      <main className="w-full max-w-[32rem] px-md z-10 relative">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-level-3">
          <div className="mb-lg">
            <h1 className="font-headline-md text-headline-md text-primary tracking-tight mb-2">Create Workspace</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Set up your business profile to get started.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="name">Business Name *</label>
              <input 
                id="name" 
                name="name" 
                type="text" 
                required 
                placeholder="e.g. ProFix Handyman LLC"
                className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px]"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="phone">Business Phone</label>
              <input 
                id="phone" 
                name="phone" 
                type="tel" 
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px]"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="mb-6">
              <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="address">Business Address</label>
              <input 
                id="address" 
                name="address" 
                type="text" 
                placeholder="123 Main St, City, ST"
                className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px]"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !formData.name}
              className="w-full bg-primary text-on-primary font-title-md text-title-md py-3 px-4 rounded-DEFAULT hover:bg-primary-container transition-colors min-h-[44px] flex items-center justify-center disabled:opacity-50 mt-4"
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </form>

          {/* Escape Hatch for Employees */}
          <div className="mt-8 pt-6 border-t border-outline-variant">
            <div className="bg-surface-container p-4 rounded-lg text-center">
              <h3 className="font-title-sm text-on-surface mb-2">Are you an employee?</h3>
              <p className="font-body-sm text-on-surface-variant mb-4">
                Please log out and click the invitation link sent to your email by your manager.
              </p>
              <button 
                type="button"
                onClick={async () => {
                  await signOut();
                  window.location.href = '/login';
                }}
                className="w-full text-on-surface border border-outline-variant hover:bg-surface-container-high transition-colors font-title-sm py-2 px-4 rounded-DEFAULT flex items-center justify-center gap-2"
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
