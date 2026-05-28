function getAdminPin() {
  return process.env.ADMIN_PIN || process.env.VITE_ADMIN_PIN || "";
}

async function getRequestBody(request) {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }

  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.json === "function") {
    return request.json().catch(() => ({}));
  }

  return {};
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  const configuredPin = getAdminPin();
  if (!configuredPin) {
    return response.status(500).json({ error: "Admin PIN non configurato." });
  }

  const body = await getRequestBody(request);
  if (body.pin !== configuredPin) {
    return response.status(401).json({ error: "PIN non valido." });
  }

  return response.status(200).json({ ok: true });
}
