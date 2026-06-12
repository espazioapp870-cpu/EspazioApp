// src/services/users.service.js
import { supabase } from './supabase';

// Helper para tentar inserir log sem bloquear se RLS negar
async function tryLog(payload) {
  try {
    await supabase.from('activity_logs').insert(payload);
  } catch (_) { /* ignora silenciosamente */ }
}

export const usersService = {
  async list(companyId, centerId = null) {
    let query = supabase
      .from('profiles')
      .select('*, centers(name)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at');
      
    if (centerId) {
      query = query.eq('center_id', centerId);
    }
    
    const { data, error } = await query;
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
    await tryLog({ company_id: companyId, user_id: adminId, action: 'role_change', entity_type: 'profiles', entity_id: userId, metadata: { new_role: role } });
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
    await tryLog({ company_id: companyId, user_id: adminId, action: 'role_change', entity_type: 'profiles', entity_id: userId, metadata: { new_superadmin: isSuperAdmin } });
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
    if (!data.user?.id) throw new Error('Usuário não criado');

    // Tentativa 1: RPC SECURITY DEFINER (bypassa RLS)
    const { error: rpcErr } = await supabase.rpc('admin_ensure_profile', {
      p_user_id:    data.user.id,
      p_email:      email,
      p_name:       name,
      p_role:       role,
      p_company_id: companyId,
      p_center_id:  centerId,
    });

    if (rpcErr) {
      console.warn('admin_ensure_profile falhou, tentando fallback:', rpcErr.message);
      // Tentativa 2: upsert direto (funciona se RLS não bloquear ou após migration)
      const { error: upsertErr } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        name,
        role,
        company_id: companyId,
        center_id:  centerId,
        is_superadmin: false,
      }, { onConflict: 'id' });

      if (upsertErr) {
        // Tentativa 3: apenas UPDATE (se o trigger já criou o registro, atualiza)
        await supabase.from('profiles').update({
          name,
          role,
          company_id: companyId,
          center_id:  centerId,
        }).eq('id', data.user.id);
      }
    }

    await tryLog({ company_id: companyId, user_id: adminId, action: 'create', entity_type: 'profiles', metadata: { email, role, center_id: centerId } });

    return data;
  },

  async deactivate(userId, adminId, companyId) {
    const { error } = await supabase.rpc('admin_delete_user', {
      p_target_user_id: userId
    });
    if (error) throw error;
    await tryLog({ company_id: companyId, user_id: adminId, action: 'delete', entity_type: 'profiles', entity_id: userId });
  },
};
