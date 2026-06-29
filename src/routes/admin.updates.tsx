import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListCampaignUpdates,
  adminSaveCampaignUpdate,
  adminDeleteCampaignUpdate,
  adminListGallery,
  adminListFieldworkEvents,
} from "@/lib/admin.functions";
import { uploadFileToR2 } from "@/lib/r2-upload";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/updates")({
  component: AdminUpdatesPage,
});

type Status = "draft" | "published";

type CampaignRow = {
  id: string;
  title_en: string | null;
  title_ta: string | null;
  content_en: string | null;
  content_ta: string | null;
  media_url: string | null;
  media_preview_url?: string | null;
  status: Status;
  is_pinned: boolean;
  created_at: string;
  gallery_item_id: string | null;
  external_url: string | null;
  fieldwork_event_id: string | null;
};

type Draft = {
  id: string | null;
  title_en: string;
  title_ta: string;
  content_en: string;
  content_ta: string;
  media_url: string;
  media_preview_url: string | null;
  status: Status;
  is_pinned: boolean;
  gallery_item_id: string | null;
  external_url: string;
  fieldwork_event_id: string | null;
};

const emptyDraft = (): Draft => ({
  id: null,
  title_en: "",
  title_ta: "",
  content_en: "",
  content_ta: "",
  media_url: "",
  media_preview_url: null,
  status: "draft",
  is_pinned: false,
  gallery_item_id: null,
  external_url: "",
  fieldwork_event_id: null,
});

