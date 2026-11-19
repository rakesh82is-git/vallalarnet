import { describe, expect, it } from "vitest";
import { buildSignaturesWorkbook, collectExportRows, EXPORT_COLUMNS, exportCounts } from "./signature-export";

describe("signature export", () => {
  it("includes every page beyond the 1000-record API limit", async () => {
    const progress: number[] = [];
    const rows = await collectExportRows(async (cursor, snapshot) => {
      const offset = Number(cursor ?? 0);
      return {
        rows: Array.from({ length: offset < 1000 ? 500 : 351 }, (_, index) => ({ id: String(offset + index) })),
        nextCursor: offset < 1000 ? String(offset + 500) : null,
        snapshot: snapshot ?? "2026-11-19T00:00:00.000Z",
      };
    }, (count) => progress.push(count));
    expect(rows).toHaveLength(1351);
    expect(new Set(rows.map((row) => row.id)).size).toBe(1351);
    expect(progress).toEqual([500, 1000, 1351]);
  });

  it("counts 13350 digital signatures and 556 paper signatures, with unedited manual rows at zero", () => {
    expect(exportCounts([
      ...Array.from({ length: 13350 }, () => ({ kind: "digital" })),
      { kind: "manual", manual_signature_count: 556 },
      { kind: "manual", manual_signature_count: 0 },
    ])).toEqual({ digitalCount: 13350, manualCount: 556, manualDocuments: 2 });
  });

  it("exports two sheets with document links, literal text and no embedded images or raw phones", async () => {
    const blob = await buildSignaturesWorkbook([
      { id: "one", kind: "digital", name: "=HYPERLINK(\"bad\")", pincode: "00100", phone_number: "private", signature_image: "private" },
      { id: "two", kind: "manual", manual_signature_count: 556, manual_document_url: "https://example.com/document.pdf" },
    ]);
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Digital Signatures", "Manual Documents"]);
    expect(workbook.worksheets[0].getRow(2).getCell(4).value).toBe('=HYPERLINK("bad")');
    expect(workbook.worksheets[0].getRow(2).getCell(11).value).toBe("00100");
    expect(workbook.worksheets[1].getRow(2).getCell(22).value).toEqual({ text: "Open document", hyperlink: "https://example.com/document.pdf" });
    expect(workbook.worksheets.flatMap((sheet) => sheet.getImages())).toHaveLength(0);
    expect(EXPORT_COLUMNS.some(({ key }) => key === "phone_number" || key === "signature_image")).toBe(false);
  });
});