import { BrandMark } from "@/components/auth/brand-mark";

const steps = [
  "Sign in to your account",
  "Find an available resource",
  "Reserve your time",
];

export function AuthVisual() {
  return (
    <section className="auth-art relative order-2 min-h-[340px] overflow-hidden rounded-[24px] border border-white/10 px-6 py-8 text-white lg:order-1 lg:min-h-[720px] lg:px-10 lg:py-12">
      {/* The blurred light and fine grain recreate the soft, atmospheric reference without an image asset. */}
      <div aria-hidden="true" className="auth-glow absolute inset-0" />
      <div aria-hidden="true" className="auth-grain absolute inset-0" />

      <div className="relative z-10 flex h-full min-h-[276px] flex-col items-center justify-end text-center lg:min-h-[624px]">
        <div className="w-full max-w-[360px]">
          <BrandMark className="justify-center" compact />
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-[34px]">
            Get started with Resync
          </h1>
          <p className="mx-auto mt-3 max-w-[310px] text-sm leading-5 text-white/65">
            Sign in, find what your team needs, and reserve it without conflicts.
          </p>

          <div className="mt-8 hidden space-y-2.5 text-left sm:block">
            {steps.map((step, index) => {
              const active = index === 0;

              return (
                <div
                  className={
                    active
                      ? "flex min-h-[54px] items-center gap-3 rounded-xl border border-white/55 bg-white px-4 text-[#0b0f0e] shadow-[0_18px_55px_rgba(0,0,0,0.22)]"
                      : "flex min-h-[54px] items-center gap-3 rounded-xl border border-white/[0.07] bg-[#242725]/85 px-4 text-white/75 backdrop-blur-md"
                  }
                  key={step}
                >
                  <span
                    className={
                      active
                        ? "grid size-6 shrink-0 place-items-center rounded-full bg-[#0b0f0e] text-[11px] font-semibold text-white"
                        : "grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-white/60"
                    }
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
