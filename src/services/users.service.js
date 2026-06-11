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

  async inviteUser({ email, name, role, companyId, centerId }, adminId) {
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_company_id: companyId,
      p_center_id: centerId,
      p_name: name,
      p_email: email,
      p_role: role
    });

    if (error) throw error;

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
