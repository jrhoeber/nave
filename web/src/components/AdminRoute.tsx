import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ForbiddenPage } from '../pages/ForbiddenPage';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-nave-accent/40 border-t-nave-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!isAdmin) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
