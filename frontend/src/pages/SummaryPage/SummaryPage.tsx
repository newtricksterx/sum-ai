import React, { useCallback } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import PageCard from '../../components/PageCard/PageCard';
import AlertPopup from '../../components/AlertPopup/AlertPopup';
import { ActionGrid } from './components/ActionGrid/ActionGrid';
import { FlashcardContainer } from './components/Flashcards/FlashcardContainer';
import { Quiz } from './components/Quiz/Quiz';
import type { SummaryActionItem } from '../../types/summary';
import type { SummaryDocument } from "./utils/types";
import { renderInlineSegment } from "./utils/renderInline";
import { ActionId } from '../../types/summary';
import { useCurrentSessionState } from '../../stores/sessionStorage';
import { useActiveTabUrl } from './useActiveTabUrl';
import { SessionMismatch } from './components/SessionMismatch/SessionMismatch';

interface SummaryPageProps {
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


const SummaryPage: React.FC<SummaryPageProps> = ({
  fontSize,
  actionItems,
  onAddActionItem,
  onRemoveActionItem,
  loadingActionId = null,
}) => {
  const sessionUrl = useCurrentSessionState((state) => state.url);
  const activeTabUrl = useActiveTabUrl();
  // While activeTabUrl is still resolving we treat it as "on session" to avoid flicker;
  // the return link only renders once we have both URLs and they differ.
  const shouldShowReturnLink =
    Boolean(sessionUrl) && activeTabUrl !== undefined && sessionUrl !== activeTabUrl;


  const renderActionItem = useCallback((actionItem: SummaryActionItem) => {
        if (actionItem.document.blocks.length === 0) {
            return null;
        }

        if (actionItem.document.format === "error") {
            return (
              <div key={actionItem.id} className='mb-4!'>
                <div className='flex flex-row justify-end'>
                  <AlertPopup
                        trigger={
                            <button
                                type="button"
                                className="qz-close"
                                aria-label="Close error"
                            >
                                <Cross2Icon className="qz-close-icon" aria-hidden="true" />
                                <span>Close</span>
                            </button>
                        }
                        title="Close message?"
                        description="This message will be removed from the summary page."
                        onConfirm={() => onRemoveActionItem(actionItem.id)}
                        confirmLabel="Close"
                        cancelLabel="Cancel"
                    />
                  </div>
                <PageCard
                    as="article"
                    style={{ fontSize: `${fontSize}px` }}
                    className="summary-card summary-content summary-container relative"
                >
                    <SummaryDocumentView document={actionItem.document} />
                </PageCard>
              </div>
            );
        }

        if (actionItem.type === 'flashcards') {
            return (
              <div key={actionItem.id} className='mb-4!'>
                <div className='flex flex-row justify-end'>
                  <AlertPopup
                        trigger={
                            <button
                                type="button"
                                className="qz-close"
                                aria-label="Close flashcard"
                            >
                                <Cross2Icon className="qz-close-icon" aria-hidden="true" />
                                <span>Close</span>
                            </button>
                        }
                        title="Close flashcard?"
                        description="This flashcard will be removed from the page."
                        onConfirm={() => onRemoveActionItem(actionItem.id)}
                        confirmLabel="Close"
                        cancelLabel="Cancel"
                    />
                  </div>
                <PageCard key={actionItem.id} className="summary-card">
                    <FlashcardContainer
                    document={actionItem.document}
                    />
                </PageCard>
              </div>
            );
        }

        if (actionItem.type === 'quiz') {
            return (
              <div key={actionItem.id} className='mb-4!'>
                <div className='flex flex-row justify-end'>
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
                        title="Close flashcard?"
                        description="This quiz will be removed from the page."
                        onConfirm={() => onRemoveActionItem(actionItem.id)}
                        confirmLabel="Close"
                        cancelLabel="Cancel"
                    />
                  </div>
                <PageCard key={actionItem.id} className="summary-card">
                    <Quiz
                      document={actionItem.document}
                    />
                </PageCard>
              </div>
            );
        }

        if (actionItem.type === 'summary') {
            return (
              <div key={actionItem.id} className='mb-4!'>
                <div className='flex flex-row justify-end'>
                  <AlertPopup
                        trigger={
                            <button
                                type="button"
                                className="qz-close"
                                aria-label="Close summary"
                            >
                                <Cross2Icon className="qz-close-icon" aria-hidden="true" />
                                <span>Close</span>
                            </button>
                        }
                        title="Close summary?"
                        description="This summary action item will be removed from the summary page."
                        onConfirm={() => onRemoveActionItem(actionItem.id)}
                        confirmLabel="Close"
                        cancelLabel="Cancel"
                    />
                  </div>
                <PageCard
                    as="article"
                    style={{ fontSize: `${fontSize}px` }}
                    className="summary-card summary-content summary-container relative"
                >
                    <SummaryDocumentView document={actionItem.document} />
                </PageCard>
              </div>
            );
        }

        return null;
    },
    [fontSize, onRemoveActionItem],
  );

  return (

    
    <section className={`summary-shell px-2! py-2!`}>
      {actionItems.map(renderActionItem)}
      { true ? (
        <SessionMismatch sessionUrl={sessionUrl} />
      ) : (
        <ActionGrid
          onClickAction={onAddActionItem}
          isDisabled={false}
          loadingActionId={loadingActionId}
        />
      )}
    </section>
  );
};

export default React.memo(SummaryPage);
