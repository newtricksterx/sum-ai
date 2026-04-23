import React, { useState } from 'react';
import { useHistoryStore, type HistorySummary } from '../stores/historyStore';
import { getPlainTextFromHtml } from '../utils/html';

interface HistoryPageProps {
  onSelectHistory: (historyContent: string) => void;
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

const getHostName = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const HistoryPage: React.FC<HistoryPageProps> = ({ onSelectHistory }) => {
  const cache = useHistoryStore((state) => state.cache);
  const clearHistory = useHistoryStore((state) => state.clearHistory);
  const removeSummary = useHistoryStore((state) => state.removeSummary);
  const [pendingRemoval, setPendingRemoval] = useState<HistorySummary | null>(null);

  const onClickOpen = (item: HistorySummary) => {
    onSelectHistory(item.content);
  };

  const onClickRemove = (item: HistorySummary) => {
    setPendingRemoval(item);
  };

  const onCancelRemoval = () => {
    setPendingRemoval(null);
  };

  const onConfirmRemoval = () => {
    if (!pendingRemoval) return;
    removeSummary(pendingRemoval.url);
    setPendingRemoval(null);
  };

  return (
    <div className="relative px-3 py-3 font-noto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100 !mb-0">Summary History</h1>
        <button
          type="button"
          onClick={clearHistory}
          disabled={cache.length === 0}
          className={`text-[11px] px-2 py-1 rounded-md border ${
            cache.length === 0
              ? "opacity-50 cursor-not-allowed border-slate-300 dark:border-slate-700"
              : "border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          }`}
        >
          Clear All
        </button>
      </div>

      {cache.length === 0 ? (
        <p className="text-[13px] text-slate-600 dark:text-slate-300">
          No summaries yet. Generate one and it will appear here.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {cache.map((item) => (
            <article key={item.url} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
              <p className="text-[11px] font-medium text-teal-700 dark:text-teal-300 mb-1">
                {truncateText(getHostName(item.url), 40)}
              </p>
              <p className="text-[12px] text-slate-700 dark:text-slate-200 leading-relaxed mb-2">
                {truncateText(getPlainTextFromHtml(item.content), 120)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onClickOpen(item)}
                  className="text-[11px] px-2 py-1 rounded-md border border-teal-300 hover:bg-teal-50 dark:border-teal-800 dark:hover:bg-teal-900/40"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => onClickRemove(item)}
                  className="text-[11px] px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {pendingRemoval && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/20 px-3 backdrop-blur-[1px]"
          onClick={onCancelRemoval}
        >
          <div
            className="w-full max-w-[320px] rounded-xl border border-[#373737] bg-[#303030] p-3 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-[14px] font-semibold text-slate-100">
              Remove From History?
            </h2>
            <p className="mt-1 text-[12px] text-slate-300">
              This summary will be permanently removed from your local history.
            </p>
            <div className="mt-2 rounded-md border border-[#3a3a3a] bg-[#2a2a2a] px-2 py-1.5">
              <p className="text-[11px] font-medium text-teal-300">
                {truncateText(getHostName(pendingRemoval.url), 48)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-300">
                {truncateText(getPlainTextFromHtml(pendingRemoval.content), 90)}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancelRemoval}
                className="text-[11px] px-2.5 py-1 rounded-md border border-[#3a3a3a] text-slate-200 hover:bg-[#2a2a2a]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmRemoval}
                className="text-[11px] px-2.5 py-1 rounded-md border border-red-800 bg-red-900/30 text-red-300 hover:bg-red-900/50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
