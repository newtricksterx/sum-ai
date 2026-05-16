/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    const onClickSettings = vi.fn();
    const onClickClose = vi.fn();

    render(
      <MenuBar
        onClickReturn={onClickReturn}
        onClickForward={onClickForward}
        onClickProfile={onClickProfile}
        onClickHistory={onClickHistory}
        onClickSettings={onClickSettings}
        onClickClose={onClickClose}
      />
    );

    const menuButtons = screen.getAllByRole("button");
    expect(menuButtons).toHaveLength(6);

    menuButtons.forEach((button) => fireEvent.click(button));

    expect(onClickReturn).toHaveBeenCalledTimes(1);
    expect(onClickForward).toHaveBeenCalledTimes(1);
    expect(onClickSettings).toHaveBeenCalledTimes(1);
    expect(onClickHistory).toHaveBeenCalledTimes(1);
    expect(onClickProfile).toHaveBeenCalledTimes(1);
    expect(onClickClose).toHaveBeenCalledTimes(1);
  });
});
