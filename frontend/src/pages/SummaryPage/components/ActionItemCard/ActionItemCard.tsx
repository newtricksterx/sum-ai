import React, { type ReactNode } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import PageCard from '../../../../components/PageCard/PageCard';
import AlertPopup from '../../../../components/AlertPopup/AlertPopup';
import type { SummaryActionItem, ActionId } from '../../../../types/summary';
import type { SummaryDocument } from '../../utils/types';
import { renderInlineSegment } from '../../utils/renderInline';
import { FlashcardContainer } from '../Flashcards/FlashcardContainer';
import { Quiz } from '../Quiz/Quiz';

type CloseMeta = { ariaLabel: string; title: string; description: string };

const CLOSE_META: Record<'error' | ActionId, CloseMeta> = {
  error: {
    ariaLabel: 'Close error',
    title: 'Close message?',
    description: 'This message will be removed from the summary page.',
  },
  flashcards: {
    ariaLabel: 'Close flashcard',
    title: 'Close flashcard?',
    description: 'This flashcard will be removed from the page.',
  },
  quiz: {
    ariaLabel: 'Close quiz',
    title: 'Close quiz?',
    description: 'This quiz will be removed from the page.',
  },
  summary: {
    ariaLabel: 'Close summary',
    title: 'Close summary?',
    description: 'This summary action item will be removed from the summary page.',
  }, 
};

const renderError = (document: SummaryDocument): ReactNode => (
  <div className="summary-error" role="alert">
    {document.blocks.map((block, i) => (
      <p key={i}>{block.children.map(renderInlineSegment)}</p>
    ))}
  </div>
);

const renderBulletPoint = (document: SummaryDocument): ReactNode => (
  <ul>
    {document.blocks.map((block, i) => (
      <li key={i}>{block.children.map(renderInlineSegment)}</li>
    ))}
  </ul>
);

const renderParagraph = (document: SummaryDocument): ReactNode => (
  <section>
    {document.blocks.map((block, i) => {
      if (block.type === 'heading') {
        return <h3 key={i}>{block.children.map(renderInlineSegment)}</h3>;
      }
      return <p key={i}>{block.children.map(renderInlineSegment)}</p>;
    })}
  </section>
);

const renderTldr = (document: SummaryDocument): ReactNode => (
  <section>
    <h3>tl;dr: </h3>
    {document.blocks.map((block, i) => (
      <p key={i}>{block.children.map(renderInlineSegment)}</p>
    ))}
  </section>
);

const renderQandA = (document: SummaryDocument): ReactNode => (
  <section>
    {document.blocks.map((block, i) => (
      <div key={i}>
        <p><strong>Q: </strong>{(block.question ?? []).map(renderInlineSegment)}</p>
        <p><strong>A: </strong>{(block.answer ?? []).map(renderInlineSegment)}</p>
      </div>
    ))}
  </section>
);

const renderProsCons = (document: SummaryDocument): ReactNode => {
  const pros: SummaryDocument['blocks'] = [];
  const cons: SummaryDocument['blocks'] = [];
  for (const block of document.blocks) {
    if (block.type === 'pro') pros.push(block);
    else if (block.type === 'con') cons.push(block);
  }
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
  );
};

const FORMAT_RENDERERS: Record<string, (doc: SummaryDocument) => ReactNode> = {
  'error': renderError,
  'bullet-point': renderBulletPoint,
  'paragraph': renderParagraph,
  'tl-dr': renderTldr,
  'q-and-a': renderQandA,
  'pros-cons': renderProsCons,
};

const renderDocumentBody = (document: SummaryDocument): ReactNode => {
  const renderer = FORMAT_RENDERERS[document.format];
  return renderer ? renderer(document) : <div />;
};

const SummaryDocumentView: React.FC<{ document: SummaryDocument }> = ({ document }) => {
  if (document.blocks.length === 0) return null;
  return (
    <div>
      <h1 className="summary-title">{document.title}</h1>
      {renderDocumentBody(document)}
    </div>
  );
};

interface ActionItemCardProps {
  actionItem: SummaryActionItem;
  fontSize: number;
  onRemove: (id: string) => void;
}

const renderBody = (actionItem: SummaryActionItem) => {
  if (actionItem.document.format === 'error') {
    return <SummaryDocumentView document={actionItem.document} />;
  }
  switch (actionItem.type) {
    case 'flashcards':
      return <FlashcardContainer document={actionItem.document} />;
    case 'quiz':
      return <Quiz document={actionItem.document} difficulty={actionItem.quizDifficulty ?? null} />;
    case 'summary':
      return <SummaryDocumentView document={actionItem.document} />;
    default:
      return null;
  }
};

const ActionItemCardInner: React.FC<ActionItemCardProps> = ({ actionItem, fontSize, onRemove }) => {
  if (actionItem.document.blocks.length === 0) return null;

  const role: 'error' | ActionId =
    actionItem.document.format === 'error' ? 'error' : actionItem.type;
  const meta = CLOSE_META[role];

  const useDocumentStyling = role === 'error' || role === 'summary';

  return (
    <div className="mb-4!">
      <div className="flex flex-row justify-end">
        <AlertPopup
          trigger={
            <button type="button" className="qz-close" aria-label={meta.ariaLabel}>
              <Cross2Icon className="qz-close-icon" aria-hidden="true" />
              <span>Close</span>
            </button>
          }
          title={meta.title}
          description={meta.description}
          onConfirm={() => onRemove(actionItem.id)}
          confirmLabel="Close"
          cancelLabel="Cancel"
        />
      </div>
      {useDocumentStyling ? (
        <PageCard
          as="article"
          style={{ fontSize: `${fontSize}px` }}
          className="summary-card summary-content summary-container relative"
        >
          {renderBody(actionItem)}
        </PageCard>
      ) : (
        <PageCard className="summary-card">{renderBody(actionItem)}</PageCard>
      )}
    </div>
  );
};

export const ActionItemCard = React.memo(ActionItemCardInner);
