import { upload } from "@vercel/blob/client";

const PHOTO_ENDPOINT = "/api/photo-of-day";
const UPLOAD_ENDPOINT = "/api/photo-of-day-upload";
const ADMIN_ENDPOINT = "/api/admin-auth";
const PHOTO_OF_DAY_PATHNAME = "photo-of-day/current.jpg";

function withPhotoVersion(url, versionValue) {
  if (!url) return url;

  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set("v", String(versionValue));
    return parsedUrl.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${encodeURIComponent(String(versionValue))}`;
  }
}

export async function fetchPhotoOfTheDay() {
  const response = await fetch(PHOTO_ENDPOINT, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Errore recupero foto del giorno.");
  }

  return response.json();
}

export async function verifyAdminAccess({ pin, accessKey } = {}) {
  const response = await fetch(ADMIN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pin, accessKey }),
  });

  if (!response.ok) {
    throw new Error("Accesso admin non valido.");
  }

  return response.json();
}

export async function uploadPhotoOfTheDay({ blob, pin, accessKey, onUploadProgress }) {
  const versionStamp = Date.now();
  const result = await upload(PHOTO_OF_DAY_PATHNAME, blob, {
    access: "public",
    contentType: blob.type || "image/jpeg",
    handleUploadUrl: UPLOAD_ENDPOINT,
    headers: {
      ...(pin ? { "x-admin-pin": pin } : {}),
      ...(accessKey ? { "x-admin-key": accessKey } : {}),
    },
    onUploadProgress,
  });

  return {
    ...result,
    url: withPhotoVersion(result.url, versionStamp),
  };
}
