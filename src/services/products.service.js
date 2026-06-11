// src/services/products.service.js
import { supabase } from './supabase';

export const productsService = {
  /**
   * Lista todos os produtos ativos da empresa com categoria
   */
  async list(companyId, { search = '', page = 0, pageSize = 50 } = {}) {
    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('active', true)
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,ca.ilike.%${search}%`);
    }

    query = query.range(page * pageSize, (page + 1) * pageSize - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  /**
   * Produtos com estoque baixo
   */
  async listLowStock(companyId) {
    const { data, error } = await supabase
      .from('v_low_stock_products')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    if (error) throw error;
    return data;
  },

  /**
   * Totais do dashboard
   */
  async getDashboardStats(companyId) {
    const { data: products, error } = await supabase
      .from('products')
      .select('current_stock, minimum_stock')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('active', true);

    if (error) throw error;

    const totalItems = products.reduce((sum, p) => sum + p.current_stock, 0);
    const lowStockCount = products.filter(p => p.current_stock <= p.minimum_stock).length;

    return { totalItems, lowStockCount };
  },

  /**
   * Busca produto por ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Cria novo produto
   */
  async create(payload, userId) {
    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('activity_logs').insert({
      company_id: payload.company_id,
      user_id: userId,
      action: 'create',
      entity_type: 'products',
      entity_id: data.id,
      metadata: { name: payload.name },
    });

    return data;
  },

  /**
   * Atualiza produto
   */
  async update(id, payload, userId, companyId) {
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('activity_logs').insert({
      company_id: companyId,
      user_id: userId,
      action: 'update',
      entity_type: 'products',
      entity_id: id,
      metadata: { changes: payload },
    });

    return data;
  },

  /**
   * Soft delete
   */
  async remove(id, userId, companyId) {
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString(), active: false })
      .eq('id', id);
    if (error) throw error;

    await supabase.from('activity_logs').insert({
      company_id: companyId,
      user_id: userId,
      action: 'delete',
      entity_type: 'products',
      entity_id: id,
    });
  },
};
