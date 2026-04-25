import React, { FormEvent, useState } from 'react';
import { LogIn } from 'lucide-react';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string | null;
  infoMessage?: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToRegister,
  onLogin,
  isSubmitting,
  errorMessage,
  infoMessage,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await onLogin({
        email: email.trim(),
        password,
      });
    } catch {
      // Parent component handles displaying auth errors.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      {infoMessage && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300">
          {infoMessage}
        </p>
      )}

      {errorMessage && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] font-medium text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-300">
          {errorMessage}
        </p>
      )}

      <div className="space-y-1">
        <label
          htmlFor="login-email"
          className="block text-[12px] font-medium text-slate-700 dark:text-slate-200"
        >
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none dark:border-[#454545] dark:bg-[#101010] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400"
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="login-password"
          className="block text-[12px] font-medium text-slate-700 dark:text-slate-200"
        >
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none dark:border-[#454545] dark:bg-[#101010] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400"
          disabled={isSubmitting}
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-500 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-70 dark:border-cyan-900/80 dark:bg-cyan-600 dark:hover:bg-cyan-500"
      >
        <LogIn size={14} />
        {isSubmitting ? 'Signing In...' : 'Login'}
      </button>

      <p className="text-center text-[11px] text-slate-600 dark:text-slate-300">
        Need an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-semibold text-cyan-600 hover:underline dark:text-cyan-300"
        >
          Register
        </button>
      </p>
    </form>
  );
};

export default LoginForm;
