export function buildDocxFilename(title: string, date: string): string {
  const cleanTitle =
    title
      .slice(0, 50)
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "Rechtsgutachten";

  return `${cleanTitle}_${date}.docx`;
}

export function buildContentDisposition(filename: string): string {
  const fallback = filename
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
