import { CaretLeftIcon, CaretRightIcon } from "@radix-ui/react-icons";
import { Flashcard } from "./Flashcard";
import './FlashcardContainer.css'
import { FlashcardItem } from "./Flashcard";
import { useCallback, useState } from "react";

interface FlashcardProps {
  flashcards: FlashcardItem[]
}

export const FlashcardContainer = ( { flashcards } : FlashcardProps) => {
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

                <div>
                    <button className="fc-button" onClick={onClickLeft} disabled={index === 0}>
                        <CaretLeftIcon/>
                    </button>
                    <button className="fc-button" onClick={onClickRight} disabled={index === flashcardsLength - 1}>
                        <CaretRightIcon />
                    </button>
                </div>

            </div>
        </section>

    );
}
