// Scrapes readable text out of an active browser tab via a content-script injection.
// Returns { text: "" } on any injection failure so callers can branch on .text alone.
export const extractTabContent = async (tabId: number): Promise<{ text: string }> => {
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const rootElement = (document.querySelector("article, main") || document.body) as HTMLElement;
      const normalizeText = (value: string) => value.replace(/\s\s+/g, " ").trim();
      const text = normalizeText(rootElement?.innerText || document.body.innerText || "").slice(0, 10000);
      return { text };
    },
  });

  const payload = injectionResults?.[0]?.result as { text?: unknown } | undefined;
  if (!payload || typeof payload.text !== "string") {
    return { text: "" };
  }
  return { text: payload.text };
};

// Recognizes every YouTube URL shape we expect: watch?v=, shorts/, embed/, live/, and youtu.be short links.
export const isYoutube = (url: string | undefined): boolean => {
  if (!url) return false;

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

    const isYouTubeDomain =
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com" ||
      hostname === "youtu.be";
    if (!isYouTubeDomain) return false;

    if (hostname === "youtu.be") return parsedUrl.pathname.length > 1;
    if (parsedUrl.pathname === "/watch" && parsedUrl.searchParams.has("v")) return true;
    if (parsedUrl.pathname.startsWith("/shorts/")) return true;
    if (parsedUrl.pathname.startsWith("/embed/")) return true;
    if (parsedUrl.pathname.startsWith("/live/")) return true;

    return false;
  } catch {
    return false;
  }
};
