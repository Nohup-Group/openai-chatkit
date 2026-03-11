export interface Section {
  heading: string;
  body: string;
  level: string;
  style: "H1RP" | "H2RP" | "H3RP";
}

export interface DocxData {
  report_title: string;
  subtitle?: string;
  date: string;
  executiveSummary?: string;
  sections: Section[];
  sources?: string;
}
