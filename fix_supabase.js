import { createClient } from '@supabase/supabase-js';

const URL = 'https://pnmqssheywvlzcnnswtu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBubXFzc2hleXd2bHpjbm5zd3R1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE4MDYxMiwiZXhwIjoyMDk2NzU2NjEyfQ.ghf17ac3g1tJY5xYFOidseW7o6egLKxuH_xNTSxQXrM';

const supabase = createClient(URL, SERVICE_KEY);

async function fix() {
  console.log("Checking user...");
  // Use admin api
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) { console.error("Error listing users:", uErr); process.exit(1); }
  
  const user = users.users.find(u => u.email === 'fernandocroxiatti@gmail.com');
  if (!user) { console.log("User not found in auth.users"); process.exit(0); }
  
  console.log("User found:", user.id);
  
  const { data: profs } = await supabase.from('profiles').select('*').eq('id', user.id);
  if (profs && profs.length > 0) {
    console.log("Profile already exists");
    process.exit(0);
  }
  
  let companyId;
  const { data: comps } = await supabase.from('companies').select('*');
  if (comps && comps.length > 0) {
    companyId = comps[0].id;
  } else {
    console.log("Creating default company...");
    const { data: newComp, error: errComp } = await supabase.from('companies')
      .insert([{ name: 'ESPAZIO', slug: 'espazio' }]).select();
    if (errComp) { console.error("Error creating company", errComp); process.exit(1); }
    companyId = newComp[0].id;
  }
  
  console.log("Creating profile...");
  const { error: errProf } = await supabase.from('profiles').insert([{
    id: user.id,
    company_id: companyId,
    name: 'Fernando',
    email: user.email,
    role: 'administrator'
  }]);
  
  if (errProf) {
    console.error("Error creating profile", errProf);
  } else {
    console.log("Profile created successfully!");
  }
}

fix();
