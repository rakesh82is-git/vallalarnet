import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SignaturePad } from "@/components/signature-pad";
import vallalPeruman from "@/assets/vallal-peruman.jpg.asset.json";
const thanksImg = vallalPeruman.url;
import { supabase } from "@/integrations/supabase/client";
import { submitEmailSignature } from "@/lib/petition.functions";

export const Route = createFileRoute("/sign")({
  head: () => ({
    meta: [
      { title: "Sign — Vadalur Holy City" },
      { name: "description", content: "Verify your email and add your digital signature to support declaring Vadalur a Holy City." },
      { property: "og:title", content: "Sign the Vadalur petition" },
      { property: "og:description", content: "Email-verified petition. One signature per email." },
    ],
  }),
  component: SignPage,
});

type Step = "form" | "link-sent" | "sign" | "done";

const DRAFT_KEY = "vadalur:sign-draft";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function SignPage() {
  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    residential_address: "",
    pincode: "",
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; name: string } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => {
      const next = { ...s, [k]: v };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // Restore draft + detect verified session on return from email link
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && typeof draft === "object") setForm((s) => ({ ...s, ...draft }));
      }
    } catch {}

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) {
        setForm((s) => ({ ...s, email: s.email || data.session!.user.email! }));
        setStep((cur) => (cur === "done" ? cur : "sign"));
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user?.email) {
        setForm((s) => ({ ...s, email: s.email || session.user.email! }));
        setStep((cur) => (cur === "done" ? cur : "sign"));
        toast.success("Email verified — please sign below");
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const { full_name, email, phone_number, residential_address, pincode } = form;
    if (!full_name || !email || !phone_number || !residential_address || !pincode) {
      toast.error("Please fill in all fields");
      return;
    }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch {}
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/sign`,
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStep("link-sent");
    toast.success("Verification link sent — check your inbox");
  }

  async function handleSubmit() {
    if (!signature) {
      toast.error("Please draw your signature");
      return;
    }
    setBusy(true);
    try {
      const result = await submitEmailSignature({
        data: {
          full_name: form.full_name,
          email: form.email,
          phone_number: form.phone_number,
          residential_address: form.residential_address,
          pincode: form.pincode,
          signature_image: signature,
        },
      });
      if (!result.ok) {
        setBusy(false);
        if (result.error === "duplicate") {
          toast.error("This email or phone number has already signed the petition.");
        } else if (result.error === "auth") {
          toast.error("Session expired — please verify again");
          setStep("form");
        } else {
          toast.error("Something went wrong. Please try again.");
        }
        return;
      }
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setResult({ id: result.id, name: form.full_name });
      setStep("done");
    } catch {
      setBusy(false);
      toast.error("Session expired — please verify again");
      setStep("form");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-8 animate-reveal">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">PETITION</p>
        <h1 className="mt-3 text-3xl md:text-5xl font-display font-bold">
          Sign the Petition
        </h1>
        <p className="mt-4 text-muted-foreground">
          Verify your email, then add your digital signature to support declaring Vadalur a Holy City.
        </p>
      </div>

      {step === "done" && result ? (
        <ThankYou id={result.id} name={result.name} />
      ) : (
        <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8 space-y-6 animate-reveal">
          <fieldset disabled={step !== "form" || busy} className="grid sm:grid-cols-2 gap-4">
            <Field label="Full Name">
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value.trim())} maxLength={200} />
            </Field>
            <Field label="Phone Number">
              <Input type="tel" inputMode="tel" value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} maxLength={20} />
            </Field>
            <Field label="Pincode">
              <Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} maxLength={12} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Residential Address">
                <Textarea
                  value={form.residential_address}
                  onChange={(e) => set("residential_address", e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </Field>
            </div>
          </fieldset>

          {step === "form" && (
            <Button onClick={sendLink as never} disabled={busy} size="lg" className="w-full">
              {busy ? "Sending…" : "Verify Email"}
            </Button>
          )}

          {step === "link-sent" && (
            <div className="rounded-2xl bg-secondary/40 p-5 border border-border text-center space-y-2">
              <p className="font-medium">Check your inbox</p>
              <p className="text-sm text-muted-foreground">
                We have emailed you an official verification link at <span className="font-medium text-foreground">{form.email}</span>.
                Please click it to unlock your digital scratchpad signature.
              </p>
              <p className="text-xs text-muted-foreground pt-2">
                Open the link in this same browser. Your details are saved — you'll come right back to sign.
              </p>
            </div>
          )}

          {step === "sign" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 p-4 text-center">
                <p className="text-sm font-medium">Email verified ✓</p>
                <p className="text-xs text-muted-foreground mt-1">Draw your signature below</p>
              </div>
              <SignaturePad onChange={setSignature} />
              <Button onClick={handleSubmit} disabled={busy || !signature} size="lg" className="w-full">
                {busy ? "Submitting…" : "Submit Signature"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ThankYou({ id, name }: { id: string; name: string }) {
  return (
    <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-10 text-center animate-reveal overflow-hidden">
      <div className="relative mx-auto w-full max-w-md aspect-square rounded-2xl overflow-hidden mb-6">
        <img src={thanksImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
      </div>
      <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">THANK YOU</p>
      <h2 className="mt-3 text-3xl md:text-4xl font-display font-bold">
        {name}, your signature is recorded
      </h2>
      <div className="mt-8 inline-flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 px-10 py-6">
        <span className="text-xs font-mono uppercase tracking-widest text-accent">Signature ID</span>
        <span className="mt-1 text-lg md:text-xl font-mono font-bold text-primary tracking-tight break-all">
          {id}
        </span>
      </div>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link to="/wall" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full ring-1 ring-border text-sm font-medium hover:bg-secondary">
          View the Wall →
        </Link>
      </div>
    </div>
  );
}