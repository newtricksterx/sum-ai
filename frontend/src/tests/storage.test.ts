import { beforeEach, describe, expect, it } from "vitest";
import {
  GetFontSizeFromStorage,
  GetFormatFromStorage,
  GetLangFromStorage,
  GetLengthFromStorage,
  GetPageFromStorage,
  GetThemeFromStorage,
  UpdateFontSizeStorage,
  UpdateFormatStorage,
  UpdateLanguageStorage,
  UpdateLengthStorage,
  UpdatePageStorage,
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
      expect(GetPageFromStorage()).toBe("home");
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

    it("stores and retrieves format", () => {
      UpdateFormatStorage("q-and-a");
      expect(GetFormatFromStorage()).toBe("q-and-a");
    });

    it("stores and retrieves page", () => {
      UpdatePageStorage("session");
      expect(localStorage.getItem("page")).toBe("session");
      expect(GetPageFromStorage()).toBe("session");
    });

    it("round-trips each PageType value", () => {
      const pages = ["home", "session", "history", "settings", "profile"] as const;
      for (const page of pages) {
        UpdatePageStorage(page);
        expect(GetPageFromStorage()).toBe(page);
      }
    });
  });

  describe("numeric parsing", () => {
    it("parses zero font size", () => {
      localStorage.setItem("fontSize", "0");
      expect(GetFontSizeFromStorage()).toBe(0);
    });

    it("returns NaN for invalid font size string", () => {
      localStorage.setItem("fontSize", "abc");
      expect(GetFontSizeFromStorage()).toBeNaN();
    });
  });
});
