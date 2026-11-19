import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { randomUUID } from "crypto";

const SESSION_NAME = "vd_admin";

function sessionConfig() {
  const envSecret = process.env.ADMIN_SESSION_SECRET;
  if (!envSecret || envSecret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not configured or is shorter than 32 characters",
    );
  }
  return {
    password: envSecret,
    name: SESSION_NAME,
    maxAge: 60 * 60 * 8,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "none" as const,
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
    z
      .object({
        username: z.string().min(1).max(100),
        password: z.string().min(1).max(300),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const adminUsername = process.env.ADMIN_USERNAME?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();
    if (!adminUsername || !adminPassword) {
      throw new Error(
        "ADMIN_USERNAME and ADMIN_PASSWORD must be configured as environment variables",
      );
    }
    if (data.username.trim() !== adminUsername || data.password !== adminPassword) {
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
    const rows = ((data ?? []) as unknown) as Array<Record<string, unknown>>;
    return { csv: toCsv(rows, SAFE_COLS), count: rows.length };
  },
);

// Metadata-only cursor pages. Every request independently verifies the admin cookie.
export const adminExportSignaturesPage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    cursor: z.string().uuid().nullable(),
    snapshot: z.string().datetime().nullable(),
    scope: z.enum(["digital", "manual"]),
  }).parse(input))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    const { EXPORT_PAGE_SIZE } = await import("@/lib/signature-export");
    const snapshot = data.snapshot ?? new Date().toISOString();
    let query = sb.from("signatures")
      .select([...SAFE_COLS, "locality", ...(data.scope === "manual" ? ["manual_signature_count", "manual_document_url"] : [])].join(","))
      .lte("created_at", snapshot)
      .order("id", { ascending: true })
      .limit(EXPORT_PAGE_SIZE);
    if (data.scope === "manual") {
      query = query.or("kind.eq.manual,manual_document_url.not.is.null");
    } else {
      query = query.or("kind.eq.digital,kind.is.null").is("manual_document_url", null);
    }
    if (data.cursor) query = query.gt("id", data.cursor);
    const { data: records, error } = await query;
    if (error) {
      console.error("[signature export] page query failed", { code: error.code });
      throw new Error("Unable to load signatures. Please try again.");
    }
    const rows = (records ?? []) as unknown as Array<Record<string, unknown>>;
    const ids = rows.map((row) => String(row.id));
    const referrals = new Map<string, { source: string; other_text: string | null }>();
    // Best-effort analytics can be absent for older signatures.
    if (ids.length) {
      const { data: referralRows, error: referralError } = await sb.from("referral_sources")
        .select("signature_id,source,other_text").in("signature_id", ids);
      if (referralError) {
        console.error("[signature export] referral query failed", { code: referralError.code });
        throw new Error("Unable to load referral details. Please try again.");
      }
      for (const row of referralRows ?? []) referrals.set(row.signature_id, row);
    }
    // Temporary transport URLs are used only to embed manual attachments, never written to Excel.
    const paths = [...new Set(rows.map((row) => row.manual_document_url)
      .filter((url): url is string => typeof url === "string" && !!url && !/^https?:\/\//i.test(url)))];
    const links = new Map<string, string>();
    if (paths.length) {
      const { data: signed, error: storageError } = await sb.storage.from("petition-manual")
        .createSignedUrls(paths, 60 * 60);
      if (storageError) throw new Error("Unable to prepare document links. Please try again.");
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) links.set(item.path, item.signedUrl);
      }
    }
    const result: import("@/lib/signature-export").ExportRow[] = rows.map((row) => {
      const referral = referrals.get(String(row.id));
      const stored = row.manual_document_url;
      const manual = Boolean(stored || row.kind === "manual");
      const safe: import("@/lib/signature-export").ExportRow = {};
      for (const [key, value] of Object.entries(row)) {
        safe[key] = typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : null;
      }
      return {
        ...safe,
        manual_document_url: typeof stored === "string" ? (links.get(stored) ?? stored) : null,
        referral_source: referral?.source ?? null,
        referral_other: referral?.other_text ?? null,
        signature_status: manual ? "Paper document" : "Digitally signed",
      };
    });
    return {
      rows: result,
      nextCursor: rows.length === EXPORT_PAGE_SIZE ? String(rows[rows.length - 1].id) : null,
      snapshot,
    };
  });

type GalleryItem = {
  id: string;
  kind: "photo" | "video" | "fieldwork";
  title_ta: string;
  title_en: string;
  url: string;
  thumb_url: string | null;
  sort_order: number;
  created_at: string;
  event_id?: string | null;
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
  event_id: z.string().uuid().optional().nullable(),
});

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function deriveThumbUrl(url: string): string | null {
  const yt = extractYouTubeId(url);
  if (yt) return `https://img.youtube.com/vi/${yt}/maxresdefault.jpg`;
  if (/\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(url)) return url;
  return null;
}

export const adminSaveGalleryItem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GalleryUpsert.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    const thumb = (data.thumb_url && data.thumb_url.trim())
      ? data.thumb_url.trim()
      : deriveThumbUrl(data.url);
    const payload = {
      kind: data.kind,
      title_ta: data.title_ta,
      title_en: data.title_en,
      url: data.url,
      thumb_url: thumb,
      sort_order: data.sort_order ?? 0,
      event_id: data.kind === "fieldwork" ? (data.event_id ?? null) : null,
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
        cacheControl: "public, max-age=31536000, immutable",
      });
    if (upErr)
      return { ok: false as const, error: upErr.message ?? "upload" };

    const { data: pub } = sb.storage.from("gallery").getPublicUrl(path);
    return { ok: true as const, url: pub.publicUrl, path };
  });

// ---- Fieldwork events --------------------------------------------------

