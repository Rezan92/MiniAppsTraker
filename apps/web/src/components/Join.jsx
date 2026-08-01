import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export const Join = () => {
  const { token } = useParams();
  const { session, user, refreshUserData, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invitations/${token}`);
        const json = await res.json();
        
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Invalid invitation link');
        }
        
        setInviteData(json.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to accept invitation');
      }

      await refreshUserData();
      // Hard redirect to clear any previous tenant cache
      window.location.href = '/?toast=joined_workspace'; 
    } catch (err) {
      showError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '32px' }}>progress_activity</span>
          <p className="font-body-md">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-4">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-level-3 max-w-[28rem] w-full text-center">
          <div className="w-16 h-16 bg-error-container text-on-error-container rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>error</span>
          </div>
          <h2 className="font-title-lg text-error mb-2">Invalid Invitation</h2>
          <p className="font-body-md text-on-surface-variant mb-6">{error}</p>
          <button onClick={() => navigate('/login')} className="bg-primary text-on-primary py-2 px-6 rounded font-title-md">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const isEmailMismatch = session && user?.email !== inviteData.email;

  return (
    <div className="bg-background min-h-screen flex items-center justify-center relative overflow-hidden font-sans antialiased text-on-surface p-4">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-20 pointer-events-none" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCDC784Zr_DabjzbUHfBfQXKGVxcVgU4KL7VZU9haoKQpKkB30Oh1HqVckdIcbEHIvsPxzWiMMMIf5m6F8RsRzbpKkOB1A_I3beRYM2oyPpOn69kPUAE1cQxbRua1b3RrWZgnkmNogP8EAs8VKQU_2XFUrw7sllGFhtgQSUR2t2YLjKpG2JjH2QpqI7Ri3JT0ieArMB2lbpieuP8qfZKaFRA_3tH2-CMvNjQ9N5ulTCzigmFdghrTQqAQ')" }}
      ></div>
      
      <main className="w-full max-w-[28rem] z-10 relative">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-level-3">
          
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 border border-primary/20">
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>handshake</span>
            </div>
            <h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight mb-2">
              You've been invited!
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              You are invited to join <strong>{inviteData.tenant_name}</strong> as an {inviteData.role}.
            </p>
          </div>

          <div className="bg-surface-container p-4 rounded-lg mb-6 flex flex-col items-center">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Invited Email</span>
            <span className="font-title-md text-on-surface font-bold">{inviteData.email}</span>
          </div>

          {!session ? (
            <div className="text-center">
              <p className="font-body-md mb-4 text-on-surface-variant">Please sign in with this email to accept.</p>
              <button 
                type="button"
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-sm py-3 px-4 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                <span className="font-title-md text-on-surface">Sign in with Google</span>
              </button>
            </div>
          ) : isEmailMismatch ? (
            <div className="text-center">
              <div className="mb-4 p-3 bg-error-container/50 text-on-error-container text-body-md rounded-DEFAULT border border-error/20">
                You are currently signed in as <strong>{user.email}</strong>, which does not match the invitation email.
              </div>
              <button 
                type="button"
                onClick={async () => { await signOut(); window.location.reload(); }}
                className="w-full text-primary hover:underline font-title-md py-2"
              >
                Sign out to switch accounts
              </button>
            </div>
          ) : (
            <button 
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-primary text-on-primary font-title-md text-title-md py-3 px-4 rounded-DEFAULT hover:bg-primary-container transition-colors min-h-[44px] flex items-center justify-center disabled:opacity-50"
            >
              {accepting ? 'Joining...' : 'Accept Invitation'}
            </button>
          )}

        </div>
      </main>
    </div>
  );
};
