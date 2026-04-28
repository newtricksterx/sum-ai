import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";

export interface LoginPayload {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSubmit?: (payload: LoginPayload) => Promise<void>;
  onLogin?: (payload: LoginPayload) => Promise<void>;
  onSwitchToRegister: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  infoMessage?: string | null;
}

const LoginForm = ({
  onSubmit,
  onLogin,
  onSwitchToRegister,
  isSubmitting,
  errorMessage,
  infoMessage,
}: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const submitHandler = onSubmit ?? onLogin;
    if (!submitHandler) {
      return;
    }

    await submitHandler({
      email: email.trim().toLowerCase(),
      password: password,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {infoMessage && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300">
          {infoMessage}
        </p>
      )}

      {errorMessage && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-300">
          {errorMessage}
        </p>
      )}

      <div className="space-y-1">
        <label
          htmlFor="profile-login-email"
          className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"
        >
          Email
        </label>
        <input
          id="profile-login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          required
          placeholder="you@example.com"
          className="w-full rounded-xl border border-slate-300/90 bg-white/90 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none dark:border-[#454545] dark:bg-[#111417] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="profile-login-password"
          className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"
        >
          Password
        </label>
        <input
          id="profile-login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          required
          placeholder="Enter your password"
          className="w-full rounded-xl border border-slate-300/90 bg-white/90 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none dark:border-[#454545] dark:bg-[#111417] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-400/70 bg-teal-500 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        <LogIn size={14} />
        {isSubmitting ? "Signing In..." : "Login"}
      </button>

      <p className="text-center text-[11px] text-slate-600 dark:text-slate-300">
        New here?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-semibold text-teal-700 hover:underline dark:text-teal-300"
        >
          Register
        </button>
      </p>
    </form>
  );
};

export default LoginForm;
