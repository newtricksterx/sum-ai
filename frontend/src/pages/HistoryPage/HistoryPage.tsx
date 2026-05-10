import React from 'react';
import { useHistoryStore, type HistorySummary } from '../../stores/historyStore';
import { getSummaryIntroFromHtml } from '../../utils/html';
import HistoryCard from './HistoryCard/HistoryCard';
import AlertPopup from '../../components/AlertPopup/AlertPopup';
import { useTranslation } from 'react-i18next';
import '../../i18n';

interface HistoryPageProps {
  onSelectHistory: (historyItem: HistorySummary) => void;
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

const getHostName = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectHistory }) => {
  const { t } = useTranslation();
  const cache = useHistoryStore((state) => state.cache);
  const clearHistory = useHistoryStore((state) => state.clearHistory);
  const removeSummary = useHistoryStore((state) => state.removeSummary);

  const onClickOpen = (item: HistorySummary) => {
    onSelectHistory(item);
  };

  const onClickRemove = (item: HistorySummary) => {
    removeSummary(item.url);
  };

  const onConfirmClearAll = () => {
    clearHistory();
  };

  return (
    <div className="relative px-2 py-2 font-noto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100 !mb-0">{t("history.title")}</h1>
        <AlertPopup
          trigger={
            <button
              type="button"
              disabled={cache.length === 0}
              className={`text-[11px] px-2 py-1 rounded-md border ${
                cache.length === 0
                  ? "opacity-50 cursor-not-allowed border-slate-300 dark:border-slate-700"
                  : "cursor-pointer border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              }`}
            >
              {t("history.clearAll")}
            </button>
          }
          title={t("history.clearAllTitle")}
          description={t("history.clearAllDescription")}
          previewText={`${cache.length} ${cache.length === 1 ? t("history.summary") : t("history.summaries")} ${t("history.willBeDeleted")}`}
          confirmLabel={t("history.clearAll")}
          cancelLabel={t("profile.cancel", "Cancel")}
          onConfirm={onConfirmClearAll}
        />
      </div>

      {cache.length === 0 ? (
        <p className="text-[13px] text-slate-600 dark:text-slate-300">
          {t("history.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {cache.map((item) => (
            <HistoryCard
              key={item.url}
              hostName={truncateText(getHostName(item.url), 40)}
              previewText={truncateText(getSummaryIntroFromHtml(item.content), 120)}
              onOpen={() => onClickOpen(item)}
              onRemove={() => onClickRemove(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
