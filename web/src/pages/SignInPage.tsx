import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../firebase';
import { useAuth, API_BASE, JWT_KEY } from '../context/AuthContext';

// Google SVG logo
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// Apple SVG logo
function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="shrink-0">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={`w-5 h-5 rounded-full border-2 animate-spin shrink-0 ${
        dark
          ? 'border-nave-primary/20 border-t-nave-primary'
          : 'border-white/20 border-t-white'
      }`}
    />
  );
}

export function SignInPage() {
  const navigate = useNavigate();
  const { setToken, setIsAdmin } = useAuth();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  /** Exchange a Firebase ID token for a Nave app JWT. Returns true if user is admin. */
  const exchangeToken = async (firebaseIdToken: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: firebaseIdToken, source: 'web' }),
    });
    if (!res.ok) {
      await auth.signOut();
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? 'Authentication failed. Please try again.');
    }
    const data = await res.json();
    setToken(data.access_token);
    localStorage.setItem(JWT_KEY, data.access_token);
    setIsAdmin(!!data.is_admin);
    return !!data.is_admin;
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading('google');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const admin = await exchangeToken(idToken);
      navigate(admin ? '/admin' : '/manage');
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      // Ignore user-cancelled popup
      if (
        e.code !== 'auth/popup-closed-by-user' &&
        e.code !== 'auth/cancelled-popup-request'
      ) {
        setError(e.message ?? 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setLoading('apple');
    try {
      // Apple Sign-In requires Services ID in Apple Developer portal +
      // Apple provider configured in Firebase console > Authentication
      const result = await signInWithPopup(auth, appleProvider);
      const idToken = await result.user.getIdToken();
      const admin = await exchangeToken(idToken);
      navigate(admin ? '/admin' : '/manage');
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (
        e.code !== 'auth/popup-closed-by-user' &&
        e.code !== 'auth/cancelled-popup-request'
      ) {
        setError(e.message ?? 'Apple sign-in failed. Please try again.');
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-nave-bg flex flex-col">
      {/* Back link */}
      <div className="p-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-nave-secondary hover:text-nave-primary transition-colors font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </Link>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">

          {/* Wordmark */}
          <div className="text-center mb-8">
            <span className="font-serif text-4xl font-semibold text-nave-primary">Nave</span>
            <div className="mt-2 text-nave-accent/60 text-2xl select-none" aria-hidden>✝</div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-nave-border shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-8 pt-8 pb-6 text-center border-b border-nave-border">
              <h1 className="font-serif text-2xl font-semibold text-nave-primary mb-1">
                Welcome back
              </h1>
              <p className="text-nave-secondary text-sm">
                Sign in to your Nave account
              </p>
            </div>

            {/* Card body */}
            <div className="px-8 py-7 space-y-3">
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Google */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 bg-white border border-nave-border rounded-xl px-5 py-3.5 text-nave-primary font-medium text-sm hover:bg-nave-bg hover:border-nave-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'google' ? <Spinner dark /> : <GoogleLogo />}
                Continue with Google
              </button>

              {/* Apple */}
              <button
                onClick={handleAppleSignIn}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 bg-[#000000] text-white rounded-xl px-5 py-3.5 font-medium text-sm hover:bg-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'apple' ? <Spinner /> : <AppleLogo />}
                Continue with Apple
              </button>
            </div>

            {/* Card footer */}
            <div className="px-8 pb-7 text-center">
              <p className="text-xs text-nave-secondary leading-relaxed">
                By signing in, you agree to our{' '}
                <Link to="/terms" className="text-nave-accent hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-nave-accent hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
