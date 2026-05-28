import { list } from "@vercel/blob";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("Storage foto non configurato su Vercel.");
    }

    const result = await list({
      prefix: "photo-of-day/",
      limit: 100,
    });

    const latestPhoto = [...result.blobs]
      .filter((blob) => !blob.pathname.endsWith(".json"))
      .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime())[0];

    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json({
      photoUrl: latestPhoto?.url ?? null,
      uploadedAt: latestPhoto?.uploadedAt ?? null,
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
