import React, { useEffect, useState } from 'react';
import { Calendar, Clock3, LogIn, LogOut, Mail, User, UserPlus } from 'lucide-react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import {
  AuthServiceError,
  AuthUser,
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from '../services/authService';

type AuthMode = 'login' | 'register';

const formatDateTime = (timestamp: string) => {
  const parsedDate = new Date(timestamp);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available';
  }

  return parsedDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof AuthServiceError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Could not complete the request. Please try again.';
};

const ProfilePage: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [loginInfoMessage, setLoginInfoMessage] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_BASE_URL as string;

  useEffect(() => {
    let isMounted = true;

    const checkExistingSession = async () => {
      setIsCheckingSession(true);
      setLoginError(null);

      try {
        const currentUser = await fetchCurrentUser(baseUrl);
        if (isMounted) {
          setProfile(currentUser);
        }
      } catch (error) {
        if (!(error instanceof AuthServiceError && error.status === 401) && isMounted) {
          setLoginError(getAuthErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    void checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, [baseUrl]);

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setLoginError(null);
    setLogoutError(null);
    setLoginInfoMessage(null);
    setIsLoggingIn(true);

    try {
      const loggedInUser = await loginUser(baseUrl, { email, password });
      setProfile(loggedInUser);
    } catch (error) {
      setLoginError(getAuthErrorMessage(error));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async ({
    email,
    username,
    password,
  }: {
    email: string;
    username: string;
    password: string;
  }) => {
    setRegisterError(null);
    setIsRegistering(true);

    try {
      await registerUser(baseUrl, { email, username, password });
      setLoginInfoMessage('Account created successfully. Please sign in.');
      setAuthMode('login');
    } catch (error) {
      setRegisterError(getAuthErrorMessage(error));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogout = async () => {
    setLogoutError(null);

    try {
      await logoutUser(baseUrl);
      setProfile(null);
      setAuthMode('login');
    } catch (error) {
      setLogoutError(getAuthErrorMessage(error));
    }
  };

  const switchToLogin = () => {
    setAuthMode('login');
    setRegisterError(null);
  };

  const switchToRegister = () => {
    setAuthMode('register');
    setLoginError(null);
    setLoginInfoMessage(null);
  };

  const profileDisplayName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();

  return (
    <section className="relative flex-1 min-h-[300px] overflow-y-auto overflow-x-hidden p-3 custom-scrollbar">
      <div className="relative z-10 rounded-2xl border border-gray-200/80 bg-white/95 p-4 font-noto shadow-sm dark:border-[#393939] dark:bg-[#191919]/95">
        {profile ? (
          <>
            <h1 className="mb-1 text-[18px] font-bold text-slate-900 dark:text-slate-100">
              My Profile
            </h1>
            <p className="mb-3 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
              Logged in successfully. Here is your account information.
            </p>

            {logoutError && (
              <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] font-medium text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-300">
                {logoutError}
              </p>
            )}

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-[12px] dark:border-[#373737] dark:bg-[#111111]">
              <div className="flex items-start gap-2">
                <User size={14} className="mt-0.5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Display Name
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">
                    {profileDisplayName || profile.username}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Mail size={14} className="mt-0.5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Email
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <User size={14} className="mt-0.5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Username
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">{profile.username}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar size={14} className="mt-0.5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Member Since
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">{formatDateTime(profile.created_at)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock3 size={14} className="mt-0.5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Last Updated
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">{formatDateTime(profile.updated_at)}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-[#444444] dark:bg-[#141414] dark:text-slate-100 dark:hover:bg-[#1f1f1f]"
            >
              <LogOut size={14} />
              Logout
            </button>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-[18px] font-bold text-slate-900 dark:text-slate-100">
              Account Access
            </h1>
            <p className="mb-3 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
              Sign in to view your profile or create a new account.
            </p>

            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-[#232323]">
              <button
                type="button"
                onClick={switchToLogin}
                className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${
                  authMode === 'login'
                    ? 'bg-white text-cyan-700 shadow-sm dark:bg-[#111111] dark:text-cyan-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                <LogIn size={13} />
                Login
              </button>

              <button
                type="button"
                onClick={switchToRegister}
                className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${
                  authMode === 'register'
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-[#111111] dark:text-emerald-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                <UserPlus size={13} />
                Register
              </button>
            </div>

            {isCheckingSession ? (
              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-medium text-slate-600 dark:border-[#353535] dark:bg-[#131313] dark:text-slate-300">
                Checking active session...
              </p>
            ) : authMode === 'login' ? (
              <LoginForm
                onSwitchToRegister={switchToRegister}
                onLogin={handleLogin}
                isSubmitting={isLoggingIn}
                errorMessage={loginError}
                infoMessage={loginInfoMessage}
              />
            ) : (
              <RegisterForm
                onSwitchToLogin={switchToLogin}
                onRegister={handleRegister}
                isSubmitting={isRegistering}
                errorMessage={registerError}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ProfilePage;
