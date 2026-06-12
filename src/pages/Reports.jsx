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

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Reports() {
  const { profile, activeCenter } = useAuth();
  const toast = useToast();
  
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const dates = getPeriodDates(period);
        const [outputs, stats, top] = await Promise.all([
          stockService.getOutputsReport(profile.company_id, activeCenter?.id, { startDate: dates.start, endDate: dates.end }),
          stockService.getPeriodStats(profile.company_id, activeCenter?.id, { startDate: dates.start, endDate: dates.end }),
          stockService.getTopProducts(profile.company_id, activeCenter?.id, { startDate: dates.start, endDate: dates.end }),
        ]);
        setData({ outputs, stats, top, label: dates.label });
      } catch (err) {
        toast.error('Erro ao carregar relatórios');
      } finally {
        setLoading(false);
      }
    }
    if (profile && activeCenter) load();
  }, [profile, activeCenter, period]);

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

  const handleExportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      // Cabeçalho escuro
      doc.setFillColor(10, 10, 26);
      doc.rect(0, 0, pageW, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('ESPAZIO', 14, 14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 200);
      doc.text('Gestão Inteligente de Estoque', 14, 20);
      doc.setFontSize(9);
      doc.setTextColor(200, 200, 255);
      doc.text(`Centro: ${activeCenter?.name || '-'}`, 14, 27);
      doc.text(`Período: ${data.label}`, pageW - 14, 27, { align: 'right' });
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 150);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}   |   Por: ${profile?.name || ''}`, 14, 35);

      // KPIs
      const kpiY = 42;
      const kpiW = (pageW - 28) / 3;
      const kpis = [
        { label: 'Itens Saíram', value: String(data.stats.totalQty) },
        { label: 'Retiradas', value: String(data.stats.totalTransactions) },
        { label: 'Itens/Retirada', value: data.stats.totalTransactions ? (data.stats.totalQty / data.stats.totalTransactions).toFixed(1) : '0' },
      ];
      kpis.forEach((k, i) => {
        const x = 14 + i * (kpiW + 4);
        doc.setFillColor(20, 20, 40);
        doc.roundedRect(x, kpiY, kpiW, 18, 2, 2, 'F');
        doc.setTextColor(120, 120, 180);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(k.label, x + kpiW / 2, kpiY + 6, { align: 'center' });
        doc.setTextColor(80, 130, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(k.value, x + kpiW / 2, kpiY + 14, { align: 'center' });
      });

      // Top Produtos
      let cursorY = kpiY + 26;
      if (data.top.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 130, 255);
        doc.text('Mais Retirados', 14, cursorY);
        cursorY += 3;
        autoTable(doc, {
          startY: cursorY,
          head: [['#', 'Produto', 'Total (un)']],
          body: data.top.map((p, i) => [i + 1, p.name, p.total]),
          styles: { fontSize: 8, cellPadding: 2, textColor: [220, 220, 240], fillColor: [18, 18, 35] },
          headStyles: { fillColor: [30, 40, 80], textColor: [150, 180, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [22, 22, 42] },
          columnStyles: { 0: { cellWidth: 12 }, 2: { cellWidth: 22, halign: 'right' } },
          margin: { left: 14, right: 14 },
        });
        cursorY = doc.lastAutoTable.finalY + 8;
      }

      // Tabela detalhada
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 130, 255);
      doc.text('Movimentações Detalhadas', 14, cursorY);
      cursorY += 3;

      const rows = data.outputs.map(o => [
        formatDate(o.created_at),
        o.product_name || '-',
        o.employee_name || '-',
        o.user_name || '-',
        String(o.quantity),
        o.notes || '',
      ]);

      autoTable(doc, {
        startY: cursorY,
        head: [['Data/Hora', 'Produto', 'Funcionário', 'Registrado por', 'Qtd', 'Obs']],
        body: rows.length > 0 ? rows : [['', 'Nenhuma saída no período', '', '', '', '']],
        styles: { fontSize: 7, cellPadding: 2, textColor: [210, 210, 230], fillColor: [18, 18, 35], overflow: 'linebreak' },
        headStyles: { fillColor: [30, 40, 80], textColor: [150, 180, 255], fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [22, 22, 42] },
        columnStyles: { 0: { cellWidth: 28 }, 4: { cellWidth: 10, halign: 'right' }, 5: { cellWidth: 30 } },
        margin: { left: 14, right: 14 },
      });

      // Rodapé em todas as páginas
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 100);
        doc.text(`ESPAZIO — Página ${i} de ${pageCount}`, pageW / 2, 292, { align: 'center' });
      }

      const filename = `ESPAZIO_${activeCenter?.name || 'Relatorio'}_${data.label.replace(/\s/g, '_')}.pdf`;
      doc.save(filename);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
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
        <button
          className="export-btn"
          onClick={handleExportPDF}
          disabled={exporting || !data}
          style={{ background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.3)', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {exporting ? <Spinner size={16} /> : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9,15 12,18 15,15"/>
            </svg>
          )}
          Exportar PDF
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
