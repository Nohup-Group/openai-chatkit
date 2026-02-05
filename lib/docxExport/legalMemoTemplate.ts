import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
} from "docx";
import type { DocxData } from "./types";

export function createLegalMemoDocument(data: DocxData): Document {
  const children: Paragraph[] = [];

  // TITLE BLOCK
  children.push(
    new Paragraph({ text: "", spacing: { after: 220 } }),
    new Paragraph({
      children: [new TextRun({ text: data.report_title, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 220, line: 264 },
    })
  );

  if (data.subtitle) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: data.subtitle, size: 24 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 220 },
      })
    );
  }

  children.push(new Paragraph({ text: "", spacing: { after: 220 } }));

  // EXECUTIVE SUMMARY
  if (data.executiveSummary) {
    children.push(...bodyToParagraphs(data.executiveSummary));
  }

  // SECTIONS
  for (const section of data.sections) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${section.level}. ${section.heading}`,
            bold: true,
          }),
        ],
        style: section.style,
      })
    );

    if (section.body) {
      children.push(...bodyToParagraphs(section.body));
    }
  }

  // SOURCES
  if (data.sources) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Quellen", bold: true })],
        style: "Memo1",
        spacing: { before: 400, after: 200 },
      })
    );
    children.push(...bodyToParagraphs(data.sources));
  }

  return new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "Times New Roman", size: 22 },
          paragraph: { spacing: { after: 220, line: 264 } },
        },
        {
          id: "Memo1",
          name: "Memo1",
          basedOn: "Normal",
          run: { bold: true, size: 24 },
          paragraph: { spacing: { before: 400, after: 200 } },
        },
        {
          id: "Memo2",
          name: "Memo2",
          basedOn: "Normal",
          run: { bold: true, size: 22 },
          paragraph: { spacing: { before: 300, after: 150 } },
        },
        {
          id: "Memo3",
          name: "Memo3",
          basedOn: "Normal",
          run: { bold: true, size: 22 },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
        {
          id: "Zitat",
          name: "Zitat",
          basedOn: "Normal",
          run: { italics: true },
          paragraph: {
            indent: { left: convertInchesToTwip(0.5) },
            spacing: { before: 200, after: 200 },
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children,
      },
    ],
  });
}

function bodyToParagraphs(body: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = (body || "").split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (
      trimmed.startsWith("•") ||
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ")
    ) {
      const bulletText = trimmed.replace(/^[•\-*]\s*/, "");
      paragraphs.push(
        new Paragraph({
          children: parseTextWithFormatting(bulletText),
          bullet: { level: 0 },
          spacing: { after: 120 },
        })
      );
    } else if (trimmed.startsWith("„")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, italics: true })],
          style: "Zitat",
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: parseTextWithFormatting(trimmed),
          spacing: { after: 200 },
          alignment: AlignmentType.JUSTIFIED,
        })
      );
    }
  }

  return paragraphs;
}

function parseTextWithFormatting(text: string): TextRun[] {
  if (text.includes("**")) {
    const children: TextRun[] = [];
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    for (const part of parts) {
      if (part.startsWith("**") && part.endsWith("**")) {
        children.push(new TextRun({ text: part.slice(2, -2), bold: true }));
      } else if (part.length > 0) {
        children.push(new TextRun({ text: part }));
      }
    }
    return children;
  }

  return [new TextRun({ text })];
}
