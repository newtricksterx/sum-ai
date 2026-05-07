import Button from "../Button";
import { Check, Download } from 'lucide-react';
import { CopyState } from "../../utils/states";
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
}

function ToolBar({
  onClickCopy,
  onClickDownload,
  isSummarizing = false,
  onClickGenerate = () => {},
  isCopySuccess = false,
} : ToolBarProps) {
  const { t } = useTranslation();
  const canUseSummaryActions = CopyState() && !isSummarizing;
  
  return (
    <nav className="toolbar-shell m-1 flex flex-row items-center justify-between">
        <span className={`toolbar-generate-shell ${isSummarizing ? "is-disabled" : ""}`}>
        <button
          type="button"
          onClick={onClickGenerate}
          disabled={isSummarizing}
          title={t("toolbar.generateTitle")}
          className={`toolbar-generate-btn inline-flex items-center justify-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.01em] transition-colors ${
            isSummarizing
              ? "toolbar-generate-btn-disabled cursor-not-allowed opacity-80"
              : "toolbar-generate-btn-active cursor-pointer"
          }`}
        >
          {t("toolbar.generate")}
        </button>
        </span>
        <div id="tools" className="ml-auto flex flex-row items-center gap-1">
          <Button className={`p-2 rounded-md ${canUseSummaryActions ? "" : "opacity-50"}`} disabled={!canUseSummaryActions} onClick={onClickDownload} title={t("toolbar.downloadTitle")}>
            <Download size={12}/>
          </Button> 
          <Button
            className={`p-2 rounded-md ${canUseSummaryActions ? "" : "opacity-50"} ${
              isCopySuccess ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300" : ""
            }`}
            disabled={!canUseSummaryActions}
            onClick={onClickCopy}
            title={t("toolbar.copyTitle")}
          >
            {isCopySuccess ? <Check size={12}/> : <GoCopy size={12}/>}
          </Button>
        </div>
    </nav>
  )
}

export default ToolBar;
