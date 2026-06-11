import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import {
  addSignature,
  addScan,
  hasPhoneSigned,
  listScans,
  useStoreVersion,
  type DigitalSignature,
} from "@/lib/petition-store";
import { SignaturePad } from "@/components/signature-pad";
import { ScanRedactor } from "@/components/scan-redactor";
import thanksImg from "@/assets/thanks.jpg";

export const Route = createFileRoute("/signature")({
  head: () => ({
    meta: [
      { title: "கையொப்பம் — வடலூர் புனித நகரம் இயக்கம்" },
      {
        name: "description",
        content: "டிஜிட்டல் கையொப்பம் அல்லது கையெழுத்திட்ட ஆவணம் — இரண்டில் எதன் மூலமும் வடலூரை புனித நகரமாக அறிவிக்கும் இயக்கத்தில் இணையுங்கள்.",
      },
      { property: "og:title", content: "உங்கள் கையொப்பம் இடுங்கள்" },
      { property: "og:description", content: "ஒரு கைபேசி எண்ணுக்கு ஒரு கையொப்பம் — உங்கள் குரல் முக்கியம்." },
    ],
  }),
  component: SignaturePage,
});

function SignaturePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-8 animate-reveal">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">
          Sign the Petition
        </p>
        <h1 className="mt-3 text-3xl md:text-5xl font-display font-bold">
          உங்கள் கையொப்பம் ஒரு ஒளிக்கீற்று
        </h1>
        <p className="mt-4 text-muted-foreground">
          இரண்டு வழிகளில் இணைய முடியும். உங்கள் தனிப்பட்ட விவரங்கள் வெளியில் காட்டப்பட மாட்டா.
        </p>
      </div>

      <Tabs defaultValue="digital" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="digital">டிஜிட்டல் கையொப்பம்</TabsTrigger>
          <TabsTrigger value="manual">கையால் எழுதியது</TabsTrigger>
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

/* ---------------- Digital ---------------- */