type FieldworkEvent = {
  id: string;
  title_ta: string;
  title_en: string;
  caption_ta: string | null;
  caption_en: string | null;
  event_date: string | null;
  location: string | null;
  sort_order: number;
  created_at: string;
};

export const adminListFieldworkEvents = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();
    const sb = await getBackend();
    const { data, error } = await sb
      .from("fieldwork_events")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("event_date", { ascending: false });
    if (error) return { items: [] as FieldworkEvent[], error: error.message };
    return { items: (data ?? []) as FieldworkEvent[] };
  },
);

const FieldworkEventUpsert = z.object({
  id: z.string().uuid().optional().nullable(),
  title_ta: z.string().trim().min(1).max(300),
  title_en: z.string().trim().min(1).max(300),
  caption_ta: z.string().trim().max(4000).optional().nullable(),
  caption_en: z.string().trim().max(4000).optional().nullable(),
  event_date: z.string().trim().max(20).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const adminSaveFieldworkEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FieldworkEventUpsert.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    const payload = {
      title_ta: data.title_ta,
      title_en: data.title_en,
      caption_ta: data.caption_ta?.trim() || null,
      caption_en: data.caption_en?.trim() || null,
      event_date: data.event_date?.trim() || null,
      location: data.location?.trim() || null,
      sort_order: data.sort_order ?? 0,
    };
    if (data.id) {
      const { error } = await sb
        .from("fieldwork_events")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: row, error } = await sb
      .from("fieldwork_events")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row.id as string };
  });

export const adminDeleteFieldworkEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    // Detach items first so they aren't deleted by FK
    await sb
      .from("gallery_items")
      .update({ event_id: null })
      .eq("event_id", data.id);
    const { error } = await sb
      .from("fieldwork_events")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Campaign updates (bilingual newsfeed) ----------------------------

type CampaignUpdate = {
  id: string;
  title_en: string | null;
  title_ta: string | null;
  content_en: string | null;
  content_ta: string | null;
  media_url: string | null;
  status: "draft" | "published";
  is_pinned: boolean;
  created_at: string;
  gallery_item_id: string | null;
  external_url: string | null;
  fieldwork_event_id: string | null;
};

const CAMPAIGN_BUCKET = "campaign-media";

async function signedMediaUrl(
  sb: Awaited<ReturnType<typeof getBackend>>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  // Already a full URL (legacy / external) — return as-is
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await sb.storage
    .from(CAMPAIGN_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export const adminListCampaignUpdates = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();
    const sb = await getBackend();
    const { data, error } = await sb
      .from("campaign_updates")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as CampaignUpdate[];
    const items = await Promise.all(
      rows.map(async (r) => ({
        ...r,
        media_preview_url: await signedMediaUrl(sb, r.media_url),
      })),
    );
    return { items };
  },
);

const CampaignUpsert = z.object({
  id: z.string().uuid().optional().nullable(),
  title_en: z.string().trim().max(300).optional().nullable(),
  title_ta: z.string().trim().max(300).optional().nullable(),
  content_en: z.string().trim().max(20000).optional().nullable(),
  content_ta: z.string().trim().max(20000).optional().nullable(),
  media_url: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
  is_pinned: z.boolean().default(false),
  gallery_item_id: z.string().uuid().optional().nullable(),
  fieldwork_event_id: z.string().uuid().optional().nullable(),
  external_url: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .refine(
      (v) => !v || /^https?:\/\//i.test(v),
      "External URL must start with http(s)://",
    ),
});

export const adminSaveCampaignUpdate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CampaignUpsert.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    const payload = {
      title_en: data.title_en?.trim() || null,
      title_ta: data.title_ta?.trim() || null,
      content_en: data.content_en?.trim() || null,
      content_ta: data.content_ta?.trim() || null,
      media_url: data.media_url?.trim() || null,
      status: data.status,
      is_pinned: data.is_pinned,
      gallery_item_id: data.gallery_item_id || null,
      fieldwork_event_id: data.fieldwork_event_id || null,
      external_url: data.external_url?.trim() || null,
    };
    if (data.id) {
      const { error } = await sb
        .from("campaign_updates")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: row, error } = await sb
      .from("campaign_updates")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row.id as string };
  });

export const adminDeleteCampaignUpdate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    // Best-effort: remove the stored object if it lives in our bucket
    const { data: row } = await sb
      .from("campaign_updates")
      .select("media_url")
      .eq("id", data.id)
      .single();
    const path = (row?.media_url as string | null) ?? null;
    if (path && !/^https?:\/\//i.test(path)) {
      await sb.storage.from(CAMPAIGN_BUCKET).remove([path]).catch(() => {});
    }
    const { error } = await sb
      .from("campaign_updates")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const CampaignUpload = z.object({
  filename: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(150),
  base64: z.string().min(10).max(80_000_000),
});

export const adminUploadCampaignMedia = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CampaignUpload.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    try {
      await sb.storage.createBucket(CAMPAIGN_BUCKET, { public: false });
    } catch {
      /* exists */
    }
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength === 0)
      return { ok: false as const, error: "empty" as const };
    if (bytes.byteLength > 50_000_000)
      return { ok: false as const, error: "too_large" as const };
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const path = `${randomUUID()}_${safe}`;
    const { error: upErr } = await sb.storage
      .from(CAMPAIGN_BUCKET)
      .upload(path, bytes, {
        contentType: data.contentType,
        upsert: false,
        cacheControl: "public, max-age=31536000, immutable",
      });
    if (upErr)
      return { ok: false as const, error: upErr.message ?? "upload" };
    const { data: signed } = await sb.storage
      .from(CAMPAIGN_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    return {
      ok: true as const,
      path,
      preview_url: signed?.signedUrl ?? null,
    };
  });