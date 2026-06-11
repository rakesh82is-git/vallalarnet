import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { SignaturePad } from "@/components/signature-pad";
import { ScanRedactor } from "@/components/scan-redactor";
import thanksImg from "@/assets/thanks.jpg";
import { useT } from "@/i18n/context";
import { submitSignature } from "@/lib/petition.functions";

export const Route = createFileRoute("/sign")({
  head: () => ({
    meta: [
      { title: "Sign — Vadalur Holy City" },
      { name: "description", content: "Add your digital signature or upload a signed paper to support declaring Vadalur a Holy City." },
      { property: "og:title", content: "Sign the Vadalur petition" },
      { property: "og:description", content: "Two ways to join — digital signature or a signed paper. One signature per phone." },
    ],
  }),
  component: SignPage,
});

function SignPage() {
  const t = useT();
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-8 animate-reveal">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">{t.sign.heroEyebrow}</p>
        <h1 className="mt-3 text-3xl md:text-5xl font-display font-bold">{t.sign.heroTitle}</h1>
        <p className="mt-4 text-muted-foreground">{t.sign.heroBody}</p>
      </div>

      <Tabs defaultValue="digital" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="digital">{t.sign.tabDigital}</TabsTrigger>
          <TabsTrigger value="manual">{t.sign.tabManual}</TabsTrigger>
        </TabsList>
        <TabsContent value="digital">
          <DigitalTab />
        </TabsContent>
        <TabsContent value="manual">
          <ManualTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type DigitalForm = {
  name: string;
  age: string;
  country: string;
  state: string;
  district: string;
  phone: string;
  message: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function DigitalTab() {
  const t = useT();
  const submit = useServerFn(submitSignature);
  const [form, setForm] = useState<DigitalForm>({
    name: "",
    age: "",
    country: "India",
    state: "Tamil Nadu",
    district: "",
    phone: "",
    message: "",
  });
  const [consent, setConsent] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ name: string; voteNumber: number } | null>(null);

  function field<K extends keyof DigitalForm>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function startSign(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.age || !form.country || !form.state || !form.district || !form.phone) {
      toast.error(t.sign.errAll);
      return;
    }
    if (consent !== "yes") {
      toast.error(t.sign.errConsent);
      return;
    }
    if (!signature) {
      toast.error(t.sign.errSig);
      return;
    }
    setOtpOpen(true);
    toast.success(t.sign.otpSent);
  }

  async function confirmOtp() {
    if (otp.length !== 6) {
      toast.error(t.sign.errOtp);
      return;
    }
    setBusy(true);
    try {
      const r = await submit({
        data: {
          kind: "digital",
          name: form.name,
          age: Number(form.age),
          country: form.country,
          state: form.state,
          district: form.district,
          phone: form.phone,
          message: form.message || null,
          consent: true,
          signatureSvg: signature,
          scanDataUrl: null,
        },
      });
      if (!r.ok) {
        toast.error(r.error === "duplicate" ? t.sign.errDup : "Something went wrong");
        return;
      }
      setOtpOpen(false);
      setResult({ name: form.name, voteNumber: r.voteNumber });
    } finally {
      setBusy(false);
    }
  }

  if (result) return <ThankYou name={result.name} voteNumber={result.voteNumber} />;

  return (
    <form
      onSubmit={startSign}
      className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8 space-y-6 animate-reveal"
    >
      <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 p-6 text-center">
        <div className="font-display text-3xl md:text-4xl text-primary italic">வள்ளலார்</div>
        <p className="mt-2 text-sm text-muted-foreground">{t.sign.quote}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t.sign.name}>
          <Input value={form.name} onChange={(e) => field("name", e.target.value)} required maxLength={100} />
        </Field>
        <Field label={t.sign.age}>
          <Input type="number" min={1} max={120} value={form.age} onChange={(e) => field("age", e.target.value)} required />
        </Field>
        <Field label={t.sign.country}>
          <Input value={form.country} onChange={(e) => field("country", e.target.value)} required maxLength={80} />
        </Field>
        <Field label={t.sign.state}>
          <Input value={form.state} onChange={(e) => field("state", e.target.value)} required maxLength={80} />
        </Field>
        <Field label={t.sign.district}>
          <Input value={form.district} onChange={(e) => field("district", e.target.value)} required maxLength={80} />
        </Field>
        <Field label={t.sign.phone}>
          <Input type="tel" inputMode="tel" placeholder="+91 9XXXXXXXXX" value={form.phone} onChange={(e) => field("phone", e.target.value)} required />
        </Field>
      </div>

      <Field label={t.sign.message}>
        <Textarea
          value={form.message}
          onChange={(e) => field("message", e.target.value.slice(0, 200))}
          rows={3}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground text-right">
          {200 - form.message.length} {t.sign.messageHint}
        </p>
      </Field>

      <div className="rounded-2xl bg-secondary/40 p-5 border border-border">
        <p className="font-medium text-base mb-3">{t.sign.consentQ}</p>
        <RadioGroup value={consent} onValueChange={setConsent} className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="yes" id="yes" />
            <span className="font-medium">{t.sign.consentYes}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="no" id="no" />
            <span>{t.sign.consentNo}</span>
          </label>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">{t.sign.signatureLabel}</Label>
        <SignaturePad onChange={setSignature} />
      </div>

      <Button type="submit" size="lg" className="w-full text-base font-medium">
        {t.sign.verify}
      </Button>
      <p className="text-xs text-muted-foreground text-center">{t.sign.onePerPhone}</p>

      <Dialog open={otpOpen} onOpenChange={(o) => !busy && setOtpOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.sign.otpTitle}</DialogTitle>
            <DialogDescription>{form.phone}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <p className="text-xs text-center text-muted-foreground">{t.sign.otpHint}</p>
          <Button onClick={confirmOtp} disabled={busy} className="w-full">
            {busy ? "…" : t.sign.confirm}
          </Button>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function ThankYou({ name, voteNumber }: { name: string; voteNumber: number }) {
  const t = useT();
  const shareText = encodeURIComponent("I just signed to declare Vadalur a Holy City. Join: ");
  const shareUrl = typeof window !== "undefined" ? window.location.origin + "/sign" : "/sign";

  return (
    <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-10 text-center animate-reveal overflow-hidden">
      <div className="relative mx-auto w-full max-w-md aspect-square rounded-2xl overflow-hidden mb-6">
        <img src={thanksImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
      </div>
      <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">{t.sign.thankYouEyebrow}</p>
      <h2 className="mt-3 text-3xl md:text-4xl font-display font-bold">
        {t.sign.thankYou}, {name}!
      </h2>
      <div className="mt-8 inline-flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 px-10 py-6">
        <span className="text-xs font-mono uppercase tracking-widest text-accent">{t.sign.voteNumber}</span>
        <span className="mt-1 text-5xl md:text-6xl font-mono font-bold text-primary tracking-tight">
          #{voteNumber.toLocaleString("en-IN")}
        </span>
        <span className="mt-1 text-sm text-muted-foreground">{t.sign.voteSuffix}</span>
      </div>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <a
          href={`https://wa.me/?text=${shareText}${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          {t.sign.shareWA}
        </a>
        <Link to="/wall" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full ring-1 ring-border text-sm font-medium hover:bg-secondary">
          {t.nav.wall} →
        </Link>
      </div>
    </div>
  );
}

function ManualTab() {
  const t = useT();
  const submit = useServerFn(submitSignature);
  const [pending, setPending] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", country: "India", state: "Tamil Nadu", district: "" });

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPending(f);
    e.target.value = "";
  }

  async function handleSave(dataUrl: string) {
    if (!form.name || !form.phone || !form.district) {
      toast.error(t.sign.errAll);
      return;
    }
    setBusy(true);
    try {
      const r = await submit({
        data: {
          kind: "manual",
          name: form.name,
          age: 18,
          country: form.country,
          state: form.state,
          district: form.district,
          phone: form.phone,
          message: null,
          consent: true,
          signatureSvg: null,
          scanDataUrl: dataUrl,
        },
      });
      if (!r.ok) {
        toast.error(r.error === "duplicate" ? t.sign.errDup : "Something went wrong");
        return;
      }
      setPending(null);
      setForm({ name: "", phone: "", country: "India", state: "Tamil Nadu", district: "" });
      toast.success(t.sign.uploadOk);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-reveal">
      <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8">
        <h2 className="text-xl font-display font-bold mb-2">{t.sign.manualTitle}</h2>
        <p className="text-sm text-muted-foreground mb-5">{t.sign.manualBody}</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <Field label={t.sign.name}>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </Field>
          <Field label={t.sign.phone}>
            <Input type="tel" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
          </Field>
          <Field label={t.sign.state}>
            <Input value={form.state} onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))} />
          </Field>
          <Field label={t.sign.district}>
            <Input value={form.district} onChange={(e) => setForm((s) => ({ ...s, district: e.target.value }))} />
          </Field>
        </div>

        {!pending ? (
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handlePick} />
            <div className="border-2 border-dashed border-primary/40 rounded-2xl py-12 px-6 text-center hover:bg-secondary/30 transition-colors">
              <p className="text-base font-medium">{t.sign.manualPick}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.sign.manualHint}</p>
            </div>
          </label>
        ) : (
          <ScanRedactor file={pending} onCancel={() => setPending(null)} onSave={handleSave} />
        )}
        {busy && <p className="text-xs text-muted-foreground text-center mt-3">…</p>}
      </div>
    </div>
  );
}