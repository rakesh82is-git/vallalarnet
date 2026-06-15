import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListGallery,
  adminSaveGalleryItem,
  adminDeleteGalleryItem,
  adminUploadGalleryFile,
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
};

type Draft = {
  id?: string | null;
  kind: Kind;
  title_ta: string;
  title_en: string;
  url: string;
  thumb_url: string;
  sort_order: number;
};

const emptyDraft = (kind: Kind): Draft => ({
  id: null,
  kind,
  title_ta: "",
  title_en: "",
  url: "",
  thumb_url: "",
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

  const [tab, setTab] = useState<Kind>("photo");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft("photo"));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await list();
      setItems(r.items as Item[]);
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
    });
    setTab(it.kind);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setDraft(emptyDraft(tab));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title_ta.trim() || !draft.title_en.trim() || !draft.url.trim()) {
      toast.error("Title (TA/EN) and URL are required");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: draft.id || undefined,
          kind: draft.kind,
          title_ta: draft.title_ta.trim(),
          title_en: draft.title_en.trim(),
          url: draft.url.trim(),
          thumb_url: draft.thumb_url.trim() || null,
          sort_order: Number(draft.sort_order) || 0,
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
              className={inputCls}
            />
          </Field>
          <Field label="Title (English)">
            <input
              type="text"
              value={draft.title_en}
              onChange={(e) => setDraft({ ...draft, title_en: e.target.value })}
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

        {tab !== "photo" && (
          <>
            <Field label="Thumbnail URL (optional)">
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