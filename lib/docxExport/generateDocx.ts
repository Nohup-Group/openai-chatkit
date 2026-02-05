import { Packer } from "docx";
import { createLegalMemoDocument } from "./legalMemoTemplate";
import type { DocxData } from "./types";

export async function generateAndDownloadDocx(data: DocxData): Promise<void> {
  const doc = createLegalMemoDocument(data);
  const blob = await Packer.toBlob(doc);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.report_title.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, "_")}_${data.date}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
