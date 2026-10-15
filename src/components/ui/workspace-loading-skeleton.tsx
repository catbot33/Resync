function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-[#24272b] ${className}`} />;
}

function NavigationSkeleton({ itemCount }: { itemCount: number }) {
  return (
    <>
      <aside aria-hidden="true" className="fixed inset-y-0 left-0 z-20 hidden w-[92px] flex-col items-center border-r border-[#202326] bg-[#0b0c0d]/90 px-4 py-5 lg:flex">
        <SkeletonBlock className="size-12 rounded-2xl" />
        <div className="mt-10 flex flex-col gap-3 rounded-[26px] border border-[#202326] bg-[#111315] p-2">
          {Array.from({ length: itemCount }, (_, index) => (
            <SkeletonBlock className="size-11 rounded-2xl" key={index} />
          ))}
        </div>
      </aside>

      <div aria-hidden="true" className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-[24px] border border-[#2e3238] bg-[#111315]/95 p-2 shadow-2xl lg:hidden">
        {Array.from({ length: itemCount }, (_, index) => (
          <SkeletonBlock className="size-10 rounded-2xl" key={index} />
        ))}
      </div>
    </>
  );
}

/** Provides immediate route feedback while authenticated workspace data is loading. */
export function WorkspaceLoadingSkeleton({ member = false }: { member?: boolean }) {
  const navigationItems = member ? 5 : 6;

  return (
    <main aria-busy="true" className="dashboard-canvas min-h-screen bg-[#0b0c0d] pb-28 text-white lg:pb-10 lg:pl-[92px]" role="status">
      <span className="sr-only">Loading workspace</span>
      <NavigationSkeleton itemCount={navigationItems} />

      <div aria-hidden="true" className="mx-auto w-full max-w-[1540px] px-5 py-6 sm:px-8 lg:px-10 lg:py-9 xl:px-14">
        <header className="flex items-center justify-between gap-5 border-b border-[#202326] pb-6">
          <div className="space-y-2.5">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-8 w-44 sm:w-56" />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden space-y-2 sm:block">
              <SkeletonBlock className="ml-auto h-3.5 w-28" />
              <SkeletonBlock className="ml-auto h-3 w-20" />
            </div>
            <SkeletonBlock className="size-11 rounded-2xl" />
          </div>
        </header>

        <section className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-3">
            <SkeletonBlock className="h-3.5 w-36" />
            <SkeletonBlock className="h-8 w-64 max-w-full sm:w-80" />
          </div>
          <SkeletonBlock className="h-3.5 w-40" />
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <article className="rounded-[22px] border border-[#24272b] bg-[#111315] p-5" key={index}>
              <div className="flex items-start justify-between gap-4">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="size-9 rounded-xl" />
              </div>
              <SkeletonBlock className="mt-7 h-8 w-16" />
              <SkeletonBlock className="mt-3 h-3 w-28" />
            </article>
          ))}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-12">
          {[7, 5].map((columnSpan) => (
            <article className={`${columnSpan === 7 ? "xl:col-span-7" : "xl:col-span-5"} rounded-[26px] border border-[#24272b] bg-[#111315] p-5 sm:p-6`} key={columnSpan}>
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="mt-2 h-3 w-52 max-w-full" />
              <div className="mt-6 space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div className="rounded-2xl border border-[#24272b] bg-[#0f1113] p-4" key={index}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <SkeletonBlock className="h-4 w-2/5" />
                        <SkeletonBlock className="h-3 w-3/5" />
                      </div>
                      <SkeletonBlock className="h-6 w-14 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
