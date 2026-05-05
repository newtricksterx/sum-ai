/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../components/SettingsDropdown", () => ({
  default: () => <div data-testid="settings-dropdown">SettingsDropdown</div>,
}));

import MenuBar from "../../components/MenuBar/MenuBar";

describe("MenuBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders menu buttons and calls provided handlers", () => {
    const onClickReturn = vi.fn();
    const onClickForward = vi.fn();
    const onClickProfile = vi.fn();
    const onClickHistory = vi.fn();

    render(
      <MenuBar
        onClickReturn={onClickReturn}
        onClickForward={onClickForward}
        onClickProfile={onClickProfile}
        onClickHistory={onClickHistory}
      />
    );

    expect(screen.getByTestId("settings-dropdown")).not.toBeNull();

    fireEvent.click(screen.getByTitle("Go to home page"));
    fireEvent.click(screen.getByTitle("Go to summary page"));
    fireEvent.click(screen.getByTitle("View history"));
    fireEvent.click(screen.getByTitle("Profile page"));
    fireEvent.click(screen.getByTitle("Close extension"));

    expect(onClickReturn).toHaveBeenCalledTimes(1);
    expect(onClickForward).toHaveBeenCalledTimes(1);
    expect(onClickHistory).toHaveBeenCalledTimes(1);
    expect(onClickProfile).toHaveBeenCalledTimes(1);
  });
});
