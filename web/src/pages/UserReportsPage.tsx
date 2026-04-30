import { Link } from 'react-router-dom';
import { AdminNav } from '../components/AdminNav';
import { UserReports } from '../components/UserReports';

export function UserReportsPage() {
  return (
    <div className="min-h-screen dark-gradient flex flex-col">
      <AdminNav />

      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-white/35 text-sm mb-6">
            <Link to="/admin" className="hover:text-white/55 transition-colors">Admin Console</Link>
            <span>/</span>
            <span className="text-white/55">User Reports</span>
          </div>
          <UserReports />
        </div>
      </main>

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
