import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SignInPage } from './SignInPage';

export function DeletePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-nave-accent/40 border-t-nave-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/manage" replace />;
  }

  return (
    <SignInPage
      redirectTo="/manage"
      heading="Delete your account"
      subheading="Sign in to permanently delete your Nave account."
    />
  );
}
