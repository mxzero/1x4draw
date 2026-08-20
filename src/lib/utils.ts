import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function tokens(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${Math.abs(n) === 1 ? "Token" : "Tokens"}`;
}

export const php = tokens;

export function formatWhen(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toNum(value: { toString(): string } | number | string | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}
