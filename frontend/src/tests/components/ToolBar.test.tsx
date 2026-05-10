/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ToolBar from "../../components/ToolBar/ToolBar";

describe("ToolBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("disables download and copy buttons when summary actions are not enabled", () => {
    render(
      <ToolBar
        onClickCopy={vi.fn()}
        onClickDownload={vi.fn()}
        canUseSummaryActions={false}
      />,
    );

    const downloadButton = screen.getByTitle("Download summary as PDF");
    const copyButton = screen.getByTitle("Copy summary");
    expect((downloadButton as HTMLButtonElement).disabled).toBe(true);
    expect((copyButton as HTMLButtonElement).disabled).toBe(true);
    expect(downloadButton.className).toContain("opacity-50");
    expect(copyButton.className).toContain("opacity-50");
  });

  it("disables download and copy buttons while summarizing", () => {
    render(<ToolBar onClickCopy={vi.fn()} onClickDownload={vi.fn()} isSummarizing={true} />);

    const downloadButton = screen.getByTitle("Download summary as PDF");
    const copyButton = screen.getByTitle("Copy summary");
    expect((downloadButton as HTMLButtonElement).disabled).toBe(true);
    expect((copyButton as HTMLButtonElement).disabled).toBe(true);
    expect(downloadButton.className).toContain("opacity-50");
    expect(copyButton.className).toContain("opacity-50");
  });

  it("calls download and copy handlers when enabled", () => {
    const onClickCopy = vi.fn();
    const onClickDownload = vi.fn();

    render(<ToolBar onClickCopy={onClickCopy} onClickDownload={onClickDownload} />);

    fireEvent.click(screen.getByTitle("Download summary as PDF"));
    fireEvent.click(screen.getByTitle("Copy summary"));

    expect(onClickDownload).toHaveBeenCalledTimes(1);
    expect(onClickCopy).toHaveBeenCalledTimes(1);
  });

  it("disables only generate button when action item is loading", () => {
    render(
      <ToolBar
        onClickCopy={vi.fn()}
        onClickDownload={vi.fn()}
        isGenerateDisabled={true}
      />,
    );

    const generateButton = screen.getByTitle("Generate a new summary for the current tab");
    const downloadButton = screen.getByTitle("Download summary as PDF");
    const copyButton = screen.getByTitle("Copy summary");

    expect((generateButton as HTMLButtonElement).disabled).toBe(true);
    expect((downloadButton as HTMLButtonElement).disabled).toBe(false);
    expect((copyButton as HTMLButtonElement).disabled).toBe(false);
  });
});
