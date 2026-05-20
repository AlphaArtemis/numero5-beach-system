import { upload } from "@vercel/blob/client";

const PHOTO_ENDPOINT = "/api/photo-of-day";
const UPLOAD_ENDPOINT = "/api/photo-of-day-upload";
const ADMIN_ENDPOINT = "/api/admin-auth";

function getFileExtension(fileName = "", contentType = "") {
  const normalizedName = fileName.toLowerCase();

  if (normalizedName.endsWith(".png")) return "png";
  if (normalizedName.endsWith(".webp")) return "webp";
  if (normalizedName.endsWith(".heic")) return "heic";
  if (normalizedName.endsWith(".heif")) return "heif";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
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

export async function verifyAdminPin(pin) {
  const response = await fetch(ADMIN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pin }),
  });

  if (!response.ok) {
    throw new Error("PIN non valido.");
  }

  return response.json();
}

export async function uploadPhotoOfTheDay({ blob, fileName, pin, onUploadProgress }) {
  const extension = getFileExtension(fileName, blob.type);
  const pathname = `photo-of-day/${Date.now()}-numero5.${extension}`;

  return upload(pathname, blob, {
    access: "public",
    contentType: blob.type || "image/jpeg",
    handleUploadUrl: UPLOAD_ENDPOINT,
    headers: {
      "x-admin-pin": pin,
    },
    onUploadProgress,
  });
}
