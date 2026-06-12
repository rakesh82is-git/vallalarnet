import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomUUID } from "crypto";

type ManualItem = {
  id: string;
  name: string;
  document_title: string | null;
  url: string | null;
  is_pdf: boolean;
  created_at: string;
};

type SignatureItem = {
  id: string;
  created_at: string;
  name: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  message: string | null;
  signature_svg: string | null;
  scan_url: string | null;
};

type SignatureRow = {
  country: string | null;
  state: string | null;
  district: string | null;
  created_at: string;
};

type GalleryItem = {
  id: string;
  kind: "photo" | "video" | "fieldwork";
  url: string;
  thumb_url: string | null;
  title_ta: string;
  title_en: string;
  sort_order: number;
};

function emptyStats() {
  return {
    total: 0,
    countries: 0,
    districts: 0,
    series: [] as Array<{ day: string; daily: number; cumulative: number }>,
    regions: [] as Array<{ label: string; count: number }>,
    countryList: [] as Array<{ label: string; count: number }>,
    recent: [] as Array<{ name: string | null; district: string | null; state: string | null; created_at: string }>,
    goal: 100_000,
  };
}

async function getBackendClient() {
  const { getExternalSupabaseAdmin } = await import("@/integrations/supabase/external-client.server");
  return getExternalSupabaseAdmin();
}

const DigitalSignaturePayload = z.object({
  name: z.string().trim().min(1).max(100),
  age: z.number().int().min(1).max(120),
  country: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  district: z.string().trim().min(1).max(80),
  mobile_number: z.string().trim().min(6).max(20),
  signature_image: z.string().max(800_000),
});

const ManualSignaturePayload = z.object({
  name: z.string().trim().min(1).max(100),
  mobile_number: z.string().trim().min(6).max(20),
  document_title: z.string().trim().min(1).max(200),
  file_data_url: z.string().min(30).max(8_000_000),
  file_name: z.string().trim().min(1).max(200),
});

function mask(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length < 4) return "••••";
  return `${"•".repeat(Math.max(d.length - 4, 4))}${d.slice(-4)}`;
}

function hashPhone(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  return createHash("sha256").update(`vadalur:${digits}`).digest("hex");
}

export const submitDigitalSignature = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => DigitalSignaturePayload.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getBackendClient();
    if (!supabaseAdmin) return { ok: false as const, error: "config" as const };

    const phoneHash = hashPhone(data.mobile_number);

    const { data: existingMobile } = await supabaseAdmin
      .from("signatures")
      .select("id")
      .eq("mobile_number", data.mobile_number)
      .maybeSingle();
    if (existingMobile) return { ok: false as const, error: "duplicate" as const };

    const { data: row, error } = await supabaseAdmin
      .from("signatures")
      .insert({
        name: data.name,
        full_name: data.name,
        age: data.age,
        country: data.country,
        state: data.state,
        district: data.district,
        mobile_number: data.mobile_number,
        phone_number: data.mobile_number,
        signature_image: data.signature_image,
        kind: "digital",
        consent: true,
        phone_hash: phoneHash,
        phone_masked: mask(data.mobile_number),
      })
      .select("id, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "duplicate" as const };
      }
      return { ok: false as const, error: "db" as const };
    }

    const { count } = await supabaseAdmin
      .from("signatures")
      .select("*", { count: "exact", head: true });

    return {
      ok: true as const,
      id: row.id as string,
      voteNumber: count ?? 1,
    };
  });

export const submitManualSignature = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ManualSignaturePayload.parse(data))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getBackendClient();
    if (!supabaseAdmin) return { ok: false as const, error: "config" as const };

    const phoneHash = hashPhone(data.mobile_number);

    const { data: existingMobile } = await supabaseAdmin
      .from("signatures")
      .select("id")
      .eq("mobile_number", data.mobile_number)
      .maybeSingle();
    if (existingMobile) return { ok: false as const, error: "duplicate" as const };

    // Decode the data URL → bytes
    const match = /^data:([^;,]+);base64,(.+)$/.exec(data.file_data_url);
    if (!match) return { ok: false as const, error: "bad_file" as const };
    const contentType = match[1];
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(contentType)) {
      return { ok: false as const, error: "bad_file" as const };
    }
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.byteLength > 6_000_000) {
      return { ok: false as const, error: "too_large" as const };
    }

    const ext =
      contentType === "application/pdf"
        ? "pdf"
        : contentType === "image/png"
          ? "png"
          : contentType === "image/webp"
            ? "webp"
            : "jpg";
    const safeName = data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
    const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}_${safeName}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("petition-manual")
      .upload(path, bytes, { contentType, upsert: false });
    if (uploadError) return { ok: false as const, error: "upload" as const };

    const { data: row, error } = await supabaseAdmin
      .from("signatures")
      .insert({
        name: data.name,
        full_name: data.name,
        mobile_number: data.mobile_number,
        phone_number: data.mobile_number,
        document_title: data.document_title,
        manual_document_url: path,
        kind: "manual",
        consent: true,
        phone_hash: phoneHash,
        phone_masked: mask(data.mobile_number),
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "duplicate" as const };
      }
      return { ok: false as const, error: "db" as const };
    }

    const { count } = await supabaseAdmin
      .from("signatures")
      .select("*", { count: "exact", head: true });

    return { ok: true as const, id: row.id as string, voteNumber: count ?? 1 };
  });

