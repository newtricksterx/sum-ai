import React from 'react';
import { Sparkles, Globe, FileText } from 'lucide-react';
import '../FrontPage.css';

const FrontPage: React.FC = () => {
  return (
    <section className="front-page-shell relative flex-1 min-h-[300px] p-3 overflow-hidden">
      <div className="relative z-10 front-page-card rounded-2xl border border-gray-200/80 dark:border-[#393939] p-4 font-noto">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-teal-700 dark:border-teal-900/80 dark:bg-teal-950/50 dark:text-teal-300">
          <Sparkles size={12} />
          SUM-AI
        </div>

        <h1 className="mt-3 mb-2 text-center text-[20px] leading-tight font-bold text-slate-900 dark:text-slate-100">
          Turn any page into a clear summary
        </h1>

        <p className="pb-4 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          Choose your format in Settings, then generate concise notes designed for quick reading.
        </p>

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
