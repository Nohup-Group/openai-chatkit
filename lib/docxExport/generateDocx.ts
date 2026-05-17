import { Packer } from "docx";
import { createLegalMemoDocument } from "./legalMemoTemplate";
import { buildDocxFilename } from "./filename";
import type { DocxData } from "./types";

const LOGO_URL = "/template/rup-logo.png";
const STYLES_URL = "/template/rp-styles.xml";

async function fetchLogo(): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) {
      console.warn("Failed to fetch logo:", response.status);
      return null;
    }
    return await response.arrayBuffer();
  } catch (error) {
    console.warn("Error fetching logo:", error);
    return null;
  }
}

async function fetchStyles(): Promise<string | null> {
  try {
    const response = await fetch(STYLES_URL);
    if (!response.ok) {
      console.warn("Failed to fetch styles:", response.status);
      return null;
    }
    const xml = await response.text();
    // Strip numbering references — we handle heading numbers manually in text
    return xml.replace(/<w:numPr>[\s\S]*?<\/w:numPr>/g, "");
  } catch (error) {
    console.warn("Error fetching styles:", error);
    return null;
  }
}

export async function generateAndDownloadDocx(data: DocxData): Promise<void> {
  // Fetch logo and R&P styles in parallel
  const [logoData, stylesXml] = await Promise.all([fetchLogo(), fetchStyles()]);

  const doc = createLegalMemoDocument(data, { logoData, stylesXml });
  const blob = await Packer.toBlob(doc);

  const filename = buildDocxFilename(data.report_title, data.date);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
