// Static India post-office dataset (~7MB total, sliced per state).
// Same dataset powers every India dropdown — State, District,
// Sub-District, Locality, Pincode — and the reverse pincode lookup,
// so the forward cascade and reverse fill are always consistent.

export type InRow = {
  officeName: string;
  pincode: string;
  taluk: string; // sub-district; "" when unknown
  district: string;
};

type RawRow = [string, string, string, string]; // [officeName, pincode, taluk, district]

const BASE = "/in-postal";
const stateCache = new Map<string, Promise<InRow[]>>();
let pinIndex: Promise<Record<string, string[]>> | null = null;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

// country-state-city ↔ dataset name aliases. Dataset is from 2015, so
// modern splits (Telangana, Ladakh, merged DNH+DD) resolve back to the
// original state slug.
const aliasToSlug: Record<string, string> = {
  andhrapradesh: "andhra-pradesh",
  telangana: "andhra-pradesh",
  arunachalpradesh: "arunachal-pradesh",
  assam: "assam",
  bihar: "bihar",
  chhattisgarh: "chattisgarh",
  chattisgarh: "chattisgarh",
  goa: "goa",
  gujarat: "gujarat",
  haryana: "haryana",
  himachalpradesh: "himachal-pradesh",
  jharkhand: "jharkhand",
  karnataka: "karnataka",
  kerala: "kerala",
  madhyapradesh: "madhya-pradesh",
  maharashtra: "maharashtra",
  manipur: "manipur",
  meghalaya: "meghalaya",
  mizoram: "mizoram",
  nagaland: "nagaland",
  odisha: "odisha",
  orissa: "odisha",
  punjab: "punjab",
  rajasthan: "rajasthan",
  sikkim: "sikkim",
  tamilnadu: "tamil-nadu",
  tripura: "tripura",
  uttarpradesh: "uttar-pradesh",
  uttarakhand: "uttarakhand",
  uttaranchal: "uttarakhand",
  westbengal: "west-bengal",
  andamannicobarislands: "andaman-and-nicobar-islands",
  andamanandnicobar: "andaman-and-nicobar-islands",
  andamanandnicobarislands: "andaman-and-nicobar-islands",
  chandigarh: "chandigarh",
  dadranagarhaveli: "dadra-and-nagar-haveli",
  dadraandnagarhaveli: "dadra-and-nagar-haveli",
  damandiu: "daman-and-diu",
  damananddiu: "daman-and-diu",
  thedadraandnagarhavelianddamananddiu: "dadra-and-nagar-haveli",
  delhi: "delhi",
  jammukashmir: "jammu-and-kashmir",
  jammuandkashmir: "jammu-and-kashmir",
  ladakh: "jammu-and-kashmir",
  lakshadweep: "lakshadweep",
  puducherry: "pondicherry",
  pondicherry: "pondicherry",
};

const datasetStateBySlug: Record<string, string> = {
  "andhra-pradesh": "ANDHRA PRADESH",
  "arunachal-pradesh": "ARUNACHAL PRADESH",
  assam: "ASSAM",
  bihar: "BIHAR",
  chattisgarh: "CHATTISGARH",
  goa: "GOA",
  gujarat: "GUJARAT",
  haryana: "HARYANA",
  "himachal-pradesh": "HIMACHAL PRADESH",
  jharkhand: "JHARKHAND",
  karnataka: "KARNATAKA",
  kerala: "KERALA",
  "madhya-pradesh": "MADHYA PRADESH",
  maharashtra: "MAHARASHTRA",
  manipur: "MANIPUR",
  meghalaya: "MEGHALAYA",
  mizoram: "MIZORAM",
  nagaland: "NAGALAND",
  odisha: "ODISHA",
  punjab: "PUNJAB",
  rajasthan: "RAJASTHAN",
  sikkim: "SIKKIM",
  "tamil-nadu": "TAMIL NADU",
  tripura: "TRIPURA",
  "uttar-pradesh": "UTTAR PRADESH",
  uttarakhand: "UTTARAKHAND",
  "west-bengal": "WEST BENGAL",
  "andaman-and-nicobar-islands": "ANDAMAN & NICOBAR ISLANDS",
  chandigarh: "CHANDIGARH",
  "dadra-and-nagar-haveli": "DADRA & NAGAR HAVELI",
  "daman-and-diu": "DAMAN & DIU",
  delhi: "DELHI",
  "jammu-and-kashmir": "JAMMU & KASHMIR",
  lakshadweep: "LAKSHADWEEP",
  pondicherry: "PONDICHERRY",
};

export function slugForState(stateName: string): string | null {
  return aliasToSlug[norm(stateName)] ?? null;
}

export async function loadStateRows(stateName: string): Promise<InRow[]> {
  const slug = slugForState(stateName);
  if (!slug) return [];
  if (!stateCache.has(slug)) {
    stateCache.set(
      slug,
      fetch(`${BASE}/${slug}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<RawRow[]>) : []))
        .then((rows) =>
          rows.map(([officeName, pincode, taluk, district]) => ({
            officeName,
            pincode,
            taluk,
            district,
          })),
        )
        .catch(() => [] as InRow[]),
    );
  }
  return stateCache.get(slug)!;
}

async function loadPinIndex(): Promise<Record<string, string[]>> {
  if (!pinIndex) {
    pinIndex = fetch(`${BASE}/pin3-to-state.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return pinIndex;
}

/** Reverse-lookup a 6-digit pincode using only the static dataset. */
export async function lookupPincode(
  pin: string,
): Promise<Array<InRow & { stateName: string }>> {
  if (!/^\d{6}$/.test(pin)) return [];
  const idx = await loadPinIndex();
  const datasetStates = idx[pin.slice(0, 3)] ?? [];
  const results: Array<InRow & { stateName: string }> = [];
  await Promise.all(
    datasetStates.map(async (dsName) => {
      const slug = Object.entries(datasetStateBySlug).find(
        ([, n]) => n === dsName,
      )?.[0];
      if (!slug) return;
      // Re-use loadStateRows by feeding it a name it can normalize back
      // to the same slug.
      const stateLabel = dsName
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/&/g, "and");
      const rows = await loadStateRows(stateLabel);
      for (const r of rows) {
        if (r.pincode === pin) results.push({ ...r, stateName: stateLabel });
      }
    }),
  );
  return results;
}