// src/pages/Login.jsx
import { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { Navigate } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';

export default function Login() {
  const { user, profile, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user && profile) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (err) {
      setError('Credenciais inválidas. Verifique seu email e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <img src="/logo.png" alt="ESPAZIO Logo" className="login-logo" />
      <p className="login-subtitle">Gestão Inteligente de Estoque</p>

      <form className="login-form" onSubmit={handleSubmit}>
        {error && <div className="login-error">{error}</div>}
        
        <input
          type="email"
          className="form-input"
          placeholder="Seu email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="email"
        />
        
        <input
          type="password"
          className="form-input"
          placeholder="Sua senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="current-password"
        />

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
          {loading ? <Spinner size={24} /> : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
