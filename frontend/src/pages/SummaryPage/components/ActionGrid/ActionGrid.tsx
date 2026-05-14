import { type ReactElement } from 'react';
import {
  ArrowRightIcon,
  CardStackIcon,
  CheckCircledIcon,
  QuestionMarkCircledIcon,
  ReaderIcon,
} from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import LoaderCircle from '../../../../components/LoaderCircle';
import '../../../../i18n';
import './ActionGrid.css';
import type { ActionId } from '../../../../types/summary';

interface ActionGridProps {
    onClickAction: (actionId: ActionId) => void | Promise<void>;
    isDisabled?: boolean;
    loadingActionId?: ActionId | null;
}

const ACTION_ITEMS: ReadonlyArray<{
  id: ActionId;
  icon: ReactElement;
  tone: 'teal' | 'purple' | 'amber' | 'blue';
}> = [
  {
    id: 'summary',
    icon: <ReaderIcon width={18} height={18} />,
    tone: 'blue'
  },
  {
    id: 'flashcards',
    icon: <CardStackIcon width={18} height={18} />,
    tone: 'teal',
  },
  {
    id: 'quiz',
    icon: <QuestionMarkCircledIcon width={18} height={18} />,
    tone: 'amber',
  }
];


export const ActionGrid = ({ onClickAction, isDisabled = false, loadingActionId = null } : ActionGridProps) => {
  const { t } = useTranslation();

  if (isDisabled) {
    return null;
  }

  const isAnyActionLoading = loadingActionId !== null;

  return (
    <section className="summary-actions" aria-label={t('summaryActions.regionAriaLabel')}>
      <header className="summary-actions-header">
        <p className="summary-actions-label">{t('summaryActions.whatsNext')}</p>
        <p className="summary-actions-hint">{t('summaryActions.pickAction')}</p>
      </header>

      <div className="summary-actions-grid" role="list">
        {ACTION_ITEMS.map((item) => {
          const itemTitle = t(`summaryActions.items.${item.id}.title`);
          const itemDescription = t(`summaryActions.items.${item.id}.description`);
          const itemTag = t(`summaryActions.items.${item.id}.tag`);
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
                <span className="summary-action-title">{itemTitle}</span>
                <span className="summary-action-desc">{itemDescription}</span>
              </div>

              <div className="summary-action-footer">
                <span className={`summary-action-tag summary-action-tag--${item.tone}`}>{itemTag}</span>
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
