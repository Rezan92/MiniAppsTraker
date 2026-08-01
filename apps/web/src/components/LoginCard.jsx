import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const LoginCard = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [view, setView] = useState('choice'); // 'choice', 'login', 'signup', 'employee'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (view === 'signup') {
      const { error: signUpError } = await signUpWithEmail(email, password, {
        first_name: firstName,
        last_name: lastName,
        phone: phone
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        // Success: usually triggers auth state change, but if email confirm is on, inform user.
        // Assuming auto-confirm for now or Supabase handles UI toast if needed.
      }
    } else {
      const { error: signInError } = await signInWithEmail(email, password);
      if (signInError) {
        setError(signInError.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center relative overflow-hidden font-sans antialiased text-on-surface">
      {/* Subtle Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-20 pointer-events-none" 
        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCDC784Zr_DabjzbUHfBfQXKGVxcVgU4KL7VZU9haoKQpKkB30Oh1HqVckdIcbEHIvsPxzWiMMMIf5m6F8RsRzbpKkOB1A_I3beRYM2oyPpOn69kPUAE1cQxbRua1b3RrWZgnkmNogP8EAs8VKQU_2XFUrw7sllGFhtgQSUR2t2YLjKpG2JjH2QpqI7Ri3JT0ieArMB2lbpieuP8qfZKaFRA_3tH2-CMvNjQ9N5ulTCzigmFdghrTQqAQ')" }}
      ></div>
      
      {/* Main Content Container */}
      <main className="w-full max-w-[28rem] px-md z-10 relative">
        {/* Login Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-level-3">
          
          {/* Brand / Logo */}
          <div className="flex flex-col items-center mb-lg">
            <div className="h-12 w-12 bg-primary text-on-primary rounded-DEFAULT flex items-center justify-center mb-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>handyman</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-primary tracking-tight">ProFix Handyman</h1>
          </div>

          {/* Header */}
          <div className="text-center mb-lg">
            <h2 className="font-title-md text-title-md text-on-surface mb-xs">
              {view === 'choice' ? 'Welcome to ProFix' : view === 'employee' ? 'Employee Access' : view === 'signup' ? 'Create an Account' : 'Welcome back'}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {view === 'choice' ? 'How would you like to continue?' : view === 'employee' ? 'Join your team workspace' : view === 'signup' ? 'Sign up to get started' : 'Sign in to your account to continue'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-container text-on-error-container text-body-md rounded-DEFAULT">
              {error}
            </div>
          )}

          {view === 'choice' && (
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setView('login')}
                className="w-full bg-primary text-on-primary font-title-md text-title-md py-4 px-4 rounded-DEFAULT hover:bg-primary-container transition-colors shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">storefront</span>
                  <span>I am a Business Owner</span>
                </div>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              
              <button 
                onClick={() => setView('employee')}
                className="w-full bg-surface-container-low text-on-surface font-title-md text-title-md py-4 px-4 rounded-DEFAULT border border-outline-variant hover:bg-surface-container transition-colors shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">badge</span>
                  <span>I am an Employee</span>
                </div>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          )}

          {view === 'employee' && (
            <div className="flex flex-col text-center">
              <div className="bg-primary/10 p-4 rounded-lg mb-6 border border-primary/20">
                <span className="material-symbols-outlined text-primary mb-2" style={{ fontSize: '32px' }}>mark_email_unread</span>
                <p className="text-on-surface font-body-md leading-relaxed">
                  Employees must join their company's workspace using a secure invite link.
                  <br/><br/>
                  <strong>Please check your email inbox for an invitation from your manager.</strong>
                </p>
              </div>
              <button 
                onClick={() => setView('login')}
                className="text-primary hover:underline font-body-md"
              >
                I already have an account and want to log in
              </button>
              <button 
                onClick={() => setView('choice')}
                className="mt-6 text-on-surface-variant hover:text-on-surface font-body-sm flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                Back
              </button>
            </div>
          )}

          {(view === 'login' || view === 'signup') && (
            <>
              {/* Sign in with Google (Prominent) */}
          <button 
            type="button"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-sm py-3 px-4 mb-md border border-outline-variant rounded-DEFAULT bg-surface-container-lowest hover:bg-surface-container-low transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {/* SVG Google Icon */}
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            <span className="font-title-md text-body-lg text-on-surface">Sign in with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center py-sm mb-md">
            <div className="flex-grow border-t border-outline-variant"></div>
            <span className="flex-shrink-0 mx-sm text-on-surface-variant font-label-md text-label-md uppercase">Or continue with</span>
            <div className="flex-grow border-t border-outline-variant"></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit}>
            {view === 'signup' && (
              <>
                <div className="flex gap-4 mb-4">
                  <div className="w-1/2">
                    <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="firstName">First Name *</label>
                    <input 
                      id="firstName" 
                      name="firstName" 
                      type="text" 
                      required 
                      className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px]" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="lastName">Last Name *</label>
                    <input 
                      id="lastName" 
                      name="lastName" 
                      type="text" 
                      required 
                      className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px]" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="phone">Phone Number (Optional)</label>
                  <input 
                    id="phone" 
                    name="phone" 
                    type="tel" 
                    className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px]" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="mb-sm">
              <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="email">Email address *</label>
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
            
            <div className="mb-lg">
              <label className="block font-label-md text-label-md text-on-surface mb-xs" htmlFor="password">Password</label>
              <input 
                id="password" 
                name="password" 
                type="password" 
                autoComplete="current-password" 
                placeholder="Enter your password" 
                required 
                className="w-full px-4 py-3 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest font-body-md text-on-surface focus:outline-none focus:ring-0 focus:border-primary focus:border-[2px] transition-all min-h-[44px]" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {view === 'login' && (
                <div className="flex justify-end mt-2">
                  <a className="font-body-md text-body-md text-primary hover:underline hover:text-primary-container transition-colors" href="/forgot-password">Forgot password?</a>
                </div>
              )}
            </div>
            
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-on-primary font-title-md text-title-md py-3 px-4 rounded-DEFAULT hover:bg-primary-container transition-colors min-h-[44px] flex items-center justify-center disabled:opacity-50 mb-4"
              >
                {loading ? (view === 'signup' ? 'Signing Up...' : 'Signing In...') : (view === 'signup' ? 'Sign Up' : 'Sign In')}
              </button>

              <button 
                type="button"
                onClick={() => setView('choice')}
                className="w-full text-on-surface-variant hover:text-on-surface font-body-sm flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                Back to choices
              </button>
            </form>
            </>
          )}
        </div>

        {/* Footer Links */}
        {(view === 'login' || view === 'signup') && (
          <div className="mt-lg text-center">
            {view === 'login' ? (
              <p className="font-body-md text-body-md text-on-surface-variant">
                Don't have an account? <button onClick={() => setView('signup')} className="font-title-md text-primary hover:underline">Sign up</button>
              </p>
            ) : (
              <p className="font-body-md text-body-md text-on-surface-variant">
                Already have an account? <button onClick={() => setView('login')} className="font-title-md text-primary hover:underline">Log in</button>
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
