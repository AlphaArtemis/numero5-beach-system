import { list } from "@vercel/blob";

export default async function handler(request) {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
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

    return new Response(
      JSON.stringify({
        photoUrl: latestPhoto?.url ?? null,
        uploadedAt: latestPhoto?.uploadedAt ?? null,
        pathname: latestPhoto?.pathname ?? null,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        photoUrl: null,
        uploadedAt: null,
        error: error.message || "Errore lettura foto pubblica.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
