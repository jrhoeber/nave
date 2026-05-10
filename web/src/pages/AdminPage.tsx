import { Link } from 'react-router-dom';
import { AdminNav } from '../components/AdminNav';

export function AdminPage() {
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
              to="/admin/reports"
              className="group border border-white/10 rounded-xl p-5 bg-white/5 hover:bg-white/8 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-white/40 transition-colors mt-0.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              <h2 className="text-white font-medium mb-1">User Reports</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Review content reported by users. View reports for posts and group messages.
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

            <Link
              to="/admin/users"
              className="group border border-white/10 rounded-xl p-5 bg-white/5 hover:bg-white/8 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-rose-500/15 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-white/40 transition-colors mt-0.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              <h2 className="text-white font-medium mb-1">Manage Users</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Search users and delete accounts. Removes posts, messages, friendships, and reassigns admin-owned groups.
              </p>
            </Link>
          </div>
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
