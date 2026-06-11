// src/services/products.service.js
import { supabase } from './supabase';

export const productsService = {
  /**
   * Lista todos os produtos ativos da empresa com categoria e estoque do centro
   */
  async list(companyId, centerId, { search = '', page = 0, pageSize = 50 } = {}) {
    let query = supabase
      .from('products')
      .select('*, categories(name), product_stocks(current_stock, minimum_stock)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('active', true)
      .order('name');

    // Filtra o product_stocks apenas para o centro atual
    if (centerId) {
      query = query.eq('product_stocks.center_id', centerId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,ca.ilike.%${search}%`);
    }

    query = query.range(page * pageSize, (page + 1) * pageSize - 1);

    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(p => ({
      ...p,
      current_stock: p.product_stocks?.[0]?.current_stock || 0,
      minimum_stock: p.product_stocks?.[0]?.minimum_stock || 0,
    }));
  },

  /**
   * Produtos com estoque baixo no centro atual
   */
  async listLowStock(companyId, centerId) {
    const { data, error } = await supabase
      .from('v_low_stock_products')
      .select('*')
      .eq('company_id', companyId)
      .eq('center_id', centerId)
      .order('name');
    if (error) throw error;
    return data;
  },

  /**
   * Totais do dashboard para o centro atual
   */
  async getDashboardStats(companyId, centerId) {
    const { data: products, error } = await supabase
      .from('products')
      .select('product_stocks(current_stock, minimum_stock)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('active', true)
      .eq('product_stocks.center_id', centerId);

    if (error) throw error;

    let totalItems = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      const stock = p.product_stocks?.[0];
      const current = stock?.current_stock || 0;
      const min = stock?.minimum_stock || 0;
      totalItems += current;
      if (current <= min) lowStockCount++;
    });

    return { totalItems, lowStockCount };
  },

  /**
   * Busca produto por ID com o estoque do centro
   */
  async getById(id, centerId) {
    let query = supabase
      .from('products')
      .select('*, categories(name), product_stocks(current_stock, minimum_stock)')
      .eq('id', id);

    if (centerId) {
      query = query.eq('product_stocks.center_id', centerId);
    }

    const { data, error } = await query.single();
    if (error) throw error;

    return {
      ...data,
      current_stock: data.product_stocks?.[0]?.current_stock || 0,
      minimum_stock: data.product_stocks?.[0]?.minimum_stock || 0,
    };
  },

  /**
   * Cria novo produto globalmente e seta o estoque para o centro atual
   */
  async create(centerId, payload, stockPayload, userId) {
    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    if (stockPayload) {
      await supabase.from('product_stocks').insert({
        center_id: centerId,
        product_id: data.id,
        current_stock: stockPayload.current_stock || 0,
        minimum_stock: stockPayload.minimum_stock || 0,
      });
    }

    await supabase.from('activity_logs').insert({
      company_id: payload.company_id,
      user_id: userId,
      action: 'create',
      entity_type: 'products',
      entity_id: data.id,
      metadata: { name: payload.name, initial_stock: stockPayload },
    });

    return data;
  },

  /**
   * Atualiza produto global e estoque do centro
   */
  async update(id, centerId, payload, stockPayload, userId, companyId) {
    // 1. Atualiza dados globais do produto
    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (prodErr) throw prodErr;

    // 2. Atualiza (ou insere) dados de estoque para o centro
    if (stockPayload) {
      const { error: stockErr } = await supabase
        .from('product_stocks')
        .upsert({
          center_id: centerId,
          product_id: id,
          minimum_stock: stockPayload.minimum_stock,
          // Não atualiza o current_stock aqui, pois ele é movido por entradas/saídas,
          // a não ser que seja um ajuste manual inicial. Se o usuário puder editar estoque direto:
          current_stock: stockPayload.current_stock
        }, { onConflict: 'center_id, product_id' });
      if (stockErr) throw stockErr;
    }

    await supabase.from('activity_logs').insert({
      company_id: companyId,
      user_id: userId,
      action: 'update',
      entity_type: 'products',
      entity_id: id,
      metadata: { changes: payload, stock_changes: stockPayload, center_id: centerId },
    });

    return prodData;
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
