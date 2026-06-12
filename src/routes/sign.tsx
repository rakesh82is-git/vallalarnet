import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Country, State, City } from "country-state-city";
import { toast } from "sonner";
import { SignaturePad } from "@/components/signature-pad";
import vallalPeruman from "@/assets/vallal-peruman.jpg.asset.json";
import thankYou from "@/assets/thank-you-vallalar.jpg.asset.json";
import {
  submitDigitalSignature,
  submitManualSignature,
  listManualSignatures,
} from "@/lib/petition.functions";

const heroImg = vallalPeruman.url;
const thanksImg = thankYou.url;

export const Route = createFileRoute("/sign")({
  head: () => ({
    meta: [
      { title: "Sign — Vadalur Holy City" },
      {
        name: "description",
        content:
          "Sign the petition to declare Vadalur a Holy City. Digital signature or upload your paper signature.",
      },
      { property: "og:title", content: "Sign the Vadalur petition" },
      {
        property: "og:description",
        content: "One signature per mobile number. Digital or manual upload.",
      },
    ],
  }),
  component: SignPage,
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function SignPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-10 animate-reveal">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">PETITION</p>
        <div className="mt-5 grid sm:grid-cols-[auto,1fr] gap-5 items-center max-w-2xl mx-auto text-left">
          <img
            src={heroImg}
            alt="Vallalar"
            width={120}
            height={120}
            loading="lazy"
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-1 ring-border shadow-lg mx-auto sm:mx-0"
          />
          <div>
            <h1 className="text-2xl md:text-4xl font-display font-bold leading-tight">
              வடலூர் புனித நகரம் ஆவதற்கு உங்களுக்கு சம்மதமா?
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground">
              Do you agree to make Vadalur a Holy City? Add your signature below.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="digital" className="animate-reveal">
        <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto">
          <TabsTrigger value="digital">Digital Signature</TabsTrigger>
          <TabsTrigger value="manual">Manual Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="digital" className="mt-6">
          <DigitalTab />
        </TabsContent>
        <TabsContent value="manual" className="mt-6">
          <ManualTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────── Digital ───────────────

function DigitalTab() {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    countryCode: "IN",
    stateCode: "",
    district: "",
    mobile_local: "",
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; name: string; voteNumber: number } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(
    () => (form.countryCode ? State.getStatesOfCountry(form.countryCode) : []),
    [form.countryCode],
  );
  const cities = useMemo(
    () =>
      form.countryCode && form.stateCode
        ? City.getCitiesOfState(form.countryCode, form.stateCode)
        : [],
    [form.countryCode, form.stateCode],
  );
  const selectedCountry = useMemo(
    () => countries.find((c) => c.isoCode === form.countryCode) ?? null,
    [countries, form.countryCode],
  );
  const dialCode = selectedCountry?.phonecode
    ? `+${selectedCountry.phonecode.replace(/^\+/, "")}`
    : "";

  async function handleSubmit() {
    const { name, age, countryCode, stateCode, district, mobile_local } = form;
    const country = selectedCountry?.name ?? "";
    const state = states.find((s) => s.isoCode === stateCode)?.name ?? "";
    if (!name || !age || !country || !state || !district || !mobile_local) {
      toast.error("Please fill in all fields");
      return;
    }
    const ageNum = Number(age);
    if (!Number.isFinite(ageNum) || ageNum < 1 || ageNum > 120) {
      toast.error("Please enter a valid age");
      return;
    }
    if (!signature) {
      toast.error("Please draw your signature");
      return;
    }
    const mobile_number = `${dialCode} ${mobile_local}`.trim();
    setBusy(true);
    try {
      const res = await submitDigitalSignature({
        data: {
          name,
          age: ageNum,
          country,
          state,
          district,
          mobile_number,
          signature_image: signature,
        },
      });
      if (!res.ok) {
        if (res.error === "duplicate") {
          toast.error("This mobile number has already signed.");
        } else {
          toast.error("Something went wrong. Please try again.");
        }
        return;
      }
      setResult({ id: res.id, name, voteNumber: res.voteNumber });
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return <SuccessCard id={result.id} name={result.name} voteNumber={result.voteNumber} />;
  }

  return (
    <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8 space-y-6">
      <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
        <Field label="Name / பெயர்">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} />
        </Field>
        <Field label="Age / வயது">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            value={form.age}
            onChange={(e) => set("age", e.target.value)}
          />
        </Field>
        <Field label="Country / நாடு">
          <Select
            value={form.countryCode}
            onValueChange={(v) =>
              setForm((s) => ({ ...s, countryCode: v, stateCode: "", district: "" }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {countries.map((c) => (
                <SelectItem key={c.isoCode} value={c.isoCode}>
                  {c.flag} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="State / மாநிலம்">
          <Select
            value={form.stateCode}
            onValueChange={(v) => setForm((s) => ({ ...s, stateCode: v, district: "" }))}
            disabled={!states.length}
          >
            <SelectTrigger>
              <SelectValue placeholder={states.length ? "Select state" : "No states available"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {states.map((s) => (
                <SelectItem key={s.isoCode} value={s.isoCode}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="District / மாவட்டம்">
          {cities.length > 0 ? (
            <Select
              value={form.district}
              onValueChange={(v) => set("district", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {cities.map((c) => (
                  <SelectItem key={`${c.name}-${c.latitude}-${c.longitude}`} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={form.district}
              onChange={(e) => set("district", e.target.value)}
              maxLength={80}
              placeholder={form.stateCode ? "Enter district" : "Select state first"}
              disabled={!form.stateCode}
            />
          )}
        </Field>
        <Field label="Mobile Number / கைபேசி எண்">
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-secondary text-sm font-mono text-muted-foreground min-w-[64px] justify-center">
              {dialCode || "+—"}
            </span>
            <Input
              type="tel"
              inputMode="tel"
              value={form.mobile_local}
              onChange={(e) => set("mobile_local", e.target.value.replace(/[^\d\s-]/g, ""))}
              maxLength={15}
              className="rounded-l-none"
              placeholder="Phone number"
            />
          </div>
        </Field>
      </fieldset>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Draw Your Signature Here / உங்கள் கையொப்பத்தை இங்கே வரையவும்
        </Label>
        <SignaturePad onChange={setSignature} />
      </div>

      <Button onClick={handleSubmit} disabled={busy} size="lg" className="w-full">
        {busy ? "Submitting…" : "Submit Signature"}
      </Button>
    </div>
  );
}

// ─────────────── Manual ───────────────

function ManualTab() {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    mobile_number: "",
    document_title: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ id: string; name: string; voteNumber: number } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
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

  function readDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(f);
    });
  }

  async function handleSubmit() {
    if (!form.name || !form.mobile_number || !form.document_title) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!file) {
      toast.error("Please attach your signed document");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readDataUrl(file);
      const res = await submitManualSignature({
        data: {
          name: form.name,
          mobile_number: form.mobile_number,
          document_title: form.document_title,
          file_data_url: dataUrl,
          file_name: file.name,
        },
      });
      if (!res.ok) {
        if (res.error === "duplicate") toast.error("This mobile number has already signed.");
        else if (res.error === "too_large") toast.error("File must be under 6 MB");
        else if (res.error === "bad_file") toast.error("Unsupported file type");
        else toast.error("Something went wrong. Please try again.");
        return;
      }
      setResult({ id: res.id, name: form.name, voteNumber: res.voteNumber });
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-10">
        <SuccessCard id={result.id} name={result.name} voteNumber={result.voteNumber} />
        <ManualFeed />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8 space-y-6">
        <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
          <Field label="Name / பெயர்">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} />
          </Field>
          <Field label="Mobile Number / கைபேசி எண்">
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
              <p className="font-medium">Drop your signed document here</p>
              <p className="text-xs text-muted-foreground">JPG · PNG · WebP · PDF · up to 6 MB</p>
            </div>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={busy} size="lg" className="w-full">
          {busy ? "Uploading…" : "Upload Signature"}
        </Button>
      </div>

      <ManualFeed />
    </div>
  );
}

// ─────────────── Public manual gallery ───────────────

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
      <div className="text-center mb-6">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">RECENT UPLOADS</p>
        <h2 className="mt-2 text-xl md:text-2xl font-display font-bold">Manual Petition Pages</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Phone numbers and addresses are kept private — only the signer's name and the document are shown.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No manual submissions yet. Be the first to upload.
        </p>
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

// ─────────────── Success ───────────────

function SuccessCard({ id, name, voteNumber }: { id: string; name: string; voteNumber: number }) {
  return (
    <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-10 text-center animate-reveal overflow-hidden">
      <div className="relative mx-auto w-full max-w-md aspect-square rounded-2xl overflow-hidden mb-6">
        <img
          src={thanksImg}
          alt="Vallalar with happy animals and hearts"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
      </div>
      <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">THANK YOU · நன்றி</p>
      <h2 className="mt-3 text-3xl md:text-4xl font-display font-bold">Thank you, {name}!</h2>
      <p className="mt-2 text-muted-foreground">
        You are vote number{" "}
        <span className="font-mono font-bold text-primary">#{voteNumber.toLocaleString()}</span>
      </p>
      <div className="mt-6 inline-flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 px-8 py-4">
        <span className="text-xs font-mono uppercase tracking-widest text-accent">Signature ID</span>
        <span className="mt-1 text-sm font-mono font-bold text-primary tracking-tight break-all max-w-xs">
          {id}
        </span>
      </div>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link
          to="/wall"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full ring-1 ring-border text-sm font-medium hover:bg-secondary"
        >
          View the Wall →
        </Link>
      </div>
    </div>
  );
}