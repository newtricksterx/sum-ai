// Captures the rendered HTML of a tab via script injection so the backend can
// print it to PDF without re-fetching the URL (which trips bot checks on
// Google and other protected sites). Scripts are stripped — the server renders
// with JavaScript disabled — and a <base> tag is injected so relative asset
// URLs still resolve against the original site.
export const capturePageHtml = async (tabId: number): Promise<string> => {
  let injectionResults: chrome.scripting.InjectionResult[];
  try {
    injectionResults = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const root = document.documentElement.cloneNode(true) as HTMLElement;
        root.querySelectorAll("script, noscript").forEach((element) => element.remove());

        let head = root.querySelector("head");
        if (!head) {
          head = document.createElement("head");
          root.insertBefore(head, root.firstChild);
        }
        // The first <base> in a document wins, so inserting ours up front
        // overrides any existing one with the page's resolved base URI.
        const base = document.createElement("base");
        base.href = document.baseURI;
        head.insertBefore(base, head.firstChild);

        return "<!DOCTYPE html>" + root.outerHTML;
      },
    });
  } catch {
    throw new Error("This page blocks extension script access, so it cannot be exported.");
  }

  const html = injectionResults?.[0]?.result;
  if (typeof html !== "string" || !html) {
    throw new Error("Could not read this page's content for export.");
  }
  return html;
};