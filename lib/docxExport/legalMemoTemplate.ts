import {
  Document,
  Paragraph,
  TextRun,
  ImageRun,
  Header,
  Footer,
  AlignmentType,
  TabStopPosition,
  TabStopType,
  PageNumber,
} from "docx";
import type { DocxData } from "./types";

export interface TemplateOptions {
  logoData?: ArrayBuffer | null;
  stylesXml?: string | null;
}

export function createLegalMemoDocument(data: DocxData, options?: TemplateOptions): Document {
  const children: Paragraph[] = [];

  // TITLE BLOCK — centered, non-bold, 12pt, matching Call Option doc format
  const titleRuns: TextRun[] = [
    new TextRun({ text: data.report_title, size: 24 }),
  ];
  if (data.subtitle) {
    titleRuns.push(
      new TextRun({ text: "", break: 1 }),
      new TextRun({ text: data.subtitle, size: 24 }),
    );
  }
  children.push(
    new Paragraph({ text: "", spacing: { after: 220, line: 264 } }), // Space after header
    new Paragraph({
      children: titleRuns,
      alignment: AlignmentType.CENTER,
      spacing: { after: 220, line: 264 },
    }),
    new Paragraph({ text: "", spacing: { after: 220, line: 264 } }), // Spacer before body
  );

  // EXECUTIVE SUMMARY
  if (data.executiveSummary) {
    children.push(...bodyToParagraphs(data.executiveSummary));
  }

  // SECTIONS
  for (const section of data.sections) {
    // R&P numbering format: "1." for H1, "1.1" for H2 (no trailing period)
    const numberText = section.level.includes(".")
      ? `${section.level} `
      : `${section.level}. `;

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${numberText}${section.heading}` }),
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
        children: [new TextRun({ text: "Quellen" })],
        style: "H1RP",
        spacing: { before: 400, after: 200 },
      })
    );
    children.push(...bodyToParagraphs(data.sources));
  }

  // FIRST PAGE HEADER: Logo left + "Entwurf R&P: [date]" right
  const firstPageHeaderChildren: Paragraph[] = [];

  if (options?.logoData) {
    firstPageHeaderChildren.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: options.logoData,
            transformation: {
              width: 134,
              height: 34,
            },
            type: "png",
          }),
          new TextRun({ text: "\t" }),
          new TextRun({ text: `Entwurf R&P: ${data.date}`, size: 18, color: "666666" }),
        ],
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: TabStopPosition.MAX,
          },
        ],
        spacing: { after: 200 },
      })
    );
  } else {
    firstPageHeaderChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Entwurf R&P: ${data.date}`, size: 18, color: "666666" }),
        ],
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
      })
    );
  }

  // Footer with page number (8pt, right-aligned, matching template)
  const pageNumberFooter = new Footer({
    children: [
      new Paragraph({
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Meta Pro" })],
        alignment: AlignmentType.RIGHT,
      }),
    ],
  });

  // Section config shared by both code paths
  const sectionConfig = {
    properties: {
      // R&P template page margins (twips)
      page: {
        margin: { top: 1418, right: 1418, bottom: 1134, left: 1418 },
      },
      titlePage: true,
    },
    headers: {
      first: new Header({ children: firstPageHeaderChildren }),
      default: new Header({ children: [] }),
    },
    footers: {
      first: pageNumberFooter,
      default: pageNumberFooter,
    },
    children,
  };

  if (options?.stylesXml) {
    // Use the R&P template styles directly
    return new Document({
      externalStyles: options.stylesXml,
      sections: [sectionConfig],
    });
  }

  // Fallback: define styles in code when template is unavailable
  return new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "Meta Pro", size: 21 },  // 10.5pt
          paragraph: {
            spacing: { after: 240, line: 240 },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
        {
          id: "H1RP",
          name: "H1 R&P",
          basedOn: "Normal",
          run: { bold: true },
          paragraph: { spacing: { before: 360, after: 220, line: 264 } },
        },
        {
          id: "H2RP",
          name: "H2 R&P",
          basedOn: "Normal",
          paragraph: { spacing: { after: 220, line: 264 } },
        },
        {
          id: "H3RP",
          name: "H3 R&P",
          basedOn: "Normal",
          paragraph: { spacing: { after: 220, line: 264 } },
        },
      ],
    },
    sections: [sectionConfig],
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
