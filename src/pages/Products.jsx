// src/pages/Products.jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { productsService } from '../services/products.service';
import { categoriesService } from '../services/categories.service';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';

export default function Products() {
  const { profile, activeCenter, isEditor } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const filterAlerts = params.get('filtro') === 'alerta';
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', ca: '', size: 'N/A', category_id: '', current_stock: 0, minimum_stock: 5 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [prods, cats] = await Promise.all([
          productsService.list(profile.company_id, activeCenter?.id),
          categoriesService.list(profile.company_id),
        ]);
        setProducts(prods);
        setCategories(cats);
      } catch (error) {
        toast.error('Erro ao carregar produtos');
      } finally {
        setLoading(false);
      }
    }
    if (profile && activeCenter) load();
  }, [profile, activeCenter]);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.ca && p.ca.toLowerCase().includes(search.toLowerCase()));
    if (filterAlerts) return matchSearch && p.current_stock <= p.minimum_stock;
    return matchSearch;
  });

  const openNew = () => {
    setEditingId(null);
    setFormData({ name: '', ca: '', size: 'N/A', category_id: categories[0]?.id || '', current_stock: 0, minimum_stock: 5 });
    setIsModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setFormData({ name: p.name, ca: p.ca || '', size: p.size || 'N/A', category_id: p.category_id || '', current_stock: p.current_stock, minimum_stock: p.minimum_stock });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category_id) return toast.error('Nome e categoria são obrigatórios');
    setSaving(true);
    try {
      const payload = { name: formData.name, ca: formData.ca, size: formData.size, category_id: formData.category_id, company_id: profile.company_id };
      const stockPayload = { current_stock: formData.current_stock, minimum_stock: formData.minimum_stock };
      
      if (editingId) {
        const updated = await productsService.update(editingId, activeCenter.id, payload, stockPayload, profile.id, profile.company_id);
        setProducts(prev => prev.map(p => p.id === editingId ? { ...updated, current_stock: stockPayload.current_stock, minimum_stock: stockPayload.minimum_stock, categories: categories.find(c => c.id === updated.category_id) } : p));
        toast.success('Produto atualizado!');
      } else {
        const created = await productsService.create(activeCenter.id, payload, stockPayload, profile.id);
        setProducts(prev => [...prev, { ...created, current_stock: stockPayload.current_stock, minimum_stock: stockPayload.minimum_stock, categories: categories.find(c => c.id === created.category_id) }].sort((a,b) => a.name.localeCompare(b.name)));
        toast.success('Produto criado!');
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    try {
      await productsService.remove(id, profile.id, profile.company_id);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Produto excluído');
    } catch (err) {
      toast.error('Erro ao excluir');
    }
  };

  if (loading) return <div className="loading-screen"><Spinner /></div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Produtos {filterAlerts && '(Alertas)'}</h1>
        {isEditor && (
          <button className="btn-new" onClick={openNew}>
            + Novo
          </button>
        )}
      </div>

      <div className="search-bar">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input 
          type="text" 
          placeholder="Buscar produto ou CA..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="product-list" style={{ marginTop: '16px' }}>
        {filtered.map(p => {
          const isLow = p.current_stock <= p.minimum_stock;
          return (
            <div key={p.id} className={`product-card ${isLow ? 'alert' : ''}`}>
              <div className="product-card-header">
                <div>
                  <div className="product-card-title">
                    {p.name}
                    {isLow && <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                  </div>
                  <div className="product-card-meta">
                    CA: {p.ca || 'N/A'} • {p.categories?.name} • Tam: {p.size || 'N/A'}
                  </div>
                </div>
                {isEditor && (
                  <div className="product-card-actions">
                    <button className="icon-btn edit" onClick={() => openEdit(p)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="icon-btn delete" onClick={() => handleDelete(p.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="product-card-stats">
                <div className="stat-item">
                  <div className="stat-label">Estoque Atual</div>
                  <div className={`stat-value ${isLow ? 'low' : ''}`}>{p.current_stock}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Estoque Mínimo</div>
                  <div className="stat-value" style={{color: 'var(--text-muted)'}}>{p.minimum_stock}</div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state">
            <p>Nenhum produto encontrado neste Centro.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal 
          title={editingId ? 'Editar Produto' : 'Novo Produto'} 
          onClose={() => setIsModalOpen(false)}
          footer={
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size={24} /> : 'Salvar'}
            </button>
          }
        >
          <div className="form-group">
            <label className="form-label">Nome do Produto</label>
            <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Luva de Raspa" />
          </div>
          <div className="form-group">
            <label className="form-label">CA (Opcional)</label>
            <input className="form-input" value={formData.ca} onChange={e => setFormData({...formData, ca: e.target.value})} placeholder="Ex: 12345" />
          </div>

          <div className="form-group">
            <label className="form-label">Categoria</label>
            <div className="role-pills" style={{ flexWrap: 'wrap', gap: '8px', padding: '4px' }}>
              {categories.map(c => (
                <button 
                  key={c.id} 
                  type="button"
                  className={`role-pill ${formData.category_id === c.id ? 'active' : ''}`}
                  onClick={() => setFormData({...formData, category_id: c.id})}
                  style={formData.category_id === c.id ? { background: '#f97316', color: '#fff' } : {}}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tamanho</label>
            <div className="role-pills" style={{ flexWrap: 'wrap', gap: '8px', padding: '4px' }}>
              {['P', 'M', 'G', 'GG', 'N/A'].map(sz => (
                <button 
                  key={sz} 
                  type="button"
                  className={`role-pill ${formData.size === sz ? 'active' : ''}`}
                  onClick={() => setFormData({...formData, size: sz})}
                  style={formData.size === sz ? { background: '#f97316', color: '#fff' } : {}}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            {!editingId && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Estoque Inicial</label>
                <input type="number" className="form-input" value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: Number(e.target.value)})} min="0" />
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Estoque Mínimo</label>
              <input type="number" className="form-input" value={formData.minimum_stock} onChange={e => setFormData({...formData, minimum_stock: Number(e.target.value)})} min="0" />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