export const listManualSignatures = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabaseAdmin = await getBackendClient();
    if (!supabaseAdmin) return { items: [] as ManualItem[] };

    const { data: rows } = await supabaseAdmin
      .from("signatures")
      .select("id, name, document_title, manual_document_url, created_at")
      .eq("kind", "manual")
      .not("manual_document_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(24);

    const items = await Promise.all(
      ((rows ?? []) as Array<{ id: string; name: string; document_title: string | null; manual_document_url: string | null; created_at: string }>).map(async (r) => {
        const path = r.manual_document_url as string;
        const { data: signed } = await supabaseAdmin.storage
          .from("petition-manual")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        const isPdf = path.toLowerCase().endsWith(".pdf");
        return {
          id: r.id as string,
          name: r.name as string,
          document_title: r.document_title as string | null,
          url: signed?.signedUrl ?? null,
          is_pdf: isPdf,
          created_at: r.created_at as string,
        };
      }),
    );

    return { items: items.filter((i: ManualItem) => i.url) };
  });

export const listSignatures = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(60).optional(),
        before: z.string().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await getBackendClient();
    if (!supabaseAdmin) return { items: [] as SignatureItem[], nextCursor: null as string | null };

    const limit = data.limit ?? 24;
    let q = supabaseAdmin
      .from("signatures_public")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (data.before) q = q.lt("created_at", data.before);
    const { data: rows, error } = await q;
    if (error) return { items: [], nextCursor: null };
    const hasMore = (rows?.length ?? 0) > limit;
    const items = ((rows ?? []) as SignatureItem[]).slice(0, limit);
    const nextCursor = hasMore ? items[items.length - 1].created_at : null;
    return { items, nextCursor };
  });

export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await getBackendClient();
  if (!supabaseAdmin) return emptyStats();

  const { count: total } = await supabaseAdmin
    .from("signatures")
    .select("*", { count: "exact", head: true });

  const { data: rows } = await supabaseAdmin
    .from("signatures")
    .select("country, state, district, created_at")
    .order("created_at", { ascending: true })
    .limit(5000);

  const list = ((rows ?? []) as SignatureRow[]).map((r: SignatureRow) => ({
    country: (r.country ?? "").trim(),
    state: (r.state ?? "").trim(),
    district: (r.district ?? "").trim(),
    created_at: r.created_at,
  }));
  const countries = new Set(list.map((r) => r.country).filter(Boolean)).size;
  const districts = new Set(
    list.filter((r) => r.state || r.district).map((r) => `${r.state}::${r.district}`),
  ).size;

  const byDay = new Map<string, number>();
  for (const r of list) {
    const day = (r.created_at as string).slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  let cum = 0;
  const series = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, n]) => {
      cum += n;
      return { day, daily: n, cumulative: cum };
    });

  const topRegion = new Map<string, number>();
  for (const r of list) {
    if (!r.district && !r.state) continue;
    const key = `${r.district}, ${r.state}`;
    topRegion.set(key, (topRegion.get(key) ?? 0) + 1);
  }
  const regions = Array.from(topRegion.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const countryCount = new Map<string, number>();
  for (const r of list) {
    if (!r.country) continue;
    countryCount.set(r.country, (countryCount.get(r.country) ?? 0) + 1);
  }
  const countryList = Array.from(countryCount.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const { data: recent } = await supabaseAdmin
    .from("signatures_public")
    .select("name, district, state, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  return {
    total: total ?? 0,
    countries,
    districts,
    series,
    regions,
    countryList,
    recent: recent ?? [],
    goal: 100_000,
  };
});

export const listGallery = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await getBackendClient();
  if (!supabaseAdmin) return [] as GalleryItem[];

  const { data, error } = await supabaseAdmin
    .from("gallery_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as GalleryItem[];
});