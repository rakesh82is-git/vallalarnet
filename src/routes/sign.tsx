import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Country, State, City } from "country-state-city";
import { toast } from "sonner";
import { SignaturePad } from "@/components/signature-pad";
import heroImg from "@/assets/vallalar_with_animals_2.jpeg";
import thankYouVideo from "@/assets/vallalar-thankyou.mp4";
import {
  submitDigitalSignature,
  submitManualSignature,
  listManualSignatures,
} from "@/lib/petition.functions";

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
  State: string;
  District: string;
  Block?: string;
  Name: string;
  Pincode?: string;
};

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
  const [result, setResult] = useState<{ id: string; name: string; voteNumber: number } | null>(null);
  const [geoTried, setGeoTried] = useState(false);
  const [lookingUpPin, setLookingUpPin] = useState(false);
  const [pinSearch, setPinSearch] = useState("");
  const lastPinRef = useRef<string>("");
  const [pinPostOffices, setPinPostOffices] = useState<PostalOffice[]>([]);
  const [districtPostOffices, setDistrictPostOffices] = useState<PostalOffice[]>([]);
  const [foreignPostcodeOptions, setForeignPostcodeOptions] = useState<
    Array<{ value: string; label: string; keywords: string }>
  >([]);
  const lastDistrictRef = useRef<string>("");

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
  const isIndia = form.countryCode === "IN";

  // Merge district-derived + pincode-derived post offices for the dropdowns.
  const availablePostOffices = useMemo(() => {
    const map = new Map<string, PostalOffice>();
    for (const o of [...districtPostOffices, ...pinPostOffices]) {
      map.set(`${o.Pincode ?? ""}::${o.Block}::${o.Name}`, o);
    }
    return Array.from(map.values());
  }, [districtPostOffices, pinPostOffices]);

  const pincodeOptions = useMemo(() => {
    const options = isIndia
      ? Array.from(
          new Set(
            availablePostOffices
              .map((o) => o.Pincode)
              .filter((pin): pin is string => !!pin),
          ),
        )
          .sort((a, b) => a.localeCompare(b))
          .map((pin) => ({ value: pin, label: pin, keywords: pin }))
      : foreignPostcodeOptions;
    if (form.pincode && !options.some((o) => o.value === form.pincode)) {
      return [{ value: form.pincode, label: form.pincode, keywords: form.pincode }, ...options];
    }
    return options;
  }, [availablePostOffices, foreignPostcodeOptions, form.pincode, isIndia]);

  // ─── Auto-fill via geolocation (one-shot, on mount) ───
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
          const stateName = a.state || a.region || "";
          const districtName =
            a.state_district || a.county || a.district || a.city_district || a.city || "";
          const subDistrict =
            a.suburb || a.town || a.village || a.municipality || a.subdistrict || "";
          const localityName = a.neighbourhood || a.hamlet || a.suburb || a.locality || a.road || "";
          const pin = a.postcode || "";
          setForm((s) => {
            const next = { ...s };
            if (iso && !next.stateCode && !next.district) next.countryCode = iso;
            if (!next.pincode && pin) next.pincode = pin;
            if (!next.sub_district && subDistrict) next.sub_district = subDistrict;
            if (!next.locality && localityName) next.locality = localityName;
            // Try to map state name → ISO code in the target country
            const targetIso = iso || next.countryCode;
            if (targetIso && stateName && !next.stateCode) {
              const st = State.getStatesOfCountry(targetIso).find(
                (x) => x.name.toLowerCase() === stateName.toLowerCase(),
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
        /* permission denied or unavailable — silent fallback to pincode entry */
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  }, [geoTried]);

  // ─── India district → sub-district/locality options ───
  useEffect(() => {
    if (!isIndia) {
      setDistrictPostOffices([]);
      return;
    }
    const d = form.district.trim();
    if (!d) {
      setDistrictPostOffices([]);
      lastDistrictRef.current = "";
      return;
    }
    if (d === lastDistrictRef.current) return;
    lastDistrictRef.current = d;
    fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(d)}`)
      .then((r) => r.json())
      .then((j: Array<{ Status: string; PostOffice?: Array<{ State: string; District: string; Block: string; Name: string }> }>) => {
        const entry = j?.[0];
        if (!entry || entry.Status !== "Success" || !entry.PostOffice?.length) {
          setDistrictPostOffices([]);
          return;
        }
        const stateName = states.find((s) => s.isoCode === form.stateCode)?.name?.toLowerCase();
        const offices = entry.PostOffice.filter(
          (o) =>
            o.District.toLowerCase() === d.toLowerCase() &&
            (!stateName || o.State.toLowerCase() === stateName),
        );
        setDistrictPostOffices(offices);
      })
      .catch(() => setDistrictPostOffices([]));
  }, [form.district, form.stateCode, isIndia, states]);

  // ─── Search valid pincode/postcode options from the selected country ───
  useEffect(() => {
    const query = pinSearch.trim();
    if (!form.countryCode || query.length < 3) return;
    let cancelled = false;

    if (isIndia) {
      if (!/^\d{6}$/.test(query)) return;
      setLookingUpPin(true);
      fetch(`https://api.postalpincode.in/pincode/${query}`)
        .then((r) => r.json())
        .then((j: Array<{ Status: string; PostOffice?: PostalOffice[] }>) => {
          if (cancelled) return;
          const entry = j?.[0];
          if (entry?.Status === "Success" && entry.PostOffice?.length) {
            setPinPostOffices(entry.PostOffice);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLookingUpPin(false);
        });
      return () => {
        cancelled = true;
      };
    }

    const countryName = selectedCountry?.name ?? "";
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=10&postalcode=${encodeURIComponent(query)}${countryName ? `&country=${encodeURIComponent(countryName)}` : ""}`;
    setLookingUpPin(true);
    fetch(url, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((arr: Array<{ address?: Record<string, string> }>) => {
        if (cancelled) return;
        const options = Array.from(
          new Set(arr.map((x) => x.address?.postcode).filter((p): p is string => !!p)),
        ).map((pin) => ({ value: pin, label: pin, keywords: pin }));
        setForeignPostcodeOptions(options);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLookingUpPin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.countryCode, isIndia, pinSearch, selectedCountry]);

  // ─── Pincode / Postcode → reverse-fill state/district/sub-district/locality ───
  useEffect(() => {
    const pin = form.pincode.trim();
    if (pin.length < 3) return;
    if (pin === lastPinRef.current) return;

    if (isIndia) {
      if (!/^\d{6}$/.test(pin)) return;
    }
    lastPinRef.current = pin;
    setLookingUpPin(true);

    if (!isIndia) {
      // Use Nominatim search by postcode + country
      const countryName = selectedCountry?.name ?? "";
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&postalcode=${encodeURIComponent(pin)}${countryName ? `&country=${encodeURIComponent(countryName)}` : ""}`;
      fetch(url, { headers: { Accept: "application/json" } })
        .then((r) => r.json())
        .then((arr: Array<{ address?: Record<string, string> }>) => {
          const a = arr?.[0]?.address ?? {};
          const stateName = a.state || a.region || "";
          const districtName =
            a.state_district || a.county || a.district || a.city_district || a.city || "";
          const subDistrict =
            a.suburb || a.town || a.village || a.municipality || a.subdistrict || "";
          const localityName = a.neighbourhood || a.hamlet || a.suburb || a.locality || "";
          setForm((s) => {
            const next = { ...s };
            if (stateName && !next.stateCode) {
              const st = State.getStatesOfCountry(next.countryCode).find(
                (x) => x.name.toLowerCase() === stateName.toLowerCase(),
              );
              if (st) next.stateCode = st.isoCode;
            }
            if (!next.district && districtName) next.district = districtName;
            if (!next.sub_district && subDistrict) next.sub_district = subDistrict;
            if (!next.locality && localityName) next.locality = localityName;
            return next;
          });
        })
        .catch(() => {})
        .finally(() => setLookingUpPin(false));
      return;
    }

    fetch(`https://api.postalpincode.in/pincode/${pin}`)
      .then((r) => r.json())
      .then((j: Array<{ Status: string; PostOffice?: Array<{ State: string; District: string; Block: string; Name: string; Division: string }> }>) => {
        const entry = j?.[0];
        if (!entry || entry.Status !== "Success" || !entry.PostOffice?.length) return;
        const offices = entry.PostOffice;
        setPinPostOffices(offices);
        const po = offices[0];
        setForm((s) => {
          const next = { ...s };
          // Pincode entry is explicit — overwrite location fields to match.
          const st = State.getStatesOfCountry("IN").find(
            (x) => x.name.toLowerCase() === po.State.toLowerCase(),
          );
          if (st) next.stateCode = st.isoCode;
          next.district = po.District;
          // Suppress the district-effect refetch since we already have offices for it.
          lastDistrictRef.current = po.District;
          const blocks = Array.from(
            new Set(offices.map((o) => o.Block).filter((b) => b && b !== "NA")),
          );
          next.sub_district = blocks.length === 1 ? blocks[0] : "";
          next.locality = offices.length === 1 ? offices[0].Name : "";
          return next;
        });
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => setLookingUpPin(false));
  }, [form.pincode, isIndia, selectedCountry]);

  function validateForm(): boolean {
    const { name, age, district, mobile_local, pincode, sub_district, locality } = form;
    const country = selectedCountry?.name ?? "";
    const state = states.find((s) => s.isoCode === form.stateCode)?.name ?? "";
    if (!name || !age || !country || !state || !district || !mobile_local) {
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

  async function handleSubmit(sig: string) {
    const { name, age, district, mobile_local, pincode, sub_district, locality } = form;
    const country = selectedCountry?.name ?? "";
    const state = states.find((s) => s.isoCode === form.stateCode)?.name ?? "";
    const ageNum = Number(age);
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
              setPinSearch("");
              setPinPostOffices([]);
              setDistrictPostOffices([]);
              setForeignPostcodeOptions([]);
              lastPinRef.current = "";
              lastDistrictRef.current = "";
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
          {(() => {
            const districtOptions = Array.from(
              new Map(cities.map((c) => [c.name, { value: c.name, label: c.name, keywords: c.name }])).values(),
            );
            if (form.district && !districtOptions.some((o) => o.value.toLowerCase() === form.district.toLowerCase())) {
              districtOptions.unshift({ value: form.district, label: form.district, keywords: form.district });
            }
            return districtOptions.length > 0 ? (
              <Combobox
                value={form.district}
                onChange={(v) =>
                  setForm((s) => ({ ...s, district: v, sub_district: "", locality: "" }))
                }
                placeholder="Select district"
                searchPlaceholder="Search district..."
                emptyText="No district found"
                options={districtOptions}
                disabled={!form.stateCode}
              />
            ) : (
              <Input
                value={form.district}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    district: e.target.value,
                    sub_district: "",
                    locality: "",
                  }))
                }
                maxLength={80}
                placeholder={form.stateCode ? "Enter district" : "Select state first"}
                disabled={!form.stateCode}
              />
            );
          })()}
        </Field>
        <Field
          label={
            isIndia
              ? "Sub-District / வட்டம்"
              : "Sub-District / County (optional)"
          }
        >
          {(() => {
            const blockOptions = Array.from(
              new Set(
                availablePostOffices
                  .map((o) => o.Block)
                  .filter((b): b is string => !!b && b !== "NA"),
              ),
            ).map((b) => ({ value: b, label: b, keywords: b }));
            const districtSelected = !!form.district.trim();
            if (isIndia && blockOptions.length > 0) {
              return (
                <Combobox
                  value={form.sub_district}
                  onChange={(v) =>
                    setForm((s) => ({ ...s, sub_district: v, locality: "" }))
                  }
                  placeholder="Select sub-district"
                  searchPlaceholder="Search sub-district..."
                  emptyText="No sub-district found"
                  options={blockOptions}
                  disabled={!districtSelected}
                />
              );
            }
            return (
              <Input
                value={form.sub_district}
                onChange={(e) => set("sub_district", e.target.value)}
                maxLength={120}
                disabled={!districtSelected}
                placeholder={
                  !districtSelected
                    ? "Select district first"
                    : isIndia
                      ? "Enter sub-district (or enter pincode to load options)"
                      : "Optional"
                }
              />
            );
          })()}
        </Field>
        <Field
          label={isIndia ? "Locality / ஊர்" : "Locality / City (optional)"}
        >
          {(() => {
            const districtSelected = !!form.district.trim();
            const subSelected = !!form.sub_district.trim();
            const localityOptions = Array.from(
              new Map(
                availablePostOffices
                  .filter(
                    (o) =>
                      !form.sub_district ||
                      o.Block === form.sub_district ||
                      o.Block === "NA",
                  )
                  .map((o) => [
                    o.Name,
                    { value: o.Name, label: o.Name, keywords: o.Name },
                  ]),
              ).values(),
            );
            // Locality depends on sub-district being filled
            const disabled = !districtSelected || !subSelected;
            if (isIndia && subSelected && localityOptions.length > 0) {
              return (
                <Combobox
                  value={form.locality}
                  onChange={(v) => set("locality", v)}
                  placeholder="Select locality"
                  searchPlaceholder="Search locality..."
                  emptyText="No locality found"
                  options={localityOptions}
                  disabled={disabled}
                />
              );
            }
            return (
              <Input
                value={form.locality}
                onChange={(e) => set("locality", e.target.value)}
                maxLength={160}
                disabled={disabled}
                placeholder={
                  !districtSelected
                    ? "Select district first"
                    : !subSelected
                      ? "Select sub-district first"
                      : isIndia
                        ? "Enter locality"
                        : "Optional"
                }
              />
            );
          })()}
        </Field>
        <Field
          label={
            isIndia
              ? "Pincode / Postcode / அஞ்சல் குறியீடு"
              : "Pincode / Postcode"
          }
        >
          <Input
            inputMode="numeric"
            value={form.pincode}
            onChange={(e) => set("pincode", e.target.value)}
            maxLength={20}
            disabled={!form.countryCode}
            placeholder={
              !form.countryCode
                ? "Select country first"
                : lookingUpPin
                  ? "Looking up…"
                  : isIndia
                    ? "6-digit pincode (auto-fills location)"
                    : "Postcode (auto-fills location)"
            }
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

      <Button onClick={openSignDialog} disabled={busy} size="lg" className="w-full">
        Review & Sign
      </Button>

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