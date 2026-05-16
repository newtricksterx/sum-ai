/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ToolBar from "../../components/ToolBar/ToolBar";
import { useCurrentSessionState } from "../../stores/sessionStorage";

describe("ToolBar", () => {
  beforeEach(() => {
    localStorage.clear();
    useCurrentSessionState.setState({ session: { url: "", action_items: [] } });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows 'No Session' when the current session has no url", () => {
    render(<ToolBar />);
    // Empty session must render a placeholder, not a bare "Session URL: " line.
    expect(screen.getByText(/No Session/)).toBeTruthy();
  });

  it("renders the live session url from the store", () => {
    useCurrentSessionState.setState({
      session: { url: "https://example.com/article", action_items: [] },
    });

    render(<ToolBar />);

    expect(screen.getByText(/https:\/\/example.com\/article/)).toBeTruthy();
  });

  it("updates the rendered url when the store changes after mount", () => {
    render(<ToolBar />);
    // Direct subscription means a post-mount store update must reflect in the DOM
    // without any parent component re-render — that's the whole point of the fix.
    act(() => {
      useCurrentSessionState.getState().startSession("https://new.example.com");
    });

    expect(screen.getByText(/https:\/\/new.example.com/)).toBeTruthy();
  });

  it("calls onClickNewSession when the Start New Session button is clicked", () => {
    const onClickNewSession = vi.fn();
    render(<ToolBar onClickNewSession={onClickNewSession} />);

    fireEvent.click(screen.getByText(/Start New Session/));

    expect(onClickNewSession).toHaveBeenCalledTimes(1);
  });

  it("disables the Start New Session button while summarizing or generating", () => {
    const { rerender } = render(<ToolBar isSummarizing={true} />);
    expect((screen.getByText(/Start New Session/) as HTMLButtonElement).disabled).toBe(true);

    rerender(<ToolBar isGenerateDisabled={true} />);
    expect((screen.getByText(/Start New Session/) as HTMLButtonElement).disabled).toBe(true);

    rerender(<ToolBar />);
    expect((screen.getByText(/Start New Session/) as HTMLButtonElement).disabled).toBe(false);
  });
});
