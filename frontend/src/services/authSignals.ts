const LOGIN_PENDING_KEY = "auth_login_pending";
const LOGGED_OUT_KEY = "auth_logged_out";

export const markLoginPending = () => {
  try {
    localStorage.setItem(LOGIN_PENDING_KEY, String(Date.now()));
    localStorage.removeItem(LOGGED_OUT_KEY);
  } catch {
    // Best-effort signal only.
  }
};

export const isLoginPending = () => {
  try {
    return Boolean(localStorage.getItem(LOGIN_PENDING_KEY));
  } catch {
    return false;
  }
};

export const clearLoginPending = () => {
  try {
    localStorage.removeItem(LOGIN_PENDING_KEY);
  } catch {
    // Best-effort cleanup only.
  }
};

export const markLoggedOut = () => {
  try {
    localStorage.setItem(LOGGED_OUT_KEY, String(Date.now()));
  } catch {
    // Best-effort signal only.
  }
};

export const isLoggedOut = () => {
  try {
    return Boolean(localStorage.getItem(LOGGED_OUT_KEY));
  } catch {
    return false;
  }
};

export const clearLoggedOut = () => {
  try {
    localStorage.removeItem(LOGGED_OUT_KEY);
  } catch {
    // Best-effort cleanup only.
  }
};

