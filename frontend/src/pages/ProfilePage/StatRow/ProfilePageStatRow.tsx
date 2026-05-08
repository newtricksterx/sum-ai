import TooltipComponent from "../../../components/Tooltip/TooltipComponent";
import '../../../i18n';
import { useTranslation } from 'react-i18next';
import './ProfilePageStatRow.css'

interface StatProp {
    badge_id?: string;
    title: string;
    titleDefault?: string;
    content: string;
    contentDefault?: string;
    arialabel: string;
    arialabelDefault?: string;
    value: string;

}

export const ProfilePageStatRow = ({
    badge_id,
    title,
    titleDefault,
    content,
    contentDefault,
    arialabel,
    arialabelDefault,
    value,
} : StatProp) => {
    const { t } = useTranslation();

    return (
        <div className="pp-stat-row">
            <span className="pp-stat-label">
                {t(title, { defaultValue: titleDefault ?? title })}
                <TooltipComponent
                content={t(content, { defaultValue: contentDefault ?? content })}
                side="top"
                triggerClassName="pp-stat-tooltip-trigger"
                ariaLabel={t(arialabel, { defaultValue: arialabelDefault ?? arialabel })}
                />
            </span>
            <span className="pp-stat-value">
                <span id={badge_id || ""} className="pp-plan-badge">{value}</span>
            </span>
        </div>
    );
}
