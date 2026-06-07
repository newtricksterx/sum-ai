import { startTransition, useCallback, useRef, useState } from "react";
import { GetPageFromStorage, UpdatePageStorage } from "../../utils/storage";
import { PageType } from "../../utils/types";

export const usePageRouter = () => {
  const [currentPage, setCurrentPage] = useState<PageType>(() => GetPageFromStorage() ?? "home");
  const pendingPageRef = useRef<PageType | null>(null);
  const pageFrameRef = useRef<number | null>(null);
  const pageStorageTimeoutRef = useRef<number | null>(null);
  const [mountedPages, setMountedPages] = useState<Partial<Record<PageType, true>>>(() => {
    const initialPage: PageType = GetPageFromStorage() ?? "home";
    return { [initialPage]: true };
  });

  const schedulePageStorageWrite = useCallback((nextPage: PageType) => {
    if (typeof window === "undefined") {
      UpdatePageStorage(nextPage);
      return;
    }

    if (pageStorageTimeoutRef.current !== null) {
      window.clearTimeout(pageStorageTimeoutRef.current);
    }

    pageStorageTimeoutRef.current = window.setTimeout(() => {
      UpdatePageStorage(nextPage);
      pageStorageTimeoutRef.current = null;
    }, 120);
  }, []);

  const commitPage = useCallback((nextPage: PageType) => {
    let didChange = false;
    startTransition(() => {
      setCurrentPage((prevPage) => {
        if (prevPage === nextPage) return prevPage;
        didChange = true;
        return nextPage;
      });
    });
    if (didChange) {
      schedulePageStorageWrite(nextPage);
    }
  }, [schedulePageStorageWrite]);

  const setPage = useCallback((nextPage: PageType) => {
    pendingPageRef.current = nextPage;

    if (typeof window === "undefined") {
      commitPage(nextPage);
      pendingPageRef.current = null;
      return;
    }

    if (pageFrameRef.current !== null) {
      return;
    }

    pageFrameRef.current = window.requestAnimationFrame(() => {
      pageFrameRef.current = null;
      const scheduledPage = pendingPageRef.current;
      pendingPageRef.current = null;

      if (scheduledPage === null) {
        return;
      }

      commitPage(scheduledPage);
    });
  }, [commitPage]);

  return {
    currentPage,
    mountedPages,
    setMountedPages,
    setPage,
    pageFrameRef,
    pageStorageTimeoutRef,
  };
};
