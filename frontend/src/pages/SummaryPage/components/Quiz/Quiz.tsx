import { useEffect, useMemo, useState } from "react";
import { Cross2Icon, TriangleLeftIcon, TriangleRightIcon, ExitIcon, CheckIcon } from "@radix-ui/react-icons";
import AlertPopup from "../../../../components/AlertPopup/AlertPopup";
import type { SummaryBlock, SummaryDocument } from "../../utils/types";
import { renderInlineSegment } from "../../utils/renderInline";
import "./Quiz.css";

interface QuizProps {
    document: SummaryDocument;
    onClose?: () => void;
}

const createInitialAnswers = (length: number): Array<number | null> => {
  return Array.from({ length }, () => null);
};

const findCorrectIndex = (block: SummaryBlock): number => {
  const options = block.options ?? [];
  const correctIndex = options.findIndex((option) => option.correct);
  return correctIndex;
};

export const Quiz = ({ document, onClose } : QuizProps) => {
  const questionBlocks = useMemo(
    () => document.blocks.filter((block) => block.type === "question"),
    [document.blocks],
  );
  const totalQuestions = questionBlocks.length;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => createInitialAnswers(totalQuestions));
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const currentQuestion = questionBlocks[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers(createInitialAnswers(totalQuestions));
    setSelectedOptionIndex(null);
    setIsAnswered(false);
  }, [questionBlocks, totalQuestions]);

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers(createInitialAnswers(totalQuestions));
    setSelectedOptionIndex(null);
    setIsAnswered(false);
  };

  if (totalQuestions === 0 || !currentQuestion) {
    return null;
  }

  const currentOptions = currentQuestion.options ?? [];
  const currentCorrectIndex = findCorrectIndex(currentQuestion);

  const handleSelectOption = (optionIndex: number) => {
    if (isAnswered) {
      return;
    }

    const nextAnswers = [...answers];
    nextAnswers[currentQuestionIndex] = optionIndex;

    setAnswers(nextAnswers);
    setSelectedOptionIndex(optionIndex);
    setIsAnswered(true);
  };

  const handleNext = () => {
    if (selectedOptionIndex === null || !isAnswered) {
      return;
    }

    if (isLastQuestion) {
      resetQuiz();
      return;
    }

    const nextQuestionIndex = currentQuestionIndex + 1;
    const nextAnswer = answers[nextQuestionIndex];
    setCurrentQuestionIndex(nextQuestionIndex);
    setSelectedOptionIndex(nextAnswer);
    setIsAnswered(nextAnswer !== null);
  };

  const handlePrevious = () => {
    if (isFirstQuestion) {
      return;
    }

    const previousQuestionIndex = currentQuestionIndex - 1;
    const previousAnswer = answers[previousQuestionIndex];
    setCurrentQuestionIndex(previousQuestionIndex);
    setSelectedOptionIndex(previousAnswer);
    setIsAnswered(previousAnswer !== null);
  };

  const getDotClassName = (index: number) => {
    const answeredOption = answers[index];
    if (answeredOption !== null) {
      const wasCorrect = answeredOption === findCorrectIndex(questionBlocks[index]);
      return `qz-dot ${wasCorrect ? "correct" : "wrong"}`;
    }

    if (index === currentQuestionIndex) {
      return "qz-dot active";
    }

    return "qz-dot";
  };

  const isSelectedCorrect = selectedOptionIndex === currentCorrectIndex;

  return (
    <section>
        <header className="qz-title">
            {document.title || "Quiz"}
        </header>
        <div className="qz-content" aria-label="Summary quiz">
            <div id="qz-screen">
                <div className="qz-dots" aria-hidden="true">
                {questionBlocks.map((_block, index) => (
                    <span key={index} className={getDotClassName(index)} />
                ))}
                </div>

                <div className="qz-body">
                    <header className="qz-header">
                        <p className="qz-qnum">{`Question ${currentQuestionIndex + 1}`}</p>
                        <AlertPopup
                            trigger={
                                <button
                                    type="button"
                                    className="qz-close"
                                    aria-label="Close quiz"
                                >
                                    <Cross2Icon className="qz-close-icon" aria-hidden="true" />
                                    <span>Close</span>
                                </button>
                            }
                            title="Close quiz?"
                            description="This quiz action item will be removed from the summary page."
                            onConfirm={() => onClose?.()}
                            confirmLabel="Close"
                            cancelLabel="Cancel"
                        />
                    </header>

                <p className="qz-q rich-inline">{(currentQuestion.question ?? []).map(renderInlineSegment)}</p>

                <div className="qz-opts" role="group" aria-label="Answer options">
                    {currentOptions.map((option, optionIndex) => {
                    const keyLabel = option.key || String.fromCharCode(65 + optionIndex);

                    let statusClass = "";
                    if (isAnswered) {
                        if (optionIndex === currentCorrectIndex && optionIndex === selectedOptionIndex) {
                        statusClass = "s-correct";
                        } else if (optionIndex === selectedOptionIndex) {
                        statusClass = "s-wrong";
                        } else if (optionIndex === currentCorrectIndex) {
                        statusClass = "r-correct";
                        } else {
                        statusClass = "dimmed";
                        }
                    }

                    return (
                        <button
                        key={`${currentQuestionIndex}-${optionIndex}`}
                        type="button"
                        className={`qz-opt ${statusClass} ${isAnswered ? "answered" : ""}`.trim()}
                        onClick={() => handleSelectOption(optionIndex)}
                        aria-label={`Option ${keyLabel}`}
                        >
                        <span className="qz-key" aria-hidden="true">
                            {keyLabel}
                        </span>
                        <span className="qz-opt-txt rich-inline">{option.children.map(renderInlineSegment)}</span>
                        </button>
                    );
                    })}
                </div>

                {isAnswered && (
                    <div className={`qz-exp rich-inline ${isSelectedCorrect ? "" : "wrong"}`.trim()} role="status" aria-live="polite">
                    {(currentQuestion.explanation ?? []).map(renderInlineSegment)}
                    </div>
                )}
                </div>

                <footer className="qz-foot">
                    <span className="qz-hint" aria-hidden="true">
                        {isAnswered ? (isSelectedCorrect ?
                            <div className="qz-correct">
                                <CheckIcon />
                                Well Done!
                            </div> :
                            <div className="qz-incorrect">
                                <Cross2Icon />
                                Review Above
                            </div>)
                        : "Select an Answer"}
                    </span>
                    <div className="qz-btn-ctrl">
                        <button
                            type="button"
                            className="qz-prev"
                            disabled={isFirstQuestion}
                            aria-label="Previous question"
                            onClick={handlePrevious}
                        >
                            <TriangleLeftIcon width={13} height={13}/>
                        </button>
                        <button
                                type="button"
                                className="qz-next"
                                disabled={!isAnswered}
                                aria-label={isLastQuestion ? "Finish quiz" : "Next question"}
                                onClick={handleNext}
                            >
                            {isLastQuestion ? <ExitIcon width={13} height={13}/> : <TriangleRightIcon width={13} height={13}/>}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    </section>
    );
};
