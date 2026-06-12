import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, type AxiosResponse } from "axios";

import { requestActionItem } from "../pages/SummaryPage/utils/actionItemRequest";
import type { SourcePayload } from "../pages/SummaryPage/utils/types";

vi.mock("../pages/SummaryPage/utils/mocks", () => ({
  isMockActionItemModeEnabled: () => false,
  MOCK_FLASHCARDS_DOCUMENT: null,
  MOCK_QUIZ_DOCUMENT: null,
  MOCK_SUMMARY_ACTION_ITEM_DOCUMENT: null,
}));

// requestActionItem must go through authInstance so the shared interceptors
// (CSRF injection + retry, 401 token refresh) apply. A raw fetch here would
// silently skip token refresh and run authenticated requests as anonymous.
vi.mock("../services/axiosService", () => ({
  authInstance: { post: vi.fn() },
}));

import { authInstance } from "../services/axiosService";

const mockedPost = vi.mocked(authInstance.post);

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

const httpError = (status: number, data: unknown) =>
  new AxiosError("Request failed", undefined, undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

const firstBlockText = (result: { document: { blocks: { children: { text: string }[] }[] } | null }) =>
  result.document?.blocks[0]?.children[0]?.text;

describe("requestActionItem transport", () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  it("posts through authInstance with the generation payload and no timeout cap", async () => {
    mockedPost.mockResolvedValueOnce({ data: { isSuccess: true, content: flashcardDocument } });

    const result = await requestActionItem({
      language: "english",
      type: "flashcards",
      sourcePayload,
      isAuthenticated: true,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.document?.title).toBe("Flashcards");
    expect(mockedPost).toHaveBeenCalledWith(
      "/api/action-item",
      expect.objectContaining({
        type: "flashcards",
        source_content: "Raw source",
        source_url: "https://example.com/article",
        source_type: "webpage",
        language: "english",
      }),
      // Generation can outlast the instance's 30s default timeout.
      expect.objectContaining({ timeout: 0 }),
    );
  });

  it("maps a 429 for anonymous users to a throttle message that prompts sign-in", async () => {
    mockedPost.mockRejectedValueOnce(httpError(429, { summaries_limit: 2, limit_period: "day" }));

    const result = await requestActionItem({
      language: "english",
      type: "flashcards",
      sourcePayload,
      isAuthenticated: false,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.document?.title).toBe("Rate limit reached");
    expect(firstBlockText(result)).toContain("Sign in to receive additional summaries.");
  });

  it("does not prompt already-authenticated users to sign in on a 429", async () => {
    mockedPost.mockRejectedValueOnce(httpError(429, { summaries_limit: 2, limit_period: "day" }));

    const result = await requestActionItem({
      language: "english",
      type: "flashcards",
      sourcePayload,
      isAuthenticated: true,
    });

    expect(result.isSuccess).toBe(false);
    expect(firstBlockText(result)).not.toContain("Sign in");
  });

  it("surfaces the backend error message on a non-429 HTTP failure", async () => {
    mockedPost.mockRejectedValueOnce(httpError(500, { error: "Gemini unavailable" }));

    const result = await requestActionItem({
      language: "english",
      type: "flashcards",
      sourcePayload,
      isAuthenticated: true,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.document?.title).toBe("Request failed");
    expect(firstBlockText(result)).toBe("Gemini unavailable");
  });

  it("maps network-level failures to a network error document", async () => {
    mockedPost.mockRejectedValueOnce(new AxiosError("Network Error"));

    const result = await requestActionItem({
      language: "english",
      type: "flashcards",
      sourcePayload,
      isAuthenticated: true,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.document?.title).toBe("Network error");
  });
});
