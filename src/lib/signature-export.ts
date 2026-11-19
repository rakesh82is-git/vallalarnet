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
  { key: "referral_source", header: "Referral Source", width: 20 },
  { key: "referral_other", header: "Other Referral Details", width: 30 },
  { key: "signature_status", header: "Signature Status", width: 22 },
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

export function isManualRow(row: ExportRow) {
  return Boolean(row.manual_document_url || row.kind === "manual");
}

// Loaded only after a user requests an export, never during SSR.
export async function buildSignaturesWorkbook(rows: ExportRow[]) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Digital Signatures", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = EXPORT_COLUMNS;
  sheet.getRow(1).font = { name: "Arial", bold: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EXPORT_COLUMNS.length } };
  for (const source of rows) {
    if (isManualRow(source)) continue;
    sheet.addRow(Object.fromEntries(EXPORT_COLUMNS.map(({ key }) => [key, source[key] ?? ""]))).font = { name: "Arial", size: 11 };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function buildManualWorkbook(
  rows: ExportRow[],
  render: (url: string) => AsyncIterable<import("./manual-document-media").DocumentPageImage>,
  onProgress: (message: string) => void,
) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const documents = rows.filter(isManualRow).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const master = workbook.addWorksheet("Master Records", { views: [{ state: "frozen", ySplit: 1 }] });
  master.columns = [
    { key: "tab", header: "Document Tab", width: 20 },
    { key: "document_title", header: "Document Title", width: 36 },
    { key: "manual_signature_count", header: "Signatures in Document", width: 24 },
    ...EXPORT_COLUMNS.filter(({ key }) => key !== "signature_status"),
  ];
  master.getRow(1).font = { name: "Arial", bold: true };
  master.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: master.columns.length } };
  let mediaBytes = 0;
  for (const [index, source] of documents.entries()) {
    const tab = `Doc_${String(index + 1).padStart(2, "0")}`;
    const entry = master.addRow(Object.fromEntries(master.columns.map(({ key }) => [String(key), source[String(key)] ?? ""])));
    entry.getCell("tab").value = { text: tab, hyperlink: `#'${tab}'!A1` };
    entry.font = { name: "Arial", size: 11 };
    const sheet = workbook.addWorksheet(tab);
    sheet.columns = Array.from({ length: 12 }, () => ({ width: 12 }));
    sheet.getCell("A1").value = { text: "Back to Master Records", hyperlink: "#'Master Records'!A1" };
    sheet.getCell("A3").value = String(source.document_title ?? "Untitled document");
    sheet.getCell("A4").value = `Signature count: ${source.manual_signature_count ?? 0}`;
    sheet.getCell("A5").value = [source.full_name || source.name, source.country, source.state, source.district, source.created_at].filter(Boolean).join(" · ");
    for (const row of [1, 3, 4, 5]) { sheet.mergeCells(row, 1, row, 12); sheet.getRow(row).font = { name: "Arial", size: 11 }; }
    sheet.getCell("A3").font = { name: "Arial", bold: true, size: 14 };
    const url = source.manual_document_url;
    let pageNumber = 0;
    let top = 7;
    try {
      if (typeof url !== "string" || !/^https?:\/\//i.test(url)) throw new Error("No readable upload is available.");
      for await (const image of render(url)) {
        pageNumber++;
        mediaBytes += image.bytes.length;
        if (mediaBytes > 64 * 1024 * 1024) throw new Error("The archive exceeds the 64 MB image limit.");
        onProgress(`Document ${index + 1} of ${documents.length} · page ${pageNumber}`);
        const id = workbook.addImage({ buffer: image.bytes as unknown as import("exceljs").Image["buffer"], extension: "jpeg" });
        const width = Math.min(1000, image.width);
        const height = image.height * width / image.width;
        sheet.addImage(id, { tl: { col: 0, row: top }, ext: { width, height } });
        top += Math.ceil(height / 20) + 2;
      }
      if (!pageNumber) throw new Error("The upload contains no readable pages.");
    } catch (error) {
      throw new Error(`${tab}: ${error instanceof Error ? error.message : "Unable to embed this upload."} No incomplete archive was downloaded.`);
    }
  }
  const totalRow = master.rowCount + 2;
  master.getCell(`B${totalRow}`).value = "Total manual signatures";
  master.getCell(`C${totalRow}`).value = { formula: documents.length ? `SUM(C2:C${documents.length + 1})` : "0", result: exportCounts(documents).manualCount };
  onProgress("Finishing workbook…");
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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