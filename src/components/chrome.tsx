"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { History, LayoutDashboard, LogOut, Spade, Wallet } from "lucide-react";
import { Logo } from "@/components/ui";
import { cn, tokens } from "@/lib/utils";

export function AppHeader({
  balance,
  pool,
  premium,
}: {
  balance: number;
  pool?: number;
  premium: boolean;
}) {
  const { data } = useSession();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur">
      {premium && (
        <div className="overflow-hidden border-b border-sand/20 bg-surface">
          <div className="ticker flex w-[200%] gap-10 py-1.5 text-[11px] uppercase tracking-[0.2em] text-sand">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="whitespace-nowrap">
                Monthly reward pool · {tokens(pool ?? 0)} · 10 subscriber seats
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Logo className="text-2xl" />
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40">Balance</p>
            <p className="font-display text-xl leading-none text-sand">{tokens(balance)}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 pb-2 text-[11px] text-white/40">
        {data?.user.username} · {data?.user.tier === "PREMIUM" ? "Pro" : "Basic"}
      </div>
    </header>
  );
}

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/play", label: "Play", icon: Spade },
    { href: "/history", label: "History", icon: History },
    { href: "/wallet", label: "Wallet", icon: Wallet },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: LayoutDashboard }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className={cn("mx-auto grid max-w-3xl", isAdmin ? "grid-cols-4" : "grid-cols-3")}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-3 text-[11px] uppercase tracking-wider",
                active ? "text-sand" : "text-white/45",
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AdBanner() {
  return (
    <div className="fixed bottom-[4.25rem] left-0 right-0 z-30 px-3 pb-[env(safe-area-inset-bottom)]">
      <Link
        href="/subscribe"
        className="mx-auto flex max-w-3xl items-center justify-between rounded-xl border border-white/10 bg-[#1a100e] px-4 py-3"
      >
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40">Ad</p>
          <p className="text-sm text-sand">Subscribe to hide ads and join more tables.</p>
        </div>
        <span className="rounded-lg bg-sand/20 px-2 py-1 text-[10px] text-sand">AD</span>
      </Link>
    </div>
  );
}
