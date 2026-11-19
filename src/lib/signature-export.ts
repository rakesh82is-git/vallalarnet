export type ExportRow = Record<string, string | number | boolean | null>;

export const EXPORT_PAGE_SIZE = 500;
export const EXPORT_COLUMNS = [
  { key: "id", header: "Signature ID", width: 38 },
  { key: "created_at", header: "Created At", width: 24 },
  { key: "full_name", header: "Full Name", width: 24 },
  { key: "name", header: "Name", width: 24 },
  { key: "email", header: "Email", width: 28 },
  { key: "age", header: "Age", width: 8 },
  { key: "country", header: "Country", width: 20 },
  { key: "state", header: "State", width: 24 },
  { key: "district", header: "District", width: 24 },
  { key: "locality", header: "Locality", width: 24 },
  { key: "pincode", header: "Postcode / Pincode", width: 20 },
  { key: "residential_address", header: "Address", width: 36 },
  { key: "message", header: "Message", width: 36 },
  { key: "phone_masked", header: "Phone (masked)", width: 20 },
  { key: "consent", header: "Consent", width: 12 },
  { key: "kind", header: "Kind", width: 12 },
  { key: "document_title", header: "Document Title", width: 28 },
  { key: "manual_signature_count", header: "Signatures in Document", width: 24 },
  { key: "referral_source", header: "Referral Source", width: 20 },
  { key: "referral_other", header: "Other Referral Details", width: 30 },
  { key: "signature_status", header: "Signature Status", width: 22 },
  { key: "manual_document_url", header: "Document Link", width: 42 },
];

export type ExportPage = {
  rows: ExportRow[];
  nextCursor: string | null;
  snapshot: string;
};

export async function collectExportRows(
  fetchPage: (cursor: string | null, snapshot: string | null) => Promise<ExportPage>,
  onProgress: (count: number) => void,
) {
  const rows: ExportRow[] = [];
  let cursor: string | null = null;
  let snapshot: string | null = null;
  do {
    const page = await fetchPage(cursor, snapshot);
    rows.push(...page.rows);
    onProgress(rows.length);
    if (page.nextCursor && page.nextCursor === cursor) {
      throw new Error("The export stopped making progress. Please try again.");
    }
    cursor = page.nextCursor;
    snapshot = page.snapshot;
  } while (cursor);
  return rows;
}

export function exportCounts(rows: ExportRow[]) {
  let digitalCount = 0;
  let manualCount = 0;
  let manualDocuments = 0;
  for (const row of rows) {
    if (row.manual_document_url || row.kind === "manual") {
      manualDocuments++;
      manualCount += Math.max(0, Number(row.manual_signature_count ?? 0));
    } else {
      digitalCount++;
    }
  }
  return { digitalCount, manualCount, manualDocuments };
}

// Loaded only after a user requests an export, never during SSR.
export async function buildSignaturesWorkbook(rows: ExportRow[]) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  for (const [name, manual] of [["Digital Signatures", false], ["Manual Documents", true]] as const) {
    const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = EXPORT_COLUMNS;
    sheet.getRow(1).font = { bold: true };
    sheet.autoFilter = { from: "A1", to: "V1" };
    for (const source of rows) {
      if (Boolean(source.manual_document_url || source.kind === "manual") !== manual) continue;
      const values = Object.fromEntries(EXPORT_COLUMNS.map(({ key }) => [key, source[key] ?? ""]));
      const row = sheet.addRow(values);
      if (typeof source.manual_document_url === "string" && /^https?:\/\//i.test(source.manual_document_url)) {
        row.getCell("manual_document_url").value = {
          text: "Open document",
          hyperlink: source.manual_document_url,
        };
      }
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function deliverWorkbook(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}