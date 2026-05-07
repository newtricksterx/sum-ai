import React from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import AlertPopup from "../AlertPopup/AlertPopup";
import PageCard from "../PageCard/PageCard";
import "./HistoryCard.css";

interface HistoryCardProps {
  hostName: string;
  previewText: string;
  onOpen: () => void;
  onRemove: () => void;
}

const HistoryCard: React.FC<HistoryCardProps> = ({
  hostName,
  previewText,
  onOpen,
  onRemove,
}) => {
  const { t } = useTranslation();

  return (
    <PageCard as="article" className="history-card group">
      <div className="history-card-topline" />

      <div className="history-card-host-row">
        <p className="history-card-host">{hostName}</p>
      </div>

      <p className="history-card-preview">{previewText}</p>

      <div className="history-card-actions">
        <button
          type="button"
          onClick={onOpen}
          className="history-card-btn history-card-btn-open"
        >
          <ExternalLink size={11} />
          {t("history.open")}
        </button>
        <AlertPopup
          trigger={
            <button type="button" className="history-card-btn history-card-btn-remove">
              <Trash2 size={11} />
              {t("history.remove")}
            </button>
          }
          title={t("history.removeTitle")}
          description={t("history.removeDescription")}
          onConfirm={onRemove}
          confirmLabel={t("history.remove")}
          cancelLabel={t("profile.cancel")}
          confirmTone="danger"
          previewTitle={hostName}
          previewText={previewText}
        />
      </div>
    </PageCard>
  );
};

export default HistoryCard;
