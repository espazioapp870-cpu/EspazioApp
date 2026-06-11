// src/services/categories.service.js
import { supabase } from './supabase';

export const categoriesService = {
  async list(companyId) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    if (error) throw error;
    return data;
  },

  async create(name, companyId) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, company_id: companyId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
