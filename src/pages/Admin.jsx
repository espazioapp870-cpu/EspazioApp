// src/pages/Admin.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { usersService } from '../services/users.service';
import { categoriesService } from '../services/categories.service';
import { supabase } from '../services/supabase';
import { formatSince, roleLabelShort } from '../utils/format';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

export default function Admin() {
  const { profile, centers: authCenters, loadCenters } = useAuth();
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'categories', 'centers'
  const [loading, setLoading] = useState(true);

  // Data
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [centers, setCenters] = useState([]);

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCenterModalOpen, setIsCenterModalOpen] = useState(false);

  // Forms
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'viewer', centerId: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [centerForm, setCenterForm] = useState({ name: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [u, c, cntrs] = await Promise.all([
          usersService.list(profile.company_id),
          categoriesService.list(profile.company_id),
          supabase.from('centers').select('*').eq('company_id', profile.company_id).eq('active', true).order('name')
        ]);
        setUsers(u);
        setCategories(c);
        setCenters(cntrs.data || []);
        
        if (u.length && cntrs.data?.length) {
          setUserForm(prev => ({ ...prev, centerId: cntrs.data[0].id }));
        }
      } catch (err) {
        toast.error('Erro ao carregar dados do admin');
      } finally {
        setLoading(false);
      }
    }
    if (profile) load();
  }, [profile]);

  // --- Usuários ---
  const handleRoleChange = async (userId, newRole) => {
    try {
      await usersService.updateRole(userId, newRole, profile.id, profile.company_id);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Permissão atualizada');
    } catch (err) {
      toast.error('Erro ao atualizar permissão');
    }
  };

  const handleInviteUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.centerId) return toast.error('Preencha todos os campos');
    setSaving(true);
    try {
      await usersService.inviteUser({ ...userForm, companyId: profile.company_id }, profile.id);
      toast.success('Usuário criado! A senha padrão é espazio123');
      setIsUserModalOpen(false);
      const data = await usersService.list(profile.company_id);
      setUsers(data);
    } catch (err) {
      toast.error(err.message || 'Erro ao convidar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!confirm('Deseja resetar a senha deste usuário para espazio123? Ele precisará trocar no próximo login.')) return;
    try {
      const { error } = await supabase.rpc('admin_reset_user_password', { target_user_id: userId });
      if (error) throw error;
      toast.success('Senha resetada para espazio123 com sucesso!');
    } catch (err) {
      toast.error('Erro ao resetar senha: ' + err.message);
    }
  };

  // --- Categorias ---
  const handleCreateCategory = async () => {
    if (!categoryForm.name) return toast.error('Nome é obrigatório');
    setSaving(true);
    try {
      const created = await categoriesService.create(categoryForm.name, profile.company_id);
      setCategories(prev => [...prev, created].sort((a,b) => a.name.localeCompare(b.name)));
      toast.success('Categoria criada');
      setIsCategoryModalOpen(false);
      setCategoryForm({ name: '' });
    } catch (err) {
      toast.error('Erro ao criar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Excluir esta categoria? Produtos associados podem ficar sem categoria.')) return;
    try {
      await categoriesService.remove(id, profile.company_id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Categoria excluída');
    } catch (err) {
      toast.error('Erro ao excluir (Pode estar em uso)');
    }
  };

  // --- Centros ---
  const handleCreateCenter = async () => {
    if (!centerForm.name) return toast.error('Nome é obrigatório');
    setSaving(true);
    try {
      const { data, error } = await supabase.from('centers').insert({ name: centerForm.name, company_id: profile.company_id }).select().single();
      if (error) throw error;
      setCenters(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)));
      toast.success('Centro criado');
      setIsCenterModalOpen(false);
      setCenterForm({ name: '' });
      // Recarrega centros globais
      if (loadCenters) await loadCenters(profile.company_id, profile.center_id);
    } catch (err) {
      toast.error('Erro ao criar centro');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCenter = async (id) => {
    if (!confirm('Cuidado! Excluir um Centro o ocultará do sistema.')) return;
    try {
      const { error } = await supabase.from('centers').update({ active: false }).eq('id', id);
      if (error) throw error;
      setCenters(prev => prev.filter(c => c.id !== id));
      toast.success('Centro inativado');
      if (loadCenters) await loadCenters(profile.company_id, profile.center_id);
    } catch (err) {
      toast.error('Erro ao excluir Centro');
    }
  };

  if (loading) return <div className="loading-screen"><Spinner /></div>;

  return (
    <>
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <h1 className="page-title">
          <div className="admin-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Administração
          </div>
        </h1>
        {activeTab === 'users' && <button className="btn-new" onClick={() => setIsUserModalOpen(true)}>+ Usuário</button>}
        {activeTab === 'categories' && <button className="btn-new" onClick={() => setIsCategoryModalOpen(true)}>+ Categoria</button>}
        {activeTab === 'centers' && <button className="btn-new" onClick={() => setIsCenterModalOpen(true)}>+ Centro</button>}
      </div>

      <div className="admin-tabs" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Usuários ({users.length})</button>
        <button className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>Categorias ({categories.length})</button>
        <button className={`tab-btn ${activeTab === 'centers' ? 'active' : ''}`} onClick={() => setActiveTab('centers')}>Centros ({centers.length})</button>
      </div>

      {activeTab === 'users' && (
        <div className="user-list">
          {users.map(u => (
            <div key={u.id} className="user-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="user-card-name">{u.name} {u.id === profile.id ? '(Você)' : ''}</div>
                <div className="user-card-email">{u.email} • {u.centers?.name}</div>
                <div className="user-card-since">{formatSince(u.created_at)}</div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
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
                {u.id !== profile.id && (
                  <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleResetPassword(u.id)}>
                    Resetar Senha
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="product-list">
          {categories.map(c => (
            <div key={c.id} className="product-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <button className="icon-btn delete" onClick={() => handleDeleteCategory(c.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          ))}
          {categories.length === 0 && <div className="empty-state">Nenhuma categoria cadastrada.</div>}
        </div>
      )}

      {activeTab === 'centers' && (
        <div className="product-list">
          {centers.map(c => (
            <div key={c.id} className="product-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <button className="icon-btn delete" onClick={() => handleDeleteCenter(c.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          ))}
          {centers.length === 0 && <div className="empty-state">Nenhum Centro cadastrado.</div>}
        </div>
      )}

      {/* Modals */}
      {isUserModalOpen && (
        <Modal title="Criar Usuário" onClose={() => setIsUserModalOpen(false)} footer={
          <button className="btn btn-primary" onClick={handleInviteUser} disabled={saving}>{saving ? <Spinner size={24} /> : 'Criar'}</button>
        }>
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input className="form-input" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Nome completo" />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input type="email" className="form-input" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="email@empresa.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Permissão</label>
            <select className="form-input" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
              <option value="administrator">Administrador (Tudo)</option>
              <option value="editor">Editor (Cadastros)</option>
              <option value="viewer">Visualizador (Saídas/Entradas)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Centro de Custo</label>
            <select className="form-input" value={userForm.centerId} onChange={e => setUserForm({...userForm, centerId: e.target.value})}>
              <option value="">Selecione...</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {isCategoryModalOpen && (
        <Modal title="Nova Categoria" onClose={() => setIsCategoryModalOpen(false)} footer={
          <button className="btn btn-primary" onClick={handleCreateCategory} disabled={saving}>{saving ? <Spinner size={24} /> : 'Salvar'}</button>
        }>
          <div className="form-group">
            <label className="form-label">Nome</label>
            <input className="form-input" value={categoryForm.name} onChange={e => setCategoryForm({ name: e.target.value })} placeholder="Ex: EPIs" />
          </div>
        </Modal>
      )}

      {isCenterModalOpen && (
        <Modal title="Novo Centro" onClose={() => setIsCenterModalOpen(false)} footer={
          <button className="btn btn-primary" onClick={handleCreateCenter} disabled={saving}>{saving ? <Spinner size={24} /> : 'Salvar'}</button>
        }>
          <div className="form-group">
            <label className="form-label">Nome ou Código</label>
            <input className="form-input" value={centerForm.name} onChange={e => setCenterForm({ name: e.target.value })} placeholder="Ex: C235" />
          </div>
        </Modal>
      )}
    </>
  );
}
