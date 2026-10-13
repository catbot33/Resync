import {
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  PackageOpen,
  Settings,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";

const primaryItems = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { key: "resources", label: "Resources", icon: PackageOpen, href: "/dashboard/resources" },
  { key: "employees", label: "Employees", icon: UsersRound, href: "/dashboard/employees" },
] as const;

const scheduleItems = [
  { key: "reservations", label: "Reservations", icon: CalendarRange, href: "/dashboard/reservations" },
  { key: "calendar", label: "Calendar", icon: CalendarDays, href: "/dashboard/calendar" },
] as const;

const settingsItem = { key: "settings", label: "Settings", icon: Settings, href: "/dashboard/settings" } as const;

function NavigationItem({
  active = false,
  href,
  icon: Icon,
  label,
}: {
  active?: boolean;
  href?: string;
  icon: typeof LayoutDashboard;
  label: string;
}) {
  const className = active
    ? "group relative grid size-11 place-items-center rounded-2xl border border-[#42474f] bg-[#24272b] text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
    : "group relative grid size-11 place-items-center rounded-2xl border border-transparent text-zinc-500 transition hover:border-[#2e3238] hover:bg-[#24272b] hover:text-white";

  const content = (
    <>
      <Icon aria-hidden="true" className="size-[19px]" strokeWidth={1.8} />
      <span className="pointer-events-none absolute left-[calc(100%+14px)] top-1/2 z-30 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[#2e3238] bg-[#181a1d] px-3 py-2 text-xs font-medium text-zinc-200 opacity-0 shadow-xl transition group-hover:opacity-100 lg:block">
        {label}
      </span>
      <span className="sr-only">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link aria-current={active ? "page" : undefined} aria-label={label} className={className} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <span aria-disabled="true" aria-label={`${label}, coming next`} className={className} role="link" tabIndex={0}>
      {content}
    </span>
  );
}

export function AdminNavigation({ active = "overview" }: { active?: "overview" | "resources" | "employees" | "reservations" | "calendar" | "settings" }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[92px] flex-col items-center border-r border-[#202326] bg-[#0b0c0d]/90 px-4 py-5 backdrop-blur-xl lg:flex">
        <Link aria-label="Resync overview" className="grid size-12 place-items-center rounded-2xl border border-[#2e3238] bg-[#181a1d] text-sm font-bold tracking-[-0.04em] text-white" href="/dashboard">
          R
        </Link>

        <nav aria-label="Admin navigation" className="mt-10 flex w-full flex-1 flex-col items-center">
          <div className="flex flex-col gap-2 rounded-[26px] border border-[#202326] bg-[#111315] p-2">
            {primaryItems.map((item) => <NavigationItem {...item} active={item.key === active} key={item.label} />)}
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded-[26px] border border-[#202326] bg-[#111315] p-2">
            {scheduleItems.map((item) => <NavigationItem {...item} active={item.key === active} key={item.label} />)}
          </div>

          <div className="mt-auto flex flex-col gap-2 rounded-[26px] border border-[#202326] bg-[#111315] p-2">
            <NavigationItem active={active === "settings"} href={settingsItem.href} icon={settingsItem.icon} label={settingsItem.label} />
            <SignOutButton compact />
          </div>
        </nav>
      </aside>

      <nav aria-label="Admin navigation" className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-[24px] border border-[#2e3238] bg-[#111315]/95 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
        {primaryItems.map((item) => <NavigationItem {...item} active={item.key === active} key={item.label} />)}
        {scheduleItems.map((item) => <NavigationItem {...item} active={item.key === active} key={item.label} />)}
        <NavigationItem active={active === "settings"} href={settingsItem.href} icon={settingsItem.icon} label={settingsItem.label} />
      </nav>
    </>
  );
}
