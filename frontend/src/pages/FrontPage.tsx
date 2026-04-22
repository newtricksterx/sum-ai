import React from 'react';
import { Sparkles, Globe, FileText, WandSparkles } from 'lucide-react';
import '../FrontPage.css';

interface FrontPageProps {
  onClickGenerate: () => void;
}

const FrontPage: React.FC<FrontPageProps> = ({ onClickGenerate }) => {
  return (
    <section className="front-page-shell relative flex-1 min-h-[300px] p-3 overflow-hidden">
      <div className="relative z-10 front-page-card rounded-2xl border border-gray-200/80 dark:border-[#393939] p-4 font-noto">

        <h1 className="mt-3 mb-2 text-center text-[20px] leading-tight font-bold text-slate-900 dark:text-slate-100">
          Turn any page into a clear summary
        </h1>

        <p className="pb-4 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          Choose your format in Settings, then generate concise notes designed for quick reading.
        </p>

        <button
          type="button"
          onClick={onClickGenerate}
          className="w-full mb-4 inline-flex items-center justify-center gap-2 rounded-xl border border-teal-300 dark:border-teal-900/80 bg-teal-500 dark:bg-teal-600 text-white text-[13px] font-semibold px-3 py-2.5 hover:bg-teal-600 dark:hover:bg-teal-500 transition-colors cursor-pointer"
        >
          <WandSparkles size={14} />
          Generate Summary
        </button>

        <div className="grid gap-2.5">
          <div className="front-step-row">
            <span className="front-step-icon">
              <Globe size={13} />
            </span>
            <p>Open a page you want to summarize.</p>
          </div>
          <div className="front-step-row">
            <span className="front-step-icon">
              <Sparkles size={13} />
            </span>
            <p>Press generate in the top menu.</p>
          </div>
          <div className="front-step-row">
            <span className="front-step-icon">
              <FileText size={13} />
            </span>
            <p>Read, adjust style, and copy your result.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FrontPage;
