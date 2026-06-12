/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useSourcePayload } from "../pages/SummaryPage/useSourcePayload";
import type { SourcePayload } from "../pages/SummaryPage/utils/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      typeof options?.defaultValue === "string" ? options.defaultValue : key,
  }),
}));

vi.mock("../pages/SummaryPage/utils/mocks", () => ({
  isAnyActionItemMockEnabled: () => false,
}));

vi.mock("../pages/FrontPage/utils/chromeTabs", () => ({
  resolveCurrentTab: vi.fn(),
  isRestrictedPage: vi.fn(() => false),
}));

vi.mock("../pages/SummaryPage/utils/sourcePayload", () => ({
  buildMockSourcePayload: vi.fn(),
  buildSourcePayloadFromTab: vi.fn(),
  sourcePayloadError: (title: string, message: string, sourceUrl?: string) => ({
    payload: null,
    errorDocument: {
      title,
      format: "error",
      blocks: [{ type: "paragraph", children: [{ text: message }] }],
    },
    sourceUrl,
  }),
}));

import { isRestrictedPage, resolveCurrentTab } from "../pages/FrontPage/utils/chromeTabs";
import { buildSourcePayloadFromTab } from "../pages/SummaryPage/utils/sourcePayload";

const mockedResolveCurrentTab = vi.mocked(resolveCurrentTab);
const mockedIsRestrictedPage = vi.mocked(isRestrictedPage);
const mockedBuildFromTab = vi.mocked(buildSourcePayloadFromTab);

const sessionPayload: SourcePayload = {
  sourceType: "webpage",
  sourceUrl: "https://example.com/original",
  sourceContent: "Original session content",
};

const makeTab = (url: string): chrome.tabs.Tab => ({ id: 1, url }) as chrome.tabs.Tab;

describe("useSourcePayload session pinning", () => {
  beforeEach(() => {
    mockedResolveCurrentTab.mockReset();
    mockedIsRestrictedPage.mockReset().mockReturnValue(false);
    mockedBuildFromTab.mockReset();
  });

  it("scrapes the active tab when starting a session (forceActiveTab)", async () => {
    const freshPayload: SourcePayload = {
      sourceType: "webpage",
      sourceUrl: "https://example.com/new",
      sourceContent: "Fresh content",
    };
    mockedResolveCurrentTab.mockResolvedValue(makeTab("https://example.com/new"));
    mockedBuildFromTab.mockResolvedValue({ payload: freshPayload, errorDocument: null });

    const { result } = renderHook(() => useSourcePayload());

    let resolved: SourcePayload | null = null;
    await act(async () => {
      resolved = await result.current.resolveSourcePayload({ forceActiveTab: true });
    });

    expect(resolved).toBe(freshPayload);
  });

  it("pins follow-up actions to the session source without re-scraping, even if the user navigated away", async () => {
    // A quiz generated after a summary must use the same source content the
    // summary was built from — not whatever page the user happens to be on now.
    mockedResolveCurrentTab.mockResolvedValue(makeTab("https://other-site.com/somewhere-else"));

    const { result } = renderHook(() => useSourcePayload());
    act(() => {
      result.current.setSourcePayload(sessionPayload);
    });

    let resolved: SourcePayload | null = null;
    await act(async () => {
      resolved = await result.current.resolveSourcePayload();
    });

    expect(resolved).toBe(sessionPayload);
    expect(mockedBuildFromTab).not.toHaveBeenCalled();
  });

  it("re-resolves from the active tab when there is no cached source (e.g., session restored from history)", async () => {
    mockedResolveCurrentTab.mockResolvedValue(makeTab("https://example.com/original"));
    mockedBuildFromTab.mockResolvedValue({ payload: sessionPayload, errorDocument: null });

    const { result } = renderHook(() => useSourcePayload());

    let resolved: SourcePayload | null = null;
    await act(async () => {
      resolved = await result.current.resolveSourcePayload();
    });

    expect(resolved).toBe(sessionPayload);
    expect(mockedBuildFromTab).toHaveBeenCalledTimes(1);
  });

  it("never reuses the previous session's source when starting a new session on an unreadable page", async () => {
    // Regression guard: setSourcePayload(null) before a new session doesn't
    // update this callback's closure, so a stale cached payload is still in
    // scope here. Starting a session on a chrome:// page must error — not
    // silently summarize the previous session's page.
    mockedResolveCurrentTab.mockResolvedValue(makeTab("chrome://settings"));
    mockedIsRestrictedPage.mockReturnValue(true);

    const { result } = renderHook(() => useSourcePayload());
    act(() => {
      result.current.setSourcePayload(sessionPayload);
    });

    let resolved: SourcePayload | null = null;
    await act(async () => {
      resolved = await result.current.resolveSourcePayload({ forceActiveTab: true });
    });

    expect(resolved).toBeNull();
    expect(result.current.lastSourceErrorRef.current?.errorDocument?.title).toBe("Page not supported");
  });
});
