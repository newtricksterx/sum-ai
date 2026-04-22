import React from 'react';
interface SummaryPageProps {
  content: string;
  fontSize: number;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ content, fontSize }) => {
    return (
        <div className="px-3 py-3">
            <div className="relative">
                <div
                    style={{ fontSize: `${fontSize}px` }}
                    /* Use the class name from your CSS file here */
                    className={`summary-container font-noto min-h-[210px] h-max pr-12`}
                    dangerouslySetInnerHTML={{ __html: content!}}
                >
                </div>
            </div>
        </div>


    );
};

export default SummaryPage;
