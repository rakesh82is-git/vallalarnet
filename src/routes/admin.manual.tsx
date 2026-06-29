import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { submitManualSignature, listManualSignatures } from "@/lib/petition.functions";
import { useLang } from "@/i18n/context";

export const Route = createFileRoute("/admin/manual")({
  component: AdminManualPage,
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function AdminManualPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Manual Upload</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload signed paper petitions on behalf of supporters. This page is admin-only.
        </p>
      </div>
      <ManualTab />
    </div>
  );
}

function ManualTab() {
  const { lang, t } = useLang();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", mobile_number: "", document_title: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ id: string; name: string; voteNumber: number } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function resetForm() {
    setForm({ name: "", mobile_number: "", document_title: "" });
    setFile(null);
    setPreview(null);
  }

  function acceptFile(f: File | null) {
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(f.type)) {
      toast.error("Please upload a JPG, PNG, WebP, or PDF");
      return;
    }
    if (f.type.startsWith("image/") && f.size > 5_000_000) {
      toast.error("Image must be under 5 MB");
      return;
    }
    if (f.size > 6_000_000) {
      toast.error("File must be under 6 MB");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = () => setPreview(r.result as string);
      r.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit() {
    if (!form.name || !form.mobile_number || !form.document_title) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!file) {
      toast.error("Please attach the signed document");
      return;
    }
    setBusy(true);
    try {
      const { uploadFileToR2 } = await import("@/lib/r2-upload");
      const uploaded = await uploadFileToR2(file, "petition-manual");
      const res = await submitManualSignature({
        data: {
          name: form.name,
          mobile_number: form.mobile_number,
          document_title: form.document_title,
          manual_document_url: uploaded.publicUrl,
        },
      });
      if (!res.ok) {
        if (res.error === "duplicate") toast.error("This mobile number has already signed.");
        else toast.error("Something went wrong. Please try again.");
        return;
      }
      setResult({ id: res.id, name: form.name, voteNumber: res.voteNumber });
      resetForm();
    } catch (err) {
      console.error("[manual signature] upload failed", err);
      toast.error("Upload failed — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      {result && (
        <div className="rounded-2xl bg-primary/10 ring-1 ring-primary/30 p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-accent">Uploaded</p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">{result.name}</span> is signature #
            <span className="font-mono">{result.voteNumber.toLocaleString()}</span>.
          </p>
          <p className="text-xs text-muted-foreground mt-1 break-all">ID: {result.id}</p>
          <button
            onClick={() => setResult(null)}
            className="mt-3 text-xs font-mono uppercase tracking-widest text-primary hover:underline"
          >
            Upload another →
          </button>
        </div>
      )}

      <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8 space-y-6">
        <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
          <Field label={t.sign.name}>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} />
          </Field>
          <Field label={t.sign.phone}>
            <Input
              type="tel"
              inputMode="tel"
              value={form.mobile_number}
              onChange={(e) => set("mobile_number", e.target.value)}
              maxLength={20}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Document Title / Description">
              <Input
                value={form.document_title}
                onChange={(e) => set("document_title", e.target.value)}
                maxLength={200}
                placeholder="e.g. Signed petition page from Chennai meeting"
              />
            </Field>
          </div>
        </fieldset>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            acceptFile(e.dataTransfer.files?.[0] ?? null);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-secondary/30 hover:bg-secondary/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <img src={preview} alt="Preview" className="mx-auto max-h-64 rounded-lg object-contain" />
          ) : file ? (
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(file.size / 1024).toFixed(0)} KB · {file.type}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium">Drop the signed document here</p>
              <p className="text-xs text-muted-foreground">JPG · PNG · WebP · PDF · up to 6 MB</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={busy} size="lg" className="flex-1">
            {busy ? "Uploading…" : "Upload Signature"}
          </Button>
          <Button type="button" variant="outline" onClick={resetForm} disabled={busy} size="lg">
            Reset
          </Button>
        </div>
      </div>

      <ManualFeed />

      <div>
        <Link to="/admin" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground">
          ← Back to admin
        </Link>
      </div>
    </div>
  );
}

type ManualItem = {
  id: string;
  name: string;
  document_title: string | null;
  url: string | null;
  is_pdf: boolean;
  created_at: string;
};

function ManualFeed() {
  const [items, setItems] = useState<ManualItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listManualSignatures()
      .then((res) => {
        if (alive) setItems(res.items as ManualItem[]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section>
      <div className="mb-4">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">RECENT UPLOADS</p>
        <h2 className="mt-2 text-xl font-display font-bold">Manual Petition Pages</h2>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">No manual submissions yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((it) => (
            <figure
              key={it.id}
              className="rounded-2xl bg-card ring-1 ring-border overflow-hidden hover:ring-primary/40 transition"
            >
              <div className="aspect-square bg-secondary/40 flex items-center justify-center overflow-hidden">
                {it.is_pdf ? (
                  <a href={it.url ?? "#"} target="_blank" rel="noreferrer" className="text-center p-4">
                    <div className="text-3xl">📄</div>
                    <div className="mt-2 text-xs text-primary underline">Open PDF</div>
                  </a>
                ) : (
                  <img
                    src={it.url ?? ""}
                    alt={it.document_title ?? "Manual signature"}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <figcaption className="p-3">
                <p className="text-sm font-medium truncate">{it.name}</p>
                {it.document_title && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{it.document_title}</p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}