const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '0ec51f54fed84b07b16e391ca1448a5c';
const token = process.env.CLOUDFLARE_API_TOKEN;

async function createProject() {
  if (!token) {
    console.error("No CLOUDFLARE_API_TOKEN en process.env");
    return;
  }
  console.log("Creando proyecto en Cloudflare Pages...");
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'control-cabify',
      production_branch: 'main'
    })
  });

  const data = await res.json();
  console.log("Respuesta Cloudflare:", JSON.stringify(data, null, 2));
}

createProject();
