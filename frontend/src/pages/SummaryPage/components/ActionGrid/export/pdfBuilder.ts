import { jsPDF } from "jspdf";
import type { TranscriptParagraph } from "./types";

const PAGE_WIDTH = 210;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 7;
const TITLE_FONT_SIZE = 16;
const BODY_FONT_SIZE = 11;
const TIMESTAMP_FONT_SIZE = 10;

const addPageIfNeeded = (doc: jsPDF, y: number, requiredSpace: number): number => {
  if (y + requiredSpace > doc.internal.pageSize.getHeight() - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
};

const formatTimestamp = (seconds: number): string => {
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

export const buildTranscriptPdf = (
  title: string,
  paragraphs: TranscriptParagraph[],
): Blob => {
  const doc = new jsPDF();
  let y = MARGIN;

  doc.setFontSize(TITLE_FONT_SIZE);
  doc.setFont("helvetica", "bold");
  const titleLines: string[] = doc.splitTextToSize(title, CONTENT_WIDTH);
  for (const line of titleLines) {
    y = addPageIfNeeded(doc, y, LINE_HEIGHT + 2);
    doc.text(line, MARGIN, y);
    y += LINE_HEIGHT + 2;
  }

  y += 4;

  for (const paragraph of paragraphs) {
    const stamp = `[${formatTimestamp(paragraph.timestamp)}]`;

    doc.setFontSize(TIMESTAMP_FONT_SIZE);
    doc.setFont("helvetica", "bold");
    y = addPageIfNeeded(doc, y, LINE_HEIGHT * 2);
    doc.text(stamp, MARGIN, y);
    y += LINE_HEIGHT;

    doc.setFontSize(BODY_FONT_SIZE);
    doc.setFont("helvetica", "normal");
    const textLines: string[] = doc.splitTextToSize(paragraph.text, CONTENT_WIDTH);
    for (const line of textLines) {
      y = addPageIfNeeded(doc, y, LINE_HEIGHT);
      doc.text(line, MARGIN, y);
      y += LINE_HEIGHT;
    }

    y += 4;
  }

  return doc.output("blob");
};
