export const getPlainTextFromHtml = (html: string) => {
  const parser = document.createElement("div");
  parser.innerHTML = html;
  return parser.textContent?.trim() ?? "";
};
