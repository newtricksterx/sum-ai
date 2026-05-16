import React, { useCallback } from 'react';
import HistoryCard from './HistoryCard/HistoryCard';
import AlertPopup from '../../components/AlertPopup/AlertPopup';
import { Trans, useTranslation } from 'react-i18next';
import '../../i18n';
import { truncateText, getHostName } from './historypage.utils';
import {
  HistoryItem,
  useCurrentUserHistory,
  useCurrentUserHistoryKey,
  useHistoryStorage,
} from '../../stores/historyStorage';
import { SessionState } from '../../stores/sessionStorage';
import { useAuthProfileStore } from '../../stores/authProfileStore';

interface HistoryPageProps {
  onOpenSession: (session: SessionState) => void;
  onClickSignInPage: () => void;
}

const getHistoryPreview = (item: HistoryItem): string => {
  const first = item.session.action_items[0];
  if (!first) return item.url;
  return first.document.title || item.url;
};

const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenSession, onClickSignInPage }) => {
  const { t } = useTranslation();
  const userKey = useCurrentUserHistoryKey();
  const items = useCurrentUserHistory();
  const removeHistoryItem = useHistoryStorage((state) => state.removeHistoryItem);
  const clearHistory = useHistoryStorage((state) => state.clearHistory);
  const profile = useAuthProfileStore((state) => state.profile)

  const handleClearAll = useCallback(() => {
    clearHistory(userKey);
  }, [clearHistory, userKey]);

  return (
    <div className="relative px-2 py-2 font-google">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-[16px] font-semibold mb-0!">{t("history.title")}</h1>
        <AlertPopup
          trigger={
            <button
              type="button"
              disabled={items.length === 0}
              className={`history-clear-btn text-[11px] px-2 py-1 rounded-md border ${
                items.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer "
              }`}
            >
              {t("history.clearAll")}
            </button>
          }
          title={t("history.clearAllTitle")}
          description={t("history.clearAllDescription")}
          previewText={`${items.length} ${items.length === 1 ? t("history.session") : t("history.sessions")} ${t("history.willBeDeleted")}`}
          confirmLabel={t("history.clearAll")}
          cancelLabel={t("profile.cancel", "Cancel")}
          onConfirm={handleClearAll}
        />
      </div>

      {items.length === 0 ? (
        <div className="text-[13px]">
          {profile ? t("history.empty") : (
            <p>
              <Trans
                i18nKey="history.emptyNotSignedIn"
                components={{
                  signIn: (
                    <button
                      type="button"
                      className='text-blue-600 hover:text-blue-400 hover:underline transition-colors'
                      onClick={onClickSignInPage}
                    />
                  ),
                }}
              />
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <HistoryCard
              key={item.url}
              hostName={truncateText(getHostName(item.url), 40)}
              previewText={truncateText(getHistoryPreview(item), 120)}
              onOpen={() => onOpenSession(item.session)}
              onRemove={() => removeHistoryItem(userKey, item.url)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
