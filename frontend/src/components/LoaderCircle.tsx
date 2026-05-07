import { useTranslation } from "react-i18next";
import "../i18n";

export default function LoaderCircle() {
  const { t } = useTranslation();

  return (
    <div className="loader-shell font-noto">
      <div id="loader" />
      <p className="loader-text">{t("loader.drafting")}</p>
    </div>
  )
}
