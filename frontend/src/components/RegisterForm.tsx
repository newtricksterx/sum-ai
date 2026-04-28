import { FormEvent, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

interface RegisterFormProps {
  onSubmit?: (payload: RegisterPayload) => Promise<void>;
  onRegister?: (payload: RegisterPayload) => Promise<void>;
  onSwitchToLogin: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

const RegisterForm = ({
  onSubmit,
  onRegister,
  onSwitchToLogin,
  isSubmitting,
  errorMessage,
}: RegisterFormProps) => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordsMatch = useMemo(() => {
    if (confirmPassword.length === 0) {
      return true;
    }
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordsMatch) {
      return;
    }

    const submitHandler = onSubmit ?? onRegister;
    if (!submitHandler) {
      return;
    }

    await submitHandler({
      email: email.trim().toLowerCase(),
      username: username.trim(),
      password: password,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {errorMessage && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-300">
          {errorMessage}
        </p>
      )}

      <div className="space-y-1">
        <label
          htmlFor="profile-register-username"
          className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"
        >
          Username
        </label>
        <input
          id="profile-register-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={isSubmitting}
          required
          placeholder="username"
          className="w-full rounded-xl border border-slate-300/90 bg-white/90 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-[#454545] dark:bg-[#111417] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="profile-register-email"
          className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"
        >
          Email
        </label>
        <input
          id="profile-register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          required
          placeholder="you@example.com"
          className="w-full rounded-xl border border-slate-300/90 bg-white/90 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-[#454545] dark:bg-[#111417] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="profile-register-password"
          className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"
        >
          Password
        </label>
        <input
          id="profile-register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          required
          placeholder="Create a strong password"
          className="w-full rounded-xl border border-slate-300/90 bg-white/90 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-[#454545] dark:bg-[#111417] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="profile-register-confirm-password"
          className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400"
        >
          Confirm Password
        </label>
        <input
          id="profile-register-confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={isSubmitting}
          required
          placeholder="Re-enter password"
          className="w-full rounded-xl border border-slate-300/90 bg-white/90 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-[#454545] dark:bg-[#111417] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-400"
        />
      </div>

      {!passwordsMatch && (
        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-300">
          Passwords do not match.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !passwordsMatch}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/70 bg-sky-500 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
      >
        <UserPlus size={14} />
        {isSubmitting ? "Creating Account..." : "Create Account"}
      </button>

      <p className="text-center text-[11px] text-slate-600 dark:text-slate-300">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-sky-700 hover:underline dark:text-sky-300"
        >
          Login
        </button>
      </p>
    </form>
  );
};

export default RegisterForm;
