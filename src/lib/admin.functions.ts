import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const SESSION_NAME = "vd_admin";

function sessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET missing or too short (need >=32 chars)");
  }
  return {
    password,
    name: SESSION_NAME,
    maxAge: 60 * 60 * 8,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

async function isAdmin() {
  const session = await useSession<{ authed?: boolean }>(sessionConfig());
  return !!session.data?.authed;
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("unauthorized");
}

async function getBackend() {
  const { getExternalSupabaseAdmin } = await import(
    "@/integrations/supabase/external-client.server"
  );
  const c = getExternalSupabaseAdmin();
  if (!c) throw new Error("backend not configured");
  return c;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ password: z.string().min(1).max(300) }).parse(d),
  )
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return { ok: false as const, error: "config" as const };
    if (data.password !== expected) {
      return { ok: false as const, error: "bad" as const };
    }
    const session = await useSession<{ authed?: boolean }>(sessionConfig());
    await session.update({ authed: true });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await useSession<{ authed?: boolean }>(sessionConfig());
    await session.clear();
    return { ok: true as const };
  },
);

export const adminCheck = createServerFn({ method: "GET" }).handler(
  async () => {
    return { authed: await isAdmin() };
  },
);

// Columns considered safe to export. Excludes: signature_svg, signature_image,
// scan_url, manual_document_url, phone_number, mobile_number, phone_hash.
const SAFE_COLS = [
  "id",
  "created_at",
  "full_name",
  "name",
  "email",
  "age",
  "country",
  "state",
  "district",
  "pincode",
  "residential_address",
  "message",
  "kind",
  "document_title",
  "phone_masked",
  "consent",
  "user_id",
] as const;

function toCsv(rows: Array<Record<string, unknown>>, cols: readonly string[]) {
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return body ? `${header}\n${body}` : header;
}

export const adminExportSignaturesCsv = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();
    const sb = await getBackend();
    const { data, error } = await sb
      .from("signatures")
      .select(SAFE_COLS.join(","))
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    return { csv: toCsv(rows, SAFE_COLS), count: rows.length };
  },
);

type GalleryItem = {
  id: string;
  kind: "photo" | "video" | "fieldwork";
  title_ta: string;
  title_en: string;
  url: string;
  thumb_url: string | null;
  sort_order: number;
  created_at: string;
};

export const adminListGallery = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();
    const sb = await getBackend();
    const { data, error } = await sb
      .from("gallery_items")
      .select("*")
      .order("kind", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as GalleryItem[] };
  },
);

const GalleryUpsert = z.object({
  id: z.string().uuid().optional().nullable(),
  kind: z.enum(["photo", "video", "fieldwork"]),
  title_ta: z.string().trim().min(1).max(300),
  title_en: z.string().trim().min(1).max(300),
  url: z.string().trim().min(1).max(2000),
  thumb_url: z.string().trim().max(2000).optional().nullable(),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const adminSaveGalleryItem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GalleryUpsert.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    const payload = {
      kind: data.kind,
      title_ta: data.title_ta,
      title_en: data.title_en,
      url: data.url,
      thumb_url: data.thumb_url || null,
      sort_order: data.sort_order ?? 0,
    };
    if (data.id) {
      const { error } = await sb
        .from("gallery_items")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("gallery_items").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const adminDeleteGalleryItem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    const { error } = await sb.from("gallery_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const UploadPayload = z.object({
  kind: z.enum(["photo", "video", "fieldwork"]),
  filename: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(150),
  // base64 of the binary; ~50MB hard cap on decoded bytes
  base64: z.string().min(10).max(80_000_000),
});

export const adminUploadGalleryFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UploadPayload.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();

    // Lazily ensure the public bucket exists (ignore "already exists" errors).
    try {
      await sb.storage.createBucket("gallery", { public: true });
    } catch {
      /* exists */
    }

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength === 0)
      return { ok: false as const, error: "empty" as const };
    if (bytes.byteLength > 50_000_000)
      return { ok: false as const, error: "too_large" as const };

    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const path = `${data.kind}/${randomUUID()}_${safe}`;
    const { error: upErr } = await sb.storage
      .from("gallery")
      .upload(path, bytes, {
        contentType: data.contentType,
        upsert: false,
      });
    if (upErr)
      return { ok: false as const, error: upErr.message ?? "upload" };

    const { data: pub } = sb.storage.from("gallery").getPublicUrl(path);
    return { ok: true as const, url: pub.publicUrl, path };
  });