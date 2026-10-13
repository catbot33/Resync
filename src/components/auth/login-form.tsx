"use client";

import { useId, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { BrandMark } from "@/components/auth/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AccessRole = "member" | "admin";

const roleCopy: Record<AccessRole, { title: string; description: string }> = {
  member: {
    title: "Welcome back",
    description: "Sign in to view availability and manage your reservations.",
  },
  admin: {
    title: "Manage your workspace",
    description: "Sign in to manage resources, people, and reservations.",
  },
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

export function LoginForm() {
  const [role, setRole] = useState<AccessRole>("member");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const usernameId = useId();
  const passwordId = useId();
  const copy = roleCopy[role];

  async function handleCredentialsSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      role: role.toUpperCase(),
      redirect: false,
    });

    if (result.error) {
      setError("The username, password, or account type is incorrect.");
      setIsSubmitting(false);
      return;
    }

    // The dashboard decides whether an administrator still needs onboarding.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <section className="order-1 flex min-h-[620px] items-center justify-center px-2 py-10 sm:px-8 lg:order-2 lg:min-h-[720px] lg:px-12 xl:px-20">
      <div className="w-full max-w-[440px]">
        <BrandMark className="mb-10 lg:hidden" compact />

        <div className="mb-8">
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[34px]">{copy.title}</h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-400">{copy.description}</p>
        </div>

        <div aria-label="Choose account type" className="mb-7 grid grid-cols-2 rounded-xl border border-white/10 bg-[#111614] p-1" role="tablist">
          {(["member", "admin"] as const).map((item) => (
            <button
              aria-selected={role === item}
              className={cn(
                "h-10 rounded-lg text-sm font-semibold capitalize transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                role === item ? "bg-[#28312e] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300",
              )}
              key={item}
              onClick={() => setRole(item)}
              role="tab"
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <form className="space-y-5" onSubmit={handleCredentialsSignIn}>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-zinc-200" htmlFor={usernameId}>
                Username
              </label>
              {role === "admin" ? (
                <Link className="rounded-sm text-xs font-medium text-emerald-400 transition hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" href="/register">
                  Create an account
                </Link>
              ) : null}
            </div>
            <Input autoCapitalize="none" autoComplete="username" disabled={isSubmitting} id={usernameId} name="username" placeholder="Enter your username" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-200" htmlFor={passwordId}>
              Password
            </label>
            <div className="relative">
              <Input
                autoComplete="current-password"
                className="pr-12"
                disabled={isSubmitting}
                id={passwordId}
                name="password"
                placeholder="Enter your password"
                required
                type={showPassword ? "text" : "password"}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
              </button>
            </div>
          </div>

          {error ? (
            <p aria-live="polite" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          <Button className="mt-1 w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : `Sign in as ${role}`}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </form>

        {role === "admin" ? (
          <div className="mt-6">
            <div className="flex items-center gap-4" role="separator">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-zinc-600">or continue with</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <Button className="mt-5 w-full" disabled={isSubmitting} onClick={() => signIn("google", { redirectTo: "/dashboard" })} variant="secondary">
              <GoogleMark />
              Sign in with Google
            </Button>
          </div>
        ) : null}

        <p className="mt-9 text-center text-xs leading-5 text-zinc-600">
          By continuing, you agree to your organization&apos;s access policies.
        </p>
      </div>
    </section>
  );
}
