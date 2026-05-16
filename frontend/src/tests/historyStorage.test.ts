/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";

import { useHistoryStorage } from "../stores/historyStorage";
import type { SessionState } from "../stores/sessionStorage";
import type { SummaryActionItem } from "../types/summary";

const makeActionItem = (id: string, type: SummaryActionItem["type"] = "summary"): SummaryActionItem => ({
  id,
  type,
  document: {
    title: `${type} ${id}`,
    format: type,
    blocks: [{ type: "paragraph", children: [{ text: `block-${id}` }] }],
  },
});

const makeSession = (url: string, items: SummaryActionItem[] = []): SessionState => ({
  url,
  action_items: items,
});

const USER_A = "alice@example.com";
const USER_B = "bob@example.com";

describe("historyStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    useHistoryStorage.setState({ histories: {} });
  });

  it("upsertHistoryItem appends a new url to the front", () => {
    const store = useHistoryStorage.getState();
    store.upsertHistoryItem(USER_A, makeSession("https://a.example.com"), null);
    store.upsertHistoryItem(USER_A, makeSession("https://b.example.com"), null);

    const list = useHistoryStorage.getState().histories[USER_A];
    // Most recent must be position 0 so the History page shows newest at the top.
    expect(list.map((i) => i.url)).toEqual(["https://b.example.com", "https://a.example.com"]);
  });

  it("upsertHistoryItem dedupes by url and bumps the existing entry to the front", () => {
    const store = useHistoryStorage.getState();
    store.upsertHistoryItem(USER_A, makeSession("https://a.example.com", [makeActionItem("s-1")]), null);
    store.upsertHistoryItem(USER_A, makeSession("https://b.example.com"), null);
    // Re-summarize A — should replace the old A entry (no duplicates) and move it to the top.
    store.upsertHistoryItem(USER_A, makeSession("https://a.example.com", [makeActionItem("s-2")]), null);

    const list = useHistoryStorage.getState().histories[USER_A];
    expect(list.map((i) => i.url)).toEqual(["https://a.example.com", "https://b.example.com"]);
    // The latest session payload wins so reopening reflects the freshest content.
    expect(list[0].session.action_items[0].id).toBe("s-2");
  });

  it("upsertHistoryItem evicts the oldest entry when the per-user limit is exceeded", () => {
    const store = useHistoryStorage.getState();
    const limit = 2;
    store.upsertHistoryItem(USER_A, makeSession("https://a.example.com"), limit);
    store.upsertHistoryItem(USER_A, makeSession("https://b.example.com"), limit);
    store.upsertHistoryItem(USER_A, makeSession("https://c.example.com"), limit);

    const list = useHistoryStorage.getState().histories[USER_A];
    // LRU eviction: the least-recently-used (a) must be dropped.
    expect(list.map((i) => i.url)).toEqual(["https://c.example.com", "https://b.example.com"]);
  });

  it("upsertHistoryItem with null limit never evicts", () => {
    const store = useHistoryStorage.getState();
    for (let i = 0; i < 10; i += 1) {
      store.upsertHistoryItem(USER_A, makeSession(`https://x${i}.example.com`), null);
    }

    expect(useHistoryStorage.getState().histories[USER_A]).toHaveLength(10);
  });

  it("upsertHistoryItem ignores sessions with an empty url", () => {
    const store = useHistoryStorage.getState();
    store.upsertHistoryItem(USER_A, makeSession(""), null);
    // A failed session-resolution should not pollute history with a blank entry.
    expect(useHistoryStorage.getState().histories[USER_A] ?? []).toEqual([]);
  });

  it("histories for different user keys are isolated", () => {
    const store = useHistoryStorage.getState();
    store.upsertHistoryItem(USER_A, makeSession("https://a.example.com"), null);
    store.upsertHistoryItem(USER_B, makeSession("https://b.example.com"), null);

    const state = useHistoryStorage.getState();
    // Two users on the same device must not see each other's history.
    expect(state.histories[USER_A].map((i) => i.url)).toEqual(["https://a.example.com"]);
    expect(state.histories[USER_B].map((i) => i.url)).toEqual(["https://b.example.com"]);
  });

  it("removeHistoryItem drops only the targeted url for the targeted user", () => {
    const store = useHistoryStorage.getState();
    store.upsertHistoryItem(USER_A, makeSession("https://a.example.com"), null);
    store.upsertHistoryItem(USER_A, makeSession("https://b.example.com"), null);
    store.upsertHistoryItem(USER_B, makeSession("https://a.example.com"), null);

    store.removeHistoryItem(USER_A, "https://a.example.com");

    const state = useHistoryStorage.getState();
    expect(state.histories[USER_A].map((i) => i.url)).toEqual(["https://b.example.com"]);
    // Removal must be scoped per-user; user B's identical url must stay.
    expect(state.histories[USER_B].map((i) => i.url)).toEqual(["https://a.example.com"]);
  });

  it("clearHistory empties only the targeted user's list", () => {
    const store = useHistoryStorage.getState();
    store.upsertHistoryItem(USER_A, makeSession("https://a.example.com"), null);
    store.upsertHistoryItem(USER_B, makeSession("https://b.example.com"), null);

    store.clearHistory(USER_A);

    const state = useHistoryStorage.getState();
    expect(state.histories[USER_A]).toEqual([]);
    expect(state.histories[USER_B].map((i) => i.url)).toEqual(["https://b.example.com"]);
  });
});
