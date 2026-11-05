import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListAnnouncements,
  adminSaveAnnouncement,
  adminDeleteAnnouncement,
  adminSetAnnouncementActive,
  type SiteAnnouncement,
  type DismissalRule,
} from "@/lib/announcement.functions";
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

export const Route = createFileRoute("/admin/announcements")({
  component: AdminAnnouncementsPage,
});

const PAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "*", label: "All pages" },
  { value: "/", label: "Home (/)" },
  { value: "/story", label: "Story (/story)" },
  { value: "/sign", label: "Sign (/sign)" },
  { value: "/wall", label: "Wall (/wall)" },
  { value: "/gallery", label: "Gallery (/gallery)" },
];

const DISMISSAL_OPTIONS: { value: DismissalRule; label: string; hint: string }[] = [
  {
    value: "once_per_announcement",
    label: "Once per announcement",
    hint: "A visitor who closes it never sees this announcement again.",
  },
  {
    value: "once_per_session",
    label: "Once per visit",
    hint: "Hidden after closing, but returns on the visitor's next session.",
  },
  {
    value: "every_visit",
    label: "Every page load",
    hint: "Shows every time a matching page is opened. Use sparingly.",
  },
];

type Draft = {
  id: string | null;
  title_en: string;
  title_ta: string;
  body_en: string;
  body_ta: string;
  media_url: string;
  media_type: "image" | "video" | null;
  target_pages: string[];
  dismissal_rule: DismissalRule;
  is_active: boolean;
};

const emptyDraft = (): Draft => ({
  id: null,
  title_en: "",
  title_ta: "",
  body_en: "",
  body_ta: "",
  media_url: "",
  media_type: null,
  target_pages: ["*"],
  dismissal_rule: "once_per_announcement",
  is_active: false,
});

function pageLabel(p: string) {
  return PAGE_OPTIONS.find((o) => o.value === p)?.label ?? p;
}

