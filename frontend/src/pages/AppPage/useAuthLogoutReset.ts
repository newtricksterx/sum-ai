import { useEffect } from "react";
import { setAuthLogoutHandler } from "../../services/axiosService";

type SetHistoryOwner = (ownerKey: string, historyLimit: number) => void;

export const useAuthLogoutReset = (
  clearProfile: () => void,
  setHistoryOwner: SetHistoryOwner,
) => {
  useEffect(() => {
    setAuthLogoutHandler(() => {
      clearProfile();
      setHistoryOwner("anonymous", 1);
    });

    return () => {
      setAuthLogoutHandler(null);
    };
  }, [clearProfile, setHistoryOwner]);
};

