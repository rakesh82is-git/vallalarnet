import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListCampaignUpdates,
  adminSaveCampaignUpdate,
  adminDeleteCampaignUpdate,
  adminUploadCampaignMedia,
  adminListGallery,
} from "@/lib/admin.functions";
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
});

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function AdminUpdatesPage() {
  const list = useServerFn(adminListCampaignUpdates);
  const save = useServerFn(adminSaveCampaignUpdate);
  const remove = useServerFn(adminDeleteCampaignUpdate);
  const upload = useServerFn(adminUploadCampaignMedia);

  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      const base64 = await readFileAsBase64(file);
      const r = await upload({
        data: {
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          base64,
        },
      });
      if (!r.ok) {
        toast.error(`Upload failed: ${r.error}`);
        return;
      }
      setDraft((d) => ({
        ...d,
        media_url: r.path,
        media_preview_url: r.preview_url,
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
    if (
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
          title_en: draft.title_en,
          title_ta: draft.title_ta,
          content_en: draft.content_en,
          content_ta: draft.content_ta,
          media_url: draft.media_url || null,
          status: draft.status,
          is_pinned: draft.is_pinned,
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