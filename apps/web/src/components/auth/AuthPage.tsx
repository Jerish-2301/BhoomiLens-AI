// Login / Register page — full Email+Password Firebase auth UI
// Toggles between Sign In and Create Account modes.

import { useState, useRef } from 'react';
import { useAuth } from '../../lib/auth';
import { Leaf, Eye, EyeOff, ArrowRight, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

// Google "G" logo SVG
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

type Mode = 'login' | 'register' | 'reset';

export function AuthPage() {
  const { login, register, resetPassword, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function friendlyError(code: string) {
    const map: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Please contact the administrator.',
      'auth/configuration-not-found': 'Firebase Authentication is not configured. Please enable it in the Firebase Console.',
    };
    return map[code] ?? `Error (${code}). Please try again.`;
  }

  async function handleGoogleSignIn() {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const email = emailRef.current?.value.trim() ?? '';
    const password = passwordRef.current?.value ?? '';
    const name = nameRef.current?.value.trim() ?? '';

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        if (!name) { setError('Please enter your full name.'); setLoading(false); return; }
        await register(email, password, name);
      } else {
        await resetPassword(email);
        setSuccess('Password reset email sent! Check your inbox.');
      }
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg mb-4">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">BhoomiLens AI</h1>
          <p className="text-muted-foreground text-sm mt-1">Land Intelligence Platform</p>
        </div>

        {/* Card */}
        <div className="bg-card border rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-heading font-bold text-foreground">
              {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : 'Reset password'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'login' ? 'Sign in to your account to continue' :
               mode === 'register' ? 'Fill in your details to get started' :
               'Enter your email to receive a reset link'}
            </p>
          </div>

          {/* Error / Success alerts */}
          {error && (
            <div className="flex items-start gap-3 p-3 mb-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-3 p-3 mb-4 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Google Sign-In (login & register modes) */}
            {mode !== 'reset' && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-background border-2 border-border hover:border-primary/40 hover:bg-secondary/30 rounded-lg font-medium text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {googleLoading ? (
                  <span className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>
            )}

            {/* Divider */}
            {mode !== 'reset' && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">or continue with email</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            {/* Name (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={nameRef}
                    type="text"
                    placeholder="Ramesh Patel"
                    className="w-full pl-10 pr-4 py-2.5 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={emailRef}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2.5 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}
                    className="text-xs text-primary hover:underline mt-1 float-right"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode toggle */}
          <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }} className="text-primary font-medium hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-primary font-medium hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Government of India — Digital Land Records Initiative
        </p>
      </div>
    </div>
  );
}
