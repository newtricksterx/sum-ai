import React, { FormEvent, useState } from 'react';
import { UserPlus } from 'lucide-react';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onRegister: (payload: { email: string; username: string; password: string }) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSwitchToLogin,
  onRegister,
  isSubmitting,
  errorMessage,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordsMatch = confirmPassword.length === 0 || password === confirmPassword;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!passwordsMatch) {
      return;
    }

    try {
      await onRegister({
        email: email.trim(),
        username: username.trim(),
        password,
      });
    } catch {
      // Parent component handles displaying auth errors.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      {errorMessage && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[11px] font-medium text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-300">
          {errorMessage}
        </p>
      )}

      <div className="space-y-1">
        <label
          htmlFor="register-username"
          className="block text-[12px] font-medium text-slate-700 dark:text-slate-200"
        >
          Username
        </label>
        <input
          id="register-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="username"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-[#454545] dark:bg-[#101010] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400"
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="register-email"
          className="block text-[12px] font-medium text-slate-700 dark:text-slate-200"
        >
          Email
        </label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-[#454545] dark:bg-[#101010] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400"
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="register-password"
          className="block text-[12px] font-medium text-slate-700 dark:text-slate-200"
        >
          Password
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-[#454545] dark:bg-[#101010] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400"
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="register-confirm-password"
          className="block text-[12px] font-medium text-slate-700 dark:text-slate-200"
        >
          Confirm Password
        </label>
        <input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm your password"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-[#454545] dark:bg-[#101010] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400"
          disabled={isSubmitting}
          required
        />
      </div>

      {!passwordsMatch && (
        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-300">
          Passwords do not match.
        </p>
      )}

      <button
        type="submit"
        disabled={!passwordsMatch || isSubmitting}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-500 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/80 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        <UserPlus size={14} />
        {isSubmitting ? 'Creating Account...' : 'Create Account'}
      </button>

      <p className="text-center text-[11px] text-slate-600 dark:text-slate-300">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-emerald-600 hover:underline dark:text-emerald-300"
        >
          Login
        </button>
      </p>
    </form>
  );
};

export default RegisterForm;
