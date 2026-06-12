// src/components/layout/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import Spinner from '../ui/Spinner';
import Header from './Header';
import BottomNav from './BottomNav';

export default function ProtectedRoute({ adminOnly = false, editorOnly = false, requirePasswordChange = false }) {
  const { user, profile, loading, isAdmin, isEditor } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <Spinner size={32} />
        <p>Carregando ESPAZIO...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.needs_password_reset && !requirePasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (editorOnly && !isEditor) {
    return <Navigate to="/" replace />;
  }

  // Se estamos na tela de mudar a senha, não mostra Header e BottomNav
  if (requirePasswordChange) {
    return <Outlet />;
  }

  return (
    <div className="app-layout">
      <Header />
      <main className="page-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
