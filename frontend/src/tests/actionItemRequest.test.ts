import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestActionItem } from "../pages/SummaryPage/utils/actionItemRequest";
import type { SourcePayload } from "../pages/SummaryPage/utils/types";

vi.mock("../pages/SummaryPage/utils/mocks", () => ({
  isMockActionItemModeEnabled: () => false,
  MOCK_FLASHCARDS_DOCUMENT: null,
  MOCK_QUIZ_DOCUMENT: null,
  MOCK_SUMMARY_ACTION_ITEM_DOCUMENT: null,
}));

vi.mock("../services/axiosService", () => ({
  getCsrfToken: vi.fn(),
  isCsrfFailurePayload: vi.fn(),
}));

import { getCsrfToken, isCsrfFailurePayload } from "../services/axiosService";

const mockedGetCsrfToken = vi.mocked(getCsrfToken);
const mockedIsCsrfFailurePayload = vi.mocked(isCsrfFailurePayload);

const sourcePayload: SourcePayload = {
  sourceType: "webpage",
  sourceUrl: "https://example.com/article",
  sourceContent: "Raw source",
};

const flashcardDocument = {
  title: "Flashcards",
  format: "flashcards",
  blocks: [
    {
      type: "flashcard",
      children: [],
      front: [{ text: "Q" }],
      back: [{ text: "A" }],
    },
  ],
};

const createFetchResponse = (status: number, payload: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  }) as Response;

describe("requestActionItem CSRF integration", () => {
  beforeEach(() => {
    mockedGetCsrfToken.mockReset();
    mockedIsCsrfFailurePayload.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("retries once with a refreshed CSRF token when the first authenticated request fails CSRF", async () => {
    const fetchMock = vi.mocked(fetch);

    mockedGetCsrfToken.mockResolvedValueOnce("token-a").mockResolvedValueOnce("token-b");
    mockedIsCsrfFailurePayload.mockReturnValue(true);

    fetchMock
      .mockResolvedValueOnce(createFetchResponse(403, { detail: "CSRF Failed: missing or incorrect" }))
      .mockResolvedValueOnce(
        createFetchResponse(200, {
          isSuccess: true,
          content: flashcardDocument,
        }),
      );

    const result = await requestActionItem({
      baseUrl: "https://api.example.com",
      language: "english",
      type: "flashcards",
      sourcePayload,
      isAuthenticated: true,
    });

    expect(result.isSuccess).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockedGetCsrfToken).toHaveBeenNthCalledWith(1, false);
    expect(mockedGetCsrfToken).toHaveBeenNthCalledWith(2, true);

    const firstHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    const secondHeaders = fetchMock.mock.calls[1][1]?.headers as Headers;
    expect(firstHeaders.get("X-CSRFToken")).toBe("token-a");
    expect(secondHeaders.get("X-CSRFToken")).toBe("token-b");
  });

  it("does not fetch a CSRF token for anonymous requests", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      createFetchResponse(200, {
        isSuccess: true,
        content: flashcardDocument,
      }),
    );

    const result = await requestActionItem({
      baseUrl: "https://api.example.com",
      language: "english",
      type: "flashcards",
      sourcePayload,
      isAuthenticated: false,
    });

    expect(result.isSuccess).toBe(true);
    expect(mockedGetCsrfToken).not.toHaveBeenCalled();
  });
});

