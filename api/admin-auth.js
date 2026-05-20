function getAdminPin() {
  return process.env.ADMIN_PIN || process.env.VITE_ADMIN_PIN || "";
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const configuredPin = getAdminPin();
  if (!configuredPin) {
    return new Response(JSON.stringify({ error: "Admin PIN non configurato." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => ({}));
  if (body.pin !== configuredPin) {
    return new Response(JSON.stringify({ error: "PIN non valido." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
