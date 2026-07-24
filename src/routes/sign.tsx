import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Country, State } from "country-state-city";
import { toast } from "sonner";
import { SignaturePad } from "@/components/signature-pad";
import { STATIC } from "@/lib/static-assets";
const heroImg = STATIC.vallalarWithAnimals2;
const thankYouVideo = STATIC.vallalarThankYouVideo;
import { submitDigitalSignature } from "@/lib/petition.functions";
import * as gn from "@/lib/geonames";
import { useLang } from "@/i18n/context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type ReferralSource =
  | ""
  | "facebook"
  | "instagram"
  | "youtube"
  | "whatsapp"
  | "twitter"
  | "others";

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
  const { lang } = useLang();
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-10 animate-reveal">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">
          {lang === "ta" ? "கையொப்ப மனு" : "PETITION"}
        </p>
        <div className="mt-6 flex flex-col items-center max-w-2xl mx-auto">
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-border shadow-lg">
            <img
              src={heroImg}
              alt="Vallalar"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="mt-5">
            <h1 className="text-2xl md:text-4xl font-display font-bold leading-tight">
              {lang === "ta"
                ? "வடலூர் புனித நகரம் ஆவதற்கு உங்களுக்கு சம்மதமா?"
                : "Do you agree to make Vadalur a Holy City?"}
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground">
              {lang === "ta"
                ? "வடலூரைப் புனித நகரமாக அறிவிப்பதற்கு நீங்கள் சம்மதமா? கீழே உங்கள் கையொப்பத்தைச் சேர்க்கவும்."
                : "Add your signature below to show your support."}
            </p>
          </div>
        </div>
      </div>

      <div className="animate-reveal mt-6">
        <DigitalTab />
      </div>
    </div>
  );
}

// ─────────────── Digital ───────────────

