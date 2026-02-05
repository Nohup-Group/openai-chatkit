import type { Section } from "./types";

export async function copyRichToClipboard(
  sections: Section[]
): Promise<boolean> {
  const html = `
    <html><head><meta charset="utf-8"></head>
    <body style="font-family: 'Times New Roman', serif; font-size: 12pt;">
      ${sections
        .map(
          (s) => `
        <h${getHeadingLevel(s.style)}>${escapeHtml(s.level)}. ${escapeHtml(s.heading)}</h${getHeadingLevel(s.style)}>
        ${bodyToHtml(s.body)}
      `
        )
        .join("")}
    </body></html>
  `;

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob(
          [sections.map((s) => `${s.level}. ${s.heading}\n\n${s.body}`).join("\n\n")],
          { type: "text/plain" }
        ),
      }),
    ]);
    return true;
  } catch {
    await navigator.clipboard.writeText(
      sections.map((s) => `${s.level}. ${s.heading}\n\n${s.body}`).join("\n\n")
    );
    return true;
  }
}

function getHeadingLevel(style: Section["style"]): number {
  switch (style) {
    case "Memo1":
      return 1;
    case "Memo2":
      return 2;
    case "Memo3":
      return 3;
    default:
      return 2;
  }
}

function bodyToHtml(body: string): string {
  return body
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (t.startsWith("- ") || t.startsWith("• ") || t.startsWith("* "))
        return `<li>${escapeHtml(t.replace(/^[-•*]\s*/, ""))}</li>`;
      if (t.startsWith("„"))
        return `<blockquote style="margin-left:36pt;font-style:italic">${escapeHtml(t)}</blockquote>`;
      if (t)
        return `<p style="text-align:justify">${escapeHtml(t).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")}</p>`;
      return "";
    })
    .join("");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
