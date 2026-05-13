import React, { useCallback, useMemo } from 'react';
import PageCard from '../../components/PageCard/PageCard';
import { ActionGrid, type ActionId } from './components/ActionGrid/ActionGrid';
import { FlashcardContainer } from './components/Flashcards/FlashcardContainer';
import { Quiz } from './components/Quiz/Quiz';
import type { SummaryActionItem } from '../../types/summary';
import type { SummaryDocument } from "./utils/types";
import { renderInlineSegment } from "./utils/renderInline";

interface SummaryPageProps {
  content: SummaryDocument | null;
  isSummarySuccess: boolean;
  fontSize: number;
  actionItems: SummaryActionItem[];
  onAddActionItem: (actionId: ActionId) => void;
  onRemoveActionItem: (actionItemId: string) => void;
  loadingActionId?: ActionId | null;
}

const renderDocumentBody = (document: SummaryDocument) => {

  if (document.format === "error") {
    return (
      <div className="summary-error" role="alert">
        {document.blocks.map((block, blockIndex) => (
          <p key={blockIndex}>{block.children.map(renderInlineSegment)}</p>
        ))}
      </div>
    );
  }

  if(document.format == "bullet-point"){
    return (
      <ul>
        {document.blocks.map((block, blockIndex) => (
          <li key={blockIndex}>
            {block.children.map(renderInlineSegment)}
          </li>
        ))}
      </ul>
    )
  }

  if (document.format == "paragraph"){
    return (
      <section>
        {document.blocks.map((block, blockIndex) => {
          if (block.type === "heading") {
            return <h3 key={blockIndex}>{block.children.map(renderInlineSegment)}</h3>;
          }
          return (
            <p key={blockIndex}>
              {block.children.map(renderInlineSegment)}
            </p>
          );
        })}
      </section>
    )
  }

  if (document.format == "tl-dr"){
    return (
      <section>
        <h3>tl;dr: </h3>
          {document.blocks.map((block, blockIndex) => {
            return (
              <p key={blockIndex}>{block.children.map(renderInlineSegment)}</p>
            )
          })}

      </section>
    )
  }

  if (document.format == "q-and-a"){
    return (
      <section>
        {document.blocks.map((block, blockIndex) => (
          <div key={blockIndex}>
            <p><strong>Q: </strong>{(block.question ?? []).map(renderInlineSegment)}</p>
            <p><strong>A: </strong>{(block.answer ?? []).map(renderInlineSegment)}</p>
          </div>
        ))}
      </section>
    )
  }

  if (document.format == "pros-cons"){
    const pros = document.blocks.filter((block) => block.type === "pro");
    const cons = document.blocks.filter((block) => block.type === "con");
    return (
      <section>
        <h3>Pros</h3>
        <ul>
          {pros.map((block, i) => (
            <li key={`pro-${i}`}>{block.children.map(renderInlineSegment)}</li>
          ))}
        </ul>
        <h3>Cons</h3>
        <ul>
          {cons.map((block, i) => (
            <li key={`con-${i}`}>{block.children.map(renderInlineSegment)}</li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <div></div>
  )

}

const SummaryDocumentView: React.FC<{ document: SummaryDocument }> = ({ document }) => {
  if (document.blocks.length === 0) {
    return null;
  }
  return (
    <div>
      <h1 className='summary-title'>{document.title}</h1>
      {renderDocumentBody(document)}
    </div>
  );
};

const isDocumentEmpty = (document: SummaryDocument): boolean =>
  document.blocks.every((block) =>
    block.children.every((child) => child.text.trim().length === 0),
  );

const SummaryPage: React.FC<SummaryPageProps> = ({
  content,
  isSummarySuccess,
  fontSize,
  actionItems,
  onAddActionItem,
  onRemoveActionItem,
  loadingActionId = null,
}) => {

  const isActionGridDisabled = useMemo(() => {
    if (content == null || !isSummarySuccess) {
      return true;
    }
    return isDocumentEmpty(content);
  }, [content, isSummarySuccess]);

  const renderActionItem = useCallback((actionItem: SummaryActionItem) => {
        if (actionItem.document.blocks.length === 0) {
            return null;
        }

        if (actionItem.type === 'flashcards') {
            return (
            <PageCard key={actionItem.id} className="summary-card mt-4!">
                <FlashcardContainer
                document={actionItem.document}
                onRemove={() => onRemoveActionItem(actionItem.id)}
                />
            </PageCard>
            );
        }

        if (actionItem.type === 'quiz') {
            return (
            <PageCard key={actionItem.id} className="summary-card mt-4!">
                <Quiz
                document={actionItem.document}
                onClose={() => onRemoveActionItem(actionItem.id)}
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
        >
          {content !== null && <SummaryDocumentView document={content} />}
        </PageCard>
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
