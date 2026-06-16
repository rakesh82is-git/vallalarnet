import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import heroImg from "@/assets/vallalar_with_animals_2.jpeg";
import thankYouVideo from "@/assets/vallalar-thankyou.mp4";
import {
  submitDigitalSignature,
  submitManualSignature,
  listManualSignatures,
} from "@/lib/petition.functions";
import * as gn from "@/lib/geonames";

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

type PostalOffice = {
  State: string | null;
  District: string | null;
  Block?: string | null;
  Name: string | null;
  Pincode?: string | null;
};

type PincodeEntry = {
  pincode: string;
  district?: string;
  sub_district?: string;
  locality?: string;
};

const clean = (value?: string | null) => (value ?? "").trim().toLowerCase();
const sameText = (a?: string | null, b?: string | null) => !!clean(a) && clean(a) === clean(b);
const preferredLocality = "Vadalur";
const usableBlock = (block?: string | null) => {
  const value = (block ?? "").trim();
  return value && value.toLowerCase() !== "na" ? value : "";
};

function scorePostalOffice(
  office: PostalOffice,
  address: { stateName?: string; district?: string; sub_district?: string; locality?: string },
) {
  let score = 0;
  if (address.stateName && sameText(office.State, address.stateName)) score += 8;
  if (address.district && sameText(office.District, address.district)) score += 16;
  if (address.sub_district && sameText(usableBlock(office.Block), address.sub_district)) score += 32;
  if (address.locality && sameText(office.Name, address.locality)) score += 128;
  if (!address.locality && sameText(office.Name, preferredLocality)) score += 4;
  return score;
}

function choosePostalOffice(
  offices: PostalOffice[],
  address: { stateName?: string; district?: string; sub_district?: string; locality?: string },
) {
  return [...offices].sort(
    (a, b) =>
      scorePostalOffice(b, address) - scorePostalOffice(a, address) ||
      Number(sameText(b.Name, preferredLocality)) - Number(sameText(a.Name, preferredLocality)),
  )[0];
}

function postalOfficeToPincodeEntry(po: PostalOffice): PincodeEntry {
  return {
    pincode: po.Pincode ?? "",
    district: po.District,
    sub_district: usableBlock(po.Block) || undefined,
    locality: po.Name,
  };
}

function SignPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-10 animate-reveal">
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent">PETITION</p>
        <div className="mt-6 flex flex-col items-center max-w-2xl mx-auto">
          <img
            src={heroImg}
            alt="Vallalar"
            width={256}
            height={256}
            loading="lazy"
            className="w-40 h-40 sm:w-56 sm:h-56 rounded-2xl object-cover ring-1 ring-border shadow-lg"
          />
          <div className="mt-5">
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
    sub_district: "",
    locality: "",
    pincode: "",
    mobile_local: "",
  });
  const [signOpen, setSignOpen] = useState(false);
  const [pendingSig, setPendingSig] = useState<string | null>(null);
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
  const [subDistrictList, setSubDistrictList] = useState<gn.GnPlace[]>([]);
  const [localityList, setLocalityList] = useState<gn.GnPlace[]>([]);
  const [pincodeList, setPincodeList] = useState<string[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);
  const [loadingLocality, setLoadingLocality] = useState(false);
  const [lookingUpPin, setLookingUpPin] = useState(false);

  // India-only enrichment via api.postalpincode.in (Tiruvallur etc. with
  // authoritative block + pincode mapping). Augments the GeoNames lists.
  const [indiaPostOffices, setIndiaPostOffices] = useState<PostalOffice[]>([]);
  // Pincode dataset that powers the Pincode dropdown only. It is widened
  // from the best available selection level, then filtered by the current
  // State / District / Sub-District / Locality in `pincodeOptions`.
  const [statePincodes, setStatePincodes] = useState<PincodeEntry[]>([]);
  const lastPinRef = useRef<string>("");

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((s) => ({ ...s, [k]: v }));
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
    })();
    return () => {
      cancelled = true;
    };
  }, [form.countryCode, stateName]);

  // ─── District → sub-district list (ADM3 children) ───
  useEffect(() => {
    if (!form.district) {
      setSubDistrictList([]);
      return;
    }
    const parent = districtList.find(
      (d) =>
        d.name.toLowerCase() === form.district.toLowerCase() ||
        d.toponymName.toLowerCase() === form.district.toLowerCase(),
    );
    if (!parent) {
      setSubDistrictList([]);
      return;
    }
    let cancelled = false;
    setLoadingSub(true);
    gn.getChildren(parent.geonameId).then((kids) => {
      if (cancelled) return;
      const adm3 = kids.filter((k) => k.fcode?.startsWith("ADM3"));
      setSubDistrictList(adm3.length ? adm3 : kids);
      setLoadingSub(false);
    });
    return () => {
      cancelled = true;
    };
  }, [form.district, districtList]);

  // ─── Sub-district → locality list (populated-place children) ───
  useEffect(() => {
    if (!form.sub_district) {
      setLocalityList([]);
      return;
    }
    const parent = subDistrictList.find(
      (d) =>
        d.name.toLowerCase() === form.sub_district.toLowerCase() ||
        d.toponymName.toLowerCase() === form.sub_district.toLowerCase(),
    );
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
    });
    return () => {
      cancelled = true;
    };
  }, [form.sub_district, subDistrictList]);

  // ─── Locality → pincode list (GeoNames postal search) ───
  useEffect(() => {
    const place = form.locality.trim();
    if (!place || !form.countryCode) {
      setPincodeList([]);
      return;
    }
    let cancelled = false;
    setLookingUpPin(true);
    gn.postalCodeSearch(form.countryCode, place).then((rows) => {
      if (cancelled) return;
      const codes = Array.from(new Set(rows.map((r) => r.postalCode).filter(Boolean))).sort();
      setPincodeList(codes);
      setLookingUpPin(false);
    });
    return () => {
      cancelled = true;
    };
  }, [form.countryCode, form.locality]);

  // ─── India enrichment: lookup post offices by district (broadest set we
  //     filter down via sub_district / locality in pincodeOptions). ───
  useEffect(() => {
    if (!isIndia) {
      setIndiaPostOffices([]);
      return;
    }
    const place = form.district.trim() || form.locality.trim();
    if (!place) {
      setIndiaPostOffices([]);
      return;
    }
    let cancelled = false;
    fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(place)}`)
      .then((r) => r.json())
      .then((j: Array<{ Status: string; PostOffice?: PostalOffice[] }>) => {
        if (cancelled) return;
        const entry = j?.[0];
        if (entry?.Status !== "Success" || !entry.PostOffice?.length) return;
        const wanted = entry.PostOffice.filter((p) => {
          if (stateName && p.State?.toLowerCase() !== stateName.toLowerCase()) return false;
          if (form.district && !sameText(p.District, form.district)) return false;
          return true;
        });
        setIndiaPostOffices(wanted.length ? wanted : entry.PostOffice);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isIndia, form.district, form.locality, stateName]);

  // ─── Selected address level → pincode dataset for the Pincode dropdown ───
  // India has no reliable full-state pincode endpoint in the public API, so
  // load from the most specific stable level available. The dropdown then
  // filters the loaded rows by District / Sub-District / Locality.
  useEffect(() => {
    if (!form.countryCode || !stateName) {
      setStatePincodes([]);
      return;
    }
    let cancelled = false;
    if (isIndia) {
      const searchTerm = form.locality.trim() || form.sub_district.trim() || form.district.trim();
      if (!searchTerm) {
        setStatePincodes([]);
        return;
      }
      fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(searchTerm)}`)
        .then((r) => r.json())
        .then((j: Array<{ Status: string; PostOffice?: PostalOffice[] }>) => {
          if (cancelled) return;
          const entry = j?.[0];
          if (entry?.Status !== "Success" || !entry.PostOffice?.length) {
            setStatePincodes([]);
            return;
          }
          const rows: PincodeEntry[] = entry.PostOffice.filter((p) =>
            sameText(p.State, stateName),
          ).map(postalOfficeToPincodeEntry);
          setStatePincodes(rows.filter((r) => r.pincode));
        })
        .catch(() => {
          if (!cancelled) setStatePincodes([]);
        });
    } else {
      gn.postalCodeSearch(form.countryCode, stateName).then((rows) => {
        if (cancelled) return;
        setStatePincodes(
          rows
            .filter((r) => r.postalCode)
            .map((r) => ({
              pincode: r.postalCode,
              district: r.adminName2,
              sub_district: r.adminName3,
              locality: r.placeName,
            })),
        );
      });
    }
    return () => {
      cancelled = true;
    };
  }, [isIndia, form.countryCode, stateName, form.district, form.sub_district, form.locality]);

  // ─── Pincode entered → reverse-fill the address ───
  useEffect(() => {
    const pin = form.pincode.trim();
    if (pin.length < 3) return;
    if (pin === lastPinRef.current) return;
    if (isIndia && !/^\d{6}$/.test(pin)) return;
    lastPinRef.current = pin;
    setLookingUpPin(true);

    if (isIndia) {
      fetch(`https://api.postalpincode.in/pincode/${pin}`)
        .then((r) => r.json())
        .then((j: Array<{ Status: string; PostOffice?: PostalOffice[] }>) => {
          const entry = j?.[0];
          if (entry?.Status !== "Success" || !entry.PostOffice?.length) return;
          const offices = entry.PostOffice;
          setIndiaPostOffices(offices);
          setStatePincodes((rows) => {
            const next = new Map(
              rows.map((r) => [`${r.pincode}|${r.locality}|${r.sub_district ?? ""}`, r]),
            );
            for (const office of offices) {
              const row = postalOfficeToPincodeEntry(office);
              if (row.pincode) {
                next.set(`${row.pincode}|${row.locality}|${row.sub_district ?? ""}`, row);
              }
            }
            return Array.from(next.values());
          });
          const po =
            offices.find((o) => sameText(o.Name, form.locality)) ??
            offices.find((o) => sameText(usableBlock(o.Block), form.sub_district)) ??
            offices.find((o) => sameText(o.District, form.district)) ??
            offices[0];
          setForm((s) => {
            const next = { ...s };
            const st = State.getStatesOfCountry("IN").find((x) => sameText(x.name, po.State));
            if (st) next.stateCode = st.isoCode;
            next.district = po.District;
            const blocks = Array.from(
              new Set(offices.map((o) => usableBlock(o.Block)).filter(Boolean)),
            );
            const selectedBlock = usableBlock(po.Block);
            if (selectedBlock) next.sub_district = selectedBlock;
            else if (blocks.length === 1) next.sub_district = blocks[0];
            if (sameText(po.Name, s.locality)) next.locality = po.Name;
            else if (!s.locality && offices.length === 1) next.locality = offices[0].Name;
            return next;
          });
        })
        .catch(() => {})
        .finally(() => setLookingUpPin(false));
      return;
    }

    gn.postalCodeLookup(form.countryCode, pin).then((rows) => {
      const r = rows[0];
      setLookingUpPin(false);
      if (!r) return;
      setForm((s) => {
        const next = { ...s };
        if (r.adminName1 && !next.stateCode) {
          const st = State.getStatesOfCountry(next.countryCode).find(
            (x) => x.name.toLowerCase() === r.adminName1!.toLowerCase(),
          );
          if (st) next.stateCode = st.isoCode;
        }
        if (!next.district && r.adminName2) next.district = r.adminName2;
        if (!next.sub_district && r.adminName3) next.sub_district = r.adminName3;
        if (!next.locality && r.placeName) next.locality = r.placeName;
        return next;
      });
    });
  }, [form.pincode, isIndia, form.countryCode, form.locality, form.sub_district, form.district]);

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
            if (!next.sub_district && subDistrict) next.sub_district = subDistrict;
            if (!next.locality && localityName) next.locality = localityName;
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
    for (const d of districtList) m.set(d.name, { value: d.name, label: d.name, keywords: d.name });
    if (form.district && !m.has(form.district))
      m.set(form.district, { value: form.district, label: form.district, keywords: form.district });
    return Array.from(m.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [districtList, form.district]);

  const subDistrictOptions = useMemo(() => {
    const m = new Map<string, { value: string; label: string; keywords: string }>();
      for (const d of subDistrictList)
        m.set(d.name, { value: d.name, label: d.name, keywords: d.name });
    if (isIndia) {
      for (const p of indiaPostOffices) {
        const b = p.Block;
        if (b && b !== "NA" && !m.has(b)) m.set(b, { value: b, label: b, keywords: b });
      }
    }
    if (form.sub_district && !m.has(form.sub_district))
      m.set(form.sub_district, {
        value: form.sub_district,
        label: form.sub_district,
        keywords: form.sub_district,
      });
    return Array.from(m.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [subDistrictList, indiaPostOffices, isIndia, form.sub_district]);

  const localityOptions = useMemo(() => {
    const m = new Map<string, { value: string; label: string; keywords: string }>();
    for (const d of localityList) m.set(d.name, { value: d.name, label: d.name, keywords: d.name });
    if (isIndia) {
      for (const p of indiaPostOffices) {
        if (form.sub_district && p.Block !== form.sub_district && p.Block !== "NA") continue;
        if (!m.has(p.Name)) m.set(p.Name, { value: p.Name, label: p.Name, keywords: p.Name });
      }
    }
    if (form.locality && !m.has(form.locality))
      m.set(form.locality, { value: form.locality, label: form.locality, keywords: form.locality });
    return Array.from(m.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [localityList, indiaPostOffices, isIndia, form.sub_district, form.locality]);

  const pincodeOptions = useMemo(() => {
    const filtered = statePincodes.filter((r) => {
      if (form.district && !sameText(r.district, form.district)) return false;
      if (form.sub_district && r.sub_district && !sameText(r.sub_district, form.sub_district))
        return false;
      if (form.sub_district && !r.sub_district && !form.locality) return false;
      if (form.locality && !sameText(r.locality, form.locality)) return false;
      return true;
    });
    const arr = Array.from(new Set(filtered.map((r) => r.pincode))).sort();
    const opts = arr.map((p) => ({ value: p, label: p, keywords: p }));
    if (form.pincode && !arr.includes(form.pincode))
      opts.unshift({ value: form.pincode, label: form.pincode, keywords: form.pincode });
    return opts;
  }, [statePincodes, form.district, form.sub_district, form.locality, form.pincode]);

  useEffect(() => {
    if (!form.locality || form.pincode) return;
    const codes = pincodeOptions.map((o) => o.value).filter(Boolean);
    if (codes.length === 1) setForm((s) => ({ ...s, pincode: codes[0] }));
  }, [form.locality, form.pincode, pincodeOptions]);

  function validateForm(): boolean {
    const { name, age, district, mobile_local, pincode, sub_district, locality } = form;
    const country = selectedCountry?.name ?? "";
    if (!name || !age || !country || !stateName || !district || !mobile_local) {
      toast.error("Please fill in all fields");
      return false;
    }
    if (isIndia && (!pincode || !sub_district || !locality)) {
      toast.error("Pincode, Sub-District and Locality are required for India");
      return false;
    }
    const ageNum = Number(age);
    if (!Number.isFinite(ageNum) || ageNum < 1 || ageNum > 120) {
      toast.error("Please enter a valid age");
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
    setSubDistrictList([]);
    setLocalityList([]);
    setPincodeList([]);
    setIndiaPostOffices([]);
    setStatePincodes([]);
    lastPinRef.current = "";
    setForm({
      name: "",
      age: "",
      countryCode: "IN",
      stateCode: "",
      district: "",
      sub_district: "",
      locality: "",
      pincode: "",
      mobile_local: "",
    });
  }

  async function handleSubmit(sig: string) {
    const { name, age, district, mobile_local, pincode, sub_district, locality } = form;
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
          sub_district: sub_district || null,
          locality: locality || null,
          pincode: pincode || null,
          mobile_number,
          signature_image: sig,
        },
      });
      if (!res.ok) {
        if (res.error === "duplicate") {
          toast.error("This mobile number has already signed.");
        } else {
          toast.error(
            "debug" in res && res.debug
              ? `DB error: ${res.debug}`
              : "Something went wrong. Please try again.",
          );
        }
        return;
      }
      setSignOpen(false);
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

  const districtSelected = !!form.district.trim();
  const subSelected = !!form.sub_district.trim();

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
          <Combobox
            value={form.countryCode}
            onChange={(v) => {
              setDistrictList([]);
              setSubDistrictList([]);
              setLocalityList([]);
              setPincodeList([]);
              setIndiaPostOffices([]);
              setStatePincodes([]);
              lastPinRef.current = "";
              setForm((s) => ({
                ...s,
                countryCode: v,
                stateCode: "",
                district: "",
                sub_district: "",
                locality: "",
                pincode: "",
              }));
            }}
            placeholder="Select country"
            searchPlaceholder="Search country..."
            emptyText="No country found"
            options={countries.map((c) => ({
              value: c.isoCode,
              label: `${c.flag} ${c.name}`,
              keywords: c.name,
            }))}
          />
        </Field>
        <Field label="State / மாநிலம்">
          <Combobox
            value={form.stateCode}
            onChange={(v) =>
              setForm((s) => ({
                ...s,
                stateCode: v,
                district: "",
                sub_district: "",
                locality: "",
                pincode: "",
              }))
            }
            disabled={!states.length}
            placeholder={states.length ? "Select state" : "No states available"}
            searchPlaceholder="Search state..."
            emptyText="No state found"
            options={states.map((s) => ({ value: s.isoCode, label: s.name, keywords: s.name }))}
          />
        </Field>
        <Field label="District / மாவட்டம்">
          <Combobox
            value={form.district}
            onChange={(v) =>
              setForm((s) => ({ ...s, district: v, sub_district: "", locality: "", pincode: "" }))
            }
            disabled={!form.stateCode}
            placeholder={
              !form.stateCode
                ? "Select state first"
                : loadingDistricts
                  ? "Loading districts…"
                  : "Select district"
            }
            searchPlaceholder="Search district..."
            emptyText={loadingDistricts ? "Loading…" : "No district found"}
            loading={loadingDistricts}
            loadingText="Loading districts…"
            options={districtOptions}
          />
        </Field>
        <Field
          label={
            isIndia
              ? "Sub-District / வட்டம்"
              : "Sub-District / County (optional)"
          }
        >
          <Combobox
            value={form.sub_district}
            onChange={(v) =>
              setForm((s) => ({ ...s, sub_district: v, locality: "", pincode: "" }))
            }
            disabled={!districtSelected}
            placeholder={
              !districtSelected
                ? "Select district first"
                : loadingSub
                  ? "Loading…"
                  : "Select sub-district"
            }
            searchPlaceholder="Search sub-district..."
            emptyText={loadingSub ? "Loading…" : "No sub-district found"}
            loading={loadingSub}
            loadingText="Loading sub-districts…"
            options={subDistrictOptions}
          />
        </Field>
        <Field
          label={isIndia ? "Locality / ஊர்" : "Locality / City (optional)"}
        >
          <Combobox
            value={form.locality}
            onChange={(v) => setForm((s) => ({ ...s, locality: v }))}
            disabled={!subSelected && localityOptions.length === 0}
            placeholder={
              !subSelected && localityOptions.length === 0
                ? "Select sub-district first"
                : loadingLocality
                  ? "Loading…"
                  : "Select locality"
            }
            searchPlaceholder="Search locality..."
            emptyText={loadingLocality ? "Loading…" : "No locality found"}
            loading={loadingLocality}
            loadingText="Loading localities…"
            options={localityOptions}
          />
        </Field>
        <Field
          label={
            isIndia
              ? "Pincode / Postcode / அஞ்சல் குறியீடு"
              : "Pincode / Postcode"
          }
        >
          <Combobox
            value={form.pincode}
            onChange={(v) => set("pincode", v)}
            disabled={!form.countryCode}
            placeholder={
              !form.countryCode
                ? "Select country first"
                : isIndia
                  ? "Select or type pincode"
                  : "Select or type postcode"
            }
            searchPlaceholder={isIndia ? "Type 6-digit pincode..." : "Type postcode..."}
            emptyText={
              isIndia
                ? "Type a 6-digit pincode and press Enter"
                : "Type your postcode and press Enter"
            }
            loading={lookingUpPin}
            loadingText="Looking up…"
            options={pincodeOptions}
            allowCustomValue
          />
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

      <div className="flex gap-3">
        <Button onClick={openSignDialog} disabled={busy} size="lg" className="flex-1">
          Review & Sign
        </Button>
        <Button type="button" variant="outline" onClick={resetForm} disabled={busy} size="lg">
          Reset
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
            <DialogTitle>Sign to confirm</DialogTitle>
            <DialogDescription>
              Draw your signature below to confirm your support.
              <br />
              <span className="text-xs">உங்கள் கையொப்பத்தை இங்கே வரையவும்</span>
            </DialogDescription>
          </DialogHeader>
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
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (pendingSig) void handleSubmit(pendingSig);
              }}
              disabled={busy || !pendingSig}
            >
              {busy ? "Submitting…" : "Submit Signature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const thankYouUrl = thankYouVideo;
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  return (
    <div className="rounded-3xl bg-card ring-1 ring-border p-6 md:p-10 text-center animate-reveal overflow-hidden">
      {thankYouUrl && (
        <div className="relative mx-auto w-full max-w-md aspect-square rounded-2xl overflow-hidden mb-6 bg-secondary/40">
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
              aria-label="Thank you blessing video"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${videoReady ? "opacity-100" : "opacity-0"}`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
        </div>
      )}
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