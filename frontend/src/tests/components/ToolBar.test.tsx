/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { copyStateMock } = vi.hoisted(() => ({
  copyStateMock: vi.fn(),
}));

vi.mock("../../utils/states", () => ({
  CopyState: () => copyStateMock(),
}));

import ToolBar from "../../components/ToolBar";

describe("ToolBar", () => {
  beforeEach(() => {
    copyStateMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("disables both copy buttons when CopyState is false", () => {
    copyStateMock.mockReturnValue(false);

    render(<ToolBar onClickCopy={vi.fn()} />);

    const copyButtons = screen.getAllByTitle("Copy summary");
    expect(copyButtons).toHaveLength(2);
    expect((copyButtons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((copyButtons[1] as HTMLButtonElement).disabled).toBe(true);
    expect(copyButtons[0].className).toContain("opacity-50");
    expect(copyButtons[1].className).toContain("opacity-50");
  });

  it("calls copy handler from both buttons when enabled", () => {
    copyStateMock.mockReturnValue(true);
    const onClickCopy = vi.fn();

    render(<ToolBar onClickCopy={onClickCopy} />);

    const copyButtons = screen.getAllByTitle("Copy summary");
    fireEvent.click(copyButtons[0]);
    fireEvent.click(copyButtons[1]);

    expect(onClickCopy).toHaveBeenCalledTimes(2);
  });
});