function DigitalTab() {
  const [form, setForm] = useState({
    name: "",
    age: "",
    country: "இந்தியா",
    state: "தமிழ்நாடு",
    district: "",
    phone: "",
  });
  const [consent, setConsent] = useState<string>("");
  const [signature, setSignature] = useState<string | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [submitted, setSubmitted] = useState<DigitalSignature | null>(null);

  function field<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function startSign(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.age || !form.country || !form.state || !form.district || !form.phone) {
      toast.error("தயவுசெய்து அனைத்து விவரங்களையும் நிரப்பவும்");
      return;
    }
    if (consent !== "yes") {
      toast.error("தயவுசெய்து உங்கள் சம்மதத்தைத் தெரிவிக்கவும்");
      return;
    }
    if (!signature) {
      toast.error("கையொப்பத்தை இடுங்கள்");
      return;
    }
    if (hasPhoneSigned(form.phone)) {
      toast.error("இந்த எண்ணில் ஏற்கனவே கையொப்பம் இடப்பட்டுள்ளது (ஒரு எண்ணுக்கு ஒரு கையொப்பம்)");
      return;
    }
    setOtpOpen(true);
    toast.success("உங்கள் எண்ணுக்கு குறியீடு அனுப்பப்பட்டது (demo: எந்த 6 இலக்கமும் ஏற்கப்படும்)");
  }

  function confirmOtp() {
    if (otp.length !== 6) {
      toast.error("6 இலக்க குறியீட்டை உள்ளிடவும்");
      return;
    }
    const entry = addSignature({
      name: form.name,
      age: Number(form.age),
      country: form.country,
      state: form.state,
      district: form.district,
      phone: form.phone,
      signatureDataUrl: signature!,
    });
    setOtpOpen(false);
    setSubmitted(entry);
  }

  if (submitted) return <ThankYou entry={submitted} />;

  return (
    <form
      onSubmit={startSign}
      className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8 space-y-6 animate-reveal"
    >
      <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 p-6 text-center">
        <div className="font-display text-3xl md:text-4xl text-primary italic">வள்ளலார்</div>
        <p className="mt-2 text-sm text-muted-foreground">
          “ஒரே இனம் — ஒரே குலம் — ஒரே தெய்வம்”
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="பெயர் *">
          <Input value={form.name} onChange={(e) => field("name", e.target.value)} required />
        </Field>
        <Field label="வயது *">
          <Input
            type="number"
            min={1}
            max={120}
            value={form.age}
            onChange={(e) => field("age", e.target.value)}
            required
          />
        </Field>
        <Field label="நாடு *">
          <Input value={form.country} onChange={(e) => field("country", e.target.value)} required />
        </Field>
        <Field label="மாநிலம் *">
          <Input value={form.state} onChange={(e) => field("state", e.target.value)} required />
        </Field>
        <Field label="மாவட்டம் *">
          <Input
            value={form.district}
            onChange={(e) => field("district", e.target.value)}
            required
          />
        </Field>
        <Field label="கைபேசி எண் *">
          <Input
            type="tel"
            inputMode="tel"
            placeholder="+91 9XXXXXXXXX"
            value={form.phone}
            onChange={(e) => field("phone", e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="rounded-2xl bg-secondary/40 p-5 border border-border">
        <p className="font-medium text-base mb-3">
          வடலூர் புனித நகரம் ஆவதற்கு உங்களுக்கு சம்மதமா?
        </p>
        <RadioGroup value={consent} onValueChange={setConsent} className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="yes" id="yes" />
            <span className="font-medium">ஆம், சம்மதம்</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="no" id="no" />
            <span>இல்லை</span>
          </label>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">உங்கள் கையொப்பம் *</Label>
        <SignaturePad onChange={setSignature} />
      </div>

      <Button type="submit" size="lg" className="w-full text-base font-medium">
        OTP மூலம் உறுதிப்படுத்து →
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        ஒரு கைபேசி எண்ணுக்கு ஒரு கையொப்பம் மட்டுமே ஏற்கப்படும்.
      </p>

      <Dialog open={otpOpen} onOpenChange={setOtpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>உங்கள் எண்ணை சரிபார்க்கவும்</DialogTitle>
            <DialogDescription>
              {form.phone}-க்கு அனுப்பப்பட்ட 6 இலக்க குறியீட்டை உள்ளிடவும்.
            </DialogDescription>
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
          <p className="text-xs text-center text-muted-foreground">
            demo: எந்த 6 இலக்க எண்ணும் ஏற்கப்படும்
          </p>
          <Button onClick={confirmOtp} className="w-full">
            உறுதிப்படுத்து
          </Button>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function ThankYou({ entry }: { entry: DigitalSignature }) {
  const shareText = encodeURIComponent(
    "வடலூர் புனித நகரமாக அறிவிக்கப்பட வேண்டும் என்ற இயக்கத்தில் நானும் இணைந்துள்ளேன். நீங்களும் இணைய: ",
  );
  const shareUrl =
    typeof window !== "undefined" ? window.location.origin + "/signature" : "/signature";
  return (
    <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-10 text-center animate-reveal overflow-hidden">
      <div className="relative mx-auto w-full max-w-md aspect-square rounded-2xl overflow-hidden mb-6">
        <img
          src={thanksImg}
          alt="நன்றி"
          width={1024}
          height={1024}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
      </div>
      <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">தனிப்பெருங்கருணை</p>
      <h2 className="mt-3 text-3xl md:text-4xl font-display font-bold">நன்றி, {entry.name}!</h2>
      <p className="mt-3 text-muted-foreground">
        உங்கள் கையொப்பம் வடலூர் புனித நகர இயக்கத்தில் பதிவாகியுள்ளது.
      </p>
      <div className="mt-8 inline-flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 px-10 py-6">
        <span className="text-xs font-mono uppercase tracking-widest text-accent">
          உங்கள் வரிசை எண்
        </span>
        <span className="mt-1 text-5xl md:text-6xl font-mono font-bold text-primary tracking-tight">
          #{entry.voteNumber.toLocaleString("en-IN")}
        </span>
        <span className="mt-1 text-sm text-muted-foreground">-ஆவது கையொப்பம் இடப்பட்டது</span>
      </div>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <a
          href={`https://wa.me/?text=${shareText}${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          WhatsApp-ல் பகிர்
        </a>
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full ring-1 ring-border text-sm font-medium hover:bg-secondary"
        >
          படத்தொகுப்பு பார்க்க →
        </Link>
      </div>
    </div>
  );
}

/* ---------------- Manual ---------------- */

function ManualTab() {
  useStoreVersion();
  const [pending, setPending] = useState<File | null>(null);
  const scans = listScans();

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPending(f);
    e.target.value = "";
  }

  return (
    <div className="space-y-8 animate-reveal">
      <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8">
        <h2 className="text-xl font-display font-bold mb-2">கையெழுத்திட்ட ஆவணம் பதிவேற்று</h2>
        <p className="text-sm text-muted-foreground mb-5">
          ஏற்கனவே கையொப்பம் இடப்பட்ட காகித படிவத்தை புகைப்படமாக பதிவேற்றவும். தொலைபேசி எண் /
          முகவரி போன்ற தனிப்பட்ட விவரங்களை நீங்கள் மறைக்கும் வரை பதிவு முடிவடையாது.
        </p>
        {!pending ? (
          <label className="block cursor-pointer">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handlePick}
            />
            <div className="border-2 border-dashed border-primary/40 rounded-2xl py-12 px-6 text-center hover:bg-secondary/30 transition-colors">
              <p className="text-base font-medium">படத்தைத் தேர்ந்தெடுக்க அல்லது புகைப்படம் எடுக்க</p>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG · 10MB வரை</p>
            </div>
          </label>
        ) : (
          <ScanRedactor
            file={pending}
            onCancel={() => setPending(null)}
            onSave={(dataUrl) => {
              addScan(dataUrl);
              setPending(null);
              toast.success("ஆவணம் வெற்றிகரமாக பதிவேற்றப்பட்டது");
            }}
          />
        )}
      </div>

      <div>
        <h3 className="text-lg font-display font-bold mb-4">
          பதிவேற்றப்பட்ட ஆவணங்கள் ({scans.length})
        </h3>
        {scans.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-2xl bg-secondary/40 p-6 text-center">
            இதுவரை எந்த ஆவணமும் பதிவேற்றப்படவில்லை.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {scans.map((s) => (
              <a
                key={s.id}
                href={s.imageDataUrl}
                target="_blank"
                rel="noreferrer"
                className="block group relative aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-border bg-secondary"
              >
                <img
                  src={s.imageDataUrl}
                  alt="redacted signature scan"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}