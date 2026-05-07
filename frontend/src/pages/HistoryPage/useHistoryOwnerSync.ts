import { useEffect } from "react";
import { authInstance } from "../../services/axiosService";
import { useHistoryStore } from "../../stores/historyStore"

type MeResponse = {
  email?: string;
  subscription?: {
    history_limit: number | null;
  };
};

const getHistoryOwnerKeyFromEmail = (email: string | null | undefined) => {
  if (typeof email !== "string") {
    return "anonymous";
  }

  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail.length > 0 ? `user:${normalizedEmail}` : "anonymous";
};

export const useHistoryOwnerSync = () => {
  const setHistoryOwner = useHistoryStore((state) => state.setHistoryOwner);

  useEffect(() => {
    let isMounted = true;

    const syncHistoryLimit = async () => {
      try {
        const response = await authInstance.get<MeResponse>("/api/users/me");
        if (!isMounted) {
          return;
        }

        setHistoryOwner(
          getHistoryOwnerKeyFromEmail(response.data.email),
          response.data.subscription?.history_limit ?? 1,
        );
      } catch {
        if (isMounted) {
          setHistoryOwner("anonymous", 1);
        }
      }
    };

    void syncHistoryLimit();

    return () => {
      isMounted = false;
    };
  }, [setHistoryOwner]);
};
