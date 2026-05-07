import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

type LogoutHandler = () => void;
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean; _csrfRetry?: boolean };
type CsrfTokenResponse = { csrfToken?: string };

const BASE_URL = import.meta.env.VITE_BASE_URL;
const EXCLUDED_REFRESH_ROUTES = ["/api/login", "/api/register", "/api/logout", "/api/token/refresh"];
const SAFE_HTTP_METHODS = new Set(["get", "head", "options", "trace"]);

let logoutHandler: LogoutHandler | null = null;
let refreshPromise: Promise<void> | null = null;
let forceLogoutPromise: Promise<void> | null = null;
let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

const logoutClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

const csrfClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

const isUnsafeHttpMethod = (method?: string) => {
  if (!method) {
    // Be conservative: if axios hasn't populated method yet,
    // treat the request as unsafe so CSRF protection is applied.
    return true;
  }

  return !SAFE_HTTP_METHODS.has(method.toLowerCase());
};

const setCsrfHeader = (config: InternalAxiosRequestConfig, token: string) => {
  config.headers.set("X-CSRFToken", token);
};

const requestCsrfToken = async () => {
  const response = await csrfClient.get<CsrfTokenResponse>("/api/auth/csrf");
  const nextToken = response.data?.csrfToken;

  if (typeof nextToken !== "string" || nextToken.trim().length === 0) {
    throw new Error("Missing CSRF token from backend.");
  }

  csrfToken = nextToken;
  return nextToken;
};

const ensureCsrfToken = async (force = false) => {
  if (!force && csrfToken) {
    return csrfToken;
  }

  if (!csrfPromise) {
    csrfPromise = requestCsrfToken().finally(() => {
      csrfPromise = null;
    });
  }

  return csrfPromise;
};

const withCsrfProtection = async (config: InternalAxiosRequestConfig) => {
  if (!isUnsafeHttpMethod(config.method)) {
    return config;
  }

  const token = await ensureCsrfToken();
  setCsrfHeader(config, token);
  return config;
};

refreshClient.interceptors.request.use(withCsrfProtection);
logoutClient.interceptors.request.use(withCsrfProtection);

const isExcludedRefreshRoute = (url?: string) => {
  if (!url) {
    return false;
  }

  return EXCLUDED_REFRESH_ROUTES.some((route) => url === route || url.endsWith(route));
};

const isCsrfFailureResponse = (error: AxiosError) => {
  if (error.response?.status !== 403) {
    return false;
  }

  const responseData = error.response.data;
  if (!responseData || typeof responseData !== "object") {
    return false;
  }

  const detail = (responseData as { detail?: unknown }).detail;
  return typeof detail === "string" && detail.toLowerCase().includes("csrf");
};

const postWithCsrfRetry = async (
  client: AxiosInstance,
  url: string,
  data: Record<string, never>,
) => {
  const token = await ensureCsrfToken();

  try {
    await client.post(url, data, {
      headers: {
        "X-CSRFToken": token,
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error) && isCsrfFailureResponse(error)) {
      const refreshedToken = await ensureCsrfToken(true);
      await client.post(url, data, {
        headers: {
          "X-CSRFToken": refreshedToken,
        },
      });
      return;
    }
    throw error;
  }
};

const requestTokenRefresh = async () => {
  await postWithCsrfRetry(refreshClient, "/api/token/refresh", {});
};

const runForcedLogout = async () => {
  if (!forceLogoutPromise) {
    forceLogoutPromise = (async () => {
      try {
        await postWithCsrfRetry(logoutClient, "/api/logout", {});
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

authInstance.interceptors.request.use(withCsrfProtection);

authInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const statusCode = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      originalRequest &&
      isCsrfFailureResponse(error) &&
      !originalRequest._csrfRetry &&
      isUnsafeHttpMethod(originalRequest.method)
    ) {
      originalRequest._csrfRetry = true;
      const token = await ensureCsrfToken(true);
      setCsrfHeader(originalRequest, token);
      return authInstance(originalRequest);
    }

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
