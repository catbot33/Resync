import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combines conditional classes without leaving conflicting Tailwind utilities behind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
