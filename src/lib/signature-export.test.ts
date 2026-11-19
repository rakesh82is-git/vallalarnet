import { describe, expect, it } from "vitest";
import { buildSignaturesWorkbook, buildManualWorkbook, collectExportRows, EXPORT_COLUMNS, exportCounts } from "./signature-export";

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

  it("exports only digital rows with flattened referrals, literal text and no images or storage links", async () => {
    const blob = await buildSignaturesWorkbook([
      { id: "one", kind: "digital", name: "=HYPERLINK(\"bad\")", pincode: "00100", phone_number: "private", signature_image: "private", referral_source: "whatsapp" },
      { id: "two", kind: "manual", manual_signature_count: 556, manual_document_url: "https://example.com/document.pdf" },
    ]);
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Digital Signatures"]);
    expect(workbook.worksheets[0].rowCount).toBe(2);
    expect(workbook.worksheets[0].getRow(2).getCell(4).value).toBe('=HYPERLINK("bad")');
    expect(workbook.worksheets[0].getRow(2).getCell(11).value).toBe("00100");
    expect(workbook.worksheets[0].getRow(2).getCell(17).value).toBe("whatsapp");
    expect(workbook.worksheets.flatMap((sheet) => sheet.getImages())).toHaveLength(0);
    expect(EXPORT_COLUMNS.some(({ key }) => ["phone_number", "signature_image", "manual_document_url"].includes(key))).toBe(false);
  });

  it("embeds each manual upload in its own tab and all PDF pages in the same tab, with internal navigation only", async () => {
    const jpeg = new Uint8Array([255, 216, 255, 217]);
    const blob = await buildManualWorkbook([
      { id: "digital", kind: "digital" },
      { id: "a", kind: "manual", manual_signature_count: 556, manual_document_url: "https://example.com/scan.jpg" },
      { id: "b", kind: "manual", manual_signature_count: 0, manual_document_url: "https://example.com/scan.pdf" },
    ], async function* (url) {
      yield { bytes: jpeg, width: 100, height: 200 };
      if (url.endsWith("pdf")) yield { bytes: jpeg, width: 100, height: 200 };
    }, () => {});
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await blob.arrayBuffer());
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Master Records", "Doc_01", "Doc_02"]);
    expect(workbook.worksheets[1].getImages()).toHaveLength(1);
    expect(workbook.worksheets[2].getImages()).toHaveLength(2);
    expect(workbook.worksheets[0].getCell("A2").value).toEqual({ text: "Doc_01", hyperlink: "#'Doc_01'!A1" });
    expect(workbook.worksheets[2].getCell("A1").value).toEqual({ text: "Back to Master Records", hyperlink: "#'Master Records'!A1" });
    expect(workbook.worksheets[0].getCell("C5").value).toEqual({ formula: "SUM(C2:C3)", result: 556 });
    for (const sheet of workbook.worksheets) sheet.eachRow((row) => row.eachCell((cell) => {
      if (cell.type === ExcelJS.ValueType.Hyperlink) expect(String((cell.value as { hyperlink: string }).hyperlink).startsWith("#")).toBe(true);
    }));
  });

  it("rejects the manual archive if any uploaded attachment cannot be embedded", async () => {
    await expect(buildManualWorkbook([{ kind: "manual", id: "one", manual_document_url: "https://example.com/missing.pdf" }],
      async function* () { throw new Error("Unavailable"); }, () => {})).rejects.toThrow("Doc_01: Unavailable");
  });
});