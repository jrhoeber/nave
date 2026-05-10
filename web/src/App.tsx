import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { AdminPage } from './pages/AdminPage';
import { ManagePage } from './pages/ManagePage';
import { ModerationQueuePage } from './pages/ModerationQueuePage';
import { UserReportsPage } from './pages/UserReportsPage';
import { ManageParishesPage } from './pages/ManageParishesPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { SupportPage } from './pages/SupportPage';
import { DeletePage } from './pages/DeletePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route
            path="/manage"
            element={
              <ProtectedRoute>
                <ManagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/moderation"
            element={
              <AdminRoute>
                <ModerationQueuePage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <AdminRoute>
                <UserReportsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/parishes"
            element={
              <AdminRoute>
                <ManageParishesPage />
              </AdminRoute>
            }
          />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/delete" element={<DeletePage />} />
          <Route path="/privacy" element={<ComingSoonPage title="Privacy Policy" />} />
          <Route path="/terms" element={<ComingSoonPage title="Terms of Service" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
