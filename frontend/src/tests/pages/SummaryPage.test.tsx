/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SummaryPage from "../../pages/SummaryPage/SummaryPage";
import type { SummaryDocument } from "../../pages/SummaryPage/utils/types";

afterEach(() => {
  cleanup();
});

const validSummary: SummaryDocument = {
  title: "A Valid Summary",
  format: "paragraph",
  blocks: [
    { type: "paragraph", children: [{ text: "Helpful details." }] },
  ],
};

const errorSummary: SummaryDocument = {
  title: "Request failed",
  format: "error",
  blocks: [
    { type: "paragraph", children: [{ text: "Try again later." }] },
  ],
};

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
        content={null}
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
        content={errorSummary}
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
        content={validSummary}
      />,
    );

    const flashcardsButton = screen.getByRole("button", { name: /flashcards/i });
    const quizButton = screen.getByRole("button", { name: /quiz/i });

    expect(flashcardsButton.hasAttribute("disabled")).toBe(false);
    expect(quizButton.hasAttribute("disabled")).toBe(false);
  });

  it("renders flashcards returned from action items", () => {
    render(
      <SummaryPage
        {...defaultProps}
        content={validSummary}
        actionItems={[
          {
            id: "flashcards-1",
            type: "flashcards",
            flashcards: [
              { question: "Flashcard Question", answer: "Flashcard Answer" },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("Flashcard Question")).not.toBeNull();
  });

  it("renders quiz screen UI for quiz action items", () => {
    render(
      <SummaryPage
        {...defaultProps}
        content={validSummary}
        actionItems={[
          {
            id: "quiz-1",
            type: "quiz",
            quiz: [
              {
                prompt: "What is the main point?",
                options: ["Point A", "Point B", "Point C", "Point D"],
                correctIndex: 1,
                explanation: "Point B is supported by the summary.",
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByLabelText("Summary quiz")).not.toBeNull();
    expect(screen.getByText("Question 1")).not.toBeNull();
    expect(screen.getByRole("button", { name: /next question|finish quiz/i })).not.toBeNull();
    const previousButton = screen.getByRole("button", { name: /previous question/i });
    expect(previousButton.hasAttribute("disabled")).toBe(true);
  });

  it("disables action buttons and shows loader while action content is generating", () => {
    const { container } = render(
      <SummaryPage
        {...defaultProps}
        content={validSummary}
        loadingActionId="flashcards"
      />,
    );

    const flashcardsButton = screen.getByRole("button", { name: /flashcards/i });
    const quizButton = screen.getByRole("button", { name: /quiz/i });

    expect(flashcardsButton.hasAttribute("disabled")).toBe(true);
    expect(quizButton.hasAttribute("disabled")).toBe(true);
    expect(container.querySelector(".summary-action-loader #loader")).not.toBeNull();
  });
});
