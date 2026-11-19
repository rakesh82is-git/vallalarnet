export type DocumentPageImage = { bytes: Uint8Array; width: number; height: number };

async function jpeg(canvas: HTMLCanvasElement): Promise<DocumentPageImage> {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (value) => value ? resolve(value) : reject(new Error("Unable to convert the document image.")),
    "image/jpeg", 0.86,
  ));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
}

export async function* renderManualDocument(url: string): AsyncGenerator<DocumentPageImage> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The uploaded file could not be retrieved.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The uploaded file is empty.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 50 * 1024 * 1024) throw new Error("The uploaded file exceeds the 50 MB archive limit.");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  chunks.length = 0;
  if (new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") {
    const pdfjs = await import("pdfjs-dist");
    const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const task = pdfjs.getDocument({ data: bytes });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 300) throw new Error("This PDF exceeds the 300-page archive limit.");
      for (let index = 1; index <= pdf.numPages; index++) {
        const page = await pdf.getPage(index);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 1400 / Math.max(base.width, base.height)) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport, background: "white" }).promise;
        yield await jpeg(canvas);
        canvas.width = 0; canvas.height = 0;
        page.cleanup();
      }
    } finally { await task.destroy(); }
  } else {
    const imageUrl = URL.createObjectURL(new Blob([bytes]));
    try {
      const image = new Image(); image.src = imageUrl;
      await image.decode();
      const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image conversion is unavailable in this browser.");
      context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      yield await jpeg(canvas);
      canvas.width = 0; canvas.height = 0;
    } finally { URL.revokeObjectURL(imageUrl); }
  }
}