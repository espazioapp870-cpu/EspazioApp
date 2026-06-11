import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.pnmqssheywvlzcnnswtu:C57SS4aWKt%3F6hCs@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
});

async function fix() {
  await client.connect();
  console.log("Connected");
  
  // Get the user
  const res = await client.query('SELECT id, email FROM auth.users WHERE email = $1', ['fernandocroxiatti@gmail.com']);
  if (res.rows.length === 0) {
    console.log("User not found!");
    process.exit(0);
  }
  const userId = res.rows[0].id;
  const email = res.rows[0].email;
  
  console.log("User:", userId, email);
  
  // Check if profile exists
  const profRes = await client.query('SELECT id FROM public.profiles WHERE id = $1', [userId]);
  if (profRes.rows.length > 0) {
    console.log("Profile already exists");
    process.exit(0);
  }
  
  // Check if company exists
  const compRes = await client.query('SELECT id FROM public.companies LIMIT 1');
  let companyId;
  if (compRes.rows.length > 0) {
    companyId = compRes.rows[0].id;
  } else {
    // Create company
    const newComp = await client.query("INSERT INTO public.companies (name, slug) VALUES ('ESPAZIO', 'espazio') RETURNING id");
    companyId = newComp.rows[0].id;
    console.log("Created company:", companyId);
  }
  
  // Create profile
  await client.query("INSERT INTO public.profiles (id, company_id, name, email, role) VALUES ($1, $2, 'Fernando', $3, 'administrator')", [userId, companyId, email]);
  console.log("Created profile for user!");
  
  await client.end();
}

fix().catch(err => { console.error(err); process.exit(1); });
