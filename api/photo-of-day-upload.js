import { handleUpload } from "@vercel/blob/client";

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

  const body = await request.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: "Body non valido." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isTokenRequest = body.type === "blob.generate-client-token";
  if (isTokenRequest) {
    const configuredPin = getAdminPin();
    const providedPin = request.headers.get("x-admin-pin");

    if (!configuredPin) {
      return new Response(JSON.stringify({ error: "Admin PIN non configurato." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (providedPin !== configuredPin) {
      return new Response(JSON.stringify({ error: "Accesso admin richiesto." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
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
        allowOverwrite: false,
        cacheControlMaxAge: 60 * 60 * 24 * 7,
        validUntil: new Date(Date.now() + 5 * 60 * 1000),
      }),
      onUploadCompleted: async () => {},
    });

    return new Response(JSON.stringify(jsonResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Errore upload blob." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
