import { CaretLeftIcon, CaretRightIcon } from "@radix-ui/react-icons";
import { Flashcard } from "./Flashcard";
import './FlashcardContainer.css'
import { useCallback, useMemo, useState } from "react";
import type { SummaryDocument } from "../../utils/types";

interface FlashcardContainerProps {
  document: SummaryDocument;
}

export const FlashcardContainer = ({ document }: FlashcardContainerProps) => {
    const flashcardBlocks = useMemo(
        () => document.blocks.filter((block) => block.type === "flashcard"),
        [document.blocks],
    );
    const [index, setIndex] = useState(0)
    const flashcardsLength = flashcardBlocks.length

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

    if (flashcardsLength === 0) {
        return null;
    }

    const currentBlock = flashcardBlocks[Math.min(index, flashcardsLength - 1)];

    return (
        <section>
            <header className="fc-title">
                {document.title || "Flashcards"}
                <div className="fc-pagination">
                    {index + 1} / {flashcardsLength}
                </div>
            </header>
            <div className="fc-list">

                <Flashcard
                    key={index}
                    front={currentBlock.front ?? []}
                    back={currentBlock.back ?? []}
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
                </footer>
            </div>
        </section>

    );
}
