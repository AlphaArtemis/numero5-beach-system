function getAdminPin() {
  return process.env.ADMIN_PIN || process.env.VITE_ADMIN_PIN || "";
}

function getAdminAccessKey() {
  return process.env.ADMIN_ACCESS_KEY || "";
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
  const configuredAccessKey = getAdminAccessKey();
  if (!configuredPin && !configuredAccessKey) {
    return response.status(500).json({ error: "Accesso admin non configurato." });
  }

  const body = await getRequestBody(request);
  if (configuredAccessKey && body.accessKey === configuredAccessKey) {
    return response.status(200).json({ ok: true, authMode: "key" });
  }

  if (configuredPin && body.pin === configuredPin) {
    return response.status(200).json({ ok: true, authMode: "pin" });
  }

  return response.status(401).json({ error: "Accesso admin non valido." });
}
