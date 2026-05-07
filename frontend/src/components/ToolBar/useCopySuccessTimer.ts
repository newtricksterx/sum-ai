import { useCallback, useEffect, useRef, useState } from "react";

export const useCopySuccessTimer = (resetDelayMs = 1800) => {
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const copySuccessTimeoutRef = useRef<number | null>(null);

  const clearCopySuccessTimeout = useCallback(() => {
    if (copySuccessTimeoutRef.current !== null) {
      window.clearTimeout(copySuccessTimeoutRef.current);
      copySuccessTimeoutRef.current = null;
    }
  }, []);

  const showCopySuccess = useCallback(() => {
    setIsCopySuccess(true);
    clearCopySuccessTimeout();

    copySuccessTimeoutRef.current = window.setTimeout(() => {
      setIsCopySuccess(false);
      copySuccessTimeoutRef.current = null;
    }, resetDelayMs);
  }, [clearCopySuccessTimeout, resetDelayMs]);

  const resetCopySuccess = useCallback(() => {
    clearCopySuccessTimeout();
    setIsCopySuccess(false);
  }, [clearCopySuccessTimeout]);

  useEffect(() => clearCopySuccessTimeout, [clearCopySuccessTimeout]);

  return {
    isCopySuccess,
    showCopySuccess,
    resetCopySuccess,
  };
};
