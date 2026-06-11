import { useEffect, useState } from "react";

/**
 * Demo-only petition store. Persists signatures, manual scans, and
 * one-per-phone tracking in localStorage so the flow feels real for
 * design review. Swap for a server backend later — the API stays the same.
 */

export type DigitalSignature = {
  id: string;
  name: string;
  age: number;
  country: string;
  state: string;
  district: string;
  phoneMasked: string;
  signatureDataUrl: string;
  signedAt: string;
  voteNumber: number;
};

export type ManualScan = {
  id: string;
  imageDataUrl: string;
  uploadedAt: string;
};

const SIG_KEY = "vn:signatures:v1";
const PHONE_KEY = "vn:phones:v1";
const SCAN_KEY = "vn:scans:v1";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("vn:store-changed", { detail: { key } }));
  } catch {
    // ignore quota errors in demo
  }
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `••••••${digits.slice(-4)}`;
}

export function hashPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function hasPhoneSigned(phone: string): boolean {
  const phones = readJSON<string[]>(PHONE_KEY, []);
  return phones.includes(hashPhone(phone));
}

export function listSignatures(): DigitalSignature[] {
  return readJSON<DigitalSignature[]>(SIG_KEY, []);
}

export function getSignatureCount(): number {
  // Add a baseline so the petition feels active in demo
  return listSignatures().length + 12847;
}

export function addSignature(input: {
  name: string;
  age: number;
  country: string;
  state: string;
  district: string;
  phone: string;
  signatureDataUrl: string;
}): DigitalSignature {
  const sigs = listSignatures();
  const phones = readJSON<string[]>(PHONE_KEY, []);
  const voteNumber = sigs.length + 12848;
  const entry: DigitalSignature = {
    id: crypto.randomUUID(),
    name: input.name,
    age: input.age,
    country: input.country,
    state: input.state,
    district: input.district,
    phoneMasked: maskPhone(input.phone),
    signatureDataUrl: input.signatureDataUrl,
    signedAt: new Date().toISOString(),
    voteNumber,
  };
  sigs.push(entry);
  phones.push(hashPhone(input.phone));
  writeJSON(SIG_KEY, sigs);
  writeJSON(PHONE_KEY, phones);
  return entry;
}

export function listScans(): ManualScan[] {
  return readJSON<ManualScan[]>(SCAN_KEY, []);
}

export function addScan(imageDataUrl: string): ManualScan {
  const scans = listScans();
  const entry: ManualScan = {
    id: crypto.randomUUID(),
    imageDataUrl,
    uploadedAt: new Date().toISOString(),
  };
  scans.push(entry);
  writeJSON(SCAN_KEY, scans);
  return entry;
}

export function useStoreVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => setV((n) => n + 1);
    window.addEventListener("vn:store-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("vn:store-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return v;
}