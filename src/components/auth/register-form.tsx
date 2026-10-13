"use client";

import { useId, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { BrandMark } from "@/components/auth/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RegistrationResponse = {
  message?: string;
  errors?: {
    username?: string[];
    password?: string[];
  };
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24">
      <path d="M21.6 12.23c0-.71-.06-1.24-.2-1.8H12v3.41h5.52a4.72 4.72 0 0 1-2.05 3.1l2.88 2.23c1.68-1.55 3.25-3.84 3.25-6.94Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.96-.89 6.61-2.42l-2.88-2.23c-.8.54-1.82.91-3.73.91-2.6 0-4.8-1.76-5.59-4.12l-2.98 2.3A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.41 14.14A6 6 0 0 1 6.1 12c0-.74.13-1.46.31-2.14l-2.98-2.3A10 10 0 0 0 2 12c0 1.61.39 3.14 1.43 4.44l2.98-2.3Z" fill="#FBBC05" />
      <path d="M12 5.74c1.47 0 2.79.51 3.83 1.5l2.84-2.85A9.56 9.56 0 0 0 12 2a10 10 0 0 0-8.57 5.56l2.98 2.3C7.2 7.5 9.4 5.74 12 5.74Z" fill="#EA4335" />
    </svg>
  );
}

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegistrationResponse["errors"]>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const usernameId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  async function handleRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = (await response.json()) as RegistrationResponse;

      if (!response.ok) {
        setError(result.message ?? "We could not create the account.");
        setFieldErrors(result.errors ?? {});
        return;
      }

      // Start the administrator's JWT session immediately after a successful registration.
      const signInResult = await signIn("credentials", {
        username,
        password,
        role: "ADMIN",
        redirect: false,
      });

      if (signInResult.error) {
        setError("Your account was created. Please return to sign in.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("We could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="order-1 flex min-h-[620px] items-center justify-center px-2 py-10 sm:px-8 lg:order-2 lg:min-h-[720px] lg:px-12 xl:px-20">
      <div className="w-full max-w-[440px]">
        <BrandMark className="mb-10 lg:hidden" compact />

        <Link className="mb-7 inline-flex items-center gap-2 rounded-sm text-sm text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" href="/">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to sign in
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[34px]">Create an account</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">
            Create administrator credentials for your organization.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleRegistration}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor={usernameId}>
              Username
            </label>
            <Input aria-describedby={`${usernameId}-hint`} autoCapitalize="none" autoComplete="username" disabled={isSubmitting} id={usernameId} name="username" placeholder="Choose a unique username" required />
            <p className="text-xs leading-5 text-zinc-600" id={`${usernameId}-hint`}>
              3–32 lowercase letters, numbers, or underscores.
            </p>
            {fieldErrors?.username?.[0] ? <p className="text-xs text-red-300">{fieldErrors.username[0]}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor={passwordId}>
              Password
            </label>
            <div className="relative">
              <Input aria-describedby={`${passwordId}-hint`} autoComplete="new-password" className="pr-12" disabled={isSubmitting} id={passwordId} name="password" placeholder="Create a password" required type={showPassword ? "text" : "password"} />
              <button aria-label={showPassword ? "Hide passwords" : "Show passwords"} className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" onClick={() => setShowPassword((visible) => !visible)} type="button">
                {showPassword ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
              </button>
            </div>
            <p className="text-xs leading-5 text-zinc-600" id={`${passwordId}-hint`}>
              At least 8 characters with a letter and a number.
            </p>
            {fieldErrors?.password?.[0] ? <p className="text-xs text-red-300">{fieldErrors.password[0]}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor={confirmPasswordId}>
              Confirm password
            </label>
            <div className="relative">
              <Input autoComplete="new-password" className="pr-12" disabled={isSubmitting} id={confirmPasswordId} name="confirmPassword" placeholder="Repeat your password" required type={showConfirmPassword ? "text" : "password"} />
              <button aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"} className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" onClick={() => setShowConfirmPassword((visible) => !visible)} type="button">
                {showConfirmPassword ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
              </button>
            </div>
          </div>

          {error ? (
            <p aria-live="polite" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating account..." : "Create account"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </form>

        <div className="mt-6">
          <div className="flex items-center gap-4" role="separator">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-zinc-600">or continue with</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <Button className="mt-5 w-full" disabled={isSubmitting} onClick={() => signIn("google", { redirectTo: "/dashboard" })} variant="secondary">
            <GoogleMark />
            Continue with Google
          </Button>
        </div>
      </div>
    </section>
  );
}
