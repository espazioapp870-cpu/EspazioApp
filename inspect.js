import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/nandosouza/Documents/ESPAZIO/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('inspect_auth_user', { p_email: 'teste@hotmail.com' });
  console.log(error || data);
}
check();
