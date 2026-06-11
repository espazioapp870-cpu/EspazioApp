// src/pages/ChangePassword.jsx
import { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { supabase } from '../services/supabase';
import { Navigate, useNavigate } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../store/ToastContext';

export default function ChangePassword() {
  const { profile, reloadProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Se não estiver precisando trocar a senha, joga pra home
  if (profile && !profile.needs_password_reset) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      return toast.error('A senha deve ter pelo menos 6 caracteres');
    }
    if (password !== confirmPassword) {
      return toast.error('As senhas não coincidem');
    }

    setLoading(true);
    try {
      // 1. Atualiza a senha no GoTrue
      const { error: authErr } = await supabase.auth.updateUser({ password });
      if (authErr) throw authErr;

      // 2. Remove a flag de needs_password_reset
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ needs_password_reset: false })
        .eq('id', profile.id);
      
      if (dbErr) throw dbErr;

      toast.success('Senha atualizada com sucesso!');
      await reloadProfile(); // Isso vai atualizar o profile no contexto e liberar as rotas
      navigate('/');
    } catch (err) {
      toast.error('Erro ao atualizar senha: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <img src="/logo.png" alt="ESPAZIO Logo" className="login-logo" />
      <p className="login-subtitle">Bem-vindo(a)!<br/>Por favor, crie uma nova senha de acesso.</p>

      <form className="login-form" onSubmit={handleSubmit}>
        <input
          type="password"
          className="form-input"
          placeholder="Nova senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="new-password"
        />
        
        <input
          type="password"
          className="form-input"
          placeholder="Confirmar nova senha"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          disabled={loading}
          autoComplete="new-password"
        />

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
          {loading ? <Spinner size={24} /> : 'Salvar Senha e Entrar'}
        </button>
      </form>
      
      <button onClick={signOut} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline' }}>
        Sair e voltar depois
      </button>
    </div>
  );
}
