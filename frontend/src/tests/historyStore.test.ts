/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";

import { useHistoryStore, type HistorySummary } from "../stores/historyStore";

const makeSummary = (id: number, format = "paragraph"): HistorySummary => {
  const documentContent = {
    title: `Summary ${id}`,
    format,
    blocks: [
      { type: "paragraph", children: [{ text: `summary-${id}` }] },
    ],
  };

  return {
    url: `https://example.com/${id}`,
    document_content: documentContent,
    json_content: JSON.stringify(documentContent),
  };
};

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
        document: {
          title: "Flashcards",
          format: "flashcards",
          blocks: [
            {
              type: "flashcard",
              children: [],
              front: [{ text: "Q1" }],
              back: [{ text: "A1" }],
            },
          ],
        },
      },
    ];
    updateSummaryActionItems("https://example.com/1", actionItems);

    const state = useHistoryStore.getState();
    expect(state.cache[0]?.actionItems).toEqual(actionItems);
  });

  it("replaces an existing entry when the same url is added again", () => {
    const { addSummary, setHistoryOwner } = useHistoryStore.getState();
    setHistoryOwner("user:1", 5);

    addSummary(makeSummary(1, "paragraph"));
    addSummary(makeSummary(1, "bullet-point"));

    const state = useHistoryStore.getState();
    expect(state.cache).toHaveLength(1);
    expect(state.cache[0]?.url).toBe("https://example.com/1");
    expect(state.cache[0]?.document_content.format).toBe("bullet-point");
  });

  it("updates action items only for the matching url entry", () => {
    const { addSummary, updateSummaryActionItems, setHistoryOwner } = useHistoryStore.getState();
    setHistoryOwner("user:1", 5);
    addSummary(makeSummary(1));
    addSummary(makeSummary(2));

    const actionItems = [
      {
        id: "quiz-1",
        type: "quiz" as const,
        document: {
          title: "Quiz",
          format: "quiz",
          blocks: [
            {
              type: "question",
              children: [],
              question: [{ text: "P" }],
              options: [
                { key: "A", correct: true, children: [{ text: "A" }] },
                { key: "B", correct: false, children: [{ text: "B" }] },
                { key: "C", correct: false, children: [{ text: "C" }] },
                { key: "D", correct: false, children: [{ text: "D" }] },
              ],
              explanation: [{ text: "Because A is correct." }],
            },
          ],
        },
      },
    ];

    updateSummaryActionItems("https://example.com/1", actionItems);

    const state = useHistoryStore.getState();
    const item1 = state.cache.find((item) => item.url === "https://example.com/1");
    const item2 = state.cache.find((item) => item.url === "https://example.com/2");
    expect(item1?.actionItems).toEqual(actionItems);
    expect(item2?.actionItems ?? []).toHaveLength(0);
  });

  it("removes only the matching url entry", () => {
    const { addSummary, removeSummary, setHistoryOwner } = useHistoryStore.getState();
    setHistoryOwner("user:1", 5);
    addSummary(makeSummary(1));
    addSummary(makeSummary(2));

    removeSummary("https://example.com/1");

    const state = useHistoryStore.getState();
    expect(state.cache).toHaveLength(1);
    expect(state.cache[0]?.url).toBe("https://example.com/2");
  });
});
