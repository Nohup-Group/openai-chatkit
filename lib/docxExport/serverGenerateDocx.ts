import { readFile } from "node:fs/promises";
import path from "node:path";
import { Packer } from "docx";
import { createLegalMemoDocument } from "./legalMemoTemplate";
import type { DocxData } from "./types";

const LOGO_PATH = path.join(process.cwd(), "public", "template", "rup-logo.png");
const STYLES_PATH = path.join(process.cwd(), "public", "template", "rp-styles.xml");

export async function generateDocxBuffer(data: DocxData): Promise<Buffer> {
  const [logoData, stylesXml] = await Promise.all([readLogo(), readStyles()]);
  const doc = createLegalMemoDocument(data, { logoData, stylesXml });
  return Packer.toBuffer(doc);
}

async function readLogo(): Promise<ArrayBuffer | null> {
  try {
    const buffer = await readFile(LOGO_PATH);
    return bufferToArrayBuffer(buffer);
  } catch (error) {
    console.warn("Error reading DOCX logo:", error);
    return null;
  }
}

async function readStyles(): Promise<string | null> {
  try {
    const xml = await readFile(STYLES_PATH, "utf8");
    return xml.replace(/<w:numPr>[\s\S]*?<\/w:numPr>/g, "");
  } catch (error) {
    console.warn("Error reading DOCX styles:", error);
    return null;
  }
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}
