import { type ReactElement } from 'react';
import {
  ArrowRightIcon,
  CardStackIcon,
  CheckCircledIcon,
  QuestionMarkCircledIcon,
} from '@radix-ui/react-icons';
import LoaderCircle from '../../../../components/LoaderCircle';
import './ActionGrid.css';
import type { SummaryActionId } from '../../../../types/summary';

interface ActionGridProps {
    onClickAction: (actionId: ActionId) => void | Promise<void>;
    isDisabled?: boolean;
    loadingActionId?: ActionId | null;
}

export type ActionId = SummaryActionId;

const ACTION_ITEMS: ReadonlyArray<{
  id: ActionId;
  title: string;
  description: string;
  tag: string;
  icon: ReactElement;
  tone: 'teal' | 'purple' | 'amber' | 'blue';
}> = [
  {
    id: 'flashcards',
    title: 'Flashcards',
    description: 'Generate study cards',
    tag: 'Study',
    icon: <CardStackIcon width={18} height={18} />,
    tone: 'teal',
  },
  {
    id: 'quiz',
    title: 'Quiz',
    description: 'Test your knowledge.',
    tag: 'Test',
    icon: <QuestionMarkCircledIcon width={18} height={18} />,
    tone: 'purple',
  }
];


export const ActionGrid = ({ onClickAction, isDisabled = false, loadingActionId = null } : ActionGridProps) => {
  if (isDisabled) {
    return null;
  }

  const isAnyActionLoading = loadingActionId !== null;

  return (
    <section className="summary-actions" aria-label="Post-summary actions">
      <header className="summary-actions-header">
        <p className="summary-actions-label">What&apos;s next</p>
        <p className="summary-actions-hint">Pick an action</p>
      </header>

      <div className="summary-actions-grid" role="list">
        {ACTION_ITEMS.map((item) => {
          const isActionLoading = loadingActionId === item.id;
          const isActionDisabled = isDisabled || isAnyActionLoading;

          return (
            <button
              key={item.id}
              type="button"
              className={`summary-action-card${isActionLoading ? ' is-loading' : ''}`}
              onClick={() => {
                if (!isActionDisabled) {
                  void onClickAction(item.id);
                }
              }}
              disabled={isActionDisabled}
              aria-disabled={isActionDisabled}
              aria-busy={isActionLoading}
            >
              <div
                className={`summary-action-icon summary-action-icon--${item.tone}`}
                aria-hidden="true"
              >
                {item.icon}
              </div>
              <div className="summary-action-body">
                <span className="summary-action-title">{item.title}</span>
                <span className="summary-action-desc">{item.description}</span>
              </div>

              <div className="summary-action-footer">
                <span className={`summary-action-tag summary-action-tag--${item.tone}`}>{item.tag}</span>
                {isActionLoading ? (
                  <LoaderCircle showText={false} className="summary-action-loader" />
                ) : (
                  <ArrowRightIcon className="summary-action-arrow" aria-hidden="true" />
                )}
                <CheckCircledIcon className="summary-action-check" aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
