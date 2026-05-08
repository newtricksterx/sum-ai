import DOMPurify from "dompurify";

const SUMMARY_ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "div",
  "span",
  "time",
  "ul",
  "ol",
  "li",
  "blockquote",
  "cite",
  "code",
  "pre",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "strong",
  "b",
  "em",
  "a",
  "br",
];

const SUMMARY_ALLOWED_ATTR = ["class", "href", "target", "rel", "datetime"];

const SAFE_ABSOLUTE_LINK_PATTERN = /^https?:\/\//i;

const enforceSafeAnchors = (sanitizedHtml: string) => {
  if (typeof document === "undefined") {
    return sanitizedHtml;
  }

  const container = document.createElement("div");
  container.innerHTML = sanitizedHtml;

  const anchors = container.querySelectorAll<HTMLAnchorElement>("a");
  for (const anchor of anchors) {
    const href = anchor.getAttribute("href")?.trim() ?? "";
    if (!SAFE_ABSOLUTE_LINK_PATTERN.test(href)) {
      anchor.removeAttribute("href");
      anchor.removeAttribute("target");
      anchor.removeAttribute("rel");
      continue;
    }

    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer nofollow");
  }

  return container.innerHTML;
};

export const sanitizeSummaryHtml = (html: string) => {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: SUMMARY_ALLOWED_TAGS,
    ALLOWED_ATTR: SUMMARY_ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: SAFE_ABSOLUTE_LINK_PATTERN,
  });

  return enforceSafeAnchors(sanitized);
};
