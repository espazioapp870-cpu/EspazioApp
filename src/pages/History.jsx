// src/pages/History.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { stockService } from '../services/stock.service';
import { formatDate } from '../utils/format';
import Spinner from '../components/ui/Spinner';

export default function History() {
  const { profile, activeCenter } = useAuth();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const hist = await stockService.getHistory(profile.company_id, activeCenter?.id);
        setMovements(hist);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (profile && activeCenter) load();
  }, [profile, activeCenter]);

  if (loading) return <div className="loading-screen"><Spinner /></div>;

  return (
    <>
      <h1 className="page-title">Histórico</h1>
      <p className="section-subtitle">Últimas movimentações de estoque</p>

      <div className="movement-list">
        {movements.map(m => (
          <div key={`${m.type}-${m.id}`} className="movement-item">
            <div className={`movement-icon ${m.type}`}>
              {m.type === 'output' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 7 7 17"/><polyline points="8 7 17 7 17 16"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="7 17 17 7"/><polyline points="16 17 7 17 7 8"/></svg>
              )}
            </div>
            
            <div className="movement-info">
              <div className="movement-product">{m.product_name}</div>
              <div className="movement-people">
                {m.type === 'output' ? `Retirado por: ${m.employee_name}` : `Entrada por: ${m.user_name}`}
              </div>
              <div className="movement-date">{formatDate(m.created_at)}</div>
            </div>
            
            <div className={`movement-delta ${m.type === 'output' ? 'negative' : 'positive'}`}>
              {m.type === 'output' ? '-' : '+'}{m.quantity}
            </div>
          </div>
        ))}

        {movements.length === 0 && (
          <div className="empty-state">
            <p>Nenhuma movimentação recente.</p>
          </div>
        )}
      </div>
    </>
  );
}
