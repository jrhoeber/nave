import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API_BASE, JWT_KEY } from '../context/AuthContext';

export function AdminPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm1' | 'confirm2' | 'deleting'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (deleteStep === 'idle') {
      setDeleteStep('confirm1');
      setDeleteError(null);
    } else if (deleteStep === 'confirm1') {
      setDeleteStep('confirm2');
    } else if (deleteStep === 'confirm2') {
      setDeleteStep('deleting');
      setDeleteError(null);
      try {
        const token = localStorage.getItem(JWT_KEY);
        const res = await fetch(`${API_BASE}/users/me`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Request failed');
        await signOut();
        navigate('/');
      } catch {
        setDeleteStep('confirm2');
        setDeleteError('Failed to delete account. Please try again.');
      }
    }
  };

  const displayName = user?.displayName ?? user?.email ?? 'Admin';

  return (
    <div className="min-h-screen dark-gradient flex flex-col">

      {/* Admin navbar */}
      <nav className="border-b border-white/10 px-6 py-4 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="font-serif text-xl font-semibold text-white hover:text-nave-accent-light transition-colors duration-200"
          >
            Nave
          </Link>

          <div className="flex items-center gap-5">
            <span className="text-white/50 text-sm hidden sm:block">{displayName}</span>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-sm text-nave-accent hover:text-nave-accent-light transition-colors font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">

        {/* Coming soon badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-nave-accent/30 bg-nave-accent/10 mb-10">
          <div className="w-2 h-2 rounded-full bg-nave-accent animate-pulse-slow" />
          <span className="text-nave-accent text-xs font-medium tracking-[0.25em] uppercase">
            Coming Soon
          </span>
        </div>

        <h1 className="font-serif text-5xl md:text-6xl font-semibold text-white mb-5 leading-tight">
          Admin Console
        </h1>

        <p className="text-white/55 text-lg max-w-md leading-relaxed">
          We're building something powerful. Check back soon.
        </p>

        {/* Decorative */}
        <div
          className="mt-16 text-nave-accent/15 font-serif select-none"
          style={{ fontSize: '7rem', lineHeight: 1 }}
          aria-hidden
        >
          ✝
        </div>
      </main>

      {/* Account section */}
      <section className="px-6 pb-12 flex flex-col items-center">
        <div className="w-full max-w-md border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-medium mb-1">Delete Account</h2>
          <p className="text-white/45 text-sm mb-5 leading-relaxed">
            Permanently delete your account and all associated data — posts, messages, prayer groups, and friends. This cannot be undone.
          </p>

          {deleteStep === 'idle' && (
            <button
              onClick={handleDeleteAccount}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
            >
              Delete My Account
            </button>
          )}

          {deleteStep === 'confirm1' && (
            <div className="space-y-3">
              <p className="text-amber-400/80 text-sm">
                Are you sure? This will permanently remove all your data and cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteStep('idle')}
                  className="px-4 py-2 rounded-lg border border-white/15 text-white/60 text-sm hover:text-white/80 hover:border-white/25 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
                >
                  Yes, Continue
                </button>
              </div>
            </div>
          )}

          {deleteStep === 'confirm2' && (
            <div className="space-y-3">
              <p className="text-red-400/90 text-sm font-medium">
                Final confirmation — your account, posts, and messages will be deleted forever.
              </p>
              {deleteError && (
                <p className="text-red-400 text-sm">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteStep('idle')}
                  className="px-4 py-2 rounded-lg border border-white/15 text-white/60 text-sm hover:text-white/80 hover:border-white/25 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium transition-colors"
                >
                  Yes, Delete Forever
                </button>
              </div>
            </div>
          )}

          {deleteStep === 'deleting' && (
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Deleting account…
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-white/5 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-6 text-xs text-white/25">
          <Link to="/privacy" className="hover:text-nave-accent/60 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-nave-accent/60 transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
