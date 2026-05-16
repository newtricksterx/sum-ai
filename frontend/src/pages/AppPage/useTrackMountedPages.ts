import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { PageType } from "../../utils/types";

export const useTrackMountedPages = (
  currentPage: PageType,
  setMountedPages: Dispatch<SetStateAction<Partial<Record<PageType, true>>>>,
) => {
  useEffect(() => {
    setMountedPages((previousPages) => {
      if (previousPages[currentPage]) {
        return previousPages;
      }

      return {
        ...previousPages,
        [currentPage]: true,
      };
    });
  }, [currentPage, setMountedPages]);
};