function AdminAnnouncementsPage() {
  const list = useServerFn(adminListAnnouncements);
  const save = useServerFn(adminSaveAnnouncement);
  const remove = useServerFn(adminDeleteAnnouncement);
  const setActive = useServerFn(adminSetAnnouncementActive);

  const [rows, setRows] = useState<SiteAnnouncement[]>([]);
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
      setRows(r.items);
    } catch {
      toast.error("Failed to load announcements");
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

  function openEdit(row: SiteAnnouncement) {
    setDraft({
      id: row.id,
      title_en: row.title_en ?? "",
      title_ta: row.title_ta ?? "",
      body_en: row.body_en ?? "",
      body_ta: row.body_ta ?? "",
      media_url: row.media_url ?? "",
      media_type: (row.media_type as "image" | "video" | null) ?? null,
      target_pages:
        Array.isArray(row.target_pages) && row.target_pages.length
          ? row.target_pages
          : ["*"],
      dismissal_rule: row.dismissal_rule ?? "once_per_announcement",
      is_active: row.is_active,
    });
    setOpen(true);
  }

  function togglePage(p: string) {
    setDraft((d) => {
      let next: string[];
      if (p === "*") {
        next = d.target_pages.includes("*") ? [] : ["*"];
      } else {
        const without = d.target_pages.filter((x) => x !== "*");
        next = without.includes(p)
          ? without.filter((x) => x !== p)
          : [...without, p];
      }
      return { ...d, target_pages: next };
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Only images or videos are allowed");
      return;
    }
    if (isImage && file.size > 5_000_000) {
      toast.error("Image too large (max 5MB)");
      return;
    }
    if (file.size > 50_000_000) {
      toast.error("File too large (max 50MB)");
      return;
    }
    setUploading(true);
    try {
      const r = await uploadFileToR2(file, "announcements");
      setDraft((d) => ({
        ...d,
        media_url: r.publicUrl,
        media_type: isVideo ? "video" : "image",
      }));
      toast.success("Media uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!draft.title_en.trim() && !draft.title_ta.trim()) {
      toast.error("Add a title in at least one language");
      return;
    }
    if (draft.target_pages.length === 0) {
      toast.error("Select at least one page");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          id: draft.id,
          title_en: draft.title_en || null,
          title_ta: draft.title_ta || null,
          body_en: draft.body_en || null,
          body_ta: draft.body_ta || null,
          media_url: draft.media_url || null,
          media_type: draft.media_url ? draft.media_type : null,
          target_pages: draft.target_pages,
          dismissal_rule: draft.dismissal_rule,
          is_active: draft.is_active,
        },
      });
      toast.success(draft.id ? "Announcement saved" : "Announcement created");
      setOpen(false);
      await refresh();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: SiteAnnouncement) {
    if (!confirm("Delete this announcement? This cannot be undone.")) return;
    try {
      await remove({ data: { id: row.id } });
      toast.success("Deleted");
      await refresh();
    } catch {
      toast.error("Delete failed");
    }
  }

  async function handleToggleActive(row: SiteAnnouncement, value: boolean) {
    try {
      await setActive({ data: { id: row.id, is_active: value } });
      setRows((rs) =>
        rs.map((r) => (r.id === row.id ? { ...r, is_active: value } : r)),
      );
      toast.success(value ? "Announcement is live" : "Announcement hidden");
    } catch {
      toast.error("Could not change status");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Popup notifications shown to visitors when a page loads. Visitors must
            close the popup before using the page.
          </p>
        </div>
        <Button onClick={openCreate}>+ New Announcement</Button>
      </div>

      <div className="rounded-2xl ring-1 ring-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Pages</th>
                <th className="text-left px-4 py-3 font-medium">Dismissal</th>
                <th className="text-left px-4 py-3 font-medium">Media</th>
                <th className="text-left px-4 py-3 font-medium">Live</th>
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
                    No announcements yet. Click “New Announcement” to add the first one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-3 align-top max-w-xs">
                      <div className="font-medium truncate">
                        {row.title_en || row.title_ta || (
                          <span className="italic text-muted-foreground">Untitled</span>
                        )}
                      </div>
                      {row.title_ta && row.title_en && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {row.title_ta}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {(row.target_pages ?? []).map((p) => (
                          <Badge key={p} variant="secondary" className="text-[10px]">
                            {pageLabel(p)}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                      {DISMISSAL_OPTIONS.find((o) => o.value === row.dismissal_rule)
                        ?.label ?? row.dismissal_rule}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {row.media_url ? (
                        row.media_type === "video" ? (
                          <video
                            src={row.media_url}
                            preload="metadata"
                            muted
                            className="h-12 w-16 object-cover rounded ring-1 ring-border"
                          />
                        ) : (
                          <img
                            src={row.media_url}
                            alt=""
                            className="h-12 w-12 object-cover rounded ring-1 ring-border"
                          />
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Switch
                        checked={row.is_active}
                        onCheckedChange={(v) => handleToggleActive(row, v)}
                        aria-label="Toggle live"
                      />
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
            <DialogTitle>
              {draft.id ? "Edit announcement" : "New announcement"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <Tabs defaultValue="en" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ta">தமிழ் (Tamil)</TabsTrigger>
              </TabsList>
              <TabsContent value="en" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="ann_title_en">Title (English)</Label>
                  <Input
                    id="ann_title_en"
                    value={draft.title_en}
                    onChange={(e) => setDraft({ ...draft, title_en: e.target.value })}
                    placeholder="Announcement headline"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ann_body_en">Body (English)</Label>
                  <Textarea
                    id="ann_body_en"
                    value={draft.body_en}
                    onChange={(e) => setDraft({ ...draft, body_en: e.target.value })}
                    placeholder="Full announcement text…"
                    rows={6}
                  />
                </div>
              </TabsContent>
              <TabsContent value="ta" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="ann_title_ta">தலைப்பு (Title in Tamil)</Label>
                  <Input
                    id="ann_title_ta"
                    value={draft.title_ta}
                    onChange={(e) => setDraft({ ...draft, title_ta: e.target.value })}
                    placeholder="அறிவிப்புத் தலைப்பு"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ann_body_ta">உள்ளடக்கம் (Body in Tamil)</Label>
                  <Textarea
                    id="ann_body_ta"
                    value={draft.body_ta}
                    onChange={(e) => setDraft({ ...draft, body_ta: e.target.value })}
                    placeholder="அறிவிப்பின் முழு உரை…"
                    rows={6}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2 border-t border-border pt-4">
              <Label>Media (optional — image or video)</Label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFile}
                  disabled={uploading}
                  className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground"
                />
                {uploading && (
                  <span className="text-xs text-muted-foreground">Uploading…</span>
                )}
                {draft.media_url && !uploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDraft({ ...draft, media_url: "", media_type: null })
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
              {draft.media_url && draft.media_type === "image" && (
                <img
                  src={draft.media_url}
                  alt="preview"
                  className="mt-2 max-h-40 rounded ring-1 ring-border object-cover"
                />
              )}
              {draft.media_url && draft.media_type === "video" && (
                <video
                  src={draft.media_url}
                  controls
                  preload="metadata"
                  className="mt-2 max-h-40 rounded ring-1 ring-border"
                />
              )}
              <p className="text-xs text-muted-foreground">
                Images up to 5MB, videos up to 50MB.
              </p>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label>Show on pages</Label>
              <div className="flex flex-wrap gap-2">
                {PAGE_OPTIONS.map((o) => {
                  const checked = draft.target_pages.includes(o.value);
                  return (
                    <label
                      key={o.value}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 cursor-pointer transition-colors ${
                        checked
                          ? "bg-primary text-primary-foreground ring-primary"
                          : "bg-card ring-border hover:ring-primary/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => togglePage(o.value)}
                      />
                      {o.label}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                “All pages” shows the popup everywhere. Picking specific pages
                limits it to those pages only.
              </p>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <Label>How often should it appear?</Label>
              <Select
                value={draft.dismissal_rule}
                onValueChange={(v) =>
                  setDraft({ ...draft, dismissal_rule: v as DismissalRule })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISMISSAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {
                  DISMISSAL_OPTIONS.find((o) => o.value === draft.dismissal_rule)
                    ?.hint
                }
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <Label>Live</Label>
                <p className="text-xs text-muted-foreground">
                  Only live announcements are shown to visitors.
                </p>
              </div>
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? "Saving…" : draft.id ? "Save changes" : "Create announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
