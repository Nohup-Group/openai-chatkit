export interface Section {
  heading: string;
  body: string;
  level: string;
  style: "Memo1" | "Memo2" | "Memo3";
}

export interface DocxData {
  report_title: string;
  subtitle?: string;
  date: string;
  executiveSummary?: string;
  sections: Section[];
  sources?: string;
}

export interface ExtractedResponse {
  text: string;
  html: string;
}
