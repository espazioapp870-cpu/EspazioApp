// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext';
import { ToastProvider } from './store/ToastContext';

import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Outputs from './pages/Outputs';
import Entries from './pages/Entries';
import Products from './pages/Products';
import Reports from './pages/Reports';
import History from './pages/History';
import Admin from './pages/Admin';
import ChangePassword from './pages/ChangePassword';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute requirePasswordChange />}>
              <Route path="/change-password" element={<ChangePassword />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/saida" element={<Outputs />} />
              <Route path="/entrada" element={<Entries />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/historico" element={<History />} />
            </Route>

            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
