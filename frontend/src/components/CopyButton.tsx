import { Copy } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';


interface CopyButtonProps {
  text: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const getPlainText = () => {
    const parser = document.createElement('div');
    parser.innerHTML = text;
    return parser.textContent?.trim() ?? '';
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getPlainText());
      setCopied(true);

      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }

      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="relative inline-flex">
      {copied && (
        <div className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 shadow-sm dark:border-emerald-900/80 dark:bg-emerald-950/70 dark:text-emerald-300">
          Copied successfully
        </div>
      )}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Summary copied' : 'Copy summary'}
        title={copied ? 'Copied' : 'Copy'}
        className={`inline-flex items-center justify-center rounded-md border p-2 transition-all duration-200 cursor-pointer select-none ${
          copied
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:border-[#3a3a3a] dark:bg-[#242424] dark:text-gray-300 dark:hover:bg-[#2d2d2d] dark:hover:text-white'
        }`}
      >
        <Copy size={15} strokeWidth={2} />
      </button>
    </div>
  );
};

export default CopyButton;
