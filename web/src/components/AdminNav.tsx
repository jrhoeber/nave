import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.displayName ?? user?.email ?? 'Admin';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="border-b border-white/10 px-6 py-4 shrink-0">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="font-serif text-xl font-semibold text-white hover:text-nave-accent-light transition-colors duration-200"
          >
            Nave
          </Link>
          <span className="text-white/20">/</span>
          <Link
            to="/admin"
            className="text-white/50 text-sm hover:text-white/70 transition-colors"
          >
            Admin
          </Link>
        </div>

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
  );
}
