import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

// ---- Admin session guard (same pattern as admin.functions.ts) -----------

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

async function requireAdmin() {
  const session = await useSession<{ authed?: boolean }>(sessionConfig());
  if (!session.data?.authed) throw new Error("unauthorized");
}

async function getBackend() {
  const { getExternalSupabaseAdmin } = await import(
    "@/integrations/supabase/external-client.server"
  );
  const c = getExternalSupabaseAdmin();
  if (!c) throw new Error("backend not configured");
  return c;
}

// ---- Types ---------------------------------------------------------------

export type DismissalRule = "once_per_announcement" | "once_per_session" | "every_page_load";

export type SiteAnnouncement = {
  id: string;
  title_en: string | null;
  title_ta: string | null;
  body_en: string | null;
  body_ta: string | null;
  media_url: string | null;
  media_type: string | null; // "image" | "video" | null
  target_pages: string[]; // ["*"] or list of paths like "/", "/story"
  dismissal_rule: DismissalRule;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const DISMISSAL_RULES: DismissalRule[] = [
  "once_per_announcement",
  "once_per_session",
  "every_page_load",
];

// ---- Public: fetch the active announcement for a page --------------------

export const getActiveAnnouncement = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ path: z.string().trim().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getExternalSupabaseAdmin } = await import(
      "@/integrations/supabase/external-client.server"
    );
    const sb = getExternalSupabaseAdmin();
    if (!sb) return { announcement: null as SiteAnnouncement | null };
    const { data: rows, error } = await sb
      .from("site_announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !rows) return { announcement: null as SiteAnnouncement | null };
    const match = (rows as SiteAnnouncement[]).find((r) => {
      const pages = Array.isArray(r.target_pages) ? r.target_pages : [];
      return pages.includes("*") || pages.includes(data.path);
    });
    return { announcement: match ?? null };
  });

// ---- Admin CRUD ----------------------------------------------------------

export const adminListAnnouncements = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();
    const sb = await getBackend();
    const { data, error } = await sb
      .from("site_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as SiteAnnouncement[] };
  },
);

const AnnouncementUpsert = z.object({
  id: z.string().uuid().optional().nullable(),
  title_en: z.string().trim().max(300).optional().nullable(),
  title_ta: z.string().trim().max(300).optional().nullable(),
  body_en: z.string().trim().max(20000).optional().nullable(),
  body_ta: z.string().trim().max(20000).optional().nullable(),
  media_url: z.string().trim().max(2000).optional().nullable(),
  media_type: z.enum(["image", "video"]).optional().nullable(),
  target_pages: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  dismissal_rule: z
    .enum(["once_per_announcement", "once_per_session", "every_page_load"])
    .default("once_per_announcement"),
  is_active: z.boolean().default(false),
});

export const adminSaveAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnnouncementUpsert.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    const payload = {
      title_en: data.title_en?.trim() || null,
      title_ta: data.title_ta?.trim() || null,
      body_en: data.body_en?.trim() || null,
      body_ta: data.body_ta?.trim() || null,
      media_url: data.media_url?.trim() || null,
      media_type: data.media_url?.trim() ? (data.media_type ?? null) : null,
      target_pages: data.target_pages,
      dismissal_rule: DISMISSAL_RULES.includes(data.dismissal_rule)
        ? data.dismissal_rule
        : "once_per_announcement",
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await sb
        .from("site_announcements")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: row, error } = await sb
      .from("site_announcements")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row.id as string };
  });

export const adminDeleteAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    const { error } = await sb
      .from("site_announcements")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminSetAnnouncementActive = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await getBackend();
    const { error } = await sb
      .from("site_announcements")
      .update({ is_active: data.is_active, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
