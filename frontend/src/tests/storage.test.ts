import { beforeEach, describe, expect, it } from "vitest";
import {
  GetFontSizeFromStorage,
  GetFormatFromStorage,
  GetLangFromStorage,
  GetLengthFromStorage,
  GetPageFromStorage,
  GetSummaryPayloadFromStorage,
  GetSummaryFromStorage,
  GetThemeFromStorage,
  UpdateFontSizeStorage,
  UpdateFormatStorage,
  UpdateLanguageStorage,
  UpdateLengthStorage,
  UpdatePageStorage,
  UpdateSummaryStorage,
  UpdateThemeStorage,
} from "../utils/storage";

const createMockLocalStorage = (): Storage => {
  const storageMap = new Map<string, string>();

  return {
    get length() {
      return storageMap.size;
    },
    clear: () => storageMap.clear(),
    getItem: (key: string) => (storageMap.has(key) ? storageMap.get(key)! : null),
    key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
    removeItem: (key: string) => {
      storageMap.delete(key);
    },
    setItem: (key: string, value: string) => {
      storageMap.set(key, value);
    },
  } as Storage;
};

describe("storage utils", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMockLocalStorage(),
      configurable: true,
      writable: true,
    });

    localStorage.clear();
  });

  describe("default reads", () => {
    it("returns default values when storage is empty", () => {
      expect(GetLangFromStorage()).toBe("english");
      expect(GetLengthFromStorage()).toBeNull();
      expect(GetFontSizeFromStorage()).toBeNull();
      expect(GetThemeFromStorage()).toBeNull();
      expect(GetFormatFromStorage()).toBeNull();
      expect(GetPageFromStorage()).toBeNull();
      expect(GetSummaryFromStorage()).toBe("Please Click the Generate summary button");
    });
  });

  describe("update/get round trip", () => {
    it("updates and retrieves language", () => {
      UpdateLanguageStorage("french");
      expect(GetLangFromStorage()).toBe("french");
    });

    it("updates and retrieves length", () => {
      UpdateLengthStorage("long");
      expect(GetLengthFromStorage()).toBe("long");
    });

    it("updates and retrieves font size", () => {
      UpdateFontSizeStorage(16);
      expect(GetFontSizeFromStorage()).toBe(16);
    });

    it("stores and retrieves theme", () => {
      UpdateThemeStorage("dark");
      expect(GetThemeFromStorage()).toBe("dark");
    });

    it("stores and retrieves summary", () => {
      const summary = "<p>Summary content</p>";
      const actionItems = [
        {
          id: "flashcards-1",
          type: "flashcards" as const,
          flashcards: [
            { question: "What is this?", answer: "A storage test flashcard." },
            { question: "Why save it?", answer: "So history can restore it." },
          ],
        },
      ];
      UpdateSummaryStorage(summary, "https://example.com/article", actionItems, true);
      const storedValue = localStorage.getItem("summary");

      expect(storedValue).not.toBeNull();

      const parsedSummary = JSON.parse(storedValue!);
      expect(parsedSummary).toMatchObject({
        html: summary,
        sourceUrl: "https://example.com/article",
        actionItems,
        isSuccess: true,
      });
      expect(GetSummaryFromStorage()).toBe(summary);
      expect(GetSummaryPayloadFromStorage()).toMatchObject({
        html: summary,
        sourceUrl: "https://example.com/article",
        actionItems,
        isSuccess: true,
      });
    });

    it("stores and retrieves format", () => {
      UpdateFormatStorage("q-and-a");
      expect(GetFormatFromStorage()).toBe("q-and-a");
    });

    it("stores and retrieves page", () => {
      UpdatePageStorage(3);
      expect(localStorage.getItem("page")).toBe("3");
      expect(GetPageFromStorage()).toBe(3);
    });
  });

  describe("numeric parsing", () => {
    it("parses zero values for page and font size", () => {
      localStorage.setItem("fontSize", "0");
      localStorage.setItem("page", "0");

      expect(GetFontSizeFromStorage()).toBe(0);
      expect(GetPageFromStorage()).toBe(0);
    });

    it("returns NaN for invalid numeric strings", () => {
      localStorage.setItem("fontSize", "abc");
      localStorage.setItem("page", "page-1");

      expect(GetFontSizeFromStorage()).toBeNaN();
      expect(GetPageFromStorage()).toBeNaN();
    });
  });

  describe("summary backward compatibility", () => {
    it("reads summaries saved as JSON without action items", () => {
      localStorage.setItem(
        "summary",
        JSON.stringify({
          html: "<p>Old JSON summary</p>",
          sourceUrl: "https://example.com/legacy",
        }),
      );

      expect(GetSummaryFromStorage()).toBe("<p>Old JSON summary</p>");
      expect(GetSummaryPayloadFromStorage()).toMatchObject({
        html: "<p>Old JSON summary</p>",
        sourceUrl: "https://example.com/legacy",
        actionItems: [],
        isSuccess: false,
      });
    });

    it("reads legacy summary values saved as raw HTML", () => {
      const legacySummary = "<p>Legacy summary</p>";
      localStorage.setItem("summary", legacySummary);

      expect(GetSummaryFromStorage()).toBe(legacySummary);
    });
  });
});
