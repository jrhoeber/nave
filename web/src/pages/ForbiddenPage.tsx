import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <div className="min-h-screen dark-gradient flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-white/30 text-sm font-medium tracking-wider uppercase mb-3">403</p>
        <h1 className="font-serif text-3xl font-semibold text-white mb-3">Access Denied</h1>
        <p className="text-white/45 text-sm leading-relaxed mb-8">
          You don't have permission to access this page.
        </p>
        <Link
          to="/manage"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-nave-accent/15 text-nave-accent text-sm font-medium hover:bg-nave-accent/25 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Go to My Account
        </Link>
      </div>
    </div>
  );
}
