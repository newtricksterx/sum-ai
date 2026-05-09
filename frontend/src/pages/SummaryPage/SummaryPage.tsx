import React, { useCallback, useMemo } from 'react';
import PageCard from '../../components/PageCard/PageCard';
import { sanitizeSummaryHtml } from './sanitizeSummaryHtml';
import { ActionGrid, type ActionId } from './components/ActionGrid/ActionGrid';
import { FlashcardContainer } from './components/Flashcards/FlashcardContainer';
import type { SummaryActionItem } from '../../types/summary';

interface SummaryPageProps {
  content: string | null;
  isSummarySuccess: boolean;
  fontSize: number;
  actionItems: SummaryActionItem[];
  onAddActionItem: (actionId: ActionId) => void;
  onRemoveActionItem: (actionItemId: string) => void;
  loadingActionId?: ActionId | null;
}

const getSummaryPlainText = (html: string) => {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>/g, ' ').trim();
  }

  const container = document.createElement('div');
  container.innerHTML = html;
  return (container.textContent ?? '').trim();
};

const SummaryPage: React.FC<SummaryPageProps> = ({
  content,
  isSummarySuccess,
  fontSize,
  actionItems,
  onAddActionItem,
  onRemoveActionItem,
  loadingActionId = null,
}) => {
  const sanitizedContent = useMemo(() => sanitizeSummaryHtml(content ?? ''), [content]);
  const isActionGridDisabled = useMemo(() => {
    if (content == null) {
      return true;
    }

    if (!isSummarySuccess) {
      return true;
    }

    if (!sanitizedContent.trim()) {
      return true;
    }

    return getSummaryPlainText(sanitizedContent).length === 0;
  }, [content, isSummarySuccess, sanitizedContent]);

  const renderActionItem = useCallback(
    (actionItem: SummaryActionItem) => {
      if (actionItem.type === 'flashcards') {
        const flashcards = actionItem.flashcards ?? [];
        if (flashcards.length === 0) {
          return null;
        }

        return (
          <PageCard key={actionItem.id} className="summary-card mt-4!">
            <FlashcardContainer
              flashcards={flashcards}
              onRemove={() => onRemoveActionItem(actionItem.id)}
            />
          </PageCard>
        );
      }

      return null;
    },
    [onRemoveActionItem],
  );

  return (
    <section className={`summary-shell px-2! py-2!`}>
      <PageCard
        as="article"
        style={{ fontSize: `${fontSize}px` }}
        className="summary-card summary-content summary-container min-h-[210px] h-max"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
      {actionItems.map(renderActionItem)}
      <ActionGrid
        onClickAction={onAddActionItem}
        isDisabled={isActionGridDisabled}
        loadingActionId={loadingActionId}
      />
    </section>
  );
};

export default React.memo(SummaryPage);
