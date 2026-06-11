// src/pages/Admin.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { usersService } from '../services/users.service';
import { formatSince, roleLabelShort } from '../utils/format';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

export default function Admin() {
  const { profile } = useAuth();
  const toast = useToast();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ name: '', email: '', role: 'viewer' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await usersService.list(profile.company_id);
        setUsers(data);
      } catch (err) {
        toast.error('Erro ao carregar usuários');
      } finally {
        setLoading(false);
      }
    }
    if (profile) load();
  }, [profile]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await usersService.updateRole(userId, newRole, profile.id, profile.company_id);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Permissão atualizada');
    } catch (err) {
      toast.error('Erro ao atualizar permissão');
    }
  };

  const handleInvite = async () => {
    if (!inviteData.name || !inviteData.email) return toast.error('Nome e e-mail são obrigatórios');
    setSaving(true);
    try {
      await usersService.inviteUser({ ...inviteData, companyId: profile.company_id }, profile.id);
      toast.success('Convite enviado! (Simulação)');
      setIsInviteOpen(false);
      // Recarrega lista
      const data = await usersService.list(profile.company_id);
      setUsers(data);
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar convite');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen"><Spinner /></div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <div className="admin-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Admin
          </div>
        </h1>
        <button className="btn-new" onClick={() => setIsInviteOpen(true)}>
          + Usuário
        </button>
      </div>

      <div className="users-count">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        {users.length} usuários ativos
      </div>

      <div className="user-list">
        {users.map(u => (
          <div key={u.id} className="user-card">
            <div className="user-card-name">{u.name} {u.id === profile.id ? '(Você)' : ''}</div>
            <div className="user-card-email">{u.email}</div>
            <div className="user-card-since">{formatSince(u.created_at)}</div>
            
            <div className="role-pills">
              {['administrator', 'editor', 'viewer'].map(role => (
                <button
                  key={role}
                  className={`role-pill ${u.role === role ? `active ${role}` : ''}`}
                  onClick={() => u.id !== profile.id && handleRoleChange(u.id, role)}
                  disabled={u.id === profile.id}
                >
                  {roleLabelShort(role)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isInviteOpen && (
        <Modal 
          title="Convidar Usuário" 
          onClose={() => setIsInviteOpen(false)}
          footer={
            <button className="btn btn-primary" onClick={handleInvite} disabled={saving}>
              {saving ? <Spinner size={24} /> : 'Enviar Convite'}
            </button>
          }
        >
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input className="form-input" value={inviteData.name} onChange={e => setInviteData({...inviteData, name: e.target.value})} placeholder="Nome completo" />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input type="email" className="form-input" value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} placeholder="email@empresa.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Permissão</label>
            <select className="form-input" value={inviteData.role} onChange={e => setInviteData({...inviteData, role: e.target.value})}>
              <option value="administrator">Administrador (Tudo)</option>
              <option value="editor">Editor (Cadastros)</option>
              <option value="viewer">Visualizador (Saídas/Entradas)</option>
            </select>
          </div>
        </Modal>
      )}
    </>
  );
}
