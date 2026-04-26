import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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