function AdminUpdatesPage() {
  const list = useServerFn(adminListCampaignUpdates);
  const save = useServerFn(adminSaveCampaignUpdate);
  const remove = useServerFn(adminDeleteCampaignUpdate);
  const listGallery = useServerFn(adminListGallery);
  const listEvents = useServerFn(adminListFieldworkEvents);

  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [gallery, setGallery] = useState<
    { id: string; title_en: string; title_ta: string; kind: string; url: string; thumb_url?: string | null }[]
  >([]);
  const [events, setEvents] = useState<
    { id: string; title_en: string; title_ta: string; event_date: string | null; location: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkRef = useRef<HTMLInputElement>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number }>(
    { done: 0, total: 0 },
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await list();
      setRows(r.items as CampaignRow[]);
    } catch (e) {
      toast.error("Failed to load updates");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    listGallery()
      .then((r) => setGallery(r.items as typeof gallery))
      .catch(() => {});
  }, [listGallery]);

  useEffect(() => {
    listEvents()
      .then((r) => setEvents((r.items ?? []) as typeof events))
      .catch(() => {});
  }, [listEvents]);

  function openCreate() {
    setDraft(emptyDraft());
    setOpen(true);
  }

  function openEdit(row: CampaignRow) {
    setDraft({
      id: row.id,
      title_en: row.title_en ?? "",
      title_ta: row.title_ta ?? "",
      content_en: row.content_en ?? "",
      content_ta: row.content_ta ?? "",
      media_url: row.media_url ?? "",
      media_preview_url: row.media_preview_url ?? null,
      status: row.status,
      is_pinned: row.is_pinned,
      gallery_item_id: row.gallery_item_id ?? null,
      external_url: row.external_url ?? "",
      fieldwork_event_id: row.fieldwork_event_id ?? null,
    });
    setOpen(true);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/") && file.size > 5_000_000) {
      toast.error("Image too large (max 5MB)");
      return;
    }
    if (file.size > 50_000_000) {
      toast.error("File too large (max 50MB)");
      return;
    }
    setUploading(true);
    try {
      const r = await uploadFileToR2(file, "campaign-media");
      setDraft((d) => ({
        ...d,
        media_url: r.publicUrl,
        media_preview_url: r.publicUrl,
      }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    const linkedEvent =
      draft.fieldwork_event_id &&
      events.find((e) => e.id === draft.fieldwork_event_id);
    if (
      !linkedEvent &&
      !draft.title_en.trim() &&
      !draft.title_ta.trim() &&
      !draft.content_en.trim() &&
      !draft.content_ta.trim()
    ) {
      toast.error("Add a title or content in at least one language");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: draft.id,
          title_en: draft.title_en || (linkedEvent ? linkedEvent.title_en : ""),
          title_ta: draft.title_ta || (linkedEvent ? linkedEvent.title_ta : ""),
          content_en: draft.content_en,
          content_ta: draft.content_ta,
          media_url: draft.media_url || null,
          status: draft.status,
          is_pinned: draft.is_pinned,
          gallery_item_id: draft.fieldwork_event_id ? null : draft.gallery_item_id,
          fieldwork_event_id: draft.fieldwork_event_id,
          external_url: draft.external_url.trim() || null,
        },
      });
      toast.success(draft.id ? "Update saved" : "Update created");
      setOpen(false);
      await refresh();
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: CampaignRow) {
    if (!confirm("Delete this update? This cannot be undone.")) return;
    try {
      await remove({ data: { id: row.id } });
      toast.success("Deleted");
      await refresh();
    } catch {
      toast.error("Delete failed");
    }
  }

  async function handleBulkFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    if (
      !draft.title_en.trim() &&
      !draft.title_ta.trim() &&
      !draft.content_en.trim() &&
      !draft.content_ta.trim()
    ) {
      toast.error("Add a shared title or content before bulk uploading");
      if (bulkRef.current) bulkRef.current.value = "";
      return;
    }
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: list.length });
    let okCount = 0;
    let failCount = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        try {
          if (file.type.startsWith("image/") && file.size > 5_000_000) {
            toast.error(`${file.name}: image > 5MB, skipped`);
            failCount++;
            continue;
          }
          if (file.size > 50_000_000) {
            toast.error(`${file.name}: > 50MB, skipped`);
            failCount++;
            continue;
          }
          const up = await uploadFileToR2(file, "campaign-media");
          await save({
            data: {
              id: null,
              title_en: draft.title_en,
              title_ta: draft.title_ta,
              content_en: draft.content_en,
              content_ta: draft.content_ta,
              media_url: up.publicUrl || null,
              status: draft.status,
              is_pinned: draft.is_pinned,
              gallery_item_id: draft.gallery_item_id,
              fieldwork_event_id: draft.fieldwork_event_id,
              external_url: draft.external_url.trim() || null,
            },
          });
          okCount++;
        } catch (err) {
          console.error(err);
          failCount++;
        } finally {
          setBulkProgress({ done: i + 1, total: list.length });
        }
      }
      if (okCount) toast.success(`Created ${okCount} update${okCount === 1 ? "" : "s"}`);
      if (failCount) toast.error(`${failCount} failed`);
      if (okCount) {
        setOpen(false);
        await refresh();
      }
    } finally {
      setBulkBusy(false);
      if (bulkRef.current) bulkRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Campaign Updates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bilingual newsfeed posts. Drafts are hidden from the public site.
          </p>
        </div>
        <Button onClick={openCreate}>+ Create New Update</Button>
      </div>

      <div className="rounded-2xl ring-1 ring-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Pinned</th>
                <th className="text-left px-4 py-3 font-medium">Media</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No updates yet. Click “Create New Update” to add the first one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-3 align-top max-w-md">
                      <div className="font-medium truncate">
                        {row.title_en || row.title_ta || <span className="italic text-muted-foreground">Untitled</span>}
                      </div>
                      {row.title_ta && row.title_en && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{row.title_ta}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge variant={row.status === "published" ? "default" : "secondary"}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {row.is_pinned ? <span title="Pinned">📌</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {row.media_preview_url ? (
                        <img
                          src={row.media_preview_url}
                          alt=""
                          className="h-12 w-12 object-cover rounded ring-1 ring-border"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground text-xs">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(row)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit update" : "New campaign update"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <Tabs defaultValue="en" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ta">தமிழ் (Tamil)</TabsTrigger>
              </TabsList>
              <TabsContent value="en" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title_en">Title (English)</Label>
                  <Input
                    id="title_en"
                    value={draft.title_en}
                    onChange={(e) => setDraft({ ...draft, title_en: e.target.value })}
                    placeholder="Update headline"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content_en">Content (English)</Label>
                  <Textarea
                    id="content_en"
                    value={draft.content_en}
                    onChange={(e) => setDraft({ ...draft, content_en: e.target.value })}
                    placeholder="Full body of the update…"
                    rows={8}
                  />
                </div>
              </TabsContent>
              <TabsContent value="ta" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title_ta">தலைப்பு (Title in Tamil)</Label>
                  <Input
                    id="title_ta"
                    value={draft.title_ta}
                    onChange={(e) => setDraft({ ...draft, title_ta: e.target.value })}
                    placeholder="செய்தித் தலைப்பு"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content_ta">உள்ளடக்கம் (Content in Tamil)</Label>
                  <Textarea
                    id="content_ta"
                    value={draft.content_ta}
                    onChange={(e) => setDraft({ ...draft, content_ta: e.target.value })}
                    placeholder="செய்தியின் முழுமையான உள்ளடக்கம்…"
                    rows={8}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2 border-t border-border pt-4">
              <Label>Media image</Label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  disabled={uploading}
                  className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground"
                />
                {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
                {draft.media_url && !uploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraft({ ...draft, media_url: "", media_preview_url: null })}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {draft.media_preview_url && (
                <img
                  src={draft.media_preview_url}
                  alt="preview"
                  className="mt-2 max-h-40 rounded ring-1 ring-border object-cover"
                />
              )}
              <p className="text-xs text-muted-foreground">
                Uploaded to the <code>campaign-media</code> bucket. The path is stored on <code>media_url</code>.
              </p>
            </div>

            {!draft.id && (
              <div className="space-y-2 border-t border-border pt-4">
                <Label>Bulk create from multiple images</Label>
                <p className="text-xs text-muted-foreground">
                  Pick many images at once. Each one becomes its own update sharing the
                  title, content, status, pin, and link fields above.
                </p>
                <input
                  ref={bulkRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={bulkBusy || uploading}
                  onChange={handleBulkFiles}
                  className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground"
                />
                {bulkBusy && (
                  <p className="text-xs text-muted-foreground">
                    Creating {bulkProgress.done} / {bulkProgress.total}…
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor="gallery_item_id">Link to gallery photo / video (optional)</Label>
                <Select
                  value={
                    draft.gallery_item_id &&
                    gallery.find((g) => g.id === draft.gallery_item_id)?.kind !== "fieldwork"
                      ? draft.gallery_item_id
                      : "__none__"
                  }
                  onValueChange={(v) =>
                    setDraft({ ...draft, gallery_item_id: v === "__none__" ? null : v })
                  }
                >
                  <SelectTrigger id="gallery_item_id">
                    <SelectValue placeholder="No gallery item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {gallery
                      .filter((g) => g.kind !== "fieldwork")
                      .map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          [{g.kind}] {g.title_en || g.title_ta}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Readers will be taken to the linked gallery item when they tap the update.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fieldwork_event_id">Or link to a Fieldwork event (optional)</Label>
                <Select
                  value={draft.fieldwork_event_id ?? "__none__"}
                  onValueChange={(v) => {
                    if (v === "__none__") {
                      setDraft({ ...draft, fieldwork_event_id: null });
                      return;
                    }
                    const ev = events.find((e) => e.id === v);
                    setDraft((d) => ({
                      ...d,
                      fieldwork_event_id: v,
                      // Clear any photo/video link — only one link is stored.
                      gallery_item_id: null,
                      // Auto-fill titles from the event. Always overwrite so
                      // switching events updates the visible fields; the admin
                      // can still edit afterwards.
                      title_en: ev?.title_en ?? d.title_en,
                      title_ta: ev?.title_ta ?? d.title_ta,
                    }));
                  }}
                >
                  <SelectTrigger id="fieldwork_event_id">
                    <SelectValue placeholder="No fieldwork event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {events.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No fieldwork events yet — create one in Gallery → Fieldwork
                      </SelectItem>
                    ) : (
                      events.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.title_en || e.title_ta}
                          {e.event_date ? ` · ${new Date(e.event_date).toLocaleDateString()}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Picking a Fieldwork event auto-fills the title from the event (you can still override),
                  and the update opens a dedicated page at <code>/fieldwork/&lt;event-id&gt;</code>
                  showing the event details and every photo/video in that event.
                  Replaces any gallery photo/video link above — only one link is stored.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="external_url">Or external URL (optional)</Label>
                <Input
                  id="external_url"
                  type="url"
                  value={draft.external_url}
                  onChange={(e) => setDraft({ ...draft, external_url: e.target.value })}
                  placeholder="https://example.com/article"
                />
                <p className="text-xs text-muted-foreground">
                  Used only if no gallery/fieldwork item is selected. Must start with http(s)://
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) => setDraft({ ...draft, status: v as Status })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pinned">Pin to top</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    id="pinned"
                    checked={draft.is_pinned}
                    onCheckedChange={(v) => setDraft({ ...draft, is_pinned: v })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {draft.is_pinned ? "Will appear first" : "Standard order"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? "Saving…" : draft.id ? "Save changes" : "Create update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}