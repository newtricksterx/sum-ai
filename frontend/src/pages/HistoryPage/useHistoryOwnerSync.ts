import { useEffect } from "react";
import { useHistoryStore } from "../../stores/historyStore"
import { useAuthProfileStore } from "../../stores/authProfileStore";
import { getHistoryOwnerKeyFromEmail } from "./historypage.utils";

export const useHistoryOwnerSync = () => {
  const setHistoryOwner = useHistoryStore((state) => state.setHistoryOwner);
  const profile = useAuthProfileStore((state) => state.profile);

  useEffect(() => {
    if (!profile) {
      setHistoryOwner("anonymous", 1);
      return;
    }

    setHistoryOwner(
      getHistoryOwnerKeyFromEmail(profile.email),
      profile.subscription?.history_limit ?? 1,
    );
  }, [profile, setHistoryOwner]);
};
