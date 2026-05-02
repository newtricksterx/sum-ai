export const getPlainTextFromHtml = (html: string) => {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  const parser = document.createElement("div");
  parser.innerHTML = html;
  return parser.textContent?.trim() ?? "";
};

const getNormalizedText = (text: string) => text.replace(/\s+/g, " ").trim();

export const getSummaryIntroFromHtml = (html: string) => {
  if (typeof document === "undefined") {
    return getPlainTextFromHtml(html);
  }

  const parser = document.createElement("div");
  parser.innerHTML = html;

  const introductionParagraph = parser.querySelector("p#introduction");
  const introductionText = getNormalizedText(introductionParagraph?.textContent ?? "");
  if (introductionText.length > 0) {
    return introductionText;
  }

  const walker = document.createTreeWalker(parser, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();
  while (currentNode) {
    const parentTagName = currentNode.parentElement?.tagName.toLowerCase();
    if (parentTagName !== "script" && parentTagName !== "style") {
      const firstText = getNormalizedText(currentNode.textContent ?? "");
      if (firstText.length > 0) {
        return firstText;
      }
    }
    currentNode = walker.nextNode();
  }

  return getNormalizedText(parser.textContent ?? "");
};
