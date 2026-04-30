import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API_BASE, JWT_KEY } from '../context/AuthContext';
import { AdminNav } from '../components/AdminNav';

export function AdminPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm1' | 'confirm2' | 'deleting'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen dark-gradient flex flex-col">
      <AdminNav />

      {/* Main content */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif text-3xl font-semibold text-white mb-8">Admin Console</h1>

          {/* Tool tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              to="/admin/moderation"
              className="group border border-white/10 rounded-xl p-5 bg-white/5 hover:bg-white/8 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-white/40 transition-colors mt-0.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              <h2 className="text-white font-medium mb-1">Moderation Queue</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Review flagged posts and messages. Approve or reject content held by the automated moderation system.
              </p>
            </Link>

            <Link
              to="/admin/parishes"
              className="group border border-white/10 rounded-xl p-5 bg-white/5 hover:bg-white/8 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-nave-accent/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-nave-accent">
                    <path d="M3 21h18" />
                    <path d="M5 21V7l7-4 7 4v14" />
                    <path d="M9 21v-4h6v4" />
                    <path d="M10 10h4" />
                  </svg>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-white/40 transition-colors mt-0.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              <h2 className="text-white font-medium mb-1">Manage Parishes</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Add, edit, or delete parishes. Assign and manage parish administrators.
              </p>
            </Link>
          </div>
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
