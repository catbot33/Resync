import { CalendarClock, CalendarDays, CalendarRange, Compass, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";

export type MemberSection = "booking" | "resources" | "reservations" | "calendar" | "settings";

const items = [
  { key: "booking", label: "Reservations", icon: CalendarClock, href: "/member" },
  { key: "resources", label: "Explore resources", icon: Compass, href: "/member/resources" },
  { key: "reservations", label: "My reservations", icon: CalendarRange, href: "/member/reservations" },
  { key: "calendar", label: "Calendar", icon: CalendarDays, href: "/member/calendar" },
  { key: "settings", label: "Profile & settings", icon: Settings, href: "/member/settings" },
] as const;

function Item({ active, href, icon: Icon, label }: { active: boolean; href: string; icon: LucideIcon; label: string }) {
  return (
    <Link aria-current={active ? "page" : undefined} aria-label={label} className={`group relative grid size-11 place-items-center rounded-2xl border transition ${active ? "border-[#42474f] bg-[#24272b] text-white" : "border-transparent text-zinc-500 hover:border-[#2e3238] hover:bg-[#24272b] hover:text-white"}`} href={href}>
      <Icon className="size-[19px]" strokeWidth={1.8} />
      <span className="pointer-events-none absolute left-[calc(100%+14px)] top-1/2 z-30 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[#2e3238] bg-[#181a1d] px-3 py-2 text-xs text-zinc-200 opacity-0 shadow-xl group-hover:opacity-100 lg:block">{label}</span>
    </Link>
  );
}

export function MemberNavigation({ active }: { active: MemberSection }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[92px] flex-col items-center border-r border-[#202326] bg-[#0b0c0d]/90 px-4 py-5 backdrop-blur-xl lg:flex">
        <Link aria-label="Member dashboard" className="grid size-12 place-items-center rounded-2xl border border-[#2e3238] bg-[#181a1d] text-sm font-bold text-white" href="/member">R</Link>
        <nav className="mt-10 flex flex-1 flex-col items-center gap-2 rounded-[26px] border border-[#202326] bg-[#111315] p-2" aria-label="Member navigation">
          {items.map((item) => <Item active={active === item.key} href={item.href} icon={item.icon} key={item.key} label={item.label} />)}
        </nav>
        <div className="mt-4 rounded-[26px] border border-[#202326] bg-[#111315] p-2"><SignOutButton compact /></div>
      </aside>
      <nav aria-label="Member navigation" className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-[24px] border border-[#2e3238] bg-[#111315]/95 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
        {items.map((item) => <Item active={active === item.key} href={item.href} icon={item.icon} key={item.key} label={item.label} />)}
      </nav>
    </>
  );
}
