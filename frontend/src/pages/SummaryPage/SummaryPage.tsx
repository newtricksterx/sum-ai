import React, { useMemo } from 'react';
import PageCard from '../../components/PageCard/PageCard';
import { sanitizeSummaryHtml } from './sanitizeSummaryHtml';

interface SummaryPageProps {
  content: string;
  fontSize: number;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ content, fontSize }) => {
    const sanitizedContent = useMemo(() => sanitizeSummaryHtml(content ?? ""), [content]);

    return (
        <div className="px-2 py-2">
            <div className="relative">
                <PageCard
                    as="div"
                    style={{ fontSize: `${fontSize}px` }}
                    className={`summary-container font-noto min-h-[210px] h-max`}
                    dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
            </div>
        </div>


    );
};

export default React.memo(SummaryPage);
