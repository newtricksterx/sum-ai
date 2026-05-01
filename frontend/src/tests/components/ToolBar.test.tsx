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

  it("disables download and copy buttons when CopyState is false", () => {
    copyStateMock.mockReturnValue(false);

    render(<ToolBar onClickCopy={vi.fn()} onClickDownload={vi.fn()} />);

    const downloadButton = screen.getByTitle("Download summary as PDF");
    const copyButton = screen.getByTitle("Copy summary");
    expect((downloadButton as HTMLButtonElement).disabled).toBe(true);
    expect((copyButton as HTMLButtonElement).disabled).toBe(true);
    expect(downloadButton.className).toContain("opacity-50");
    expect(copyButton.className).toContain("opacity-50");
  });

  it("disables download and copy buttons while summarizing", () => {
    copyStateMock.mockReturnValue(true);

    render(<ToolBar onClickCopy={vi.fn()} onClickDownload={vi.fn()} isSummarizing={true} />);

    const downloadButton = screen.getByTitle("Download summary as PDF");
    const copyButton = screen.getByTitle("Copy summary");
    expect((downloadButton as HTMLButtonElement).disabled).toBe(true);
    expect((copyButton as HTMLButtonElement).disabled).toBe(true);
    expect(downloadButton.className).toContain("opacity-50");
    expect(copyButton.className).toContain("opacity-50");
  });

  it("calls download and copy handlers when enabled", () => {
    copyStateMock.mockReturnValue(true);
    const onClickCopy = vi.fn();
    const onClickDownload = vi.fn();

    render(<ToolBar onClickCopy={onClickCopy} onClickDownload={onClickDownload} />);

    fireEvent.click(screen.getByTitle("Download summary as PDF"));
    fireEvent.click(screen.getByTitle("Copy summary"));

    expect(onClickDownload).toHaveBeenCalledTimes(1);
    expect(onClickCopy).toHaveBeenCalledTimes(1);
  });
});
