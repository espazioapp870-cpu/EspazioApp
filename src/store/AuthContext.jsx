// src/store/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [centers, setCenters] = useState([]);
  const [activeCenter, setActiveCenter] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadCenters(companyId, defaultCenterId) {
    const { data: list } = await supabase.from('centers').select('*').eq('company_id', companyId).eq('active', true).order('name');
    if (list && list.length > 0) {
      setCenters(list);
      const initial = list.find(c => c.id === defaultCenterId) || list[0];
      setActiveCenter(initial);
    }
  }

  async function loadProfile(userId) {
    const { data: prof, error } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', userId)
      .maybeSingle();

    if (prof) {
      setProfile(prof);
      setCompany(prof.companies);
      await loadCenters(prof.company_id, prof.center_id);
    } else {
      setProfile(null);
      setCompany(null);
      setCenters([]);
      setActiveCenter(null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) await loadProfile(session.user.id);
        else { setProfile(null); setCompany(null); setCenters([]); setActiveCenter(null); }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Registrar log de login
    if (data.user) {
      await supabase.from('activity_logs').insert({
        company_id: profile?.company_id,
        user_id: data.user.id,
        action: 'login',
        metadata: { email },
      }).maybeSingle();
    }
    return data;
  }

  async function signOut() {
    if (profile) {
      await supabase.from('activity_logs').insert({
        company_id: profile.company_id,
        user_id: profile.id,
        action: 'logout',
      }).maybeSingle();
    }
    await supabase.auth.signOut();
  }

  const value = {
    user,
    profile,
    company,
    centers,
    activeCenter,
    setActiveCenter,
    loading,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'administrator' || profile?.is_superadmin,
    isSuperAdmin: profile?.is_superadmin === true,
    isEditor: profile?.role === 'editor' || profile?.role === 'administrator' || profile?.is_superadmin,
    isViewer: profile?.role === 'viewer',
    signIn,
    signOut,
    reloadProfile: () => user && loadProfile(user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
