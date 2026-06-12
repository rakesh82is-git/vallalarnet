import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SignaturePayload = z.object({
  kind: z.enum(["digital", "manual"]),
  name: z.string().trim().min(1).max(100),
  age: z.number().int().min(1).max(120),
  country: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  district: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(20),
  message: z.string().trim().max(200).optional().nullable(),
  consent: z.boolean(),
  signatureSvg: z.string().max(500_000).optional().nullable(),
  scanDataUrl: z.string().max(2_000_000).optional().nullable(),
});

const EmailSignaturePayload = z.object({
  full_name: z.string().trim().min(1).max(100),
  email: z.string().email().max(200),
  phone_number: z.string().trim().min(6).max(20),
  residential_address: z.string().trim().min(1).max(500),
  pincode: z.string().trim().min(1).max(12),
  signature_image: z.string().max(500_000),
});

function mask(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length < 4) return "••••";
  return `${"•".repeat(Math.max(d.length - 4, 4))}${d.slice(-4)}`;
}

export const submitSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SignaturePayload.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phoneDigits = data.phone.replace(/\D/g, "");
    const phoneHash = createHash("sha256")
      .update(`vadalur:${phoneDigits}`)
      .digest("hex");

    const { data: existing } = await supabaseAdmin
      .from("signatures")
      .select("id")
      .eq("phone_hash", phoneHash)
      .maybeSingle();
    if (existing) return { ok: false as const, error: "duplicate" as const };

    const { data: row, error } = await supabaseAdmin
      .from("signatures")
      .insert({
        kind: data.kind,
        name: data.name,
        age: data.age,
        country: data.country,
        state: data.state,
        district: data.district,
        message: data.message ?? null,
        phone_hash: phoneHash,
        phone_masked: mask(data.phone),
        signature_svg: data.signatureSvg ?? null,
        scan_url: data.scanDataUrl ?? null,
        consent: data.consent,
      })
      .select("id, created_at")
      .single();
    if (error) return { ok: false as const, error: "db" as const };

    const { count } = await supabaseAdmin
      .from("signatures")
      .select("*", { count: "exact", head: true });

    return { ok: true as const, id: row.id, voteNumber: count ?? 1 };
  });

export const submitEmailSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => EmailSignaturePayload.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const callerEmail = (context.claims as { email?: string }).email;
    if (!callerEmail || callerEmail !== data.email) {
      return { ok: false as const, error: "auth" as const };
    }

    const phoneDigits = data.phone_number.replace(/\D/g, "");
    const phoneHash = createHash("sha256")
      .update(`vadalur:${phoneDigits}`)
      .digest("hex");

    const { data: existingPhone } = await supabaseAdmin
      .from("signatures")
      .select("id")
      .eq("phone_hash", phoneHash)
      .maybeSingle();
    if (existingPhone) return { ok: false as const, error: "duplicate" as const };

    const { data: existingEmail } = await supabaseAdmin
      .from("signatures")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (existingEmail) return { ok: false as const, error: "duplicate" as const };

    const { data: row, error } = await supabaseAdmin
      .from("signatures")
      .insert({
        user_id: context.userId,
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number,
        residential_address: data.residential_address,
        pincode: data.pincode,
        signature_image: data.signature_image,
        name: data.full_name,
        kind: "digital",
        consent: true,
        phone_hash: phoneHash,
        phone_masked: mask(data.phone_number),
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "duplicate" as const };
      }
      return { ok: false as const, error: "db" as const };
    }

    return { ok: true as const, id: row.id as string };
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const items = (rows ?? []).slice(0, limit);
    const nextCursor = hasMore ? items[items.length - 1].created_at : null;
    return { items, nextCursor };
  });

export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count: total } = await supabaseAdmin
    .from("signatures")
    .select("*", { count: "exact", head: true });

  const { data: rows } = await supabaseAdmin
    .from("signatures")
    .select("country, state, district, created_at")
    .order("created_at", { ascending: true })
    .limit(5000);

  const list = (rows ?? []).map((r) => ({
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
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("gallery_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data ?? [];
});