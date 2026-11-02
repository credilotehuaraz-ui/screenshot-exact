const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.VITE_SUPABASE_ACCESS_TOKEN;
const projectRef = 'lqwgbuxbvyxfzuffccnj';

async function truncateAll() {
  if (!token) {
    console.error("No SUPABASE_ACCESS_TOKEN en process.env");
    return;
  }
  console.log("Vaciando tablas en Supabase...");
  const sql = "TRUNCATE public.daily_records, public.audit_log, public.drivers CASCADE;";

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (res.ok) {
    console.log("SUCCESS: Base de datos Supabase vaciada totalmente!");
  } else {
    const err = await res.text();
    console.error("ERROR vaciando Supabase:", res.status, err);
  }
}

truncateAll();
