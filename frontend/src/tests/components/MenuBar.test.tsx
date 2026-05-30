/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MenuBar from "../../components/MenuBar/MenuBar";

describe("MenuBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders six buttons and routes nav clicks through onMenuClick", () => {
    const onMenuClick = vi.fn();
    const onClickClose = vi.fn();

    render(<MenuBar currentPage="home" onMenuClick={onMenuClick} onClickClose={onClickClose} />);

    const menuButtons = screen.getAllByRole("button");
    expect(menuButtons).toHaveLength(6);

    // Order is defined by MENU_ITEMS in MenuBar.tsx; the close button is last.
    const expectedPages = ["home", "session", "history", "settings", "profile"] as const;

    menuButtons.slice(0, 5).forEach((button, index) => {
      fireEvent.click(button);
      expect(onMenuClick).toHaveBeenNthCalledWith(index + 1, expectedPages[index]);
    });
    expect(onMenuClick).toHaveBeenCalledTimes(5);
    expect(onClickClose).not.toHaveBeenCalled();

    fireEvent.click(menuButtons[5]);
    expect(onClickClose).toHaveBeenCalledTimes(1);
    expect(onMenuClick).toHaveBeenCalledTimes(5);
  });
});
