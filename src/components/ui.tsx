import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("logo-mark flex items-baseline font-display leading-none", className)}>
      <span>1</span>
      <span className="text-sand">X</span>
      <span>4</span>
      {!compact && <span className="ml-2 tracking-[0.18em] text-white/50">DRAW</span>}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-surface p-4", className)}>
      {children}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "danger" | "ghost" | "olive";
};

export function Button({ className, variant = "primary", ...props }: BtnProps) {
  const styles = {
    primary: "bg-teal text-white hover:bg-[#347073] disabled:opacity-50",
    accent: "bg-sand text-black hover:bg-[#d39a82] disabled:opacity-50",
    danger: "bg-brick text-white hover:bg-[#b33830] disabled:opacity-50",
    olive: "bg-olive text-white hover:bg-[#7e8c22] disabled:opacity-50",
    ghost: "bg-white/5 text-white hover:bg-white/10 disabled:opacity-50",
  }[variant];

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "win" | "lost" | "pending" | "premium";
}) {
  const styles = {
    neutral: "bg-white/10 text-white/80",
    win: "bg-olive/30 text-[#d5e07a]",
    lost: "bg-brick/30 text-[#f0a8a3]",
    pending: "bg-teal/30 text-[#9fd4d2]",
    premium: "bg-sand/20 text-sand",
  }[tone];
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide", styles)}>
      {children}
    </span>
  );
}
