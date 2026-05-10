import { useEffect, useState } from "react";
import { Cross2Icon, TriangleLeftIcon, TriangleRightIcon, ExitIcon, CheckIcon } from "@radix-ui/react-icons";
import AlertPopup from "../../../../components/AlertPopup/AlertPopup";
import type { SummaryQuizItem } from "../../../../types/summary";
import "./Quiz.css";

interface QuizProps {
    questions: SummaryQuizItem[]
    onClose?: () => void
}

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

const createInitialAnswers = (length: number): Array<number | null> => {
  return Array.from({ length }, () => null);
};

export const Quiz = ({ questions, onClose } : QuizProps) => {
  const totalQuestions = questions.length;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => createInitialAnswers(totalQuestions));
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers(createInitialAnswers(totalQuestions));
    setSelectedOptionIndex(null);
    setIsAnswered(false);
  }, [questions, totalQuestions]);

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers(createInitialAnswers(totalQuestions));
    setSelectedOptionIndex(null);
    setIsAnswered(false);
  };

  if (totalQuestions === 0 || !currentQuestion) {
    return null;
  }

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
      const wasCorrect = answeredOption === questions[index].correctIndex;
      return `qz-dot ${wasCorrect ? "correct" : "wrong"}`;
    }

    if (index === currentQuestionIndex) {
      return "qz-dot active";
    }

    return "qz-dot";
  };

  const isSelectedCorrect = selectedOptionIndex === currentQuestion.correctIndex;

  return (
    <section>
        <header className="qz-title">
            Quiz
        </header>
        <div className="qz-content" aria-label="Summary quiz">
            <div id="qz-screen">
                <div className="qz-dots" aria-hidden="true">
                {questions.map((question, index) => (
                    <span key={`${question.prompt}-${index}`} className={getDotClassName(index)} />
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
                
                <p className="qz-q">{currentQuestion.prompt}</p>

                <div className="qz-opts" role="group" aria-label="Answer options">
                    {currentQuestion.options.map((option, optionIndex) => {
                    const keyLabel = OPTION_KEYS[optionIndex] ?? String(optionIndex + 1);

                    let statusClass = "";
                    if (isAnswered) {
                        if (optionIndex === currentQuestion.correctIndex && optionIndex === selectedOptionIndex) {
                        statusClass = "s-correct";
                        } else if (optionIndex === selectedOptionIndex) {
                        statusClass = "s-wrong";
                        } else if (optionIndex === currentQuestion.correctIndex) {
                        statusClass = "r-correct";
                        } else {
                        statusClass = "dimmed";
                        }
                    }

                    return (
                        <button
                        key={`${currentQuestion.prompt}-${option}`}
                        type="button"
                        className={`qz-opt ${statusClass} ${isAnswered ? "answered" : ""}`.trim()}
                        onClick={() => handleSelectOption(optionIndex)}
                        aria-label={`Option ${keyLabel}: ${option}`}
                        >
                        <span className="qz-key" aria-hidden="true">
                            {keyLabel}
                        </span>
                        <span className="qz-opt-txt">{option}</span>
                        </button>
                    );
                    })}
                </div>

                {isAnswered && (
                    <div className={`qz-exp ${isSelectedCorrect ? "" : "wrong"}`.trim()} role="status" aria-live="polite">
                    {currentQuestion.explanation}
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
