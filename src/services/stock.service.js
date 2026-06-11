// src/services/stock.service.js
import { supabase } from './supabase';

export const stockService = {
  /**
   * Registra saída de estoque
   * O trigger fn_apply_stock_output no banco garante:
   *  - bloqueio pessimista (FOR UPDATE)
   *  - validação de estoque negativo
   *  - atualização do current_stock
   *  - log automático
   */
  async registerOutput({ companyId, productId, employeeId, userId, quantity, notes }) {
    const { data, error } = await supabase
      .from('stock_outputs')
      .insert({
        company_id: companyId,
        product_id: productId,
        employee_id: employeeId,
        user_id: userId,
        quantity,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Registra entrada de estoque
   * O trigger fn_apply_stock_entry no banco garante:
   *  - atualização do current_stock
   *  - log automático
   */
  async registerEntry({ companyId, productId, userId, quantity, notes }) {
    const { data, error } = await supabase
      .from('stock_entries')
      .insert({
        company_id: companyId,
        product_id: productId,
        user_id: userId,
        quantity,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Histórico de movimentações (view unificada)
   */
  async getHistory(companyId, { page = 0, pageSize = 30 } = {}) {
    const { data, error } = await supabase
      .from('v_recent_movements')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;
    return data;
  },

  /**
   * Relatório de saídas com filtros
   */
  async getOutputsReport(companyId, { startDate, endDate, productName, userName } = {}) {
    let query = supabase
      .from('v_recent_movements')
      .select('*')
      .eq('company_id', companyId)
      .eq('type', 'output')
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate)   query = query.lte('created_at', endDate);
    if (productName) query = query.ilike('product_name', `%${productName}%`);
    if (userName)    query = query.ilike('user_name', `%${userName}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Top produtos mais retirados no período
   */
  async getTopProducts(companyId, { startDate, endDate } = {}) {
    let query = supabase
      .from('stock_outputs')
      .select('product_id, quantity, products(name)')
      .eq('company_id', companyId);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate)   query = query.lte('created_at', endDate);

    const { data, error } = await query;
    if (error) throw error;

    // Agrupa por produto no cliente
    const map = {};
    for (const row of data) {
      const key = row.product_id;
      if (!map[key]) map[key] = { product_id: key, name: row.products?.name, total: 0 };
      map[key].total += row.quantity;
    }

    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 3);
  },

  /**
   * Contagem de transações no período
   */
  async getPeriodStats(companyId, { startDate, endDate } = {}) {
    let qOutputs = supabase
      .from('stock_outputs')
      .select('quantity')
      .eq('company_id', companyId);

    if (startDate) qOutputs = qOutputs.gte('created_at', startDate);
    if (endDate)   qOutputs = qOutputs.lte('created_at', endDate);

    const { data: outputs, error } = await qOutputs;
    if (error) throw error;

    const totalQty = outputs.reduce((s, o) => s + o.quantity, 0);
    const totalTransactions = outputs.length;

    return { totalQty, totalTransactions };
  },
};
