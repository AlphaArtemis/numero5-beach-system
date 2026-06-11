import { handleUpload } from "@vercel/blob/client";

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
      return null;
    }
  }

  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.json === "function") {
    return request.json().catch(() => null);
  }

  return null;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  const body = await getRequestBody(request);
  if (!body) {
    return response.status(400).json({ error: "Body non valido." });
  }

  const isTokenRequest = body.type === "blob.generate-client-token";
  if (isTokenRequest) {
    const configuredPin = getAdminPin();
    const configuredAccessKey = getAdminAccessKey();
    const providedPin =
      request.headers?.["x-admin-pin"] ||
      request.headers?.["X-Admin-Pin"] ||
      (typeof request.headers?.get === "function" ? request.headers.get("x-admin-pin") : undefined);
    const providedAccessKey =
      request.headers?.["x-admin-key"] ||
      request.headers?.["X-Admin-Key"] ||
      (typeof request.headers?.get === "function" ? request.headers.get("x-admin-key") : undefined);

    if (!configuredPin && !configuredAccessKey) {
      return response.status(500).json({ error: "Accesso admin non configurato." });
    }

    const hasValidAccessKey = configuredAccessKey && providedAccessKey === configuredAccessKey;
    const hasValidPin = configuredPin && providedPin === configuredPin;

    if (!hasValidAccessKey && !hasValidPin) {
      return response.status(401).json({ error: "Accesso admin richiesto." });
    }
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("Storage foto non configurato su Vercel.");
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
        maximumSizeInBytes: 4_000_000,
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60 * 60 * 24 * 7,
        validUntil: new Date(Date.now() + 5 * 60 * 1000),
      }),
      onUploadCompleted: async () => {},
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    const statusCode = error.message === "Storage foto non configurato su Vercel." ? 500 : 400;
    return response.status(statusCode).json({ error: error.message || "Errore upload blob." });
  }
}
