import { getR2PresignedUpload } from "./r2.functions";

export type R2UploadResult = { publicUrl: string; key: string };

/**
 * Uploads a File directly to the R2 'vpn-user-assets' bucket via a server-issued
 * presigned URL. Returns the public URL string to store in the DB.
 */
export async function uploadFileToR2(
  file: File,
  prefix: string = "",
): Promise<R2UploadResult> {
  const { uploadUrl, publicUrl, key } = await getR2PresignedUpload({
    data: {
      filename: file.name || "file",
      contentType: file.type || "application/octet-stream",
      prefix,
    },
  });

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 upload failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return { publicUrl, key };
}

/** Upload a Blob with an explicit filename (used for derived video thumbnails). */
export async function uploadBlobToR2(
  blob: Blob,
  filename: string,
  prefix: string = "",
): Promise<R2UploadResult> {
  const file = new File([blob], filename, {
    type: blob.type || "application/octet-stream",
  });
  return uploadFileToR2(file, prefix);
}