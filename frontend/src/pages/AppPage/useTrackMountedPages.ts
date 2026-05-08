import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

export const useTrackMountedPages = (
  currentPage: number,
  setMountedPages: Dispatch<SetStateAction<Record<number, true>>>,
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
