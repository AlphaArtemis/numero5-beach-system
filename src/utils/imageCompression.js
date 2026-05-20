function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Immagine non valida."));
    image.src = source;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Impossibile leggere il file."));
    reader.readAsDataURL(file);
  });
}

export async function compressImageFile(file, options = {}) {
  const { maxDimension = 1600, quality = 0.82, type = "image/jpeg" } = options;
  const source = await fileToDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Compressione immagine non disponibile.");
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Errore durante la compressione."));
          return;
        }

        resolve(result);
      },
      type,
      quality,
    );
  });

  const previewUrl = URL.createObjectURL(blob);
  return {
    blob,
    previewUrl,
    width,
    height,
    fileName: file.name,
  };
}
