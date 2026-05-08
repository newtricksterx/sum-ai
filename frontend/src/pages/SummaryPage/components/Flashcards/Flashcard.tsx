import { HandIcon } from '@radix-ui/react-icons';
import { useCallback, useState, type KeyboardEvent } from 'react';
import './Flashcard.css';

export interface FlashcardItem {
  question: string;
  answer: string;
}

interface FlashcardProps {
  question: string;
  answer: string;
}

export const Flashcard = ({ question, answer }: FlashcardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = useCallback(() => {
    setIsFlipped((previous) => !previous);
  }, []);

  const handleOnKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleFlip();
      }
    },
    [handleFlip],
  );

  return (
    <article className="summary-flashcard" aria-label="Flashcard viewer">
      <div
        className="fc-scene"
        id="fc-scene"
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Answer revealed. Tap to flip back.' : 'Flashcard. Tap to reveal answer.'}
        onClick={handleFlip}
        onKeyDown={handleOnKeyDown}
      >
        <div className={`fc-inner ${isFlipped ? 'flipped' : ''}`} id="fc-inner">
          <div className="fc-face fc-front" aria-hidden={isFlipped}>
            <span className="fc-face-tag">Question</span>
            <p className="fc-q">{question}</p>
            <span className="fc-tap-hint" aria-hidden={isFlipped}>
              <HandIcon width={13} height={13} />
              Tap for answer
            </span>
          </div>
          <div className="fc-face fc-back-face" aria-hidden={!isFlipped}>
            <span className="fc-face-tag">Answer</span>
            <p className="fc-a">{answer}</p>
          </div>
        </div>
      </div>
    </article>
  );
};