function DigitalTab() {
  const { lang, t } = useLang();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    countryCode: "IN",
    stateCode: "",
    district: "",
    locality: "",
    pincode: "",
    mobile_local: "",
  });
  const [signOpen, setSignOpen] = useState(false);
  const [pendingSig, setPendingSig] = useState<string | null>(null);
  const [referral, setReferral] = useState<ReferralSource>("");
  const [referralOther, setReferralOther] = useState("");
  const [result, setResult] = useState<{
    id: string;
    name: string;
    voteNumber: number;
  } | null>(null);
  const [geoTried, setGeoTried] = useState(false);

  // GeoNames-driven cascading lists. Districts come from ADM2 children of
  // the selected state (ADM1); sub-districts from ADM3 children of the
  // district; localities from populated-place children of the sub-district.
  const [districtList, setDistrictList] = useState<gn.GnPlace[]>([]);
  const [localityList, setLocalityList] = useState<gn.GnPlace[]>([]);
  const [pincodeList, setPincodeList] = useState<string[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingLocality, setLoadingLocality] = useState(false);
  const [lookingUpPin, setLookingUpPin] = useState(false);
  // Rows returned by the most recent postalCodeLookup. When non-empty, the
  // sub-district & locality dropdowns are constrained to the places that
  // this pincode actually serves (digits 4–6 may map to many villages / cross
  // taluks), rather than the broader ADM3 children of the district.
  const [pinRows, setPinRows] = useState<gn.GnPostal[]>([]);

  const lastPinRef = useRef<string>("");

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  // GeoNames returns slightly different spellings across its endpoints
  // (e.g. postalCodeLookup → "Tiruvallur", children of ADM1 → "Thiruvallur
  // District"). Normalise both sides before comparing so reverse-fill from a
  // pincode reconciles with the cascading dropdown lists.
  function normName(s: string): string {
    return s
      .toLowerCase()
      .replace(/\b(district|taluk|tehsil|tahsil|mandal|sub-?district|division|circle)\b/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .replace(/^th/, "t");
  }
  function findByName<T extends { name: string; toponymName: string }>(
    list: T[],
    needle: string,
  ): T | undefined {
    if (!needle) return undefined;
    const n = normName(needle);
    return (
      list.find((d) => normName(d.name) === n || normName(d.toponymName) === n) ??
      list.find(
        (d) => normName(d.name).includes(n) || n.includes(normName(d.name)),
      )
    );
  }

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(
    () => (form.countryCode ? State.getStatesOfCountry(form.countryCode) : []),
    [form.countryCode],
  );
  const selectedCountry = useMemo(
    () => countries.find((c) => c.isoCode === form.countryCode) ?? null,
    [countries, form.countryCode],
  );
  const stateName = useMemo(
    () => states.find((s) => s.isoCode === form.stateCode)?.name ?? "",
    [states, form.stateCode],
  );
  const dialCode = selectedCountry?.phonecode
    ? `+${selectedCountry.phonecode.replace(/^\+/, "")}`
    : "";
  const isIndia = form.countryCode === "IN";

  // ─── State → district list (GeoNames ADM2 children of ADM1) ───
  useEffect(() => {
    if (!form.countryCode || !stateName) {
      setDistrictList([]);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    (async () => {
      const state = await gn.findAdm1(form.countryCode, stateName);
      if (!state) {
        if (!cancelled) {
          setDistrictList([]);
          setLoadingDistricts(false);
        }
        return;
      }
      const kids = await gn.getChildren(state.geonameId);
      if (cancelled) return;
      const adm2 = kids.filter((k) => k.fcode?.startsWith("ADM2"));
      setDistrictList(adm2.length ? adm2 : kids);
      setLoadingDistricts(false);
      // Reconcile a reverse-filled district name with the canonical list entry.
      setForm((s) => {
        if (!s.district) return s;
        const match = findByName(adm2.length ? adm2 : kids, s.district);
        return match && match.name !== s.district ? { ...s, district: match.name } : s;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [form.countryCode, stateName]);

  // ─── District → locality list (populated-place descendants) ───
  useEffect(() => {
    if (!form.district) {
      setLocalityList([]);
      return;
    }
    const parent = findByName(districtList, form.district);
    if (parent && parent.name !== form.district) {
      setForm((s) => (s.district === form.district ? { ...s, district: parent.name } : s));
    }
    if (!parent) {
      setLocalityList([]);
      return;
    }
    let cancelled = false;
    setLoadingLocality(true);
    gn.getChildren(parent.geonameId).then((kids) => {
      if (cancelled) return;
      const places = kids.filter((k) => k.fcl === "P");
      setLocalityList(places.length ? places : kids);
      setLoadingLocality(false);
      setForm((s) => {
        if (!s.locality) return s;
        const match = findByName(places.length ? places : kids, s.locality);
        return match && match.name !== s.locality ? { ...s, locality: match.name } : s;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [form.district, districtList]);

  // ─── State / District / Sub-District / Locality → narrowed pincode list ───
  // As soon as the user picks a District we fetch the pincodes served by that
  // district (single GeoNames postal-search call, keyed by the most specific
  // place name we have). Narrower selections (sub-district, locality) filter
  // the same row set client-side, so the dropdown progressively shrinks
  // without extra network calls. This is purely a suggestion list — the
  // reverse pincode→address resolution in the effect below is untouched.
  const [pinSearchRows, setPinSearchRows] = useState<gn.GnPostal[]>([]);
  useEffect(() => {
    const place = (form.locality || form.district).trim();
    if (!place || !form.countryCode) {
      setPinSearchRows([]);
      return;
    }
    let cancelled = false;
    setLookingUpPin(true);
    gn.postalCodeSearch(form.countryCode, place).then((rows) => {
      if (cancelled) return;
      setPinSearchRows(rows);
      setLookingUpPin(false);
    });
    return () => {
      cancelled = true;
    };
  }, [form.countryCode, form.district, form.locality]);

  useEffect(() => {
    const eq = (a?: string, b?: string) =>
      (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
    const filtered = pinSearchRows.filter((r) => {
      if (form.district && r.adminName2 && !eq(r.adminName2, form.district)) {
        // Tolerate "Tiruvallur" vs "Thiruvallur District" mismatches.
        if (normName(r.adminName2) !== normName(form.district)) return false;
      }
      if (form.locality && r.placeName && !eq(r.placeName, form.locality)) {
        if (normName(r.placeName) !== normName(form.locality)) return false;
      }
      return true;
    });
    const codes = Array.from(
      new Set((filtered.length ? filtered : pinSearchRows).map((r) => r.postalCode).filter(Boolean)),
    ).sort();
    setPincodeList(codes);
  }, [pinSearchRows, form.district, form.locality]);

  // ─── Pincode entered → reverse-fill the address ───
  useEffect(() => {
    const pin = form.pincode.trim();
    if (!pin) {
      setPinRows([]);
      lastPinRef.current = "";
      return;
    }
    if (isIndia && !/^\d{6}$/.test(pin)) return;
    if (pin.length < 3) return;
    if (pin === lastPinRef.current) return;
    // When the user has already chosen District + Locality, the pincode is
    // a downstream consequence — don't reverse-resolve and overwrite their
    // selections (which would cascade-clear and loop).
    if (form.district.trim() && form.locality.trim()) {
      lastPinRef.current = pin;
      return;
    }
    lastPinRef.current = pin;
    setLookingUpPin(true);

    gn.postalCodeLookup(form.countryCode, pin).then((rows) => {
      setLookingUpPin(false);
      setPinRows(rows);
      if (!rows.length) return;
      // Pincode hierarchy guarantees:
      //   digits 1–2 → State (ADM1)   — always correct
      //   digit  3   → District (ADM2) — always correct
      //   digits 4–6 → Delivery PO Hub — may map to many sub-districts /
      //                                   localities, so we list rather than pick.
      const stateName = rows[0].adminName1 || "";
      const districtName = rows[0].adminName2 || "";
      const locSet = Array.from(
        new Set(rows.map((r) => (r.placeName || "").trim()).filter(Boolean)),
      );
      setForm((s) => {
        const next = { ...s };
        if (stateName) {
          const st = State.getStatesOfCountry(next.countryCode).find(
            (x) => x.name.toLowerCase() === stateName.toLowerCase(),
          );
          if (st) next.stateCode = st.isoCode;
        }
        if (districtName) next.district = districtName;
        // Only auto-fill when unambiguous; otherwise leave blank so the user
        // picks from the constrained dropdown.
        if (locSet.length === 1) next.locality = locSet[0];
        else if (!locSet.some((l) => l.toLowerCase() === next.locality.toLowerCase()))
          next.locality = "";
        return next;
      });
    });
  }, [
    form.pincode,
    form.countryCode,
    isIndia,
    form.district,
    form.locality,
  ]);

  // ─── Geolocation one-shot autofill on mount ───
  useEffect(() => {
    if (geoTried) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setGeoTried(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
            { headers: { Accept: "application/json" } },
          );
          if (!r.ok) return;
          const j = (await r.json()) as {
            address?: Record<string, string>;
          };
          const a = j.address ?? {};
          const iso = (a.country_code || "").toUpperCase();
          const stName = a.state || a.region || "";
          const districtName =
            a.state_district || a.county || a.district || a.city_district || a.city || "";
          const subDistrict =
            a.suburb || a.town || a.village || a.municipality || a.subdistrict || "";
          const localityName =
            a.neighbourhood || a.hamlet || a.suburb || a.locality || a.road || "";
          const pin = a.postcode || "";
          setForm((s) => {
            const next = { ...s };
            if (iso && !next.stateCode && !next.district) next.countryCode = iso;
            if (!next.pincode && pin) next.pincode = pin;
            if (!next.locality && (localityName || subDistrict))
              next.locality = localityName || subDistrict;
            const targetIso = iso || next.countryCode;
            if (targetIso && stName && !next.stateCode) {
              const st = State.getStatesOfCountry(targetIso).find(
                (x) => x.name.toLowerCase() === stName.toLowerCase(),
              );
              if (st) next.stateCode = st.isoCode;
            }
            if (!next.district && districtName) next.district = districtName;
            return next;
          });
        } catch {
          /* ignore */
        }
      },
      () => {
        /* permission denied — silent */
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  }, [geoTried]);

  // ─── Derived dropdown options ───
  const districtOptions = useMemo(() => {
    const m = new Map<string, { value: string; label: string; keywords: string }>();
    for (const d of districtList)
      m.set(d.name, { value: d.name, label: d.name, keywords: d.name });
    if (form.district && !m.has(form.district))
      m.set(form.district, { value: form.district, label: form.district, keywords: form.district });
    return Array.from(m.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [districtList, form.district]);

  const localityOptions = useMemo(() => {
    const m = new Map<string, { value: string; label: string; keywords: string }>();
    if (pinRows.length > 0) {
      for (const r of pinRows) {
        const n = (r.placeName || "").trim();
        if (n) m.set(n, { value: n, label: n, keywords: n });
      }
    } else {
      for (const d of localityList)
        m.set(d.name, { value: d.name, label: d.name, keywords: d.name });
    }
    if (form.locality && !m.has(form.locality))
      m.set(form.locality, { value: form.locality, label: form.locality, keywords: form.locality });
    return Array.from(m.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [localityList, form.locality, pinRows]);

  const pincodeOptions = useMemo(() => {
    // Single source of truth: GeoNames postal search scoped to the selected
    // locality (same endpoint used by the reverse pincode→address lookup).
    const opts = pincodeList.map((p) => ({ value: p, label: p, keywords: p }));
    if (form.pincode && !pincodeList.includes(form.pincode))
      opts.unshift({ value: form.pincode, label: form.pincode, keywords: form.pincode });
    return opts;
  }, [pincodeList, form.pincode]);

  useEffect(() => {
    if (!form.locality || form.pincode) return;
    const codes = pincodeOptions.map((o) => o.value).filter(Boolean);
    // Only auto-fill when the locality maps to exactly one pincode. When
    // GeoNames returns several codes we leave it blank so the user picks.
    if (codes.length !== 1) return;
    setForm((s) => ({ ...s, pincode: codes[0] }));
  }, [form.locality, form.pincode, pincodeOptions]);

  function validateForm(): boolean {
    const { name, age, district, mobile_local, pincode, locality } = form;
    const country = selectedCountry?.name ?? "";
    if (!name || !age || !country || !stateName || !district || !mobile_local) {
      toast.error(lang === "ta" ? "அனைத்து புலங்களையும் நிரப்பவும்" : "Please fill in all fields");
      return false;
    }
    if (isIndia && (!pincode || !locality)) {
      toast.error(lang === "ta" ? "இந்தியாவிற்கு அஞ்சல் குறியீடு மற்றும் ஊர் தேவை" : "Pincode and Locality are required for India");
      return false;
    }
    const ageNum = Number(age);
    if (!Number.isFinite(ageNum) || ageNum < 1 || ageNum > 120) {
      toast.error(lang === "ta" ? "சரியான வயதை உள்ளிடவும்" : "Please enter a valid age");
      return false;
    }
    return true;
  }

  function openSignDialog() {
    if (!validateForm()) return;
    setPendingSig(null);
    setSignOpen(true);
  }

  function resetForm() {
    setDistrictList([]);
    setLocalityList([]);
    setPincodeList([]);
    setPinRows([]);
    setPinSearchRows([]);
    lastPinRef.current = "";
    setReferral("");
    setReferralOther("");
    setForm({
      name: "",
      age: "",
      countryCode: "IN",
      stateCode: "",
      district: "",
      locality: "",
      pincode: "",
      mobile_local: "",
    });
  }

  async function handleSubmit(sig: string) {
    const { name, age, district, mobile_local, pincode, locality } = form;
    const country = selectedCountry?.name ?? "";
    const ageNum = Number(age);
    const mobile_number = `${dialCode} ${mobile_local}`.trim();
    setBusy(true);
    try {
      const res = await submitDigitalSignature({
        data: {
          name,
          age: ageNum,
          country,
          state: stateName,
          district,
          sub_district: null,
          locality: locality || null,
          pincode: pincode || null,
          mobile_number,
          signature_image: sig,
          referral_source: referral || null,
          referral_other:
            referral === "others" ? referralOther.trim() || null : null,
        },
      });
      if (!res.ok) {
        if (res.error === "duplicate") {
          toast.error(lang === "ta" ? "இந்த கைபேசி எண் ஏற்கனவே கையொப்பமிட்டுள்ளது." : "This mobile number has already signed.");
        } else {
          toast.error(
            "debug" in res && res.debug
              ? `DB error: ${res.debug}`
              : lang === "ta" ? "ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்." : "Something went wrong. Please try again.",
          );
        }
        return;
      }
      setSignOpen(false);
      setResult({ id: res.id, name, voteNumber: res.voteNumber });
    } catch {
      toast.error(lang === "ta" ? "வலையமைப்பு பிழை — மீண்டும் முயற்சிக்கவும்" : "Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return <SuccessCard id={result.id} name={result.name} voteNumber={result.voteNumber} />;
  }

  const districtSelected = !!form.district.trim();
  const pinDriven = pinRows.length > 0;

  return (
    <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-8 space-y-6">
      <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-4">
        <Field label={t.sign.name}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} />
        </Field>
        <Field label={t.sign.age}>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            value={form.age}
            onChange={(e) => set("age", e.target.value)}
          />
        </Field>
        <Field label={t.sign.country}>
          <Combobox
            value={form.countryCode}
            onChange={(v) => {
              setDistrictList([]);
              setLocalityList([]);
              setPincodeList([]);
              lastPinRef.current = "";
              setForm((s) => ({
                ...s,
                countryCode: v,
                stateCode: "",
                district: "",
                locality: "",
                pincode: "",
              }));
            }}
            placeholder={lang === "ta" ? "நாட்டை தேர்ந்தெடுக்கவும்" : "Select country"}
            searchPlaceholder={lang === "ta" ? "நாட்டை தேடு..." : "Search country..."}
            emptyText={lang === "ta" ? "நாடு இல்லை" : "No country found"}
            options={countries.map((c) => ({
              value: c.isoCode,
              label: `${c.flag} ${c.name}`,
              keywords: c.name,
            }))}
          />
        </Field>
        <Field label={t.sign.state}>
          <Combobox
            value={form.stateCode}
            onChange={(v) =>
              setForm((s) => ({
                ...s,
                stateCode: v,
                district: "",
                locality: "",
                pincode: "",
              }))
            }
            disabled={!states.length}
            placeholder={states.length ? (lang === "ta" ? "மாநிலத்தைத் தேர்ந்தெடு" : "Select state") : (lang === "ta" ? "மாநிலங்கள் இல்லை" : "No states available")}
            searchPlaceholder={lang === "ta" ? "மாநிலத்தை தேடு..." : "Search state..."}
            emptyText={lang === "ta" ? "மாநிலம் இல்லை" : "No state found"}
            options={states.map((s) => ({ value: s.isoCode, label: s.name, keywords: s.name }))}
          />
        </Field>
        <Field label={t.sign.district}>
          <Combobox
            value={form.district}
            onChange={(v) =>
              setForm((s) => ({ ...s, district: v, locality: "", pincode: "" }))
            }
            disabled={!form.stateCode}
            placeholder={
              !form.stateCode
                ? (lang === "ta" ? "முதலில் மாநிலத்தைத் தேர்ந்தெடு" : "Select state first")
                : loadingDistricts
                  ? (lang === "ta" ? "மாவட்டங்கள் ஏற்றப்படுகிறது…" : "Loading districts…")
                  : (lang === "ta" ? "மாவட்டத்தைத் தேர்ந்தெடு" : "Select district")
            }
            searchPlaceholder={lang === "ta" ? "மாவட்டத்தை தேடு..." : "Search district..."}
            emptyText={loadingDistricts ? (lang === "ta" ? "ஏற்றுகிறது…" : "Loading…") : (lang === "ta" ? "மாவட்டம் இல்லை" : "No district found")}
            loading={loadingDistricts}
            loadingText={lang === "ta" ? "மாவட்டங்கள் ஏற்றப்படுகிறது…" : "Loading districts…"}
            options={districtOptions}
            allowCustomValue
          />
        </Field>
        <Field
          label={isIndia ? (lang === "ta" ? "ஊர்" : "Locality") : lang === "ta" ? "ஊர் / நகரம் (விருப்பமானது)" : "Locality / City (optional)"}
        >
          <Combobox
            value={form.locality}
            onChange={(v) => setForm((s) => ({ ...s, locality: v }))}
            disabled={!districtSelected && !pinDriven && localityOptions.length === 0}
            placeholder={
              !districtSelected && !pinDriven && localityOptions.length === 0
                ? (lang === "ta" ? "முதலில் மாவட்டத்தைத் தேர்ந்தெடு" : "Select district first")
                : loadingLocality
                  ? (lang === "ta" ? "ஏற்றுகிறது…" : "Loading…")
                  : (lang === "ta" ? "ஊர் தேர்ந்தெடு" : "Select locality")
            }
            searchPlaceholder={lang === "ta" ? "ஊர் தேடு..." : "Search locality..."}
            emptyText={loadingLocality ? (lang === "ta" ? "ஏற்றுகிறது…" : "Loading…") : (lang === "ta" ? "ஊர் இல்லை" : "No locality found")}
            loading={loadingLocality}
            loadingText={lang === "ta" ? "ஊர்கள் ஏற்றப்படுகிறது…" : "Loading localities…"}
            options={localityOptions}
            allowCustomValue
          />
        </Field>
        <Field
          label={
            isIndia
              ? (lang === "ta" ? "அஞ்சல் குறியீடு" : "Pincode / Postcode")
              : (lang === "ta" ? "அஞ்சல் குறியீடு" : "Pincode / Postcode")
          }
        >
          <Combobox
            value={form.pincode}
            onChange={(v) => set("pincode", v)}
            disabled={!form.countryCode}
            placeholder={
              !form.countryCode
                ? (lang === "ta" ? "முதலில் நாட்டைத் தேர்ந்தெடு" : "Select country first")
                : isIndia
                  ? (lang === "ta" ? "அஞ்சல் குறியீடு தேர்ந்தெடு அல்லது தட்டச்சு செய்" : "Select or type pincode")
                  : (lang === "ta" ? "அஞ்சல் குறியீடு தேர்ந்தெடு அல்லது தட்டச்சு செய்" : "Select or type postcode")
            }
            searchPlaceholder={isIndia ? (lang === "ta" ? "6 இலக்க அஞ்சல் குறியீடு..." : "Type 6-digit pincode...") : (lang === "ta" ? "அஞ்சல் குறியீடு..." : "Type postcode...")}
            emptyText={
              isIndia
                ? (lang === "ta" ? "6 இலக்க அஞ்சல் குறியீட்டை தட்டச்சு செய்து Enter அழுத்தவும்" : "Type a 6-digit pincode and press Enter")
                : (lang === "ta" ? "அஞ்சல் குறியீட்டை தட்டச்சு செய்து Enter அழுத்தவும்" : "Type your postcode and press Enter")
            }
            loading={lookingUpPin}
            loadingText={lang === "ta" ? "தேடுகிறது…" : "Looking up…"}
            options={pincodeOptions}
            allowCustomValue
            onSearchChange={(s) => {
              const t = s.trim();
              // Auto-commit a full Indian 6-digit PIN as the user finishes
              // typing, so reverse-resolution runs without requiring Enter.
              if (isIndia && /^\d{6}$/.test(t) && t !== form.pincode) {
                set("pincode", t);
              }
            }}
          />
        </Field>
        <Field label={t.sign.phone}>
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
              placeholder={lang === "ta" ? "கைபேசி எண்" : "Phone number"}
            />
          </div>
        </Field>
      </fieldset>

      <div className="flex gap-3">
        <Button onClick={openSignDialog} disabled={busy} size="lg" className="flex-1">
          {lang === "ta" ? "மதிப்பீடு & கையொப்பம்" : "Review & Sign"}
        </Button>
        <Button type="button" variant="outline" onClick={resetForm} disabled={busy} size="lg">
          {lang === "ta" ? "மீட்டமை" : "Reset"}
        </Button>
      </div>

      <Dialog
        open={signOpen}
        onOpenChange={(o) => {
          if (busy) return;
          setSignOpen(o);
          if (!o) setPendingSig(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {lang === "ta" ? "உறுதிப்படுத்த கையொப்பமிடுங்கள்" : "Sign to confirm"}
            </DialogTitle>
            <DialogDescription>
              {lang === "ta"
                ? "உங்கள் ஆதரவை உறுதிப்படுத்த கீழே உங்கள் கையொப்பத்தை வரையவும்."
                : "Draw your signature below to confirm your support."}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-card p-4 text-sm leading-relaxed text-foreground whitespace-pre-line">
            {lang === "ta"
              ? "வடலூரை அதிகாரப்பூர்வமாக 'புனித நகரமாக' அறிவிக்கக் கோரும் இந்த விருப்ப உறுதிமொழியில் கையெழுத்திடுவதன் மூலம், அக்கோரிக்கையை நான் முழு மனதுடன் ஆதரிக்கிறேன். வள்ளலாருடன் தொடர்புடைய புனிதத் தலங்களான வடலூர், மருதூர், கருங்குழி மற்றும் மேட்டுக்குப்பம் ஆகியவற்றைச் சுற்றியுள்ள சுமார் 15 கி.மீ சுற்றளவில், இறைச்சி, அசைவ உணவுகள், மது மற்றும் போதைப்பொருட்கள் விற்பனைக்கு முழுமையான சட்டப்பூர்வத் தடை விதிப்பதை நான் முழுமையாக அங்கீகரிக்கிறேன்.\n\nஅரசு மேற்கொள்ளும் எந்தவொரு அதிகாரப்பூர்வ சரிபார்ப்பு அல்லது விசாரணையின்போதும், இந்த முடிவில் முழு விருப்பத்துடனும் முழு ஒப்புதலுடனும் உறுதியாக நிற்பேன் என்று நான் உறுதியளிக்கிறேன்."
              : "By signing this voluntary declaration seeking to officially declare Vadalur as a 'Holy City', I wholeheartedly support the demand. I fully endorse the imposition of a complete legal ban on the sale of meat, non-vegetarian food, alcohol and drugs within a radius of approximately 15 km around the holy places associated with Vallalar, namely Vadalur, Marudhur, Karunguzhi and Mettukuppam.\n\nI undertake to stand firm in this decision with full willingness and full consent during any official verification or investigation conducted by the government."}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {lang === "ta"
                ? "இந்த பிரச்சாரத்தைப் பற்றி நீங்கள் எப்படி அறிந்தீர்கள்? *"
                : "How did you hear about this campaign? *"}
            </p>
            <RadioGroup
              value={referral}
              onValueChange={(v) => setReferral(v as ReferralSource)}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {[
                { v: "facebook", label: "Facebook" },
                { v: "instagram", label: "Instagram" },
                { v: "youtube", label: "YouTube" },
                { v: "whatsapp", label: "WhatsApp" },
                { v: "twitter", label: "Twitter (X)" },
                { v: "others", label: lang === "ta" ? "மற்றவை" : "Others" },
              ].map((o) => (
                <label
                  key={o.v}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm cursor-pointer hover:bg-secondary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value={o.v} id={`ref-${o.v}`} />
                  <span>{o.label}</span>
                </label>
              ))}
            </RadioGroup>
            {referral === "others" && (
              <div className="w-full pt-1">
                <Input
                  autoFocus
                  value={referralOther}
                  onChange={(e) => setReferralOther(e.target.value)}
                  maxLength={200}
                  className="w-full"
                  placeholder={
                    lang === "ta"
                      ? "தயவுசெய்து குறிப்பிடவும்"
                      : "Please specify how you heard about us"
                  }
                />
              </div>
            )}
          </div>
          <SignaturePad onChange={setPendingSig} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSignOpen(false);
                setPendingSig(null);
              }}
              disabled={busy}
            >
              {lang === "ta" ? "ரத்து" : "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (pendingSig) void handleSubmit(pendingSig);
              }}
              disabled={
                busy ||
                !pendingSig ||
                !referral ||
                (referral === "others" && !referralOther.trim())
              }
            >
              {busy
                ? lang === "ta" ? "சமர்ப்பிக்கிறது…" : "Submitting…"
                : lang === "ta" ? "கையொப்பத்தை சமர்ப்பி" : "Submit Signature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────── Success ───────────────

function SuccessCard({ id, name, voteNumber }: { id: string; name: string; voteNumber: number }) {
  const { lang } = useLang();
  const thankYouUrl = thankYouVideo;
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  return (
    <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-10 text-center animate-reveal overflow-hidden">
      {thankYouUrl && (
        <div className="relative mx-auto w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden mb-6 bg-secondary/40">
          <img
            src={heroImg}
            alt="Vallalar blessing"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {!videoFailed && (
            <video
              src={thankYouUrl}
              poster={heroImg}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onCanPlay={() => setVideoReady(true)}
              onError={() => setVideoFailed(true)}
              aria-label={lang === "ta" ? "நன்றி ஆசி வீடியோ" : "Thank you blessing video"}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${videoReady ? "opacity-100" : "opacity-0"}`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
        </div>
      )}
      <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">
        {lang === "ta" ? "நன்றி" : "THANK YOU"}
      </p>
      <h2 className="mt-3 text-3xl md:text-4xl font-display font-bold">
        {lang === "ta" ? `நன்றி, ${name}!` : `Thank you, ${name}!`}
      </h2>
      <p className="mt-2 text-muted-foreground">
        {lang === "ta"
          ? `நீங்கள் #${voteNumber.toLocaleString()} வரிசை எண் கையொப்பம்`
          : `You are vote number #${voteNumber.toLocaleString()}`}
      </p>
      <div className="mt-6 inline-flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 px-8 py-4">
        <span className="text-xs font-mono uppercase tracking-widest text-accent">
          {lang === "ta" ? "கையொப்ப ID" : "Signature ID"}
        </span>
        <span className="mt-1 text-sm font-mono font-bold text-primary tracking-tight break-all max-w-xs">
          {id}
        </span>
      </div>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link
          to="/wall"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full ring-1 ring-border text-sm font-medium hover:bg-secondary"
        >
          {lang === "ta" ? "கையொப்பச் சுவரைக் காண் →" : "View the Wall →"}
        </Link>
      </div>
    </div>
  );
}