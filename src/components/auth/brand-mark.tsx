import { CalendarCheck2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface BrandMarkProps {
  compact?: boolean;
  className?: string;
}

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/10 text-white shadow-[0_12px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm">
        <CalendarCheck2 aria-hidden="true" className="size-5" strokeWidth={2.2} />
      </span>
      <span className={cn("font-semibold tracking-[-0.03em] text-white", compact ? "text-lg" : "text-xl")}>
        Resync
      </span>
    </div>
  );
}
