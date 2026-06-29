import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID } from "crypto";

const BUCKET = "vpn-user-assets";

function readR2Env() {
  const accessKeyId =
    process.env.VITE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.VITE_R2_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.VITE_R2_ENDPOINT || process.env.R2_ENDPOINT;
  const publicUrl = (
    process.env.VITE_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    ""
  ).replace(/\/+$/, "");
  if (!accessKeyId || !secretAccessKey || !endpoint || !publicUrl) {
    throw new Error(
      "R2 is not configured (need VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_ENDPOINT, VITE_R2_PUBLIC_URL)",
    );
  }
  return { accessKeyId, secretAccessKey, endpoint, publicUrl };
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

const PresignPayload = z.object({
  filename: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(150),
  prefix: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-zA-Z0-9/_-]*$/)
    .optional()
    .default(""),
});

export const getR2PresignedUpload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PresignPayload.parse(d))
  .handler(async ({ data }) => {
    const { accessKeyId, secretAccessKey, endpoint, publicUrl } = readR2Env();
    const { S3Client, PutObjectCommand } = await import(
      "@aws-sdk/client-s3"
    );
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    const safe = sanitize(data.filename);
    const day = new Date().toISOString().slice(0, 10);
    const prefix = data.prefix ? `${data.prefix.replace(/^\/|\/$/g, "")}/` : "";
    const key = `${prefix}${day}/${randomUUID()}_${safe}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: data.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });
    const uploadUrl = await getSignedUrl(client, cmd, { expiresIn: 60 * 10 });

    return {
      uploadUrl,
      key,
      publicUrl: `${publicUrl}/${key}`,
    };
  });