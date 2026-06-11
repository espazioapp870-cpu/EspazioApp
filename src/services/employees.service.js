// src/services/employees.service.js
import { supabase } from './supabase';

export const employeesService = {
  async list(companyId, { search = '' } = {}) {
    let query = supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .eq('active', true)
      .order('name');

    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(payload, userId) {
    const { data, error } = await supabase
      .from('employees')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('activity_logs').insert({
      company_id: payload.company_id,
      user_id: userId,
      action: 'create',
      entity_type: 'employees',
      entity_id: data.id,
      metadata: { name: payload.name },
    });

    return data;
  },

  async update(id, payload, userId, companyId) {
    const { data, error } = await supabase
      .from('employees')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('activity_logs').insert({
      company_id: companyId,
      user_id: userId,
      action: 'update',
      entity_type: 'employees',
      entity_id: id,
    });

    return data;
  },

  async remove(id, userId, companyId) {
    await supabase
      .from('employees')
      .update({ deleted_at: new Date().toISOString(), active: false })
      .eq('id', id);

    await supabase.from('activity_logs').insert({
      company_id: companyId,
      user_id: userId,
      action: 'delete',
      entity_type: 'employees',
      entity_id: id,
    });
  },
};
