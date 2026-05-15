/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";

import { useCurrentSessionState } from "../stores/sessionStorage";
import type { SummaryActionItem } from "../types/summary";

const makeActionItem = (id: string, type: SummaryActionItem["type"] = "flashcards"): SummaryActionItem => ({
  id,
  type,
  document: {
    title: `${type} ${id}`,
    format: type,
    blocks: [{ type: "paragraph", children: [{ text: `block-${id}` }] }],
  },
});

describe("currentSessionStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useCurrentSessionState.setState({
      url: "",
      action_items: [],
    });
  });

  it("startSession keys the session to the new url and clears the previous session's action items", () => {
    // A prior session left action items behind.
    useCurrentSessionState.setState({
      url: "https://old.example.com",
      action_items: [makeActionItem("flashcards-old")],
    });

    useCurrentSessionState.getState().startSession("https://new.example.com");

    const state = useCurrentSessionState.getState();
    // A new session must not inherit the old page's action items.
    expect(state.url).toBe("https://new.example.com");
    expect(state.action_items).toEqual([]);
  });

  it("addActionItem appends to the current session without starting a new one", () => {
    useCurrentSessionState.getState().startSession("https://example.com/article");

    useCurrentSessionState.getState().addActionItem(makeActionItem("flashcards-1", "flashcards"));
    useCurrentSessionState.getState().addActionItem(makeActionItem("quiz-1", "quiz"));

    const state = useCurrentSessionState.getState();
    // Action grid clicks add to the session; they must leave the url untouched.
    expect(state.url).toBe("https://example.com/article");
    expect(state.action_items.map((item) => item.id)).toEqual(["flashcards-1", "quiz-1"]);
  });

  it("removeActionItem drops only the matching item so the session stays in sync with the UI", () => {
    useCurrentSessionState.setState({
      url: "https://example.com/article",
      action_items: [makeActionItem("flashcards-1"), makeActionItem("quiz-1", "quiz")],
    });

    useCurrentSessionState.getState().removeActionItem("flashcards-1");

    const state = useCurrentSessionState.getState();
    expect(state.action_items.map((item) => item.id)).toEqual(["quiz-1"]);
  });

  it("resetSession clears the url and action items", () => {
    useCurrentSessionState.setState({
      url: "https://example.com/article",
      action_items: [makeActionItem("flashcards-1")],
    });

    useCurrentSessionState.getState().resetSession();

    expect(useCurrentSessionState.getState()).toMatchObject({
      url: "",
      action_items: [],
    });
  });
});
