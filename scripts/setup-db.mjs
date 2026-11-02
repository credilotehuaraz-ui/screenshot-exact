import fs from 'node:fs';

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.VITE_SUPABASE_ACCESS_TOKEN;
const projectRef = 'lqwgbuxbvyxfzuffccnj';
const sqlPath = new URL('../supabase/schema.sql', import.meta.url);
const sql = fs.readFileSync(sqlPath, 'utf8');

async function run() {
  if (!token) {
    console.error("No SUPABASE_ACCESS_TOKEN en process.env");
    return;
  }
  console.log("Ejecutando SQL en Supabase...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (res.ok) {
    const data = await res.json();
    console.log("SUCCESS! Esquema creado en Supabase:", data);
  } else {
    const err = await res.text();
    console.error("ERROR ejecutando SQL:", res.status, err);
  }
}

run();
