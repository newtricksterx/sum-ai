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

type CardTone = 'teal' | 'purple' | 'amber' | 'blue' | 'rose';

// i18n keys live under summaryActions.items.<id>.
type ActionCard = {
  id: ActionId | 'export';
  icon: ReactElement;
  tone: CardTone;
  isLoading: boolean;
  onClick: () => void;
};

const ACTION_ITEMS: ReadonlyArray<{
  id: ActionId;
  icon: ReactElement;
  tone: CardTone;
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

  const cards: ActionCard[] = ACTION_ITEMS.map((item) => ({
    id: item.id,
    icon: item.icon,
    tone: item.tone,
    isLoading: loadingActionId === item.id,
    onClick: () => {
      if (!isAnyLoading) {
        void onClickAction(item.id);
      }
    },
  }));

  if (onClickExport) {
    cards.push({
      id: 'export',
      icon: <ExternalLinkIcon width={18} height={18} />,
      tone: 'rose',
      isLoading: isExportLoading,
      onClick: () => {
        if (!isAnyLoading) {
          void onClickExport();
        }
      },
    });
  }

  return (
    <section className={`summary-actions ${className}`} aria-label={t('summaryActions.regionAriaLabel')}>
      <header className="summary-actions-header">
        <p className="summary-actions-label">{title}</p>
        <p className="summary-actions-hint">{t('summaryActions.pickAction')}</p>
      </header>

      <div className="summary-actions-grid" role="list">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`summary-action-card${card.isLoading ? ' is-loading' : ''}`}
            onClick={card.onClick}
            disabled={isAnyLoading}
            aria-disabled={isAnyLoading}
            aria-busy={card.isLoading}
            title={t(`summaryActions.items.${card.id}.hoverTitle`)}
          >
            <div className='summary-action-head'>
              <div
                className={`summary-action-icon summary-action-icon--${card.tone}`}
                aria-hidden="true"
              >
                {card.icon}
              </div>
              <div className="summary-action-body">
                <span className="summary-action-title">{t(`summaryActions.items.${card.id}.title`)}</span>
                <span className="summary-action-desc">{t(`summaryActions.items.${card.id}.description`)}</span>
              </div>
            </div>

            <div className="summary-action-footer">
              <span className={`summary-action-tag summary-action-tag--${card.tone}`}>{t(`summaryActions.items.${card.id}.tag`)}</span>
              {card.isLoading ? (
                <LoaderCircle className="summary-action-loader" />
              ) : (
                <ArrowRightIcon className="summary-action-arrow" aria-hidden="true" />
              )}
              <CheckCircledIcon className="summary-action-check" aria-hidden="true" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
