/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SummaryPage from "../../pages/SummaryPage/SummaryPage";

afterEach(() => {
  cleanup();
});

describe("SummaryPage sanitization", () => {
  it("strips dangerous tags and event attributes", () => {
    render(
      <SummaryPage
        fontSize={14}
        isSummarySuccess={true}
        content={`<h1>Safe Title</h1><p>Hello</p><script>alert(1)</script><img src="x" onerror="alert(1)" />`}
        actionItems={[]}
        onAddActionItem={() => {}}
        onRemoveActionItem={() => {}}
      />,
    );

    const summaryContainer = document.querySelector(".summary-container");
    expect(summaryContainer).not.toBeNull();
    expect(summaryContainer?.querySelector("script")).toBeNull();
    expect(summaryContainer?.querySelector("img")).toBeNull();
    expect(screen.getByText("Safe Title")).not.toBeNull();
  });

  it("keeps only safe absolute links and enforces secure anchor attributes", () => {
    render(
      <SummaryPage
        fontSize={14}
        isSummarySuccess={true}
        content={`<a href="https://example.com/article">Safe Link</a><a href="javascript:alert(1)">Bad JS Link</a><a href="ftp://example.com/file">Bad FTP Link</a>`}
        actionItems={[]}
        onAddActionItem={() => {}}
        onRemoveActionItem={() => {}}
      />,
    );

    const safeLink = screen.getByRole("link", { name: "Safe Link" });
    expect(safeLink.getAttribute("href")).toBe("https://example.com/article");
    expect(safeLink.getAttribute("target")).toBe("_blank");
    expect(safeLink.getAttribute("rel")).toBe("noopener noreferrer nofollow");

    const jsLink = screen.getByText("Bad JS Link").closest("a");
    expect(jsLink).not.toBeNull();
    expect(jsLink?.getAttribute("href")).toBeNull();
    expect(jsLink?.getAttribute("target")).toBeNull();
    expect(jsLink?.getAttribute("rel")).toBeNull();

    const ftpLink = screen.getByText("Bad FTP Link").closest("a");
    expect(ftpLink).not.toBeNull();
    expect(ftpLink?.getAttribute("href")).toBeNull();
  });
});

describe("SummaryPage action grid state", () => {
  const defaultProps = {
    fontSize: 14,
    isSummarySuccess: true,
    actionItems: [],
    onAddActionItem: () => {},
    onRemoveActionItem: () => {},
  };

  it("hides action grid for empty summary content", () => {
    render(
      <SummaryPage
        {...defaultProps}
        isSummarySuccess={false}
        content=""
      />,
    );

    expect(screen.queryByRole("region", { name: /post-summary actions/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /flashcards/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /quiz/i })).toBeNull();
  });

  it("hides action grid for error summary content", () => {
    render(
      <SummaryPage
        {...defaultProps}
        isSummarySuccess={false}
        content={`<h1>Request failed</h1><p>Try again later.</p>`}
      />,
    );

    expect(screen.queryByRole("region", { name: /post-summary actions/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /flashcards/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /quiz/i })).toBeNull();
  });

  it("enables action buttons for valid summary content", () => {
    render(
      <SummaryPage
        {...defaultProps}
        content={`<h1 class="summary-title">A Valid Summary</h1><p>Helpful details.</p>`}
      />,
    );

    const flashcardsButton = screen.getByRole("button", { name: /flashcards/i });
    const quizButton = screen.getByRole("button", { name: /quiz/i });

    expect(flashcardsButton.hasAttribute("disabled")).toBe(false);
    expect(quizButton.hasAttribute("disabled")).toBe(false);
  });
});

