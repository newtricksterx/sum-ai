import { type ReactElement } from 'react';
import {
  ArrowRightIcon,
  CardStackIcon,
  CheckCircledIcon,
  QuestionMarkCircledIcon,
  ReaderIcon,
  ExternalLinkIcon
} from '@radix-ui/react-icons';
import { useTranslation } from 'react-i18next';
import LoaderCircle from '../../../../components/LoaderCircle';
import '../../../../i18n';
import './ActionGrid.css';
import type { ActionId } from '../../../../types/summary';

interface ActionGridProps {
    onClickAction: (actionId: ActionId) => void | Promise<void>;
    onClickExport?: () => void | Promise<void>;
    title: string;
    loadingActionId?: ActionId | null;
    isExportLoading?: boolean;
    className?: string;
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
  },
];


export const ActionGrid = ({ onClickAction, onClickExport, title, loadingActionId = null, isExportLoading = false, className = "" } : ActionGridProps) => {
  const { t } = useTranslation();

  const isAnyActionLoading = loadingActionId !== null;
  const isAnyLoading = isAnyActionLoading || isExportLoading;

  return (
    <section className={`summary-actions ${className}`} aria-label={t('summaryActions.regionAriaLabel')}>
      <header className="summary-actions-header">
        <p className="summary-actions-label">{title}</p>
        <p className="summary-actions-hint">{t('summaryActions.pickAction')}</p>
      </header>

      <div className="summary-actions-grid" role="list">
        {ACTION_ITEMS.map((item) => {
          const itemTitle = t(`summaryActions.items.${item.id}.title`);
          const itemDescription = t(`summaryActions.items.${item.id}.description`);
          const itemTag = t(`summaryActions.items.${item.id}.tag`);
          const itemHoverTitle = t(`summaryActions.items.${item.id}.hoverTitle`)
          const isActionLoading = loadingActionId === item.id;
          const isActionDisabled = isAnyLoading;

          return (
            <button
              key={item.id}
              type="button"
              className={`summary-action-card ${isActionLoading ? ' is-loading' : ''}`}
              onClick={() => {
                if (!isActionDisabled) {
                  void onClickAction(item.id);
                }
              }}
              disabled={isActionDisabled}
              aria-disabled={isActionDisabled}
              aria-busy={isActionLoading}
              title={itemHoverTitle}
            >
              <div className='summary-action-head'>
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
              </div>

              <div className="summary-action-footer">
                <span className={`summary-action-tag summary-action-tag--${item.tone}`}>{itemTag}</span>
                {isActionLoading ? (
                  <LoaderCircle className="summary-action-loader" />
                ) : (
                  <ArrowRightIcon className="summary-action-arrow" aria-hidden="true" />
                )}
                <CheckCircledIcon className="summary-action-check" aria-hidden="true" />
              </div>
            </button>
          );
        })}
        {onClickExport && <button
          type="button"
          className={`summary-action-card${isExportLoading ? ' is-loading' : ''}`}
          onClick={() => {
            if (!isAnyLoading) {
              void onClickExport();
            }
          }}
          disabled={isAnyLoading}
          aria-disabled={isAnyLoading}
          aria-busy={isExportLoading}
          title={t('summaryActions.items.export.hoverTitle')}
        >
          <div className='summary-action-head'>
            <div
              className={`summary-action-icon summary-action-icon--rose`}
              aria-hidden="true"
            >
              <ExternalLinkIcon width={18} height={18} />
            </div>
            <div className="summary-action-body">
              <span className="summary-action-title">{t('summaryActions.items.export.title')}</span>
              <span className="summary-action-desc">{t('summaryActions.items.export.description')}</span>
            </div>
          </div>

          <div className="summary-action-footer">
            <span className={`summary-action-tag summary-action-tag--rose`}>{t('summaryActions.items.export.tag')}</span>
            {isExportLoading ? (
              <LoaderCircle className="summary-action-loader" />
            ) : (
              <ArrowRightIcon className="summary-action-arrow" aria-hidden="true" />
            )}
            <CheckCircledIcon className="summary-action-check" aria-hidden="true" />
          </div>
        </button>}
      </div>
    </section>
  );
};
