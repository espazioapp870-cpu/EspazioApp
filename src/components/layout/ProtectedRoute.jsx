// src/components/layout/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import Spinner from '../ui/Spinner';
import Header from './Header';
import BottomNav from './BottomNav';

export default function ProtectedRoute({ adminOnly = false }) {
  const { user, profile, loading, isAdmin } = useAuth();

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

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
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
