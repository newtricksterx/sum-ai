import { useEffect } from "react";
import { setAuthLogoutHandler } from "../../services/axiosService";

//type SetHistoryOwner = (ownerKey: string, historyLimit: number) => void;

export const useAuthLogoutReset = (
  clearProfile: () => void,
) => {
  useEffect(() => {
    setAuthLogoutHandler(() => {
      clearProfile();
    });

    return () => {
      setAuthLogoutHandler(null);
    };
  }, [clearProfile]);
};

