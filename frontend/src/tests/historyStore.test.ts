/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";

import { useHistoryStore } from "../stores/historyStore";

const makeSummary = (id: number) => ({
  url: `https://example.com/${id}`,
  content: `summary-${id}`,
});

describe("historyStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useHistoryStore.setState({
      cache: [],
      maxHistorySize: 1,
      activeOwnerKey: "anonymous",
      ownerHistories: {
        anonymous: {
          cache: [],
          maxHistorySize: 1,
        },
      },
    });
  });

  it("defaults to one history item for logged-out behavior", () => {
    const { addSummary } = useHistoryStore.getState();

    addSummary(makeSummary(1));
    addSummary(makeSummary(2));

    const state = useHistoryStore.getState();
    expect(state.maxHistorySize).toBe(1);
    expect(state.cache).toHaveLength(1);
    expect(state.cache[0]?.url).toBe("https://example.com/2");
  });

  it("respects user history limit when updated", () => {
    const { addSummary, setHistoryOwner } = useHistoryStore.getState();
    setHistoryOwner("user:1", 5);

    addSummary(makeSummary(1));
    addSummary(makeSummary(2));
    addSummary(makeSummary(3));

    const state = useHistoryStore.getState();
    expect(state.maxHistorySize).toBe(5);
    expect(state.cache).toHaveLength(3);
  });

  it("trims cache when history limit is reduced", () => {
    const { addSummary, setHistoryOwner, setHistoryLimit } = useHistoryStore.getState();
    setHistoryOwner("user:1", 5);
    addSummary(makeSummary(1));
    addSummary(makeSummary(2));
    addSummary(makeSummary(3));
    setHistoryLimit(1);

    const state = useHistoryStore.getState();
    expect(state.cache).toHaveLength(1);
    expect(state.cache[0]?.url).toBe("https://example.com/3");
  });

  it("keeps user history intact when switching to anonymous", () => {
    const { addSummary, setHistoryOwner } = useHistoryStore.getState();
    setHistoryOwner("user:7", 5);
    addSummary(makeSummary(1));
    addSummary(makeSummary(2));

    setHistoryOwner("anonymous", 1);
    addSummary(makeSummary(3));

    let state = useHistoryStore.getState();
    expect(state.activeOwnerKey).toBe("anonymous");
    expect(state.cache).toHaveLength(1);
    expect(state.cache[0]?.url).toBe("https://example.com/3");

    setHistoryOwner("user:7");
    state = useHistoryStore.getState();
    expect(state.activeOwnerKey).toBe("user:7");
    expect(state.maxHistorySize).toBe(5);
    expect(state.cache).toHaveLength(2);
    expect(state.cache[0]?.url).toBe("https://example.com/2");
    expect(state.cache[1]?.url).toBe("https://example.com/1");
  });

  it("updates action items for an existing summary", () => {
    const { addSummary, updateSummaryActionItems } = useHistoryStore.getState();
    addSummary(makeSummary(1));

    const actionItems = [
      {
        id: "flashcards-1",
        type: "flashcards" as const,
        flashcards: [{ question: "Q1", answer: "A1" }],
      },
    ];
    updateSummaryActionItems("https://example.com/1", actionItems);

    const state = useHistoryStore.getState();
    expect(state.cache[0]?.actionItems).toEqual(actionItems);
  });
});
