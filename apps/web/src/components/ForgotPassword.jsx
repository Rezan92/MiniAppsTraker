import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Link } from 'react-router-dom';

export const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const { showError } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // NOTE: Actual email delivery is blocked pending Epic 16 (SMTP Integration). 
    // Supabase might still fire its default email if configured, but we are 
    // ensuring the UI simulates a success state here for the user.
    const { error } = await resetPassword(email);
    
    if (error) {
      showError(error.message);
    } else {
      setSuccess(true);
    }
    
    setLoading(false);
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center relative overflow-hidden font-sans antialiased text-on-surface p-4">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-20 pointer-events-none" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCDC784Zr_DabjzbUHfBfQXKGVxcVgU4KL7VZU9haoKQpKkB30Oh1HqVckdIcbEHIvsPxzWiMMMIf5m6F8RsRzbpKkOB1A_I3beRYM2oyPpOn69kPUAE1cQxbRua1b3RrWZgnkmNogP8EAs8VKQU_2XFUrw7sllGFhtgQSUR2t2YLjKpG2JjH2QpqI7Ri3JT0ieArMB2lbpieuP8qfZKaFRA_3tH2-CMvNjQ9N5ulTCzigmFdghrTQqAQ')" }}
      ></div>
      
      <main className="w-full max-w-[28rem] z-10 relative">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-level-3">
          
          <div className="flex flex-col items-center mb-lg">
            <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-sm border border-primary/20">
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>lock_reset</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-2">Reset Password</h1>
            <p className="font-body-md text-body-md text-on-surface-variant text-center">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="mb-6 p-4 bg-primary/10 border border-primary/20 text-on-surface rounded-lg">
                <span className="material-symbols-outlined text-primary mb-2" style={{ fontSize: '32px' }}>mark_email_read</span>
                <p className="font-body-md">Check your email for a password reset link.</p>
              </div>
              <Link to="/login" className="text-primary hover:underline font-title-md">
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-lg">
                <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="email">Email address</label>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email" 
                  placeholder="Enter your email" 
                  required 
                  className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px]" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading || !email}
                className="w-full bg-primary text-on-primary font-title-md text-title-md py-3 px-4 rounded-DEFAULT hover:bg-primary-container transition-colors min-h-[44px] flex items-center justify-center disabled:opacity-50 mb-4"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center mt-4">
                <Link to="/login" className="text-on-surface-variant hover:text-on-surface font-body-sm flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                  Back to Login
                </Link>
              </div>
            </form>
          )}

        </div>
      </main>
    </div>
  );
};
