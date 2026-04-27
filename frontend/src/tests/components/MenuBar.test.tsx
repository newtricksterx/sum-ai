/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { regenerateStateMock } = vi.hoisted(() => ({
  regenerateStateMock: vi.fn(),
}));

vi.mock("../../utils/states", () => ({
  RegenerateState: () => regenerateStateMock(),
}));

vi.mock("../../components/SettingsDropdown", () => ({
  default: () => <div data-testid="settings-dropdown">SettingsDropdown</div>,
}));

import MenuBar from "../../components/MenuBar";

describe("MenuBar", () => {
  beforeEach(() => {
    regenerateStateMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders menu buttons and calls provided handlers", () => {
    regenerateStateMock.mockReturnValue(true);

    const onClickReturn = vi.fn();
    const onClickForward = vi.fn();
    const onClickClose = vi.fn();
    const onClickProfile = vi.fn();
    const onClickRegenerate = vi.fn();
    const onClickHistory = vi.fn();

    render(
      <MenuBar
        onClickReturn={onClickReturn}
        onClickForward={onClickForward}
        onClickClose={onClickClose}
        onClickProfile={onClickProfile}
        onClickRegenerate={onClickRegenerate}
        onClickHistory={onClickHistory}
      />
    );

    expect(screen.getByTestId("settings-dropdown")).not.toBeNull();

    fireEvent.click(screen.getByTitle("Go to home page"));
    fireEvent.click(screen.getByTitle("Go to summary page"));
    fireEvent.click(screen.getByTitle("Generate summary"));
    fireEvent.click(screen.getByTitle("View history"));
    fireEvent.click(screen.getByTitle("Profile page"));
    fireEvent.click(screen.getByTitle("Close extension"));

    expect(onClickReturn).toHaveBeenCalledTimes(1);
    expect(onClickForward).toHaveBeenCalledTimes(1);
    expect(onClickRegenerate).toHaveBeenCalledTimes(1);
    expect(onClickHistory).toHaveBeenCalledTimes(1);
    expect(onClickProfile).toHaveBeenCalledTimes(1);
    expect(onClickClose).toHaveBeenCalledTimes(1);
  });

  it("disables regenerate button when RegenerateState is false", () => {
    regenerateStateMock.mockReturnValue(false);

    render(
      <MenuBar
        onClickReturn={vi.fn()}
        onClickForward={vi.fn()}
        onClickClose={vi.fn()}
        onClickProfile={vi.fn()}
        onClickRegenerate={vi.fn()}
        onClickHistory={vi.fn()}
      />
    );

    const regenerateButton = screen.getByTitle("Generate summary");
    expect((regenerateButton as HTMLButtonElement).disabled).toBe(true);
    expect(regenerateButton.className).toContain("opacity-50");
  });
});
