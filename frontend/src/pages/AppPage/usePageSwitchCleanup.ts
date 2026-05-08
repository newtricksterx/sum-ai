import { useEffect } from "react";
import type { MutableRefObject } from "react";

export const usePageSwitchCleanup = (
  pageFrameRef: MutableRefObject<number | null>,
  pageStorageTimeoutRef: MutableRefObject<number | null>,
) => {
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") {
        return;
      }

      if (pageFrameRef.current !== null) {
        window.cancelAnimationFrame(pageFrameRef.current);
      }

      if (pageStorageTimeoutRef.current !== null) {
        window.clearTimeout(pageStorageTimeoutRef.current);
      }
    };
  }, [pageFrameRef, pageStorageTimeoutRef]);
};
