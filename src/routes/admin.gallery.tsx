import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListGallery,
  adminSaveGalleryItem,
  adminDeleteGalleryItem,
  adminUploadGalleryFile,
  adminListFieldworkEvents,
  adminSaveFieldworkEvent,
  adminDeleteFieldworkEvent,
} from "@/lib/admin.functions";
import { toast } from "sonner";

type Kind = "photo" | "video" | "fieldwork";
type Item = {
  id: string;
  kind: Kind;
  title_ta: string;
  title_en: string;
  url: string;
  thumb_url: string | null;
  sort_order: number;
  created_at: string;
  event_id?: string | null;
};

type FwEvent = {
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

type Draft = {
  id?: string | null;
  kind: Kind;
  title_ta: string;
  title_en: string;
  url: string;
  thumb_url: string;
  sort_order: number;
  event_id: string | null;
};

const emptyDraft = (kind: Kind): Draft => ({
  id: null,
  kind,
  title_ta: "",
  title_en: "",
  url: "",
  thumb_url: "",
  sort_order: 0,
  event_id: null,
});

type EventDraft = {
  id?: string | null;
  title_ta: string;
  title_en: string;
  caption_ta: string;
  caption_en: string;
  event_date: string;
  location: string;
  sort_order: number;
};

const emptyEventDraft = (): EventDraft => ({
  id: null,
  title_ta: "",
  title_en: "",
  caption_ta: "",
  caption_en: "",
  event_date: "",
  location: "",
  sort_order: 0,
});

export const Route = createFileRoute("/admin/gallery")({
  component: AdminGallery,
});

function AdminGallery() {
  const list = useServerFn(adminListGallery);
  const save = useServerFn(adminSaveGalleryItem);
  const del = useServerFn(adminDeleteGalleryItem);
  const upload = useServerFn(adminUploadGalleryFile);
  const listEvents = useServerFn(adminListFieldworkEvents);
  const saveEvent = useServerFn(adminSaveFieldworkEvent);
  const delEvent = useServerFn(adminDeleteFieldworkEvent);

  const [tab, setTab] = useState<Kind>("photo");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft("photo"));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [events, setEvents] = useState<FwEvent[]>([]);
  const [eventDraft, setEventDraft] = useState<EventDraft>(emptyEventDraft());
  const [savingEvent, setSavingEvent] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [r, ev] = await Promise.all([list(), listEvents().catch(() => ({ items: [] as FwEvent[] }))]);
      setItems(r.items as Item[]);
      setEvents((ev.items ?? []) as FwEvent[]);
    } catch (e) {
      console.error(e);
      toast.error("Could not load gallery");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    // when switching tabs, reset the draft kind unless editing
    if (!draft.id) setDraft((d) => ({ ...d, kind: tab }));
  }, [tab]);

  const filtered = items.filter((i) => i.kind === tab);

  function startEdit(it: Item) {
    setDraft({
      id: it.id,
      kind: it.kind,
      title_ta: it.title_ta,
      title_en: it.title_en,
      url: it.url,
      thumb_url: it.thumb_url ?? "",
      sort_order: it.sort_order ?? 0,
      event_id: it.event_id ?? null,
    });
    setTab(it.kind);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setDraft(emptyDraft(tab));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // For fieldwork items grouped under an event, inherit the event's title
    // when the per-item title is blank (the event header carries the heading).
    let titleTa = draft.title_ta.trim();
    let titleEn = draft.title_en.trim();
    if (draft.kind === "fieldwork" && draft.event_id) {
      const ev = events.find((e) => e.id === draft.event_id);
      if (ev) {
        if (!titleTa) titleTa = ev.title_ta;
        if (!titleEn) titleEn = ev.title_en;
      }
    }
    if (!titleTa || !titleEn || !draft.url.trim()) {
      toast.error("Title (TA/EN) and URL are required");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: draft.id || undefined,
          kind: draft.kind,
          title_ta: titleTa,
          title_en: titleEn,
          url: draft.url.trim(),
          thumb_url: draft.thumb_url.trim() || null,
          sort_order: Number(draft.sort_order) || 0,
          event_id: draft.kind === "fieldwork" ? draft.event_id : null,
        },
      });
      toast.success(draft.id ? "Updated" : "Added");
      setDraft(emptyDraft(tab));
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      await del({ data: { id } });
      toast.success("Deleted");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventDraft.title_ta.trim() || !eventDraft.title_en.trim()) {
      toast.error("Event title (TA/EN) required");
      return;
    }
    setSavingEvent(true);
    try {
      await saveEvent({
        data: {
          id: eventDraft.id || undefined,
          title_ta: eventDraft.title_ta.trim(),
          title_en: eventDraft.title_en.trim(),
          caption_ta: eventDraft.caption_ta.trim() || null,
          caption_en: eventDraft.caption_en.trim() || null,
          event_date: eventDraft.event_date.trim() || null,
          location: eventDraft.location.trim() || null,
          sort_order: Number(eventDraft.sort_order) || 0,
        },
      });
      toast.success(eventDraft.id ? "Event updated" : "Event created");
      setEventDraft(emptyEventDraft());
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Save event failed — did you run the SQL?");
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm("Delete this event? Its items become un-grouped.")) return;
    try {
      await delEvent({ data: { id } });
      toast.success("Event deleted");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    }
  }

  function startEditEvent(ev: FwEvent) {
    setEventDraft({
      id: ev.id,
      title_ta: ev.title_ta,
      title_en: ev.title_en,
      caption_ta: ev.caption_ta ?? "",
      caption_en: ev.caption_en ?? "",
      event_date: ev.event_date ?? "",
      location: ev.location ?? "",
      sort_order: ev.sort_order ?? 0,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleFile(file: File, target: "url" | "thumb_url") {
    if (!file) return;
    if (file.size > 50_000_000) {
      toast.error("Max file size is 50MB");
      return;
    }
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const r = await upload({
        data: {
          kind: draft.kind,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          base64,
        },
      });
      if (!r.ok) {
        toast.error(`Upload failed: ${r.error}`);
        return;
      }
      setDraft((d) => ({ ...d, [target]: r.url }));
      toast.success("Uploaded");
    } catch (e) {
      console.error(e);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Gallery Management</h1>

      <div className="flex gap-2 text-sm">
        {(["photo", "video", "fieldwork"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 ring-1 ring-border ${
              tab === k ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"
            }`}
          >
            {k === "photo" ? "Photos" : k === "video" ? "Videos" : "Fieldwork"}
          </button>
        ))}
      </div>

      {tab === "fieldwork" && (
        <section className="rounded-3xl bg-card ring-1 ring-border p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold">
              {eventDraft.id ? "Edit event" : "Add fieldwork event"}
            </h2>
            {eventDraft.id && (
              <button
                type="button"
                onClick={() => setEventDraft(emptyEventDraft())}
                className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Cancel edit
              </button>
            )}
          </div>
          <form onSubmit={handleSaveEvent} className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Title (Tamil)">
                <input type="text" value={eventDraft.title_ta}
                  onChange={(e) => setEventDraft({ ...eventDraft, title_ta: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="Title (English)">
                <input type="text" value={eventDraft.title_en}
                  onChange={(e) => setEventDraft({ ...eventDraft, title_en: e.target.value })}
                  className={inputCls} />
              </Field>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Caption (Tamil)">
                <textarea rows={3} value={eventDraft.caption_ta}
                  onChange={(e) => setEventDraft({ ...eventDraft, caption_ta: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="Caption (English)">
                <textarea rows={3} value={eventDraft.caption_en}
                  onChange={(e) => setEventDraft({ ...eventDraft, caption_en: e.target.value })}
                  className={inputCls} />
              </Field>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="Date">
                <input type="date" value={eventDraft.event_date}
                  onChange={(e) => setEventDraft({ ...eventDraft, event_date: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="Location">
                <input type="text" value={eventDraft.location}
                  onChange={(e) => setEventDraft({ ...eventDraft, location: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="Sort order">
                <input type="number" value={eventDraft.sort_order}
                  onChange={(e) => setEventDraft({ ...eventDraft, sort_order: Number(e.target.value) })}
                  className={inputCls} />
              </Field>
            </div>
            <button type="submit" disabled={savingEvent}
              className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {savingEvent ? "Saving…" : eventDraft.id ? "Save event" : "Add event"}
            </button>
          </form>

          {events.length > 0 && (
            <ul className="grid sm:grid-cols-2 gap-2 pt-2">
              {events.map((ev) => (
                <li key={ev.id} className="rounded-xl ring-1 ring-border p-3 text-sm">
                  <p className="font-medium">{ev.title_en}</p>
                  <p className="text-xs text-muted-foreground">{ev.title_ta}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {[ev.event_date, ev.location].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => startEditEvent(ev)}
                      className="text-xs rounded-full px-3 py-1 ring-1 ring-border hover:bg-secondary">Edit</button>
                    <button onClick={() => handleDeleteEvent(ev.id)}
                      className="text-xs rounded-full px-3 py-1 ring-1 ring-destructive/40 text-destructive hover:bg-destructive/10">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <form
        onSubmit={handleSave}
        className="rounded-3xl bg-card ring-1 ring-border p-5 md:p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold">
            {draft.id ? "Edit item" : `Add new ${tab}`}
          </h2>
          {draft.id && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Title (Tamil)">
            <input
              type="text"
              value={draft.title_ta}
              onChange={(e) => setDraft({ ...draft, title_ta: e.target.value })}
              placeholder={tab === "fieldwork" ? "Leave blank to use event title" : ""}
              className={inputCls}
            />
          </Field>
          <Field label="Title (English)">
            <input
              type="text"
              value={draft.title_en}
              onChange={(e) => setDraft({ ...draft, title_en: e.target.value })}
              placeholder={tab === "fieldwork" ? "Leave blank to use event title" : ""}
              className={inputCls}
            />
          </Field>
        </div>

        <Field
          label={
            tab === "photo"
              ? "Image URL (or upload below)"
              : "Video / source URL (YouTube link or uploaded file URL)"
          }
        >
          <input
            type="url"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            placeholder={tab === "video" ? "https://youtube.com/... or upload a file" : "https://..."}
            className={inputCls}
          />
        </Field>

        <Field label={`Upload ${tab === "photo" ? "image" : tab === "video" ? "video" : "media"} (optional, fills URL)`}>
          <input
            type="file"
            accept={tab === "photo" ? "image/*" : tab === "video" ? "video/*,image/*" : "video/*,image/*"}
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "url");
              e.target.value = "";
            }}
            className="text-sm"
          />
        </Field>

        {tab === "fieldwork" && (
          <Field label="Event (group this media under a fieldwork event)">
            <select
              value={draft.event_id ?? ""}
              onChange={(e) => setDraft({ ...draft, event_id: e.target.value || null })}
              className={inputCls}
            >
              <option value="">— Ungrouped —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title_en}
                  {ev.event_date ? ` (${ev.event_date})` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        {tab !== "photo" && (
          <>
            <Field label="Thumbnail URL (optional — auto-derived for YouTube links)">
              <input
                type="url"
                value={draft.thumb_url}
                onChange={(e) => setDraft({ ...draft, thumb_url: e.target.value })}
                placeholder="https://..."
                className={inputCls}
              />
            </Field>
            <Field label="Upload thumbnail image (optional)">
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f, "thumb_url");
                  e.target.value = "";
                }}
                className="text-sm"
              />
            </Field>
          </>
        )}

        <Field label="Sort order (lower = first)">
          <input
            type="number"
            value={draft.sort_order}
            onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
            className={`${inputCls} max-w-[8rem]`}
          />
        </Field>

        {uploading && (
          <p className="text-xs text-muted-foreground">Uploading…</p>
        )}

        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : draft.id ? "Save changes" : "Add item"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-display font-bold">
          Existing {tab === "photo" ? "photos" : tab === "video" ? "videos" : "fieldwork"} ({filtered.length})
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No items yet.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((it) => (
              <li key={it.id} className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
                <div className="aspect-[4/3] bg-secondary overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.thumb_url || it.url}
                    alt={it.title_en}
                    className="w-full h-full object-cover"
                    onError={(e) => ((e.currentTarget.style.display = "none"))}
                  />
                </div>
                <div className="p-3 space-y-2">
                  <p className="font-medium text-sm line-clamp-1">{it.title_en}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{it.title_ta}</p>
                  <p className="text-[10px] font-mono text-muted-foreground break-all line-clamp-1">{it.url}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => startEdit(it)}
                      className="text-xs rounded-full px-3 py-1 ring-1 ring-border hover:bg-secondary"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(it.id)}
                      className="text-xs rounded-full px-3 py-1 ring-1 ring-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl ring-1 ring-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}