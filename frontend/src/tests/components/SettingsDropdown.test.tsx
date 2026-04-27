/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockSettingsState, mockActions } = vi.hoisted(() => ({
  mockSettingsState: {
    language: "english",
    length: "short",
    fontSize: 12,
    format: "paragraph",
    theme: "light",
  },
  mockActions: {
    UpdateLanguage: vi.fn(),
    UpdateLength: vi.fn(),
    UpdateFontSize: vi.fn(),
    UpdateFormat: vi.fn(),
    UpdateTheme: vi.fn(),
  },
}));

vi.mock("../../stores/settingsStore", () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) =>
    selector({
      ...mockSettingsState,
      ...mockActions,
    }),
}));

import SettingsDropdown from "../../components/SettingsDropdown";

describe("SettingsDropdown", () => {
  beforeEach(() => {
    mockSettingsState.language = "english";
    mockSettingsState.length = "short";
    mockSettingsState.fontSize = 12;
    mockSettingsState.format = "paragraph";
    mockSettingsState.theme = "light";

    mockActions.UpdateLanguage.mockReset();
    mockActions.UpdateLength.mockReset();
    mockActions.UpdateFontSize.mockReset();
    mockActions.UpdateFormat.mockReset();
    mockActions.UpdateTheme.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("opens and closes the dropdown panel", () => {
    render(<SettingsDropdown />);

    const settingsButton = screen.getByTitle("Settings");
    const panel = document.querySelector("div.fixed") as HTMLDivElement;

    expect(panel.className).toContain("grid-rows-[0fr]");

    fireEvent.click(settingsButton);
    expect(panel.className).toContain("grid-rows-[1fr]");

    fireEvent.mouseDown(document.body);
    expect(panel.className).toContain("grid-rows-[0fr]");
  });

  it("calls store update actions with selected values when saved", () => {
    render(<SettingsDropdown />);

    fireEvent.click(screen.getByTitle("Settings"));

    fireEvent.change(screen.getByLabelText("Language"), {
      target: { value: "french" },
    });
    fireEvent.change(screen.getByLabelText("Summary Format"), {
      target: { value: "action-items" },
    });
    fireEvent.change(screen.getByLabelText("Summary Length"), {
      target: { value: "long" },
    });
    fireEvent.change(screen.getByLabelText("Font size"), {
      target: { value: "18" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(mockActions.UpdateLanguage).toHaveBeenCalledWith("french");
    expect(mockActions.UpdateLength).toHaveBeenCalledWith("long");
    expect(mockActions.UpdateFormat).toHaveBeenCalledWith("action-items");
    expect(mockActions.UpdateFontSize).toHaveBeenCalledWith(18);
    expect(screen.getByRole("button", { name: "Saved" })).not.toBeNull();
  });

  it("calls UpdateTheme when the theme toggle button is clicked", () => {
    render(<SettingsDropdown />);

    fireEvent.click(screen.getByTitle("Settings"));
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(mockActions.UpdateTheme).toHaveBeenCalledTimes(1);
  });
});
