// src/services/users.service.js
import { supabase } from './supabase';

export const usersService = {
  async list(companyId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, centers(name)')
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

  async toggleSuperAdmin(userId, isSuperAdmin, adminId, companyId) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_superadmin: isSuperAdmin })
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
      metadata: { new_superadmin: isSuperAdmin },
    });

    return data;
  },

  async inviteUser({ email, name, role, companyId, centerId }, adminId) {
    const { createClient } = await import('@supabase/supabase-js');
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data, error } = await tempClient.auth.signUp({
      email,
      password: 'espazio123',
      options: {
        data: { name, role, company_id: companyId, center_id: centerId }
      }
    });

    if (error) throw error;

    // Garantir que o profile foi criado corretamente com company_id e center_id
    if (data.user?.id) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        name,
        role,
        company_id: companyId,
        center_id: centerId,
        is_superadmin: false,
      }, { onConflict: 'id' });
    }

    await supabase.from('activity_logs').insert({
      company_id: companyId,
      user_id: adminId,
      action: 'create',
      entity_type: 'profiles',
      metadata: { email, role, center_id: centerId },
    });

    return data;
  },

  async deactivate(userId, adminId, companyId) {
    const { error } = await supabase.rpc('admin_delete_user', {
      p_target_user_id: userId
    });
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
