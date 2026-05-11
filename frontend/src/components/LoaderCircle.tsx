import { useTranslation } from "react-i18next";
import "../i18n";

interface LoaderCircleProps {
  showText?: boolean;
  className?: string;
}

export default function LoaderCircle({ showText = true, className = "" }: LoaderCircleProps) {
  const { t } = useTranslation();
  const normalizedClassName = className.trim();
  const shellClassName = normalizedClassName
    ? `loader-shell font-google ${normalizedClassName}`
    : "loader-shell font-google";

  return (
    <div className={shellClassName}>
      <div id="loader" />
      {showText && <p className="loader-text">{t("loader.drafting")}</p>}
    </div>
  )
}
