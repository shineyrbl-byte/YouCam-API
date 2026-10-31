"use client";

// Scale a photo for upload (YouCam SD needs >= 480px short side; we keep up to 1600px long side)
// and make a tiny thumbnail for the evidence timeline.
export async function prepareImage(source: Blob) {
  const bitmap = await createImageBitmap(source);
  const upload = await draw(bitmap, 1600, "blob", 0.92);
  const thumbnail = await draw(bitmap, 240, "dataurl", 0.7);
  const shortSide = Math.min(bitmap.width, bitmap.height);
  bitmap.close();
  return { upload: upload as Blob, thumbnail: thumbnail as string, shortSide };
}

async function draw(bitmap: ImageBitmap, maxSide: number, as: "blob" | "dataurl", quality: number) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (as === "dataurl") return canvas.toDataURL("image/jpeg", quality);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read photo"))), "image/jpeg", quality),
  );
}
