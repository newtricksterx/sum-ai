/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";

import { useRestoreSessionOnLogin } from "../pages/AppPage/useRestoreSessionOnLogin";
import { useCurrentSessionState } from "../stores/sessionStorage";
import { useHistoryStorage, type HistoryItem } from "../stores/historyStorage";
import type { UserProfile } from "../stores/authProfileStore";
import type { SessionState } from "../stores/sessionStorage";
import type { SummaryActionItem } from "../types/summary";

const makeActionItem = (id: string): SummaryActionItem => ({
  id,
  type: "summary",
  document: {
    title: `doc-${id}`,
    format: "summary",
    blocks: [{ type: "paragraph", children: [{ text: `block-${id}` }] }],
  },
});

const makeSession = (url: string, itemId: string): SessionState => ({
  url,
  action_items: [makeActionItem(itemId)],
});

const makeHistoryItem = (url: string, itemId: string): HistoryItem => ({
  url,
  updatedAt: Date.now(),
  session: makeSession(url, itemId),
});

const makeProfile = (email: string): UserProfile => ({
  email,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

describe("useRestoreSessionOnLogin", () => {
  beforeEach(() => {
    localStorage.clear();
    useCurrentSessionState.setState({ session: { url: "", action_items: [] } });
    useHistoryStorage.setState({ histories: {} });
  });

  it("does nothing on first render when logged out (preserves persisted current session)", () => {
    // Pretend the persisted session contains in-progress work the user wants to keep.
    useCurrentSessionState.setState({
      session: makeSession("https://anon.example.com", "anon-1"),
    });

    renderHook(({ profile }: { profile: UserProfile | null }) => useRestoreSessionOnLogin(profile), {
      initialProps: { profile: null },
    });

    // The cold-start path must never clobber a persisted session.
    expect(useCurrentSessionState.getState().session.url).toBe("https://anon.example.com");
  });

  it("does nothing on first render when already logged in (cold start)", () => {
    // Refresh while logged in: persisted current-session stays as-is.
    useHistoryStorage.setState({
      histories: { "a@example.com": [makeHistoryItem("https://history.example.com", "h-1")] },
    });
    useCurrentSessionState.setState({
      session: makeSession("https://persisted.example.com", "persisted-1"),
    });

    renderHook(({ profile }: { profile: UserProfile | null }) => useRestoreSessionOnLogin(profile), {
      initialProps: { profile: makeProfile("a@example.com") },
    });

    // No transition observed yet — restore must not fire.
    expect(useCurrentSessionState.getState().session.url).toBe("https://persisted.example.com");
  });

  it("on null → user A login, restores A's most-recent history entry", () => {
    useHistoryStorage.setState({
      histories: { "a@example.com": [makeHistoryItem("https://a-latest.example.com", "a-latest")] },
    });

    const { rerender } = renderHook(
      ({ profile }: { profile: UserProfile | null }) => useRestoreSessionOnLogin(profile),
      { initialProps: { profile: null as UserProfile | null } },
    );

    rerender({ profile: makeProfile("a@example.com") });

    const { session } = useCurrentSessionState.getState();
    // Login transition must pull the user's last session into the current view.
    expect(session.url).toBe("https://a-latest.example.com");
    expect(session.action_items.map((i) => i.id)).toEqual(["a-latest"]);
  });

  it("on login when user has empty history, resets the current session", () => {
    // The previously-anonymous session must not bleed into the new account.
    useCurrentSessionState.setState({
      session: makeSession("https://anon.example.com", "anon-1"),
    });

    const { rerender } = renderHook(
      ({ profile }: { profile: UserProfile | null }) => useRestoreSessionOnLogin(profile),
      { initialProps: { profile: null as UserProfile | null } },
    );

    rerender({ profile: makeProfile("a@example.com") });

    expect(useCurrentSessionState.getState().session).toEqual({ url: "", action_items: [] });
  });

  it("on user A → null logout, clears the current session", () => {
    useCurrentSessionState.setState({
      session: makeSession("https://a-work.example.com", "a-1"),
    });

    const { rerender } = renderHook(
      ({ profile }: { profile: UserProfile | null }) => useRestoreSessionOnLogin(profile),
      { initialProps: { profile: makeProfile("a@example.com") as UserProfile | null } },
    );

    rerender({ profile: null });

    // Logout must not leak the just-signed-out user's session to the next viewer.
    expect(useCurrentSessionState.getState().session).toEqual({ url: "", action_items: [] });
  });

  it("on user A → user B account switch, restores B's most-recent entry", () => {
    useHistoryStorage.setState({
      histories: {
        "a@example.com": [makeHistoryItem("https://a-only.example.com", "a-only")],
        "b@example.com": [makeHistoryItem("https://b-latest.example.com", "b-latest")],
      },
    });
    useCurrentSessionState.setState({
      session: makeSession("https://a-only.example.com", "a-only"),
    });

    const { rerender } = renderHook(
      ({ profile }: { profile: UserProfile | null }) => useRestoreSessionOnLogin(profile),
      { initialProps: { profile: makeProfile("a@example.com") as UserProfile | null } },
    );

    rerender({ profile: makeProfile("b@example.com") });

    expect(useCurrentSessionState.getState().session.url).toBe("https://b-latest.example.com");
  });

  it("ignores profile object identity changes when the email is unchanged", () => {
    useHistoryStorage.setState({
      histories: { "a@example.com": [makeHistoryItem("https://a-history.example.com", "a-1")] },
    });
    useCurrentSessionState.setState({
      session: makeSession("https://in-progress.example.com", "wip-1"),
    });

    const { rerender } = renderHook(
      ({ profile }: { profile: UserProfile | null }) => useRestoreSessionOnLogin(profile),
      { initialProps: { profile: makeProfile("a@example.com") as UserProfile | null } },
    );

    // A re-hydrate produces a new object reference for the same identity.
    rerender({ profile: makeProfile("a@example.com") });

    // Same email = not a transition = current in-progress session is preserved.
    expect(useCurrentSessionState.getState().session.url).toBe("https://in-progress.example.com");
  });
});
