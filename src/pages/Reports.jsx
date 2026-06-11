// src/pages/Reports.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useToast } from '../store/ToastContext';
import { stockService } from '../services/stock.service';
import { getPeriodDates, generateReportText } from '../utils/format';
import Spinner from '../components/ui/Spinner';

const periods = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: '7 Dias' },
  { id: 'month', label: 'Mês' },
  { id: 'all', label: 'Todos' },
];

export default function Reports() {
  const { profile } = useAuth();
  const toast = useToast();
  
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const dates = getPeriodDates(period);
        const [outputs, stats, top] = await Promise.all([
          stockService.getOutputsReport(profile.company_id, { startDate: dates.start, endDate: dates.end }),
          stockService.getPeriodStats(profile.company_id, { startDate: dates.start, endDate: dates.end }),
          stockService.getTopProducts(profile.company_id, { startDate: dates.start, endDate: dates.end }),
        ]);
        setData({ outputs, stats, top, label: dates.label });
      } catch (err) {
        toast.error('Erro ao carregar relatórios');
      } finally {
        setLoading(false);
      }
    }
    if (profile) load();
  }, [profile, period]);

  const handleExportWA = () => {
    if (!data) return;
    const text = generateReportText(data.outputs, data.stats, data.top, data.label);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleExportText = () => {
    if (!data) return;
    const text = generateReportText(data.outputs, data.stats, data.top, data.label);
    navigator.clipboard.writeText(text);
    toast.success('Relatório copiado para a área de transferência!');
  };

  return (
    <>
      <h1 className="page-title">Relatórios</h1>
      <p className="section-subtitle">Visão geral das saídas de estoque</p>

      <div className="period-tabs">
        {periods.map(p => (
          <button 
            key={p.id} 
            className={`period-tab ${period === p.id ? 'active' : ''}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="export-btns">
        <button className="export-btn whatsapp" onClick={handleExportWA}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          WhatsApp
        </button>
        <button className="export-btn export" onClick={handleExportText}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copiar Texto
        </button>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ height: '200px' }}><Spinner /></div>
      ) : data && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-label">Itens Saíram</div>
              <div className="stat-card-value">{data.stats.totalQty}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Retiradas</div>
              <div className="stat-card-value">{data.stats.totalTransactions}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Itens/Retirada</div>
              <div className="stat-card-value">
                {data.stats.totalTransactions ? (data.stats.totalQty / data.stats.totalTransactions).toFixed(1) : 0}
              </div>
            </div>
          </div>

          {data.top.length > 0 && (
            <div className="top-products">
              <div className="top-products-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 15l-4 1 1-4 9.5-9.5a2.12 2.12 0 0 1 3 3L12 15z"/></svg>
                Mais Retirados
              </div>
              {data.top.map((p, i) => (
                <div key={p.product_id} className="top-product-row">
                  <span>{i + 1}. {p.name}</span>
                  <span>{p.total} un</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
