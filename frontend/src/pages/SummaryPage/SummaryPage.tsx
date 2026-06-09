import React, { useCallback, useState } from 'react';
import { ToastErrorMessage } from '../../components/ToastErrorMessage/ToastErrorMessage';
import { ActionGrid } from './components/ActionGrid/ActionGrid';
import { useExport } from './components/ActionGrid/export';
import { ActionItemCard } from './components/ActionItemCard/ActionItemCard';
import type { SummaryActionItem } from '../../types/summary';
import type { AddActionItemOptions } from "./utils/types";
import { ActionId } from '../../types/summary';
import { useCurrentSessionState } from '../../stores/sessionStorage';
import { useActiveTabUrl } from './useActiveTabUrl';
import { SessionMismatch } from './components/SessionMismatch/SessionMismatch';
import { useTranslation } from 'react-i18next';
import type { AddActionItemResult } from './useActionItem';

interface SummaryPageProps {
  fontSize: number;
  actionItems: SummaryActionItem[];
  onAddActionItem: (actionId: ActionId, options?: AddActionItemOptions) => Promise<AddActionItemResult>;
  onRemoveActionItem: (actionItemId: string) => void;
  loadingActionId?: ActionId | null;
}

interface SummaryActionItemListProps {
  actionItems: SummaryActionItem[];
  fontSize: number;
  onRemoveActionItem: (actionItemId: string) => void;
}

const SummaryActionItemList = React.memo(({
  actionItems,
  onRemoveActionItem,
  fontSize,
}: SummaryActionItemListProps) => (
  <>
    {actionItems.map((actionItem) => (
      <ActionItemCard
        key={actionItem.id}
        actionItem={actionItem}
        fontSize={fontSize}
        onRemove={onRemoveActionItem}
      />
    ))}
  </>
));

const SummaryPage: React.FC<SummaryPageProps> = ({
  fontSize,
  actionItems,
  onAddActionItem,
  onRemoveActionItem,
  loadingActionId = null,
}) => {
  const { t } = useTranslation();
  const sessionUrl = useCurrentSessionState((state) => state.session.url);
  const activeTabUrl = useActiveTabUrl();
  // While activeTabUrl is still resolving we treat it as "on session" to avoid flicker;
  // the return link only renders once we have both URLs and they differ.
  const shouldShowReturnLink =
    Boolean(sessionUrl) && activeTabUrl !== undefined && sessionUrl !== activeTabUrl;

  const { handleExport, isExportLoading } = useExport();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dismissError = useCallback(() => setErrorMessage(null), []);

  const handleAddActionItem = useCallback(
    async (actionId: ActionId) => {
      // No active session: treat the grid click as a session-start so the action
      // item attaches to the active tab's URL instead of an empty session.
      const result = !sessionUrl
        ? await onAddActionItem(actionId, { resetSession: true, forceActiveTab: true })
        : await onAddActionItem(actionId);

      if (!result.success) {
        setErrorMessage(result.errorMessage);
      }
    },
    [onAddActionItem, sessionUrl],
  );

  const handleClickExport = useCallback(async () => {
    const result = await handleExport();
    if (!result.success) {
      setErrorMessage(result.errorMessage);
    }
  }, [handleExport]);

  return (
    <section className={`summary-shell px-2! py-2!`}>
      <SummaryActionItemList
        actionItems={actionItems}
        fontSize={fontSize}
        onRemoveActionItem={onRemoveActionItem}
      />
      { shouldShowReturnLink ? (
        <SessionMismatch sessionUrl={sessionUrl} />
      ) : (
        <ActionGrid
          onClickAction={handleAddActionItem}
          onClickExport={handleClickExport}
          title={t("summaryActions.whatsNext")}
          loadingActionId={loadingActionId}
          isExportLoading={isExportLoading}
        />
      )}
      <ToastErrorMessage errorMessage={errorMessage} onDismissError={dismissError} />
    </section>
  );
};

export default React.memo(SummaryPage);
