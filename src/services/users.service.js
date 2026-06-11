// src/services/users.service.js
import { supabase } from './supabase';

export const usersService = {
  async list(companyId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at');
    if (error) throw error;
    return data;
  },

  async updateRole(userId, role, adminId, companyId) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('activity_logs').insert({
      company_id: companyId,
      user_id: adminId,
      action: 'role_change',
      entity_type: 'profiles',
      entity_id: userId,
      metadata: { new_role: role },
    });

    return data;
  },

  async inviteUser({ email, name, role, companyId }, adminId) {
    // Cria um client temporário para não deslogar o admin atual
    const { createClient } = await import('@supabase/supabase-js');
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    
    const { data, error } = await tempClient.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: { name, role, company_id: companyId }
      }
    });

    if (error) throw error;

    await supabase.from('activity_logs').insert({
      company_id: companyId,
      user_id: adminId,
      action: 'create',
      entity_type: 'profiles',
      metadata: { email, role },
    });

    return data;
  },

  async deactivate(userId, adminId, companyId) {
    const { error } = await supabase
      .from('profiles')
      .update({ active: false, deleted_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;

    await supabase.from('activity_logs').insert({
      company_id: companyId,
      user_id: adminId,
      action: 'delete',
      entity_type: 'profiles',
      entity_id: userId,
    });
  },
};
