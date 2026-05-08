import React, { useMemo } from 'react';
import PageCard from '../../components/PageCard/PageCard';
import { sanitizeSummaryHtml } from './sanitizeSummaryHtml';
import { useSettingsStore } from '../../stores/settingsStore';

interface SummaryPageProps {
  content: string;
  fontSize: number;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ content, fontSize }) => {
    const sanitizedContent = useMemo(() => sanitizeSummaryHtml(content ?? ""), [content]);
    const theme = useSettingsStore((state) => state.theme);
    const summaryThemeClass = theme === "dark" ? "theme-dark" : "theme-light";

    return (
        <section className={`summary-shell ${summaryThemeClass}`}>
            <PageCard
                as="article"
                style={{ fontSize: `${fontSize}px` }}
                className="summary-card summary-content summary-container min-h-[210px] h-max"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
        </section>


    );
};

export default React.memo(SummaryPage);
