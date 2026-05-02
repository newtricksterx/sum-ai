import React, { ReactElement, ReactNode } from "react";
import { AlertDialog } from "radix-ui";
import "./AlertPopup.css";

type ConfirmTone = "danger" | "primary";

interface AlertPopupProps {
  trigger: ReactElement;
  title: string;
  description?: string;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: ConfirmTone;
  previewTitle?: string;
  previewText?: string;
  previewContent?: ReactNode;
}

const getConfirmToneClassName = (confirmTone: ConfirmTone) => {
  if (confirmTone === "primary") {
    return "alert-popup-btn-confirm-primary";
  }

  return "alert-popup-btn-confirm-danger";
};

const AlertPopup: React.FC<AlertPopupProps> = ({
  trigger,
  title,
  description,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmTone = "danger",
  previewTitle,
  previewText,
  previewContent,
}) => {
  const hasPreview =
    Boolean(previewContent) ||
    (typeof previewTitle === "string" && previewTitle.trim().length > 0) ||
    (typeof previewText === "string" && previewText.trim().length > 0);

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className="alert-popup-overlay" />
        <AlertDialog.Content className="alert-popup-content">
          <AlertDialog.Title className="alert-popup-title">{title}</AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="alert-popup-description">
              {description}
            </AlertDialog.Description>
          )}

          {hasPreview && (
            <div className="alert-popup-preview">
              {previewContent ?? (
                <>
                  {previewTitle && <p className="alert-popup-preview-title">{previewTitle}</p>}
                  {previewText && <p className="alert-popup-preview-text">{previewText}</p>}
                </>
              )}
            </div>
          )}

          <div className="alert-popup-actions">
            <AlertDialog.Cancel asChild>
              <button type="button" className="alert-popup-btn alert-popup-btn-cancel">
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={onConfirm}
                className={`alert-popup-btn ${getConfirmToneClassName(confirmTone)}`}
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

export default AlertPopup;
