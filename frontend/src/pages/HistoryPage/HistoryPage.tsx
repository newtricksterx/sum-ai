import React from 'react';
import HistoryCard from './HistoryCard/HistoryCard';
import AlertPopup from '../../components/AlertPopup/AlertPopup';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import { truncateText, getHostName } from './historypage.utils';

// Static placeholder data — the history store/implementation was removed; this page
// now only renders the UI shell.
const PLACEHOLDER_HISTORY: { url: string; previewText: string }[] = [
  {
    url: 'https://en.wikipedia.org/wiki/Photosynthesis',
    previewText:
      'Photosynthesis is the process used by plants, algae, and some bacteria to convert light energy into chemical energy stored in glucose.',
  },
  {
    url: 'https://www.nytimes.com/section/technology',
    previewText:
      'A roundup of the latest developments in technology, covering AI research, consumer hardware, and policy debates shaping the industry.',
  },
  {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    previewText:
      'Transcript summary of the video, highlighting the main talking points and key takeaways discussed by the presenter.',
  },
];

const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const cache = PLACEHOLDER_HISTORY;

  return (
    <div className="relative px-2 py-2 font-google">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-[16px] font-semibold mb-0!">{t("history.title")}</h1>
        <AlertPopup
          trigger={
            <button
              type="button"
              disabled={cache.length === 0}
              className={`history-clear-btn text-[11px] px-2 py-1 rounded-md border ${
                cache.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer "
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
          onConfirm={() => {}}
        />
      </div>

      {cache.length === 0 ? (
        <p className="text-[13px]">
          {t("history.empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {cache.map((item) => (
            <HistoryCard
              key={`${item.url}`}
              hostName={truncateText(getHostName(item.url), 40)}
              previewText={truncateText(item.previewText, 120)}
              onOpen={() => {}}
              onRemove={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
