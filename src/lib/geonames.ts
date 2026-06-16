// Tiny GeoNames REST client with in-memory de-duplication.
// Username is a public identifier (free tier, 30k credits/day per user).
// The free service requires the account to have "web services" enabled at
// https://www.geonames.org/manageaccount.

const USERNAME =
  (import.meta.env.VITE_GEONAMES_USERNAME as string | undefined) || "demo";
const BASE = "https://secure.geonames.org";
const cache = new Map<string, Promise<unknown>>();

export type GnPlace = {
  geonameId: number;
  name: string;
  toponymName: string;
  fcode?: string;
  fcl?: string;
  adminName1?: string;
  adminName2?: string;
  adminName3?: string;
  countryCode?: string;
};

async function gn<T>(path: string): Promise<T | null> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}/${path}${sep}username=${encodeURIComponent(USERNAME)}`;
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    );
  }
  return (await cache.get(url)) as T | null;
}

export async function getAdm1(countryIso: string): Promise<GnPlace[]> {
  const j = await gn<{ geonames?: GnPlace[] }>(
    `searchJSON?country=${encodeURIComponent(countryIso)}&featureCode=ADM1&maxRows=1000`,
  );
  return j?.geonames ?? [];
}

export async function findAdm1(
  countryIso: string,
  stateName: string,
): Promise<GnPlace | null> {
  if (!countryIso || !stateName) return null;
  const list = await getAdm1(countryIso);
  const n = stateName.toLowerCase();
  return (
    list.find(
      (g) =>
        g.name.toLowerCase() === n || g.toponymName.toLowerCase() === n,
    ) ?? null
  );
}

export async function getChildren(geonameId: number): Promise<GnPlace[]> {
  const j = await gn<{ geonames?: GnPlace[] }>(
    `childrenJSON?geonameId=${geonameId}`,
  );
  return j?.geonames ?? [];
}

export type GnPostal = {
  postalCode: string;
  placeName: string;
  adminName1?: string;
  adminName2?: string;
  adminName3?: string;
};

export async function postalCodeLookup(
  countryIso: string,
  postalCode: string,
): Promise<GnPostal[]> {
  const j = await gn<{ postalcodes?: GnPostal[] }>(
    `postalCodeLookupJSON?postalcode=${encodeURIComponent(postalCode)}&country=${encodeURIComponent(countryIso)}&maxRows=20`,
  );
  return j?.postalcodes ?? [];
}

export async function postalCodeSearch(
  countryIso: string,
  placeName: string,
): Promise<GnPostal[]> {
  if (!countryIso || !placeName) return [];
  const j = await gn<{ postalCodes?: GnPostal[] }>(
    `postalCodeSearchJSON?placename=${encodeURIComponent(placeName)}&country=${encodeURIComponent(countryIso)}&maxRows=100`,
  );
  return j?.postalCodes ?? [];
}