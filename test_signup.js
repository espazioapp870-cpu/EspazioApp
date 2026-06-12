import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('/Users/nandosouza/Documents/ESPAZIO/.env', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split('=')));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const tempPassword = 'espazio123';
  const { data, error } = await supabase.auth.signUp({
    email: 'test_signup_error@hotmail.com',
    password: tempPassword,
    options: {
      data: { name: 'Test', role: 'viewer', company_id: '123e4567-e89b-12d3-a456-426614174000', center_id: '123e4567-e89b-12d3-a456-426614174000' }
    }
  });
  console.log('Result:', error || data);
}
test();
