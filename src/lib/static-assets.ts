// Static media hosted on Cloudflare R2 (vpn-user-assets/static/).
// Filenames are kept as-uploaded.
const BASE = "https://pub-66d4c6c11659459091cfe0dc1d646c48.r2.dev/static";

export const STATIC = {
  gnanaSabaiPower: `${BASE}/gnana_sabai_power.jpeg`,
  gnanaSabaiOver: `${BASE}/gnana_sabai_over.jpeg`,
  vallalarStudy: `${BASE}/vallalar_study.jpeg`,
  vallalarWithAnimals1: `${BASE}/vallalar_with_animals_1.jpeg`,
  vallalarWithAnimals2: `${BASE}/vallalar_with_animals_2.jpeg`,
  marudur: `${BASE}/Marudur.jpeg`,
  karunguzhi: `${BASE}/Karunguzhi.jpeg`,
  sathyaDharmaSalai: `${BASE}/SathyaDharmaSalai.jpeg`,
  sathyaGnanaSabha: `${BASE}/SathyaGnanaSabha.jpeg`,
  siddhiValagam: `${BASE}/SiddhiValagam.jpeg`,
  vallalarThankYouVideo: `${BASE}/Vallalar_ThankYou.mp4`,
} as const;