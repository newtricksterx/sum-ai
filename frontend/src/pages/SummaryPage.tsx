import React from 'react';
import PageCard from '../components/PageCard/PageCard';
interface SummaryPageProps {
  content: string;
  fontSize: number;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ content, fontSize }) => {
    return (
        <div className="px-3 py-3">
            <div className="relative">
                <PageCard
                    as="div"
                    style={{ fontSize: `${fontSize}px` }}
                    className={`summary-container font-noto min-h-[210px] h-max pr-12`}
                    dangerouslySetInnerHTML={{ __html: content!}}
                />
            </div>
        </div>


    );
};

export default React.memo(SummaryPage);
