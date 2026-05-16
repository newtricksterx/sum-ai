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
      session: { url: "", action_items: [] },
    });
  });

  it("startSession keys the session to the new url and clears the previous session's action items", () => {
    // A prior session left action items behind.
    useCurrentSessionState.setState({
      session: {
        url: "https://old.example.com",
        action_items: [makeActionItem("flashcards-old")],
      },
    });

    useCurrentSessionState.getState().startSession("https://new.example.com");

    const { session } = useCurrentSessionState.getState();
    // A new session must not inherit the old page's action items.
    expect(session.url).toBe("https://new.example.com");
    expect(session.action_items).toEqual([]);
  });

  it("addActionItem appends to the current session without starting a new one", () => {
    useCurrentSessionState.getState().startSession("https://example.com/article");

    useCurrentSessionState.getState().addActionItem(makeActionItem("flashcards-1", "flashcards"));
    useCurrentSessionState.getState().addActionItem(makeActionItem("quiz-1", "quiz"));

    const { session } = useCurrentSessionState.getState();
    // Action grid clicks add to the session; they must leave the url untouched.
    expect(session.url).toBe("https://example.com/article");
    expect(session.action_items.map((item) => item.id)).toEqual(["flashcards-1", "quiz-1"]);
  });

  it("removeActionItem drops only the matching item so the session stays in sync with the UI", () => {
    useCurrentSessionState.setState({
      session: {
        url: "https://example.com/article",
        action_items: [makeActionItem("flashcards-1"), makeActionItem("quiz-1", "quiz")],
      },
    });

    useCurrentSessionState.getState().removeActionItem("flashcards-1");

    const { session } = useCurrentSessionState.getState();
    expect(session.action_items.map((item) => item.id)).toEqual(["quiz-1"]);
  });

  it("resetSession clears the url and action items", () => {
    useCurrentSessionState.setState({
      session: {
        url: "https://example.com/article",
        action_items: [makeActionItem("flashcards-1")],
      },
    });

    useCurrentSessionState.getState().resetSession();

    expect(useCurrentSessionState.getState().session).toEqual({
      url: "",
      action_items: [],
    });
  });

  it("restoreSession replaces the current session with the provided snapshot", () => {
    // Reopening a history entry must rehydrate the full session, not merge with existing state.
    useCurrentSessionState.setState({
      session: {
        url: "https://stale.example.com",
        action_items: [makeActionItem("stale")],
      },
    });

    useCurrentSessionState.getState().restoreSession({
      url: "https://restored.example.com",
      action_items: [makeActionItem("restored-1"), makeActionItem("restored-2", "quiz")],
    });

    const { session } = useCurrentSessionState.getState();
    expect(session.url).toBe("https://restored.example.com");
    expect(session.action_items.map((i) => i.id)).toEqual(["restored-1", "restored-2"]);
  });
});
