import { useEffect } from "react";
import { useHistoryStore } from "../../stores/historyStore"
import { useAuthProfileStore } from "../../stores/authProfileStore";

const getHistoryOwnerKeyFromEmail = (email: string | null | undefined) => {
  if (typeof email !== "string") {
    return "anonymous";
  }

  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail.length > 0 ? `user:${normalizedEmail}` : "anonymous";
};

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
