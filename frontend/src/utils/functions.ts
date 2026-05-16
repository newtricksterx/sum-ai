

export async function savePDF(content : string): Promise<void> {
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        unit: "pt",
        format: "a4",
      });

      const printableHtml = `
        <div class="pdf-export-root" style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.65; font-size: 12px;">
          <style>
            .pdf-export-root h1 { font-size: 20px; line-height: 1.35; margin: 0 0 12px; font-weight: 700; color: #111827; }
            .pdf-export-root h2 { font-size: 13px; line-height: 1.35; margin: 14px 0 8px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; }
            .pdf-export-root p { margin: 0 0 10px; }
            .pdf-export-root ul { margin: 0 0 12px 18px; padding: 0; list-style-type: disc; }
            .pdf-export-root li { margin: 0 0 6px; }
            .pdf-export-root strong { font-weight: 700; color: #111827; }
            .pdf-export-root a { color: #EFBF04; text-decoration: underline; }
          </style>
          ${content}
        </div>
      `;

      await pdf.html(printableHtml, {
        margin: [28, 28, 28, 28],
        autoPaging: "text",
        width: 539,
        windowWidth: 539,
        html2canvas: {
          backgroundColor: "#ffffff",
          scale: 1,
        },
      });

      pdf.save("summary.pdf");
    } catch (error) {
      console.log("PDF export error:", error);
    }
}

export function capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}