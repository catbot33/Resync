import { AdminNavigation } from "@/components/dashboard/admin-navigation";

interface AdminShellProps {
  active: "overview" | "resources" | "employees" | "reservations" | "calendar" | "settings";
  children: React.ReactNode;
  organizationName: string;
  title: string;
  userName: string;
}

export function AdminShell({ active, children, organizationName, title, userName }: AdminShellProps) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="dashboard-canvas min-h-screen bg-[#0b0c0d] pb-28 text-white lg:pb-10 lg:pl-[92px]">
      <AdminNavigation active={active} />

      <div className="mx-auto w-full max-w-[1540px] px-5 py-6 sm:px-8 lg:px-10 lg:py-9 xl:px-14">
        <header className="flex items-center justify-between gap-5 border-b border-[#202326] pb-6">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{organizationName}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-zinc-200">{userName}</p>
              <p className="mt-0.5 text-xs text-zinc-600">Administrator</p>
            </div>
            <div aria-label={`Signed in as ${userName}`} className="grid size-11 place-items-center rounded-2xl border border-[#2e3238] bg-[#181a1d] text-xs font-semibold text-zinc-200">
              {initials || "A"}
            </div>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
