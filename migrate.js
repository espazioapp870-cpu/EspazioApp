#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const PROJECT = 'pnmqssheywvlzcnnswtu';
const SKEY = process.env.SUPABASE_SERVICE_KEY;
const BASE = 'https://' + PROJECT + '.supabase.co';

if (!SKEY) {
  console.error('Defina SUPABASE_SERVICE_KEY no ambiente');
  process.exit(1);
}

const H = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + SKEY,
  'apikey': SKEY,
};

// Tenta endpoint /pg/query (disponível em alguns projetos Supabase)
async function trySQLEndpoint(sql) {
  const endpoints = [
    BASE + '/pg/query',
    BASE + '/rest/v1/rpc/exec_sql_espazio',
  ];

  for (const url of endpoints) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: H,
        body: JSON.stringify({ query: sql }),
      });
      const txt = await r.text();
      if (r.ok) return { ok: true, url, data: txt };
      if (r.status === 404) continue;
      return { ok: false, url, error: txt, status: r.status };
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function main() {
  console.log('ESPAZIO Migration Runner');
  console.log('========================\n');

  // Teste básico
  const test = await trySQLEndpoint('SELECT current_database() as db, version() as ver');
  if (test && test.ok) {
    console.log('Endpoint ativo:', test.url);
    console.log('Resposta:', test.data.substring(0, 200));
  } else {
    console.log('Nenhum endpoint HTTP de SQL disponivel.');
    console.log('');
    console.log('ACTION NEEDED:');
    console.log('Acesse o SQL Editor no Supabase Dashboard e execute a migration manualmente:');
    console.log('https://supabase.com/dashboard/project/' + PROJECT + '/sql/new');
    console.log('');
    const sql = readFileSync(join(__dir, 'migrations', '001_initial_schema.sql'), 'utf8');
    console.log('Arquivo: migrations/001_initial_schema.sql (' + sql.length + ' chars)');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
