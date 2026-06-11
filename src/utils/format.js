// src/utils/format.js

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  }) + ', ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatSince(dateStr) {
  if (!dateStr) return '';
  return 'Desde ' + formatDateShort(dateStr);
}

export function roleLabel(role) {
  const map = { administrator: 'Administrador', editor: 'Editor', viewer: 'Visualizador' };
  return map[role] ?? role;
}

export function roleLabelShort(role) {
  const map = { administrator: 'Admin', editor: 'Editor', viewer: 'Visualizador' };
  return map[role] ?? role;
}

/**
 * Gera texto de relatório para exportação
 */
export function generateReportText(outputs, stats, topProducts, period) {
  const lines = [
    `ESPAZIO — Relatório de Saídas`,
    `Período: ${period}`,
    ``,
    `📊 Resumo`,
    `Itens retirados: ${stats.totalQty}`,
    `Número de retiradas: ${stats.totalTransactions}`,
    ``,
    `🏆 Mais retirados`,
    ...topProducts.map((p, i) => `${i + 1}. ${p.name}: ${p.total}`),
    ``,
    `📋 Detalhamento`,
    ...outputs.map(o =>
      `• ${o.product_name} (${o.quantity}x) — Por: ${o.user_name} → ${o.employee_name} — ${formatDate(o.created_at)}`
    ),
  ];
  return lines.join('\n');
}

export function getPeriodDates(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { start: today.toISOString(), end: new Date().toISOString(), label: 'Hoje' };
    case 'week': {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      return { start: w.toISOString(), end: new Date().toISOString(), label: 'Últimos 7 dias' };
    }
    case 'month': {
      const m = new Date(today);
      m.setDate(1);
      return { start: m.toISOString(), end: new Date().toISOString(), label: 'Este mês' };
    }
    default:
      return { start: null, end: null, label: 'Todos' };
  }
}
