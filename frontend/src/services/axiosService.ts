import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

type LogoutHandler = () => void;
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const BASE_URL = import.meta.env.VITE_BASE_URL;

const EXCLUDED_REFRESH_ROUTES = ["/api/login", "/api/register", "/api/logout", "/api/token/refresh"];

let logoutHandler: LogoutHandler | null = null;
let refreshPromise: Promise<void> | null = null;
let forceLogoutPromise: Promise<void> | null = null;

const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

const logoutClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

const isExcludedRefreshRoute = (url?: string) => {
  if (!url) {
    return false;
  }

  return EXCLUDED_REFRESH_ROUTES.some((route) => url === route || url.endsWith(route));
};

const requestTokenRefresh = async () => {
  await refreshClient.post("/api/token/refresh", {});
};

const runForcedLogout = async () => {
  if (!forceLogoutPromise) {
    forceLogoutPromise = (async () => {
      try {
        await logoutClient.post("/api/logout", {});
      } catch {
        // We still want to clear local auth state if backend logout fails.
      } finally {
        logoutHandler?.();
      }
    })().finally(() => {
      forceLogoutPromise = null;
    });
  }

  await forceLogoutPromise;
};

const waitForRefresh = async () => {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  await refreshPromise;
};

export const setAuthLogoutHandler = (handler: LogoutHandler | null) => {
  logoutHandler = handler;
};

export const authInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

authInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const statusCode = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest || statusCode !== 401 || originalRequest._retry || isExcludedRefreshRoute(originalRequest.url)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await waitForRefresh();
      return authInstance(originalRequest);
    } catch (refreshError) {
      await runForcedLogout();
      return Promise.reject(refreshError);
    }
  }
);
