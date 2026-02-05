import { Packer } from "docx";
import { createLegalMemoDocument } from "./legalMemoTemplate";
import type { DocxData } from "./types";

export async function generateAndDownloadDocx(data: DocxData): Promise<void> {
  const doc = createLegalMemoDocument(data);
  const blob = await Packer.toBlob(doc);

  // Create clean filename (max 50 chars, replace problematic chars)
  const cleanTitle = data.report_title
    .slice(0, 50)
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  const filename = `${cleanTitle}_${data.date}.docx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
