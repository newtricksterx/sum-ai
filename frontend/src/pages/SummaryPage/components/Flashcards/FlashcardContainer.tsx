import { CaretLeftIcon, CaretRightIcon } from "@radix-ui/react-icons";
import { Flashcard } from "./Flashcard";
import './FlashcardContainer.css'
import { FlashcardItem } from "./Flashcard";
import { useCallback, useState } from "react";
import { Trash2Icon } from "lucide-react";
import AlertPopup from "../../../../components/AlertPopup/AlertPopup";

interface FlashcardProps {
  flashcards: FlashcardItem[];
  onRemove: () => void;
}

export const FlashcardContainer = ({ flashcards, onRemove }: FlashcardProps) => {
    const [index, setIndex] = useState(0)
    const flashcardsLength = flashcards.length

    const onClickLeft = useCallback(() => {
        if (index >= 1){
            setIndex(prevIndex => prevIndex - 1)
        }
    }, [index])

    const onClickRight = useCallback(() => {
        if (index < flashcardsLength - 1){
            setIndex(prevIndex => prevIndex + 1)
        }

    }, [index, flashcardsLength])

    return (
        <section>
            <header className="fc-title">
                Flashcards
                <div className="fc-pagination">
                    {index + 1} / {flashcardsLength}
                </div>
            </header>
            <div className="fc-list">

                <Flashcard
                    key={index}
                    question={flashcards[index].question}
                    answer={flashcards[index].answer}
                />

                <footer className="fc-controls">
                    <div>
                        <button className="fc-button" onClick={onClickLeft} disabled={index === 0}>
                            <CaretLeftIcon/>
                        </button>
                        <button className="fc-button" onClick={onClickRight} disabled={index === flashcardsLength - 1}>
                            <CaretRightIcon />
                        </button>
                    </div>
                    <AlertPopup
                        trigger={
                            <button type="button" className="fc-remove-button">
                                <Trash2Icon width={13} height={13}/>
                            </button>
                        }
                        title="Remove flashcard set?"
                        description="This flashcard action item will be removed from the summary page."
                        onConfirm={onRemove}
                        confirmLabel="Remove"
                        cancelLabel="Cancel"
                    />
                </footer>
            </div>
        </section>

    );
}
