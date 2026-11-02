import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lqwgbuxbvyxfzuffccnj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxd2didXhidnl4Znp1ZmZjY25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NDYyNDQsImV4cCI6MjEwODEyMjI0NH0.8tJRIF4xVoQQpKDG8v1JtyKPtV9vT22AUk-Reem3Tps';

const supabase = createClient(supabaseUrl, supabaseKey);

const demoDrivers = [
  { id: "d1", nombre: "Juan Pérez Quispe", usuario: "jperez", email: "jperez@demo.pe", placa: "BXR-482", activo: true, creado: "2026-08-03", password: "1234" },
  { id: "d2", nombre: "María Rojas Salazar", usuario: "mrojas", email: "mrojas@demo.pe", placa: "CDK-917", activo: true, creado: "2026-08-17", password: "1234" },
  { id: "d3", nombre: "Luis Huamán Torres", usuario: "lhuaman", email: "lhuaman@demo.pe", placa: "AWT-305", activo: false, creado: "2026-06-21", password: "1234" },
];

async function seed() {
  console.log("Poblando datos iniciales en Supabase...");
  const { error: errDrivers } = await supabase.from('drivers').upsert(demoDrivers);
  if (errDrivers) console.error("Error sembrando drivers:", errDrivers);
  else console.log("SUCCESS: Conductores cargados en Supabase!");
}

seed();
