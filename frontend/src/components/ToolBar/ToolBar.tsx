import { Check, Download } from 'lucide-react';
import { GoCopy } from "react-icons/go";
import "./ToolBar.css";
import { useTranslation } from "react-i18next";
import "../../i18n";


export interface ToolBarProps {
    onClickCopy: React.MouseEventHandler;
    onClickDownload: React.MouseEventHandler;
    onClickGenerate?: React.MouseEventHandler;
    isCopySuccess?: boolean;
    isSummarizing?: boolean;
    isGenerateDisabled?: boolean;
    canUseSummaryActions?: boolean;
}

function ToolBar({
  onClickCopy,
  onClickDownload,
  isSummarizing = false,
  isGenerateDisabled = false,
  onClickGenerate = () => {},
  isCopySuccess = false,
  canUseSummaryActions = true,
} : ToolBarProps) {
  const { t } = useTranslation();
  const disableGenerate = isSummarizing || isGenerateDisabled;
  const areSummaryActionsEnabled = canUseSummaryActions && !isSummarizing;
  
  return (
    <nav className="toolbar-shell m-1 flex flex-row items-center justify-between">
        <span className={`toolbar-generate-shell ${disableGenerate ? "is-disabled" : ""}`}>
        <button
          type="button"
          onClick={onClickGenerate}
          disabled={disableGenerate}
          title={t("toolbar.generateTitle")}
          className={`toolbar-generate-btn ${
            disableGenerate
              ? "toolbar-generate-btn-disabled cursor-not-allowed"
              : "toolbar-generate-btn-active cursor-pointer"
          }`}
        >
          {t("toolbar.generate")}
        </button>
        </span>
        <div id="tools" className="ml-auto flex flex-row items-center gap-1">
          <button className={`toolbar-btn p-2 rounded-md ${areSummaryActionsEnabled ? "" : "opacity-50"}`} disabled={!areSummaryActionsEnabled} onClick={onClickDownload} title={t("toolbar.downloadTitle")}>
            <Download size={12}/>
          </button> 
          <button
            className={`toolbar-btn p-2 rounded-md ${areSummaryActionsEnabled ? "" : "opacity-50"} ${
              isCopySuccess ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300" : ""
            }`}
            disabled={!areSummaryActionsEnabled}
            onClick={onClickCopy}
            title={t("toolbar.copyTitle")}
          >
            {isCopySuccess ? <Check size={12}/> : <GoCopy size={12}/>}
          </button>
        </div>
    </nav>
  )
}

export default ToolBar;
