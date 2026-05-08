import React, { useMemo, useState } from 'react';
import PageCard from '../../components/PageCard/PageCard';
import { sanitizeSummaryHtml } from './sanitizeSummaryHtml';
import { useSettingsStore } from '../../stores/settingsStore';
import { ActionGrid } from './components/ActionGrid/ActionGrid';
import { FlashcardContainer } from './components/Flashcards/FlashcardContainer'
import type { FlashcardItem } from './components/Flashcards/Flashcard';

interface SummaryPageProps {
  content: string;
  fontSize: number;
}

type ActionItems = "flashcards" | "quiz"


const SummaryPage: React.FC<SummaryPageProps> = ({ content, fontSize }) => {
    const [enableActionCard, SetEnableActionCard] = useState(false)
    const sanitizedContent = useMemo(() => sanitizeSummaryHtml(content ?? ""), [content]);
    const theme = useSettingsStore((state) => state.theme);
    const summaryThemeClass = theme === "dark" ? "theme-dark" : "theme-light";
    const mockFlashcards = useMemo<FlashcardItem[]>(
      () => [
        {
          question: "What is the core idea of this summary?",
          answer: "It condenses the source into key takeaways so you can review quickly.",
        },
        {
          question: "What does the summary keep from the original content?",
          answer: "It keeps the main arguments, evidence, and practical insights.",
        },
        {
          question: "How should you use this summary next?",
          answer: "Use it to decide what to read deeply and what to skim.",
        },
      ],
      [],
    );

    const handleActionClick = () => {
        SetEnableActionCard(!enableActionCard)

        // TODO
    }

    return (
        <section className={`summary-shell ${summaryThemeClass} px-2! py-2!`}>
            <PageCard
                as="article"
                style={{ fontSize: `${fontSize}px` }}
                className="summary-card summary-content summary-container min-h-[210px] h-max"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
            {
                enableActionCard ? (
                  <PageCard className="summary-card">
                    <FlashcardContainer flashcards={mockFlashcards} />
                  </PageCard>
                ) : <></>
            }
            <ActionGrid onClickAction={handleActionClick}/>
        </section>


    );
};

export default React.memo(SummaryPage);
