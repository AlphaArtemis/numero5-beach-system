import { list } from "@vercel/blob";

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

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("Storage foto non configurato su Vercel.");
    }

    const result = await list({
      prefix: "photo-of-day/current",
      limit: 10,
    });

    const latestPhoto = [...result.blobs]
      .filter((blob) => !blob.pathname.endsWith(".json"))
      .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime())[0];
    const uploadedAt = latestPhoto?.uploadedAt ?? null;
    const versionedPhotoUrl = latestPhoto?.url && uploadedAt ? withPhotoVersion(latestPhoto.url, uploadedAt) : latestPhoto?.url ?? null;

    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json({
      photoUrl: versionedPhotoUrl,
      uploadedAt,
      pathname: latestPhoto?.pathname ?? null,
    });
  } catch (error) {
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json({
      photoUrl: null,
      uploadedAt: null,
      error: error.message || "Errore lettura foto pubblica.",
    });
  }
}
