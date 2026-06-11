// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { productsService } from '../services/products.service';
import Spinner from '../components/ui/Spinner';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [st, low] = await Promise.all([
          productsService.getDashboardStats(profile.company_id),
          productsService.listLowStock(profile.company_id),
        ]);
        setStats(st);
        setLowStock(low);
      } catch (err) {
        console.error('Erro ao carregar dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    if (profile) load();
  }, [profile]);

  if (loading) return <div className="loading-screen"><Spinner /></div>;

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card clickable" onClick={() => navigate('/produtos')}>
          <div className="kpi-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            Total de Itens
          </div>
          <div className="kpi-value">{stats?.totalItems || 0}</div>
        </div>
        
        <div className={`kpi-card clickable ${stats?.lowStockCount > 0 ? 'warning' : ''}`} onClick={() => navigate('/produtos?filtro=alerta')}>
          <div className="kpi-label">
            <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Alertas de Estoque
          </div>
          <div className="kpi-value">{stats?.lowStockCount || 0}</div>
        </div>
      </div>

      <div className="action-grid">
        <button className="action-btn primary" onClick={() => navigate('/saida')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="8,12 12,8 16,12"/><line x1="12" y1="16" x2="12" y2="8"/>
          </svg>
          Registrar Saída
        </button>
        <button className="action-btn secondary" onClick={() => navigate('/entrada')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="8,12 12,16 16,12"/><line x1="12" y1="8" x2="12" y2="16"/>
          </svg>
          Registrar Entrada
        </button>
      </div>

      <div className="section-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Atenção Necessária
      </div>

      {lowStock.length > 0 ? (
        <div className="alert-list">
          {lowStock.map(item => (
            <div key={item.id} className="alert-item">
              <div className="alert-item-info">
                <div className="alert-item-name">{item.name}</div>
                <div className="alert-item-ca">CA: {item.ca || 'N/A'}</div>
              </div>
              <div className="alert-item-stock">
                <div className="alert-item-qty">{item.current_stock}</div>
                <div className="alert-item-min">Min: {item.minimum_stock}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Nenhum produto com estoque crítico.</p>
        </div>
      )}
    </>
  );
}
