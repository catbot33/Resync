import { AuthVisual } from "@/components/auth/auth-visual";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#080b0a] p-3 sm:p-5 lg:grid lg:place-items-center lg:p-7">
      <div className="mx-auto grid w-full max-w-[1420px] overflow-hidden rounded-[30px] border border-white/[0.07] bg-[#0b0f0e] p-2 shadow-[0_28px_100px_rgba(0,0,0,0.5)] lg:grid-cols-[1.08fr_0.92fr]">
        <AuthVisual />
        <LoginForm />
      </div>
    </main>
  );
}
