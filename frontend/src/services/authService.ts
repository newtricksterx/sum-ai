export interface AuthUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  detail: string;
  user: AuthUser;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

type JsonRecord = Record<string, unknown>;

const DEFAULT_AUTH_ERROR = "Could not complete the authentication request.";

export class AuthServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthServiceError";
    this.status = status;
  }
}

const buildApiUrl = (baseUrl: string, path: string) => {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
};

const firstStringInArray = (value: unknown): string | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const first = value.find((item) => typeof item === "string");
  return typeof first === "string" ? first : null;
};

const parseErrorPayload = (payload: JsonRecord): string | null => {
  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  for (const [field, value] of Object.entries(payload)) {
    if (typeof value === "string" && value.trim()) {
      return `${field}: ${value}`;
    }

    const firstArrayMessage = firstStringInArray(value);
    if (firstArrayMessage) {
      return `${field}: ${firstArrayMessage}`;
    }
  }

  return null;
};

const parseResponseError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as unknown;
    if (payload && typeof payload === "object") {
      const parsedMessage = parseErrorPayload(payload as JsonRecord);
      if (parsedMessage) {
        return parsedMessage;
      }
    }
  } catch {
    // Ignore non-JSON response bodies and fall back to generic messaging.
  }

  return DEFAULT_AUTH_ERROR;
};

const request = async <T>(url: string, init: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await parseResponseError(response);
    throw new AuthServiceError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
};

export const loginUser = async (baseUrl: string, payload: LoginRequest): Promise<AuthUser> => {
  const response = await request<LoginResponse>(buildApiUrl(baseUrl, "/api/login"), {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.user;
};

export const registerUser = async (baseUrl: string, payload: RegisterRequest): Promise<void> => {
  await request(buildApiUrl(baseUrl, "/api/register"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const fetchCurrentUser = async (baseUrl: string): Promise<AuthUser> => {
  return request<AuthUser>(buildApiUrl(baseUrl, "/api/users/me"), {
    method: "GET",
  });
};

export const logoutUser = async (baseUrl: string): Promise<void> => {
  await request(buildApiUrl(baseUrl, "/api/logout"), {
    method: "POST",
    body: JSON.stringify({}),
  });
};
