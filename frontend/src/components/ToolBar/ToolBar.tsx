import "./ToolBar.css";
import { useTranslation } from "react-i18next";
import "../../i18n";
import { useCurrentSessionState } from "../../stores/sessionStorage";


export interface ToolBarProps {
    onClickNewSession?: React.MouseEventHandler;
    isSummarizing?: boolean;
    isGenerateDisabled?: boolean;
}

function ToolBar({
  isSummarizing = false,
  isGenerateDisabled = false,
  onClickNewSession = () => {},
} : ToolBarProps) {
  const { t } = useTranslation();
  const disableGenerate = isSummarizing || isGenerateDisabled;
  // Subscribe directly so URL updates aren't lost when the parent App re-render
  // pushing the prop is deferred by startTransition.
  const currentSessionUrl = useCurrentSessionState((state) => state.session.url);

  return (
    <nav className="toolbar-shell">
      <div className="toolbar-sessionurl">
        <div>
          <span className={`green-dot ${currentSessionUrl ? "bg-green-500" : "bg-red-500"}`}></span>
        </div>
        <div>
            <header className="toolbar-sessionurl-header">{t("toolbar.sessionLabel")}</header>
            <p className="toolbar-sessionurl-url">{currentSessionUrl || t("toolbar.noSession")}</p>
        </div>
      </div>
      <span className={`toolbar-generate-shell ${disableGenerate ? "is-disabled" : ""}`}>
        <button
          type="button"
          onClick={onClickNewSession}
          disabled={disableGenerate}
          title={t("toolbar.generateTitle")}
          className={`toolbar-generate-btn ${
            disableGenerate
              ? "toolbar-generate-btn-disabled cursor-not-allowed"
              : "toolbar-generate-btn-active cursor-pointer"
          }`}
        >
          {t("toolbar.startNewSession")}
        </button>
      </span>
    </nav>
  )
}

export default ToolBar;


/*
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
*/