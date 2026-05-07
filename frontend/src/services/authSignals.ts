const LOGIN_PENDING_KEY = "auth_login_pending";

export const markLoginPending = () => {
  try {
    localStorage.setItem(LOGIN_PENDING_KEY, String(Date.now()));
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

