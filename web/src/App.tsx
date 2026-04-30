import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { AdminPage } from './pages/AdminPage';
import { ModerationQueuePage } from './pages/ModerationQueuePage';
import { ManageParishesPage } from './pages/ManageParishesPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/moderation"
            element={
              <ProtectedRoute>
                <ModerationQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/parishes"
            element={
              <ProtectedRoute>
                <ManageParishesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/privacy" element={<ComingSoonPage title="Privacy Policy" />} />
          <Route path="/terms" element={<ComingSoonPage title="Terms of Service" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
